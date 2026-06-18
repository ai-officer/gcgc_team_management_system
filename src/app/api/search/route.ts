import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { taskAccessWhere } from '@/lib/search-access'

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = (new URL(req.url).searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ tasks: [], comments: [], people: [] })

  const access = taskAccessWhere({ id: session.user.id, role: session.user.role })
  const like = { contains: q, mode: 'insensitive' as const }

  const [tasks, comments, people] = await Promise.all([
    prisma.task.findMany({
      where: { AND: [access, { OR: [{ title: like }, { description: like }] }] },
      select: { id: true, title: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    }),
    prisma.comment.findMany({
      where: { content: like, task: access },
      select: { id: true, content: true, taskId: true, task: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.user.findMany({
      where: { isActive: true, OR: [{ name: like }, { email: like }] },
      select: { id: true, name: true, email: true, image: true },
      orderBy: [{ name: 'asc' }],
      take: 8,
    }),
  ])

  return NextResponse.json({
    tasks,
    comments: comments.map(c => ({ id: c.id, taskId: c.taskId, snippet: c.content.slice(0, 80), taskTitle: c.task?.title ?? '' })),
    people,
  })
}
