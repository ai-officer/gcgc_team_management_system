'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, CheckSquare, Clock, Users, AlertCircle, ArrowRight, Star, Zap, Target, Activity, Award, BarChart3, Calendar as CalendarIcon, RefreshCw, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
    const hour = new Date().getHours()
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
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Welcome Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {getGreeting()}, {session?.user?.name?.split(' ')[0] || 'User'}! 👋
            </h1>
            <p className="text-lg text-muted-foreground">
              {isLeader 
                ? "Here's your team's progress and your tasks for today." 
                : "Here's your productivity overview and task status."
              }
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(), 'EEEE, MMMM do, yyyy')}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshDashboard} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <CreateTaskButton size="sm" onTaskCreated={refreshDashboard} />
          </div>
        </div>
      </div>

      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-modern hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/user/tasks'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Active Tasks</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{dashboardData.stats.myTasks}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                Tasks in progress
              </p>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
            <Progress value={calculateTaskCompletionRate()} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="card-modern hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/user/tasks?status=completed'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{dashboardData.stats.myCompletedTasks}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                This month
              </p>
              <span className="text-xs font-medium text-green-600">+{Math.floor(Math.random() * 15 + 5)} from last</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Great progress!</span>
            </div>
          </CardContent>
        </Card>

        {isLeader && (
          <Card className="card-modern hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/user/team-overview'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Team Tasks</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{dashboardData.stats.teamTasks}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  Active team tasks
                </p>
                <Activity className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-1">
                <div className="flex -space-x-1">
                  {dashboardData.teamMembers.slice(0, 3).map((member, i) => (
                    <Avatar key={member.id} className="h-5 w-5 border border-white">
                      <AvatarFallback className="text-xs bg-gradient-to-br from-primary/10 to-primary/20">
                        {member.name?.[0] || member.email[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-2">Team active</span>
              </div>
            </CardContent>
          </Card>
        )}


        <Card className={`card-modern hover:shadow-md transition-shadow ${dashboardData.stats.overdueTasks > 0 ? 'cursor-pointer' : ''}`} onClick={() => dashboardData.stats.overdueTasks > 0 && (window.location.href = '/user/tasks?status=overdue')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Tasks</CardTitle>
            <div className={`p-2 rounded-lg ${dashboardData.stats.overdueTasks > 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <AlertCircle className={`h-4 w-4 ${dashboardData.stats.overdueTasks > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${dashboardData.stats.overdueTasks > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {dashboardData.stats.overdueTasks}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {dashboardData.stats.overdueTasks > 0 ? 'Need attention' : 'All caught up!'}
              </p>
              {dashboardData.stats.overdueTasks === 0 && (
                <Zap className="h-3 w-3 text-green-500" />
              )}
            </div>
            <div className="mt-2 text-xs">
              {dashboardData.stats.overdueTasks > 0 ? (
                <span className="text-red-600 font-medium">Action required</span>
              ) : (
                <span className="text-green-600 font-medium">Great job! 🎉</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Enhanced Recent Tasks */}
        <div className="xl:col-span-2">
          <Card className="card-modern">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    Recent Tasks
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Your latest assignments and progress
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => window.location.href = '/user/tasks'}>
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
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
                dashboardData.recentTasks.map((task, index) => (
                  <div key={task.id} className="group p-4 border border-border rounded-lg hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer"
                       onClick={() => window.location.href = `/user/tasks?id=${task.id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {task.title}
                          </h4>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs ${getPriorityColor(task.priority)} font-medium`}>
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                              <Clock className="h-3 w-3" />
                              Due {format(new Date(task.dueDate), 'MMM dd')}
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {task.team?.name || 'Personal'}
                          </Badge>
                          {task.assignee && task.assignee.id !== session?.user?.id && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>by</span>
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/10 to-primary/20">
                                  {task.assignee.name?.[0] || task.assignee.email[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>{task.assignee.name?.split(' ')[0] || 'User'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={task.status === 'COMPLETED' ? 'default' : task.status === 'IN_PROGRESS' ? 'secondary' : 'outline'} className="text-xs whitespace-nowrap">
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
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

        {/* Enhanced Sidebar */}
        <div className="space-y-4">

          {/* Enhanced Upcoming Deadlines */}
          <Card className="card-modern">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    Upcoming Deadlines
                  </CardTitle>
                  <CardDescription className="mt-1">
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
                    <div key={task.id} className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                      isUrgent ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' : 'border-border hover:border-primary/20'
                    }`} onClick={() => window.location.href = `/user/tasks?id=${task.id}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-sm flex-1 pr-2">{task.title}</div>
                        {isUrgent && (
                          <Badge variant="destructive" className="text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{task.team?.name || 'Personal'}</span>
                        {dueDate && (
                          <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            <Clock className="h-3 w-3" />
                            {format(dueDate, 'MMM dd')} ({formatDistanceToNow(dueDate, { addSuffix: false })})
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority} Priority
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Enhanced Quick Actions */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={() => window.location.href = '/user/tasks'}
                className="w-full justify-start h-auto p-3"
                variant="ghost"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">Manage Tasks</div>
                    <div className="text-xs text-muted-foreground">Create and track progress</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>

              <Button 
                onClick={() => window.location.href = '/user/calendar'}
                className="w-full justify-start h-auto p-3"
                variant="ghost"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <CalendarIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">View Calendar</div>
                    <div className="text-xs text-muted-foreground">Check your schedule</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>

              {isLeader && (
                <>
                  <Button 
                    onClick={() => window.location.href = '/user/team-overview'}
                    className="w-full justify-start h-auto p-3"
                    variant="ghost"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                        <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-sm">Team Overview</div>
                        <div className="text-xs text-muted-foreground">Monitor team progress</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Button>

                  <Button 
                    onClick={() => window.location.href = '/user/member-management'}
                    className="w-full justify-start h-auto p-3"
                    variant="ghost"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                        <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-sm">Assign Tasks</div>
                        <div className="text-xs text-muted-foreground">Delegate to team</div>
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
