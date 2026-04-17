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
  X,
  User,
  Users,
  Handshake,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import CreateTaskButton from '@/components/tasks/CreateTaskButton'

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
  const [memberSuggestions, setMemberSuggestions] = useState<MemberWithStats[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  // Task creation form state
  const [newTask, setNewTask] = useState<{
    title: string
    description: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
    dueDate: string
    startDate: string
    progressPercentage: number
    taskType: 'INDIVIDUAL' | 'TEAM' | 'COLLABORATION'
    assigneeId: string
    teamMemberIds: string[]
    collaboratorIds: string[]
    assignedById: string
  }>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: '',
    startDate: '',
    progressPercentage: 0,
    taskType: 'INDIVIDUAL',
    assigneeId: '',
    teamMemberIds: [],
    collaboratorIds: [],
    assignedById: session?.user?.id || ''
  })

  // Selected users for task assignments
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>([])
  const [selectedCollaborators, setSelectedCollaborators] = useState<TeamMember[]>([])
  const [allUsers, setAllUsers] = useState<TeamMember[]>([])
  const [teamMemberSearch, setTeamMemberSearch] = useState('')
  const [collaboratorSearch, setCollaboratorSearch] = useState('')

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
      const [membersResponse, teamsResponse, usersResponse] = await Promise.all([
        fetch('/api/user/team-members'),
        fetch('/api/teams'),
        fetch('/api/users')
      ])

      if (!membersResponse.ok || !teamsResponse.ok || !usersResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [membersData, teamsData, usersData] = await Promise.all([
        membersResponse.json(),
        teamsResponse.json(),
        usersResponse.json()
      ])

      const members = membersData.members || []
      setTeamMembers(members)
      setTeams(teamsData.teams || [])
      setAllUsers(usersData.users || [])

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

  const handleAssigneeSelect = (value: string) => {
    setNewTask(prev => ({ ...prev, assigneeId: value }))
  }

  const handleCreateTask = async () => {
    if (!newTask.title) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive"
      })
      return
    }

    if (newTask.taskType === 'INDIVIDUAL' && !newTask.assigneeId) {
      toast({
        title: "Error",
        description: "Please select an assignee for individual tasks",
        variant: "destructive"
      })
      return
    }

    if (newTask.taskType === 'TEAM' && selectedTeamMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please select team members for team tasks",
        variant: "destructive"
      })
      return
    }

    if (newTask.taskType === 'COLLABORATION' && selectedCollaborators.length === 0) {
      toast({
        title: "Error",
        description: "Please select collaborators for collaboration tasks",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
          startDate: newTask.startDate ? new Date(newTask.startDate).toISOString() : undefined,
          assignedById: session?.user?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create task')
      }

      const createdTask = await response.json()
      setTasks(prev => [createdTask, ...prev])
      resetTaskForm()
      setIsCreateTaskDialogOpen(false)
      fetchMemberSuggestions()

      toast({
        title: "Success",
        description: "Task created and assigned successfully"
      })
    } catch (err: any) {
      console.error('Error creating task:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to create task",
        variant: "destructive"
      })
    }
  }

  const resetTaskForm = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: '',
      startDate: '',
      progressPercentage: 0,
      taskType: 'INDIVIDUAL',
      assigneeId: '',
      teamMemberIds: [],
      collaboratorIds: [],
      assignedById: session?.user?.id || ''
    })
    setSelectedTeamMembers([])
    setSelectedCollaborators([])
    setTeamMemberSearch('')
    setCollaboratorSearch('')
  }

  const addTeamMember = (user: TeamMember) => {
    if (!selectedTeamMembers.find(m => m.id === user.id)) {
      const newMembers = [...selectedTeamMembers, user]
      setSelectedTeamMembers(newMembers)
      setNewTask(prev => ({
        ...prev,
        teamMemberIds: [...prev.teamMemberIds, user.id]
      }))
    }
  }

  const removeTeamMember = (userId: string) => {
    const newMembers = selectedTeamMembers.filter(m => m.id !== userId)
    setSelectedTeamMembers(newMembers)
    setNewTask(prev => ({
      ...prev,
      teamMemberIds: prev.teamMemberIds.filter(id => id !== userId)
    }))
  }

  const addCollaborator = (user: TeamMember) => {
    if (!selectedCollaborators.find(c => c.id === user.id)) {
      const newCollaborators = [...selectedCollaborators, user]
      setSelectedCollaborators(newCollaborators)
      setNewTask(prev => ({
        ...prev,
        collaboratorIds: [...prev.collaboratorIds, user.id]
      }))
    }
  }

  const removeCollaborator = (userId: string) => {
    const newCollaborators = selectedCollaborators.filter(c => c.id !== userId)
    setSelectedCollaborators(newCollaborators)
    setNewTask(prev => ({
      ...prev,
      collaboratorIds: prev.collaboratorIds.filter(id => id !== userId)
    }))
  }

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

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL': return <User className="h-3 w-3" />
      case 'TEAM': return <Users className="h-3 w-3" />
      case 'COLLABORATION': return <Handshake className="h-3 w-3" />
      default: return <CheckSquare className="h-3 w-3" />
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage < 25) return 'bg-red-500'
    if (percentage < 50) return 'bg-orange-500'
    if (percentage < 75) return 'bg-yellow-500'
    return 'bg-green-500'
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
          <p className="text-sm text-gray-600 mt-1">Assign tasks, track progress, and optimize workload distribution</p>
        </div>
        <div className="flex items-center gap-3">
          <CreateTaskButton size="sm" onTaskCreated={() => { fetchData(); fetchMemberSuggestions(); }} />
              <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Assign Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create and Assign Task</DialogTitle>
                <DialogDescription>
                  Create a new task with all details and assign it to your team members
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Task Title *</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter task title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the task in detail"
                    rows={3}
                  />
                </div>

                {/* Status and Progress */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newTask.status}
                      onValueChange={(value) => setNewTask(prev => ({ ...prev, status: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Input
                      id="startDate"
                      type="date"
                      value={newTask.startDate}
                      onChange={(e) => setNewTask(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Progress: {newTask.progressPercentage}%</Label>
                  <div className="space-y-2">
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      value={newTask.progressPercentage}
                      onChange={(e) => setNewTask(prev => ({ ...prev, progressPercentage: Number(e.target.value) }))}
                      className="w-full"
                    />
                    <Progress
                      value={newTask.progressPercentage}
                      className={`h-3 ${getProgressColor(newTask.progressPercentage)}`}
                    />
                  </div>
                </div>

                {/* Task Type Selection */}
                <div className="space-y-4">
                  <Label>Task Type</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['INDIVIDUAL', 'TEAM', 'COLLABORATION'] as const).map((type) => (
                      <Card
                        key={type}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          newTask.taskType === type ? "ring-2 ring-primary bg-primary/5" : ""
                        )}
                        onClick={() => {
                          setNewTask(prev => ({ ...prev, taskType: type, assigneeId: '', teamMemberIds: [], collaboratorIds: [] }))
                          setSelectedTeamMembers([])
                          setSelectedCollaborators([])
                        }}
                      >
                        <CardContent className="flex flex-col items-center p-4">
                          <div className="text-2xl mb-2">
                            {type === 'INDIVIDUAL' && '👤'}
                            {type === 'TEAM' && '👥'}
                            {type === 'COLLABORATION' && '🤝'}
                          </div>
                          <span className="text-sm font-medium capitalize">
                            {type.toLowerCase()}
                          </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Individual Task Assignment */}
                {newTask.taskType === 'INDIVIDUAL' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Individual Task</span>
                      </div>
                      <p className="text-sm text-blue-700">
                        Select a team member to assign this individual task to.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assignee">Assign to *</Label>
                      <Select
                        value={newTask.assigneeId}
                        onValueChange={handleAssigneeSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member (sorted by availability)" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const usersWithAvailability = allUsers
                              .filter(user => user.id !== session?.user?.id)
                              .map(user => {
                                const memberStats = memberSuggestions.find(m => m.id === user.id)
                                return {
                                  ...user,
                                  taskCount: memberStats?.taskCounts?.total || 0,
                                  availabilityScore: memberStats?.availabilityScore || 0,
                                  taskCounts: memberStats?.taskCounts || { todo: 0, inProgress: 0, inReview: 0, total: 0 }
                                }
                              })
                              .sort((a, b) => a.availabilityScore - b.availabilityScore)

                            return usersWithAvailability.map((member, index) => (
                              <SelectItem key={member.id} value={member.id}>
                                <div className="flex items-center gap-2 w-full">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={member.image || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-medium text-xs">
                                      {member.name
                                        ? member.name.split(' ').map(n => n[0]).join('')
                                        : member.email?.[0]?.toUpperCase()
                                      }
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium truncate">{member.name || 'No name'}</div>
                                      {index === 0 && (
                                        <Badge className="bg-green-100 text-green-700 text-xs px-1 py-0">
                                          Most Available
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {member.email} • {member.taskCount} active tasks
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Team Task Assignment */}
                {newTask.taskType === 'TEAM' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Team Task</span>
                      </div>
                      <p className="text-sm text-green-700">
                        You are the team leader. Select team members to work on this task.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Team Members *</Label>
                      <Select onValueChange={(value) => {
                        const user = allUsers.find(u => u.id === value)
                        if (user) addTeamMember(user)
                      }}>
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
                          {allUsers
                            .filter(user => {
                              const searchMatch = !teamMemberSearch ||
                                user.name?.toLowerCase().includes(teamMemberSearch.toLowerCase()) ||
                                user.email.toLowerCase().includes(teamMemberSearch.toLowerCase())
                              return user.id !== session?.user?.id &&
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
                        <div className="flex flex-wrap gap-2 mt-2">
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
                                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
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
                )}

                {/* Collaboration Task Assignment */}
                {newTask.taskType === 'COLLABORATION' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Handshake className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Collaboration Task</span>
                      </div>
                      <p className="text-sm text-purple-700">
                        Select collaborators who will work together with you on this task.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Collaborators *</Label>
                      <Select onValueChange={(value) => {
                        const user = allUsers.find(u => u.id === value)
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
                          {allUsers
                            .filter(user => {
                              const searchMatch = !collaboratorSearch ||
                                user.name?.toLowerCase().includes(collaboratorSearch.toLowerCase()) ||
                                user.email.toLowerCase().includes(collaboratorSearch.toLowerCase())
                              return user.id !== session?.user?.id &&
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
                        <div className="flex flex-wrap gap-2 mt-2">
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
                                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
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
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateTaskDialogOpen(false)
                      resetTaskForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask}>
                    Create & Assign Task
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600 font-medium">Total Tasks</p>
            <div className="p-2 bg-blue-50 rounded-lg">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{teamStats.totalTasks}</p>
          <p className="text-xs text-gray-500 mt-1">Across {teamStats.totalMembers} members</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600 font-medium">In Progress</p>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{teamStats.inProgressTasks}</p>
          <p className="text-xs text-gray-500 mt-1">Active work items</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600 font-medium">Completed</p>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Award className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{teamStats.completedTasks}</p>
          <p className="text-xs text-gray-500 mt-1">Tasks finished</p>
        </div>

        <div className={cn(
          "bg-white rounded-xl shadow-sm border p-5",
          teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "border-red-200 bg-red-50" : "border-gray-100"
        )}>
          <div className="flex items-center justify-between mb-3">
            <p className={cn("text-sm font-medium", teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "text-red-700" : "text-gray-600")}>
              Urgent &amp; Overdue
            </p>
            <div className={cn("p-2 rounded-lg", teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "bg-red-100" : "bg-gray-50")}>
              <AlertTriangle className={cn("h-4 w-4", teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "text-red-600" : "text-gray-400")} />
            </div>
          </div>
          <p className={cn("text-3xl font-bold", teamStats.urgentTasks + teamStats.overdueTasks > 0 ? "text-red-600" : "text-gray-400")}>
            {teamStats.urgentTasks + teamStats.overdueTasks}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {teamStats.urgentTasks} urgent · {teamStats.overdueTasks} overdue
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Team Members Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            <p className="text-sm text-gray-600 mt-0.5">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-gray-200"
              />
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {/* All Members option */}
              <div
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                  !selectedMember ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                )}
                onClick={() => setSelectedMember('')}
              >
                <div className={cn("p-1.5 rounded-lg", !selectedMember ? 'bg-blue-100' : 'bg-gray-100')}>
                  <Users className={cn("h-4 w-4", !selectedMember ? 'text-blue-600' : 'text-gray-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium text-sm", !selectedMember ? 'text-blue-900' : 'text-gray-900')}>All Members</p>
                  <p className={cn("text-xs", !selectedMember ? 'text-blue-600' : 'text-gray-500')}>View all tasks</p>
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">
                  {searchTerm ? 'No members match' : 'No members found'}
                </p>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                      selectedMember === member.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    )}
                    onClick={() => setSelectedMember(member.id === selectedMember ? '' : member.id)}
                  >
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarImage src={member.image} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">
                        {member.name ? member.name.split(' ').map(n => n[0]).join('') : member.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-gray-900">
                        {member.name || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.email}
                      </p>
                      {member._count && (
                        <span className="inline-flex items-center gap-1 mt-0.5 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          <CheckSquare className="h-2.5 w-2.5" />
                          {member._count.assignedTasks} tasks
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tasks Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tasks header */}
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedMember
                    ? `Tasks for ${teamMembers.find(m => m.id === selectedMember)?.name || 'Selected Member'}`
                    : 'All Team Tasks'
                  }
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {selectedMember ? 'Tasks assigned to the selected member' : 'Tasks assigned to all team members'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                  <SelectTrigger className="w-[160px] border-gray-200">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="Status" />
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
                    <Button variant="outline" size="icon" className="border-gray-200">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>View Mode</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setViewMode('list')} className="cursor-pointer">
                      <ListTodo className="h-4 w-4 mr-2" />
                      List View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode('kanban')} className="cursor-pointer">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Kanban Board
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="p-5">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-14">
                  <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-1 text-gray-900">No tasks found</h3>
                  <p className="text-sm text-gray-600 mb-5">
                    {selectedMember
                      ? 'This member has no assigned tasks'
                      : statusFilter !== 'all'
                      ? `No ${statusFilter.toLowerCase().replace('_', ' ')} tasks`
                      : 'No tasks assigned to team members yet'
                    }
                  </p>
                  <Button onClick={() => setIsCreateTaskDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {selectedMember ? 'Assign First Task' : 'Create First Task'}
                  </Button>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <div key={task.id} className="p-4 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 space-y-1.5">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border", getPriorityColor(task.priority))}>
                              {task.priority}
                            </span>
                            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium", getStatusColor(task.status))}>
                              {task.status.replace('_', ' ')}
                            </span>
                            {task.dueDate && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>Reassign</DropdownMenuItem>
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
                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {task.team ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Users className="h-3 w-3" />
                              {task.team.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              Individual
                            </span>
                          )}
                        </div>

                        {task.assignee && (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={task.assignee.image || undefined} />
                              <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-[10px]">
                                {task.assignee.name ?
                                  task.assignee.name.split(' ').map(n => n[0]).join('') :
                                  task.assignee.email[0].toUpperCase()
                                }
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-500">
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
                                        <DropdownMenuItem>
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
            </div>
          </div>
        </div>
      </div>

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
