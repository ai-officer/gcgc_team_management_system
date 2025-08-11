import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeAdmins = searchParams.get('includeAdmins') === 'true'
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    const roles = includeAdmins 
      ? [UserRole.LEADER, UserRole.ADMIN]
      : [UserRole.LEADER]

    const where: any = {
      OR: [
        {
          role: {
            in: roles
          }
        },
        {
          isLeader: true // Also include users marked as leaders via the isLeader flag
        }
      ]
    }

    if (!includeInactive) {
      where.isActive = true
    }

    const leaders = await prisma.user.findMany({
      where,
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
        isLeader: true,
        image: true
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
