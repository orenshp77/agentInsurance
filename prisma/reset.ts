import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 מתחיל איפוס מערכת...')

  // Delete all data in correct order (respecting foreign keys)
  console.log('🗑️  מוחק קבצים...')
  await prisma.file.deleteMany({})

  console.log('🗑️  מוחק תיקיות...')
  await prisma.folder.deleteMany({})

  console.log('🗑️  מוחק התראות...')
  await prisma.notification.deleteMany({})

  console.log('🗑️  מוחק פעילויות...')
  await prisma.activity.deleteMany({})

  console.log('🗑️  מוחק לוגים...')
  await prisma.log.deleteMany({})

  console.log('🗑️  מוחק לקוחות וסוכנים...')
  await prisma.user.deleteMany({
    where: {
      role: {
        in: ['AGENT', 'CLIENT']
      }
    }
  })

  // Ensure we have an admin user
  console.log('👤 יוצר/מעדכן משתמש מנהל...')
  const adminPasswordPlain = process.env.SEED_ADMIN_PASSWORD

  if (!adminPasswordPlain) {
    throw new Error(
      '🔒 SECURITY ERROR: SEED_ADMIN_PASSWORD environment variable is required!\n' +
      'Please set a strong password in your .env file:\n' +
      'SEED_ADMIN_PASSWORD="YourStrongPasswordHere!@#123"\n'
    )
  }

  if (adminPasswordPlain.length < 12) {
    throw new Error('🔒 SECURITY ERROR: Admin password must be at least 12 characters long!')
  }

  const adminPassword = await bcrypt.hash(adminPasswordPlain, 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@agentpro.com' },
    update: {
      password: adminPassword,
      name: 'מנהל ראשי',
      role: 'ADMIN',
      phone: '050-0000000',
    },
    create: {
      email: 'admin@agentpro.com',
      password: adminPassword,
      name: 'מנהל ראשי',
      role: 'ADMIN',
      phone: '050-0000000',
    },
  })

  // Get final counts
  const userCount = await prisma.user.count()
  const folderCount = await prisma.folder.count()
  const fileCount = await prisma.file.count()
  const notificationCount = await prisma.notification.count()
  const activityCount = await prisma.activity.count()

  console.log('\n✅ איפוס הושלם בהצלחה!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 סטטיסטיקות:')
  console.log(`   משתמשים: ${userCount}`)
  console.log(`   תיקיות: ${folderCount}`)
  console.log(`   קבצים: ${fileCount}`)
  console.log(`   התראות: ${notificationCount}`)
  console.log(`   פעילויות: ${activityCount}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔑 פרטי התחברות למנהל:')
  console.log(`   Email: ${admin.email}`)
  console.log(`   Password: [Set from SEED_ADMIN_PASSWORD env variable]`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⚠️  IMPORTANT: Keep your admin password secure!')
  console.log('🎯 המערכת מוכנה לפרזנטציה!')
}

main()
  .catch((e) => {
    console.error('❌ שגיאה באיפוס:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
