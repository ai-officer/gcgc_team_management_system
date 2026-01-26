import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { canAccessResource } from '@/lib/permissions'
import { PERMISSIONS } from '@/constants'

// Generate a secure random password
function generateSecurePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  
  const allChars = lowercase + uppercase + numbers + symbols
  let password = ''
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional(),
  username: z.string().optional(),
  contactNumber: z.string().optional(),
  positionTitle: z.string().optional(),
  shortName: z.string().optional(),
  division: z.string().optional(),
  department: z.string().optional(),
  section: z.string().optional(),
  team: z.string().optional(),
  jobLevel: z.enum(['RF1', 'RF2', 'RF3', 'OF1', 'OF2', 'M1', 'M2']).default('RF1'),
  password: z.union([z.string().min(6), z.literal(''), z.undefined()]).optional(),
  role: z.enum(['ADMIN', 'LEADER', 'MEMBER']).default('MEMBER'),
  reportsToId: z.string().optional(),
})


export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const teamId = searchParams.get('teamId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Build where clause based on parameters
    const where: any = {}
    
    if (!includeInactive) {
      where.isActive = true
    }

    if (role) {
      where.role = role
    }

    // If teamId is provided, get users who can be assigned to that team
    if (teamId) {
      // Get users who are either:
      // 1. Already in the team
      // 2. Not in any team and available for assignment
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true }
      })
      
      const teamMemberIds = teamMembers.map(tm => tm.userId)
      
      // Get users not in any team or already in this team
      const usersNotInOtherTeams = await prisma.user.findMany({
        where: {
          AND: [
            where,
            {
              OR: [
                { id: { in: teamMemberIds } }, // Already in this team
                { 
                  teamMembers: { none: {} } // Not in any team
                }
              ]
            }
          ]
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
          isActive: true
        },
        orderBy: [
          { name: 'asc' },
          { email: 'asc' }
        ]
      })

      return NextResponse.json({ users: usersNotInOtherTeams }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    }

    // Default: get all users (filtered by parameters)
    const users = await prisma.user.findMany({
      where,
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
        isActive: true
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' }
      ]
    })

    return NextResponse.json({ users }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Users GET error:', error)
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

    // Check permissions - only ADMIN and LEADER can create users
    if (!session.user.role) {
      return NextResponse.json({ error: 'User role is required' }, { status: 403 })
    }
    
    if (!canAccessResource(session.user.role, PERMISSIONS.RESOURCES.USER, 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = createUserSchema.parse(body)

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Verify reportsToId if provided
    if (validatedData.reportsToId) {
      const reportsTo = await prisma.user.findUnique({
        where: { id: validatedData.reportsToId }
      })
      if (!reportsTo) {
        return NextResponse.json(
          { error: 'Invalid reportsToId' },
          { status: 400 }
        )
      }
    }

    // Use default password if none provided or empty string
    const passwordToUse = (validatedData.password && validatedData.password.trim() !== '') 
      ? validatedData.password 
      : 'sogopassword'
    
    // Hash the password
    const hashedPassword = await hash(passwordToUse, 12)


    // Create the user
    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        middleName: validatedData.middleName,
        username: validatedData.username,
        contactNumber: validatedData.contactNumber,
        positionTitle: validatedData.positionTitle,
        shortName: validatedData.shortName,
        division: validatedData.division,
        department: validatedData.department,
        section: validatedData.section,
        customTeam: validatedData.team, // Using customTeam field for team
        jobLevel: validatedData.jobLevel,
        hierarchyLevel: validatedData.jobLevel && ['RF1', 'RF2', 'RF3', 'OF1', 'OF2', 'M1', 'M2'].includes(validatedData.jobLevel) 
          ? validatedData.jobLevel as any 
          : 'RF1', // Default to RF1 if jobLevel is empty or invalid
        password: hashedPassword,
        role: validatedData.role,
        reportsToId: validatedData.reportsToId, // Set the reporting relationship
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        middleName: true,
        username: true,
        image: true,
        role: true,
        hierarchyLevel: true,
        positionTitle: true,
        contactNumber: true,
        shortName: true,
        division: true,
        department: true,
        section: true,
        customTeam: true,
        jobLevel: true,
        isActive: true,
        createdAt: true
      }
    })

    // Log activity (temporarily using TEAM_JOINED since USER_CREATED is not in ActivityType enum)
    try {
      await prisma.activity.create({
        data: {
          type: 'TEAM_JOINED',
          description: `Created new user: ${newUser.name || newUser.email}`,
          userId: session.user.id,
          entityId: newUser.id,
          entityType: 'user',
          metadata: {
            userEmail: newUser.email,
            userRole: newUser.role,
            action: 'USER_CREATED'
          },
        }
      })
    } catch (activityError) {
      console.warn('Failed to log activity:', activityError)
      // Don't fail user creation if activity logging fails
    }

    // Return user data with temporary password info (only for creation)
    return NextResponse.json({
      ...newUser,
      temporaryPassword: passwordToUse // Include the generated password for initial setup
    }, { status: 201 })
  } catch (error) {
    console.error('User creation error:', error)
    
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

