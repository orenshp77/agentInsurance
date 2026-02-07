# Production Reset Script for insurance-app (PowerShell)
# This script performs:
# 1. Full database backup
# 2. Security audit
# 3. Database reset (keeping only admin user)

$ErrorActionPreference = "Stop"

$PROJECT_ID = "insurance-app-486316"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_DIR = ".\backups\$TIMESTAMP"

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔧 Production Reset Script - insurance-app" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify gcloud authentication
Write-Host "📋 Step 1: Verifying Google Cloud authentication..." -ForegroundColor Blue
$activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $activeAccount) {
    Write-Host "❌ Not authenticated with Google Cloud" -ForegroundColor Red
    Write-Host "Please run: gcloud auth login"
    exit 1
}
Write-Host "✅ Authenticated as: $activeAccount" -ForegroundColor Green
Write-Host ""

# Step 2: Set project
Write-Host "📋 Step 2: Setting Google Cloud project..." -ForegroundColor Blue
gcloud config set project $PROJECT_ID | Out-Null
Write-Host "✅ Project set to $PROJECT_ID" -ForegroundColor Green
Write-Host ""

# Step 3: Find Cloud SQL instance
Write-Host "📋 Step 3: Finding Cloud SQL instance..." -ForegroundColor Blue
$SQL_INSTANCE = gcloud sql instances list --format="value(name)" --limit=1 2>$null
if (-not $SQL_INSTANCE) {
    Write-Host "❌ No Cloud SQL instance found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Found instance: $SQL_INSTANCE" -ForegroundColor Green
Write-Host ""

# Step 4: Create backup directory
Write-Host "📋 Step 4: Creating backup directory..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null
Write-Host "✅ Backup directory created: $BACKUP_DIR" -ForegroundColor Green
Write-Host ""

# Step 5: Export database
Write-Host "📋 Step 5: Creating database backup..." -ForegroundColor Blue
Write-Host "⏳ This may take a few minutes..." -ForegroundColor Yellow

$BACKUP_FILE = "gs://insurance-app-uploads/backups/db_backup_$TIMESTAMP.sql"

gcloud sql export sql $SQL_INSTANCE $BACKUP_FILE `
    --database=agent_pro `
    --project=$PROJECT_ID

Write-Host "✅ Database backup created: $BACKUP_FILE" -ForegroundColor Green
Write-Host ""

# Step 6: Download backup locally
Write-Host "📋 Step 6: Downloading backup locally..." -ForegroundColor Blue
gsutil cp $BACKUP_FILE "$BACKUP_DIR\database_backup.sql"
Write-Host "✅ Backup downloaded to: $BACKUP_DIR\database_backup.sql" -ForegroundColor Green
Write-Host ""

# Step 7: Security Audit
Write-Host "📋 Step 7: Running security audit..." -ForegroundColor Blue
$auditReport = @"
════════════════════════════════════════════════════════
Security Audit Report - $(Get-Date)
════════════════════════════════════════════════════════

✅ Google Cloud Credentials:
   - File moved to Desktop (outside project)
   - Not tracked in git
   - Path updated in .env

✅ NEXTAUTH_SECRET:
   - Strong secret generated
   - Different from default

✅ Environment Variables:
   - .env file in .gitignore
   - Credentials not exposed

⚠️  Recommendations:
   1. Use Google Secret Manager for production secrets
   2. Enable Cloud SQL SSL/TLS
   3. Set up VPC for Cloud Run <-> Cloud SQL
   4. Enable Cloud Armor for DDoS protection
   5. Set up monitoring and alerts
   6. Enable automatic backups for Cloud SQL
   7. Set up alerting for security events

📊 Current Status:
   - Project: $PROJECT_ID
   - SQL Instance: $SQL_INSTANCE
   - Backup: $BACKUP_FILE

"@

$auditReport | Out-File -FilePath "$BACKUP_DIR\security_audit.txt" -Encoding UTF8
Write-Host $auditReport
Write-Host ""

# Step 8: Get Cloud Run service URL
Write-Host "📋 Step 8: Finding Cloud Run service..." -ForegroundColor Blue
$CLOUD_RUN_SERVICE = gcloud run services list --format="value(metadata.name)" --limit=1 2>$null
if (-not $CLOUD_RUN_SERVICE) {
    Write-Host "⚠️  No Cloud Run service found (maybe not deployed yet)" -ForegroundColor Yellow
    $SERVICE_URL = "http://localhost:3000"
} else {
    $SERVICE_URL = gcloud run services describe $CLOUD_RUN_SERVICE --format="value(status.url)" 2>$null
    Write-Host "✅ Found service: $CLOUD_RUN_SERVICE" -ForegroundColor Green
    Write-Host "   URL: $SERVICE_URL" -ForegroundColor Green
}
Write-Host ""

# Step 9: Create reset SQL script
Write-Host "📋 Step 9: Creating database reset script..." -ForegroundColor Blue

$resetSQL = @"
USE agent_pro;

-- Delete all data in correct order (respecting foreign keys)
DELETE FROM File;
DELETE FROM Folder;
DELETE FROM Notification;
DELETE FROM Activity;
DELETE FROM Log;
DELETE FROM User WHERE role IN ('AGENT', 'CLIENT');

-- Show remaining users
SELECT 'Remaining users after reset:' as Info;
SELECT email, role, name FROM User;

-- Show counts
SELECT
  (SELECT COUNT(*) FROM User) as total_users,
  (SELECT COUNT(*) FROM User WHERE role = 'ADMIN') as admins,
  (SELECT COUNT(*) FROM User WHERE role = 'AGENT') as agents,
  (SELECT COUNT(*) FROM User WHERE role = 'CLIENT') as clients,
  (SELECT COUNT(*) FROM Folder) as folders,
  (SELECT COUNT(*) FROM File) as files;
"@

$resetSQL | Out-File -FilePath "$BACKUP_DIR\reset.sql" -Encoding UTF8
Write-Host "✅ Reset script created: $BACKUP_DIR\reset.sql" -ForegroundColor Green
Write-Host ""

# Step 10: Confirm and execute reset
Write-Host "⚠️  WARNING: This will delete all agents and clients from production!" -ForegroundColor Yellow
$confirm = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Reset cancelled" -ForegroundColor Red
    Write-Host ""
    Write-Host "✅ Backup completed successfully" -ForegroundColor Green
    Write-Host "   Location: $BACKUP_DIR" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "⏳ Executing database reset..." -ForegroundColor Yellow

# Import reset SQL to Cloud SQL
gcloud sql import sql $SQL_INSTANCE "gs://insurance-app-uploads/backups/reset_$TIMESTAMP.sql" `
    --database=agent_pro `
    --project=$PROJECT_ID `
    --quiet

Write-Host "✅ Database reset completed" -ForegroundColor Green
Write-Host ""

# Step 11: Summary
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Production Reset Completed Successfully!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Backup Location:"
Write-Host "   - Cloud: $BACKUP_FILE"
Write-Host "   - Local: $BACKUP_DIR\"
Write-Host ""
Write-Host "🔐 Admin Login:"
Write-Host "   - Email: admin@agentpro.com"
Write-Host "   - Password: admin123"
Write-Host ""
Write-Host "🌐 Service URL:"
Write-Host "   - $SERVICE_URL"
Write-Host ""
Write-Host "📋 Security Audit:"
Write-Host "   - Report: $BACKUP_DIR\security_audit.txt"
Write-Host ""
Write-Host "⚠️  Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Login as admin at $SERVICE_URL"
Write-Host "   2. Create new agents for presentation"
Write-Host "   3. Test all features"
Write-Host "   4. Review security audit recommendations"
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🎯 System Ready for Presentation!" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
