import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, HierarchyLevel } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hierarchyData = await prisma.user.groupBy({
      by: ['hierarchyLevel'],
      where: {
        hierarchyLevel: { not: null },
        isActive: true,
        role: { not: UserRole.ADMIN } // Exclude system admins from hierarchy statistics
      },
      _count: {
        hierarchyLevel: true
      },
      orderBy: {
        hierarchyLevel: 'asc'
      }
    })

    const hierarchyUsers = await prisma.user.findMany({
      where: {
        hierarchyLevel: { not: null },
        isActive: true,
        role: { not: UserRole.ADMIN } // Exclude system admins from hierarchy view
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hierarchyLevel: true,
        createdAt: true,
        teamMembers: {
          include: {
            team: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { hierarchyLevel: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    const hierarchyLevels = Object.values(HierarchyLevel).map(level => ({
      level,
      count: hierarchyData.find(h => h.hierarchyLevel === level)?._count?.hierarchyLevel || 0,
      users: hierarchyUsers.filter(u => u.hierarchyLevel === level)
    }))

    return NextResponse.json({ hierarchyLevels })
  } catch (error) {
    console.error('Error fetching hierarchy data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userIds, targetLevel, action } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 })
    }

    if (!targetLevel || !Object.values(HierarchyLevel).includes(targetLevel)) {
      return NextResponse.json({ error: 'Valid target level is required' }, { status: 400 })
    }

    let updatedUsers

    if (action === 'promote' || action === 'assign') {
      updatedUsers = await prisma.user.updateMany({
        where: {
          id: { in: userIds },
          isActive: true
        },
        data: {
          hierarchyLevel: targetLevel
        }
      })
    } else if (action === 'demote') {
      const hierarchyOrder = [
        HierarchyLevel.M2, HierarchyLevel.M1, HierarchyLevel.OF2, 
        HierarchyLevel.OF1, HierarchyLevel.RF3, HierarchyLevel.RF2, HierarchyLevel.RF1
      ]
      
      const currentIndex = hierarchyOrder.indexOf(targetLevel)
      const demoteToLevel = currentIndex < hierarchyOrder.length - 1 
        ? hierarchyOrder[currentIndex + 1] 
        : HierarchyLevel.RF1

      updatedUsers = await prisma.user.updateMany({
        where: {
          id: { in: userIds },
          isActive: true
        },
        data: {
          hierarchyLevel: demoteToLevel
        }
      })
    }

    return NextResponse.json({ 
      message: `Successfully ${action}d ${updatedUsers?.count || 0} users`,
      count: updatedUsers?.count || 0
    })
  } catch (error) {
    console.error('Error updating hierarchy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}