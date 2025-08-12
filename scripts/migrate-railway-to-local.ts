import { PrismaClient } from '@prisma/client'

// Railway staging database connection
const railwayPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.RAILWAY_DATABASE_URL!
    }
  }
})

// Local database connection  
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL!
    }
  }
})

interface MigrationStats {
  [key: string]: {
    exported: number
    imported: number
    skipped: number
    errors: string[]
  }
}

const stats: MigrationStats = {}

async function logProgress(table: string, action: string, count: number) {
  if (!stats[table]) {
    stats[table] = { exported: 0, imported: 0, skipped: 0, errors: [] }
  }
  
  if (action === 'exported') stats[table].exported = count
  if (action === 'imported') stats[table].imported = count
  if (action === 'skipped') stats[table].skipped = count
  
  console.log(`📊 ${table}: ${action} ${count} records`)
}

async function logError(table: string, error: string) {
  if (!stats[table]) {
    stats[table] = { exported: 0, imported: 0, skipped: 0, errors: [] }
  }
  stats[table].errors.push(error)
  console.error(`❌ ${table}: ${error}`)
}

async function migrateTable<T extends Record<string, any>>(
  tableName: string,
  exportQuery: () => Promise<T[]>,
  importData: (data: T[]) => Promise<void>,
  clearLocal: boolean = true
) {
  try {
    console.log(`\n🔄 Migrating ${tableName}...`)
    
    // Export from Railway
    console.log(`📤 Exporting ${tableName} from Railway...`)
    const data = await exportQuery()
    await logProgress(tableName, 'exported', data.length)
    
    if (data.length === 0) {
      console.log(`⏭️  No data found in ${tableName}, skipping...`)
      return
    }
    
    // Clear local data if requested
    if (clearLocal) {
      console.log(`🗑️  Clearing local ${tableName}...`)
      await (localPrisma as any)[tableName].deleteMany({})
    }
    
    // Import to local
    console.log(`📥 Importing ${tableName} to local database...`)
    await importData(data)
    await logProgress(tableName, 'imported', data.length)
    
    console.log(`✅ ${tableName} migration completed`)
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logError(tableName, errorMsg)
    console.error(`❌ Failed to migrate ${tableName}:`, error)
  }
}

async function migrateAllData() {
  console.log('🚀 Starting Railway to Local Database Migration')
  console.log('=' * 50)
  
  // Validate environment variables
  console.log('🔍 Checking environment variables...')
  const railwayUrl = process.env.RAILWAY_DATABASE_URL
  const localUrl = process.env.DATABASE_URL
  
  if (!railwayUrl) {
    console.error('❌ RAILWAY_DATABASE_URL is required but not set')
    console.error('💡 Please add RAILWAY_DATABASE_URL to your .env file')
    console.error('   Example: RAILWAY_DATABASE_URL="postgresql://postgres:password@host:port/database"')
    throw new Error('Missing RAILWAY_DATABASE_URL environment variable')
  } else {
    console.log('✅ RAILWAY_DATABASE_URL configured')
  }
  
  if (!localUrl) {
    console.error('❌ DATABASE_URL is required but not set')
    console.error('💡 Please add DATABASE_URL to your .env file')
    console.error('   Example: DATABASE_URL="postgresql://postgres:password@localhost:5432/database"')
    throw new Error('Missing DATABASE_URL environment variable')
  } else {
    console.log('✅ DATABASE_URL configured')
  }
  
  try {
    // Test connections
    console.log('\n🔌 Testing database connections...')
    await railwayPrisma.$connect()
    console.log('✅ Railway connection successful')
    
    await localPrisma.$connect()
    console.log('✅ Local connection successful')
    
    // Migrate in dependency order
    
    // 1. Independent tables first
    await migrateTable(
      'adminSettings',
      () => railwayPrisma.adminSettings.findMany(),
      (data) => localPrisma.adminSettings.createMany({ data, skipDuplicates: true })
    )
    
    await migrateTable(
      'admin',
      () => railwayPrisma.admin.findMany(),
      (data) => localPrisma.admin.createMany({ data, skipDuplicates: true })
    )
    
    await migrateTable(
      'division',
      () => railwayPrisma.division.findMany(),
      (data) => localPrisma.division.createMany({ data, skipDuplicates: true })
    )
    
    await migrateTable(
      'sectorHead',
      () => railwayPrisma.sectorHead.findMany(),
      (data) => localPrisma.sectorHead.createMany({ data, skipDuplicates: true })
    )
    
    await migrateTable(
      'jobLevel',
      () => railwayPrisma.jobLevel.findMany(),
      (data) => localPrisma.jobLevel.createMany({ data, skipDuplicates: true })
    )
    
    await migrateTable(
      'organizationTemplate',
      () => railwayPrisma.organizationTemplate.findMany(),
      (data) => localPrisma.organizationTemplate.createMany({ data, skipDuplicates: true })
    )
    
    // 2. Department depends on Division
    await migrateTable(
      'department',
      () => railwayPrisma.department.findMany(),
      (data) => localPrisma.department.createMany({ data, skipDuplicates: true })
    )
    
    // 3. Section depends on Department
    await migrateTable(
      'section',
      () => railwayPrisma.section.findMany(),
      (data) => localPrisma.section.createMany({ data, skipDuplicates: true })
    )
    
    // 4. TeamLabel depends on Section
    await migrateTable(
      'teamLabel',
      () => railwayPrisma.teamLabel.findMany(),
      (data) => localPrisma.teamLabel.createMany({ data, skipDuplicates: true })
    )
    
    // 5. OrganizationalUnit (self-referencing, handle carefully)
    await migrateTable(
      'organizationalUnit',
      () => railwayPrisma.organizationalUnit.findMany({ orderBy: { level: 'asc' } }),
      async (data) => {
        // Insert in order by level to respect parent-child relationships
        for (const unit of data) {
          try {
            await localPrisma.organizationalUnit.create({ data: unit })
          } catch (error) {
            console.warn(`⚠️  Skipping organizational unit ${unit.name}: ${error}`)
          }
        }
      }
    )
    
    // 6. Users (may have self-referencing reportsTo)
    await migrateTable(
      'user',
      () => railwayPrisma.user.findMany(),
      async (data) => {
        // First pass: create users without reportsTo
        const usersWithoutReports = data.map(user => ({ ...user, reportsToId: null }))
        await localPrisma.user.createMany({ data: usersWithoutReports, skipDuplicates: true })
        
        // Second pass: update reportsTo relationships
        for (const user of data) {
          if (user.reportsToId) {
            try {
              await localPrisma.user.update({
                where: { id: user.id },
                data: { reportsToId: user.reportsToId }
              })
            } catch (error) {
              console.warn(`⚠️  Skipping reportsTo for user ${user.id}: ${error}`)
            }
          }
        }
      }
    )
    
    // 7. Teams
    await migrateTable(
      'team',
      () => railwayPrisma.team.findMany(),
      (data) => localPrisma.team.createMany({ data, skipDuplicates: true })
    )
    
    // 8. TeamMembers (depends on User and Team)
    await migrateTable(
      'teamMember',
      () => railwayPrisma.teamMember.findMany(),
      (data) => localPrisma.teamMember.createMany({ data, skipDuplicates: true })
    )
    
    // 9. Tasks (depends on User and Team)
    await migrateTable(
      'task',
      () => railwayPrisma.task.findMany(),
      (data) => localPrisma.task.createMany({ data, skipDuplicates: true })
    )
    
    // 10. Task-related tables
    await migrateTable(
      'taskTeamMember',
      () => railwayPrisma.taskTeamMember.findMany(),
      (data) => localPrisma.taskTeamMember.createMany({ data, skipDuplicates: true })
    )
    
    await migrateTable(
      'taskCollaborator',
      () => railwayPrisma.taskCollaborator.findMany(),
      (data) => localPrisma.taskCollaborator.createMany({ data, skipDuplicates: true })
    )
    
    // 11. Comments (depends on Task and User)
    await migrateTable(
      'comment',
      () => railwayPrisma.comment.findMany(),
      async (data) => {
        // Handle potential self-referencing parentId
        const rootComments = data.filter(c => !c.parentId)
        const childComments = data.filter(c => c.parentId)
        
        // Create root comments first
        if (rootComments.length > 0) {
          await localPrisma.comment.createMany({ data: rootComments, skipDuplicates: true })
        }
        
        // Then create child comments
        for (const comment of childComments) {
          try {
            await localPrisma.comment.create({ data: comment })
          } catch (error) {
            console.warn(`⚠️  Skipping comment ${comment.id}: ${error}`)
          }
        }
      }
    )
    
    // 12. CommentReactions (depends on Comment and User)
    await migrateTable(
      'commentReaction',
      () => railwayPrisma.commentReaction.findMany(),
      (data) => localPrisma.commentReaction.createMany({ data, skipDuplicates: true })
    )
    
    // 13. Events (depends on User, Team, Task)
    await migrateTable(
      'event',
      () => railwayPrisma.event.findMany(),
      (data) => localPrisma.event.createMany({ data, skipDuplicates: true })
    )
    
    // 14. Activities (depends on User)
    await migrateTable(
      'activity',
      () => railwayPrisma.activity.findMany(),
      (data) => localPrisma.activity.createMany({ data, skipDuplicates: true })
    )
    
    // 15. Auth-related tables
    await migrateTable(
      'account',
      () => railwayPrisma.account.findMany(),
      (data) => localPrisma.account.createMany({ data, skipDuplicates: true })
    )
    
    await migrateTable(
      'session',
      () => railwayPrisma.session.findMany(),
      (data) => localPrisma.session.createMany({ data, skipDuplicates: true })
    )
    
    await migrateTable(
      'verificationToken',
      () => railwayPrisma.verificationToken.findMany(),
      (data) => localPrisma.verificationToken.createMany({ data, skipDuplicates: true })
    )
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    throw error
  } finally {
    await railwayPrisma.$disconnect()
    await localPrisma.$disconnect()
  }
}

async function printSummary() {
  console.log('\n📊 Migration Summary')
  console.log('=' * 50)
  
  let totalExported = 0
  let totalImported = 0
  let totalErrors = 0
  
  for (const [table, stat] of Object.entries(stats)) {
    totalExported += stat.exported
    totalImported += stat.imported
    totalErrors += stat.errors.length
    
    const status = stat.errors.length > 0 ? '⚠️' : '✅'
    console.log(`${status} ${table}: ${stat.exported} → ${stat.imported} (${stat.errors.length} errors)`)
    
    if (stat.errors.length > 0) {
      stat.errors.forEach(error => console.log(`    ❌ ${error}`))
    }
  }
  
  console.log('\n📈 Totals:')
  console.log(`  Exported: ${totalExported} records`)
  console.log(`  Imported: ${totalImported} records`)
  console.log(`  Errors: ${totalErrors}`)
  
  if (totalErrors === 0) {
    console.log('\n🎉 Migration completed successfully!')
  } else {
    console.log('\n⚠️  Migration completed with warnings. Check errors above.')
  }
}

// Main execution
async function main() {
  try {
    await migrateAllData()
    await printSummary()
  } catch (error) {
    console.error('💥 Fatal error during migration:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { migrateAllData, stats }