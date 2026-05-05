'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Mail, Plus, Copy, Trash2, RefreshCw, Search, Check, AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format, formatDistanceToNow } from 'date-fns'

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  REVOKED: 'bg-slate-100 text-slate-600',
  EXPIRED: 'bg-red-100 text-red-700',
}

interface InvitationRow {
  id: string
  email: string
  role: 'ADMIN' | 'LEADER' | 'MEMBER'
  isLeader: boolean
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
  createdByAdminUsername: string | null
  positionTitle: string | null
  division: string | null
}

interface ListResponse {
  invitations: InvitationRow[]
  pagination: { page: number; total: number; totalPages: number; hasMore: boolean }
}

export default function InvitationsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    email: '',
    role: 'MEMBER' as 'ADMIN' | 'LEADER' | 'MEMBER',
    isLeader: false,
    positionTitle: '',
    division: '',
    department: '',
    section: '',
    team: '',
    expiresInDays: 7,
  })
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await fetch(`/api/admin/invitations?${params}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, debouncedSearch])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { setPage(1) }, [statusFilter, debouncedSearch])

  const resetCreateForm = () => {
    setCreateForm({
      email: '', role: 'MEMBER', isLeader: false, positionTitle: '',
      division: '', department: '', section: '', team: '', expiresInDays: 7,
    })
    setCreatedLink(null)
    setCreateError(null)
  }

  const handleCreate = async () => {
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email.trim(),
          role: createForm.isLeader ? 'LEADER' : createForm.role,
          isLeader: createForm.isLeader,
          positionTitle: createForm.positionTitle.trim() || undefined,
          division: createForm.division.trim() || undefined,
          department: createForm.department.trim() || undefined,
          section: createForm.section.trim() || undefined,
          team: createForm.team.trim() || undefined,
          expiresInDays: createForm.expiresInDays,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setCreateError(json.error ?? 'Failed to create invitation')
      } else {
        setCreatedLink(json.acceptUrl)
        await fetchData()
      }
    } catch {
      setCreateError('Network error')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback handled by browser; nothing to do.
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this invitation? The link will stop working.')) return
    const res = await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE' })
    if (res.ok) fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-slate-700" />
            Invitations
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Invite people to join. Copy the share link from the dialog and send it via your own channel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={open => {
              setDialogOpen(open)
              if (!open) resetCreateForm()
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New invitation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create invitation</DialogTitle>
                <DialogDescription>
                  Generates a one-time link valid for {createForm.expiresInDays} days.
                </DialogDescription>
              </DialogHeader>

              {createdLink ? (
                <div className="space-y-3">
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      Invitation created. Copy this link and send it to the invitee — it will not be shown again.
                    </AlertDescription>
                  </Alert>
                  <div className="flex items-center gap-2">
                    <Input value={createdLink} readOnly className="font-mono text-xs" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(createdLink, 'new')}
                    >
                      {copiedId === 'new' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setDialogOpen(false); resetCreateForm() }}>Done</Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@globalcomfortgroup.com"
                      value={createForm.email}
                      onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={createForm.role}
                        onValueChange={v => setCreateForm({ ...createForm, role: v as 'MEMBER' | 'LEADER' | 'ADMIN' })}
                        disabled={createForm.isLeader}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="LEADER">Leader</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-leader">Is leader?</Label>
                      <div className="flex items-center gap-2 h-10">
                        <input
                          id="invite-leader"
                          type="checkbox"
                          checked={createForm.isLeader}
                          onChange={e => setCreateForm({
                            ...createForm,
                            isLeader: e.target.checked,
                            role: e.target.checked ? 'LEADER' : createForm.role,
                          })}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-slate-600">Leader privileges</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-position">Position title <span className="text-slate-400 text-xs">(optional)</span></Label>
                    <Input
                      id="invite-position"
                      value={createForm.positionTitle}
                      onChange={e => setCreateForm({ ...createForm, positionTitle: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Division</Label>
                      <Input
                        value={createForm.division}
                        onChange={e => setCreateForm({ ...createForm, division: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input
                        value={createForm.department}
                        onChange={e => setCreateForm({ ...createForm, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Input
                        value={createForm.section}
                        onChange={e => setCreateForm({ ...createForm, section: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Team</Label>
                      <Input
                        value={createForm.team}
                        onChange={e => setCreateForm({ ...createForm, team: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Expires in (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={createForm.expiresInDays}
                      onChange={e => setCreateForm({ ...createForm, expiresInDays: parseInt(e.target.value) || 7 })}
                    />
                  </div>
                  {createError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{createError}</AlertDescription>
                    </Alert>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setDialogOpen(false); resetCreateForm() }}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={creating || !createForm.email.trim()}>
                      {creating ? 'Creating…' : 'Create invitation'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by email…"
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-12 text-center text-slate-500">Loading…</div>
          ) : !data || data.invitations.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No invitations yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-left p-3 font-medium">Expires</th>
                    <th className="text-left p-3 font-medium">By</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invitations.map(inv => (
                    <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-3 align-top">{inv.email}</td>
                      <td className="p-3 align-top">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="font-normal">{inv.role}</Badge>
                          {inv.isLeader && <Badge variant="outline" className="font-normal">Leader</Badge>}
                        </div>
                      </td>
                      <td className="p-3 align-top">
                        <Badge className={`${STATUS_BADGE[inv.status]} hover:${STATUS_BADGE[inv.status]} font-normal`}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-3 align-top text-slate-600">
                        {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}
                      </td>
                      <td className="p-3 align-top text-slate-600 whitespace-nowrap">
                        {inv.status === 'ACCEPTED'
                          ? <span className="text-emerald-600">accepted</span>
                          : format(new Date(inv.expiresAt), 'MMM d, yyyy')}
                      </td>
                      <td className="p-3 align-top text-slate-500 text-xs">
                        {inv.createdByAdminUsername ?? '—'}
                      </td>
                      <td className="p-3 align-top text-right">
                        {inv.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(inv.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
