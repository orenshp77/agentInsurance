# Deploy Auto-Healer Bot to Google Cloud Functions
# This script deploys the bot and sets up Cloud Scheduler to run it every 3 days

param(
    [string]$ProjectId = "insurance-app-486316",
    [string]$Region = "us-central1",
    [string]$AdminEmail = "orenshp77@gmail.com"
)

$ErrorActionPreference = "Stop"

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🤖 Auto-Healer Bot Deployment" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Set project
Write-Host "📋 Step 1: Setting Google Cloud project..." -ForegroundColor Blue
gcloud config set project $ProjectId
Write-Host "✅ Project set to $ProjectId" -ForegroundColor Green
Write-Host ""

# Step 2: Enable required APIs
Write-Host "📋 Step 2: Enabling required APIs..." -ForegroundColor Blue
Write-Host "   - Cloud Functions API" -ForegroundColor Gray
gcloud services enable cloudfunctions.googleapis.com --quiet

Write-Host "   - Cloud Scheduler API" -ForegroundColor Gray
gcloud services enable cloudscheduler.googleapis.com --quiet

Write-Host "   - Cloud Build API" -ForegroundColor Gray
gcloud services enable cloudbuild.googleapis.com --quiet

Write-Host "✅ APIs enabled" -ForegroundColor Green
Write-Host ""

# Step 3: Get environment variables
Write-Host "📋 Step 3: Setting up environment variables..." -ForegroundColor Blue
Write-Host ""
Write-Host "⚠️  הבוט צריך גישה ל-Gmail לשליחת מיילים." -ForegroundColor Yellow
Write-Host "נא להכין:" -ForegroundColor Yellow
Write-Host "  1. Gmail App Password (https://support.google.com/accounts/answer/185833)" -ForegroundColor Yellow
Write-Host "  2. Database URL מ-Cloud SQL" -ForegroundColor Yellow
Write-Host ""

$gmailUser = Read-Host "הכנס Gmail address (לדוג' user@gmail.com)"
$gmailPassword = Read-Host "הכנס Gmail App Password" -AsSecureString
$gmailPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($gmailPassword)
)

Write-Host "✅ Environment variables set" -ForegroundColor Green
Write-Host ""

# Step 4: Copy Prisma schema
Write-Host "📋 Step 4: Preparing Prisma schema..." -ForegroundColor Blue
Copy-Item -Path "..\..\prisma\schema.prisma" -Destination "..\cloud-functions\auto-healer\prisma\" -Force
Write-Host "✅ Prisma schema copied" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy Cloud Function
Write-Host "📋 Step 5: Deploying Cloud Function..." -ForegroundColor Blue
Write-Host "⏳ This may take a few minutes..." -ForegroundColor Yellow

Push-Location "..\cloud-functions\auto-healer"

try {
    npm install

    gcloud functions deploy auto-healer-bot `
        --gen2 `
        --runtime=nodejs20 `
        --region=$Region `
        --source=. `
        --entry-point=autoHealerBot `
        --trigger-http `
        --timeout=540s `
        --memory=512MB `
        --set-env-vars="GMAIL_USER=$gmailUser,GMAIL_APP_PASSWORD=$gmailPasswordPlain,DATABASE_URL=$env:DATABASE_URL" `
        --no-allow-unauthenticated

    Write-Host "✅ Cloud Function deployed" -ForegroundColor Green
} finally {
    Pop-Location
}
Write-Host ""

# Step 6: Get function URL
Write-Host "📋 Step 6: Getting function URL..." -ForegroundColor Blue
$functionUrl = gcloud functions describe auto-healer-bot `
    --gen2 `
    --region=$Region `
    --format="value(serviceConfig.uri)"

Write-Host "✅ Function URL: $functionUrl" -ForegroundColor Green
Write-Host ""

# Step 7: Create Cloud Scheduler job
Write-Host "📋 Step 7: Setting up Cloud Scheduler (every 3 days)..." -ForegroundColor Blue

# Delete existing job if exists
try {
    gcloud scheduler jobs delete auto-healer-schedule --location=$Region --quiet 2>$null
} catch {
    # Job doesn't exist, ignore
}

# Create service account for scheduler
Write-Host "   Creating service account..." -ForegroundColor Gray
try {
    gcloud iam service-accounts create auto-healer-invoker `
        --display-name="Auto-Healer Bot Invoker" `
        --quiet 2>$null
} catch {
    Write-Host "   Service account already exists" -ForegroundColor Gray
}

$serviceAccount = "auto-healer-invoker@$ProjectId.iam.gserviceaccount.com"

# Grant permissions
Write-Host "   Granting permissions..." -ForegroundColor Gray
gcloud functions add-iam-policy-binding auto-healer-bot `
    --gen2 `
    --region=$Region `
    --member="serviceAccount:$serviceAccount" `
    --role="roles/cloudfunctions.invoker" `
    --quiet

# Create scheduler job (every 3 days at 3 AM)
Write-Host "   Creating scheduler job..." -ForegroundColor Gray
gcloud scheduler jobs create http auto-healer-schedule `
    --location=$Region `
    --schedule="0 3 */3 * *" `
    --uri=$functionUrl `
    --http-method=POST `
    --oidc-service-account-email=$serviceAccount `
    --time-zone="Asia/Jerusalem" `
    --description="Auto-Healer Bot - runs every 3 days at 3 AM"

Write-Host "✅ Cloud Scheduler configured" -ForegroundColor Green
Write-Host ""

# Step 8: Test the function
Write-Host "📋 Step 8: Testing the function..." -ForegroundColor Blue
Write-Host "⏳ Running test..." -ForegroundColor Yellow

$testResult = gcloud scheduler jobs run auto-healer-schedule --location=$Region 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Test completed - check your email at $AdminEmail" -ForegroundColor Green
} else {
    Write-Host "⚠️  Test may have failed - check logs" -ForegroundColor Yellow
}
Write-Host ""

# Step 9: Summary
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Auto-Healer Bot Deployed Successfully!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Configuration:"
Write-Host "   - Function: auto-healer-bot"
Write-Host "   - Region: $Region"
Write-Host "   - Schedule: Every 3 days at 3 AM (Asia/Jerusalem)"
Write-Host "   - Email: $AdminEmail"
Write-Host ""
Write-Host "🔗 Useful Commands:"
Write-Host "   # View logs"
Write-Host "   gcloud functions logs read auto-healer-bot --gen2 --region=$Region --limit=50"
Write-Host ""
Write-Host "   # Manually trigger"
Write-Host "   gcloud scheduler jobs run auto-healer-schedule --location=$Region"
Write-Host ""
Write-Host "   # View scheduler jobs"
Write-Host "   gcloud scheduler jobs list --location=$Region"
Write-Host ""
Write-Host "   # Delete (if needed)"
Write-Host "   gcloud functions delete auto-healer-bot --gen2 --region=$Region"
Write-Host "   gcloud scheduler jobs delete auto-healer-schedule --location=$Region"
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🎯 Bot is now running! You'll get emails every 3 days." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
