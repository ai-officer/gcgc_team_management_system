import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
  parentId: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(), // Legacy support
  fileUrl: z.string().url().optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  fileType: z.string().max(100).optional().nullable(),
  fileSize: z.number().int().positive().optional().nullable(),
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

    if (!session.user.role) {
      return NextResponse.json({ error: 'User role is required' }, { status: 403 })
    }

    // Check if user has access to this task
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        teamMembers: true,
        collaborators: true,
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check access permissions
    const hasAccess = task.creatorId === session.user.id || 
                     task.assigneeId === session.user.id ||
                     task.teamMembers?.some(tm => tm.userId === session.user.id) ||
                     task.collaborators?.some(c => c.userId === session.user.id) ||
                     session.user.role === 'ADMIN'

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get comments with nested structure (parent comments with their replies)
    const comments = await prisma.comment.findMany({
      where: { 
        taskId: params.id,
        parentId: null // Only get parent comments
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        },
        reactions: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true }
            },
            reactions: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.role) {
      return NextResponse.json({ error: 'User role is required' }, { status: 403 })
    }

    // Check if user has access to this task
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        teamMembers: true,
        collaborators: true,
        creator: { select: { id: true, name: true } }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check access permissions
    const hasAccess = task.creatorId === session.user.id || 
                     task.assigneeId === session.user.id ||
                     task.teamMembers?.some(tm => tm.userId === session.user.id) ||
                     task.collaborators?.some(c => c.userId === session.user.id) ||
                     session.user.role === 'ADMIN'

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { content, parentId, imageUrl, fileUrl, fileName, fileType, fileSize } = createCommentSchema.parse(body)

    // Validate parentId if provided (must be a comment on the same task)
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      })

      if (!parentComment || parentComment.taskId !== params.id) {
        return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 })
      }
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: params.id,
        authorId: session.user.id,
        parentId,
        imageUrl,
        fileUrl,
        fileName,
        fileType,
        fileSize,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        },
        reactions: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        replies: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true }
            },
            reactions: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'COMMENT_ADDED',
        description: `Added comment to task: ${task.title}`,
        userId: session.user.id,
        entityId: params.id,
        entityType: 'task',
        metadata: { commentId: comment.id },
      }
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Create comment error:', error)
    
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