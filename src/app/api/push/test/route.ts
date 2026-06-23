// src/app/api/push/test/route.ts
// Sends a test push to the current user's subscriptions so they can verify that
// browser push works end-to-end (subscription saved + delivery succeeds).
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { sendWebPush } from '@/lib/web-push'

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subs = await prisma.pushSubscription.findMany({ where: { userId: session.user.id } })
  if (subs.length === 0) {
    return NextResponse.json({ error: 'No push subscription found. Click "Enable" first.' }, { status: 400 })
  }

  const results = await Promise.all(subs.map((s) =>
    sendWebPush(
      { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
      { title: 'GCGC TMS', body: 'Test notification — browser push is working ✅', url: '/user/dashboard' }
    )
  ))

  const sent = results.filter((r) => r.ok).length
  if (sent === 0) {
    const firstError = results.find((r) => !r.ok)?.error || 'Push delivery failed'
    return NextResponse.json({ error: firstError, sent: 0 }, { status: 502 })
  }
  return NextResponse.json({ sent, failed: results.length - sent })
}
