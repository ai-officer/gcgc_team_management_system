import { Prisma, PrismaClient, TaskStatus } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

// The four defaults seeded on every board (isDefault), mapping 1:1 to the
// TaskStatus categories so an un-customized board behaves exactly as before.
// BACKLOG is intentionally NOT a board column — it's a hidden archive state.
export const DEFAULT_BOARD_STATUSES: { name: string; category: TaskStatus; color: string; position: number }[] = [
  { name: 'To Do', category: 'TODO', color: '#94A3B8', position: 0 },
  { name: 'In Progress', category: 'IN_PROGRESS', color: '#3B82F6', position: 1 },
  { name: 'In Review', category: 'IN_REVIEW', color: '#F59E0B', position: 2 },
  { name: 'Completed', category: 'COMPLETED', color: '#22C55E', position: 3 },
]

// Seed the default statuses for a board. Idempotent via @@unique([boardId, name]).
export async function seedDefaultBoardStatuses(db: Db, boardId: string): Promise<void> {
  await db.boardStatus.createMany({
    data: DEFAULT_BOARD_STATUSES.map((d) => ({ ...d, boardId, isDefault: true })),
    skipDuplicates: true,
  })
}

// Who may edit a board's statuses/fields: admins, the board owner (personal
// boards), or a team LEADER of the board's team (team boards).
export async function canManageBoard(
  db: Db,
  userId: string,
  role: string | undefined,
  boardId: string
): Promise<boolean> {
  if (role === 'ADMIN') return true
  const board = await db.kanbanBoard.findUnique({
    where: { id: boardId },
    select: { ownerId: true, teamId: true },
  })
  if (!board) return false
  if (board.ownerId === userId) return true
  if (board.teamId) {
    const m = await db.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: board.teamId } },
      select: { role: true },
    })
    return m?.role === 'LEADER'
  }
  return false
}
