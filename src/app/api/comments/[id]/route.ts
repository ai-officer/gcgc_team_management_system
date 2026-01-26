import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { deleteFromOSS, getObjectKeyFromUrl } from '@/lib/oss'

const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  imageUrl: z.string().nullable().optional(),
})

// GET - Get a single comment
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        replies: {
          include: {
            author: { select: { id: true, name: true, email: true, image: true } },
            reactions: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error fetching comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a comment
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the existing comment
    const existingComment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: { authorId: true, imageUrl: true }
    })

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Only the author can edit their comment
    if (existingComment.authorId !== session.user.id) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = updateCommentSchema.parse(body)

    // If image is being removed or changed, delete the old one from OSS
    if (validatedData.imageUrl !== undefined && existingComment.imageUrl) {
      const oldImageUrl = existingComment.imageUrl
      const newImageUrl = validatedData.imageUrl

      // If image is being removed (null) or changed to a different URL
      if (newImageUrl === null || (newImageUrl && newImageUrl !== oldImageUrl)) {
        const objectKey = getObjectKeyFromUrl(oldImageUrl)
        if (objectKey) {
          await deleteFromOSS(objectKey)
        }
      }
    }

    // Update the comment
    const updatedComment = await prisma.comment.update({
      where: { id: params.id },
      data: {
        ...(validatedData.content && { content: validatedData.content }),
        ...(validatedData.imageUrl !== undefined && { imageUrl: validatedData.imageUrl }),
        updatedAt: new Date()
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        replies: {
          include: {
            author: { select: { id: true, name: true, email: true, image: true } },
            reactions: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    return NextResponse.json(updatedComment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error updating comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the existing comment
    const existingComment = await prisma.comment.findUnique({
      where: { id: params.id },
      select: {
        authorId: true,
        imageUrl: true,
        task: {
          select: { creatorId: true }
        }
      }
    })

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Only the author or task creator or admin can delete the comment
    const isAuthor = existingComment.authorId === session.user.id
    const isTaskCreator = existingComment.task?.creatorId === session.user.id
    const isAdmin = session.user.role === 'ADMIN'

    if (!isAuthor && !isTaskCreator && !isAdmin) {
      return NextResponse.json({ error: 'You do not have permission to delete this comment' }, { status: 403 })
    }

    // Delete image from OSS if exists
    if (existingComment.imageUrl) {
      const objectKey = getObjectKeyFromUrl(existingComment.imageUrl)
      if (objectKey) {
        await deleteFromOSS(objectKey)
      }
    }

    // Delete all replies first (cascade)
    await prisma.comment.deleteMany({
      where: { parentId: params.id }
    })

    // Delete the comment
    await prisma.comment.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true, message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
