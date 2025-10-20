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
    } = body

    const syncSettings = await prisma.calendarSyncSettings.upsert({
      where: { userId: session.user.id },
      update: {
        isEnabled,
        googleCalendarId,
        syncDirection,
        syncTaskDeadlines,
        syncTeamEvents,
        syncPersonalEvents,
      },
      create: {
        userId: session.user.id,
        isEnabled,
        googleCalendarId,
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

    await prisma.calendarSyncSettings.update({
      where: { userId: session.user.id },
      data: {
        isEnabled: false,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleCalendarId: null,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    )
  }
}
