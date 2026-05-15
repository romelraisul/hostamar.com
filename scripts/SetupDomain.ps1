$token = $env:CLOUDFLARE_API_TOKEN
$zoneId = "2aef176c6f2000da2af593f4890ec298"
$headers = @{Authorization="Bearer $token";"Content-Type"="application/json"}
$rec1 = @{type="A";name="hostamar.com";content="76.76.21.21";ttl=1;proxied=$false}
$rec2 = @{type="CNAME";name="www.hostamar.com";content="cname.vercel-dns.com";ttl=1;proxied=$false}
Write-Host "Configuring hostamar.com DNS..." -ForegroundColor Cyan
try { Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Method Post -Body ($rec1|ConvertTo-Json); Write-Host "  ✅ A record created" -ForegroundColor Green } catch { Write-Host "  ❌ $($_.Exception.Message)" -ForegroundColor Red }
try { Invoke-RestMethod "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" -Headers $headers -Method Post -Body ($rec2|ConvertTo-Json); Write-Host "  ✅ CNAME record created" -ForegroundColor Green } catch { Write-Host "  ❌ $($_.Exception.Message)" -ForegroundColor Red }
Write-Host "`n✅ DNS configured! Wait 5-10 min, then go to Vercel to verify." -ForegroundColor Green
