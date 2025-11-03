import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleCorsPreFlight, corsResponse } from '@/lib/cors'
import jwt from 'jsonwebtoken'

/**
 * GET /api/v1/auth/token
 *
 * Returns a standard JWT token for the current authenticated user.
 * This token can be used for cross-domain API calls.
 *
 * The token includes the same data as the session:
 * - id: User ID
 * - email: User email
 * - name: User display name
 * - role: User role
 * - hierarchyLevel: User hierarchy level
 * - image: User profile image
 * - iat: Issued at timestamp
 * - exp: Expiration timestamp (1 hour)
 *
 * @returns {object} - { success: boolean, token: string, expiresAt: number, user: object }
 */

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request)
}

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return corsResponse(
        request,
        { error: 'Unauthorized - No active session' },
        { status: 401 }
      )
    }

    // Create a standard JWT token using jsonwebtoken library
    // This is compatible with PyJWT and other standard JWT libraries
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

    return corsResponse(request, {
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
    return corsResponse(
      request,
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
