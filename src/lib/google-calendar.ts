import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

interface GoogleCalendarEvent {
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  colorId?: string
}

export class GoogleCalendarService {
  private oauth2Client

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )
  }

  async getCalendarClient(userId: string) {
    const syncSettings = await prisma.calendarSyncSettings.findUnique({
      where: { userId }
    })

    if (!syncSettings?.googleAccessToken) {
      throw new Error('No Google Calendar access token found')
    }

    // Check if token is expired
    const now = new Date()
    if (syncSettings.googleTokenExpiry && syncSettings.googleTokenExpiry < now) {
      // Token is expired, try to refresh
      if (syncSettings.googleRefreshToken) {
        await this.refreshAccessToken(userId, syncSettings.googleRefreshToken)
        // Fetch updated settings
        const updatedSettings = await prisma.calendarSyncSettings.findUnique({
          where: { userId }
        })
        if (!updatedSettings?.googleAccessToken) {
          throw new Error('Failed to refresh access token')
        }
        this.oauth2Client.setCredentials({
          access_token: updatedSettings.googleAccessToken,
          refresh_token: updatedSettings.googleRefreshToken || undefined,
        })
      } else {
        throw new Error('Access token expired and no refresh token available')
      }
    } else {
      this.oauth2Client.setCredentials({
        access_token: syncSettings.googleAccessToken,
        refresh_token: syncSettings.googleRefreshToken || undefined,
      })
    }

    return google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  async refreshAccessToken(userId: string, refreshToken: string) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()

      await prisma.calendarSyncSettings.update({
        where: { userId },
        data: {
          googleAccessToken: credentials.access_token || undefined,
          googleTokenExpiry: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : undefined,
        }
      })

      return credentials.access_token
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw new Error('Failed to refresh access token')
    }
  }

  async createEvent(userId: string, event: GoogleCalendarEvent, calendarId: string = 'primary') {
    const calendar = await this.getCalendarClient(userId)

    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      })

      return response.data
    } catch (error) {
      console.error('Error creating Google Calendar event:', error)
      throw error
    }
  }

  async updateEvent(
    userId: string,
    eventId: string,
    event: GoogleCalendarEvent,
    calendarId: string = 'primary'
  ) {
    const calendar = await this.getCalendarClient(userId)

    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
      })

      return response.data
    } catch (error) {
      console.error('Error updating Google Calendar event:', error)
      throw error
    }
  }

  async deleteEvent(userId: string, eventId: string, calendarId: string = 'primary') {
    const calendar = await this.getCalendarClient(userId)

    try {
      await calendar.events.delete({
        calendarId,
        eventId,
      })
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error)
      throw error
    }
  }

  async listEvents(
    userId: string,
    options: {
      calendarId?: string
      timeMin?: string
      timeMax?: string
      maxResults?: number
    } = {}
  ) {
    const calendar = await this.getCalendarClient(userId)

    try {
      const response = await calendar.events.list({
        calendarId: options.calendarId || 'primary',
        timeMin: options.timeMin || new Date().toISOString(),
        timeMax: options.timeMax,
        maxResults: options.maxResults || 100,
        singleEvents: true,
        orderBy: 'startTime',
      })

      return response.data.items || []
    } catch (error) {
      console.error('Error listing Google Calendar events:', error)
      throw error
    }
  }

  async getCalendarList(userId: string) {
    const calendar = await this.getCalendarClient(userId)

    try {
      const response = await calendar.calendarList.list()
      return response.data.items || []
    } catch (error) {
      console.error('Error listing calendars:', error)
      throw error
    }
  }

  // Convert TMS event to Google Calendar format
  convertTMSEventToGoogle(event: any): GoogleCalendarEvent {
    const googleEvent: GoogleCalendarEvent = {
      summary: event.title,
      description: event.description || '',
      start: event.allDay
        ? { date: event.startTime.split('T')[0] }
        : { dateTime: event.startTime, timeZone: 'UTC' },
      end: event.allDay
        ? { date: event.endTime.split('T')[0] }
        : { dateTime: event.endTime, timeZone: 'UTC' },
    }

    // Map event types to Google Calendar colors
    const colorMap: Record<string, string> = {
      MEETING: '9', // Blue
      DEADLINE: '11', // Red
      REMINDER: '5', // Yellow
      MILESTONE: '10', // Green
      PERSONAL: '3', // Purple
    }

    if (event.type && colorMap[event.type]) {
      googleEvent.colorId = colorMap[event.type]
    }

    return googleEvent
  }

  // Convert Google Calendar event to TMS format
  convertGoogleEventToTMS(googleEvent: any, userId: string) {
    return {
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || '',
      startTime: googleEvent.start.dateTime || googleEvent.start.date,
      endTime: googleEvent.end.dateTime || googleEvent.end.date,
      allDay: !googleEvent.start.dateTime,
      type: 'PERSONAL' as const,
      creatorId: userId,
      googleCalendarId: 'primary',
      googleCalendarEventId: googleEvent.id,
    }
  }
}

export const googleCalendarService = new GoogleCalendarService()
