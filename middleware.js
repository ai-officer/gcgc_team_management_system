import { NextResponse } from 'next/server';

export function middleware(request) {
  // Handle CORS
  const response = NextResponse.next();
  
  // Allowed origins for CORS
  const allowedOrigins = [
    'http://localhost:3000',
    'https://tms-client-staging.up.railway.app', // Add your TMS client staging URL
    // Add more origins as needed for production
  ];
  
  const origin = request.headers.get('origin');
  
  // Set CORS headers
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow same-origin requests
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: response.headers 
    });
  }
  
  return response;
}

export const config = {
  matcher: '/api/:path*'
};