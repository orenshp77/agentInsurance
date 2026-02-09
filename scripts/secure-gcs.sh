#!/bin/bash

# Script to secure Google Cloud Storage bucket
# Makes all files private and requires signed URLs for access

set -e

echo "🔒 Securing Google Cloud Storage Bucket"
echo "========================================"
echo ""

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil is not installed"
    echo "Install it as part of gcloud: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get bucket name
echo "Enter your GCS bucket name (default: insurance-app-uploads):"
read BUCKET_NAME
BUCKET_NAME=${BUCKET_NAME:-insurance-app-uploads}

BUCKET_URI="gs://$BUCKET_NAME"

echo ""
echo "🪣 Bucket: $BUCKET_URI"
echo ""

# Check if bucket exists
if ! gsutil ls "$BUCKET_URI" &>/dev/null; then
    echo "❌ Error: Bucket $BUCKET_NAME does not exist"
    exit 1
fi

echo "⚠️  WARNING: This will make ALL files in the bucket PRIVATE"
echo "           Users will need signed URLs to access files"
echo ""
echo "Continue? (yes/no):"
read CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Aborted"
    exit 0
fi

echo ""
echo "📝 Step 1: Removing public access..."

# Remove public access (allUsers can view)
if gsutil iam ch -d allUsers:objectViewer "$BUCKET_URI" 2>/dev/null; then
    echo "✅ Removed public objectViewer access"
else
    echo "ℹ️  No public objectViewer access found (already private)"
fi

# Also try legacy ACL
if gsutil defacl ch -d allUsers:R "$BUCKET_URI" 2>/dev/null; then
    echo "✅ Removed legacy public read access"
else
    echo "ℹ️  No legacy public access found"
fi

echo ""
echo "📝 Step 2: Enabling uniform bucket-level access..."

# Enable uniform bucket-level access (recommended security practice)
gsutil uniformbucketlevelaccess set on "$BUCKET_URI"
echo "✅ Uniform bucket-level access enabled"

echo ""
echo "📝 Step 3: Granting access to Cloud Run service account..."

# Get project info
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "⚠️  Warning: Could not detect project ID"
    echo "You'll need to manually grant access to your Cloud Run service account"
else
    # Get Cloud Run service account (common pattern)
    SERVICE_ACCOUNT="$PROJECT_ID@appspot.gserviceaccount.com"

    echo "Detected service account: $SERVICE_ACCOUNT"
    echo "Granting Storage Object Admin role..."

    gsutil iam ch "serviceAccount:$SERVICE_ACCOUNT:objectAdmin" "$BUCKET_URI"
    echo "✅ Service account has access to bucket"
fi

echo ""
echo "📝 Step 4: Setting CORS policy (if needed)..."

# Create CORS policy file
cat > /tmp/cors.json <<EOF
[
  {
    "origin": ["https://*.run.app", "https://your-domain.com"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set /tmp/cors.json "$BUCKET_URI"
echo "✅ CORS policy set"
rm /tmp/cors.json

echo ""
echo "=================================================="
echo "✅ GCS Bucket is now SECURE!"
echo "=================================================="
echo ""
echo "Summary of changes:"
echo "  • All public access removed"
echo "  • Uniform bucket-level access enabled"
echo "  • Service account granted admin access"
echo "  • CORS policy configured"
echo ""
echo "⚠️  IMPORTANT: Update your frontend code to use signed URLs"
echo ""
echo "Example usage:"
echo ""
echo "  // Instead of direct URL:"
echo "  // <img src={file.url} /> ❌"
echo ""
echo "  // Request signed URL from API:"
echo "  const response = await fetch('/api/files/signed-url', {"
echo "    method: 'POST',"
echo "    body: JSON.stringify({ fileId: file.id })"
echo "  })"
echo "  const { url } = await response.json()"
echo "  // <img src={url} /> ✅"
echo ""
echo "🔐 Files are now protected!"
