import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current date for calculations
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)

    // Basic user counts
    const [
      totalUsers,
      newUsersThisMonth,
      activeUsers,
      leaderCount,
      memberCount,
      totalTeams,
      totalSections
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: startOfMonth } }
      }),
      prisma.user.count({
        where: { isActive: true }
      }),
      prisma.user.count({
        where: { role: UserRole.LEADER }
      }),
      prisma.user.count({
        where: { role: UserRole.MEMBER }
      }),
      prisma.team.count({
        where: { isActive: true }
      }),
      prisma.section.count({
        where: { isActive: true }
      })
    ])

    // Hierarchy distribution
    const hierarchyData = await prisma.user.groupBy({
      by: ['hierarchyLevel'],
      _count: {
        hierarchyLevel: true
      },
      where: {
        hierarchyLevel: { not: null }
      }
    })

    const hierarchyDistribution = hierarchyData.map(item => ({
      level: item.hierarchyLevel || 'None',
      count: item._count.hierarchyLevel,
      percentage: totalUsers > 0 ? (item._count.hierarchyLevel / totalUsers) * 100 : 0
    }))

    // User growth by month (last 12 months)
    const userGrowth = []
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      
      const usersInMonth = await prisma.user.count({
        where: {
          createdAt: {
            gte: monthDate,
            lt: nextMonth
          }
        }
      })

      // Calculate change from previous month
      let change = 0
      if (userGrowth.length > 0) {
        const prevMonth = userGrowth[userGrowth.length - 1]
        change = usersInMonth - prevMonth.users
      }

      userGrowth.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: usersInMonth,
        change
      })
    }

    // Recent users (last 10)
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hierarchyLevel: true,
        createdAt: true,
        isActive: true
      }
    })

    const stats = {
      totalUsers,
      newUsersThisMonth,
      activeUsers,
      leaderCount,
      memberCount,
      totalTeams,
      totalSections,
      hierarchyDistribution,
      userGrowth,
      recentUsers: recentUsers.map(user => ({
        ...user,
        createdAt: user.createdAt.toISOString()
      }))
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}