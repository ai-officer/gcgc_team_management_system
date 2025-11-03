import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { googleCalendarService } from '@/lib/google-calendar'

// POST - Sync TMS events to Google Calendar
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

    if (syncSettings.syncDirection === 'GOOGLE_TO_TMS') {
      return NextResponse.json(
        { error: 'Sync direction is set to import only' },
        { status: 400 }
      )
    }

    // Enforce TMS_CALENDAR usage - find or create if not set
    let calendarId = syncSettings.googleCalendarId
    if (!calendarId || calendarId === 'primary') {
      try {
        calendarId = await googleCalendarService.findOrCreateTMSCalendar(session.user.id)
        console.log('Enforcing TMS_CALENDAR for sync:', calendarId)

        // Update sync settings with TMS_CALENDAR ID
        await prisma.calendarSyncSettings.update({
          where: { userId: session.user.id },
          data: { googleCalendarId: calendarId }
        })
      } catch (error) {
        console.error('Error enforcing TMS_CALENDAR:', error)
        return NextResponse.json(
          { error: 'Failed to find or create TMS_CALENDAR. Please reconnect Google Calendar.' },
          { status: 500 }
        )
      }
    }

    // Fetch TMS events that should be synced
    const tmsEvents = await prisma.event.findMany({
      where: {
        creatorId: session.user.id,
        // Only sync events that haven't been synced yet or need updating
        OR: [
          { googleCalendarEventId: null },
          { updatedAt: { gt: syncSettings.lastSyncedAt || new Date(0) } }
        ]
      },
      include: {
        team: true,
        task: true,
      }
    })

    console.log(`📊 Found ${tmsEvents.length} events to sync for user ${session.user.id}`)
    console.log(`📋 Event types: ${tmsEvents.map(e => `${e.title} (${e.type})`).join(', ')}`)

    // Fetch TMS tasks that should be synced
    const tmsTasks = await prisma.task.findMany({
      where: {
        AND: [
          // User must be involved in the task
          {
            OR: [
              { creatorId: session.user.id },
              { assigneeId: session.user.id },
              {
                teamMembers: {
                  some: {
                    userId: session.user.id
                  }
                }
              },
              {
                collaborators: {
                  some: {
                    userId: session.user.id
                  }
                }
              }
            ]
          },
          // Task must have a due date
          { dueDate: { not: null } },
          // Sync ALL tasks (both new and existing):
          // - Tasks never synced before (googleCalendarEventId is null)
          // - Tasks synced but updated since last sync
          // - Tasks synced to wrong calendar (not TMS_CALENDAR)
          {
            OR: [
              { googleCalendarEventId: null },
              { updatedAt: { gt: syncSettings.lastSyncedAt || new Date(0) } },
              { googleCalendarId: { not: calendarId } }, // Re-sync if calendar changed
              { googleCalendarId: null } // Re-sync if no calendar ID stored
            ]
          }
        ]
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                name: true,
                email: true,
              }
            }
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                name: true,
                email: true,
              }
            }
          }
        },
        team: true,
      }
    })

    console.log(`Found ${tmsEvents.length} events and ${tmsTasks.length} tasks to sync for user ${session.user.id}`)

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Sync Events
    for (const event of tmsEvents) {
      try {
        // Check if should sync this type of event
        if (event.type === 'PERSONAL' && !syncSettings.syncPersonalEvents) {
          console.log(`⏭️  Skipping PERSONAL event: ${event.title}`)
          continue
        }
        if (event.teamId && !syncSettings.syncTeamEvents) {
          console.log(`⏭️  Skipping TEAM event: ${event.title}`)
          continue
        }
        if (event.type === 'DEADLINE' && !syncSettings.syncTaskDeadlines) {
          console.log(`⏭️  Skipping DEADLINE event: ${event.title}`)
          continue
        }

        // MILESTONE events (like OSSB) are always synced - they're important project markers
        console.log(`🔄 Syncing ${event.type} event: ${event.title} (ID: ${event.id})`)
        const googleEvent = googleCalendarService.convertTMSEventToGoogle(event)

        if (event.googleCalendarEventId) {
          // Update existing Google Calendar event
          await googleCalendarService.updateEvent(
            session.user.id,
            event.googleCalendarEventId,
            googleEvent,
            calendarId
          )

          await prisma.event.update({
            where: { id: event.id },
            data: { syncedAt: new Date() }
          })

          results.updated++
        } else {
          // Create new Google Calendar event
          const createdEvent = await googleCalendarService.createEvent(
            session.user.id,
            googleEvent,
            calendarId
          )

          await prisma.event.update({
            where: { id: event.id },
            data: {
              googleCalendarId: calendarId,
              googleCalendarEventId: createdEvent.id!,
              syncedAt: new Date()
            }
          })

          results.created++
        }
      } catch (error: any) {
        console.error(`Error syncing event ${event.id}:`, error)
        results.failed++
        results.errors.push(`${event.title}: ${error.message}`)
      }
    }

    // Sync Tasks (if syncTaskDeadlines is enabled)
    if (syncSettings.syncTaskDeadlines) {
      console.log(`Syncing ${tmsTasks.length} tasks to TMS_CALENDAR...`)

      for (const task of tmsTasks) {
        try {
          const googleEvent = googleCalendarService.convertTMSTaskToGoogle(task)

          if (task.googleCalendarEventId) {
            // Update existing Google Calendar event
            console.log(`Updating task "${task.title}" in TMS_CALENDAR (Event ID: ${task.googleCalendarEventId})`)

            await googleCalendarService.updateEvent(
              session.user.id,
              task.googleCalendarEventId,
              googleEvent,
              calendarId
            )

            await prisma.task.update({
              where: { id: task.id },
              data: {
                syncedAt: new Date(),
                googleCalendarId: calendarId // Ensure calendar ID is updated
              }
            })

            results.updated++
          } else {
            // Create new Google Calendar event
            console.log(`Creating new event for task "${task.title}" in TMS_CALENDAR`)

            const createdEvent = await googleCalendarService.createEvent(
              session.user.id,
              googleEvent,
              calendarId
            )

            await prisma.task.update({
              where: { id: task.id },
              data: {
                googleCalendarId: calendarId,
                googleCalendarEventId: createdEvent.id!,
                syncedAt: new Date()
              }
            })

            console.log(`Successfully created event for task "${task.title}" (Event ID: ${createdEvent.id})`)
            results.created++
          }
        } catch (error: any) {
          console.error(`Error syncing task ${task.id} ("${task.title}"):`, error)
          results.failed++
          results.errors.push(`[Task] ${task.title}: ${error.message}`)
        }
      }

      console.log(`Task sync complete: ${results.created} created, ${results.updated} updated, ${results.failed} failed`)
    } else {
      console.log('Task sync is disabled (syncTaskDeadlines = false)')
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
    console.error('Error syncing to Google Calendar:', error)
    return NextResponse.json(
      { error: 'Failed to sync events to Google Calendar' },
      { status: 500 }
    )
  }
}
