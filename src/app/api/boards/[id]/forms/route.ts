import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageBoard } from '@/lib/board-statuses'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(80),
  intro: z.string().max(500).optional(),
  targetStatusId: z.string().nullable().optional(),
  defaultAssigneeId: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
})

// GET — list a board's intake forms (manager-only; tokens are sensitive).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canManageBoard(prisma, session.user.id, session.user.role, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const forms = await prisma.intakeForm.findMany({
    where: { boardId: params.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ forms })
}

// POST — create an intake form for a board.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canManageBoard(prisma, session.user.id, session.user.role, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const data = createSchema.parse(await req.json())
    const form = await prisma.intakeForm.create({
      data: {
        boardId: params.id,
        title: data.title.trim(),
        intro: data.intro?.trim() || null,
        targetStatusId: data.targetStatusId || null,
        defaultAssigneeId: data.defaultAssigneeId || null,
        enabled: data.enabled ?? true,
      },
    })
    return NextResponse.json({ form }, { status: 201 })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
    }
    console.error('Create intake form error:', error)
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 })
  }
}
