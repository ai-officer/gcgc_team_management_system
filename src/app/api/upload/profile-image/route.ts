import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only images are allowed.' 
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 2MB.' 
      }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Get current user's profile image for cleanup
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true }
    })

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${session.user.id}-${timestamp}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Save new file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Update user's profile image in database
    const imageUrl = `/uploads/profiles/${filename}`
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl }
    })

    // Clean up old profile image if it exists and is a local file
    if (currentUser?.image && currentUser.image.startsWith('/uploads/profiles/')) {
      try {
        const oldFilePath = join(process.cwd(), 'public', currentUser.image)
        if (existsSync(oldFilePath)) {
          await unlink(oldFilePath)
        }
      } catch (cleanupError) {
        console.error('Error cleaning up old profile image:', cleanupError)
        // Don't fail the request if cleanup fails
      }
    }

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'TASK_UPDATED', // We don't have a USER_UPDATED type, so use generic
        description: 'Updated profile picture',
        userId: session.user.id,
        entityId: session.user.id,
        entityType: 'user',
        metadata: { imageUrl }
      }
    })

    return NextResponse.json({ 
      imageUrl,
      filename,
      size: file.size,
      type: file.type,
      message: 'Profile picture updated successfully'
    })
  } catch (error) {
    console.error('Profile image upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload profile picture' },
      { status: 500 }
    )
  }
}