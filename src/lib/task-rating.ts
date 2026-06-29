import { prisma } from '@/lib/prisma'

/**
 * Who may rate a task's work quality.
 *
 * Product decision (2026-06-29): every LEADER who is *in the task's kanban
 * board* can rate a member's work — not only the board owner or task creator.
 * "In the board" means any of:
 *   - the board owner,
 *   - an explicit KanbanBoardMember, or
 *   - a member of the BOARD's team (board↔team is 1:1 via KanbanBoard.teamId).
 *
 * Plus everyone who can already finalize the task (admin / board-leader / owner
 * / parent-leader) — `canFinalize` folds that set in.
 *
 * IMPORTANT — scope to the *board's* team, NOT the task's `teamId`. Tasks created
 * before team↔board derivation existed have `teamId = null` even though they sit
 * on a team board (see resolveTeamBoardLink, "teamId was always null here"). Using
 * the task's teamId would leave every such *old* task unrateable by team leaders
 * who aren't explicit board members. The board's teamId is always correct.
 *
 * Board access is verified server-side so a global LEADER can NOT rate a task on
 * a board they have no access to. Completion permission is intentionally NOT
 * widened here — only rating.
 */
export async function resolveCanRateWorkQuality(opts: {
  canFinalize: boolean
  isLeader: boolean
  userId: string
  boardId: string | null
  boardOwnerId: string | null
  boardTeamId: string | null
  // Fallback team for board-less tasks (those never attached to a kanban board).
  taskTeamId: string | null
}): Promise<boolean> {
  if (opts.canFinalize) return true
  if (!opts.isLeader) return false

  if (opts.boardId) {
    // Board task: "in the board" = owner, explicit member, or board-team member.
    if (opts.boardOwnerId && opts.boardOwnerId === opts.userId) return true
    const member = await prisma.kanbanBoardMember.findUnique({
      where: { boardId_userId: { boardId: opts.boardId, userId: opts.userId } },
      select: { id: true },
    })
    if (member) return true
    if (opts.boardTeamId) {
      const tm = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: opts.userId, teamId: opts.boardTeamId } },
        select: { id: true },
      })
      if (tm) return true
    }
    return false
  }

  // Board-less task: fall back to membership in the task's own team.
  if (opts.taskTeamId) {
    const tm = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: opts.userId, teamId: opts.taskTeamId } },
      select: { id: true },
    })
    return !!tm
  }
  return false
}
