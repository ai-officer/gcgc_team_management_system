'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CalendarSyncSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSyncComplete?: () => void
}

export default function CalendarSyncSettingsModal({
  isOpen,
  onClose,
  onSyncComplete,
}: CalendarSyncSettingsModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [settings, setSettings] = useState({
    isEnabled: false,
    googleCalendarId: 'primary',
    syncDirection: 'BOTH' as 'TMS_TO_GOOGLE' | 'GOOGLE_TO_TMS' | 'BOTH',
    syncTaskDeadlines: true,
    syncTeamEvents: true,
    syncPersonalEvents: true,
  })

  const [calendars, setCalendars] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchSettings()
    }
  }, [isOpen])

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/calendar/sync-settings')
      const data = await response.json()

      if (response.ok) {
        setSettings(data.syncSettings)
        setCalendars(data.calendars || [])
      } else {
        setError(data.error || 'Failed to fetch settings')
      }
    } catch (err) {
      setError('Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/calendar/sync-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Settings saved successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to save settings')
      }
    } catch (err) {
      setError('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const connectGoogleCalendar = async () => {
    // Trigger Google OAuth with calendar scopes
    await signIn('google', { callbackUrl: window.location.href })
  }

  const disconnectGoogleCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? This will disable sync.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/calendar/sync-settings', {
        method: 'DELETE'
      })

      if (response.ok) {
        setSettings({ ...settings, isEnabled: false })
        setSuccess('Google Calendar disconnected successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to disconnect Google Calendar')
      }
    } catch (err) {
      setError('Failed to disconnect Google Calendar')
    } finally {
      setLoading(false)
    }
  }

  const syncToGoogle = async () => {
    setSyncing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/calendar/sync-to-google', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Synced to Google: ${data.results.created} created, ${data.results.updated} updated`)
        setTimeout(() => setSuccess(null), 5000)
        onSyncComplete?.()
      } else {
        setError(data.error || 'Failed to sync to Google Calendar')
      }
    } catch (err) {
      setError('Failed to sync to Google Calendar')
    } finally {
      setSyncing(false)
    }
  }

  const syncFromGoogle = async () => {
    setSyncing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/calendar/sync-from-google', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Imported from Google: ${data.results.created} created, ${data.results.updated} updated`)
        setTimeout(() => setSuccess(null), 5000)
        onSyncComplete?.()
      } else {
        setError(data.error || 'Failed to import from Google Calendar')
      }
    } catch (err) {
      setError('Failed to import from Google Calendar')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Google Calendar Sync Settings
          </DialogTitle>
          <DialogDescription>
            Configure how your TMS calendar syncs with Google Calendar
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Connection Status */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Connection Status</Label>
            {settings.isEnabled ? (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium">Connected to Google Calendar</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectGoogleCalendar}
                  disabled={loading}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-3">
                  Connect your Google account to enable calendar synchronization
                </p>
                <Button onClick={connectGoogleCalendar} disabled={loading}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </Button>
              </div>
            )}
          </div>

          {settings.isEnabled && (
            <>
              <Separator />

              {/* Calendar Selection */}
              {calendars.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="calendar-select">Select Calendar</Label>
                  <Select
                    value={settings.googleCalendarId}
                    onValueChange={(value) =>
                      setSettings({ ...settings, googleCalendarId: value })
                    }
                  >
                    <SelectTrigger id="calendar-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.map((cal: any) => (
                        <SelectItem key={cal.id} value={cal.id}>
                          {cal.summary || cal.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sync Direction */}
              <div className="space-y-2">
                <Label htmlFor="sync-direction">Sync Direction</Label>
                <Select
                  value={settings.syncDirection}
                  onValueChange={(value: any) =>
                    setSettings({ ...settings, syncDirection: value })
                  }
                >
                  <SelectTrigger id="sync-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOTH">Two-way sync (recommended)</SelectItem>
                    <SelectItem value="TMS_TO_GOOGLE">TMS → Google Calendar only</SelectItem>
                    <SelectItem value="GOOGLE_TO_TMS">Google Calendar → TMS only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {settings.syncDirection === 'BOTH' && 'Events will be synced in both directions'}
                  {settings.syncDirection === 'TMS_TO_GOOGLE' && 'Only TMS events will be exported to Google'}
                  {settings.syncDirection === 'GOOGLE_TO_TMS' && 'Only Google events will be imported to TMS'}
                </p>
              </div>

              <Separator />

              {/* Event Types to Sync */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Event Types to Sync</Label>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sync-deadlines">Task Deadlines</Label>
                    <p className="text-sm text-gray-500">Sync task due dates as calendar events</p>
                  </div>
                  <Switch
                    id="sync-deadlines"
                    checked={settings.syncTaskDeadlines}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, syncTaskDeadlines: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sync-team">Team Events</Label>
                    <p className="text-sm text-gray-500">Sync team meetings and events</p>
                  </div>
                  <Switch
                    id="sync-team"
                    checked={settings.syncTeamEvents}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, syncTeamEvents: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sync-personal">Personal Events</Label>
                    <p className="text-sm text-gray-500">Sync personal calendar events</p>
                  </div>
                  <Switch
                    id="sync-personal"
                    checked={settings.syncPersonalEvents}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, syncPersonalEvents: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Manual Sync Actions */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Manual Sync</Label>
                <div className="flex gap-2">
                  {(settings.syncDirection === 'BOTH' || settings.syncDirection === 'TMS_TO_GOOGLE') && (
                    <Button
                      onClick={syncToGoogle}
                      disabled={syncing || loading}
                      variant="outline"
                      className="flex-1"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      Sync to Google
                    </Button>
                  )}
                  {(settings.syncDirection === 'BOTH' || settings.syncDirection === 'GOOGLE_TO_TMS') && (
                    <Button
                      onClick={syncFromGoogle}
                      disabled={syncing || loading}
                      variant="outline"
                      className="flex-1"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      Import from Google
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {settings.isEnabled && (
            <Button onClick={saveSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
