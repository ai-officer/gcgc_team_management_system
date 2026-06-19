/**
 * Phase 1 backfill for the task-model redesign.
 *  - Sets `isCascading = true` on tasks that were `taskType === 'CASCADING'`.
 *  - Populates the new flat `TaskAssignee` list from each task's existing
 *    assignee + teamMembers + collaborators (de-duplicated).
 *
 * Idempotent — only adds missing rows; safe to re-run. The app still reads the
 * old fields after this; later phases switch reads/writes over.
 *
 * Run:  npx tsx scripts/backfill-task-assignees.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const casc = await prisma.task.updateMany({
    where: { taskType: 'CASCADING', isCascading: false },
    data: { isCascading: true },
  })
  console.log(`isCascading set on ${casc.count} cascading task(s)`)

  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      assigneeId: true,
      teamMembers: { select: { userId: true } },
      collaborators: { select: { userId: true } },
      assignees: { select: { userId: true } },
    },
  })

  let created = 0
  for (const t of tasks) {
    const existing = new Set(t.assignees.map(a => a.userId))
    const wanted = new Set<string>()
    if (t.assigneeId) wanted.add(t.assigneeId)
    t.teamMembers.forEach(m => wanted.add(m.userId))
    t.collaborators.forEach(c => wanted.add(c.userId))
    const toAdd = Array.from(wanted).filter(u => !existing.has(u))
    if (toAdd.length) {
      await prisma.taskAssignee.createMany({
        data: toAdd.map(userId => ({ taskId: t.id, userId })),
        skipDuplicates: true,
      })
      created += toAdd.length
    }
  }
  console.log(`Created ${created} task-assignee row(s) across ${tasks.length} task(s)`)
}

main()
  .catch(e => { console.error('Backfill failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
