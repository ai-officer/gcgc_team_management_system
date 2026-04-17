import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/tasks/[id]/deliverables/[deliverableId] — toggle isCompleted
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; deliverableId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { isCompleted } = body

    const deliverable = await prisma.taskDeliverable.findUnique({
      where: { id: params.deliverableId }
    })
    if (!deliverable || deliverable.taskId !== params.id) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 })
    }

    const updated = await prisma.taskDeliverable.update({
      where: { id: params.deliverableId },
      data: {
        isCompleted: Boolean(isCompleted),
        completedAt: isCompleted ? new Date() : null,
        submittedById: isCompleted ? session.user.id : null,
      },
      include: {
        submittedBy: { select: { id: true, name: true, email: true, image: true } }
      }
    })

    // If all deliverables are now completed, auto-advance task to IN_REVIEW
    const allDeliverables = await prisma.taskDeliverable.findMany({
      where: { taskId: params.id }
    })
    const allCompleted = allDeliverables.length > 0 && allDeliverables.every(d => d.isCompleted)

    let autoAdvanced = false
    if (allCompleted) {
      const task = await prisma.task.findUnique({
        where: { id: params.id },
        select: { status: true, memberSubmittedAt: true }
      })
      if (task && task.status !== 'IN_REVIEW' && task.status !== 'COMPLETED') {
        await prisma.task.update({
          where: { id: params.id },
          data: {
            status: 'IN_REVIEW',
            memberSubmittedAt: task.memberSubmittedAt ?? new Date(),
          }
        })
        autoAdvanced = true
      }
    }

    return NextResponse.json({ deliverable: updated, autoAdvanced })
  } catch (error) {
    console.error('Error updating deliverable:', error)
    return NextResponse.json({ error: 'Failed to update deliverable' }, { status: 500 })
  }
}

// DELETE /api/tasks/[id]/deliverables/[deliverableId]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; deliverableId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.taskDeliverable.delete({ where: { id: params.deliverableId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deliverable:', error)
    return NextResponse.json({ error: 'Failed to delete deliverable' }, { status: 500 })
  }
}
