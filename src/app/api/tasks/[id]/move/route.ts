import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/api-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canEditTask } from '@/lib/permissions'
import { loadAccessibleBoard, buildDefaultStatusMap, moveTaskAndSubtasks } from '@/lib/task-move'

const moveSchema = z.object({
  boardId: z.string().nullable(), // null = detach from any board
})

// POST /api/tasks/[id]/move — move a task (and its subtasks) to another board.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getRequestSession(req)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { boardId } = moveSchema.parse(await req.json())

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        boardId: true,
        teamId: true,
        creatorId: true,
        assigneeId: true,
        board: { select: { ownerId: true } },
      },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (boardId === task.boardId) {
      return NextResponse.json({ error: 'Task is already on this board' }, { status: 400 })
    }

    // Permission: the user must be able to edit this task.
    const isAdmin = session.user.role === 'ADMIN'
    let teamRole: 'LEADER' | 'MEMBER' | undefined
    if (task.teamId) {
      const tm = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: session.user.id, teamId: task.teamId } },
        select: { role: true },
      })
      teamRole = tm?.role
    }
    const isBoardOwner = task.board?.ownerId === session.user.id
    const allowed =
      isAdmin ||
      isBoardOwner ||
      canEditTask(session.user.role, task.creatorId, task.assigneeId, session.user.id, teamRole)
    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to move this task' }, { status: 403 })
    }

    // Resolve + access-check the target board.
    let targetTeamId: string | null = null
    if (boardId) {
      const board = await loadAccessibleBoard(boardId, session.user.id, isAdmin)
      if (!board) {
        return NextResponse.json({ error: 'You do not have access to that board' }, { status: 403 })
      }
      targetTeamId = board.teamId
    }

    await prisma.$transaction(async (tx) => {
      const statusMap = await buildDefaultStatusMap(tx, boardId)
      await moveTaskAndSubtasks(tx, task.id, boardId, targetTeamId, statusMap)
      await tx.activity.create({
        data: {
          type: 'TASK_UPDATED',
          description: `Moved task to a different board: ${task.title}`,
          userId: session.user.id,
          entityId: task.id,
          entityType: 'task',
          metadata: { fromBoardId: task.boardId, toBoardId: boardId },
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: e.errors }, { status: 400 })
    }
    console.error('Move task error:', e)
    return NextResponse.json({ error: 'Failed to move task' }, { status: 500 })
  }
}
