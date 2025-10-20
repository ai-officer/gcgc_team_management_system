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

    const calendarId = syncSettings.googleCalendarId || 'primary'
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
      select: { googleCalendarEventId: true }
    })

    if (!task?.googleCalendarEventId) {
      return // No synced event to delete
    }

    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId }
    })

    if (!syncSettings?.isEnabled) {
      return // Sync not enabled
    }

    const calendarId = syncSettings.googleCalendarId || 'primary'
    
    await googleCalendarService.deleteEvent(
      userId,
      task.googleCalendarEventId,
      calendarId
    )
  } catch (error) {
    console.error('Error deleting synced task from Google Calendar:', error)
    // Don't throw - we don't want to break task deletion if sync delete fails
  }
}

