import { prisma } from '@/lib/prisma'

/**
 * Authorization helper for task sub-resources (dependencies, procurement,
 * attachments, etc.).
 *
 * "Involved in a task" = the creator, the assigner, any assignee (the flat
 * TaskAssignee list and the legacy assigneeId), any team member, or any
 * collaborator. Admins always pass.
 *
 * Returns the looked-up task (or null when it doesn't exist) plus whether the
 * given user is involved, so callers can answer 404-vs-403 correctly.
 */
export async function getTaskInvolvement(
  taskId: string,
  userId: string,
  isAdmin: boolean,
): Promise<{ task: { id: string } | null; involved: boolean }> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      creatorId: true,
      assigneeId: true,
      assignedById: true,
      assignees: { select: { userId: true } },
      teamMembers: { select: { userId: true } },
      collaborators: { select: { userId: true } },
    },
  })
  if (!task) return { task: null, involved: false }
  const involved =
    isAdmin ||
    task.creatorId === userId ||
    task.assigneeId === userId ||
    task.assignedById === userId ||
    task.assignees.some((a) => a.userId === userId) ||
    task.teamMembers.some((m) => m.userId === userId) ||
    task.collaborators.some((c) => c.userId === userId)
  return { task: { id: task.id }, involved }
}
