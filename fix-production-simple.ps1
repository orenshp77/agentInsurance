# Simple fix for production - Step by step
$PROJECT_ID = "insurance-app-486316"
$SERVICE_NAME = "insurance-app"
$REGION = "me-west1"
$SERVICE_URL = "https://insurance-app-767151043885.me-west1.run.app"

Write-Host "Fixing production configuration..." -ForegroundColor Cyan

# Set project
Write-Host "Setting project..." -ForegroundColor Blue
gcloud config set project $PROJECT_ID

# Get SQL instance name
Write-Host "Getting SQL instance..." -ForegroundColor Blue
$sqlOutput = gcloud sql instances list --format=json --project=$PROJECT_ID | ConvertFrom-Json
$SQL_INSTANCE = $sqlOutput[0].name
$SQL_CONNECTION = "${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
Write-Host "SQL Connection: $SQL_CONNECTION" -ForegroundColor Green

# Update Cloud Run service
Write-Host "Updating Cloud Run service..." -ForegroundColor Blue
gcloud run services update $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --update-env-vars="NEXTAUTH_URL=$SERVICE_URL,NODE_ENV=production,NEXTAUTH_SECRET=v8KgJbvxr7H7MjbcMFoqaykgHUcOIKalPc+G3+EvAfA=,GCS_BUCKET_NAME=insurance-app-uploads,GMAIL_USER=orenshp77@gmail.com,GMAIL_APP_PASSWORD=omegoytwqxuzdoid,GMAIL_FROM_NAME=Insurance App,DATABASE_URL=mysql://root:%7EQ%40%2AJ%2F%28m%3ANTx%7B%7E@34.77.205.82:3306/agent_pro"

Write-Host "Done! Service URL: $SERVICE_URL" -ForegroundColor Green
