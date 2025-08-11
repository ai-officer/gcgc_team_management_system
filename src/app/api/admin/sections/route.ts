import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search') || ''
    const departmentId = searchParams.get('departmentId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const skip = (page - 1) * limit

    const where: any = {}
    if (!includeInactive) where.isActive = true
    if (departmentId) where.departmentId = departmentId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { department: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    const sections = await prisma.section.findMany({
      where,
      include: {
        department: {
          include: {
            division: true
          }
        },
        teamLabels: {
          where: { isActive: true }
        },
        _count: {
          select: {
            teamLabels: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    const totalSections = await prisma.section.count({ where })

    return NextResponse.json({
      sections,
      pagination: {
        page,
        limit,
        total: totalSections,
        totalPages: Math.ceil(totalSections / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching sections:', error)
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
    const { name, code, departmentId } = body
    
    if (!name?.trim() || !departmentId) {
      return NextResponse.json({ error: 'Section name and department are required' }, { status: 400 })
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Check if section already exists in this department
    const existingSection = await prisma.section.findUnique({
      where: {
        name_departmentId: {
          name: name.trim(),
          departmentId: departmentId
        }
      }
    })

    if (existingSection) {
      return NextResponse.json({ error: 'Section with this name already exists in this department' }, { status: 400 })
    }

    const section = await prisma.section.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        departmentId: departmentId,
        isActive: true
      },
      include: {
        department: {
          include: {
            division: true
          }
        },
        teamLabels: true,
        _count: {
          select: {
            teamLabels: true
          }
        }
      }
    })

    return NextResponse.json({ section }, { status: 201 })
  } catch (error) {
    console.error('Error creating section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
