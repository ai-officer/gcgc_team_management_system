/**
 * Backfill a KanbanBoard for every Team that doesn't have one.
 *
 * Teams created before the "team gets its own board" feature (and any created
 * via endpoints that didn't make a board) have no kanban board, so the
 * "Open board" button never appears. This creates one board per board-less
 * team (KanbanBoard.teamId is @unique => exactly one board per team).
 *
 * Board owner: the team's ownerId if set, else a LEADER member, else any
 * member. A team with no owner and no members is skipped and logged (a board
 * needs a User owner under the current schema).
 *
 * Idempotent: re-running only touches teams that still lack a board.
 *
 * Run:  npx tsx scripts/backfill-team-boards.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const teams = await prisma.team.findMany({
    where: { board: null },
    select: {
      id: true,
      name: true,
      ownerId: true,
      members: { select: { userId: true, role: true } },
    },
  })

  console.log(`Found ${teams.length} team(s) without a board.`)
  let created = 0
  const skipped: string[] = []

  for (const team of teams) {
    const ownerId =
      team.ownerId ||
      team.members.find(m => m.role === 'LEADER')?.userId ||
      team.members[0]?.userId

    if (!ownerId) {
      skipped.push(team.name)
      continue
    }

    await prisma.kanbanBoard.create({
      data: { name: team.name, ownerId, teamId: team.id },
    })
    created++
    console.log(`  ✓ board created for "${team.name}"`)
  }

  console.log(`\nDone. Created ${created} board(s).`)
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} team(s) with no owner/members: ${skipped.join(', ')}`)
  }
}

main()
  .catch(e => {
    console.error('Backfill failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
