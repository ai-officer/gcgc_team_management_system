'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { CalendarIcon, Plus, Users, User, Handshake, ListTodo, Trash2, ChevronDown, Settings2, RefreshCw } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { SearchableMultiSelect, SelectOption } from '@/components/ui/searchable-multi-select'
import '@/styles/calendar.css'
import '@/styles/popover-fix.css'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { generateOccurrenceDates } from '@/lib/recurring'

// Types
type TaskType = 'INDIVIDUAL' | 'TEAM' | 'COLLABORATION'
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'

interface User {
  id: string
  name?: string
  email: string
  image?: string
  role?: string
}

interface PendingSubtask {
  id: string // Temporary ID for UI
  title: string
  assigneeId: string
  assignee?: User
  dueDate?: string
}



const recurringFrequencyEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().optional(),
  dueDate: z.date({ required_error: 'Deadline is required' }),
  startDate: z.date().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  progressPercentage: z.number().min(0).max(100),
  taskType: z.enum(['INDIVIDUAL', 'TEAM', 'COLLABORATION']),
  assigneeId: z.string().nullish(), // Always current user
  teamMemberIds: z.array(z.string()).default([]),
  collaboratorIds: z.array(z.string()).default([]),
  assignedById: z.string().optional(),
  // New Google Calendar-compatible fields
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  allDay: z.boolean().default(true),
  recurrence: z.string().optional(),
  // Time fields for non-all-day events
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  // Subtasks
  subtasks: z.array(z.object({
    title: z.string(),
    assigneeId: z.string(),
    dueDate: z.string().optional(),
  })).optional(),
  // Recurring task fields
  isRecurring: z.boolean().default(false),
  recurringFrequency: recurringFrequencyEnum.optional(),
  recurringInterval: z.number().int().min(1).max(30).optional(),
  recurringDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  recurringEndDate: z.date().optional().nullable(),
  // Weight, SLA, and reminder fields
  taskWeight: z.number().int().min(1).max(5).optional().nullable(),
  slaHours: z.number().int().min(1).optional().nullable(),
  reminderDays: z.array(z.number().int().min(1)).optional().default([]),
})

type TaskFormData = z.infer<typeof taskFormSchema>

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: any // Existing task for editing
  duplicateFrom?: any // Source task to duplicate (creates a new task pre-filled from this)
  onSubmit: (data: TaskFormData) => Promise<void>
  preSelectedMemberId?: string // Pre-selected team member for assignment
}

export default function TaskForm({ open, onOpenChange, task, duplicateFrom, onSubmit, preSelectedMemberId }: TaskFormProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<User[]>([])
  const [selectedCollaborators, setSelectedCollaborators] = useState<User[]>([])

  // Subtask state
  const [pendingSubtasks, setPendingSubtasks] = useState<PendingSubtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState('')
  const [newSubtaskDeadline, setNewSubtaskDeadline] = useState('')
  const [recurringNoEndDate, setRecurringNoEndDate] = useState(false)

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      progressPercentage: 0,
      taskType: 'INDIVIDUAL',
      assigneeId: session?.user?.id || null, // Always current user
      teamMemberIds: [],
      collaboratorIds: [],
      assignedById: session?.user?.id,
      // New Google Calendar fields
      location: '',
      meetingLink: '',
      allDay: true,
      recurrence: '',
      startDate: undefined,
      startTime: '',
      endTime: '',
      // Recurring task fields
      isRecurring: false,
      recurringFrequency: undefined,
      recurringInterval: 1,
      recurringDaysOfWeek: [],
      recurringEndDate: null,
      // Weight, SLA, reminder
      taskWeight: null,
      slaHours: null,
      reminderDays: [],
    },
  })

  const taskType = form.watch('taskType')
  const progressPercentage = form.watch('progressPercentage')

  // Track previous open state to only initialize once per open
  const prevOpenRef = useRef(false)

  // Fetch users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  // Initialize form when dialog opens - ONLY ONCE per open (when transitioning from closed to open)
  useEffect(() => {
    // Only initialize when dialog transitions from closed to open
    if (open && !prevOpenRef.current) {
      if (task) {
        // Populate form with existing task data
        const startDateTime = task.startDate ? new Date(task.startDate) : undefined
        const dueDateTime = task.dueDate ? new Date(task.dueDate) : undefined

        form.reset({
          title: task.title,
          description: task.description || '',
          dueDate: dueDateTime,
          startDate: startDateTime,
          status: task.status,
          priority: task.priority,
          progressPercentage: task.progressPercentage || 0,
          taskType: task.taskType,
          assigneeId: task.assigneeId || session?.user?.id, // PRESERVE original assignee when editing
          teamMemberIds: task.teamMembers?.map((tm: any) => tm.userId) || [],
          collaboratorIds: task.collaborators?.map((c: any) => c.userId) || [],
          assignedById: task.assignedById || session?.user?.id,
          // New Google Calendar fields
          location: task.location || '',
          meetingLink: task.meetingLink || '',
          allDay: task.allDay !== undefined ? task.allDay : true,
          recurrence: task.recurrence || '',
          // Extract time from DateTime if not all-day
          startTime: startDateTime && !task.allDay ? startDateTime.toTimeString().slice(0, 5) : '',
          endTime: dueDateTime && !task.allDay ? dueDateTime.toTimeString().slice(0, 5) : '',
          // Recurring task fields (not editable from edit form)
          isRecurring: false,
          recurringFrequency: undefined,
          recurringInterval: 1,
          recurringDaysOfWeek: [],
          recurringEndDate: null,
        })

        // Set selected members and collaborators for display
        if (task.teamMembers) {
          setSelectedTeamMembers(task.teamMembers.map((tm: any) => tm.user))
        }
        if (task.collaborators) {
          setSelectedCollaborators(task.collaborators.map((c: any) => c.user))
        }
      } else if (duplicateFrom) {
        // Duplicate mode: pre-fill from source task, reset status/progress, allow recurring
        const srcDue = duplicateFrom.dueDate ? new Date(duplicateFrom.dueDate) : undefined
        const srcStart = duplicateFrom.startDate ? new Date(duplicateFrom.startDate) : undefined

        form.reset({
          title: `Copy of ${duplicateFrom.title}`,
          description: duplicateFrom.description || '',
          dueDate: srcDue,
          startDate: srcStart,
          status: 'TODO',
          priority: duplicateFrom.priority,
          progressPercentage: 0,
          taskType: duplicateFrom.taskType,
          assigneeId: duplicateFrom.assigneeId || session?.user?.id,
          teamMemberIds: duplicateFrom.teamMembers?.map((tm: any) => tm.userId ?? tm.id) || [],
          collaboratorIds: duplicateFrom.collaborators?.map((c: any) => c.userId ?? c.id) || [],
          assignedById: session?.user?.id,
          location: duplicateFrom.location || '',
          meetingLink: duplicateFrom.meetingLink || '',
          allDay: duplicateFrom.allDay !== undefined ? duplicateFrom.allDay : true,
          recurrence: '',
          startTime: srcStart && !duplicateFrom.allDay ? srcStart.toTimeString().slice(0, 5) : '',
          endTime: srcDue && !duplicateFrom.allDay ? srcDue.toTimeString().slice(0, 5) : '',
          // Recurring fields start fresh — user can set a new schedule
          isRecurring: false,
          recurringFrequency: undefined,
          recurringInterval: 1,
          recurringDaysOfWeek: [],
          recurringEndDate: null,
        })

        if (duplicateFrom.teamMembers) {
          setSelectedTeamMembers(duplicateFrom.teamMembers.map((tm: any) => tm.user ?? tm))
        }
        if (duplicateFrom.collaborators) {
          setSelectedCollaborators(duplicateFrom.collaborators.map((c: any) => c.user ?? c))
        }
        setPendingSubtasks([])
        setNewSubtaskTitle('')
        setNewSubtaskAssigneeId('')
        setNewSubtaskDeadline('')
      } else {
        // Set defaults for new task based on current user
        const initialTaskType = preSelectedMemberId ? 'TEAM' : 'INDIVIDUAL'
        const initialTeamMemberIds = preSelectedMemberId ? [preSelectedMemberId] : []

        form.reset({
          title: '',
          description: '',
          status: 'TODO',
          priority: 'MEDIUM',
          progressPercentage: 0,
          taskType: initialTaskType,
          assigneeId: session?.user?.id || null, // Always current user
          teamMemberIds: initialTeamMemberIds,
          collaboratorIds: [],
          assignedById: session?.user?.id,
          // New Google Calendar fields
          location: '',
          meetingLink: '',
          allDay: true,
          recurrence: '',
          startDate: undefined,
          startTime: '',
          endTime: '',
          // Recurring task fields
          isRecurring: false,
          recurringFrequency: undefined,
          recurringInterval: 1,
          recurringDaysOfWeek: [],
          recurringEndDate: null,
        })

        // Clear selected arrays
        setSelectedTeamMembers([])
        setSelectedCollaborators([])
        // Clear subtasks
        setPendingSubtasks([])
        setNewSubtaskTitle('')
        setNewSubtaskAssigneeId('')
        setNewSubtaskDeadline('')
      }
    }
    // Update the ref to track current open state
    prevOpenRef.current = open
  }, [open, task, duplicateFrom, form, session, preSelectedMemberId])

  // Handle task type changes and set appropriate defaults
  useEffect(() => {
    if (!task && !duplicateFrom && session?.user?.id && open) { // Only for brand-new tasks
      // For NEW tasks only: Always assign to current user regardless of task type
      form.setValue('assigneeId', session.user.id)

      // Clear selections when changing task types (but preserve pre-selected members on first open)
      if (taskType === 'INDIVIDUAL') {
        setSelectedTeamMembers([])
        setSelectedCollaborators([])
        form.setValue('teamMemberIds', [])
        form.setValue('collaboratorIds', [])
      } else if (taskType === 'TEAM') {
        // Only clear collaborators, keep team members (they might be pre-selected)
        setSelectedCollaborators([])
        form.setValue('collaboratorIds', [])
      } else if (taskType === 'COLLABORATION') {
        setSelectedTeamMembers([])
        form.setValue('teamMemberIds', [])
      }
    }
    // For EDITING tasks: preserve the original assignee - do NOT override
  }, [taskType, session?.user?.id, task, form, open])

  // When recurring is on, auto-populate dueDate from startDate so the
  // user doesn't have to fill in a redundant "Deadline" field.
  const isRecurring = form.watch('isRecurring')
  const watchedStartDate = form.watch('startDate')
  useEffect(() => {
    if (isRecurring) {
      const sd = form.getValues('startDate')
      if (sd) {
        form.setValue('dueDate', sd)
        form.clearErrors('dueDate')
      }
    }
  }, [isRecurring, watchedStartDate])

  // Ensure pre-selected member is set after users are loaded - ONLY ONCE
  useEffect(() => {
    if (open && !task && preSelectedMemberId && users.length > 0 && selectedTeamMembers.length === 0) {
      const preSelectedUser = users.find(u => u.id === preSelectedMemberId)
      if (preSelectedUser) {
        setSelectedTeamMembers([preSelectedUser])
      }
    }
  }, [open, task, preSelectedMemberId, users.length])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSubmit = async (data: TaskFormData) => {
    setLoading(true)
    try {
      // Combine date and time if not all-day
      const submissionData = { ...data }

      if (!data.allDay) {
        // If we have a start date and time, combine them
        if (data.startDate && data.startTime) {
          const [hours, minutes] = data.startTime.split(':')
          const startDateTime = new Date(data.startDate)
          startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          submissionData.startDate = startDateTime
        } else if (data.startDate) {
          // No time specified, normalize to midnight local time
          const startDateTime = new Date(data.startDate)
          startDateTime.setHours(0, 0, 0, 0)
          submissionData.startDate = startDateTime
        }

        // If we have an end date and time, combine them
        if (data.dueDate && data.endTime) {
          const [hours, minutes] = data.endTime.split(':')
          const dueDateTime = new Date(data.dueDate)
          dueDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          submissionData.dueDate = dueDateTime
        } else if (data.dueDate) {
          // No time specified, normalize to midnight local time
          const dueDateTime = new Date(data.dueDate)
          dueDateTime.setHours(23, 59, 59, 999)
          submissionData.dueDate = dueDateTime
        }
      } else {
        // For all-day events, normalize to midnight local time to avoid timezone issues
        if (data.startDate) {
          const startDateTime = new Date(data.startDate)
          startDateTime.setHours(0, 0, 0, 0)
          submissionData.startDate = startDateTime
        }
        if (data.dueDate) {
          const dueDateTime = new Date(data.dueDate)
          dueDateTime.setHours(23, 59, 59, 999)
          submissionData.dueDate = dueDateTime
        }
      }

      // Include subtasks in submission
      submissionData.subtasks = pendingSubtasks.map(s => ({
        title: s.title,
        assigneeId: s.assigneeId,
      }))

      // Strip null/undefined recurring fields when not recurring so they
      // never reach the API validation (recurringEndDate: null fails datetime check)
      if (!submissionData.isRecurring) {
        delete (submissionData as any).recurringFrequency
        delete (submissionData as any).recurringInterval
        delete (submissionData as any).recurringDaysOfWeek
        delete (submissionData as any).recurringEndDate
        delete (submissionData as any).isRecurring
      } else if (submissionData.recurringEndDate === null) {
        delete (submissionData as any).recurringEndDate
      }

      await onSubmit(submissionData)
      onOpenChange(false)
      form.reset()
      setPendingSubtasks([])
    } catch (error) {
      console.error('Error submitting task:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTeamMember = (user: User) => {
    if (!selectedTeamMembers.find(m => m.id === user.id)) {
      setSelectedTeamMembers([...selectedTeamMembers, user])
      form.setValue('teamMemberIds', [...form.getValues('teamMemberIds'), user.id])
    }
  }

  const removeTeamMember = (userId: string) => {
    setSelectedTeamMembers(selectedTeamMembers.filter(m => m.id !== userId))
    form.setValue('teamMemberIds', form.getValues('teamMemberIds').filter(id => id !== userId))
  }

  const addCollaborator = (user: User) => {
    if (!selectedCollaborators.find(c => c.id === user.id)) {
      setSelectedCollaborators([...selectedCollaborators, user])
      form.setValue('collaboratorIds', [...form.getValues('collaboratorIds'), user.id])
    }
  }

  const removeCollaborator = (userId: string) => {
    setSelectedCollaborators(selectedCollaborators.filter(c => c.id !== userId))
    form.setValue('collaboratorIds', form.getValues('collaboratorIds').filter(id => id !== userId))
  }

  // Subtask handlers
  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return

    const assigneeId = newSubtaskAssigneeId || session?.user?.id || ''
    const assignee = users.find(u => u.id === assigneeId) || (session?.user?.id === assigneeId ? {
      id: session.user.id,
      name: session.user.name || undefined,
      email: session.user.email || '',
    } : undefined)

    const newSubtask: PendingSubtask = {
      id: `temp-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      assigneeId,
      assignee,
      dueDate: newSubtaskDeadline || undefined,
    }

    setPendingSubtasks([...pendingSubtasks, newSubtask])
    setNewSubtaskTitle('')
    setNewSubtaskAssigneeId('')
    setNewSubtaskDeadline('')
  }

  const removeSubtask = (id: string) => {
    setPendingSubtasks(pendingSubtasks.filter(s => s.id !== id))
  }

  const getTaskTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'INDIVIDUAL': return <User className="h-4 w-4" />
      case 'TEAM': return <Users className="h-4 w-4" />
      case 'COLLABORATION': return <Handshake className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage < 25) return 'bg-red-500'
    if (percentage < 50) return 'bg-orange-500'
    if (percentage < 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const computeEstimatedCount = () => {
    const startDate = form.watch('startDate') ?? form.watch('dueDate')
    const endDate = form.watch('recurringEndDate')
    const frequency = form.watch('recurringFrequency')
    const interval = form.watch('recurringInterval') || 1
    const days = form.watch('recurringDaysOfWeek') || []
    if (!startDate || !endDate || !frequency) return 0
    try {
      return generateOccurrenceDates(startDate as Date, endDate as Date, frequency, interval, days).length
    } catch {
      return 0
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl z-[100]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900">
            {task ? 'Edit Task' : duplicateFrom ? 'Duplicate Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {task ? 'Update the task details below.' : duplicateFrom ? 'Review and adjust the duplicated task before saving.' : 'Fill in the details to create a new task.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="max-h-[70vh] overflow-y-auto px-1 space-y-6 py-1">

          {/* Basic Information Section */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100 mb-4">Basic Information</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium text-gray-700">Task Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  {...form.register('title')}
                  placeholder="Enter a clear, descriptive task title"
                  className="h-9"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span>⚠</span> {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Provide details about this task..."
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Priority & Settings Section */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100 mb-4">Priority &amp; Settings</p>
            <div className="space-y-4">
              {/* Priority pill buttons */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Priority</Label>
                <div className="flex gap-2">
                  {([
                    { value: 'URGENT', label: 'Urgent', base: 'bg-red-50 border-red-200 text-red-700', active: 'bg-red-500 border-red-500 text-white' },
                    { value: 'HIGH',   label: 'High',   base: 'bg-orange-50 border-orange-200 text-orange-700', active: 'bg-orange-500 border-orange-500 text-white' },
                    { value: 'MEDIUM', label: 'Medium', base: 'bg-amber-50 border-amber-200 text-amber-700', active: 'bg-amber-400 border-amber-400 text-white' },
                    { value: 'LOW',    label: 'Low',    base: 'bg-green-50 border-green-200 text-green-700', active: 'bg-green-500 border-green-500 text-white' },
                  ] as const).map(({ value, label, base, active }) => {
                    const isSelected = form.watch('priority') === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => form.setValue('priority', value)}
                        className={cn(
                          'flex-1 py-1.5 px-2 rounded-full border text-xs font-semibold transition-all',
                          isSelected ? active : base
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value as TaskStatus)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        To Do
                      </div>
                    </SelectItem>
                    <SelectItem value="IN_PROGRESS">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        In Progress
                      </div>
                    </SelectItem>
                    <SelectItem value="IN_REVIEW">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                        In Review
                      </div>
                    </SelectItem>
                    <SelectItem value="COMPLETED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        Completed
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Progress — editing only */}
              {task && (
                <div className="space-y-1.5">
                  <Label htmlFor="progress" className="text-sm font-medium text-gray-700">Progress: {progressPercentage}%</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Input
                        type="range"
                        min="0"
                        max="99"
                        value={Math.min(progressPercentage, 99)}
                        onChange={(e) => form.setValue('progressPercentage', Math.min(Number(e.target.value), 99))}
                        className="w-full"
                      />
                      <span className="text-sm font-semibold min-w-[3rem] text-right">{progressPercentage}%</span>
                    </div>
                    <Progress
                      value={progressPercentage}
                      className={`h-2 ${getProgressColor(progressPercentage)}`}
                    />
                    <p className="text-xs text-amber-600">Max 99%. Task must be reviewed by Team Leader to reach 100%.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Section */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100 mb-4">Schedule</p>
            <div className="space-y-4">
              {/* Status and Progress Row — removed duplicate status, keeping date range */}

              {/* Date Range */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">Date Range</Label>
                  <Badge variant="outline" className="text-xs">
                    {form.watch('allDay') ? 'All-day task' : 'Specific times'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Date */}
                  <div className="space-y-3">
                    <Label htmlFor="startDate" className="text-sm font-medium flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {form.watch('isRecurring') ? 'Series Start Date' : 'Start Date'}
                      {form.watch('isRecurring') ? (
                        <span className="text-xs text-orange-600 font-semibold">*Required</span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                      )}
                    </Label>
                    <div className="space-y-2">
                      <DatePicker
                        date={form.watch('startDate')}
                        onSelect={(date) => {
                          form.setValue('startDate', date)
                          if (form.watch('isRecurring') && date) {
                            form.setValue('dueDate', date)
                            form.clearErrors('dueDate')
                          }
                        }}
                        placeholder={form.watch('isRecurring') ? 'When does the series begin?' : 'Select start date'}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                      {!form.watch('allDay') && (
                        <TimePicker
                          value={form.watch('startTime') || undefined}
                          onChange={(time) => form.setValue('startTime', time || '')}
                          placeholder="Select start time"
                        />
                      )}
                    </div>
                  </div>

                  {/* Due Date — hidden for recurring tasks (auto-set from start date) */}
                  {form.watch('isRecurring') ? (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        First Task Deadline
                      </Label>
                      <div className="h-11 px-3 flex items-center rounded-md border bg-muted/40 text-sm text-muted-foreground">
                        {form.watch('startDate')
                          ? form.watch('startDate')!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Auto-set from Series Start Date'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The first task is due on the series start date.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5 text-orange-600" />
                        Deadline
                        <span className="text-xs text-orange-600 font-semibold">*Required</span>
                      </Label>
                      <div className="space-y-2">
                        <DatePicker
                          date={form.watch('dueDate')}
                          onSelect={(date) => {
                            form.setValue('dueDate', date)
                            form.clearErrors('dueDate')
                          }}
                          placeholder="Select deadline"
                          disabled={(date) => {
                            const today = new Date(new Date().setHours(0, 0, 0, 0))
                            const startDate = form.watch('startDate')
                            const minDate = startDate && startDate > today ? startDate : today
                            return date < minDate
                          }}
                        />
                        {form.formState.errors.dueDate && (
                          <p className="text-sm text-red-500 font-medium">
                            {form.formState.errors.dueDate.message}
                          </p>
                        )}
                        {!form.watch('allDay') && (
                          <TimePicker
                            value={form.watch('endTime') || undefined}
                            onChange={(time) => form.setValue('endTime', time || '')}
                            placeholder="Select end time"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Helper Messages */}
                <div className="flex flex-col gap-3">
                  {form.watch('startDate') && form.watch('dueDate') && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <div className="text-sm text-green-700 font-medium">
                        Task will span {Math.ceil((form.watch('dueDate')!.getTime() - form.watch('startDate')!.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                      </div>
                    </div>
                  )}
                  {form.watch('dueDate') && !form.watch('startDate') && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm">💡</span>
                      </div>
                      <div className="text-sm text-blue-700">
                        Add a start date to create a multi-day task that spans across the calendar
                      </div>
                    </div>
                  )}
                  {form.watch('dueDate') && form.watch('dueDate')! < new Date(new Date().setHours(0, 0, 0, 0)) && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 text-sm">⚠</span>
                      </div>
                      <div className="text-sm text-red-700 font-medium">
                        Due date is in the past
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recurring Schedule — only for new tasks */}
              {!task && (
                <div className={cn('rounded-xl border-2 transition-colors duration-200', form.watch('isRecurring') ? 'border-blue-300 bg-blue-50/40' : 'border-border bg-muted/20')}>
                  {/* Toggle row */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-1.5 rounded-full transition-colors', form.watch('isRecurring') ? 'bg-blue-100' : 'bg-muted')}>
                        <RefreshCw className={cn('h-4 w-4 transition-colors', form.watch('isRecurring') ? 'text-blue-600' : 'text-muted-foreground')} />
                      </div>
                      <div>
                        <p className={cn('text-sm font-semibold transition-colors', form.watch('isRecurring') ? 'text-blue-900' : 'text-foreground')}>
                          Recurring Schedule
                        </p>
                        <p className={cn('text-xs', form.watch('isRecurring') ? 'text-blue-600' : 'text-muted-foreground')}>
                          {form.watch('isRecurring') ? 'Task repeats automatically on a set schedule' : 'Enable to repeat this task on a schedule'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={form.watch('isRecurring')}
                      onCheckedChange={(checked) => {
                        form.setValue('isRecurring', checked)
                        if (!checked) {
                          form.setValue('recurringFrequency', undefined)
                          form.setValue('recurringEndDate', null)
                          form.setValue('recurringDaysOfWeek', [])
                          setRecurringNoEndDate(false)
                          form.setValue('recurringInterval', 1)
                        }
                      }}
                    />
                  </div>

                  {/* Expanded fields */}
                  {form.watch('isRecurring') && (
                    <div className="px-4 pb-4 space-y-4 border-t border-blue-200 pt-4">
                      {/* Frequency */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Repeat frequency</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((freq) => {
                            const isSelected = form.watch('recurringFrequency') === freq
                            return (
                              <button
                                key={freq}
                                type="button"
                                onClick={() => {
                                  form.setValue('recurringFrequency', freq)
                                  if (freq !== 'WEEKLY') form.setValue('recurringDaysOfWeek', [])
                                }}
                                className={cn(
                                  'py-2 rounded-lg border text-sm font-medium transition-all',
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                                )}
                              >
                                {freq.charAt(0) + freq.slice(1).toLowerCase()}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Interval */}
                      {form.watch('recurringFrequency') && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Repeat every</Label>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => form.setValue('recurringInterval', Math.max(1, (form.watch('recurringInterval') || 1) - 1))}
                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 text-lg font-bold leading-none"
                              >−</button>
                              <span className="w-8 text-center text-sm font-semibold">{form.watch('recurringInterval') || 1}</span>
                              <button
                                type="button"
                                onClick={() => form.setValue('recurringInterval', Math.min(30, (form.watch('recurringInterval') || 1) + 1))}
                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 text-lg font-bold leading-none"
                              >+</button>
                            </div>
                            <span className="text-sm text-gray-600">
                              {form.watch('recurringFrequency') === 'DAILY' && ((form.watch('recurringInterval') || 1) === 1 ? 'day' : 'days')}
                              {form.watch('recurringFrequency') === 'WEEKLY' && ((form.watch('recurringInterval') || 1) === 1 ? 'week' : 'weeks')}
                              {form.watch('recurringFrequency') === 'MONTHLY' && ((form.watch('recurringInterval') || 1) === 1 ? 'month' : 'months')}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Days of week — WEEKLY only */}
                      {form.watch('recurringFrequency') === 'WEEKLY' && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">On these days</Label>
                          <div className="flex gap-1.5 flex-wrap">
                            {[
                              { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 },
                              { label: 'Wed', value: 3 }, { label: 'Thu', value: 4 },
                              { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 },
                              { label: 'Sun', value: 0 },
                            ].map(({ label, value }) => {
                              const days = form.watch('recurringDaysOfWeek') || []
                              const isOn = days.includes(value)
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    const current = form.watch('recurringDaysOfWeek') || []
                                    form.setValue('recurringDaysOfWeek', isOn ? current.filter(d => d !== value) : [...current, value])
                                  }}
                                  className={cn(
                                    'w-10 h-10 rounded-full text-xs font-semibold border transition-all',
                                    isOn ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                                  )}
                                >{label}</button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Series end date */}
                      {form.watch('recurringFrequency') && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700">
                              Series end date {!recurringNoEndDate && <span className="text-xs text-gray-400 font-normal">(optional)</span>}
                            </Label>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-600">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 w-3.5 h-3.5"
                                checked={recurringNoEndDate}
                                onChange={(e) => {
                                  setRecurringNoEndDate(e.target.checked)
                                  if (e.target.checked) form.setValue('recurringEndDate', null)
                                }}
                              />
                              No end date
                            </label>
                          </div>
                          {!recurringNoEndDate && (
                            <DatePicker
                              date={form.watch('recurringEndDate') || undefined}
                              onSelect={(date) => form.setValue('recurringEndDate', date || null)}
                              placeholder="Select when the series ends (or check No end date)"
                              disabled={(date) => {
                                const start = form.watch('startDate') || form.watch('dueDate')
                                return start ? date <= start : date < new Date(new Date().setHours(0, 0, 0, 0))
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* Info banner */}
                      {form.watch('recurringFrequency') && (form.watch('recurringEndDate') || recurringNoEndDate) && (
                        <div className="flex items-center gap-2 p-3 rounded-lg border text-sm bg-blue-50 border-blue-200 text-blue-700">
                          <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            {recurringNoEndDate
                              ? 'This series repeats indefinitely. A new task is created each time the current one is completed.'
                              : 'Only the first task is created now. The next task is automatically created each time the current one is completed.'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Weight, SLA & Reminders */}
          <Collapsible>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Task Weight &amp; SLA</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                  {/* Task Weight (1-5 stars) */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Task Weight <span className="text-xs text-gray-400 font-normal">(1 = low, 5 = critical)</span></Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => form.setValue('taskWeight', form.watch('taskWeight') === w ? null : w)}
                          className={`w-9 h-9 rounded-lg border-2 text-sm font-bold transition-all ${form.watch('taskWeight') && form.watch('taskWeight')! >= w ? 'bg-amber-400 border-amber-500 text-white' : 'border-gray-200 text-gray-400 hover:border-amber-300'}`}
                        >★</button>
                      ))}
                      {form.watch('taskWeight') && <span className="text-sm text-gray-400 self-center">Weight: {form.watch('taskWeight')}/5</span>}
                    </div>
                  </div>

                  {/* SLA Hours */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">SLA Target</Label>
                    <div className="flex flex-wrap gap-2">
                      {[4, 8, 24, 48, 72, 168].map(h => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => form.setValue('slaHours', form.watch('slaHours') === h ? null : h)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.watch('slaHours') === h ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}
                        >
                          {h < 24 ? `${h}h` : h === 168 ? '1 week' : `${h / 24}d`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reminder Days */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Deadline Reminders</Label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 3, 7, 14].map(d => {
                        const selected = (form.watch('reminderDays') || []).includes(d)
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              const current = form.watch('reminderDays') || []
                              form.setValue('reminderDays', selected ? current.filter(x => x !== d) : [...current, d])
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${selected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}
                          >
                            {d === 1 ? '1 day before' : `${d} days before`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Editing recurring instance notice */}
          {task && task.recurringParentId && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <RefreshCw className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">Recurring task</p>
                <p className="text-xs mt-0.5">Saving changes will update only this task instance. Future instances will be created fresh from the original series settings.</p>
              </div>
            </div>
          )}

          {/* Subtasks Section — only for new tasks */}
          {!task && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100 mb-4">Subtasks</p>
              <div className="space-y-3">
                {/* Add Subtask Form */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter subtask title..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSubtask()
                      }
                    }}
                    className="flex-1 h-9 text-sm"
                  />
                  <Select
                    value={newSubtaskAssigneeId}
                    onValueChange={setNewSubtaskAssigneeId}
                  >
                    <SelectTrigger className="w-[160px] h-9 text-sm">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={session?.user?.id || 'self'}>
                        Myself
                      </SelectItem>
                      {users.filter(u => u.id !== session?.user?.id).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={newSubtaskDeadline}
                    onChange={(e) => setNewSubtaskDeadline(e.target.value)}
                    className="w-[140px] h-9 text-sm"
                    placeholder="Deadline"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={addSubtask}
                    disabled={!newSubtaskTitle.trim()}
                    className="h-9 w-9 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Subtasks List */}
                {pendingSubtasks.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500">{pendingSubtasks.length} subtask{pendingSubtasks.length !== 1 ? 's' : ''} to create</p>
                    {pendingSubtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{subtask.title}</p>
                            <p className="text-xs text-gray-400">
                              {subtask.assignee?.name || subtask.assignee?.email || 'You'}
                              {subtask.dueDate && (
                                <span className="ml-2">• Due: {new Date(subtask.dueDate).toLocaleDateString()}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSubtask(subtask.id)}
                          className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {pendingSubtasks.length === 0 && (
                  <div className="text-center py-3 text-gray-400">
                    <ListTodo className="h-7 w-7 mx-auto mb-1.5 opacity-40" />
                    <p className="text-xs">No subtasks yet — add one above</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignment Section */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100 mb-4">Assignment</p>
            <div className="space-y-4">
              {/* Task Type pill selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Task Type</Label>
                <div className="flex gap-2">
                  {(['INDIVIDUAL', 'TEAM', 'COLLABORATION'] as TaskType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => form.setValue('taskType', type)}
                      className={cn(
                        'flex items-center gap-1.5 flex-1 justify-center py-2 px-3 rounded-lg border text-xs font-semibold transition-all',
                        taskType === type
                          ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                      )}
                    >
                      {getTaskTypeIcon(type)}
                      <span className="capitalize">{type.toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual info */}
              {taskType === 'INDIVIDUAL' && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs text-blue-700">This task is assigned to you automatically.</p>
                </div>
              )}

              {/* Team members */}
              {taskType === 'TEAM' && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Team Members</Label>
                  <SearchableMultiSelect
                    options={users.filter(u => u.id !== session?.user?.id) as SelectOption[]}
                    selected={selectedTeamMembers as SelectOption[]}
                    onSelect={(user) => addTeamMember(user as User)}
                    onRemove={removeTeamMember}
                    onClear={() => {
                      setSelectedTeamMembers([])
                      form.setValue('teamMemberIds', [])
                    }}
                    placeholder="Search and add team members..."
                    emptyText="No team members available"
                  />
                </div>
              )}

              {/* Collaborators */}
              {taskType === 'COLLABORATION' && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Collaborators</Label>
                  <SearchableMultiSelect
                    options={users.filter(u => u.id !== session?.user?.id) as SelectOption[]}
                    selected={selectedCollaborators as SelectOption[]}
                    onSelect={(user) => addCollaborator(user as User)}
                    onRemove={removeCollaborator}
                    onClear={() => {
                      setSelectedCollaborators([])
                      form.setValue('collaboratorIds', [])
                    }}
                    placeholder="Search and add collaborators..."
                    emptyText="No collaborators available"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Additional Section */}
          <Collapsible>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-gray-400" />
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Additional Settings</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                  {/* All Day Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allDay" className="text-sm font-medium text-gray-700">All-day Task</Label>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {form.watch('allDay') ? 'Task can be done anytime during the selected day(s)' : 'Task has specific start and end times'}
                      </p>
                    </div>
                    <Switch
                      id="allDay"
                      checked={form.watch('allDay')}
                      onCheckedChange={(checked) => form.setValue('allDay', checked)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Location */}
                    <div className="space-y-1.5">
                      <Label htmlFor="location" className="text-sm font-medium text-gray-700">Location</Label>
                      <Input
                        id="location"
                        {...form.register('location')}
                        placeholder="e.g., Conference Room A"
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* Meeting Link */}
                    <div className="space-y-1.5">
                      <Label htmlFor="meetingLink" className="text-sm font-medium text-gray-700">Meeting Link</Label>
                      <Input
                        id="meetingLink"
                        {...form.register('meetingLink')}
                        placeholder="https://meet.google.com/..."
                        type="url"
                        className="h-9 text-sm"
                      />
                      {form.formState.errors.meetingLink && (
                        <p className="text-xs text-red-500">Please enter a valid URL</p>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-lg">
              {loading ? 'Saving...' : task ? 'Update Task' : duplicateFrom ? 'Duplicate Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
