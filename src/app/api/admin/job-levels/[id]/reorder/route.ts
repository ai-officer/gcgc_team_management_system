import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { direction } = body
    const { id } = params

    if (!direction || !['up', 'down'].includes(direction)) {
      return NextResponse.json(
        { success: false, error: 'Invalid direction. Must be "up" or "down"' },
        { status: 400 }
      )
    }

    // Get current job level
    const currentJobLevel = await prisma.$queryRaw`
      SELECT "id", "order" FROM "job_levels" WHERE "id" = ${id}
    ` as Array<{ id: string; order: number }>

    if (currentJobLevel.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job level not found' },
        { status: 404 }
      )
    }

    const currentOrder = currentJobLevel[0].order

    // Find adjacent job level to swap with
    let adjacentJobLevel: Array<{ id: string; order: number }>

    if (direction === 'up') {
      adjacentJobLevel = await prisma.$queryRaw`
        SELECT "id", "order" FROM "job_levels" 
        WHERE "order" < ${currentOrder} 
        ORDER BY "order" DESC 
        LIMIT 1
      ` as Array<{ id: string; order: number }>
    } else {
      adjacentJobLevel = await prisma.$queryRaw`
        SELECT "id", "order" FROM "job_levels" 
        WHERE "order" > ${currentOrder} 
        ORDER BY "order" ASC 
        LIMIT 1
      ` as Array<{ id: string; order: number }>
    }

    if (adjacentJobLevel.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot move in that direction' },
        { status: 400 }
      )
    }

    const adjacentOrder = adjacentJobLevel[0].order
    const adjacentId = adjacentJobLevel[0].id

    // Swap the orders
    await prisma.$transaction(async (tx) => {
      // Update current job level to temporary order to avoid constraint issues
      await tx.$executeRaw`
        UPDATE "job_levels" 
        SET "order" = -1, "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
      `

      // Update adjacent job level to current order
      await tx.$executeRaw`
        UPDATE "job_levels" 
        SET "order" = ${currentOrder}, "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = ${adjacentId}
      `

      // Update current job level to adjacent order
      await tx.$executeRaw`
        UPDATE "job_levels" 
        SET "order" = ${adjacentOrder}, "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
      `
    })

    return NextResponse.json({
      success: true,
      message: 'Job level order updated successfully'
    })

  } catch (error) {
    console.error('Job level reorder error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reorder job level' },
      { status: 500 }
    )
  }
}
