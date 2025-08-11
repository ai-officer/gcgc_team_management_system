import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(req)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                hierarchyLevel: true,
                image: true
              }
            }
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                name: true
              }
            },
            creator: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        events: {
          select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            type: true
          },
          orderBy: { startTime: 'desc' },
          take: 10
        },
        _count: {
          select: {
            tasks: true,
            events: true
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(req)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, isActive } = body

    const updateData: any = {}
    
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Team name cannot be empty' }, { status: 400 })
      }
      
      // Check for existing team name (excluding current team)
      const existingTeam = await prisma.team.findFirst({
        where: { 
          name: { equals: name.trim(), mode: 'insensitive' },
          id: { not: params.id }
        }
      })

      if (existingTeam) {
        return NextResponse.json({ error: 'Team with this name already exists' }, { status: 400 })
      }
      
      updateData.name = name.trim()
    }
    
    if (description !== undefined) updateData.description = description?.trim() || null
    if (isActive !== undefined) updateData.isActive = isActive

    const team = await prisma.team.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        updatedAt: true,
        members: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        _count: {
          select: {
            tasks: true,
            events: true
          }
        }
      }
    })

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(req)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            members: true,
            tasks: true,
            events: true
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if team has associated data
    const hasAssociatedData = team._count.members > 0 || team._count.tasks > 0 || team._count.events > 0

    if (hasAssociatedData) {
      // Soft delete by deactivating the team
      await prisma.team.update({
        where: { id: params.id },
        data: { isActive: false }
      })
      
      return NextResponse.json({ 
        message: 'Team deactivated successfully due to existing associated data'
      })
    } else {
      // Hard delete if no associated data
      await prisma.team.delete({
        where: { id: params.id }
      })
      
      return NextResponse.json({ message: 'Team deleted successfully' })
    }
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}