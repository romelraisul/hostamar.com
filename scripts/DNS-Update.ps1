# Use environment variable for token
$token = $env:CLOUDFLARE_API_TOKEN
$zoneId = "2aef176c6f2000da2af593f4890ec298"

Write-Host "`n🚀 Configuring hostamar.com DNS..." -ForegroundColor Cyan

$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

# Function: Get record ID if exists
function Get-RecordId {
    param($Type, $Name)
    $url = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?type=$Type&name=$Name"
    try {
        $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        if ($result.success -and $result.result.Count -gt 0) {
            return $result.result[0].id
        }
    } catch {}
    return $null
}

# Record 1: A record for hostamar.com
Write-Host "`nConfiguring A record: hostamar.com" -ForegroundColor Yellow
$rec1Id = Get-RecordId -Type "A" -Name "hostamar.com"
$body1 = @{
    type = "A"
    name = "hostamar.com"
    content = "76.76.21.21"
    ttl = 1
    proxied = $false
} | ConvertTo-Json

if ($rec1Id) {
    # Update
    try {
        $r = Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$rec1Id" -Headers $headers -Method Put -Body $body1
        if ($r.success) { Write-Host "   ✅ Updated A record" -ForegroundColor Green } else { Write-Host "   ❌ Update failed" -ForegroundColor Red }
    } catch { Write-Host "   ❌ $($_.Exception.Message)" -ForegroundColor Red }
} else {
    # Create
    try {
        $r = Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Method Post -Body $body1
        if ($r.success) { Write-Host "   ✅ Created A record" -ForegroundColor Green } else { Write-Host "   ❌ Create failed" -ForegroundColor Red }
    } catch { Write-Host "   ❌ $($_.Exception.Message)" -ForegroundColor Red }
}

# Record 2: CNAME for www
Write-Host "`nConfiguring CNAME record: www.hostamar.com" -ForegroundColor Yellow
$rec2Id = Get-RecordId -Type "CNAME" -Name "www.hostamar.com"
$body2 = @{
    type = "CNAME"
    name = "www.hostamar.com"
    content = "cname.vercel-dns.com"
    ttl = 1
    proxied = $false
} | ConvertTo-Json

if ($rec2Id) {
    # Update
    try {
        $r = Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$rec2Id" -Headers $headers -Method Put -Body $body2
        if ($r.success) { Write-Host "   ✅ Updated CNAME record" -ForegroundColor Green } else { Write-Host "   ❌ Update failed" -ForegroundColor Red }
    } catch { Write-Host "   ❌ $($_.Exception.Message)" -ForegroundColor Red }
} else {
    # Create
    try {
        $r = Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Method Post -Body $body2
        if ($r.success) { Write-Host "   ✅ Created CNAME record" -ForegroundColor Green } else { Write-Host "   ❌ Create failed" -ForegroundColor Red }
    } catch { Write-Host "   ❌ $($_.Exception.Message)" -ForegroundColor Red }
}

Write-Host "`n✅ DNS configuration complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Wait 5-10 minutes for DNS propagation"
Write-Host "  2. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains"
Write-Host "  3. Add domain: hostamar.com"
Write-Host "  4. Click Verify"
Write-Host ""
Write-Host "Live: https://hostamar.com" -ForegroundColor Yellow