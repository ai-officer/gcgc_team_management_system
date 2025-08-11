import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export interface AdminSession {
  sub: string
  username: string
  isAdmin: boolean
  iat: number
  exp: number
}

export async function getAdminSession(request: NextRequest): Promise<AdminSession | null> {
  try {
    const token = request.cookies.get('admin-session')?.value

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, secret)
    
    return payload as unknown as AdminSession
  } catch (error) {
    console.error('Admin session verification error:', error)
    return null
  }
}

export async function verifyAdminSession(request: NextRequest): Promise<boolean> {
  const session = await getAdminSession(request)
  return !!session?.isAdmin
}
