import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

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

    // Get team members (users who report to this leader)
    const teamMembers = await prisma.user.findMany({
      where: {
        reportsToId: session.user.id,
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
          dueDate: { lt: new Date() },
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

    if (user.reportsToId) {
      return NextResponse.json({ error: 'User already reports to someone else' }, { status: 400 })
    }

    if (user.id === session.user.id) {
      return NextResponse.json({ error: 'You cannot add yourself as a team member' }, { status: 400 })
    }

    // Update user to report to this leader
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { reportsToId: session.user.id },
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
