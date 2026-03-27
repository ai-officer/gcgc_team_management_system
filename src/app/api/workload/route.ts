import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Get all active users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        positionTitle: true,
      },
      orderBy: { name: 'asc' },
    })

    // Get task counts grouped by assignee and status
    const taskGroups = await prisma.task.groupBy({
      by: ['assigneeId', 'status'],
      where: {
        isRecurring: false,
        assigneeId: { not: null },
        status: { notIn: ['CANCELLED'] },
      },
      _count: { id: true },
    })

    // Get overdue task counts per user
    const overdueCounts = await prisma.task.groupBy({
      by: ['assigneeId'],
      where: {
        isRecurring: false,
        assigneeId: { not: null },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: now },
      },
      _count: { id: true },
    })

    const overdueMap = new Map(
      overdueCounts.map(r => [r.assigneeId, r._count.id])
    )

    // Build per-user stats
    const workload = users.map(user => {
      const userGroups = taskGroups.filter(g => g.assigneeId === user.id)
      const byStatus: Record<string, number> = {}
      let total = 0
      for (const g of userGroups) {
        byStatus[g.status] = g._count.id
        total += g._count.id
      }
      return {
        ...user,
        tasks: {
          total,
          todo: byStatus['TODO'] || 0,
          inProgress: byStatus['IN_PROGRESS'] || 0,
          inReview: byStatus['IN_REVIEW'] || 0,
          completed: byStatus['COMPLETED'] || 0,
          overdue: overdueMap.get(user.id) || 0,
        },
      }
    })

    // Sort: users with overdue tasks first, then by active task count
    workload.sort((a, b) => {
      if (b.tasks.overdue !== a.tasks.overdue) return b.tasks.overdue - a.tasks.overdue
      const aActive = a.tasks.todo + a.tasks.inProgress + a.tasks.inReview
      const bActive = b.tasks.todo + b.tasks.inProgress + b.tasks.inReview
      return bActive - aActive
    })

    return NextResponse.json({ workload })
  } catch (error) {
    console.error('Workload API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
