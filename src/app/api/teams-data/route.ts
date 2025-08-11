import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get('sectionId')
    const departmentId = searchParams.get('departmentId')
    const sectionName = searchParams.get('sectionName')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Try to get teams from TeamLabel table first (for sections)
    if (sectionId || sectionName) {
      try {
        let where: any = {}
        
        if (sectionId) {
          where.sectionId = sectionId
        } else if (sectionName) {
          where.section = {
            name: {
              contains: sectionName,
              mode: 'insensitive'
            }
          }
        }

        if (!includeInactive) {
          where.isActive = true
        }

        const teamLabels = await prisma.teamLabel.findMany({
          where,
          include: {
            section: {
              include: {
                department: {
                  include: {
                    division: true
                  }
                }
              }
            }
          },
          orderBy: { name: 'asc' }
        })

        const teams = teamLabels.map(team => ({
          id: team.id,
          name: team.name,
          code: team.code,
          type: 'team_label',
          section: team.section.name,
          department: team.section.department.name,
          division: team.section.department.division.name
        }))

        return NextResponse.json({
          success: true,
          data: teams
        })

      } catch (error) {
        console.error('Error fetching team labels:', error)
      }
    }

    // Fallback: get teams from Team table
    const where: any = {}
    if (!includeInactive) {
      where.isActive = true
    }

    const teams = await prisma.team.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: { name: 'asc' }
    })

    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      code: null,
      type: 'team',
      description: team.description
    }))

    return NextResponse.json({
      success: true,
      data: formattedTeams
    })

  } catch (error) {
    console.error('Teams data API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams data' },
      { status: 500 }
    )
  }
}
