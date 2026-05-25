/**
 * Hostamar Browser Automation Script
 * Supports: Monitoring, API testing, Payment verification
 * Run: node scripts/browser-automation.js start
 *        node scripts/browser-automation.js check-health
 *        node scripts/browser-automation.js monitor-api
 *        node scripts/browser-automation.js test-payments
 */

const { chromium } = require('playwright');

const CONFIG = {
  baseUrl: process.env.SITE_URL || 'https://hostamar.com',
  headless: process.env.HEADLESS !== 'false',
  timeout: 30000,
};

async function launchBrowser() {
  return chromium.launch({ headless: CONFIG.headless });
}

async function checkHealth() {
  console.log('🏥 Checking Hostamar health...');
  try {
    const browser = await launchBrowser();

    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Check homepage
    await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
    const title = await page.title();
    console.log(`  ✓ Homepage loaded: ${title}`);
    
    // Check API health
    const apiResponse = await page.goto(`${CONFIG.baseUrl}/api/health`, { waitUntil: 'domcontentloaded' });
    const healthData = await apiResponse.json();
    console.log(`  ✓ API Health: ${JSON.stringify(healthData)}`);
    
    // Check login page
    await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    console.log(`  ✓ Login page loaded`);
    
    // Check dashboard redirect
    const loginBtn = await page.$('button[type="submit"], .login-btn, a[href*="login"]');
    if (loginBtn) {
      console.log(`  ✓ Login button found`);
    }
    
    console.log('✅ Health check PASSED');
    return true;
  } catch (error) {
    console.error(`❌ Health check FAILED: ${error.message}`);
    return false;
  } finally {
    if (typeof browser !== 'undefined') await browser.close();
  }
}

async function monitorAPI() {
  console.log('📡 Monitoring Hostamar API endpoints...');
  const browser = await launchBrowser();
  
  const endpoints = [
    '/api/health',
    '/api/auth/session',
    '/api/payment/health',
    '/api/video/queue',
  ];
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    for (const endpoint of endpoints) {
      try {
        const fullUrl = `${CONFIG.baseUrl}${endpoint}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
        const status = page.url().includes('error') ? '❌' : '✅';
        console.log(`  ${status} ${endpoint}`);
      } catch (err) {
        console.log(`  ❌ ${endpoint}: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }
}

async function testPayments() {
  console.log('💳 Testing payment integration...');
  
  const endpoints = [
    { method: 'POST', url: '/api/payment/bkash', body: { action: 'create', amount: 100, orderId: 'test-001' } },
    { method: 'POST', url: '/api/payment/nagad', body: { action: 'create', amount: 100, orderId: 'test-001', phoneNumber: '01700000000' } },
    { method: 'POST', url: '/api/payment/crypto', body: { action: 'create', amount: 100, orderId: 'test-001' } },
  ];
  
  for (const { method, url, body } of endpoints) {
    try {
      const response = await fetch(`${CONFIG.baseUrl}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      const status = response.ok ? '✅' : '❌';
      console.log(`  ${status} ${url} — ${response.status}: ${JSON.stringify(data).substring(0, 100)}`);
    } catch (err) {
      console.log(`  ❌ ${url}: ${err.message}`);
    }
  }
}

async function runAutomation() {
  console.log('🤖 Running full browser automation...');
  const browser = await launchBrowser();
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to site
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
    console.log(`  ✓ Loaded: ${await page.title()}`);
    
    // Take screenshot
    const screenshotPath = `screenshot_${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  ✓ Screenshot saved: ${screenshotPath}`);
    
    // Fill out and submit test form if exists
    const forms = await page.$$('form');
    for (const form of forms) {
      console.log(`  ✓ Found form on page`);
    }
    
    console.log('✅ Automation complete');
  } catch (error) {
    console.error(`❌ Automation failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

// Only run if called directly (not when required as a module)
if (require.main === module) {
  const command = process.argv[2] || 'start';

  switch (command) {
    case 'check-health':
      checkHealth().then(success => process.exit(success ? 0 : 1));
      break;
    case 'monitor-api':
      monitorAPI().then(() => process.exit(0));
      break;
    case 'test-payments':
      testPayments().then(() => process.exit(0));
      break;
    case 'start':
    default:
      runAutomation().then(() => process.exit(0));
      break;
  }
}

module.exports = { checkHealth, monitorAPI, testPayments, runAutomation };