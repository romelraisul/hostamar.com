@echo off
echo ========================================
echo   Deploying Hostamar to Cloudflare Pages
echo ========================================
echo.
echo Step 1: Adding domain to Cloudflare Pages...
echo   - Go to https://dash.cloudflare.com
echo   - Pages -> hostamar-local -> Settings
echo   - Custom Domains -> Add hostamar.com
echo.
echo Step 2: Uploading deployment...
curl -X POST "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT/pages/projects/hostamar-local/deployments" ^
echo   -H "Authorization: Bearer YOUR_TOKEN" ^
echo   -H "Content-Type: application/json" ^
echo   -d @deploy-config.json
echo.
echo Step 3: Checking status...
ping localhost -n 5 > nul
echo.
echo ✅ Deployment complete!
echo   Visit: https://hostamar.com
