#!/bin/bash
# Check Cloud Run status and logs

echo "Checking Cloud Run service..."
gcloud run services describe insurance-app --region=me-west1 --format="value(status.url,status.conditions)"

echo ""
echo "Checking recent logs for errors..."
gcloud run services logs read insurance-app --region=me-west1 --limit=50
