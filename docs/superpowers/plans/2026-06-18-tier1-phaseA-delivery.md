# Tier 1 Phase A — Notification Delivery (Email + Web Push) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an in-app notification is created, also deliver it by email (Resend) and web push (VAPID), gated by per-user preferences, best-effort and non-blocking.

**Architecture:** Pure decision/render helpers (`plannedDeliveries`, `renderNotificationEmail`) are vitest-tested. `sendNotificationEmail` (Resend) and `sendWebPush` (web-push) no-op gracefully when their env vars are unset. `deliverNotification(userId, notification)` loads prefs + email + push subscriptions and fans out, each channel wrapped in try/catch. It is called at the end of the existing `createNotification()`. A service worker + client hook let users subscribe to web push; APIs persist subscriptions and preferences; a settings UI exposes the toggles.

**Tech Stack:** Next.js 14, TypeScript, Prisma/Postgres, Vitest, `resend`, `web-push`.

## Global Constraints

- Type-check baseline **201** (must stay 201; `npx tsc --noEmit 2>&1 | grep -cE "error TS"`). Vitest: `npx vitest run`.
- Delivery is **best-effort + non-blocking**: a channel failure is caught and logged, never thrown — it must not break the task action that created the notification.
- Both channels **degrade gracefully**: `sendNotificationEmail` no-ops (logs) when `RESEND_API_KEY` is unset; `sendWebPush` no-ops when `VAPID_PRIVATE_KEY` is unset. In-app notifications keep working regardless.
- Env (set on staging for live delivery): `RESEND_API_KEY`, `EMAIL_FROM` (`notifications@hotelsogo-ai.com`), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- Migrations are force-added (`git add -f prisma/migrations/...`) — repo gitignores `prisma/migrations/` but tracks select ones.
- Deploy: ECS `gcgc-staging`, branch `staging`, port 3001.

---

### Task 1: Install deps + generate VAPID keys

**Files:** Modify `package.json`, `package-lock.json`.

- [ ] **Step 1: Install packages**

Run: `npm install resend web-push && npm install -D @types/web-push`
Expected: added to dependencies; lockfile updated.

- [ ] **Step 2: Generate VAPID keys (record them for env)**

Run: `npx web-push generate-vapid-keys`
Expected: prints a Public Key and Private Key. Record both — they become `VAPID_PUBLIC_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Add them to local `.env` and (later) staging `.env`. Do NOT commit `.env`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add resend + web-push deps for notification delivery"
```

---

### Task 2: Prisma — PushSubscription model + user notification prefs

**Files:** Modify `prisma/schema.prisma`; Create `prisma/migrations/20260618120000_notification_delivery/migration.sql`.

**Interfaces:**
- Produces: `PushSubscription { id, userId, endpoint(unique), p256dh, auth, createdAt }` relation `user`.
- Produces: `User.emailNotifications Boolean @default(true)`, `User.pushNotifications Boolean @default(true)`, `User.pushSubscriptions PushSubscription[]`.

- [ ] **Step 1: Add the model + user fields**

In `prisma/schema.prisma`, add to the `User` model (near other Boolean prefs):

```prisma
  emailNotifications Boolean @default(true)
  pushNotifications  Boolean @default(true)
  pushSubscriptions  PushSubscription[]
```

And add a new model:

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("push_subscriptions")
}
```

- [ ] **Step 2: Generate the client + write the migration**

Run: `npx prisma generate`
Expected: client regenerated with the new fields.

Create `prisma/migrations/20260618120000_notification_delivery/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "users" ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "pushNotifications" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "push_subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → expect `201`.

```bash
git add prisma/schema.prisma
git add -f prisma/migrations/20260618120000_notification_delivery/migration.sql
git commit -m "feat(db): PushSubscription model + user notification prefs"
```

---

### Task 3: Email rendering + sending (Resend)

**Files:** Create `src/lib/email.ts`, `src/lib/email.test.ts`.

**Interfaces:**
- Produces: `renderNotificationEmail(n: { title: string; message: string; url?: string }): { subject: string; html: string }`.
- Produces: `sendNotificationEmail(to: string, n: { title: string; message: string; url?: string }): Promise<void>` — no-ops (console.info) when `RESEND_API_KEY` is unset.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/email.test.ts
import { describe, it, expect } from 'vitest'
import { renderNotificationEmail } from './email'

describe('renderNotificationEmail', () => {
  it('puts the title in the subject and title+message in the html', () => {
    const { subject, html } = renderNotificationEmail({ title: 'Task assigned', message: 'You were assigned "Try"', url: 'https://x/y' })
    expect(subject).toContain('Task assigned')
    expect(html).toContain('Task assigned')
    expect(html).toContain('You were assigned')
    expect(html).toContain('https://x/y')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/email.test.ts`
Expected: FAIL (module/function not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/email.ts
import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM || 'notifications@hotelsogo-ai.com'

export function renderNotificationEmail(n: { title: string; message: string; url?: string }): { subject: string; html: string } {
  const button = n.url
    ? `<p style="margin:20px 0"><a href="${n.url}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open in GCGC TMS</a></p>`
    : ''
  const html = `<div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
    <h2 style="font-size:16px;margin:0 0 8px">${n.title}</h2>
    <p style="font-size:14px;color:#334155;margin:0">${n.message}</p>
    ${button}
    <p style="font-size:12px;color:#94a3b8;margin-top:24px">You're receiving this from GCGC TMS. Manage notifications in your profile settings.</p>
  </div>`
  return { subject: `GCGC TMS · ${n.title}`, html }
}

export async function sendNotificationEmail(to: string, n: { title: string; message: string; url?: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) { console.info('[email] RESEND_API_KEY unset — skipping email to', to); return }
  const { subject, html } = renderNotificationEmail(n)
  const resend = new Resend(key)
  await resend.emails.send({ from: FROM, to, subject, html })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/email.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/email.test.ts
git commit -m "feat(email): Resend notification email render + send (no-op without key)"
```

---

### Task 4: Web push sender (VAPID)

**Files:** Create `src/lib/web-push.ts`.

**Interfaces:**
- Produces: `sendWebPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: { title: string; body: string; url?: string }): Promise<void>` — no-ops when `VAPID_PRIVATE_KEY` unset; swallows 404/410 (expired subscription) by deleting it.

> No unit test — it wraps an external library and DB cleanup. Verified by type-check + staging.

- [ ] **Step 1: Implement**

```ts
// src/lib/web-push.ts
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
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → expect `201`.

```bash
git add src/lib/web-push.ts
git commit -m "feat(web-push): VAPID sender with expired-subscription cleanup"
```

---

### Task 5: Delivery gate + hook into createNotification

**Files:** Create `src/lib/notification-delivery.ts`, `src/lib/notification-delivery.test.ts`; Modify `src/lib/notifications.ts`.

**Interfaces:**
- Consumes: `sendNotificationEmail` (Task 3), `sendWebPush` (Task 4).
- Produces: `plannedDeliveries(prefs: { emailNotifications: boolean; pushNotifications: boolean }): ('email' | 'push')[]`.
- Produces: `deliverNotification(userId: string, n: { title: string; message: string; entityType?: string | null; entityId?: string | null }): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notification-delivery.test.ts
import { describe, it, expect } from 'vitest'
import { plannedDeliveries } from './notification-delivery'

describe('plannedDeliveries', () => {
  it('returns the enabled channels only', () => {
    expect(plannedDeliveries({ emailNotifications: true, pushNotifications: true })).toEqual(['email', 'push'])
    expect(plannedDeliveries({ emailNotifications: true, pushNotifications: false })).toEqual(['email'])
    expect(plannedDeliveries({ emailNotifications: false, pushNotifications: false })).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/notification-delivery.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the gate + delivery**

```ts
// src/lib/notification-delivery.ts
import { prisma } from '@/lib/prisma'
import { sendNotificationEmail } from '@/lib/email'
import { sendWebPush } from '@/lib/web-push'

export function plannedDeliveries(prefs: { emailNotifications: boolean; pushNotifications: boolean }): ('email' | 'push')[] {
  const out: ('email' | 'push')[] = []
  if (prefs.emailNotifications) out.push('email')
  if (prefs.pushNotifications) out.push('push')
  return out
}

function entityUrl(n: { entityType?: string | null; entityId?: string | null }): string | undefined {
  const base = process.env.NEXTAUTH_URL || ''
  if (n.entityType === 'task' && n.entityId) return `${base}/user/tasks?task=${n.entityId}`
  return base ? `${base}/user/dashboard` : undefined
}

export async function deliverNotification(
  userId: string,
  n: { title: string; message: string; entityType?: string | null; entityId?: string | null }
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailNotifications: true, pushNotifications: true, pushSubscriptions: true },
    })
    if (!user) return
    const channels = plannedDeliveries(user)
    const url = entityUrl(n)
    if (channels.includes('email') && user.email) {
      await sendNotificationEmail(user.email, { title: n.title, message: n.message, url }).catch(e => console.error('[deliver] email', e))
    }
    if (channels.includes('push')) {
      await Promise.all(user.pushSubscriptions.map(s =>
        sendWebPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, { title: n.title, body: n.message, url })
          .catch(e => console.error('[deliver] push', e))
      ))
    }
  } catch (e) {
    console.error('[deliver] failed for', userId, e)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/notification-delivery.test.ts`
Expected: PASS.

- [ ] **Step 5: Hook into createNotification (non-blocking)**

In `src/lib/notifications.ts`, add the import at top:

```ts
import { deliverNotification } from '@/lib/notification-delivery'
```

In `createNotification`, immediately after the in-app notification is created and the socket emit happens (just before `return notification`), add:

```ts
    // Fan out to email + web push, best-effort and non-blocking.
    void deliverNotification(notification.userId, {
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId,
    })
```

- [ ] **Step 6: Type-check + tests + commit**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`; `npx vitest run` → all pass.

```bash
git add src/lib/notification-delivery.ts src/lib/notification-delivery.test.ts src/lib/notifications.ts
git commit -m "feat(notifications): deliver email + web push on createNotification"
```

---

### Task 6: APIs — push subscribe + notification preferences

**Files:** Create `src/app/api/push/subscribe/route.ts`, `src/app/api/notifications/preferences/route.ts`.

**Interfaces:**
- `POST /api/push/subscribe` body `{ endpoint, keys: { p256dh, auth } }` → upsert for the session user. `DELETE` body `{ endpoint }` → remove.
- `GET /api/notifications/preferences` → `{ emailNotifications, pushNotifications }`. `PUT` body same → update.
- Consumes: `getRequestSession` from `@/lib/api-auth`.

> Route task — verified by type-check + staging.

- [ ] **Step 1: Create the push-subscribe route**

```ts
// src/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { endpoint, keys } = body || {}
  if (!endpoint || !keys?.p256dh || !keys?.auth) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { endpoint } = await req.json().catch(() => ({}))
  if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create the preferences route**

```ts
// src/app/api/notifications/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { emailNotifications: true, pushNotifications: true } })
  return NextResponse.json(u ?? { emailNotifications: true, pushNotifications: true })
}

export async function PUT(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const data: { emailNotifications?: boolean; pushNotifications?: boolean } = {}
  if (typeof body.emailNotifications === 'boolean') data.emailNotifications = body.emailNotifications
  if (typeof body.pushNotifications === 'boolean') data.pushNotifications = body.pushNotifications
  const u = await prisma.user.update({ where: { id: session.user.id }, data, select: { emailNotifications: true, pushNotifications: true } })
  return NextResponse.json(u)
}
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`.

```bash
git add src/app/api/push/subscribe/route.ts src/app/api/notifications/preferences/route.ts
git commit -m "feat(api): push subscribe + notification preferences endpoints"
```

---

### Task 7: Service worker + client web-push hook

**Files:** Create `public/sw.js`, `src/hooks/use-web-push.ts`.

**Interfaces:**
- Produces: `useWebPush(): { supported: boolean; enabled: boolean; enable: () => Promise<void>; disable: () => Promise<void> }`.

> Browser/UI task — verified by type-check + staging (grant permission, see a notification).

- [ ] **Step 1: Create the service worker**

```js
// public/sw.js
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) {}
  const title = data.title || 'GCGC TMS'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      data: { url: data.url || '/' },
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus() } }
      return self.clients.openWindow(url)
    })
  )
})
```

- [ ] **Step 2: Create the client hook**

```ts
// src/hooks/use-web-push.ts
'use client'
import { useEffect, useState } from 'react'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
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

  async function enable() {
    if (!supported) return
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return
    const reg = await navigator.serviceWorker.register('/sw.js')
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    await fetch('/api/push/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    })
    setEnabled(true)
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
      await sub.unsubscribe()
    }
    setEnabled(false)
  }

  return { supported, enabled, enable, disable }
}
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`.

```bash
git add public/sw.js src/hooks/use-web-push.ts
git commit -m "feat(web-push): service worker + client subscribe hook"
```

---

### Task 8: Settings UI — notification toggles + enable-push button

**Files:** Modify `src/app/user/profile/page.tsx` (or the settings area it links to).

> UI task — verified by type-check + staging. Find the profile/settings page; add a "Notifications" section.

- [ ] **Step 1: Add a Notifications settings section**

In the profile/settings page, add a client section that: fetches `GET /api/notifications/preferences`, renders an **Email notifications** switch and a **Push (browser) notifications** control wired to `useWebPush()` (`enable`/`disable` + `supported`), and PUTs preference changes to `/api/notifications/preferences`. Use the existing UI primitives (`@/components/ui/switch` if present, else a styled checkbox) and the existing `useToast`. Example shape:

```tsx
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
```

Then render `<NotificationSettings />` in the profile/settings page.

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`.

```bash
git add src/app/user/profile/page.tsx src/components/**/NotificationSettings* 2>/dev/null
git commit -m "feat(settings): notification preferences + enable browser push UI"
```

---

### Task 9: Verify + deploy Phase A

**Files:** none.

- [ ] **Step 1: Full suite + type-check**

Run: `npx vitest run` → all pass (incl. `email.test.ts`, `notification-delivery.test.ts`).
Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`.

- [ ] **Step 2: Update graph**

Run: `graphify update .`

- [ ] **Step 3: Deploy to staging (apply migration)**

```bash
git push origin staging
ssh gcgc-staging 'cd /var/www/gcgc-tms-staging && git checkout -- package-lock.json && git pull origin staging && npm install && npx prisma migrate deploy && npm run build && pm2 restart gcgc-tms-staging --update-env'
```
Health: `ssh gcgc-staging "curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/"` → `200`.

- [ ] **Step 4: Manual verification on staging**

- Without env keys set: trigger a notification (assign a task) → in-app notification still appears; server logs show "RESEND_API_KEY unset" / "VAPID keys unset" (graceful no-op, no crash).
- Add VAPID env + restart → in Profile, click **Enable** browser push, grant permission → assign a task → a browser notification appears; clicking it opens the task.
- Add `RESEND_API_KEY` + verify domain → assign a task → email arrives.
- Toggle Email off → no email on the next notification.

---

## Self-Review

**Spec coverage:** delivery layer over createNotification (T5) ✓; Resend email render+send, no-op without key (T3) ✓; web push VAPID + expired cleanup (T4) ✓; PushSubscription model + prefs (T2) ✓; subscribe + preferences APIs (T6) ✓; service worker + client hook (T7) ✓; settings UI toggles + enable-push (T8) ✓; deps + VAPID generation (T1) ✓; non-blocking/graceful-degrade constraints honored in T3/T4/T5. Phase B (inbox+feed), C (search), D (@mentions) are separate plans.

**Placeholders:** none — every code step has complete code; route/UI/SW tasks are explicitly verified by type-check + staging (no component/external-send harness).

**Type consistency:** `plannedDeliveries`, `deliverNotification`, `sendNotificationEmail`, `renderNotificationEmail`, `sendWebPush`, `useWebPush`, and the `PushSubscription`/user-prefs fields are defined and consumed with consistent names/shapes across T2–T8.
