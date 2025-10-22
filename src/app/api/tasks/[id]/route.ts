import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { canEditTask, canDeleteTask, canChangeTaskStatus } from '@/lib/permissions'
import { autoSyncTask, deleteSyncedTask } from '@/lib/calendar-sync-helper'

const updateTaskSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  taskType: z.enum(['INDIVIDUAL', 'TEAM', 'COLLABORATION']).optional(),
  assigneeId: z.string().nullish(), // Always current user
  teamMemberIds: z.array(z.string()).optional(),
  collaboratorIds: z.array(z.string()).optional(),
  assignedById: z.string().optional(),
  // New Google Calendar-compatible fields
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  allDay: z.boolean().optional(),
  recurrence: z.string().optional(),
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
        collaborators: true
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
    
    if (!canEditTask(
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

      // Update the task
      const task = await tx.task.update({
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
    }

    return NextResponse.json(updatedTask)
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

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        creatorId: true,
        teamId: true,
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