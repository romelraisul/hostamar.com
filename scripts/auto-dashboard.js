/**
 * HOSTAMAR AUTO-DASHBOARD
 * ========================
 * Real-time scaling metrics dashboard generator
 * Outputs HTML dashboard + console summary
 *
 * Usage:
 *   node scripts/auto-dashboard.js              # Generate HTML dashboard
 *   node scripts/auto-dashboard.js --console    # Console-only output
 *   node scripts/auto-dashboard.js --state      # Show current state only
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const STATE_FILE = path.join(__dirname, '..', '.auto-scaler-state.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return null;
}

// ====================
// DATA GATHERING
// ====================

async function gatherMetrics() {
const activeLeadFilter = { where: { status: { in: ['new', 'contacted', 'interested', 'demo'] } } };
  const [
    totalCustomers,
    totalLeads,
    activeLeads,
    payingCustomers,
    totalVideos,
    processedVideos,
    failedVideos,
    pendingVideos,
    totalPayments,
    completedPayments,
    failedPayments,
    activeSubscriptions,
    totalRevenue,
    todayRevenue,
    todayNewCustomers,
    todayNewLeads,
    outreachStats,
    referralCount,
    pipelineStats,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.lead.count(),
    prisma.lead.count(activeLeadFilter),
    prisma.customer.count({ where: { stage: 'paying' } }),
    prisma.video.count(),
    prisma.video.count({ where: { status: 'completed' } }),
    prisma.video.count({ where: { status: 'failed' } }),
    prisma.videoQueue.count({ where: { status: 'pending' } }),
    prisma.payment.count(),
    prisma.payment.count({ where: { status: 'completed' } }),
    prisma.payment.count({ where: { status: 'failed' } }),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.payment.aggregate({ where: { status: 'completed' }, _sum: { amount: true } }),
    prisma.payment.aggregate({
      where: { status: 'completed', createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _sum: { amount: true },
    }),
    prisma.customer.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.lead.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.outreachLog.aggregate({
      _count: true,
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.referral.count(),
    prisma.lead.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  const totalBDT = totalRevenue._sum.amount?.toFixed(0) || 0;
  const todayBDT = todayRevenue._sum.amount?.toFixed(0) || 0;

  // Calculate conversion rates
  const leadToCustomerRate = totalCustomers > 0
    ? ((totalCustomers / (totalLeads || 1)) * 100).toFixed(1)
    : 0;
  const outreachToLeadRate = totalLeads > 0
    ? ((activeLeads / (outreachStats._count || 1)) * 100).toFixed(1)
    : 0;
  const paymentSuccessRate = totalPayments > 0
    ? (((completedPayments / totalPayments) * 100)).toFixed(1)
    : 0;

  // Pipeline distribution
  const pipeline = pipelineStats.reduce((acc, s) => {
    acc[s.status] = s._count;
    return acc;
  }, {});

  return {
    customers: { total: totalCustomers, paying: payingCustomers, newToday: todayNewCustomers },
    leads: { total: totalLeads, active: activeLeads, newToday: todayNewLeads },
    videos: { total: totalVideos, processed: processedVideos, failed: failedVideos, pending: pendingVideos },
    payments: { total: totalPayments, completed: completedPayments, failed: failedPayments },
    subscriptions: { active: activeSubscriptions },
    revenue: { totalBDT, todayBDT },
    outreach: { total: outreachStats._count, today: outreachStats._count },
    referrals: { total: referralCount },
    rates: { leadToCustomerRate, outreachToLeadRate, paymentSuccessRate },
    pipeline,
    timestamp: new Date().toISOString(),
  };
}

// ====================
// CONSOLE DASHBOARD
// ====================

function printConsoleDashboard(metrics) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 HOSTAMAR SCALING DASHBOARD');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })}`);

  console.log('\n👥 CUSTOMERS');
  console.log(`   Total: ${metrics.customers.total} | Paying: ${metrics.customers.paying} (+${metrics.customers.newToday} today)`);

  console.log('\n📋 LEADS');
  console.log(`   Total: ${metrics.leads.total} | Active: ${metrics.leads.active} (+${metrics.leads.newToday} today)`);

  console.log('\n🎬 VIDEOS');
  console.log(`   Total: ${metrics.videos.total} | Processed: ${metrics.videos.processed} | Failed: ${metrics.videos.failed} | Pending: ${metrics.videos.pending}`);

  console.log('\n💰 REVENUE');
  console.log(`   Total: ৳${Number(metrics.revenue.totalBDT).toLocaleString()} | Today: ৳${Number(metrics.revenue.todayBDT).toLocaleString()}`);

  console.log('\n💳 PAYMENTS');
  console.log(`   Success Rate: ${metrics.rates.paymentSuccessRate}% (${metrics.payments.completed}/${metrics.payments.total})`);

  console.log('\n📡 OUTREACH');
  console.log(`   Total: ${metrics.outreach.total} | Lead Conv: ${metrics.rates.leadToCustomerRate}%`);

  console.log('\n🤝 REFERRALS');
  console.log(`   Total: ${metrics.referrals.total}`);

  // Pipeline bar
  console.log('\n📊 PIPELINE DISTRIBUTION');
  const maxCount = Math.max(...Object.values(metrics.pipeline), 1);
  const barWidth = 20;
  for (const [stage, count] of Object.entries(metrics.pipeline)) {
    const barLen = Math.round((count / maxCount) * barWidth);
    const bar = '█'.repeat(barLen) + '░'.repeat(barWidth - barLen);
    const stageNames = {
      new: 'New Leads', visited: 'Visitors', contacted: 'Contacted',
      interested: 'Interested', demo: 'Demos', converted: 'Converted',
      paying: 'Paying', churned: 'Churned', hot: 'Hot Leads'
    };
    console.log(`   ${(stageNames[stage] || stage).padEnd(15)} [${bar}] ${count}`);
  }

  // Tier indicator
  const payingCount = metrics.customers.paying;
  let tier = '🥉 BRONZE';
  let tierColor = '';
  if (payingCount >= 50) { tier = '🥈 SILVER'; }
  if (payingCount >= 100) { tier = '🥇 GOLD'; }
  if (payingCount >= 250) { tier = '💎 PLATINUM'; }
  console.log(`\n🏆 Current Tier: ${tier}`);

  // Health status
  const healthScore = calculateHealthScore(metrics);
  console.log(`💚 Health Score: ${healthScore}/100`);

  console.log('\n' + '='.repeat(60));
}

function calculateHealthScore(metrics) {
  let score = 50; // Base

  // Customer growth
  if (metrics.customers.paying >= 10) score += 10;
  if (metrics.customers.paying >= 50) score += 10;
  if (metrics.customers.paying >= 100) score += 10;

  // Revenue
  const revenue = Number(metrics.revenue.totalBDT);
  if (revenue >= 50000) score += 5;
  if (revenue >= 150000) score += 5;
  if (revenue >= 300000) score += 5;

  // Outreach
  if (metrics.rates.outreachToLeadRate > 20) score += 5;
  if (metrics.rates.leadToCustomerRate > 5) score += 5;

  // Video pipeline
  if (metrics.videos.pending === 0) score += 5;
  if (metrics.videos.failed === 0) score += 5;

  // Payments
  const successRate = parseFloat(metrics.rates.paymentSuccessRate);
  if (successRate > 80) score += 5;
  if (successRate > 95) score += 5;

  return Math.min(score, 100);
}

// ====================
// HTML DASHBOARD
// ====================

function generateHTMLDashboard(metrics) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hostamar Scaling Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { text-align: center; color: #38bdf8; margin-bottom: 30px; font-size: 2em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
    .card h3 { color: #94a3b8; font-size: 0.85em; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .card .value { font-size: 2.5em; font-weight: bold; color: #f1f5f9; }
    .card .sub { color: #64748b; font-size: 0.9em; margin-top: 5px; }
    .card.green .value { color: #4ade80; }
    .card.blue .value { color: #38bdf8; }
    .card.purple .value { color: #a78bfa; }
    .card.amber .value { color: #fbbf24; }
    .card.red .value { color: #f87171; }
    .section-title { color: #38bdf8; margin: 20px 0 10px; font-size: 1.2em; }
    .bar-chart { margin: 10px 0; }
    .bar-row { display: flex; align-items: center; margin: 5px 0; }
    .bar-label { width: 120px; color: #94a3b8; font-size: 0.85em; }
    .bar-track { flex: 1; height: 20px; background: #334155; border-radius: 10px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 10px; transition: width 0.5s; }
    .bar-value { width: 50px; text-align: right; color: #94a3b8; font-size: 0.85em; }
    .tier-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 1.1em; }
    .tier-bronze { background: #cd7f32; color: white; }
    .tier-silver { background: #a8a9ad; color: white; }
    .tier-gold { background: #ffd700; color: #333; }
    .tier-platinum { background: #e5e4e2; color: #333; }
    .rate-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
    .rate-card { text-align: center; padding: 15px; background: #1e293b; border-radius: 8px; }
    .rate-card .rate-value { font-size: 1.8em; font-weight: bold; color: #38bdf8; }
    .rate-card .rate-label { color: #64748b; font-size: 0.8em; margin-top: 5px; }
    .footer { text-align: center; color: #475569; margin-top: 40px; font-size: 0.8em; }
    .health-meter { width: 100%; height: 20px; background: #334155; border-radius: 10px; overflow: hidden; margin: 10px 0; }
    .health-fill { height: 100%; border-radius: 10px; transition: width 0.5s; }
    .updated { text-align: center; color: #64748b; font-size: 0.85em; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Hostamar Scaling Dashboard</h1>

    <div class="grid">
      <div class="card green">
        <h3>Paying Customers</h3>
        <div class="value">${metrics.customers.paying}</div>
        <div class="sub">+${metrics.customers.newToday} today | ${metrics.customers.total} total</div>
      </div>
      <div class="card blue">
        <h3>Total Leads</h3>
        <div class="value">${metrics.leads.total}</div>
        <div class="sub">${metrics.leads.active} active | +${metrics.leads.newToday} today</div>
      </div>
      <div class="card purple">
        <h3>Revenue (BDT)</h3>
        <div class="value">৳${Number(metrics.revenue.totalBDT).toLocaleString()}</div>
        <div class="sub">৳${Number(metrics.revenue.todayBDT).toLocaleString()} today</div>
      </div>
      <div class="card amber">
        <h3>Videos Processed</h3>
        <div class="value">${metrics.videos.processed}</div>
        <div class="sub">${metrics.videos.pending} pending | ${metrics.videos.failed} failed</div>
      </div>
      <div class="card blue">
        <h3>Active Subscribers</h3>
        <div class="value">${metrics.subscriptions.active}</div>
        <div class="sub">recurring revenue base</div>
      </div>
      <div class="card red">
        <h3>Payment Success</h3>
        <div class="value">${metrics.rates.paymentSuccessRate}%</div>
        <div class="sub">${metrics.payments.completed}/${metrics.payments.total} completed</div>
      </div>
    </div>

    <h2 class="section-title">🎯 Conversion Rates</h2>
    <div class="rate-grid">
      <div class="rate-card">
        <div class="rate-value">${metrics.rates.leadToCustomerRate}%</div>
        <div class="rate-label">Lead → Customer</div>
      </div>
      <div class="rate-card">
        <div class="rate-value">${metrics.rates.outreachToLeadRate}%</div>
        <div class="rate-label">Outreach → Lead</div>
      </div>
      <div class="rate-card">
        <div class="rate-value">${metrics.rates.paymentSuccessRate}%</div>
        <div class="rate-label">Payment Success</div>
      </div>
    </div>

    <h2 class="section-title">📊 Pipeline Distribution</h2>
    <div class="bar-chart">
${Object.entries(metrics.pipeline).map(([stage, count]) => {
  const maxCount = Math.max(...Object.values(metrics.pipeline), 1);
  const pct = (count / maxCount) * 100;
  const colors = { new: '#3b82f6', visited: '#9ca3af', contacted: '#60a5fa', interested: '#f59e0b', demo: '#f97316', converted: '#10b981', paying: '#8b5cf6', churned: '#ef4444', hot: '#ec4899' };
  const color = colors[stage] || '#64748b';
  const stageNames = { new: 'New Leads', visited: 'Visitors', contacted: 'Contacted', interested: 'Interested', demo: 'Demos', converted: 'Converted', paying: 'Paying', churned: 'Churned', hot: 'Hot Leads' };
  return `      <div class="bar-row">
        <div class="bar-label">${stageNames[stage] || stage}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="bar-value">${count}</div>
      </div>`;
}).join('\n')}
    </div>

    <h2 class="section-title">🏆 Current Tier</h2>
    <div style="text-align:center; margin: 15px 0;">
      <span class="tier-badge tier-gold">${metrics.customers.paying >= 100 ? '💎 PLATINUM' : metrics.customers.paying >= 50 ? '🥇 GOLD' : metrics.customers.paying >= 25 ? '🥈 SILVER' : '🥉 BRONZE'}</span>
    </div>

    <h2 class="section-title">💚 System Health</h2>
    <div class="health-meter"><div class="health-fill" style="width:${calculateHealthScore(metrics)}%;background:${calculateHealthScore(metrics) > 70 ? '#4ade80' : calculateHealthScore(metrics) > 40 ? '#fbbf24' : '#f87171'}"></div></div>
    <div style="text-align:center;color:#94a3b8;">Health Score: ${calculateHealthScore(metrics)}/100</div>

    <div class="updated">Last updated: ${metrics.timestamp}</div>
    <div class="footer">Hostamar Scaling Dashboard &copy; 2026 | Built for Bangladesh creators 🇧🇩</div>
  </div>
</body>
</html>`;

  return html;
}

function calculateHealthScore(metrics) {
  let score = 50;
  if (metrics.customers.paying >= 10) score += 10;
  if (metrics.customers.paying >= 50) score += 10;
  if (metrics.customers.paying >= 100) score += 10;
  const rev = Number(metrics.revenue.totalBDT);
  if (rev >= 50000) score += 5;
  if (rev >= 150000) score += 5;
  if (rev >= 300000) score += 5;
  if (parseFloat(metrics.rates.leadToCustomerRate) > 5) score += 5;
  if (parseFloat(metrics.rates.paymentSuccessRate) > 80) score += 5;
  if (metrics.videos.pending === 0) score += 5;
  if (metrics.videos.failed === 0) score += 5;
  return Math.min(score, 100);
}

// ====================
// MAIN
// ====================

async function main() {
  const args = process.argv.slice(2);
  const consoleOnly = args.includes('--console');
  const stateOnly = args.includes('--state');

  if (stateOnly) {
    const state = loadState();
    if (state) {
      console.log(JSON.stringify(state, null, 2));
    } else {
      console.log('No state file found. Run auto-scaler first.');
    }
    await prisma.$disconnect();
    return;
  }

  console.log('\n📊 Gathering metrics...');
  const metrics = await gatherMetrics();

  // Always print console dashboard
  printConsoleDashboard(metrics);

  if (!consoleOnly) {
    // Generate HTML dashboard
    const html = generateHTMLDashboard(metrics);
    const dashboardPath = path.join(__dirname, '..', 'dashboard.html');
    fs.writeFileSync(dashboardPath, html);
    console.log(`\n✅ HTML dashboard saved to: ${dashboardPath}`);

    // Also save metrics as JSON (for API consumption)
    const metricsPath = path.join(__dirname, '..', 'dashboard-metrics.json');
    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    console.log(`✅ Metrics JSON saved to: ${metricsPath}`);
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { gatherMetrics, printConsoleDashboard, generateHTMLDashboard };