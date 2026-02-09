#!/bin/bash
# Fix agent count in production - removes all agents except admin

echo "======================================"
echo "Fixing Agent Count in Production"
echo "======================================"

# Connect to Cloud SQL and fix the data
gcloud sql connect insurance-db --user=root --database=agent_pro <<'EOF'

-- Check current users
SELECT email, role, name FROM User;

-- Show all agents (should be 0)
SELECT COUNT(*) as agent_count FROM User WHERE role = 'AGENT';

-- Delete all AGENTS
DELETE FROM User WHERE role = 'AGENT';

-- Make sure admin exists and has correct role
UPDATE User SET role = 'ADMIN' WHERE email = 'admin@agentpro.com';

-- Verify admin role
SELECT email, role, name FROM User WHERE email = 'admin@agentpro.com';

-- Show final agent count (should be 0)
SELECT COUNT(*) as agent_count FROM User WHERE role = 'AGENT';

-- Show all remaining users
SELECT email, role, name FROM User;

EXIT;
EOF

echo ""
echo "======================================"
echo "Fix complete!"
echo "======================================"
echo ""
echo "Now restart Cloud Run to clear cache:"
echo "gcloud run services update insurance-app --region=me-west1 --no-traffic"
echo "gcloud run services update insurance-app --region=me-west1 --to-latest"
