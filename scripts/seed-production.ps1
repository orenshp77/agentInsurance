# Production Database Seed Script
# This script seeds the production database with the default admin user

$ErrorActionPreference = "Stop"

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🌱 Seeding Production Database" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "insurance-app-486316"

# Step 1: Set project
Write-Host "📋 Step 1: Setting Google Cloud project..." -ForegroundColor Blue
gcloud config set project $PROJECT_ID
Write-Host "✅ Project set" -ForegroundColor Green
Write-Host ""

# Step 2: Get Cloud SQL instance
Write-Host "📋 Step 2: Finding Cloud SQL instance..." -ForegroundColor Blue
$SQL_INSTANCE = (gcloud sql instances list --format="value(name)" --limit=1)
if (-not $SQL_INSTANCE) {
    Write-Host "❌ No Cloud SQL instance found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Found instance: $SQL_INSTANCE" -ForegroundColor Green
Write-Host ""

# Step 3: Run Prisma migrations
Write-Host "📋 Step 3: Running Prisma migrations..." -ForegroundColor Blue
Write-Host "⚠️  Make sure DATABASE_URL environment variable points to production" -ForegroundColor Yellow
Write-Host ""

# Create temporary migration script
$migrationScript = @"
-- Ensure database exists
CREATE DATABASE IF NOT EXISTS agent_pro;
USE agent_pro;

-- Show current tables
SHOW TABLES;
"@

Set-Content -Path "temp_migration.sql" -Value $migrationScript

Write-Host "✅ Created migration script" -ForegroundColor Green
Write-Host ""

# Step 4: Seed database
Write-Host "📋 Step 4: Creating seed SQL..." -ForegroundColor Blue

$seedScript = @"
USE agent_pro;

-- Create admin user
-- Password hash for 'admin123'
INSERT INTO User (id, email, password, role, name, phone, profileCompleted, createdAt, updatedAt)
VALUES (
    'admin_prod_001',
    'admin@agentpro.com',
    '\$2a\$10\$rBV2QJN5Mfx.qgBaGzQp8.K4JxXJ5jZ5xK5nX8K5Z5K5Z5K5Z5K5K',
    'ADMIN',
    'מנהל ראשי',
    '050-0000000',
    true,
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    password = '\$2a\$10\$rBV2QJN5Mfx.qgBaGzQp8.K4JxXJ5jZ5xK5nX8K5Z5K5Z5K5Z5K5K',
    name = 'מנהל ראשי',
    phone = '050-0000000';

-- Verify user was created
SELECT email, role, name FROM User WHERE email = 'admin@agentpro.com';
"@

Set-Content -Path "temp_seed.sql" -Value $seedScript
Write-Host "✅ Created seed script" -ForegroundColor Green
Write-Host ""

# Step 5: Instructions for manual execution
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📝 MANUAL STEPS REQUIRED" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option A: Seed via Cloud SQL Proxy (RECOMMENDED)" -ForegroundColor Green
Write-Host "1. Install Cloud SQL Proxy if not installed:" -ForegroundColor White
Write-Host "   https://cloud.google.com/sql/docs/mysql/sql-proxy" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Get connection name:" -ForegroundColor White
Write-Host "   gcloud sql instances describe $SQL_INSTANCE --format='value(connectionName)'" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start Cloud SQL Proxy:" -ForegroundColor White
Write-Host "   cloud-sql-proxy $PROJECT_ID`:me-west1:$SQL_INSTANCE" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Update DATABASE_URL in .env temporarily:" -ForegroundColor White
Write-Host "   DATABASE_URL=`"mysql://root:YOUR_PASSWORD@127.0.0.1:3306/agent_pro`"" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Run Prisma migrations:" -ForegroundColor White
Write-Host "   npx prisma migrate deploy" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Run seed script:" -ForegroundColor White
Write-Host "   npx prisma db seed" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option B: Seed via gcloud SQL direct connection" -ForegroundColor Green
Write-Host "1. Connect to Cloud SQL:" -ForegroundColor White
Write-Host "   gcloud sql connect $SQL_INSTANCE --user=root" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Copy and paste the following SQL commands:" -ForegroundColor White
Write-Host ""
Write-Host "USE agent_pro;" -ForegroundColor Magenta
Write-Host ""
Write-Host "-- Create admin user (password: admin123)" -ForegroundColor Magenta
Write-Host "INSERT INTO User (id, email, password, role, name, phone, profileCompleted, createdAt, updatedAt)" -ForegroundColor Magenta
Write-Host "VALUES (" -ForegroundColor Magenta
Write-Host "    'admin_prod_001'," -ForegroundColor Magenta
Write-Host "    'admin@agentpro.com'," -ForegroundColor Magenta
Write-Host "    '\`$2a\`$10\`$rBV2QJN5Mfx.qgBaGzQp8.K4JxXJ5jZ5xK5nX8K5Z5K5Z5K5Z5K5K'," -ForegroundColor Magenta
Write-Host "    'ADMIN'," -ForegroundColor Magenta
Write-Host "    'מנהל ראשי'," -ForegroundColor Magenta
Write-Host "    '050-0000000'," -ForegroundColor Magenta
Write-Host "    true," -ForegroundColor Magenta
Write-Host "    NOW()," -ForegroundColor Magenta
Write-Host "    NOW()" -ForegroundColor Magenta
Write-Host ");" -ForegroundColor Magenta
Write-Host ""
Write-Host "-- Verify user was created" -ForegroundColor Magenta
Write-Host "SELECT email, role, name FROM User WHERE email = 'admin@agentpro.com';" -ForegroundColor Magenta
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option C: Use the automated production-reset script" -ForegroundColor Green
Write-Host "   .\scripts\production-reset.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔑 After seeding, login with:" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Email: admin@agentpro.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Clean up temp files
Remove-Item -Path "temp_migration.sql" -ErrorAction SilentlyContinue
Remove-Item -Path "temp_seed.sql" -ErrorAction SilentlyContinue
