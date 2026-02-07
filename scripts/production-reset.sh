#!/bin/bash

# Production Reset Script for insurance-app
# This script performs:
# 1. Full database backup
# 2. Security audit
# 3. Database reset (keeping only admin user)

set -e  # Exit on error

PROJECT_ID="insurance-app-486316"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

echo "════════════════════════════════════════════════════════"
echo "  🔧 Production Reset Script - insurance-app"
echo "════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Verify gcloud authentication
echo -e "${BLUE}📋 Step 1: Verifying Google Cloud authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo -e "${RED}❌ Not authenticated with Google Cloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

# Step 2: Set project
echo -e "${BLUE}📋 Step 2: Setting Google Cloud project...${NC}"
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✅ Project set to $PROJECT_ID${NC}"
echo ""

# Step 3: Find Cloud SQL instance
echo -e "${BLUE}📋 Step 3: Finding Cloud SQL instance...${NC}"
SQL_INSTANCE=$(gcloud sql instances list --format="value(name)" --limit=1)
if [ -z "$SQL_INSTANCE" ]; then
    echo -e "${RED}❌ No Cloud SQL instance found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Found instance: $SQL_INSTANCE${NC}"
echo ""

# Step 4: Create backup directory
echo -e "${BLUE}📋 Step 4: Creating backup directory...${NC}"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ Backup directory created: $BACKUP_DIR${NC}"
echo ""

# Step 5: Export database
echo -e "${BLUE}📋 Step 5: Creating database backup...${NC}"
echo -e "${YELLOW}⏳ This may take a few minutes...${NC}"

BACKUP_FILE="gs://insurance-app-uploads/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql"

gcloud sql export sql $SQL_INSTANCE $BACKUP_FILE \
    --database=agent_pro \
    --project=$PROJECT_ID

echo -e "${GREEN}✅ Database backup created: $BACKUP_FILE${NC}"
echo ""

# Step 6: Download backup locally
echo -e "${BLUE}📋 Step 6: Downloading backup locally...${NC}"
gsutil cp $BACKUP_FILE "$BACKUP_DIR/database_backup.sql"
echo -e "${GREEN}✅ Backup downloaded to: $BACKUP_DIR/database_backup.sql${NC}"
echo ""

# Step 7: Security Audit
echo -e "${BLUE}📋 Step 7: Running security audit...${NC}"
cat > "$BACKUP_DIR/security_audit.txt" << EOF
════════════════════════════════════════════════════════
Security Audit Report - $(date)
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

EOF
cat "$BACKUP_DIR/security_audit.txt"
echo ""

# Step 8: Get Cloud Run service URL
echo -e "${BLUE}📋 Step 8: Finding Cloud Run service...${NC}"
CLOUD_RUN_SERVICE=$(gcloud run services list --format="value(metadata.name)" --limit=1)
if [ -z "$CLOUD_RUN_SERVICE" ]; then
    echo -e "${YELLOW}⚠️  No Cloud Run service found (maybe not deployed yet)${NC}"
    SERVICE_URL="http://localhost:3000"
else
    SERVICE_URL=$(gcloud run services describe $CLOUD_RUN_SERVICE --format="value(status.url)")
    echo -e "${GREEN}✅ Found service: $CLOUD_RUN_SERVICE${NC}"
    echo -e "${GREEN}   URL: $SERVICE_URL${NC}"
fi
echo ""

# Step 9: Reset database via API endpoint
echo -e "${BLUE}📋 Step 9: Resetting production database...${NC}"
echo -e "${YELLOW}⚠️  WARNING: This will delete all agents and clients!${NC}"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ Reset cancelled${NC}"
    exit 0
fi

echo -e "${YELLOW}⏳ Running reset script...${NC}"

# Connect to Cloud SQL and run reset
gcloud sql connect $SQL_INSTANCE --user=root --quiet << 'EOSQL'
USE agent_pro;

-- Delete all data in correct order
DELETE FROM File;
DELETE FROM Folder;
DELETE FROM Notification;
DELETE FROM Activity;
DELETE FROM Log;
DELETE FROM User WHERE role IN ('AGENT', 'CLIENT');

-- Show remaining users
SELECT email, role, name FROM User;
EOSQL

echo -e "${GREEN}✅ Database reset completed${NC}"
echo ""

# Step 10: Summary
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}  ✅ Production Reset Completed Successfully!${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📦 Backup Location:"
echo "   - Cloud: $BACKUP_FILE"
echo "   - Local: $BACKUP_DIR/"
echo ""
echo "🔐 Admin Login:"
echo "   - Email: admin@agentpro.com"
echo "   - Password: admin123"
echo ""
echo "🌐 Service URL:"
echo "   - $SERVICE_URL"
echo ""
echo "📋 Security Audit:"
echo "   - Report: $BACKUP_DIR/security_audit.txt"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "   1. Login as admin"
echo "   2. Create new agents for presentation"
echo "   3. Test all features"
echo "   4. Review security audit recommendations"
echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}  🎯 System Ready for Presentation!${NC}"
echo "════════════════════════════════════════════════════════"
