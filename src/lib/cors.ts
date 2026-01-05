import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS configuration for cross-origin requests
 * Allows TMS Chat (staging/production) to access the API
 */
const ALLOWED_ORIGINS = [
  'https://tms-chat-staging.hotelsogo-ai.com',
  'https://tms-chat.hotelsogo-ai.com',
  'http://localhost:3000', // Local development
  'http://localhost:3001', // Alternative local port
]

/**
 * Get CORS headers for the given request
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || ''

  // Check if the origin is allowed
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) ||
                          origin.startsWith('http://localhost:')

  if (!isAllowedOrigin && origin) {
    // Origin is not allowed, don't set CORS headers
    return {}
  }

  return {
    'Access-Control-Allow-Origin': origin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
}

/**
 * Create a NextResponse with CORS headers
 */
export function corsResponse(
  request: NextRequest,
  data: any,
  options?: { status?: number; headers?: HeadersInit }
): NextResponse {
  const corsHeaders = getCorsHeaders(request)

  const response = NextResponse.json(data, {
    status: options?.status,
    headers: {
      ...corsHeaders,
      ...(options?.headers || {}),
    },
  })

  return response
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCorsPreFlight(request: NextRequest): NextResponse {
  const corsHeaders = getCorsHeaders(request)

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

/**
 * Add CORS headers to an existing NextResponse
 */
export function addCorsHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const corsHeaders = getCorsHeaders(request)

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}
