import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type Tx = Prisma.TransactionClient

/**
 * Load a board the user is allowed to move tasks INTO. Returns null if the
 * board doesn't exist or the user can't access it. Access = admin, owner,
 * board member, or a member of the board's team. Mirrors GET /api/boards.
 */
export async function loadAccessibleBoard(boardId: string, userId: string, isAdmin: boolean) {
  return prisma.kanbanBoard.findFirst({
    where: isAdmin
      ? { id: boardId }
      : {
          id: boardId,
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
            { team: { members: { some: { userId } } } },
          ],
        },
    select: { id: true, name: true, teamId: true },
  })
}

/**
 * Map of a board's default BoardStatus id per category, so a moved task lands
 * in the target board's matching default column. Empty for an uncustomized
 * board (or boardId null) — callers then leave customStatusId null and the UI
 * falls back to the category's default column.
 */
export async function buildDefaultStatusMap(tx: Tx, boardId: string | null): Promise<Map<string, string>> {
  if (!boardId) return new Map()
  const defs = await tx.boardStatus.findMany({
    where: { boardId, isDefault: true },
    select: { id: true, category: true },
  })
  return new Map(defs.map((d) => [d.category as string, d.id]))
}

/**
 * Move a task (and its subtasks) onto the target board within a transaction:
 * - point boardId at the target (null = no board)
 * - set teamId to the target board's team (null for a personal board)
 * - reset customStatusId to the target's default column for each task's category
 * - clear per-board custom field values (they belong to the old board)
 * Assignees / collaborators are intentionally left untouched.
 */
export async function moveTaskAndSubtasks(
  tx: Tx,
  taskId: string,
  targetBoardId: string | null,
  targetTeamId: string | null,
  statusMap: Map<string, string>
) {
  const ids = [taskId, ...(await tx.task.findMany({
    where: { parentId: taskId },
    select: { id: true },
  })).map((s) => s.id)]

  for (const id of ids) {
    const t = await tx.task.findUnique({ where: { id }, select: { status: true } })
    if (!t) continue
    await tx.task.update({
      where: { id },
      data: {
        boardId: targetBoardId,
        teamId: targetTeamId,
        customStatusId: statusMap.get(t.status as string) ?? null,
      },
    })
    await tx.taskFieldValue.deleteMany({ where: { taskId: id } })
  }
}
