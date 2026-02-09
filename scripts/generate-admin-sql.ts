/**
 * Generate SQL Insert Statement for Admin User
 * This script generates the SQL to manually insert the admin user
 */

import bcrypt from 'bcryptjs'

async function generateAdminSQL() {
  console.log('\n════════════════════════════════════════════════════════')
  console.log('  🔑 Admin User SQL Generator')
  console.log('════════════════════════════════════════════════════════\n')

  // Generate bcrypt hash for 'admin123'
  const password = 'admin123'
  const hash = await bcrypt.hash(password, 10)

  console.log('✅ Generated password hash for:', password)
  console.log('')
  console.log('📋 Copy and paste this SQL into your Cloud SQL connection:\n')
  console.log('════════════════════════════════════════════════════════\n')

  const sql = `USE agent_pro;

-- Delete existing admin if any
DELETE FROM User WHERE email = 'admin@agentpro.com';

-- Insert admin user (password: admin123)
INSERT INTO User (
    id,
    email,
    password,
    role,
    name,
    phone,
    profileCompleted,
    createdAt,
    updatedAt
) VALUES (
    'cuid_admin_prod_001',
    'admin@agentpro.com',
    '${hash}',
    'ADMIN',
    'מנהל ראשי',
    '050-0000000',
    1,
    NOW(),
    NOW()
);

-- Verify user was created
SELECT id, email, role, name, createdAt FROM User WHERE email = 'admin@agentpro.com';`

  console.log(sql)
  console.log('\n════════════════════════════════════════════════════════')
  console.log('  ✅ SQL Generated Successfully!')
  console.log('════════════════════════════════════════════════════════\n')
  console.log('📝 To use this SQL:')
  console.log('1. Connect to Cloud SQL:')
  console.log('   gcloud sql connect YOUR_INSTANCE --user=root\n')
  console.log('2. Copy and paste the SQL above')
  console.log('3. Login with:')
  console.log('   Email: admin@agentpro.com')
  console.log('   Password: admin123\n')
}

generateAdminSQL().catch(console.error)
