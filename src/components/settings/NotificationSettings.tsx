'use client'
import { useEffect, useState } from 'react'
import { useWebPush } from '@/hooks/use-web-push'
import { useToast } from '@/hooks/use-toast'

export function NotificationSettings() {
  const { toast } = useToast()
  const { supported, enabled, enable, disable } = useWebPush()
  const [emailOn, setEmailOn] = useState(true)
  const [pushBusy, setPushBusy] = useState(false)
  useEffect(() => { fetch('/api/notifications/preferences').then(r => r.json()).then(p => setEmailOn(!!p.emailNotifications)).catch(() => {}) }, [])
  async function setEmail(v: boolean) {
    setEmailOn(v)
    await fetch('/api/notifications/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailNotifications: v }) })
      .catch(() => toast({ title: 'Could not save', variant: 'destructive' }))
  }

  async function togglePush() {
    setPushBusy(true)
    try {
      if (enabled) {
        await disable()
        toast({ title: 'Browser push disabled' })
      } else {
        await enable()
        toast({ title: 'Browser push enabled', description: 'Use “Send test” to confirm it works.' })
      }
    } catch (e: any) {
      toast({ title: 'Push notifications', description: e?.message || 'Something went wrong.', variant: 'destructive' })
    } finally {
      setPushBusy(false)
    }
  }

  async function sendTest() {
    setPushBusy(true)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Test failed')
      toast({ title: 'Test sent', description: `Delivered to ${d.sent} device${d.sent === 1 ? '' : 's'} — watch for the notification.` })
    } catch (e: any) {
      toast({ title: 'Test failed', description: e?.message || 'Could not send a test notification.', variant: 'destructive' })
    } finally {
      setPushBusy(false)
    }
  }

  const btn = 'px-2.5 h-7 rounded-md text-xs font-semibold border border-slate-200 hover:border-blue-300 disabled:opacity-50'

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-slate-700">Notifications</h3>
      <label className="flex items-center justify-between text-sm">
        Email notifications
        <input type="checkbox" checked={emailOn} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4 accent-blue-600" />
      </label>
      <div className="flex items-center justify-between text-sm">
        <span>Browser push notifications</span>
        {supported ? (
          <div className="flex items-center gap-2">
            {enabled && (
              <button onClick={sendTest} disabled={pushBusy} className={btn}>Send test</button>
            )}
            <button onClick={togglePush} disabled={pushBusy} className={btn}>
              {pushBusy ? '…' : enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Not supported</span>
        )}
      </div>
    </div>
  )
}
