import type { NextRequest } from 'next/server'
import { Prisma, AdminActionType, AdminActionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getClientIp } from '@/lib/rate-limit'

export interface LogAdminActionInput {
  request: NextRequest
  action: AdminActionType
  description: string
  adminId?: string | null
  adminUsername?: string | null
  targetType?: string
  targetId?: string
  status?: AdminActionStatus
  metadata?: Prisma.InputJsonValue
}

export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  try {
    await prisma.adminActivity.create({
      data: {
        adminId: input.adminId ?? null,
        adminUsername: input.adminUsername ?? null,
        action: input.action,
        description: input.description,
        targetType: input.targetType,
        targetId: input.targetId,
        ipAddress: getClientIp(input.request),
        userAgent: input.request.headers.get('user-agent') ?? undefined,
        status: input.status ?? AdminActionStatus.SUCCESS,
        metadata: input.metadata,
      },
    })
  } catch (err) {
    // Never let audit logging break the user-facing action.
    console.error('Failed to write admin audit log:', err)
  }
}
