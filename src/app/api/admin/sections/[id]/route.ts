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

    const section = await prisma.section.findUnique({
      where: { id: params.id },
      include: {
        department: {
          include: {
            division: true
          }
        },
        teamLabels: {
          where: { isActive: true }
        },
        _count: {
          select: {
            teamLabels: true
          }
        }
      }
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    return NextResponse.json({ section })
  } catch (error) {
    console.error('Error fetching section:', error)
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
    const { name, code, departmentId, isActive } = body

    const updateData: any = {}
    
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Section name cannot be empty' }, { status: 400 })
      }
      
      // Check for existing section name in the same department (excluding current section)
      const existingSection = await prisma.section.findFirst({
        where: { 
          name: { equals: name.trim(), mode: 'insensitive' },
          departmentId: departmentId || undefined,
          id: { not: params.id }
        }
      })

      if (existingSection) {
        return NextResponse.json({ error: 'Section with this name already exists in this department' }, { status: 400 })
      }
      
      updateData.name = name.trim()
    }
    
    if (code !== undefined) updateData.code = code?.trim() || null
    if (departmentId !== undefined) {
      // Validate department exists
      const department = await prisma.department.findUnique({
        where: { id: departmentId }
      })
      
      if (!department) {
        return NextResponse.json({ error: 'Department not found' }, { status: 404 })
      }
      
      updateData.departmentId = departmentId
    }
    if (isActive !== undefined) updateData.isActive = isActive

    const section = await prisma.section.update({
      where: { id: params.id },
      data: updateData,
      include: {
        department: {
          include: {
            division: true
          }
        },
        teamLabels: true,
        _count: {
          select: {
            teamLabels: true
          }
        }
      }
    })

    return NextResponse.json({ section })
  } catch (error) {
    console.error('Error updating section:', error)
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

    // Check if section exists
    const section = await prisma.section.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            teamLabels: true
          }
        }
      }
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Check if section has associated data
    const hasAssociatedData = section._count.teamLabels > 0

    if (hasAssociatedData) {
      // Soft delete by deactivating the section
      await prisma.section.update({
        where: { id: params.id },
        data: { isActive: false }
      })
      
      return NextResponse.json({ 
        message: 'Section deactivated successfully due to existing associated data'
      })
    } else {
      // Hard delete if no associated data
      await prisma.section.delete({
        where: { id: params.id }
      })
      
      return NextResponse.json({ message: 'Section deleted successfully' })
    }
  } catch (error) {
    console.error('Error deleting section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}