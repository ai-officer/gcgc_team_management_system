import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {}

    if (!includeInactive) {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { initials: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } }
      ]
    }

    const sectorHeads = await prisma.sectorHead.findMany({
      where,
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

  } catch (error) {
    console.error('Error fetching sector heads:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

