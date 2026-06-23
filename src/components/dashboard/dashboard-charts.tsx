'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts'

// ── Shared bits ──
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-slate-400">{label}</div>
  )
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  TODO: { label: 'To Do', color: '#94A3B8' },
  IN_PROGRESS: { label: 'In Progress', color: '#3B82F6' },
  IN_REVIEW: { label: 'In Review', color: '#F59E0B' },
  COMPLETED: { label: 'Completed', color: '#22C55E' },
}

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  URGENT: { label: 'Urgent', color: '#EF4444' },
  HIGH: { label: 'High', color: '#F97316' },
  MEDIUM: { label: 'Medium', color: '#EAB308' },
  LOW: { label: 'Low', color: '#22C55E' },
}

// ── Status donut: where all my work sits ──
export function StatusDonut({ data }: { data: Array<{ status: string; count: number }> }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <EmptyChart label="No tasks yet" />
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({ name: STATUS_META[d.status]?.label ?? d.status, value: d.count, color: STATUS_META[d.status]?.color ?? '#94A3B8' }))

  return (
    <div>
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none">
              {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip formatter={(v: any, n: any) => [`${v} task${v === 1 ? '' : 's'}`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900 leading-none">{total}</span>
          <span className="text-[11px] text-slate-500 mt-1">total</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: STATUS_META[d.status]?.color }} />
            <span className="text-slate-600 flex-1 truncate">{STATUS_META[d.status]?.label}</span>
            <span className="font-semibold text-slate-900">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Completion trend: tasks I completed per week (last 8 weeks) ──
export function CompletionTrend({ data }: { data: Array<{ label: string; count: number }> }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <EmptyChart label="No completions in the last 8 weeks" />
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={28} />
          <Tooltip formatter={(v: any) => [`${v} completed`, '']} labelFormatter={(l) => `Week of ${l}`} />
          <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fill="url(#trendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Priority bar: open tasks by priority ──
export function PriorityBar({ data }: { data: Array<{ priority: string; count: number }> }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <EmptyChart label="No open tasks" />
  const chartData = data.map((d) => ({ name: PRIORITY_META[d.priority]?.label ?? d.priority, count: d.count, color: PRIORITY_META[d.priority]?.color ?? '#94A3B8' }))
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={28} />
          <Tooltip formatter={(v: any) => [`${v} task${v === 1 ? '' : 's'}`, '']} cursor={{ fill: '#F8FAFC' }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Team workload: active tasks per member (leaders), fed by /api/workload ──
interface WorkloadRow {
  id: string
  name: string | null
  email: string
  tasks: { todo: number; inProgress: number; inReview: number; overdue: number }
}
export function WorkloadBar() {
  const [rows, setRows] = useState<WorkloadRow[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/workload')
      .then((r) => (r.ok ? r.json() : { workload: [] }))
      .then((j) => { if (!cancelled) setRows(j.workload ?? []) })
      .catch(() => { if (!cancelled) setRows([]) })
    return () => { cancelled = true }
  }, [])

  if (rows === null) return <EmptyChart label="Loading…" />
  const chartData = rows
    .map((r) => ({
      name: (r.name || r.email).split(' ')[0],
      active: r.tasks.todo + r.tasks.inProgress + r.tasks.inReview,
      overdue: r.tasks.overdue,
    }))
    .filter((r) => r.active > 0 || r.overdue > 0)
    .sort((a, b) => b.active - a.active)
    .slice(0, 6)

  if (chartData.length === 0) return <EmptyChart label="No active team workload" />

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 12, left: 8, bottom: 0 }} barCategoryGap={10}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={64} />
          <Tooltip formatter={(v: any, n: any) => [v, n === 'active' ? 'Active' : 'Overdue']} cursor={{ fill: '#F8FAFC' }} />
          <Bar dataKey="active" stackId="w" fill="#3B82F6" radius={[0, 0, 0, 0]} maxBarSize={22} />
          <Bar dataKey="overdue" stackId="w" fill="#EF4444" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
