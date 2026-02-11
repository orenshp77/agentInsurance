const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: 'mysql://root:~Q%40*J%2F(m%3ANTx%7B~@34.77.205.82:3306/agent_pro' }
    }
  });

  try {
    const hash = await bcrypt.hash('SecureAdmin!Pass2024#', 10);
    await prisma.user.update({
      where: { email: 'admin@agentpro.com' },
      data: { password: hash }
    });
    console.log('Password updated!');
  } finally {
    await prisma.$disconnect();
  }
}
main();
