import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// READ-ONLY diagnostic. Counts tasks that bear the signature of the old
// "assign to member" flow: a TEAM task whose assignee is also its creator
// (i.e. the leader assigned it to themselves) and that has team members.
// These are the tasks currently hidden from the member in Member Management.
async function main() {
  const teamTasks = await prisma.task.findMany({
    where: { taskType: 'TEAM', isRecurring: false, parentId: null },
    select: {
      id: true,
      assigneeId: true,
      creatorId: true,
      assignedById: true,
      _count: { select: { teamMembers: true } },
    },
  })

  const leaderIsAssignee = teamTasks.filter(t => t.assigneeId && t.assigneeId === t.creatorId)
  const oneMember = leaderIsAssignee.filter(t => t._count.teamMembers === 1)
  const multiMember = leaderIsAssignee.filter(t => t._count.teamMembers > 1)
  const zeroMember = leaderIsAssignee.filter(t => t._count.teamMembers === 0)

  console.log('--- TEAM task assignment diagnostic (read-only) ---')
  console.log('Total non-recurring top-level TEAM tasks:', teamTasks.length)
  console.log('  ...where assignee === creator (leader self-assigned):', leaderIsAssignee.length)
  console.log('     exactly 1 team member  (old "assign to member" signature):', oneMember.length)
  console.log('     >1 team member         (likely real team tasks):', multiMember.length)
  console.log('     0 team members         (solo team task):', zeroMember.length)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
