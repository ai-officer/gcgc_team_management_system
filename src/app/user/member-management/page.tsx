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
  Users,
  Trash2,
  Activity,
  Award,
  AlertTriangle,
  BarChart3,
  ListTodo,
  Eye,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
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

  useEffect(() => {
    if (session?.user?.role !== 'LEADER') {
      window.location.href = '/user/dashboard'
    }
  }, [session])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchMemberSuggestions = async () => {
    if (!session?.user || session.user.role !== 'LEADER') return
    try {
      setSuggestionsLoading(true)
      const response = await fetch('/api/user/member-suggestions')
      if (!response.ok) throw new Error('Failed to fetch member suggestions')
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
      const [membersResponse, teamsResponse] = await Promise.all([
        fetch('/api/user/team-members'),
        fetch('/api/teams'),
      ])
      if (!membersResponse.ok || !teamsResponse.ok) throw new Error('Failed to fetch data')
      const [membersData, teamsData] = await Promise.all([
        membersResponse.json(),
        teamsResponse.json(),
      ])
      const members = membersData.members || []
      setTeamMembers(members)
      setTeams(teamsData.teams || [])

      const taskParams = new URLSearchParams()
      taskParams.append('limit', '100')
      if (selectedMember) taskParams.append('assigneeId', selectedMember)
      const tasksResponse = await fetch('/api/tasks?' + taskParams.toString())
      if (!tasksResponse.ok) throw new Error('Failed to fetch tasks')
      const tasksData = await tasksResponse.json()
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

  useEffect(() => { fetchData() }, [session, selectedMember])
  useEffect(() => {
    if (session?.user?.role === 'LEADER') fetchMemberSuggestions()
  }, [session])

  const handleDeleteTask = async () => {
    if (!deletingTask) return
    try {
      const response = await fetch(`/api/tasks/${deletingTask.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete task')
      }
      await fetchData()
      await fetchMemberSuggestions()
      setDeletingTask(null)
      toast({ title: 'Success', description: 'Task deleted successfully' })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete task',
        variant: 'destructive'
      })
    }
  }

  const canDeleteTask = (task: Task) =>
    session?.user?.role === 'LEADER' || session?.user?.role === 'ADMIN'

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-200'
      case 'HIGH':   return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'LOW':    return 'bg-green-100 text-green-700 border-green-200'
      default:       return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':  return 'bg-emerald-100 text-emerald-700 border-emerald-300'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'IN_REVIEW':  return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'TODO':       return 'bg-slate-100 text-slate-700 border-slate-300'
      default:           return 'bg-slate-100 text-slate-700 border-slate-300'
    }
  }

  const filteredMembers = teamMembers.filter(member =>
    !debouncedSearchTerm ||
    member.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  )

  const filteredTasks = tasks
    .filter(task => {
      if (selectedMember) return task.assignee?.id === selectedMember
      return task.assignee?.id !== session?.user?.id
    })
    .filter(task => statusFilter === 'all' || task.status === statusFilter)

  const teamStats = {
    totalMembers: teamMembers.length,
    totalTasks: filteredTasks.length,
    inProgressTasks: filteredTasks.filter(t => t.status === 'IN_PROGRESS').length,
    completedTasks: filteredTasks.filter(t => t.status === 'COMPLETED').length,
    urgentTasks: filteredTasks.filter(t => t.priority === 'URGENT').length,
    overdueTasks: filteredTasks.filter(t => {
      const sot = new Date(); sot.setHours(0,0,0,0)
      return t.dueDate && new Date(t.dueDate) < sot && t.status !== 'COMPLETED'
    }).length
  }

  const kanbanColumns = [
    { id: 'TODO',        title: 'To Do',      icon: ListTodo,   accent: 'border-l-slate-400',  badge: 'bg-slate-100 text-slate-600' },
    { id: 'IN_PROGRESS', title: 'In Progress', icon: Activity,   accent: 'border-l-blue-400',   badge: 'bg-blue-100 text-blue-700' },
    { id: 'IN_REVIEW',   title: 'In Review',   icon: Eye,        accent: 'border-l-amber-400',  badge: 'bg-amber-100 text-amber-700' },
    { id: 'COMPLETED',   title: 'Completed',   icon: CheckSquare,accent: 'border-l-emerald-400',badge: 'bg-emerald-100 text-emerald-700' },
  ]

  if (session?.user?.role !== 'LEADER') return null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
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

  const alertCount = teamStats.urgentTasks + teamStats.overdueTasks

  return (
    <div className="space-y-8">

      {/* ── Gradient Hero Header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 opacity-60" />
        <div className="relative backdrop-blur-sm bg-white/40 border border-slate-200/60 rounded-xl shadow-sm p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Member Management</h1>
              <p className="text-slate-600 text-base font-medium">
                Assign tasks, track workload, and optimize your team's performance.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                className="shadow-sm"
                onClick={() => setIsCreateTaskDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Team Members */}
        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Team Members</CardTitle>
            <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{teamStats.totalMembers}</div>
              <span className="text-sm text-slate-500 font-medium">members</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Active team</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

        {/* Total Tasks */}
        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Tasks</CardTitle>
            <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{teamStats.totalTasks}</div>
              <span className="text-sm text-slate-500 font-medium">assigned</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">In progress</span>
                <span className="text-slate-900 font-semibold">{teamStats.inProgressTasks}</span>
              </div>
              <Progress
                value={teamStats.totalTasks > 0 ? (teamStats.inProgressTasks / teamStats.totalTasks) * 100 : 0}
                className="h-1.5 bg-slate-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
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
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className={cn(
          "group relative overflow-hidden border bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1",
          alertCount > 0 ? "border-red-200" : "border-slate-200"
        )}>
          <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", alertCount > 0 ? "from-red-500 to-red-600" : "from-slate-400 to-slate-500")} />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Alerts</CardTitle>
            <div className={cn("p-2.5 rounded-lg transition-colors", alertCount > 0 ? "bg-red-50 group-hover:bg-red-100" : "bg-slate-50 group-hover:bg-slate-100")}>
              <AlertTriangle className={cn("h-5 w-5", alertCount > 0 ? "text-red-500" : "text-slate-400")} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className={cn("text-4xl font-bold", alertCount > 0 ? "text-red-600" : "text-slate-400")}>{alertCount}</div>
              <span className="text-sm text-slate-500 font-medium">issues</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">{teamStats.urgentTasks} urgent · {teamStats.overdueTasks} overdue</span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── Main Two-Panel Layout ── */}
      <div className="flex flex-col md:flex-row gap-5 md:items-stretch md:h-[calc(100vh-380px)] min-h-[400px]">

        {/* ── Left: Team Members Sidebar ── */}
        <div className="w-full h-[280px] md:h-auto md:w-[300px] md:shrink-0 flex flex-col">
          <Card className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Sidebar header */}
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Team</h2>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  {teamMembers.length}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-sm h-9"
                />
              </div>
            </div>

            {/* Scrollable member list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">

              {/* All Members row */}
              <button
                className={cn(
                  "w-full text-left rounded-lg border transition-all px-3 py-2.5 flex items-center gap-3",
                  !selectedMember
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                )}
                onClick={() => setSelectedMember('')}
              >
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", !selectedMember ? 'bg-blue-100' : 'bg-slate-100')}>
                  <Users className={cn("h-4 w-4", !selectedMember ? 'text-blue-600' : 'text-slate-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn("text-sm font-semibold", !selectedMember ? 'text-blue-900' : 'text-slate-700')}>All Members</p>
                    <span className="text-xs text-slate-400 shrink-0">{teamStats.totalTasks}t</span>
                  </div>
                  <p className="text-xs text-slate-400">{teamStats.totalMembers} members</p>
                </div>
              </button>

              {filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="h-8 w-8 text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">
                    {searchTerm ? 'No members match' : 'No members found'}
                  </p>
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const stats = memberSuggestions.find(s => s.id === member.id)
                  const workload = stats?.workloadPercentage ?? 0
                  const totalTasks = stats?.taskCounts?.total ?? member._count?.assignedTasks ?? 0
                  const isSelected = selectedMember === member.id
                  const initials = member.name
                    ? member.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                    : member.email[0].toUpperCase()
                  return (
                    <button
                      key={member.id}
                      className={cn(
                        "w-full text-left rounded-lg border transition-all px-3 py-2.5 flex items-center gap-3",
                        isSelected
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                      )}
                      onClick={() => setSelectedMember(isSelected ? '' : member.id)}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={member.image} />
                        <AvatarFallback className={cn("text-xs font-bold", isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={cn("text-sm font-semibold truncate", isSelected ? "text-blue-900" : "text-slate-800")}>
                            {member.name || 'Unnamed User'}
                          </p>
                          <span className="text-xs text-slate-400 shrink-0">{totalTasks}t</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mt-1">
                          <div
                            className={cn("h-full rounded-full transition-all", workload >= 80 ? "bg-red-400" : workload >= 50 ? "bg-amber-400" : "bg-emerald-400")}
                            style={{ width: `${Math.min(workload, 100)}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* ── Right: Task Panel ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Selected Member Profile Strip */}
          {selectedMember && (() => {
            const profileMember = teamMembers.find(m => m.id === selectedMember)
            const profileStats = memberSuggestions.find(s => s.id === selectedMember)
            const profileWorkload = profileStats?.workloadPercentage ?? 0
            const profileActive = profileStats?.taskCounts?.inProgress ?? 0
            const profileTotal = profileStats?.taskCounts?.total ?? 0
            if (!profileMember) return null
            const initials = profileMember.name
              ? profileMember.name.split(' ').map(n => n[0]).join('').slice(0, 2)
              : profileMember.email[0].toUpperCase()
            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3.5 flex items-center gap-4 shrink-0">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={profileMember.image} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{profileMember.name || 'Unnamed User'}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />{profileActive} active
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />{profileTotal} total
                    </span>
                    <span className={cn("flex items-center gap-1 font-semibold", profileWorkload >= 80 ? "text-red-500" : profileWorkload >= 50 ? "text-amber-500" : "text-emerald-600")}>
                      <BarChart3 className="h-3 w-3" />{profileWorkload}% workload
                    </span>
                  </div>
                </div>
                <Button size="sm" className="shrink-0" onClick={() => setIsCreateTaskDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Assign Task
                </Button>
              </div>
            )
          })()}

          {/* Task Panel */}
          <Card className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Task Panel Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-4 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {selectedMember
                    ? `${teamMembers.find(m => m.id === selectedMember)?.name || 'Member'}'s Tasks`
                    : 'All Team Tasks'
                  }
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                  {statusFilter !== 'all' ? ` · ${statusFilter.replace(/_/g, ' ')}` : ' · all statuses'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                  <SelectTrigger className="w-[150px] border-slate-200 rounded-lg bg-white text-sm h-9">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-slate-400" />
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
                    <Button variant="outline" size="icon" className="rounded-lg border-slate-200 bg-white h-9 w-9">
                      <MoreHorizontal className="h-4 w-4 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-lg">
                    <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wide">View Mode</DropdownMenuLabel>
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

            {/* Task Content — scrollable */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center">
                  <div className="p-4 bg-slate-100 rounded-full mb-4">
                    <CheckSquare className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-600 mb-1">No tasks found</h3>
                  <p className="text-sm text-slate-400 mb-6 max-w-xs">
                    {selectedMember
                      ? 'This member has no assigned tasks yet'
                      : statusFilter !== 'all'
                      ? `No tasks with status "${statusFilter.replace(/_/g, ' ')}"`
                      : 'No tasks have been assigned to team members yet'
                    }
                  </p>
                  <Button onClick={() => setIsCreateTaskDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {selectedMember ? 'Assign First Task' : 'Create First Task'}
                  </Button>
                </div>

              ) : viewMode === 'list' ? (
                <div className="space-y-2.5">
                  {filteredTasks.map((task) => {
                    const sot = new Date(); sot.setHours(0,0,0,0)
                    const isOverdue = task.dueDate && new Date(task.dueDate) < sot && task.status !== 'COMPLETED'
                    const progress = task.progressPercentage ?? 0
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "group relative bg-white rounded-xl border border-slate-200 border-l-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
                          task.status === 'COMPLETED'  ? "border-l-emerald-400" :
                          task.status === 'IN_PROGRESS'? "border-l-blue-400"    :
                          task.status === 'IN_REVIEW'  ? "border-l-amber-400"   : "border-l-slate-300"
                        )}
                        onClick={() => setViewingTask(task)}
                      >
                        <div className="p-4">
                          {/* Row 1: Title + menu */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-slate-900 leading-snug">{task.title}</h4>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded-lg"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
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

                          {/* Row 2: Badges + meta */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge className={cn("text-[10px] px-1.5 h-5 border font-medium", getPriorityColor(task.priority))}>
                                {task.priority}
                              </Badge>
                              <Badge className={cn("text-[10px] px-1.5 h-5 border font-medium", getStatusColor(task.status))}>
                                {task.status.replace(/_/g, ' ')}
                              </Badge>
                              {isOverdue && (
                                <Badge className="text-[10px] px-1.5 h-5 bg-red-50 text-red-600 border border-red-200 font-medium">
                                  Overdue
                                </Badge>
                              )}
                              {task.dueDate && (
                                <span className={cn("text-xs flex items-center gap-1", isOverdue ? "text-red-500 font-medium" : "text-slate-400")}>
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                            {task.assignee && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={task.assignee.image || undefined} />
                                  <AvatarFallback className="bg-blue-100 text-blue-700 text-[9px] font-bold">
                                    {task.assignee.name ? task.assignee.name.split(' ').map(n => n[0]).join('') : task.assignee.email[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-slate-500 truncate max-w-[100px]">
                                  {task.assignee.name || task.assignee.email}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Progress bar */}
                          {progress > 0 && (
                            <div className="mt-2.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span>Progress</span><span>{progress}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", progress >= 75 ? "bg-emerald-500" : progress >= 40 ? "bg-blue-500" : "bg-amber-500")}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}
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
                      <div key={column.id} className="flex flex-col gap-2.5">
                        <div className={cn("flex items-center justify-between px-3 py-2 rounded-lg border-l-4 bg-white border border-slate-200 shadow-sm", column.accent)}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-semibold text-slate-700">{column.title}</span>
                          </div>
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", column.badge)}>
                            {columnTasks.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {columnTasks.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs bg-white rounded-lg border border-dashed border-slate-200">
                              No tasks
                            </div>
                          ) : (
                            columnTasks.map((task) => (
                              <div
                                key={task.id}
                                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group p-3.5 space-y-2.5"
                                onClick={() => setViewingTask(task)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 flex-1 leading-snug">{task.title}</h4>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 rounded-lg" onClick={e => e.stopPropagation()}>
                                        <MoreHorizontal className="h-3 w-3 text-slate-400" />
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
                                <Badge className={cn("text-[10px] px-1.5 h-5 border font-medium", getPriorityColor(task.priority))}>
                                  {task.priority}
                                </Badge>
                                {task.dueDate && (
                                  <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {format(new Date(task.dueDate), 'MMM d')}
                                  </p>
                                )}
                                {(task.progressPercentage ?? 0) > 0 && (
                                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${task.progressPercentage}%` }} />
                                  </div>
                                )}
                                {task.assignee && (
                                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={task.assignee.image || undefined} />
                                      <AvatarFallback className="bg-blue-100 text-blue-700 text-[9px] font-bold">
                                        {task.assignee.name ? task.assignee.name.split(' ').map(n => n[0]).join('') : task.assignee.email[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-slate-500 truncate">{task.assignee.name || task.assignee.email}</span>
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

      {/* ── Assign Task ── */}
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

      {/* ── Task Detail Modal ── */}
      <TaskViewModal
        open={!!viewingTask}
        onOpenChange={(open) => { if (!open) setViewingTask(null) }}
        task={viewingTask as any}
        onTaskUpdate={() => { fetchData(); fetchMemberSuggestions() }}
      />

      {/* ── Delete Confirmation ── */}
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
