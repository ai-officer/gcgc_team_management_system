import { prisma } from '@/lib/prisma'

/**
 * Who may rate a task's work quality.
 *
 * Product decision (2026-06-29): every LEADER who is *in the task's kanban
 * board* can rate a member's work — not only the board owner or task creator.
 * "In the board" means any of:
 *   - the board owner,
 *   - a member of the board's team (any team-role — being a global LEADER is
 *     enough; you no longer have to be the team's LEADER), or
 *   - an explicit KanbanBoardMember.
 *
 * Plus everyone who can already finalize the task (admin / board-leader / owner
 * / parent-leader) — `canFinalize` folds that set in.
 *
 * The board-membership lookup is scoped server-side so a global LEADER can NOT
 * rate a task on a board they have no access to (guards the IDOR pattern this
 * codebase has already had to fix). Completion permission is intentionally NOT
 * widened here — only rating.
 */
export async function resolveCanRateWorkQuality(opts: {
  canFinalize: boolean
  isLeader: boolean
  isOwner: boolean
  hasTeamMembership: boolean
  boardId: string | null
  userId: string
}): Promise<boolean> {
  if (opts.canFinalize) return true
  if (!opts.isLeader) return false
  // A LEADER who owns the board, or belongs to the board's team, is in the board.
  if (opts.isOwner || opts.hasTeamMembership) return true
  if (!opts.boardId) return false
  // Otherwise check explicit board membership (personal/shared boards).
  const member = await prisma.kanbanBoardMember.findUnique({
    where: { boardId_userId: { boardId: opts.boardId, userId: opts.userId } },
    select: { id: true },
  })
  return !!member
}
