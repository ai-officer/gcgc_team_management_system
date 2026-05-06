import { NextRequest, NextResponse } from 'next/server'
import { AdminActionType } from '@prisma/client'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { logAdminAction } from '@/lib/admin-audit'
import {
  IMPERSONATION_MARKER_COOKIE,
  getNextAuthSessionCookieName,
} from '@/lib/auth/impersonation'

export async function POST(req: NextRequest) {
  // Admin session is what authorizes ending impersonation. We do NOT require
  // the impersonated user-side session to still be valid (it may have already
  // expired) — what matters is that the original admin-session cookie is good.
  const session = await getAdminSession(req)
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Extract whom we were impersonating (best-effort, for the audit entry).
  let impersonatedUserId: string | null = null
  let impersonatedUserEmail: string | null = null
  try {
    const raw = req.cookies.get(IMPERSONATION_MARKER_COOKIE)?.value
    if (raw) {
      const parsed = JSON.parse(raw) as { userId?: string; userEmail?: string }
      impersonatedUserId = parsed.userId ?? null
      impersonatedUserEmail = parsed.userEmail ?? null
    }
  } catch {
    // Marker missing or malformed — still let admin recover.
  }

  await logAdminAction({
    request: req,
    action: AdminActionType.IMPERSONATION_ENDED,
    description: impersonatedUserEmail
      ? `Ended impersonation of ${impersonatedUserEmail}`
      : 'Ended impersonation',
    adminId: session.sub,
    adminUsername: session.username,
    targetType: impersonatedUserId ? 'User' : undefined,
    targetId: impersonatedUserId ?? undefined,
  })

  const response = NextResponse.json({
    success: true,
    redirectTo: '/admin/users',
  })

  const isProd = process.env.NODE_ENV === 'production'
  const clearOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }

  response.cookies.set(getNextAuthSessionCookieName(), '', clearOpts)
  response.cookies.set(IMPERSONATION_MARKER_COOKIE, '', { ...clearOpts, httpOnly: false })

  return response
}
