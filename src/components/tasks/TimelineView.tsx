// src/components/tasks/TimelineView.tsx
'use client'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { format, startOfDay, startOfWeek, startOfMonth, differenceInCalendarDays } from 'date-fns'
import { ChevronDown, ChevronRight, Users, ArrowUp, ArrowDown } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import {
  splitScheduled, groupTimeline, sortTimelineTasks, buildAxis, barGeometry, axisRangeFor,
  pxDeltaToDays, shiftDates, resizeStart, resizeEnd, scheduleAtPx, ZOOM,
  type TimelineTask, type TimelineZoom, type GroupDimension, type SortKey, type SortDir,
} from '@/lib/timeline'

type DragMode = 'move' | 'resize-start' | 'resize-end'

const STATUS_BAR: Record<string, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-amber-500',
  COMPLETED: 'bg-emerald-500',
}
const ROW_H = 44
const LEFT_W = 320
// Placeholder rows so the grid still shows rows + columns when nothing is scheduled.
const EMPTY_ROWS = 4

export default function TimelineView({
  tasks, zoom, onZoomChange, onTaskClick, canEdit, onReschedule,
}: {
  tasks: TimelineTask[]
  zoom: TimelineZoom
  onZoomChange: (z: TimelineZoom) => void
  onTaskClick?: (taskId: string) => void
  canEdit?: (taskId: string) => boolean
  onReschedule?: (taskId: string, dates: { startDate: string; dueDate: string }) => void
}) {
  const today = startOfDay(new Date())
  const { scheduled, unscheduled } = useMemo(() => splitScheduled(tasks), [tasks])
  const range = useMemo(
    () => axisRangeFor(scheduled, today, { pastDays: ZOOM[zoom].pastDays, futureDays: ZOOM[zoom].futureDays }),
    [scheduled, today.getTime(), zoom]
  )
  const axis = useMemo(() => buildAxis(range.start, range.end, zoom), [range, zoom])
  // Arrange: group-by dimension + sort key/direction (persisted across visits).
  const [groupDim, setGroupDim] = useState<GroupDimension>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem('timeline-group') as GroupDimension) : null) || 'assignee'
  )
  const [sortKey, setSortKey] = useState<SortKey>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem('timeline-sort') as SortKey) : null) || 'dueDate'
  )
  const [sortDir, setSortDir] = useState<SortDir>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem('timeline-sortdir') as SortDir) : null) || 'asc'
  )
  useEffect(() => { localStorage.setItem('timeline-group', groupDim) }, [groupDim])
  useEffect(() => { localStorage.setItem('timeline-sort', sortKey) }, [sortKey])
  useEffect(() => { localStorage.setItem('timeline-sortdir', sortDir) }, [sortDir])

  const groups = useMemo(
    () => groupTimeline(sortTimelineTasks(scheduled, sortKey, sortDir), groupDim),
    [scheduled, groupDim, sortKey, sortDir]
  )

  // Per-user collapse (minimize a user's task rows) and a user visibility filter.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())
  const [showUserFilter, setShowUserFilter] = useState(false)
  const visibleGroups = useMemo(() => groups.filter(g => !hiddenKeys.has(g.key)), [groups, hiddenKeys])
  const toggleCollapse = (key: string) =>
    setCollapsed(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  const toggleUser = (key: string) =>
    setHiddenKeys(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  const allCollapsed = visibleGroups.length > 0 && visibleGroups.every(g => collapsed.has(g.key))
  const toggleAllCollapsed = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(visibleGroups.map(g => g.key)))

  const todayLeft = differenceInCalendarDays(today, axis.start) * axis.dayWidthPx
  // Day zoom shows individual day columns; every other zoom uses period segments
  // (week ranges / months / quarters / years) for the header and gridlines.
  const isDay = zoom === 'day'

  // Drag-to-reschedule: mode is chosen by where in the bar you grab (edges = resize).
  const [drag, setDrag] = useState<{ taskId: string; mode: DragMode; startX: number; deltaPx: number } | null>(null)

  function startDrag(e: ReactPointerEvent<HTMLDivElement>, task: TimelineTask) {
    if (!canEdit?.(task.id)) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const mode: DragMode = x < 8 ? 'resize-start' : x > rect.width - 8 ? 'resize-end' : 'move'
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ taskId: task.id, mode, startX: e.clientX, deltaPx: 0 })
  }
  function moveDrag(e: ReactPointerEvent) {
    setDrag(d => (d ? { ...d, deltaPx: e.clientX - d.startX } : d))
  }
  function endDrag(task: TimelineTask) {
    const d = drag
    setDrag(null)
    if (!d || d.taskId !== task.id) return
    if (Math.abs(d.deltaPx) < 3) { onTaskClick?.(task.id); return } // a click, not a drag
    const days = pxDeltaToDays(d.deltaPx, axis)
    if (days === 0) return
    const fn = d.mode === 'move' ? shiftDates : d.mode === 'resize-start' ? resizeStart : resizeEnd
    onReschedule?.(task.id, fn(task.startDate!, task.dueDate!, days))
  }

  // Unscheduled tray → drag a date-less chip onto the grid to schedule it.
  const gridRef = useRef<HTMLDivElement>(null)
  // Horizontal scroll container, so "Jump to" can scroll the grid to a date.
  const scrollRef = useRef<HTMLDivElement>(null)
  function jumpTo(target: 'today' | 'week' | 'month') {
    const date = target === 'today' ? today : target === 'week' ? startOfWeek(today, { weekStartsOn: 1 }) : startOfMonth(today)
    const left = Math.max(0, differenceInCalendarDays(date, axis.start) * axis.dayWidthPx - 16)
    scrollRef.current?.scrollTo({ left, behavior: 'smooth' })
  }
  const [trayDrag, setTrayDrag] = useState<{ taskId: string; x: number; y: number } | null>(null)
  // The sticky label column is full-width on desktop but must shrink on a
  // phone so the Gantt bars aren't squeezed off-screen.
  const [leftW, setLeftW] = useState(LEFT_W)
  useEffect(() => {
    const update = () => setLeftW(window.innerWidth < 640 ? 150 : LEFT_W)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  function trayDown(e: ReactPointerEvent<HTMLDivElement>, taskId: string) {
    if (!canEdit?.(taskId)) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setTrayDrag({ taskId, x: e.clientX, y: e.clientY })
  }
  function trayMove(e: ReactPointerEvent) {
    setTrayDrag(d => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
  }
  function trayUp(e: ReactPointerEvent, taskId: string) {
    const d = trayDrag
    setTrayDrag(null)
    if (!d || d.taskId !== taskId) return
    const grid = gridRef.current
    if (!grid) return
    const rect = grid.getBoundingClientRect()
    const over = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom
    if (!over) return // dropped off the grid → cancel
    onReschedule?.(taskId, scheduleAtPx(e.clientX - rect.left, axis))
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-slate-50">
        <span className="hidden sm:inline shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['day', 'week', 'month', 'quarter', 'year'] as TimelineZoom[]).map(z => (
              <button key={z} onClick={() => onZoomChange(z)}
                className={`shrink-0 px-2.5 h-7 rounded-md text-xs font-semibold border capitalize ${
                  zoom === z ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                {z}
              </button>
            ))}
          </div>

          {/* Arrange: group by */}
          <select value={groupDim} onChange={e => setGroupDim(e.target.value as GroupDimension)}
            title="Group rows by"
            className="shrink-0 h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:border-blue-300">
            <option value="assignee">Group: Assignee</option>
            <option value="status">Group: Status</option>
            <option value="priority">Group: Priority</option>
            <option value="team">Group: Team</option>
            <option value="none">Group: None</option>
          </select>

          {/* Arrange: sort by + direction */}
          <div className="flex items-center gap-1 shrink-0">
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              title="Sort tasks by"
              className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:border-blue-300">
              <option value="dueDate">Sort: Due date</option>
              <option value="startDate">Sort: Start date</option>
              <option value="priority">Sort: Priority</option>
              <option value="title">Sort: Title</option>
            </select>
            <button onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              className="grid place-items-center h-7 w-7 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-blue-300">
              {sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Jump to a date range */}
          <div className="flex items-center gap-1 shrink-0">
            {([['today', 'Today'], ['week', 'This week'], ['month', 'This month']] as const).map(([k, label]) => (
              <button key={k} onClick={() => jumpTo(k)} title={`Jump to ${label}`}
                className="shrink-0 px-2.5 h-7 rounded-md text-xs font-semibold border bg-white text-slate-600 border-slate-200 hover:border-blue-300">
                {label}
              </button>
            ))}
          </div>

          {groups.length > 0 && (
            <>
              <button onClick={toggleAllCollapsed} title="Collapse or expand every user"
                className="shrink-0 px-2.5 h-7 rounded-md text-xs font-semibold border bg-white text-slate-600 border-slate-200 hover:border-blue-300">
                {allCollapsed ? 'Expand all' : 'Collapse all'}
              </button>
              <div className="relative shrink-0">
                <button onClick={() => setShowUserFilter(v => !v)} title="Filter which users are shown"
                  className="flex items-center gap-1 px-2.5 h-7 rounded-md text-xs font-semibold border bg-white text-slate-600 border-slate-200 hover:border-blue-300">
                  <Users className="h-3.5 w-3.5" />
                  {groups.length - hiddenKeys.size}/{groups.length}
                </button>
                {showUserFilter && (
                  <div className="absolute right-0 mt-1 z-30 w-56 max-h-72 overflow-y-auto rounded-md border bg-white shadow-lg p-1">
                    <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Show users</div>
                    {groups.map(g => (
                      <label key={g.key} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-slate-50 rounded cursor-pointer">
                        <input type="checkbox" checked={!hiddenKeys.has(g.key)} onChange={() => toggleUser(g.key)} className="h-3.5 w-3.5 accent-blue-600" />
                        <span className="truncate flex-1 text-slate-700">{g.label}</span>
                        <span className="text-slate-400">{g.tasks.length}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex overflow-auto max-h-[70vh]">
        {/* Left table */}
        <div className="shrink-0 sticky left-0 z-10 bg-white border-r" style={{ width: leftW }}>
          <div style={{ height: ROW_H }} className="sticky top-0 z-20 border-b bg-slate-50" />
          {visibleGroups.map(g => (
            <div key={g.key}>
              <div style={{ height: ROW_H }} className="flex items-center gap-1.5 px-3 bg-slate-50/70 border-b text-xs font-semibold text-slate-600">
                <button onClick={() => toggleCollapse(g.key)} title={collapsed.has(g.key) ? 'Expand tasks' : 'Collapse tasks'}
                  className="p-0.5 -ml-1 rounded hover:bg-slate-200 shrink-0 text-slate-500">
                  {collapsed.has(g.key) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {g.assignee
                  ? <UserAvatar userId={g.assignee.id} image={g.assignee.image} name={g.assignee.name} email={g.assignee.email} className="h-5 w-5" fallbackClassName="text-[10px]" />
                  : g.color
                    ? <span className="h-3 w-3 rounded-full inline-block shrink-0" style={{ backgroundColor: g.color }} />
                    : <span className="h-5 w-5 rounded-full bg-slate-200 inline-block" />}
                <span className="truncate">{g.label}</span> <span className="text-slate-400 shrink-0">({g.tasks.length})</span>
              </div>
              {!collapsed.has(g.key) && g.tasks.map(t => (
                <button key={t.id} onClick={() => onTaskClick?.(t.id)} style={{ height: ROW_H }}
                  className="w-full flex items-center px-3 pl-10 border-b text-xs text-gray-700 hover:bg-slate-50 text-left truncate">
                  {t.title}
                </button>
              ))}
            </div>
          ))}
          {visibleGroups.length === 0 && Array.from({ length: EMPTY_ROWS }).map((_, i) => (
            <div key={`empty-${i}`} style={{ height: ROW_H }} className="flex items-center px-3 border-b text-xs text-slate-400">
              {i === 0 ? 'No scheduled tasks' : ''}
            </div>
          ))}
        </div>

        {/* Right grid */}
        <div ref={gridRef} className="relative shrink-0" style={{ width: axis.totalWidthPx }}>
          {/* Header: day zoom = month strip + day numbers; else = period segments */}
          <div className="sticky top-0 z-[5] bg-slate-50 border-b" style={{ height: ROW_H }}>
            {isDay ? (
              <>
                {axis.months.map(m => (
                  <div key={m.label} className="absolute top-0 h-[17px] flex items-center px-2 text-[11px] font-semibold text-slate-600 border-l border-slate-200"
                    style={{ left: m.leftPx, width: m.widthPx }}>
                    {m.label}
                  </div>
                ))}
                {axis.days.map((d, i) => (
                  <div key={i}
                    className={`absolute bottom-0 h-[18px] flex items-center justify-center text-[10px] border-l border-slate-100 ${d.isWeekend ? 'bg-slate-100 text-slate-400' : 'text-slate-500'}`}
                    style={{ left: d.leftPx, width: axis.dayWidthPx }}>
                    {d.dayNum}
                  </div>
                ))}
              </>
            ) : (
              axis.segments.map((seg, i) => (
                <div key={i} className="absolute top-0 h-full flex items-center justify-center px-2 text-[11px] font-semibold text-slate-600 border-l border-slate-200 truncate"
                  style={{ left: seg.leftPx, width: seg.widthPx }}>
                  {seg.label}
                </div>
              ))
            )}
          </div>
          {/* Gridlines behind bars: per-day (with weekend shading) on day zoom, else per-segment */}
          <div className="absolute inset-0 pointer-events-none" style={{ top: ROW_H, zIndex: 0 }}>
            {isDay
              ? axis.days.map((d, i) => (
                  <div key={i} className={`absolute top-0 bottom-0 border-l border-slate-100 ${d.isWeekend ? 'bg-slate-50/70' : ''}`}
                    style={{ left: d.leftPx, width: axis.dayWidthPx }} />
                ))
              : axis.segments.map((seg, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-l border-slate-200"
                    style={{ left: seg.leftPx, width: seg.widthPx }} />
                ))}
          </div>
          {/* Today line */}
          {todayLeft >= 0 && todayLeft <= axis.totalWidthPx && (
            <div className="absolute top-0 bottom-0 w-px bg-red-400 z-[3]" style={{ left: todayLeft }} />
          )}
          {/* Bars */}
          <div className="relative" style={{ zIndex: 1 }}>
          {visibleGroups.map(g => (
            <div key={g.key}>
              <div style={{ height: ROW_H }} className="border-b bg-slate-50/40" />
              {!collapsed.has(g.key) && g.tasks.map(t => {
                const { leftPx, widthPx } = barGeometry(t.startDate!, t.dueDate!, axis)
                const MIN_BAR = 22
                const editable = canEdit?.(t.id) ?? false
                const dragging = drag?.taskId === t.id
                let curLeft = leftPx
                let curWidth = Math.max(widthPx, MIN_BAR)
                if (dragging && drag) {
                  if (drag.mode === 'move') curLeft = leftPx + drag.deltaPx
                  else if (drag.mode === 'resize-start') { curLeft = leftPx + drag.deltaPx; curWidth = Math.max(MIN_BAR, curWidth - drag.deltaPx) }
                  else curWidth = Math.max(MIN_BAR, curWidth + drag.deltaPx)
                }
                const title = `${t.title} · ${format(new Date(t.startDate!), 'MMM d')}–${format(new Date(t.dueDate!), 'MMM d')}`
                const barColor = STATUS_BAR[t.status] ?? 'bg-gray-400'
                const labelLeft = Math.max(0, curLeft) + curWidth + 6
                return (
                  <div key={t.id} style={{ height: ROW_H }} className="relative border-b">
                    {editable ? (
                      <div
                        role="button"
                        title={title}
                        onPointerDown={(e) => startDrag(e, t)}
                        onPointerMove={moveDrag}
                        onPointerUp={() => endDrag(t)}
                        className={`absolute top-2 h-7 rounded-md shadow-sm ${barColor} hover:brightness-95 select-none ${dragging ? 'cursor-grabbing ring-2 ring-blue-400 z-10' : 'cursor-grab'}`}
                        style={{ left: curLeft, width: curWidth, touchAction: 'none' }}
                      >
                        <span className="absolute inset-y-0 left-0 w-2 cursor-ew-resize" />
                        <span className="absolute inset-y-0 right-0 w-2 cursor-ew-resize" />
                      </div>
                    ) : (
                      <button onClick={() => onTaskClick?.(t.id)} title={title}
                        className={`absolute top-2 h-7 rounded-md shadow-sm ${barColor} hover:brightness-95`}
                        style={{ left: curLeft, width: curWidth }} />
                    )}
                    {/* trailing title label so each bar is identifiable */}
                    <span className="absolute top-1/2 -translate-y-1/2 text-xs text-slate-600 whitespace-nowrap truncate pointer-events-none max-w-[260px]"
                      style={{ left: labelLeft }}>
                      {t.title}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
          {visibleGroups.length === 0 && Array.from({ length: EMPTY_ROWS }).map((_, i) => (
            <div key={`empty-${i}`} style={{ height: ROW_H }} className="border-b" />
          ))}
          </div>
        </div>
      </div>

      {unscheduled.length > 0 && (
        <div className="px-3 py-2 border-t">
          <div className="text-xs font-semibold text-slate-500 mb-1.5">
            Unscheduled ({unscheduled.length}){' '}
            <span className="font-normal text-slate-400">— drag onto the timeline to schedule</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unscheduled.map(t => {
              const editable = canEdit?.(t.id) ?? false
              return editable ? (
                <div key={t.id} role="button" title={t.title}
                  onPointerDown={(e) => trayDown(e, t.id)}
                  onPointerMove={trayMove}
                  onPointerUp={(e) => trayUp(e, t.id)}
                  className={`px-2 h-7 rounded-md border text-xs flex items-center max-w-[200px] truncate select-none cursor-grab hover:border-blue-300 ${
                    trayDrag?.taskId === t.id ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`}
                  style={{ touchAction: 'none' }}>
                  {t.title}
                </div>
              ) : (
                <button key={t.id} onClick={() => onTaskClick?.(t.id)} title={t.title}
                  className="px-2 h-7 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center max-w-[200px] truncate">
                  {t.title}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Floating ghost while dragging a tray chip */}
      {trayDrag && (
        <div className="fixed z-50 pointer-events-none px-2 h-6 rounded bg-blue-600 text-white text-xs flex items-center shadow-lg max-w-[200px] truncate"
          style={{ left: trayDrag.x + 10, top: trayDrag.y + 10 }}>
          {tasks.find(t => t.id === trayDrag.taskId)?.title ?? 'Task'}
        </div>
      )}
    </div>
  )
}
