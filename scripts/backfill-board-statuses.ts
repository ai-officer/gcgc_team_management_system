import { PrismaClient, TaskStatus } from '@prisma/client'

const prisma = new PrismaClient()

// The four seeded defaults (isDefault=true), mapping 1:1 to the categories so an
// un-customized board behaves exactly as before. Colors are hex accents used for
// custom statuses; default columns keep their existing styling in the UI.
const DEFAULTS: { name: string; category: TaskStatus; color: string; position: number }[] = [
  { name: 'To Do', category: 'TODO', color: '#94A3B8', position: 0 },
  { name: 'In Progress', category: 'IN_PROGRESS', color: '#3B82F6', position: 1 },
  { name: 'In Review', category: 'IN_REVIEW', color: '#F59E0B', position: 2 },
  { name: 'Completed', category: 'COMPLETED', color: '#22C55E', position: 3 },
]

async function main() {
  const boards = await prisma.kanbanBoard.findMany({ select: { id: true } })

  // 1) Seed the four default statuses on every board (idempotent via @@unique).
  let created = 0
  for (const b of boards) {
    const res = await prisma.boardStatus.createMany({
      data: DEFAULTS.map((d) => ({ ...d, boardId: b.id, isDefault: true })),
      skipDuplicates: true,
    })
    created += res.count
  }
  console.log(`Seeded ${created} default statuses across ${boards.length} boards`)

  // 2) Point each board task at its category's default status (only where unset).
  let updated = 0
  for (const cat of DEFAULTS) {
    const defaults = await prisma.boardStatus.findMany({
      where: { isDefault: true, category: cat.category },
      select: { id: true, boardId: true },
    })
    const byBoard = new Map(defaults.map((d) => [d.boardId, d.id]))
    const tasks = await prisma.task.findMany({
      where: { boardId: { not: null }, status: cat.category, customStatusId: null },
      select: { id: true, boardId: true },
    })
    for (const t of tasks) {
      const sid = t.boardId ? byBoard.get(t.boardId) : undefined
      if (sid) {
        await prisma.task.update({ where: { id: t.id }, data: { customStatusId: sid } })
        updated++
      }
    }
  }
  console.log(`Linked ${updated} board tasks to their default status`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
