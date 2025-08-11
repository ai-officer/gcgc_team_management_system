import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin-session'

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request)
    
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: session.sub,
        username: session.username,
        isAdmin: session.isAdmin
      }
    })
  } catch (error) {
    console.error('Admin session check error:', error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}