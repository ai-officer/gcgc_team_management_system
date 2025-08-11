import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { UserRole, HierarchyLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') as UserRole | undefined
    const hierarchyLevel = searchParams.get('hierarchyLevel') as HierarchyLevel | undefined

    const skip = (page - 1) * limit

    const where: any = {
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(role && { role }),
      ...(hierarchyLevel && { hierarchyLevel })
    }

    const users = await prisma.user.findMany({
      where,
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
        isLeader: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        reportsTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        subordinates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        teamMembers: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            assignedTasks: true,
            createdTasks: true,
            subordinates: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    const totalUsers = await prisma.user.count({ where })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      email, 
      username,
      password, 
      firstName,
      lastName,
      middleName,
      contactNumber,
      role, 
      hierarchyLevel,
      reportsToId,
      division,
      department,
      section,
      team,
      positionTitle,
      shortName,
      jobLevel,
      isLeader,
      image
    } = body

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields: email, password, firstName, lastName' }, { status: 400 })
    }

    // Check for existing email
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Check for existing username if provided
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      })

      if (existingUsername) {
        return NextResponse.json({ error: 'User with this username already exists' }, { status: 400 })
      }
    }

    // Validate reportsTo if provided
    if (reportsToId) {
      const leader = await prisma.user.findUnique({
        where: { id: reportsToId },
        select: { id: true, role: true }
      })

      if (!leader) {
        return NextResponse.json({ error: 'Leader not found' }, { status: 400 })
      }

      if (leader.role !== UserRole.LEADER && leader.role !== UserRole.ADMIN) {
        return NextResponse.json({ error: 'Reports to must be a LEADER or ADMIN' }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Compute name field from firstName and lastName
    const fullName = `${firstName} ${lastName}`

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        middleName,
        name: fullName,
        contactNumber,
        role: role || UserRole.MEMBER,
        hierarchyLevel: hierarchyLevel || HierarchyLevel.RF1,
        reportsToId,
        division,
        department,
        section,
        team,
        positionTitle,
        shortName,
        jobLevel,
        isLeader: isLeader || false,
        image,
        isActive: true
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
        isLeader: true,
        isActive: true,
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

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}