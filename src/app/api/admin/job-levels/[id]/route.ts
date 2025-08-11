import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(request)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, order, isActive } = body
    const { id } = params

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Job level name is required' }, { status: 400 })
    }

    // Check if job level exists
    const existingJobLevel = await prisma.jobLevel.findUnique({
      where: { id }
    })

    if (!existingJobLevel) {
      return NextResponse.json({ error: 'Job level not found' }, { status: 404 })
    }

    // Check for duplicate name (excluding current job level)
    if (name !== existingJobLevel.name) {
      const duplicateJobLevel = await prisma.jobLevel.findUnique({
        where: { name: name.trim() }
      })

      if (duplicateJobLevel) {
        return NextResponse.json({ error: 'Job level with this name already exists' }, { status: 400 })
      }
    }

    const updateData: any = {
      name: name.trim(),
      description: description?.trim() || null
    }

    if (order !== undefined) updateData.order = order
    if (isActive !== undefined) updateData.isActive = isActive

    // Update the job level
    const jobLevel = await prisma.jobLevel.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ jobLevel })

  } catch (error) {
    console.error('Error updating job level:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(request)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Check if job level exists
    const jobLevel = await prisma.jobLevel.findUnique({
      where: { id }
    })

    if (!jobLevel) {
      return NextResponse.json({ error: 'Job level not found' }, { status: 404 })
    }

    // Check if job level is being used by any users
    const usersWithJobLevel = await prisma.user.count({
      where: { jobLevel: jobLevel.name }
    })

    if (usersWithJobLevel > 0) {
      return NextResponse.json(
        { error: 'Cannot delete job level that is assigned to users' },
        { status: 400 }
      )
    }

    // Delete the job level
    await prisma.jobLevel.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Job level deleted successfully' })

  } catch (error) {
    console.error('Error deleting job level:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
