import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { googleCalendarService } from '@/lib/google-calendar'

// GET - Fetch holidays from Google Calendar
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const country = searchParams.get('country') || 'en.philippines'

    // Fetch holidays from Google's holiday calendar
    // Format: en.{country}#holiday@group.v.calendar.google.com
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

      return NextResponse.json({ holidays })
    } catch (error: any) {
      // If calendar not found or not accessible, return empty array
      if (error.code === 404 || error.code === 403) {
        return NextResponse.json({ holidays: [] })
      }
      throw error
    }
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return NextResponse.json(
      { error: 'Failed to fetch holidays' },
      { status: 500 }
    )
  }
}
