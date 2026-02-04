import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Delete all files first (foreign key constraint)
  await prisma.file.deleteMany({})
  console.log('Deleted all files')

  // Delete all folders
  await prisma.folder.deleteMany({})
  console.log('Deleted all folders')

  // Delete agent and client users (keep admin)
  await prisma.user.deleteMany({
    where: {
      role: {
        not: 'ADMIN'
      }
    }
  })
  console.log('Deleted agent and client users')

  console.log('Done! Only admin user remains.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
