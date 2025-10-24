import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixTaskDates() {
  try {
    console.log('🔧 Fixing task dates for multi-day events...\n')

    // Find all tasks that have a dueDate but no startDate
    const tasksWithoutStartDate = await prisma.task.findMany({
      where: {
        dueDate: { not: null },
        startDate: null
      }
    })

    console.log(`Found ${tasksWithoutStartDate.length} tasks without startDate\n`)

    // Update each task to set startDate = dueDate (single day event)
    for (const task of tasksWithoutStartDate) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          startDate: task.dueDate
        }
      })
      console.log(`✅ Updated task: ${task.title}`)
    }

    // Find the specific "[Task] Test" task and fix it to be multi-day
    const testTask = await prisma.task.findFirst({
      where: {
        title: { contains: 'Test' }
      }
    })

    if (testTask) {
      console.log(`\n📝 Found test task: ${testTask.title}`)
      console.log(`   Current startDate: ${testTask.startDate}`)
      console.log(`   Current dueDate: ${testTask.dueDate}`)

      // Set it to Oct 24-28, 2025
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

      console.log(`\n✅ Updated test task to multi-day event:`)
      console.log(`   New startDate: ${startDate.toISOString()}`)
      console.log(`   New dueDate: ${dueDate.toISOString()}`)
      console.log(`   All-day: true`)
    }

    console.log('\n✨ Task dates fixed successfully!')
  } catch (error) {
    console.error('❌ Error fixing task dates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTaskDates()
