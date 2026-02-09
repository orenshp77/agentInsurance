#!/bin/bash
# Deploy the fixed code to Cloud Run

echo "Deploying fixed code to production..."

# Set project
gcloud config set project insurance-app-486316

# Deploy from current directory
gcloud run deploy insurance-app \
  --region=me-west1 \
  --source=. \
  --allow-unauthenticated

echo ""
echo "Deploy complete! The fix is now live."
echo "URL: https://insurance-app-767151043885.me-west1.run.app"
