# Cloudflare DNS Automation - Hostamar.com Domain Connection
# Run this from Windows Command Prompt or PowerShell
# Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID

param(
    [string]$Token = "$env:CLOUDFLARE_API_TOKEN",
    [string]$ZoneId = "$env:CLOUDFLARE_ZONE_ID"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CLOUDFLARE DNS SETUP - hostamar.com" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if (-not $Token -or $Token -eq "" -or $Token -eq "$env:CLOUDFLARE_API_TOKEN") {
    Write-Host "❌ CLOUDFLARE_API_TOKEN not found!" -ForegroundColor Red
    Write-Host "`nSet it with:" -ForegroundColor Yellow
    Write-Host "  `$env:CLOUDFLARE_API_TOKEN = 'your_token_here'" -ForegroundColor White
    Write-Host "  Or: setx CLOUDFLARE_API_TOKEN 'your_token_here' (permanent)`n"
    exit 1
}

if (-not $ZoneId -or $ZoneId -eq "" -or $ZoneId -eq "$env:CLOUDFLARE_ZONE_ID") {
    Write-Host "❌ CLOUDFLARE_ZONE_ID not found!" -ForegroundColor Red
    Write-Host "`nSet it with:" -ForegroundColor Yellow
    Write-Host "  `$env:CLOUDFLARE_ZONE_ID = 'your_zone_id_here'" -ForegroundColor White
    Write-Host "  Or: setx CLOUDFLARE_ZONE_ID 'your_zone_id_here' (permanent)`n"
    exit 1
}

Write-Host "✅ Credentials loaded" -ForegroundColor Green
Write-Host "  Zone ID: $($ZoneId.Substring(0, [Math]::Min(12, $ZoneId.Length)))..." -ForegroundColor Gray
Write-Host ""

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type"  = "application/json"
}

$Records = @(
    @{ type = "A"; name = "@"; content = "76.76.21.21"; ttl = 1; proxied = $false },
    @{ type = "CNAME"; name = "www"; content = "cname.vercel-dns.com"; ttl = 1; proxied = $false }
)

foreach ($Record in $Records) {
    $RecordName = $Record.name
    Write-Host "🔧 Configuring $($Record.type) record: $RecordName" -ForegroundColor Yellow
    
    try {
        # Check if record exists
        $Existing = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records?type=$($Record.type)&name=$RecordName" `
            -Headers $Headers -Method Get -ErrorAction Stop
        
        if ($Existing.result -and $Existing.result.Count -gt 0) {
            # Update existing
            $RecordId = $Existing.result[0].id
            $Body = $Record | ConvertTo-Json
            $Result = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records/$RecordId" `
                -Headers $Headers -Method Put -Body $Body -ErrorAction Stop
            Write-Host "   ✅ Updated successfully" -ForegroundColor Green
        } else {
            # Create new
            $Body = $Record | ConvertTo-Json
            $Result = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records" `
                -Headers $Headers -Method Post -Body $Body -ErrorAction Stop
            Write-Host "   ✅ Created successfully" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ✅ DNS CONFIGURATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Wait 5-10 minutes for DNS propagation"
Write-Host "   2. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains"
Write-Host "   3. Add domain: hostamar.com"
Write-Host "   4. Click 'Verify'"
Write-Host ""
Write-Host "🔗 Vercel Dashboard: https://vercel.com/dashboard/projects/hostamar-local/domains`n"

# Test if DNS propagated (quick check)
Write-Host "Testing DNS propagation..." -ForegroundColor Yellow
try {
    $dnsTest = Resolve-DnsName -Name "hostamar.com" -Type A -ErrorAction SilentlyContinue
    if ($dnsTest) {
        Write-Host "✅ DNS resolving: $($dnsTest.IPAddress)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  DNS not yet propagated. Waiting... check again in a few minutes." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  DNS still propagating. Check again in 5-10 minutes." -ForegroundColor Yellow
}

Write-Host "`n_romelraisul - Domain setup complete!_🌐`n"