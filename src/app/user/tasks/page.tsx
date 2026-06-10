'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import {
  Plus,
  ListChecks,
  Search,
  Filter,
  Calendar,
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
  RefreshCw,
  ListTodo,
  Copy,
  UserPlus,
  Settings2,
  GitBranch,
  MessageSquare,
  Star,
  Video,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserAvatar } from '@/components/shared/UserAvatar'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
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
import { cn } from '@/lib/utils'
import { format, isAfter, subDays } from 'date-fns'
import TaskForm from '@/components/tasks/TaskForm'
import TaskViewModal from '@/components/tasks/TaskViewModal'
import DuplicateTaskDialog from '@/components/tasks/DuplicateTaskDialog'
import { BulkTaskActionsDialog } from '@/components/tasks/bulk-task-actions-dialog'

interface Task {
  id: string
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  startDate?: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
  progressPercentage: number
  taskType: 'INDIVIDUAL' | 'TEAM' | 'COLLABORATION' | 'CASCADING'
  parentId?: string | null
  boardId?: string | null
  // Google Calendar fields
  location?: string
  meetingLink?: string
  allDay?: boolean
  recurrence?: string
  reminders?: any
  // Recurring task
  recurringParentId?: string | null
  taskWeight?: number | null
  slaHours?: number | null
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
  subtasks?: Array<{
    id: string
    title: string
    status: string
    progressPercentage: number
  }>
  _count?: {
    subtasks: number
    comments: number
  }
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  name: string
  email: string
  image?: string
}

interface BoardMemberUser {
  id: string
  name: string
  email: string
  image?: string
  role?: string
}

interface KanbanBoard {
  id: string
  name: string
  description?: string
  color: string
  ownerId: string
  owner?: BoardMemberUser
  members: { userId: string; user: BoardMemberUser }[]
  _count: { tasks: number }
  team?: { id: string; name: string } | null
}

const COLUMN_CONFIG = {
  TODO: { title: 'To Do', color: 'bg-gray-100', textColor: 'text-gray-700' },
  IN_PROGRESS: { title: 'In Progress', color: 'bg-blue-100', textColor: 'text-blue-700' },
  IN_REVIEW: { title: 'In Review', color: 'bg-yellow-100', textColor: 'text-yellow-700' },
  COMPLETED: { title: 'Completed', color: 'bg-green-100', textColor: 'text-green-700' },
}

const BOARD_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']

export default function TasksPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Initialize filter state from URL so /user/tasks?q=…&team=…&user=…&type=…&board=…
  // is bookmarkable and survives the back button.
  const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('q') ?? '')
  const [selectedTeam, setSelectedTeam] = useState<string>(() => searchParams.get('team') ?? '')
  const [selectedUser, setSelectedUser] = useState<string>(() => searchParams.get('user') ?? '')
  const [selectedTaskType, setSelectedTaskType] = useState<string>(() => searchParams.get('type') ?? '')
  const [users, setUsers] = useState<User[]>([])
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [quickAddStatus, setQuickAddStatus] = useState<'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | undefined>(undefined)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [duplicatingTask, setDuplicatingTask] = useState<Task | null>(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [pendingDuplicateTask, setPendingDuplicateTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [deleteScope, setDeleteScope] = useState<'single' | 'series'>('single')
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [taskHistory, setTaskHistory] = useState<Task[]>([])

  // Board state
  const [boards, setBoards] = useState<KanbanBoard[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(() => searchParams.get('board') || null) // null = "All Tasks"
  const [showCreateBoard, setShowCreateBoard] = useState(false)
  const [boardPendingDelete, setBoardPendingDelete] = useState<KanbanBoard | null>(null)
  const [deletingBoard, setDeletingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardColor, setNewBoardColor] = useState('#3B82F6')
  const [newBoardDescription, setNewBoardDescription] = useState('')
  const [newBoardMemberIds, setNewBoardMemberIds] = useState<string[]>([])
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [editingBoard, setEditingBoard] = useState<KanbanBoard | null>(null)
  const [editingBoardMemberIds, setEditingBoardMemberIds] = useState<string[]>([])

  // Open task modal from URL query param (e.g., from notification click)
  const openTaskFromUrl = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`)
      if (response.ok) {
        const task = await response.json()
        setViewingTask(task)
        setShowViewModal(true)
      }
    } catch (err) {
      console.error('Error fetching task from URL:', err)
    }
    // Clean up the URL param
    router.replace('/user/tasks', { scroll: false })
  }, [router])

  useEffect(() => {
    const taskId = searchParams.get('taskId')
    if (taskId && session?.user) {
      openTaskFromUrl(taskId)
    }
  }, [searchParams, session, openTaskFromUrl])

  const fetchTasks = async (showLoadingSpinner = true) => {
    if (!session?.user) return

    try {
      // Only show loading spinner on initial load, not background refreshes
      if (showLoadingSpinner) {
        setLoading(true)
      }
      setError(null)
      const params = new URLSearchParams()
      if (selectedTeam) params.append('teamId', selectedTeam)
      if (selectedUser) params.append('userId', selectedUser)
      if (selectedTaskType) params.append('taskType', selectedTaskType)
      if (activeBoardId) params.append('boardId', activeBoardId)

      const response = await fetch(`/api/tasks?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Fetch tasks error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch tasks')
      }

      const data = await response.json()
      setTasks(data.tasks || [])
      setHasLoadedOnce(true)
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      if (showLoadingSpinner) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchTasks()
    // Depend on session?.user?.id (a stable primitive) rather than the full
    // session object — NextAuth's refetchOnWindowFocus changes the session
    // reference on alt-tab even when identity is unchanged. The previous
    // `[session, ...]` deps re-fired this effect, flipping `loading` to true
    // and unmounting the TaskForm dialog (and its in-progress RHF state).
  }, [session?.user?.id, selectedTeam, selectedUser, selectedTaskType, activeBoardId])

  // Refetch tasks when page becomes visible (e.g., navigating back from Calendar)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session?.user) {
        fetchTasks(false) // Background refresh without loading spinner
      }
    }

    const handleFocus = () => {
      if (session?.user) {
        fetchTasks(false) // Background refresh without loading spinner
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [session?.user?.id])

  // Sync filter state to the URL so views are bookmarkable / back-button-friendly.
  // Uses replace (not push) so each keystroke doesn't create a history entry.
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('q', searchTerm)
    if (selectedTeam) params.set('team', selectedTeam)
    if (selectedUser) params.set('user', selectedUser)
    if (selectedTaskType) params.set('type', selectedTaskType)
    if (activeBoardId) params.set('board', activeBoardId)
    const qs = params.toString()
    router.replace(qs ? `/user/tasks?${qs}` : '/user/tasks', { scroll: false })
  }, [searchTerm, selectedTeam, selectedUser, selectedTaskType, activeBoardId, router])

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

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch('/api/boards')
      if (res.ok) {
        const data = await res.json()
        setBoards(data.boards || [])
      }
    } catch (e) {
      console.error('Error fetching boards:', e)
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      fetchUsers()
      fetchBoards()
    }
  }, [session, fetchBoards])

  const createBoard = async () => {
    if (!newBoardName.trim()) return
    setCreatingBoard(true)
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBoardName.trim(),
          description: newBoardDescription || undefined,
          color: newBoardColor,
          memberIds: newBoardMemberIds,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setBoards(prev => [...prev, data.board])
        setActiveBoardId(data.board.id)
        setShowCreateBoard(false)
        setNewBoardName('')
        setNewBoardDescription('')
        setNewBoardColor('#3B82F6')
        setNewBoardMemberIds([])
        toast({ title: `Board "${data.board.name}" created` })
      }
    } catch (e) {
      console.error('Error creating board:', e)
    } finally {
      setCreatingBoard(false)
    }
  }

  const deleteBoard = async (boardId: string): Promise<boolean> => {
    const board = boards.find(b => b.id === boardId)
    if (!board) return false
    try {
      const res = await fetch(`/api/boards/${boardId}`, { method: 'DELETE' })
      if (res.ok) {
        setBoards(prev => prev.filter(b => b.id !== boardId))
        if (activeBoardId === boardId) setActiveBoardId(null)
        toast({ title: `Board "${board.name}" deleted. Tasks moved to All Tasks.` })
        fetchTasks(false)
        return true
      }
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Could not delete board', description: err.error, variant: 'destructive' })
      return false
    } catch (e) {
      console.error('Error deleting board:', e)
      toast({ title: 'Could not delete board', variant: 'destructive' })
      return false
    }
  }

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

    // Only the assigner/creator/admin can move to COMPLETED
    if (newStatus === 'COMPLETED' && !canUserCompleteTask(taskBeingMoved)) {
      toast({
        title: 'Cannot Complete Task',
        description: 'Only the person who assigned this task can mark it as completed. Please move it to "In Review" instead.',
        variant: 'destructive'
      })
      return
    }

    // Reflect the new column in the task's progress so an In Progress / In Review
    // card doesn't sit at 0%. Only bumps the value up — never lowers a higher one.
    const STATUS_PROGRESS_FLOOR: Record<string, number> = {
      TODO: 0, IN_PROGRESS: 10, IN_REVIEW: 90, COMPLETED: 100,
    }
    const floor = STATUS_PROGRESS_FLOOR[newStatus] ?? 0
    const newProgress = Math.max(taskBeingMoved.progressPercentage || 0, floor)

    // Optimistically update the UI
    setTasks(prev =>
      prev.map(task =>
        task.id === draggableId
          ? { ...task, status: newStatus, progressPercentage: newProgress }
          : task
      )
    )

    try {
      const response = await fetch(`/api/tasks/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, progressPercentage: newProgress })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update task status`)
      }

      // Get the updated task data from the response
      const responseData = await response.json()
      const { updatedParentTask, ...updatedTask } = responseData

      // Update the task with the server response to ensure consistency
      // Also update parent task if a subtask was moved
      setTasks(prev =>
        prev.map(task => {
          if (task.id === draggableId) return updatedTask
          if (updatedParentTask && task.id === updatedParentTask.id) return updatedParentTask
          return task
        })
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
      case 'CASCADING': return <GitBranch className="h-3 w-3" />
      default: return <User className="h-3 w-3" />
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage < 25) return 'bg-red-500'
    if (percentage < 50) return 'bg-orange-500'
    if (percentage < 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTasksByStatus = (status: Task['status']) => {
    const query = searchTerm.toLowerCase().trim()
    return tasks.filter(task => {
      // Filter by status
      if (task.status !== status) return false

      // Filter by search term (local filtering)
      if (query) {
        const titleMatch = task.title.toLowerCase().includes(query)
        const descMatch = task.description?.toLowerCase().includes(query)
        const assigneeMatch = task.assignee?.name?.toLowerCase().includes(query) ||
                             task.assignee?.email?.toLowerCase().includes(query)
        return titleMatch || descMatch || assigneeMatch
      }

      return true
    })
  }

  // Distinct badge styling per task type so Cascading/Team/Collaboration read at a glance.
  const getTaskTypeBadgeClass = (taskType: string): string => {
    switch (taskType) {
      case 'CASCADING': return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      case 'TEAM': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'COLLABORATION': return 'bg-teal-50 text-teal-700 border-teal-200'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  const getTaskTypeLabel = (taskType: string): string =>
    taskType.charAt(0) + taskType.slice(1).toLowerCase()

  const getRecurrenceLabel = (recurrence?: string): string => {
    if (!recurrence) return 'Repeats'
    const upper = recurrence.toUpperCase()
    if (upper.includes('FREQ=DAILY')) return 'Daily'
    if (upper.includes('FREQ=WEEKLY')) return 'Weekly'
    if (upper.includes('FREQ=MONTHLY')) return 'Monthly'
    return 'Repeats'
  }

  const handleCreateTask = async (taskData: any) => {
    try {
      // Extract subtasks from data
      const { subtasks, ...mainTaskData } = taskData
      // Inject active board id
      if (activeBoardId) {
        mainTaskData.boardId = activeBoardId
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mainTaskData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Create task error response:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create task`)
      }

      const newTask = await response.json()

      // Recurring tasks return { template, firstInstance }; regular tasks return the task directly
      const parentTaskId = newTask.id ?? newTask.firstInstance?.id

      // Create subtasks if any
      if (subtasks && subtasks.length > 0 && parentTaskId) {
        const subtaskPromises = subtasks.map((subtask: { title: string; assigneeId: string }) =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: subtask.title,
              parentId: parentTaskId,
              priority: mainTaskData.priority,
              taskType: 'INDIVIDUAL',
              assigneeId: subtask.assigneeId,
            }),
          })
        )
        await Promise.all(subtaskPromises)
      }

      // Refresh tasks from server to ensure we get the latest data
      await fetchTasks()

      // Refresh board counts
      fetchBoards()

      const subtaskCount = subtasks?.length || 0
      toast({
        title: 'Success',
        description: subtaskCount > 0
          ? `Task created with ${subtaskCount} subtask${subtaskCount !== 1 ? 's' : ''}`
          : 'Task created successfully'
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

      await response.json()

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
      const url = deleteScope === 'series' && deletingTask.recurringParentId
        ? `/api/tasks/${deletingTask.id}?scope=series`
        : `/api/tasks/${deletingTask.id}`

      const response = await fetch(url, { method: 'DELETE' })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Delete task error response:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to delete task`)
      }


      // Refresh tasks to ensure we have the latest data
      await fetchTasks()
      fetchBoards()

      setDeletingTask(null)
      setDeleteScope('single')
      toast({
        title: 'Success',
        description: deleteScope === 'series' ? 'Recurring series deleted' : 'Task deleted successfully'
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

  // Toggle a subtask between TODO and COMPLETED inline from the parent card
  const handleToggleSubtask = async (e: React.MouseEvent, subtaskId: string, currentStatus: string) => {
    e.stopPropagation()
    const newStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED'
    try {
      await fetch(`/api/tasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, progressPercentage: newStatus === 'COMPLETED' ? 100 : 0 }),
      })
      await fetchTasks(false)
    } catch {
      // silent — next refresh will correct the state
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

  // Helper function to check if user can change task status (move to IN_PROGRESS or IN_REVIEW)
  const canUserChangeTaskStatus = (task: Task) => {
    // Task creator can always change status
    if (task.creator?.id === session?.user?.id) return true

    // Admin can change any task status
    if (session?.user?.role === 'ADMIN') return true

    // Leaders can change status for tasks in their teams
    if (session?.user?.role === 'LEADER') return true

    // Assignee can move to IN_PROGRESS and IN_REVIEW (not COMPLETED - checked separately)
    if (task.assignee?.id === session?.user?.id) {
      const isTeamMember = task.teamMembers?.some(tm => tm.userId === session?.user?.id)
      const isCollaborator = task.collaborators?.some(c => c.userId === session?.user?.id)
      return !isTeamMember && !isCollaborator
    }

    return false
  }

  // Helper function to check if user can mark task as COMPLETED
  // Only the assigner (assignedBy), creator, or admin can complete a task
  const canUserCompleteTask = (task: Task) => {
    if (session?.user?.role === 'ADMIN') return true
    if (task.creator?.id === session?.user?.id) return true
    if (task.assignedBy?.id === session?.user?.id) return true
    return false
  }

  // Helper function to open view modal for all users
  const handleTaskClick = (task: Task) => {
    setViewingTask(task)
    setShowViewModal(true)
  }

  // Navigate to a subtask's detail by fetching and swapping the modal content
  const handleSubtaskClick = async (subtaskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${subtaskId}`)
      if (response.ok) {
        const subtask = await response.json()
        // Push current task onto history before navigating into subtask
        if (viewingTask) {
          setTaskHistory(prev => [...prev, viewingTask])
        }
        setViewingTask(subtask)
      }
    } catch (err) {
      console.error('Error fetching subtask:', err)
    }
  }

  // Go back to the previous task in the navigation history
  const handleGoBack = () => {
    setTaskHistory(prev => {
      const history = [...prev]
      const parent = history.pop()
      if (parent) setViewingTask(parent)
      return history
    })
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

  const openDuplicateForm = (task: Task) => {
    setPendingDuplicateTask(task)
    setShowDuplicateDialog(true)
  }

  const handleDuplicateConfirm = (filteredTask: any) => {
    setDuplicatingTask(filteredTask)
    setEditingTask(null)
    setShowTaskForm(true)
    setShowDuplicateDialog(false)
    setPendingDuplicateTask(null)
  }

  const closeTaskForm = () => {
    setShowTaskForm(false)
    setEditingTask(null)
    setDuplicatingTask(null)
    setQuickAddStatus(undefined)
  }

  const closeViewModal = () => {
    setShowViewModal(false)
    setViewingTask(null)
    setTaskHistory([])
    // Refresh tasks in background to reflect any changes made in the modal
    fetchTasks(false)
  }

  // Only block the page on the very first load. After that, refetches happen
  // in the background so an open TaskForm / TaskViewModal stays mounted and
  // keeps its in-progress data when the user alt-tabs back.
  if (loading && !hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error && !hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  const activeBoard = activeBoardId ? boards.find(b => b.id === activeBoardId) : undefined
  const boardContext = activeBoard
    ? { boardId: activeBoard.id, boardName: activeBoard.name, teamId: activeBoard.team?.id ?? null }
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and collaborations
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setBulkDialogOpen(true)}>
            <ListChecks className="h-4 w-4 mr-2" />
            Bulk
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={() => setShowTaskForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Board Tab Strip */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-200">
        {/* All Tasks tab */}
        <button
          onClick={() => setActiveBoardId(null)}
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
            activeBoardId === null
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          )}
        >
          <ListTodo className="h-4 w-4" />
          All Tasks
        </button>

        {/* Board tabs */}
        {boards.map(board => {
          const isOwner = board.ownerId === session?.user?.id
          const isTeamBoard = !!board.team
          const memberCount = board.members?.length ?? 0
          return (
            <div key={board.id} className="relative group flex items-center shrink-0">
              <button
                onClick={() => setActiveBoardId(board.id)}
                className={cn(
                  'flex items-center gap-1.5 pl-3 pr-8 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                  activeBoardId === board.id
                    ? 'text-gray-900 bg-gray-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                )}
                style={activeBoardId === board.id ? { borderBottomColor: board.color } : {}}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: board.color }} />
                {board.name}
                <span className="ml-1 text-xs text-gray-400 font-normal">({board._count.tasks})</span>
                {/* Member avatars */}
                {memberCount > 0 && (
                  <div className="flex -space-x-1 ml-1">
                    {board.members.slice(0, 3).map(m => (
                      <Avatar key={m.userId} className="h-4 w-4 border border-white ring-0">
                        <AvatarImage src={m.user.image} />
                        <AvatarFallback className="text-[8px]">
                          {m.user.name?.[0] ?? m.user.email[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {memberCount > 3 && (
                      <span className="h-4 w-4 rounded-full bg-gray-200 border border-white text-[8px] flex items-center justify-center text-gray-600">
                        +{memberCount - 3}
                      </span>
                    )}
                  </div>
                )}
                {/* Team or shared badge */}
                {isTeamBoard ? (
                  <span className="ml-1 text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium leading-none">team</span>
                ) : !isOwner ? (
                  <span className="ml-1 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium leading-none">shared</span>
                ) : null}
              </button>
              {/* Team boards are managed on the team page; personal boards keep owner edit/delete */}
              {isTeamBoard ? (
                <Link
                  href={`/user/teams/${board.team!.id}`}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-gray-200 transition-all"
                  title="Manage team"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings2 className="h-3.5 w-3.5 text-gray-500" />
                </Link>
              ) : isOwner ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-gray-200 transition-all">
                      <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => {
                      setEditingBoard(board)
                      setEditingBoardMemberIds(board.members.map(m => m.userId))
                    }}>
                      <Settings2 className="h-4 w-4 mr-2" /> Edit Board
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => setBoardPendingDelete(board)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          )
        })}

        {/* New Board button — personal board (team boards are created from the Teams page) */}
        <button
          onClick={() => setShowCreateBoard(true)}
          title="Create a personal board (just for you, or share it with people you pick). To create a team with its own shared board, use the Teams page."
          className="shrink-0 flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap ml-1"
        >
          <Plus className="h-4 w-4" />
          New personal board
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
        <div className="relative w-full sm:max-w-md sm:flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title, description, or users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <SearchableSelect
          options={users}
          value={selectedUser}
          onValueChange={setSelectedUser}
          placeholder="Filter by user"
          allLabel="All users"
          maxDisplayed={10}
          className="w-full sm:w-[200px]"
        />

        <Select value={selectedTaskType || "all"} onValueChange={(value) => setSelectedTaskType(value === "all" ? "" : value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by task type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All task types</SelectItem>
            <SelectItem value="INDIVIDUAL">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Individual</span>
              </div>
            </SelectItem>
            <SelectItem value="TEAM">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Team</span>
              </div>
            </SelectItem>
            <SelectItem value="COLLABORATION">
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4" />
                <span>Collaboration</span>
              </div>
            </SelectItem>
            <SelectItem value="CASCADING">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span>Cascading</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {(selectedUser || selectedTaskType || searchTerm) && (
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => {
              setSelectedUser('')
              setSelectedTaskType('')
              setSearchTerm('')
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 min-h-[700px]">
          {Object.entries(COLUMN_CONFIG).map(([status, config]) => {
            const columnTasks = getTasksByStatus(status as Task['status'])

            return (
              <div key={status} className="min-w-0 space-y-4">
                <div className={`p-3 rounded-lg ${config.color} shadow-sm`}>
                  <h3 className={`font-semibold ${config.textColor} flex items-center text-sm`}>
                    <span>{config.title}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">{columnTasks.length}</Badge>
                    <button
                      type="button"
                      title={`Add task to ${config.title}`}
                      onClick={() => { setQuickAddStatus(status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'); setShowTaskForm(true) }}
                      className="ml-auto p-1 rounded hover:bg-black/10 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </h3>
                </div>

                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[550px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-muted/20 border-2 border-dashed border-primary/30' : ''
                      }`}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canUserChangeTaskStatus(task)}>
                          {(provided, snapshot) => {
                            const canDrag = canUserChangeTaskStatus(task)
                            return (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...(canDrag ? provided.dragHandleProps : {})}
                              className={`relative cursor-pointer transition-all duration-200 min-h-[160px] ${
                                canDrag
                                  ? 'hover:cursor-grab active:cursor-grabbing'
                                  : 'cursor-default'
                              } ${
                                snapshot.isDragging
                                  ? 'shadow-xl rotate-2 scale-105 z-50'
                                  : canDrag ? 'hover:shadow-md hover:-translate-y-1 shadow-sm' : 'shadow-sm'
                              } bg-white border border-gray-200 rounded-lg ${
                                !canDrag ? 'opacity-90' : ''
                              }`}
                              onClick={(e) => {
                                // Only open edit if not dragging and clicked on card content
                                if (!snapshot.isDragging) {
                                  handleTaskClick(task)
                                }
                              }}
                            >
                              <CardContent className="p-3.5">
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

                                {/* Header: title + actions */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="font-semibold text-sm leading-snug text-gray-900 line-clamp-2 flex-1 min-w-0">
                                    {task.title}
                                  </h4>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 flex-shrink-0 -mr-1 -mt-0.5"
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

                                      {/* Duplicate option - available to all */}
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation()
                                        openDuplicateForm(task)
                                      }}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Duplicate
                                      </DropdownMenuItem>

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

                                {/* Meta badges: type, recurring, cascading, relationship, team */}
                                <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 h-5 gap-1 font-medium ${getTaskTypeBadgeClass(task.taskType)}`}>
                                    {getTaskTypeIcon(task.taskType)}
                                    {getTaskTypeLabel(task.taskType)}
                                  </Badge>
                                  {(task.recurrence || task.recurringParentId) && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 gap-1 font-medium bg-blue-50 text-blue-700 border-blue-200">
                                      <RefreshCw className="h-3 w-3" />
                                      {getRecurrenceLabel(task.recurrence)}
                                    </Badge>
                                  )}
                                  {task.parentId && (
                                    <Badge className="text-[10px] px-1.5 h-5 bg-violet-500 text-white border-violet-600">
                                      Subtask
                                    </Badge>
                                  )}
                                  {!isTaskCreatedByUser(task) && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                                      Assigned
                                    </Badge>
                                  )}
                                  {task.team && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5 max-w-[120px] truncate">
                                      {task.team.name}
                                    </Badge>
                                  )}
                                </div>

                                {/* Description */}
                                {task.description && (
                                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2.5">
                                    {task.description}
                                  </p>
                                )}

                                {/* Progress Section */}
                                <div className="mb-2.5">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] font-medium text-gray-500">Progress</span>
                                    <span className="text-[11px] font-semibold text-gray-700">{task.progressPercentage || 0}%</span>
                                  </div>
                                  <Progress
                                    value={task.progressPercentage || 0}
                                    className="h-1.5 bg-gray-200"
                                  />
                                </div>

                                {/* Meta footer: priority, due date, subtasks, comments, weight, SLA, meeting */}
                                {(() => {
                                  const _sot = new Date(); _sot.setHours(0, 0, 0, 0)
                                  const overdue = task.dueDate && new Date(task.dueDate) < _sot && task.status !== 'COMPLETED'
                                  return (
                                    <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap text-[11px] text-gray-500 mb-2.5">
                                      <span className="inline-flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                                        <span className="font-medium text-gray-700 capitalize">{task.priority.toLowerCase()}</span>
                                      </span>
                                      {task.dueDate && (
                                        <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                          <Clock className="h-3 w-3" />
                                          {format(new Date(task.dueDate), 'MMM dd')}
                                          {overdue && (
                                            <Badge className="text-[10px] px-1 py-0 h-4 bg-red-500 text-white">OVERDUE</Badge>
                                          )}
                                        </span>
                                      )}
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <span className="inline-flex items-center gap-1">
                                          <ListTodo className="h-3 w-3" />
                                          {task.subtasks.filter(s => s.status === 'COMPLETED').length}/{task.subtasks.length}
                                        </span>
                                      )}
                                      {(task._count?.comments ?? 0) > 0 && (
                                        <span className="inline-flex items-center gap-1">
                                          <MessageSquare className="h-3 w-3" />
                                          {task._count!.comments}
                                        </span>
                                      )}
                                      {task.taskWeight != null && (
                                        <span className="inline-flex items-center gap-1" title="Importance/weight">
                                          <Star className="h-3 w-3" />
                                          {task.taskWeight}
                                        </span>
                                      )}
                                      {task.slaHours != null && (
                                        <span className="inline-flex items-center gap-1" title="SLA target">
                                          <Clock className="h-3 w-3" />
                                          {task.slaHours}h
                                        </span>
                                      )}
                                      {task.meetingLink && (
                                        <a
                                          href={task.meetingLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          title="Join meeting"
                                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                                        >
                                          <Video className="h-3 w-3" />
                                        </a>
                                      )}
                                    </div>
                                  )
                                })()}

                                {/* Assignees and Collaborators */}
                                <div className="space-y-1.5">
                                  {task.assignee && (
                                    <div className="flex items-center gap-2">
                                      <UserAvatar
                                        userId={task.assignee.id}
                                        image={task.assignee.image}
                                        name={task.assignee.name}
                                        email={task.assignee.email}
                                        className="h-5 w-5"
                                        fallbackClassName="text-xs"
                                      />
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
                                          <UserAvatar
                                            key={member.userId}
                                            userId={member.user.id}
                                            image={member.user.image}
                                            name={member.user.name}
                                            email={member.user.email}
                                            className="h-4 w-4 border border-background"
                                            fallbackClassName="text-xs"
                                          />
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
                                          <UserAvatar
                                            key={collaborator.userId}
                                            userId={collaborator.user.id}
                                            image={collaborator.user.image}
                                            name={collaborator.user.name}
                                            email={collaborator.user.email}
                                            className="h-4 w-4 border border-background"
                                            fallbackClassName="text-xs"
                                          />
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

                      {provided.placeholder}

                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-300 select-none pointer-events-none">
                          <ListTodo className="h-8 w-8 mb-2" />
                          <p className="text-xs font-medium">No tasks</p>
                          <p className="text-[10px]">Drag here or use +</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {/* Duplicate Field Selector Dialog */}
      {pendingDuplicateTask && (
        <DuplicateTaskDialog
          open={showDuplicateDialog}
          onOpenChange={(open) => { setShowDuplicateDialog(open); if (!open) setPendingDuplicateTask(null) }}
          sourceTask={pendingDuplicateTask}
          onConfirm={handleDuplicateConfirm}
        />
      )}

      {/* Task Form Dialog */}
      <TaskForm
        open={showTaskForm}
        onOpenChange={closeTaskForm}
        task={editingTask}
        duplicateFrom={duplicatingTask}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        boardContext={boardContext}
        initialStatus={quickAddStatus}
      />

      {/* Type-to-confirm board deletion */}
      <ConfirmDeleteDialog
        open={!!boardPendingDelete}
        onOpenChange={(o) => { if (!o) setBoardPendingDelete(null) }}
        title="Delete board?"
        description={`This deletes the board "${boardPendingDelete?.name ?? ''}". Its tasks are kept and moved to All Tasks.`}
        confirmationText={boardPendingDelete?.name ?? ''}
        confirmLabel="Delete board"
        loading={deletingBoard}
        onConfirm={async () => {
          if (!boardPendingDelete) return
          setDeletingBoard(true)
          const ok = await deleteBoard(boardPendingDelete.id)
          setDeletingBoard(false)
          if (ok) setBoardPendingDelete(null)
        }}
      />

      <BulkTaskActionsDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        tasks={tasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee,
        }))}
        onCompleted={fetchTasks}
      />

      {/* Unified Task View Modal */}
      <TaskViewModal
        open={showViewModal}
        onOpenChange={closeViewModal}
        task={viewingTask}
        onEdit={handleEditFromView}
        onDuplicate={(task) => { setShowViewModal(false); openDuplicateForm(task as Task) }}
        onTaskUpdate={() => fetchTasks(false)}
        onSubtaskClick={handleSubtaskClick}
        onBack={taskHistory.length > 0 ? handleGoBack : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTask} onOpenChange={(open) => { if (!open) { setDeletingTask(null); setDeleteScope('single') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingTask?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingTask?.recurringParentId && (
            <div className="px-1 space-y-2">
              <p className="text-sm font-medium text-gray-700">This is a recurring task. What would you like to delete?</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="deleteScope" value="single" checked={deleteScope === 'single'} onChange={() => setDeleteScope('single')} />
                  <span className="text-sm">This task only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="deleteScope" value="series" checked={deleteScope === 'series'} onChange={() => setDeleteScope('series')} />
                  <span className="text-sm">Entire recurring series (all instances)</span>
                </label>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteScope === 'series' ? 'Delete Series' : 'Delete Task'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Board Dialog */}
      <Dialog open={showCreateBoard} onOpenChange={(open) => {
        setShowCreateBoard(open)
        if (!open) { setNewBoardName(''); setNewBoardDescription(''); setNewBoardColor('#3B82F6'); setNewBoardMemberIds([]) }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Kanban Board</DialogTitle>
            <DialogDescription>Give your board a name, color, and invite members who can see it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Board Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Team A, Marketing Sprint, Q2 Goals"
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createBoard() }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
              <Input
                placeholder="What is this board for?"
                value={newBoardDescription}
                onChange={e => setNewBoardDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {BOARD_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewBoardColor(color)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
                      newBoardColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-gray-500" />
                Members <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </Label>
              <SearchableMultiSelect
                options={users.filter(u => u.id !== session?.user?.id)}
                selected={users.filter(u => newBoardMemberIds.includes(u.id))}
                onSelect={opt => setNewBoardMemberIds(prev => [...prev, opt.id])}
                onRemove={id => setNewBoardMemberIds(prev => prev.filter(x => x !== id))}
                onClear={() => setNewBoardMemberIds([])}
                placeholder="Search members or leaders to add..."
              />
              {newBoardMemberIds.length > 0 && (
                <p className="text-xs text-gray-500">{newBoardMemberIds.length} person{newBoardMemberIds.length > 1 ? 's' : ''} will be able to view this board</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateBoard(false)}>Cancel</Button>
            <Button onClick={createBoard} disabled={!newBoardName.trim() || creatingBoard}>
              {creatingBoard ? 'Creating...' : 'Create Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Board Dialog */}
      {editingBoard && (
        <Dialog open={!!editingBoard} onOpenChange={(open) => { if (!open) { setEditingBoard(null); setEditingBoardMemberIds([]) } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Board</DialogTitle>
              <DialogDescription>Update the board name, color, and manage who can see it.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Board Name</Label>
                <Input
                  value={editingBoard.name}
                  onChange={e => setEditingBoard({ ...editingBoard, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {BOARD_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingBoard({ ...editingBoard, color })}
                      className={cn(
                        'w-7 h-7 rounded-full border-2 transition-transform',
                        editingBoard.color === color ? 'border-gray-800 scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-gray-500" />
                  Members
                </Label>
                <SearchableMultiSelect
                  options={users.filter(u => u.id !== session?.user?.id)}
                  selected={users.filter(u => editingBoardMemberIds.includes(u.id))}
                  onSelect={opt => setEditingBoardMemberIds(prev => [...prev, opt.id])}
                  onRemove={id => setEditingBoardMemberIds(prev => prev.filter(x => x !== id))}
                  onClear={() => setEditingBoardMemberIds([])}
                  placeholder="Search members or leaders..."
                />
                {editingBoardMemberIds.length > 0 ? (
                  <p className="text-xs text-gray-500">{editingBoardMemberIds.length} person{editingBoardMemberIds.length > 1 ? 's' : ''} can view this board</p>
                ) : (
                  <p className="text-xs text-gray-400">Only you can see this board</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingBoard(null); setEditingBoardMemberIds([]) }}>Cancel</Button>
              <Button onClick={async () => {
                const res = await fetch(`/api/boards/${editingBoard.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: editingBoard.name,
                    color: editingBoard.color,
                    memberIds: editingBoardMemberIds,
                  }),
                })
                if (res.ok) {
                  const data = await res.json()
                  setBoards(prev => prev.map(b => b.id === editingBoard.id ? { ...b, ...data.board } : b))
                  setEditingBoard(null)
                  setEditingBoardMemberIds([])
                  toast({ title: 'Board updated' })
                }
              }}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
