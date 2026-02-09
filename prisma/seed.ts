import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Get passwords from environment variables or use defaults (ONLY for development)
  const adminPasswordPlain = process.env.SEED_ADMIN_PASSWORD
  const agentPasswordPlain = process.env.SEED_AGENT_PASSWORD || 'agent123'
  const clientPasswordPlain = process.env.SEED_CLIENT_PASSWORD || 'client123'

  if (!adminPasswordPlain) {
    throw new Error(
      '🔒 SECURITY ERROR: SEED_ADMIN_PASSWORD environment variable is required!\n' +
      'Please set a strong password in your .env file:\n' +
      'SEED_ADMIN_PASSWORD="YourStrongPasswordHere!@#123"\n'
    )
  }

  // Validate admin password strength
  if (adminPasswordPlain.length < 12) {
    throw new Error('🔒 SECURITY ERROR: Admin password must be at least 12 characters long!')
  }

  // Create Admin user
  const adminPassword = await bcrypt.hash(adminPasswordPlain, 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@agentpro.com' },
    update: {},
    create: {
      email: 'admin@agentpro.com',
      password: adminPassword,
      name: 'מנהל ראשי',
      role: 'ADMIN',
      phone: '050-0000000',
    },
  })

  // Create Agent user
  const agentPassword = await bcrypt.hash(agentPasswordPlain, 10)
  const agent = await prisma.user.upsert({
    where: { email: 'agent@agentpro.com' },
    update: {},
    create: {
      email: 'agent@agentpro.com',
      password: agentPassword,
      name: 'סוכן לדוגמה',
      role: 'AGENT',
      phone: '050-1111111',
    },
  })

  // Create Client user (belongs to agent)
  const clientPassword = await bcrypt.hash(clientPasswordPlain, 10)
  const client = await prisma.user.upsert({
    where: { email: 'client@agentpro.com' },
    update: {},
    create: {
      email: 'client@agentpro.com',
      password: clientPassword,
      name: 'לקוח לדוגמה',
      role: 'CLIENT',
      phone: '050-2222222',
      idNumber: '123456789',
      agentId: agent.id,
    },
  })

  console.log('Seed completed!')
  console.log('Admin:', admin.email)
  console.log('Agent:', agent.email, '/ agent123')
  console.log('Client:', client.email, '/ client123')
  console.log('\n⚠️  IMPORTANT: Save your admin password securely!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
