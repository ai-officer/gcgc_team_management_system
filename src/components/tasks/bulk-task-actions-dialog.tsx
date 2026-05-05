'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, AlertCircle, CheckCircle2, Loader2, ListChecks } from 'lucide-react'
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

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

type Status = typeof STATUSES[number]
type Priority = typeof PRIORITIES[number]
type BulkType = 'changeStatus' | 'changePriority' | 'delete'

export interface BulkTask {
  id: string
  title: string
  status: string
  priority: string
  assignee?: { id: string; name?: string | null; email?: string }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: BulkTask[]
  onCompleted?: () => void | Promise<void>
}

export function BulkTaskActionsDialog({ open, onOpenChange, tasks, onCompleted }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionType, setActionType] = useState<BulkType>('changeStatus')
  const [status, setStatus] = useState<Status>('IN_PROGRESS')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<{ updated: number; skipped: { id: string; reason: string }[] } | null>(null)

  // Reset state every time the dialog re-opens.
  useEffect(() => {
    if (open) {
      setSelected(new Set())
      setSearch('')
      setActionType('changeStatus')
      setStatus('IN_PROGRESS')
      setPriority('MEDIUM')
      setResult(null)
      setSubmitError(null)
    }
  }, [open])

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks
    const q = search.trim().toLowerCase()
    return tasks.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        (t.assignee?.name?.toLowerCase().includes(q) ?? false) ||
        (t.assignee?.email?.toLowerCase().includes(q) ?? false)
    )
  }, [tasks, search])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allFilteredSelected = filteredTasks.length > 0 && filteredTasks.every(t => selected.has(t.id))
  const togglePageSelection = () => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filteredTasks.forEach(t => next.delete(t.id))
      } else {
        filteredTasks.forEach(t => next.add(t.id))
      }
      return next
    })
  }

  const summary = useMemo(() => {
    const n = selected.size
    const plural = n === 1 ? '' : 's'
    if (actionType === 'changeStatus') return `Set ${n} task${plural} to ${status}`
    if (actionType === 'changePriority') return `Set ${n} task${plural} priority to ${priority}`
    return `Delete ${n} task${plural}`
  }, [actionType, status, priority, selected.size])

  const handleSubmit = async () => {
    if (selected.size === 0) return
    if (!confirm(`${summary}. Continue?`)) return

    setSubmitting(true)
    setSubmitError(null)
    setResult(null)
    try {
      const body: Record<string, unknown> = {
        type: actionType,
        taskIds: Array.from(selected),
      }
      if (actionType === 'changeStatus') body.payload = { status }
      if (actionType === 'changePriority') body.payload = { priority }

      const res = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setSubmitError(json.error ?? 'Bulk action failed')
      } else {
        setResult({ updated: json.updated, skipped: json.skipped })
        await onCompleted?.()
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
            <ListChecks className="h-5 w-5" />
            Bulk task actions
          </DialogTitle>
          <DialogDescription>
            Select up to 100 tasks and apply an action. Tasks you don&apos;t have permission to modify are skipped automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={actionType} onValueChange={v => setActionType(v as BulkType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="changeStatus">Change status</SelectItem>
                <SelectItem value="changePriority">Change priority</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {actionType === 'changeStatus' && (
            <div className="space-y-2">
              <Label>New status</Label>
              <Select value={status} onValueChange={v => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {actionType === 'changePriority' && (
            <div className="space-y-2">
              <Label>New priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tasks by title or assignee…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="border border-slate-200 rounded-md flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Checkbox checked={allFilteredSelected} onCheckedChange={togglePageSelection} />
              <span className="text-slate-600">Select all visible</span>
            </div>
            <span className="text-slate-500">
              {selected.size} selected · {filteredTasks.length} shown · {tasks.length} total
            </span>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[320px]">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {tasks.length === 0 ? 'No tasks available.' : 'No tasks match your search.'}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredTasks.map(t => (
                  <li key={t.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                    <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-900 truncate">{t.title}</div>
                      {t.assignee && (
                        <div className="text-xs text-slate-500 truncate">
                          {t.assignee.name || t.assignee.email}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="font-normal text-xs">{t.status.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className="font-normal text-xs">{t.priority}</Badge>
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
              Updated {result.updated} task{result.updated === 1 ? '' : 's'}.
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
            variant={actionType === 'delete' ? 'destructive' : 'default'}
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
