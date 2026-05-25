import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetPassword() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.log('Usage: npm run reset-password <email> <new-password>')
    console.log('Example: npm run reset-password admin@gcgc.com NewPassword123!')
    process.exit(1)
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    await prisma.user.update({
      where: { email },
      data: { password: hashed },
    })
    console.log(`✅ Password reset for ${email} (${user.name})`)
  } else {
    const username = email.split('@')[0]
    const created = await prisma.user.create({
      data: {
        email,
        username,
        password: hashed,
        name: 'System Administrator',
        role: UserRole.ADMIN,
        isActive: true,
        emailVerified: new Date(),
      },
    })
    console.log(`✅ Admin user created: ${created.email} (${created.name})`)
  }
}

resetPassword()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
