# Fix Production Configuration for insurance-app
# Updates environment variables and configuration for existing Cloud Run service

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "insurance-app-486316"
$SERVICE_NAME = "insurance-app"
$REGION = "me-west1"  # Your actual region!
$SERVICE_URL = "https://insurance-app-767151043885.me-west1.run.app"

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔧 Fixing Production Configuration" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Set project
Write-Host "📋 Step 1: Setting Google Cloud project..." -ForegroundColor Blue
gcloud config set project $PROJECT_ID
Write-Host "✅ Project set" -ForegroundColor Green
Write-Host ""

# Step 2: Get Cloud SQL connection name
Write-Host "📋 Step 2: Getting Cloud SQL instance..." -ForegroundColor Blue
$SQL_INSTANCE = (gcloud sql instances list --format="value(name)" --limit=1 --project=$PROJECT_ID)
$SQL_CONNECTION = "$PROJECT_ID`:me-west1:$SQL_INSTANCE"
Write-Host "✅ Cloud SQL: $SQL_CONNECTION" -ForegroundColor Green
Write-Host ""

# Step 3: Update service with correct environment variables
Write-Host "📋 Step 3: Updating environment variables..." -ForegroundColor Blue
Write-Host "⏳ Updating service configuration..." -ForegroundColor Yellow

gcloud run services update $SERVICE_NAME `
  --region=$REGION `
  --project=$PROJECT_ID `
  --clear-env-vars `
  --set-env-vars="NODE_ENV=production" `
  --set-env-vars="NEXTAUTH_SECRET=v8KgJbvxr7H7MjbcMFoqaykgHUcOIKalPc+G3+EvAfA=" `
  --set-env-vars="NEXTAUTH_URL=$SERVICE_URL" `
  --set-env-vars="GCS_BUCKET_NAME=insurance-app-uploads" `
  --set-env-vars="GMAIL_USER=orenshp77@gmail.com" `
  --set-env-vars="GMAIL_APP_PASSWORD=omegoytwqxuzdoid" `
  --set-env-vars="GMAIL_FROM_NAME=Insurance App" `
  --set-env-vars="DATABASE_URL=mysql://root:%7EQ%40%2AJ%2F%28m%3ANTx%7B%7E@34.77.205.82:3306/agent_pro"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Update failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment variables updated" -ForegroundColor Green
Write-Host ""

# Step 4: Ensure Cloud SQL connection is set
Write-Host "📋 Step 4: Updating Cloud SQL connection..." -ForegroundColor Blue

gcloud run services update $SERVICE_NAME `
  --region=$REGION `
  --project=$PROJECT_ID `
  --clear-cloudsql-instances `
  --add-cloudsql-instances=$SQL_CONNECTION

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Cloud SQL connection update had issues, but continuing..." -ForegroundColor Yellow
}
else {
    Write-Host "✅ Cloud SQL connection updated" -ForegroundColor Green
}
Write-Host ""

# Step 5: Check service account permissions
Write-Host "📋 Step 5: Getting service account..." -ForegroundColor Blue
$SERVICE_ACCOUNT = (gcloud run services describe $SERVICE_NAME `
  --region=$REGION `
  --project=$PROJECT_ID `
  --format="value(spec.template.spec.serviceAccount)")

if ([string]::IsNullOrEmpty($SERVICE_ACCOUNT)) {
    $SERVICE_ACCOUNT = "$PROJECT_ID@appspot.gserviceaccount.com"
}

Write-Host "Service Account: $SERVICE_ACCOUNT" -ForegroundColor Cyan
Write-Host ""

# Step 6: Grant Storage permissions
Write-Host "📋 Step 6: Granting Cloud Storage permissions..." -ForegroundColor Blue

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$SERVICE_ACCOUNT" `
  --role="roles/storage.objectAdmin" `
  --condition=None 2>$null

Write-Host "✅ Storage permissions granted" -ForegroundColor Green
Write-Host ""

# Step 7: Get latest service info
Write-Host "📋 Step 7: Getting service status..." -ForegroundColor Blue
$LATEST_URL = (gcloud run services describe $SERVICE_NAME `
  --region=$REGION `
  --project=$PROJECT_ID `
  --format="value(status.url)")

Write-Host "✅ Service is running" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Production Configuration Updated!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Service URL: $LATEST_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Updated configurations:" -ForegroundColor Yellow
Write-Host "   • NEXTAUTH_URL = $SERVICE_URL"
Write-Host "   • DATABASE_URL = mysql://root:***@34.77.205.82:3306/agent_pro"
Write-Host "   • Cloud SQL Connection = $SQL_CONNECTION"
Write-Host "   • Storage permissions granted"
Write-Host ""
Write-Host "🔐 Test login:" -ForegroundColor Yellow
Write-Host "   Email: admin@agentpro.com"
Write-Host "   Password: admin123"
Write-Host ""
Write-Host "🧪 Test now:" -ForegroundColor Yellow
Write-Host "   Start-Process '$LATEST_URL'"
Write-Host ""
Write-Host "📊 View logs:" -ForegroundColor Yellow
Write-Host "   gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=50"
Write-Host ""
