'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import {
  Plus,
  Search,
  Clock,
  User,
  Users,
  Handshake,
  AlertCircle,
  CheckSquare,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Inbox
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { format, isAfter, subDays } from 'date-fns'
import TaskForm from '@/components/tasks/TaskForm'
import TaskViewModal from '@/components/tasks/TaskViewModal'

interface Task {
  id: string
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  startDate?: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
  progressPercentage: number
  taskType: 'INDIVIDUAL' | 'TEAM' | 'COLLABORATION'
  // Google Calendar fields
  location?: string
  meetingLink?: string
  allDay?: boolean
  recurrence?: string
  reminders?: any
  assignee?: {
    id: string
    name: string
    email: string
    image?: string
  }
  creator?: {
    id: string
    name: string
    email: string
    image?: string
  }
  assignedBy?: {
    id: string
    name: string
    email: string
    image?: string
  }
  team?: {
    id: string
    name: string
  }
  teamMembers?: Array<{
    userId: string
    user: {
      id: string
      name: string
      email: string
      image?: string
    }
    role: string
  }>
  collaborators?: Array<{
    userId: string
    user: {
      id: string
      name: string
      email: string
      image?: string
    }
  }>
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  name: string
  email: string
  image?: string
}

const COLUMN_CONFIG = {
  TODO: {
    title: 'To Do',
    color: 'bg-gradient-to-br from-slate-50 to-slate-100',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-700',
    badgeColor: 'bg-slate-600',
    icon: Inbox,
    description: 'Tasks waiting to start',
    wipLimit: 10
  },
  IN_PROGRESS: {
    title: 'In Progress',
    color: 'bg-gradient-to-br from-blue-50 to-blue-100',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-600',
    icon: Zap,
    description: 'Currently active tasks',
    wipLimit: 5
  },
  IN_REVIEW: {
    title: 'In Review',
    color: 'bg-gradient-to-br from-amber-50 to-amber-100',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    badgeColor: 'bg-amber-600',
    icon: Eye,
    description: 'Awaiting review',
    wipLimit: 5
  },
  COMPLETED: {
    title: 'Completed',
    color: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    badgeColor: 'bg-emerald-600',
    icon: CheckSquare,
    description: 'Finished tasks',
    wipLimit: null
  }
}

export default function TasksPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)

  // Enhanced Kanban features
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>([])
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'comfortable' | 'compact'>('comfortable')

  const fetchTasks = async () => {
    if (!session?.user) return

    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedUser) params.append('userId', selectedUser)
      
      console.log('Current user session:', {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        name: session.user.name
      })
      console.log('Fetching tasks with params:', params.toString())
      
      const response = await fetch(`/api/tasks?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Fetch tasks error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch tasks')
      }
      
      const data = await response.json()
      console.log('Tasks fetched:', data.tasks?.length || 0, 'tasks')
      console.log('First few tasks:', data.tasks?.slice(0, 3))
      setTasks(data.tasks || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [session, searchTerm, selectedUser])

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

  useEffect(() => {
    if (session?.user) {
      fetchUsers()
    }
  }, [session])

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { draggableId, destination, source } = result
    const newStatus = destination.droppableId as Task['status']
    const originalStatus = source.droppableId as Task['status']
    
    // Don't do anything if dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }
    
    // Find the task being moved
    const taskBeingMoved = tasks.find(t => t.id === draggableId)
    if (!taskBeingMoved) return
    
    // Check if user can change task status
    if (!canUserChangeTaskStatus(taskBeingMoved)) {
      toast({
        title: 'Cannot Move Task',
        description: 'You cannot change the status of this task. Please add comments to communicate with the task owner instead.',
        variant: 'destructive'
      })
      return
    }
    
    // Optimistically update the UI
    setTasks(prev => 
      prev.map(task => 
        task.id === draggableId 
          ? { ...task, status: newStatus } 
          : task
      )
    )

    try {
      const response = await fetch(`/api/tasks/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update task status`)
      }

      // Get the updated task data from the response
      const updatedTask = await response.json()
      
      // Update the task with the server response to ensure consistency
      setTasks(prev => 
        prev.map(task => 
          task.id === draggableId ? updatedTask : task
        )
      )

      toast({
        title: 'Success',
        description: `Task moved to ${COLUMN_CONFIG[newStatus].title}`,
      })

    } catch (err) {
      console.error('Error updating task status:', err)
      
      // Revert on error
      setTasks(prev => 
        prev.map(task => 
          task.id === draggableId 
            ? { ...task, status: originalStatus } 
            : task
        )
      )

      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update task status',
        variant: 'destructive'
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500'
      case 'HIGH': return 'bg-orange-500'
      case 'MEDIUM': return 'bg-yellow-500'
      case 'LOW': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'INDIVIDUAL': return <User className="h-3 w-3" />
      case 'TEAM': return <Users className="h-3 w-3" />
      case 'COLLABORATION': return <Handshake className="h-3 w-3" />
      default: return <User className="h-3 w-3" />
    }
  }

  // Memoized filtered tasks based on quick filters
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Apply priority filter
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter(task => selectedPriorities.includes(task.priority))
    }

    // Apply task type filter
    if (selectedTaskTypes.length > 0) {
      filtered = filtered.filter(task => selectedTaskTypes.includes(task.taskType))
    }

    return filtered
  }, [tasks, selectedPriorities, selectedTaskTypes])

  const getTasksByStatus = (status: Task['status']) =>
    filteredTasks.filter(task => task.status === status)

  // Toggle column collapse
  const toggleColumnCollapse = (status: string) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(status)) {
        newSet.delete(status)
      } else {
        newSet.add(status)
      }
      return newSet
    })
  }

  // Toggle priority filter
  const togglePriorityFilter = (priority: string) => {
    setSelectedPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    )
  }

  // Toggle task type filter
  const toggleTaskTypeFilter = (taskType: string) => {
    setSelectedTaskTypes(prev =>
      prev.includes(taskType)
        ? prev.filter(t => t !== taskType)
        : [...prev, taskType]
    )
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedPriorities([])
    setSelectedTaskTypes([])
    setSelectedUser('')
    setSearchTerm('')
  }

  // Check if any filters are active
  const hasActiveFilters = selectedPriorities.length > 0 ||
    selectedTaskTypes.length > 0 ||
    selectedUser !== '' ||
    searchTerm !== ''

  const handleCreateTask = async (taskData: any) => {
    try {
      console.log('Creating task with data:', taskData)
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Create task error response:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create task`)
      }

      const newTask = await response.json()
      console.log('Task created successfully:', newTask)
      
      // Refresh tasks from server to ensure we get the latest data
      await fetchTasks()
      
      toast({
        title: 'Success',
        description: 'Task created successfully'
      })
    } catch (error) {
      console.error('Error creating task:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create task',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateTask = async (taskData: any) => {
    if (!editingTask) return

    try {
      console.log('Updating task:', editingTask.id, 'with data:', taskData)
      
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Update task error response:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update task`)
      }

      const updatedTask = await response.json()
      console.log('Task updated successfully:', updatedTask)
      
      // Refresh tasks to ensure we have the latest data
      await fetchTasks()
      
      setEditingTask(null)
      toast({
        title: 'Success',
        description: 'Task updated successfully'
      })
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteTask = async () => {
    if (!deletingTask) return

    try {
      console.log('Deleting task:', deletingTask.id, deletingTask.title)
      
      const response = await fetch(`/api/tasks/${deletingTask.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Delete task error response:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to delete task`)
      }

      console.log('Task deleted successfully')
      
      // Refresh tasks to ensure we have the latest data
      await fetchTasks()
      
      setDeletingTask(null)
      toast({
        title: 'Success',
        description: 'Task deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete task',
        variant: 'destructive'
      })
    }
  }

  // Helper function to check if task was created by current user
  const isTaskCreatedByUser = (task: Task) => {
    return task.creator?.id === session?.user?.id
  }

  // Helper function to check if user can delete the task
  const canDeleteTask = (task: Task) => {
    // Can delete if user created the task
    if (task.creator?.id === session?.user?.id) {
      return true
    }
    // Can delete if user is a leader and assigned the task
    if (session?.user?.role === 'LEADER' && task.assignedBy?.id === session?.user?.id) {
      return true
    }
    // Admin can delete any task
    if (session?.user?.role === 'ADMIN') {
      return true
    }
    return false
  }

  // Helper function to check if task is new (created within last 3 days)
  const isTaskNew = (task: Task) => {
    const threeDaysAgo = subDays(new Date(), 3)
    return isAfter(new Date(task.createdAt), threeDaysAgo)
  }

  // Helper function to check if user can change task status
  const canUserChangeTaskStatus = (task: Task) => {
    // Task creator can always change status
    if (task.creator?.id === session?.user?.id) return true
    
    // Admin can change any task status
    if (session?.user?.role === 'ADMIN') return true
    
    // Leaders can change status for tasks in their teams
    if (session?.user?.role === 'LEADER') return true
    
    // Individual tasks directly assigned can be changed by assignee
    if (task.taskType === 'INDIVIDUAL' && task.assignee?.id === session?.user?.id) {
      // But not if they are team member or collaborator (these should use comments)
      const isTeamMember = task.teamMembers?.some(tm => tm.userId === session?.user?.id)
      const isCollaborator = task.collaborators?.some(c => c.userId === session?.user?.id)
      return !isTeamMember && !isCollaborator
    }
    
    return false
  }
  
  // Helper function to open view modal for all users
  const handleTaskClick = (task: Task) => {
    setViewingTask(task)
    setShowViewModal(true)
  }
  
  // Helper function to open edit modal (called from view modal)
  const handleEditFromView = (task: Task) => {
    setEditingTask(task)
    setShowTaskForm(true)
    setShowViewModal(false)
  }

  const openEditForm = (task: Task) => {
    setEditingTask(task)
    setShowTaskForm(true)
  }

  const closeTaskForm = () => {
    setShowTaskForm(false)
    setEditingTask(null)
  }

  const closeViewModal = () => {
    setShowViewModal(false)
    setViewingTask(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and collaborations
          </p>
        </div>
        <Button onClick={() => setShowTaskForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Enhanced Filters */}
      <Card className="border-2 shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search and User Filter Row */}
            <div className="flex gap-4 items-center flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks by title, description, or users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedUser || "all"} onValueChange={(value) => setSelectedUser(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                            {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.name || user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="gap-2"
                >
                  <X className="h-3 w-3" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Quick Filters Row */}
            <div className="flex gap-4 items-start flex-wrap">
              {/* Priority Filters */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Priority</span>
                <div className="flex gap-2">
                  {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((priority) => (
                    <Button
                      key={priority}
                      variant={selectedPriorities.includes(priority) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => togglePriorityFilter(priority)}
                      className={`gap-2 ${
                        selectedPriorities.includes(priority)
                          ? getPriorityColor(priority) + ' text-white hover:opacity-90'
                          : ''
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(priority)}`} />
                      <span className="capitalize text-xs">{priority.toLowerCase()}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Task Type Filters */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Task Type</span>
                <div className="flex gap-2">
                  {['INDIVIDUAL', 'TEAM', 'COLLABORATION'].map((taskType) => (
                    <Button
                      key={taskType}
                      variant={selectedTaskTypes.includes(taskType) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleTaskTypeFilter(taskType)}
                      className="gap-2"
                    >
                      {getTaskTypeIcon(taskType)}
                      <span className="capitalize text-xs">
                        {taskType.toLowerCase().replace('_', ' ')}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex flex-col gap-2 ml-auto">
                <span className="text-xs font-medium text-muted-foreground">View</span>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'comfortable' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('comfortable')}
                    className="text-xs"
                  >
                    Comfortable
                  </Button>
                  <Button
                    variant={viewMode === 'compact' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('compact')}
                    className="text-xs"
                  >
                    Compact
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex gap-2 items-center flex-wrap pt-2 border-t">
                <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
                {selectedPriorities.map(priority => (
                  <Badge key={priority} variant="secondary" className="gap-1">
                    {priority}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => togglePriorityFilter(priority)}
                    />
                  </Badge>
                ))}
                {selectedTaskTypes.map(taskType => (
                  <Badge key={taskType} variant="secondary" className="gap-1">
                    {taskType}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => toggleTaskTypeFilter(taskType)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[700px]">
          {Object.entries(COLUMN_CONFIG).map(([status, config]) => {
            const columnTasks = getTasksByStatus(status as Task['status'])
            const isCollapsed = collapsedColumns.has(status)
            const wipLimit = config.wipLimit
            const isOverLimit = wipLimit && columnTasks.length > wipLimit
            const ColumnIcon = config.icon

            return (
              <div key={status} className="min-w-0 space-y-4">
                {/* Enhanced Column Header */}
                <div
                  className={`p-4 rounded-xl ${config.color} shadow-md border-2 ${config.borderColor}
                    transition-all duration-300 hover:shadow-lg`}
                >
                  <div className="space-y-3">
                    {/* Title Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg bg-white/50 ${config.textColor}`}>
                          <ColumnIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className={`font-bold ${config.textColor} text-sm flex items-center gap-2`}>
                            {config.title}
                            <Badge
                              className={`${config.badgeColor} text-white font-bold ${
                                isOverLimit ? 'animate-pulse' : ''
                              }`}
                            >
                              {columnTasks.length}
                              {wipLimit && ` / ${wipLimit}`}
                            </Badge>
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {config.description}
                          </p>
                        </div>
                      </div>

                      {/* Collapse Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleColumnCollapse(status)}
                        className="h-8 w-8 p-0"
                      >
                        {isCollapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* WIP Limit Warning */}
                    {isOverLimit && !isCollapsed && (
                      <div className="bg-red-100 border border-red-300 rounded-lg p-2 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-red-600" />
                        <span className="text-xs text-red-700 font-medium">
                          Over WIP limit by {columnTasks.length - wipLimit!}
                        </span>
                      </div>
                    )}

                    {/* Column Statistics */}
                    {!isCollapsed && columnTasks.length > 0 && (
                      <div className="flex gap-2 text-xs">
                        <div className="bg-white/50 rounded px-2 py-1">
                          <span className="font-medium text-gray-700">
                            🔴 {columnTasks.filter(t => t.priority === 'URGENT').length}
                          </span>
                        </div>
                        <div className="bg-white/50 rounded px-2 py-1">
                          <span className="font-medium text-gray-700">
                            🟠 {columnTasks.filter(t => t.priority === 'HIGH').length}
                          </span>
                        </div>
                        <div className="bg-white/50 rounded px-2 py-1">
                          <span className="font-medium text-gray-700">
                            🟡 {columnTasks.filter(t => t.priority === 'MEDIUM').length}
                          </span>
                        </div>
                        <div className="bg-white/50 rounded px-2 py-1">
                          <span className="font-medium text-gray-700">
                            🟢 {columnTasks.filter(t => t.priority === 'LOW').length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Droppable Area */}
                {!isCollapsed && (
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 p-3 rounded-xl transition-all duration-300 ${
                          viewMode === 'comfortable' ? 'min-h-[550px]' : 'min-h-[400px]'
                        } ${
                          snapshot.isDraggingOver
                            ? 'bg-primary/5 border-2 border-dashed border-primary/40 shadow-inner scale-[1.02]'
                            : 'bg-transparent'
                        }`}
                      >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canUserChangeTaskStatus(task)}>
                          {(provided, snapshot) => {
                            const canDrag = canUserChangeTaskStatus(task)
                            const cardHeight = viewMode === 'comfortable' ? 'min-h-[180px]' : 'min-h-[140px]'

                            return (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...(canDrag ? provided.dragHandleProps : {})}
                                className={`relative cursor-pointer transition-all duration-200 ${cardHeight} ${
                                  canDrag
                                    ? 'hover:cursor-grab active:cursor-grabbing'
                                    : 'cursor-default'
                                } ${
                                  snapshot.isDragging
                                    ? 'shadow-2xl rotate-3 scale-110 z-50 ring-4 ring-primary/20'
                                    : canDrag
                                      ? 'hover:shadow-lg hover:-translate-y-2 shadow-md'
                                      : 'shadow-sm'
                                } bg-white border-2 ${
                                  isOverLimit
                                    ? 'border-red-300 bg-red-50/30'
                                    : 'border-gray-200'
                                } rounded-xl ${
                                  !canDrag ? 'opacity-95' : ''
                                }`}
                                onClick={() => {
                                  if (!snapshot.isDragging) {
                                    handleTaskClick(task)
                                  }
                                }}
                              >
                              <CardContent className="p-4">
                                {/* New Task Indicator */}
                                {isTaskNew(task) && !isTaskCreatedByUser(task) && (
                                  <div className="absolute -top-3 -right-3 z-10">
                                    <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg animate-pulse">
                                      NEW
                                    </div>
                                  </div>
                                )}
                                
                                {/* Cannot Move Indicator */}
                                {!canUserChangeTaskStatus(task) && (
                                  <div className="absolute -top-2 -left-2 z-10">
                                    <div className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                      💬 Comment Only
                                    </div>
                                  </div>
                                )}
                                
                                {/* Header Section */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div className="flex-shrink-0">
                                        {getTaskTypeIcon(task.taskType)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-sm leading-tight text-gray-900 truncate mb-1">
                                          {task.title}
                                        </h4>
                                        {!isTaskCreatedByUser(task) && (
                                          <Badge variant="outline" className="text-xs">
                                            Assigned
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 flex-shrink-0 ml-2"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {/* View option - available for all users */}
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation()
                                        handleTaskClick(task)
                                      }}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      
                                      {/* Edit option - only for task creators */}
                                      {isTaskCreatedByUser(task) && (
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation()
                                          openEditForm(task)
                                        }}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                      )}
                                      
                                      {/* Delete option - shown if user can delete */}
                                      {canDeleteTask(task) && (
                                        <DropdownMenuItem 
                                          className="text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setDeletingTask(task)
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {/* Description */}
                                {task.description && (
                                  <div className="mb-3">
                                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                      {task.description}
                                    </p>
                                  </div>
                                )}

                                {/* Progress Section */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-700">Progress</span>
                                    <span className="text-xs font-semibold text-gray-900">{task.progressPercentage || 0}%</span>
                                  </div>
                                  <Progress 
                                    value={task.progressPercentage || 0} 
                                    className="h-2 bg-gray-200"
                                  />
                                </div>

                                {/* Badges and Due Date */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                                    <span className="text-xs font-medium text-gray-700 capitalize">
                                      {task.priority.toLowerCase()}
                                    </span>
                                  </div>
                                  {task.dueDate && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                      <Clock className="h-3 w-3" />
                                      <span className="font-medium">
                                        {format(new Date(task.dueDate), 'MMM dd')}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Task Type and Team Badge */}
                                <div className="flex items-center gap-1.5 mb-3">
                                  <Badge variant="outline" className="text-xs">
                                    {task.taskType.replace('_', ' ')}
                                  </Badge>
                                  {task.team && (
                                    <Badge variant="secondary" className="text-xs">
                                      {task.team.name}
                                    </Badge>
                                  )}
                                </div>

                                {/* Assignees and Collaborators */}
                                <div className="space-y-1.5">
                                  {task.assignee && (
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={task.assignee.image || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                                          {task.assignee.name ? 
                                            task.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                                            task.assignee.email[0].toUpperCase()
                                          }
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-muted-foreground truncate">
                                        {task.assignee.name || task.assignee.email}
                                      </span>
                                    </div>
                                  )}

                                  {task.teamMembers && task.teamMembers.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3 text-muted-foreground" />
                                      <div className="flex -space-x-1">
                                        {task.teamMembers.slice(0, 3).map((member) => (
                                          <Avatar key={member.userId} className="h-4 w-4 border border-background">
                                            <AvatarImage src={member.user.image || undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                                              {member.user.name ? 
                                                member.user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                                                member.user.email[0].toUpperCase()
                                              }
                                            </AvatarFallback>
                                          </Avatar>
                                        ))}
                                        {task.teamMembers.length > 3 && (
                                          <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center border border-background">
                                            <span className="text-xs">+{task.teamMembers.length - 3}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {task.collaborators && task.collaborators.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Handshake className="h-3 w-3 text-muted-foreground" />
                                      <div className="flex -space-x-1">
                                        {task.collaborators.slice(0, 3).map((collaborator) => (
                                          <Avatar key={collaborator.userId} className="h-4 w-4 border border-background">
                                            <AvatarImage src={collaborator.user.image || undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                                              {collaborator.user.name ? 
                                                collaborator.user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                                                collaborator.user.email[0].toUpperCase()
                                              }
                                            </AvatarFallback>
                                          </Avatar>
                                        ))}
                                        {task.collaborators.length > 3 && (
                                          <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center border border-background">
                                            <span className="text-xs">+{task.collaborators.length - 3}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                            )
                          }}
                        </Draggable>
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="rounded-full bg-muted p-4 mb-3">
                            <Inbox className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">No tasks</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {hasActiveFilters ? 'Try adjusting your filters' : 'Drag tasks here or create a new one'}
                          </p>
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                )}
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {/* Task Form Dialog */}
      <TaskForm
        open={showTaskForm}
        onOpenChange={closeTaskForm}
        task={editingTask}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
      />

      {/* Unified Task View Modal */}
      <TaskViewModal
        open={showViewModal}
        onOpenChange={closeViewModal}
        task={viewingTask}
        onEdit={handleEditFromView}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTask} onOpenChange={() => setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTask?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTask}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
