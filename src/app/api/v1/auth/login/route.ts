import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCorsPreFlight, corsResponse } from '@/lib/cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

/**
 * POST /api/v1/auth/login
 *
 * Server-to-server authentication endpoint for TMS Client/Server.
 * Validates email/password and returns a JWT token.
 *
 * This endpoint is specifically designed for API clients (like tms-server)
 * that need to authenticate users programmatically.
 *
 * @returns {object} - { success: boolean, token: string, expiresAt: number, user: object }
 */

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return corsResponse(
        request,
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        image: true,
        role: true,
        hierarchyLevel: true,
        isActive: true,
      }
    })

    // Check if user exists
    if (!user) {
      return corsResponse(
        request,
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return corsResponse(
        request,
        { error: 'Account is deactivated' },
        { status: 403 }
      )
    }

    // Verify password
    if (!user.password) {
      return corsResponse(
        request,
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return corsResponse(
        request,
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create JWT token
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hierarchyLevel: user.hierarchyLevel,
      image: user.image,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
    }

    const token = jwt.sign(payload, process.env.NEXTAUTH_SECRET!, {
      algorithm: 'HS256'
    })

    // Log authentication activity
    try {
      await prisma.activity.create({
        data: {
          type: 'LOGIN',
          description: 'User logged in via API',
          userId: user.id,
        }
      })
    } catch (error) {
      // Don't fail the login if activity logging fails
      console.error('Failed to log activity:', error)
    }

    return corsResponse(request, {
      success: true,
      token,
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour from now
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hierarchyLevel: user.hierarchyLevel,
        image: user.image,
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return corsResponse(
      request,
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
