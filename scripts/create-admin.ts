import { PrismaClient, UserRole, HierarchyLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const email = process.argv[2]
    const password = process.argv[3]
    const name = process.argv[4] || 'Admin User'

    if (!email || !password) {
      console.log('Usage: npm run create-admin <email> <password> [name]')
      console.log('Example: npm run create-admin admin@company.com mypassword123 "John Admin"')
      return
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log(`❌ User with email ${email} already exists`)
      
      // If they're not an admin, upgrade them
      if (existingUser.role !== UserRole.ADMIN) {
        await prisma.user.update({
          where: { email },
          data: { 
            role: UserRole.ADMIN,
            isActive: true
          }
        })
        console.log(`✅ Upgraded ${email} to ADMIN role`)
      } else {
        console.log(`ℹ️  ${email} is already an ADMIN`)
      }
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: UserRole.ADMIN,
        hierarchyLevel: HierarchyLevel.M2,
        isActive: true,
        emailVerified: new Date(),
        isLeader: true
      }
    })

    console.log(`✅ Admin user created successfully!`)
    console.log(`📧 Email: ${admin.email}`)
    console.log(`👤 Name: ${admin.name}`)
    console.log(`🔑 Role: ${admin.role}`)
    console.log(`\n🔗 You can now login at: http://localhost:3000/auth/signin`)

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function listAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hierarchyLevel: true,
        isActive: true,
        createdAt: true
      }
    })

    console.log(`\n📋 Current Admin Users (${admins.length}):`)
    console.log('=' .repeat(60))
    
    if (admins.length === 0) {
      console.log('❌ No admin users found!')
      console.log('Run: npm run create-admin <email> <password> to create one')
    } else {
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.name || 'No Name'}`)
        console.log(`   📧 Email: ${admin.email}`)
        console.log(`   🔑 Role: ${admin.role}`)
        console.log(`   📊 Level: ${admin.hierarchyLevel || 'None'}`)
        console.log(`   ✅ Active: ${admin.isActive ? 'Yes' : 'No'}`)
        console.log(`   📅 Created: ${admin.createdAt.toLocaleDateString()}`)
        console.log('')
      })
    }
  } catch (error) {
    console.error('❌ Error listing admin users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if we want to list admins or create one
const action = process.argv[2]

if (action === 'list' || action === '--list' || action === '-l') {
  listAdmins()
} else {
  createAdmin()
}
