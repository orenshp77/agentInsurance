#!/bin/bash

# Deploy monitoring bot to Google Cloud Functions
echo "🚀 Deploying monitoring bot to production..."

# Set project
gcloud config set project insurance-app-486316

# Create backup bucket if it doesn't exist
echo "📦 Creating backup bucket..."
gsutil mb -p insurance-app-486316 -l me-west1 gs://insurance-app-backups 2>/dev/null || echo "Bucket already exists"

# Deploy Cloud Function
echo "☁️ Deploying Cloud Function..."
gcloud functions deploy monitoring-bot \
  --gen2 \
  --runtime=nodejs20 \
  --region=me-west1 \
  --source=. \
  --entry-point=monitoring-bot \
  --trigger-http \
  --allow-unauthenticated \
  --timeout=540s \
  --memory=512MB \
  --set-env-vars GCLOUD_PROJECT=insurance-app-486316

# Create Cloud Scheduler job to run every 24 hours
echo "⏰ Setting up Cloud Scheduler..."
gcloud scheduler jobs create http monitoring-bot-daily \
  --location=me-west1 \
  --schedule="0 2 * * *" \
  --uri="https://me-west1-insurance-app-486316.cloudfunctions.net/monitoring-bot" \
  --http-method=GET \
  --time-zone="Asia/Jerusalem" \
  --description="Run monitoring bot every day at 2 AM" \
  2>/dev/null || echo "Scheduler job already exists"

echo "✅ Deployment complete!"
echo ""
echo "🤖 Bot will run daily at 2:00 AM (Israel time)"
echo "📧 Status emails every 3 days to: orenshp77@gmail.com"
echo "🚨 Alert emails sent immediately when issues detected"
echo ""
echo "Test the bot manually:"
echo "curl https://me-west1-insurance-app-486316.cloudfunctions.net/monitoring-bot"
