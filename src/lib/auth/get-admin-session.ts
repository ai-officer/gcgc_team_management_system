import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminSession as getJwtAdminSession, verifyAdminSession } from './admin-session'

export async function getAdminSession(request?: NextRequest) {
  if (request) {
    // First try the admin-specific JWT session
    const jwtSession = await getJwtAdminSession(request)
    if (jwtSession?.isAdmin) {
      return jwtSession
    }

    // Fall back to regular NextAuth session and check for ADMIN role
    const nextAuthSession = await getServerSession(authOptions)
    if (nextAuthSession?.user?.role === 'ADMIN') {
      return {
        sub: nextAuthSession.user.id,
        username: nextAuthSession.user.email || '',
        isAdmin: true,
        iat: Date.now(),
        exp: Date.now() + 86400000
      }
    }
  }
  return null
}

export async function requireAdminAuth(request: NextRequest) {
  const session = await getJwtAdminSession(request)
  
  if (!session?.isAdmin) {
    throw new Error('Admin authentication required')
  }
  
  return session
}

export async function withAdminAuth(handler: (req: NextRequest, params?: any) => Promise<NextResponse>) {
  return async (req: NextRequest, params?: any) => {
    try {
      const session = await getJwtAdminSession(req)
      
      if (!session?.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      return handler(req, params)
    } catch (error) {
      console.error('Admin auth error:', error)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
}