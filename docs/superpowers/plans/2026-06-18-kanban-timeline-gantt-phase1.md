# Kanban Timeline/Gantt — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a render-only Timeline (Gantt) view to `/user/tasks`, grouped by assignee, with a month/week zoom — plus fix the "Filter by user" dropdown to list the active board's members.

**Architecture:** Pure date/layout math lives in a vitest-tested helper `src/lib/timeline.ts`. A thin `TimelineView` React component consumes it to render an axis + assignee-grouped rows + static bars. A `Board ⇄ Timeline` toggle on the tasks page switches views; both share the existing fetched, board-scoped task list. No drag yet (Phase 2), no unscheduled tray UI yet (Phase 3) — but date-less tasks are excluded from bars and counted.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, TailwindCSS, date-fns (already a dependency), Vitest.

## Global Constraints

- Type-check baseline is **201 errors** (`next.config.js` ignores build errors). "No new errors" = total stays **201**. Run `npx tsc --noEmit 2>&1 | grep -cE "error TS"`.
- Tests use **Vitest** (`npx vitest run`). Only `src/lib/*.test.ts` style unit tests exist; there is **no React component test harness** — UI tasks are verified by type-check + manual/staging, not unit tests.
- Date fields on a task: `startDate?: string`, `dueDate?: string` (ISO strings, may be null/undefined).
- Bar color follows Kanban status colors. Rescheduling/permissions are **out of scope for Phase 1** (render-only).
- Deploy target is ECS `gcgc-staging` (branch `staging`, port 3001). Each task commits to `staging`.
- `docs/` is gitignored but force-added (`git add -f`) — not relevant to code tasks here.

---

### Task 1: `splitScheduled` — separate dated from date-less tasks

**Files:**
- Create: `src/lib/timeline.ts`
- Test: `src/lib/timeline.test.ts`

**Interfaces:**
- Produces: `type TimelineTask = { id: string; title: string; status: string; startDate?: string | null; dueDate?: string | null; assignee?: { id: string; name: string; email: string; image?: string } | null }`
- Produces: `splitScheduled<T extends Pick<TimelineTask,'startDate'|'dueDate'>>(tasks: T[]): { scheduled: T[]; unscheduled: T[] }` — `scheduled` = has BOTH non-empty startDate and dueDate; `unscheduled` = the rest.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/timeline.test.ts
import { describe, it, expect } from 'vitest'
import { splitScheduled } from './timeline'

describe('splitScheduled', () => {
  it('puts tasks with both start and due in scheduled, the rest in unscheduled', () => {
    const tasks = [
      { id: 'a', startDate: '2026-06-01', dueDate: '2026-06-05' },
      { id: 'b', startDate: '2026-06-01', dueDate: null },
      { id: 'c', startDate: null, dueDate: null },
    ]
    const { scheduled, unscheduled } = splitScheduled(tasks)
    expect(scheduled.map(t => t.id)).toEqual(['a'])
    expect(unscheduled.map(t => t.id)).toEqual(['b', 'c'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/timeline.test.ts`
Expected: FAIL ("splitScheduled is not a function" / module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/timeline.ts
export type TimelineZoom = 'week' | 'month'

export interface TimelineTask {
  id: string
  title: string
  status: string
  startDate?: string | null
  dueDate?: string | null
  assignee?: { id: string; name: string; email: string; image?: string } | null
}

export function splitScheduled<T extends Pick<TimelineTask, 'startDate' | 'dueDate'>>(
  tasks: T[]
): { scheduled: T[]; unscheduled: T[] } {
  const scheduled: T[] = []
  const unscheduled: T[] = []
  for (const t of tasks) {
    if (t.startDate && t.dueDate) scheduled.push(t)
    else unscheduled.push(t)
  }
  return { scheduled, unscheduled }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/timeline.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timeline.ts src/lib/timeline.test.ts
git commit -m "feat(timeline): splitScheduled helper for Gantt"
```

---

### Task 2: `groupByAssignee` — order rows into assignee groups

**Files:**
- Modify: `src/lib/timeline.ts`
- Test: `src/lib/timeline.test.ts`

**Interfaces:**
- Produces: `interface AssigneeGroup<T> { key: string; label: string; assignee: TimelineTask['assignee']; tasks: T[] }`
- Produces: `groupByAssignee<T extends { assignee?: TimelineTask['assignee'] }>(tasks: T[]): AssigneeGroup<T>[]` — one group per distinct assignee id, sorted by assignee name (case-insensitive); tasks with no assignee go in a final group `{ key: 'unassigned', label: 'Unassigned', assignee: null }`. Empty input → `[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { groupByAssignee } from './timeline'

describe('groupByAssignee', () => {
  it('groups by assignee sorted by name, unassigned last', () => {
    const alice = { id: 'u1', name: 'Alice', email: 'a@x.com' }
    const bob = { id: 'u2', name: 'Bob', email: 'b@x.com' }
    const tasks = [
      { id: 't1', assignee: bob },
      { id: 't2', assignee: alice },
      { id: 't3', assignee: null },
      { id: 't4', assignee: alice },
    ]
    const groups = groupByAssignee(tasks)
    expect(groups.map(g => g.label)).toEqual(['Alice', 'Bob', 'Unassigned'])
    expect(groups[0].tasks.map(t => t.id)).toEqual(['t2', 't4'])
    expect(groups[2].key).toBe('unassigned')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/timeline.test.ts -t groupByAssignee`
Expected: FAIL ("groupByAssignee is not a function").

- [ ] **Step 3: Write minimal implementation**

```ts
// append to src/lib/timeline.ts
export interface AssigneeGroup<T> {
  key: string
  label: string
  assignee: TimelineTask['assignee']
  tasks: T[]
}

export function groupByAssignee<T extends { assignee?: TimelineTask['assignee'] }>(
  tasks: T[]
): AssigneeGroup<T>[] {
  const named = new Map<string, AssigneeGroup<T>>()
  const unassigned: T[] = []
  for (const t of tasks) {
    const a = t.assignee
    if (!a) { unassigned.push(t); continue }
    const g = named.get(a.id) ?? { key: a.id, label: a.name || a.email, assignee: a, tasks: [] }
    g.tasks.push(t)
    named.set(a.id, g)
  }
  const groups = Array.from(named.values()).sort((x, y) =>
    x.label.toLowerCase().localeCompare(y.label.toLowerCase())
  )
  if (unassigned.length) {
    groups.push({ key: 'unassigned', label: 'Unassigned', assignee: null, tasks: unassigned })
  }
  return groups
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/timeline.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/timeline.ts src/lib/timeline.test.ts
git commit -m "feat(timeline): groupByAssignee helper"
```

---

### Task 3: `buildAxis` + `barGeometry` — date↔pixel math

**Files:**
- Modify: `src/lib/timeline.ts`
- Test: `src/lib/timeline.test.ts`

**Interfaces:**
- Produces: `interface Axis { start: Date; end: Date; zoom: TimelineZoom; dayWidthPx: number; totalWidthPx: number; months: { label: string; leftPx: number; widthPx: number }[] }`
- Produces: `buildAxis(start: Date, end: Date, zoom: TimelineZoom): Axis` — inclusive day span; `dayWidthPx` = 40 for `'week'`, 16 for `'month'`; `totalWidthPx` = (#days) * dayWidthPx; `months` = one entry per calendar month touched, each with pixel offset/width for the days of that month within range.
- Produces: `barGeometry(startDate: string, dueDate: string, axis: Axis): { leftPx: number; widthPx: number }` — `leftPx` = calendar days from `axis.start` to `startDate` × dayWidthPx; `widthPx` = (inclusive day count startDate→dueDate) × dayWidthPx (min one day).

- [ ] **Step 1: Write the failing test**

```ts
import { buildAxis, barGeometry } from './timeline'

describe('buildAxis + barGeometry', () => {
  it('lays out days and positions a bar within the axis', () => {
    const axis = buildAxis(new Date('2026-06-01'), new Date('2026-06-30'), 'month')
    expect(axis.dayWidthPx).toBe(16)
    expect(axis.totalWidthPx).toBe(30 * 16) // 30 inclusive days
    expect(axis.months[0].label).toMatch(/Jun/)

    const bar = barGeometry('2026-06-03', '2026-06-07', axis)
    expect(bar.leftPx).toBe(2 * 16)   // Jun 1 -> Jun 3 = 2 days
    expect(bar.widthPx).toBe(5 * 16)  // Jun 3..7 inclusive = 5 days
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/timeline.test.ts -t buildAxis`
Expected: FAIL ("buildAxis is not a function").

- [ ] **Step 3: Write minimal implementation**

```ts
// append to src/lib/timeline.ts
import { startOfDay, differenceInCalendarDays, eachMonthOfInterval, endOfMonth, format, max, min } from 'date-fns'

export interface Axis {
  start: Date
  end: Date
  zoom: TimelineZoom
  dayWidthPx: number
  totalWidthPx: number
  months: { label: string; leftPx: number; widthPx: number }[]
}

export function buildAxis(start: Date, end: Date, zoom: TimelineZoom): Axis {
  const s = startOfDay(start)
  const e = startOfDay(end)
  const dayWidthPx = zoom === 'week' ? 40 : 16
  const totalDays = differenceInCalendarDays(e, s) + 1
  const totalWidthPx = totalDays * dayWidthPx
  const months = eachMonthOfInterval({ start: s, end: e }).map((m) => {
    const mStart = max([m, s])
    const mEnd = min([endOfMonth(m), e])
    const leftPx = differenceInCalendarDays(mStart, s) * dayWidthPx
    const widthPx = (differenceInCalendarDays(mEnd, mStart) + 1) * dayWidthPx
    return { label: format(m, 'MMM yyyy'), leftPx, widthPx }
  })
  return { start: s, end: e, zoom, dayWidthPx, totalWidthPx, months }
}

export function barGeometry(startDate: string, dueDate: string, axis: Axis): { leftPx: number; widthPx: number } {
  const s = startOfDay(new Date(startDate))
  const d = startOfDay(new Date(dueDate))
  const leftPx = differenceInCalendarDays(s, axis.start) * axis.dayWidthPx
  const days = Math.max(1, differenceInCalendarDays(d, s) + 1)
  return { leftPx, widthPx: days * axis.dayWidthPx }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/timeline.test.ts`
Expected: PASS (all three describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/timeline.ts src/lib/timeline.test.ts
git commit -m "feat(timeline): buildAxis + barGeometry date/pixel math"
```

---

### Task 4: `axisRangeFor` — derive the visible date window from tasks

**Files:**
- Modify: `src/lib/timeline.ts`
- Test: `src/lib/timeline.test.ts`

**Interfaces:**
- Produces: `axisRangeFor(tasks: Pick<TimelineTask,'startDate'|'dueDate'>[], today: Date): { start: Date; end: Date }` — spans from the earliest start (or `today`, whichever earlier) minus 3 days, to the latest due (or `today`) plus 7 days. Ignores null dates. With no dated tasks, returns `today-7 … today+21`.

- [ ] **Step 1: Write the failing test**

```ts
import { axisRangeFor } from './timeline'
import { differenceInCalendarDays } from 'date-fns'

describe('axisRangeFor', () => {
  it('pads around the min start and max due', () => {
    const today = new Date('2026-06-15')
    const { start, end } = axisRangeFor(
      [{ startDate: '2026-06-10', dueDate: '2026-06-20' }], today
    )
    expect(differenceInCalendarDays(new Date('2026-06-10'), start)).toBe(3) // 3 days pad before
    expect(differenceInCalendarDays(end, new Date('2026-06-20'))).toBe(7)   // 7 days pad after
  })

  it('defaults to a window around today when no dates', () => {
    const today = new Date('2026-06-15')
    const { start, end } = axisRangeFor([], today)
    expect(differenceInCalendarDays(today, start)).toBe(7)
    expect(differenceInCalendarDays(end, today)).toBe(21)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/timeline.test.ts -t axisRangeFor`
Expected: FAIL ("axisRangeFor is not a function").

- [ ] **Step 3: Write minimal implementation**

```ts
// append to src/lib/timeline.ts (uses addDays, subDays from date-fns)
import { addDays, subDays } from 'date-fns'

export function axisRangeFor(
  tasks: Pick<TimelineTask, 'startDate' | 'dueDate'>[],
  today: Date
): { start: Date; end: Date } {
  const starts = tasks.map(t => t.startDate).filter(Boolean).map(d => new Date(d as string))
  const dues = tasks.map(t => t.dueDate).filter(Boolean).map(d => new Date(d as string))
  if (!starts.length && !dues.length) {
    return { start: subDays(startOfDay(today), 7), end: addDays(startOfDay(today), 21) }
  }
  const minStart = min([today, ...starts])
  const maxDue = max([today, ...dues])
  return { start: subDays(startOfDay(minStart), 3), end: addDays(startOfDay(maxDue), 7) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/timeline.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/timeline.ts src/lib/timeline.test.ts
git commit -m "feat(timeline): axisRangeFor visible-window helper"
```

---

### Task 5: `TimelineView` component (render-only)

**Files:**
- Create: `src/components/tasks/TimelineView.tsx`
- Reference (do not test via unit): `src/lib/timeline.ts`

**Interfaces:**
- Consumes: `splitScheduled`, `groupByAssignee`, `buildAxis`, `barGeometry`, `axisRangeFor`, types `TimelineTask`, `TimelineZoom`, `Axis` from `@/lib/timeline`.
- Consumes: `UserAvatar` from `@/components/shared/UserAvatar`; status color helper (inline map below).
- Produces: `export default function TimelineView(props: { tasks: TimelineTask[]; zoom: TimelineZoom; onZoomChange: (z: TimelineZoom) => void; onTaskClick?: (taskId: string) => void }): JSX.Element`

> This is a UI task. There is no component test harness — verify by **type-check (stays 201)** and **manual/staging**. Steps 1–2 build it; Step 3 type-checks; Step 4 commits.

- [ ] **Step 1: Create the component**

```tsx
// src/components/tasks/TimelineView.tsx
'use client'
import { useMemo } from 'react'
import { format, startOfDay, differenceInCalendarDays } from 'date-fns'
import { UserAvatar } from '@/components/shared/UserAvatar'
import {
  splitScheduled, groupByAssignee, buildAxis, barGeometry, axisRangeFor,
  type TimelineTask, type TimelineZoom,
} from '@/lib/timeline'

const STATUS_BAR: Record<string, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-amber-500',
  COMPLETED: 'bg-emerald-500',
}
const ROW_H = 36
const LEFT_W = 320

export default function TimelineView({
  tasks, zoom, onZoomChange, onTaskClick,
}: {
  tasks: TimelineTask[]
  zoom: TimelineZoom
  onZoomChange: (z: TimelineZoom) => void
  onTaskClick?: (taskId: string) => void
}) {
  const today = startOfDay(new Date())
  const { scheduled, unscheduled } = useMemo(() => splitScheduled(tasks), [tasks])
  const range = useMemo(() => axisRangeFor(scheduled, today), [scheduled, today.getTime()])
  const axis = useMemo(() => buildAxis(range.start, range.end, zoom), [range, zoom])
  const groups = useMemo(() => groupByAssignee(scheduled), [scheduled])
  const todayLeft = differenceInCalendarDays(today, axis.start) * axis.dayWidthPx

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</span>
        <div className="flex items-center gap-1">
          {(['month', 'week'] as TimelineZoom[]).map(z => (
            <button key={z} onClick={() => onZoomChange(z)}
              className={`px-2.5 h-7 rounded-md text-xs font-semibold border capitalize ${
                zoom === z ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              {z}
            </button>
          ))}
        </div>
      </div>

      <div className="flex overflow-x-auto">
        {/* Left table */}
        <div className="shrink-0 sticky left-0 z-10 bg-white border-r" style={{ width: LEFT_W }}>
          <div style={{ height: ROW_H }} className="border-b bg-slate-50" />
          {groups.map(g => (
            <div key={g.key}>
              <div style={{ height: ROW_H }} className="flex items-center gap-2 px-3 bg-slate-50/70 border-b text-xs font-semibold text-slate-600">
                {g.assignee
                  ? <UserAvatar userId={g.assignee.id} image={g.assignee.image} name={g.assignee.name} email={g.assignee.email} className="h-5 w-5" fallbackClassName="text-[10px]" />
                  : <span className="h-5 w-5 rounded-full bg-slate-200 inline-block" />}
                {g.label} <span className="text-slate-400">({g.tasks.length})</span>
              </div>
              {g.tasks.map(t => (
                <button key={t.id} onClick={() => onTaskClick?.(t.id)} style={{ height: ROW_H }}
                  className="w-full flex items-center px-3 pl-10 border-b text-xs text-gray-700 hover:bg-slate-50 text-left truncate">
                  {t.title}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Right grid */}
        <div className="relative" style={{ width: axis.totalWidthPx }}>
          {/* Month header */}
          <div className="relative bg-slate-50 border-b" style={{ height: ROW_H }}>
            {axis.months.map(m => (
              <div key={m.label} className="absolute top-0 h-full flex items-center px-2 text-[11px] font-medium text-slate-500 border-l"
                style={{ left: m.leftPx, width: m.widthPx }}>
                {m.label}
              </div>
            ))}
          </div>
          {/* Today line */}
          {todayLeft >= 0 && todayLeft <= axis.totalWidthPx && (
            <div className="absolute top-0 bottom-0 w-px bg-red-400/70 z-[5]" style={{ left: todayLeft }} />
          )}
          {/* Bars */}
          {groups.map(g => (
            <div key={g.key}>
              <div style={{ height: ROW_H }} className="border-b bg-slate-50/40" />
              {g.tasks.map(t => {
                const { leftPx, widthPx } = barGeometry(t.startDate!, t.dueDate!, axis)
                return (
                  <div key={t.id} style={{ height: ROW_H }} className="relative border-b">
                    <button onClick={() => onTaskClick?.(t.id)}
                      title={`${t.title} · ${format(new Date(t.startDate!), 'MMM d')}–${format(new Date(t.dueDate!), 'MMM d')}`}
                      className={`absolute top-1.5 h-6 rounded ${STATUS_BAR[t.status] ?? 'bg-gray-400'} opacity-90 hover:opacity-100`}
                      style={{ left: leftPx, width: Math.max(widthPx, axis.dayWidthPx) }} />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div className="px-3 py-2 border-t text-xs text-slate-500">
          {unscheduled.length} task{unscheduled.length === 1 ? '' : 's'} without dates (Unscheduled tray comes in Phase 3)
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check (must stay 201)**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"`
Expected: `201`. If higher, fix new errors in `TimelineView.tsx` before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/TimelineView.tsx
git commit -m "feat(timeline): render-only TimelineView component"
```

---

### Task 6: Wire the Board ⇄ Timeline toggle into the tasks page

**Files:**
- Modify: `src/app/user/tasks/page.tsx`

**Interfaces:**
- Consumes: `TimelineView` (default export) from `@/components/tasks/TimelineView`.
- Uses existing page state: `tasks` (the fetched, board-scoped list), `searchParams`, `router`, and the task-open handler `handleTaskClick(task)`.

> UI task — verify by type-check (stays 201) + manual/staging.

- [ ] **Step 1: Add view-mode state synced to the URL**

Near the other URL-synced filter state (around the `selectedUser`/`activeBoardId` `useState` block), add:

```tsx
const [viewMode, setViewMode] = useState<'board' | 'timeline'>(
  () => (searchParams.get('view') === 'timeline' ? 'timeline' : 'board')
)
const [timelineZoom, setTimelineZoom] = useState<'month' | 'week'>('month')
```

In the existing `useEffect` that writes filters to the URL (the one calling `params.set('user', ...)` etc.), add:

```tsx
if (viewMode === 'timeline') params.set('view', 'timeline')
```

and include `viewMode` in that effect's dependency array.

- [ ] **Step 2: Add the import**

At the top with the other `@/components/tasks` imports:

```tsx
import TimelineView from '@/components/tasks/TimelineView'
```

- [ ] **Step 3: Add the toggle control next to the board header**

Find the board header row (where the board tabs render, near `activeBoardId === null`). Immediately above the view content, add a segmented toggle:

```tsx
<div className="inline-flex items-center gap-1 rounded-md border border-slate-200 p-0.5">
  {(['board', 'timeline'] as const).map(m => (
    <button key={m} onClick={() => setViewMode(m)}
      className={`px-3 h-7 rounded text-xs font-semibold capitalize ${
        viewMode === m ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
      {m}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Render TimelineView when in timeline mode**

Wrap the existing Kanban columns block so it only renders when `viewMode === 'board'`. Directly after it, add:

```tsx
{viewMode === 'timeline' && (
  <TimelineView
    tasks={tasks as any}
    zoom={timelineZoom}
    onZoomChange={setTimelineZoom}
    onTaskClick={(id) => {
      const t = tasks.find(x => x.id === id)
      if (t) handleTaskClick(t)
    }}
  />
)}
```

(`tasks as any` bridges the page's local `Task` type to `TimelineTask`; the shapes are compatible for the fields used.)

- [ ] **Step 5: Type-check (must stay 201)**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"`
Expected: `201`.

- [ ] **Step 6: Commit**

```bash
git add src/app/user/tasks/page.tsx
git commit -m "feat(timeline): Board/Timeline view toggle on tasks page"
```

---

### Task 7: Fix the user filter to use the active board's members

**Files:**
- Modify: `src/app/user/tasks/page.tsx`

**Interfaces:**
- Uses existing: `activeBoard` (computed: `boards.find(b => b.id === activeBoardId)`), its `.members: { userId; user: { id; name; email } }[]`, the `users` list, and `selectedUser`/`setSelectedUser`.

> UI/logic task — verify by type-check (stays 201) + manual/staging.

- [ ] **Step 1: Compute the filter's user options from the active board**

Near `activeBoard` (around the `const activeBoard = ...` line), add:

```tsx
const filterUserOptions = activeBoard
  ? activeBoard.members.map(m => ({ id: m.user.id, name: m.user.name || m.user.email }))
  : users.map(u => ({ id: u.id, name: u.name || u.email }))
```

- [ ] **Step 2: Point the "Filter by user" Select at `filterUserOptions`**

In the user-filter `Select` (the one with `value={selectedUser} onValueChange={setSelectedUser}` and `placeholder="Filter by user"`), replace its `users.map(...)` option list with:

```tsx
{filterUserOptions.map(u => (
  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
))}
```

- [ ] **Step 3: Clear a stale selection when switching to a board that lacks the user**

Add an effect after the `activeBoard` computation:

```tsx
useEffect(() => {
  if (selectedUser && !filterUserOptions.some(u => u.id === selectedUser)) {
    setSelectedUser('')
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeBoardId])
```

- [ ] **Step 4: Type-check (must stay 201)**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"`
Expected: `201`.

- [ ] **Step 5: Commit**

```bash
git add src/app/user/tasks/page.tsx
git commit -m "fix(tasks): user filter lists active board's members, not all users"
```

---

### Task 8: Verify the full suite + deploy Phase 1 to staging

**Files:** none (verification + deploy).

- [ ] **Step 1: Run the whole unit suite**

Run: `npx vitest run`
Expected: all pass, including the new `src/lib/timeline.test.ts` (3 describe blocks / 5+ tests).

- [ ] **Step 2: Type-check baseline**

Run: `npx tsc --noEmit 2>&1 | grep -cE "error TS"`
Expected: `201`.

- [ ] **Step 3: Update the knowledge graph**

Run: `graphify update .`

- [ ] **Step 4: Push staging and deploy**

```bash
git push origin staging
ssh gcgc-staging 'cd /var/www/gcgc-tms-staging && git checkout -- package-lock.json && git pull origin staging && npm run build && pm2 restart gcgc-tms-staging --update-env'
```
Then health-check: `ssh gcgc-staging "curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/"` → expect `200`.

- [ ] **Step 5: Manual verification on staging**

Open `https://tms-staging.hotelsogo-ai.com/user/tasks`, then:
- Toggle **Timeline** → see assignee-grouped rows, month axis, status-colored bars, a red "today" line. Switch **Week/Month** zoom.
- Tasks with no start+due date do **not** appear as bars; the "N tasks without dates" note shows.
- Select a **specific board** → the "Filter by user" dropdown lists only that board's members. "All Tasks" → full user list.
- Click a bar or a left-table row → the Task Detail modal opens.

---

## Self-Review

**Spec coverage:** view toggle (T6) ✓; split-view layout (T5) ✓; group by assignee (T2,T5) ✓; status-colored bars + today line (T5) ✓; week/month zoom (T5,T6) ✓; date-less tasks excluded + counted (T1,T5) ✓; filter fix (T7) ✓; pure tested helpers (T1–T4) ✓. Out of Phase 1 by design: drag-to-reschedule (Phase 2), unscheduled-tray drag UI (Phase 3) — noted in T5 placeholder text.

**Placeholders:** none — every code step shows complete code; UI tasks are explicitly verified by type-check + staging (no component harness exists).

**Type consistency:** `TimelineTask`, `TimelineZoom`, `Axis`, `AssigneeGroup`, and the helper signatures (`splitScheduled`, `groupByAssignee`, `buildAxis`, `barGeometry`, `axisRangeFor`) are defined in T1–T4 and consumed with the same names/shapes in T5–T6.

## Phase 2 / Phase 3 (separate plans, after Phase 1 lands)

- **Phase 2 — Drag to reschedule:** add `pxToDate`/`snapToDay` to `timeline.ts` (TDD), a `useDragReschedule` hook, bar move/resize handles gated by task-edit permission, optimistic `PATCH /api/tasks/[id]` with `startDate`/`dueDate` (extend the route's Zod schema), rollback + toast.
- **Phase 3 — Unscheduled tray:** render the date-less tasks as draggable chips; drop on grid → set start at drop day + 1-day duration via the same PATCH.
