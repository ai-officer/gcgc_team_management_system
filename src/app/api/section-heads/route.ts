import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Build where condition
    const where: any = {
      OR: [
        { role: UserRole.LEADER },
        { role: UserRole.ADMIN },
        { isLeader: true }
      ]
    }

    if (!includeInactive) {
      where.isActive = true
    }

    // If section is specified, filter by section
    if (section) {
      where.section = {
        contains: section,
        mode: 'insensitive'
      }
    }

    const sectionHeads = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        section: true,
        department: true,
        division: true,
        positionTitle: true,
        shortName: true
      },
      orderBy: [
        { section: 'asc' },
        { firstName: 'asc' }
      ]
    })

    // Group by section and format for dropdown
    const groupedBySection = sectionHeads.reduce((acc: any, head: any) => {
      const sectionName = head.section || 'No Section'
      if (!acc[sectionName]) {
        acc[sectionName] = []
      }
      acc[sectionName].push({
        id: head.id,
        name: head.firstName && head.lastName ? `${head.firstName} ${head.lastName}` : head.name,
        initials: head.shortName || `${head.firstName?.[0] || ''}${head.lastName?.[0] || ''}`,
        email: head.email,
        role: head.role,
        section: head.section,
        department: head.department,
        division: head.division,
        positionTitle: head.positionTitle
      })
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: groupedBySection,
      flatData: sectionHeads.map(head => ({
        id: head.id,
        name: head.firstName && head.lastName ? `${head.firstName} ${head.lastName}` : head.name,
        initials: head.shortName || `${head.firstName?.[0] || ''}${head.lastName?.[0] || ''}`,
        email: head.email,
        role: head.role,
        section: head.section,
        department: head.department,
        division: head.division,
        positionTitle: head.positionTitle
      }))
    })

  } catch (error) {
    console.error('Section heads API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch section heads' },
      { status: 500 }
    )
  }
}
