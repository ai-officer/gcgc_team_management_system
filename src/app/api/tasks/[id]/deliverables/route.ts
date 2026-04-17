import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createDeliverableSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional(),
})

// GET /api/tasks/[id]/deliverables
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deliverables = await prisma.taskDeliverable.findMany({
      where: { taskId: params.id },
      include: {
        submittedBy: { select: { id: true, name: true, email: true, image: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ deliverables })
  } catch (error) {
    console.error('Error fetching deliverables:', error)
    return NextResponse.json({ error: 'Failed to fetch deliverables' }, { status: 500 })
  }
}

// POST /api/tasks/[id]/deliverables
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = createDeliverableSchema.parse(body)

    // Only task leaders/creators/admins can add deliverables
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      select: { creatorId: true, assignedById: true }
    })
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const isAuthorized =
      task.creatorId === session.user.id ||
      task.assignedById === session.user.id ||
      session.user.role === 'ADMIN' ||
      session.user.role === 'LEADER'

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Only task leaders and creators can add deliverables' }, { status: 403 })
    }

    const deliverable = await prisma.taskDeliverable.create({
      data: { taskId: params.id, name, description },
      include: {
        submittedBy: { select: { id: true, name: true, email: true, image: true } }
      }
    })

    return NextResponse.json({ deliverable }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error creating deliverable:', error)
    return NextResponse.json({ error: 'Failed to create deliverable' }, { status: 500 })
  }
}
