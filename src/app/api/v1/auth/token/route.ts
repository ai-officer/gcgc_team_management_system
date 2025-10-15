import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { encode } from 'next-auth/jwt'

/**
 * GET /api/v1/auth/token
 *
 * Returns a JWT token for the current authenticated user.
 * This token can be used for cross-domain API calls.
 *
 * The token includes the same data as the session:
 * - user.id
 * - user.email
 * - user.role
 * - user.hierarchyLevel
 *
 * @returns {object} - { token: string, expiresAt: number }
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - No active session' },
        { status: 401 }
      )
    }

    // Create a JWT token with the same data as the session
    const token = await encode({
      token: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        hierarchyLevel: session.user.hierarchyLevel,
        image: session.user.image,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
      },
      secret: process.env.NEXTAUTH_SECRET!,
    })

    return NextResponse.json({
      success: true,
      token,
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour from now
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      }
    })

  } catch (error) {
    console.error('Error generating token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
