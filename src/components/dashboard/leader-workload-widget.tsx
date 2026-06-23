'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Loader2, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/shared/UserAvatar'

const OVERLOAD_THRESHOLD = 8 // active tasks

interface WorkloadEntry {
  id: string
  name: string | null
  email: string
  image: string | null
  positionTitle: string | null
  tasks: {
    total: number
    todo: number
    inProgress: number
    inReview: number
    completed: number
    overdue: number
  }
}

export function LeaderWorkloadWidget() {
  const router = useRouter()
  const [rows, setRows] = useState<WorkloadEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/workload')
        if (!res.ok) {
          if (!cancelled) setError('Could not load workload')
          return
        }
        const json = await res.json()
        if (!cancelled) setRows(json.workload ?? [])
      } catch {
        if (!cancelled) setError('Network error loading workload')
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (error) return null
  if (rows === null) {
    return (
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardContent className="py-6 flex items-center justify-center text-sm text-slate-500 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading team workload…
        </CardContent>
      </Card>
    )
  }

  // Compute "active" = todo + inProgress + inReview. Sort: overdue first, then active desc.
  const enriched = rows
    .map(r => ({
      ...r,
      active: r.tasks.todo + r.tasks.inProgress + r.tasks.inReview,
    }))
    .filter(r => r.active > 0 || r.tasks.overdue > 0)

  enriched.sort((a, b) => {
    if (b.tasks.overdue !== a.tasks.overdue) return b.tasks.overdue - a.tasks.overdue
    return b.active - a.active
  })

  const flagged = enriched.filter(r => r.active >= OVERLOAD_THRESHOLD || r.tasks.overdue > 0)
  const top = enriched.slice(0, 5)

  if (enriched.length === 0) {
    return null // Nothing to show — no active tasks anywhere
  }

  return (
    <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
      <CardHeader className="py-3 px-4 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <div className="p-1.5 bg-amber-50 rounded-md">
                <Users className="h-3.5 w-3.5 text-amber-600" />
              </div>
              Team workload
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {flagged.length > 0
                ? `${flagged.length} member${flagged.length === 1 ? '' : 's'} flagged — overdue or ≥ ${OVERLOAD_THRESHOLD} active tasks`
                : 'Everyone is comfortably loaded'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => router.push('/user/member-management')}
          >
            Manage <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-slate-100">
          {top.map(r => {
            const isFlagged = r.active >= OVERLOAD_THRESHOLD || r.tasks.overdue > 0
            return (
              <li
                key={r.id}
                className={`flex items-center gap-2.5 px-4 py-2 ${isFlagged ? 'bg-amber-50/50' : ''}`}
              >
                <UserAvatar
                  userId={r.id}
                  image={r.image}
                  name={r.name}
                  email={r.email}
                  className="h-8 w-8 ring-1 ring-slate-200"
                  fallbackClassName="text-[10px] bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate leading-tight">
                    {r.name || r.email}
                  </div>
                  {r.positionTitle && (
                    <div className="text-[11px] text-slate-500 truncate leading-tight">{r.positionTitle}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <Badge variant="outline" className="font-normal text-[11px] px-1.5 py-0">
                    {r.active} active
                  </Badge>
                  {r.tasks.overdue > 0 && (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 font-normal text-[11px] px-1.5 py-0">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {r.tasks.overdue} overdue
                    </Badge>
                  )}
                  {r.active >= OVERLOAD_THRESHOLD && r.tasks.overdue === 0 && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-normal text-[11px] px-1.5 py-0">
                      Overloaded
                    </Badge>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
