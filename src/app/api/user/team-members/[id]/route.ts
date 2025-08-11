import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'LEADER') {
      return NextResponse.json({ error: 'Only leaders can access team member details' }, { status: 403 })
    }

    const { id } = params

    // Get detailed team member information with tasks
    const teamMember = await prisma.user.findFirst({
      where: {
        id: id,
        reportsToId: session.user.id, // Ensure this member reports to the current leader
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        name: true,
        image: true,
        role: true,
        hierarchyLevel: true,
        contactNumber: true,
        positionTitle: true,
        username: true,
        shortName: true,
        division: true,
        department: true,
        section: true,
        team: true,
        jobLevel: true,
        isActive: true,
        createdAt: true,
        reportsToId: true,
        assignedTasks: {
          where: {
            status: { not: 'COMPLETED' } // Only get active tasks
          },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            startDate: true,
            progressPercentage: true,
            taskType: true,
            createdAt: true,
            updatedAt: true,
            team: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [
            { dueDate: 'asc' },
            { priority: 'desc' },
            { createdAt: 'desc' }
          ]
        },
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

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Get completed tasks count for this month
    const completedTasksCount = await prisma.task.count({
      where: {
        assigneeId: id,
        status: 'COMPLETED',
        updatedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // This month
        }
      }
    })

    // Add completed tasks count to the response
    const memberWithCompletedCount = {
      ...teamMember,
      _count: {
        ...teamMember._count,
        completedTasks: completedTasksCount
      }
    }

    return NextResponse.json(memberWithCompletedCount)
  } catch (error) {
    console.error('Team member details GET error:', error)
    console.error('Error details:', {
      memberId: params.id,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'LEADER') {
      return NextResponse.json({ error: 'Only leaders can update team members' }, { status: 403 })
    }

    const { id } = params
    const body = await req.json()

    // Verify the member reports to this leader
    const existingMember = await prisma.user.findFirst({
      where: {
        id: id,
        reportsToId: session.user.id,
        isActive: true
      }
    })

    if (!existingMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Update the team member
    const updatedMember = await prisma.user.update({
      where: { id: id },
      data: {
        name: body.name,
        firstName: body.firstName,
        lastName: body.lastName,
        middleName: body.middleName,
        contactNumber: body.contactNumber,
        positionTitle: body.positionTitle,
        shortName: body.shortName,
        username: body.username,
        division: body.division,
        department: body.department,
        section: body.section,
        team: body.team,
        jobLevel: body.jobLevel
      },
      select: {
        id: true,
        name: true,
        email: true,
        firstName: true,
        lastName: true,
        contactNumber: true,
        positionTitle: true,
        isActive: true,
        role: true
      }
    })

    return NextResponse.json(updatedMember)
  } catch (error) {
    console.error('Team member update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'LEADER') {
      return NextResponse.json({ error: 'Only leaders can remove team members' }, { status: 403 })
    }

    const { id } = params

    // Verify the member reports to this leader
    const existingMember = await prisma.user.findFirst({
      where: {
        id: id,
        reportsToId: session.user.id,
        isActive: true
      }
    })

    if (!existingMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Remove the reporting relationship (set reportsToId to null)
    await prisma.user.update({
      where: { id: id },
      data: {
        reportsToId: null
      }
    })

    return NextResponse.json({ message: 'Team member removed successfully' })
  } catch (error) {
    console.error('Team member removal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}