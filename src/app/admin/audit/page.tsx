'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ScrollText, Search, Filter, ChevronLeft, ChevronRight,
  CheckSquare, Edit3, CheckCircle2, UserCheck, MessageSquare,
  Users, UserMinus, Calendar, CalendarCheck, LogIn,
  RefreshCw, Clock, Activity, User, Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDistanceToNow, format } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────────────

type ActivityType =
  | 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | 'TASK_ASSIGNED'
  | 'COMMENT_ADDED' | 'TEAM_JOINED' | 'TEAM_LEFT'
  | 'EVENT_CREATED' | 'EVENT_UPDATED' | 'LOGIN'

interface ActivityEntry {
  id: string
  type: ActivityType
  description: string
  userId: string
  entityId?: string
  entityType?: string
  metadata?: any
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface AuditResponse {
  activities: ActivityEntry[]
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean }
  meta: {
    totalCount: number
    todayCount: number
    topUser: { id: string; name: string; email: string } | null
    typeBreakdown: { type: string; count: number }[]
  }
}

// ── Config ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ActivityType, { label: string; icon: any; bg: string; iconColor: string; badge: string }> = {
  TASK_CREATED:   { label: 'Task Created',    icon: CheckSquare,    bg: 'bg-blue-50',    iconColor: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  TASK_UPDATED:   { label: 'Task Updated',    icon: Edit3,          bg: 'bg-indigo-50',  iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  TASK_COMPLETED: { label: 'Task Completed',  icon: CheckCircle2,   bg: 'bg-emerald-50', iconColor: 'text-emerald-600',badge: 'bg-emerald-100 text-emerald-700' },
  TASK_ASSIGNED:  { label: 'Task Assigned',   icon: UserCheck,      bg: 'bg-purple-50',  iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  COMMENT_ADDED:  { label: 'Comment Added',   icon: MessageSquare,  bg: 'bg-amber-50',   iconColor: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  TEAM_JOINED:    { label: 'Team Joined',     icon: Users,          bg: 'bg-teal-50',    iconColor: 'text-teal-600',   badge: 'bg-teal-100 text-teal-700' },
  TEAM_LEFT:      { label: 'Team Left',       icon: UserMinus,      bg: 'bg-red-50',     iconColor: 'text-red-600',    badge: 'bg-red-100 text-red-700' },
  EVENT_CREATED:  { label: 'Event Created',   icon: Calendar,       bg: 'bg-orange-50',  iconColor: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  EVENT_UPDATED:  { label: 'Event Updated',   icon: CalendarCheck,  bg: 'bg-yellow-50',  iconColor: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
  LOGIN:          { label: 'Login',           icon: LogIn,          bg: 'bg-slate-50',   iconColor: 'text-slate-600',  badge: 'bg-slate-100 text-slate-700' },
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN:  'bg-red-100 text-red-700',
  LEADER: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-emerald-100 text-emerald-700',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function groupByDate(entries: ActivityEntry[]) {
  const groups: Record<string, ActivityEntry[]> = {}
  entries.forEach(e => {
    const key = format(new Date(e.createdAt), 'yyyy-MM-dd')
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  return Object.entries(groups).map(([date, items]) => ({ date, items }))
}

function friendlyDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return 'Today'
  if (format(d, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return 'Yesterday'
  return format(d, 'MMMM d, yyyy')
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AuditTrailPage() {
  const [data, setData]       = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)

  // Filters
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateRange, setDateRange]   = useState('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (dateRange  !== 'all') params.set('dateRange', dateRange)
      if (debouncedSearch)      params.set('search', debouncedSearch)

      const res = await fetch(`/api/admin/audit?${params}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, dateRange, debouncedSearch])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1) }, [typeFilter, dateRange, debouncedSearch])

  const groups = data ? groupByDate(data.activities) : []

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-slate-700" />
            Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete log of every action taken in the system
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Stats ── */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Events',
              value: data.meta.totalCount.toLocaleString(),
              icon: Activity,
              bg: 'bg-blue-50', color: 'text-blue-600',
              sub: 'All time',
            },
            {
              label: "Today's Activity",
              value: data.meta.todayCount.toLocaleString(),
              icon: Zap,
              bg: 'bg-amber-50', color: 'text-amber-600',
              sub: format(new Date(), 'MMM d, yyyy'),
            },
            {
              label: 'Filtered Results',
              value: data.pagination.total.toLocaleString(),
              icon: Filter,
              bg: 'bg-purple-50', color: 'text-purple-600',
              sub: 'Matching current filter',
            },
            {
              label: 'Most Active User',
              value: data.meta.topUser?.name?.split(' ')[0] ?? '—',
              icon: User,
              bg: 'bg-emerald-50', color: 'text-emerald-600',
              sub: data.meta.topUser?.email ?? 'No activity yet',
            },
          ].map(card => (
            <Card key={card.label} className="border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
                  <p className="text-xl font-bold text-slate-900 truncate">{card.value}</p>
                  <p className="text-xs text-slate-400 truncate">{card.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <Card className="border border-slate-200 rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search activity descriptions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <cfg.icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-40 bg-white">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filter chips */}
          {(typeFilter !== 'all' || dateRange !== 'all' || search) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">Active filters:</span>
              {typeFilter !== 'all' && (
                <button
                  onClick={() => setTypeFilter('all')}
                  className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-2 py-0.5 hover:bg-blue-100 transition-colors"
                >
                  {TYPE_CONFIG[typeFilter as ActivityType]?.label}
                  <span className="ml-1 opacity-60">×</span>
                </button>
              )}
              {dateRange !== 'all' && (
                <button
                  onClick={() => setDateRange('all')}
                  className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-md px-2 py-0.5 hover:bg-purple-100 transition-colors"
                >
                  {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'Last 7 Days' : 'This Month'}
                  <span className="ml-1 opacity-60">×</span>
                </button>
              )}
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="flex items-center gap-1 text-xs bg-slate-50 text-slate-700 border border-slate-200 rounded-md px-2 py-0.5 hover:bg-slate-100 transition-colors"
                >
                  "{search}"
                  <span className="ml-1 opacity-60">×</span>
                </button>
              )}
              <button
                onClick={() => { setTypeFilter('all'); setDateRange('all'); setSearch('') }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Activity Feed ── */}
      <Card className="border border-slate-200 rounded-xl shadow-sm">
        <CardHeader className="pb-0 pt-5 px-6 border-b border-slate-100">
          <div className="flex items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <ScrollText className="h-4 w-4 text-slate-600" />
              </div>
              Activity Log
            </CardTitle>
            {data && (
              <span className="text-sm text-slate-500">
                {data.pagination.total === 0
                  ? 'No results'
                  : `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, data.pagination.total)} of ${data.pagination.total}`}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-20">
              <ScrollText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No activity found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {groups.map(({ date, items }) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="px-6 py-2 bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {friendlyDate(date)} · {items.length} event{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Activity rows */}
                  {items.map((entry, idx) => {
                    const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.TASK_UPDATED
                    const Icon = cfg.icon
                    const isLast = idx === items.length - 1

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-start gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors ${!isLast ? 'border-b border-slate-50' : ''}`}
                      >
                        {/* Type icon */}
                        <div className={`flex-shrink-0 p-2 rounded-lg ${cfg.bg} mt-0.5`}>
                          <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                        </div>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Description */}
                              <p className="text-sm text-slate-800 leading-snug">{entry.description}</p>

                              {/* User + entity info */}
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <Avatar className="h-5 w-5 rounded-md">
                                    <AvatarFallback className="rounded-md bg-slate-200 text-slate-600 text-[9px] font-bold">
                                      {initials(entry.user.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium text-slate-600">{entry.user.name}</span>
                                  <Badge className={`text-[10px] px-1.5 py-0 rounded-md font-medium ${ROLE_BADGE[entry.user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                                    {entry.user.role}
                                  </Badge>
                                </div>

                                {entry.entityType && (
                                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                    {entry.entityType}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right side: type badge + timestamp */}
                            <div className="flex-shrink-0 text-right">
                              <Badge className={`text-[10px] px-2 py-0.5 rounded-md font-medium mb-1 ${cfg.badge}`}>
                                {cfg.label}
                              </Badge>
                              <div className="flex items-center gap-1 justify-end text-xs text-slate-400">
                                <Clock className="h-3 w-3" />
                                <span title={format(new Date(entry.createdAt), 'PPpp')}>
                                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-300 mt-0.5">
                                {format(new Date(entry.createdAt), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, data.pagination.totalPages - 4))
                  const pageNum = start + i
                  if (pageNum > data.pagination.totalPages) return null
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages || loading}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
