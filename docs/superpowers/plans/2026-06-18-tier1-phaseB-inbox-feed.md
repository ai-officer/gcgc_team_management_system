# Tier 1 Phase B — Inbox + Activity Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A `/user/notifications` page with two tabs — **Inbox** (the user's notifications) and **Activity** (a team activity feed) — plus a "View all" link from the existing notification dropdown.

**Architecture:** Reuse the existing `GET /api/notifications` (`{notifications, unreadCount}`, `?unreadOnly`, `?limit`) and `PATCH /api/notifications` (mark read / mark all). Add `GET /api/activities` returning recent `Activity` rows scoped to who the viewer may see (themselves + direct reports; admins see all), via a vitest-tested pure scope helper. The Inbox page is a client component with two tabs.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, Prisma, Vitest.

## Global Constraints

- Type-check baseline **201** (`npx tsc --noEmit 2>&1 | grep -cE "error TS"`); Vitest `npx vitest run`.
- Existing endpoints (reuse, don't change): `GET /api/notifications` → `{ notifications: Notification[], unreadCount: number }`; params `?unreadOnly=true`, `?limit=N`. `PATCH /api/notifications` body `{ notificationIds?: string[]; markAllRead?: boolean }`.
- `Activity` model: `{ id, type, description, userId, entityId, entityType, metadata, createdAt }` (description is already human-readable). FK + entityId indexed.
- Auth in routes via `getRequestSession` (`@/lib/api-auth`), 401 unauthenticated.
- Viewer's direct reports = users with `reportsToId === viewerId` (same relationship used by the workload widget).
- No component/route test harness — pure helpers are unit-tested; APIs/UI verified by type-check + staging.
- Deploy: ECS `gcgc-staging`, branch `staging`, port 3001.

---

### Task 1: `activityScopeUserIds` — whose activity the viewer may see (TDD)

**Files:** Create `src/lib/activity-scope.ts`, `src/lib/activity-scope.test.ts`.

**Interfaces:**
- Produces: `activityScopeUserIds(viewer: { id: string; role?: string | null }, directReportIds: string[]): string[] | null` — returns `null` for ADMIN (meaning "all users"), otherwise `[viewer.id, ...directReportIds]` deduped.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/activity-scope.test.ts
import { describe, it, expect } from 'vitest'
import { activityScopeUserIds } from './activity-scope'

describe('activityScopeUserIds', () => {
  it('returns null (all) for admins', () => {
    expect(activityScopeUserIds({ id: 'a', role: 'ADMIN' }, ['x'])).toBeNull()
  })
  it('returns self + direct reports for a leader', () => {
    expect(activityScopeUserIds({ id: 'L', role: 'LEADER' }, ['m1', 'm2'])).toEqual(['L', 'm1', 'm2'])
  })
  it('returns just self for a member, deduped', () => {
    expect(activityScopeUserIds({ id: 'u', role: 'MEMBER' }, ['u'])).toEqual(['u'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/activity-scope.test.ts` → FAIL (not a function).

- [ ] **Step 3: Implement**

```ts
// src/lib/activity-scope.ts
export function activityScopeUserIds(
  viewer: { id: string; role?: string | null },
  directReportIds: string[]
): string[] | null {
  if (viewer.role === 'ADMIN') return null
  return Array.from(new Set([viewer.id, ...directReportIds]))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/activity-scope.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/activity-scope.ts src/lib/activity-scope.test.ts
git commit -m "feat(activity): activityScopeUserIds helper for the activity feed"
```

---

### Task 2: `GET /api/activities` — scoped recent activity feed

**Files:** Create `src/app/api/activities/route.ts`.

**Interfaces:**
- Consumes: `getRequestSession` (`@/lib/api-auth`), `activityScopeUserIds` (Task 1), `prisma`.
- `GET /api/activities?limit=N` → `{ activities: Array<{ id, type, description, entityType, entityId, createdAt, user: { id, name, email, image } }> }`, newest first, capped (default 40, max 100).

> Route task — verified by type-check + staging.

- [ ] **Step 1: Implement**

```ts
// src/app/api/activities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { activityScopeUserIds } from '@/lib/activity-scope'

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '40', 10) || 40, 100)

  const reports = await prisma.user.findMany({
    where: { reportsToId: session.user.id },
    select: { id: true },
  })
  const scope = activityScopeUserIds(
    { id: session.user.id, role: session.user.role },
    reports.map(r => r.id)
  )

  const activities = await prisma.activity.findMany({
    where: scope === null ? {} : { userId: { in: scope } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true, type: true, description: true, entityType: true, entityId: true, createdAt: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  })

  return NextResponse.json({ activities })
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`.

```bash
git add src/app/api/activities/route.ts
git commit -m "feat(api): scoped activity feed endpoint"
```

---

### Task 3: `/user/notifications` inbox page (Inbox + Activity tabs) + dropdown link

**Files:** Create `src/app/user/notifications/page.tsx`; Modify `src/components/notifications/NotificationDropdown.tsx`.

**Interfaces:**
- Consumes: `GET /api/notifications?unreadOnly=&limit=`, `PATCH /api/notifications` (`{markAllRead:true}`), `GET /api/activities`, `UserAvatar` (`@/components/shared/UserAvatar`), `useToast`.

> UI task — verified by type-check + staging.

- [ ] **Step 1: Create the inbox page**

```tsx
// src/app/user/notifications/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { UserAvatar } from '@/components/shared/UserAvatar'

type Notif = { id: string; title: string; message: string; isRead: boolean; entityType?: string | null; entityId?: string | null; createdAt: string }
type Act = { id: string; description: string; createdAt: string; entityType?: string | null; entityId?: string | null; user: { id: string; name: string; email: string; image?: string } }

export default function NotificationsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'inbox' | 'activity'>('inbox')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [acts, setActs] = useState<Act[]>([])
  const [loading, setLoading] = useState(true)

  const loadInbox = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/notifications?limit=50${unreadOnly ? '&unreadOnly=true' : ''}`)
    const json = await res.json().catch(() => ({ notifications: [] }))
    setNotifs(json.notifications ?? [])
    setLoading(false)
  }, [unreadOnly])

  const loadActivity = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/activities?limit=50')
    const json = await res.json().catch(() => ({ activities: [] }))
    setActs(json.activities ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { tab === 'inbox' ? loadInbox() : loadActivity() }, [tab, loadInbox, loadActivity])

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) })
    loadInbox()
  }

  function openNotif(n: Notif) {
    if (n.entityType === 'task' && n.entityId) router.push(`/user/tasks?taskId=${n.entityId}`)
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        {tab === 'inbox' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setUnreadOnly(v => !v)} className="px-2.5 h-8 rounded-md text-xs font-semibold border border-slate-200 hover:border-blue-300">
              {unreadOnly ? 'Show all' : 'Unread only'}
            </button>
            <button onClick={markAllRead} className="px-2.5 h-8 rounded-md text-xs font-semibold bg-blue-600 text-white">Mark all read</button>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b mb-3">
        {(['inbox', 'activity'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 h-9 text-sm font-semibold capitalize border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t === 'inbox' ? 'Inbox' : 'Activity'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading…</div>
      ) : tab === 'inbox' ? (
        notifs.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">No notifications.</div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {notifs.map(n => (
              <li key={n.id}>
                <button onClick={() => openNotif(n)} className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${!n.isRead ? 'bg-blue-50/40' : ''}`}>
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />}
                    <div className="min-w-0">
                      <p className={`text-sm ${!n.isRead ? 'font-semibold' : 'text-slate-700'}`}>{n.title}</p>
                      <p className="text-xs text-slate-500">{n.message}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : acts.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">No recent activity.</div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {acts.map(a => (
            <li key={a.id} className="px-4 py-3 flex items-start gap-2.5">
              <UserAvatar userId={a.user.id} image={a.user.image} name={a.user.name} email={a.user.email} className="h-6 w-6" fallbackClassName="text-[10px]" />
              <div className="min-w-0">
                <p className="text-sm text-slate-700"><span className="font-semibold">{a.user.name || a.user.email}</span> {a.description}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add a "View all" link to the notification dropdown**

In `src/components/notifications/NotificationDropdown.tsx`, add a footer link to `/user/notifications` at the bottom of the dropdown list (use the existing `router` and styling). A minimal addition near the end of the dropdown content:

```tsx
<button
  onClick={() => router.push('/user/notifications')}
  className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-2 border-t"
>
  View all notifications
</button>
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`.

```bash
git add src/app/user/notifications/page.tsx src/components/notifications/NotificationDropdown.tsx
git commit -m "feat(inbox): notifications page with Inbox + Activity tabs + dropdown link"
```

---

### Task 4: Verify + deploy Phase B

**Files:** none.

- [ ] **Step 1: Full suite + type-check**

Run: `npx vitest run` → all pass (incl. `activity-scope.test.ts`). `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`.

- [ ] **Step 2: Update graph + deploy**

Run: `graphify update .`

```bash
git push origin staging
ssh gcgc-staging 'cd /var/www/gcgc-tms-staging && git checkout -- package-lock.json && git pull origin staging && npm run build && pm2 restart gcgc-tms-staging --update-env'
```
Health: `ssh gcgc-staging "curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/"` → `200`.

- [ ] **Step 3: Manual verification on staging**

- Open `/user/notifications` → **Inbox** lists your notifications; "Unread only" filters; "Mark all read" clears the unread dots.
- Click a task notification → opens the task.
- **Activity** tab → lists recent activity (you + your direct reports; admins see all), newest first, with avatars.
- The notification bell dropdown shows a "View all notifications" link → opens the page.

---

## Self-Review

**Spec coverage:** inbox page with full list + unread filter + mark-all-read (T3) ✓; activity feed as a tab in the inbox page (T3) scoped via `/api/activities` (T2) + tested scope helper (T1) ✓; dropdown deep-link/mark-read already existed, "View all" link added (T3) ✓.

**Placeholders:** none — full code in every step; route/UI verified by type-check + staging (no harness).

**Type consistency:** `activityScopeUserIds` signature (T1) matches its call in T2; the `/api/activities` response shape (T2) matches the `Act` type consumed in T3; `/api/notifications` shape consumed as documented in Global Constraints.
