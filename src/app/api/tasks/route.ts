import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/constants'

const createTaskSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED']).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  taskType: z.enum(['INDIVIDUAL', 'TEAM', 'COLLABORATION']),
  assigneeId: z.string().nullish(), // Always current user
  teamMemberIds: z.array(z.string()).default([]),
  collaboratorIds: z.array(z.string()).default([]),
  assignedById: z.string().optional(),
})

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  search: z.string().optional(),
  userId: z.string().optional(), // Filter by user involved in task
  excludeCreator: z.string().optional(), // Exclude tasks created by this user
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user.role, PERMISSIONS.RESOURCES.TASK, 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const {
      page,
      limit,
      status,
      priority,
      assigneeId,
      teamId,
      search,
      userId,
      excludeCreator
    } = querySchema.parse(Object.fromEntries(searchParams))

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const skip = (pageNum - 1) * limitNum

    // Build where clause based on user role
    let where: any = {}

    // Admin can see all tasks, others see tasks they're involved in
    if (session.user.role !== 'ADMIN') {
      // Get user's teams
      const userTeams = await prisma.teamMember.findMany({
        where: { userId: session.user.id },
        select: { teamId: true }
      })
      
      // Include tasks where user is:
      // 1. Part of a team (teamId in userTeams) 
      // 2. Assignee (individual/collaboration tasks)
      // 3. Creator of the task
      // 4. Team member or collaborator
      const teamIds = userTeams.map(tm => tm.teamId)
      
      where.OR = [
        // Team tasks where user is a team member (only if user has teams)
        ...(teamIds.length > 0 ? [{
          teamId: {
            in: teamIds
          }
        }] : []),
        // Tasks assigned to the user
        {
          assigneeId: session.user.id
        },
        // Tasks created by the user
        {
          creatorId: session.user.id
        },
        // Tasks where user is a team member (for TEAM type tasks)
        {
          teamMembers: {
            some: {
              userId: session.user.id
            }
          }
        },
        // Tasks where user is a collaborator (for COLLABORATION type tasks)
        {
          collaborators: {
            some: {
              userId: session.user.id
            }
          }
        }
      ]
    }

    // Apply filters
    if (status) {
      // Handle comma-separated status values
      const statusValues = status.split(',').map(s => s.trim())
      if (statusValues.length === 1) {
        where.status = statusValues[0]
      } else {
        where.status = { in: statusValues }
      }
    }
    if (priority) where.priority = priority
    if (assigneeId) where.assigneeId = assigneeId
    if (teamId) where.teamId = teamId
    if (excludeCreator) {
      where.NOT = { creatorId: excludeCreator }
    }
    
    // Filter by specific user involvement
    if (userId) {
      const userFilterConditions = [
        { assigneeId: userId },
        { creatorId: userId },
        { assignedById: userId },
        {
          teamMembers: {
            some: { userId: userId }
          }
        },
        {
          collaborators: {
            some: { userId: userId }
          }
        }
      ]

      // Merge with existing OR conditions if any
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: userFilterConditions }
        ]
        delete where.OR
      } else {
        where.OR = userFilterConditions
      }
    }
    
    // Handle search - merge with existing OR conditions
    if (search) {
      const searchConditions = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        // Search in user names (assignee, creator, team members, collaborators)
        {
          assignee: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          }
        },
        {
          creator: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          }
        },
        {
          teamMembers: {
            some: {
              user: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          }
        },
        {
          collaborators: {
            some: {
              user: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          }
        }
      ]

      // Handle multiple AND conditions
      if (where.AND) {
        where.AND.push({ OR: searchConditions })
      } else if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ]
        delete where.OR
      } else {
        where.OR = searchConditions
      }
    }

    // Get tasks with relations
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: { 
              id: true, 
              firstName: true,
              lastName: true,
              name: true, 
              email: true, 
              image: true,
              role: true,
              hierarchyLevel: true
            }
          },
          creator: {
            select: { 
              id: true, 
              firstName: true,
              lastName: true,
              name: true, 
              email: true, 
              image: true,
              role: true,
              hierarchyLevel: true
            }
          },
          assignedBy: {
            select: { 
              id: true, 
              firstName: true,
              lastName: true,
              name: true, 
              email: true, 
              image: true,
              role: true,
              hierarchyLevel: true
            }
          },
          team: {
            select: { id: true, name: true }
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          },
          _count: {
            select: { comments: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.task.count({ where })
    ])

    return NextResponse.json({
      tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Tasks GET error:', error)
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

    // Check permissions
    if (!hasPermission(session.user.role, PERMISSIONS.RESOURCES.TASK, 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      title, 
      description, 
      priority, 
      dueDate,
      startDate,
      status,
      progressPercentage,
      taskType,
      assigneeId, 
      teamMemberIds,
      collaboratorIds,
      assignedById
    } = createTaskSchema.parse(body)

    // No team membership verification needed since we're selecting from all users

    // Verify assignee exists (if provided)
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId }
      })

      if (!assignee) {
        return NextResponse.json(
          { error: 'Assignee not found' },
          { status: 400 }
        )
      }
    }

    // Create task with transaction for related data
    const task = await prisma.$transaction(async (tx) => {
      // Create the task
      const newTask = await tx.task.create({
        data: {
          title,
          description,
          priority,
          status: status || 'TODO',
          progressPercentage: progressPercentage || 0,
          taskType,
          dueDate: dueDate ? new Date(dueDate) : null,
          startDate: startDate ? new Date(startDate) : null,
          assigneeId: assigneeId || session.user.id, // Default to current user
          creatorId: session.user.id,
          teamId: null, // No longer using teams
          assignedById: assignedById || session.user.id,
        },
      })

      // Add team members if this is a team task
      if (taskType === 'TEAM' && teamMemberIds.length > 0) {
        const teamMemberData = teamMemberIds.map(userId => ({
          taskId: newTask.id,
          userId,
          role: 'MEMBER', // All are members, current user is the leader by default
        }))

        await tx.taskTeamMember.createMany({
          data: teamMemberData,
        })
      }

      // Add collaborators if this is a collaboration task
      if (taskType === 'COLLABORATION' && collaboratorIds.length > 0) {
        const collaboratorData = collaboratorIds.map(userId => ({
          taskId: newTask.id,
          userId,
        }))

        await tx.taskCollaborator.createMany({
          data: collaboratorData,
        })
      }

      // Return task with all relations
      return await tx.task.findUnique({
        where: { id: newTask.id },
        include: {
          assignee: {
            select: { 
              id: true, 
              firstName: true,
              lastName: true,
              name: true, 
              email: true, 
              image: true,
              role: true,
              hierarchyLevel: true
            }
          },
          creator: {
            select: { 
              id: true, 
              firstName: true,
              lastName: true,
              name: true, 
              email: true, 
              image: true,
              role: true,
              hierarchyLevel: true
            }
          },
          assignedBy: {
            select: { 
              id: true, 
              firstName: true,
              lastName: true,
              name: true, 
              email: true, 
              image: true,
              role: true,
              hierarchyLevel: true
            }
          },
          team: {
            select: { id: true, name: true }
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          }
        }
      })
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'TASK_CREATED',
        description: `Created task: ${title}`,
        userId: session.user.id,
        entityId: task.id,
        entityType: 'task',
      }
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Task creation error:', error)
    
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