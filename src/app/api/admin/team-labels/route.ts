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
    const sectionId = searchParams.get('sectionId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {}
    if (!includeInactive) where.isActive = true
    if (sectionId) where.sectionId = sectionId

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

    return NextResponse.json({ teamLabels })
  } catch (error) {
    console.error('Error fetching team labels:', error)
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
    const { name, code, sectionId } = body
    
    if (!name?.trim() || !sectionId) {
      return NextResponse.json({ error: 'Team label name and section are required' }, { status: 400 })
    }

    // Check if section exists
    const section = await prisma.section.findUnique({
      where: { id: sectionId }
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Check if team label already exists in this section
    const existingTeamLabel = await prisma.teamLabel.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        sectionId: sectionId
      }
    })

    if (existingTeamLabel) {
      return NextResponse.json({ error: 'Team label with this name already exists in this section' }, { status: 400 })
    }

    const teamLabel = await prisma.teamLabel.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        sectionId: sectionId,
        isActive: true
      },
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
      }
    })

    return NextResponse.json({ teamLabel }, { status: 201 })
  } catch (error) {
    console.error('Error creating team label:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
