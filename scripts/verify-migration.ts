import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyMigration() {
  console.log('🔍 Verifying Local Database Migration')
  console.log('=' * 40)
  
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Check all tables and their record counts
    const tables = [
      'user', 'admin', 'division', 'department', 'section', 'teamLabel',
      'sectorHead', 'jobLevel', 'organizationalUnit', 'team', 'teamMember',
      'task', 'taskTeamMember', 'taskCollaborator', 'comment', 'commentReaction',
      'event', 'activity', 'account', 'session', 'verificationToken',
      'adminSettings', 'organizationTemplate'
    ]
    
    let totalRecords = 0
    
    for (const table of tables) {
      try {
        const count = await (prisma as any)[table].count()
        totalRecords += count
        console.log(`📊 ${table}: ${count} records`)
      } catch (error) {
        console.warn(`⚠️  Could not count ${table}: ${error}`)
      }
    }
    
    console.log(`\n📈 Total records: ${totalRecords}`)
    
    // Sample some key data
    console.log('\n🔍 Sample Data Check:')
    
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      const sampleUser = await prisma.user.findFirst({
        select: { id: true, email: true, name: true, role: true }
      })
      console.log(`👤 Sample User: ${sampleUser?.name || sampleUser?.email} (${sampleUser?.role})`)
    }
    
    const teamCount = await prisma.team.count()
    if (teamCount > 0) {
      const sampleTeam = await prisma.team.findFirst({
        select: { id: true, name: true, _count: { select: { members: true } } }
      })
      console.log(`👥 Sample Team: ${sampleTeam?.name} (${sampleTeam?._count.members} members)`)
    }
    
    const taskCount = await prisma.task.count()
    if (taskCount > 0) {
      const sampleTask = await prisma.task.findFirst({
        select: { id: true, title: true, status: true, creator: { select: { name: true, email: true } } }
      })
      console.log(`📋 Sample Task: ${sampleTask?.title} (${sampleTask?.status}) by ${sampleTask?.creator.name || sampleTask?.creator.email}`)
    }
    
    console.log('\n✅ Migration verification completed successfully!')
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  verifyMigration().catch(console.error)
}

export { verifyMigration }