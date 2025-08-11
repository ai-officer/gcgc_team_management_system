import { PrismaClient, UserRole, TeamMemberRole, TaskStatus, Priority, HierarchyLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Generate a secure random password
function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  
  const allChars = lowercase + uppercase + numbers + symbols
  let password = ''
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

async function main() {
  console.log('🌱 Starting seed...')

  // First, seed organizational structure based on your flow
  console.log('📋 Creating organizational structure...')
  
  // Create Divisions
  const realPropertyDiv = await prisma.division.upsert({
    where: { name: 'Real Property' },
    update: {},
    create: { name: 'Real Property', code: 'RP', isActive: true }
  })

  const hotelOpsDiv = await prisma.division.upsert({
    where: { name: 'Hotel Operations' },
    update: {},
    create: { name: 'Hotel Operations', code: 'HO', isActive: true }
  })

  const hotelFranchDiv = await prisma.division.upsert({
    where: { name: 'Hotel Franchising' },
    update: {},
    create: { name: 'Hotel Franchising', code: 'HF', isActive: true }
  })

  const sharedServicesDiv = await prisma.division.upsert({
    where: { name: 'Shared Services - GOLI' },
    update: {},
    create: { name: 'Shared Services - GOLI', code: 'SS', isActive: true }
  })

  const csoDiv = await prisma.division.upsert({
    where: { name: 'CSO' },
    update: {},
    create: { name: 'CSO', code: 'CSO', isActive: true }
  })

  const otherDiv = await prisma.division.upsert({
    where: { name: 'Other' },
    update: {},
    create: { name: 'Other', code: 'OTH', isActive: true }
  })

  // Real Property Departments (Dd3)
  const etiiDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'ETII', divisionId: realPropertyDiv.id } },
    update: {},
    create: { name: 'ETII', code: 'ETII', divisionId: realPropertyDiv.id, isActive: true }
  })

  const ecliDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'ECLI', divisionId: realPropertyDiv.id } },
    update: {},
    create: { name: 'ECLI', code: 'ECLI', divisionId: realPropertyDiv.id, isActive: true }
  })

  const kppiDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'KPPI', divisionId: realPropertyDiv.id } },
    update: {},
    create: { name: 'KPPI', code: 'KPPI', divisionId: realPropertyDiv.id, isActive: true }
  })

  const reitDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'REIT', divisionId: realPropertyDiv.id } },
    update: {},
    create: { name: 'REIT', code: 'REIT', divisionId: realPropertyDiv.id, isActive: false }
  })

  const rpOtherDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Other', divisionId: realPropertyDiv.id } },
    update: {},
    create: { name: 'Other', code: 'RP_OTH', divisionId: realPropertyDiv.id, isActive: true }
  })

  // Hotel Operations Departments (will be populated with sector heads)
  const sogoHotelDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Sogo', divisionId: hotelOpsDiv.id } },
    update: {},
    create: { name: 'Sogo', code: 'S09', divisionId: hotelOpsDiv.id, isActive: true }
  })

  const eurotelHotelDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Eurotel', divisionId: hotelOpsDiv.id } },
    update: {},
    create: { name: 'Eurotel', code: 'E05', divisionId: hotelOpsDiv.id, isActive: true }
  })

  const astrotelHotelDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Astrotel', divisionId: hotelOpsDiv.id } },
    update: {},
    create: { name: 'Astrotel', code: 'A03', divisionId: hotelOpsDiv.id, isActive: true }
  })

  const dreamWorldHotelDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'DreamWorld', divisionId: hotelOpsDiv.id } },
    update: {},
    create: { name: 'DreamWorld', code: 'D02', divisionId: hotelOpsDiv.id, isActive: true }
  })

  const apoViewHotelDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Apo View', divisionId: hotelOpsDiv.id } },
    update: {},
    create: { name: 'Apo View', code: 'AVH', divisionId: hotelOpsDiv.id, isActive: true }
  })

  const dormtelHotelDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Dormtel', divisionId: hotelOpsDiv.id } },
    update: {},
    create: { name: 'Dormtel', code: 'DT1', divisionId: hotelOpsDiv.id, isActive: true }
  })

  const hoOtherDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Other', divisionId: hotelOpsDiv.id } },
    update: {},
    create: { name: 'Other', code: 'O01', divisionId: hotelOpsDiv.id, isActive: true }
  })

  // Shared Services - GOLI Departments (Dd5)
  const financeAcctDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Finance & Accounting', divisionId: sharedServicesDiv.id } },
    update: {},
    create: { name: 'Finance & Accounting', code: 'FA', divisionId: sharedServicesDiv.id, isActive: true }
  })

  const hrAdminDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'HR & Admin', divisionId: sharedServicesDiv.id } },
    update: {},
    create: { name: 'HR & Admin', code: 'HR', divisionId: sharedServicesDiv.id, isActive: true }
  })

  const itTechDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'IT & Tech Support', divisionId: sharedServicesDiv.id } },
    update: {},
    create: { name: 'IT & Tech Support', code: 'IT', divisionId: sharedServicesDiv.id, isActive: true }
  })

  const engineeringDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Engineering', divisionId: sharedServicesDiv.id } },
    update: {},
    create: { name: 'Engineering', code: 'ENG', divisionId: sharedServicesDiv.id, isActive: true }
  })

  const procurementDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Procurement', divisionId: sharedServicesDiv.id } },
    update: {},
    create: { name: 'Procurement', code: 'PROC', divisionId: sharedServicesDiv.id, isActive: true }
  })

  const ssOtherDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Other', divisionId: sharedServicesDiv.id } },
    update: {},
    create: { name: 'Other', code: 'SS_OTH', divisionId: sharedServicesDiv.id, isActive: true }
  })

  // CSO Departments (Dd6)
  const bigDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'BIG', divisionId: csoDiv.id } },
    update: {},
    create: { name: 'BIG', code: 'BIG', divisionId: csoDiv.id, isActive: true }
  })

  const businessDevDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Business Dev', divisionId: csoDiv.id } },
    update: {},
    create: { name: 'Business Dev', code: 'BD', divisionId: csoDiv.id, isActive: true }
  })

  const laundryDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Laundry (LDI)', divisionId: csoDiv.id } },
    update: {},
    create: { name: 'Laundry (LDI)', code: 'LDI', divisionId: csoDiv.id, isActive: true }
  })

  const commissaryDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Commissary', divisionId: csoDiv.id } },
    update: {},
    create: { name: 'Commissary', code: 'COM', divisionId: csoDiv.id, isActive: true }
  })

  const retailDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Retail (AllenOne)', divisionId: csoDiv.id } },
    update: {},
    create: { name: 'Retail (AllenOne)', code: 'RETAIL', divisionId: csoDiv.id, isActive: true }
  })

  const gamingDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Gaming', divisionId: csoDiv.id } },
    update: {},
    create: { name: 'Gaming', code: 'GAMING', divisionId: csoDiv.id, isActive: true }
  })

  const mechanicalDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Mechanical (CMI)', divisionId: csoDiv.id } },
    update: {},
    create: { name: 'Mechanical (CMI)', code: 'CMI', divisionId: csoDiv.id, isActive: true }
  })

  const csoOtherDept = await prisma.department.upsert({
    where: { name_divisionId: { name: 'Other', divisionId: csoDiv.id } },
    update: {},
    create: { name: 'Other', code: 'CSO_OTH', divisionId: csoDiv.id, isActive: true }
  })

  // Real Property Sections (Dd7) for ETII, ECLI, KPPI
  const cdgSections = [
    { deptId: etiiDept.id, name: 'CDG' },
    { deptId: ecliDept.id, name: 'CDG' },
    { deptId: kppiDept.id, name: 'CDG' }
  ]

  const faSections = [
    { deptId: etiiDept.id, name: 'F&A' },
    { deptId: ecliDept.id, name: 'F&A' },
    { deptId: kppiDept.id, name: 'F&A' }
  ]

  const smSections = [
    { deptId: etiiDept.id, name: 'S&M' },
    { deptId: ecliDept.id, name: 'S&M' },
    { deptId: kppiDept.id, name: 'S&M' }
  ]

  const allSections = [...cdgSections, ...faSections, ...smSections]

  for (const section of allSections) {
    await prisma.section.upsert({
      where: { name_departmentId: { name: section.name, departmentId: section.deptId } },
      update: {},
      create: { 
        name: section.name, 
        code: section.name, 
        departmentId: section.deptId, 
        isActive: true 
      }
    })
  }

  // Create Sector Heads for Hotel Operations
  const sectorHeads = [
    { initials: 'JD', fullName: 'John Doe', description: 'Hotel Operations Manager' },
    { initials: 'JS', fullName: 'Jane Smith', description: 'Hotel Operations Supervisor' },
    { initials: 'MJ', fullName: 'Mike Johnson', description: 'Regional Hotel Manager' }
  ]

  for (const head of sectorHeads) {
    await prisma.sectorHead.upsert({
      where: { initials: head.initials },
      update: {},
      create: {
        initials: head.initials,
        fullName: head.fullName,
        description: head.description,
        divisionId: hotelOpsDiv.id,
        isActive: true
      }
    })
  }

  // Create Job Levels
  const jobLevels = [
    { name: 'RF1', description: 'Rank and File Level 1', order: 1 },
    { name: 'RF2', description: 'Rank and File Level 2', order: 2 },
    { name: 'RF3', description: 'Rank and File Level 3', order: 3 },
    { name: 'OF1', description: 'Officer Level 1', order: 4 },
    { name: 'OF2', description: 'Officer Level 2', order: 5 },
    { name: 'M1', description: 'Manager Level 1', order: 6 },
    { name: 'M2', description: 'Manager Level 2', order: 7 }
  ]

  for (const level of jobLevels) {
    await prisma.jobLevel.upsert({
      where: { name: level.name },
      update: {},
      create: {
        name: level.name,
        description: level.description,
        order: level.order,
        isActive: true
      }
    })
  }

  console.log('✅ Organizational structure created successfully!')

  // Generate secure passwords for demo users
  const adminPasswordPlain = generateSecurePassword()
  const m2PasswordPlain = generateSecurePassword()
  const leader1PasswordPlain = generateSecurePassword()
  const leader2PasswordPlain = generateSecurePassword()
  const member1PasswordPlain = generateSecurePassword()
  const member2PasswordPlain = generateSecurePassword()
  const member3PasswordPlain = generateSecurePassword()
  const member4PasswordPlain = generateSecurePassword()

  // Create admin user (system admin - separate from hierarchy)
  const adminPassword = await bcrypt.hash(adminPasswordPlain, 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gcgc.com' },
    update: {},
    create: {
      email: 'admin@gcgc.com',
      password: adminPassword,
      name: 'System Administrator',
      role: UserRole.ADMIN,
      hierarchyLevel: null, // Admin role is separate from organizational hierarchy
    },
  })

  // Create M2 level user (highest organizational level)
  const m2Password = await bcrypt.hash(m2PasswordPlain, 12)
  const m2User = await prisma.user.upsert({
    where: { email: 'm2@gcgc.com' },
    update: {},
    create: {
      email: 'm2@gcgc.com',
      password: m2Password,
      name: 'Senior Executive',
      role: UserRole.LEADER,
      hierarchyLevel: HierarchyLevel.M2,
    },
  })

  // Create leader users
  const leader1Password = await bcrypt.hash(leader1PasswordPlain, 12)
  const leader1 = await prisma.user.upsert({
    where: { email: 'leader1@gcgc.com' },
    update: {},
    create: {
      email: 'leader1@gcgc.com',
      password: leader1Password,
      name: 'John Leader',
      role: UserRole.LEADER,
      hierarchyLevel: HierarchyLevel.M1,
    },
  })

  const leader2Password = await bcrypt.hash(leader2PasswordPlain, 12)
  const leader2 = await prisma.user.upsert({
    where: { email: 'leader2@gcgc.com' },
    update: {},
    create: {
      email: 'leader2@gcgc.com',
      password: leader2Password,
      name: 'Jane Leader',
      role: UserRole.LEADER,
      hierarchyLevel: HierarchyLevel.OF2,
    },
  })

  // Create member users
  const member1Password = await bcrypt.hash(member1PasswordPlain, 12)
  const member2Password = await bcrypt.hash(member2PasswordPlain, 12)
  const member3Password = await bcrypt.hash(member3PasswordPlain, 12)
  const member4Password = await bcrypt.hash(member4PasswordPlain, 12)
  const members = await Promise.all([
    prisma.user.upsert({
      where: { email: 'member1@gcgc.com' },
      update: {},
      create: {
        email: 'member1@gcgc.com',
        password: member1Password,
        name: 'Alice Member',
        role: UserRole.MEMBER,
        hierarchyLevel: HierarchyLevel.OF1,
      },
    }),
    prisma.user.upsert({
      where: { email: 'member2@gcgc.com' },
      update: {},
      create: {
        email: 'member2@gcgc.com',
        password: member2Password,
        name: 'Bob Member',
        role: UserRole.MEMBER,
        hierarchyLevel: HierarchyLevel.RF3,
      },
    }),
    prisma.user.upsert({
      where: { email: 'member3@gcgc.com' },
      update: {},
      create: {
        email: 'member3@gcgc.com',
        password: member3Password,
        name: 'Charlie Member',
        role: UserRole.MEMBER,
        hierarchyLevel: HierarchyLevel.RF2,
      },
    }),
    prisma.user.upsert({
      where: { email: 'member4@gcgc.com' },
      update: {},
      create: {
        email: 'member4@gcgc.com',
        password: member4Password,
        name: 'Diana Member',
        role: UserRole.MEMBER,
        hierarchyLevel: HierarchyLevel.RF1,
      },
    }),
  ])

  // Create teams
  const team1 = await prisma.team.create({
    data: {
      name: 'Development Team',
      description: 'Frontend and Backend Development Team',
    },
  })

  const team2 = await prisma.team.create({
    data: {
      name: 'Design Team',
      description: 'UI/UX Design and Graphics Team',
    },
  })

  // Create team memberships
  await Promise.all([
    // Development Team
    prisma.teamMember.create({
      data: {
        userId: leader1.id,
        teamId: team1.id,
        role: TeamMemberRole.LEADER,
      },
    }),
    prisma.teamMember.create({
      data: {
        userId: members[0].id,
        teamId: team1.id,
        role: TeamMemberRole.MEMBER,
      },
    }),
    prisma.teamMember.create({
      data: {
        userId: members[1].id,
        teamId: team1.id,
        role: TeamMemberRole.MEMBER,
      },
    }),
    // Design Team
    prisma.teamMember.create({
      data: {
        userId: leader2.id,
        teamId: team2.id,
        role: TeamMemberRole.LEADER,
      },
    }),
    prisma.teamMember.create({
      data: {
        userId: members[2].id,
        teamId: team2.id,
        role: TeamMemberRole.MEMBER,
      },
    }),
    prisma.teamMember.create({
      data: {
        userId: members[3].id,
        teamId: team2.id,
        role: TeamMemberRole.MEMBER,
      },
    }),
  ])

  // Create sample tasks
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await Promise.all([
    prisma.task.create({
      data: {
        title: 'Implement User Authentication',
        description: 'Set up NextAuth.js with email/password and OAuth providers',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        dueDate: nextWeek,
        assigneeId: members[0].id,
        creatorId: leader1.id,
        teamId: team1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Design Dashboard Layout',
        description: 'Create wireframes and mockups for the main dashboard',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        dueDate: nextMonth,
        assigneeId: members[2].id,
        creatorId: leader2.id,
        teamId: team2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Setup Database Schema',
        description: 'Design and implement Prisma schema for all entities',
        status: TaskStatus.COMPLETED,
        priority: Priority.HIGH,
        assigneeId: members[1].id,
        creatorId: leader1.id,
        teamId: team1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Create Brand Guidelines',
        description: 'Establish color palette, typography, and component styles',
        status: TaskStatus.IN_REVIEW,
        priority: Priority.MEDIUM,
        dueDate: nextWeek,
        assigneeId: members[3].id,
        creatorId: leader2.id,
        teamId: team2.id,
      },
    }),
  ])

  // Create sample events
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

  await Promise.all([
    prisma.event.create({
      data: {
        title: 'Team Standup',
        description: 'Daily standup meeting for development team',
        startTime: new Date(tomorrow.setHours(9, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(9, 30, 0, 0)),
        creatorId: leader1.id,
        teamId: team1.id,
        color: '#3b82f6',
      },
    }),
    prisma.event.create({
      data: {
        title: 'Design Review',
        description: 'Weekly design review and feedback session',
        startTime: new Date(dayAfterTomorrow.setHours(14, 0, 0, 0)),
        endTime: new Date(dayAfterTomorrow.setHours(15, 30, 0, 0)),
        creatorId: leader2.id,
        teamId: team2.id,
        color: '#ef4444',
      },
    }),
  ])

  console.log('✅ Seed completed successfully!')
  console.log('\n📊 Created:')
  console.log('- 1 Admin user (system access)')
  console.log('- 1 M2 level user (highest org hierarchy)')
  console.log('- 2 Leader users')
  console.log('- 4 Member users')
  console.log('- 2 Teams')
  console.log('- 4 Sample tasks')
  console.log('- 2 Sample events')
  console.log('\n🔑 Login credentials (SECURE GENERATED PASSWORDS):')
  console.log(`System Admin: admin@gcgc.com / ${adminPasswordPlain}`)
  console.log(`M2 Executive: m2@gcgc.com / ${m2PasswordPlain}`)
  console.log(`M1 Leader: leader1@gcgc.com / ${leader1PasswordPlain}`)
  console.log(`OF2 Leader: leader2@gcgc.com / ${leader2PasswordPlain}`)
  console.log(`OF1 Member: member1@gcgc.com / ${member1PasswordPlain}`)
  console.log(`RF3 Member: member2@gcgc.com / ${member2PasswordPlain}`)
  console.log(`RF2 Member: member3@gcgc.com / ${member3PasswordPlain}`)
  console.log(`RF1 Member: member4@gcgc.com / ${member4PasswordPlain}`)
  console.log('\n⚠️  IMPORTANT: Save these passwords securely. They will not be shown again!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })