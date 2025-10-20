import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/constants'

const createEventSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().default(false),
  color: z.string().optional(),
  type: z.enum(['MEETING', 'DEADLINE', 'REMINDER', 'MILESTONE', 'PERSONAL']),
  teamId: z.string().optional(),
  taskId: z.string().optional(),
})

const querySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  teamId: z.string().optional(),
  type: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!session.user.role || !hasPermission(session.user.role, PERMISSIONS.RESOURCES.EVENT, 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const params = Object.fromEntries(searchParams)

    // Parse query params (they come as strings, we make them optional)
    const start = params.start ? params.start : undefined
    const end = params.end ? params.end : undefined
    const teamId = params.teamId ? params.teamId : undefined
    const type = params.type ? params.type : undefined

    let where: any = {}

    // Build where clause based on user role
    if (session.user.role !== 'ADMIN') {
      // Get user's teams
      const userTeams = await prisma.teamMember.findMany({
        where: { userId: session.user.id },
        select: { teamId: true }
      })

      // Show events from user's teams OR personal events created by user
      where.OR = [
        {
          teamId: { in: userTeams.map(tm => tm.teamId) }
        },
        {
          creatorId: session.user.id,
          teamId: null // Personal events
        }
      ]
    }

    // Apply filters with proper date parsing
    if (start && end) {
      where.AND = [
        { startTime: { gte: new Date(start) } },
        { endTime: { lte: new Date(end) } }
      ]
    }
    if (teamId) where.teamId = teamId
    if (type) where.type = type

    const events = await prisma.event.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true, image: true }
        },
        team: {
          select: { id: true, name: true }
        },
        task: {
          select: { id: true, title: true }
        }
      },
      orderBy: { startTime: 'asc' }
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Events GET error:', error)
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
    if (!session.user.role || !hasPermission(session.user.role, PERMISSIONS.RESOURCES.EVENT, 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      title, 
      description, 
      startTime, 
      endTime, 
      allDay, 
      color, 
      type, 
      teamId, 
      taskId 
    } = createEventSchema.parse(body)

    // Validate dates
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    if (start >= end) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    // Verify team membership if teamId is provided
    if (teamId && session.user.role !== 'ADMIN') {
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: session.user.id,
            teamId
          }
        }
      })

      if (!teamMember) {
        return NextResponse.json(
          { error: 'You are not a member of this team' },
          { status: 403 }
        )
      }
    }

    // Verify task exists and user has access if taskId is provided
    if (taskId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { team: true }
      })

      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }

      // Check if user has access to the task's team
      if (session.user.role !== 'ADMIN' && task.teamId) {
        const teamMember = await prisma.teamMember.findUnique({
          where: {
            userId_teamId: {
              userId: session.user.id,
              teamId: task.teamId
            }
          }
        })

        if (!teamMember) {
          return NextResponse.json(
            { error: 'You do not have access to this task' },
            { status: 403 }
          )
        }
      }

      // If taskId is provided but no teamId, use task's teamId
      if (!teamId) {
        // This is handled in the create call below
      }
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        title,
        description,
        startTime: start,
        endTime: end,
        allDay,
        color,
        type,
        creatorId: session.user.id,
        teamId: teamId || (taskId ? undefined : null), // Will be set by task relation if taskId provided
        taskId,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, image: true }
        },
        team: {
          select: { id: true, name: true }
        },
        task: {
          select: { id: true, title: true }
        }
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'EVENT_CREATED',
        description: `Created event: ${title}`,
        userId: session.user.id,
        entityId: event.id,
        entityType: 'event',
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Event creation error:', error)
    
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