import { prisma } from '@/lib/prisma'

/**
 * Reconcile a task's board/team link. team↔board is 1:1 (KanbanBoard.teamId is unique).
 * `boardId` is canonical (the board switcher sends it); when present we derive `teamId`
 * from the board. If only `teamId` is given (programmatic team task creation), we derive
 * its board. Guarantees the two fields never disagree.
 */
export async function resolveTeamBoardLink(input: {
  boardId?: string | null
  teamId?: string | null
}): Promise<{ boardId: string | null; teamId: string | null }> {
  let boardId = input.boardId ?? null
  let teamId = input.teamId ?? null

  if (boardId) {
    const board = await prisma.kanbanBoard.findUnique({
      where: { id: boardId },
      select: { teamId: true },
    })
    teamId = board?.teamId ?? null
  } else if (teamId) {
    const board = await prisma.kanbanBoard.findUnique({
      where: { teamId },
      select: { id: true },
    })
    boardId = board?.id ?? null
  }

  return { boardId, teamId }
}
