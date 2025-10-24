// App constants
export const APP_NAME = process.env.APP_NAME || 'GCGC Team Management System'
export const APP_URL = process.env.APP_URL || 'http://localhost:3000'

// Pagination
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100

// Task constants
export const TASK_STATUSES = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
} as const

export const TASK_PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
} as const

export const TASK_STATUS_COLORS = {
  TODO: 'gray',
  IN_PROGRESS: 'blue',
  IN_REVIEW: 'yellow',
  COMPLETED: 'green',
} as const

export const TASK_PRIORITY_COLORS = {
  LOW: 'green',
  MEDIUM: 'yellow',
  HIGH: 'orange',
  URGENT: 'red',
} as const

// Event constants
export const EVENT_TYPES = {
  MEETING: 'Meeting',
  DEADLINE: 'Deadline',
  REMINDER: 'Reminder',
  MILESTONE: 'Milestone',
  PERSONAL: 'Personal',
} as const

export const EVENT_TYPE_COLORS = {
  MEETING: '#3b82f6',
  DEADLINE: '#ef4444',
  REMINDER: '#f59e0b',
  MILESTONE: '#10b981',
  PERSONAL: '#06b6d4',
} as const

// User roles
export const USER_ROLES = {
  ADMIN: 'Admin',
  LEADER: 'Leader',
  MEMBER: 'Member',
} as const

export const TEAM_MEMBER_ROLES = {
  LEADER: 'Leader',
  MEMBER: 'Member',
} as const

// Activity types
export const ACTIVITY_TYPES = {
  TASK_CREATED: 'Task Created',
  TASK_UPDATED: 'Task Updated',
  TASK_COMPLETED: 'Task Completed',
  TASK_ASSIGNED: 'Task Assigned',
  COMMENT_ADDED: 'Comment Added',
  TEAM_JOINED: 'Team Joined',
  TEAM_LEFT: 'Team Left',
  EVENT_CREATED: 'Event Created',
  EVENT_UPDATED: 'Event Updated',
  LOGIN: 'Login',
} as const

// Navigation routes
export const ROUTES = {
  HOME: '/',
  
  // Auth routes
  SIGNIN: '/auth/signin',
  SIGNUP: '/auth/signup',
  
  // User portal routes
  USER: {
    DASHBOARD: '/user/dashboard',
    TASKS: '/user/tasks',
    CALENDAR: '/user/calendar',
    PROFILE: '/user/profile',
  },
  
  // Admin portal routes
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    TEAMS: '/admin/teams',
    MEMBERS: '/admin/members',
    TASKS: '/admin/tasks',
    CALENDAR: '/admin/calendar',
    SETTINGS: '/admin/settings',
  },
  
  // API routes
  API: {
    AUTH: '/api/auth',
    TASKS: '/api/tasks',
    TEAMS: '/api/teams',
    USERS: '/api/users',
    EVENTS: '/api/events',
  },
} as const

// Permission resources and actions
export const PERMISSIONS = {
  RESOURCES: {
    TASK: 'task',
    TEAM: 'team',
    USER: 'user',
    EVENT: 'event',
    COMMENT: 'comment',
    SYSTEM: 'system',
  },
  ACTIONS: {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
  },
  SCOPES: {
    OWN: 'own',
    TEAM: 'team',
    ALL: 'all',
  },
} as const

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const

// Validation constants
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 500,
  TITLE_MAX_LENGTH: 100,
} as const

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  INPUT: 'yyyy-MM-dd',
  INPUT_WITH_TIME: 'yyyy-MM-dd HH:mm',
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
} as const

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}`,
  USER_TEAMS: (userId: string) => `user:${userId}:teams`,
  TEAM_MEMBERS: (teamId: string) => `team:${teamId}:members`,
  TEAM_TASKS: (teamId: string) => `team:${teamId}:tasks`,
  DASHBOARD_STATS: (userId: string) => `dashboard:${userId}:stats`,
} as const

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Invalid request',
  INTERNAL_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation error',
  DUPLICATE_EMAIL: 'Email address is already in use',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EXPIRED_TOKEN: 'Token has expired',
  INVALID_TOKEN: 'Invalid token',
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  LOGIN: 'Logged in successfully',
  LOGOUT: 'Logged out successfully',
  PASSWORD_RESET: 'Password reset email sent',
  EMAIL_VERIFIED: 'Email verified successfully',
} as const