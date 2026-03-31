import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyTaskOverdue, notifyTaskAssigned } from '@/lib/notifications'
import { getNextOccurrenceDate } from '@/lib/recurring'

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
    // A task is only overdue if its due date is strictly before today (not just before now).
    // Recurring instances are stored at midnight local time, so comparing with "now"
    // during the same day would incorrectly flag them as overdue.
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    // Find all non-completed tasks with a due date before today
    const overdueTasks = await prisma.task.findMany({
      where: {
        isRecurring: false, // skip template tasks
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: startOfToday },
        assigneeId: { not: null },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        assigneeId: true,
        recurringParentId: true,
      },
    })

    let notified = 0
    let recurringAdvanced = 0
    let recurringSkipped = 0

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

      // --- Auto-advance overdue recurring instances ---
      // If this is a recurring instance that wasn't completed, spawn the next
      // occurrence so the series continues regardless of completion status.
      if (task.recurringParentId) {
        try {
          const template = await prisma.task.findUnique({
            where: { id: task.recurringParentId },
            include: { teamMembers: true, collaborators: true },
          })

          if (
            template?.recurringFrequency &&
            template?.recurringEndDate &&
            template?.startDate
          ) {
            const nextDate = getNextOccurrenceDate(
              template.startDate,
              template.recurringEndDate,
              template.recurringFrequency,
              template.recurringInterval ?? 1,
              (template.recurringDaysOfWeek as number[]) ?? [],
              task.dueDate
            )

            if (nextDate && nextDate <= template.recurringEndDate) {
              // Idempotency guard: skip if this occurrence already exists
              const nextMidnight = new Date(nextDate)
              nextMidnight.setHours(0, 0, 0, 0)
              const alreadyExists = await prisma.task.findFirst({
                where: {
                  recurringParentId: template.id,
                  dueDate: {
                    gte: nextMidnight,
                    lt: new Date(nextMidnight.getTime() + 24 * 60 * 60 * 1000),
                  },
                },
              })

              if (!alreadyExists) {
                const newInst = await prisma.task.create({
                  data: {
                    title: template.title,
                    description: template.description,
                    priority: template.priority,
                    status: 'TODO',
                    progressPercentage: 0,
                    taskType: template.taskType,
                    dueDate: nextDate,
                    startDate: nextDate,
                    assigneeId: template.assigneeId,
                    creatorId: template.creatorId,
                    teamId: null,
                    assignedById: template.assignedById,
                    location: template.location,
                    meetingLink: template.meetingLink,
                    allDay: template.allDay,
                    recurrence: template.recurrence,
                    isRecurring: false,
                    recurringParentId: template.id,
                  },
                })

                if (template.taskType === 'TEAM' && template.teamMembers.length > 0) {
                  await prisma.taskTeamMember.createMany({
                    data: template.teamMembers.map(tm => ({
                      taskId: newInst.id,
                      userId: tm.userId,
                      role: 'MEMBER' as const,
                    })),
                  })
                }
                if (template.taskType === 'COLLABORATION' && template.collaborators.length > 0) {
                  await prisma.taskCollaborator.createMany({
                    data: template.collaborators.map(c => ({
                      taskId: newInst.id,
                      userId: c.userId,
                    })),
                  })
                }

                // Notify assignee about the new instance
                if (newInst.assigneeId) {
                  try {
                    await notifyTaskAssigned(
                      newInst.assigneeId,
                      newInst.id,
                      newInst.title,
                      'System (recurring)'
                    )
                  } catch {
                    // Non-fatal
                  }
                }

                recurringAdvanced++
              } else {
                recurringSkipped++
              }
            }
          }
        } catch (chainError) {
          console.error(`Error advancing recurring task ${task.id}:`, chainError)
          // Non-fatal — continue with other tasks
        }
      }
    }

    return NextResponse.json({
      checked: overdueTasks.length,
      notified,
      recurringAdvanced,
      recurringSkipped,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Overdue check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
