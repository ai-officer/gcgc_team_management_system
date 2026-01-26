import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadToOSS, deleteFromOSS, getObjectKeyFromUrl } from '@/lib/oss'

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

    // Get current user's profile image for cleanup
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true }
    })

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const objectKey = `profiles/${session.user.id}-${timestamp}.${extension}`

    // Upload to OSS
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const { url: baseImageUrl } = await uploadToOSS(buffer, objectKey, file.type)

    // Add cache-busting timestamp to URL to prevent CDN/browser caching issues
    const imageUrl = `${baseImageUrl}?v=${timestamp}`

    // Update user's profile image in database with cache-busted URL
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl }
    })

    // Clean up old profile image if it exists and is an OSS file
    if (currentUser?.image) {
      const oldObjectKey = getObjectKeyFromUrl(currentUser.image)
      if (oldObjectKey) {
        await deleteFromOSS(oldObjectKey)
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
      objectKey,
      size: file.size,
      type: file.type,
      message: 'Profile picture updated successfully'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Profile image upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload profile picture' },
      { status: 500 }
    )
  }
}
