# User Portal Teams — Design

**Date:** 2026-06-10
**Status:** Approved (design), pending implementation plan

## Problem

The user portal today manages people through a single **flat roster** per leader, backed
by the `LeaderMembership` model (a `leaderId → memberId` edge) plus `User.reportsToId`.
This roster has no concept of separate teams, no per-team roles, and no per-team task
boards. Members currently see one flat "all tasks" list of everything they are involved
in.

The desired behaviour:

1. Leaders can add **other leaders** to a team (not just plain members).
2. Leaders can form **multiple teams**, each with its **own task board**.
3. Members see **team task boards scoped to their team(s)**, instead of one global list.
4. Adding an **existing user** to a team must **not** let the adder edit that user's
   profile details.

## Core decision: two separate layers

The reports-to hierarchy and teams are **two distinct, coexisting layers** — by design,
confirmed with the product owner:

- **Reports-to (org hierarchy)** — *stable*. Backed by the existing `LeaderMembership`
  model and `User.reportsToId`. **Unchanged by this work.** Joining a team never alters
  who you report to. A person's reporting relationships can still grow when another leader
  adds them, exactly as today.
- **Teams (project groupings)** — *flexible, new*. A team is a real, persistent entity a
  user spins up for a given task/project, pulling in whoever that work needs. The same
  person can sit in many teams at once, added by different leaders. Membership in a team is
  purely additive and orthogonal to reports-to.

`LeaderMembership` is **not** replaced or migrated. Teams are an additive layer built on
the already-existing (but currently admin-only) `Team` / `TeamMember` models.

## Data model

All schema changes are **additive and nullable** — safe for existing production data
(deployed on Alibaba ECS). No destructive migration; `LeaderMembership` and `reportsToId`
are untouched.

### `Team` (existing model, extended)
- Add `ownerId String?` — the user who created the team (creator-of-record). Nullable so
  existing **admin-created** teams remain valid with `ownerId = null`.
- A user may own/create **many** teams.

### `TeamMember` (existing model, reused as-is)
- Existing `role TeamMemberRole (LEADER | MEMBER)` becomes the **"manage this team" toggle**:
  - `LEADER` — full team rights (see *Permissions* below).
  - `MEMBER` — view the team board and work on tasks assigned to them.
- Existing `@@unique([userId, teamId])` already allows a user to be in **many teams**.

### `KanbanBoard` (existing model, extended)
- Add `teamId String?` (nullable, unique when set) — links a board to a team.
  - `teamId != null` → **team board** (one per team, auto-created with the team).
  - `teamId == null` → **personal board** (existing per-user behaviour, owned via `ownerId`).
- `ownerId` stays required by the current model; for team boards it is set to the team
  creator. (Implementation detail to confirm in the plan: whether to relax `ownerId` or
  keep it pointed at the creator — keeping it at the creator is simplest and non-breaking.)

### `Task` (existing model, reused as-is)
- Tasks created inside a team carry the existing `teamId`. A team's board shows tasks where
  `task.teamId == team.id`, rendered in the existing `TaskStatus` columns
  (TODO / IN_PROGRESS / IN_REVIEW / COMPLETED / CANCELLED).
- `Task.boardId` may also be set to the team's board for direct linkage; the canonical
  filter is `teamId`.

## Permissions

Team permissions are **per-team**, driven by `TeamMember.role`, and are **orthogonal** to
the global `User.role` (ADMIN / LEADER / MEMBER).

- **Create a team:** any authenticated user. The creator becomes the first team `LEADER`
  and is recorded as `Team.ownerId`.
- **Team `LEADER` (creator or any promoted member) — full, equal rights:**
  - create / edit / assign / delete tasks within the team
  - add / remove members
  - toggle any member's role between `LEADER` and `MEMBER` (promote/demote)
  - delete the team
  - All leaders are **equal** — there is no privileged "super owner". `ownerId` is a
    creator-of-record only and confers no extra authority.
- **Team `MEMBER`:**
  - view the team board
  - update status / work on tasks assigned to them (subject to existing task-status rules)
  - cannot manage members, tasks of others, or the team itself.
- **Invariant:** a team must always have **at least one** `LEADER`. The last leader cannot
  be demoted or removed while members remain; the API enforces this.

## Adding existing users (Requirement 4)

Adding an existing user to a team adds them **by reference only**:
- The adder may set the new member's **team role** (member vs leader).
- The adder **cannot edit the user's profile** (name, email, position, contact, etc.) —
  those details are owned by the user / admin.
- Concretely: **remove the profile-edit (PATCH) capability** that the current add-member
  flow exposes on `/api/user/team-members/[id]`. (Scope note: this PATCH lives in the
  reports-to roster flow; the new team flow must not reintroduce profile editing.)

## Views & UX

- **Leaders:** a **"My Teams"** area lists the teams they lead/belong to. Selecting a team
  opens its **board** plus **member management** (add/remove, role toggle).
- **Members:** the task view becomes **organized by team** — the member picks from the
  teams they belong to and sees that team's board, replacing the single flat "all tasks"
  list (Requirement 3).
- **Fallback (no empty screens):** a user who belongs to no team, plus individual tasks
  assigned directly to a user, must still be visible. Per-team boards are *additive* to the
  existing personal/individual task visibility, not a hard replacement that could hide a
  user's own work.

## Migration & compatibility notes

- Schema changes are additive + nullable → no backfill required for correctness.
- Existing **admin-created** `Team` rows: `ownerId = null`, no auto board until one is
  created. They continue to function in the admin portal.
- Existing **personal** `KanbanBoard` rows: `teamId = null` → unchanged behaviour.
- `LeaderMembership` rows and `User.reportsToId`: **untouched**.
- The member task-view change is behavioural; the fallback above guarantees no user loses
  visibility of work assigned to them.

## Out of scope

- Reworking the reports-to hierarchy or `LeaderMembership`.
- Per-team **custom columns** beyond the existing `TaskStatus` set (boards use the existing
  status columns).
- Admin-portal team management changes beyond remaining compatible with the new nullable
  fields.

## Open implementation details (resolve in the plan, not blocking design)

- Exact API surface for user-facing team CRUD (`/api/user/teams` vs reusing `/api/teams`)
  and member/role management endpoints.
- Whether to keep `KanbanBoard.ownerId` required (point at creator) or relax it for team
  boards.
- Precise shape of the member "by team" task view (selector vs grouped sections) and how
  individual/assigned tasks are surfaced alongside team boards.
