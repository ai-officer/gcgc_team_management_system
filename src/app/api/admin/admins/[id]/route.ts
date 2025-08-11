import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(request)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Never include password in responses
      }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    return NextResponse.json({ admin })
  } catch (error) {
    console.error('Error fetching admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { username, password, isActive } = body

    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id: params.id }
    })

    if (!existingAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Prevent self-deactivation
    if (session.sub === params.id && isActive === false) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 })
    }

    const updateData: any = {}

    if (username !== undefined) {
      if (!username?.trim()) {
        return NextResponse.json({ error: 'Username cannot be empty' }, { status: 400 })
      }

      if (username.length < 3) {
        return NextResponse.json({ error: 'Username must be at least 3 characters long' }, { status: 400 })
      }

      // Check for duplicate username (excluding current admin)
      if (username !== existingAdmin.username) {
        const duplicateAdmin = await prisma.admin.findUnique({
          where: { username: username.trim().toLowerCase() }
        })

        if (duplicateAdmin) {
          return NextResponse.json({ error: 'Admin with this username already exists' }, { status: 400 })
        }
      }

      updateData.username = username.trim().toLowerCase()
    }

    if (password !== undefined && password?.trim()) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
      }

      updateData.password = await bcrypt.hash(password, 10)
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    // Update admin
    const admin = await prisma.admin.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Never include password in responses
      }
    })

    return NextResponse.json({ admin })
  } catch (error) {
    console.error('Error updating admin:', error)
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

    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { id: params.id },
      select: { id: true, username: true, isActive: true }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Prevent self-deletion
    if (session.sub === params.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    // Only allow deletion of inactive accounts
    if (admin.isActive) {
      return NextResponse.json({ 
        error: 'Cannot delete active admin account. Please deactivate the account first.' 
      }, { status: 400 })
    }

    // Check if this is the last admin
    const activeAdminCount = await prisma.admin.count({
      where: { isActive: true }
    })

    if (activeAdminCount <= 1) {
      return NextResponse.json({ 
        error: 'Cannot delete admin. At least one active admin must exist.' 
      }, { status: 400 })
    }

    // Delete the admin
    await prisma.admin.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Admin deleted successfully' })
  } catch (error) {
    console.error('Error deleting admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}