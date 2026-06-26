'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Users, User, Loader2, ListTodo } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BoardOption {
  id: string
  name: string
  color?: string
  teamId?: string | null
  team?: { name?: string | null } | null
}

interface MoveToBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** One id = single move (uses /move); many = bulk move (uses /bulk). */
  taskIds: string[]
  /** Current board, excluded from the list (only meaningful for a single task). */
  currentBoardId?: string | null
  taskTitle?: string
  onMoved?: () => void
}

export function MoveToBoardDialog({
  open,
  onOpenChange,
  taskIds,
  currentBoardId,
  taskTitle,
  onMoved,
}: MoveToBoardDialogProps) {
  const { toast } = useToast()
  const [boards, setBoards] = useState<BoardOption[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [movingId, setMovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setLoading(true)
    fetch('/api/boards')
      .then((r) => (r.ok ? r.json() : { boards: [] }))
      .then((d) => setBoards(d.boards || []))
      .catch(() => setBoards([]))
      .finally(() => setLoading(false))
  }, [open])

  const { teamBoards, personalBoards, total } = useMemo(() => {
    const q = search.trim().toLowerCase()
    const visible = boards
      .filter((b) => b.id !== currentBoardId)
      .filter((b) => !q || b.name.toLowerCase().includes(q) || (b.team?.name || '').toLowerCase().includes(q))
    return {
      teamBoards: visible.filter((b) => b.teamId),
      personalBoards: visible.filter((b) => !b.teamId),
      total: visible.length,
    }
  }, [boards, search, currentBoardId])

  const move = async (boardId: string) => {
    setMovingId(boardId)
    try {
      const res =
        taskIds.length === 1
          ? await fetch(`/api/tasks/${taskIds[0]}/move`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ boardId }),
            })
          : await fetch('/api/tasks/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'moveToBoard', taskIds, payload: { boardId } }),
            })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Move failed')
      }
      toast({ title: taskIds.length > 1 ? `Moved ${taskIds.length} tasks` : 'Task moved to board' })
      onOpenChange(false)
      onMoved?.()
    } catch (e) {
      toast({
        title: 'Could not move',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setMovingId(null)
    }
  }

  const BoardRow = ({ b }: { b: BoardOption }) => (
    <button
      type="button"
      disabled={!!movingId}
      onClick={() => move(b.id)}
      className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:border-gray-200 hover:bg-gray-50 disabled:opacity-60"
    >
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: b.color || '#3B82F6' }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-800">{b.name}</span>
        {b.team?.name && <span className="block truncate text-xs text-gray-400">{b.team.name}</span>}
      </span>
      {movingId === b.id && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />}
    </button>
  )

  const Section = ({ title, icon, list }: { title: string; icon: React.ReactNode; list: BoardOption[] }) =>
    list.length === 0 ? null : (
      <div className="mb-3">
        <p className="flex items-center gap-1.5 px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {icon} {title}
        </p>
        <div className="space-y-0.5">
          {list.map((b) => (
            <BoardRow key={b.id} b={b} />
          ))}
        </div>
      </div>
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to board</DialogTitle>
          <DialogDescription>
            {taskIds.length > 1
              ? `Move ${taskIds.length} tasks to another board.`
              : taskTitle
                ? `Move “${taskTitle}” to another board.`
                : 'Choose a destination board.'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search boards…"
            className="pl-9"
          />
        </div>

        <div className="-mx-1 max-h-[55vh] overflow-y-auto px-1 py-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-gray-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading boards…
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
              <ListTodo className="mb-2 h-7 w-7" />
              <p className="text-sm">No other boards available</p>
            </div>
          ) : (
            <>
              <Section title="Team boards" icon={<Users className="h-3.5 w-3.5" />} list={teamBoards} />
              <Section title="Personal boards" icon={<User className="h-3.5 w-3.5" />} list={personalBoards} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
