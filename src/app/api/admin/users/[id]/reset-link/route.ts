import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { AdminActionType } from '@prisma/client'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/admin-audit'

const TOKEN_TTL_HOURS = 1

export async function POST(
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
      select: { id: true, email: true, name: true, isActive: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Cannot generate a reset link for an inactive user' },
        { status: 400 }
      )
    }

    // Invalidate any prior unconsumed token for this user — only one active
    // link should exist at a time so we don't have to track which one was sent.
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)

    const created = await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        createdByAdminId: session.sub,
        createdByAdminUsername: session.username,
      },
      select: { id: true, expiresAt: true },
    })

    const origin = req.headers.get('origin') ?? new URL(req.url).origin
    const resetUrl = `${origin}/auth/reset-password/${token}`

    await logAdminAction({
      request: req,
      action: AdminActionType.PASSWORD_RESET_LINK_CREATED,
      description: `Created password reset link for ${user.email}`,
      adminId: session.sub,
      adminUsername: session.username,
      targetType: 'User',
      targetId: user.id,
      metadata: {
        tokenId: created.id,
        expiresAt: created.expiresAt.toISOString(),
      },
    })

    return NextResponse.json({
      resetUrl,
      expiresAt: created.expiresAt.toISOString(),
      target: { id: user.id, email: user.email, name: user.name },
    })
  } catch (error) {
    console.error('Reset-link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
