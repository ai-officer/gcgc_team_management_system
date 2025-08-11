import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Predefined organizational structure based on the GCGC specification
const ORGANIZATIONAL_STRUCTURE = {
  divisions: [
    {
      name: 'Real Property',
      code: 'RP',
      children: [
        { 
          name: 'ETII', 
          code: 'ETII', 
          children: [
            { name: 'CDG', code: 'CDG', allowsCustomInput: true },
            { name: 'F&A', code: 'FA', allowsCustomInput: true },
            { name: 'S&M', code: 'SM', allowsCustomInput: true }
          ]
        },
        { 
          name: 'ECLI', 
          code: 'ECLI', 
          children: [
            { name: 'CDG', code: 'CDG', allowsCustomInput: true },
            { name: 'F&A', code: 'FA', allowsCustomInput: true },
            { name: 'S&M', code: 'SM', allowsCustomInput: true }
          ]
        },
        { 
          name: 'KPPI', 
          code: 'KPPI', 
          children: [
            { name: 'CDG', code: 'CDG', allowsCustomInput: true },
            { name: 'F&A', code: 'FA', allowsCustomInput: true },
            { name: 'S&M', code: 'SM', allowsCustomInput: true }
          ]
        },
        { name: 'REIT', code: 'REIT', disabled: true, description: 'For later implementation' },
        { name: 'Other', allowsCustomInput: true, requiresInput: true }
      ]
    },
    {
      name: 'Hotel Operations',
      code: 'HO',
      requiresSectorHead: true,
      children: [
        { name: 'Sogo', code: 'S09', requiresTeamLabel: true },
        { name: 'Eurotel', code: 'E05', requiresTeamLabel: true },
        { name: 'Astrotel', code: 'A03', requiresTeamLabel: true },
        { name: 'DreamWorld', code: 'D02', requiresTeamLabel: true },
        { name: 'Apo View', code: 'AVH', requiresTeamLabel: true },
        { name: 'Dormtel', code: 'DT1', requiresTeamLabel: true },
        { name: 'Other', code: 'O01', allowsCustomInput: true, requiresTeamLabel: true }
      ]
    },
    {
      name: 'Hotel Franchising',
      code: 'HF',
      disabled: true,
      description: 'For later implementation'
    },
    {
      name: 'Shared Services - GOLI',
      code: 'SS-GOLI',
      children: [
        { name: 'Finance & Accounting', allowsCustomInput: true, requiresSectionInput: true, requiresTeamInput: true },
        { name: 'HR & Admin', allowsCustomInput: true, requiresSectionInput: true, requiresTeamInput: true },
        { name: 'IT & Tech Support', allowsCustomInput: true, requiresSectionInput: true, requiresTeamInput: true },
        { name: 'Engineering', allowsCustomInput: true, requiresSectionInput: true, requiresTeamInput: true },
        { name: 'Procurement', allowsCustomInput: true, requiresTeamLabel: true },
        { name: 'Other', allowsCustomInput: true, requiresSectionInput: true, requiresTeamLabel: true }
      ]
    },
    {
      name: 'CSO',
      code: 'CSO',
      children: [
        { name: 'BIG', allowsCustomInput: true, requiresSectionLabel: true, requiresTeamLabel: true },
        { name: 'Business Dev', allowsCustomInput: true, requiresSectionLabel: true, requiresTeamLabel: true },
        { name: 'Laundry (LDI)', allowsCustomInput: true, requiresSectionLabel: true, requiresTeamLabel: true },
        { name: 'Commissary', allowsCustomInput: true, requiresSectionLabel: true, requiresTeamLabel: true },
        { name: 'Retail (AllenOne)', allowsCustomInput: true, requiresSectionLabel: true, requiresTeamLabel: true },
        { name: 'Gaming', allowsCustomInput: true, requiresSectionLabel: true, requiresTeamLabel: true },
        { name: 'Mechanical (CMI)', allowsCustomInput: true, requiresSectionLabel: true, requiresTeamLabel: true },
        { name: 'Other', allowsCustomInput: true, requiresSectionLabel: true, requiresTeamLabel: true }
      ]
    },
    {
      name: 'Other',
      allowsCustomInput: true,
      requiresInput: true
    }
  ]
}

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
    if (parentId) {
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
    }

  } catch (error) {
    console.error('Organizational units API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizational units' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, parentId, level, metadata } = body

    // Validate required fields
    if (!name || !level) {
      return NextResponse.json(
        { success: false, error: 'Name and level are required' },
        { status: 400 }
      )
    }

    // Create the organizational unit
    const unit = await prisma.organizationalUnit.create({
      data: {
        name,
        code,
        level: parseInt(level),
        parentId,
        path: parentId ? `${parentId}/${name}` : name,
        metadata,
        unitType: level === '1' ? 'DIVISION' : 
                  level === '2' ? 'DEPARTMENT' : 
                  level === '3' ? 'SECTION' : 'TEAM'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Organizational unit created successfully',
      data: unit
    }, { status: 201 })

  } catch (error) {
    console.error('Create organizational unit error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create organizational unit' },
      { status: 500 }
    )
  }
}