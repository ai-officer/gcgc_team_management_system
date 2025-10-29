'use client'

import { useState, useEffect } from 'react'
import { Users, TrendingUp, Building2, Shield, UserPlus, Activity, Calendar, Award, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
      hierarchyLevel?: string
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchDashboardStats = async (page: number = 1) => {
    try {
      setLoading(true)
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
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchDashboardStats(newPage)
  }

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">No Data Available</h3>
        <p className="text-gray-500">Dashboard statistics could not be loaded.</p>
      </div>
    )
  }

  // Use the growth rate calculated from the API
  const userGrowthPercentage = stats.growthRate

  return (
    <div className="space-y-8">
      {/* Professional Glassmorphism Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 opacity-60"></div>
        <div className="relative backdrop-blur-sm bg-white/40 border border-slate-200/60 rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-600 text-base font-medium max-w-2xl">Overview of users and system growth metrics</p>
        </div>
      </div>

      {/* Professional Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Users</CardTitle>
            <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{stats.totalUsers}</div>
              <span className="text-sm text-slate-500 font-medium">users</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">{stats.newUsersThisMonth} new this month</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Active Users</CardTitle>
            <div className="p-2.5 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{stats.activeUsers}</div>
              <span className="text-sm text-slate-500 font-medium">active</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">{((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total</span>
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1">
          <div className={cn(
            "absolute top-0 left-0 w-full h-1 bg-gradient-to-r",
            userGrowthPercentage > 0 ? "from-emerald-500 to-emerald-600" :
            userGrowthPercentage < 0 ? "from-red-500 to-red-600" :
            "from-slate-300 to-slate-400"
          )}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Growth Rate</CardTitle>
            <div className={cn(
              "p-2.5 rounded-lg transition-colors",
              userGrowthPercentage > 0 ? "bg-emerald-50 group-hover:bg-emerald-100" :
              userGrowthPercentage < 0 ? "bg-red-50 group-hover:bg-red-100" :
              "bg-slate-50 group-hover:bg-slate-100"
            )}>
              <TrendingUp className={cn(
                "h-5 w-5",
                userGrowthPercentage > 0 ? "text-emerald-600" :
                userGrowthPercentage < 0 ? "text-red-600" :
                "text-slate-400"
              )} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className={cn(
                "text-4xl font-bold flex items-center gap-1",
                userGrowthPercentage > 0 ? "text-emerald-600" :
                userGrowthPercentage < 0 ? "text-red-600" :
                "text-slate-400"
              )}>
                {userGrowthPercentage === 0 ? '0' :
                 userGrowthPercentage === 100 ? '+100' :
                 userGrowthPercentage > 0 ? '+' + userGrowthPercentage.toFixed(1) :
                 userGrowthPercentage.toFixed(1)}%
                {userGrowthPercentage > 0 ? (
                  <ArrowUpRight className="h-6 w-6" />
                ) : userGrowthPercentage < 0 ? (
                  <ArrowDownRight className="h-6 w-6" />
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">{stats.newUsersThisMonth} vs {stats.newUsersLastMonth} last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Organization</CardTitle>
            <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{stats.totalTeams}</div>
              <span className="text-sm text-slate-500 font-medium">teams</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">{stats.totalSections} sections</span>
              <Building2 className="h-4 w-4 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Professional User Distribution */}
        <Card className="border border-slate-200 rounded-xl shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              User Distribution
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-600 mt-1">Users by role and hierarchy level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Leaders</span>
                <span className="font-medium">{stats.leaderCount}</span>
              </div>
              <Progress value={(stats.leaderCount / stats.totalUsers) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Members</span>
                <span className="font-medium">{stats.memberCount}</span>
              </div>
              <Progress value={(stats.memberCount / stats.totalUsers) * 100} className="h-2" />
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Hierarchy Levels</h4>
              <div className="space-y-2">
                {stats.hierarchyDistribution.map((level) => (
                  <div key={level.level} className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {level.level}
                      </Badge>
                      <span>{level.percentage.toFixed(1)}%</span>
                    </div>
                    <span className="font-medium">{level.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional User Growth Chart */}
        <Card className="border border-slate-200 rounded-xl shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              User Growth
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-600 mt-1">New user registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.userGrowth.slice(-6).map((data) => (
                <div key={data.month} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">{data.month}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max((data.users / Math.max(...stats.userGrowth.map(d => d.users))) * 100, 5)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 min-w-[2rem] text-right">{data.users}</span>
                    {data.change !== 0 && (
                      <div className={`flex items-center text-xs font-semibold ${data.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {data.change > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        <span>{Math.abs(data.change)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flat Design Recent Users */}
      <Card className="border-0 rounded-none">
        <CardHeader className="pb-4 bg-pink-500">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <div className="p-2 bg-pink-600 rounded-none">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              Recent Users
            </div>
            <div className="text-sm text-pink-100 font-bold">
              Showing {((stats.recentUsers.pagination.page - 1) * stats.recentUsers.pagination.limit) + 1}-{Math.min(stats.recentUsers.pagination.page * stats.recentUsers.pagination.limit, stats.recentUsers.pagination.total)} of {stats.recentUsers.pagination.total}
            </div>
          </CardTitle>
          <CardDescription className="text-sm font-bold text-pink-100">Recently registered users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentUsers.data.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border-0 rounded-none bg-gray-100 hover:bg-gray-200 transition-colors">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10 rounded-none">
                    <AvatarFallback className="bg-indigo-500 text-white font-bold rounded-none">
                      {user.name ? user.name.split(' ').map(n => n[0]).join('') : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold">{user.name}</div>
                    <div className="text-sm font-bold text-gray-600">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Badge variant="secondary" className={user.role === 'LEADER' ? 'bg-blue-500 text-white border-0 font-bold rounded-none' : 'bg-gray-500 text-white border-0 font-bold rounded-none'}>
                    {user.role}
                  </Badge>
                  {user.hierarchyLevel && (
                    <Badge variant="outline" className="border-0 bg-gray-300 font-bold rounded-none">
                      {user.hierarchyLevel}
                    </Badge>
                  )}
                  <div className="text-right">
                    <div className="font-bold text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                    <Badge variant="secondary" className={user.isActive ? "bg-emerald-500 text-white border-0 text-xs font-bold rounded-none" : "bg-gray-400 text-white border-0 text-xs font-bold rounded-none"}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            
            {/* No users message */}
            {stats.recentUsers.data.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>No users found</p>
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {stats.recentUsers.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === stats.recentUsers.pagination.totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="text-sm text-gray-500">
                Page {stats.recentUsers.pagination.page} of {stats.recentUsers.pagination.totalPages}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}