#!/bin/bash
# Final fix - run seed script on production

cd ~
cat > seed.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.deleteMany({
    where: { email: 'admin@agentpro.com' }
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@agentpro.com',
      password: adminPassword,
      name: 'מנהל ראשי',
      role: 'ADMIN',
      phone: '050-0000000',
      profileCompleted: true
    }
  });

  console.log('Admin created:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
EOF

npm install @prisma/client bcryptjs
export DATABASE_URL="mysql://root:%7EQ%40%2AJ%2F%28m%3ANTx%7B%7E@34.77.205.82:3306/agent_pro"
node seed.js

echo ""
echo "Done. Login at:"
echo "https://insurance-app-767151043885.me-west1.run.app/login"
echo "Email: admin@agentpro.com"
echo "Password: admin123"
