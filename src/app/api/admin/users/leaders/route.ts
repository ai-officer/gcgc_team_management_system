import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeAdmins = searchParams.get('includeAdmins') === 'true'
    
    const roles = includeAdmins 
      ? [UserRole.LEADER, UserRole.ADMIN]
      : [UserRole.LEADER]

    const leaders = await prisma.user.findMany({
      where: {
        role: {
          in: roles
        },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        hierarchyLevel: true,
        division: true,
        department: true,
        section: true,
        team: true,
        positionTitle: true,
        image: true,
        _count: {
          select: {
            subordinates: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { hierarchyLevel: 'desc' },
        { firstName: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: leaders
    })
  } catch (error) {
    console.error('Error fetching leaders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaders' },
      { status: 500 }
    )
  }
}
