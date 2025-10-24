import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Only admins can run this
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔧 Fixing task dates for multi-day events...')

    // Find the "Test" task and fix it
    const testTask = await prisma.task.findFirst({
      where: {
        title: { contains: 'Test' }
      }
    })

    if (!testTask) {
      return NextResponse.json({ error: 'Test task not found' }, { status: 404 })
    }

    console.log(`📝 Found test task: ${testTask.title}`)
    console.log(`   Current startDate: ${testTask.startDate}`)
    console.log(`   Current dueDate: ${testTask.dueDate}`)

    // Set it to Oct 24-28, 2025 with proper timezone handling
    const startDate = new Date('2025-10-24T00:00:00.000Z')
    const dueDate = new Date('2025-10-28T23:59:59.999Z')

    await prisma.task.update({
      where: { id: testTask.id },
      data: {
        startDate,
        dueDate,
        allDay: true
      }
    })

    console.log(`✅ Updated test task to multi-day event`)

    return NextResponse.json({
      success: true,
      message: 'Task dates fixed successfully',
      task: {
        id: testTask.id,
        title: testTask.title,
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
        allDay: true
      }
    })
  } catch (error) {
    console.error('Error fixing task dates:', error)
    return NextResponse.json(
      { error: 'Failed to fix task dates' },
      { status: 500 }
    )
  }
}
