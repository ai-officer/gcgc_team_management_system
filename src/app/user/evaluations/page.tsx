'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subDays } from 'date-fns'
import { Star, Plus, X, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { UserAvatar } from '@/components/shared/UserAvatar'

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

const GRADIENT_OPTIONS: { score: GradientScore; label: string; color: string; bg: string }[] = [
  { score: 0,   label: '0%',   color: 'text-gray-600',  bg: 'bg-gray-200' },
  { score: 25,  label: '25%',  color: 'text-red-600',   bg: 'bg-red-400' },
  { score: 50,  label: '50%',  color: 'text-yellow-600', bg: 'bg-yellow-400' },
  { score: 75,  label: '75%',  color: 'text-blue-600',  bg: 'bg-blue-400' },
  { score: 100, label: '100%', color: 'text-green-600', bg: 'bg-green-500' },
]

function getScoreStyle(score: number) {
  if (score === 0)   return { bg: 'bg-gray-200',   text: 'text-gray-700',  label: 'None' }
  if (score === 25)  return { bg: 'bg-red-100',    text: 'text-red-700',   label: 'Poor' }
  if (score === 50)  return { bg: 'bg-yellow-100', text: 'text-yellow-700',label: 'Fair' }
  if (score === 75)  return { bg: 'bg-blue-100',   text: 'text-blue-700',  label: 'Good' }
  return { bg: 'bg-green-100', text: 'text-green-700', label: 'Excellent' }
}

function getPeriodDates(period: Period): { start: string; end: string } {
  const now = new Date()
  switch (period) {
    case 'DAILY':
      return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') }
    case 'WEEKLY':
      return { start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') }
    case 'MONTHLY':
      return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') }
    case 'QUARTERLY':
      return { start: format(startOfQuarter(now), 'yyyy-MM-dd'), end: format(endOfQuarter(now), 'yyyy-MM-dd') }
  }
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
        toast({ title: 'Evaluation submitted' })
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

  const periodLabel: Record<Period, string> = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly' }
  const periodColor: Record<Period, string> = {
    DAILY: 'bg-purple-100 text-purple-700',
    WEEKLY: 'bg-blue-100 text-blue-700',
    MONTHLY: 'bg-orange-100 text-orange-700',
    QUARTERLY: 'bg-teal-100 text-teal-700',
  }

  return (
    <div className="bg-gray-50 p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR Evaluations</h1>
          <p className="text-gray-500 text-sm mt-1">Performance evaluations by period</p>
        </div>
        {isLeaderOrAdmin && (
          <Button onClick={() => setShowForm(v => !v)} className="gap-2">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'New Evaluation'}
          </Button>
        )}
      </div>

      {/* New Evaluation Form */}
      {showForm && isLeaderOrAdmin && (
        <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">New Evaluation</h2>

          {/* Member select */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Team Member <span className="text-red-500">*</span></Label>
            <Select value={formEvaluateeId} onValueChange={setFormEvaluateeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select member to evaluate..." />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(u => u.id !== session?.user?.id)
                  .map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <span>{u.name || u.email}</span>
                        <span className="text-xs text-gray-400">({u.role})</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Evaluation Period <span className="text-red-500">*</span></Label>
            <div className="flex gap-2 flex-wrap">
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'] as Period[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormPeriod(p)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${formPeriod === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
            {(() => {
              const { start, end } = getPeriodDates(formPeriod)
              return <p className="text-xs text-gray-400">Period: {format(new Date(start), 'MMM dd')} – {format(new Date(end), 'MMM dd, yyyy')}</p>
            })()}
          </div>

          {/* Gradient Score */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Performance Score <span className="text-red-500">*</span></Label>
            <div className="flex gap-3">
              {GRADIENT_OPTIONS.map(opt => (
                <button
                  key={opt.score}
                  type="button"
                  onClick={() => setFormScore(opt.score)}
                  className={`w-16 h-16 rounded-full font-bold text-sm text-white transition-all ${opt.bg} ${formScore === opt.score ? 'ring-4 ring-offset-2 ring-gray-800 scale-105 shadow-md' : 'opacity-70 hover:opacity-100'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {formScore !== null && (
              <p className="text-sm text-gray-500">
                Selected: <strong className={getScoreStyle(formScore).text}>{getScoreStyle(formScore).label}</strong> ({formScore}%)
              </p>
            )}
          </div>

          {/* Comments */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Comments <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Textarea
              placeholder="Add notes or feedback..."
              value={formComments}
              onChange={e => setFormComments(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !formEvaluateeId || formScore === null}>
              {submitting ? 'Submitting...' : 'Submit Evaluation'}
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-40">
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
            <SelectTrigger className="w-48">
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
      </div>

      {/* Evaluations List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
        </div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No evaluations yet</p>
          {isLeaderOrAdmin && <p className="text-sm mt-1">Create the first evaluation using the button above.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {evaluations.map(ev => {
            const score = getScoreStyle(ev.gradientScore)
            return (
              <div key={ev.id} className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      userId={ev.evaluatee.id}
                      image={ev.evaluatee.image}
                      name={ev.evaluatee.name}
                      email={ev.evaluatee.email}
                      className="h-10 w-10"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{ev.evaluatee.name || ev.evaluatee.email}</p>
                      <p className="text-xs text-gray-500">
                        Evaluated by {ev.evaluator.name || ev.evaluator.email} · {format(new Date(ev.evaluatedAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${periodColor[ev.period]}`}>{periodLabel[ev.period]}</span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${score.bg} ${score.text}`}>{ev.gradientScore}% — {score.label}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Period: {format(new Date(ev.periodStartDate), 'MMM dd')} – {format(new Date(ev.periodEndDate), 'MMM dd, yyyy')}
                  {ev.task && <span className="ml-2">· Task: <span className="font-medium text-gray-700">{ev.task.title}</span></span>}
                </div>

                {/* Score gradient bar */}
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${ev.gradientScore >= 75 ? 'bg-green-500' : ev.gradientScore >= 50 ? 'bg-blue-400' : ev.gradientScore >= 25 ? 'bg-yellow-400' : 'bg-gray-300'}`}
                    style={{ width: `${ev.gradientScore}%` }}
                  />
                </div>

                {ev.comments && (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 italic">"{ev.comments}"</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
