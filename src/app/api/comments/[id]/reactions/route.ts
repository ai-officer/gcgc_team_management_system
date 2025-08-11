import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const reactionSchema = z.object({
  emoji: z.string().min(1).max(4), // Support unicode emojis
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { emoji } = reactionSchema.parse(body)

    // Check if comment exists and user has access to it
    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
      include: {
        task: {
          include: {
            teamMembers: true,
            collaborators: true,
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check access permissions to the task
    const task = comment.task
    const hasAccess = task.creatorId === session.user.id || 
                     task.assigneeId === session.user.id ||
                     task.teamMembers?.some(tm => tm.userId === session.user.id) ||
                     task.collaborators?.some(c => c.userId === session.user.id) ||
                     session.user.role === 'ADMIN'

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if user already has this reaction on this comment
    const existingReaction = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId_emoji: {
          commentId: params.id,
          userId: session.user.id,
          emoji: emoji
        }
      }
    })

    if (existingReaction) {
      // Remove the reaction (toggle off)
      await prisma.commentReaction.delete({
        where: { id: existingReaction.id }
      })
      
      return NextResponse.json({ message: 'Reaction removed', action: 'removed' })
    } else {
      // Add the reaction
      const reaction = await prisma.commentReaction.create({
        data: {
          emoji,
          commentId: params.id,
          userId: session.user.id,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      return NextResponse.json({ reaction, action: 'added' })
    }
  } catch (error) {
    console.error('Reaction error:', error)
    
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all reactions for the comment
    const reactions = await prisma.commentReaction.findMany({
      where: { commentId: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ reactions })
  } catch (error) {
    console.error('Get reactions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}