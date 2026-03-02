'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  TrendingUp,
  Building2,
  Shield,
  UserPlus,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DashboardStats {
  totalUsers: number
  newUsersThisMonth: number
  newUsersLastMonth: number
  activeUsers: number
  leaderCount: number
  memberCount: number
  totalTeams: number
  totalSections: number
  growthRate: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  todoTasks: number
  overdueTasks: number
  hierarchyDistribution: {
    level: string
    count: number
    percentage: number
  }[]
  userGrowth: {
    month: string
    users: number
    change: number
  }[]
  recentUsers: {
    data: {
      id: string
      name: string
      email: string
      role: string
      hierarchyLevel?: string | null
      createdAt: string
      isActive: boolean
    }[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasMore: boolean
    }
  }
}

// Hierarchy level color mapping
function getHierarchyColor(level: string): string {
  const map: Record<string, string> = {
    RF1: 'bg-slate-100 text-slate-700 border-slate-300',
    RF2: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    RF3: 'bg-orange-50 text-orange-700 border-orange-300',
    OF1: 'bg-blue-50 text-blue-700 border-blue-300',
    OF2: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    M1:  'bg-purple-50 text-purple-700 border-purple-300',
    M2:  'bg-pink-50 text-pink-700 border-pink-300',
  }
  return map[level] ?? 'bg-slate-100 text-slate-600 border-slate-200'
}

// Avatar bg color based on role
function getAvatarStyle(role: string): string {
  if (role === 'LEADER') return 'bg-blue-100 text-blue-700'
  if (role === 'ADMIN')  return 'bg-red-100 text-red-700'
  return 'bg-emerald-100 text-emerald-700'
}

function getRoleBadgeStyle(role: string): string {
  if (role === 'LEADER') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (role === 'ADMIN')  return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [tableLoading, setTableLoading] = useState(false)

  const fetchDashboardStats = async (page: number = 1, isPageChange = false) => {
    try {
      if (isPageChange) {
        setTableLoading(true)
      } else {
        setLoading(true)
      }
      const response = await fetch(`/api/admin/dashboard/stats?page=${page}&limit=5`)
      const data = await response.json()
      if (response.ok) {
        setStats(data.stats)
      } else {
        console.error('Dashboard API error:', data.error)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
      setTableLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchDashboardStats(newPage, true)
  }

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">No Data Available</h3>
        <p className="text-slate-500 text-sm">Dashboard statistics could not be loaded.</p>
      </div>
    )
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const activeRate =
    stats.totalUsers > 0
      ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(0)
      : '0'

  const completionRate =
    stats.totalTasks > 0
      ? ((stats.completedTasks / stats.totalTasks) * 100).toFixed(0)
      : '0'

  const newUsersDiff = stats.newUsersThisMonth - stats.newUsersLastMonth
  let newUsersFootnote: string
  if (stats.newUsersLastMonth === 0 && stats.newUsersThisMonth === 0) {
    newUsersFootnote = 'No change'
  } else if (stats.newUsersLastMonth === 0 && stats.newUsersThisMonth > 0) {
    newUsersFootnote = `+${stats.newUsersThisMonth} new registrations`
  } else if (newUsersDiff > 0) {
    newUsersFootnote = `+${newUsersDiff} vs last month`
  } else if (newUsersDiff < 0) {
    newUsersFootnote = `${newUsersDiff} vs last month`
  } else {
    newUsersFootnote = 'No change vs last month'
  }

  const last6Months = stats.userGrowth.slice(-6)
  const maxRegistrations = Math.max(...last6Months.map(d => d.users), 1)

  const leaderPct =
    stats.totalUsers > 0
      ? ((stats.leaderCount / stats.totalUsers) * 100).toFixed(0)
      : '0'
  const memberPct =
    stats.totalUsers > 0
      ? ((stats.memberCount / stats.totalUsers) * 100).toFixed(0)
      : '0'

  const inactiveCount = stats.totalUsers - stats.activeUsers

  const { pagination } = stats.recentUsers
  const rowStart = (pagination.page - 1) * pagination.limit + 1
  const rowEnd = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="space-y-6 bg-slate-50/30 min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Workforce Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{getTodayLabel()}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            All Users
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
          </a>
          <a
            href="/admin/teams"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-all"
          >
            Manage Teams
            <ArrowUpRight className="h-3.5 w-3.5 text-blue-200" />
          </a>
        </div>
      </div>

      {/* ── Row 1: Primary KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Personnel */}
        <Card className="border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <div className="h-1 w-full bg-blue-500" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 leading-none mb-1">
              {stats.totalUsers}
            </div>
            <div className="text-sm font-medium text-slate-500 mb-3">Total Personnel</div>
            <div className="text-xs text-slate-400 border-t border-slate-100 pt-2">
              {stats.leaderCount} leaders &middot; {stats.memberCount} members
            </div>
          </CardContent>
        </Card>

        {/* Active Rate */}
        <Card className="border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <div className="h-1 w-full bg-emerald-500" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 leading-none mb-1">
              {activeRate}%
            </div>
            <div className="text-sm font-medium text-slate-500 mb-3">Active Rate</div>
            <div className="text-xs text-slate-400 border-t border-slate-100 pt-2">
              {stats.activeUsers} active &middot; {inactiveCount} inactive
            </div>
          </CardContent>
        </Card>

        {/* Teams & Sections */}
        <Card className="border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <div className="h-1 w-full bg-purple-500" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Building2 className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 leading-none mb-1">
              {stats.totalTeams}
            </div>
            <div className="text-sm font-medium text-slate-500 mb-3">Teams &amp; Sections</div>
            <div className="text-xs text-slate-400 border-t border-slate-100 pt-2">
              {stats.totalSections} sections
            </div>
          </CardContent>
        </Card>

        {/* New This Month */}
        <Card className="border border-slate-200 rounded-xl shadow-sm bg-white overflow-hidden">
          <div className="h-1 w-full bg-amber-500" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <UserPlus className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 leading-none mb-1">
              {stats.newUsersThisMonth}
            </div>
            <div className="text-sm font-medium text-slate-500 mb-3">New This Month</div>
            <div className="text-xs text-slate-400 border-t border-slate-100 pt-2">
              {newUsersFootnote}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Task KPI cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Total Tasks */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg shrink-0">
            <CheckSquare className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{stats.totalTasks}</div>
            <div className="text-xs text-slate-500 font-medium">Total Tasks</div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg shrink-0">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{stats.completedTasks}</div>
            <div className="text-xs text-slate-500 font-medium">Completed</div>
            <div className="text-xs text-green-600 font-medium">{completionRate}% rate</div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg shrink-0">
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{stats.inProgressTasks}</div>
            <div className="text-xs text-slate-500 font-medium">In Progress</div>
          </div>
        </div>

        {/* Overdue */}
        <div className={cn(
          'border rounded-xl shadow-sm p-4 flex items-center gap-3',
          stats.overdueTasks > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-slate-200'
        )}>
          <div className={cn(
            'p-2 rounded-lg shrink-0',
            stats.overdueTasks > 0 ? 'bg-red-100' : 'bg-slate-100'
          )}>
            <AlertTriangle className={cn(
              'h-4 w-4',
              stats.overdueTasks > 0 ? 'text-red-600' : 'text-slate-400'
            )} />
          </div>
          <div>
            <div className={cn(
              'text-xl font-bold',
              stats.overdueTasks > 0 ? 'text-red-700' : 'text-slate-900'
            )}>
              {stats.overdueTasks}
            </div>
            <div className="text-xs text-slate-500 font-medium">Overdue</div>
            <div className={cn(
              'text-xs font-medium',
              stats.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {stats.overdueTasks > 0 ? 'Needs attention' : 'All on track'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Personnel Overview + Monthly Registrations ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Personnel Overview — col-span-3 */}
        <Card className="lg:col-span-3 border border-slate-200 rounded-xl shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              Personnel Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">

            {/* Role breakdown */}
            <div className="space-y-3">
              {/* Leaders */}
              <div className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium text-slate-700 shrink-0">Leaders</div>
                <div className="flex-1">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.totalUsers > 0 ? (stats.leaderCount / stats.totalUsers) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-slate-900 w-6 text-right">
                    {stats.leaderCount}
                  </span>
                  <Badge className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0">
                    {leaderPct}%
                  </Badge>
                </div>
              </div>

              {/* Members */}
              <div className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium text-slate-700 shrink-0">Members</div>
                <div className="flex-1">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.totalUsers > 0 ? (stats.memberCount / stats.totalUsers) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-slate-900 w-6 text-right">
                    {stats.memberCount}
                  </span>
                  <Badge className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0">
                    {memberPct}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Hierarchy Distribution */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Hierarchy Distribution
              </p>
              {stats.hierarchyDistribution.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {stats.hierarchyDistribution.map(item => (
                    <div
                      key={item.level}
                      className={cn(
                        'flex flex-col items-center p-2 rounded-lg border text-center',
                        getHierarchyColor(item.level)
                      )}
                    >
                      <span className="text-xs font-bold mb-0.5">{item.level}</span>
                      <span className="text-lg font-bold leading-none">{item.count}</span>
                      <span className="text-xs opacity-70 mt-0.5">{item.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-2">No hierarchy data</p>
              )}
            </div>

            {/* Inactive callout */}
            {inactiveCount > 0 && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                <div>
                  <span className="text-sm font-semibold text-slate-700">
                    Inactive Users: {inactiveCount}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review and update account statuses
                  </p>
                </div>
                <a
                  href="/admin/users?status=inactive"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Review
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Registrations — col-span-2 */}
        <Card className="lg:col-span-2 border border-slate-200 rounded-xl shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              Monthly Registrations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {maxRegistrations === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-8 w-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No registrations yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {last6Months.map(data => {
                  const barPct = Math.max((data.users / maxRegistrations) * 100, data.users > 0 ? 4 : 0)
                  return (
                    <div key={data.month} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-16 shrink-0">{data.month}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-900 w-5 text-right">
                        {data.users}
                      </span>
                      {data.change !== 0 && (
                        <span className={cn(
                          'flex items-center text-xs font-semibold w-7',
                          data.change > 0 ? 'text-emerald-600' : 'text-red-500'
                        )}>
                          {data.change > 0
                            ? <ArrowUpRight className="h-3 w-3" />
                            : <ArrowDownRight className="h-3 w-3" />}
                          <span>{Math.abs(data.change)}</span>
                        </span>
                      )}
                      {data.change === 0 && <span className="w-7" />}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Recent Personnel table ──────────────────────────────────── */}
      <Card className="border border-slate-200 rounded-xl shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <UserPlus className="h-4 w-4 text-blue-600" />
              </div>
              Recent Personnel
            </div>
            {pagination.total > 0 && (
              <span className="text-xs font-medium text-slate-500">
                Showing {rowStart}–{rowEnd} of {pagination.total}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">

          {/* Table header row */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-2.5 border-b border-slate-100 bg-slate-50/60">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Level</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
          </div>

          {/* Rows */}
          <div className={cn('divide-y divide-slate-100', tableLoading && 'opacity-60 pointer-events-none')}>
            {stats.recentUsers.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-8 w-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No personnel records found</p>
              </div>
            ) : (
              stats.recentUsers.data.map(user => (
                <div
                  key={user.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 md:gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  {/* Avatar + Name + Email */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 rounded-lg shrink-0">
                      <AvatarFallback className={cn('rounded-lg text-xs font-bold', getAvatarStyle(user.role))}>
                        {user.name ? getInitials(user.name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{user.name}</div>
                      <div className="text-xs text-slate-500 truncate">{user.email}</div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="flex items-center">
                    <Badge className={cn('text-xs font-medium border px-2 py-0.5 capitalize', getRoleBadgeStyle(user.role))}>
                      {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                    </Badge>
                  </div>

                  {/* Hierarchy Level */}
                  <div className="flex items-center">
                    {user.hierarchyLevel ? (
                      <Badge variant="outline" className={cn('text-xs font-medium border', getHierarchyColor(user.hierarchyLevel))}>
                        {user.hierarchyLevel}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 text-sm">&mdash;</span>
                    )}
                  </div>

                  {/* Joined */}
                  <div className="flex items-center">
                    <span className="text-xs text-slate-600">{formatDate(user.createdAt)}</span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <Badge
                      className={cn(
                        'text-xs font-medium border px-2 py-0.5',
                        user.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      )}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || tableLoading}
                className="h-8 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages || tableLoading}
                className="h-8 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
