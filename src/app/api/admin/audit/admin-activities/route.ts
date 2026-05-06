import { NextRequest, NextResponse } from 'next/server'
import { Prisma, AdminActionType, AdminActionStatus } from '@prisma/client'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '25'))
    const skip = (page - 1) * limit
    const action = searchParams.get('action') || ''
    const status = searchParams.get('status') || ''
    const adminId = searchParams.get('adminId') || ''
    const search = searchParams.get('search') || ''
    const dateRange = searchParams.get('dateRange') || 'all'

    const now = new Date()
    const dateFilter: { gte?: Date } = {}
    if (dateRange === 'today') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (dateRange === 'week') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      dateFilter.gte = d
    } else if (dateRange === 'month') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const where: Prisma.AdminActivityWhereInput = {}
    if (action && Object.values(AdminActionType).includes(action as AdminActionType)) {
      where.action = action as AdminActionType
    }
    if (status && Object.values(AdminActionStatus).includes(status as AdminActionStatus)) {
      where.status = status as AdminActionStatus
    }
    if (adminId) where.adminId = adminId
    if (dateFilter.gte) where.createdAt = dateFilter
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { adminUsername: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [activities, total, todayCount, totalCount, failureCount, actionBreakdown] =
      await Promise.all([
        prisma.adminActivity.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            admin: { select: { id: true, username: true, isActive: true } },
          },
        }),
        prisma.adminActivity.count({ where }),
        prisma.adminActivity.count({
          where: {
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            },
          },
        }),
        prisma.adminActivity.count(),
        prisma.adminActivity.count({
          where: {
            status: AdminActionStatus.FAILURE,
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
            },
          },
        }),
        prisma.adminActivity.groupBy({
          by: ['action'],
          _count: { action: true },
        }),
      ])

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
        failureCount24h: failureCount,
        actionBreakdown: actionBreakdown.map(t => ({
          action: t.action,
          count: t._count.action,
        })),
      },
    })
  } catch (error) {
    console.error('Admin audit log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
