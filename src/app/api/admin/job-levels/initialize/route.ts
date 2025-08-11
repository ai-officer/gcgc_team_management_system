import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Default job levels based on the hierarchy: RF1, RF2, RF3, OF1, OF2, M1, M2 (highest)
const DEFAULT_JOB_LEVELS = [
  { name: 'RF1', description: 'Rank and File Level 1', order: 1 },
  { name: 'RF2', description: 'Rank and File Level 2', order: 2 },
  { name: 'RF3', description: 'Rank and File Level 3', order: 3 },
  { name: 'OF1', description: 'Officer Level 1', order: 4 },
  { name: 'OF2', description: 'Officer Level 2', order: 5 },
  { name: 'M1', description: 'Manager Level 1', order: 6 },
  { name: 'M2', description: 'Manager Level 2 (Highest)', order: 7 }
]

export async function POST(request: NextRequest) {
  try {
    // Ensure the job_levels table exists
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "job_levels" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `

    // Check if job levels already exist
    const existingJobLevels = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "job_levels"
    ` as Array<{ count: bigint }>

    if (existingJobLevels[0]?.count > 0) {
      return NextResponse.json(
        { success: false, error: 'Job levels already exist. Delete existing levels first if you want to reinitialize.' },
        { status: 400 }
      )
    }

    // Insert default job levels
    for (const jobLevel of DEFAULT_JOB_LEVELS) {
      await prisma.$executeRaw`
        INSERT INTO "job_levels" ("id", "name", "description", "order", "is_active", "created_at", "updated_at")
        VALUES (gen_random_uuid()::text, ${jobLevel.name}, ${jobLevel.description}, ${jobLevel.order}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    }

    return NextResponse.json({
      success: true,
      message: 'Default job levels initialized successfully',
      data: {
        created: DEFAULT_JOB_LEVELS.length
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Job levels initialization error:', error)
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Some job levels already exist' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to initialize job levels' },
      { status: 500 }
    )
  }
}
