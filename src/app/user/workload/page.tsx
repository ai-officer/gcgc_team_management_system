'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { UserAvatar } from '@/components/shared/UserAvatar'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ListTodo,
  Loader2,
  RefreshCw,
  Users,
  Activity,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UserWorkload {
  id: string
  name: string
  email: string
  image?: string
  role: string
  positionTitle?: string
  tasks: {
    total: number
    todo: number
    inProgress: number
    inReview: number
    completed: number
    overdue: number
  }
}

export default function WorkloadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [workload, setWorkload] = useState<UserWorkload[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'LEADER' && session?.user?.role !== 'ADMIN') {
      router.replace('/user/dashboard')
    }
  }, [status, session, router])

  const fetchWorkload = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/workload')
      if (res.ok) {
        const data = await res.json()
        setWorkload(data.workload)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWorkload() }, [])

  const getActivityLevel = (tasks: UserWorkload['tasks']) => {
    const active = tasks.todo + tasks.inProgress + tasks.inReview
    if (tasks.overdue > 0)
      return {
        label: 'Overdue',
        dot: 'bg-red-500',
        badge: 'bg-red-50 text-red-700 border-red-200',
        accent: 'border-l-red-400',
        ring: 'ring-red-100',
      }
    if (active === 0)
      return {
        label: 'Available',
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        accent: 'border-l-emerald-400',
        ring: 'ring-emerald-50',
      }
    if (active <= 3)
      return {
        label: 'Light',
        dot: 'bg-blue-400',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        accent: 'border-l-blue-400',
        ring: 'ring-blue-50',
      }
    if (active <= 6)
      return {
        label: 'Moderate',
        dot: 'bg-amber-400',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        accent: 'border-l-amber-400',
        ring: 'ring-amber-50',
      }
    return {
      label: 'Heavy',
      dot: 'bg-orange-500',
      badge: 'bg-orange-50 text-orange-700 border-orange-200',
      accent: 'border-l-orange-400',
      ring: 'ring-orange-50',
    }
  }

  const totalActive   = workload.reduce((s, u) => s + u.tasks.todo + u.tasks.inProgress + u.tasks.inReview, 0)
  const totalOverdue  = workload.reduce((s, u) => s + u.tasks.overdue, 0)
  const totalMembers  = workload.length
  const available     = workload.filter(u => u.tasks.todo + u.tasks.inProgress + u.tasks.inReview === 0 && u.tasks.overdue === 0).length

  return (
    <div className="space-y-8">

      {/* ── Gradient Hero Header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 opacity-60" />
        <div className="relative backdrop-blur-sm bg-white/40 border border-slate-200/60 rounded-xl shadow-sm p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Team Workload</h1>
              <p className="text-slate-600 text-base font-medium">
                Live overview of active tasks and capacity across the team.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWorkload}
              disabled={loading}
              className="shrink-0 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Team Size</CardTitle>
            <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{totalMembers}</div>
              <span className="text-sm text-slate-500 font-medium">members</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">{available} available</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Active Tasks</CardTitle>
            <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{totalActive}</div>
              <span className="text-sm text-slate-500 font-medium">tasks</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Across all members</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "group relative overflow-hidden border bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1",
          totalOverdue > 0 ? "border-red-200" : "border-slate-200"
        )}>
          <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", totalOverdue > 0 ? "from-red-500 to-red-600" : "from-slate-400 to-slate-500")} />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Overdue</CardTitle>
            <div className={cn("p-2.5 rounded-lg transition-colors", totalOverdue > 0 ? "bg-red-50 group-hover:bg-red-100" : "bg-slate-50 group-hover:bg-slate-100")}>
              <AlertCircle className={cn("h-5 w-5", totalOverdue > 0 ? "text-red-500" : "text-slate-400")} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className={cn("text-4xl font-bold", totalOverdue > 0 ? "text-red-600" : "text-slate-400")}>{totalOverdue}</div>
              <span className="text-sm text-slate-500 font-medium">tasks</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Need attention</span>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Available</CardTitle>
            <div className="p-2.5 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{available}</div>
              <span className="text-sm text-slate-500 font-medium">members</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Ready to be assigned</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── Workload Member Cards ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500">Loading workload data...</p>
          </div>
        </div>
      ) : workload.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 bg-slate-100 rounded-full mb-4">
            <Users className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-600 mb-1">No team members found</h3>
          <p className="text-sm text-slate-400">Add members to your team to see workload data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {workload.map(user => {
            const level = getActivityLevel(user.tasks)
            const active = user.tasks.todo + user.tasks.inProgress + user.tasks.inReview
            const completionRate = user.tasks.total > 0
              ? Math.round((user.tasks.completed / user.tasks.total) * 100)
              : 0

            // Segmented workload bar widths
            const barTotal = Math.max(user.tasks.total, 1)
            const todoW      = Math.round((user.tasks.todo       / barTotal) * 100)
            const progressW  = Math.round((user.tasks.inProgress / barTotal) * 100)
            const reviewW    = Math.round((user.tasks.inReview   / barTotal) * 100)
            const doneW      = Math.round((user.tasks.completed  / barTotal) * 100)

            return (
              <Card
                key={user.id}
                className={cn(
                  "bg-white rounded-xl border border-slate-200 border-l-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5",
                  level.accent
                )}
              >
                {/* Member Header */}
                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar user={user} size="md" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate leading-snug">
                          {user.name || user.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {user.positionTitle || user.role}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn('text-xs shrink-0 border font-medium px-2 py-0.5', level.badge)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', level.dot)} />
                      {level.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">

                  {/* Task status breakdown — 4-column mini grid */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'To Do',      value: user.tasks.todo,        num: 'text-slate-700',   bg: 'bg-slate-50  border-slate-200' },
                      { label: 'In Progress', value: user.tasks.inProgress,  num: 'text-blue-700',    bg: 'bg-blue-50   border-blue-200'  },
                      { label: 'In Review',   value: user.tasks.inReview,    num: 'text-amber-700',   bg: 'bg-amber-50  border-amber-200' },
                      { label: 'Done',        value: user.tasks.completed,   num: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                    ].map(stat => (
                      <div key={stat.label} className={cn('rounded-lg border px-1.5 py-2 text-center', stat.bg)}>
                        <p className={cn('text-lg font-bold leading-none', stat.num)}>{stat.value}</p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Segmented task distribution bar */}
                  {user.tasks.total > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-500">Task distribution</span>
                        <span className="text-xs text-slate-400">{user.tasks.total} total</span>
                      </div>
                      <div className="flex h-2 w-full rounded-full overflow-hidden gap-px bg-slate-100">
                        {todoW > 0     && <div className="bg-slate-400   rounded-l-full transition-all" style={{ width: `${todoW}%`     }} title={`To Do: ${user.tasks.todo}`} />}
                        {progressW > 0 && <div className="bg-blue-400    transition-all"                style={{ width: `${progressW}%` }} title={`In Progress: ${user.tasks.inProgress}`} />}
                        {reviewW > 0   && <div className="bg-amber-400   transition-all"               style={{ width: `${reviewW}%`   }} title={`In Review: ${user.tasks.inReview}`} />}
                        {doneW > 0     && <div className="bg-emerald-400 rounded-r-full transition-all" style={{ width: `${doneW}%`    }} title={`Done: ${user.tasks.completed}`} />}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-sm bg-slate-400 inline-block" />To Do</span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />In Progress</span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />In Review</span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" />Done</span>
                      </div>
                    </div>
                  )}

                  {/* Overdue alert */}
                  {user.tasks.overdue > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <span className="text-xs text-red-700 font-medium">
                        {user.tasks.overdue} overdue task{user.tasks.overdue !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Completion rate */}
                  <div className="pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Completion rate
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-1.5 bg-slate-100" />
                    <p className="text-[10px] text-slate-400 mt-1">{active} active · {user.tasks.completed} completed</p>
                  </div>

                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
