import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure Prisma with connection pooling for production
// For Cloud Run / serverless, limit connections to prevent exhaustion
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Connection pooling is configured via DATABASE_URL parameters:
  // ?connection_limit=10&pool_timeout=20
})

// In development, reuse the client to prevent connection exhaustion during hot reload
// In production, each instance gets its own client (Cloud Run handles scaling)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown for serverless environments
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

// Export as default for compatibility
export default prisma
