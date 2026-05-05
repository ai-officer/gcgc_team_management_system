import { NextRequest, NextResponse } from 'next/server'
import { Prisma, AdminActionType, AdminActionStatus } from '@prisma/client'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { rowsToCsv, csvFilename, type CsvColumn } from '@/lib/csv-export'

const MAX_EXPORT_ROWS = 10_000

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
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

    const activities = await prisma.adminActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
    })

    type Row = (typeof activities)[number]
    const columns: CsvColumn<Row>[] = [
      { key: 'createdAt', header: 'Timestamp', value: r => r.createdAt.toISOString() },
      { key: 'action', header: 'Action', value: r => r.action },
      { key: 'status', header: 'Status', value: r => r.status },
      { key: 'adminUsername', header: 'Admin', value: r => r.adminUsername ?? '' },
      { key: 'description', header: 'Description', value: r => r.description },
      { key: 'targetType', header: 'Target Type', value: r => r.targetType ?? '' },
      { key: 'targetId', header: 'Target ID', value: r => r.targetId ?? '' },
      { key: 'ipAddress', header: 'IP Address', value: r => r.ipAddress ?? '' },
      { key: 'userAgent', header: 'User Agent', value: r => r.userAgent ?? '' },
      { key: 'metadata', header: 'Metadata', value: r => r.metadata ? JSON.stringify(r.metadata) : '' },
    ]

    const csv = rowsToCsv(activities, columns)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFilename('admin-audit')}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Admin audit log export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
