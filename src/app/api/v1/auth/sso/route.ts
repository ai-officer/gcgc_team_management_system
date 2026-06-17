import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveSafeCallbackUrl } from '@/lib/safe-redirect'
import jwt from 'jsonwebtoken'

/**
 * GET /api/v1/auth/sso
 *
 * SSO endpoint for TMS Chat integration.
 *
 * Checks if user is logged into GCGC:
 * - If logged in: Generates JWT token and redirects to callback URL with token
 * - If not logged in: Redirects to GCGC signin page with callback URL
 *
 * Query parameters:
 * - callbackUrl: URL to redirect to after authentication (required)
 *
 * @returns Redirect to either signin page or callback URL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const callbackUrl = searchParams.get('callbackUrl')

    // Validate callback URL against the trusted-host allowlist BEFORE doing
    // anything else. This blocks open-redirect token exfiltration: an
    // attacker cannot lure a logged-in user to ...?callbackUrl=https://evil.com
    // and receive a valid bearer token, nor smuggle it through the signin flow.
    const safeCallback = resolveSafeCallbackUrl(callbackUrl)
    if (!safeCallback) {
      return NextResponse.json(
        { error: 'Invalid or missing callbackUrl parameter' },
        { status: 400 }
      )
    }

    // Get the current session
    const session = await getServerSession(authOptions)

    // If no session, redirect to signin with the (validated) callback
    if (!session || !session.user) {
      const signinUrl = new URL('/auth/signin', request.url)
      signinUrl.searchParams.set('callbackUrl', safeCallback.toString())
      return NextResponse.redirect(signinUrl)
    }

    // User is logged in - generate token
    const payload = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      hierarchyLevel: session.user.hierarchyLevel,
      image: session.user.image,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
    }

    const token = jwt.sign(payload, process.env.NEXTAUTH_SECRET!, {
      algorithm: 'HS256'
    })

    // Redirect to the validated callback URL with token in query parameter
    const redirectUrl = safeCallback
    redirectUrl.searchParams.set('gcgc_token', token)

    console.log(`✅ SSO: User ${session.user.email} authenticated, redirecting to ${redirectUrl.origin}`)

    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('❌ SSO: Error during SSO authentication:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
