import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.role) {
      return NextResponse.json({ error: 'User role is required' }, { status: 403 })
    }

    const userId = session.user.id

    // Get user's teams
    const userTeams = await prisma.teamMember.findMany({
      where: { userId },
      include: { 
        team: { 
          select: { id: true, name: true } 
        } 
      }
    })

    const teamIds = userTeams.map(tm => tm.teamId)

    // Get dashboard statistics
    const [
      myTasks,
      myCompletedTasks,
      teamTasks,
      overdueTasks,
      recentTasks,
      teamMembers,
      upcomingDeadlines
    ] = await Promise.all([
      // My assigned tasks
      prisma.task.count({
        where: {
          assigneeId: userId,
          status: { not: 'COMPLETED' }
        }
      }),
      
      // My completed tasks this month
      prisma.task.count({
        where: {
          assigneeId: userId,
          status: 'COMPLETED',
          updatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),

      // Team tasks (if leader)
      session.user.role === 'LEADER' ? prisma.task.count({
        where: {
          teamId: { in: teamIds },
          status: { not: 'COMPLETED' }
        }
      }) : 0,

      // Overdue tasks (excluding subtasks - they're managed within parent task)
      prisma.task.count({
        where: {
          OR: [
            { assigneeId: userId },
            ...(session.user.role === 'LEADER' ? [{ teamId: { in: teamIds } }] : [])
          ],
          dueDate: { lt: new Date() },
          status: { not: 'COMPLETED' },
          parentId: null // Only count parent tasks, not subtasks
        }
      }),

      // Recent tasks (last 5)
      prisma.task.findMany({
        where: {
          OR: [
            { assigneeId: userId },
            { creatorId: userId },
            ...(session.user.role === 'LEADER' ? [{ teamId: { in: teamIds } }] : [])
          ]
        },
        include: {
          assignee: {
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              name: true, 
              email: true,
              image: true 
            }
          },
          creator: {
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              name: true, 
              email: true,
              image: true 
            }
          },
          team: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),

      // Team members (if leader)
      session.user.role === 'LEADER' ? prisma.user.findMany({
        where: {
          reportsToId: userId,
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          image: true,
          role: true,
          updatedAt: true
        },
        take: 10
      }) : [],

      // Upcoming deadlines (next 7 days)
      prisma.task.findMany({
        where: {
          OR: [
            { assigneeId: userId },
            ...(session.user.role === 'LEADER' ? [{ teamId: { in: teamIds } }] : [])
          ],
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          status: { not: 'COMPLETED' }
        },
        include: {
          assignee: {
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              name: true, 
              email: true,
              image: true 
            }
          },
          team: {
            select: { id: true, name: true }
          }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      })
    ])

    return NextResponse.json({
      stats: {
        myTasks,
        myCompletedTasks,
        teamTasks,
        overdueTasks,
        teamMembersCount: teamMembers.length
      },
      recentTasks,
      teamMembers,
      upcomingDeadlines,
      teams: userTeams.map(tm => tm.team)
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
