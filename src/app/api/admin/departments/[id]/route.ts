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

    const department = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        division: true,
        sections: {
          where: { isActive: true },
          include: {
            teamLabels: {
              where: { isActive: true }
            }
          }
        },
        _count: {
          select: {
            sections: true
          }
        }
      }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    return NextResponse.json({ department })
  } catch (error) {
    console.error('Error fetching department:', error)
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
    const { name, code, divisionId, isActive } = body

    const updateData: any = {}
    
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Department name cannot be empty' }, { status: 400 })
      }
      
      // Check for existing department name in the same division (excluding current department)
      const existingDepartment = await prisma.department.findFirst({
        where: { 
          name: { equals: name.trim(), mode: 'insensitive' },
          divisionId: divisionId || undefined,
          id: { not: params.id }
        }
      })

      if (existingDepartment) {
        return NextResponse.json({ error: 'Department with this name already exists in this division' }, { status: 400 })
      }
      
      updateData.name = name.trim()
    }
    
    if (code !== undefined) updateData.code = code?.trim() || null
    if (divisionId !== undefined) {
      // Validate division exists
      const division = await prisma.division.findUnique({
        where: { id: divisionId }
      })
      
      if (!division) {
        return NextResponse.json({ error: 'Division not found' }, { status: 404 })
      }
      
      updateData.divisionId = divisionId
    }
    if (isActive !== undefined) updateData.isActive = isActive

    const department = await prisma.department.update({
      where: { id: params.id },
      data: updateData,
      include: {
        division: true,
        sections: true,
        _count: {
          select: {
            sections: true
          }
        }
      }
    })

    return NextResponse.json({ department })
  } catch (error) {
    console.error('Error updating department:', error)
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

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            sections: true
          }
        }
      }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Check if department has associated data
    const hasAssociatedData = department._count.sections > 0

    if (hasAssociatedData) {
      // Soft delete by deactivating the department
      await prisma.department.update({
        where: { id: params.id },
        data: { isActive: false }
      })
      
      return NextResponse.json({ 
        message: 'Department deactivated successfully due to existing associated data'
      })
    } else {
      // Hard delete if no associated data
      await prisma.department.delete({
        where: { id: params.id }
      })
      
      return NextResponse.json({ message: 'Department deleted successfully' })
    }
  } catch (error) {
    console.error('Error deleting department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}