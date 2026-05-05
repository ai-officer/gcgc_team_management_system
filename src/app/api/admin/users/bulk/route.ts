import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import {
  AdminActionType,
  HierarchyLevel,
  UserRole,
} from '@prisma/client'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/admin-audit'

const MAX_BATCH_SIZE = 200

const bulkSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('activate'),
    userIds: z.array(z.string().min(1)).min(1).max(MAX_BATCH_SIZE),
  }),
  z.object({
    type: z.literal('deactivate'),
    userIds: z.array(z.string().min(1)).min(1).max(MAX_BATCH_SIZE),
  }),
  z.object({
    type: z.literal('changeRole'),
    userIds: z.array(z.string().min(1)).min(1).max(MAX_BATCH_SIZE),
    payload: z.object({ role: z.nativeEnum(UserRole) }),
  }),
  z.object({
    type: z.literal('changeHierarchy'),
    userIds: z.array(z.string().min(1)).min(1).max(MAX_BATCH_SIZE),
    payload: z.object({ hierarchyLevel: z.nativeEnum(HierarchyLevel) }),
  }),
])

interface ActionResult {
  updated: number
  skipped: { id: string; reason: string }[]
  bulkOperationId: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req)
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = bulkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }

    const action = parsed.data
    const bulkOperationId = crypto.randomUUID()

    // Load all targets up front so we can short-circuit invalid ones with
    // useful error reasons instead of letting Prisma throw mid-loop.
    const users = await prisma.user.findMany({
      where: { id: { in: action.userIds } },
      select: {
        id: true,
        email: true,
        role: true,
        hierarchyLevel: true,
        isActive: true,
      },
    })
    const usersById = new Map(users.map(u => [u.id, u]))

    const result: ActionResult = {
      updated: 0,
      skipped: [],
      bulkOperationId,
    }

    for (const id of action.userIds) {
      const user = usersById.get(id)
      if (!user) {
        result.skipped.push({ id, reason: 'not found' })
        continue
      }
      if (id === session.sub) {
        // Don't let the acting admin operate on their own row in bulk —
        // forces them to use the per-user UI for their own record.
        result.skipped.push({ id, reason: 'cannot bulk-modify yourself' })
        continue
      }

      try {
        if (action.type === 'activate') {
          if (user.isActive) {
            result.skipped.push({ id, reason: 'already active' })
            continue
          }
          await prisma.user.update({ where: { id }, data: { isActive: true } })
          await logAdminAction({
            request: req,
            action: AdminActionType.USER_DEACTIVATED, // reuse — same column for activate/deactivate transitions
            description: `Bulk: activated ${user.email}`,
            adminId: session.sub,
            adminUsername: session.username,
            targetType: 'User',
            targetId: id,
            metadata: { bulkOperationId, isActive: true },
          })
          result.updated++
        } else if (action.type === 'deactivate') {
          if (!user.isActive) {
            result.skipped.push({ id, reason: 'already inactive' })
            continue
          }
          await prisma.user.update({ where: { id }, data: { isActive: false } })
          await logAdminAction({
            request: req,
            action: AdminActionType.USER_DEACTIVATED,
            description: `Bulk: deactivated ${user.email}`,
            adminId: session.sub,
            adminUsername: session.username,
            targetType: 'User',
            targetId: id,
            metadata: { bulkOperationId, isActive: false },
          })
          result.updated++
        } else if (action.type === 'changeRole') {
          if (user.role === action.payload.role) {
            result.skipped.push({ id, reason: 'role already matches' })
            continue
          }
          await prisma.user.update({
            where: { id },
            data: { role: action.payload.role },
          })
          await logAdminAction({
            request: req,
            action: AdminActionType.USER_ROLE_CHANGED,
            description: `Bulk: changed role of ${user.email} from ${user.role} to ${action.payload.role}`,
            adminId: session.sub,
            adminUsername: session.username,
            targetType: 'User',
            targetId: id,
            metadata: { bulkOperationId, from: user.role, to: action.payload.role },
          })
          result.updated++
        } else if (action.type === 'changeHierarchy') {
          if (user.hierarchyLevel === action.payload.hierarchyLevel) {
            result.skipped.push({ id, reason: 'hierarchy already matches' })
            continue
          }
          await prisma.user.update({
            where: { id },
            data: { hierarchyLevel: action.payload.hierarchyLevel },
          })
          await logAdminAction({
            request: req,
            action: AdminActionType.USER_UPDATED,
            description: `Bulk: changed hierarchy of ${user.email} from ${user.hierarchyLevel ?? '—'} to ${action.payload.hierarchyLevel}`,
            adminId: session.sub,
            adminUsername: session.username,
            targetType: 'User',
            targetId: id,
            metadata: {
              bulkOperationId,
              field: 'hierarchyLevel',
              from: user.hierarchyLevel,
              to: action.payload.hierarchyLevel,
            },
          })
          result.updated++
        }
      } catch (err) {
        console.error('Bulk action error for user', id, err)
        result.skipped.push({ id, reason: 'update failed' })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk users endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
