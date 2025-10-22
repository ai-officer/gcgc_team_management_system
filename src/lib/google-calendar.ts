import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

interface GoogleCalendarEvent {
  summary: string
  description?: string
  start?: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end?: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  colorId?: string
  location?: string
  recurrence?: string[]
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
        timeMin: options.timeMin, // No default, fetch all if not specified
        timeMax: options.timeMax,
        maxResults: options.maxResults || 2500,
        singleEvents: true,
        orderBy: 'startTime',
      })

      return response.data.items || []
    } catch (error) {
      console.error('Error listing Google Calendar events:', error)
      throw error
    }
  }

  async listCalendars(userId: string) {
    const calendar = await this.getCalendarClient(userId)

    try {
      const response = await calendar.calendarList.list()
      return response.data.items || []
    } catch (error) {
      console.error('Error listing user calendars:', error)
      throw error
    }
  }

  async subscribeToCalendar(userId: string, calendarId: string, webhookUrl: string) {
    const calendar = await this.getCalendarClient(userId)

    try {
      const uuid = `${userId}-${Date.now()}`
      const response = await calendar.events.watch({
        calendarId: calendarId || 'primary',
        requestBody: {
          id: uuid,
          type: 'web_hook',
          address: webhookUrl,
        },
      })

      return {
        channelId: response.data.id,
        resourceId: response.data.resourceId,
        expiration: response.data.expiration,
      }
    } catch (error) {
      console.error('Error subscribing to calendar:', error)
      throw error
    }
  }

  async stopWatchingCalendar(userId: string, channelId: string, resourceId: string) {
    const calendar = await this.getCalendarClient(userId)

    try {
      await calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId: resourceId,
        },
      })
    } catch (error) {
      console.error('Error stopping calendar watch:', error)
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

  async createTMSCalendar(userId: string) {
    const calendar = await this.getCalendarClient(userId)

    try {
      // Check if TMS_CALENDAR already exists
      const calendars = await this.getCalendarList(userId)
      const existingTMSCalendar = calendars.find(
        (cal) => cal.summary === 'TMS_CALENDAR' || cal.summary === 'TMS Calendar' || cal.summary === 'GCGC Team Management'
      )

      if (existingTMSCalendar) {
        console.log('Found existing TMS_CALENDAR:', existingTMSCalendar.id)
        return existingTMSCalendar.id || 'primary'
      }

      // Create new TMS_CALENDAR
      const response = await calendar.calendars.insert({
        requestBody: {
          summary: 'TMS_CALENDAR',
          description: 'Dedicated calendar for GCGC Team Management System - ONLY TMS work-related tasks and events. Personal calendar events are NOT synced here.',
          timeZone: 'UTC',
        }
      })

      console.log('Created new TMS_CALENDAR:', response.data.id)
      return response.data.id || 'primary'
    } catch (error) {
      console.error('Error creating TMS_CALENDAR:', error)
      throw error
    }
  }

  async findOrCreateTMSCalendar(userId: string): Promise<string> {
    try {
      // First, try to find existing TMS_CALENDAR
      const calendars = await this.getCalendarList(userId)
      const tmsCalendar = calendars.find(
        (cal) => cal.summary === 'TMS_CALENDAR' || cal.summary === 'TMS Calendar' || cal.summary === 'GCGC Team Management'
      )

      if (tmsCalendar) {
        console.log('Using existing TMS_CALENDAR:', tmsCalendar.id)
        return tmsCalendar.id || 'primary'
      }

      // If not found, create it
      console.log('TMS_CALENDAR not found, creating new one...')
      return await this.createTMSCalendar(userId)
    } catch (error) {
      console.error('Error finding or creating TMS_CALENDAR:', error)
      throw new Error('Failed to find or create TMS_CALENDAR. Please ensure you have granted calendar permissions.')
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

  // Convert TMS task to Google Calendar format
  convertTMSTaskToGoogle(task: any): GoogleCalendarEvent {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null
    const startDate = task.startDate ? new Date(task.startDate) : null

    // Use startDate if available, otherwise use dueDate as start (single-day event)
    const startTime = startDate || dueDate || new Date()
    let endTime = dueDate || new Date(startTime.getTime() + 60 * 60 * 1000)

    const googleEvent: GoogleCalendarEvent = {
      summary: `[Task] ${task.title}`,
      description: this.formatTaskDescription(task),
    }

    // Handle all-day events
    if (task.allDay) {
      // For date ranges, ensure we include the full last day
      // Google Calendar requires end date to be exclusive (day after) for all-day events
      const endDatePlusOne = new Date(endTime)
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1)

      googleEvent.start = { date: startTime.toISOString().split('T')[0] }
      googleEvent.end = { date: endDatePlusOne.toISOString().split('T')[0] }
    } else {
      // For timed events with date ranges, set end time to end of day on dueDate
      // This ensures the event spans the full range visually in Google Calendar
      if (startDate && dueDate) {
        const endOfDay = new Date(endTime)
        endOfDay.setHours(23, 59, 59, 999)
        endTime = endOfDay
      }

      googleEvent.start = { dateTime: startTime.toISOString(), timeZone: 'UTC' }
      googleEvent.end = { dateTime: endTime.toISOString(), timeZone: 'UTC' }
    }

    // Add location if provided
    if (task.location) {
      googleEvent.location = task.location
    }

    // Add recurrence if provided
    if (task.recurrence) {
      googleEvent.recurrence = [task.recurrence]
    }

    // Map task priority to Google Calendar colors
    const colorMap: Record<string, string> = {
      LOW: '2', // Green
      MEDIUM: '5', // Yellow
      HIGH: '6', // Orange
      URGENT: '11', // Red
    }

    if (task.priority && colorMap[task.priority]) {
      googleEvent.colorId = colorMap[task.priority]
    }

    return googleEvent
  }

  // Format task description with additional details
  private formatTaskDescription(task: any): string {
    let description = task.description || ''

    // Add meeting link at the top if available
    if (task.meetingLink) {
      description += `\n\n🔗 Meeting Link: ${task.meetingLink}`
    }

    description += `\n\n--- Task Details ---`
    description += `\nStatus: ${task.status}`
    description += `\nPriority: ${task.priority}`
    description += `\nProgress: ${task.progressPercentage || 0}%`
    description += `\nType: ${task.taskType}`
    
    if (task.assignee) {
      const assigneeName = task.assignee.firstName && task.assignee.lastName
        ? `${task.assignee.firstName} ${task.assignee.lastName}`
        : task.assignee.name || task.assignee.email
      description += `\nAssignee: ${assigneeName}`
    }

    if (task.creator) {
      const creatorName = task.creator.firstName && task.creator.lastName
        ? `${task.creator.firstName} ${task.creator.lastName}`
        : task.creator.name || task.creator.email
      description += `\nCreator: ${creatorName}`
    }

    if (task.teamMembers && task.teamMembers.length > 0) {
      const members = task.teamMembers.map((tm: any) => {
        const user = tm.user
        return user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.name || user.email
      }).join(', ')
      description += `\nTeam Members: ${members}`
    }

    if (task.collaborators && task.collaborators.length > 0) {
      const collabs = task.collaborators.map((c: any) => {
        const user = c.user
        return user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.name || user.email
      }).join(', ')
      description += `\nCollaborators: ${collabs}`
    }

    return description
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
