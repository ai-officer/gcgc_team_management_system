import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const handler = NextAuth(authOptions)

// CORS configuration for TMS Client
const allowedOrigins = [
  'http://localhost:3000',
  'https://tms-client-staging.up.railway.app'
]

// Wrap handler with CORS
function withCORS(handler: any) {
  return async (req: NextRequest) => {
    const origin = req.headers.get('origin')
    const isAllowedOrigin = origin && allowedOrigins.includes(origin)
    
    const corsOptions = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
      'Access-Control-Allow-Credentials': 'true',
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: corsOptions })
    }

    // Process the request
    const response = await handler(req)
    
    // Add CORS headers to the response
    Object.entries(corsOptions).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

const corsHandler = withCORS(handler)

export { corsHandler as GET, corsHandler as POST, corsHandler as OPTIONS }