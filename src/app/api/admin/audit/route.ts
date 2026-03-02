import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page     = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit    = Math.min(50, parseInt(searchParams.get('limit') || '20'))
    const skip     = (page - 1) * limit
    const type     = searchParams.get('type')      || ''   // ActivityType enum value
    const userId   = searchParams.get('userId')    || ''
    const search   = searchParams.get('search')    || ''
    const dateRange = searchParams.get('dateRange') || 'all' // today | week | month | all

    const now = new Date()
    const dateFilter: Record<string, Date> = {}
    if (dateRange === 'today') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (dateRange === 'week') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      dateFilter.gte = d
    } else if (dateRange === 'month') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const where: any = {}
    if (type)   where.type    = type
    if (userId) where.userId  = userId
    if (Object.keys(dateFilter).length) where.createdAt = dateFilter
    if (search) where.description = { contains: search, mode: 'insensitive' }

    const [activities, total, todayCount, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          }
        }
      }),
      prisma.activity.count({ where }),
      prisma.activity.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        }
      }),
      prisma.activity.count(),
    ])

    // Distinct users who have activities
    const activeUsersResult = await prisma.activity.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 1,
    })

    const topUserId = activeUsersResult[0]?.userId ?? null
    let topUser = null
    if (topUserId) {
      topUser = await prisma.user.findUnique({
        where: { id: topUserId },
        select: { id: true, name: true, email: true }
      })
    }

    // Activity type breakdown for filter counts
    const typeBreakdown = await prisma.activity.groupBy({
      by: ['type'],
      _count: { type: true },
    })

    return NextResponse.json({
      activities: activities.map(a => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
      meta: {
        totalCount,
        todayCount,
        topUser,
        typeBreakdown: typeBreakdown.map(t => ({ type: t.type, count: t._count.type })),
      }
    })
  } catch (error) {
    console.error('Audit trail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
