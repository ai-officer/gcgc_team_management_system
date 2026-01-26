import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional(),
  contactNumber: z.string().optional(),
  positionTitle: z.string().optional(),
  division: z.string().optional(),
  department: z.string().optional(),
  section: z.string().optional(),
  team: z.string().optional(),
  jobLevel: z.string().optional(),
  hierarchyLevel: z.enum(['RF1', 'RF2', 'RF3', 'OF1', 'OF2', 'OF3', 'OF4', 'OF5', 'NR1', 'NR2', 'NR3', 'NR4']).nullable().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Users can only access their own profile unless they're an admin
    if (session.user.id !== params.id && (!session.user.role || session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
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

    // Add cache-control headers to prevent caching of dynamic user data
    return NextResponse.json(user, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Users can only update their own profile unless they're an admin
    if (session.user.id !== params.id && (!session.user.role || session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = updateProfileSchema.parse(body)

    // Get current user data to compute full name
    let computedName: string | null = null
    if (validatedData.firstName !== undefined || validatedData.lastName !== undefined) {
      const currentUser = await prisma.user.findUnique({
        where: { id: params.id },
        select: { firstName: true, lastName: true }
      })

      if (currentUser) {
        const firstName = validatedData.firstName ?? currentUser.firstName ?? ''
        const lastName = validatedData.lastName ?? currentUser.lastName ?? ''
        computedName = [firstName, lastName].filter(Boolean).join(' ') || null
      }
    }

    // Update the user profile
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        // Compute the name field if firstName or lastName are provided
        ...(computedName !== null ? { name: computedName } : {}),
      },
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

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
