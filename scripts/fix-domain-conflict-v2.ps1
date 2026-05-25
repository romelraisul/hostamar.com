# Hostamar.com - Domain Fix Script (Fixed Version)
# Compatible with Windows PowerShell

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HOSTAMAR.COM - DOMAIN FIX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Current DNS
Write-Host "Step 1: Checking DNS..." -ForegroundColor Yellow
$dnsCheck = nslookup hostamar.com 2>$null
$hasCorrectIP = $dnsCheck -match "76.76.21.21"
if ($hasCorrectIP) {
    Write-Host "DNS points to: 76.76.21.21 = Correct" -ForegroundColor Green
} else {
    Write-Host "DNS points to: 76.76.21.21 = Wrong or not propagated" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Check what project responds
Write-Host "Step 2: Identifying responding Vercel project..." -ForegroundColor Yellow
Write-Host "Checking what's serving your domain..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "https://hostamar.com" -TimeoutSec 10 -ErrorAction SilentlyContinue
    $content = $response.Content
    
    if ($content -like "*hostamar*") {
        Write-Host "✅ CORRECT - This IS your Hostamar site!" -ForegroundColor Green
        Write-Host "Your SaaS should be loading now." -ForegroundColor Green
    } else {
        Write-Host "❌ WRONG PROJECT - Not your Hostamar SaaS" -ForegroundColor Red
        Write-Host "Another Vercel project is hijacking your domain." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not fetch page: $_" -ForegroundColor Red
}
Write-Host ""

# Step 3: Identify ALL projects with hostamar.com
Write-Host "Step 3: Checking Vercel for domain conflicts..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please check your Vercel dashboard now:" -ForegroundColor Cyan
Write-Host "  1. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "  2. Click EACH project one by one" -ForegroundColor White
Write-Host "  3. Look in Settings → Domains" -ForegroundColor White
Write-Host "  4. DELETE hostamar.com from ANY project except 'hostamar-local'" -ForegroundColor White
Write-Host ""
Write-Host "Press any key when you've cleaned up other projects..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

# Step 4: Clean Cloudflare DNS
Write-Host "Step 4: Clean Cloudflare DNS..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Go to: https://dash.cloudflare.com/" -ForegroundColor White
Write-Host "  2. Select: hostamar.com" -ForegroundColor White
Write-Host "  3. DNS → DELETE both A and CNAME records" -ForegroundColor White
Write-Host "  4. Wait 10 seconds" -ForegroundColor White
Write-Host "  5. Re-add:" -ForegroundColor White
Write-Host "     - Type: A, Name: @, Content: 76.76.21.21, Proxy: OFF" -ForegroundColor White
Write-Host "     - Type: CNAME, Name: www, Content: cname.vercel-dns.com, Proxy: OFF" -ForegroundColor White
Write-Host ""
Write-Host "Press any key when DNS is re-added..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

# Step 5: Verify in Vercel
Write-Host "Step 5: Verify domain in Vercel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Go to: https://vercel.com/dashboard/projects/hostamar-local" -ForegroundColor White
Write-Host "  2. Settings → Domains" -ForegroundColor White
Write-Host "  3. If hostamar.com not there: Click 'Add' → Enter 'hostamar.com' → Verify" -ForegroundColor White
Write-Host "  4. If it's there but pending: Click 'Verify'" -ForegroundColor White
Write-Host "  5. Wait for green ✅ checkmark" -ForegroundColor White
Write-Host ""
Write-Host "Press any key after verification shows green..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

# Step 6: Final test
Write-Host "Step 6: Testing live site..." -ForegroundColor Yellow
try {
    $final = Invoke-WebRequest -Uri "https://hostamar.com" -TimeoutSec 10
    if ($final.Content -like "*hostamar*") {
        Write-Host "✅ SUCCESS! Your SaaS is LIVE at https://hostamar.com!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Site responds but check if it's your content" -ForegroundColor Yellow
        Write-Host "Refresh browser or try incognito mode" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Site not responding: $_" -ForegroundColor Red
    Write-Host "Wait 5 more minutes and try again" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FIX COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your SaaS: https://hostamar.com" -ForegroundColor White
Write-Host ""