import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const patchSchema = z.object({
  recurringFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  recurringInterval: z.number().int().min(1).optional(),
  recurringDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  // string → set date; null → indefinite; undefined → don't change
  recurringEndDate: z.string().nullable().optional(),
  stop: z.boolean().optional(),
})

/** Resolve the recurring template from a task id.
 *  - If the task is an instance  (recurringParentId != null) → parent is template
 *  - If the task is a template   (isRecurring == true)       → task itself
 *  Returns null if neither.
 */
async function resolveTemplate(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      isRecurring: true,
      recurringParentId: true,
      creatorId: true,
      assignedById: true,
      teamId: true,
    },
  })
  if (!task) return { task: null, template: null }

  if (task.recurringParentId) {
    // This is an instance — load its template
    const template = await prisma.task.findUnique({
      where: { id: task.recurringParentId },
      select: {
        id: true,
        recurringFrequency: true,
        recurringInterval: true,
        recurringDaysOfWeek: true,
        recurringEndDate: true,
        startDate: true,
        creatorId: true,
        assignedById: true,
        teamId: true,
      },
    })
    return { task, template }
  }

  if (task.isRecurring) {
    // This task IS the template
    const template = await prisma.task.findUnique({
      where: { id: task.id },
      select: {
        id: true,
        recurringFrequency: true,
        recurringInterval: true,
        recurringDaysOfWeek: true,
        recurringEndDate: true,
        startDate: true,
        creatorId: true,
        assignedById: true,
        teamId: true,
      },
    })
    return { task, template }
  }

  return { task, template: null }
}

/** Auth check mirrors the pattern in /api/tasks/[id]/route.ts PATCH:
 *  ADMIN passes always; otherwise must be creator, assigner, or LEADER in the task's team.
 */
async function canManageRecurrence(
  sessionUserId: string,
  sessionUserRole: string | undefined,
  creatorId: string,
  assignedById: string | null,
  teamId: string | null
): Promise<boolean> {
  if (sessionUserRole === 'ADMIN') return true
  if (creatorId === sessionUserId) return true
  if (assignedById === sessionUserId) return true

  if (sessionUserRole === 'LEADER' && teamId) {
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: sessionUserId, teamId } },
    })
    if (teamMember?.role === 'LEADER') return true
  }

  return false
}

function templateToResponse(t: {
  id: string
  recurringFrequency: string | null
  recurringInterval: number | null
  recurringDaysOfWeek: number[]
  recurringEndDate: Date | null
  startDate: Date | null
}) {
  const now = new Date()
  const stopped = !!t.recurringEndDate && t.recurringEndDate <= now
  return {
    id: t.id,
    recurringFrequency: t.recurringFrequency,
    recurringInterval: t.recurringInterval,
    recurringDaysOfWeek: t.recurringDaysOfWeek,
    recurringEndDate: t.recurringEndDate ? t.recurringEndDate.toISOString() : null,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    stopped,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getRequestSession(req)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { task, template } = await resolveTemplate(params.id)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (!template) {
      return NextResponse.json({ error: 'Not a recurring task' }, { status: 404 })
    }

    const allowed = await canManageRecurrence(
      session.user.id,
      session.user.role,
      template.creatorId,
      template.assignedById,
      template.teamId
    )
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(templateToResponse(template))
  } catch (error) {
    console.error('Recurring GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getRequestSession(req)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { task, template } = await resolveTemplate(params.id)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (!template) {
      return NextResponse.json({ error: 'Not a recurring task' }, { status: 404 })
    }

    const allowed = await canManageRecurrence(
      session.user.id,
      session.user.role,
      template.creatorId,
      template.assignedById,
      template.teamId
    )
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = patchSchema.parse(body)

    // Build update payload
    const updateData: {
      recurringFrequency?: string
      recurringInterval?: number
      recurringDaysOfWeek?: number[]
      recurringEndDate?: Date | null
    } = {}

    if (parsed.stop === true) {
      // Stop the series: set end date to now
      updateData.recurringEndDate = new Date()
    } else {
      if (parsed.recurringFrequency !== undefined) {
        updateData.recurringFrequency = parsed.recurringFrequency
      }
      if (parsed.recurringInterval !== undefined) {
        updateData.recurringInterval = parsed.recurringInterval
      }
      if (parsed.recurringDaysOfWeek !== undefined) {
        updateData.recurringDaysOfWeek = parsed.recurringDaysOfWeek
      }
      if (parsed.recurringEndDate !== undefined) {
        // null → indefinite; string → set date
        updateData.recurringEndDate = parsed.recurringEndDate
          ? new Date(parsed.recurringEndDate)
          : null
      }
    }

    const updated = await prisma.task.update({
      where: { id: template.id },
      data: updateData as any,
      select: {
        id: true,
        recurringFrequency: true,
        recurringInterval: true,
        recurringDaysOfWeek: true,
        recurringEndDate: true,
        startDate: true,
      },
    })

    return NextResponse.json(templateToResponse(updated))
  } catch (error) {
    console.error('Recurring PATCH error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
