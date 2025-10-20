import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/calendar/google-callback`
)

// GET - Handle OAuth callback from Google
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the user ID
    const error = searchParams.get('error')

    if (error) {
      // User denied access
      return NextResponse.redirect(
        new URL('/user/calendar?error=access_denied', process.env.NEXTAUTH_URL!)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/user/calendar?error=invalid_callback', process.env.NEXTAUTH_URL!)
      )
    }

    const userId = state

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code)

    // Store tokens in database
    await prisma.calendarSyncSettings.upsert({
      where: { userId },
      update: {
        googleAccessToken: tokens.access_token || undefined,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
        isEnabled: true,
      },
      create: {
        userId,
        googleAccessToken: tokens.access_token || undefined,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
        isEnabled: true,
      },
    })

    // Redirect back to calendar with success
    return NextResponse.redirect(
      new URL('/user/calendar?connected=true', process.env.NEXTAUTH_URL!)
    )
  } catch (error) {
    console.error('Error handling Google callback:', error)
    return NextResponse.redirect(
      new URL('/user/calendar?error=callback_failed', process.env.NEXTAUTH_URL!)
    )
  }
}
