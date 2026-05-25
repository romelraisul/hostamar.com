# Hostamar Complete Auto-Fix
# Run this in PowerShell as Administrator

Write-Host "=== HOSTAMAR COMPLETE AUTO-FIX ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Push to GitHub
Write-Host "Step 1: Push code to GitHub..." -ForegroundColor Yellow
cd C:\Users\romel\hostamar-local

# Check if gh is logged in
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  -> Logging into GitHub..." -ForegroundColor Gray
    gh auth login --web
}

git remote set-url origin https://github.com/romelraisul/hostamar.git
git push -u origin main
Write-Host "  [OK] Code pushed to GitHub" -ForegroundColor Green

# Step 2: Link GitHub to Vercel  
Write-Host ""
Write-Host "Step 2: Opening Vercel to link GitHub..." -ForegroundColor Yellow
Write-Host "  -> In the browser that opens:" -ForegroundColor Gray
Write-Host "     1. Click 'Continue with GitHub'" -ForegroundColor Gray
Write-Host "     2. Authorize Vercel" -ForegroundColor Gray
Write-Host "     3. Select 'romelraisul/hostamar' repo" -ForegroundColor Gray
Start-Process "https://vercel.com/romelraisul-8939s-projects/hostamar-local/settings/git"

# Step 3: Update env vars via Vercel CLI
Write-Host ""
Write-Host "Step 3: Setting environment variables..." -ForegroundColor Yellow

$vars = @(
    @{name="BKASH_NUMBER"; value="01XXXXXXXXX"}
    @{name="NAGAD_NUMBER"; value="01XXXXXXXXX"}
    @{name="ROCKET_NUMBER"; value="01XXXXXXXXX"}
)

foreach ($v in $vars) {
    vercel env rm $v.name production --yes 2>$null
    vercel env add $v.name production <<< $v.value
    Write-Host "  [OK] $($v.name) set" -ForegroundColor Green
}

# Step 4: Deploy
Write-Host ""
Write-Host "Step 4: Deploying to Vercel..." -ForegroundColor Yellow
vercel --prod --yes
Write-Host "  [OK] Deploy triggered" -ForegroundColor Green

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host "Site: https://hostamar.com" -ForegroundColor Green
Write-Host "GitHub: https://github.com/romelraisul/hostamar" -ForegroundColor Green
