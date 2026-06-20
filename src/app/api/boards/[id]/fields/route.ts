import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageBoard } from '@/lib/board-statuses'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(40),
  type: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT']),
  options: z.array(z.string().min(1).max(60)).max(30).optional(),
  required: z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fields = await prisma.boardField.findMany({
    where: { boardId: params.id },
    orderBy: { position: 'asc' },
  })
  return NextResponse.json({ fields })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canManageBoard(prisma, session.user.id, session.user.role, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { name, type, options, required } = createSchema.parse(await req.json())
    if (type === 'SELECT' && (!options || options.length === 0)) {
      return NextResponse.json({ error: 'A dropdown needs at least one option.' }, { status: 400 })
    }

    const last = await prisma.boardField.findFirst({
      where: { boardId: params.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const field = await prisma.boardField.create({
      data: {
        boardId: params.id,
        name: name.trim(),
        type,
        options: type === 'SELECT' ? (options || []) : [],
        required: !!required,
        position: (last?.position ?? -1) + 1,
      },
    })
    return NextResponse.json({ field }, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A field with that name already exists on this board.' }, { status: 409 })
    }
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid field data.' }, { status: 400 })
    }
    console.error('Create board field error:', error)
    return NextResponse.json({ error: 'Failed to create field' }, { status: 500 })
  }
}
