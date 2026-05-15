
# Hostamar.com - Complete Domain Fix Script
# This script identifies and fixes domain conflicts

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  HOSTAMAR.COM - DOMAIN FIX" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Step 1: Check Current DNS
Write-Host "Step 1: Checking DNS..." -ForegroundColor Yellow
$dnsCheck = nslookup hostamar.com 2>$null
$hasCorrectIP = $dnsCheck -match "76.76.21.21"
Write-Host "DNS points to: 76.76.21.21 = $($hasCorrectIP ? 'Correct' : 'Wrong')"

# Step 2: Check what project responds
Write-Host "`nStep 2: Identifying responding Vercel project..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://hostamar.com" -TimeoutSec 10 -ErrorAction SilentlyContinue
    $content = $response.Content
    $title = ($response.Content -match '<title[^>]*>(.*?)</title>') | Out-Null; $matches[1]
    
    Write-Host "Page title: $title"
    
    if ($content -like "*hostamar*") {
        Write-Host "Content contains 'hostamar' ✅ - Correct project!" -ForegroundColor Green
    } else {
        Write-Host "Content does NOT contain 'hostamar' ❌ - Wrong project!" -ForegroundColor Red
        $global:wrongProject = $true
    }
} catch {
    Write-Host "Could not fetch page: $_" -ForegroundColor Red
}

# Step 3: Guide user to Vercel dashboard
Write-Host "`nStep 3: You need to check Vercel dashboard manually" -ForegroundColor Yellow
Write-Host "`nPlease do these NOW:" -ForegroundColor Cyan
Write-Host "  1. Go to: https://vercel.com/dashboard"
Write-Host "  2. Look through ALL projects"
Write-Host "  3. Find any project with hostamar.com listed"
Write-Host "  4. Remove hostamar.com from ALL projects EXCEPT hostamar-local"
Write-Host "  5. Keep ONLY hostamar-local with this domain"
Write-Host ""
Write-Host "IMPORTANT: Remove duplicates! Domain should exist in ONLY ONE project."
Write-Host ""
Write-Host "After you've done this, press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Step 4: Clean Cloudflare DNS
Write-Host "`nStep 4: Cleaning Cloudflare DNS..." -ForegroundColor Yellow
Write-Host "Manual steps:"
Write-Host "  1. Go to https://dash.cloudflare.com/"
Write-Host "  2. Select: hostamar.com"
Write-Host "  3. Go to DNS"
Write-Host "  4. DELETE both existing records"
Write-Host "  5. Wait 5 seconds"
Write-Host "  6. Add A record: @ → 76.76.21.21 (DNS only)"
Write-Host "  7. Add CNAME: www → cname.vercel-dns.com (DNS only)"
Write-Host ""
Write-Host "Press any key when DNS is cleaned and re-added..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Step 5: Verify in Vercel
Write-Host "`nStep 5: Verify domain in Vercel" -ForegroundColor Yellow
Write-Host "  1. Go to hostamar-local project"
Write-Host "  2. Settings → Domains"
Write-Host "  3. Add: hostamar.com"
Write-Host "  4. Click Verify"
Write-Host ""
Write-Host "Wait for green checkmark ✅"
Write-Host ""
Write-Host "Press any key when verification shows green checkmark..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Step 6: Final test
Write-Host "`nStep 6: Testing live site..." -ForegroundColor Yellow
try {
    $final = Invoke-WebRequest -Uri "https://hostamar.com" -TimeoutSec 10
    if ($final.Content -like "*hostamar*") {
        Write-Host "✅ SUCCESS! hostamar.com is serving your SaaS!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Site responds but doesn't contain 'hostamar'" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Site not responding yet: $_" -ForegroundColor Red
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  FIX COMPLETE!" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan
Write-Host "Your SaaS should now be live at: https://hostamar.com`n"
