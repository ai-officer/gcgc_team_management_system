import { startOfDay, differenceInCalendarDays, eachMonthOfInterval, endOfMonth, format, max, min, addDays, subDays } from 'date-fns'

export type TimelineZoom = 'week' | 'month'

export interface TimelineTask {
  id: string
  title: string
  status: string
  startDate?: string | null
  dueDate?: string | null
  assignee?: { id: string; name: string; email: string; image?: string } | null
}

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

export interface Axis {
  start: Date
  end: Date
  zoom: TimelineZoom
  dayWidthPx: number
  totalWidthPx: number
  months: { label: string; leftPx: number; widthPx: number }[]
  days: { date: Date; leftPx: number; dayNum: number; isWeekend: boolean }[]
}

export function buildAxis(start: Date, end: Date, zoom: TimelineZoom, dayWidthOverride?: number): Axis {
  const s = startOfDay(start)
  const e = startOfDay(end)
  const dayWidthPx = dayWidthOverride ?? (zoom === 'week' ? 40 : 16)
  const totalDays = differenceInCalendarDays(e, s) + 1
  const totalWidthPx = totalDays * dayWidthPx
  const months = eachMonthOfInterval({ start: s, end: e }).map((m) => {
    const mStart = max([m, s])
    const mEnd = min([endOfMonth(m), e])
    const leftPx = differenceInCalendarDays(mStart, s) * dayWidthPx
    const widthPx = (differenceInCalendarDays(mEnd, mStart) + 1) * dayWidthPx
    return { label: format(m, 'MMM yyyy'), leftPx, widthPx }
  })
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = addDays(s, i)
    const dow = date.getDay()
    return { date, leftPx: i * dayWidthPx, dayNum: date.getDate(), isWeekend: dow === 0 || dow === 6 }
  })
  return { start: s, end: e, zoom, dayWidthPx, totalWidthPx, months, days }
}

export function barGeometry(startDate: string, dueDate: string, axis: Axis): { leftPx: number; widthPx: number } {
  const s = startOfDay(new Date(startDate))
  const d = startOfDay(new Date(dueDate))
  const leftPx = differenceInCalendarDays(s, axis.start) * axis.dayWidthPx
  const days = Math.max(1, differenceInCalendarDays(d, s) + 1)
  return { leftPx, widthPx: days * axis.dayWidthPx }
}

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

// --- Phase 2: drag-to-reschedule pixel <-> date math ---

/** Whole-day delta from a horizontal pixel delta (round half away from zero). */
export function pxDeltaToDays(deltaPx: number, axis: Axis): number {
  return Math.sign(deltaPx) * Math.round(Math.abs(deltaPx) / axis.dayWidthPx)
}

/** Shift both dates by deltaDays, preserving duration. Returns full ISO strings. */
export function shiftDates(
  startISO: string,
  dueISO: string,
  deltaDays: number
): { startDate: string; dueDate: string } {
  return {
    startDate: addDays(new Date(startISO), deltaDays).toISOString(),
    dueDate: addDays(new Date(dueISO), deltaDays).toISOString(),
  }
}

/** Move the start date by deltaDays, clamped so it never passes the due date. */
export function resizeStart(
  startISO: string,
  dueISO: string,
  deltaDays: number
): { startDate: string; dueDate: string } {
  const due = new Date(dueISO)
  let start = addDays(new Date(startISO), deltaDays)
  if (start > due) start = due
  return { startDate: start.toISOString(), dueDate: due.toISOString() }
}

/** Move the due date by deltaDays, clamped so it never precedes the start date. */
export function resizeEnd(
  startISO: string,
  dueISO: string,
  deltaDays: number
): { startDate: string; dueDate: string } {
  const start = new Date(startISO)
  let due = addDays(new Date(dueISO), deltaDays)
  if (due < start) due = start
  return { startDate: start.toISOString(), dueDate: due.toISOString() }
}

/** Schedule a previously date-less task dropped at pixel `px` on the grid:
 *  start = the day under the drop (clamped to the first day), due = start + 1 day.
 *  Emits UTC-midnight ISO for the dropped *calendar* day (axis.start is a local
 *  Date, so we take its calendar components to avoid a TZ day-shift on serialize). */
export function scheduleAtPx(px: number, axis: Axis): { startDate: string; dueDate: string } {
  const dayOffset = Math.max(0, Math.round(px / axis.dayWidthPx))
  const d = addDays(axis.start, dayOffset)
  const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const due = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1))
  return { startDate: start.toISOString(), dueDate: due.toISOString() }
}
