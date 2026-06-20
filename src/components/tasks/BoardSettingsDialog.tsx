'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'

type Category = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED'

interface BoardStatus {
  id: string
  name: string
  category: Category
  color: string
  position: number
  isDefault: boolean
}

interface Props {
  boardId: string
  boardName: string
  statuses: BoardStatus[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
}

export default function BoardSettingsDialog({ boardId, boardName, statuses, open, onOpenChange, onChanged }: Props) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'>('IN_PROGRESS')
  const [newColor, setNewColor] = useState('#6366F1')

  const ordered = [...statuses].filter((s) => s.category !== 'CANCELLED').sort((a, b) => a.position - b.position)

  const call = async (url: string, method: string, body?: any) => {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e.error || 'Request failed')
    }
    return res.json().catch(() => ({}))
  }

  const add = async () => {
    if (!newName.trim()) return
    try {
      setBusy(true)
      await call(`/api/boards/${boardId}/statuses`, 'POST', { name: newName.trim(), category: newCategory, color: newColor })
      setNewName('')
      onChanged()
      toast({ title: 'Status added' })
    } catch (e: any) {
      toast({ title: 'Could not add status', description: e.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const patch = async (s: BoardStatus, body: any, errTitle: string) => {
    try {
      await call(`/api/boards/${boardId}/statuses/${s.id}`, 'PATCH', body)
      onChanged()
    } catch (e: any) {
      toast({ title: errTitle, description: e.message, variant: 'destructive' })
    }
  }

  const remove = async (s: BoardStatus) => {
    try {
      setBusy(true)
      await call(`/api/boards/${boardId}/statuses/${s.id}`, 'DELETE')
      onChanged()
      toast({ title: 'Status deleted' })
    } catch (e: any) {
      toast({ title: 'Could not delete', description: e.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const move = async (idx: number, dir: -1 | 1) => {
    const cur = ordered[idx]
    const target = ordered[idx + dir]
    if (!cur || !target) return
    try {
      setBusy(true)
      await Promise.all([
        call(`/api/boards/${boardId}/statuses/${cur.id}`, 'PATCH', { position: target.position }),
        call(`/api/boards/${boardId}/statuses/${target.id}`, 'PATCH', { position: cur.position }),
      ])
      onChanged()
    } catch (e: any) {
      toast({ title: 'Could not reorder', description: e.message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Board statuses</DialogTitle>
          <DialogDescription>
            Customize the columns for “{boardName}”. Each status maps to a category that drives progress and completion rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {ordered.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border p-2">
              <div className="flex flex-col">
                <button type="button" disabled={idx === 0 || busy} onClick={() => move(idx, -1)} className="text-muted-foreground disabled:opacity-30 hover:text-foreground">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" disabled={idx === ordered.length - 1 || busy} onClick={() => move(idx, 1)} className="text-muted-foreground disabled:opacity-30 hover:text-foreground">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <input type="color" value={s.color} onChange={(e) => patch(s, { color: e.target.value }, 'Could not update color')} className="h-7 w-7 rounded cursor-pointer border bg-transparent" title="Color" />
              <Input
                defaultValue={s.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v && v !== s.name) patch(s, { name: v }, 'Could not rename')
                }}
                className="h-8 flex-1"
              />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-20 text-right shrink-0">
                {CATEGORY_LABELS[s.category] ?? s.category}
              </span>
              {s.isDefault ? (
                <span className="text-[10px] text-muted-foreground w-14 text-center shrink-0">default</span>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 shrink-0" disabled={busy} onClick={() => remove(s)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-2">
          <Label className="text-xs">Add a status</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-9 w-9 rounded cursor-pointer border bg-transparent" title="Color" />
            <Input placeholder="Status name…" value={newName} maxLength={40} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} className="flex-1" />
            <Select value={newCategory} onValueChange={(v) => setNewCategory(v as any)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={!newName.trim() || busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Category controls behavior: a “Completed” status needs finisher permission; “In Review” sets 90% progress.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
