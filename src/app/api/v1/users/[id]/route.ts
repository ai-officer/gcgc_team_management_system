import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { handleCorsPreFlight, corsResponse } from '@/lib/cors'

/**
 * Helper function to verify API Key for server-to-server authentication.
 * Used by TMS Server backend to fetch user data.
 */
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const validApiKey = process.env.API_KEY

  if (!validApiKey) {
    console.warn('⚠️ API_KEY not configured in environment variables')
    return false
  }

  return apiKey === validApiKey
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreFlight(req)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Support two authentication methods:
    // 1. API Key (for server-to-server from TMS Server)
    // 2. Session (for authenticated users)
    const hasValidApiKey = verifyApiKey(req)
    const session = await getServerSession(authOptions)

    // Allow access if either auth method is valid
    if (!hasValidApiKey && !session?.user) {
      return corsResponse(req, { error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user from database
    // Include additional fields needed by TMS Server
    const user = await prisma.user.findUnique({
      where: {
        id: params.id,
        isActive: true // Only return active users
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        middleName: true,
        name: true,
        image: true,
        role: true,
        positionTitle: true,
        division: true,
        department: true,
        section: true,
        customTeam: true,
        hierarchyLevel: true,
        reportsToId: true,
        isActive: true,
        isLeader: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return corsResponse(req, { error: 'User not found' }, { status: 404 })
    }

    return corsResponse(req, user)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return corsResponse(req, { error: 'Internal server error' }, { status: 500 })
  }
}