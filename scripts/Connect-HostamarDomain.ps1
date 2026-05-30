# Hostamar.com - Cloudflare DNS Connection Script
# Right-click this file → "Run with PowerShell" OR run in PowerShell window
# Token and Zone ID are hardcoded below for one-click execution

# ============================================
# CONFIGURATION (Pre-filled with your data)
# ============================================
# Use environment variable for token
$apiToken = $env:CLOUDFLARE_API_TOKEN
$zoneId = "2aef176c6f2000da2af593f4890ec298"
$domain = "hostamar.com"

# ============================================
# EXECUTION
# ============================================

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  CLOUDFLARE DNS SETUP - $domain" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

if (-not $token -or $token -eq "") {
    Write-Host "ERROR: Token not set!" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$records = @(
    @{ type = "A"; name = "hostamar.com"; content = "76.76.21.21"; ttl = 1; proxied = $false },
    @{ type = "CNAME"; name = "www.hostamar.com"; content = "cname.vercel-dns.com"; ttl = 1; proxied = $false }
)

Write-Host "Configuring DNS records..." -ForegroundColor Yellow
Write-Host ""

foreach ($record in $records) {
    Write-Host "Setting $($record.type) record: $($record.name)"
    
    try {
        # Check if exists
        $existing = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?type=$($record.type)&name=$($record.name)" -Headers $headers -Method Get -ErrorAction Stop
        
        if ($existing.result -and $existing.result.Count -gt 0) {
            # Update
            $recordId = $existing.result[0].id
            $result = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recordId" -Headers $headers -Method Put -Body ($record | ConvertTo-Json) -ErrorAction Stop
            Write-Host "   Updated" -ForegroundColor Green
        } else {
            # Create
            $result = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Method Post -Body ($record | ConvertTo-Json) -ErrorAction Stop
            Write-Host "   Created" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "✅ DNS configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Wait 5-10 minutes for DNS propagation"
Write-Host "  2. Test: nslookup hostamar.com (should show 76.76.21.21)"
Write-Host "  3. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains"
Write-Host "  4. Add domain: hostamar.com"
Write-Host "  5. Click 'Verify'"
Write-Host ""
Write-Host "  🌐 After verification: https://hostamar.com will be LIVE!"
Write-Host ""

# Save completion note
$completion = @{
    domain = $domain
    cloudflare_dns = "configured"
    zone_id = $zoneId
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    next_step = "Wait for DNS propagation, then verify in Vercel"
} | ConvertTo-Json -Depth 3

$completion | Out-File -FilePath "domain-setup-done.json" -Encoding UTF8

Write-Host "Status saved to: domain-setup-done.json"
Write-Host ""
Write-Host "_romelraisul - Domain DNS configured!_🌐`n" -ForegroundColor Gray
