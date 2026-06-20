import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Public — returns just enough to render the form (no token/internal config).
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const form = await prisma.intakeForm.findUnique({
    where: { token: params.token },
    select: {
      title: true,
      intro: true,
      enabled: true,
      board: {
        select: {
          name: true,
          fields: {
            orderBy: { position: 'asc' },
            select: { id: true, name: true, type: true, options: true, required: true, position: true },
          },
        },
      },
    },
  })

  if (!form || !form.enabled) {
    return NextResponse.json({ error: 'This form is not available.' }, { status: 404 })
  }

  return NextResponse.json({
    title: form.title,
    intro: form.intro,
    boardName: form.board.name,
    fields: form.board.fields,
  })
}
