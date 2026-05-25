/**
 * HOSTAMAR AUTO-ACQUISITION ENGINE
 * =================================
 * Automated customer acquisition pipeline:
 * - Auto-reply to WhatsApp/email inquiries
 * - Process pending follow-ups
 * - Lead scoring & qualification
 * - CSV/contact import
 *
 * Usage:
 *   node scripts/auto-acquisition.js [--source=whatsapp|email|csv]
 *   node scripts/auto-acquisition.js --follow-ups
 *   node scripts/auto-acquisition.js --score-all
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CONFIG = {
  // Auto-reply settings
  replyDelay: 1000,           // ms between replies
  maxDailyReplies: 100,
  followUpDelay: 48,          // hours before follow-up

  // Lead scoring
  scoreWeights: {
    hasPhone: 10,
    hasEmail: 8,
    hasCompany: 15,
    fromReferral: 20,
    fromPaidAds: 12,
    fromFacebook: 5,
    repliedToMessage: 25,
    websiteVisit: 3,
  },

  // Qualification thresholds
  QUALIFIED_THRESHOLD: 30,    // Score >= 30 = qualified lead
  HOT_THRESHOLD: 50,          // Score >= 50 = hot lead
};

// ====================
// AUTO-REPLY ENGINE
// ====================

async function checkAndReply() {
  console.log('\n💬 Checking for pending inquiries...');

  // Get unreplied outreach logs
  const unreplied = await prisma.outreachLog.findMany({
    where: {
      status: 'sent',
      response: null,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    include: { lead: true, customer: true },
    take: CONFIG.maxDailyReplies,
  });

  let replied = 0;
  for (const log of unreplied) {
    // Check if we should send follow-up
    const shouldFollowUp = log.lead && log.lead.lastContactAt &&
      (Date.now() - new Date(log.lead.lastContactAt).getTime()) > CONFIG.followUpDelay * 3600000;

    if (shouldFollowUp) {
      await processFollowUp(log);
      replied++;
    }
  }

  console.log(`✅ Processed ${replied} pending replies/follow-ups`);
  return replied;
}

async function processFollowUp(log) {
  const followUpMessages = {
    whatsapp: `Hi! 👋 Just following up on my message about Hostamar.\n\nStill interested in AI video generation? Reply "YES" for access!\n\nhostamar.com`,
    email: {
      subject: 'Re: AI Video for Your Business 🎬',
      body: `Hi,\n\nJust following up on my previous message about Hostamar.\n\nAre you still interested in AI-powered video generation?\n\nI'd love to show you a quick demo.\n\nBest,\nRomel | hostamar.com`,
    },
  };

  // Log the follow-up
  await prisma.outreachLog.create({
    data: {
      leadId: log.leadId,
      customerId: log.customerId,
      channel: log.channel,
      direction: 'outbound',
      subject: log.channel === 'email' ? followUpMessages.email.subject : 'Follow-up',
      message: followUpMessages[log.channel] || followUpMessages.whatsapp,
      status: 'follow_up',
    },
  });

  // Update lead
  if (log.lead) {
    await prisma.lead.update({
      where: { id: log.leadId },
      data: {
        attemptCount: { increment: 1 },
        lastContactAt: new Date(),
        nextContactAt: new Date(Date.now() + 72 * 3600000), // 3 days
      },
    });
  }
}

// ====================
// FOLLOW-UP PROCESSOR
// ====================

async function processPendingFollowUps() {
  console.log('\n🔄 Processing pending follow-ups...');

  const overdue = await prisma.followUp.findMany({
    where: {
      status: 'pending',
      scheduledFor: { lte: new Date() },
    },
    include: { lead: true, customer: true },
    orderBy: { priority: 'desc' },
    take: 50,
  });

  let processed = 0;
  for (const followUp of overdue) {
    try {
      // Create outreach log
      await prisma.outreachLog.create({
        data: {
          leadId: followUp.leadId,
          customerId: followUp.customerId,
          channel: followUp.followUpType,
          direction: 'outbound',
          message: followUp.notes || 'Follow-up message',
          status: 'sent',
        },
      });

      // Update follow-up status
      await prisma.followUp.update({
        where: { id: followUp.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      // Update lead
      if (followUp.leadId) {
        await prisma.lead.update({
          where: { id: followUp.leadId },
          data: {
            lastContactAt: new Date(),
            attemptCount: { increment: 1 },
          },
        });
      }

      processed++;

      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.log(`⚠️ Failed to process follow-up ${followUp.id}:`, e.message.substring(0, 50));
    }
  }

  console.log(`✅ Processed ${processed} follow-ups`);
  return processed;
}

// ====================
// LEAD SCORING ENGINE
// ====================

async function scoreLead(leadId) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { logs: true },
  });

  if (!lead) return 0;

  let score = 0;

  // Base scoring
  if (lead.phone) score += CONFIG.scoreWeights.hasPhone;
  if (lead.email) score += CONFIG.scoreWeights.hasEmail;
  if (lead.company) score += CONFIG.scoreWeights.hasCompany;

  // Source scoring
  const sourceWeights = {
    referral: CONFIG.scoreWeights.fromReferral,
    paid_ads: CONFIG.scoreWeights.fromPaidAds,
    facebook_group: CONFIG.scoreWeights.fromFacebook,
    organic: CONFIG.scoreWeights.websiteVisit,
    linkedin: CONFIG.scoreWeights.websiteVisit,
    event: CONFIG.scoreWeights.websiteVisit * 2,
    webinar: CONFIG.scoreWeights.websiteVisit * 2,
    partnership: CONFIG.scoreWeights.websiteVisit * 3,
  };
  score += sourceWeights[lead.source] || 0;

  // Engagement scoring
  const replies = lead.logs.filter(l => l.status === 'replied');
  if (replies.length > 0) {
    score += CONFIG.scoreWeights.repliedToMessage;
  }

  // Interaction count bonus
  if (lead.attemptCount >= 3) score += 10;
  if (lead.attemptCount >= 5) score += 15;

  // Update lead score
  const newScore = Math.min(score, 100);
  await prisma.lead.update({
    where: { id: leadId },
    data: { score: newScore },
  });

  // Update status based on score
  let newStatus = lead.status;
  if (newScore >= CONFIG.HOT_THRESHOLD) newStatus = 'hot';
  else if (newScore >= CONFIG.QUALIFIED_THRESHOLD) newStatus = 'qualified';
  else if (newScore >= 15) newStatus = 'contacted';

  if (newStatus !== lead.status) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: newStatus },
    });
  }

  return newScore;
}

async function scoreAllLeads() {
  console.log('\n🎯 Scoring all leads...');

  const leads = await prisma.lead.findMany({
    where: { status: { notIn: ['converted', 'dead'] } },
    select: { id: true },
  });

  let hot = 0, qualified = 0, contacted = 0;

  for (const lead of leads) {
    const score = await scoreLead(lead.id);
    if (score >= CONFIG.HOT_THRESHOLD) hot++;
    else if (score >= CONFIG.QUALIFIED_THRESHOLD) qualified++;
    else if (score >= 15) contacted++;
  }

  console.log(`✅ Scored ${leads.length} leads`);
  console.log(`   🔥 Hot: ${hot} | ✅ Qualified: ${qualified} | 📱 Contacted: ${contacted}`);

  return { total: leads.length, hot, qualified, contacted };
}

// ====================
// LEAD IMPORT
// ====================

async function importLeadsFromCSV(filePath) {
  console.log(`\n📂 Importing leads from ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').slice(1); // Skip header
  let imported = 0;

  for (const line of lines) {
    const [name, phone, email, company, source] = line.split(',');
    if (!name) continue;

    try {
      await prisma.lead.create({
        data: {
          name: name.trim(),
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          company: company?.trim() || null,
          source: source?.trim() || 'manual',
          score: 0,
          status: 'new',
        },
      });
      imported++;
    } catch (e) {
      // Skip duplicates
      if (!e.message.includes('Unique')) {
        console.log(`⚠️ Failed: ${name} - ${e.message.substring(0, 50)}`);
      }
    }
  }

  console.log(`✅ Imported ${imported} leads`);
  return imported;
}

// ====================
// CONVERSION TRACKING
// ====================

async function trackConversion(leadId, customerId) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return false;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: 'converted',
      convertedAt: new Date(),
      customerId: customerId,
    },
  });

  // Create activity log
  await prisma.activityLog.create({
    data: {
      customerId: customerId,
      action: 'lead_converted',
      description: `Lead ${lead.name} converted to customer`,
      metadata: JSON.stringify({ source: lead.source, score: lead.score }),
    },
  });

  console.log(`✅ Lead converted: ${lead.name}`);
  return true;
}

// ====================
// DAILY LEAD SUMMARY
// ====================

async function getDailySummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [newLeads, contactedLeads, hotLeads, convertedToday] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: today } } }),
    prisma.lead.count({ where: { status: 'contacted', lastContactAt: { gte: today } } }),
    prisma.lead.count({ where: { status: 'hot' } }),
    prisma.lead.count({ where: { status: 'converted', convertedAt: { gte: today } } }),
  ]);

  return { newLeads, contactedLeads, hotLeads, convertedToday };
}

// ====================
// MAIN
// ====================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--follow-ups')) {
    console.log('\n🔄 FOLLOW-UP PROCESSOR');
    const count = await processPendingFollowUps();
    console.log(`\nProcessed ${count} follow-ups`);
    return;
  }

  if (args.includes('--score-all')) {
    const result = await scoreAllLeads();
    console.log('\nLead scoring complete:', result);
    return;
  }

  if (args.includes('--status') || args.includes('--summary')) {
    const summary = await getDailySummary();
    console.log('\n📋 Daily Lead Summary:');
    console.log(`   New Today:     ${summary.newLeads}`);
    console.log(`   Contacted:     ${summary.contactedLeads}`);
    console.log(`   Hot Leads:     ${summary.hotLeads}`);
    console.log(`   Converted:     ${summary.convertedToday}`);
    return;
  }

  // Default: run full acquisition cycle
  console.log('\n' + '='.repeat(60));
  console.log('🚀 HOSTAMAR AUTO-ACQUISITION ENGINE');
  console.log('='.repeat(60));

  await checkAndReply();
  await processPendingFollowUps();

  const summary = await getDailySummary();
  console.log('\n📋 Today\'s Summary:');
  console.log(`   New Leads:     ${summary.newLeads}`);
  console.log(`   Contacted:     ${summary.contactedLeads}`);
  console.log(`   Hot Leads:     ${summary.hotLeads}`);
  console.log(`   Conversions:   ${summary.convertedToday}`);

  await prisma.$disconnect();
  console.log('\n✅ Acquisition engine complete');
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = {
  scoreLead,
  scoreAllLeads,
  processPendingFollowUps,
  checkAndReply,
  trackConversion,
  importLeadsFromCSV,
  getDailySummary,
  CONFIG,
};