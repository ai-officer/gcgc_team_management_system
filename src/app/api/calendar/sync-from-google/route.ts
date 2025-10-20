import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { googleCalendarService } from '@/lib/google-calendar'

// POST - Import events from Google Calendar to TMS
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sync settings
    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId: session.user.id }
    })

    if (!syncSettings?.isEnabled) {
      return NextResponse.json(
        { error: 'Google Calendar sync is not enabled' },
        { status: 400 }
      )
    }

    if (syncSettings.syncDirection === 'TMS_TO_GOOGLE') {
      return NextResponse.json(
        { error: 'Sync direction is set to export only' },
        { status: 400 }
      )
    }

    const calendarId = syncSettings.googleCalendarId || 'primary'

    // Fetch ALL Google Calendar events (past, present, and future)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const oneYearFuture = new Date()
    oneYearFuture.setFullYear(oneYearFuture.getFullYear() + 1)

    const googleEvents = await googleCalendarService.listEvents(session.user.id, {
      calendarId,
      timeMin: oneYearAgo.toISOString(),
      timeMax: oneYearFuture.toISOString(),
      maxResults: 2500 // Fetch up to 2500 events
    })

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const googleEvent of googleEvents) {
      try {
        if (!googleEvent.id) {
          results.skipped++
          continue
        }

        // Check if event already exists in TMS
        const existingEvent = await prisma.event.findFirst({
          where: {
            googleCalendarEventId: googleEvent.id,
            creatorId: session.user.id
          }
        })

        const tmsEventData = googleCalendarService.convertGoogleEventToTMS(
          googleEvent,
          session.user.id
        )

        if (existingEvent) {
          // Update existing event
          await prisma.event.update({
            where: { id: existingEvent.id },
            data: {
              title: tmsEventData.title,
              description: tmsEventData.description,
              startTime: new Date(tmsEventData.startTime),
              endTime: new Date(tmsEventData.endTime),
              allDay: tmsEventData.allDay,
              syncedAt: new Date()
            }
          })
          results.updated++
        } else {
          // Create new event
          await prisma.event.create({
            data: {
              ...tmsEventData,
              startTime: new Date(tmsEventData.startTime),
              endTime: new Date(tmsEventData.endTime),
              syncedAt: new Date()
            }
          })
          results.created++
        }
      } catch (error: any) {
        console.error(`Error importing event ${googleEvent.id}:`, error)
        results.failed++
        results.errors.push(`${googleEvent.summary || 'Untitled'}: ${error.message}`)
      }
    }

    // Update last synced timestamp
    await prisma.calendarSyncSettings.update({
      where: { userId: session.user.id },
      data: { lastSyncedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Error importing from Google Calendar:', error)
    return NextResponse.json(
      { error: 'Failed to import events from Google Calendar' },
      { status: 500 }
    )
  }
}
