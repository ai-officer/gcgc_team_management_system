import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { googleCalendarService } from '@/lib/google-calendar'

// GET - Fetch holidays from Google Calendar
// Returns empty array on any error to prevent UI disruption
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      console.log('[Holidays API] No session found')
      return NextResponse.json({ holidays: [] })
    }

    console.log('[Holidays API] Fetching holidays for user:', session.user.id)

    const { searchParams } = new URL(req.url)
    const country = searchParams.get('country') || 'en.philippines'
    const holidayCalendarId = `${country}#holiday@group.v.calendar.google.com`

    try {
      const calendar = await googleCalendarService.getCalendarClient(session.user.id)

      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const endOfYear = new Date(now.getFullYear(), 11, 31)

      const response = await calendar.events.list({
        calendarId: holidayCalendarId,
        timeMin: startOfYear.toISOString(),
        timeMax: endOfYear.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      })

      const holidays = (response.data.items || []).map((event: any) => ({
        id: event.id,
        title: event.summary,
        date: event.start?.date || event.start?.dateTime,
        description: event.description,
        isHoliday: true,
      }))

      console.log(`[Holidays API] Successfully fetched ${holidays.length} holidays`)
      return NextResponse.json({ holidays })
    } catch (error: any) {
      console.log('[Holidays API] Calendar error:', error.message || error)

      // Always return empty array for any calendar-related error
      // This prevents UI disruption when Google Calendar is not connected
      return NextResponse.json({ holidays: [] })
    }
  } catch (error: any) {
    console.error('[Holidays API] Unexpected error:', error.message || error)
    // Return empty holidays instead of 500 error to prevent UI disruption
    return NextResponse.json({ holidays: [] })
  }
}
