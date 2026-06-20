import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageBoard } from '@/lib/board-statuses'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  category: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  position: z.number().int().min(0).optional(),
})

// PATCH — rename / recolor / reorder / re-categorize a status.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; statusId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canManageBoard(prisma, session.user.id, session.user.role, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.boardStatus.findFirst({
    where: { id: params.statusId, boardId: params.id },
  })
  if (!existing) return NextResponse.json({ error: 'Status not found' }, { status: 404 })

  try {
    const data = updateSchema.parse(await req.json())

    // Default statuses must keep their category (they anchor the fallback bucketing).
    if (data.category && data.category !== existing.category && existing.isDefault) {
      return NextResponse.json({ error: "A default status's category can't be changed." }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.boardStatus.update({
        where: { id: params.statusId },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
          ...(data.position !== undefined ? { position: data.position } : {}),
          ...(data.category !== undefined ? { category: data.category } : {}),
        },
      })
      // Re-categorizing a custom status: re-sync the category on its tasks so
      // completion gating / progress / overdue stay correct.
      if (data.category && data.category !== existing.category) {
        await tx.task.updateMany({
          where: { customStatusId: params.statusId },
          data: { status: data.category },
        })
      }
      return updated
    })

    return NextResponse.json({ status: result })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A status with that name already exists on this board.' }, { status: 409 })
    }
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid status data.' }, { status: 400 })
    }
    console.error('Update board status error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

// DELETE — remove a custom status. Defaults can't be deleted (a category needs
// its default column for fallback bucketing). Tasks on a deleted status have
// customStatusId set null (FK) and fall back to their category's default column.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; statusId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canManageBoard(prisma, session.user.id, session.user.role, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.boardStatus.findFirst({
    where: { id: params.statusId, boardId: params.id },
  })
  if (!existing) return NextResponse.json({ error: 'Status not found' }, { status: 404 })
  if (existing.isDefault) {
    return NextResponse.json({ error: "Default statuses can't be deleted." }, { status: 400 })
  }

  await prisma.boardStatus.delete({ where: { id: params.statusId } })
  return NextResponse.json({ ok: true })
}
