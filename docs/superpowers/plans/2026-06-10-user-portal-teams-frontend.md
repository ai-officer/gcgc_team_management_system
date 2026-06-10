# User Portal Teams — Frontend Implementation Plan (Plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give users a "My Teams" UI to create teams, manage members and per-team leader roles, and reach each team's board — built on the Plan 1 backend (`/api/user/teams/*`, team-aware `/api/boards`).

**Architecture:** Two new client pages under `/user/teams` following the codebase's established pattern (`'use client'`, `useSession`, inline `fetch` + `useState`, shadcn/Radix UI, `useToast`). A small shared types module keeps the two pages consistent. The existing tasks-page board switcher already shows team boards (because `/api/boards` is team-aware); we polish it to label team boards and route their management to the team page instead of the personal edit/delete (which now returns 409).

**Tech Stack:** Next.js 14 App Router (client components), shadcn/Radix UI, TailwindCSS, lucide-react, NextAuth (`useSession`), `@/hooks/use-toast`.

**Testing reality:** This repo has **no React-component test harness** (vitest covers pure `src/lib` only) and this plan does not add one. Frontend tasks are verified by `npm run type-check` (no new errors) + a described manual check. Pre-existing type errors in `prisma/seed.ts`, `scripts/*`, and various existing `src/app/**`/`src/lib/**` files are KNOWN — only NEW errors in files this plan touches matter. Do NOT invent a component-test setup.

**Backend already in place (Plan 1, deployed):** `GET/POST /api/user/teams`; `GET/PATCH/DELETE /api/user/teams/[id]`; `GET/POST /api/user/teams/[id]/members`; `PATCH/DELETE /api/user/teams/[id]/members/[userId]` (PATCH/DELETE return `400 {error}` when the change would leave the team with no leader); `GET /api/boards` returns boards including a `team {id,name}` field for team boards; `GET /api/users` returns `{ users: [...] }` (active users).

**Commit convention:** This repo does **not** use a `Co-Authored-By` trailer. Do not add one.

---

## File Structure

**Create:**
- `src/types/team.ts` — shared TS types (`Team`, `TeamMember`, `TeamMemberRole`, etc.) used by both new pages. One responsibility: the team domain shapes the frontend consumes.
- `src/app/user/teams/page.tsx` — "My Teams" list + create-team dialog.
- `src/app/user/teams/[id]/page.tsx` — team detail: header (rename/delete for leaders), open-board link, and member management (add/promote/demote/remove).

**Modify:**
- `src/components/layout/sidebar.tsx` — add a "Teams" nav item to `userNavItems` and `leaderNavItems`.
- `src/app/user/tasks/page.tsx` — add `team` to the `KanbanBoard` interface; in the board tab strip, mark team boards and replace the personal edit/delete dropdown with a "Manage team" link for team boards.

---

## Task 1: Shared team types + "Teams" sidebar nav

**Files:**
- Create: `src/types/team.ts`
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Create the shared types**

Create `src/types/team.ts`:

```ts
export type TeamMemberRole = 'LEADER' | 'MEMBER'

export interface TeamMemberUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  positionTitle?: string | null
}

export interface TeamMember {
  id: string
  userId: string
  teamId: string
  role: TeamMemberRole
  user: TeamMemberUser
}

export interface TeamBoardRef {
  id: string
  name: string
  color: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  ownerId: string | null
  members: TeamMember[]
  board: TeamBoardRef | null
  _count?: { members: number; tasks: number }
}

/** A user the current user can add to a team (from GET /api/users). */
export interface SelectableUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
}
```

- [ ] **Step 2: Add the "Teams" nav item to BOTH user and leader menus**

In `src/components/layout/sidebar.tsx`, the icon import block (lines 7-27) already imports `Users` from `lucide-react` — no import change needed.

In `userNavItems` (around lines 73-101), insert a Teams entry directly after the `Tasks` item and before `Calendar`:

```tsx
  {
    title: 'Teams',
    href: '/user/teams',
    icon: Users,
  },
```

In `leaderNavItems` (around lines 103-143), insert the SAME entry directly after the `Tasks` item and before `Calendar`:

```tsx
  {
    title: 'Teams',
    href: '/user/teams',
    icon: Users,
  },
```

(Every authenticated user can create/own teams, so the link appears for both plain members and leaders. Admins keep their own `adminNavItems` unchanged.)

- [ ] **Step 3: Verify types compile**

Run: `npm run type-check`
Expected: PASS (no new errors). The `/user/teams` route doesn't exist yet — that's fine; Next resolves routes at runtime, not type-check.

- [ ] **Step 4: Commit**

```bash
git add src/types/team.ts src/components/layout/sidebar.tsx
git commit -m "feat(teams-ui): shared team types and Teams sidebar nav for all users"
```

---

## Task 2: "My Teams" list page + create-team dialog

**Files:**
- Create: `src/app/user/teams/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/user/teams/page.tsx`:

```tsx
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
      <div className="flex items-center justify-between mb-6">
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
          <p className="mt-3 text-muted-foreground">You're not in any team yet.</p>
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
```

- [ ] **Step 2: Verify types compile**

Run: `npm run type-check`
Expected: PASS — no new errors referencing `src/app/user/teams/page.tsx`. If `Badge` variant types complain, confirm allowed variants in `src/components/ui/badge.tsx` and use a valid one (`default`/`secondary`/`outline`/`destructive`).

- [ ] **Step 3: Manual check**

Run `npm run dev`, sign in, click **Teams** in the sidebar. Create a team → it appears as a card with a "Leader" badge, "1 members", and a "Manage"/board button. Reload → it persists (GET works).

- [ ] **Step 4: Commit**

```bash
git add src/app/user/teams/page.tsx
git commit -m "feat(teams-ui): My Teams list page with create-team dialog"
```

---

## Task 3: Team detail page — header, rename, delete, open board

**Files:**
- Create: `src/app/user/teams/[id]/page.tsx`

This task builds the page shell + team-level actions. Task 4 adds member management into the same file.

- [ ] **Step 1: Create the page**

Create `src/app/user/teams/[id]/page.tsx`:

```tsx
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
        <p className="text-muted-foreground">Team not found, or you're not a member.</p>
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
```

- [ ] **Step 2: Verify types compile**

Run: `npm run type-check`
Expected: PASS — no new errors referencing `src/app/user/teams/[id]/page.tsx`. (`useParams<{id:string}>()` returns `{ id: string }`.)

- [ ] **Step 3: Manual check**

From the Teams list, click **Manage** on a team → detail page loads with its name and an "Open board" button. As the team's leader, rename it (the title updates). Open the delete dialog (don't confirm yet) and confirm the cascade warning text shows. A plain member should NOT see the rename/delete buttons.

- [ ] **Step 4: Commit**

```bash
git add "src/app/user/teams/[id]/page.tsx"
git commit -m "feat(teams-ui): team detail page with rename and delete"
```

---

## Task 4: Member management on the team detail page

**Files:**
- Modify: `src/app/user/teams/[id]/page.tsx`

Adds: list members with roles; for managers — add an existing user, promote/demote, remove; surface the ≥1-leader `400` error as a toast.

- [ ] **Step 1: Add imports and member-management state**

In `src/app/user/teams/[id]/page.tsx`, extend the lucide import to add icons and import the `Avatar` + `Badge` + `SelectableUser` type. Replace the existing lucide import line:

```tsx
import { ArrowLeft, LayoutGrid, Loader2, Pencil, Trash2, Users } from 'lucide-react'
```
with:
```tsx
import { ArrowLeft, LayoutGrid, Loader2, Pencil, Trash2, Users, UserPlus, Crown, X, Search } from 'lucide-react'
```

Add these imports alongside the other `@/components/ui` imports:
```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
```
and extend the team type import:
```tsx
import type { Team, SelectableUser } from '@/types/team'
```

Inside the component, after the existing `showDelete`/`deleting` state, add:
```tsx
  const [showAdd, setShowAdd] = useState(false)
  const [allUsers, setAllUsers] = useState<SelectableUser[]>([])
  const [userQuery, setUserQuery] = useState('')
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
```

- [ ] **Step 2: Add the member-action handlers**

Inside the component (after `deleteTeam`), add:

```tsx
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setAllUsers(data.users || [])
      }
    } catch (e) {
      console.error('Error loading users:', e)
    }
  }

  const openAddDialog = () => { setUserQuery(''); setShowAdd(true); if (allUsers.length === 0) loadUsers() }

  const addMember = async (userId: string) => {
    if (!team) return
    setBusyUserId(userId)
    try {
      const res = await fetch(`/api/user/teams/${team.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: 'MEMBER' }),
      })
      if (res.ok) {
        await fetchTeam()
        toast({ title: 'Member added' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Could not add member', description: err.error, variant: 'destructive' })
      }
    } finally {
      setBusyUserId(null)
    }
  }

  const setRole = async (userId: string, role: 'LEADER' | 'MEMBER') => {
    if (!team) return
    setBusyUserId(userId)
    try {
      const res = await fetch(`/api/user/teams/${team.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        await fetchTeam()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Could not change role', description: err.error, variant: 'destructive' })
      }
    } finally {
      setBusyUserId(null)
    }
  }

  const removeMember = async (userId: string) => {
    if (!team) return
    setBusyUserId(userId)
    try {
      const res = await fetch(`/api/user/teams/${team.id}/members/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchTeam()
        toast({ title: 'Member removed' })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Could not remove member', description: err.error, variant: 'destructive' })
      }
    } finally {
      setBusyUserId(null)
    }
  }
```

- [ ] **Step 3: Replace the placeholder Members section**

Replace the entire placeholder `<section id="team-members" ...>...</section>` block from Task 3 with:

```tsx
      <section id="team-members" className="border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Members ({team.members.length})</h2>
          {canManage && (
            <Button size="sm" variant="outline" onClick={openAddDialog}><UserPlus className="h-4 w-4 mr-2" /> Add member</Button>
          )}
        </div>
        <ul className="divide-y">
          {team.members.map(m => {
            const isSelf = m.userId === session?.user?.id
            const leaderCount = team.members.filter(x => x.role === 'LEADER').length
            const isLastLeader = m.role === 'LEADER' && leaderCount === 1
            return (
              <li key={m.userId} className="flex items-center gap-3 py-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.user.image || undefined} />
                  <AvatarFallback>{(m.user.name || m.user.email)[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.user.name || m.user.email}{isSelf && <span className="text-muted-foreground"> (you)</span>}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>
                <Badge variant={m.role === 'LEADER' ? 'default' : 'secondary'} className="text-[10px] flex items-center gap-1">
                  {m.role === 'LEADER' && <Crown className="h-3 w-3" />}{m.role === 'LEADER' ? 'Leader' : 'Member'}
                </Badge>
                {canManage && (
                  <div className="flex items-center gap-1">
                    {m.role === 'MEMBER' ? (
                      <Button size="sm" variant="ghost" disabled={busyUserId === m.userId} onClick={() => setRole(m.userId, 'LEADER')} title="Make leader">
                        {busyUserId === m.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled={busyUserId === m.userId || isLastLeader} onClick={() => setRole(m.userId, 'MEMBER')} title={isLastLeader ? 'A team needs at least one leader' : 'Demote to member'}>
                        {busyUserId === m.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4 opacity-40" />}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={busyUserId === m.userId || isLastLeader} onClick={() => removeMember(m.userId)} title={isLastLeader ? 'A team needs at least one leader' : 'Remove from team'}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
```

- [ ] **Step 4: Add the "Add member" dialog**

Directly before the closing `</div>` of the page's root `return` (after the AlertDialog block), insert:

```tsx
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a member</DialogTitle>
            <DialogDescription>Add an existing user to this team. They keep their own profile — you only set their team role.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="relative mb-3">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name or email…" value={userQuery} onChange={e => setUserQuery(e.target.value)} />
            </div>
            <ul className="max-h-72 overflow-y-auto divide-y">
              {allUsers
                .filter(u => !team.members.some(m => m.userId === u.id))
                .filter(u => {
                  const q = userQuery.trim().toLowerCase()
                  if (!q) return true
                  return (u.name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                })
                .slice(0, 50)
                .map(u => (
                  <li key={u.id} className="flex items-center gap-3 py-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={u.image || undefined} />
                      <AvatarFallback>{(u.name || u.email)[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{u.name || u.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Button size="sm" variant="outline" disabled={busyUserId === u.id} onClick={() => addMember(u.id)}>
                      {busyUserId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    </Button>
                  </li>
                ))}
              {allUsers.filter(u => !team.members.some(m => m.userId === u.id)).length === 0 && (
                <li className="py-6 text-center text-sm text-muted-foreground">No users available to add.</li>
              )}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 5: Verify types compile**

Run: `npm run type-check`
Expected: PASS — no new errors referencing this file.

- [ ] **Step 6: Manual check**

As a team leader: open a team → **Add member** → search and add a user (appears in the list with a "Member" badge). Promote them (Crown) → "Leader" badge. Try to demote/remove the **only** leader → the buttons are disabled (and if forced via API, the server's `400` shows as a toast). Remove the added member → list updates. As a plain member, the add/role/remove controls are hidden.

- [ ] **Step 7: Commit**

```bash
git add "src/app/user/teams/[id]/page.tsx"
git commit -m "feat(teams-ui): member management (add/promote/demote/remove) with one-leader guard"
```

---

## Task 5: Board switcher — mark team boards, route management to the team page

**Files:**
- Modify: `src/app/user/tasks/page.tsx`

Team boards already appear in the switcher (backend is team-aware). Two changes: (1) type the `team` field; (2) for team boards, show a "Team" marker and replace the personal Edit/Delete dropdown (which now 409s) with a "Manage team" link.

- [ ] **Step 1: Add `team` to the `KanbanBoard` interface**

In `src/app/user/tasks/page.tsx`, the `KanbanBoard` interface (lines ~169-178) ends with `_count: { tasks: number }`. Add a `team` field:

```tsx
interface KanbanBoard {
  id: string
  name: string
  description?: string
  color: string
  ownerId: string
  owner?: BoardMemberUser
  members: { userId: string; user: BoardMemberUser }[]
  _count: { tasks: number }
  team?: { id: string; name: string } | null
}
```

- [ ] **Step 2: Import the `Link` component (if not already imported)**

Check the top imports of the file. If `next/link` is NOT imported, add near the other imports:
```tsx
import Link from 'next/link'
```
(If it's already imported, skip.)

- [ ] **Step 3: In the per-board tab, distinguish team boards and swap the actions menu**

In the board tab strip (the `boards.map(board => { ... })` block, lines ~909-973), make two edits.

First, after the line `const isOwner = board.ownerId === session?.user?.id`, add:
```tsx
            const isTeamBoard = !!board.team
```

Second, replace the "Shared-to-me badge" block:
```tsx
        {/* Shared-to-me badge */}
        {!isOwner && (
          <span className="ml-1 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium leading-none">shared</span>
        )}
```
with a team/shared badge:
```tsx
        {/* Team or shared badge */}
        {isTeamBoard ? (
          <span className="ml-1 text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium leading-none">team</span>
        ) : !isOwner ? (
          <span className="ml-1 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium leading-none">shared</span>
        ) : null}
```

Third, replace the owner actions dropdown block:
```tsx
      {/* Board actions menu — only owner can edit/delete */}
      {isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all">
              <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => {
              setEditingBoard(board)
              setEditingBoardMemberIds(board.members.map(m => m.userId))
            }}>
              <Settings2 className="h-4 w-4 mr-2" /> Edit Board
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => deleteBoard(board.id)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
```
with a version that routes team boards to the team page and keeps personal Edit/Delete only for non-team boards:
```tsx
      {/* Team boards are managed on the team page; personal boards keep owner edit/delete */}
      {isTeamBoard ? (
        <Link
          href={`/user/teams/${board.team!.id}`}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
          title="Manage team"
          onClick={(e) => e.stopPropagation()}
        >
          <Settings2 className="h-3.5 w-3.5 text-gray-500" />
        </Link>
      ) : isOwner ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all">
              <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => {
              setEditingBoard(board)
              setEditingBoardMemberIds(board.members.map(m => m.userId))
            }}>
              <Settings2 className="h-4 w-4 mr-2" /> Edit Board
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => deleteBoard(board.id)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
```

- [ ] **Step 4: Verify types compile**

Run: `npm run type-check`
Expected: PASS — no NEW errors referencing `src/app/user/tasks/page.tsx` beyond the pre-existing TS2802 `Set` iteration error (line ~889/902) that exists at the base. `board.team!.id` is safe because it's inside the `isTeamBoard` branch.

- [ ] **Step 5: Manual check**

As a member of a team: open **Tasks**. The team's board appears as a tab with a violet **team** badge. Hovering shows a gear that links to `/user/teams/<id>` (not the personal Edit/Delete). Personal boards still show the Edit/Delete dropdown. Clicking the team board tab filters tasks to that board.

- [ ] **Step 6: Commit**

```bash
git add src/app/user/tasks/page.tsx
git commit -m "feat(teams-ui): mark team boards and route their management to the team page"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** Req 1 (add other leaders) → Task 4 promote (Crown). Req 2 (create multiple teams, own board) → Task 2 create + list; each team shows its board link. Req 3 (members see team task boards) → already delivered by Plan 1's team-aware `/api/boards`; Task 5 labels team boards and Task 2/3 give "Open board" deep links. Req 4 (no profile editing) → Task 4 adds members by reference only (role-only; no profile fields), reinforced by the dialog copy. Equal-rights leaders + ≥1-leader invariant → Task 4 (promote any member; demote/remove disabled for the last leader, with the server `400` surfaced as a toast as a backstop).
- **Placeholder scan:** Task 3's "placeholder Members section" is a deliberate, fully-specified scaffold that Task 4 replaces verbatim — not a vague TODO. All dialog/JSX blocks are complete and tag-balanced.
- **Type consistency:** `Team`/`TeamMember`/`SelectableUser` from `src/types/team.ts` are used identically across both pages; the `KanbanBoard.team` shape (`{id,name}`) matches what Plan 1's `/api/boards` returns; member-action fetch URLs match Plan 1's routes exactly (`/api/user/teams/[id]/members[/userId]`).
- **Out of scope (intentional):** no team description editing UI (backend supports it, not surfaced); no realtime updates (page refetches after mutations, consistent with the rest of the app); no pagination on the add-member user list (capped at 50 shown with client filter, matching the app's existing simple pickers).
