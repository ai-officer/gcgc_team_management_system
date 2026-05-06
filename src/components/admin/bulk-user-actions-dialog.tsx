'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, AlertCircle, CheckCircle2, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const ROLES = ['MEMBER', 'LEADER'] as const
const HIERARCHY = ['RF1', 'RF2', 'RF3', 'OF1', 'OF2', 'M1', 'M2'] as const

type Role = typeof ROLES[number]
type Hierarchy = typeof HIERARCHY[number]
type BulkType = 'activate' | 'deactivate' | 'changeRole' | 'changeHierarchy'

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string
  hierarchyLevel: string | null
  isActive: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}

export function BulkUserActionsDialog({ open, onOpenChange, onCompleted }: Props) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionType, setActionType] = useState<BulkType>('deactivate')
  const [role, setRole] = useState<Role>('MEMBER')
  const [hierarchy, setHierarchy] = useState<Hierarchy>('RF1')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<{ updated: number; skipped: { id: string; reason: string }[] } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' })
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const json = await res.json()
        setUsers(
          (json.users as UserRow[]).map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            hierarchyLevel: u.hierarchyLevel,
            isActive: u.isActive,
          }))
        )
      }
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    if (open) fetchUsers()
  }, [open, fetchUsers])

  // Reset state every time the dialog re-opens.
  useEffect(() => {
    if (open) {
      setSelected(new Set())
      setSearch('')
      setActionType('deactivate')
      setRole('MEMBER')
      setHierarchy('RF1')
      setResult(null)
      setSubmitError(null)
    }
  }, [open])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allOnPageSelected = users.length > 0 && users.every(u => selected.has(u.id))
  const togglePageSelection = () => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        users.forEach(u => next.delete(u.id))
      } else {
        users.forEach(u => next.add(u.id))
      }
      return next
    })
  }

  const summary = useMemo(() => {
    if (actionType === 'activate') return `Activate ${selected.size} user${selected.size === 1 ? '' : 's'}`
    if (actionType === 'deactivate') return `Deactivate ${selected.size} user${selected.size === 1 ? '' : 's'}`
    if (actionType === 'changeRole') return `Set ${selected.size} user${selected.size === 1 ? '' : 's'} role to ${role}`
    return `Set ${selected.size} user${selected.size === 1 ? '' : 's'} hierarchy to ${hierarchy}`
  }, [actionType, role, hierarchy, selected.size])

  const handleSubmit = async () => {
    if (selected.size === 0) return
    if (!confirm(`${summary}. Continue?`)) return

    setSubmitting(true)
    setSubmitError(null)
    setResult(null)
    try {
      const body: Record<string, unknown> = {
        type: actionType,
        userIds: Array.from(selected),
      }
      if (actionType === 'changeRole') body.payload = { role }
      if (actionType === 'changeHierarchy') body.payload = { hierarchyLevel: hierarchy }

      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setSubmitError(json.error ?? 'Bulk action failed')
      } else {
        setResult({ updated: json.updated, skipped: json.skipped })
        // Refresh list so isActive/role/hierarchy reflect the change.
        await fetchUsers()
        // Don't auto-clear selection — the user might want to see what was skipped.
        onCompleted?.()
      }
    } catch {
      setSubmitError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk user actions
          </DialogTitle>
          <DialogDescription>
            Select up to 200 users and apply an action. Each change is audit-logged with a shared bulk operation ID.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={actionType} onValueChange={v => setActionType(v as BulkType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activate">Activate</SelectItem>
                <SelectItem value="deactivate">Deactivate</SelectItem>
                <SelectItem value="changeRole">Change role</SelectItem>
                <SelectItem value="changeHierarchy">Change hierarchy level</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {actionType === 'changeRole' && (
            <div className="space-y-2">
              <Label>New role</Label>
              <Select value={role} onValueChange={v => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {actionType === 'changeHierarchy' && (
            <div className="space-y-2">
              <Label>New hierarchy level</Label>
              <Select value={hierarchy} onValueChange={v => setHierarchy(v as Hierarchy)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HIERARCHY.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search users by name, email, username…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="border border-slate-200 rounded-md flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allOnPageSelected}
                onCheckedChange={togglePageSelection}
              />
              <span className="text-slate-600">Select all loaded</span>
            </div>
            <span className="text-slate-500">
              {selected.size} selected · {users.length} loaded
            </span>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[320px]">
            {loading ? (
              <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No users found.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {users.map(u => (
                  <li key={u.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                    <Checkbox
                      checked={selected.has(u.id)}
                      onCheckedChange={() => toggle(u.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-900 truncate">
                        {u.name || u.email}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{u.email}</div>
                    </div>
                    <Badge variant="outline" className="font-normal">{u.role}</Badge>
                    {u.hierarchyLevel && (
                      <Badge variant="outline" className="font-normal text-xs">{u.hierarchyLevel}</Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`font-normal text-xs ${u.isActive ? 'text-emerald-700' : 'text-slate-500'}`}
                    >
                      {u.isActive ? 'active' : 'inactive'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Updated {result.updated} user{result.updated === 1 ? '' : 's'}.
              {result.skipped.length > 0 && (
                <> Skipped {result.skipped.length}: {result.skipped.slice(0, 3).map(s => s.reason).join(', ')}{result.skipped.length > 3 ? '…' : ''}</>
              )}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Close
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Applying…</>
            ) : (
              summary
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
