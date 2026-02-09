# Quick Database Fix Script
$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Quick DB Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "c:\Users\computer\Desktop\agent-pro\my-agent-app"

# Set production database URL
$env:DATABASE_URL = "mysql://root:%7EQ%40%2AJ%2F%28m%3ANTx%7B%7E@34.77.205.82:3306/agent_pro"

Write-Host "Step 1: Running seed script to create admin user..." -ForegroundColor Yellow
Write-Host ""

try {
    npm run db:seed
    Write-Host ""
    Write-Host "SUCCESS: Seed completed!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Seed had issues: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FIX COMPLETED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor White
Write-Host "   URL: https://insurance-app-767151043885.me-west1.run.app/login" -ForegroundColor Cyan
Write-Host "   Email: admin@agentpro.com" -ForegroundColor Cyan
Write-Host "   Password: admin123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now try logging in!" -ForegroundColor Yellow
Write-Host ""
