/**
 * Daily Automation Scheduler
 * Runs outreach, creates snapshots, sends notifications
 * 
 * Usage: node scripts/daily-scheduler.js
 * Can be set as cron job: 0 9 * * * cd /path && node scripts/daily-scheduler.js
 */

const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Execute command and return promise
function execCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: true });
    let output = '';
    proc.stdout.on('data', (d) => output += d);
    proc.stderr.on('data', (d) => output += d);
    proc.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output));
    });
  });
}

async function runDailyTasks() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 HOSTAMAR DAILY AUTOMATION');
  console.log('='.repeat(50));
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    // 1. Run outreach automation
    console.log('📱 Running outreach automation...');
    try {
      await execCommand('node', ['scripts/outreach-automation.js', 'run-all']);
      console.log('✅ Outreach complete\n');
    } catch (e) {
      console.error('⚠️ Outreach error:', e.message.substring(0, 100));
    }

    // 2. Create analytics snapshot
    console.log('📊 Creating analytics snapshot...');
    try {
      // Import and run the snapshot function
      const outreachMod = require('./outreach-automation');
      if (outreachMod.createAnalyticsSnapshot) {
        await outreachMod.createAnalyticsSnapshot();
        console.log('✅ Snapshot created\n');
      } else {
        console.log('⚠️ createAnalyticsSnapshot not available, skipping\n');
      }
    } catch (e) {
      console.error('⚠️ Snapshot error:', e.message.substring(0, 100));
    }

    // 3. Get pipeline status
    console.log('📈 Checking pipeline...');
    try {
      const response = await fetch('http://localhost:3000/api/crm/pipeline');
      if (response.ok) {
        const data = await response.json();
        console.log(`\n📊 Pipeline Status:`);
        console.log(`   Leads: ${data.pipeline.new + data.pipeline.contacted + data.pipeline.interested}`);
        console.log(`   Paid: ${data.customers.paid}/100`);
        console.log(`   Revenue: ৳${data.revenue.totalBDT.toLocaleString()}`);
        console.log(`   Response Rate: ${data.outreach.responseRate}%\n`);
      }
    } catch (e) {
      console.log('⚠️ Pipeline check skipped (server may be offline)');
    }

// 4. Check for urgent follow-ups
    console.log('🔔 Checking follow-ups...');
    try {
      const overdue = await prisma.followUp.count({
        where: { status: 'pending', scheduledFor: { lt: new Date() } },
      });

      if (overdue > 0) {
        console.log(`⚠️ ${overdue} overdue follow-ups need attention!`);
        fs.writeFileSync('.daily-alert.txt',
          `URGENT: ${overdue} follow-ups overdue. Check dashboard.`
        );
      } else {
        console.log('✅ No overdue follow-ups\n');
      }
    } catch (e) {
      console.log('⚠️ Follow-up check skipped (DB not reachable for simulation)');
    }

    console.log('='.repeat(50));
    console.log('✅ Daily automation complete!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Daily automation failed:', error.message);
    process.exit(1);
  }
}

// Main
if (require.main === module) {
  runDailyTasks()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { runDailyTasks };