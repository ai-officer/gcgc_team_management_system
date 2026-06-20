import { UserRole, TeamMemberRole } from '@prisma/client'
import { PERMISSIONS } from '@/constants'

export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete'
  scope: 'own' | 'team' | 'all'
}

// Define permissions for each role
export const rolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    // System permissions
    { resource: PERMISSIONS.RESOURCES.SYSTEM, action: 'create', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.SYSTEM, action: 'read', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.SYSTEM, action: 'update', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.SYSTEM, action: 'delete', scope: 'all' },
    
    // User permissions
    { resource: PERMISSIONS.RESOURCES.USER, action: 'create', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.USER, action: 'read', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.USER, action: 'update', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.USER, action: 'delete', scope: 'all' },
    
    // Team permissions
    { resource: PERMISSIONS.RESOURCES.TEAM, action: 'create', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.TEAM, action: 'read', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.TEAM, action: 'update', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.TEAM, action: 'delete', scope: 'all' },
    
    // Task permissions
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'create', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'read', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'update', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'delete', scope: 'all' },
    
    // Event permissions
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'create', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'read', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'update', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'delete', scope: 'all' },
    
    // Comment permissions
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'create', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'read', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'update', scope: 'all' },
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'delete', scope: 'all' },
  ],
  
  LEADER: [
    // User permissions (limited)
    { resource: PERMISSIONS.RESOURCES.USER, action: 'create', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.USER, action: 'read', scope: 'team' },
    
    // Team permissions
    { resource: PERMISSIONS.RESOURCES.TEAM, action: 'read', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.TEAM, action: 'update', scope: 'team' },
    
    // Task permissions
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'create', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'read', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'update', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'delete', scope: 'team' },
    
    // Event permissions
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'create', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'read', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'update', scope: 'own' },
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'delete', scope: 'own' },
    
    // Comment permissions
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'create', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'read', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'update', scope: 'own' },
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'delete', scope: 'own' },
  ],
  
  MEMBER: [
    // User permissions (own only)
    { resource: PERMISSIONS.RESOURCES.USER, action: 'read', scope: 'own' },
    { resource: PERMISSIONS.RESOURCES.USER, action: 'update', scope: 'own' },
    
    // Team permissions (read only)
    { resource: PERMISSIONS.RESOURCES.TEAM, action: 'read', scope: 'team' },
    
    // Task permissions
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'create', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'read', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.TASK, action: 'update', scope: 'own' },
    
    // Event permissions
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'create', scope: 'own' },
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'read', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'update', scope: 'own' },
    { resource: PERMISSIONS.RESOURCES.EVENT, action: 'delete', scope: 'own' },
    
    // Comment permissions
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'create', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'read', scope: 'team' },
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'update', scope: 'own' },
    { resource: PERMISSIONS.RESOURCES.COMMENT, action: 'delete', scope: 'own' },
  ],
}

export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete',
  scope?: 'own' | 'team' | 'all'
): boolean {
  const permissions = rolePermissions[userRole]
  
  return permissions.some(permission => 
    permission.resource === resource &&
    permission.action === action &&
    (scope ? permission.scope === scope || permission.scope === 'all' : true)
  )
}

export function canAccessResource(
  userRole: UserRole,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete'
): boolean {
  return hasPermission(userRole, resource, action)
}

export function getMaxScope(
  userRole: UserRole,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete'
): 'own' | 'team' | 'all' | null {
  const permissions = rolePermissions[userRole]
  
  const relevantPermissions = permissions.filter(permission =>
    permission.resource === resource && permission.action === action
  )
  
  if (relevantPermissions.length === 0) return null
  
  // Return the broadest scope available
  if (relevantPermissions.some(p => p.scope === 'all')) return 'all'
  if (relevantPermissions.some(p => p.scope === 'team')) return 'team'
  if (relevantPermissions.some(p => p.scope === 'own')) return 'own'
  
  return null
}

export function isTeamLeader(teamMemberRole?: TeamMemberRole): boolean {
  return teamMemberRole === 'LEADER'
}

export function canManageTeam(userRole: UserRole, teamMemberRole?: TeamMemberRole): boolean {
  return userRole === 'ADMIN' || isTeamLeader(teamMemberRole)
}

export function canAssignTasks(userRole: UserRole, teamMemberRole?: TeamMemberRole): boolean {
  return userRole === 'ADMIN' || userRole === 'LEADER' || isTeamLeader(teamMemberRole)
}

export function canDeleteTask(
  userRole: UserRole,
  taskCreatorId: string,
  userId: string,
  assignedById?: string,
  teamMemberRole?: TeamMemberRole
): boolean {
  // Admin can delete any task
  if (userRole === 'ADMIN') return true
  
  // Task creator can delete their own task
  if (taskCreatorId === userId) return true
  
  // Leader who assigned the task can delete it
  if (userRole === 'LEADER' && assignedById === userId) return true
  
  // Team leader can delete tasks in their team
  if (userRole === 'LEADER' && isTeamLeader(teamMemberRole)) return true
  
  return false
}

export function canEditTask(
  userRole: UserRole,
  taskCreatorId: string,
  taskAssigneeId: string | null,
  userId: string,
  teamMemberRole?: TeamMemberRole
): boolean {
  // Admin can edit any task
  if (userRole === 'ADMIN') return true
  
  // Task creator can edit their task
  if (taskCreatorId === userId) return true
  
  // Task assignee can edit assigned task (only if they are also the creator OR it was directly assigned to them by a leader)
  if (taskAssigneeId === userId) {
    // If user is both creator and assignee, they can edit
    if (taskCreatorId === userId) return true
    
    // If user is assigned by a leader (not a collaborator/team member), they can edit
    // This will be handled by checking if the task is a direct assignment
    return true // For now, keep existing behavior for direct assignments
  }
  
  // Team leader can edit tasks in their team
  if (userRole === 'LEADER' && isTeamLeader(teamMemberRole)) return true
  
  return false
}

// Finishers — who may mark a task COMPLETED (set progress to 100%).
//
// Task-model redesign (flat "Assigned To"): completion is reserved for the
// people who delegate/own the work, never the assignees who do it. Assignees
// submit for review (IN_REVIEW); a finisher reviews and marks it done. The
// locked decision is "creator / board-leader / admin only"; we also honor:
//   - assignedById — the delegator who handed out the task. In practice this
//     is always a leader/creator, and the delegator is the natural reviewer,
//     so they may finalize even when they aren't the board's designated leader
//     (e.g. multi-leader / cross-team assignments).
//   - isParentLeader — for a subtask, the creator/assignee of its parent is
//     the finisher (the subtask analog of creator/board-leader).
export function canFinalizeTask(opts: {
  userRole: UserRole
  creatorId: string
  assignedById?: string | null
  userId: string
  isBoardLeader?: boolean   // viewer is a LEADER and the team-leader of this task's board/team
  isParentLeader?: boolean  // viewer is the creator/assignee of this subtask's parent
}): boolean {
  const { userRole, creatorId, assignedById, userId, isBoardLeader, isParentLeader } = opts
  if (userRole === 'ADMIN') return true
  if (creatorId === userId) return true
  if (assignedById && assignedById === userId) return true
  if (userRole === 'LEADER' && isBoardLeader) return true
  if (isParentLeader) return true
  return false
}

// Who can change a task's status. Flat assignee model (taskType-agnostic):
// finishers can move it anywhere (incl. COMPLETED); any assignee — the direct
// assignee, a team member, or a collaborator — can move it between non-completed
// statuses (e.g. submit for review). `taskType` is retained in the signature for
// callers during the redesign but is no longer used.
export function canChangeTaskStatus(
  userRole: UserRole,
  taskCreatorId: string,
  taskAssigneeId: string | null,
  userId: string,
  _taskType: string,
  isTeamMember: boolean,
  isCollaborator: boolean,
  teamMemberRole?: TeamMemberRole,
  targetStatus?: string
): boolean {
  // Admin can change any task status
  if (userRole === 'ADMIN') return true

  // Task creator can always change their task status
  if (taskCreatorId === userId) return true

  // Board leaders can change task status for tasks in their teams
  if (userRole === 'LEADER' && isTeamLeader(teamMemberRole)) return true

  // Any assignee (direct assignee, team member, or collaborator) can move the
  // task between non-completed statuses. Final COMPLETED is a finisher action.
  const isAssignee = taskAssigneeId === userId || isTeamMember || isCollaborator
  if (isAssignee) {
    return targetStatus !== 'COMPLETED'
  }

  return false
}