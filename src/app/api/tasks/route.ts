import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/constants'
import { autoSyncTask } from '@/lib/calendar-sync-helper'

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
  // Subtask support
  parentId: z.string().optional(),
  // New Google Calendar-compatible fields
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  allDay: z.boolean().optional(),
  recurrence: z.string().optional(),
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
  parentId: z.string().optional(), // Filter subtasks by parent task
  includeSubtasks: z.string().optional(), // Include subtasks in results (default: false)
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!session.user.role) {
      return NextResponse.json({ error: 'User role is required' }, { status: 403 })
    }
    
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
      excludeCreator,
      parentId,
      includeSubtasks
    } = querySchema.parse(Object.fromEntries(searchParams))

    const pageNum = parseInt(page)
    const limitNum = Math.min(parseInt(limit), 100)
    const skip = (pageNum - 1) * limitNum

    // Build where clause based on user role
    let where: any = {}

    // Handle subtask filtering
    // Note: We handle this differently for non-admins below to include assigned subtasks
    if (parentId) {
      // Get subtasks of a specific parent
      where.parentId = parentId
    }

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
      
      // For non-admins, show:
      // 1. Top-level tasks they're involved in (parentId = null)
      // 2. Subtasks directly assigned to them (even if parentId is set)
      where.OR = [
        // Subtasks assigned directly to the user (always show these)
        {
          AND: [
            { assigneeId: session.user.id },
            { parentId: { not: null } }
          ]
        },
        // Top-level tasks where user is involved
        {
          AND: [
            // Only top-level tasks (unless includeSubtasks is true)
            ...(includeSubtasks !== 'true' ? [{ parentId: null }] : []),
            {
              OR: [
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
          ]
        }
      ]
    } else {
      // For admins: by default only show top-level tasks unless includeSubtasks is true
      if (includeSubtasks !== 'true' && !parentId) {
        where.parentId = null
      }
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
            select: { comments: true, subtasks: true }
          },
          subtasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              progressPercentage: true,
              dueDate: true,
            },
            orderBy: { createdAt: 'asc' }
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
    if (!session.user.role) {
      return NextResponse.json({ error: 'User role is required' }, { status: 403 })
    }
    
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
      assignedById,
      parentId,
      // New Google Calendar fields
      location,
      meetingLink,
      allDay,
      recurrence,
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

    // Auto-set startDate if not provided but dueDate is (for calendar display)
    const finalDueDate = dueDate ? new Date(dueDate) : null
    const finalStartDate = startDate
      ? new Date(startDate)
      : (finalDueDate ? new Date(finalDueDate) : null) // Auto-set to dueDate if not provided

    // Auto-set status based on progress percentage
    let finalStatus = status
    if (progressPercentage !== undefined && !status) {
      if (progressPercentage === 100) {
        finalStatus = 'COMPLETED'
      } else if (progressPercentage > 90) {
        finalStatus = 'IN_REVIEW'
      } else if (progressPercentage > 0) {
        finalStatus = 'IN_PROGRESS'
      }
    }

    // Create task with transaction for related data
    const task = await prisma.$transaction(async (tx) => {
      // Verify parent task exists if parentId provided
      if (parentId) {
        const parentTask = await tx.task.findUnique({
          where: { id: parentId },
          select: { id: true, creatorId: true }
        })
        if (!parentTask) {
          throw new Error('Parent task not found')
        }
      }

      // Create the task
      const newTask = await tx.task.create({
        data: {
          title,
          description,
          priority,
          status: finalStatus || 'TODO',
          progressPercentage: progressPercentage || 0,
          taskType,
          dueDate: finalDueDate,
          startDate: finalStartDate,
          assigneeId: assigneeId || session.user.id, // Default to current user
          creatorId: session.user.id,
          teamId: null, // No longer using teams
          assignedById: assignedById || session.user.id,
          parentId: parentId || null, // Subtask support
          // New Google Calendar fields
          location: location || null,
          meetingLink: meetingLink || null,
          allDay: allDay || false,
          recurrence: recurrence || null,
        },
      })

      // Add team members if this is a team task
      if (taskType === 'TEAM' && teamMemberIds.length > 0) {
        const teamMemberData = teamMemberIds.map(userId => ({
          taskId: newTask.id,
          userId,
          role: 'MEMBER' as const, // All are members, current user is the leader by default
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
    if (task) {
      await prisma.activity.create({
        data: {
          type: 'TASK_CREATED',
          description: `Created task: ${title}`,
          userId: session.user.id,
          entityId: task.id,
          entityType: 'task',
        }
      })

      // Auto-sync to Google Calendar if enabled
      if (task.dueDate) {
        await autoSyncTask(task.id, session.user.id)
      }
    }

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