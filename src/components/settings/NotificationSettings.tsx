'use client'
import { useEffect, useState } from 'react'
import { useWebPush } from '@/hooks/use-web-push'
import { useToast } from '@/hooks/use-toast'

export function NotificationSettings() {
  const { toast } = useToast()
  const { supported, enabled, enable, disable } = useWebPush()
  const [emailOn, setEmailOn] = useState(true)
  useEffect(() => { fetch('/api/notifications/preferences').then(r => r.json()).then(p => setEmailOn(!!p.emailNotifications)).catch(() => {}) }, [])
  async function setEmail(v: boolean) {
    setEmailOn(v)
    await fetch('/api/notifications/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailNotifications: v }) })
      .catch(() => toast({ title: 'Could not save', variant: 'destructive' }))
  }
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-slate-700">Notifications</h3>
      <label className="flex items-center justify-between text-sm">
        Email notifications
        <input type="checkbox" checked={emailOn} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4 accent-blue-600" />
      </label>
      <label className="flex items-center justify-between text-sm">
        Browser push notifications
        {supported
          ? <button onClick={() => (enabled ? disable() : enable())} className="px-2.5 h-7 rounded-md text-xs font-semibold border border-slate-200 hover:border-blue-300">{enabled ? 'Disable' : 'Enable'}</button>
          : <span className="text-xs text-slate-400">Not supported</span>}
      </label>
    </div>
  )
}
