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
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
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
    <div className="space-y-8">
      {/* Professional Glassmorphism Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 opacity-60"></div>
        <div className="relative backdrop-blur-sm bg-white/40 border border-slate-200/60 rounded-xl shadow-sm p-8">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Member Management</h1>
              <p className="text-slate-600 text-base font-medium max-w-2xl">
                Assign tasks, track progress, and optimize team workload distribution
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="shadow-sm" onClick={() => setIsCreateTaskDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Team Stats Dashboard - Professional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Tasks</CardTitle>
            <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{teamStats.totalTasks}</div>
              <span className="text-sm text-slate-500 font-medium">tasks</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Assigned to {teamStats.totalMembers} members</span>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">In Progress</CardTitle>
            <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{teamStats.inProgressTasks}</div>
              <span className="text-sm text-slate-500 font-medium">active</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Active work items</span>
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Completed</CardTitle>
            <div className="p-2.5 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{teamStats.completedTasks}</div>
              <span className="text-sm text-slate-500 font-medium">done</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Tasks finished</span>
              <Award className="h-4 w-4 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "group relative overflow-hidden border bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1",
          teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "border-red-200" : "border-slate-200"
        )}>
          <div className={cn(
            "absolute top-0 left-0 w-full h-1 bg-gradient-to-r",
            teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "from-red-500 to-red-600" : "from-slate-300 to-slate-400"
          )}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Urgent & Overdue</CardTitle>
            <div className={cn(
              "p-2.5 rounded-lg transition-colors",
              teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "bg-red-50 group-hover:bg-red-100" : "bg-slate-50 group-hover:bg-slate-100"
            )}>
              <AlertTriangle className={cn(
                "h-5 w-5",
                teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "text-red-600" : "text-slate-400"
              )} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className={cn(
                "text-4xl font-bold",
                teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "text-slate-900" : "text-slate-400"
              )}>{teamStats.urgentTasks + teamStats.overdueTasks}</div>
              <span className="text-sm text-slate-500 font-medium">tasks</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {teamStats.urgentTasks} urgent • {teamStats.overdueTasks} overdue
              </span>
              <AlertTriangle className={cn(
                "h-4 w-4",
                teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "text-red-600" : "text-slate-400"
              )} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Team Members Sidebar - Professional */}
        <Card className="lg:col-span-1 border border-slate-200 rounded-xl bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <div className="p-2 bg-blue-50 rounded-lg">
                <UserCheck className="h-4 w-4 text-blue-600" />
              </div>
              Team Members
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 font-medium">
              {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200 rounded-lg bg-white focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                <div
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all",
                    !selectedMember
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-white border border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                  )}
                  onClick={() => setSelectedMember('')}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    !selectedMember ? 'bg-blue-100' : 'bg-slate-100'
                  )}>
                    <Users className={cn(
                      "h-4 w-4",
                      !selectedMember ? 'text-blue-600' : 'text-slate-600'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-semibold text-sm",
                      !selectedMember ? 'text-blue-900' : 'text-slate-900'
                    )}>
                      All Members
                    </p>
                    <p className={cn(
                      "text-xs font-medium",
                      !selectedMember ? 'text-blue-600' : 'text-slate-600'
                    )}>
                      View all tasks
                    </p>
                  </div>
                </div>

                {filteredMembers.length === 0 ? (
                  <p className="text-center text-slate-600 py-4 text-sm font-medium">
                    {searchTerm ? 'No members match' : 'No members found'}
                  </p>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all group",
                        selectedMember === member.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-white border border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                      )}
                      onClick={() => setSelectedMember(member.id === selectedMember ? '' : member.id)}
                    >
                      <Avatar className="h-10 w-10 ring-2 rounded-lg group-hover:ring-blue-400 transition-all ring-slate-200">
                        <AvatarImage src={member.image} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-bold rounded-lg">
                          {member.name ? member.name.split(' ').map(n => n[0]).join('') : member.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate text-slate-900">
                          {member.name || 'Unnamed User'}
                        </p>
                        <p className="text-xs text-slate-600 truncate font-medium">
                          {member.email}
                        </p>
                        {(() => {
                          const stats = memberSuggestions.find(s => s.id === member.id)
                          const workload = stats?.workloadPercentage ?? 0
                          const total = stats?.taskCounts?.total ?? member._count?.assignedTasks ?? 0
                          return (
                            <div className="mt-1.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500">{total} active task{total !== 1 ? 's' : ''}</span>
                                <span className={cn(
                                  "text-[10px] font-medium",
                                  workload >= 80 ? "text-red-600" : workload >= 50 ? "text-amber-600" : "text-green-600"
                                )}>{Math.round(workload)}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    workload >= 80 ? "bg-red-500" : workload >= 50 ? "bg-amber-500" : "bg-green-500"
                                  )}
                                  style={{ width: `${Math.min(workload, 100)}%` }}
                                />
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Area */}
        <div className="lg:col-span-3">
          <Card className="border border-slate-200 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-slate-900 font-semibold">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Target className="h-4 w-4 text-blue-600" />
                    </div>
                    {selectedMember
                      ? `Tasks for ${teamMembers.find(m => m.id === selectedMember)?.name || 'Selected Member'}`
                      : 'All Team Tasks'
                    }
                  </CardTitle>
                  <CardDescription className="mt-1 text-slate-600 font-medium">
                    {selectedMember
                      ? 'Tasks assigned to the selected member'
                      : 'Tasks assigned to all team members'}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                    <SelectTrigger className="w-[180px] border-slate-200 rounded-lg bg-white">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-600" />
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="border border-slate-200 rounded-lg shadow-lg">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="TODO">To Do</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="IN_REVIEW">In Review</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-lg bg-white hover:bg-blue-50">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-lg">
                      <DropdownMenuLabel className="font-semibold">View Mode</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setViewMode('list')}>
                        <ListTodo className="h-4 w-4 mr-2" />
                        List View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setViewMode('kanban')}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Kanban Board
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-gray-50">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16">
                  <CheckSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-600">No tasks found</h3>
                  <p className="text-gray-400 mb-6 text-sm">
                    {selectedMember
                      ? 'This member has no assigned tasks'
                      : statusFilter !== 'all'
                      ? `No ${statusFilter.toLowerCase().replace('_', ' ')} tasks`
                      : 'No tasks assigned to team members yet'
                    }
                  </p>
                  <Button onClick={() => setIsCreateTaskDialogOpen(true)} className="rounded-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    {selectedMember ? 'Assign First Task' : 'Create First Task'}
                  </Button>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div key={task.id} className="p-4 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200 group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-2 flex-1">
                          <h4 className="font-semibold text-gray-900">{task.title}</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={cn("text-xs border", getPriorityColor(task.priority))}>
                              {task.priority}
                            </Badge>
                            <Badge className={cn("text-xs border", getStatusColor(task.status))}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingTask(task)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canDeleteTask(task) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setDeletingTask(task)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {task.team ? (
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {task.team.name}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              Individual
                            </Badge>
                          )}
                        </div>

                        {task.assignee && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 ring-2 ring-transparent hover:ring-primary/20 transition-all">
                              <AvatarImage src={task.assignee.image || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                                {task.assignee.name ?
                                  task.assignee.name.split(' ').map(n => n[0]).join('') :
                                  task.assignee.email[0].toUpperCase()
                                }
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {task.assignee.name || task.assignee.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {kanbanColumns.map((column) => {
                    const columnTasks = filteredTasks.filter(task => task.status === column.id)
                    const Icon = column.icon

                    return (
                      <Card key={column.id} className={cn("border-t-4", column.color)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <h3 className="font-semibold text-sm">{column.title}</h3>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {columnTasks.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          {columnTasks.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              No tasks
                            </div>
                          ) : (
                            columnTasks.map((task) => (
                              <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-medium text-sm line-clamp-2 flex-1">{task.title}</h4>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setViewingTask(task)}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View
                                        </DropdownMenuItem>
                                        {canDeleteTask(task) && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              className="text-red-600"
                                              onClick={() => setDeletingTask(task)}
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  <Badge className={cn("text-xs border", getPriorityColor(task.priority))}>
                                    {task.priority}
                                  </Badge>

                                  {task.dueDate && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(task.dueDate), 'MMM dd')}
                                    </div>
                                  )}

                                  {task.assignee && (
                                    <div className="flex items-center gap-2 pt-2 border-t">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={task.assignee.image || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-[10px]">
                                          {task.assignee.name ?
                                            task.assignee.name.split(' ').map(n => n[0]).join('') :
                                            task.assignee.email[0].toUpperCase()
                                          }
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-muted-foreground truncate">
                                        {task.assignee.name || task.assignee.email}
                                      </span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
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
        task={viewingTask}
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
