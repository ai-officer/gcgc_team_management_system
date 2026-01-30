import { prisma } from '@/lib/prisma'
import { googleCalendarService } from '@/lib/google-calendar'

/**
 * Automatically sync a task to Google Calendar for a specific user if sync is enabled
 * Uses UserTaskCalendarSync table to track per-user calendar events
 */
async function syncTaskForUser(taskId: string, userId: string) {
  try {
    // Check if user has Google Calendar sync enabled
    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId }
    })

    if (!syncSettings?.isEnabled || !syncSettings.syncTaskDeadlines) {
      return // Sync not enabled or task deadlines not being synced
    }

    if (syncSettings.syncDirection === 'GOOGLE_TO_TMS') {
      return // Only importing from Google, not exporting
    }

    // Fetch the task with all details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
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

    if (!task) {
      return // Task not found
    }

    // Check if this user already has a calendar event for this task
    const existingSync = await prisma.userTaskCalendarSync.findUnique({
      where: {
        userId_taskId: {
          userId,
          taskId
        }
      }
    })

    // Only sync if task has a due date
    if (!task.dueDate) {
      // If user previously had a calendar event but task no longer has due date, delete it
      if (existingSync) {
        try {
          await googleCalendarService.deleteEvent(
            userId,
            existingSync.googleCalendarEventId,
            existingSync.googleCalendarId
          )

          await prisma.userTaskCalendarSync.delete({
            where: { id: existingSync.id }
          })
        } catch (error) {
          console.error(`Error deleting calendar event for user ${userId}:`, error)
        }
      }
      return
    }

    // Enforce TMS_CALENDAR usage
    let calendarId = syncSettings.googleCalendarId
    if (!calendarId || calendarId === 'primary') {
      try {
        calendarId = await googleCalendarService.findOrCreateTMSCalendar(userId)
        // Update sync settings with TMS_CALENDAR ID
        await prisma.calendarSyncSettings.update({
          where: { userId },
          data: { googleCalendarId: calendarId }
        })
      } catch (error) {
        console.error('Error enforcing TMS_CALENDAR in syncTaskForUser:', error)
        return // Skip sync if TMS_CALENDAR cannot be found/created
      }
    }

    const googleEvent = googleCalendarService.convertTMSTaskToGoogle(task)

    if (existingSync) {
      // Update existing Google Calendar event
      await googleCalendarService.updateEvent(
        userId,
        existingSync.googleCalendarEventId,
        googleEvent,
        calendarId
      )

      await prisma.userTaskCalendarSync.update({
        where: { id: existingSync.id },
        data: {
          syncedAt: new Date(),
          googleCalendarId: calendarId
        }
      })
    } else {
      // Create new Google Calendar event
      const createdEvent = await googleCalendarService.createEvent(
        userId,
        googleEvent,
        calendarId
      )

      await prisma.userTaskCalendarSync.create({
        data: {
          userId,
          taskId,
          googleCalendarId: calendarId,
          googleCalendarEventId: createdEvent.id!,
        }
      })
    }

    console.log(`Task ${taskId} synced to calendar for user ${userId}`)
  } catch (error) {
    console.error(`Error syncing task ${taskId} for user ${userId}:`, error)
    // Don't throw - we don't want to break task creation/update if sync fails
  }
}

/**
 * Automatically sync a task to Google Calendar for all involved users
 * This includes: creator, assignee, team members, and collaborators
 */
export async function autoSyncTask(taskId: string, triggerUserId: string) {
  try {
    // First, sync for the user who triggered the action (creator/updater)
    await syncTaskForUser(taskId, triggerUserId)

    // Get all users involved in this task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        creatorId: true,
        assigneeId: true,
        teamMembers: {
          select: { userId: true }
        },
        collaborators: {
          select: { userId: true }
        }
      }
    })

    if (!task) {
      return
    }

    // Collect all unique user IDs involved in the task
    const involvedUserIds = new Set<string>()

    if (task.creatorId) involvedUserIds.add(task.creatorId)
    if (task.assigneeId) involvedUserIds.add(task.assigneeId)
    task.teamMembers.forEach(tm => involvedUserIds.add(tm.userId))
    task.collaborators.forEach(c => involvedUserIds.add(c.userId))

    // Remove the trigger user (already synced above)
    involvedUserIds.delete(triggerUserId)

    // Sync for each other involved user (in parallel for speed)
    const syncPromises = Array.from(involvedUserIds).map(userId =>
      syncTaskForUser(taskId, userId).catch(error => {
        console.error(`Error syncing task ${taskId} for user ${userId}:`, error)
      })
    )

    await Promise.all(syncPromises)

    console.log(`Task ${taskId} synced to calendars for ${involvedUserIds.size + 1} users`)
  } catch (error) {
    console.error('Error in autoSyncTask:', error)
    // Don't throw - we don't want to break task creation/update if sync fails
  }
}

/**
 * Delete a task from Google Calendar for all users who have it synced
 */
export async function deleteSyncedTask(taskId: string, _userId: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        title: true
      }
    })

    // Find all users who have this task synced to their calendar
    const userSyncs = await prisma.userTaskCalendarSync.findMany({
      where: { taskId }
    })

    if (userSyncs.length === 0) {
      console.log(`Task ${taskId} has no synced calendar events to delete`)
      return
    }

    console.log(`Deleting task "${task?.title}" from ${userSyncs.length} user calendars`)

    // Delete from each user's calendar in parallel
    const deletePromises = userSyncs.map(async (sync) => {
      try {
        await googleCalendarService.deleteEvent(
          sync.userId,
          sync.googleCalendarEventId,
          sync.googleCalendarId
        )

        // Remove the sync record
        await prisma.userTaskCalendarSync.delete({
          where: { id: sync.id }
        })

        console.log(`Deleted calendar event for user ${sync.userId}`)
      } catch (error) {
        console.error(`Error deleting calendar event for user ${sync.userId}:`, error)
      }
    })

    await Promise.all(deletePromises)

    console.log(`Successfully deleted task "${task?.title}" from all user calendars`)
  } catch (error) {
    console.error('Error deleting synced task from Google Calendar:', error)
    // Don't throw - we don't want to break task deletion if sync delete fails
  }
}

