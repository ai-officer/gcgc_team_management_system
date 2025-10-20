import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
    expectedRedirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
    nodeEnv: process.env.NODE_ENV,
  })
}
