import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
})

const teamInclude = {
  members: {
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
  },
  board: { select: { id: true, name: true, color: true } },
  _count: { select: { members: true, tasks: true } },
}

// GET /api/user/teams — teams the current user belongs to (any role).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teams = await prisma.team.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: teamInclude,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ teams })
}

// POST /api/user/teams — any authenticated user can create a team; they become its first LEADER.
// Atomically creates the Team, the owner's LEADER membership, and the team's board.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, description, color } = createTeamSchema.parse(await req.json())

    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerId: session.user.id,
        members: { create: { userId: session.user.id, role: 'LEADER' } },
        board: { create: { name, color, ownerId: session.user.id } },
      },
      include: teamInclude,
    })

    await prisma.activity.create({
      data: {
        type: 'TEAM_JOINED',
        description: `Created team: ${name}`,
        userId: session.user.id,
        entityId: team.id,
        entityType: 'team',
      },
    })

    return NextResponse.json({ team }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('User teams POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
