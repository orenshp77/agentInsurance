#!/bin/bash

# Deploy insurance-app to Google Cloud Run
# This script builds and deploys the Next.js app to Cloud Run

set -e  # Exit on error

# Configuration
PROJECT_ID="insurance-app-486316"
SERVICE_NAME="insurance-app"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "════════════════════════════════════════════════════════"
echo "  🚀 Deploying insurance-app to Cloud Run"
echo "════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Set Google Cloud project
echo -e "${BLUE}📋 Step 1: Setting Google Cloud project...${NC}"
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✅ Project set to $PROJECT_ID${NC}"
echo ""

# Step 2: Enable required APIs
echo -e "${BLUE}📋 Step 2: Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
echo -e "${GREEN}✅ APIs enabled${NC}"
echo ""

# Step 3: Build and submit to Cloud Build
echo -e "${BLUE}📋 Step 3: Building Docker image...${NC}"
echo -e "${YELLOW}⏳ This may take 5-10 minutes...${NC}"

gcloud builds submit \
  --tag $IMAGE_NAME \
  --project=$PROJECT_ID \
  --timeout=20m

echo -e "${GREEN}✅ Docker image built: $IMAGE_NAME${NC}"
echo ""

# Step 4: Get Cloud SQL connection name
echo -e "${BLUE}📋 Step 4: Getting Cloud SQL connection name...${NC}"
SQL_INSTANCE=$(gcloud sql instances list --format="value(name)" --limit=1)
SQL_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
echo -e "${GREEN}✅ Cloud SQL: $SQL_CONNECTION${NC}"
echo ""

# Step 5: Deploy to Cloud Run
echo -e "${BLUE}📋 Step 5: Deploying to Cloud Run...${NC}"
echo -e "${YELLOW}⏳ Deploying service...${NC}"

gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-cloudsql-instances=$SQL_CONNECTION \
  --add-cloudsql-instances=$SQL_CONNECTION \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="NEXTAUTH_SECRET=v8KgJbvxr7H7MjbcMFoqaykgHUcOIKalPc+G3+EvAfA=" \
  --set-env-vars="GCS_BUCKET_NAME=insurance-app-uploads" \
  --set-env-vars="GMAIL_USER=orenshp77@gmail.com" \
  --set-env-vars="GMAIL_APP_PASSWORD=omegoytwqxuzdoid" \
  --set-env-vars="GMAIL_FROM_NAME=Insurance App" \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=0 \
  --port=3000 \
  --project=$PROJECT_ID

echo -e "${GREEN}✅ Service deployed${NC}"
echo ""

# Step 6: Get service URL
echo -e "${BLUE}📋 Step 6: Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --format="value(status.url)")

echo -e "${GREEN}✅ Service URL: $SERVICE_URL${NC}"
echo ""

# Step 7: Update NEXTAUTH_URL
echo -e "${BLUE}📋 Step 7: Updating NEXTAUTH_URL...${NC}"
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --set-env-vars="NEXTAUTH_URL=$SERVICE_URL" \
  --project=$PROJECT_ID

echo -e "${GREEN}✅ NEXTAUTH_URL updated${NC}"
echo ""

# Step 8: Update DATABASE_URL (secret)
echo -e "${BLUE}📋 Step 8: Setting DATABASE_URL...${NC}"
echo -e "${YELLOW}⚠️  Please manually set DATABASE_URL as a secret:${NC}"
echo "DATABASE_URL=\"mysql://root:%7EQ%40%2AJ%2F%28m%3ANTx%7B%7E@34.77.205.82:3306/agent_pro\""
echo ""

# Summary
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}  ✅ Deployment Completed Successfully!${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "🔐 Next Steps:"
echo "   1. Set DATABASE_URL secret in Cloud Run console"
echo "   2. Test the application: $SERVICE_URL"
echo "   3. Login as admin: admin@agentpro.com / admin123"
echo ""
echo "📋 Cloud Run Console:"
echo "   https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
echo ""
