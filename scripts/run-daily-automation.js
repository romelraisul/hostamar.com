/**
 * HOSTAMAR DAILY AUTOMATION — Main Entry Point
 * Runs all daily tasks sequentially
 * 
 * Usage: node scripts/run-daily-automation.js
 *        node scripts/run-daily-automation.js --simulate
 */

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');

function runScript(scriptName, description) {
  const scriptPath = path.join(PROJECT_DIR, 'scripts', scriptName);
  try {
    console.log(`\n▶ ${description}`);
    const result = execSync(`node "${scriptPath}"`, { 
      cwd: PROJECT_DIR, 
      encoding: 'utf-8', 
      timeout: 300000 
    });
    console.log(result);
    return true;
  } catch (error) {
    console.error(`⚠️ ${description} failed: ${error.message.substring(0, 200)}`);
    return false;
  }
}

async function runAll() {
  const startTime = new Date().toISOString();
  console.log('');
  console.log('============================================================');
  console.log('  HOSTAMAR DAILY AUTOMATION');
  console.log('  Started: ' + startTime);
  console.log('============================================================');

  const simulate = process.argv.includes('--simulate');

  if (simulate) {
    console.log('\n🔬 SIMULATION MODE — no real actions will be taken\n');
  }

  const results = {};

  // Phase 1: Daily scheduler (outreach + analytics)
  results.dailyScheduler = runScript('daily-scheduler.js', 'Daily Scheduler (Outreach + Analytics)');

  // Phase 2: Auto-scaler
  results.autoScaler = runScript('auto-scaler.js', 'Auto-Scaler (Acquisition + Engagement + Scale)');

  // Phase 3: Marketing
  results.marketing = runScript('auto-marketing.js', 'Marketing Engine');

  // Phase 4: Ops monitoring
  results.ops = runScript('auto-ops.js', 'Operations Monitor');

  // Summary
  console.log('\n============================================================');
  console.log('  DAILY AUTOMATION SUMMARY');
  console.log('============================================================');
  for (const [name, success] of Object.entries(results)) {
    console.log(`  ${success ? '✅' : '❌'} ${name}`);
  }
  console.log('============================================================');
  console.log('Completed: ' + new Date().toISOString());
}

runAll().catch(e => {
  console.error('Automation error:', e.message);
  process.exit(1);
});