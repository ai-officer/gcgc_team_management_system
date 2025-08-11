import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAdminSession } from '@/lib/auth/admin-session'

export async function adminMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow admin login and auth endpoints
  if (pathname === '/administrator/login' || 
      pathname.startsWith('/api/admin/auth') || 
      pathname === '/api/admin/login' || 
      pathname === '/api/admin/logout' ||
      pathname === '/api/admin/session') {
    return NextResponse.next()
  }

  // Check admin authentication for protected admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const isAdminAuthenticated = await verifyAdminSession(request)
    if (!isAdminAuthenticated) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        )
      } else {
        return NextResponse.redirect(new URL('/administrator/login', request.url))
      }
    }
  }

  return NextResponse.next()
}
