'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
    if (tasks.overdue > 0) return { label: 'Overdue', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' }
    if (active === 0) return { label: 'Available', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50 border-green-200' }
    if (active <= 3) return { label: 'Light', color: 'bg-blue-400', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' }
    if (active <= 6) return { label: 'Moderate', color: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' }
    return { label: 'Heavy', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' }
  }

  const totalActive = workload.reduce((s, u) => s + u.tasks.todo + u.tasks.inProgress + u.tasks.inReview, 0)
  const totalOverdue = workload.reduce((s, u) => s + u.tasks.overdue, 0)
  const available = workload.filter(u => u.tasks.todo + u.tasks.inProgress + u.tasks.inReview === 0 && u.tasks.overdue === 0).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Workload</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live overview of active tasks and capacity across the team
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWorkload} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ListTodo className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{totalActive}</p>
              <p className="text-xs text-blue-700">Active tasks across team</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-900">{totalOverdue}</p>
              <p className="text-xs text-red-700">Overdue tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">{available}</p>
              <p className="text-xs text-green-700">Members available</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workload Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workload.map(user => {
            const level = getActivityLevel(user.tasks)
            const active = user.tasks.todo + user.tasks.inProgress + user.tasks.inReview
            const completionRate = user.tasks.total > 0
              ? Math.round((user.tasks.completed / user.tasks.total) * 100)
              : 0

            return (
              <Card key={user.id} className={cn('border', level.bg)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} size="md" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {user.name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.positionTitle || user.role}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn('text-xs shrink-0', level.text, 'border', level.bg)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', level.color)} />
                      {level.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {/* Task Counts */}
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {[
                      { label: 'To Do', value: user.tasks.todo, color: 'text-gray-600' },
                      { label: 'In Progress', value: user.tasks.inProgress, color: 'text-blue-600' },
                      { label: 'In Review', value: user.tasks.inReview, color: 'text-yellow-600' },
                      { label: 'Done', value: user.tasks.completed, color: 'text-green-600' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-white/60 rounded-lg p-1.5">
                        <p className={cn('text-base font-bold', stat.color)}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Overdue alert */}
                  {user.tasks.overdue > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-red-100 border border-red-200 rounded-lg">
                      <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span className="text-xs text-red-700 font-medium">
                        {user.tasks.overdue} overdue task{user.tasks.overdue !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Completion rate */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {active} active · {completionRate}% completion rate
                      </span>
                    </div>
                    <Progress value={completionRate} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {workload.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">
              No team members found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
