import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    // Validate callback URL
    if (!callbackUrl) {
      return NextResponse.json(
        { error: 'Missing callbackUrl parameter' },
        { status: 400 }
      )
    }

    // Get the current session
    const session = await getServerSession(authOptions)

    // If no session, redirect to signin with the original callback
    if (!session || !session.user) {
      const signinUrl = new URL('/auth/signin', request.url)
      signinUrl.searchParams.set('callbackUrl', callbackUrl)
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

    // Redirect to callback URL with token in query parameter
    const redirectUrl = new URL(callbackUrl)
    redirectUrl.searchParams.set('gcgc_token', token)

    console.log(`✅ SSO: User ${session.user.email} authenticated, redirecting to ${callbackUrl}`)

    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('❌ SSO: Error during SSO authentication:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
