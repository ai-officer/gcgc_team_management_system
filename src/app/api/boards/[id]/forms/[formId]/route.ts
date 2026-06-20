import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageBoard } from '@/lib/board-statuses'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  intro: z.string().max(500).nullable().optional(),
  targetStatusId: z.string().nullable().optional(),
  defaultAssigneeId: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string; formId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canManageBoard(prisma, session.user.id, session.user.role, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const existing = await prisma.intakeForm.findFirst({ where: { id: params.formId, boardId: params.id } })
  if (!existing) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  try {
    const data = updateSchema.parse(await req.json())
    const form = await prisma.intakeForm.update({
      where: { id: params.formId },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.intro !== undefined ? { intro: data.intro?.trim() || null } : {}),
        ...(data.targetStatusId !== undefined ? { targetStatusId: data.targetStatusId || null } : {}),
        ...(data.defaultAssigneeId !== undefined ? { defaultAssigneeId: data.defaultAssigneeId || null } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      },
    })
    return NextResponse.json({ form })
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
    }
    console.error('Update intake form error:', error)
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; formId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canManageBoard(prisma, session.user.id, session.user.role, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const existing = await prisma.intakeForm.findFirst({ where: { id: params.formId, boardId: params.id } })
  if (!existing) return NextResponse.json({ error: 'Form not found' }, { status: 404 })

  await prisma.intakeForm.delete({ where: { id: params.formId } })
  return NextResponse.json({ ok: true })
}
