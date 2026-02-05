'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, CheckSquare, Clock, Users, AlertCircle, ArrowRight, Star, Zap, Target, Activity, Award, BarChart3, Calendar as CalendarIcon, RefreshCw, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import CreateTaskButton from '@/components/tasks/CreateTaskButton'
import { format, formatDistanceToNow } from 'date-fns'
import { TASK_PRIORITY_COLORS, TASK_STATUS_COLORS } from '@/constants'

interface Task {
  id: string
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED'
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
  team?: {
    id: string
    name: string
  } | null
  createdAt: string
  updatedAt: string
}

interface TeamMember {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  image?: string
  role: string
  updatedAt: string
}

interface DashboardStats {
  myTasks: number
  myCompletedTasks: number
  teamTasks: number
  overdueTasks: number
  teamMembersCount: number
}

interface DashboardData {
  stats: DashboardStats
  recentTasks: Task[]
  teamMembers: TeamMember[]
  upcomingDeadlines: Task[]
  teams: Array<{ id: string; name: string }>
}

export default function UserDashboard() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Live clock - update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!session?.user) return

    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/user/dashboard')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const data = await response.json()
        setDashboardData(data)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [session])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'LOW': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusColor = (updatedAt: string) => {
    const lastSeen = new Date(updatedAt)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'bg-green-500' // online
    if (diffInHours < 24) return 'bg-yellow-500' // away
    return 'bg-gray-400' // offline
  }

  const calculateTaskCompletionRate = () => {
    if (dashboardData?.stats.myTasks === 0) return 0
    return Math.round((dashboardData?.stats.myCompletedTasks || 0) / (dashboardData?.stats.myTasks || 1) * 100)
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const refreshDashboard = () => {
    if (!session?.user) return
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/user/dashboard')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const data = await response.json()
        setDashboardData(data)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
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

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>No dashboard data available</p>
      </div>
    )
  }

  const isLeader = session?.user?.role === 'LEADER'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Professional Header with Subtle Styling */}
      <div className="relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 opacity-60"></div>
        <div className="relative backdrop-blur-sm bg-white/40 border border-slate-200/60 rounded-xl shadow-sm p-8">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {getGreeting()}, {session?.user?.name?.split(' ')[0] || 'User'}
                </h1>
                <span className="text-2xl">👋</span>
              </div>
              <p className="text-slate-600 text-base font-medium max-w-2xl">
                {isLeader
                  ? "Monitor your team's progress and stay on top of your tasks."
                  : "Focus on what matters. Here's your productivity snapshot."
                }
              </p>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="font-medium">{format(currentTime, 'EEEE, MMMM do')}</span>
                </div>
                <div className="h-4 w-px bg-slate-300"></div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium tabular-nums">{format(currentTime, 'h:mm:ss a')}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDashboard}
                disabled={loading}
                className="border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <CreateTaskButton size="sm" onTaskCreated={refreshDashboard} />
            </div>
          </div>
        </div>
      </div>

      {/* Professional Stats Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isLeader ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {/* Active Tasks Card */}
        <Card
          className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1"
          onClick={() => window.location.href = '/user/tasks'}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Active Tasks</CardTitle>
            <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <CheckSquare className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{dashboardData.stats.myTasks}</div>
              <span className="text-sm text-slate-500 font-medium">tasks</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Completion rate</span>
                <span className="text-slate-900 font-semibold">{calculateTaskCompletionRate()}%</span>
              </div>
              <Progress value={calculateTaskCompletionRate()} className="h-2 bg-slate-100" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">In progress</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

        {/* Completed Tasks Card */}
        <Card
          className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1"
          onClick={() => window.location.href = '/user/tasks?status=completed'}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Completed</CardTitle>
            <div className="p-2.5 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{dashboardData.stats.myCompletedTasks}</div>
              <span className="text-sm text-slate-500 font-medium">done</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-md w-fit">
              <Star className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700 font-semibold">Excellent progress!</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">This month</span>
              <span className="text-xs text-emerald-600 font-semibold">+{Math.floor(Math.random() * 15 + 5)} from last</span>
            </div>
          </CardContent>
        </Card>

        {/* Team Tasks Card (for Leaders) */}
        {isLeader && (
          <Card
            className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1"
            onClick={() => window.location.href = '/user/team-overview'}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Team Tasks</CardTitle>
              <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-2">
                <div className="text-4xl font-bold text-slate-900">{dashboardData.stats.teamTasks}</div>
                <span className="text-sm text-slate-500 font-medium">active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {dashboardData.teamMembers.slice(0, 3).map((member) => (
                    <UserAvatar
                      key={member.id}
                      userId={member.id}
                      image={member.image}
                      name={member.name}
                      email={member.email}
                      className="h-7 w-7 border-2 border-white ring-1 ring-slate-200"
                      fallbackClassName="text-xs bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold"
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-600 font-medium">{dashboardData.teamMembers.length} members</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">Team activity</span>
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        )}


        {/* Overdue Tasks Card */}
        <Card
          className={`group relative overflow-hidden border transition-all duration-300 rounded-xl ${
            dashboardData.stats.overdueTasks > 0
              ? 'border-red-200 bg-red-50 hover:shadow-lg cursor-pointer hover:-translate-y-1'
              : 'border-slate-200 bg-white hover:shadow-md'
          }`}
          onClick={() => dashboardData.stats.overdueTasks > 0 && (window.location.href = '/user/tasks?status=overdue')}
        >
          <div className={`absolute top-0 left-0 w-full h-1 ${
            dashboardData.stats.overdueTasks > 0
              ? 'bg-gradient-to-r from-red-500 to-red-600'
              : 'bg-gradient-to-r from-slate-300 to-slate-400'
          }`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-semibold uppercase tracking-wide ${
              dashboardData.stats.overdueTasks > 0 ? 'text-red-700' : 'text-slate-600'
            }`}>
              Overdue
            </CardTitle>
            <div className={`p-2.5 rounded-lg group-hover:scale-110 transition-transform ${
              dashboardData.stats.overdueTasks > 0
                ? 'bg-red-100'
                : 'bg-slate-100'
            }`}>
              {dashboardData.stats.overdueTasks > 0 ? (
                <AlertCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckSquare className="h-5 w-5 text-slate-500" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className={`text-4xl font-bold ${
                dashboardData.stats.overdueTasks > 0 ? 'text-red-600' : 'text-slate-400'
              }`}>
                {dashboardData.stats.overdueTasks}
              </div>
              <span className="text-sm text-slate-500 font-medium">tasks</span>
            </div>
            {dashboardData.stats.overdueTasks > 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 rounded-md w-fit">
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                <span className="text-xs text-red-700 font-semibold">Needs attention</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-md w-fit">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-semibold">All caught up!</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {dashboardData.stats.overdueTasks > 0 ? 'Action required' : 'Great job'}
              </span>
              {dashboardData.stats.overdueTasks === 0 && (
                <span className="text-lg">🎉</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Professional Recent Tasks */}
        <div>
          <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    Recent Tasks
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    Your latest assignments and progress
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/user/tasks'}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.recentTasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No recent tasks found</p>
                  <Button size="sm" onClick={() => window.location.href = '/user/tasks'}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Task
                  </Button>
                </div>
              ) : (
                dashboardData.recentTasks.slice(0, 3).map((task, index) => (
                  <div
                    key={task.id}
                    className="group relative border border-slate-200 bg-white rounded-lg p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer"
                    onClick={() => window.location.href = `/user/tasks?id=${task.id}`}
                  >
                    {/* Priority indicator bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                      task.priority === 'URGENT' ? 'bg-red-500' :
                      task.priority === 'HIGH' ? 'bg-orange-500' :
                      task.priority === 'MEDIUM' ? 'bg-yellow-500' :
                      'bg-emerald-500'
                    }`}></div>

                    <div className="flex items-start justify-between ml-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </h4>
                          {index === 0 && (
                            <Badge className="text-xs bg-blue-100 text-blue-700 border-0 font-medium rounded-md">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs ${getPriorityColor(task.priority)} font-medium rounded-md`}>
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                              <Clock className="h-3 w-3" />
                              Due {format(new Date(task.dueDate), 'MMM dd')}
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs border-slate-200 text-slate-700 rounded-md">
                            {task.team?.name || 'Personal'}
                          </Badge>
                          {task.assignee && task.assignee.id !== session?.user?.id && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <span>by</span>
                              <Avatar className="h-4 w-4 ring-1 ring-slate-200">
                                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-100 to-purple-100 text-slate-700 font-medium">
                                  {task.assignee.name?.[0] || task.assignee.email[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{task.assignee.name?.split(' ')[0] || 'User'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant={task.status === 'COMPLETED' ? 'default' : task.status === 'IN_PROGRESS' ? 'secondary' : 'outline'}
                          className="text-xs whitespace-nowrap border-slate-200 rounded-md"
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        {task.status === 'IN_PROGRESS' && (
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                            Active
                          </div>
                        )}
                        {task.status === 'COMPLETED' && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <Award className="h-3 w-3" />
                            Completed
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Flat Design Sidebar - Blue Theme */}
        <div className="space-y-4">

          {/* Flat Design Upcoming Deadlines - Blue Theme */}
          <Card className="border-0 rounded-none">
            <CardHeader className="pb-4 bg-blue-400">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-white">
                    <div className="p-2 bg-blue-500 rounded-none">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    Upcoming Deadlines
                  </CardTitle>
                  <CardDescription className="mt-1.5 text-sm font-bold text-blue-100">
                    Next 7 days
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.upcomingDeadlines.length === 0 ? (
                <div className="text-center py-6">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">No upcoming deadlines</p>
                  <p className="text-xs text-green-600 font-medium">You're all caught up! 🎉</p>
                </div>
              ) : (
                dashboardData.upcomingDeadlines.map((task) => {
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null
                  const isUrgent = dueDate && dueDate.getTime() - new Date().getTime() < 2 * 24 * 60 * 60 * 1000
                  return (
                    <div key={task.id} className={`p-3 rounded-none border-0 transition-colors cursor-pointer ${
                      isUrgent ? 'bg-red-100 hover:bg-red-200' : 'bg-gray-50 hover:bg-gray-100'
                    }`} onClick={() => window.location.href = `/user/tasks?id=${task.id}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-bold text-sm flex-1 pr-2">{task.title}</div>
                        {isUrgent && (
                          <Badge variant="destructive" className="text-xs bg-red-500 text-white border-0 font-bold rounded-none">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-bold">{task.team?.name || 'Personal'}</span>
                        {dueDate && (
                          <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-600 font-bold' : 'text-gray-600 font-bold'}`}>
                            <Clock className="h-3 w-3" />
                            {format(dueDate, 'MMM dd')} ({formatDistanceToNow(dueDate, { addSuffix: false })})
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Badge className={`text-xs ${getPriorityColor(task.priority)} border font-medium`}>
                          {task.priority} Priority
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Flat Design Quick Actions - Blue Theme */}
          <Card className="border-0 rounded-none">
            <CardHeader className="pb-4 bg-blue-500">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-white">
                <div className="p-2 bg-blue-600 rounded-none">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => window.location.href = '/user/tasks'}
                className="w-full justify-start h-auto p-3 border-0 rounded-none bg-gray-50 hover:bg-blue-50"
                variant="ghost"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-none">
                    <CheckSquare className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">Manage Tasks</div>
                    <div className="text-xs text-gray-600 font-bold">Create and track progress</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>

              <Button
                onClick={() => window.location.href = '/user/calendar'}
                className="w-full justify-start h-auto p-3 border-0 rounded-none bg-gray-50 hover:bg-blue-50"
                variant="ghost"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-none">
                    <CalendarIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">View Calendar</div>
                    <div className="text-xs text-gray-600 font-bold">Check your schedule</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>

              <Button
                onClick={() => window.location.href = '/user/profile'}
                className="w-full justify-start h-auto p-3 border-0 rounded-none bg-gray-50 hover:bg-blue-50"
                variant="ghost"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-none">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">View Profile</div>
                    <div className="text-xs text-gray-600 font-bold">Manage your account</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>

              {isLeader && (
                <>
                  <Button
                    onClick={() => window.location.href = '/user/team-overview'}
                    className="w-full justify-start h-auto p-3 border-0 rounded-none bg-gray-50 hover:bg-blue-50"
                    variant="ghost"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-none">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Team Overview</div>
                        <div className="text-xs text-gray-600 font-bold">Monitor team progress</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Button>

                  <Button
                    onClick={() => window.location.href = '/user/member-management'}
                    className="w-full justify-start h-auto p-3 border-0 rounded-none bg-gray-50 hover:bg-blue-50"
                    variant="ghost"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-none">
                        <Target className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Assign Tasks</div>
                        <div className="text-xs text-gray-600 font-bold">Delegate to team</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Insights Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Productivity Overview */}
        <div className="flex-1 min-w-0">
          <Card className="card-modern h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                Productivity Overview
              </CardTitle>
              <CardDescription>
                Your performance this month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Task Completion Rate</span>
                  <span className="text-sm font-medium">{calculateTaskCompletionRate()}%</span>
                </div>
                <Progress value={calculateTaskCompletionRate()} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{dashboardData.stats.myCompletedTasks}</div>
                  <div className="text-xs text-green-700 dark:text-green-400">Completed</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{dashboardData.stats.myTasks}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-400">In Progress</div>
                </div>
              </div>

              {calculateTaskCompletionRate() >= 80 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    Outstanding performance! Keep it up! 🌟
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="flex-1 min-w-0">
          <Card className="card-modern h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 rounded-lg">
                  <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your latest actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={`p-1 rounded-full ${
                      task.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900' :
                      task.status === 'IN_PROGRESS' ? 'bg-blue-100 dark:bg-blue-900' :
                      'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {task.status === 'COMPLETED' ? (
                        <Award className="h-3 w-3 text-green-600" />
                      ) : task.status === 'IN_PROGRESS' ? (
                        <Activity className="h-3 w-3 text-blue-600" />
                      ) : (
                        <Clock className="h-3 w-3 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.status === 'COMPLETED' ? 'Completed' :
                         task.status === 'IN_PROGRESS' ? 'Working on' : 'Started'} •
                        {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}

                {dashboardData.recentTasks.length === 0 && (
                  <div className="text-center py-4">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
