import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const forDropdown = searchParams.get('dropdown') === 'true'
    
    // Simple dropdown format
    if (forDropdown) {
      const sectorHeads = await prisma.sectorHead.findMany({
        where: { isActive: true },
        select: {
          id: true,
          initials: true,
          fullName: true
        },
        orderBy: { initials: 'asc' }
      })

      return NextResponse.json({
        success: true,
        data: sectorHeads.map(sh => ({
          id: sh.id,
          initials: sh.initials,
          fullName: sh.fullName,
          label: `${sh.initials} - ${sh.fullName}`
        }))
      })
    }

    // Full admin interface
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const divisionId = searchParams.get('divisionId')

    const skip = (page - 1) * limit

    const where: any = {}
    if (!includeInactive) where.isActive = true
    if (divisionId) where.divisionId = divisionId
    if (search) {
      where.OR = [
        { initials: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const sectorHeads = await prisma.sectorHead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    const totalSectorHeads = await prisma.sectorHead.count({ where })

    return NextResponse.json({
      sectorHeads,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalSectorHeads / limit),
        totalItems: totalSectorHeads,
        itemsPerPage: limit
      }
    })

  } catch (error) {
    console.error('Error fetching sector heads:', error)
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
    const { initials, fullName, description, divisionId } = body
    
    if (!initials?.trim() || !fullName?.trim()) {
      return NextResponse.json({ error: 'Initials and full name are required' }, { status: 400 })
    }

    // Check if sector head with these initials already exists
    const existingSectorHead = await prisma.sectorHead.findUnique({
      where: { initials: initials.trim().toUpperCase() }
    })

    if (existingSectorHead) {
      return NextResponse.json({ error: 'Sector head with these initials already exists' }, { status: 400 })
    }

    const sectorHead = await prisma.sectorHead.create({
      data: {
        initials: initials.trim().toUpperCase(),
        fullName: fullName.trim(),
        description: description?.trim() || null,
        divisionId: divisionId || null,
        isActive: true
      }
    })

    return NextResponse.json({ sectorHead }, { status: 201 })
  } catch (error) {
    console.error('Error creating sector head:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
