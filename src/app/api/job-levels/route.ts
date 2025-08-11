import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Try to get job levels from the JobLevel table first
    let jobLevels: Array<{ name: string; description: string | null; order: number }> = []
    
    try {
      const where: any = {}
      if (!includeInactive) where.isActive = true

      const dbJobLevels = await prisma.jobLevel.findMany({
        where,
        select: {
          name: true,
          description: true,
          order: true
        },
        orderBy: { order: 'asc' }
      })
      
      jobLevels = dbJobLevels
    } catch (error) {
      console.warn('JobLevel table not accessible, using fallback data:', error)
      // If table doesn't exist or there's an error, fall back to enum values
      jobLevels = [
        { name: 'RF1', description: 'Rank and File Level 1', order: 1 },
        { name: 'RF2', description: 'Rank and File Level 2', order: 2 },
        { name: 'RF3', description: 'Rank and File Level 3', order: 3 },
        { name: 'OF1', description: 'Officer Level 1', order: 4 },
        { name: 'OF2', description: 'Officer Level 2', order: 5 },
        { name: 'M1', description: 'Manager Level 1', order: 6 },
        { name: 'M2', description: 'Manager Level 2 (Highest)', order: 7 }
      ]
    }

    // If no job levels in database, seed with default values
    if (jobLevels.length === 0) {
      jobLevels = [
        { name: 'RF1', description: 'Rank and File Level 1', order: 1 },
        { name: 'RF2', description: 'Rank and File Level 2', order: 2 },
        { name: 'RF3', description: 'Rank and File Level 3', order: 3 },
        { name: 'OF1', description: 'Officer Level 1', order: 4 },
        { name: 'OF2', description: 'Officer Level 2', order: 5 },
        { name: 'M1', description: 'Manager Level 1', order: 6 },
        { name: 'M2', description: 'Manager Level 2 (Highest)', order: 7 }
      ]
    }

    return NextResponse.json({
      success: true,
      data: jobLevels
    })

  } catch (error) {
    console.error('Job levels API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job levels' },
      { status: 500 }
    )
  }
}
