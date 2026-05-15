# Hostamar.com - Cloudflare DNS Connection
# Right-click this file → "Run with PowerShell"

Write-Host "🚀 Connecting hostamar.com to Cloudflare..." -ForegroundColor Cyan
Write-Host ""

# Your credentials
$token = $env:CLOUDFLARE_API_TOKEN
$zoneId = "2aef176c6f2000da2af593f4890ec298"

# Headers for API
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

# DNS records to create
$records = @(
    @{ type = "A"; name = "hostamar.com"; content = "76.76.21.21"; ttl = 1; proxied = $false },
    @{ type = "CNAME"; name = "www.hostamar.com"; content = "cname.vercel-dns.com"; ttl = 1; proxied = $false }
)

# Configure each record
foreach ($record in $records) {
    Write-Host "Configuring $($record.type) record: $($record.name)" -ForegroundColor Yellow
    
    try {
        # Check if exists
        $checkUrl = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?type=$($record.type)&name=$($record.name)"
        $existing = Invoke-RestMethod -Uri $checkUrl -Headers $headers -Method Get
        
        if ($existing.result -and $existing.result.Count -gt 0) {
            # Update existing
            $recId = $existing.result[0].id
            $updateUrl = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recId"
            Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method Put -Body ($record | ConvertTo-Json)
            Write-Host "   ✅ Updated" -ForegroundColor Green
        } else {
            # Create new
            Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Method Post -Body ($record | ConvertTo-Json)
            Write-Host "   ✅ Created" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ DNS configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "⏱️  Next steps:" -ForegroundColor Cyan
Write-Host "  1. Wait 5-10 minutes for DNS propagation"
Write-Host "  2. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains"
Write-Host "  3. Add domain: hostamar.com"
Write-Host "  4. Click Verify"
Write-Host ""
Write-Host "🌐 After verification: https://hostamar.com will be LIVE!"
Write-Host ""
Write-Host "_romelraisul - Domain configured!_" -ForegroundColor Gray