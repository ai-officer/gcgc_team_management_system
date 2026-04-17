'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckSquare,
  MoreHorizontal,
  Target,
  User,
  Users,
  Trash2,
  Activity,
  Award,
  AlertTriangle,
  BarChart3,
  ListTodo,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
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
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import TaskForm from '@/components/tasks/TaskForm'
import TaskViewModal from '@/components/tasks/TaskViewModal'

interface TeamMember {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  image?: string
  role: string
  _count?: {
    assignedTasks: number
  }
}

interface Task {
  id: string
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  startDate?: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
  progressPercentage?: number
  taskType?: 'INDIVIDUAL' | 'TEAM' | 'COLLABORATION'
  assignee?: {
    id: string
    name: string
    email: string
    image?: string
  }
  team?: {
    id: string
    name: string
  } | null
  createdAt: string
  updatedAt?: string
}

interface Team {
  id: string
  name: string
}

interface MemberWithStats {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name: string
  image?: string
  role: string
  hierarchyLevel?: number
  contactNumber?: string
  positionTitle?: string
  isActive: boolean
  createdAt: string
  reportsToId: string
  taskCounts: {
    todo: number
    inProgress: number
    inReview: number
    total: number
  }
  priorityCounts: {
    urgent: number
    high: number
    medium: number
    low: number
  }
  overdueTasks: number
  availabilityScore: number
  workloadPercentage: number
  assignedTasks: Task[]
}

type ViewMode = 'list' | 'kanban'
type StatusFilter = 'all' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'

export default function MemberManagementPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false)
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [memberSuggestions, setMemberSuggestions] = useState<MemberWithStats[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  // Redirect if not a leader
  useEffect(() => {
    if (session?.user?.role !== 'LEADER') {
      window.location.href = '/user/dashboard'
      return
    }
  }, [session])

  // Fetch member suggestions
  // Debounce search term to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchMemberSuggestions = async () => {
    if (!session?.user || session.user.role !== 'LEADER') return

    try {
      setSuggestionsLoading(true)
      const response = await fetch('/api/user/member-suggestions')

      if (!response.ok) {
        throw new Error('Failed to fetch member suggestions')
      }

      const data = await response.json()
      setMemberSuggestions(data.members || [])
    } catch (err) {
      console.error('Error fetching member suggestions:', err)
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const fetchData = async () => {
    if (!session?.user || session.user.role !== 'LEADER') return

    try {
      // First fetch team members to get their IDs
      const [membersResponse, teamsResponse] = await Promise.all([
        fetch('/api/user/team-members'),
        fetch('/api/teams'),
      ])

      if (!membersResponse.ok || !teamsResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [membersData, teamsData] = await Promise.all([
        membersResponse.json(),
        teamsResponse.json(),
      ])

      const members = membersData.members || []
      setTeamMembers(members)
      setTeams(teamsData.teams || [])

      // Now fetch tasks - if a specific member is selected, filter by that member
      // Otherwise fetch all tasks (the API returns tasks the leader can see)
      const taskParams = new URLSearchParams()
      taskParams.append('limit', '100') // Get more tasks
      if (selectedMember) {
        taskParams.append('assigneeId', selectedMember)
      }

      const tasksResponse = await fetch('/api/tasks?' + taskParams.toString())
      if (!tasksResponse.ok) {
        throw new Error('Failed to fetch tasks')
      }
      const tasksData = await tasksResponse.json()

      // Filter tasks to only include those assigned to team members (when viewing all)
      let filteredTasks = tasksData.tasks || []
      if (!selectedMember && members.length > 0) {
        const memberIds = members.map((m: any) => m.id)
        filteredTasks = filteredTasks.filter((task: any) =>
          task.assigneeId && memberIds.includes(task.assigneeId)
        )
      }

      setTasks(filteredTasks)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [session, selectedMember])

  useEffect(() => {
    if (session?.user?.role === 'LEADER') {
      fetchMemberSuggestions()
    }
  }, [session])

  const handleDeleteTask = async () => {
    if (!deletingTask) return

    try {
      const response = await fetch(`/api/tasks/${deletingTask.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to delete task`)
      }

      await fetchMemberSuggestions()
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

  const canDeleteTask = (task: Task) => {
    return session?.user?.role === 'LEADER' || session?.user?.role === 'ADMIN'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'LOW': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-300'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'TODO': return 'bg-gray-100 text-gray-700 border-gray-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const filteredMembers = teamMembers.filter(member =>
    !debouncedSearchTerm ||
    member.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  )

  const filteredTasks = tasks
    .filter(task => {
      if (selectedMember) {
        return task.assignee?.id === selectedMember
      }
      return task.assignee?.id !== session?.user?.id
    })
    .filter(task => {
      if (statusFilter === 'all') return true
      return task.status === statusFilter
    })

  // Calculate team stats
  const teamStats = {
    totalMembers: teamMembers.length,
    totalTasks: filteredTasks.length,
    todoTasks: filteredTasks.filter(t => t.status === 'TODO').length,
    inProgressTasks: filteredTasks.filter(t => t.status === 'IN_PROGRESS').length,
    inReviewTasks: filteredTasks.filter(t => t.status === 'IN_REVIEW').length,
    completedTasks: filteredTasks.filter(t => t.status === 'COMPLETED').length,
    urgentTasks: filteredTasks.filter(t => t.priority === 'URGENT').length,
    overdueTasks: filteredTasks.filter(t => { const sot = new Date(); sot.setHours(0,0,0,0); return t.dueDate && new Date(t.dueDate) < sot && t.status !== 'COMPLETED' }).length
  }

  // Kanban board columns
  const kanbanColumns = [
    { id: 'TODO', title: 'To Do', icon: ListTodo, color: 'border-gray-300' },
    { id: 'IN_PROGRESS', title: 'In Progress', icon: Activity, color: 'border-blue-300' },
    { id: 'IN_REVIEW', title: 'In Review', icon: Eye, color: 'border-yellow-300' },
    { id: 'COMPLETED', title: 'Completed', icon: CheckSquare, color: 'border-green-300' }
  ]

  if (session?.user?.role !== 'LEADER') {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading member data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load data</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Member Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Assign tasks, track progress, and optimize team workload</p>
        </div>
        <Button onClick={() => setIsCreateTaskDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Assign Task
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Tasks</span>
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{teamStats.totalTasks}</div>
            <p className="text-xs text-gray-500 mt-1">{teamStats.totalMembers} members</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">In Progress</span>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{teamStats.inProgressTasks}</div>
            <p className="text-xs text-gray-500 mt-1">Active work items</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-xl shadow-sm border border-gray-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Completed</span>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Award className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{teamStats.completedTasks}</div>
            <p className="text-xs text-gray-500 mt-1">Tasks finished</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-white rounded-xl shadow-sm border",
          teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "border-red-100" : "border-gray-100"
        )}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgent & Overdue</span>
              <div className={cn("p-2 rounded-lg", teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "bg-red-50" : "bg-gray-50")}>
                <AlertTriangle className={cn("h-4 w-4", teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "text-red-500" : "text-gray-400")} />
              </div>
            </div>
            <div className={cn("text-3xl font-bold", teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "text-red-600" : "text-gray-400")}>
              {teamStats.urgentTasks + teamStats.overdueTasks}
            </div>
            <p className="text-xs text-gray-500 mt-1">{teamStats.urgentTasks} urgent · {teamStats.overdueTasks} overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content — equal-height flex row */}
      <div className="flex gap-4 items-stretch min-h-[600px]">

        {/* ── Team Members Sidebar ── */}
        <div className="w-72 shrink-0 flex flex-col">
          <Card className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Team Members</h2>
                    <p className="text-xs text-gray-400">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 border-gray-200 rounded-lg bg-gray-50 focus:bg-white text-sm"
                />
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {/* All Members */}
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  !selectedMember ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                )}
                onClick={() => setSelectedMember('')}
              >
                <div className={cn("p-2 rounded-lg shrink-0", !selectedMember ? 'bg-blue-100' : 'bg-gray-100')}>
                  <Users className={cn("h-4 w-4", !selectedMember ? 'text-blue-600' : 'text-gray-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold", !selectedMember ? 'text-blue-900' : 'text-gray-700')}>All Members</p>
                  <p className="text-xs text-gray-400">{teamStats.totalTasks} total tasks</p>
                </div>
              </button>

              {filteredMembers.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">
                  {searchTerm ? 'No members match your search' : 'No members found'}
                </p>
              ) : (
                filteredMembers.map((member) => {
                  const stats = memberSuggestions.find(s => s.id === member.id)
                  const workload = stats?.workloadPercentage ?? 0
                  const total = stats?.taskCounts?.total ?? member._count?.assignedTasks ?? 0
                  const isSelected = selectedMember === member.id
                  return (
                    <button
                      key={member.id}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border",
                        isSelected ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                      )}
                      onClick={() => setSelectedMember(isSelected ? '' : member.id)}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={member.image} />
                        <AvatarFallback className={cn("text-xs font-bold", isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600")}>
                          {member.name ? member.name.split(' ').map(n => n[0]).join('') : member.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate", isSelected ? "text-blue-900" : "text-gray-800")}>
                          {member.name || 'Unnamed User'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", workload >= 80 ? "bg-red-400" : workload >= 50 ? "bg-amber-400" : "bg-green-400")}
                              style={{ width: `${Math.min(workload, 100)}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-medium shrink-0", workload >= 80 ? "text-red-500" : workload >= 50 ? "text-amber-500" : "text-green-600")}>
                            {total} task{total !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* ── Task Panel ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Card className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {selectedMember
                      ? `${teamMembers.find(m => m.id === selectedMember)?.name || 'Member'}'s Tasks`
                      : 'All Team Tasks'
                    }
                  </h2>
                  <p className="text-xs text-gray-400">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                    {statusFilter !== 'all' ? ` · filtered by ${statusFilter.replace('_', ' ')}` : ' · all statuses'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                  <SelectTrigger className="w-[160px] border-gray-200 rounded-lg bg-gray-50 text-sm">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-gray-500" />
                      <SelectValue placeholder="All Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-lg border-gray-200 bg-gray-50">
                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-lg">
                    <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wide">View Mode</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setViewMode('list')}>
                      <ListTodo className="h-4 w-4 mr-2" /> List View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode('kanban')}>
                      <BarChart3 className="h-4 w-4 mr-2" /> Kanban Board
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Task content */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50/40">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                  <CheckSquare className="h-14 w-14 text-gray-200 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-500 mb-1">No tasks found</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    {selectedMember
                      ? 'This member has no assigned tasks yet'
                      : statusFilter !== 'all'
                      ? `No tasks with status "${statusFilter.replace('_', ' ')}"`
                      : 'No tasks have been assigned to team members yet'
                    }
                  </p>
                  <Button onClick={() => setIsCreateTaskDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {selectedMember ? 'Assign First Task' : 'Create First Task'}
                  </Button>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-3">
                  {filteredTasks.map((task) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) && task.status !== 'COMPLETED'
                    const progress = task.progressPercentage ?? 0
                    return (
                      <div
                        key={task.id}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => setViewingTask(task)}
                      >
                        {/* Status accent bar */}
                        <div className={cn(
                          "h-1 rounded-t-xl",
                          task.status === 'COMPLETED' ? "bg-green-400" :
                          task.status === 'IN_PROGRESS' ? "bg-blue-400" :
                          task.status === 'IN_REVIEW' ? "bg-amber-400" : "bg-gray-200"
                        )} />

                        <div className="p-5">
                          {/* Row 1: Title + menu */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold text-gray-900 leading-snug">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingTask(task) }}>
                                  <Eye className="h-4 w-4 mr-2" /> View Details
                                </DropdownMenuItem>
                                {canDeleteTask(task) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={(e) => { e.stopPropagation(); setDeletingTask(task) }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Row 2: Badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <Badge className={cn("text-xs border font-medium", getPriorityColor(task.priority))}>
                              {task.priority}
                            </Badge>
                            <Badge className={cn("text-xs border font-medium", getStatusColor(task.status))}>
                              {task.status.replace(/_/g, ' ')}
                            </Badge>
                            {task.taskType && (
                              <Badge variant="outline" className="text-xs text-gray-600 border-gray-200">
                                {task.taskType === 'INDIVIDUAL' ? '👤 Individual' : task.taskType === 'TEAM' ? '👥 Team' : '🤝 Collaboration'}
                              </Badge>
                            )}
                            {task.team && (
                              <Badge variant="outline" className="text-xs text-gray-600 border-gray-200">
                                <Users className="h-3 w-3 mr-1" />{task.team.name}
                              </Badge>
                            )}
                            {isOverdue && (
                              <Badge className="text-xs bg-red-50 text-red-600 border border-red-200">
                                <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
                              </Badge>
                            )}
                          </div>

                          {/* Row 3: Progress bar */}
                          {progress > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>Progress</span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", progress >= 75 ? "bg-green-500" : progress >= 40 ? "bg-blue-500" : "bg-amber-500")}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Row 4: Due date + assignee */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              {task.dueDate ? (
                                <span className={cn("flex items-center gap-1", isOverdue ? "text-red-500 font-medium" : "")}>
                                  <Clock className="h-3.5 w-3.5" />
                                  Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-gray-400 text-xs">
                                  <Clock className="h-3.5 w-3.5" /> No due date
                                </span>
                              )}
                            </div>
                            {task.assignee && (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={task.assignee.image || undefined} />
                                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                                    {task.assignee.name
                                      ? task.assignee.name.split(' ').map(n => n[0]).join('')
                                      : task.assignee.email[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-gray-600 font-medium truncate max-w-[140px]">
                                  {task.assignee.name || task.assignee.email}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Kanban Board */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {kanbanColumns.map((column) => {
                    const columnTasks = filteredTasks.filter(task => task.status === column.id)
                    const Icon = column.icon
                    return (
                      <div key={column.id} className="flex flex-col gap-2">
                        <div className={cn("flex items-center justify-between px-3 py-2 rounded-lg border-l-4 bg-white shadow-sm", column.color)}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-700">{column.title}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {columnTasks.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-lg border border-dashed border-gray-200">
                              No tasks
                            </div>
                          ) : (
                            columnTasks.map((task) => (
                              <div
                                key={task.id}
                                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group p-4 space-y-3"
                                onClick={() => setViewingTask(task)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1 leading-snug">{task.title}</h4>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0" onClick={e => e.stopPropagation()}>
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingTask(task) }}>
                                        <Eye className="h-4 w-4 mr-2" /> View
                                      </DropdownMenuItem>
                                      {canDeleteTask(task) && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setDeletingTask(task) }}>
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <Badge className={cn("text-xs border", getPriorityColor(task.priority))}>{task.priority}</Badge>
                                {task.dueDate && (
                                  <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {format(new Date(task.dueDate), 'MMM d')}
                                  </p>
                                )}
                                {(task.progressPercentage ?? 0) > 0 && (
                                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${task.progressPercentage}%` }} />
                                  </div>
                                )}
                                {task.assignee && (
                                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={task.assignee.image || undefined} />
                                      <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-bold">
                                        {task.assignee.name ? task.assignee.name.split(' ').map(n => n[0]).join('') : task.assignee.email[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-gray-500 truncate">{task.assignee.name || task.assignee.email}</span>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Assign Task via TaskForm */}
      {isCreateTaskDialogOpen && (
        <TaskForm
          open={isCreateTaskDialogOpen}
          preSelectedMemberId={selectedMember || undefined}
          onOpenChange={(open) => setIsCreateTaskDialogOpen(open)}
          onSubmit={async (data) => {
            try {
              const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              })

              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to create task')
              }

              toast({ title: 'Success', description: 'Task assigned successfully' })
              setIsCreateTaskDialogOpen(false)
              fetchData()
              fetchMemberSuggestions()
            } catch (err: any) {
              toast({ title: 'Error', description: err.message || 'Failed to assign task', variant: 'destructive' })
              throw err
            }
          }}
        />
      )}

      {/* Task Detail Modal */}
      <TaskViewModal
        open={!!viewingTask}
        onOpenChange={(open) => { if (!open) setViewingTask(null) }}
        task={viewingTask as any}
        onTaskUpdate={() => { fetchData(); fetchMemberSuggestions() }}
      />

      {/* Delete Task Confirmation Dialog */}
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
