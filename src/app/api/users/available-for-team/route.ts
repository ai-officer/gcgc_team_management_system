import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.role || session.user.role !== 'LEADER') {
      return NextResponse.json({ error: 'Only leaders can access this endpoint' }, { status: 403 })
    }

    // Get users who are not reporting to anyone and are not the current leader
    const availableUsers = await prisma.user.findMany({
      where: {
        reportsToId: null,
        isActive: true,
        role: { not: 'ADMIN' }, // Don't include admins
        id: { not: session.user.id } // Don't include self
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        image: true,
        role: true,
        hierarchyLevel: true,
        positionTitle: true,
        createdAt: true
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' }
      ]
    })

    return NextResponse.json({ users: availableUsers })
  } catch (error) {
    console.error('Available users GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
