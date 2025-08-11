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
    const divisionId = searchParams.get('divisionId')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const includeSections = searchParams.get('includeSections') === 'true'

    const skip = (page - 1) * limit

    const where: any = {}
    if (!includeInactive) where.isActive = true
    if (divisionId) where.divisionId = divisionId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { division: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    const departments = await prisma.department.findMany({
      where,
      include: {
        division: true,
        sections: includeSections ? {
          where: { isActive: true },
          include: {
            teamLabels: {
              where: { isActive: true }
            }
          }
        } : false,
        _count: {
          select: {
            sections: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    const totalDepartments = await prisma.department.count({ where })

    return NextResponse.json({
      departments,
      pagination: {
        page,
        limit,
        total: totalDepartments,
        totalPages: Math.ceil(totalDepartments / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching departments:', error)
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
    const { name, code, divisionId } = body
    
    if (!name?.trim() || !divisionId) {
      return NextResponse.json({ error: 'Department name and division are required' }, { status: 400 })
    }

    // Check if division exists
    const division = await prisma.division.findUnique({
      where: { id: divisionId }
    })

    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 })
    }

    // Check if department already exists in this division
    const existingDepartment = await prisma.department.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        divisionId: divisionId
      }
    })

    if (existingDepartment) {
      return NextResponse.json({ error: 'Department with this name already exists in this division' }, { status: 400 })
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        divisionId: divisionId,
        isActive: true
      },
      include: {
        division: true,
        sections: true,
        _count: {
          select: {
            sections: true
          }
        }
      }
    })

    return NextResponse.json({ department }, { status: 201 })
  } catch (error) {
    console.error('Error creating department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
