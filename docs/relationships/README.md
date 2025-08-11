# Relationships & Hierarchy Guide

This guide explains the complex relationships, hierarchical structures, and data flow patterns in the GCGC Team Management System.

## 📋 Table of Contents
- [System Architecture](#system-architecture)
- [User Hierarchy](#user-hierarchy)
- [Team Relationships](#team-relationships)
- [Task Dependencies](#task-dependencies)
- [Permission Inheritance](#permission-inheritance)
- [Data Flow Patterns](#data-flow-patterns)
- [Relationship Constraints](#relationship-constraints)

## 🏗️ System Architecture

### Entity Relationship Overview
```
User ──┬── TeamMember ──── Team
       │       │              │
       │       └── Role        │
       │                      │
       ├── Task ──────────────┘
       │   │
       │   ├── Comment
       │   ├── Attachment
       │   └── TimeEntry
       │
       ├── Event ─────────────┐
       │                      │
       ├── Activity ──────────┘
       │
       └── Notification
```

### Core Relationship Types
1. **One-to-Many**: User → Tasks (creator relationship)
2. **Many-to-Many**: User ↔ Team (via TeamMember junction table)
3. **Self-Referential**: Task → Task (dependencies)
4. **Polymorphic**: Activity → (User | Team | Task)

## 👥 User Hierarchy

### Role-Based Hierarchy
```
ADMIN (System Level)
  │
  ├── Global system access
  ├── All team management
  ├── User account management
  └── System configuration
      │
      └── LEADER (Team Level)
            │
            ├── Team management
            ├── Member supervision
            ├── Task assignment
            └── Team reporting
                  │
                  └── MEMBER (Individual Level)
                        │
                        ├── Task execution
                        ├── Personal profile
                        ├── Team participation
                        └── Task reporting
```

### Permission Inheritance Model
```typescript
interface PermissionHierarchy {
  ADMIN: {
    inherits: [];
    permissions: [
      // System permissions
      'system:*',
      // Global team permissions  
      'team:*',
      // Global user permissions
      'user:*',
      // All task permissions
      'task:*'
    ];
  };
  
  LEADER: {
    inherits: ['MEMBER'];
    permissions: [
      // Team-specific permissions
      'team:manage',
      'team:invite',
      'team:settings',
      // Task management
      'task:create',
      'task:assign', 
      'task:approve',
      // Member oversight
      'member:view',
      'member:assign'
    ];
  };
  
  MEMBER: {
    inherits: [];
    permissions: [
      // Basic task permissions
      'task:view',
      'task:update_own',
      'task:comment',
      // Profile management
      'profile:update_own',
      // Team participation
      'team:view',
      'team:participate'
    ];
  };
}
```

### Contextual Permissions
```typescript
interface ContextualPermission {
  userId: string;
  resource: 'task' | 'team' | 'user';
  resourceId: string;
  action: string;
  context: {
    teamRole?: TeamRole;
    isOwner?: boolean;
    isAssignee?: boolean;
    teamMembership?: boolean;
  };
}

// Example: User can update task if they are assignee OR team leader
function canUpdateTask(user: User, task: Task): boolean {
  return (
    task.assigneeId === user.id ||
    isTeamLeader(user.id, task.teamId) ||
    user.role === 'ADMIN'
  );
}
```

## 🏢 Team Relationships

### Team Structure Models

#### Flat Team Structure
```typescript
interface FlatTeamStructure {
  team: Team;
  leader: User;
  members: User[];
  
  // All members are equal within the team
  // Single leader per team
  // Direct reporting to leader
}
```

#### Hierarchical Team Structure
```typescript
interface HierarchicalTeamStructure {
  team: Team;
  hierarchy: {
    leaders: User[];
    seniors: User[];
    juniors: User[];
  };
  
  // Multiple leadership levels
  // Cascading supervision
  // Delegated authority
}
```

### Team Membership Management
```typescript
interface TeamMemberRelationship {
  id: string;
  userId: string;
  teamId: string;
  role: TeamRole;
  permissions: TeamPermission[];
  joinedAt: Date;
  invitedBy?: string;
  
  // Relationship metadata
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_INVITATION';
  contributionScore: number;
  lastActiveAt: Date;
}
```

### Multi-Team Membership
```typescript
interface UserTeamRelationships {
  userId: string;
  memberships: Array<{
    teamId: string;
    role: TeamRole;
    isPrimary: boolean; // Primary team for the user
    workloadAllocation: number; // Percentage of time
    effectivePermissions: Permission[];
  }>;
  
  // Cross-team relationships
  collaborations: Array<{
    fromTeamId: string;
    toTeamId: string;
    type: 'RESOURCE_SHARING' | 'PROJECT_COLLABORATION';
    permissions: Permission[];
  }>;
}
```

### Team Inheritance Patterns
```typescript
interface TeamInheritance {
  parentTeam?: string;
  childTeams: string[];
  
  // Inherited properties
  inheritedSettings: {
    permissions: boolean;
    workflowTemplates: boolean;
    reportingStructure: boolean;
  };
  
  // Override capabilities
  overrides: {
    canOverridePermissions: boolean;
    canOverrideWorkflows: boolean;
    requiresParentApproval: boolean;
  };
}
```

## 🔗 Task Dependencies

### Dependency Types
```typescript
enum TaskDependencyType {
  BLOCKS = 'BLOCKS',                    // Task A blocks Task B
  DEPENDS_ON = 'DEPENDS_ON',            // Task A depends on Task B
  RELATED = 'RELATED',                  // Tasks are related but not blocking
  MILESTONE = 'MILESTONE',              // Task is a milestone for others
  SUBTASK = 'SUBTASK'                   // Task is subtask of another
}
```

### Dependency Relationships
```typescript
interface TaskDependency {
  id: string;
  fromTaskId: string;    // Predecessor task
  toTaskId: string;      // Successor task
  type: TaskDependencyType;
  
  // Dependency constraints
  lagTime?: number;      // Minimum time between tasks (hours)
  leadTime?: number;     // Overlap time allowed (hours)
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}
```

### Dependency Validation
```typescript
interface DependencyValidation {
  // Prevent circular dependencies
  detectCircularDependency(taskId: string): boolean;
  
  // Validate dependency chains
  validateDependencyChain(taskIds: string[]): ValidationResult;
  
  // Calculate critical path
  calculateCriticalPath(projectTasks: Task[]): CriticalPath;
  
  // Schedule validation
  validateScheduleWithDependencies(tasks: ScheduledTask[]): ScheduleValidation;
}
```

### Dependency Impact Analysis
```typescript
interface DependencyImpact {
  taskId: string;
  
  // Upstream dependencies (tasks this depends on)
  prerequisites: Array<{
    taskId: string;
    type: TaskDependencyType;
    status: TaskStatus;
    estimatedCompletionDate: Date;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  
  // Downstream dependencies (tasks that depend on this)
  dependents: Array<{
    taskId: string;
    type: TaskDependencyType;
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    delayPropagation: number; // Days of delay this would cause
  }>;
  
  // Critical path involvement
  isOnCriticalPath: boolean;
  criticalPathImpact: number; // Days impact on project completion
}
```

## 🔐 Permission Inheritance

### Permission Resolution Algorithm
```typescript
interface PermissionResolution {
  resolveUserPermissions(userId: string, resourceId: string): Permission[] {
    const basePermissions = getUserRolePermissions(userId);
    const teamPermissions = getTeamMemberPermissions(userId, resourceId);
    const contextPermissions = getContextualPermissions(userId, resourceId);
    const inheritedPermissions = getInheritedPermissions(userId);
    
    // Merge with priority: Context > Team > Inherited > Base
    return mergePermissions([
      basePermissions,
      inheritedPermissions,
      teamPermissions,
      contextPermissions
    ]);
  }
}
```

### Permission Scoping
```typescript
interface PermissionScope {
  // Global permissions (Admin only)
  global: {
    resource: '*';
    actions: string[];
  };
  
  // Team-scoped permissions
  team: {
    teamId: string;
    resource: 'team' | 'task' | 'member';
    actions: string[];
    constraints?: PermissionConstraint[];
  };
  
  // Resource-specific permissions
  resource: {
    resourceType: string;
    resourceId: string;
    actions: string[];
    conditions?: PermissionCondition[];
  };
}
```

### Dynamic Permission Calculation
```typescript
interface DynamicPermissions {
  // Time-based permissions
  timeBasedPermissions: {
    validFrom: Date;
    validTo: Date;
    permissions: Permission[];
  }[];
  
  // Condition-based permissions
  conditionalPermissions: Array<{
    condition: PermissionCondition;
    permissions: Permission[];
  }>;
  
  // Delegation permissions
  delegatedPermissions: Array<{
    delegatedBy: string;
    delegatedAt: Date;
    permissions: Permission[];
    constraints: DelegationConstraint[];
  }>;
}
```

## 📊 Data Flow Patterns

### Event-Driven Updates
```typescript
interface DataFlowEvent {
  type: 'USER_CREATED' | 'TEAM_UPDATED' | 'TASK_ASSIGNED' | 'MEMBER_ADDED';
  payload: Record<string, any>;
  source: string;
  timestamp: Date;
  
  // Cascade effects
  triggers: Array<{
    action: string;
    targetEntities: string[];
    delay?: number;
  }>;
}
```

### Relationship Synchronization
```typescript
interface RelationshipSync {
  // User-Team relationship changes
  onTeamMemberAdded: (userId: string, teamId: string) => {
    // Update user's team list
    // Update team member count
    // Create welcome activity
    // Send notifications
    // Update permissions cache
  };
  
  // Task assignment changes
  onTaskAssigned: (taskId: string, assigneeId: string) => {
    // Update task assignee
    // Update user's task list
    // Create activity log
    // Send notifications
    // Update workload metrics
  };
}
```

### Cross-Entity Validation
```typescript
interface CrossEntityValidation {
  // Validate team membership before task assignment
  validateTaskAssignment(taskId: string, assigneeId: string): ValidationResult {
    const task = getTask(taskId);
    const user = getUser(assigneeId);
    const isTeamMember = checkTeamMembership(user.id, task.teamId);
    
    return {
      valid: isTeamMember,
      errors: isTeamMember ? [] : ['User is not a member of the task team'],
      warnings: []
    };
  }
  
  // Validate team deletion impact
  validateTeamDeletion(teamId: string): ValidationResult {
    const activeTasks = getActiveTasksByTeam(teamId);
    const memberCount = getTeamMemberCount(teamId);
    
    return {
      valid: activeTasks.length === 0,
      errors: activeTasks.length > 0 ? ['Team has active tasks'] : [],
      warnings: memberCount > 0 ? ['Team has members who will lose access'] : []
    };
  }
}
```

## ⚠️ Relationship Constraints

### Database Constraints
```sql
-- Ensure user can only be team leader once per team
ALTER TABLE team_members 
ADD CONSTRAINT unique_team_leader 
UNIQUE (team_id) WHERE role = 'LEADER';

-- Prevent self-referential task dependencies
ALTER TABLE task_dependencies 
ADD CONSTRAINT no_self_dependency 
CHECK (from_task_id != to_task_id);

-- Ensure task assignee is team member
ALTER TABLE tasks 
ADD CONSTRAINT fk_assignee_team_member 
FOREIGN KEY (assignee_id, team_id) 
REFERENCES team_members (user_id, team_id);
```

### Business Logic Constraints
```typescript
interface BusinessConstraints {
  // Team constraints
  maxTeamSize: number;
  minTeamLeaders: number;
  maxTeamLeaders: number;
  
  // Task constraints
  maxTasksPerUser: number;
  maxDependencyDepth: number;
  allowCrossTeamDependencies: boolean;
  
  // Hierarchy constraints
  maxHierarchyLevels: number;
  preventCircularReporting: boolean;
  enforceSpanOfControl: number; // Max direct reports
}
```

### Referential Integrity Rules
```typescript
interface ReferentialIntegrityRules {
  // Cascade delete rules
  cascadeDeletes: {
    userDeletion: {
      tasks: 'REASSIGN' | 'DELETE' | 'ANONYMIZE';
      teamMemberships: 'DELETE';
      comments: 'ANONYMIZE';
      activities: 'ANONYMIZE';
    };
    
    teamDeletion: {
      tasks: 'REQUIRE_EMPTY' | 'TRANSFER' | 'DELETE';
      memberships: 'DELETE';
      events: 'DELETE';
      activities: 'DELETE';
    };
    
    taskDeletion: {
      comments: 'DELETE';
      dependencies: 'DELETE';
      timeEntries: 'DELETE';
      activities: 'DELETE';
    };
  };
  
  // Update propagation rules
  updatePropagation: {
    userRoleChange: ['RECALCULATE_PERMISSIONS', 'UPDATE_TEAM_STATS'];
    teamSettingsChange: ['UPDATE_MEMBER_PERMISSIONS', 'NOTIFY_MEMBERS'];
    taskStatusChange: ['UPDATE_DEPENDENCIES', 'NOTIFY_STAKEHOLDERS'];
  };
}
```

## 🔄 Relationship Management Patterns

### Lazy Loading Strategies
```typescript
interface LazyLoadingStrategy {
  // Load team members only when needed
  getTeamWithMembers(teamId: string): Promise<TeamWithMembers> {
    const team = await this.getTeam(teamId);
    if (team.loadMembers) {
      team.members = await this.getTeamMembers(teamId);
    }
    return team;
  }
  
  // Load task dependencies on demand
  getTaskWithDependencies(taskId: string): Promise<TaskWithDependencies> {
    const task = await this.getTask(taskId);
    if (task.loadDependencies) {
      task.dependencies = await this.getTaskDependencies(taskId);
    }
    return task;
  }
}
```

### Caching Strategies
```typescript
interface RelationshipCaching {
  // Cache frequently accessed relationships
  cache: {
    userTeams: Map<string, Team[]>;
    teamMembers: Map<string, User[]>;
    taskAssignees: Map<string, User>;
    userPermissions: Map<string, Permission[]>;
  };
  
  // Cache invalidation strategies
  invalidation: {
    onUserTeamChange: (userId: string) => void;
    onTeamMemberChange: (teamId: string) => void;
    onTaskAssignment: (taskId: string) => void;
    onPermissionChange: (userId: string) => void;
  };
}
```

### Relationship Auditing
```typescript
interface RelationshipAudit {
  // Track relationship changes
  auditLog: Array<{
    id: string;
    entityType: 'USER' | 'TEAM' | 'TASK';
    entityId: string;
    relationshipType: string;
    action: 'CREATED' | 'UPDATED' | 'DELETED';
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
    changedBy: string;
    changedAt: Date;
    reason?: string;
  }>;
  
  // Relationship integrity checks
  integrityChecks: {
    validateOrphanedRecords(): IntegrityReport;
    validateCircularReferences(): IntegrityReport;
    validateConstraintViolations(): IntegrityReport;
  };
}