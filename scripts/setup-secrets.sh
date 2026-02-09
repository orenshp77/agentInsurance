#!/bin/bash

# Script to migrate secrets from .env to Google Cloud Secret Manager
# Run this script to secure your production secrets

set -e

echo "🔐 Setting up Google Cloud Secrets for Insurance App"
echo "=================================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No Google Cloud project is set"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "✅ Project: $PROJECT_ID"
echo ""

# Function to create secret
create_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local DESCRIPTION=$3

    echo "📝 Creating secret: $SECRET_NAME"

    # Check if secret already exists
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        echo "⚠️  Secret $SECRET_NAME already exists. Adding new version..."
        echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
            --project="$PROJECT_ID" \
            --data-file=-
    else
        echo -n "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
            --project="$PROJECT_ID" \
            --data-file=- \
            --replication-policy="automatic" \
            --labels="app=insurance-app"
    fi

    echo "✅ Secret $SECRET_NAME created/updated"
    echo ""
}

# Generate new NEXTAUTH_SECRET
echo "🔑 Generating new NEXTAUTH_SECRET..."
NEW_NEXTAUTH_SECRET=$(openssl rand -base64 32)
create_secret "NEXTAUTH_SECRET" "$NEW_NEXTAUTH_SECRET" "NextAuth JWT secret"

# Database password
echo "💾 Enter your NEW Cloud SQL database password (press Enter to generate):"
read -s DB_PASSWORD
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 20 | tr -d "=+/" | cut -c1-16)
    echo "✅ Generated password: $DB_PASSWORD"
    echo "⚠️  IMPORTANT: Update this password in Cloud SQL:"
    echo "   gcloud sql users set-password root --instance=YOUR_INSTANCE --password='$DB_PASSWORD'"
fi
create_secret "DATABASE_PASSWORD" "$DB_PASSWORD" "Cloud SQL root password"

# Database URL
echo "📊 Enter your Cloud SQL connection name (format: project:region:instance):"
read SQL_CONNECTION_NAME
if [ -n "$SQL_CONNECTION_NAME" ]; then
    DATABASE_URL="mysql://root:$DB_PASSWORD@localhost:3306/agent_pro?socket=/cloudsql/$SQL_CONNECTION_NAME"
    create_secret "DATABASE_URL" "$DATABASE_URL" "Full database connection URL"
fi

# SendGrid API Key (if migrating from Gmail)
echo "📧 Are you migrating to SendGrid? (y/n):"
read USE_SENDGRID
if [ "$USE_SENDGRID" == "y" ]; then
    echo "Enter your SendGrid API Key:"
    read -s SENDGRID_KEY
    create_secret "SENDGRID_API_KEY" "$SENDGRID_KEY" "SendGrid API key for emails"
else
    echo "⚠️  Using Gmail (not recommended for production)"
    echo "Enter Gmail App Password:"
    read -s GMAIL_PASSWORD
    create_secret "GMAIL_APP_PASSWORD" "$GMAIL_PASSWORD" "Gmail app-specific password"

    echo "Enter Gmail address:"
    read GMAIL_USER
    create_secret "GMAIL_USER" "$GMAIL_USER" "Gmail sender address"
fi

# GCS Bucket name
echo "🪣 Enter your GCS bucket name (default: insurance-app-uploads):"
read GCS_BUCKET
GCS_BUCKET=${GCS_BUCKET:-insurance-app-uploads}
create_secret "GCS_BUCKET_NAME" "$GCS_BUCKET" "Google Cloud Storage bucket name"

# Production URL
echo "🌐 Enter your production URL (e.g., https://your-app.run.app):"
read NEXTAUTH_URL
if [ -n "$NEXTAUTH_URL" ]; then
    create_secret "NEXTAUTH_URL" "$NEXTAUTH_URL" "NextAuth callback URL"
fi

echo ""
echo "=================================================="
echo "✅ All secrets created successfully!"
echo "=================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Update Cloud Run service to use these secrets:"
echo "   gcloud run services update insurance-app \\"
echo "     --update-secrets=DATABASE_URL=DATABASE_URL:latest,\\"
echo "NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,\\"
echo "NEXTAUTH_URL=NEXTAUTH_URL:latest,\\"
echo "GCS_BUCKET_NAME=GCS_BUCKET_NAME:latest"
echo ""
echo "2. If using SendGrid:"
echo "   gcloud run services update insurance-app \\"
echo "     --update-secrets=SENDGRID_API_KEY=SENDGRID_API_KEY:latest"
echo ""
echo "3. If using Gmail (not recommended):"
echo "   gcloud run services update insurance-app \\"
echo "     --update-secrets=GMAIL_APP_PASSWORD=GMAIL_APP_PASSWORD:latest,\\"
echo "GMAIL_USER=GMAIL_USER:latest"
echo ""
echo "4. Delete local .env.production file (secrets are now in Secret Manager)"
echo "   rm .env.production"
echo ""
echo "5. Make GCS bucket private:"
echo "   ./scripts/secure-gcs.sh"
echo ""
echo "🔒 Your secrets are now secure!"
