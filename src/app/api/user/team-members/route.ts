import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const addMemberSchema = z.object({
  userId: z.string().min(1)
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.role || session.user.role !== 'LEADER') {
      return NextResponse.json({ error: 'Only leaders can access team data' }, { status: 403 })
    }

    // Get team members via LeaderMembership (supports multi-leader hierarchy)
    const teamMembers = await prisma.user.findMany({
      where: {
        memberOfLeaders: { some: { leaderId: session.user.id } },
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        image: true,
        role: true,
        hierarchyLevel: true,
        contactNumber: true,
        positionTitle: true,
        isActive: true,
        createdAt: true,
        reportsToId: true,
        _count: {
          select: {
            assignedTasks: {
              where: {
                status: { not: 'COMPLETED' }
              }
            }
          }
        }
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' }
      ]
    })

    // Get team statistics
    const memberIds = teamMembers.map(member => member.id)
    
    const [activeTasks, completedTasks, overdueTasks] = await Promise.all([
      // Active tasks assigned to team members
      prisma.task.count({
        where: {
          assigneeId: { in: memberIds },
          status: { not: 'COMPLETED' }
        }
      }),
      
      // Completed tasks this month
      prisma.task.count({
        where: {
          assigneeId: { in: memberIds },
          status: 'COMPLETED',
          updatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      
      // Overdue tasks
      prisma.task.count({
        where: {
          assigneeId: { in: memberIds },
          dueDate: { lt: (() => { const d = new Date(); d.setHours(0,0,0,0); return d })() },
          status: { not: 'COMPLETED' }
        }
      })
    ])

    const stats = {
      totalMembers: teamMembers.length,
      activeTasks,
      completedTasks,
      overdueTasks
    }

    return NextResponse.json({
      members: teamMembers,
      stats
    })
  } catch (error) {
    console.error('Team members GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.role || session.user.role !== 'LEADER') {
      return NextResponse.json({ error: 'Only leaders can add team members' }, { status: 403 })
    }

    const body = await req.json()
    const { userId } = addMemberSchema.parse(body)

    // Check if user exists and is not already assigned to someone
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        image: true,
        role: true,
        reportsToId: true,
        isActive: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'User is not active' }, { status: 400 })
    }

    if (user.id === session.user.id) {
      return NextResponse.json({ error: 'You cannot add yourself as a team member' }, { status: 400 })
    }

    // Check if already in this leader's team
    const existingMembership = await prisma.leaderMembership.findUnique({
      where: { leaderId_memberId: { leaderId: session.user.id, memberId: userId } }
    })
    if (existingMembership) {
      return NextResponse.json({ error: 'User is already in your team' }, { status: 400 })
    }

    // Create LeaderMembership; also set reportsToId if user has no primary leader yet
    const [, updatedUser] = await prisma.$transaction([
      prisma.leaderMembership.create({
        data: { leaderId: session.user.id, memberId: userId }
      }),
      prisma.user.update({
        where: { id: userId },
        data: { reportsToId: user.reportsToId ?? session.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          image: true,
          role: true,
          hierarchyLevel: true,
          contactNumber: true,
          positionTitle: true,
          isActive: true,
          createdAt: true,
          reportsToId: true,
          _count: {
            select: {
              assignedTasks: {
                where: {
                  status: { not: 'COMPLETED' }
                }
              }
            }
          }
        }
      })
    ])

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'TEAM_JOINED',
        description: `Added ${user.name || user.email} to team`,
        userId: session.user.id,
        entityId: user.id,
        entityType: 'user',
      }
    })

    return NextResponse.json(updatedUser, { status: 201 })
  } catch (error) {
    console.error('Add team member error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
