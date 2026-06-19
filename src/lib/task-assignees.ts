import type { Prisma, PrismaClient } from '@prisma/client'

type Tx = Prisma.TransactionClient | PrismaClient

/**
 * Phase 2 (task-model redesign) dual-write helper. Keeps the flat
 * `TaskAssignee` list in sync with whoever is assigned to a task, written
 * alongside the legacy `assigneeId` / `teamMembers` / `collaborators` until the
 * read paths switch over in Phase 3.
 *
 * Replaces the task's full assignee set with the given user ids (de-duped,
 * nulls dropped). Safe to call inside or outside a transaction.
 */
export async function setTaskAssignees(
  tx: Tx,
  taskId: string,
  userIds: (string | null | undefined)[],
): Promise<void> {
  const unique = Array.from(new Set(userIds.filter((u): u is string => !!u)))
  await tx.taskAssignee.deleteMany({ where: { taskId } })
  if (unique.length > 0) {
    await tx.taskAssignee.createMany({
      data: unique.map(userId => ({ taskId, userId })),
      skipDuplicates: true,
    })
  }
}
