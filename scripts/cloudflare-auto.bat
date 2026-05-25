@echo off
REM Cloudflare DNS Automation for hostamar.com
REM This batch file configures DNS via Cloudflare API

echo ========================================
echo  CLOUDFLARE DNS SETUP - hostamar.com
echo ========================================
echo.

REM Check for token
if "%CLOUDFLARE_API_TOKEN%"=="" (
    echo ERROR: CLOUDFLARE_API_TOKEN environment variable not set
    echo.
    echo Please set it first:
    echo   set CLOUDFLARE_API_TOKEN=YOUR_TOKEN_HERE
    echo.
    echo Or run without batch file and provide token directly.
    pause
    exit /b 1
)

REM Zone ID for hostamar.com
set ZONE_ID=2aef176c6f2000da2af593f4890ec298

echo Zone ID: %ZONE_ID%
echo.
echo Configuring DNS records...
echo.

REM Use PowerShell to make HTTPS requests (has proper SSL)
powershell -Command "
$token = '%CLOUDFLARE_API_TOKEN%';
$zoneId = '%ZONE_ID%';
$headers = @{ 'Authorization' = 'Bearer ' + $token; 'Content-Type' = 'application/json' };

$records = @(
    @{ type = 'A'; name = 'hostamar.com'; content = '76.76.21.21'; ttl = 1; proxied = $false },
    @{ type = 'CNAME'; name = 'www.hostamar.com'; content = 'cname.vercel-dns.com'; ttl = 1; proxied = $false }
);

foreach ($record in $records) {
    Write-Host \"Setting $($record.type) record: $($record.name)\" -ForegroundColor Yellow;
    
    try {
        # Check if exists
        $check = Invoke-RestMethod -Uri \"https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?type=$($record.type)^&name=$($record.name)\" -Headers $headers -Method Get;
        
        if ($check.result -and $check.result.Count -gt 0) {
            # Update existing
            $id = $check.result[0].id;
            $result = Invoke-RestMethod -Uri \"https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$id\" -Headers $headers -Method Put -Body ($record | ConvertTo-Json);
            Write-Host \"   Updated\" -ForegroundColor Green;
        } else {
            # Create new
            $result = Invoke-RestMethod -Uri \"https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records\" -Headers $headers -Method Post -Body ($record | ConvertTo-Json);
            Write-Host \"   Created\" -ForegroundColor Green;
        }
    } catch {
        Write-Host \"   Error: $($_.Exception.Message)\" -ForegroundColor Red;
    }
}

Write-Host '';
Write-Host '✅ DNS configuration complete!' -ForegroundColor Green;
Write-Host '';
Write-Host 'Next steps:';
Write-Host '  1. Wait 5-10 minutes for DNS propagation';
Write-Host '  2. Go to: https://vercel.com/dashboard/projects/hostamar-local/domains';
Write-Host '  3. Add domain: hostamar.com';
Write-Host '  4. Click Verify';
"

echo.
echo ========================================
echo  SETUP COMPLETE!
echo ========================================
echo.
pause
