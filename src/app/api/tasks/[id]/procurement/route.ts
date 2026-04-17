import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createProcurementSchema = z.object({
  type: z.enum(['PURCHASE_REQUEST', 'PURCHASE_ORDER']),
  referenceNumber: z.string().max(100).optional(),
  amount: z.number().positive().optional(),
  vendor: z.string().max(200).optional(),
  approverName: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
})

// GET /api/tasks/[id]/procurement
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const procurements = await prisma.taskProcurement.findMany({
      where: { taskId: params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, image: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ procurements })
  } catch (error) {
    console.error('Error fetching procurements:', error)
    return NextResponse.json({ error: 'Failed to fetch procurements' }, { status: 500 })
  }
}

// POST /api/tasks/[id]/procurement
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
    const data = createProcurementSchema.parse(body)

    const task = await prisma.task.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const procurement = await prisma.taskProcurement.create({
      data: {
        taskId: params.id,
        createdById: session.user.id,
        ...data,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, image: true } }
      }
    })

    return NextResponse.json({ procurement }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error creating procurement:', error)
    return NextResponse.json({ error: 'Failed to create procurement' }, { status: 500 })
  }
}
