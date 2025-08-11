import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobLevels } = body

    if (!Array.isArray(jobLevels)) {
      return NextResponse.json({ error: 'Job levels must be an array' }, { status: 400 })
    }

    // Use a transaction to update all job level orders
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < jobLevels.length; i++) {
        await tx.jobLevel.update({
          where: { id: jobLevels[i].id },
          data: { order: i + 1 }
        })
      }
    })

    // Return updated job levels
    const updatedJobLevels = await prisma.jobLevel.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({ jobLevels: updatedJobLevels })

  } catch (error) {
    console.error('Error reordering job levels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}