# PowerShell script to help add Vercel environment variables
# Run each command and provide the value when prompted

Write-Host "Adding Vercel Environment Variables..." -ForegroundColor Green
Write-Host ""
Write-Host "You'll be prompted for each variable value." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel at any time." -ForegroundColor Yellow
Write-Host ""

# Database URL
Write-Host "1. Adding DATABASE_URL..." -ForegroundColor Cyan
Write-Host "   (Your Neon database connection string)" -ForegroundColor Gray
vercel env add DATABASE_URL production

# NextAuth URL (will be set after first deployment)
Write-Host ""
Write-Host "2. Adding NEXTAUTH_URL..." -ForegroundColor Cyan
Write-Host "   (Will be: https://your-project.vercel.app - update after first deploy)" -ForegroundColor Gray
vercel env add NEXTAUTH_URL production

# NextAuth Secret
Write-Host ""
Write-Host "3. Adding NEXTAUTH_SECRET..." -ForegroundColor Cyan
Write-Host "   (Generate with: [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 })))" -ForegroundColor Gray
vercel env add NEXTAUTH_SECRET production

# PIN Pepper
Write-Host ""
Write-Host "4. Adding PIN_PEPPER..." -ForegroundColor Cyan
Write-Host "   (Random secret for PIN hashing)" -ForegroundColor Gray
vercel env add PIN_PEPPER production

# IP Hash Salt
Write-Host ""
Write-Host "5. Adding IP_HASH_SALT..." -ForegroundColor Cyan
Write-Host "   (Random secret for IP hashing, 32+ chars)" -ForegroundColor Gray
vercel env add IP_HASH_SALT production

# App Domain (will be set after first deployment)
Write-Host ""
Write-Host "6. Adding NEXT_PUBLIC_APP_DOMAIN..." -ForegroundColor Cyan
Write-Host "   (Will be: your-project.vercel.app - update after first deploy)" -ForegroundColor Gray
vercel env add NEXT_PUBLIC_APP_DOMAIN production

# Admin Emails (optional)
Write-Host ""
Write-Host "7. Adding ADMIN_EMAILS (optional)..." -ForegroundColor Cyan
Write-Host "   (Comma-separated list of admin emails)" -ForegroundColor Gray
$addAdmin = Read-Host "Add ADMIN_EMAILS? (y/n)"
if ($addAdmin -eq "y" -or $addAdmin -eq "Y") {
    vercel env add ADMIN_EMAILS production
}

Write-Host ""
Write-Host "✅ Environment variables added!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run database migrations: npx prisma migrate deploy" -ForegroundColor White
Write-Host "2. Deploy: vercel --prod" -ForegroundColor White
Write-Host "3. Update NEXTAUTH_URL and NEXT_PUBLIC_APP_DOMAIN with your actual deployment URL" -ForegroundColor White
