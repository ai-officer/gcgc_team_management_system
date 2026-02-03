import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'

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

    // Emit socket event for real-time notification
    if (global.io) {
      global.io.to(`user-${userId}`).emit('new-notification', {
        notification,
        timestamp: new Date().toISOString(),
      })
      console.log(`Notification emitted to user-${userId}:`, title)
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
