import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(`mailto:${process.env.EMAIL_FROM || 'gcgc-tms@hotelsogo-ai.com'}`, pub, priv)
  configured = true
  return true
}

export async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
): Promise<{ ok: boolean; error?: string }> {
  if (!ensureConfigured()) { console.info('[web-push] VAPID keys unset — skipping'); return { ok: false, error: 'VAPID keys not configured' } }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return { ok: true }
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      // Subscription is gone — prune it so we stop trying.
      await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
      return { ok: false, error: 'Subscription expired and was removed' }
    }
    console.error('[web-push] send failed:', err?.statusCode || err)
    return { ok: false, error: `Send failed (${err?.statusCode ?? 'unknown error'})` }
  }
}
