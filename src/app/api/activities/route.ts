import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { activityScopeUserIds } from '@/lib/activity-scope'

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '40', 10) || 40, 100)

  const reports = await prisma.user.findMany({
    where: { reportsToId: session.user.id },
    select: { id: true },
  })
  const scope = activityScopeUserIds(
    { id: session.user.id, role: session.user.role },
    reports.map(r => r.id)
  )

  const activities = await prisma.activity.findMany({
    where: scope === null ? {} : { userId: { in: scope } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true, type: true, description: true, entityType: true, entityId: true, createdAt: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  })

  return NextResponse.json({ activities })
}
