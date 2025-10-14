import { NextResponse } from 'next/server';

export function middleware(request) {
  // Allowed origins for CORS
  const allowedOrigins = [
    'http://localhost:3000',
    'https://tms-client-staging.up.railway.app',
  ];
  
  const origin = request.headers.get('origin');
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'https://tms-client-staging.up.railway.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Cookie',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  // Handle actual requests
  const response = NextResponse.next();
  
  // Set CORS headers for allowed origins
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Cookie');
  }
  
  return response;
}

export const config = {
  matcher: '/api/:path*'
};