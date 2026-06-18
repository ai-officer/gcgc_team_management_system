# Kanban Timeline/Gantt — Phase 2 Implementation Plan (drag-to-reschedule)

> Builds on Phase 1 (render-only Timeline). Adds interactive drag: move a bar to shift
> both dates, drag an edge to resize, gated by task-edit permission, with optimistic
> update + rollback. No new API (PATCH `/api/tasks/[id]` already accepts startDate/dueDate
> as ISO datetime).

**Goal:** Make timeline bars draggable to reschedule tasks (move + resize), writing the new dates to the DB.

**Architecture:** Pure pixel→date math added to `src/lib/timeline.ts` (vitest-tested). `TimelineView` gains pointer-event drag with a live preview and an `onReschedule` callback + `canEdit(task)` prop. The page implements `onReschedule` (optimistic local update → PATCH → rollback+toast) and passes `canEdit = canUserChangeTaskStatus`.

**Tech Stack:** React pointer events, date-fns, Vitest. PATCH `/api/tasks/[id]` (existing).

## Global Constraints

- Type-check baseline **201** (must stay 201). Vitest for `src/lib/*.test.ts`.
- PATCH `/api/tasks/[id]` validates `startDate`/`dueDate` as `z.string().datetime()` → send **full ISO** (`new Date(...).toISOString()`), not `YYYY-MM-DD`.
- Reuse `canUserChangeTaskStatus(task)` for the drag gate (matches the Kanban).
- Deploy: ECS `gcgc-staging`, branch `staging`, port 3001.

---

### Task 1: pure pixel→date drag math in `timeline.ts` (TDD)

**Files:** Modify `src/lib/timeline.ts`; Test `src/lib/timeline.test.ts`.

**Produces:**
- `pxDeltaToDays(deltaPx: number, axis: Axis): number` → `Math.round(deltaPx / axis.dayWidthPx)`.
- `shiftDates(startISO: string, dueISO: string, deltaDays: number): { startDate: string; dueDate: string }` → both dates shifted by `deltaDays`, duration preserved, returned as full ISO (midnight UTC).
- `resizeStart(startISO, dueISO, deltaDays): { startDate, dueDate }` → move start by deltaDays, clamped so start ≤ due (min 0-day span).
- `resizeEnd(startISO, dueISO, deltaDays): { startDate, dueDate }` → move due by deltaDays, clamped so due ≥ start.

Tests: deltaPx 50 @ dayWidth 16 → 3 days; shiftDates('2026-06-03','2026-06-07', +2) → 06-05/06-09; resizeStart clamps when deltaDays pushes start past due; resizeEnd clamps when pushed before start. Use `addDays`/`startOfDay`/`differenceInCalendarDays` from date-fns; emit `.toISOString()`.

### Task 2: drag interaction in `TimelineView`

**Files:** Modify `src/components/tasks/TimelineView.tsx`.

**Props add:** `canEdit?: (taskId: string) => boolean`, `onReschedule?: (taskId: string, dates: { startDate: string; dueDate: string }) => void`.

Behavior:
- Editable bars (`canEdit?.(t.id)`) get `cursor-grab`, two 6px edge resize handles, and pointer handlers; non-editable bars render exactly as Phase 1 (no handles).
- `onPointerDown` (bar body → `move`; left/right handle → `resize-start`/`resize-end`, `stopPropagation`): record `{ taskId, mode, startX, startISO, dueISO }`, `setPointerCapture`.
- `onPointerMove`: `previewPx = e.clientX - startX`; update a local `drag` state so the bar follows (move: translateX; resize: adjust left/width). Visual only.
- `onPointerUp`: `deltaDays = pxDeltaToDays(previewPx, axis)`; if `deltaDays !== 0`, compute new dates via `shiftDates`/`resizeStart`/`resizeEnd` and call `onReschedule(taskId, dates)`. Clear `drag`.
- A 1px-min drag threshold avoids firing on a click (so click-to-open still works).

Verify: type-check stays 201 (no component tests).

### Task 3: page `onReschedule` + permission wiring

**Files:** Modify `src/app/user/tasks/page.tsx`.

- Pass `canEdit={(id) => { const t = tasks.find(x => x.id === id); return t ? canUserChangeTaskStatus(t) : false }}` and `onReschedule={handleReschedule}` to `<TimelineView>`.
- `handleReschedule(taskId, { startDate, dueDate })`: optimistically `setTasks` with the new dates; `PATCH /api/tasks/${taskId}` with `{ startDate, dueDate }` (already ISO); on non-ok, revert `setTasks` to the snapshot and `toast` an error; on ok, no-op (optimistic value stands). Follow the existing fetch/toast patterns in the file.

Verify: type-check stays 201.

### Task 4: verify + deploy

- `npx vitest run` (all pass incl. new Task 1 tests), `tsc` = 201, `graphify update .`.
- Push `staging`; deploy to `gcgc-staging` (pull → build → pm2 restart); health 200.
- Manual: drag a bar (move) → dates shift, persists on refresh; drag an edge → resizes; a task you can't edit has no handles; clicking a bar still opens the detail modal.

## Out of scope (Phase 3)
Unscheduled-tray drag-in. Timezone day-shift (pre-existing repo-wide; tracked separately).
