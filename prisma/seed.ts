import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create Admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
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
  const agentPassword = await bcrypt.hash('agent123', 10)
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
  const clientPassword = await bcrypt.hash('client123', 10)
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
  console.log('Admin:', admin.email, '/ admin123')
  console.log('Agent:', agent.email, '/ agent123')
  console.log('Client:', client.email, '/ client123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
