import type { TaskStatus } from '@prisma/client'

// A task is never counted as "overdue" while it is in one of these states:
//  - COMPLETED / CANCELLED: the work is finished or called off.
//  - IN_REVIEW: the assignee has submitted and it's waiting on a leader/owner
//    to approve. That wait is not the assignee's fault, so a past-due task that
//    is already In Review must not show as overdue.
//  - BACKLOG: parked work outside the active flow — never overdue while parked.
export const OVERDUE_EXCLUDED_STATUSES: TaskStatus[] = ['COMPLETED', 'CANCELLED', 'IN_REVIEW', 'BACKLOG']

// True when a task in this status is eligible to be considered overdue (caller
// still applies the due-date check). Used for in-memory checks; Prisma queries
// use `status: { notIn: OVERDUE_EXCLUDED_STATUSES }`.
export function isOverdueStatus(status: string | null | undefined): boolean {
  return !!status && !OVERDUE_EXCLUDED_STATUSES.includes(status as TaskStatus)
}
