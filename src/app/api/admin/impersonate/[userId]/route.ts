import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { AdminActionType } from '@prisma/client'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/admin-audit'
import {
  IMPERSONATION_MARKER_COOKIE,
  IMPERSONATION_MAX_AGE_SECONDS,
  getNextAuthSessionCookieName,
} from '@/lib/auth/impersonation'

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getAdminSession(req)
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const target = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        hierarchyLevel: true,
        isActive: true,
      },
    })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (!target.isActive) {
      return NextResponse.json(
        { error: 'Cannot impersonate an inactive user' },
        { status: 400 }
      )
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: 'Server misconfigured: NEXTAUTH_SECRET missing' },
        { status: 500 }
      )
    }

    const now = Date.now()
    // Hard 30-min cap: setting both expirations equal forces sign-out at expiry
    // (the JWT callback in src/lib/auth.ts checks accessTokenExpires THEN
    // refreshTokenExpires; both expired => RefreshAccessTokenError => signout).
    const expiresAt = now + IMPERSONATION_MAX_AGE_SECONDS * 1000

    const token = await encode({
      secret,
      maxAge: IMPERSONATION_MAX_AGE_SECONDS,
      token: {
        sub: target.id,
        id: target.id,
        name: target.name,
        email: target.email,
        picture: target.image ?? null,
        image: target.image ?? null,
        role: target.role,
        hierarchyLevel: target.hierarchyLevel,
        accessTokenExpires: expiresAt,
        refreshTokenExpires: expiresAt,
        impersonated: true,
      },
    })

    await logAdminAction({
      request: req,
      action: AdminActionType.USER_IMPERSONATED,
      description: `Impersonating user ${target.email}`,
      adminId: session.sub,
      adminUsername: session.username,
      targetType: 'User',
      targetId: target.id,
      metadata: { expiresAt: new Date(expiresAt).toISOString() },
    })

    const response = NextResponse.json({
      success: true,
      redirectTo: '/user/dashboard',
      target: { id: target.id, email: target.email, name: target.name },
    })

    const isProd = process.env.NODE_ENV === 'production'

    response.cookies.set(getNextAuthSessionCookieName(), token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: IMPERSONATION_MAX_AGE_SECONDS,
    })

    // Non-httpOnly marker so the client banner can read it. URL-encode the JSON
    // payload so unusual chars in user names don't break the cookie value.
    const markerPayload = encodeURIComponent(
      JSON.stringify({
        userId: target.id,
        userEmail: target.email,
        userName: target.name,
        adminUsername: session.username,
        expiresAt,
      })
    )
    response.cookies.set(IMPERSONATION_MARKER_COOKIE, markerPayload, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: IMPERSONATION_MAX_AGE_SECONDS,
    })

    return response
  } catch (error) {
    console.error('Impersonation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
