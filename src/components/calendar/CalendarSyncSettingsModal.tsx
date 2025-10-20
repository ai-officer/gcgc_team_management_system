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
  const [isConnected, setIsConnected] = useState(false)

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
        setIsConnected(data.syncSettings?.isEnabled && data.syncSettings?.googleAccessToken)
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
        // If sync is being enabled, set up webhook
        if (settings.isEnabled) {
          await setupWebhook()
        }
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

  const setupWebhook = async () => {
    try {
      const response = await fetch('/api/calendar/webhook-setup', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Webhook setup successfully:', data)
      } else {
        console.error('Failed to setup webhook:', data.error)
        // Don't show error to user, webhook setup is automatic
      }
    } catch (err) {
      console.error('Webhook setup error:', err)
      // Don't show error to user, webhook setup is automatic
    }
  }

  const connectGoogleCalendar = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get the auth URL from our API
      const response = await fetch('/api/calendar/connect-google')
      const data = await response.json()

      if (response.ok && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        setError(data.error || 'Failed to connect Google Calendar')
      }
    } catch (err) {
      setError('Failed to connect Google Calendar')
    } finally {
      setLoading(false)
    }
  }

  const enableAutoSync = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Enable sync with primary calendar automatically
      const response = await fetch('/api/calendar/sync-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...settings, 
          isEnabled: true,
          googleCalendarId: 'primary' // Always use primary Gmail calendar
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Set up webhook for real-time sync
        await setupWebhook()
        
        // Automatically trigger initial sync
        await performInitialSync()
        
        setSettings({ ...settings, isEnabled: true })
        setSuccess('Automatic calendar sync enabled! Your Gmail calendar is now synced.')
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError(data.error || 'Failed to enable automatic sync')
      }
    } catch (err) {
      setError('Failed to enable automatic sync')
    } finally {
      setLoading(false)
    }
  }

  const performInitialSync = async () => {
    try {
      // Trigger both import and export for initial sync
      await Promise.all([
        fetch('/api/calendar/sync-from-google', { method: 'POST' }),
        fetch('/api/calendar/sync-to-google', { method: 'POST' })
      ])
    } catch (err) {
      console.error('Initial sync failed:', err)
      // Don't show error to user, sync will continue automatically
    }
  }

  const disconnectGoogleCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? This will delete all imported Google Calendar events from TMS.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Stop webhook first
      try {
        await fetch('/api/calendar/webhook-setup', {
          method: 'DELETE'
        })
      } catch (err) {
        console.error('Failed to stop webhook:', err)
      }

      // Then disconnect calendar
      const response = await fetch('/api/calendar/sync-settings', {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        setSettings({ ...settings, isEnabled: false })
        setIsConnected(false)
        setSuccess(`Google Calendar disconnected! ${data.deletedEvents || 0} imported events removed.`)
        setTimeout(() => {
          setSuccess(null)
          onSyncComplete?.() // Refresh calendar view
        }, 3000)
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
                  <div>
                    <span className="text-green-700 font-medium block">Automatic Sync Enabled</span>
                    <span className="text-green-600 text-sm">Syncing with your primary Gmail calendar</span>
                  </div>
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
            ) : isConnected ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="mb-3">
                  <p className="text-blue-700 font-medium">Ready for Automatic Sync</p>
                  <p className="text-sm text-blue-600">
                    Your Gmail calendar will automatically sync with TMS. All events, tasks, and holidays will be synchronized in real-time.
                  </p>
                </div>
                <Button onClick={enableAutoSync} disabled={loading}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {loading ? 'Enabling...' : 'Enable Automatic Sync'}
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-3">
                  Connect your Google account to enable automatic calendar synchronization with your Gmail calendar
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

              {/* Automatic Sync Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-700 font-medium">Automatic Sync Active</span>
                </div>
                <p className="text-sm text-blue-600">
                  Your TMS calendar is automatically synchronized with your primary Gmail calendar. 
                  Any changes made in either calendar will be reflected in real-time.
                </p>
              </div>

              {/* Sync Direction - Only show when sync is enabled */}
              {settings.isEnabled && (
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
              )}

              <Separator />

              {/* Event Types to Sync - Only show when sync is enabled */}
              {settings.isEnabled && (
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

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sync-holidays">Holidays</Label>
                      <p className="text-sm text-gray-500">Include holidays from Google Calendar</p>
                    </div>
                    <Switch
                      id="sync-holidays"
                      checked={settings.syncHolidays}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, syncHolidays: checked })
                      }
                    />
                  </div>
                </div>
              )}

              <Separator />

              {/* Real-time Sync Status */}
              {settings.isEnabled && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Real-time Sync Status</Label>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-700 text-sm font-medium">Live Sync Active</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      All changes in Gmail calendar are automatically reflected in TMS and vice versa.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
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
