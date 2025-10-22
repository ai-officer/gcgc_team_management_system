import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { googleCalendarService } from '@/lib/google-calendar'

/**
 * Cleanup orphaned Google Calendar events
 * Removes events from Google Calendar that no longer have corresponding tasks in TMS
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check if sync is enabled
    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId }
    })

    if (!syncSettings?.isEnabled) {
      return NextResponse.json(
        { error: 'Google Calendar sync is not enabled' },
        { status: 400 }
      )
    }

    // Get TMS_CALENDAR ID
    let calendarId = syncSettings.googleCalendarId
    if (!calendarId || calendarId === 'primary') {
      try {
        calendarId = await googleCalendarService.findOrCreateTMSCalendar(userId)
      } catch (error) {
        return NextResponse.json(
          { error: 'Could not find TMS_CALENDAR' },
          { status: 400 }
        )
      }
    }

    console.log(`Starting cleanup for user ${userId} in calendar ${calendarId}`)

    // Get all events from TMS_CALENDAR
    const googleEvents = await googleCalendarService.getEvents(
      userId,
      calendarId,
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)  // 365 days ahead
    )

    console.log(`Found ${googleEvents.length} events in Google Calendar`)

    // Get all tasks with Google Calendar event IDs
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          {
            teamMembers: {
              some: { userId }
            }
          },
          {
            collaborators: {
              some: { userId }
            }
          }
        ],
        googleCalendarEventId: { not: null }
      },
      select: {
        id: true,
        title: true,
        googleCalendarEventId: true,
        googleCalendarId: true
      }
    })

    const taskEventIds = new Set(tasks.map(t => t.googleCalendarEventId))
    console.log(`Found ${tasks.length} TMS tasks with Google Calendar events`)

    // Find orphaned events (in Google Calendar but not in TMS)
    const orphanedEvents = googleEvents.filter(event =>
      event.id &&
      !taskEventIds.has(event.id) &&
      event.summary?.startsWith('[Task]') // Only cleanup task events
    )

    console.log(`Found ${orphanedEvents.length} orphaned task events to delete`)

    let deletedCount = 0
    let errorCount = 0

    // Delete orphaned events
    for (const event of orphanedEvents) {
      if (event.id) {
        try {
          await googleCalendarService.deleteEvent(userId, event.id, calendarId)
          deletedCount++
          console.log(`Deleted orphaned event: ${event.summary} (${event.id})`)
        } catch (error) {
          errorCount++
          console.error(`Failed to delete event ${event.id}:`, error)
        }
      }
    }

    console.log(`Cleanup complete: ${deletedCount} deleted, ${errorCount} errors`)

    return NextResponse.json({
      message: 'Cleanup completed successfully',
      stats: {
        totalGoogleEvents: googleEvents.length,
        tmsTasksWithEvents: tasks.length,
        orphanedEvents: orphanedEvents.length,
        deleted: deletedCount,
        errors: errorCount
      }
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup duplicate events', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
