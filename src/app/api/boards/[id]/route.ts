import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  memberIds: z.array(z.string()).optional(), // full replacement of member list
})

const memberInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, image: true, role: true } },
    },
  },
  _count: { select: { tasks: true } },
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const board = await prisma.kanbanBoard.findFirst({
      where: { id: params.id, ownerId: session.user.id },
    })
    if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const { memberIds, ...data } = updateSchema.parse(body)

    // If memberIds is provided, do a full replacement
    const updated = await prisma.kanbanBoard.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(memberIds !== undefined
          ? {
              members: {
                deleteMany: {},
                create: memberIds.map(userId => ({ userId })),
              },
            }
          : {}),
      },
      include: {
        ...memberInclude,
        owner: { select: { id: true, name: true, email: true, image: true } },
      },
    })
    return NextResponse.json({ board: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Board PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const board = await prisma.kanbanBoard.findFirst({
      where: { id: params.id, ownerId: session.user.id },
    })
    if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.task.updateMany({
      where: { boardId: params.id },
      data: { boardId: null },
    })
    await prisma.kanbanBoard.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Board DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
