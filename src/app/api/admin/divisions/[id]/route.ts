import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(req)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const division = await prisma.division.findUnique({
      where: { id: params.id },
      include: {
        departments: {
          where: { isActive: true },
          include: {
            sections: {
              where: { isActive: true },
              include: {
                teamLabels: {
                  where: { isActive: true }
                }
              }
            }
          }
        },
        _count: {
          select: {
            departments: true
          }
        }
      }
    })

    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 })
    }

    return NextResponse.json({ division })
  } catch (error) {
    console.error('Error fetching division:', error)
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
    const { name, code, description, isActive } = body

    const updateData: any = {}
    
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Division name cannot be empty' }, { status: 400 })
      }
      
      // Check for existing division name (excluding current division)
      const existingDivision = await prisma.division.findFirst({
        where: { 
          name: { equals: name.trim(), mode: 'insensitive' },
          id: { not: params.id }
        }
      })

      if (existingDivision) {
        return NextResponse.json({ error: 'Division with this name already exists' }, { status: 400 })
      }
      
      updateData.name = name.trim()
    }
    
    if (code !== undefined) {
      if (code.trim()) {
        // Check for existing division code (excluding current division)
        const existingDivisionCode = await prisma.division.findFirst({
          where: { 
            code: { equals: code.trim(), mode: 'insensitive' },
            id: { not: params.id }
          }
        })

        if (existingDivisionCode) {
          return NextResponse.json({ error: 'Division with this code already exists' }, { status: 400 })
        }
      }
      
      updateData.code = code?.trim() || null
    }
    
    if (description !== undefined) updateData.description = description?.trim() || null
    if (isActive !== undefined) updateData.isActive = isActive

    const division = await prisma.division.update({
      where: { id: params.id },
      data: updateData,
      include: {
        departments: true,
        _count: {
          select: {
            departments: true
          }
        }
      }
    })

    return NextResponse.json({ division })
  } catch (error) {
    console.error('Error updating division:', error)
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

    // Check if division exists
    const division = await prisma.division.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            departments: true
          }
        }
      }
    })

    if (!division) {
      return NextResponse.json({ error: 'Division not found' }, { status: 404 })
    }

    // Check if division has associated data
    const hasAssociatedData = division._count.departments > 0

    if (hasAssociatedData) {
      // Soft delete by deactivating the division
      await prisma.division.update({
        where: { id: params.id },
        data: { isActive: false }
      })
      
      return NextResponse.json({ 
        message: 'Division deactivated successfully due to existing associated data'
      })
    } else {
      // Hard delete if no associated data
      await prisma.division.delete({
        where: { id: params.id }
      })
      
      return NextResponse.json({ message: 'Division deleted successfully' })
    }
  } catch (error) {
    console.error('Error deleting division:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}