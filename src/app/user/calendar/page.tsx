'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react'
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
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED'
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

  useEffect(() => {
    if (!session?.user) return

    const fetchCalendarData = async () => {
      try {
        setLoading(true)
        
        // Fetch events and task deadlines in parallel
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
            calendarEvents.push({
              id: `event-${event.id}`,
              title: event.title,
              description: event.description,
              start: event.startTime,
              end: event.endTime,
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
              
              // Show task if it's assigned to me or if I'm a leader and it's a team task
              if (isMyTask || isLeaderTask) {
                const priorityColors = {
                  URGENT: '#dc2626',
                  HIGH: '#ea580c', 
                  MEDIUM: '#d97706',
                  LOW: '#16a34a'
                }

                calendarEvents.push({
                  id: `task-${task.id}`,
                  title: `📋 ${task.title}`,
                  description: `Due: ${task.team?.name || 'Individual'} task`,
                  start: task.dueDate,
                  end: task.dueDate,
                  allDay: true,
                  color: priorityColors[task.priority],
                  type: 'DEADLINE',
                  team: task.team,
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
    }

    fetchCalendarData()
  }, [session])

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
          <p className="text-muted-foreground">
            {isLeader 
              ? "View your schedule and team deadlines" 
              : "View your schedule and task deadlines"
            }
          </p>
        </div>
      </div>

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
              dayMaxEvents={3}
              dayMaxEventRows={3}
              moreLinkClick="popover"
              weekends={true}
              events={events}
              eventClick={handleEventClick}
              select={handleDateSelect}
              aspectRatio={1.2}
              contentHeight="auto"
              eventDisplay="block"
              eventTextColor="#fff"
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
    </div>
  )
}
