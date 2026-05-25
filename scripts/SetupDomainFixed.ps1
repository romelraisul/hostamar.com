$token = $env:CLOUDFLARE_API_TOKEN
$zoneId = "2aef176c6f2000da2af593f4890ec298"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n🚀 Configuring hostamar.com DNS..." -ForegroundColor Cyan

# Function to ensure DNS record exists (create or update)
function Set-DnsRecord {
    param($Type, $Name, $Content)
    
    Write-Host "`nConfiguring $Type record: $Name" -ForegroundColor Yellow
    
    # Check if record exists
    $query = "type=$Type&name=$Name"
    $url = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?$query"
    
    try {
        $existing = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        
        if ($existing.success -and $existing.result -and $existing.result.Count -gt 0) {
            # Update existing record
            $recordId = $existing.result[0].id
            $body = @{
                type = $Type
                name = $Name
                content = $Content
                ttl = 1
                proxied = $false
            } | ConvertTo-Json
            
            $updateUrl = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recordId"
            $result = Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method Put -Body $body
            
            if ($result.success) {
                Write-Host "   ✅ Updated" -ForegroundColor Green
                return $true
            } else {
                Write-Host "   ❌ Update failed: $($result.errors[0].message)" -ForegroundColor Red
                return $false
            }
        } else {
            # Create new record
            $body = @{
                type = $Type
                name = $Name
                content = $Content
                ttl = 1
                proxied = $false
            } | ConvertTo-Json
            
            $result = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Method Post -Body $body
            
            if ($result.success) {
                Write-Host "   ✅ Created" -ForegroundColor Green
                return $true
            } else {
                Write-Host "   ❌ Create failed: $($result.errors[0].message)" -ForegroundColor Red
                return $false
            }
        }
    } catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Configure A record
Set-DnsRecord -Type "A" -Name "hostamar.com" -Content "76.76.21.21"

# Configure CNAME record
Set-DnsRecord -Type "CNAME" -Name "www.hostamar.com" -Content "cname.vercel-dns.com"

Write-Host "`n✅ DNS configuration complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Wait 5-10 minutes for DNS propagation"
Write-Host "  2. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains"
Write-Host "  3. Add domain: hostamar.com"
Write-Host "  4. Click Verify"
Write-Host ""
Write-Host "Live URL: https://hostamar.com" -ForegroundColor Yellow
