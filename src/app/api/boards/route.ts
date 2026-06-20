import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { seedDefaultBoardStatuses } from '@/lib/board-statuses'
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
  statuses: { orderBy: { position: 'asc' as const } },
  fields: { orderBy: { position: 'asc' as const } },
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
        // Team boards: visible to every member of the owning team.
        { team: { members: { some: { userId: session.user.id } } } },
      ],
    },
    include: {
      ...memberInclude,
      owner: { select: { id: true, name: true, email: true, image: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Attach canManage so the client shows the Board Settings gear only to those
  // who can edit: admins, the board owner, or a team LEADER of the board's team.
  const leaderTeams = await prisma.teamMember.findMany({
    where: { userId: session.user.id, role: 'LEADER' },
    select: { teamId: true },
  })
  const leaderTeamIds = new Set(leaderTeams.map((t) => t.teamId))
  const isAdmin = session.user.role === 'ADMIN'
  const withPerms = boards.map((b) => ({
    ...b,
    canManage: isAdmin || b.ownerId === session.user.id || (!!b.teamId && leaderTeamIds.has(b.teamId)),
  }))

  return NextResponse.json({ boards: withPerms })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { memberIds, ...data } = createSchema.parse(body)

    const created = await prisma.kanbanBoard.create({
      data: {
        ...data,
        ownerId: session.user.id,
        ...(memberIds && memberIds.length > 0
          ? { members: { create: memberIds.map(userId => ({ userId })) } }
          : {}),
      },
      select: { id: true },
    })

    // Seed the four default statuses so the new board has columns to work with.
    await seedDefaultBoardStatuses(prisma, created.id)

    const board = await prisma.kanbanBoard.findUnique({
      where: { id: created.id },
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
