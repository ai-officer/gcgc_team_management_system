'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { CalendarIcon, Plus, X, Users, User, Handshake } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import '@/styles/date-picker.css'

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

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



const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().optional(),
  dueDate: z.date().optional(),
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
})

type TaskFormData = z.infer<typeof taskFormSchema>

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: any // Existing task for editing
  onSubmit: (data: TaskFormData) => Promise<void>
}

export default function TaskForm({ open, onOpenChange, task, onSubmit }: TaskFormProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<User[]>([])
  const [selectedCollaborators, setSelectedCollaborators] = useState<User[]>([])
  const [teamMemberSearch, setTeamMemberSearch] = useState('')
  const [collaboratorSearch, setCollaboratorSearch] = useState('')
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [dueDateOpen, setDueDateOpen] = useState(false)

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
    },
  })

  const taskType = form.watch('taskType')
  const progressPercentage = form.watch('progressPercentage')

  // Load initial data
  useEffect(() => {
    if (open) {
      fetchUsers()
      
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
          assigneeId: session?.user?.id, // Always current user
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
        })
        
        // Set selected members and collaborators for display
        if (task.teamMembers) {
          setSelectedTeamMembers(task.teamMembers.map((tm: any) => tm.user))
        }
        if (task.collaborators) {
          setSelectedCollaborators(task.collaborators.map((c: any) => c.user))
        }
      } else {
        // Set defaults for new task based on current user
        form.reset({
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
        })

        // Clear selected arrays
        setSelectedTeamMembers([])
        setSelectedCollaborators([])
      }
    }
  }, [open, task, form, session])

  // Handle task type changes and set appropriate defaults
  useEffect(() => {
    if (!task && session?.user?.id) { // Only for new tasks
      // Always assign to current user regardless of task type
      form.setValue('assigneeId', session.user.id)
      
      // Clear selections when changing task types
      if (taskType === 'INDIVIDUAL') {
        setSelectedTeamMembers([])
        setSelectedCollaborators([])
        form.setValue('teamMemberIds', [])
        form.setValue('collaboratorIds', [])
      } else if (taskType === 'TEAM') {
        setSelectedCollaborators([])
        form.setValue('collaboratorIds', [])
      } else if (taskType === 'COLLABORATION') {
        setSelectedTeamMembers([])
        form.setValue('teamMemberIds', [])
      }
    }
  }, [taskType, session?.user?.id, task, form])

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
        }

        // If we have an end date and time, combine them
        if (data.dueDate && data.endTime) {
          const [hours, minutes] = data.endTime.split(':')
          const dueDateTime = new Date(data.dueDate)
          dueDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          submissionData.dueDate = dueDateTime
        }
      }

      await onSubmit(submissionData)
      onOpenChange(false)
      form.reset()
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

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-300'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'LOW': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'IN_REVIEW': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update the task details below.' : 'Fill in the details to create a new task.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information Section */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Task title, description, and priority</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="priority" className="text-base">Priority Level</Label>
                <Select
                  value={form.watch('priority')}
                  onValueChange={(value) => form.setValue('priority', value as Priority)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">Low</Badge>
                        <span className="text-xs text-muted-foreground">Can wait</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">Medium</Badge>
                        <span className="text-xs text-muted-foreground">Normal priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100">High</Badge>
                        <span className="text-xs text-muted-foreground">Important</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="URGENT">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100">Urgent</Badge>
                        <span className="text-xs text-muted-foreground">Critical!</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Badge className={cn("w-fit", getPriorityColor(form.watch('priority')))}>
                  {form.watch('priority')} Priority
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Status and Schedule Section */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Status & Schedule</CardTitle>
              <CardDescription>Track progress and set deadlines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status and Progress Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="status" className="text-base">Task Status</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value) => form.setValue('status', value as TaskStatus)}
                  >
                    <SelectTrigger className="h-11">
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
                  <Badge className={cn("w-fit", getStatusColor(form.watch('status')))}>
                    {form.watch('status').replace('_', ' ')}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="progress" className="text-base">Progress: {progressPercentage}%</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Input
                        type="range"
                        min="0"
                        max="100"
                        value={progressPercentage}
                        onChange={(e) => form.setValue('progressPercentage', Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-sm font-semibold min-w-[3rem] text-right">{progressPercentage}%</span>
                    </div>
                    <Progress 
                      value={progressPercentage} 
                      className={`h-3 ${getProgressColor(progressPercentage)}`}
                    />
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Date Range</Label>
                  <Badge variant="outline" className="text-xs">
                    {form.watch('allDay') ? 'All-day task' : 'Specific times'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Date */}
                  <div className="space-y-3">
                    <Label htmlFor="startDate" className="text-sm font-medium flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      Start Date
                      <span className="text-xs text-muted-foreground font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <div className="space-y-2">
                      <Popover open={startDateOpen} onOpenChange={setStartDateOpen} modal>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full h-11 justify-start text-left font-normal",
                              !form.watch('startDate') && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.watch('startDate') ? (
                              format(form.watch('startDate')!, "PPP")
                            ) : (
                              <span>Select start date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[200]" align="start">
                          <DayPicker
                            mode="single"
                            selected={form.watch('startDate')}
                            onSelect={(date) => {
                              form.setValue('startDate', date)
                              setStartDateOpen(false)
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            className="p-3"
                          />
                          {form.watch('startDate') && (
                            <div className="p-3 border-t">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  form.setValue('startDate', undefined)
                                  setStartDateOpen(false)
                                }}
                                className="w-full"
                              >
                                Clear date
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                      {!form.watch('allDay') && (
                        <Input
                          type="time"
                          value={form.watch('startTime') || ''}
                          onChange={(e) => form.setValue('startTime', e.target.value)}
                          placeholder="Start time"
                          className="h-11"
                        />
                      )}
                    </div>
                  </div>

                  {/* End Date */}
                  <div className="space-y-3">
                    <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-2">
                      <CalendarIcon className="h-3.5 w-3.5 text-orange-600" />
                      Due Date
                      <span className="text-xs text-orange-600 font-semibold">
                        *Required
                      </span>
                    </Label>
                    <div className="space-y-2">
                      <Popover open={dueDateOpen} onOpenChange={setDueDateOpen} modal>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full h-11 justify-start text-left font-normal",
                              !form.watch('dueDate') && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-orange-600" />
                            {form.watch('dueDate') ? (
                              format(form.watch('dueDate')!, "PPP")
                            ) : (
                              <span>Select due date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[200]" align="start">
                          <DayPicker
                            mode="single"
                            selected={form.watch('dueDate')}
                            onSelect={(date) => {
                              form.setValue('dueDate', date)
                              setDueDateOpen(false)
                            }}
                            disabled={(date) => {
                              const today = new Date(new Date().setHours(0, 0, 0, 0))
                              const startDate = form.watch('startDate')
                              const minDate = startDate && startDate > today ? startDate : today
                              return date < minDate
                            }}
                            className="p-3"
                          />
                          {form.watch('dueDate') && (
                            <div className="p-3 border-t">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  form.setValue('dueDate', undefined)
                                  setDueDateOpen(false)
                                }}
                                className="w-full"
                              >
                                Clear date
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                      {!form.watch('allDay') && (
                        <Input
                          type="time"
                          value={form.watch('endTime') || ''}
                          onChange={(e) => form.setValue('endTime', e.target.value)}
                          placeholder="End time"
                          className="h-11"
                        />
                      )}
                    </div>
                  </div>
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
            </CardContent>
          </Card>

          {/* Calendar Integration Section */}
          <Card className="border-2 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-blue-900">Calendar Integration</CardTitle>
                  <CardDescription className="text-blue-700">Additional details for Google Calendar sync</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* All Day Toggle - moved to top */}
              <div className="flex items-center justify-between p-4 bg-white/80 rounded-lg border-2 border-blue-200/50 shadow-sm">
                <div className="space-y-1">
                  <Label htmlFor="allDay" className="text-base font-semibold text-blue-900">All-day Task</Label>
                  <p className="text-sm text-blue-700">
                    {form.watch('allDay')
                      ? 'Task can be done anytime during the selected day(s)'
                      : 'Task has specific start and end times'}
                  </p>
                </div>
                <Switch
                  id="allDay"
                  checked={form.watch('allDay')}
                  onCheckedChange={(checked) => form.setValue('allDay', checked)}
                />
              </div>

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
                    className="h-11 bg-white/80 border-blue-200/50"
                  />
                  <p className="text-xs text-blue-600">
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
                    className="h-11 bg-white/80 border-blue-200/50"
                  />
                  <p className="text-xs text-blue-600">
                    Virtual meeting URL (Meet, Zoom, Teams)
                  </p>
                  {form.formState.errors.meetingLink && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span>⚠</span> Please enter a valid URL
                    </p>
                  )}
                </div>
              </div>

              {/* Recurrence */}
              <div className="space-y-3">
                <Label htmlFor="recurrence" className="text-sm font-medium flex items-center gap-2">
                  <span className="text-base">🔄</span>
                  Recurrence
                </Label>
                <Select
                  value={form.watch('recurrence') || 'NONE'}
                  onValueChange={(value) => form.setValue('recurrence', value === 'NONE' ? undefined : value)}
                >
                  <SelectTrigger className="h-11 bg-white/80 border-blue-200/50">
                    <SelectValue placeholder="Does not repeat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">○</span>
                        Does not repeat
                      </div>
                    </SelectItem>
                    <SelectItem value="RRULE:FREQ=DAILY">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500">●</span>
                        Daily
                      </div>
                    </SelectItem>
                    <SelectItem value="RRULE:FREQ=WEEKLY">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">●</span>
                        Weekly
                      </div>
                    </SelectItem>
                    <SelectItem value="RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-500">●</span>
                        Weekdays (Mon, Wed, Fri)
                      </div>
                    </SelectItem>
                    <SelectItem value="RRULE:FREQ=MONTHLY">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-500">●</span>
                        Monthly
                      </div>
                    </SelectItem>
                    <SelectItem value="RRULE:FREQ=YEARLY">
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">●</span>
                        Annually
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-blue-600">
                  Set if this task repeats on a regular schedule
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Task Type Selection */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Task Type</CardTitle>
              <CardDescription>Choose who will be involved in this task</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['INDIVIDUAL', 'TEAM', 'COLLABORATION'] as TaskType[]).map((type) => (
                  <Card
                    key={type}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2",
                      taskType === type 
                        ? "ring-2 ring-primary border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => form.setValue('taskType', type)}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                      <div className={cn(
                        "p-3 rounded-full transition-colors",
                        taskType === type 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      )}>
                        {getTaskTypeIcon(type)}
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-semibold capitalize block">
                          {type.toLowerCase()}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {type === 'INDIVIDUAL' && 'Just you'}
                          {type === 'TEAM' && 'You + team members'}
                          {type === 'COLLABORATION' && 'You + collaborators'}
                        </span>
                      </div>
                      {taskType === type && (
                        <Badge className="bg-primary">
                          Selected
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

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
                  <Select 
                    onValueChange={(value) => {
                      const user = users.find(u => u.id === value)
                      if (user) addTeamMember(user)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search and add team members..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search users..."
                          value={teamMemberSearch}
                          onChange={(e) => setTeamMemberSearch(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                      {users
                        .filter(user => {
                          const searchMatch = !teamMemberSearch || 
                            user.name?.toLowerCase().includes(teamMemberSearch.toLowerCase()) ||
                            user.email.toLowerCase().includes(teamMemberSearch.toLowerCase())
                          return user.id !== session?.user?.id && // Don't include yourself
                                 !selectedTeamMembers.find(sm => sm.id === user.id) &&
                                 searchMatch
                        })
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.image || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                                  {user.name
                                    ? user.name.split(' ').map(n => n[0]).join('')
                                    : user.email?.[0]?.toUpperCase()
                                  }
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name || 'No name'}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedTeamMembers.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedTeamMembers.length} member{selectedTeamMembers.length > 1 ? 's' : ''} selected
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTeamMembers.map((member) => (
                          <Badge key={member.id} variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={member.image || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                                {member.name
                                  ? member.name.split(' ').map(n => n[0]).join('')
                                  : member.email?.[0]?.toUpperCase()
                                }
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{member.name || member.email}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-destructive/20"
                              onClick={() => removeTeamMember(member.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                      No team members selected yet
                    </p>
                  )}
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
                  <Select onValueChange={(value) => {
                    const user = users.find(u => u.id === value)
                    if (user) addCollaborator(user)
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Search and add collaborators..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search users..."
                          value={collaboratorSearch}
                          onChange={(e) => setCollaboratorSearch(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                      {users
                        .filter(user => {
                          const searchMatch = !collaboratorSearch || 
                            user.name?.toLowerCase().includes(collaboratorSearch.toLowerCase()) ||
                            user.email.toLowerCase().includes(collaboratorSearch.toLowerCase())
                          return user.id !== session?.user?.id && // Don't include yourself
                                 !selectedCollaborators.find(sc => sc.id === user.id) &&
                                 searchMatch
                        })
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.image || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                                  {user.name
                                    ? user.name.split(' ').map(n => n[0]).join('')
                                    : user.email?.[0]?.toUpperCase()
                                  }
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name || 'No name'}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedCollaborators.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedCollaborators.length} collaborator{selectedCollaborators.length > 1 ? 's' : ''} added
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCollaborators.map((collaborator) => (
                          <Badge key={collaborator.id} variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={collaborator.image || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                                {collaborator.name
                                  ? collaborator.name.split(' ').map(n => n[0]).join('')
                                  : collaborator.email?.[0]?.toUpperCase()
                                }
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{collaborator.name || collaborator.email}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-destructive/20"
                              onClick={() => removeCollaborator(collaborator.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                      No collaborators added yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
