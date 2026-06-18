'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'

type Results = {
  tasks: { id: string; title: string; status: string }[]
  comments: { id: string; taskId: string; snippet: string; taskTitle: string }[]
  people: { id: string; name: string; email: string; image?: string }[]
}
const EMPTY: Results = { tasks: [], comments: [], people: [] }

export function GlobalSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [res, setRes] = useState<Results>(EMPTY)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (q.trim().length < 2) { setRes(EMPTY); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        setRes(await r.json())
      } catch { setRes(EMPTY) } finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function go(url: string) { setOpen(false); setQ(''); router.push(url) }
  const hasResults = res.tasks.length || res.comments.length || res.people.length

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search tasks, comments, people…"
        className="w-full pl-9 pr-3 h-9 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:border-blue-400"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-[min(28rem,90vw)] max-h-[70vh] overflow-y-auto rounded-lg border bg-white shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-slate-400">Searching…</div>}
          {!loading && !hasResults && <div className="px-3 py-3 text-xs text-slate-400">No results for "{q.trim()}".</div>}
          {res.tasks.length > 0 && (
            <div className="py-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tasks</p>
              {res.tasks.map(t => (
                <button key={t.id} onClick={() => go(`/user/tasks?taskId=${t.id}`)} className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 truncate">{t.title}</button>
              ))}
            </div>
          )}
          {res.comments.length > 0 && (
            <div className="py-1 border-t">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Comments</p>
              {res.comments.map(c => (
                <button key={c.id} onClick={() => go(`/user/tasks?taskId=${c.taskId}`)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50">
                  <span className="text-sm text-slate-700">"{c.snippet}"</span>
                  <span className="block text-[11px] text-slate-400 truncate">on {c.taskTitle}</span>
                </button>
              ))}
            </div>
          )}
          {res.people.length > 0 && (
            <div className="py-1 border-t">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">People</p>
              {res.people.map(p => (
                <button key={p.id} onClick={() => go(`/user/tasks?user=${p.id}`)} className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50">
                  <UserAvatar userId={p.id} image={p.image} name={p.name} email={p.email} className="h-5 w-5" fallbackClassName="text-[10px]" />
                  <span className="text-sm text-slate-700 truncate">{p.name || p.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
