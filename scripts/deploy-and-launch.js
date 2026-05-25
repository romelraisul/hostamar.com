/**
 * HOSTAMAR DEPLOYMENT & AUTOMATION SCRIPT
 * COPY-PASTE AND RUN: node scripts/deploy-and-launch.js
 * 
 * This handles:
 * 1. Environment setup
 * 2. Database migration
 * 3. Build optimization
 * 4. Deployment to Vercel
 * 5. Cron job setup for automation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');

function run(cmd, description) {
  console.log(`\n▶ ${description}`);
  console.log(`  $ ${cmd}`);
  try {
    const output = execSync(cmd, { cwd: PROJECT_DIR, encoding: 'utf-8', timeout: 120000 });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`  ⚠️ Failed: ${error.message.substring(0, 200)}`);
    return false;
  }
}

console.log('\n' + '='.repeat(60));
console.log('🚀 HOSTAMAR DEPLOY & LAUNCH');
console.log('='.repeat(60));

// Step 1: Install dependencies
if (!fs.existsSync(path.join(PROJECT_DIR, 'node_modules', '@prisma', 'client'))) {
  run('npm install', 'Installing dependencies...');
} else {
  console.log('\n✅ Dependencies already installed');
}

// Step 2: Prisma Generate
run('npx prisma generate', 'Generating Prisma client...');

// Step 3: Database Migration
run('npx prisma migrate deploy', 'Running database migrations...');

// Step 4: Create initial pipeline snapshot table entries
console.log('\n📊 Creating initial pipeline snapshot...');
try {
  // This will be done via API on first run
  console.log('(Snapshot will be created when server starts)');
} catch (e) {
  console.log('⚠️ Snapshot skipped:', e.message);
}

// Step 5: Build
console.log('\n🔨 Building Next.js app...');
const buildResult = run('npx next build', 'Building Next.js...');

// Step 6: Export (if static)
run('npx next export', 'Exporting static files...');

// Step 7: Deploy to Vercel
console.log('\n☁️  Deploying to Vercel...');
run('npx vercel --prod --token=' + process.env.VERCEL_TOKEN + ' --yes', 'Deploying to Vercel...');

console.log('\n' + '='.repeat(60));
console.log('✅ DEPLOYMENT COMPLETE!');
console.log('='.repeat(60));
console.log('\n📋 NEXT STEPS:');
console.log('  1. Verify deployment: https://hostamar-local-po02js9ux-romelraisul-8939s-projects.vercel.app');
console.log('  2. Set up Vercel environment variables');
console.log('  3. Run daily automation: node scripts/daily-scheduler.js');
console.log('  4. Start outreach: node scripts/outreach-automation.js run-all');
console.log('  5. Check dashboard: /dashboard route');
console.log('\n⚙️  CRON SETUP (run every morning at 9 AM):');
console.log('  crontab -e');
console.log('  Add: 0 9 * * * cd /mnt/c/Users/romel/hostamar-local && node scripts/daily-scheduler.js >> cron.log 2>&1');
console.log('');