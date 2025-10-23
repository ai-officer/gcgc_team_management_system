'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Calendar as CalendarIcon, AlertCircle, Settings, Wifi, WifiOff, RefreshCw, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { EVENT_TYPE_COLORS } from '@/constants'
import CalendarSyncSettingsModal from '@/components/calendar/CalendarSyncSettingsModal'
import { useCalendarSync } from '@/hooks/useCalendarSync'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  allDay?: boolean
  color?: string
  type: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'MILESTONE' | 'PERSONAL'
  creator?: {
    id: string
    name: string
    email: string
  }
  team?: {
    id: string
    name: string
  }
  task?: {
    id: string
    title: string
    priority: string
    status: string
  }
}

interface TaskDeadline {
  id: string
  title: string
  dueDate: string
  startDate?: string
  allDay?: boolean
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED'
  googleCalendarEventId?: string | null
  assignee?: {
    id: string
    name: string
    email: string
  }
  team?: {
    id: string
    name: string
  } | null
}

export default function CalendarPage() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false)
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [cleanupMessage, setCleanupMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Helper function to format dates for FullCalendar
  const formatEventDates = (startTime: string, endTime: string, allDay: boolean) => {
    if (allDay) {
      // Convert to date-only format (YYYY-MM-DD) for all-day events
      const start = new Date(startTime).toISOString().split('T')[0]

      // FullCalendar requires end date to be exclusive (day after) for all-day events
      const endDate = new Date(endTime)
      endDate.setDate(endDate.getDate() + 1)
      const end = endDate.toISOString().split('T')[0]

      return { start, end }
    } else {
      // For timed events, use ISO format
      return {
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString()
      }
    }
  }

  // Real-time calendar sync with WebSocket
  const fetchCalendarData = useCallback(async () => {
    if (!session?.user) return

    try {
      setLoading(true)

      // Fetch all data in parallel including Gmail calendar data
      const [eventsResponse, tasksResponse, syncSettingsResponse, holidaysResponse] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/tasks?status=TODO,IN_PROGRESS,IN_REVIEW'),
        fetch('/api/calendar/sync-settings'),
        fetch('/api/calendar/holidays')
      ])

      if (!eventsResponse.ok || !tasksResponse.ok) {
        throw new Error('Failed to fetch calendar data')
      }

      const [eventsData, tasksData, syncData, holidaysData] = await Promise.all([
        eventsResponse.json(),
        tasksResponse.json(),
        syncSettingsResponse.ok ? syncSettingsResponse.json() : { syncSettings: null },
        holidaysResponse.ok ? holidaysResponse.json() : { holidays: [] }
      ])

      const calendarEvents: CalendarEvent[] = []

      // Add regular TMS events
      if (eventsData.events) {
        eventsData.events.forEach((event: any) => {
          const { start, end } = formatEventDates(event.startTime, event.endTime, event.allDay)

          calendarEvents.push({
            id: `event-${event.id}`,
            title: event.title,
            description: event.description,
            start,
            end,
            allDay: event.allDay,
            color: EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS] || '#3b82f6',
            type: event.type,
            creator: event.creator,
            team: event.team
          })
        })
      }

      // Add holidays as events
      if (holidaysData.holidays) {
        holidaysData.holidays.forEach((holiday: any) => {
          const { start, end } = formatEventDates(holiday.date, holiday.date, true)

          calendarEvents.push({
            id: `holiday-${holiday.id}`,
            title: `🎉 ${holiday.title}`,
            description: holiday.description || 'Holiday',
            start,
            end,
            allDay: true,
            color: '#dc2626', // Red color for holidays
            type: 'PERSONAL',
            creator: undefined,
            team: undefined
          })
        })
      }

      // If sync is enabled, automatically fetch Gmail calendar events
      if (syncData.syncSettings?.isEnabled) {
        try {
          // Automatically trigger sync from Google to get latest events
          const syncResponse = await fetch('/api/calendar/sync-from-google', {
            method: 'POST'
          })
          
          if (syncResponse.ok) {
            // Refetch events after sync to include Gmail events
            const updatedEventsResponse = await fetch('/api/events')
            if (updatedEventsResponse.ok) {
              const updatedEventsData = await updatedEventsResponse.json()
              
              // Clear existing TMS events and re-add with Gmail events
              const tmsEvents = calendarEvents.filter(e => !e.id.startsWith('event-'))
              
              if (updatedEventsData.events) {
                updatedEventsData.events.forEach((event: any) => {
                  const { start, end } = formatEventDates(event.startTime, event.endTime, event.allDay)

                  tmsEvents.push({
                    id: `event-${event.id}`,
                    title: event.title,
                    description: event.description,
                    start,
                    end,
                    allDay: event.allDay,
                    color: event.googleCalendarEventId
                      ? '#10b981' // Green for Gmail events
                      : EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS] || '#3b82f6',
                    type: event.type,
                    creator: event.creator,
                    team: event.team
                  })
                })
              }
              
              // Replace calendar events with updated list
              calendarEvents.length = 0
              calendarEvents.push(...tmsEvents)
            }
          }
        } catch (syncError) {
          console.error('Auto-sync failed:', syncError)
          // Continue with existing events if sync fails
        }
      }

      // Add task deadlines as events
      if (tasksData.tasks) {
        tasksData.tasks.forEach((task: TaskDeadline) => {
          if (task.dueDate && task.status !== 'COMPLETED') {
            const isLeaderTask = session?.user?.role === 'LEADER'
            const isMyTask = task.assignee?.id === session?.user?.id

            if (isMyTask || isLeaderTask) {
              const priorityColors = {
                URGENT: '#dc2626',
                HIGH: '#ea580c',
                MEDIUM: '#d97706',
                LOW: '#16a34a'
              }

              // Use startDate if available, otherwise use dueDate
              // This makes tasks span across multiple days if they have a date range
              const eventStart = task.startDate || task.dueDate
              const eventEnd = task.dueDate
              const isAllDay = task.allDay !== undefined ? task.allDay : true

              let start: string
              let end: string

              if (isAllDay) {
                // Convert to date-only format (YYYY-MM-DD) for all-day events
                start = new Date(eventStart).toISOString().split('T')[0]

                // FullCalendar requires end date to be exclusive (day after) for all-day events
                const endDatePlusOne = new Date(eventEnd)
                endDatePlusOne.setDate(endDatePlusOne.getDate() + 1)
                end = endDatePlusOne.toISOString().split('T')[0]
              } else {
                // For timed events with date ranges, adjust end time to span full days visually
                start = new Date(eventStart).toISOString()
                
                // If there's a date range, extend to end of last day for visual continuity
                if (task.startDate && task.dueDate) {
                  const endOfDay = new Date(eventEnd)
                  endOfDay.setHours(23, 59, 59, 999)
                  end = endOfDay.toISOString()
                } else {
                  end = new Date(eventEnd).toISOString()
                }
              }

              calendarEvents.push({
                id: `task-${task.id}`,
                title: `[Task] ${task.title}`,
                description: `Due: ${task.team?.name || 'Individual'} task`,
                start,
                end,
                allDay: isAllDay,
                color: priorityColors[task.priority],
                type: 'DEADLINE',
                team: task.team || undefined,
                task: {
                  id: task.id,
                  title: task.title,
                  priority: task.priority,
                  status: task.status
                }
              })
            }
          }
        })
      }

      setEvents(calendarEvents)
    } catch (err) {
      console.error('Error fetching calendar data:', err)
      setError('Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [session])

  const { status, triggerManualSync, isConnected } = useCalendarSync(fetchCalendarData)

  useEffect(() => {
    fetchCalendarData()
  }, [fetchCalendarData])

  const handleEventClick = (clickInfo: any) => {
    const eventId = clickInfo.event.id
    const event = events.find(e => e.id === eventId)
    if (event) {
      setSelectedEvent(event)
      setIsEventDialogOpen(true)
    }
  }

  const handleDateSelect = (selectInfo: any) => {
    // TODO: Implement create new event functionality
    console.log('Date selected:', selectInfo)
  }

  const handleCleanupDuplicates = async () => {
    try {
      setIsCleaningUp(true)
      setCleanupMessage(null)

      const response = await fetch('/api/calendar/cleanup-duplicates', {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup duplicates')
      }

      setCleanupMessage({
        type: 'success',
        text: `Successfully cleaned up ${data.stats.deleted} orphaned event(s)`
      })

      // Refresh calendar after cleanup
      await fetchCalendarData()

      // Clear message after 5 seconds
      setTimeout(() => setCleanupMessage(null), 5000)
    } catch (err) {
      console.error('Cleanup error:', err)
      setCleanupMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to cleanup duplicates'
      })
    } finally {
      setIsCleaningUp(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  const isLeader = session?.user?.role === 'LEADER'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">
              {isLeader
                ? "View your schedule and team deadlines"
                : "View your schedule and task deadlines"
              }
            </p>
            {/* Real-time sync status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                  <Wifi className="h-3 w-3" />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1 bg-gray-50 text-gray-500">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
              {status.isSyncing && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Syncing...
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isConnected && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerManualSync}
                disabled={status.isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${status.isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanupDuplicates}
                disabled={isCleaningUp}
              >
                <Trash2 className={`h-4 w-4 mr-2 ${isCleaningUp ? 'animate-pulse' : ''}`} />
                {isCleaningUp ? 'Cleaning...' : 'Clean Up Duplicates'}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setIsSyncSettingsOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Google Calendar Sync
          </Button>
        </div>
      </div>

      {/* Cleanup Message */}
      {cleanupMessage && (
        <div className={`p-4 rounded-lg border ${
          cleanupMessage.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {cleanupMessage.type === 'success' ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <p className="font-medium">{cleanupMessage.text}</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">Meetings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span className="text-sm">Urgent Deadlines</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-600"></div>
              <span className="text-sm">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
              <span className="text-sm">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span className="text-sm">Low Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm">Personal</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          {/* Event Legend */}
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span>TMS Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>Gmail Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>Holidays</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              <span>Task Deadlines</span>
            </div>
          </div>
          
          <div className="calendar-square-grid">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              initialView="dayGridMonth"
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={false}
              dayMaxEventRows={false}
              moreLinkClick="popover"
              weekends={true}
              events={events}
              eventClick={handleEventClick}
              select={handleDateSelect}
              aspectRatio={1.2}
              contentHeight="auto"
              eventDisplay="auto"
              eventTextColor="#fff"
              displayEventTime={false}
              displayEventEnd={false}
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                omitZeroMinute: false,
                meridiem: 'short'
              }}
              dayCellClassNames={(arg) => {
                const classes = []
                if (arg.isToday) classes.push('today-cell')
                if (arg.date.getDay() === 0 || arg.date.getDay() === 6) {
                  classes.push('weekend-cell')
                }
                return classes
              }}
              eventClassNames={(arg) => {
                const classes = ['calendar-event']
                if (arg.event.id.startsWith('task-')) {
                  classes.push('task-event')
                } else if (arg.event.id.startsWith('holiday-')) {
                  classes.push('holiday-event')
                } else if (arg.event.backgroundColor === '#10b981') {
                  classes.push('gmail-event')
                } else {
                  classes.push('regular-event')
                }
                return classes
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="text-sm">
                  {new Date(selectedEvent.start).toLocaleDateString()} 
                  {!selectedEvent.allDay && (
                    <> at {new Date(selectedEvent.start).toLocaleTimeString()}</>
                  )}
                </span>
              </div>
              
              {selectedEvent.team && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {selectedEvent.team.name}
                  </Badge>
                </div>
              )}

              {selectedEvent.task && (
                <div className="space-y-2">
                  <h4 className="font-medium">Task Details</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {selectedEvent.task.priority} Priority
                    </Badge>
                    <Badge variant="secondary">
                      {selectedEvent.task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              )}

              {selectedEvent.creator && (
                <div className="text-sm text-muted-foreground">
                  Created by {selectedEvent.creator.name}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Calendar Sync Settings Modal */}
      <CalendarSyncSettingsModal
        isOpen={isSyncSettingsOpen}
        onClose={() => setIsSyncSettingsOpen(false)}
        onSyncComplete={() => {
          // Refresh calendar events after sync
          if (session?.user) {
            const fetchCalendarData = async () => {
              try {
                const [eventsResponse, tasksResponse] = await Promise.all([
                  fetch('/api/events'),
                  fetch('/api/tasks?status=TODO,IN_PROGRESS,IN_REVIEW')
                ])

                if (!eventsResponse.ok || !tasksResponse.ok) {
                  throw new Error('Failed to fetch calendar data')
                }

                const [eventsData, tasksData] = await Promise.all([
                  eventsResponse.json(),
                  tasksResponse.json()
                ])

                const calendarEvents: CalendarEvent[] = []

                // Add regular events
                if (eventsData.events) {
                  eventsData.events.forEach((event: any) => {
                    const { start, end } = formatEventDates(event.startTime, event.endTime, event.allDay)

                    calendarEvents.push({
                      id: `event-${event.id}`,
                      title: event.title,
                      description: event.description,
                      start,
                      end,
                      allDay: event.allDay,
                      color: EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS] || '#3b82f6',
                      type: event.type,
                      creator: event.creator,
                      team: event.team
                    })
                  })
                }

                // Add task deadlines as events
                if (tasksData.tasks) {
                  tasksData.tasks.forEach((task: TaskDeadline) => {
                    if (task.dueDate && task.status !== 'COMPLETED') {
                      const isLeaderTask = session?.user?.role === 'LEADER'
                      const isMyTask = task.assignee?.id === session?.user?.id

                      if (isMyTask || isLeaderTask) {
                        const priorityColors = {
                          URGENT: '#dc2626',
                          HIGH: '#ea580c',
                          MEDIUM: '#d97706',
                          LOW: '#16a34a'
                        }

                        // Use startDate if available, otherwise use dueDate
                        // This makes tasks span across multiple days if they have a date range
                        const eventStart = task.startDate || task.dueDate
                        const eventEnd = task.dueDate
                        const isAllDay = task.allDay !== undefined ? task.allDay : true

                        let start: string
                        let end: string

                        if (isAllDay) {
                          // Convert to date-only format (YYYY-MM-DD) for all-day events
                          start = new Date(eventStart).toISOString().split('T')[0]

                          // FullCalendar requires end date to be exclusive (day after) for all-day events
                          const endDatePlusOne = new Date(eventEnd)
                          endDatePlusOne.setDate(endDatePlusOne.getDate() + 1)
                          end = endDatePlusOne.toISOString().split('T')[0]
                        } else {
                          // For timed events with date ranges, adjust end time to span full days visually
                          start = new Date(eventStart).toISOString()
                          
                          // If there's a date range, extend to end of last day for visual continuity
                          if (task.startDate && task.dueDate) {
                            const endOfDay = new Date(eventEnd)
                            endOfDay.setHours(23, 59, 59, 999)
                            end = endOfDay.toISOString()
                          } else {
                            end = new Date(eventEnd).toISOString()
                          }
                        }

                        calendarEvents.push({
                          id: `task-${task.id}`,
                          title: `[Task] ${task.title}`,
                          description: `Due: ${task.team?.name || 'Individual'} task`,
                          start,
                          end,
                          allDay: isAllDay,
                          color: priorityColors[task.priority],
                          type: 'DEADLINE',
                          team: task.team || undefined,
                          task: {
                            id: task.id,
                            title: task.title,
                            priority: task.priority,
                            status: task.status
                          }
                        })
                      }
                    }
                  })
                }

                setEvents(calendarEvents)
              } catch (err) {
                console.error('Error refreshing calendar data:', err)
              }
            }
            fetchCalendarData()
          }
        }}
      />
    </div>
  )
}
