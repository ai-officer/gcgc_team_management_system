// src/app/api/boards/[id]/star/route.ts
// Per-user board star/unstar. Starring is personal — it only affects the
// caller's switcher, so any authenticated user may star a board they can see.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const board = await prisma.kanbanBoard.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 })

  await prisma.boardPin.upsert({
    where: { userId_boardId: { userId: session.user.id, boardId: params.id } },
    create: { userId: session.user.id, boardId: params.id, starred: true },
    update: { starred: true },
  })
  return NextResponse.json({ starred: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Keep the row (it may hold a category); just clear the star.
  await prisma.boardPin.upsert({
    where: { userId_boardId: { userId: session.user.id, boardId: params.id } },
    create: { userId: session.user.id, boardId: params.id, starred: false },
    update: { starred: false },
  })
  return NextResponse.json({ starred: false })
}
