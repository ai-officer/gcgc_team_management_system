'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns'
import {
  Star, Plus, X, BarChart3, Users, Award, TrendingUp, Calendar, Filter, ArrowRight, MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { cn } from '@/lib/utils'

type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
type GradientScore = 0 | 25 | 50 | 75 | 100

interface User {
  id: string
  name: string
  email: string
  image?: string
  role: string
}

interface Evaluation {
  id: string
  period: Period
  gradientScore: number
  comments?: string
  evaluatedAt: string
  periodStartDate: string
  periodEndDate: string
  evaluator: User
  evaluatee: User
  task?: { id: string; title: string }
}

const GRADIENT_OPTIONS: {
  score: GradientScore
  label: string
  sublabel: string
  dot: string
  badge: string
  accent: string
}[] = [
  { score: 0,   label: '0%',   sublabel: 'None',      dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-700 border-slate-300',   accent: 'border-l-slate-400'  },
  { score: 25,  label: '25%',  sublabel: 'Poor',      dot: 'bg-red-400',     badge: 'bg-red-100 text-red-700 border-red-300',         accent: 'border-l-red-400'    },
  { score: 50,  label: '50%',  sublabel: 'Fair',      dot: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-700 border-amber-300',   accent: 'border-l-amber-400'  },
  { score: 75,  label: '75%',  sublabel: 'Good',      dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700 border-blue-300',      accent: 'border-l-blue-400'   },
  { score: 100, label: '100%', sublabel: 'Excellent', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', accent: 'border-l-emerald-500' },
]

function getScoreOption(score: number) {
  return GRADIENT_OPTIONS.find(o => o.score === score) ?? GRADIENT_OPTIONS[0]
}

function getProgressColor(score: number) {
  if (score >= 100) return 'bg-emerald-500'
  if (score >= 75)  return 'bg-blue-500'
  if (score >= 50)  return 'bg-amber-400'
  if (score >= 25)  return 'bg-red-400'
  return 'bg-slate-300'
}

function getPeriodDates(period: Period) {
  const now = new Date()
  switch (period) {
    case 'DAILY':     return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') }
    case 'WEEKLY':    return { start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') }
    case 'MONTHLY':   return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') }
    case 'QUARTERLY': return { start: format(startOfQuarter(now), 'yyyy-MM-dd'), end: format(endOfQuarter(now), 'yyyy-MM-dd') }
  }
}

const PERIOD_LABEL: Record<Period, string> = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly' }
const PERIOD_BADGE: Record<Period, string> = {
  DAILY:     'bg-purple-100 text-purple-700 border-purple-200',
  WEEKLY:    'bg-blue-100 text-blue-700 border-blue-200',
  MONTHLY:   'bg-orange-100 text-orange-700 border-orange-200',
  QUARTERLY: 'bg-teal-100 text-teal-700 border-teal-200',
}

export default function EvaluationsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()

  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [filterPeriod, setFilterPeriod] = useState<string>('all')
  const [filterEvaluatee, setFilterEvaluatee] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formEvaluateeId, setFormEvaluateeId] = useState('')
  const [formPeriod, setFormPeriod] = useState<Period>('WEEKLY')
  const [formScore, setFormScore] = useState<GradientScore | null>(null)
  const [formComments, setFormComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isLeaderOrAdmin = session?.user?.role === 'LEADER' || session?.user?.role === 'ADMIN'

  useEffect(() => {
    fetchEvaluations()
    if (isLeaderOrAdmin) fetchUsers()
  }, [filterPeriod, filterEvaluatee])

  const fetchEvaluations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterPeriod !== 'all') params.set('period', filterPeriod)
      if (filterEvaluatee !== 'all') params.set('evaluateeId', filterEvaluatee)
      if (!isLeaderOrAdmin) params.set('evaluateeId', session?.user?.id || '')
      const res = await fetch(`/api/evaluations?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEvaluations(data.evaluations || [])
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?limit=100&isActive=true')
      if (res.ok) { const d = await res.json(); setUsers(d.users || []) }
    } catch (e) { console.error(e) }
  }

  const handleSubmit = async () => {
    if (!formEvaluateeId || formScore === null) {
      toast({ title: 'Required fields missing', description: 'Select a member and a score.', variant: 'destructive' })
      return
    }
    try {
      setSubmitting(true)
      const { start, end } = getPeriodDates(formPeriod)
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluateeId: formEvaluateeId,
          period: formPeriod,
          gradientScore: formScore,
          comments: formComments || undefined,
          periodStartDate: start,
          periodEndDate: end,
        })
      })
      if (res.ok) {
        toast({ title: 'Evaluation submitted successfully' })
        setShowForm(false)
        setFormEvaluateeId('')
        setFormScore(null)
        setFormComments('')
        fetchEvaluations()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error, variant: 'destructive' })
      }
    } catch (e) { console.error(e) } finally { setSubmitting(false) }
  }

  const closeForm = () => {
    setShowForm(false)
    setFormEvaluateeId('')
    setFormScore(null)
    setFormComments('')
  }

  // Derived stats
  const totalEvals = evaluations.length
  const avgScore = totalEvals > 0
    ? Math.round(evaluations.reduce((s, e) => s + e.gradientScore, 0) / totalEvals)
    : 0
  const excellentCount = evaluations.filter(e => e.gradientScore >= 75).length
  const uniqueMembers = new Set(evaluations.map(e => e.evaluatee.id)).size

  const { start: previewStart, end: previewEnd } = getPeriodDates(formPeriod)

  return (
    <div className="space-y-8">

      {/* ── Gradient Hero Header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 opacity-60" />
        <div className="relative backdrop-blur-sm bg-white/40 border border-slate-200/60 rounded-xl shadow-sm p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">HR Evaluations</h1>
              <p className="text-slate-600 text-base font-medium">
                Track and record performance evaluations across your team by period.
              </p>
            </div>
            {isLeaderOrAdmin && (
              <Button className="shadow-sm shrink-0" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Evaluation
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total</CardTitle>
            <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{totalEvals}</div>
              <span className="text-sm text-slate-500 font-medium">evaluations</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">All time</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Avg Score</CardTitle>
            <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{avgScore}</div>
              <span className="text-sm text-slate-500 font-medium">%</span>
            </div>
            <div className="space-y-1.5">
              <Progress value={avgScore} className="h-1.5 bg-slate-100" />
              <p className="text-xs text-slate-500">{getScoreOption(avgScore < 25 ? 0 : avgScore < 50 ? 25 : avgScore < 75 ? 50 : avgScore < 100 ? 75 : 100).sublabel} overall</p>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">High Scores</CardTitle>
            <div className="p-2.5 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{excellentCount}</div>
              <span className="text-sm text-slate-500 font-medium">Good+</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">75% or above</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Members</CardTitle>
            <div className="p-2.5 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-900">{uniqueMembers}</div>
              <span className="text-sm text-slate-500 font-medium">evaluated</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">Unique members</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filter by:</span>
        </div>

        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-44 border-slate-200 bg-slate-50 rounded-lg h-9 text-sm">
            <SelectValue placeholder="All periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            <SelectItem value="DAILY">Daily</SelectItem>
            <SelectItem value="WEEKLY">Weekly</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
            <SelectItem value="QUARTERLY">Quarterly</SelectItem>
          </SelectContent>
        </Select>

        {isLeaderOrAdmin && (
          <Select value={filterEvaluatee} onValueChange={setFilterEvaluatee}>
            <SelectTrigger className="w-52 border-slate-200 bg-slate-50 rounded-lg h-9 text-sm">
              <SelectValue placeholder="All members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(filterPeriod !== 'all' || filterEvaluatee !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-700 h-9"
            onClick={() => { setFilterPeriod('all'); setFilterEvaluatee('all') }}
          >
            <X className="h-3.5 w-3.5 mr-1.5" /> Clear filters
          </Button>
        )}

        <div className="ml-auto text-sm text-slate-500 shrink-0">
          <span className="font-semibold text-slate-900">{evaluations.length}</span> evaluation{evaluations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Evaluations List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-sm text-slate-500">Loading evaluations...</p>
          </div>
        </div>
      ) : evaluations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 bg-slate-100 rounded-full mb-4">
            <Star className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-600 mb-1">No evaluations found</h3>
          <p className="text-sm text-slate-400 max-w-xs">
            {filterPeriod !== 'all' || filterEvaluatee !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : isLeaderOrAdmin
              ? 'Get started by creating the first evaluation for your team.'
              : 'No evaluations have been submitted for your account yet.'}
          </p>
          {isLeaderOrAdmin && filterPeriod === 'all' && filterEvaluatee === 'all' && (
            <Button className="mt-6" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Evaluation
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {evaluations.map(ev => {
            const opt = getScoreOption(ev.gradientScore)
            return (
              <div
                key={ev.id}
                className={cn(
                  "group bg-white rounded-xl border border-slate-200 border-l-4 shadow-sm hover:shadow-md transition-all duration-200",
                  opt.accent
                )}
              >
                <div className="p-5">
                  {/* Row 1 — Avatar + name + meta + score badge */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        userId={ev.evaluatee.id}
                        image={ev.evaluatee.image}
                        name={ev.evaluatee.name}
                        email={ev.evaluatee.email}
                        className="h-10 w-10 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{ev.evaluatee.name || ev.evaluatee.email}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Evaluated by <span className="font-medium text-slate-700">{ev.evaluator.name || ev.evaluator.email}</span>
                          {' · '}
                          {format(new Date(ev.evaluatedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn("text-xs border font-medium px-2 py-0.5", PERIOD_BADGE[ev.period])}>
                        {PERIOD_LABEL[ev.period]}
                      </Badge>
                      <Badge className={cn("text-sm border font-bold px-3 py-1", opt.badge)}>
                        <span className={cn("w-2 h-2 rounded-full mr-1.5 inline-block", opt.dot)} />
                        {ev.gradientScore}% · {opt.sublabel}
                      </Badge>
                    </div>
                  </div>

                  {/* Row 2 — Score bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(ev.periodStartDate), 'MMM d')} – {format(new Date(ev.periodEndDate), 'MMM d, yyyy')}
                        {ev.task && (
                          <span className="ml-2 text-slate-500">· Task: <span className="font-medium text-slate-700">{ev.task.title}</span></span>
                        )}
                      </span>
                      <span className="font-semibold text-slate-600">{ev.gradientScore}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={cn("h-2 rounded-full transition-all", getProgressColor(ev.gradientScore))}
                        style={{ width: `${ev.gradientScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Row 3 — Comments */}
                  {ev.comments && (
                    <div className="flex items-start gap-2 bg-slate-50 rounded-lg px-4 py-3 mt-2">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-600 italic leading-relaxed">"{ev.comments}"</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── New Evaluation Dialog ── */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Star className="h-4 w-4 text-blue-600" />
              </div>
              New Evaluation
            </DialogTitle>
            <DialogDescription>
              Submit a performance evaluation for a team member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">

            {/* Member */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">
                Team Member <span className="text-red-500">*</span>
              </Label>
              <Select value={formEvaluateeId} onValueChange={setFormEvaluateeId}>
                <SelectTrigger className="border-slate-200 rounded-lg bg-slate-50">
                  <SelectValue placeholder="Select member to evaluate..." />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => u.id !== session?.user?.id)
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <span>{u.name || u.email}</span>
                          <span className="text-xs text-slate-400">({u.role})</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">
                Evaluation Period <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'] as Period[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormPeriod(p)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                      formPeriod === p
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "border-slate-200 text-slate-600 bg-slate-50 hover:border-blue-300 hover:bg-blue-50"
                    )}
                  >
                    {PERIOD_LABEL[p]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Period: {format(new Date(previewStart), 'MMM d')} – {format(new Date(previewEnd), 'MMM d, yyyy')}
              </p>
            </div>

            {/* Score */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-slate-700">
                Performance Score <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {GRADIENT_OPTIONS.map(opt => (
                  <button
                    key={opt.score}
                    type="button"
                    onClick={() => setFormScore(opt.score)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all",
                      formScore === opt.score
                        ? "border-slate-800 shadow-md scale-105"
                        : "border-transparent hover:border-slate-300 opacity-70 hover:opacity-100"
                    )}
                  >
                    <span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm", opt.dot)}>
                      {opt.score}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600">{opt.sublabel}</span>
                  </button>
                ))}
              </div>
              {formScore !== null && (
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium", getScoreOption(formScore).badge)}>
                  <span className={cn("w-2 h-2 rounded-full", getScoreOption(formScore).dot)} />
                  {getScoreOption(formScore).sublabel} — {formScore}%
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">
                Comments <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </Label>
              <Textarea
                placeholder="Add feedback, notes, or observations..."
                value={formComments}
                onChange={e => setFormComments(e.target.value)}
                className="min-h-[80px] resize-none border-slate-200 bg-slate-50 focus:bg-white rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeForm} className="border-slate-200">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formEvaluateeId || formScore === null}
            >
              {submitting ? 'Submitting...' : 'Submit Evaluation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
