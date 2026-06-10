'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, LayoutGrid, Loader2, Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import type { Team } from '@/types/team'

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const { toast } = useToast()
  const router = useRouter()

  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/teams/${id}`)
      if (res.status === 404) { setNotFound(true); return }
      if (res.ok) {
        const data = await res.json()
        setTeam(data.team)
      }
    } catch (e) {
      console.error('Error fetching team:', e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (session?.user) fetchTeam()
  }, [session?.user, fetchTeam])

  const canManage =
    !!team &&
    (session?.user?.role === 'ADMIN' ||
      team.members.some(m => m.userId === session?.user?.id && m.role === 'LEADER'))

  const saveRename = async () => {
    if (!team || !renameValue.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/user/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setTeam(data.team)
        setShowRename(false)
        toast({ title: 'Team renamed' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Could not rename', description: err.error, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteTeam = async () => {
    if (!team) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/user/teams/${team.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Team deleted' })
        router.push('/user/teams')
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Could not delete', description: err.error, variant: 'destructive' })
        setDeleting(false)
      }
    } catch {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
  }
  if (notFound || !team) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center">
        <p className="text-muted-foreground">Team not found, or you&apos;re not a member.</p>
        <Link href="/user/teams"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Teams</Button></Link>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/user/teams" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Teams
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.board?.color || '#3B82F6' }} />
          <h1 className="text-2xl font-bold truncate">{team.name}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {team.board && (
            <Link href={`/user/tasks?board=${team.board.id}`}>
              <Button variant="outline" size="sm"><LayoutGrid className="h-4 w-4 mr-2" /> Open board</Button>
            </Link>
          )}
          {canManage && (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setRenameValue(team.name); setShowRename(true) }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Members section is added in Task 4 — placeholder anchor */}
      <section id="team-members" className="border rounded-xl p-4">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Users className="h-4 w-4" /> Members</h2>
        <p className="text-sm text-muted-foreground">Member management added in Task 4.</p>
      </section>

      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename team</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="rename">Team name</Label>
            <Input id="rename" value={renameValue} maxLength={100} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveRename() }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRename(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveRename} disabled={saving || !renameValue.trim()}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this team?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the team, its board, and all tasks on that board. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); deleteTeam() }} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Delete team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
