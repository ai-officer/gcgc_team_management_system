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
