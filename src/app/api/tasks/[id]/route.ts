import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { canEditTask, canDeleteTask, canChangeTaskStatus } from '@/lib/permissions'
import { autoSyncTask, deleteSyncedTask } from '@/lib/calendar-sync-helper'
import { getNextOccurrenceDate } from '@/lib/recurring'
import { notifyTaskAssigned, notifyTaskUpdated, notifyTaskCompleted } from '@/lib/notifications'

const updateTaskSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  taskType: z.enum(['INDIVIDUAL', 'TEAM', 'COLLABORATION']).optional(),
  assigneeId: z.string().nullish(),
  teamMemberIds: z.array(z.string()).optional(),
  collaboratorIds: z.array(z.string()).optional(),
  assignedById: z.string().optional(),
  // Google Calendar-compatible fields
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  allDay: z.boolean().optional(),
  recurrence: z.string().optional(),
  // Work quality evaluation
  workQuality: z.enum(['NONE', 'POOR', 'FAIR', 'GOOD', 'EXCELLENT']).optional().nullable(),
  seniorWorkQuality: z.enum(['NONE', 'POOR', 'FAIR', 'GOOD', 'EXCELLENT']).optional().nullable(),
  // Gravity / SLA / reminders
  taskWeight: z.number().int().min(1).max(5).optional().nullable(),
  slaHours: z.number().int().min(1).optional().nullable(),
  reminderDays: z.array(z.number().int().min(1)).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true }
        },
        creator: {
          select: { id: true, name: true, email: true, image: true }
        },
        assignedBy: {
          select: { id: true, name: true, email: true, image: true }
        },
        team: {
          select: { id: true, name: true }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        subtasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        parent: {
          select: { id: true, title: true }
        },
        _count: {
          select: { subtasks: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check if user has access to this task
    if (session.user.role !== 'ADMIN') {
      // For tasks without teams, check if user is creator, assignee, or collaborator
      if (!task.teamId) {
        const hasAccess = task.creatorId === session.user.id || 
                         task.assigneeId === session.user.id ||
                         task.teamMembers?.some(tm => tm.userId === session.user.id) ||
                         task.collaborators?.some(c => c.userId === session.user.id)
        
        if (!hasAccess) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        // For tasks with teams, check team membership
        const teamMember = await prisma.teamMember.findUnique({
          where: {
            userId_teamId: {
              userId: session.user.id,
              teamId: task.teamId
            }
          }
        })

        if (!teamMember) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Task GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get existing task with all related data
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        team: true,
        teamMembers: true,
        collaborators: true,
      }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get user's team member info (only if task has a teamId)
    let teamMember = null
    if (existingTask.teamId) {
      teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: session.user.id,
            teamId: existingTask.teamId
          }
        }
      })
    }

    const body = await req.json()
    const updateData = updateTaskSchema.parse(body)

    // Only the assigner/creator/admin can set progress to 100% (complete the task)
    const isAssigner = existingTask.assignedById === session.user.id
    const isCreator = existingTask.creatorId === session.user.id
    const isAdmin = session.user.role === 'ADMIN'
    const isLeader = session.user.role === 'LEADER'
    const canComplete = isAssigner || isCreator || isAdmin

    // Leaders can extend due dates for tasks assigned to their subordinates
    let isLeaderSubordinateOverride = false
    if (isLeader && !isAssigner && !isCreator && !isAdmin && existingTask.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: existingTask.assigneeId },
        select: { reportsToId: true }
      })
      if (assignee?.reportsToId === session.user.id) {
        isLeaderSubordinateOverride = true
      }
    }

    // Check dependency blocking: task cannot move to IN_PROGRESS if blocked
    if (updateData.status === 'IN_PROGRESS' && existingTask.status !== 'IN_PROGRESS') {
      const blockers = await prisma.taskDependency.findMany({
        where: { taskId: params.id },
        include: { dependsOn: { select: { id: true, title: true, status: true } } }
      })
      const unfinishedBlockers = blockers.filter(b => b.dependsOn.status !== 'COMPLETED')
      if (unfinishedBlockers.length > 0) {
        const titles = unfinishedBlockers.map(b => `"${b.dependsOn.title}"`).join(', ')
        return NextResponse.json({
          error: `This task is blocked by: ${titles}. Complete those tasks first.`
        }, { status: 400 })
      }
    }

    if (updateData.progressPercentage === 100 && !canComplete) {
      return NextResponse.json({
        error: 'Only the person who assigned this task can set progress to 100%.'
      }, { status: 403 })
    }

    // Check if user is team member or collaborator
    const isTeamMember = existingTask.teamMembers?.some(tm => tm.userId === session.user.id) || false
    const isCollaborator = existingTask.collaborators?.some(c => c.userId === session.user.id) || false
    
    // If trying to change status, use stricter permissions
    if (updateData.status && updateData.status !== existingTask.status) {
      if (!session.user.role) {
        return NextResponse.json({ error: 'User role is required' }, { status: 403 })
      }
      
      if (!canChangeTaskStatus(
        session.user.role,
        existingTask.creatorId,
        existingTask.assigneeId,
        session.user.id,
        existingTask.taskType,
        isTeamMember,
        isCollaborator,
        teamMember?.role
      )) {
        return NextResponse.json({ 
          error: 'You cannot change the status of this task. Please add a comment to communicate with the task owner.' 
        }, { status: 403 })
      }
    }
    
    // For other edits, use general edit permissions
    if (!session.user.role) {
      return NextResponse.json({ error: 'User role is required' }, { status: 403 })
    }
    
    // Leader overriding due date of a subordinate's task: allow only dueDate change
    if (isLeaderSubordinateOverride) {
      const allowedKeys = new Set(['dueDate', 'startDate'])
      const requestedKeys = Object.keys(updateData).filter(k => updateData[k as keyof typeof updateData] !== undefined)
      const hasDisallowedFields = requestedKeys.some(k => !allowedKeys.has(k))
      if (hasDisallowedFields) {
        return NextResponse.json({ error: 'Leaders can only change the due date on subordinate tasks' }, { status: 403 })
      }
      // Skip canEditTask — dueDate-only override is permitted
    } else if (!canEditTask(
      session.user.role,
      existingTask.creatorId,
      existingTask.assigneeId,
      session.user.id,
      teamMember?.role
    )) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify assignee exists (if provided)
    if (updateData.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: updateData.assigneeId }
      })

      if (!assignee) {
        return NextResponse.json(
          { error: 'Assignee not found' },
          { status: 400 }
        )
      }
    }

    // Auto-set startDate if not provided but dueDate is (for calendar display)
    const finalDueDate = updateData.dueDate ? new Date(updateData.dueDate) : undefined
    const finalStartDate = updateData.startDate
      ? new Date(updateData.startDate)
      : (finalDueDate ? new Date(finalDueDate) : (updateData.dueDate !== undefined ? existingTask.startDate : undefined))

    // Prevent non-assigner/creator from setting progress to 100% or status to COMPLETED
    // Only the person who assigned the task (or creator/admin) can complete it
    if (!canComplete) {
      // Cap progress at 90% (IN_REVIEW state)
      if (updateData.progressPercentage !== undefined && updateData.progressPercentage > 90) {
        updateData.progressPercentage = 90
      }
      // Prevent marking as COMPLETED
      if (updateData.status === 'COMPLETED') {
        return NextResponse.json({
          error: 'Only the person who assigned this task can mark it as completed. Please move it to "In Review" instead.'
        }, { status: 403 })
      }
    }

    // Auto-set status based on progress percentage
    let autoStatus: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | undefined
    if (updateData.progressPercentage !== undefined) {
      const progress = updateData.progressPercentage
      if (progress === 100 && canComplete) {
        autoStatus = 'COMPLETED'
      } else if (progress >= 90) {
        autoStatus = 'IN_REVIEW'
      } else if (progress > 0) {
        autoStatus = 'IN_PROGRESS'
      }
      // If progress is 0, don't auto-change status (let user keep it as TODO or whatever)
    }

    // Use auto-status if no explicit status was provided and we have an auto-status
    if (autoStatus && !updateData.status) {
      updateData.status = autoStatus
    }

    // Resolve workQuality permission: only canComplete users may rate
    if (updateData.workQuality !== undefined && !canComplete) {
      delete (updateData as any).workQuality
    }
    // Senior override: any LEADER or ADMIN who is not the direct assigner
    if ((updateData as any).seniorWorkQuality !== undefined) {
      if (!isAdmin && !(isLeader && !isAssigner)) {
        delete (updateData as any).seniorWorkQuality
      }
    }

    // Update task with transaction for related data
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const taskUpdateData: any = {
        ...updateData,
        dueDate: finalDueDate,
        startDate: finalStartDate,
      }

      // Remove arrays from task update data
      delete taskUpdateData.teamMemberIds
      delete taskUpdateData.collaboratorIds

      // Set completion timestamps based on status transitions
      const newStatus = taskUpdateData.status
      if (newStatus === 'IN_REVIEW' && existingTask.status !== 'IN_REVIEW' && !existingTask.memberSubmittedAt) {
        taskUpdateData.memberSubmittedAt = new Date()
      }
      if (newStatus === 'COMPLETED' && existingTask.status !== 'COMPLETED' && canComplete) {
        taskUpdateData.leaderEvaluatedAt = new Date()
      }

      // Track senior evaluator
      if (taskUpdateData.seniorWorkQuality !== undefined && taskUpdateData.seniorWorkQuality !== null) {
        taskUpdateData.seniorEvaluatorId = session.user.id
        taskUpdateData.seniorEvaluatedAt = new Date()
      }

      // Update only this instance (next instances are spawned lazily on completion)
      await tx.task.update({
        where: { id: params.id },
        data: taskUpdateData,
      })

      // Update team members if taskType is TEAM and teamMemberIds provided
      if (updateData.taskType === 'TEAM' && updateData.teamMemberIds) {
        // Remove existing team members
        await tx.taskTeamMember.deleteMany({
          where: { taskId: params.id }
        })

        // Add new team members
        if (updateData.teamMemberIds.length > 0) {
          const teamMemberData = updateData.teamMemberIds.map(userId => ({
            taskId: params.id,
            userId,
            role: 'MEMBER' as const, // All are members, current user is the leader
          }))

          await tx.taskTeamMember.createMany({
            data: teamMemberData,
          })
        }
      }

      // Update collaborators if taskType is COLLABORATION and collaboratorIds provided
      if (updateData.taskType === 'COLLABORATION' && updateData.collaboratorIds) {
        // Remove existing collaborators
        await tx.taskCollaborator.deleteMany({
          where: { taskId: params.id }
        })

        // Add new collaborators
        if (updateData.collaboratorIds.length > 0) {
          const collaboratorData = updateData.collaboratorIds.map(userId => ({
            taskId: params.id,
            userId,
          }))

          await tx.taskCollaborator.createMany({
            data: collaboratorData,
          })
        }
      }

      // Return updated task with all relations
      return await tx.task.findUnique({
        where: { id: params.id },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, image: true }
          },
          creator: {
            select: { id: true, name: true, email: true, image: true }
          },
          assignedBy: {
            select: { id: true, name: true, email: true, image: true }
          },
          team: {
            select: { id: true, name: true }
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          }
        }
      })
    })

    // If this is a subtask and status changed, recalculate parent's progress
    let updatedParentTask = null
    if (existingTask.parentId && updateData.status) {
      // Get all subtasks of the parent
      const allSubtasks = await prisma.task.findMany({
        where: { parentId: existingTask.parentId },
        select: { status: true }
      })

      // Calculate progress based on subtask statuses
      // COMPLETED = 100%, IN_REVIEW = 90%, IN_PROGRESS = 50%, TODO = 0%
      const statusWeights: Record<string, number> = {
        'COMPLETED': 100,
        'IN_REVIEW': 90,
        'IN_PROGRESS': 50,
        'TODO': 0
      }

      const totalProgress = allSubtasks.reduce((sum, st) => sum + (statusWeights[st.status] || 0), 0)
      const avgProgress = Math.round(totalProgress / allSubtasks.length)

      // When ALL subtasks are completed, push parent to IN_REVIEW at 90%
      // so a leader can verify before marking it fully complete.
      const allCompleted = allSubtasks.length > 0 && allSubtasks.every(st => st.status === 'COMPLETED')

      updatedParentTask = await prisma.task.update({
        where: { id: existingTask.parentId },
        data: {
          progressPercentage: allCompleted ? 90 : avgProgress,
          ...(allCompleted ? { status: 'IN_REVIEW' } : {}),
        },
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
          creator: { select: { id: true, name: true, email: true, image: true } },
          team: { select: { id: true, name: true } },
          subtasks: {
            include: {
              assignee: { select: { id: true, name: true, email: true, image: true } }
            }
          }
        }
      })
    }

    // Send notifications for relevant changes
    if (updatedTask) {
      try {
        const assignerName = session.user.name || session.user.email || 'Someone'

        // Notify new assignee if task was reassigned to a different user
        if (
          updateData.assigneeId &&
          updateData.assigneeId !== existingTask.assigneeId &&
          updateData.assigneeId !== session.user.id
        ) {
          await notifyTaskAssigned(
            updateData.assigneeId,
            updatedTask.id,
            updatedTask.title,
            assignerName
          )
        }

        // Notify assignee when task is completed (if completer is not the assignee)
        if (
          updateData.status === 'COMPLETED' &&
          existingTask.status !== 'COMPLETED' &&
          existingTask.assigneeId &&
          existingTask.assigneeId !== session.user.id
        ) {
          await notifyTaskCompleted(
            existingTask.assigneeId,
            updatedTask.id,
            updatedTask.title,
            assignerName
          )
        }

        // Notify assignee of other updates (status/priority changes) if they didn't make the change
        if (
          !updateData.assigneeId &&
          updateData.status !== 'COMPLETED' &&
          (updateData.status || updateData.priority) &&
          existingTask.assigneeId &&
          existingTask.assigneeId !== session.user.id
        ) {
          const changeType = updateData.status
            ? `changed status to ${updateData.status}`
            : `changed priority to ${updateData.priority}`
          await notifyTaskUpdated(
            existingTask.assigneeId,
            updatedTask.id,
            updatedTask.title,
            assignerName,
            changeType
          )
        }
      } catch (notificationError) {
        console.error('Error sending task update notification:', notificationError)
      }
    }

    // Log activity
    if (updatedTask) {
      await prisma.activity.create({
        data: {
          type: 'TASK_UPDATED',
          description: `Updated task: ${updatedTask.title}`,
          userId: session.user.id,
          entityId: updatedTask.id,
          entityType: 'task',
          metadata: updateData,
        }
      })

      // Auto-sync to Google Calendar if enabled
      await autoSyncTask(updatedTask.id, session.user.id)

      // Send notifications for newly added users
      const assignerName = session.user.name || session.user.email || 'Someone'
      const existingUserIds = new Set<string>()

      // Collect existing users before update
      if (existingTask.assigneeId) existingUserIds.add(existingTask.assigneeId)

      // Check if assignee changed
      if (updateData.assigneeId &&
          updateData.assigneeId !== existingTask.assigneeId &&
          updateData.assigneeId !== session.user.id) {
        try {
          await notifyTaskAssigned(updateData.assigneeId, updatedTask.id, updatedTask.title, assignerName)
          console.log('Sent reassignment notification to:', updateData.assigneeId)
        } catch (err) {
          console.error('Failed to send reassignment notification:', err)
        }
      }

      // Notify new team members
      if (updateData.teamMemberIds && updateData.teamMemberIds.length > 0) {
        for (const userId of updateData.teamMemberIds) {
          if (!existingUserIds.has(userId) && userId !== session.user.id) {
            try {
              await notifyTaskAssigned(userId, updatedTask.id, updatedTask.title, assignerName)
              console.log('Sent team member notification to:', userId)
            } catch (err) {
              console.error('Failed to send team member notification:', err)
            }
          }
        }
      }

      // Notify new collaborators
      if (updateData.collaboratorIds && updateData.collaboratorIds.length > 0) {
        for (const userId of updateData.collaboratorIds) {
          if (!existingUserIds.has(userId) && userId !== session.user.id) {
            try {
              await notifyTaskAssigned(userId, updatedTask.id, updatedTask.title, assignerName)
              console.log('Sent collaborator notification to:', userId)
            } catch (err) {
              console.error('Failed to send collaborator notification:', err)
            }
          }
        }
      }
    }

    // --- Recurring chain: spawn next instance when this one is COMPLETED ---
    let nextRecurringInstance = null

    const isNowCompleted =
      updateData.status === 'COMPLETED' &&
      existingTask.status !== 'COMPLETED' &&
      existingTask.recurringParentId !== null

    if (isNowCompleted && updatedTask) {
      try {
        const template = await prisma.task.findUnique({
          where: { id: existingTask.recurringParentId! },
          include: { teamMembers: true, collaborators: true }
        })

        if (
          template?.recurringFrequency &&
          template?.startDate &&
          existingTask.dueDate
        ) {
          const nextDate = getNextOccurrenceDate(
            template.startDate,
            template.recurringEndDate ?? null,   // null = indefinite
            template.recurringFrequency,
            template.recurringInterval ?? 1,
            template.recurringDaysOfWeek ?? [],
            existingTask.dueDate
          )

          // Accept next date if series is indefinite OR if within the end date
          if (nextDate && (!template.recurringEndDate || nextDate <= template.recurringEndDate)) {
            // Idempotency guard: skip if this occurrence already exists
            const nextMidnight = new Date(nextDate)
            nextMidnight.setHours(0, 0, 0, 0)
            const alreadyExists = await prisma.task.findFirst({
              where: {
                recurringParentId: template.id,
                dueDate: {
                  gte: nextMidnight,
                  lt: new Date(nextMidnight.getTime() + 24 * 60 * 60 * 1000),
                }
              }
            })

            if (!alreadyExists) {
              nextRecurringInstance = await prisma.$transaction(async (tx2) => {
                const newInst = await tx2.task.create({
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
                  }
                })
                if (template.taskType === 'TEAM' && template.teamMembers.length > 0) {
                  await tx2.taskTeamMember.createMany({
                    data: template.teamMembers.map(tm => ({ taskId: newInst.id, userId: tm.userId, role: 'MEMBER' as const }))
                  })
                }
                if (template.taskType === 'COLLABORATION' && template.collaborators.length > 0) {
                  await tx2.taskCollaborator.createMany({
                    data: template.collaborators.map(c => ({ taskId: newInst.id, userId: c.userId }))
                  })
                }
                // Copy subtasks from the completing instance so they recur too
                const sourceSubtasks = await tx2.task.findMany({
                  where: { parentId: existingTask.id },
                  select: {
                    title: true, description: true, priority: true, taskType: true,
                    assigneeId: true, creatorId: true, assignedById: true,
                  }
                })
                if (sourceSubtasks.length > 0) {
                  await tx2.task.createMany({
                    data: sourceSubtasks.map(st => ({
                      title: st.title,
                      description: st.description ?? null,
                      priority: st.priority,
                      status: 'TODO' as const,
                      progressPercentage: 0,
                      taskType: st.taskType,
                      assigneeId: st.assigneeId,
                      creatorId: st.creatorId,
                      assignedById: st.assignedById,
                      dueDate: nextDate,
                      startDate: nextDate,
                      parentId: newInst.id,
                      isRecurring: false,
                    }))
                  })
                }
                return newInst
              })

              // Notify assignee about the new instance
              if (nextRecurringInstance.assigneeId && nextRecurringInstance.assigneeId !== session.user.id) {
                const assignerName = session.user.name || session.user.email || 'System'
                await notifyTaskAssigned(
                  nextRecurringInstance.assigneeId,
                  nextRecurringInstance.id,
                  nextRecurringInstance.title,
                  assignerName
                )
              }
            }
          }
        }
      } catch (chainError) {
        console.error('Error spawning next recurring instance:', chainError)
        // Non-fatal: COMPLETED status on current task is already saved
      }
    }
    // --- End recurring chain ---

    // Return both the updated task and parent task if applicable
    return NextResponse.json({
      ...updatedTask,
      updatedParentTask,
      nextRecurringInstance
    })
  } catch (error) {
    console.error('Task update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for series deletion scope
    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope')

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        creatorId: true,
        teamId: true,
        recurringParentId: true,
      }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get user's team member info (only if task has a teamId)
    let teamMember = null
    if (existingTask.teamId) {
      teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: session.user.id,
            teamId: existingTask.teamId
          }
        }
      })
    }

    // Check permissions
    if (!session.user.role) {
      return NextResponse.json({ error: 'User role is required' }, { status: 403 })
    }
    
    if (!canDeleteTask(
      session.user.role,
      existingTask.creatorId,
      session.user.id,
      teamMember?.role
    )) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Handle series deletion
    if (scope === 'series' && existingTask.recurringParentId) {
      const parentId = existingTask.recurringParentId
      // Find all instances in the series
      const seriesInstances = await prisma.task.findMany({
        where: { recurringParentId: parentId },
        select: { id: true }
      })
      const instanceIds = seriesInstances.map(t => t.id)
      // Delete subtasks of all instances first
      if (instanceIds.length > 0) {
        await prisma.task.deleteMany({ where: { parentId: { in: instanceIds } } })
      }
      // Delete all instances
      await prisma.task.deleteMany({ where: { recurringParentId: parentId } })
      // Delete the template task
      await prisma.task.delete({ where: { id: parentId } })

      await prisma.activity.create({
        data: {
          type: 'TASK_UPDATED',
          description: `Deleted recurring series: ${existingTask.title}`,
          userId: session.user.id,
          entityId: parentId,
          entityType: 'task',
        }
      })
      return NextResponse.json({ message: 'Recurring series deleted successfully' })
    }

    // Get task details before deletion to find associated Event records
    const taskToDelete = await prisma.task.findUnique({
      where: { id: params.id },
      select: {
        googleCalendarEventId: true,
        title: true
      }
    })

    // Delete from Google Calendar if synced
    await deleteSyncedTask(params.id, session.user.id)

    // Delete any Event records that were created from this task's Google Calendar event
    if (taskToDelete?.googleCalendarEventId) {
      await prisma.event.deleteMany({
        where: {
          OR: [
            { googleCalendarEventId: taskToDelete.googleCalendarEventId },
            { title: `[Task] ${taskToDelete.title}` }
          ],
          creatorId: session.user.id
        }
      })
      console.log(`Deleted Event records for task ${params.id}`)
    }

    // Explicitly delete subtasks before deleting the parent
    // (self-referential cascade on the same table can be unreliable)
    await prisma.task.deleteMany({ where: { parentId: params.id } })

    // Delete task (cascade will handle comments and task-specific relations)
    await prisma.task.delete({
      where: { id: params.id }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'TASK_UPDATED',
        description: `Deleted task: ${existingTask.title}`,
        userId: session.user.id,
        entityId: existingTask.id,
        entityType: 'task',
      }
    })

    // Emit WebSocket event to trigger calendar refresh
    if (global.io) {
      global.io.to(`user-${session.user.id}`).emit('task-deleted', {
        taskId: params.id,
        timestamp: new Date().toISOString()
      })
      console.log(`Emitted task-deleted event for user ${session.user.id}`)
    }

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Task deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}