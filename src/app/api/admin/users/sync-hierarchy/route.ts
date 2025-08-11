import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { HierarchyLevel } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const validHierarchyLevels = ['RF1', 'RF2', 'RF3', 'OF1', 'OF2', 'M1', 'M2']
    
    // Find users where jobLevel and hierarchyLevel don't match
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { jobLevel: { not: null } },
          // Only process users whose jobLevel is a valid hierarchy level
          { jobLevel: { in: validHierarchyLevels } }
        ]
      },
      select: {
        id: true,
        jobLevel: true,
        hierarchyLevel: true,
        name: true,
        email: true
      }
    })

    const misMatchedUsers = users.filter(user => 
      user.jobLevel !== user.hierarchyLevel
    )

    if (misMatchedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users need hierarchy level synchronization',
        updated: 0
      })
    }

    // Update users to sync hierarchyLevel with jobLevel
    const updatePromises = misMatchedUsers.map(user => 
      prisma.user.update({
        where: { id: user.id },
        data: {
          hierarchyLevel: user.jobLevel as HierarchyLevel
        }
      })
    )

    await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized hierarchy levels for ${misMatchedUsers.length} users`,
      updated: misMatchedUsers.length,
      users: misMatchedUsers.map(user => ({
        name: user.name || user.email,
        jobLevel: user.jobLevel,
        oldHierarchyLevel: user.hierarchyLevel,
        newHierarchyLevel: user.jobLevel
      }))
    })

  } catch (error) {
    console.error('Sync hierarchy levels error:', error)
    return NextResponse.json(
      { error: 'Failed to synchronize hierarchy levels' },
      { status: 500 }
    )
  }
}