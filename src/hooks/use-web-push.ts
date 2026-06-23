'use client'
import { useEffect, useState } from 'react'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)))
}

export function useWebPush() {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC
    setSupported(ok)
    if (!ok) return
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription()
      setEnabled(!!sub)
    })
  }, [])

  // Throws on failure with a user-readable message so the caller can surface it.
  async function enable() {
    if (!supported) throw new Error('Push notifications are not supported in this browser.')

    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      throw new Error(
        perm === 'denied'
          ? 'Notifications are blocked. Allow them for this site in your browser settings, then try again.'
          : 'Notification permission was not granted.'
      )
    }

    // Register and wait until the service worker is actually active before
    // subscribing — subscribing against an inactive SW fails in some browsers.
    await navigator.serviceWorker.register('/sw.js')
    const reg = await navigator.serviceWorker.ready

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC).buffer as ArrayBuffer,
      })
    }

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e.error || 'Could not save the subscription on the server. Please try again.')
    }
    setEnabled(true)
  }

  async function disable() {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
        await sub.unsubscribe()
      }
    } finally {
      setEnabled(false)
    }
  }

  return { supported, enabled, enable, disable }
}
