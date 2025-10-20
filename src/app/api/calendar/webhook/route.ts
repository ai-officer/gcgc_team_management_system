import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { googleCalendarService } from '@/lib/google-calendar'

// POST - Receive webhook notifications from Google Calendar
export async function POST(req: NextRequest) {
  try {
    const headersList = headers()
    const channelId = headersList.get('x-goog-channel-id')
    const resourceState = headersList.get('x-goog-resource-state')

    if (!channelId) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
    }

    // Find the user associated with this webhook channel
    const syncSettings = await prisma.calendarSyncSettings.findFirst({
      where: {
        webhookChannelId: channelId,
      }
    })

    if (!syncSettings) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // If resource state is 'sync', it's just a verification
    if (resourceState === 'sync') {
      console.log(`Webhook verification for user ${syncSettings.userId}`)
      return NextResponse.json({ success: true })
    }

    // Resource state is 'exists' or 'not_exists' - calendar was updated
    if (resourceState === 'exists') {
      console.log(`Calendar update detected for user ${syncSettings.userId}`)

      // Get the WebSocket server instance and emit event
      const io = (global as any).io
      if (io) {
        // Notify the user via WebSocket that calendar was updated
        io.to(`user-${syncSettings.userId}`).emit('calendar-updated', {
          message: 'Google Calendar has new updates',
          timestamp: new Date().toISOString()
        })
      }

      // Auto-import ALL events (past, present, and future)
      try {
        // Fetch events from 1 year ago to 1 year in the future
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        const oneYearFuture = new Date()
        oneYearFuture.setFullYear(oneYearFuture.getFullYear() + 1)

        const googleEvents = await googleCalendarService.listEvents(
          syncSettings.userId,
          {
            calendarId: syncSettings.googleCalendarId || 'primary',
            timeMin: oneYearAgo.toISOString(),
            timeMax: oneYearFuture.toISOString(),
            maxResults: 2500 // Fetch up to 2500 events
          }
        )

        let created = 0
        let updated = 0

        // Import events
        for (const googleEvent of googleEvents) {
          if (!googleEvent.id) continue

          const existingEvent = await prisma.event.findFirst({
            where: {
              googleCalendarEventId: googleEvent.id,
              creatorId: syncSettings.userId
            }
          })

          const tmsEventData = googleCalendarService.convertGoogleEventToTMS(
            googleEvent,
            syncSettings.userId
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
            updated++
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
            created++
          }
        }

        // Update last synced timestamp
        await prisma.calendarSyncSettings.update({
          where: { userId: syncSettings.userId },
          data: { lastSyncedAt: new Date() }
        })

        console.log(`Webhook sync complete: ${created} created, ${updated} updated`)
      } catch (error) {
        console.error('Error auto-syncing from webhook:', error)

        // Emit error to user via WebSocket
        const io = (global as any).io
        if (io) {
          io.to(`user-${syncSettings.userId}`).emit('sync-error', {
            error: 'Failed to sync from webhook'
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// GET - Verify webhook endpoint
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'Webhook endpoint active' })
}
