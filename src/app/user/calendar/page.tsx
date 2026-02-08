'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Calendar as CalendarIcon, AlertCircle, Settings, Wifi, WifiOff, RefreshCw, FileText, Clock, Users, User, Tag, CheckCircle2, AlertTriangle, Flag, X } from 'lucide-react'
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
import OSSBWizardForm from '@/components/ossb/OSSBWizardForm'
import CreateTaskButton from '@/components/tasks/CreateTaskButton'
import TaskViewModal from '@/components/tasks/TaskViewModal'
import { useCalendarSync } from '@/hooks/useCalendarSync'
import { useToast } from '@/hooks/use-toast'
import '@/styles/react-big-calendar.css'

const localizer = momentLocalizer(moment)

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource?: {
    description?: string
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
  creatorId?: string
  parentId?: string | null
  assignee?: {
    id: string
    name: string
    email: string
  }
  creator?: {
    id: string
    name: string
    email: string
  }
  team?: {
    id: string
    name: string
  } | null
  teamMembers?: Array<{
    userId: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
  collaborators?: Array<{
    userId: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
}

export default function CalendarPage() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false)
  const [isOSSBWizardOpen, setIsOSSBWizardOpen] = useState(false)
  const [isTaskViewOpen, setIsTaskViewOpen] = useState(false)
  const [viewingTask, setViewingTask] = useState<any>(null)
  const [loadingTaskDetails, setLoadingTaskDetails] = useState(false)
  const { toast } = useToast()

  const fetchCalendarData = useCallback(async () => {
    if (!session?.user) return

    try {
      setLoading(true)

      const [eventsResponse, tasksResponse, syncSettingsResponse, holidaysResponse] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/tasks?status=TODO,IN_PROGRESS,IN_REVIEW&includeSubtasks=true'),
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
          calendarEvents.push({
            id: `event-${event.id}`,
            title: event.title,
            start: new Date(event.startTime),
            end: new Date(event.endTime),
            allDay: event.allDay,
            resource: {
              description: event.description,
              color: EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS] || '#3b82f6',
              type: event.type,
              creator: event.creator,
              team: event.team
            }
          })
        })
      }

      // Add holidays
      if (holidaysData.holidays) {
        holidaysData.holidays.forEach((holiday: any) => {
          calendarEvents.push({
            id: `holiday-${holiday.id}`,
            title: `🎉 ${holiday.title}`,
            start: new Date(holiday.date),
            end: new Date(holiday.date),
            allDay: true,
            resource: {
              description: holiday.description || 'Holiday',
              color: '#9333ea',
              type: 'PERSONAL'
            }
          })
        })
      }

      // Add task deadlines - show ALL tasks related to the user
      if (tasksData.tasks) {
        tasksData.tasks.forEach((task: any) => {
          if (task.dueDate && task.status !== 'COMPLETED') {
            // Check if user is involved in this task in any way:
            // 1. User is the assignee
            // 2. User is a team member (for TEAM tasks)
            // 3. User is a collaborator (for COLLABORATION tasks)
            // 4. User is the creator
            const isAssignee = task.assignee?.id === session?.user?.id
            const isTeamMember = task.teamMembers?.some((tm: any) => tm.userId === session?.user?.id)
            const isCollaborator = task.collaborators?.some((c: any) => c.userId === session?.user?.id)
            const isCreator = task.creator?.id === session?.user?.id || task.creatorId === session?.user?.id

            // Show task if user is involved in any capacity
            if (isAssignee || isTeamMember || isCollaborator || isCreator) {
              const priorityColors = {
                URGENT: '#dc2626',
                HIGH: '#ea580c',
                MEDIUM: '#d97706',
                LOW: '#16a34a'
              }

              // Determine task type label
              let taskTypeLabel = ''
              const isSubtask = !!task.parentId

              if (isSubtask) {
                taskTypeLabel = 'Subtask'
              } else if (isAssignee) {
                taskTypeLabel = 'My Task'
              } else if (isTeamMember) {
                taskTypeLabel = 'Team Task'
              } else if (isCollaborator) {
                taskTypeLabel = 'Collaboration'
              } else if (isCreator) {
                taskTypeLabel = 'Created by Me'
              }

              // CRITICAL: Multi-day event handling
              let startDate: Date
              let endDate: Date

              if (task.startDate && task.dueDate) {
                // Multi-day task
                startDate = new Date(task.startDate)
                endDate = new Date(task.dueDate)
              } else {
                // Single-day task
                startDate = new Date(task.dueDate)
                endDate = new Date(task.dueDate)
              }

              calendarEvents.push({
                id: `task-${task.id}`,
                title: `[${taskTypeLabel}] ${task.title}`,
                start: startDate,
                end: endDate,
                allDay: task.allDay !== undefined ? task.allDay : true,
                resource: {
                  description: `Due: ${task.team?.name || 'Individual'} task`,
                  color: priorityColors[task.priority as keyof typeof priorityColors] || '#3b82f6',
                  type: 'DEADLINE',
                  team: task.team || undefined,
                  task: {
                    id: task.id,
                    title: task.title,
                    priority: task.priority,
                    status: task.status
                  }
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

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEventDialogOpen(true)
  }

  const handleViewTaskDetails = async (taskId: string) => {
    if (!taskId) {
      console.error('No task ID provided')
      toast({
        title: 'Error',
        description: 'Task ID not found',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoadingTaskDetails(true)
      console.log('Fetching task details for:', taskId)

      const response = await fetch(`/api/tasks/${taskId}`)
      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch task details')
      }

      // API returns task directly, not wrapped in { task: ... }
      const task = await response.json()
      console.log('Task data received:', task)

      if (!task || !task.id) {
        throw new Error('Invalid task data received')
      }

      setViewingTask(task)
      setIsEventDialogOpen(false)
      setIsTaskViewOpen(true)
    } catch (err) {
      console.error('Error fetching task details:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load task details',
        variant: 'destructive'
      })
    } finally {
      setLoadingTaskDetails(false)
    }
  }

  // Event style getter - CRITICAL for multi-day events
  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = event.resource?.color || '#3b82f6'

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontWeight: 600,
        fontSize: '0.875rem',
        padding: '2px 6px'
      }
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
          <CreateTaskButton onTaskCreated={fetchCalendarData} />
          <Button
            disabled
            variant="outline"
            className="opacity-50 cursor-not-allowed"
            title="OSSB Request feature is temporarily disabled"
          >
            <FileText className="h-4 w-4 mr-2" />
            Create OSSB Request (Disabled)
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsSyncSettingsOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Google Calendar Sync
          </Button>
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
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <span className="text-sm">Google Synced</span>
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
              <div className="w-3 h-3 rounded-full bg-purple-600"></div>
              <span className="text-sm">Holidays</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <div className="w-full">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          defaultView={Views.MONTH}
          popup={true}
          showMultiDayTimes
          step={30}
          timeslots={2}
          doShowMoreDrillDown={true}
          messages={{
            showMore: (total: number) => `+${total} more`,
            noEventsInRange: 'No events scheduled for this period. Create a task or sync with Google Calendar to see events here.'
          }}
        />
      </div>

      {/* Event Details Dialog - Professional Design */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          {/* Accessibility - Visually Hidden Title & Description */}
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedEvent?.title || 'Event Details'}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.resource?.description || 'View event details'}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <>
              {/* Header with Color Accent */}
              <div
                className="px-6 py-5 border-b"
                style={{
                  background: `linear-gradient(135deg, ${selectedEvent.resource?.color || '#3b82f6'}15, ${selectedEvent.resource?.color || '#3b82f6'}08)`,
                  borderLeft: `4px solid ${selectedEvent.resource?.color || '#3b82f6'}`
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${selectedEvent.resource?.color || '#3b82f6'}20`,
                          color: selectedEvent.resource?.color || '#3b82f6'
                        }}
                      >
                        {selectedEvent.resource?.type === 'DEADLINE' ? 'Task' :
                         selectedEvent.resource?.type === 'MEETING' ? 'Meeting' :
                         selectedEvent.resource?.type === 'PERSONAL' ? 'Holiday' : 'Event'}
                      </span>
                      {selectedEvent.allDay && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          All Day
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-foreground leading-tight" aria-hidden="true">
                      {selectedEvent.title.replace(/^\[(.*?)\]\s*/, '')}
                    </h2>
                    {selectedEvent.title.match(/^\[(.*?)\]/) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedEvent.title.match(/^\[(.*?)\]/)?.[1]}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="px-6 py-5 space-y-5">
                {/* Date & Time Section */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {selectedEvent.start.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    {!selectedEvent.allDay && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3.5 w-3.5" />
                        {selectedEvent.start.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                        {selectedEvent.start.getTime() !== selectedEvent.end.getTime() && (
                          <>
                            <span className="text-muted-foreground/60">→</span>
                            {selectedEvent.end.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </>
                        )}
                      </p>
                    )}
                    {selectedEvent.start.toDateString() !== selectedEvent.end.toDateString() && (
                      <p className="text-sm text-primary font-medium mt-1">
                        → {selectedEvent.end.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Team Section */}
                {selectedEvent.resource?.team && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {selectedEvent.resource.team.name}
                      </p>
                      <p className="text-sm text-muted-foreground">Team</p>
                    </div>
                  </div>
                )}

                {/* Task Details Section */}
                {selectedEvent.resource?.task && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Task Details</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Priority Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                          selectedEvent.resource.task.priority === 'URGENT'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          selectedEvent.resource.task.priority === 'HIGH'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          selectedEvent.resource.task.priority === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        <Flag className="h-3.5 w-3.5" />
                        {selectedEvent.resource.task.priority}
                      </span>
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                          selectedEvent.resource.task.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          selectedEvent.resource.task.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          selectedEvent.resource.task.status === 'IN_REVIEW'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {selectedEvent.resource.task.status === 'COMPLETED' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : selectedEvent.resource.task.status === 'IN_PROGRESS' ? (
                          <RefreshCw className="h-3.5 w-3.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                        {selectedEvent.resource.task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedEvent.resource?.description && !selectedEvent.resource?.task && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.resource.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Creator Section */}
                {selectedEvent.resource?.creator && (
                  <div className="flex items-start gap-3 pt-2 border-t">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {selectedEvent.resource.creator.name}
                      </p>
                      <p className="text-xs text-muted-foreground">Created by</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              {selectedEvent.resource?.task?.id && (
                <div className="px-6 py-4 border-t bg-muted/20">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={loadingTaskDetails}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const taskId = selectedEvent.resource?.task?.id
                      console.log('Button clicked, task ID:', taskId)
                      if (taskId) {
                        handleViewTaskDetails(taskId)
                      }
                    }}
                  >
                    {loadingTaskDetails ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'View Task Details'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Calendar Sync Settings Modal */}
      <CalendarSyncSettingsModal
        isOpen={isSyncSettingsOpen}
        onClose={() => setIsSyncSettingsOpen(false)}
        onSyncComplete={fetchCalendarData}
      />

      {/* OSSB Wizard Form Modal */}
      <OSSBWizardForm
        isOpen={isOSSBWizardOpen}
        onClose={() => setIsOSSBWizardOpen(false)}
        onSuccess={fetchCalendarData}
      />

      {/* Task View Modal */}
      <TaskViewModal
        open={isTaskViewOpen}
        onOpenChange={(open) => {
          setIsTaskViewOpen(open)
          if (!open) {
            setViewingTask(null)
            fetchCalendarData()
          }
        }}
        task={viewingTask}
        onEdit={() => {
          // Close modal and optionally navigate to tasks page for editing
          setIsTaskViewOpen(false)
          window.location.href = `/user/tasks?edit=${viewingTask?.id}`
        }}
        onTaskUpdate={fetchCalendarData}
      />
    </div>
  )
}
