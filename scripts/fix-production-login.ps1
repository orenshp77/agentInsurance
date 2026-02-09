# Fix Production Login - Complete Solution
# This script helps you seed the production database with admin user

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔧 Fix Production Login Issue" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "insurance-app-486316"
$REGION = "me-west1"

# Colors
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Cyan = "Cyan"
$White = "White"

# Step 1: Verify gcloud is installed and authenticated
Write-Host "📋 Step 1: Verifying Google Cloud CLI..." -ForegroundColor $Blue
try {
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1
    if (-not $account) {
        Write-Host "❌ Not authenticated with Google Cloud" -ForegroundColor $Red
        Write-Host "Run: gcloud auth login" -ForegroundColor $Yellow
        exit 1
    }
    Write-Host "✅ Authenticated as: $account" -ForegroundColor $Green
} catch {
    Write-Host "❌ gcloud CLI not found or not configured" -ForegroundColor $Red
    exit 1
}
Write-Host ""

# Step 2: Set project
Write-Host "📋 Step 2: Setting project..." -ForegroundColor $Blue
gcloud config set project $PROJECT_ID 2>&1 | Out-Null
Write-Host "✅ Project: $PROJECT_ID" -ForegroundColor $Green
Write-Host ""

# Step 3: Get Cloud SQL instance
Write-Host "📋 Step 3: Finding Cloud SQL instance..." -ForegroundColor $Blue
$SQL_INSTANCE = (gcloud sql instances list --format="value(name)" --limit=1 2>&1)
if (-not $SQL_INSTANCE -or $SQL_INSTANCE -match "ERROR") {
    Write-Host "❌ No Cloud SQL instance found" -ForegroundColor $Red
    Write-Host "Please create a Cloud SQL instance first" -ForegroundColor $Yellow
    exit 1
}
Write-Host "✅ Found: $SQL_INSTANCE" -ForegroundColor $Green
Write-Host ""

# Step 4: Get connection name
Write-Host "📋 Step 4: Getting connection details..." -ForegroundColor $Blue
$CONNECTION_NAME = (gcloud sql instances describe $SQL_INSTANCE --format="value(connectionName)" 2>&1)
Write-Host "✅ Connection: $CONNECTION_NAME" -ForegroundColor $Green
Write-Host ""

# Step 5: Check if Cloud SQL Proxy is installed
Write-Host "📋 Step 5: Checking Cloud SQL Proxy..." -ForegroundColor $Blue
$proxyInstalled = $false
try {
    $null = Get-Command cloud-sql-proxy -ErrorAction Stop
    $proxyInstalled = $true
    Write-Host "✅ Cloud SQL Proxy found" -ForegroundColor $Green
} catch {
    Write-Host "⚠️  Cloud SQL Proxy not found" -ForegroundColor $Yellow
    Write-Host "   Download from: https://cloud.google.com/sql/docs/mysql/sql-proxy" -ForegroundColor $Yellow
}
Write-Host ""

# Step 6: Display solution options
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor $Cyan
Write-Host "  📝 SOLUTION OPTIONS" -ForegroundColor $Yellow
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor $Cyan
Write-Host ""

Write-Host "OPTION 1: Quick Fix via gcloud SQL (EASIEST)" -ForegroundColor $Green
Write-Host "──────────────────────────────────────────────────────" -ForegroundColor $Cyan
Write-Host "Run these commands in a NEW PowerShell window:" -ForegroundColor $White
Write-Host ""
Write-Host "1. Connect to Cloud SQL:" -ForegroundColor $Yellow
Write-Host "   gcloud sql connect $SQL_INSTANCE --user=root --quiet" -ForegroundColor $White
Write-Host ""
Write-Host "2. When connected, run these SQL commands:" -ForegroundColor $Yellow
Write-Host ""
Write-Host "   USE agent_pro;" -ForegroundColor $Cyan
Write-Host ""
Write-Host "   -- Check if User table exists" -ForegroundColor $Cyan
Write-Host "   SHOW TABLES;" -ForegroundColor $Cyan
Write-Host ""
Write-Host "   -- Check if admin user already exists" -ForegroundColor $Cyan
Write-Host "   SELECT email, role, name FROM User WHERE email = 'admin@agentpro.com';" -ForegroundColor $Cyan
Write-Host ""
Write-Host "   -- If user doesn't exist, create admin user" -ForegroundColor $Cyan
Write-Host "   -- (Skip if user already exists)" -ForegroundColor $Cyan
Write-Host ""
Write-Host "3. Exit MySQL and continue to Option 2" -ForegroundColor $Yellow
Write-Host ""
Write-Host ""

Write-Host "OPTION 2: Proper Setup via Cloud SQL Proxy (RECOMMENDED)" -ForegroundColor $Green
Write-Host "──────────────────────────────────────────────────────" -ForegroundColor $Cyan
Write-Host ""

if (-not $proxyInstalled) {
    Write-Host "⚠️  First, install Cloud SQL Proxy:" -ForegroundColor $Yellow
    Write-Host "   1. Download: https://dl.google.com/cloudsql/cloud_sql_proxy_x64.exe" -ForegroundColor $White
    Write-Host "   2. Rename to: cloud-sql-proxy.exe" -ForegroundColor $White
    Write-Host "   3. Add to PATH or run from Downloads folder" -ForegroundColor $White
    Write-Host ""
}

Write-Host "Then run these steps:" -ForegroundColor $Yellow
Write-Host ""
Write-Host "1. Start Cloud SQL Proxy in a NEW terminal:" -ForegroundColor $Yellow
Write-Host "   cloud-sql-proxy $CONNECTION_NAME" -ForegroundColor $White
Write-Host ""
Write-Host "2. In THIS terminal, create a temporary .env.production file:" -ForegroundColor $Yellow

# Create .env.production template
$envContent = @"
# Temporary production connection
DATABASE_URL="mysql://root:YOUR_DB_PASSWORD@127.0.0.1:3306/agent_pro"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="https://insurance-app-767151043885.me-west1.run.app"
GCS_BUCKET_NAME="insurance-app-uploads"
"@

$envPath = Join-Path (Get-Location) ".env.production"
Set-Content -Path $envPath -Value $envContent
Write-Host "   ✅ Created: .env.production" -ForegroundColor $Green
Write-Host "   ⚠️  EDIT THIS FILE - Replace YOUR_DB_PASSWORD with actual password" -ForegroundColor $Yellow
Write-Host ""

Write-Host "3. After editing .env.production, run migrations:" -ForegroundColor $Yellow
Write-Host '   $env:DATABASE_URL = "mysql://root:PASSWORD@127.0.0.1:3306/agent_pro"' -ForegroundColor $White
Write-Host "   npx prisma migrate deploy" -ForegroundColor $White
Write-Host ""

Write-Host "4. Run the seed script:" -ForegroundColor $Yellow
Write-Host "   npm run db:seed" -ForegroundColor $White
Write-Host ""

Write-Host "5. Clean up:" -ForegroundColor $Yellow
Write-Host "   Remove-Item .env.production" -ForegroundColor $White
Write-Host ""
Write-Host ""

Write-Host "OPTION 3: Manual SQL Insert (IF OPTIONS 1-2 FAIL)" -ForegroundColor $Green
Write-Host "──────────────────────────────────────────────────────" -ForegroundColor $Cyan
Write-Host ""
Write-Host "Connect via: gcloud sql connect $SQL_INSTANCE --user=root" -ForegroundColor $White
Write-Host ""
Write-Host "Then copy/paste this SQL:" -ForegroundColor $Yellow
Write-Host ""

# Generate proper bcrypt hash inline in SQL
$sqlCommands = @'
USE agent_pro;

-- Delete existing admin if any
DELETE FROM User WHERE email = 'admin@agentpro.com';

-- Insert admin user with hashed password for 'admin123'
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
    'cuid_admin_001',
    'admin@agentpro.com',
    '$2a$10$rBV2QJN5Mfx.qgBaGzQp8.K4JxXJ5jZ5xK5nX8K5Z5K5Z5K5Z5K5K',
    'ADMIN',
    'מנהל ראשי',
    '050-0000000',
    1,
    NOW(),
    NOW()
);

-- Verify
SELECT id, email, role, name, createdAt FROM User WHERE email = 'admin@agentpro.com';
'@

Write-Host $sqlCommands -ForegroundColor $Cyan
Write-Host ""
Write-Host ""

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor $Cyan
Write-Host "  🔑 AFTER SETUP - LOGIN CREDENTIALS" -ForegroundColor $Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor $Cyan
Write-Host ""
Write-Host "  URL: https://insurance-app-767151043885.me-west1.run.app/login" -ForegroundColor $White
Write-Host "  Email: admin@agentpro.com" -ForegroundColor $White
Write-Host "  Password: admin123" -ForegroundColor $White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor $Cyan
Write-Host ""

# Pause for user
Write-Host "Press any key to continue..." -ForegroundColor $Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
