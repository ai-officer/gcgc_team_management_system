import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/ossb/upload
 * Upload file attachment for OSSB request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const ossbRequestId = formData.get('ossbRequestId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Get file extension and validate
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF' },
        { status: 400 }
      )
    }

    // Create unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'ossb')
    await mkdir(uploadsDir, { recursive: true })

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Create file URL
    const fileUrl = `/uploads/ossb/${filename}`

    // If ossbRequestId is provided, create attachment record
    if (ossbRequestId) {
      const attachment = await prisma.oSSBAttachment.create({
        data: {
          ossbRequestId,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          fileType: file.type
        }
      })

      return NextResponse.json({
        message: 'File uploaded successfully',
        attachment
      })
    }

    // Return file info without creating attachment record
    return NextResponse.json({
      message: 'File uploaded successfully',
      file: {
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        fileType: file.type
      }
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ossb/upload
 * Delete file attachment
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('id')

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID required' },
        { status: 400 }
      )
    }

    // Get attachment
    const attachment = await prisma.oSSBAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        ossbRequest: {
          select: {
            creatorId: true
          }
        }
      }
    })

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (
      session.user.role !== 'ADMIN' &&
      attachment.ossbRequest.creatorId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete file from filesystem
    const filepath = join(process.cwd(), 'public', attachment.fileUrl)
    try {
      const fs = require('fs').promises
      await fs.unlink(filepath)
    } catch (err) {
      console.error('Error deleting file from filesystem:', err)
      // Continue even if file deletion fails
    }

    // Delete attachment record
    await prisma.oSSBAttachment.delete({
      where: { id: attachmentId }
    })

    return NextResponse.json({
      message: 'Attachment deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting attachment:', error)
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    )
  }
}
