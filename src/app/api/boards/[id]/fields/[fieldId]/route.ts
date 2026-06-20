import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageBoard } from '@/lib/board-statuses'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  options: z.array(z.string().min(1).max(60)).max(30).optional(),
  required: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string; fieldId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canManageBoard(prisma, session.user.id, session.user.role, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.boardField.findFirst({ where: { id: params.fieldId, boardId: params.id } })
  if (!existing) return NextResponse.json({ error: 'Field not found' }, { status: 404 })

  try {
    const data = updateSchema.parse(await req.json())
    if (data.options !== undefined && existing.type === 'SELECT' && data.options.length === 0) {
      return NextResponse.json({ error: 'A dropdown needs at least one option.' }, { status: 400 })
    }
    const field = await prisma.boardField.update({
      where: { id: params.fieldId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.required !== undefined ? { required: data.required } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        // Options only apply to SELECT fields.
        ...(data.options !== undefined && existing.type === 'SELECT' ? { options: data.options } : {}),
      },
    })
    return NextResponse.json({ field })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A field with that name already exists on this board.' }, { status: 409 })
    }
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid field data.' }, { status: 400 })
    }
    console.error('Update board field error:', error)
    return NextResponse.json({ error: 'Failed to update field' }, { status: 500 })
  }
}

// DELETE — removes the field and all its task values (cascade).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; fieldId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canManageBoard(prisma, session.user.id, session.user.role, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.boardField.findFirst({ where: { id: params.fieldId, boardId: params.id } })
  if (!existing) return NextResponse.json({ error: 'Field not found' }, { status: 404 })

  await prisma.boardField.delete({ where: { id: params.fieldId } })
  return NextResponse.json({ ok: true })
}
