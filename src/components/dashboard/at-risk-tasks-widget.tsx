'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatDistanceToNow } from 'date-fns'

interface AtRiskTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string
  isOverdue: boolean
  assignee: { id: string; name: string | null; email: string; image: string | null } | null
  team: { id: string; name: string } | null
}

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const statusLabel: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
}

export function AtRiskTasksWidget() {
  const router = useRouter()
  const [tasks, setTasks] = useState<AtRiskTask[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/leader/at-risk')
        if (!res.ok) {
          if (!cancelled) setError('Could not load at-risk tasks')
          return
        }
        const json = await res.json()
        if (!cancelled) setTasks(json.tasks ?? [])
      } catch {
        if (!cancelled) setError('Network error loading at-risk tasks')
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (error) return null
  if (tasks === null) {
    return (
      <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
        <CardContent className="py-6 flex items-center justify-center text-sm text-slate-500 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading at-risk tasks…
        </CardContent>
      </Card>
    )
  }
  if (tasks.length === 0) return null

  const overdue = tasks.filter(t => t.isOverdue)
  const upcoming = tasks.filter(t => !t.isOverdue)

  const sorted = [
    ...overdue.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)),
    ...upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
  ].slice(0, 8)

  return (
    <Card className="border border-slate-200 bg-white shadow-sm rounded-xl">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              At-risk tasks
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              {overdue.length > 0
                ? `${overdue.length} overdue · ${upcoming.length} due within 3 days`
                : `${upcoming.length} task${upcoming.length === 1 ? '' : 's'} due within 3 days`}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/user/tasks')}
          >
            View all <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-slate-100">
          {sorted.map(task => (
            <li
              key={task.id}
              className={`flex items-center gap-3 p-4 ${task.isOverdue ? 'bg-red-50/40' : ''}`}
            >
              {task.assignee ? (
                <UserAvatar
                  userId={task.assignee.id}
                  image={task.assignee.image}
                  name={task.assignee.name}
                  email={task.assignee.email}
                  className="h-9 w-9 ring-1 ring-slate-200 flex-shrink-0"
                  fallbackClassName="text-xs bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-slate-400">—</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                  {task.team && <span className="truncate">{task.team.name}</span>}
                  {task.team && <span>·</span>}
                  <span>{statusLabel[task.status] ?? task.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
                {task.isOverdue ? (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100 font-normal">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-normal">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                  </Badge>
                )}
                {task.priority === 'URGENT' && (
                  <Badge className="bg-red-600 text-white hover:bg-red-600 font-normal text-xs">
                    Urgent
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
