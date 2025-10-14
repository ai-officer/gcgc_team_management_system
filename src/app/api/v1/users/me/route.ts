import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200 })
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        middleName: true,
        name: true,
        contactNumber: true,
        image: true,
        role: true,
        hierarchyLevel: true,
        reportsToId: true,
        division: true,
        department: true,
        section: true,
        team: true,
        positionTitle: true,
        shortName: true,
        jobLevel: true,
        organizationalPath: true,
        sectorHeadInitials: true,
        customDivision: true,
        customDepartment: true,
        customSection: true,
        customTeam: true,
        isLeader: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        reportsTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Add computed fields that TMS-client expects
    const response = {
      ...user,
      tmsUserId: user.id, // TMS-client expects this field
      displayName: user.name || `${user.firstName} ${user.lastName}`.trim(),
      lastSyncedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching current user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}