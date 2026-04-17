'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { CalendarIcon, Plus, X, Users, User, Handshake, ListTodo, Trash2, ChevronDown, Settings2, RefreshCw } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { SearchableMultiSelect, SelectOption } from '@/components/ui/searchable-multi-select'
import '@/styles/calendar.css'
import '@/styles/popover-fix.css'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
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
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

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
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false)

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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : duplicateFrom ? 'Duplicate Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update the task details below.' : duplicateFrom ? 'Review and adjust the duplicated task before saving.' : 'Fill in the details to create a new task.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">

          {/* Basic Information Section */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base">Task Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  {...form.register('title')}
                  placeholder="Enter a clear, descriptive task title"
                  className="h-11"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span>⚠</span> {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Provide details about this task..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Priority — always shown, segmented buttons */}
              <div className="space-y-2">
                <Label className="text-base">Priority Level</Label>
                <div className="flex rounded-lg border divide-x overflow-hidden">
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map(p => {
                    const labels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' }
                    const activeColors = { LOW: 'bg-green-100 text-green-800', MEDIUM: 'bg-yellow-100 text-yellow-800', HIGH: 'bg-orange-100 text-orange-800', URGENT: 'bg-red-100 text-red-800' }
                    const active = form.watch('priority') === p
                    return (
                      <button key={p} type="button" onClick={() => form.setValue('priority', p as Priority)}
                        className={cn('flex-1 px-3 py-2 text-xs font-medium transition-colors',
                          active ? activeColors[p] : 'bg-background text-muted-foreground hover:bg-muted')}>
                        {labels[p]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Status & Schedule Section */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Status &amp; Schedule</h3>
            <div className="space-y-6">
              {/* Status segmented buttons */}
              <div className="space-y-2">
                <Label className="text-base">Task Status</Label>
                <div className="flex rounded-lg border divide-x overflow-hidden">
                  {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const).map(s => {
                    const labels = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', COMPLETED: 'Completed' }
                    const activeColors = { TODO: 'bg-gray-100 text-gray-800', IN_PROGRESS: 'bg-blue-100 text-blue-800', IN_REVIEW: 'bg-purple-100 text-purple-800', COMPLETED: 'bg-green-100 text-green-800' }
                    const active = form.watch('status') === s
                    return (
                      <button key={s} type="button" onClick={() => form.setValue('status', s as TaskStatus)}
                        className={cn('flex-1 px-3 py-2 text-xs font-medium transition-colors',
                          active ? activeColors[s] : 'bg-background text-muted-foreground hover:bg-muted')}>
                        {labels[s]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Progress — only when editing */}
              {task && (
                <div className="space-y-3">
                  <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap items-center">
                      {[0, 25, 50, 75, 90].map(p => (
                        <button key={p} type="button"
                          onClick={() => form.setValue('progressPercentage', p)}
                          className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                            progressPercentage === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
                          {p}%
                        </button>
                      ))}
                      <Input type="number" min={0} max={99}
                        value={progressPercentage}
                        onChange={e => form.setValue('progressPercentage', Math.min(99, Number(e.target.value)))}
                        className="w-20 h-8 text-xs" />
                    </div>
                    <Progress value={progressPercentage} className={`h-2 ${getProgressColor(progressPercentage)}`} />
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <span>ℹ️</span> Max 99%. Task must be reviewed by Team Leader to reach 100%.
                    </p>
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Date Range</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">All-day</span>
                    <Switch
                      checked={form.watch('allDay')}
                      onCheckedChange={(checked) => form.setValue('allDay', checked)}
                    />
                  </div>
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
          </section>

          {/* Optional details divider */}
          <div className="flex items-center gap-3 py-1">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground font-medium px-2">Optional details</span>
            <Separator className="flex-1" />
          </div>

          {/* Task Type — compact segmented toggle */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Task Type</h3>
            <div className="flex rounded-lg border divide-x overflow-hidden mb-4">
              {(['INDIVIDUAL', 'TEAM', 'COLLABORATION'] as const).map(type => (
                <button key={type} type="button"
                  onClick={() => form.setValue('taskType', type)}
                  className={cn('flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    taskType === type ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}>
                  {getTaskTypeIcon(type)}
                  <span className="capitalize">{type.toLowerCase()}</span>
                </button>
              ))}
            </div>

            {/* Task Type Specific Fields */}
            {taskType === 'INDIVIDUAL' && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Individual Task
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      This task is assigned to you automatically. Perfect for personal work items.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {taskType === 'TEAM' && (
              <Card className="border-2 border-purple-200 bg-purple-50/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-purple-900">Team Task</CardTitle>
                      <CardDescription className="text-purple-700">
                        You are the team leader. Select members to join this task.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">Team Members</Label>
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
                </CardContent>
              </Card>
            )}

            {taskType === 'COLLABORATION' && (
              <Card className="border-2 border-green-200 bg-green-50/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Handshake className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-green-900">Collaboration Task</CardTitle>
                      <CardDescription className="text-green-700">
                        You are the primary assignee. Add collaborators to work together.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">Collaborators</Label>
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
                </CardContent>
              </Card>
            )}
          </section>

          {/* Subtasks Section - Collapsible (only for new tasks) */}
          {!task && (
            <Collapsible>
              <Card className="border-2 border-amber-200 bg-amber-50/50">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-amber-100/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-full">
                          <ListTodo className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-amber-900">Subtasks</CardTitle>
                          <CardDescription className="text-amber-700">
                            Break this task into smaller pieces and assign them to team members
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pendingSubtasks.length > 0 && (
                          <Badge className="bg-amber-500 text-white">
                            {pendingSubtasks.length}
                          </Badge>
                        )}
                        <ChevronDown className="h-5 w-5 text-amber-600 transition-transform duration-200 data-[state=open]:rotate-180" />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {/* Add Subtask Form — stacked layout */}
                    <div className="space-y-2">
                      {/* Row 1: Title + Add */}
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
                          className="flex-1"
                        />
                        <Button type="button" size="sm" onClick={addSubtask} disabled={!newSubtaskTitle.trim()}>
                          <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </div>
                      {/* Row 2: optional meta — shown only when title has content */}
                      {newSubtaskTitle.trim() && (
                        <div className="flex gap-2 pl-1">
                          <Select value={newSubtaskAssigneeId} onValueChange={setNewSubtaskAssigneeId}>
                            <SelectTrigger className="h-8 text-xs w-[160px]">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={session?.user?.id || 'self'}>
                                Myself
                              </SelectItem>
                              {users.filter(u => u.id !== session?.user?.id).map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5"><AvatarFallback className="text-xs">{(user.name || user.email)?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                                    {user.name || user.email}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <DatePicker
                            date={newSubtaskDeadline ? new Date(newSubtaskDeadline) : undefined}
                            onSelect={d => setNewSubtaskDeadline(d ? format(d, 'yyyy-MM-dd') : '')}
                            placeholder="Due date (optional)"
                          />
                        </div>
                      )}
                    </div>

                    {/* Subtasks List */}
                    {pendingSubtasks.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm text-amber-800">
                          {pendingSubtasks.length} subtask{pendingSubtasks.length !== 1 ? 's' : ''} to create
                        </Label>
                        <div className="space-y-2">
                          {pendingSubtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <div>
                                  <p className="text-sm font-medium">{subtask.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Assigned to: {subtask.assignee?.name || subtask.assignee?.email || 'You'}
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
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pendingSubtasks.length === 0 && (
                      <div className="text-center py-4 text-amber-600">
                        <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No subtasks added yet</p>
                        <p className="text-xs text-muted-foreground">
                          Add subtasks above to break down this task
                        </p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* More options — merged Weight/SLA/Reminders + Location/Meeting Link */}
          <Collapsible open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
            <Card className="border-2">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-full">
                        <Settings2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">More options</CardTitle>
                        <CardDescription>Weight, SLA, reminders, location, and calendar settings</CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform duration-200', moreOptionsOpen && 'rotate-180')} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-0">
                  {/* Task Weight (1-5 stars) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Task Weight <span className="text-xs text-muted-foreground font-normal">(1 = low gravity, 5 = critical)</span></Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => form.setValue('taskWeight', form.watch('taskWeight') === w ? null : w)}
                          className={`w-9 h-9 rounded-lg border-2 text-sm font-bold transition-all ${form.watch('taskWeight') && form.watch('taskWeight')! >= w ? 'bg-amber-400 border-amber-500 text-white' : 'border-gray-200 text-gray-400 hover:border-amber-300'}`}
                        >★</button>
                      ))}
                      {form.watch('taskWeight') && <span className="text-sm text-muted-foreground self-center">Weight: {form.watch('taskWeight')}/5</span>}
                    </div>
                  </div>

                  {/* SLA Hours */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">SLA Target</Label>
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
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Deadline Reminders</Label>
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

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Location */}
                    <div className="space-y-3">
                      <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                        <span className="text-base">📍</span>
                        Location
                      </Label>
                      <Input
                        id="location"
                        {...form.register('location')}
                        placeholder="e.g., Conference Room A, Building 5"
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Physical location or address
                      </p>
                    </div>

                    {/* Meeting Link */}
                    <div className="space-y-3">
                      <Label htmlFor="meetingLink" className="text-sm font-medium flex items-center gap-2">
                        <span className="text-base">🔗</span>
                        Meeting Link
                      </Label>
                      <Input
                        id="meetingLink"
                        {...form.register('meetingLink')}
                        placeholder="https://meet.google.com/..."
                        type="url"
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Virtual meeting URL (Meet, Zoom, Teams)
                      </p>
                      {form.formState.errors.meetingLink && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> Please enter a valid URL
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Editing recurring instance notice */}
          {task && task.recurringParentId && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <RefreshCw className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">Recurring task</p>
                <p>Saving changes will update only this task instance. Future instances will be created fresh from the original series settings.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Update Task' : duplicateFrom ? 'Duplicate Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
