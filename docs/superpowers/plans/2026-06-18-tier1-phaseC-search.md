# Tier 1 Phase C — Global Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A global search across **tasks**, **comments**, and **people**, access-scoped to the viewer, surfaced as a header search bar in the user portal with a grouped results dropdown.

**Architecture:** A vitest-tested pure helper `taskAccessWhere(viewer)` returns the Prisma `where` for tasks the viewer may see (admins: all; others: tasks they assign/create/are a team-member or collaborator on). `GET /api/search?q=` runs three capped queries (tasks, comments-on-accessible-tasks, people) and returns grouped results. A `GlobalSearch` client component (debounced) renders in the user layout.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, Prisma, Vitest.

## Global Constraints

- Type-check baseline **201** (`npx tsc --noEmit 2>&1 | grep -cE "error TS"`); Vitest `npx vitest run`.
- Access scope (mirrors `/api/tasks` involvement clauses): a non-admin sees a task if they are its `assigneeId`, `creatorId`, a `teamMembers` member, or a `collaborators` member. Admins see all. (Leader→managed-member tasks they're not on are out of scope for v1 search.)
- Auth in the route via `getRequestSession` (`@/lib/api-auth`), 401 unauthenticated.
- Minimum query length 2; shorter → empty groups (no DB hit).
- Person result click → `/user/tasks?user=<id>` (board's existing user filter); task/comment click → `/user/tasks?taskId=<id>`.
- No component/route test harness — the pure helper is unit-tested; route/UI verified by type-check + staging.
- Deploy: ECS `gcgc-staging`, branch `staging`, port 3001.

---

### Task 1: `taskAccessWhere` — Prisma access clause for searchable tasks (TDD)

**Files:** Create `src/lib/search-access.ts`, `src/lib/search-access.test.ts`.

**Interfaces:**
- Produces: `taskAccessWhere(viewer: { id: string; role?: string | null }): Record<string, unknown>` — `{}` for ADMIN; otherwise `{ OR: [ { assigneeId }, { creatorId }, { teamMembers: { some: { userId } } }, { collaborators: { some: { userId } } } ] }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/search-access.test.ts
import { describe, it, expect } from 'vitest'
import { taskAccessWhere } from './search-access'

describe('taskAccessWhere', () => {
  it('returns an empty (unrestricted) clause for admins', () => {
    expect(taskAccessWhere({ id: 'a', role: 'ADMIN' })).toEqual({})
  })
  it('returns the involvement OR-clause for non-admins', () => {
    const w = taskAccessWhere({ id: 'u', role: 'MEMBER' }) as { OR: any[] }
    expect(w.OR).toContainEqual({ assigneeId: 'u' })
    expect(w.OR).toContainEqual({ creatorId: 'u' })
    expect(w.OR).toContainEqual({ teamMembers: { some: { userId: 'u' } } })
    expect(w.OR).toContainEqual({ collaborators: { some: { userId: 'u' } } })
    expect(w.OR).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/search-access.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/search-access.ts
export function taskAccessWhere(viewer: { id: string; role?: string | null }): Record<string, unknown> {
  if (viewer.role === 'ADMIN') return {}
  return {
    OR: [
      { assigneeId: viewer.id },
      { creatorId: viewer.id },
      { teamMembers: { some: { userId: viewer.id } } },
      { collaborators: { some: { userId: viewer.id } } },
    ],
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/search-access.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search-access.ts src/lib/search-access.test.ts
git commit -m "feat(search): taskAccessWhere helper for access-scoped search"
```

---

### Task 2: `GET /api/search?q=` — grouped, access-scoped results

**Files:** Create `src/app/api/search/route.ts`.

**Interfaces:**
- Consumes: `getRequestSession`, `taskAccessWhere`, `prisma`.
- `GET /api/search?q=` → `{ tasks: {id,title,status}[], comments: {id,taskId,snippet,taskTitle}[], people: {id,name,email,image}[] }`. Each capped at 8. `q` shorter than 2 chars → all empty.

> Route task — verified by type-check + staging.

- [ ] **Step 1: Implement**

```ts
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { taskAccessWhere } from '@/lib/search-access'

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = (new URL(req.url).searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ tasks: [], comments: [], people: [] })

  const access = taskAccessWhere({ id: session.user.id, role: session.user.role })
  const like = { contains: q, mode: 'insensitive' as const }

  const [tasks, comments, people] = await Promise.all([
    prisma.task.findMany({
      where: { AND: [access, { OR: [{ title: like }, { description: like }] }] },
      select: { id: true, title: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    }),
    prisma.comment.findMany({
      where: { content: like, task: access },
      select: { id: true, content: true, taskId: true, task: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.user.findMany({
      where: { isActive: true, OR: [{ name: like }, { email: like }] },
      select: { id: true, name: true, email: true, image: true },
      orderBy: [{ name: 'asc' }],
      take: 8,
    }),
  ])

  return NextResponse.json({
    tasks,
    comments: comments.map(c => ({ id: c.id, taskId: c.taskId, snippet: c.content.slice(0, 80), taskTitle: c.task?.title ?? '' })),
    people,
  })
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`.

```bash
git add src/app/api/search/route.ts
git commit -m "feat(api): global search across tasks, comments, people (access-scoped)"
```

---

### Task 3: `GlobalSearch` component + mount in the user layout

**Files:** Create `src/components/search/GlobalSearch.tsx`; Modify `src/app/user/layout.tsx`.

**Interfaces:**
- Consumes: `GET /api/search?q=`, `useRouter`, `UserAvatar`.

> UI task — verified by type-check + staging. ALL hooks must precede any return (this repo had a React #310 from hooks-after-early-return).

- [ ] **Step 1: Create the component**

```tsx
// src/components/search/GlobalSearch.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'

type Results = {
  tasks: { id: string; title: string; status: string }[]
  comments: { id: string; taskId: string; snippet: string; taskTitle: string }[]
  people: { id: string; name: string; email: string; image?: string }[]
}
const EMPTY: Results = { tasks: [], comments: [], people: [] }

export function GlobalSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [res, setRes] = useState<Results>(EMPTY)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (q.trim().length < 2) { setRes(EMPTY); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        setRes(await r.json())
      } catch { setRes(EMPTY) } finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function go(url: string) { setOpen(false); setQ(''); router.push(url) }
  const hasResults = res.tasks.length || res.comments.length || res.people.length

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search tasks, comments, people…"
        className="w-full pl-9 pr-3 h-9 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:border-blue-400"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-[min(28rem,90vw)] max-h-[70vh] overflow-y-auto rounded-lg border bg-white shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-slate-400">Searching…</div>}
          {!loading && !hasResults && <div className="px-3 py-3 text-xs text-slate-400">No results for “{q.trim()}”.</div>}
          {res.tasks.length > 0 && (
            <div className="py-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tasks</p>
              {res.tasks.map(t => (
                <button key={t.id} onClick={() => go(`/user/tasks?taskId=${t.id}`)} className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 truncate">{t.title}</button>
              ))}
            </div>
          )}
          {res.comments.length > 0 && (
            <div className="py-1 border-t">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Comments</p>
              {res.comments.map(c => (
                <button key={c.id} onClick={() => go(`/user/tasks?taskId=${c.taskId}`)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50">
                  <span className="text-sm text-slate-700">“{c.snippet}”</span>
                  <span className="block text-[11px] text-slate-400 truncate">on {c.taskTitle}</span>
                </button>
              ))}
            </div>
          )}
          {res.people.length > 0 && (
            <div className="py-1 border-t">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">People</p>
              {res.people.map(p => (
                <button key={p.id} onClick={() => go(`/user/tasks?user=${p.id}`)} className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50">
                  <UserAvatar userId={p.id} image={p.image} name={p.name} email={p.email} className="h-5 w-5" fallbackClassName="text-[10px]" />
                  <span className="text-sm text-slate-700 truncate">{p.name || p.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Mount it at the top of the user content area**

In `src/app/user/layout.tsx`, add the import:

```tsx
import { GlobalSearch } from '@/components/search/GlobalSearch'
```

Inside the content container `<div className="container ...">`, render the search bar above `{children}` (after the mobile spacer div):

```tsx
          <div className="hidden lg:block mb-6"><GlobalSearch /></div>
```

(Use `hidden lg:block` so it shows on desktop; mobile users use the existing per-page search. Keep `{children}` exactly as-is below it.)

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`.

```bash
git add src/components/search/GlobalSearch.tsx src/app/user/layout.tsx
git commit -m "feat(search): global search bar in the user portal"
```

---

### Task 4: Verify + deploy Phase C

**Files:** none.

- [ ] **Step 1: Full suite + type-check**

Run: `npx vitest run` → all pass (incl. `search-access.test.ts`). `npx tsc --noEmit 2>&1 | grep -cE "error TS"` → `201`.

- [ ] **Step 2: Update graph + deploy**

Run: `graphify update .`

```bash
git push origin staging
ssh gcgc-staging 'cd /var/www/gcgc-tms-staging && git checkout -- package-lock.json && git pull origin staging && npm run build && pm2 restart gcgc-tms-staging --update-env'
```
Health: `curl http://localhost:3001/` → `200`.

- [ ] **Step 3: Manual verification on staging**

- A search bar appears at the top of user-portal pages (desktop).
- Type ≥2 chars → grouped dropdown (Tasks / Comments / People) populates.
- Click a task or comment → opens that task; click a person → board filtered to them.
- Results respect access: a non-admin does NOT see tasks they aren't involved in. Search a term you know is only on someone else's unrelated task → it should not appear for a member.

---

## Self-Review

**Spec coverage:** search across tasks + comments + people (T2), access-scoped via tested helper (T1), capped per group (T2), header search UI with grouped dropdown (T3). Cmd-K palette explicitly out of scope per spec.

**Placeholders:** none — full code in every step; route/UI verified by type-check + staging.

**Type consistency:** `taskAccessWhere` (T1) consumed in T2; the `/api/search` response shape (T2: `tasks`/`comments[snippet,taskTitle,taskId]`/`people`) matches the `Results` type in T3.
