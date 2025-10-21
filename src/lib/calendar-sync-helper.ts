import { prisma } from '@/lib/prisma'
import { googleCalendarService } from '@/lib/google-calendar'

/**
 * Automatically sync a task to Google Calendar if sync is enabled
 */
export async function autoSyncTask(taskId: string, userId: string) {
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

    // Only sync if task has a due date
    if (!task.dueDate) {
      // If task previously had a Google Calendar event but no longer has due date, delete it
      if (task.googleCalendarEventId) {
        try {
          const calendarId = syncSettings.googleCalendarId || 'primary'
          await googleCalendarService.deleteEvent(
            userId,
            task.googleCalendarEventId,
            calendarId
          )
          
          await prisma.task.update({
            where: { id: taskId },
            data: {
              googleCalendarId: null,
              googleCalendarEventId: null,
              syncedAt: null
            }
          })
        } catch (error) {
          console.error('Error deleting Google Calendar event for task:', error)
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
        console.error('Error enforcing TMS_CALENDAR in autoSyncTask:', error)
        return // Skip sync if TMS_CALENDAR cannot be found/created
      }
    }

    const googleEvent = googleCalendarService.convertTMSTaskToGoogle(task)

    if (task.googleCalendarEventId) {
      // Update existing Google Calendar event
      await googleCalendarService.updateEvent(
        userId,
        task.googleCalendarEventId,
        googleEvent,
        calendarId
      )

      await prisma.task.update({
        where: { id: taskId },
        data: { syncedAt: new Date() }
      })
    } else {
      // Create new Google Calendar event
      const createdEvent = await googleCalendarService.createEvent(
        userId,
        googleEvent,
        calendarId
      )

      await prisma.task.update({
        where: { id: taskId },
        data: {
          googleCalendarId: calendarId,
          googleCalendarEventId: createdEvent.id!,
          syncedAt: new Date()
        }
      })
    }
  } catch (error) {
    console.error('Error auto-syncing task to Google Calendar:', error)
    // Don't throw - we don't want to break task creation/update if sync fails
  }
}

/**
 * Delete a task from Google Calendar
 */
export async function deleteSyncedTask(taskId: string, userId: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        googleCalendarEventId: true,
        googleCalendarId: true,
        title: true
      }
    })

    if (!task?.googleCalendarEventId) {
      console.log(`Task ${taskId} has no Google Calendar event to delete`)
      return // No synced event to delete
    }

    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId }
    })

    if (!syncSettings?.isEnabled) {
      console.log(`Sync not enabled for user ${userId}, skipping calendar deletion`)
      return // Sync not enabled
    }

    // Use the calendar ID stored with the task, or find TMS_CALENDAR
    let calendarId = task.googleCalendarId || syncSettings.googleCalendarId
    if (!calendarId || calendarId === 'primary') {
      try {
        calendarId = await googleCalendarService.findOrCreateTMSCalendar(userId)
        console.log(`Found/created TMS_CALENDAR for deletion: ${calendarId}`)
      } catch (error) {
        console.error('Error finding TMS_CALENDAR for delete:', error)
        return // Skip if TMS_CALENDAR cannot be found
      }
    }

    console.log(`Deleting task "${task.title}" from Google Calendar (Event ID: ${task.googleCalendarEventId}, Calendar ID: ${calendarId})`)

    await googleCalendarService.deleteEvent(
      userId,
      task.googleCalendarEventId,
      calendarId
    )

    console.log(`Successfully deleted task "${task.title}" from Google Calendar`)
  } catch (error) {
    console.error('Error deleting synced task from Google Calendar:', error)
    // Don't throw - we don't want to break task deletion if sync delete fails
  }
}

