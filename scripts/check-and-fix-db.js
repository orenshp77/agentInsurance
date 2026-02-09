/**
 * Quick script to check and fix production database
 * This will check if admin user exists and create it if needed
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

console.log('🚀 Starting database check and fix script...\n');

// Production database connection
const DB_CONFIG = {
  host: '34.77.205.82',
  port: 3306,
  user: 'root',
  password: '~Q@*J/(m:NTx{~',
  database: 'agent_pro',
  connectTimeout: 10000
};

async function checkAndFix() {
  let connection;

  try {
    console.log('🔌 Connecting to production database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to database\n');

    // Check if User table exists
    console.log('📋 Checking if User table exists...');
    const [tables] = await connection.query("SHOW TABLES LIKE 'User'");

    if (tables.length === 0) {
      console.log('❌ User table does not exist!');
      console.log('⚠️  You need to run migrations first: npx prisma migrate deploy');
      return;
    }
    console.log('✅ User table exists\n');

    // Check if admin user exists
    console.log('👤 Checking for admin user...');
    const [users] = await connection.query(
      "SELECT id, email, role, name FROM User WHERE email = ?",
      ['admin@agentpro.com']
    );

    if (users.length > 0) {
      console.log('✅ Admin user already exists:');
      console.log(users[0]);
      console.log('\n⚠️  If you cannot login, the password might be wrong.');
      console.log('📧 Email: admin@agentpro.com');
      console.log('🔑 Expected password: admin123');

      // Let's update the password to be sure
      console.log('\n🔄 Updating admin password to "admin123"...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.query(
        'UPDATE User SET password = ? WHERE email = ?',
        [hashedPassword, 'admin@agentpro.com']
      );
      console.log('✅ Password updated successfully!');
    } else {
      console.log('❌ Admin user does not exist');
      console.log('➕ Creating admin user...\n');

      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const userId = `admin_${Date.now()}`;

      await connection.query(
        `INSERT INTO User (
          id, email, password, role, name, phone, profileCompleted, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [userId, 'admin@agentpro.com', hashedPassword, 'ADMIN', 'מנהל ראשי', '050-0000000', true]
      );

      console.log('✅ Admin user created successfully!');
    }

    console.log('\n════════════════════════════════════════');
    console.log('  🎉 DATABASE IS READY!');
    console.log('════════════════════════════════════════');
    console.log('\n📝 Login credentials:');
    console.log('  URL: https://insurance-app-767151043885.me-west1.run.app/login');
    console.log('  Email: admin@agentpro.com');
    console.log('  Password: admin123');
    console.log('\n════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('⚠️  Cannot connect to database. Make sure:');
      console.error('  1. Cloud SQL instance is running');
      console.error('  2. Your IP is whitelisted');
      console.error('  3. Cloud SQL Proxy is running (if needed)');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

checkAndFix().catch(console.error);
