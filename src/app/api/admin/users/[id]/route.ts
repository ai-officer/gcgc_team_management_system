import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { UserRole, HierarchyLevel, AdminActionType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { logAdminAction } from '@/lib/admin-audit'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession(req)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hierarchyLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        teamMembers: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        assignedTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            team: {
              select: {
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        activities: {
          select: {
            id: true,
            type: true,
            description: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
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
    const { name, role, hierarchyLevel, isActive, password } = body

    const previous = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, isActive: true, email: true, name: true }
    })

    if (!previous) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (hierarchyLevel !== undefined) updateData.hierarchyLevel = hierarchyLevel
    if (isActive !== undefined) updateData.isActive = isActive

    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hierarchyLevel: true,
        isActive: true,
        updatedAt: true
      }
    })

    if (password) {
      await logAdminAction({
        request: req,
        action: AdminActionType.USER_PASSWORD_RESET,
        description: `Reset password for user ${previous.email}`,
        adminId: session.sub,
        adminUsername: session.username,
        targetType: 'User',
        targetId: previous.id,
      })
    }
    if (role !== undefined && role !== previous.role) {
      await logAdminAction({
        request: req,
        action: AdminActionType.USER_ROLE_CHANGED,
        description: `Changed role of ${previous.email} from ${previous.role} to ${role}`,
        adminId: session.sub,
        adminUsername: session.username,
        targetType: 'User',
        targetId: previous.id,
        metadata: { from: previous.role, to: role },
      })
    }
    if (isActive !== undefined && isActive !== previous.isActive) {
      await logAdminAction({
        request: req,
        action: AdminActionType.USER_DEACTIVATED,
        description: `${isActive ? 'Activated' : 'Deactivated'} user ${previous.email}`,
        adminId: session.sub,
        adminUsername: session.username,
        targetType: 'User',
        targetId: previous.id,
        metadata: { isActive },
      })
    }
    // Generic update entry for any other field changes (name, hierarchyLevel)
    if (
      (name !== undefined && name !== previous.name) ||
      hierarchyLevel !== undefined
    ) {
      await logAdminAction({
        request: req,
        action: AdminActionType.USER_UPDATED,
        description: `Updated profile of ${previous.email}`,
        adminId: session.sub,
        adminUsername: session.username,
        targetType: 'User',
        targetId: previous.id,
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
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

    // Check if user exists and is not the current admin
    const user = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.id === session.sub) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Soft delete by deactivating the user
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    await logAdminAction({
      request: req,
      action: AdminActionType.USER_DEACTIVATED,
      description: `Deactivated user ${user.email}`,
      adminId: session.sub,
      adminUsername: session.username,
      targetType: 'User',
      targetId: user.id,
    })

    return NextResponse.json({ message: 'User deactivated successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}