/**
 * Fix tasks whose progress doesn't match their status:
 *  - COMPLETED tasks must be 100% (the "Completed task at 45%" bug)
 *  - TODO tasks must be 0%
 *
 * Going forward, both task create and PATCH derive progress from status, so this
 * only repairs rows created before that fix. Idempotent — safe to re-run.
 *
 * Run:  npx tsx scripts/sync-task-progress-to-status.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const completed = await prisma.task.updateMany({
    where: { status: 'COMPLETED', progressPercentage: { not: 100 } },
    data: { progressPercentage: 100 },
  })
  const todo = await prisma.task.updateMany({
    where: { status: 'TODO', progressPercentage: { not: 0 } },
    data: { progressPercentage: 0 },
  })
  console.log(`Synced: ${completed.count} COMPLETED → 100%, ${todo.count} TODO → 0%`)
}

main()
  .catch(e => { console.error('Sync failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
