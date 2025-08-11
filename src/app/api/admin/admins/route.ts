import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const skip = (page - 1) * limit

    const where: any = {}
    if (!includeInactive) where.isActive = true
    if (search) {
      where.username = { contains: search, mode: 'insensitive' }
    }

    const admins = await prisma.admin.findMany({
      where,
      select: {
        id: true,
        username: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Never include password in responses
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    const totalAdmins = await prisma.admin.count({ where })

    return NextResponse.json({
      admins,
      pagination: {
        page,
        limit,
        total: totalAdmins,
        totalPages: Math.ceil(totalAdmins / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching admins:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { username, password } = body

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters long' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { username: username.trim().toLowerCase() }
    })

    if (existingAdmin) {
      return NextResponse.json({ error: 'Admin with this username already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        username: username.trim().toLowerCase(),
        password: hashedPassword,
        isActive: true
      },
      select: {
        id: true,
        username: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Never include password in responses
      }
    })

    return NextResponse.json({ admin }, { status: 201 })
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}