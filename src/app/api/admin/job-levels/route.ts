import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/get-admin-session'
import { prisma } from '@/lib/prisma'

// Job Level model for managing hierarchy
interface JobLevelData {
  name: string
  description?: string
  order: number
  isActive: boolean
}

// Default job levels based on the hierarchy: RF1, RF2, RF3, OF1, OF2, M1, M2, E3 (highest)
const DEFAULT_JOB_LEVELS = [
  { name: 'RF1', description: 'Rank and File Level 1', order: 1 },
  { name: 'RF2', description: 'Rank and File Level 2', order: 2 },
  { name: 'RF3', description: 'Rank and File Level 3', order: 3 },
  { name: 'OF1', description: 'Officer Level 1', order: 4 },
  { name: 'OF2', description: 'Officer Level 2', order: 5 },
  { name: 'M1', description: 'Manager Level 1', order: 6 },
  { name: 'M2', description: 'Manager Level 2', order: 7 },
  { name: 'E3', description: 'Executive Level (Highest)', order: 8 }
]

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Initialize default job levels if none exist
    const existingCount = await prisma.jobLevel.count()
    if (existingCount === 0) {
      await prisma.jobLevel.createMany({
        data: DEFAULT_JOB_LEVELS
      })
    }

    const where: any = {}
    if (!includeInactive) where.isActive = true

    // Get job levels ordered by hierarchy
    const jobLevels = await prisma.jobLevel.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({ jobLevels })

  } catch (error) {
    console.error('Error fetching job levels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request)
    
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Job level name is required' }, { status: 400 })
    }

    // Check if job level already exists
    const existingJobLevel = await prisma.jobLevel.findUnique({
      where: { name: name.trim() }
    })

    if (existingJobLevel) {
      return NextResponse.json({ error: 'Job level with this name already exists' }, { status: 400 })
    }

    // Get the next order number
    const maxOrderLevel = await prisma.jobLevel.findFirst({
      orderBy: { order: 'desc' }
    })
    const nextOrder = (maxOrderLevel?.order || 0) + 1

    // Create the job level
    const jobLevel = await prisma.jobLevel.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        order: nextOrder,
        isActive: true
      }
    })

    return NextResponse.json({ jobLevel }, { status: 201 })

  } catch (error) {
    console.error('Error creating job level:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
