import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyTaskOverdue } from '@/lib/notifications'

// Simple secret to protect the endpoint from public access.
// Set CRON_SECRET in your .env file and pass it as ?secret=... in the cron call.
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Find all non-completed tasks with a due date in the past
    const overdueTasks = await prisma.task.findMany({
      where: {
        isRecurring: false, // skip template tasks
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: now },
        assigneeId: { not: null },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        assigneeId: true,
      },
    })

    let notified = 0

    for (const task of overdueTasks) {
      if (!task.assigneeId || !task.dueDate) continue

      const daysOverdue = Math.floor(
        (now.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Only notify on day 1, day 3, and every 7 days after to avoid spam
      if (daysOverdue === 1 || daysOverdue === 3 || daysOverdue % 7 === 0) {
        try {
          await notifyTaskOverdue(task.assigneeId, task.id, task.title, daysOverdue)
          notified++
        } catch {
          // Non-fatal — continue processing remaining tasks
        }
      }
    }

    return NextResponse.json({
      checked: overdueTasks.length,
      notified,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Overdue check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
