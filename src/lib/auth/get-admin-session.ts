import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession as getJwtAdminSession, verifyAdminSession } from './admin-session'

export async function getAdminSession(request?: NextRequest) {
  if (request) {
    return await getJwtAdminSession(request)
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