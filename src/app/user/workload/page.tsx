'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { AlertCircle, CheckCircle2, Clock, ListTodo, Loader2, RefreshCw } from 'lucide-react'
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

  // Redirect non-leaders away
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
    if (tasks.overdue > 0) return { label: 'Overdue', barColor: 'bg-red-500', text: 'text-red-700', badgeBg: 'bg-red-50', dotColor: 'bg-red-500' }
    if (active === 0) return { label: 'Available', barColor: 'bg-green-500', text: 'text-green-700', badgeBg: 'bg-green-50', dotColor: 'bg-green-500' }
    if (active <= 3) return { label: 'Light', barColor: 'bg-blue-400', text: 'text-blue-700', badgeBg: 'bg-blue-50', dotColor: 'bg-blue-400' }
    if (active <= 6) return { label: 'Moderate', barColor: 'bg-amber-400', text: 'text-amber-700', badgeBg: 'bg-amber-50', dotColor: 'bg-amber-400' }
    return { label: 'Heavy', barColor: 'bg-red-400', text: 'text-red-700', badgeBg: 'bg-red-50', dotColor: 'bg-red-400' }
  }

  const totalActive = workload.reduce((s, u) => s + u.tasks.todo + u.tasks.inProgress + u.tasks.inReview, 0)
  const totalOverdue = workload.reduce((s, u) => s + u.tasks.overdue, 0)
  const available = workload.filter(u => u.tasks.todo + u.tasks.inProgress + u.tasks.inReview === 0 && u.tasks.overdue === 0).length

  return (
    <div className="bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Workload</h1>
          <p className="text-sm text-gray-600 mt-1">
            Live overview of active tasks and capacity across the team
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWorkload} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="p-2.5 bg-blue-50 rounded-lg">
            <ListTodo className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalActive}</p>
            <p className="text-xs text-gray-600">Active tasks across team</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="p-2.5 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalOverdue}</p>
            <p className="text-xs text-gray-600">Overdue tasks</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="p-2.5 bg-green-50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{available}</p>
            <p className="text-xs text-gray-600">Members available</p>
          </div>
        </div>
      </div>

      {/* Member Workload List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : workload.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-sm text-gray-500">No team members found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {workload.map((user, index) => {
            const level = getActivityLevel(user.tasks)
            const active = user.tasks.todo + user.tasks.inProgress + user.tasks.inReview
            const completionRate = user.tasks.total > 0
              ? Math.round((user.tasks.completed / user.tasks.total) * 100)
              : 0
            const maxActive = Math.max(...workload.map(u => u.tasks.todo + u.tasks.inProgress + u.tasks.inReview), 1)
            const barWidth = active > 0 ? Math.round((active / maxActive) * 100) : 0

            return (
              <div
                key={user.id}
                className={cn('px-5 py-4 flex items-center gap-4', index < workload.length - 1 && 'border-b border-gray-100')}
              >
                {/* Avatar */}
                <UserAvatar user={user} size="md" />

                {/* Name + Role */}
                <div className="min-w-0 w-40 shrink-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.positionTitle || user.role}
                  </p>
                </div>

                {/* Activity Badge */}
                <div className="shrink-0">
                  <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', level.text, level.badgeBg)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', level.dotColor)} />
                    {level.label}
                  </span>
                </div>

                {/* Task Count */}
                <div className="shrink-0 text-center w-14">
                  <p className="text-lg font-bold text-gray-900">{active}</p>
                  <p className="text-xs text-gray-500 leading-tight">active</p>
                </div>

                {/* Load Bar + Overdue indicator */}
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {active} active tasks
                      {user.tasks.overdue > 0 && (
                        <span className="ml-1 text-red-600 font-medium">
                          · {user.tasks.overdue} overdue
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">{completionRate}% done</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={cn('h-2 rounded-full transition-all duration-300', level.barColor)}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
