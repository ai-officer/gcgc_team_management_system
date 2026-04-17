import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  memberIds: z.array(z.string()).optional(),
})

const memberInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, image: true, role: true } },
    },
  },
  _count: { select: { tasks: true } },
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const boards = await prisma.kanbanBoard.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      ...memberInclude,
      owner: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ boards })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { memberIds, ...data } = createSchema.parse(body)

    const board = await prisma.kanbanBoard.create({
      data: {
        ...data,
        ownerId: session.user.id,
        ...(memberIds && memberIds.length > 0
          ? { members: { create: memberIds.map(userId => ({ userId })) } }
          : {}),
      },
      include: {
        ...memberInclude,
        owner: { select: { id: true, name: true, email: true, image: true } },
      },
    })
    return NextResponse.json({ board }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Boards POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
