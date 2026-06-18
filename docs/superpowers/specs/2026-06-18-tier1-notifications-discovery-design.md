# Tier 1: Notifications & Discovery — Design Spec

**Date:** 2026-06-18
**Status:** Approved (design); pending implementation plan
**Area:** `src/lib/`, `src/app/api/`, `src/app/user/`, `src/components/`, `prisma/schema.prisma`, `public/`

## Goal

Close the four highest-value "operational loop" gaps so the app reaches people, surfaces
what's happening, and is searchable — comparable to Jira/Monday/Connecteam:
1. **Notifications that leave the app** — email (Resend) + web push.
2. **Inbox + activity feed** — surface notifications and the team activity log.
3. **Global search** — across tasks, comments, people.
4. **@mentions in comments** — notify mentioned users.

## What already exists (build on, don't rebuild)

- `Notification` model: `userId, type, message, isRead, entityId, entityType, readAt`,
  indexed on `(userId,isRead)` and `(userId,createdAt)`.
- `src/lib/notifications.ts`: `createNotification()` (with dedup) plus `notifyTaskAssigned`,
  `notifySubtaskAssigned`, `notifyTaskUpdated`, `notifyTaskCompleted`,
  `notifyTaskSubmittedForReview`, `notifyTaskOverdue`, `notifyCommentAdded`. In-app + Socket.IO.
- `/api/notifications` route and `NotificationDropdown` / `AdminNotificationDropdown` bell UI.
- `Activity` model + a global activity log (FK columns indexed via the #8 work).
- `/api/users/search` (people search). No task/comment search.

## Decisions (settled in brainstorming)

| Decision | Choice |
|---|---|
| Out-of-app channels | **Email (Resend) + Web push (VAPID)** |
| Email transport | **Resend** (`RESEND_API_KEY` + verified `hotelsogo-ai.com`) |
| Notification preferences | **Global per-channel toggles** (`emailNotifications`, `pushNotifications`); per-type later |
| Activity feed placement | **A tab inside the Inbox page**, not a separate route |
| Build order | Phase A (delivery) → B (inbox+feed) → C (search) → D (@mentions) |

## Cross-cutting: delivery layer

Wrap the existing notification path: after `createNotification()` writes the in-app row +
Socket.IO emit, fire **email + web push** for that user, **best-effort and non-blocking**
(a delivery failure is logged, never thrown — it must not break the task action that
triggered it), gated by the user's prefs. New internal function `deliverNotification(userId, notification)`
called at the end of `createNotification`.

## Phase A — Reach people (email + web push)

**New:**
- `src/lib/email.ts` — Resend client + `sendNotificationEmail(to, notification)` with a
  plain, branded HTML template. No-ops (logs) if `RESEND_API_KEY` unset.
- `src/lib/web-push.ts` — `web-push` lib configured with VAPID; `sendWebPush(subscription, payload)`.
  No-ops if VAPID env unset.
- `prisma` model `PushSubscription { id, userId, endpoint @unique, p256dh, auth, createdAt }`
  (+ migration). User model gains `emailNotifications Boolean @default(true)`,
  `pushNotifications Boolean @default(true)` (+ migration).
- `public/sw.js` — service worker handling `push` (show notification) and `notificationclick`
  (focus/open the deep link).
- Client hook `useWebPush()` — registers the SW, requests permission, subscribes, POSTs the
  subscription. An "Enable browser notifications" control in settings.
- APIs: `POST /api/push/subscribe` (upsert subscription), `DELETE` (unsubscribe);
  `GET/PUT /api/notifications/preferences`.

**Env (must be set on staging for live delivery):** `RESEND_API_KEY`, `EMAIL_FROM`
(e.g. `notifications@hotelsogo-ai.com`), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`. VAPID keys generated during build of this phase.

**Honest dependencies:** email sends only after the Resend key + domain verification;
web push requires VAPID env + the user granting browser permission. Both degrade gracefully
(in-app notification still works) when unconfigured.

## Phase B — Inbox + Activity feed

- Enhance `NotificationDropdown`: mark-read on click, deep-link to `entityType/entityId`,
  "mark all read".
- New page `/user/notifications` (Inbox): paginated list, unread filter, mark-all-read,
  click → open the task modal / route. Two tabs: **Inbox** (the user's notifications) and
  **Activity** (team activity feed).
- `GET /api/activities?scope=...` — recent `Activity` rows the viewer may see (their teams /
  reports), human-readable, filterable by person/team. Uses the existing indexes.

## Phase C — Global search

- `GET /api/search?q=` returns grouped results: **tasks** (title/description, scoped to the
  viewer's access — assignee/creator/team/board membership), **comments** (on accessible
  tasks), **people** (reuse `/api/users/search` logic). Capped per group (e.g. 8 each).
- Pure `buildSearchClauses(q)` helper (vitest-tested) for the Prisma `where`/`contains`.
- UI: a header search input → grouped dropdown (Tasks / People / Comments) → click to open.
  Cmd-K palette is optional polish, not required for v1.

## Phase D — @mentions in comments

- Comment composer (in `TaskViewModal`) gains an `@`-triggered autocomplete of the task's
  members/collaborators/assignee.
- Pure `parseMentions(text, candidates)` helper (vitest-tested) → list of mentioned userIds.
- On comment create (`/api/tasks/[id]/comments` or wherever comments POST), after saving,
  fire a `MENTION` notification per mentioned user via `createNotification` → which now also
  emails/pushes (Phase A). Add `MENTION` to the `NotificationType` enum if absent.

## Testing

- Unit (vitest): email template render, `parseMentions`, `buildSearchClauses`, and the
  delivery gate (prefs → which channels fire). These carry the correctness-critical logic.
- UI + live delivery verified on staging (no component/DB-integration harness exists).

## Out of scope (later)

Per-type notification preferences, digest emails (Tier 3 #25), Slack/Teams channels,
mobile push (mobile app is local-only), Cmd-K command palette, saved searches.

## Risks / notes

- Delivery must be non-blocking and failure-isolated — wrap each channel in try/catch.
- Web push needs HTTPS (staging is behind the proxy — OK) and a stable service-worker scope.
- `docs/` is gitignored but force-added; this spec committed via `git add -f`.
