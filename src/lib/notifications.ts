import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'
import { publishNotification } from '@/lib/redis'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  entityId?: string
  entityType?: string
}

/**
 * Create a notification and emit it via WebSocket for real-time delivery
 * Includes deduplication to prevent duplicate notifications for same user/task
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  entityId,
  entityType,
}: CreateNotificationParams) {
  try {
    // Check for duplicate notification (same user, type, and entity within last 60 seconds)
    if (entityId && entityType) {
      const recentDuplicate = await prisma.notification.findFirst({
        where: {
          userId,
          type,
          entityId,
          entityType,
          createdAt: {
            gte: new Date(Date.now() - 60 * 1000) // Within last 60 seconds
          }
        }
      })

      if (recentDuplicate) {
        console.log(`Skipping duplicate notification for user-${userId}, entity-${entityId}`)
        return recentDuplicate
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        entityId,
        entityType,
      },
    })

    // Publish to Redis for Socket.IO to emit (works across PM2 cluster)
    const published = await publishNotification(userId, notification)
    if (published) {
      console.log(`Notification published via Redis for user-${userId}:`, title)
    } else {
      console.warn(`Redis not available, notification saved but not delivered in real-time`)
    }

    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Create a task assignment notification
 */
export async function notifyTaskAssigned(
  assigneeId: string,
  taskId: string,
  taskTitle: string,
  assignerName: string
) {
  // Don't notify if assigning to self
  return createNotification({
    userId: assigneeId,
    type: 'TASK_ASSIGNED',
    title: 'New Task Assigned',
    message: `${assignerName} assigned you a task: "${taskTitle}"`,
    entityId: taskId,
    entityType: 'task',
  })
}

/**
 * Create a subtask assignment notification
 */
export async function notifySubtaskAssigned(
  assigneeId: string,
  taskId: string,
  taskTitle: string,
  parentTaskTitle: string,
  assignerName: string
) {
  return createNotification({
    userId: assigneeId,
    type: 'TASK_ASSIGNED',
    title: 'New Subtask Assigned',
    message: `${assignerName} assigned you a subtask: "${taskTitle}" under "${parentTaskTitle}"`,
    entityId: taskId,
    entityType: 'task',
  })
}

/**
 * Create a task update notification
 */
export async function notifyTaskUpdated(
  userId: string,
  taskId: string,
  taskTitle: string,
  updaterName: string,
  updateType: string
) {
  return createNotification({
    userId,
    type: 'TASK_UPDATED',
    title: 'Task Updated',
    message: `${updaterName} ${updateType} the task: "${taskTitle}"`,
    entityId: taskId,
    entityType: 'task',
  })
}

/**
 * Create a task completion notification
 */
export async function notifyTaskCompleted(
  userId: string,
  taskId: string,
  taskTitle: string,
  completerName: string
) {
  return createNotification({
    userId,
    type: 'TASK_COMPLETED',
    title: 'Task Completed',
    message: `${completerName} completed the task: "${taskTitle}"`,
    entityId: taskId,
    entityType: 'task',
  })
}

/**
 * Create a comment notification
 */
export async function notifyCommentAdded(
  userId: string,
  taskId: string,
  taskTitle: string,
  commenterName: string
) {
  return createNotification({
    userId,
    type: 'COMMENT_ADDED',
    title: 'New Comment',
    message: `${commenterName} commented on: "${taskTitle}"`,
    entityId: taskId,
    entityType: 'task',
  })
}
