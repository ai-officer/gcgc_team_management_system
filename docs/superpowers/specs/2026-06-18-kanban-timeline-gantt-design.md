# Kanban Timeline / Gantt — Design Spec

**Date:** 2026-06-18
**Status:** Approved (design); pending implementation plan
**Area:** `src/app/user/tasks/page.tsx`, `src/components/tasks/`, `src/lib/`, `src/app/api/tasks/[id]/route.ts`

## 1. Goal

Add a **Timeline (Gantt) view** to the tasks page, scoped per Kanban board, with an
interactive, drag-to-reschedule Gantt — comparable to Jira/Monday timelines. Bundle a
related fix: the "Filter by user" dropdown should list the **active board's members**,
not all system users.

## 2. Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Interactivity | **Drag to reschedule** — move + resize bars, writes dates to DB |
| Row grouping | **By assignee** (collapsible groups; "Unassigned" last) |
| Tasks missing start/due | **Unscheduled tray** — drag a chip onto the grid to schedule |
| Time scale | **Week + Month zoom**, default **Month** |
| Bar color | By **status** (matches Kanban column colors) |
| Build approach | **Custom**, pure date math in a tested helper; no Gantt library |
| Scope | Per active board (respects current board selection + filters) |

## 3. Where it lives

A **`Board ⇄ Timeline` segmented toggle** near the board header on `/user/tasks`. State:
`viewMode: 'board' | 'timeline'` (persisted in the URL as `?view=timeline`, consistent
with the existing bookmarkable filter state). The Timeline reuses the same fetched,
filtered task list (already scoped by `activeBoardId`). When "All Tasks" is selected, the
Timeline shows all tasks; when a board is active, only that board's tasks.

## 4. Layout (split view)

```
┌───────────────┬───────────────────────────────────────┐
│ TASK TABLE    │  JUN          JUL          AUG          │ ← axis (month/week headers)
├───────────────┼───────────────────────────────────────┤
│ ▾ Alice (3)   │                                        │ ← assignee group header
│   Design API  │      ▓▓▓▓▓▓▓                           │ ← draggable bar (status color)
│   Build UI    │            ▓▓▓▓▓▓▓▓▓▓▓                 │
│ ▾ Bob (2)     │                                        │
│ ▾ Unassigned  │                                        │
└───────────────┴───────────────────────────────────────┘
[ Unscheduled (4) ▸ ]   ← collapsible tray of date-less task chips
```

- **Left table** (~320px, sticky): assignee group header (avatar, name, task count) +
  per-task row (title, start–due dates). Collapsible groups.
- **Right Gantt**: horizontally scrollable grid. Day columns under week/month headers, a
  vertical **"today" line**, and one bar per task spanning `startDate → dueDate`.
- **Zoom**: Month (default, ~4–8 weeks visible) / Week (~1–2 weeks, finer drag).
- Left and right share row height and scroll vertically in lockstep.

## 5. Bars & interactivity

- A task renders a bar only if it has **both** `startDate` and `dueDate`. Others live in
  the Unscheduled tray (§6).
- **Drag bar body** → shift both dates, preserving duration. **Drag left/right edge** →
  resize (change start or due). Snap to whole days.
- On drop → optimistic UI update, then `PATCH /api/tasks/[id]` with the new dates; roll
  back on failure (toast on error).
- **Permission:** rescheduling = editing the task's dates → gated by the **existing
  task-edit rules** (creator / assignee / leader / admin). Users without edit rights see
  read-only bars (no drag handles).

## 6. Unscheduled tray

- Collapsible **"Unscheduled (N)"** tray below the grid lists tasks missing a start or due
  date as compact chips.
- **Drag a chip onto the grid** → sets `startDate` to the drop day and `dueDate` to start
  + 1 day (default duration), then the user can resize. Same PATCH + permission rules.
- A task with rights the user can't edit cannot be dragged out of the tray.

## 7. Filter fix (bundled, independent)

When `activeBoardId` is set, the "Filter by user" Select options come from
`activeBoard.members` (mapped to `{id, name}`). When "All Tasks" is active, keep the full
`users` list. Applies to both Board and Timeline views. If the currently-selected user is
not a member of the newly-active board, clear the selection.

## 8. Components & data flow

```
TasksPage (existing)
 ├─ view toggle (board | timeline)  ← new
 ├─ BoardView (existing kanban)
 └─ TimelineView (new)
      props: { tasks, board, zoom, canEditTask(task), onReschedule(taskId, {startDate, dueDate}) }
      ├─ TimelineAxis      (month/week headers + today line)
      ├─ TimelineRowGroup  (per assignee; collapsible)
      │    └─ TimelineBar  (one per task; drag/resize handles when editable)
      └─ UnscheduledTray   (chips; drag source)
```

- **Pure logic** in `src/lib/timeline.ts` (vitest-tested, no React):
  - `buildAxis(rangeStart, rangeEnd, zoom)` → column/header model.
  - `barGeometry(startDate, dueDate, axis)` → `{ leftPx, widthPx }`.
  - `pxToDate(px, axis)` / `snapToDay(date)` → for translating a drag delta back to dates.
  - `groupByAssignee(tasks)` → ordered groups incl. "Unassigned".
  - `splitScheduled(tasks)` → `{ scheduled, unscheduled }`.
- **Thin view** components consume the helper; drag handled via native pointer events +
  a small `useDragReschedule` hook.
- **Reschedule** calls `PATCH /api/tasks/[id]`; extend its Zod schema to accept
  `startDate`/`dueDate` (ISO strings) if not already supported.

## 9. Build phasing (each phase shippable to staging)

1. **Render-only Gantt**: view toggle, axis, assignee groups, static bars from existing
   dates, today line, zoom. No drag, no tray. (+ the filter fix.)
2. **Drag-to-reschedule**: move + resize bars → PATCH, optimistic + rollback, permissions.
3. **Unscheduled tray**: list date-less tasks; drag onto grid to schedule.

## 10. Testing

- Unit (vitest) on `src/lib/timeline.ts`: axis building, bar geometry, px↔date snapping,
  grouping, scheduled/unscheduled split — these carry the correctness-critical math.
- Manual/staging verification for drag interactions and the visual timeline (no
  DB-integration or browser-test harness exists in this repo; consistent with current
  practice).

## 11. Out of scope (YAGNI for v1)

Task-to-task dependencies/arrows, baselines, critical path, export, cross-board timelines,
mobile timeline. Revisit after v1 lands.

## 12. Risks / notes

- Many tasks may lack dates → the Unscheduled tray is essential, not optional.
- Drag math must be correct across zoom levels and DST boundaries; covered by the pure
  helper tests.
- `docs/` is gitignored in this repo but select files are force-added; this spec is
  committed via `git add -f`.
