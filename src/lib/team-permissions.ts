import type { TeamMemberRole } from '@prisma/client'

export type TeamMemberLite = { userId: string; role: TeamMemberRole }

/** A team leader is any member whose per-team role is LEADER (the owner is stored as a LEADER member). */
export function isTeamLeaderRole(role: TeamMemberRole | undefined | null): boolean {
  return role === 'LEADER'
}

/**
 * Can `userId` manage this team (rename, manage members, manage the team board)?
 * True if they are the recorded owner OR any LEADER member. All team leaders have
 * equal rights; the owner has no extra authority. Admin override is handled by callers.
 */
export function canManageTeam(
  userId: string,
  team: { ownerId: string | null; members: TeamMemberLite[] }
): boolean {
  if (team.ownerId && team.ownerId === userId) return true
  return team.members.some((m) => m.userId === userId && m.role === 'LEADER')
}

export type RoleChange =
  | { userId: string; action: 'remove' }
  | { userId: string; action: 'setRole'; role: TeamMemberRole }

/**
 * Returns true if applying `change` to `members` would leave the team with zero LEADER members.
 * Enforces the invariant: a team must always keep at least one leader.
 */
export function wouldLeaveTeamLeaderless(
  members: TeamMemberLite[],
  change: RoleChange
): boolean {
  const after = members
    .filter((m) => !(change.action === 'remove' && m.userId === change.userId))
    .map((m) =>
      change.action === 'setRole' && m.userId === change.userId
        ? { ...m, role: change.role }
        : m
    )
  return after.every((m) => m.role !== 'LEADER')
}
