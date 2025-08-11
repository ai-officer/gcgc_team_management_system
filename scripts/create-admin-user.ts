import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  const username = process.argv[2]
  const password = process.argv[3]

  if (!username || !password) {
    console.error('Usage: npm run create-admin <username> <password>')
    process.exit(1)
  }

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { username }
    })

    if (existingAdmin) {
      console.error(`Admin with username '${username}' already exists`)
      process.exit(1)
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create the admin
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
      }
    })

    console.log(`✅ Admin user created successfully!`)
    console.log(`Username: ${admin.username}`)
    console.log(`ID: ${admin.id}`)
    console.log(`Created at: ${admin.createdAt}`)
    
  } catch (error) {
    console.error('Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
