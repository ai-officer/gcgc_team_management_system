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

    const sectorHead = await prisma.sectorHead.findUnique({
      where: { id: params.id }
    })

    if (!sectorHead) {
      return NextResponse.json({ error: 'Sector head not found' }, { status: 404 })
    }

    return NextResponse.json({ sectorHead })
  } catch (error) {
    console.error('Error fetching sector head:', error)
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
    const { initials, fullName, description, divisionId, isActive } = body

    if (!initials?.trim() || !fullName?.trim()) {
      return NextResponse.json({ error: 'Initials and full name are required' }, { status: 400 })
    }

    // Check if sector head exists
    const existingSectorHead = await prisma.sectorHead.findUnique({
      where: { id: params.id }
    })

    if (!existingSectorHead) {
      return NextResponse.json({ error: 'Sector head not found' }, { status: 404 })
    }

    // Check if initials are already taken by another sector head
    const duplicateInitials = await prisma.sectorHead.findFirst({
      where: {
        initials: initials.trim().toUpperCase(),
        id: { not: params.id }
      }
    })

    if (duplicateInitials) {
      return NextResponse.json({ error: 'Sector head with these initials already exists' }, { status: 400 })
    }

    const updatedSectorHead = await prisma.sectorHead.update({
      where: { id: params.id },
      data: {
        initials: initials.trim().toUpperCase(),
        fullName: fullName.trim(),
        description: description?.trim() || null,
        divisionId: divisionId || null,
        isActive: isActive ?? true
      }
    })

    return NextResponse.json({ sectorHead: updatedSectorHead })
  } catch (error) {
    console.error('Error updating sector head:', error)
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

    // Check if sector head exists
    const existingSectorHead = await prisma.sectorHead.findUnique({
      where: { id: params.id }
    })

    if (!existingSectorHead) {
      return NextResponse.json({ error: 'Sector head not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    const deletedSectorHead = await prisma.sectorHead.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ 
      message: 'Sector head deleted successfully',
      sectorHead: deletedSectorHead 
    })
  } catch (error) {
    console.error('Error deleting sector head:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

