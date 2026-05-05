'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Search, ChevronLeft, ChevronRight, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, Activity, Download,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, formatDistanceToNow } from 'date-fns'

const ACTION_LABELS: Record<string, string> = {
  ADMIN_LOGIN: 'Admin Login',
  ADMIN_LOGIN_FAILED: 'Login Failed',
  ADMIN_LOGOUT: 'Admin Logout',
  ADMIN_CREATED: 'Admin Created',
  ADMIN_UPDATED: 'Admin Updated',
  ADMIN_DEACTIVATED: 'Admin Deactivated',
  ADMIN_DELETED: 'Admin Deleted',
  USER_UPDATED: 'User Updated',
  USER_DEACTIVATED: 'User Deactivated',
  USER_PASSWORD_RESET: 'Password Reset',
  USER_ROLE_CHANGED: 'Role Changed',
  TEAM_CREATED: 'Team Created',
  TEAM_UPDATED: 'Team Updated',
  TEAM_DELETED: 'Team Deleted',
  ORG_UNIT_CREATED: 'Org Unit Created',
  ORG_UNIT_UPDATED: 'Org Unit Updated',
  ORG_UNIT_DELETED: 'Org Unit Deleted',
  SETTINGS_UPDATED: 'Settings Updated',
  JOB_LEVELS_INITIALIZED: 'Job Levels Initialized',
  INVITATION_CREATED: 'Invitation Created',
  INVITATION_REVOKED: 'Invitation Revoked',
  INVITATION_ACCEPTED: 'Invitation Accepted',
  USER_IMPERSONATED: 'User Impersonated',
  IMPERSONATION_ENDED: 'Impersonation Ended',
  PASSWORD_RESET_LINK_CREATED: 'Reset Link Created',
  PASSWORD_RESET_LINK_CONSUMED: 'Reset Link Used',
}

interface AdminActivityEntry {
  id: string
  adminId: string | null
  adminUsername: string | null
  action: string
  description: string
  targetType: string | null
  targetId: string | null
  ipAddress: string | null
  userAgent: string | null
  status: 'SUCCESS' | 'FAILURE'
  metadata: Record<string, unknown> | null
  createdAt: string
  admin: { id: string; username: string; isActive: boolean } | null
}

interface AuditResponse {
  activities: AdminActivityEntry[]
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean }
  meta: {
    totalCount: number
    todayCount: number
    failureCount24h: number
    actionBreakdown: { action: string; count: number }[]
  }
}

export default function AdminAuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dateRange !== 'all') params.set('dateRange', dateRange)
      if (debouncedSearch) params.set('search', debouncedSearch)

      const res = await fetch(`/api/admin/audit/admin-activities?${params}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, statusFilter, dateRange, debouncedSearch])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { setPage(1) }, [actionFilter, statusFilter, dateRange, debouncedSearch])

  const handleExport = useCallback(() => {
    const params = new URLSearchParams()
    if (actionFilter !== 'all') params.set('action', actionFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (dateRange !== 'all') params.set('dateRange', dateRange)
    if (debouncedSearch) params.set('search', debouncedSearch)
    const qs = params.toString()
    window.location.href = `/api/admin/audit/admin-activities/export${qs ? `?${qs}` : ''}`
  }, [actionFilter, statusFilter, dateRange, debouncedSearch])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-slate-700" />
            Admin Audit Log
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Every privileged action taken in the admin portal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || !data || data.activities.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> TOTAL ENTRIES
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data?.meta.totalCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> TODAY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data?.meta.todayCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> FAILURES (24H)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${(data?.meta.failureCount24h ?? 0) > 0 ? 'text-red-600' : ''}`}>
              {data?.meta.failureCount24h ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search description, admin, or IP…"
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {Object.entries(ACTION_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILURE">Failure</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="All time" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !data || data.activities.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No audit entries match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-3 font-medium">Time</th>
                    <th className="text-left p-3 font-medium">Admin</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-left p-3 font-medium">IP</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activities.map(entry => (
                    <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3 align-top whitespace-nowrap">
                        <div className="text-slate-900">{format(new Date(entry.createdAt), 'MMM d, HH:mm')}</div>
                        <div className="text-xs text-slate-500">{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</div>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap text-slate-700">
                        {entry.adminUsername ?? <span className="text-slate-400 italic">unknown</span>}
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <Badge variant="outline" className="font-normal">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </Badge>
                      </td>
                      <td className="p-3 align-top text-slate-700 max-w-md">{entry.description}</td>
                      <td className="p-3 align-top whitespace-nowrap text-slate-500 text-xs font-mono">
                        {entry.ipAddress ?? '—'}
                      </td>
                      <td className="p-3 align-top">
                        {entry.status === 'SUCCESS' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-normal">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Success
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 font-normal">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Failure
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100">
              <div className="text-sm text-slate-500">
                Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} total
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.pagination.hasMore || loading}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
