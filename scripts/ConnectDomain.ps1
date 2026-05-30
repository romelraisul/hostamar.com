$token = $env:CLOUDFLARE_API_TOKEN
$zoneId = "2aef176c6f2000da2af593f4890ec298"

Write-Host "`n🚀 Configuring hostamar.com DNS..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Create A record for hostamar.com
$rec1 = @{
    type = "A"
    name = "hostamar.com"
    content = "76.76.21.21"
    ttl = 1
    proxied = $false
}

# Create CNAME record for www
$rec2 = @{
    type = "CNAME"
    name = "www.hostamar.com"
    content = "cname.vercel-dns.com"
    ttl = 1
    proxied = $false
}

Write-Host "`nConfiguring A record: hostamar.com" -ForegroundColor Yellow
try {
    Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Method Post -Body ($rec1 | ConvertTo-Json)
    Write-Host "   ✅ A record created" -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nConfiguring CNAME record: www.hostamar.com" -ForegroundColor Yellow
try {
    Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Method Post -Body ($rec2 | ConvertTo-Json)
    Write-Host "   ✅ CNAME record created" -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ DNS configured!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Wait 5-10 minutes for DNS propagation"
Write-Host "  2. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains"
Write-Host "  3. Add domain: hostamar.com"
Write-Host "  4. Click Verify"
Write-Host ""
Write-Host "Live URL will be: https://hostamar.com"
Write-Host ""