import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { googleCalendarService } from '@/lib/google-calendar'

// GET - Get calendar sync settings
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        userId: true,
        isEnabled: true,
        googleCalendarId: true,
        syncDirection: true,
        syncTaskDeadlines: true,
        syncTeamEvents: true,
        syncPersonalEvents: true,
        lastSyncedAt: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Get list of available Google Calendars if tokens exist
    let calendars = []
    if (syncSettings?.isEnabled) {
      try {
        calendars = await googleCalendarService.getCalendarList(session.user.id)
      } catch (error) {
        console.error('Error fetching calendar list:', error)
      }
    }

    return NextResponse.json({
      syncSettings: syncSettings || {
        isEnabled: false,
        syncDirection: 'BOTH',
        syncTaskDeadlines: true,
        syncTeamEvents: true,
        syncPersonalEvents: true,
      },
      calendars
    })
  } catch (error) {
    console.error('Error fetching sync settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync settings' },
      { status: 500 }
    )
  }
}

// PUT - Update calendar sync settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      isEnabled,
      googleCalendarId,
      syncDirection,
      syncTaskDeadlines,
      syncTeamEvents,
      syncPersonalEvents,
      createTMSCalendar, // New flag to create dedicated TMS Calendar
    } = body

    // If user wants to use TMS Calendar, find or create it
    let calendarId = googleCalendarId
    if (isEnabled && (createTMSCalendar || !googleCalendarId)) {
      try {
        calendarId = await googleCalendarService.findOrCreateTMSCalendar(session.user.id)
        console.log('Using TMS Calendar:', calendarId)
      } catch (error) {
        console.error('Error finding/creating TMS Calendar, falling back to primary:', error)
        calendarId = googleCalendarId || 'primary'
      }
    }

    const syncSettings = await prisma.calendarSyncSettings.upsert({
      where: { userId: session.user.id },
      update: {
        isEnabled,
        googleCalendarId: calendarId,
        syncDirection,
        syncTaskDeadlines,
        syncTeamEvents,
        syncPersonalEvents,
      },
      create: {
        userId: session.user.id,
        isEnabled,
        googleCalendarId: calendarId,
        syncDirection,
        syncTaskDeadlines,
        syncTeamEvents,
        syncPersonalEvents,
      },
      select: {
        id: true,
        userId: true,
        isEnabled: true,
        googleCalendarId: true,
        syncDirection: true,
        syncTaskDeadlines: true,
        syncTeamEvents: true,
        syncPersonalEvents: true,
        lastSyncedAt: true,
      }
    })

    return NextResponse.json({ syncSettings })
  } catch (error) {
    console.error('Error updating sync settings:', error)
    return NextResponse.json(
      { error: 'Failed to update sync settings' },
      { status: 500 }
    )
  }
}

// DELETE - Disconnect Google Calendar
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all events imported from Google Calendar
    const deletedEvents = await prisma.event.deleteMany({
      where: {
        creatorId: session.user.id,
        googleCalendarEventId: {
          not: null // Only delete events that came from Google Calendar
        }
      }
    })

    console.log(`Deleted ${deletedEvents.count} Google Calendar events for user ${session.user.id}`)

    // Clear sync settings
    await prisma.calendarSyncSettings.update({
      where: { userId: session.user.id },
      data: {
        isEnabled: false,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleCalendarId: null,
        webhookChannelId: null,
        webhookResourceId: null,
        webhookExpiration: null,
        lastSyncedAt: null,
      }
    })

    return NextResponse.json({
      success: true,
      deletedEvents: deletedEvents.count
    })
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    )
  }
}
