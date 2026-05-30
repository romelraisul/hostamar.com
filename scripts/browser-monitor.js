const { chromium } = require('playwright');

const SITES = [
  'https://hostamar.com',
  'https://hostamar.com/ossu',
  'https://hostamar.com/ossu/curriculum',
];

async function runAllChecks() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  
  for (const url of SITES) {
    try {
      const page = await browser.newPage();
      const response = await page.goto(url, { timeout: 15000 });
      const title = await page.title();
      await page.close();
      
      results.push({
        url,
        status: response?.status(),
        title,
        success: response?.status() === 200
      });
    } catch (error) {
      results.push({
        url,
        success: false,
        error: error.message
      });
    }
  }
  
  await browser.close();
  return results;
}

async function checkHealth() {
  const results = await runAllChecks();
  console.log('\n=== OSSU Academy Site Health Check ===\n');
  results.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.url}`);
    if (r.status) console.log(`   Status: ${r.status}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'check-health') {
    checkHealth();
  } else {
    checkHealth();
  }
}

module.exports = { runAllChecks, checkHealth };