import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { UserRole, HierarchyLevel } from '@prisma/client'

// Admin Settings update interface
interface AdminSettingsUpdateData {
  systemName: string
  systemDescription?: string
  allowUserRegistration: boolean
  requireEmailVerification: boolean
  defaultUserRole: UserRole
  defaultHierarchyLevel: HierarchyLevel
  sessionTimeout: number // minutes
  maxLoginAttempts: number
  enableNotifications: boolean
  enableAuditLogging: boolean
  maintenanceMode: boolean
  maintenanceMessage?: string
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create admin settings (singleton pattern)
    let settings = await prisma.adminSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!settings) {
      // Create default settings
      settings = await prisma.adminSettings.create({
        data: {
          systemName: 'GCGC Team Management System',
          systemDescription: 'Comprehensive team and task management system',
          allowUserRegistration: true,
          requireEmailVerification: false,
          defaultUserRole: 'MEMBER',
          defaultHierarchyLevel: 'RF1',
          sessionTimeout: 60,
          maxLoginAttempts: 3,
          enableNotifications: true,
          enableAuditLogging: true,
          maintenanceMode: false
        }
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching admin settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AdminSettingsUpdateData = await req.json()

    // Validate required fields
    if (!body.systemName?.trim()) {
      return NextResponse.json({ error: 'System name is required' }, { status: 400 })
    }

    // Validate numeric fields
    if (body.sessionTimeout < 5 || body.sessionTimeout > 1440) {
      return NextResponse.json({ error: 'Session timeout must be between 5 and 1440 minutes' }, { status: 400 })
    }

    if (body.maxLoginAttempts < 1 || body.maxLoginAttempts > 10) {
      return NextResponse.json({ error: 'Max login attempts must be between 1 and 10' }, { status: 400 })
    }

    // Validate enum values
    const validRoles = ['MEMBER', 'LEADER']
    if (!validRoles.includes(body.defaultUserRole)) {
      return NextResponse.json({ error: 'Invalid default user role' }, { status: 400 })
    }

    const validHierarchyLevels = ['RF1', 'RF2', 'RF3', 'OF1', 'OF2', 'M1', 'M2']
    if (!validHierarchyLevels.includes(body.defaultHierarchyLevel)) {
      return NextResponse.json({ error: 'Invalid default hierarchy level' }, { status: 400 })
    }

    // Get existing settings first
    let settings = await prisma.adminSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!settings) {
      // Create if doesn't exist
      settings = await prisma.adminSettings.create({
        data: {
          systemName: body.systemName.trim(),
          systemDescription: body.systemDescription?.trim(),
          allowUserRegistration: body.allowUserRegistration,
          requireEmailVerification: body.requireEmailVerification,
          defaultUserRole: body.defaultUserRole,
          defaultHierarchyLevel: body.defaultHierarchyLevel,
          sessionTimeout: body.sessionTimeout,
          maxLoginAttempts: body.maxLoginAttempts,
          enableNotifications: body.enableNotifications,
          enableAuditLogging: body.enableAuditLogging,
          maintenanceMode: body.maintenanceMode,
          maintenanceMessage: body.maintenanceMessage?.trim()
        }
      })
    } else {
      // Update existing settings
      settings = await prisma.adminSettings.update({
        where: { id: settings.id },
        data: {
          systemName: body.systemName.trim(),
          systemDescription: body.systemDescription?.trim(),
          allowUserRegistration: body.allowUserRegistration,
          requireEmailVerification: body.requireEmailVerification,
          defaultUserRole: body.defaultUserRole,
          defaultHierarchyLevel: body.defaultHierarchyLevel,
          sessionTimeout: body.sessionTimeout,
          maxLoginAttempts: body.maxLoginAttempts,
          enableNotifications: body.enableNotifications,
          enableAuditLogging: body.enableAuditLogging,
          maintenanceMode: body.maintenanceMode,
          maintenanceMessage: body.maintenanceMessage?.trim()
        }
      })
    }

    return NextResponse.json({ 
      settings,
      message: 'Settings updated successfully' 
    })
  } catch (error) {
    console.error('Error updating admin settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}