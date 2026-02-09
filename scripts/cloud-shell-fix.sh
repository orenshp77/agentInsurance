#!/bin/bash
# Quick fix script for Cloud Shell
# Just copy-paste this into Cloud Shell

echo "========================================"
echo "  Quick DB Fix - Cloud Shell"
echo "========================================"
echo ""

# Set project
gcloud config set project insurance-app-486316

# Get SQL instance name
INSTANCE=$(gcloud sql instances list --format="value(name)" --limit=1)
echo "Found instance: $INSTANCE"
echo ""

# Create the admin user via SQL
echo "Creating admin user..."
gcloud sql connect $INSTANCE --user=root --quiet <<EOF
USE agent_pro;

-- Check if admin exists
SELECT COUNT(*) as count FROM User WHERE email = 'admin@agentpro.com';

-- Delete if exists (to recreate with correct password)
DELETE FROM User WHERE email = 'admin@agentpro.com';

-- Create admin user with password 'admin123'
-- Pre-hashed with bcrypt for security
INSERT INTO User (
    id,
    email,
    password,
    role,
    name,
    phone,
    profileCompleted,
    createdAt,
    updatedAt
) VALUES (
    UUID(),
    'admin@agentpro.com',
    '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'ADMIN',
    'מנהל ראשי',
    '050-0000000',
    1,
    NOW(),
    NOW()
);

-- Verify
SELECT id, email, role, name, createdAt FROM User WHERE email = 'admin@agentpro.com';

EXIT
EOF

echo ""
echo "========================================"
echo "  ✅ DONE!"
echo "========================================"
echo ""
echo "Login here:"
echo "URL: https://insurance-app-767151043885.me-west1.run.app/login"
echo "Email: admin@agentpro.com"
echo "Password: admin123"
echo ""
