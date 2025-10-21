'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { CalendarIcon, Plus, X, Users, User, Handshake } from 'lucide-react'

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
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
  allDay: z.boolean().default(false),
  recurrence: z.string().optional(),
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
      allDay: false,
      recurrence: '',
      startDate: undefined,
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
        form.reset({
          title: task.title,
          description: task.description || '',
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          startDate: task.startDate ? new Date(task.startDate) : undefined,
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
          allDay: task.allDay || false,
          recurrence: task.recurrence || '',
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
          allDay: false,
          recurrence: '',
          startDate: undefined,
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
      await onSubmit(data)
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
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage < 25) return 'bg-red-500'
    if (percentage < 50) return 'bg-orange-500'
    if (percentage < 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update the task details below.' : 'Fill in the details to create a new task.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                {...form.register('title')}
                placeholder="Enter task title"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(value) => form.setValue('priority', value as Priority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Describe the task"
              rows={3}
            />
          </div>

          {/* Status and Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as TaskStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch('startDate') && "text-muted-foreground"
                    )}
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('startDate') ? (
                      format(form.watch('startDate')!, "PPP")
                    ) : (
                      <span>Select start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch('startDate')}
                    onSelect={(date) => form.setValue('startDate', date)}
                  />
                </PopoverContent>
              </Popover>
              {form.watch('startDate') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setValue('startDate', undefined)}
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear date
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch('dueDate') && "text-muted-foreground"
                    )}
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('dueDate') ? (
                      format(form.watch('dueDate')!, "PPP")
                    ) : (
                      <span>Select a due date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch('dueDate')}
                    onSelect={(date) => form.setValue('dueDate', date)}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
              {form.watch('dueDate') && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {form.watch('dueDate')! < new Date() ? (
                      <span className="text-red-600 font-medium">⚠ Past due date</span>
                    ) : (
                      <span className="text-green-600">✓ Valid due date</span>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.setValue('dueDate', undefined)}
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear date
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress">Progress: {progressPercentage}%</Label>
              <div className="space-y-2">
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={progressPercentage}
                  onChange={(e) => form.setValue('progressPercentage', Number(e.target.value))}
                  className="w-full"
                />
                <Progress 
                  value={progressPercentage} 
                  className={`h-2 ${getProgressColor(progressPercentage)}`}
                />
              </div>
            </div>
          </div>

          {/* Google Calendar Fields */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Calendar Details (Google Sync)</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  {...form.register('location')}
                  placeholder="e.g., Conference Room A, 123 Main St, or Building 5"
                />
                <p className="text-xs text-muted-foreground">
                  Physical location or address (e.g., office, meeting room, venue)
                </p>
              </div>

              {/* Meeting Link */}
              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link (Optional)</Label>
                <Input
                  id="meetingLink"
                  {...form.register('meetingLink')}
                  placeholder="e.g., https://meet.google.com/abc-defg-hij"
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  Virtual meeting link (Google Meet, Zoom, Teams, etc.)
                </p>
                {form.formState.errors.meetingLink && (
                  <p className="text-xs text-red-500">Please enter a valid URL</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recurrence */}
              <div className="space-y-2">
                <Label htmlFor="recurrence">Recurrence (Optional)</Label>
                <Select
                  value={form.watch('recurrence') || ''}
                  onValueChange={(value) => form.setValue('recurrence', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Does not repeat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Does not repeat</SelectItem>
                    <SelectItem value="RRULE:FREQ=DAILY">Daily</SelectItem>
                    <SelectItem value="RRULE:FREQ=WEEKLY">Weekly</SelectItem>
                    <SelectItem value="RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR">Weekdays (Mon, Wed, Fri)</SelectItem>
                    <SelectItem value="RRULE:FREQ=MONTHLY">Monthly</SelectItem>
                    <SelectItem value="RRULE:FREQ=YEARLY">Annually</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Set if this task repeats regularly
                </p>
              </div>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center justify-between p-3 bg-background rounded-md border">
              <div className="space-y-0.5">
                <Label htmlFor="allDay">All-day task</Label>
                <p className="text-xs text-muted-foreground">
                  Mark this task as an all-day event in calendar
                </p>
              </div>
              <Switch
                id="allDay"
                checked={form.watch('allDay')}
                onCheckedChange={(checked) => form.setValue('allDay', checked)}
              />
            </div>
          </div>

          {/* Task Type Selection */}
          <div className="space-y-4">
            <Label>Task Type</Label>
            <div className="grid grid-cols-3 gap-4">
              {(['INDIVIDUAL', 'TEAM', 'COLLABORATION'] as TaskType[]).map((type) => (
                <Card
                  key={type}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    taskType === type ? "ring-2 ring-primary" : ""
                  )}
                  onClick={() => form.setValue('taskType', type)}
                >
                  <CardContent className="flex flex-col items-center p-4">
                    {getTaskTypeIcon(type)}
                    <span className="mt-2 text-sm font-medium capitalize">
                      {type.toLowerCase()}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Task Type Specific Fields */}
          {taskType === 'INDIVIDUAL' && (
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This task is assigned to you automatically.
                </p>
              </div>
            </div>
          )}

          {taskType === 'TEAM' && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You are the team leader. Select team members from all users.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Team Members</Label>
                <div className="space-y-2">
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
                  
                  {selectedTeamMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTeamMembers.map((member) => (
                        <Badge key={member.id} variant="secondary" className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={member.image || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                              {member.name
                                ? member.name.split(' ').map(n => n[0]).join('')
                                : member.email?.[0]?.toUpperCase()
                              }
                            </AvatarFallback>
                          </Avatar>
                          {member.name || member.email}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => removeTeamMember(member.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {taskType === 'COLLABORATION' && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You are the primary assignee. Select collaborators from all users.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Collaborators</Label>
                <div className="space-y-2">
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
                  
                  {selectedCollaborators.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedCollaborators.map((collaborator) => (
                        <Badge key={collaborator.id} variant="secondary" className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={collaborator.image || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                              {collaborator.name
                                ? collaborator.name.split(' ').map(n => n[0]).join('')
                                : collaborator.email?.[0]?.toUpperCase()
                              }
                            </AvatarFallback>
                          </Avatar>
                          {collaborator.name || collaborator.email}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => removeCollaborator(collaborator.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
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
