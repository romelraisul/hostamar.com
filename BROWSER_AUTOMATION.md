# Browser Automation Setup for Hostamar

## Quick Start

```bash
# Install dependencies
npm install playwright

# Run health check
npm run browser:health

# Run all automation checks
npm run browser:auto

# Test payment flows
npm run browser:payments

# Check API endpoints
npm run browser:api
```

## What It Does

### 1. Site Health Monitoring
- Checks all 3 Vercel deployments + hostamar.com
- Verifies HTTP 200 status
- Records response times

### 2. API Endpoint Testing
- Tests `/api/health`, `/api/auth/me`, `/api/dashboard/stats`
- Verifies all 30 endpoints are responding
- Reports any failures

### 3. Payment Flow Testing
- Visits `/payment`, `/dashboard/payment`, `/dashboard/payment/crypto`
- Checks for payment buttons
- Verifies USDT wallet address is displayed

### 4. Analytics Monitoring
- Checks for Google Analytics
- Verifies tag manager loading
- Reports tracking status

### 5. Content Scraping
- Competitive research
- Title extraction
- Content insights

## Results

Results saved to:
- `.automation-results.json` - Full report
- `.health-check.json` - Health status
- `.scrape-insights.json` - Scraped data

## Cron Setup

Add to crontab for automated monitoring:

```cron
# Check site health every 30 minutes
*/30 * * * * cd /mnt/c/Users/romel/hostamar-local && npm run browser:health >> logs/health.log 2>&1

# Full check every hour
0 * * * * cd /mnt/c/Users/romel/hostamar-local && npm run browser:auto >> logs/automation.log 2>&1
```

## Environment Variables

```bash
# Add to .env.local
NOTIFICATION_WEBHOOK=https://discord.com/api/webhooks/...
MONITORED_SITES="https://hostamar.com https://vercel.app"
```