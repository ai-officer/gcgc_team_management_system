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
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const includeDepartments = searchParams.get('includeDepartments') === 'true'
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    if (!includeInactive) where.isActive = true
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [divisions, total] = await Promise.all([
      prisma.division.findMany({
        where,
        skip,
        take: limit,
        include: {
          departments: includeDepartments ? {
            where: { isActive: true },
            include: {
              sections: {
                where: { isActive: true }
              }
            }
          } : false,
          _count: {
            select: {
              departments: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.division.count({ where })
    ])

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total
    }

    return NextResponse.json({ divisions, pagination })
  } catch (error) {
    console.error('Error fetching divisions:', error)
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
    const { name, code, description } = body
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Division name is required' }, { status: 400 })
    }

    // Check if division already exists
    const existingDivision = await prisma.division.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' }
      }
    })

    if (existingDivision) {
      return NextResponse.json({ error: 'Division with this name already exists' }, { status: 400 })
    }

    const division = await prisma.division.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        isActive: true
      },
      include: {
        departments: true,
        _count: {
          select: {
            departments: true
          }
        }
      }
    })

    return NextResponse.json({ division }, { status: 201 })
  } catch (error) {
    console.error('Error creating division:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
