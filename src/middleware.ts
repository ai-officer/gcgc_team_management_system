import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { UserRole } from '@prisma/client'

async function verifyAdminSession(req: NextRequest): Promise<boolean> {
  try {
    const token = req.cookies.get('admin-session')?.value
    if (!token) {
      return false
    }
    // Simple verification - in production you'd want proper JWT verification
    return token.length > 0
  } catch (error) {
    console.error('Admin session verification error:', error)
    return false
  }
}

async function adminMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Allow admin login/logout/session APIs without any authentication
  if (pathname.startsWith('/api/admin/login') || pathname.startsWith('/api/admin/logout') || pathname.startsWith('/api/admin/session')) {
    return NextResponse.next()
  }
  
  // Allow admin login page
  if (pathname === '/administrator/login') {
    return NextResponse.next()
  }
  
  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const isAdminAuthenticated = await verifyAdminSession(req)
    if (!isAdminAuthenticated) {
      return NextResponse.redirect(new URL('/administrator/login', req.url))
    }
    return NextResponse.next()
  }
  
  // Protect admin API routes (except login/logout)
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    const isAdminAuthenticated = await verifyAdminSession(req)
    if (!isAdminAuthenticated) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }
    return NextResponse.next()
  }
  
  return null // Continue to custom middleware
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Allow CORS preflight requests (OPTIONS) to pass through without authentication
  if (req.method === 'OPTIONS') {
    return NextResponse.next()
  }
  
  // First check if this is an admin-related request
  const adminResult = await adminMiddleware(req)
  if (adminResult) {
    return adminResult
  }
  
  // Allow access to public pages
  if (pathname === '/' || pathname.startsWith('/auth') || pathname === '/register' || pathname === '/administrator/login') {
    return NextResponse.next()
  }
  
  // Allow public API routes needed for registration without authentication
  const publicApiRoutes = [
    '/api/auth', 
    '/api/organizational-units', 
    '/api/job-levels',
    '/api/section-heads',
    '/api/sector-heads',
    '/api/teams-data',
    '/api/users/leaders'
  ]
  const isPublicApiRoute = publicApiRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  if (isPublicApiRoute) {
    return NextResponse.next()
  }
  
  // Get the NextAuth token for user authentication
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  
  // Redirect unauthenticated users to login (for regular user routes)
  if (!token) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }
  
  const userRole = token.role as UserRole
  
  // User portal access control
  if (pathname.startsWith('/user')) {
    // Allow all authenticated users to access user portal
    return NextResponse.next()
  }
  
  // API routes protection (non-admin)
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/admin')) {
    // Protected API routes (require authentication)
    const protectedApiRoutes = ['/api/tasks', '/api/teams', '/api/users', '/api/events']
    const isProtectedApiRoute = protectedApiRoutes.some(route => 
      pathname.startsWith(route)
    )
    
    if (isProtectedApiRoute && !token) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.next()
  }
  
  // Default redirect based on role
  if (pathname === '/') {
    if (userRole) {
      return NextResponse.redirect(new URL('/user/dashboard', req.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}