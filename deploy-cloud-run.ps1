# Deploy insurance-app to Google Cloud Run
# PowerShell version for Windows

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "insurance-app-486316"
$SERVICE_NAME = "insurance-app"
$REGION = "us-central1"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 Deploying insurance-app to Cloud Run" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Set Google Cloud project
Write-Host "📋 Step 1: Setting Google Cloud project..." -ForegroundColor Blue
gcloud config set project $PROJECT_ID
Write-Host "✅ Project set to $PROJECT_ID" -ForegroundColor Green
Write-Host ""

# Step 2: Enable required APIs
Write-Host "📋 Step 2: Enabling required APIs..." -ForegroundColor Blue
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
Write-Host "✅ APIs enabled" -ForegroundColor Green
Write-Host ""

# Step 3: Build and submit to Cloud Build
Write-Host "📋 Step 3: Building Docker image..." -ForegroundColor Blue
Write-Host "⏳ This may take 5-10 minutes..." -ForegroundColor Yellow

gcloud builds submit `
  --tag $IMAGE_NAME `
  --project=$PROJECT_ID `
  --timeout=20m

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Check logs above." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker image built: $IMAGE_NAME" -ForegroundColor Green
Write-Host ""

# Step 4: Get Cloud SQL connection name
Write-Host "📋 Step 4: Getting Cloud SQL connection name..." -ForegroundColor Blue
$SQL_INSTANCE = (gcloud sql instances list --format="value(name)" --limit=1)
$SQL_CONNECTION = "$PROJECT_ID`:$REGION`:$SQL_INSTANCE"
Write-Host "✅ Cloud SQL: $SQL_CONNECTION" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy to Cloud Run
Write-Host "📋 Step 5: Deploying to Cloud Run..." -ForegroundColor Blue
Write-Host "⏳ Deploying service..." -ForegroundColor Yellow

gcloud run deploy $SERVICE_NAME `
  --image $IMAGE_NAME `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --set-cloudsql-instances=$SQL_CONNECTION `
  --set-env-vars="NODE_ENV=production,NEXTAUTH_SECRET=v8KgJbvxr7H7MjbcMFoqaykgHUcOIKalPc+G3+EvAfA=,GCS_BUCKET_NAME=insurance-app-uploads,GMAIL_USER=orenshp77@gmail.com,GMAIL_APP_PASSWORD=omegoytwqxuzdoid,GMAIL_FROM_NAME=Insurance App,DATABASE_URL=mysql://root:%7EQ%40%2AJ%2F%28m%3ANTx%7B%7E@34.77.205.82:3306/agent_pro" `
  --memory=1Gi `
  --cpu=1 `
  --timeout=300 `
  --max-instances=10 `
  --min-instances=0 `
  --port=3000 `
  --project=$PROJECT_ID

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed. Check logs above." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Service deployed" -ForegroundColor Green
Write-Host ""

# Step 6: Get service URL
Write-Host "📋 Step 6: Getting service URL..." -ForegroundColor Blue
$SERVICE_URL = (gcloud run services describe $SERVICE_NAME `
  --platform managed `
  --region $REGION `
  --format="value(status.url)")

Write-Host "✅ Service URL: $SERVICE_URL" -ForegroundColor Green
Write-Host ""

# Step 7: Update NEXTAUTH_URL
Write-Host "📋 Step 7: Updating NEXTAUTH_URL..." -ForegroundColor Blue
gcloud run services update $SERVICE_NAME `
  --region $REGION `
  --update-env-vars="NEXTAUTH_URL=$SERVICE_URL" `
  --project=$PROJECT_ID

Write-Host "✅ NEXTAUTH_URL updated to: $SERVICE_URL" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Service URL: $SERVICE_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔐 Login as admin:" -ForegroundColor Yellow
Write-Host "   Email: admin@agentpro.com"
Write-Host "   Password: admin123"
Write-Host ""
Write-Host "📋 Cloud Run Console:" -ForegroundColor Yellow
Write-Host "   https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
Write-Host ""
Write-Host "🧪 Test the application:" -ForegroundColor Yellow
Write-Host "   Start-Process $SERVICE_URL"
Write-Host ""
