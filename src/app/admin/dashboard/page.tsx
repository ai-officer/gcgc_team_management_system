'use client'

import { useState, useEffect } from 'react'
import { Users, TrendingUp, Building2, Shield, UserPlus, Activity, Calendar, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface DashboardStats {
  totalUsers: number
  newUsersThisMonth: number
  activeUsers: number
  leaderCount: number
  memberCount: number
  totalTeams: number
  totalSections: number
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
    id: string
    name: string
    email: string
    role: string
    hierarchyLevel?: string
    createdAt: string
    isActive: boolean
  }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats')
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

  const userGrowthPercentage = stats.userGrowth.length > 1 
    ? ((stats.userGrowth[stats.userGrowth.length - 1].users - stats.userGrowth[stats.userGrowth.length - 2].users) / stats.userGrowth[stats.userGrowth.length - 2].users) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of users and system growth metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.newUsersThisMonth} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                {userGrowthPercentage > 0 ? '+' : ''}{userGrowthPercentage.toFixed(1)}%
              </div>
              {userGrowthPercentage > 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organization</CardTitle>
            <Building2 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSections} sections
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span>User Distribution</span>
            </CardTitle>
            <CardDescription>Users by role and hierarchy level</CardDescription>
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

        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>User Growth</span>
            </CardTitle>
            <CardDescription>New user registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.userGrowth.slice(-6).map((data, index) => (
                <div key={data.month} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{data.month}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max((data.users / Math.max(...stats.userGrowth.map(d => d.users))) * 100, 5)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium min-w-[2rem] text-right">{data.users}</span>
                    {data.change !== 0 && (
                      <div className={`flex items-center text-xs ${data.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
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

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-purple-600" />
            <span>Recent Users</span>
          </CardTitle>
          <CardDescription>Recently registered users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {user.name ? user.name.split(' ').map(n => n[0]).join('') : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Badge className={user.role === 'LEADER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>
                    {user.role}
                  </Badge>
                  {user.hierarchyLevel && (
                    <Badge variant="outline">
                      {user.hierarchyLevel}
                    </Badge>
                  )}
                  <div className="text-right">
                    <div className="font-medium">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                    <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}