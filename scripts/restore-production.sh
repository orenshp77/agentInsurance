#!/bin/bash
# Restore production to working state

set -e

echo "Restoring production configuration..."

# 1. Restore original DATABASE_URL with root user
echo "Step 1: Restoring DATABASE_URL..."
gcloud run services update insurance-app --region=me-west1 \
  --update-env-vars="DATABASE_URL=mysql://root:%7EQ%40%2AJ%2F%28m%3ANTx%7B%7E@34.77.205.82:3306/agent_pro"

# 2. Ensure admin user exists with correct password
echo "Step 2: Fixing admin user in database..."
gcloud sql connect insurance-db --user=root --database=agent_pro <<'SQL'
-- Use correct database
USE agent_pro;

-- Delete existing admin if any
DELETE FROM User WHERE email = 'admin@agentpro.com';

-- Create admin with password that matches bcryptjs hash for 'admin123'
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
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'ADMIN',
    'מנהל ראשי',
    '050-0000000',
    1,
    NOW(),
    NOW()
);

-- Verify
SELECT id, email, role, name FROM User WHERE email = 'admin@agentpro.com';
SQL

echo ""
echo "=========================================="
echo "Production restored!"
echo "=========================================="
echo ""
echo "Login at: https://insurance-app-767151043885.me-west1.run.app/login"
echo "Email: admin@agentpro.com"
echo "Password: admin123"
echo ""
