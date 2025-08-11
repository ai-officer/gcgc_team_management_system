import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/constants'

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!session.user.role) {
      return NextResponse.json({ error: 'User role is required' }, { status: 403 })
    }
    
    if (!hasPermission(session.user.role, PERMISSIONS.RESOURCES.TEAM, 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let teams

    if (session.user.role === 'ADMIN') {
      // Admin can see all teams
      teams = await prisma.team.findMany({
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          },
          _count: {
            select: { members: true, tasks: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Users can only see teams they're members of
      const userTeamIds = await prisma.teamMember.findMany({
        where: { userId: session.user.id },
        select: { teamId: true }
      })

      teams = await prisma.team.findMany({
        where: {
          id: { in: userTeamIds.map(tm => tm.teamId) }
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          },
          _count: {
            select: { members: true, tasks: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Teams GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions - only admins can create teams
    if (!hasPermission(session.user.role, PERMISSIONS.RESOURCES.TEAM, 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description } = createTeamSchema.parse(body)

    // Check if team name already exists
    const existingTeam = await prisma.team.findFirst({
      where: { 
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    })

    if (existingTeam) {
      return NextResponse.json(
        { error: 'A team with this name already exists' },
        { status: 400 }
      )
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        description,
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        _count: {
          select: { members: true, tasks: true }
        }
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'TEAM_JOINED',
        description: `Created team: ${name}`,
        userId: session.user.id,
        entityId: team.id,
        entityType: 'team',
      }
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Team creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}