# Cloudflare DNS Automation for hostamar.com
# Run with: powershell -ExecutionPolicy Bypass -File scripts/run-cloudflare-setup.ps1

$zoneId = "2aef176c6f2000da2af593f4890ec298"

if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Host "❌ ERROR: CLOUDFLARE_API_TOKEN not set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Set with:"
    Write-Host '  $env:CLOUDFLARE_API_TOKEN = "YOUR_TOKEN"'
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $env:CLOUDFLARE_API_TOKEN"
    "Content-Type" = "application/json"
}

$records = @(
    @{ type = "A"; name = "hostamar.com"; content = "76.76.21.21"; ttl = 1; proxied = $false },
    @{ type = "CNAME"; name = "www.hostamar.com"; content = "cname.vercel-dns.com"; ttl = 1; proxied = $false }
)

Write-Host "🚀 Configuring DNS for hostamar.com..." -ForegroundColor Cyan
Write-Host ""

foreach ($record in $records) {
    Write-Host "Setting $($record.type) record: $($record.name)"
    try {
        $result = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" `
            -Headers $headers -Method Post -Body ($record | ConvertTo-Json)
        Write-Host "   ✅ Created" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  May already exist or error" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ DNS configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "⏱️  Next: Wait 5-10 min, then verify in Vercel"
