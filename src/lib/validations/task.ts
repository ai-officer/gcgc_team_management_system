import { z } from 'zod'

// Enums
export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED'], {
  required_error: 'Task status is required',
  invalid_type_error: 'Invalid task status'
})

export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
  required_error: 'Priority is required',
  invalid_type_error: 'Invalid priority'
})

export const taskTypeEnum = z.enum(['INDIVIDUAL', 'TEAM', 'COLLABORATION'], {
  required_error: 'Task type is required',
  invalid_type_error: 'Invalid task type'
})

// URL validation helper
const urlOrEmpty = z.union([
  z.string().url('Must be a valid URL'),
  z.literal(''),
  z.undefined()
])

// RRULE validation (Google Calendar recurrence format)
const rruleSchema = z.string()
  .regex(
    /^RRULE:FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;.*)?$/,
    'Invalid recurrence rule format'
  )
  .optional()

// Base Task Schema (for creation)
export const createTaskSchema = z.object({
  // Basic Information
  title: z.string()
    .min(1, 'Task title is required')
    .min(3, 'Task title must be at least 3 characters')
    .max(200, 'Task title must not exceed 200 characters')
    .trim(),

  description: z.string()
    .max(2000, 'Description must not exceed 2000 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  // Status & Priority
  status: taskStatusEnum.default('TODO'),

  priority: priorityEnum.default('MEDIUM'),

  progressPercentage: z.number()
    .int('Progress must be a whole number')
    .min(0, 'Progress cannot be negative')
    .max(100, 'Progress cannot exceed 100')
    .default(0),

  // Task Type
  taskType: taskTypeEnum.default('INDIVIDUAL'),

  // Dates
  startDate: z.date({
    invalid_type_error: 'Invalid start date format'
  }).optional().nullable(),

  dueDate: z.date({
    invalid_type_error: 'Invalid due date format'
  }).optional().nullable(),

  // Assignment
  assigneeId: z.string()
    .cuid('Invalid assignee ID')
    .optional()
    .nullable(),

  assignedById: z.string()
    .cuid('Invalid assigner ID')
    .optional()
    .nullable(),

  creatorId: z.string()
    .cuid('Creator ID is required'),

  teamId: z.string()
    .cuid('Invalid team ID')
    .optional()
    .nullable(),

  // Team Members (for TEAM task type)
  teamMemberIds: z.array(
    z.string().cuid('Invalid team member ID')
  )
    .max(50, 'Cannot have more than 50 team members')
    .default([]),

  // Collaborators (for COLLABORATION task type)
  collaboratorIds: z.array(
    z.string().cuid('Invalid collaborator ID')
  )
    .max(50, 'Cannot have more than 50 collaborators')
    .default([]),

  // Google Calendar Integration Fields
  location: z.string()
    .max(500, 'Location must not exceed 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  meetingLink: urlOrEmpty,

  allDay: z.boolean().default(true),

  recurrence: rruleSchema.optional().or(z.literal('')),

  // Time fields for non-all-day tasks
  startTime: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (use HH:MM)')
    .optional()
    .or(z.literal('')),

  endTime: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (use HH:MM)')
    .optional()
    .or(z.literal('')),

  // Google Calendar sync metadata
  googleCalendarId: z.string().optional().nullable(),
  googleCalendarEventId: z.string().optional().nullable(),
  syncedAt: z.date().optional().nullable()
})
  .refine(
    (data) => {
      // If both dates provided, startDate must be before or equal to dueDate
      if (data.startDate && data.dueDate) {
        return data.startDate <= data.dueDate
      }
      return true
    },
    {
      message: 'Start date must be before or equal to due date',
      path: ['dueDate']
    }
  )
  .refine(
    (data) => {
      // Validate maximum task duration (2 years)
      if (data.startDate && data.dueDate) {
        const diffInDays = Math.ceil(
          (data.dueDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        return diffInDays <= 730 // 2 years
      }
      return true
    },
    {
      message: 'Task duration cannot exceed 2 years',
      path: ['dueDate']
    }
  )
  .refine(
    (data) => {
      // If not all-day, time fields should be provided
      if (!data.allDay && data.startDate && !data.startTime) {
        return false
      }
      return true
    },
    {
      message: 'Start time is required for non-all-day tasks',
      path: ['startTime']
    }
  )
  .refine(
    (data) => {
      // If not all-day and has end date, end time should be provided
      if (!data.allDay && data.dueDate && !data.endTime) {
        return false
      }
      return true
    },
    {
      message: 'End time is required for non-all-day tasks with a due date',
      path: ['endTime']
    }
  )
  .refine(
    (data) => {
      // Validate time range for same-day tasks
      if (!data.allDay && data.startDate && data.dueDate && data.startTime && data.endTime) {
        const sameDay = data.startDate.toDateString() === data.dueDate.toDateString()
        if (sameDay) {
          const [startHour, startMin] = data.startTime.split(':').map(Number)
          const [endHour, endMin] = data.endTime.split(':').map(Number)
          const startMinutes = startHour * 60 + startMin
          const endMinutes = endHour * 60 + endMin
          return endMinutes > startMinutes
        }
      }
      return true
    },
    {
      message: 'End time must be after start time for same-day tasks',
      path: ['endTime']
    }
  )
  .refine(
    (data) => {
      // TEAM tasks should have at least one team member
      if (data.taskType === 'TEAM' && data.teamMemberIds.length === 0) {
        return false
      }
      return true
    },
    {
      message: 'Team tasks must have at least one team member',
      path: ['teamMemberIds']
    }
  )
  .refine(
    (data) => {
      // COLLABORATION tasks should have at least one collaborator
      if (data.taskType === 'COLLABORATION' && data.collaboratorIds.length === 0) {
        return false
      }
      return true
    },
    {
      message: 'Collaboration tasks must have at least one collaborator',
      path: ['collaboratorIds']
    }
  )
  .refine(
    (data) => {
      // INDIVIDUAL tasks should not have team members or collaborators
      if (data.taskType === 'INDIVIDUAL') {
        return data.teamMemberIds.length === 0 && data.collaboratorIds.length === 0
      }
      return true
    },
    {
      message: 'Individual tasks cannot have team members or collaborators',
      path: ['taskType']
    }
  )
  .refine(
    (data) => {
      // TEAM tasks should not have collaborators
      if (data.taskType === 'TEAM' && data.collaboratorIds.length > 0) {
        return false
      }
      return true
    },
    {
      message: 'Team tasks cannot have collaborators (use team members instead)',
      path: ['collaboratorIds']
    }
  )
  .refine(
    (data) => {
      // COLLABORATION tasks should not have team members
      if (data.taskType === 'COLLABORATION' && data.teamMemberIds.length > 0) {
        return false
      }
      return true
    },
    {
      message: 'Collaboration tasks cannot have team members (use collaborators instead)',
      path: ['teamMemberIds']
    }
  )
  .refine(
    (data) => {
      // Progress should match status
      if (data.status === 'TODO' && data.progressPercentage > 0) {
        return false
      }
      if (data.status === 'COMPLETED' && data.progressPercentage !== 100) {
        return false
      }
      return true
    },
    {
      message: 'Progress percentage must match task status (TODO = 0%, COMPLETED = 100%)',
      path: ['progressPercentage']
    }
  )
  .refine(
    (data) => {
      // Validate meeting link is provided if it's a meeting-type task
      if (data.meetingLink && data.meetingLink !== '' && !data.location) {
        // If meeting link is provided, location might be optional
        return true
      }
      return true
    },
    {
      message: 'Meeting link should be a valid URL',
      path: ['meetingLink']
    }
  )

// Update Task Schema (partial fields allowed)
export const updateTaskSchema = createTaskSchema
  .partial()
  .extend({
    id: z.string().cuid('Invalid task ID')
  })
  .refine(
    (data) => {
      // At least one field must be provided for update
      const { id, ...fields } = data
      return Object.keys(fields).length > 0
    },
    {
      message: 'At least one field must be provided for update',
      path: ['id']
    }
  )

// Quick Task Creation Schema (minimal fields)
export const quickTaskSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .min(3, 'Task title must be at least 3 characters')
    .max(200, 'Task title must not exceed 200 characters')
    .trim(),

  dueDate: z.date({
    required_error: 'Due date is required for quick tasks',
    invalid_type_error: 'Invalid due date format'
  }),

  priority: priorityEnum.default('MEDIUM'),

  creatorId: z.string().cuid('Creator ID is required'),

  assigneeId: z.string().cuid('Assignee ID is required')
})

// Task Filter Schema (for queries)
export const taskFilterSchema = z.object({
  status: taskStatusEnum.optional(),
  priority: priorityEnum.optional(),
  taskType: taskTypeEnum.optional(),
  assigneeId: z.string().cuid('Invalid assignee ID').optional(),
  creatorId: z.string().cuid('Invalid creator ID').optional(),
  teamId: z.string().cuid('Invalid team ID').optional(),
  startDateFrom: z.date().optional(),
  startDateTo: z.date().optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
  search: z.string().max(200, 'Search query too long').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
})

// Task Status Update Schema
export const updateTaskStatusSchema = z.object({
  id: z.string().cuid('Invalid task ID'),
  status: taskStatusEnum,
  progressPercentage: z.number()
    .int('Progress must be a whole number')
    .min(0, 'Progress cannot be negative')
    .max(100, 'Progress cannot exceed 100')
    .optional()
})
  .refine(
    (data) => {
      // Auto-calculate progress based on status if not provided
      if (data.status === 'TODO' && data.progressPercentage === undefined) {
        data.progressPercentage = 0
      }
      if (data.status === 'COMPLETED' && data.progressPercentage === undefined) {
        data.progressPercentage = 100
      }
      return true
    }
  )

// Task Assignment Schema
export const assignTaskSchema = z.object({
  id: z.string().cuid('Invalid task ID'),
  assigneeId: z.string().cuid('Invalid assignee ID'),
  assignedById: z.string().cuid('Invalid assigner ID')
})

// Bulk Task Update Schema
export const bulkUpdateTasksSchema = z.object({
  taskIds: z.array(z.string().cuid('Invalid task ID'))
    .min(1, 'At least one task must be selected')
    .max(100, 'Cannot update more than 100 tasks at once'),
  updates: z.object({
    status: taskStatusEnum.optional(),
    priority: priorityEnum.optional(),
    assigneeId: z.string().cuid('Invalid assignee ID').optional(),
    dueDate: z.date().optional()
  }).refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided for bulk update'
  )
})

// Type Exports
export type TaskStatus = z.infer<typeof taskStatusEnum>
export type Priority = z.infer<typeof priorityEnum>
export type TaskType = z.infer<typeof taskTypeEnum>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type QuickTaskInput = z.infer<typeof quickTaskSchema>
export type TaskFilterInput = z.infer<typeof taskFilterSchema>
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>
export type AssignTaskInput = z.infer<typeof assignTaskSchema>
export type BulkUpdateTasksInput = z.infer<typeof bulkUpdateTasksSchema>
