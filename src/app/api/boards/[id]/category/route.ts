// src/app/api/boards/[id]/category/route.ts
// Per-user board category — a free-text label the current user assigns to a
// board to organize their own switcher. Personal to the caller (stored on BoardPin).
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  category: z.string().trim().max(60).nullable().optional(),
})

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const board = await prisma.kanbanBoard.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { category } = schema.parse(body)
  const value = category && category.length > 0 ? category : null

  await prisma.boardPin.upsert({
    where: { userId_boardId: { userId: session.user.id, boardId: params.id } },
    create: { userId: session.user.id, boardId: params.id, category: value, starred: false },
    update: { category: value },
  })
  return NextResponse.json({ category: value })
}
