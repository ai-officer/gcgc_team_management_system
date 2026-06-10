# User Portal Teams — Backend Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Team`/`TeamMember` the source of truth for user-created project teams — each team owns one persistent Kanban board, has its own members with per-team leader/member roles, and surfaces its board to every team member through the existing board switcher.

**Architecture:** Additive, nullable schema changes (`Team.ownerId`, `KanbanBoard.teamId`) — safe for existing production data; `LeaderMembership`/`reportsToId` untouched. Non-trivial logic (team-management auth, the ≥1-leader invariant, the team↔board link resolver) lives in pure, unit-tested `src/lib` functions. API routes/UI are thin wrappers. A team board is a `KanbanBoard` with a non-null `teamId`; it appears in the existing `/api/boards` switcher because that endpoint becomes team-aware. Team boards are managed **only** through `/api/user/teams/*` (the personal `/api/boards/[id]` route refuses team boards), so equal-rights team leaders manage them without changing the personal-board owner-only auth.

**Tech Stack:** Next.js 14 App Router, Prisma (PostgreSQL), Zod, NextAuth, Vitest (node env, `vi.mock('@/lib/prisma')` for DB-touching units).

**Testing reality:** The repo's test harness (`npm run test` → vitest) covers **pure `src/lib` functions only** — there is no DB-integration or React-component test harness, and this plan does not add one. So: Tasks 2–3 use real red→green vitest cycles; API-route tasks are verified with `npm run type-check` + a manual `curl`/Prisma-Studio check (commands given inline). Do **not** invent a test database.

**Scope:** Backend only. The "My Teams" / team-management UI and the member "by-team" task view are **Plan 2**, written after this plan lands so it targets real endpoints. After this plan, teams are fully creatable/manageable via API and team boards appear in the existing switcher.

**Commit convention:** This repo does **not** use a `Co-Authored-By` trailer. Do not add one.

---

## File Structure

**Create:**
- `src/lib/team-permissions.ts` — pure helpers: `canManageTeam`, `wouldLeaveTeamLeaderless`, `isTeamLeaderRole`.
- `src/lib/team-permissions.test.ts` — vitest for the above.
- `src/lib/team-board.ts` — `resolveTeamBoardLink` (1:1 team↔board reconciler for tasks).
- `src/lib/team-board.test.ts` — vitest (mocks `@/lib/prisma`).
- `src/app/api/user/teams/route.ts` — GET (my teams), POST (create team + owner membership + board).
- `src/app/api/user/teams/[id]/route.ts` — GET (detail), PATCH (rename/description/color), DELETE (delete team + board).
- `src/app/api/user/teams/[id]/members/route.ts` — GET (list), POST (add existing user by reference with role).
- `src/app/api/user/teams/[id]/members/[userId]/route.ts` — PATCH (promote/demote), DELETE (remove) with ≥1-leader invariant.

**Modify:**
- `prisma/schema.prisma` — add `Team.ownerId`/`owner`/`board`, `KanbanBoard.teamId`/`team`, `User.ownedTeams`.
- `src/app/api/boards/route.ts:27-39` — make GET team-aware (3-way OR).
- `src/app/api/boards/[id]/route.ts:31-34,76-79` — refuse boards that have a `teamId`.
- `src/app/api/tasks/route.ts` — on task create (POST) reconcile `boardId`↔`teamId` via `resolveTeamBoardLink`.
- `src/app/api/user/team-members/[id]/route.ts:134-199` — remove the unused profile-edit `PATCH` (Requirement 4).

---

## Task 1: Schema — team ownership & team boards

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `ownerId`, `owner`, and `board` to the `Team` model**

In `prisma/schema.prisma`, replace the `Team` model (currently lines ~217-229) with:

```prisma
model Team {
  id          String       @id @default(cuid())
  name        String
  description String?
  isActive    Boolean      @default(true)
  ownerId     String?      // creator-of-record (nullable: existing admin-created teams stay null)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  events      Event[]
  tasks       Task[]
  members     TeamMember[]
  owner       User?        @relation("TeamOwner", fields: [ownerId], references: [id])
  board       KanbanBoard? @relation("TeamBoard")

  @@map("teams")
}
```

- [ ] **Step 2: Add `teamId`/`team` to `KanbanBoard`**

Replace the `KanbanBoard` model (currently lines ~244-258) with:

```prisma
model KanbanBoard {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String   @default("#3B82F6")
  ownerId     String
  teamId      String?  @unique // non-null => this is a team board (one board per team)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner   User                @relation("BoardOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  team    Team?               @relation("TeamBoard", fields: [teamId], references: [id], onDelete: Cascade)
  tasks   Task[]
  members KanbanBoardMember[]

  @@map("kanban_boards")
}
```

- [ ] **Step 3: Add the `ownedTeams` back-relation to `User`**

In the `User` model, find the line `boards                 KanbanBoard[]       @relation("BoardOwner")` (line ~63) and add directly below it:

```prisma
  ownedTeams             Team[]              @relation("TeamOwner")
```

- [ ] **Step 4: Generate the Prisma client**

Run: `npm run db:generate`
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 5: Create the migration (additive, non-destructive)**

Run: `npx prisma migrate dev --name add_team_owner_and_team_board`
Expected: a new migration under `prisma/migrations/` adding nullable `teams.ownerId` and nullable unique `kanban_boards.teamId`; no data loss prompts (all new columns are nullable). If the local DB is unavailable, instead run `npm run db:push` against the dev DB and note that prod must run `npm run db:migrate`.

- [ ] **Step 6: Verify types compile**

Run: `npm run type-check`
Expected: PASS (the new relations resolve; no existing code references the new fields yet).

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(teams): add Team.ownerId and KanbanBoard.teamId for user-created team boards"
```

---

## Task 2: Pure team-permission helpers (TDD)

**Files:**
- Create: `src/lib/team-permissions.ts`
- Test: `src/lib/team-permissions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/team-permissions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  isTeamLeaderRole,
  canManageTeam,
  wouldLeaveTeamLeaderless,
} from './team-permissions'

describe('isTeamLeaderRole', () => {
  it('is true only for LEADER', () => {
    expect(isTeamLeaderRole('LEADER')).toBe(true)
    expect(isTeamLeaderRole('MEMBER')).toBe(false)
    expect(isTeamLeaderRole(undefined)).toBe(false)
    expect(isTeamLeaderRole(null)).toBe(false)
  })
})

describe('canManageTeam', () => {
  const members = [
    { userId: 'owner', role: 'LEADER' as const },
    { userId: 'colead', role: 'LEADER' as const },
    { userId: 'mem', role: 'MEMBER' as const },
  ]

  it('allows the recorded owner', () => {
    expect(canManageTeam('owner', { ownerId: 'owner', members })).toBe(true)
  })
  it('allows any LEADER member (equal rights), not just the owner', () => {
    expect(canManageTeam('colead', { ownerId: 'owner', members })).toBe(true)
  })
  it('denies plain members', () => {
    expect(canManageTeam('mem', { ownerId: 'owner', members })).toBe(false)
  })
  it('denies non-members', () => {
    expect(canManageTeam('stranger', { ownerId: 'owner', members })).toBe(false)
  })
  it('treats owner as manager even if ownerId is null but they are a LEADER member', () => {
    expect(canManageTeam('colead', { ownerId: null, members })).toBe(true)
  })
})

describe('wouldLeaveTeamLeaderless', () => {
  const twoLeaders = [
    { userId: 'a', role: 'LEADER' as const },
    { userId: 'b', role: 'LEADER' as const },
    { userId: 'c', role: 'MEMBER' as const },
  ]
  const oneLeader = [
    { userId: 'a', role: 'LEADER' as const },
    { userId: 'c', role: 'MEMBER' as const },
  ]

  it('blocks removing the only leader', () => {
    expect(wouldLeaveTeamLeaderless(oneLeader, { userId: 'a', action: 'remove' })).toBe(true)
  })
  it('blocks demoting the only leader', () => {
    expect(wouldLeaveTeamLeaderless(oneLeader, { userId: 'a', action: 'setRole', role: 'MEMBER' })).toBe(true)
  })
  it('allows removing one of two leaders', () => {
    expect(wouldLeaveTeamLeaderless(twoLeaders, { userId: 'a', action: 'remove' })).toBe(false)
  })
  it('allows demoting one of two leaders', () => {
    expect(wouldLeaveTeamLeaderless(twoLeaders, { userId: 'a', action: 'setRole', role: 'MEMBER' })).toBe(false)
  })
  it('allows removing a plain member when a leader remains', () => {
    expect(wouldLeaveTeamLeaderless(oneLeader, { userId: 'c', action: 'remove' })).toBe(false)
  })
  it('allows promoting a member (still has leaders)', () => {
    expect(wouldLeaveTeamLeaderless(oneLeader, { userId: 'c', action: 'setRole', role: 'LEADER' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/team-permissions.test.ts`
Expected: FAIL — "Failed to resolve import './team-permissions'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/team-permissions.ts`:

```ts
import type { TeamMemberRole } from '@prisma/client'

export type TeamMemberLite = { userId: string; role: TeamMemberRole }

/** A team leader is any member whose per-team role is LEADER (the owner is stored as a LEADER member). */
export function isTeamLeaderRole(role: TeamMemberRole | undefined | null): boolean {
  return role === 'LEADER'
}

/**
 * Can `userId` manage this team (rename, manage members, manage the team board)?
 * True if they are the recorded owner OR any LEADER member. All team leaders have
 * equal rights; the owner has no extra authority. Admin override is handled by callers.
 */
export function canManageTeam(
  userId: string,
  team: { ownerId: string | null; members: TeamMemberLite[] }
): boolean {
  if (team.ownerId && team.ownerId === userId) return true
  return team.members.some((m) => m.userId === userId && m.role === 'LEADER')
}

export type RoleChange =
  | { userId: string; action: 'remove' }
  | { userId: string; action: 'setRole'; role: TeamMemberRole }

/**
 * Returns true if applying `change` to `members` would leave the team with zero LEADER members.
 * Enforces the invariant: a team must always keep at least one leader.
 */
export function wouldLeaveTeamLeaderless(
  members: TeamMemberLite[],
  change: RoleChange
): boolean {
  const after = members
    .filter((m) => !(change.action === 'remove' && m.userId === change.userId))
    .map((m) =>
      change.action === 'setRole' && m.userId === change.userId
        ? { ...m, role: change.role }
        : m
    )
  return after.every((m) => m.role !== 'LEADER')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/team-permissions.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/team-permissions.ts src/lib/team-permissions.test.ts
git commit -m "feat(teams): pure team-permission helpers with one-leader invariant"
```

---

## Task 3: Team↔board link resolver (TDD, mocks prisma)

**Files:**
- Create: `src/lib/team-board.ts`
- Test: `src/lib/team-board.test.ts`

This neutralizes the dual-key hazard: callers pass **either** `boardId` or `teamId`; the resolver fills the 1:1 partner so the two can never silently disagree.

- [ ] **Step 1: Write the failing test**

Create `src/lib/team-board.test.ts` (mirrors the `vi.mock('@/lib/prisma')` pattern in `src/lib/admin-audit.test.ts`):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mock of the prisma client used by the SUT.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    kanbanBoard: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { resolveTeamBoardLink } from './team-board'

const findUnique = prisma.kanbanBoard.findUnique as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  findUnique.mockReset()
})

describe('resolveTeamBoardLink', () => {
  it('returns both null when neither is provided', async () => {
    const out = await resolveTeamBoardLink({})
    expect(out).toEqual({ boardId: null, teamId: null })
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('derives teamId from a team board', async () => {
    findUnique.mockResolvedValueOnce({ teamId: 'team-1' }) // lookup by board id
    const out = await resolveTeamBoardLink({ boardId: 'board-1' })
    expect(out).toEqual({ boardId: 'board-1', teamId: 'team-1' })
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'board-1' }, select: { teamId: true } })
  })

  it('leaves teamId null for a personal board (no teamId)', async () => {
    findUnique.mockResolvedValueOnce({ teamId: null })
    const out = await resolveTeamBoardLink({ boardId: 'personal-1' })
    expect(out).toEqual({ boardId: 'personal-1', teamId: null })
  })

  it('derives boardId from a teamId', async () => {
    findUnique.mockResolvedValueOnce({ id: 'board-9' }) // lookup by teamId
    const out = await resolveTeamBoardLink({ teamId: 'team-9' })
    expect(out).toEqual({ boardId: 'board-9', teamId: 'team-9' })
    expect(findUnique).toHaveBeenCalledWith({ where: { teamId: 'team-9' }, select: { id: true } })
  })

  it('prefers boardId when both are passed (boardId is canonical from the UI)', async () => {
    findUnique.mockResolvedValueOnce({ teamId: 'team-from-board' })
    const out = await resolveTeamBoardLink({ boardId: 'board-1', teamId: 'ignored' })
    expect(out).toEqual({ boardId: 'board-1', teamId: 'team-from-board' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/lib/team-board.test.ts`
Expected: FAIL — "Failed to resolve import './team-board'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/team-board.ts`:

```ts
import { prisma } from '@/lib/prisma'

/**
 * Reconcile a task's board/team link. team↔board is 1:1 (KanbanBoard.teamId is unique).
 * `boardId` is canonical (the board switcher sends it); when present we derive `teamId`
 * from the board. If only `teamId` is given (programmatic team task creation), we derive
 * its board. Guarantees the two fields never disagree.
 */
export async function resolveTeamBoardLink(input: {
  boardId?: string | null
  teamId?: string | null
}): Promise<{ boardId: string | null; teamId: string | null }> {
  let boardId = input.boardId ?? null
  let teamId = input.teamId ?? null

  if (boardId) {
    const board = await prisma.kanbanBoard.findUnique({
      where: { id: boardId },
      select: { teamId: true },
    })
    teamId = board?.teamId ?? null
  } else if (teamId) {
    const board = await prisma.kanbanBoard.findUnique({
      where: { teamId },
      select: { id: true },
    })
    boardId = board?.id ?? null
  }

  return { boardId, teamId }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/lib/team-board.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/team-board.ts src/lib/team-board.test.ts
git commit -m "feat(teams): team-board link resolver to keep task boardId/teamId consistent"
```

---

## Task 4: Team lifecycle API — list & create

**Files:**
- Create: `src/app/api/user/teams/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/user/teams/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
})

const teamInclude = {
  members: {
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
  },
  board: { select: { id: true, name: true, color: true } },
  _count: { select: { members: true, tasks: true } },
}

// GET /api/user/teams — teams the current user belongs to (any role).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teams = await prisma.team.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: teamInclude,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ teams })
}

// POST /api/user/teams — any authenticated user can create a team; they become its first LEADER.
// Atomically creates the Team, the owner's LEADER membership, and the team's board.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, description, color } = createTeamSchema.parse(await req.json())

    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerId: session.user.id,
        members: { create: { userId: session.user.id, role: 'LEADER' } },
        board: { create: { name, color, ownerId: session.user.id } },
      },
      include: teamInclude,
    })

    await prisma.activity.create({
      data: {
        type: 'TEAM_JOINED',
        description: `Created team: ${name}`,
        userId: session.user.id,
        entityId: team.id,
        entityType: 'team',
      },
    })

    return NextResponse.json({ team }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('User teams POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Manual smoke test (logged-in session cookie required)**

Start the dev server (`npm run dev`) in another shell, then with a valid session cookie:

Run:
```bash
curl -s -X POST http://localhost:3000/api/user/teams \
  -H 'Content-Type: application/json' \
  -b "$SESSION_COOKIE" \
  -d '{"name":"Plan Smoke Team","color":"#3B82F6"}' | head -c 400
```
Expected: `201` JSON containing `"team"` with a `board` object and one `members[]` entry whose `role` is `LEADER`. Then `GET /api/user/teams` returns it. (Alternatively verify the rows in `npm run db:studio`: a `teams` row with `ownerId` set, a `team_members` row role=LEADER, a `kanban_boards` row with matching `teamId`.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/teams/route.ts
git commit -m "feat(teams): user-portal team list + create (auto owner membership and board)"
```

---

## Task 5: Team detail API — get, rename, delete

**Files:**
- Create: `src/app/api/user/teams/[id]/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/user/teams/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { canManageTeam } from '@/lib/team-permissions'

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

const teamInclude = {
  members: {
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
  },
  board: { select: { id: true, name: true, color: true } },
  _count: { select: { members: true, tasks: true } },
}

async function loadTeamForAuth(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      ownerId: true,
      board: { select: { id: true } },
      members: { select: { userId: true, role: true } },
    },
  })
}

// GET — any member of the team may view it.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const team = await prisma.team.findFirst({
    where: { id: params.id, members: { some: { userId: session.user.id } } },
    include: teamInclude,
  })
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ team })
}

// PATCH — only team leaders (any LEADER member) or admins. Renames team and mirrors name/color to its board.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const team = await loadTeamForAuth(params.id)
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin && !canManageTeam(session.user.id, team)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = updateTeamSchema.parse(await req.json())
    const updated = await prisma.team.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        // Mirror name/color onto the team's board so the switcher tab matches.
        // Guarded: admin-created teams may have no board, and a nested update of a
        // missing relation throws. Only update the board when one exists and a
        // board-relevant field changed.
        ...(team.board && (data.name !== undefined || data.color !== undefined)
          ? {
              board: {
                update: {
                  ...(data.name !== undefined ? { name: data.name } : {}),
                  ...(data.color !== undefined ? { color: data.color } : {}),
                },
              },
            }
          : {}),
      },
      include: teamInclude,
    })
    return NextResponse.json({ team: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Team PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — only team leaders or admins. Cascade removes the team's board, memberships, and tasks
// (Task.team and KanbanBoard.team both onDelete: Cascade).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const team = await loadTeamForAuth(params.id)
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin && !canManageTeam(session.user.id, team)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.team.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
```

> **Note for the executor / Plan 2:** deleting a team cascades to its tasks (existing `Task.team` is `onDelete: Cascade`). The Plan-2 delete UI must show a confirmation warning that team tasks will be removed.

- [ ] **Step 2: Verify types compile**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

With a team id from Task 4 and the owner's session cookie:
```bash
curl -s -X PATCH http://localhost:3000/api/user/teams/$TEAM_ID -H 'Content-Type: application/json' -b "$SESSION_COOKIE" -d '{"name":"Renamed Team","color":"#EF4444"}' | head -c 300
```
Expected: `200` with the updated team and its `board.name`/`board.color` updated to match. A non-member cookie should get `403`/`404`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/teams/[id]/route.ts
git commit -m "feat(teams): team detail get/rename/delete with leader auth"
```

---

## Task 6: Team membership API — list & add by reference

**Files:**
- Create: `src/app/api/user/teams/[id]/members/route.ts`

Requirement 4: adding an existing user is **by reference only** — set their team role, never edit their profile.

- [ ] **Step 1: Write the route**

Create `src/app/api/user/teams/[id]/members/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { canManageTeam } from '@/lib/team-permissions'

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['LEADER', 'MEMBER']).default('MEMBER'),
})

async function loadTeamForAuth(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, ownerId: true, members: { select: { userId: true, role: true } } },
  })
}

// GET — any team member may list the roster.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isMember = await prisma.teamMember.findFirst({
    where: { teamId: params.id, userId: session.user.id },
    select: { id: true },
  })
  if (!isMember) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const members = await prisma.teamMember.findMany({
    where: { teamId: params.id },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true, positionTitle: true } } },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  })
  return NextResponse.json({ members })
}

// POST — add an existing active user to the team by reference (role optional, default MEMBER).
// Does NOT modify the added user's profile and does NOT touch reportsToId/LeaderMembership.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const team = await loadTeamForAuth(params.id)
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin && !canManageTeam(session.user.id, team)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { userId, role } = addMemberSchema.parse(await req.json())

    const user = await prisma.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true } })
    if (!user) return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })

    if (team.members.some((m) => m.userId === userId)) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 400 })
    }

    const member = await prisma.teamMember.create({
      data: { teamId: params.id, userId, role },
      include: { user: { select: { id: true, name: true, email: true, image: true, role: true, positionTitle: true } } },
    })
    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Team members POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

Add an existing active user id to the team:
```bash
curl -s -X POST http://localhost:3000/api/user/teams/$TEAM_ID/members -H 'Content-Type: application/json' -b "$SESSION_COOKIE" -d "{\"userId\":\"$OTHER_USER_ID\",\"role\":\"LEADER\"}" | head -c 300
```
Expected: `201` with the new member (role `LEADER`). Re-adding the same user → `400` "already a team member". `GET .../members` lists both.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/teams/[id]/members/route.ts
git commit -m "feat(teams): list and add team members by reference with role"
```

---

## Task 7: Team membership API — promote/demote & remove (≥1-leader invariant)

**Files:**
- Create: `src/app/api/user/teams/[id]/members/[userId]/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/user/teams/[id]/members/[userId]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { canManageTeam, wouldLeaveTeamLeaderless } from '@/lib/team-permissions'

const patchSchema = z.object({ role: z.enum(['LEADER', 'MEMBER']) })

async function loadTeamForAuth(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, ownerId: true, members: { select: { userId: true, role: true } } },
  })
}

// PATCH — promote/demote a member. Blocked if it would leave the team with zero leaders.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const team = await loadTeamForAuth(params.id)
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin && !canManageTeam(session.user.id, team)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!team.members.some((m) => m.userId === params.userId)) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  try {
    const { role } = patchSchema.parse(await req.json())
    if (wouldLeaveTeamLeaderless(team.members, { userId: params.userId, action: 'setRole', role })) {
      return NextResponse.json({ error: 'A team must keep at least one leader' }, { status: 400 })
    }
    const member = await prisma.teamMember.update({
      where: { userId_teamId: { userId: params.userId, teamId: params.id } },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
    })
    return NextResponse.json({ member })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Team member PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — remove a member. Blocked if it would leave the team with zero leaders.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const team = await loadTeamForAuth(params.id)
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // A member may remove themselves (leave); otherwise leader/admin only.
  const isSelf = params.userId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'
  if (!isSelf && !isAdmin && !canManageTeam(session.user.id, team)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!team.members.some((m) => m.userId === params.userId)) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }
  if (wouldLeaveTeamLeaderless(team.members, { userId: params.userId, action: 'remove' })) {
    return NextResponse.json({ error: 'A team must keep at least one leader' }, { status: 400 })
  }

  await prisma.teamMember.delete({
    where: { userId_teamId: { userId: params.userId, teamId: params.id } },
  })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run type-check`
Expected: PASS. (Note the composite unique key is `userId_teamId` per `@@unique([userId, teamId])` in `TeamMember`.)

- [ ] **Step 3: Manual smoke test of the invariant**

With a team that has exactly one leader (the owner), try to demote that owner:
```bash
curl -s -X PATCH http://localhost:3000/api/user/teams/$TEAM_ID/members/$OWNER_ID -H 'Content-Type: application/json' -b "$SESSION_COOKIE" -d '{"role":"MEMBER"}'
```
Expected: `400` "A team must keep at least one leader". Promote a second member to LEADER first, then the demote succeeds (`200`).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/teams/[id]/members/[userId]/route.ts
git commit -m "feat(teams): promote/demote/remove members enforcing one-leader invariant"
```

---

## Task 8: Make `/api/boards` team-aware (team boards in the switcher)

**Files:**
- Modify: `src/app/api/boards/route.ts:27-39`

- [ ] **Step 1: Update the GET `where` to a 3-way OR**

In `src/app/api/boards/route.ts`, replace the `findMany` block in `GET` (lines 27-39) with:

```ts
  const boards = await prisma.kanbanBoard.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
        // Team boards: visible to every member of the owning team.
        { team: { members: { some: { userId: session.user.id } } } },
      ],
    },
    include: {
      ...memberInclude,
      owner: { select: { id: true, name: true, email: true, image: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
```

(The added `team` include lets the Plan-2 UI tell team boards apart from personal ones and link "Manage team".)

- [ ] **Step 2: Verify types compile**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

As a non-owner member of a team (from Task 6), call `GET /api/boards`:
```bash
curl -s http://localhost:3000/api/boards -b "$MEMBER_SESSION_COOKIE" | head -c 500
```
Expected: the response `boards[]` includes the team's board (with a non-null `team` object), even though the member neither owns it nor is a `KanbanBoardMember`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/boards/route.ts
git commit -m "feat(teams): surface team boards to all team members in the board list"
```

---

## Task 9: Protect team boards from the personal-board routes

**Files:**
- Modify: `src/app/api/boards/[id]/route.ts:31-34,76-79`

Team boards must be managed only through `/api/user/teams/*`. The personal `PATCH`/`DELETE` already match owner-only (`findFirst({ where: { id, ownerId } })`); add an explicit refusal so even the owner can't rename/orphan a team board here.

- [ ] **Step 1: Refuse team boards in PATCH**

In `src/app/api/boards/[id]/route.ts`, in `PATCH`, replace lines 31-34:

```ts
    const board = await prisma.kanbanBoard.findFirst({
      where: { id: params.id, ownerId: session.user.id },
    })
    if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })
```

with:

```ts
    const board = await prisma.kanbanBoard.findFirst({
      where: { id: params.id, ownerId: session.user.id },
      select: { id: true, teamId: true },
    })
    if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (board.teamId) {
      return NextResponse.json(
        { error: 'Team boards are managed from the team page' },
        { status: 409 }
      )
    }
```

- [ ] **Step 2: Refuse team boards in DELETE**

In the same file, in `DELETE`, replace lines 76-79:

```ts
    const board = await prisma.kanbanBoard.findFirst({
      where: { id: params.id, ownerId: session.user.id },
    })
    if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })
```

with:

```ts
    const board = await prisma.kanbanBoard.findFirst({
      where: { id: params.id, ownerId: session.user.id },
      select: { id: true, teamId: true },
    })
    if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (board.teamId) {
      return NextResponse.json(
        { error: 'Delete the team to remove its board' },
        { status: 409 }
      )
    }
```

- [ ] **Step 3: Verify types compile**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Manual smoke test**

As the team owner, try `PATCH`/`DELETE /api/boards/$TEAM_BOARD_ID`:
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE http://localhost:3000/api/boards/$TEAM_BOARD_ID -b "$SESSION_COOKIE"
```
Expected: `409`. A personal board still deletes with `200`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/boards/[id]/route.ts
git commit -m "fix(teams): personal board routes refuse team boards (managed via team API)"
```

---

## Task 10: Derive task `teamId` from the team board on creation

**Files:**
- Modify: `src/app/api/tasks/route.ts` (POST handler)

**Context (read before editing — verified against the current handler):** `createTaskSchema` (lines 19-53) has **no `teamId` field** — only `boardId`. The POST handler destructures `boardId` (line 525) and every `prisma.task.create` call hardcodes `teamId: null` (with the comment "No longer using teams" / "// No longer using teams"). There are **three** create calls:
1. Recurring **template** (data block starting ~line 582, `teamId: null` at ~line 593) — a hidden template; **leave it `teamId: null`**.
2. Recurring **first instance** (data block ~line 613, `teamId: null` at ~line 624, `boardId: boardId || null` at ~line 635) — **set teamId here**.
3. Non-recurring **main task** (data block ~line 682, `teamId: null` at ~line 693, `boardId: boardId || null` at ~line 705) — **set teamId here**.

Because `teamId` is currently always `null` from this route, this change is purely additive — it cannot regress existing task creation. (TEAM/COLLABORATION task types use `TaskTeamMember`/`TaskCollaborator` join rows, not `Task.teamId`, so they are unaffected.)

- [ ] **Step 1: Import the resolver**

In `src/app/api/tasks/route.ts`, add after the existing helper imports (the import block ends around line 10, e.g. after `import { generateOccurrenceDates, buildRRuleString } from '@/lib/recurring'`):

```ts
import { resolveTeamBoardLink } from '@/lib/team-board'
```

- [ ] **Step 2: Compute the link once, after assignee verification**

In the `POST` handler, find the assignee-verification block that ends near line 542 (the closing `}` of `if (assigneeId) { ... }`). Immediately **after** it (and before the `// Auto-set startDate` comment at ~line 544), insert:

```ts
    // If this task targets a team board, derive its teamId from the board so
    // team-scoped queries work. boardId is canonical (sent by the board switcher);
    // personal boards / no board yield teamId = null. Additive: teamId was always null here.
    const link = await resolveTeamBoardLink({ boardId: boardId ?? null })
```

- [ ] **Step 3: Set `teamId`/`boardId` from `link` on the recurring first instance**

In the recurring first-instance create (data block ~line 613-636), replace:

```ts
            teamId: null as string | null,
```
with:
```ts
            teamId: link.teamId,
```
and replace:
```ts
            boardId: boardId || null,
```
with:
```ts
            boardId: link.boardId,
```

(Leave the **template** create's `teamId: null` at ~line 593 unchanged — the template has no board and stays team-less.)

- [ ] **Step 4: Set `teamId`/`boardId` from `link` on the non-recurring main task**

In the main create (data block ~line 682-706), replace:

```ts
          teamId: null, // No longer using teams
```
with:
```ts
          teamId: link.teamId, // set when created on a team board
```
and replace:
```ts
          boardId: boardId || null,
```
with:
```ts
          boardId: link.boardId,
```

- [ ] **Step 5: Verify types compile**

Run: `npm run type-check`
Expected: PASS. (`link.teamId`/`link.boardId` are `string | null`, matching the `Task.teamId`/`Task.boardId` optional columns.)

- [ ] **Step 6: Manual smoke test**

Create a task on a team board:
```bash
curl -s -X POST http://localhost:3000/api/tasks -H 'Content-Type: application/json' -b "$SESSION_COOKIE" \
  -d "{\"title\":\"Team board task\",\"priority\":\"MEDIUM\",\"taskType\":\"INDIVIDUAL\",\"boardId\":\"$TEAM_BOARD_ID\"}" | head -c 300
```
Expected: created task whose `teamId` equals the team that owns `$TEAM_BOARD_ID` (verify in `db:studio`). A task created on a **personal** board (or with no `boardId`) still has `teamId: null`.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/tasks/route.ts
git commit -m "feat(teams): derive task teamId from team board on create"
```

---

## Task 11: Requirement 4 — remove the unused member-profile editor

**Files:**
- Modify: `src/app/api/user/team-members/[id]/route.ts:134-199`

Verified earlier: no UI or script calls this `PATCH`. Removing it ensures a leader can never edit an added user's profile.

- [ ] **Step 1: Delete the `PATCH` handler**

In `src/app/api/user/team-members/[id]/route.ts`, delete the entire `export async function PATCH(...) { ... }` block (lines 134-199), leaving `GET` and `DELETE` intact.

- [ ] **Step 2: Verify types compile**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Confirm no caller broke**

Run:
```bash
grep -rn "team-members/" src --include="*.ts" --include="*.tsx" | grep -iE "method:\s*'PATCH'|method:\s*\"PATCH\""
```
Expected: no output (no caller used PATCH on this endpoint).

- [ ] **Step 4: Manual check**

Run:
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH http://localhost:3000/api/user/team-members/$ANY_ID -H 'Content-Type: application/json' -b "$SESSION_COOKIE" -d '{"name":"x"}'
```
Expected: `405` (Method Not Allowed — the route no longer exports PATCH).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/user/team-members/[id]/route.ts
git commit -m "fix(teams): remove unused member-profile PATCH (members added by reference only)"
```

---

## Task 12: Full backend verification

- [ ] **Step 1: Run the unit suite**

Run: `npm run test`
Expected: PASS, including `team-permissions.test.ts` and `team-board.test.ts`.

- [ ] **Step 2: Type-check the whole project**

Run: `npm run type-check`
Expected: PASS. (Pre-existing `prisma/seed.ts` `username` errors are known/ignored per project memory — they must be the *only* pre-existing failures, and unrelated to teams.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors in the files this plan added/changed.

- [ ] **Step 4: End-to-end API walk-through (manual)**

With a dev server and a session cookie, in order: create a team → it returns a board → add a second user as LEADER → confirm `GET /api/boards` shows the team board for that second user → create a task on the team board → confirm its `teamId` is set → try to demote the last leader (expect 400) → delete the team (expect cascade). Record the results.

- [ ] **Step 5: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore(teams): backend verification fixups"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** Req 1 (add other leaders) → Tasks 6/7 (`role: LEADER`, promote). Req 2 (multiple teams, own board) → Tasks 1/4/5 (any user creates many teams, each with an auto board). Req 3 (members see team boards) → Task 8 (team-aware `/api/boards`) + Task 10 (`teamId` on team-board tasks); the member *view* UI is Plan 2. Req 4 (no editing member details) → Task 11. Two-layer model (reports-to untouched) → no task changes `LeaderMembership`/`reportsToId`. Equal-rights leaders + ≥1-leader invariant → Task 2 + Tasks 5/7.
- **Placeholder scan:** none. The one "replace `validatedData` with the actual parsed-body variable name" instruction in Task 10 is a deliberate bind-to-real-code step (the handler's variable name must be read at execution), with exact surrounding code given.
- **Type consistency:** composite key `userId_teamId` matches `@@unique([userId, teamId])`; `canManageTeam`/`wouldLeaveTeamLeaderless`/`resolveTeamBoardLink` signatures are used exactly as defined; `teamInclude`/`memberInclude` shapes are consistent across routes.
- **Out of scope (Plan 2):** "My Teams" page, team-management dialog (add/remove/promote/demote UI), member by-team task view, switcher "Manage team" affordance + nav entry.
- **Known intentional gap until Plan 2:** the existing board switcher shows an edit/delete dropdown to a board's `ownerId` (the team creator). After Task 9, those actions return `409` for team boards. So between Plan 1 and Plan 2 the creator sees edit/delete buttons on team-board tabs that error if used. Plan 2 hides/repoints them ("Manage team"). This is deliberate, not a regression — personal boards are unaffected.
