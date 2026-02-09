-- ========================================
-- COPY-PASTE THIS INTO CLOUD SHELL
-- ========================================

-- Step 1: Connect to Cloud SQL (run in Cloud Shell terminal):
-- gcloud sql connect YOUR_INSTANCE_NAME --user=root --quiet

-- Step 2: Once connected to MySQL, copy-paste THIS:

USE agent_pro;

-- Check if User table exists
SHOW TABLES;

-- Check if admin user exists
SELECT id, email, role, name FROM User WHERE email = 'admin@agentpro.com';

-- Delete existing admin (if any) to recreate with correct password
DELETE FROM User WHERE email = 'admin@agentpro.com';

-- Create admin user
-- Password is: admin123 (pre-hashed with bcrypt)
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

-- Verify admin was created
SELECT id, email, role, name, createdAt FROM User WHERE email = 'admin@agentpro.com';

-- Exit MySQL
EXIT;

-- ========================================
-- DONE! Now login at:
-- URL: https://insurance-app-767151043885.me-west1.run.app/login
-- Email: admin@agentpro.com
-- Password: admin123
-- ========================================
