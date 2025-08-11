import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')
    const level = searchParams.get('level')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Helper function to add business logic properties based on division/department characteristics
    const addBusinessLogicProps = (unit: any, type: 'division' | 'department' | 'section' | 'team') => {
      const baseProps = {
        id: unit.id,
        name: unit.name,
        code: unit.code,
        disabled: !unit.isActive,
        description: unit.description
      }

      if (type === 'division') {
        // Add division-specific business logic
        if (unit.code === 'HO' || unit.name === 'Hotel Operations') {
          return { ...baseProps, requiresSectorHead: true }
        }
        if (unit.code === 'OTHER' || unit.name === 'Other') {
          return { ...baseProps, allowsCustomInput: true, requiresInput: true }
        }
      } else if (type === 'department') {
        // Add department-specific business logic
        if (unit.name === 'Other') {
          return { ...baseProps, allowsCustomInput: true }
        }
        // Hotel departments need team labels
        if (['Sogo', 'Eurotel', 'Astrotel', 'DreamWorld', 'Apo View', 'Dormtel'].includes(unit.name)) {
          return { ...baseProps, requiresTeamLabel: true }
        }
        // Shared Services departments need section and team inputs
        if (['Finance & Accounting', 'HR & Admin', 'IT & Tech Support', 'Engineering'].includes(unit.name)) {
          return { ...baseProps, requiresSectionInput: true, requiresTeamInput: true }
        }
        // CSO departments need section and team labels
        if (['BIG', 'Business Dev', 'Laundry (LDI)', 'Commissary', 'Retail (AllenOne)', 'Gaming', 'Mechanical (CMI)'].includes(unit.name)) {
          return { ...baseProps, requiresSectionLabel: true, requiresTeamLabel: true }
        }
      }

      return baseProps
    }

    // If no parentId, return top-level divisions
    if (!parentId && (!level || level === '1')) {
      const where: any = {}
      if (!includeInactive) where.isActive = true

      const divisions = await prisma.division.findMany({
        where,
        include: {
          departments: {
            where: includeInactive ? {} : { isActive: true },
            include: {
              sections: {
                where: includeInactive ? {} : { isActive: true },
                include: {
                  teamLabels: {
                    where: includeInactive ? {} : { isActive: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      })

      return NextResponse.json({
        success: true,
        data: divisions.map(div => ({
          ...addBusinessLogicProps(div, 'division'),
          children: div.departments.map(dept => ({
            ...addBusinessLogicProps(dept, 'department'),
            children: dept.sections.map(section => ({
              ...addBusinessLogicProps(section, 'section'),
              children: section.teamLabels.map(team => 
                addBusinessLogicProps(team, 'team')
              )
            }))
          }))
        }))
      })
    }

    // Find the parent division and return its departments
    const division = await prisma.division.findUnique({
      where: { id: parentId },
      include: {
        departments: {
          where: includeInactive ? {} : { isActive: true },
          include: {
            sections: {
              where: includeInactive ? {} : { isActive: true },
              include: {
                teamLabels: {
                  where: includeInactive ? {} : { isActive: true }
                }
              }
            }
          }
        }
      }
    })

    if (!division) {
      return NextResponse.json({
        success: false,
        error: 'Parent division not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: division.departments.map(dept => ({
        ...addBusinessLogicProps(dept, 'department'),
        children: dept.sections.map(section => ({
          ...addBusinessLogicProps(section, 'section'),
          children: section.teamLabels.map(team => 
            addBusinessLogicProps(team, 'team')
          )
        }))
      }))
    })

  } catch (error) {
    console.error('Organizational units API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizational units' },
      { status: 500 }
    )
  }
}