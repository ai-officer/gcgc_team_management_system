'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CheckSquare, Clock, Users, AlertCircle, Activity } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import CreateTaskButton from '@/components/tasks/CreateTaskButton'
import { formatDistanceToNow } from 'date-fns'

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

  const getStatusColor = (updatedAt: string) => {
    const lastSeen = new Date(updatedAt)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) return 'bg-green-500' // online
    if (diffInHours < 24) return 'bg-yellow-500' // away
    return 'bg-gray-400' // offline
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

  const inProgressCount = Math.max(0, dashboardData.stats.myTasks - dashboardData.stats.myCompletedTasks)

  const statusCounts = dashboardData.recentTasks.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const totalRecentTasks = dashboardData.recentTasks.length || 1

  return (
    <div className="bg-gray-50 min-h-screen p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {session?.user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here&apos;s your task overview for today</p>
        </div>
        <CreateTaskButton size="sm" onTaskCreated={refreshDashboard} />
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = '/user/tasks'}
        >
          <div className="bg-blue-50 rounded-lg p-2 w-fit">
            <CheckSquare className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-sm text-gray-500 mt-3">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardData.stats.myTasks}</p>
        </div>

        {/* In Progress */}
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = '/user/tasks'}
        >
          <div className="bg-blue-50 rounded-lg p-2 w-fit">
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-sm text-gray-500 mt-3">In Progress</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{inProgressCount}</p>
        </div>

        {/* Completed */}
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = '/user/tasks?status=completed'}
        >
          <div className="bg-green-50 rounded-lg p-2 w-fit">
            <CheckSquare className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-500 mt-3">Completed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardData.stats.myCompletedTasks}</p>
        </div>

        {/* Overdue */}
        <div
          className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${dashboardData.stats.overdueTasks > 0 ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
          onClick={() => dashboardData.stats.overdueTasks > 0 && (window.location.href = '/user/tasks?status=overdue')}
        >
          <div className={`rounded-lg p-2 w-fit ${dashboardData.stats.overdueTasks > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <AlertCircle className={`h-5 w-5 ${dashboardData.stats.overdueTasks > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <p className="text-sm text-gray-500 mt-3">Overdue</p>
          <p className={`text-2xl font-bold mt-1 ${dashboardData.stats.overdueTasks > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {dashboardData.stats.overdueTasks}
          </p>
        </div>
      </div>

      {/* Middle Section: Task Status + Team Members */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Status Breakdown (2 cols wide) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Task Status</h2>
          <div className="space-y-4">
            {/* Todo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-400 inline-block"></span>
                  <span className="text-sm text-gray-600">Todo</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{statusCounts['TODO'] || 0}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-gray-400 transition-all"
                  style={{ width: `${Math.round(((statusCounts['TODO'] || 0) / totalRecentTasks) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* In Progress */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block"></span>
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{statusCounts['IN_PROGRESS'] || 0}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.round(((statusCounts['IN_PROGRESS'] || 0) / totalRecentTasks) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* In Review */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span className="text-sm text-gray-600">In Review</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{statusCounts['IN_REVIEW'] || 0}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${Math.round(((statusCounts['IN_REVIEW'] || 0) / totalRecentTasks) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Completed */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block"></span>
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{statusCounts['COMPLETED'] || 0}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.round(((statusCounts['COMPLETED'] || 0) / totalRecentTasks) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members (1 col wide) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Team Members</h2>
          {dashboardData.teamMembers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No team members found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {dashboardData.teamMembers.slice(0, 9).map((member) => (
                <div key={member.id} className="flex flex-col items-center gap-1.5">
                  <div className="relative">
                    <UserAvatar
                      userId={member.id}
                      image={member.image}
                      name={member.name}
                      email={member.email}
                      className="h-10 w-10"
                      fallbackClassName="text-sm bg-blue-100 text-blue-700 font-semibold"
                    />
                    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${getStatusColor(member.updatedAt)}`}></span>
                  </div>
                  <span className="text-xs text-gray-600 leading-tight truncate w-full text-center">
                    {member.firstName || member.name?.split(' ')[0] || 'User'}
                  </span>
                </div>
              ))}
            </div>
          )}
          {dashboardData.teamMembers.length > 9 && (
            <p className="text-xs text-gray-400 mt-4 text-center">
              +{dashboardData.teamMembers.length - 9} more members
            </p>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Recent Activity</h2>
        {dashboardData.recentTasks.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {dashboardData.recentTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex gap-3 py-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                onClick={() => window.location.href = `/user/tasks?id=${task.id}`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  task.status === 'COMPLETED' ? 'bg-green-50' :
                  task.status === 'IN_PROGRESS' ? 'bg-blue-50' :
                  task.status === 'IN_REVIEW' ? 'bg-amber-50' :
                  'bg-gray-50'
                }`}>
                  {task.status === 'COMPLETED' ? (
                    <CheckSquare className="h-4 w-4 text-green-600" />
                  ) : task.status === 'IN_PROGRESS' ? (
                    <Activity className="h-4 w-4 text-blue-600" />
                  ) : task.status === 'IN_REVIEW' ? (
                    <Clock className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 font-medium truncate">{task.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {task.status === 'COMPLETED' ? 'Marked as completed' :
                     task.status === 'IN_PROGRESS' ? 'Currently in progress' :
                     task.status === 'IN_REVIEW' ? 'Submitted for review' :
                     'Added to queue'}{task.team ? ` \u00b7 ${task.team.name}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 pt-0.5">
                  {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
