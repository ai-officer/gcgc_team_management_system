import { User, Team, Task, Event, Comment, Activity, TeamMember, Division, Department, Section, TeamLabel } from '@prisma/client'

// Extended types with relations
export interface UserWithRelations extends User {
  teamMembers?: TeamMemberWithTeam[]
  assignedTasks?: TaskWithRelations[]
  createdTasks?: TaskWithRelations[]
  comments?: Comment[]
  activities?: Activity[]
  events?: Event[]
  reportsTo?: User | null
  subordinates?: User[]
}

export interface TeamWithRelations extends Team {
  members?: TeamMemberWithUser[]
  tasks?: TaskWithRelations[]
  events?: Event[]
  _count?: {
    members: number
    tasks: number
  }
}

export interface TaskWithRelations extends Task {
  assignee?: User | null
  creator?: User
  team?: Team
  comments?: CommentWithAuthor[]
  events?: Event[]
}

export interface TeamMemberWithUser extends TeamMember {
  user: User
}

export interface TeamMemberWithTeam extends TeamMember {
  team: Team
}

export interface CommentWithAuthor extends Comment {
  author: User
}

export interface EventWithRelations extends Event {
  creator: User
  team?: Team | null
  task?: Task | null
}

// Organizational structure types with relations
export interface DivisionWithRelations extends Division {
  departments?: DepartmentWithRelations[]
  _count?: {
    departments: number
  }
}

export interface DepartmentWithRelations extends Department {
  division?: Division
  sections?: SectionWithRelations[]
  _count?: {
    sections: number
  }
}

export interface SectionWithRelations extends Section {
  department?: Department
  teamLabels?: TeamLabel[]
  _count?: {
    teamLabels: number
  }
}

export interface TeamLabelWithRelations extends TeamLabel {
  section?: Section
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Form types
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface TaskFormData {
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: Date
  assigneeId?: string
  teamId: string
}

export interface EventFormData {
  title: string
  description?: string
  startTime: Date
  endTime: Date
  allDay: boolean
  color?: string
  type: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'MILESTONE' | 'PERSONAL'
  teamId?: string
  taskId?: string
}

export interface TeamFormData {
  name: string
  description?: string
}

export interface UserFormData {
  firstName: string
  lastName: string
  middleName?: string
  email: string
  username?: string
  contactNumber?: string
  role: 'ADMIN' | 'LEADER' | 'MEMBER'
  hierarchyLevel?: 'RF1' | 'RF2' | 'RF3' | 'OF1' | 'OF2' | 'M1' | 'M2'
  reportsToId?: string
  division?: string
  department?: string
  section?: string
  team?: string
  positionTitle?: string
  shortName?: string
  jobLevel?: string
  isLeader: boolean
  image?: string
  password?: string
  // Enhanced organizational fields
  organizationalPath?: string
  sectorHeadInitials?: string
  customDivision?: string
  customDepartment?: string
  customSection?: string
  customTeam?: string
}

// Enhanced organizational structure types
export interface OrganizationalUnit {
  id: string
  name: string
  code?: string
  disabled?: boolean
  allowsCustomInput?: boolean
  requiresSectorHead?: boolean
  requiresInput?: boolean
  requiresTeamLabel?: boolean
  requiresSectionInput?: boolean
  requiresTeamInput?: boolean
  requiresSectionLabel?: boolean
  description?: string
  children?: OrganizationalUnit[]
}

export interface AdminFormData extends UserFormData {
  role: 'ADMIN'
  hierarchyLevel: 'M1' | 'M2'
}

// Organizational structure form data
export interface DivisionFormData {
  name: string
  code?: string
  description?: string
}

export interface DepartmentFormData {
  name: string
  code?: string
  divisionId: string
}

export interface SectionFormData {
  name: string
  code?: string
  departmentId: string
}

export interface TeamLabelFormData {
  name: string
  code?: string
  sectionId: string
}

// Filter and sort types
export interface TaskFilters {
  status?: Task['status'][]
  priority?: Task['priority'][]
  assigneeId?: string
  teamId?: string
  dueDate?: {
    from?: Date
    to?: Date
  }
  search?: string
}

export interface TaskSort {
  field: 'title' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt'
  direction: 'asc' | 'desc'
}

export interface EventFilters {
  type?: Event['type'][]
  teamId?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

// Dashboard stats types
export interface DashboardStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  totalTeams: number
  totalMembers: number
  upcomingEvents: number
  recentActivities: Activity[]
}

export interface AdminDashboardStats extends DashboardStats {
  totalUsers: number
  activeUsers: number
  systemHealth: {
    status: 'healthy' | 'warning' | 'error'
    uptime: number
    lastBackup?: Date
  }
}

// Calendar types
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  extendedProps?: {
    description?: string
    type: Event['type']
    teamId?: string
    taskId?: string
    creatorId: string
  }
}

// Navigation types
export interface NavigationItem {
  title: string
  href: string
  icon?: React.ComponentType<any>
  description?: string
  disabled?: boolean
  external?: boolean
  badge?: string | number
  children?: NavigationItem[]
}

// Permission types
export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete'
  scope: 'own' | 'team' | 'all'
}

export interface RolePermissions {
  ADMIN: Permission[]
  LEADER: Permission[]
  MEMBER: Permission[]
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

// Notification types
export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
  actionUrl?: string
}

// Search types
export interface SearchResult {
  id: string
  title: string
  type: 'task' | 'team' | 'user' | 'event'
  description?: string
  url: string
  relevance: number
}

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]