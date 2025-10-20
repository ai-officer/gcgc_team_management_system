import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { googleCalendarService } from '@/lib/google-calendar'

// GET - Check if Google Calendar has updates since last sync
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId }
    })

    if (!syncSettings?.isEnabled) {
      return NextResponse.json({ hasUpdates: false })
    }

    try {
      // Get events since last sync
      const timeMin = syncSettings.lastSyncedAt
        ? syncSettings.lastSyncedAt.toISOString()
        : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours

      const events = await googleCalendarService.listEvents(userId, {
        calendarId: syncSettings.googleCalendarId || 'primary',
        timeMin,
        maxResults: 10
      })

      const hasUpdates = events.length > 0

      return NextResponse.json({ hasUpdates, eventCount: events.length })
    } catch (error) {
      console.error('Error checking updates:', error)
      return NextResponse.json({ hasUpdates: false })
    }
  } catch (error) {
    console.error('Check updates error:', error)
    return NextResponse.json({ error: 'Failed to check updates' }, { status: 500 })
  }
}
