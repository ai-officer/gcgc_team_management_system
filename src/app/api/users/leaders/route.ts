import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { getRequestSession } from '@/lib/api-auth'
import { pickPublicFieldsList } from '@/lib/public-projection'

// Fields safe to expose to UNauthenticated callers (the public registration
// form needs the leader roster to pick a "reports to" target). Excludes email
// and any contact PII — those are only returned to authenticated callers.
const PUBLIC_LEADER_FIELDS = [
  'id', 'firstName', 'lastName', 'name', 'role', 'hierarchyLevel',
  'division', 'department', 'section', 'team', 'positionTitle', 'isLeader', 'image',
] as const

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

    // Anonymous callers (registration form) get a PII-free projection; only
    // authenticated callers receive emails.
    const session = await getRequestSession(request)
    const data = session?.user
      ? leaders
      : pickPublicFieldsList(leaders as unknown as Record<string, unknown>[], [...PUBLIC_LEADER_FIELDS])

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error fetching leaders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaders' },
      { status: 500 }
    )
  }
}
