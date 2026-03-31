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

    // Only leaders (and admins) can view workload
    const role = session.user.role
    if (role !== 'LEADER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    let uniqueUsers: Array<{
      id: string
      name: string | null
      email: string
      image: string | null
      role: string
      positionTitle: string | null
      isActive: boolean
    }>

    if (role === 'ADMIN') {
      // Admins see all active users except themselves
      uniqueUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          id: { not: session.user.id },
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          positionTitle: true,
          isActive: true,
        },
      })
    } else {
      // Leaders: find all teams they belong to (TeamMember.role may be MEMBER even if User.role is LEADER)
      const leaderTeams = await prisma.teamMember.findMany({
        where: { userId: session.user.id },
        select: { teamId: true },
      })

      const teamIds = leaderTeams.map(t => t.teamId)

      if (teamIds.length > 0) {
        // Show all other members in their team(s)
        const teamMembers = await prisma.teamMember.findMany({
          where: {
            teamId: { in: teamIds },
            userId: { not: session.user.id },
          },
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                positionTitle: true,
                isActive: true,
              },
            },
          },
        })
        uniqueUsers = Array.from(
          new Map(teamMembers.map(tm => [tm.userId, tm.user])).values()
        ).filter(u => u.isActive)
      } else {
        // Fallback: leader has no TeamMember records — show all active MEMBER-role users
        uniqueUsers = await prisma.user.findMany({
          where: {
            isActive: true,
            role: 'MEMBER',
            id: { not: session.user.id },
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            positionTitle: true,
            isActive: true,
          },
        })
      }
    }

    if (uniqueUsers.length === 0) {
      return NextResponse.json({ workload: [] })
    }

    const memberIds = uniqueUsers.map(u => u.id)

    // Get task counts grouped by assignee and status for these members only
    const taskGroups = await prisma.task.groupBy({
      by: ['assigneeId', 'status'],
      where: {
        isRecurring: false,
        assigneeId: { in: memberIds },
        status: { notIn: ['CANCELLED'] },
      },
      _count: { id: true },
    })

    // Get overdue task counts for these members
    const overdueCounts = await prisma.task.groupBy({
      by: ['assigneeId'],
      where: {
        isRecurring: false,
        assigneeId: { in: memberIds },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: startOfToday },
      },
      _count: { id: true },
    })

    const overdueMap = new Map(
      overdueCounts.map(r => [r.assigneeId, r._count.id])
    )

    // Build per-user stats
    const workload = uniqueUsers.map(user => {
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

    // Sort: overdue first, then by active task count
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
