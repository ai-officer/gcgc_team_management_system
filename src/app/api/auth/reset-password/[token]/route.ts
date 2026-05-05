import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { AdminActionType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/admin-audit'

const consumeSchema = z.object({
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .refine(v => /[A-Z]/.test(v), 'Password must include an uppercase letter')
    .refine(v => /[a-z]/.test(v), 'Password must include a lowercase letter')
    .refine(v => /[0-9]/.test(v), 'Password must include a number'),
})

interface RouteParams {
  params: { token: string }
}

async function loadActiveToken(token: string) {
  const row = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, email: true, name: true, isActive: true } },
    },
  })
  if (!row) return { row: null, reason: 'Invalid reset link' as const }
  if (row.consumedAt) return { row, reason: 'used' as const }
  if (row.expiresAt < new Date()) return { row, reason: 'expired' as const }
  if (!row.user.isActive) return { row, reason: 'user inactive' as const }
  return { row, reason: 'ok' as const }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { row, reason } = await loadActiveToken(params.token)
  if (!row) return NextResponse.json({ error: 'Invalid reset link' }, { status: 404 })
  if (reason === 'used') {
    return NextResponse.json({ error: 'This reset link has already been used' }, { status: 410 })
  }
  if (reason === 'expired') {
    return NextResponse.json({ error: 'This reset link has expired' }, { status: 410 })
  }
  if (reason === 'user inactive') {
    return NextResponse.json({ error: 'Account is inactive' }, { status: 410 })
  }

  return NextResponse.json({
    target: {
      email: row.user.email,
      name: row.user.name,
    },
    expiresAt: row.expiresAt.toISOString(),
  })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const body = await req.json()
    const parsed = consumeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
        { status: 400 }
      )
    }

    const { row, reason } = await loadActiveToken(params.token)
    if (!row) return NextResponse.json({ error: 'Invalid reset link' }, { status: 404 })
    if (reason === 'used') {
      return NextResponse.json({ error: 'This reset link has already been used' }, { status: 410 })
    }
    if (reason === 'expired') {
      return NextResponse.json({ error: 'This reset link has expired' }, { status: 410 })
    }
    if (reason === 'user inactive') {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 410 })
    }

    const hashed = await bcrypt.hash(parsed.data.password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.user.id },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      // Invalidate any other still-pending tokens for this user.
      prisma.passwordResetToken.updateMany({
        where: {
          userId: row.user.id,
          id: { not: row.id },
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { expiresAt: new Date() },
      }),
    ])

    await logAdminAction({
      request: req,
      action: AdminActionType.PASSWORD_RESET_LINK_CONSUMED,
      description: `Password reset via link for ${row.user.email}`,
      adminId: null,
      adminUsername: row.createdByAdminUsername,
      targetType: 'User',
      targetId: row.user.id,
      metadata: { tokenId: row.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password reset consume error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
