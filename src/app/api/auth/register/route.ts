import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole, HierarchyLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  email: z.string().email('Invalid email address').refine(
    (email) => {
      const allowedDomains = ['gmail.com', 'globalofficium.com']
      const domain = email.split('@')[1]?.toLowerCase()
      return allowedDomains.includes(domain)
    },
    { message: 'Email must be @gmail.com or @globalofficium.com' }
  ),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  contactNumber: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === '') return true // Optional field
      return /^09\d{9}$/.test(val) // Must start with 09 and be 11 digits
    },
    { message: 'Contact number must start with 09 and be exactly 11 digits' }
  ),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  reportsToId: z.string().optional(),
  division: z.string().optional(),
  department: z.string().optional(),
  section: z.string().optional(),
  team: z.string().optional(),
  positionTitle: z.string().optional(),
  shortName: z.string().optional(),
  jobLevel: z.string().optional(),
  isLeader: z.boolean(),
  image: z.string().optional(),
  // Enhanced organizational fields
  organizationalPath: z.string().optional(),
  sectorHeadInitials: z.string().optional(),
  customDivision: z.string().optional(),
  customDepartment: z.string().optional(),
  customSection: z.string().optional(),
  customTeam: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validatedData = registerSchema.parse(body)
    
    const {
      firstName,
      lastName,
      middleName,
      email,
      username,
      contactNumber,
      password,
      reportsToId,
      division,
      department,
      section,
      team,
      positionTitle,
      shortName,
      jobLevel,
      isLeader,
      image,
      organizationalPath,
      sectorHeadInitials,
      customDivision,
      customDepartment,
      customSection,
      customTeam
    } = validatedData

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Check if username already exists (if provided)
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      })

      if (existingUsername) {
        return NextResponse.json(
          { success: false, error: 'A user with this username already exists' },
          { status: 409 }
        )
      }
    }

    // Validate reportsTo if provided and isLeader is false
    if (reportsToId && !isLeader) {
      const leader = await prisma.user.findUnique({
        where: { id: reportsToId },
        select: { id: true, role: true, isLeader: true }
      })

      if (!leader) {
        return NextResponse.json(
          { success: false, error: 'Selected leader not found' },
          { status: 400 }
        )
      }

      if (leader.role !== UserRole.LEADER && leader.role !== UserRole.ADMIN && !leader.isLeader) {
        return NextResponse.json(
          { success: false, error: 'Selected user is not a leader' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Determine role based on isLeader checkbox
    const userRole = isLeader ? UserRole.LEADER : UserRole.MEMBER

    // Create full name
    const fullName = `${firstName} ${lastName}`

    // Sync hierarchyLevel with jobLevel if provided and valid
    let hierarchyLevel: HierarchyLevel = HierarchyLevel.RF1 // default
    const validHierarchyLevels = Object.values(HierarchyLevel)
    if (jobLevel && validHierarchyLevels.includes(jobLevel.toUpperCase() as HierarchyLevel)) {
      hierarchyLevel = jobLevel.toUpperCase() as HierarchyLevel
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        middleName,
        name: fullName,
        email,
        username,
        contactNumber,
        password: hashedPassword,
        role: userRole,
        hierarchyLevel: hierarchyLevel, // Synced with jobLevel
        reportsToId: isLeader ? null : (reportsToId || null), // Leaders don't report to anyone initially
        division: customDivision || division,
        department: customDepartment || department,
        section: customSection || section,
        team: customTeam || team,
        positionTitle,
        shortName,
        jobLevel,
        isLeader,
        image,
        isActive: true,
        // Enhanced organizational fields
        organizationalPath,
        sectorHeadInitials,
        customDivision,
        customDepartment,
        customSection,
        customTeam
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        username: true,
        contactNumber: true,
        role: true,
        hierarchyLevel: true,
        division: true,
        department: true,
        section: true,
        team: true,
        positionTitle: true,
        isLeader: true,
        createdAt: true,
        reportsTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'LOGIN', // Using existing enum value for registration
        description: `User ${fullName} registered successfully`,
        userId: user.id,
        entityId: user.id,
        entityType: 'user',
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      data: user
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}