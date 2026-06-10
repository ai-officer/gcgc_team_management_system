'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Users, Plus, Loader2, LayoutGrid, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import type { Team } from '@/types/team'

const COLOR_CHOICES = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1']

export default function TeamsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_CHOICES[0])
  const [creating, setCreating] = useState(false)

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/user/teams')
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams || [])
      }
    } catch (e) {
      console.error('Error fetching teams:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user) fetchTeams()
  }, [session?.user, fetchTeams])

  const createTeam = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/user/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      if (res.ok) {
        const data = await res.json()
        setTeams(prev => [data.team, ...prev])
        setShowCreate(false)
        setName('')
        setColor(COLOR_CHOICES[0])
        toast({ title: `Team "${data.team.name}" created` })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Could not create team', description: err.error || 'Please try again', variant: 'destructive' })
      }
    } catch (e) {
      console.error('Error creating team:', e)
      toast({ title: 'Could not create team', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const myRole = (team: Team): string | null =>
    team.members.find(m => m.userId === session?.user?.id)?.role ?? null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> My Teams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spin up a team for a project, add members, and give each its own task board.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Team
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading teams…
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-xl">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">You&apos;re not in any team yet.</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create your first team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => {
            const role = myRole(team)
            return (
              <div key={team.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow bg-card flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.board?.color || '#3B82F6' }} />
                    <h2 className="font-semibold truncate">{team.name}</h2>
                  </div>
                  {role && (
                    <Badge variant={role === 'LEADER' ? 'default' : 'secondary'} className="text-[10px]">
                      {role === 'LEADER' ? 'Leader' : 'Member'}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 text-sm text-muted-foreground flex items-center gap-4">
                  <span>{team._count?.members ?? team.members.length} members</span>
                  <span>{team._count?.tasks ?? 0} tasks</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/user/teams/${team.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Manage <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                  {team.board && (
                    <Link href={`/user/tasks?board=${team.board.id}`}>
                      <Button variant="ghost" size="sm" title="Open team board">
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a team</DialogTitle>
            <DialogDescription>A team gets its own task board automatically. You become its first leader.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Q3 Website Revamp"
                maxLength={100}
                onKeyDown={e => { if (e.key === 'Enter') createTeam() }}
              />
            </div>
            <div className="space-y-2">
              <Label>Board color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_CHOICES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Choose color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
            <Button onClick={createTeam} disabled={creating || !name.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
