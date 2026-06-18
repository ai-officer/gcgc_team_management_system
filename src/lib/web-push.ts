import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(`mailto:${process.env.EMAIL_FROM || 'notifications@hotelsogo-ai.com'}`, pub, priv)
  configured = true
  return true
}

export async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!ensureConfigured()) { console.info('[web-push] VAPID keys unset — skipping'); return }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
    } else {
      console.error('[web-push] send failed:', err?.statusCode || err)
    }
  }
}
