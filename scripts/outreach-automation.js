/**
 * OUTREACH AUTOMATION ENGINE
 * 
 * Manages automated campaigns:
 * 1. Facebook Group Cold Outreach
 * 2. B2B Email Outreach
 * 3. WhatsApp Warm Outreach
 * 4. Referral Program
 * 5. Churned User Reactivation
 * 
 * Usage:
 *   node scripts/outreach-automation.js run-all
 *   node scripts/outreach-automation.js run facebook
 *   node scripts/outreach-automation.js status
 *   node scripts/outreach-automation.js report
 */

const http = require('http');

const CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  dailyTarget: 50, // contacts per day total across all channels

  // Campaign message templates
  campaigns: {
    // Campaign 1: Facebook Group Cold Outreach via WhatsApp
    facebook_cold: {
      name: 'Facebook Cold Outreach',
      channel: 'whatsapp',
      weeklyTarget: 50,
      message(name) {
        return `Hi ${name || ''}! 👋\n\nI'm Romel from Hostamar.com — AI video generation for Bangladeshi creators.\n\n🎬 Create professional videos in minutes\n🎯 50+ templates for YouTube, Facebook, TikTok\n💰 Pay with bKash/Nagad/Crypto (USDT)\n\n🎉 Beta users get 50% OFF forever!\n\nWant to try? Reply "YES" and I'll send you access! 🎥\n\nRomel | 01822417463 | hostamar.com`;
      },
      followUp(name) {
        return `Hi ${name || ''}! 👋\n\nJust following up on my message about Hostamar.\n\nWe've helped 100+ Bangladeshi creators make videos faster.\n\nStill interested? Reply "DEMO" for a quick walkthrough! 😊`;
      },
    },

    // Campaign 2: B2B Email
    b2b_email: {
      name: 'B2B Email Outreach',
      channel: 'email',
      weeklyTarget: 30,
      subject: 'Create 10x more video content in less time 🎬',
      message(name, company) {
        return `Hi ${name || 'there'},\n\nI noticed ${company || 'your company'} creates great video content.\n\nI built Hostamar.com — an AI video platform that creates videos 10x faster.\n\n🎯 50+ professional templates\n🎬 AI-powered script writing\n📹 Automatic video generation\n💰 Plans: ৳2,000-6,000/month\n\nOur beta users increased video output by 300%.\n\nOpen to a 15-min demo? Reply with a good time!\n\nBest,\nRomel Raisul\nFounder, Hostamar\n📱 01822417463\n🌐 hostamar.com`;
      },
      followUpSubject: 'Re: Quick video demo?',
      followUpMessage(name) {
        return `Hi ${name || 'there'},\n\nJust following up on my email about Hostamar.\n\nAre you available this week for a quick 5-min demo?\n\nReply with a time that works! 😊`;
      },
    },

    // Campaign 3: WhatsApp Warm Contacts
    whatsapp_warm: {
      name: 'WhatsApp Warm Contacts',
      channel: 'whatsapp',
      weeklyTarget: 30,
      message(name) {
        return `Hi ${name || ''}! 😊\n\nLong time! I wanted to share something exciting:\n\nI just launched Hostamar — AI video creation in minutes!\n\n🎬 10 FREE videos/month to start\n🎯 Perfect for YouTubers, FB creators, businesses\n💰 Plans from just ৳2,000/month\n\nWant to check it out? I'll send a link! 🎥\n\nRomel | hostamar.com`;
      },
      followUp(name) {
        return `Hi ${name || ''}! 👋\n\nQuick follow-up — did you try Hostamar yet?\n\nIf you're a content creator, this could save hours of editing time every week.\n\nReply "YES" for free access! 😊`;
      },
    },

    // Campaign 4: Referral Requests
    referral: {
      name: 'Referral Outreach',
      channel: 'whatsapp',
      weeklyTarget: 20,
      message(name, referralLink) {
        return `Hi ${name || ''}! 😊\n\nHope you're enjoying Hostamar!\n\nKnow anyone who needs AI video generation?\n\n🏆 Refer them = 1 FREE month for you\n🎉 They get 20% OFF first month\n\nYour link: ${referralLink || 'hostamar.com?ref=XXXX'}\n\nThank you for being a valued customer! 🙏`;
      },
    },

    // Campaign 5: Reactivation
    reactivation: {
      name: 'Churned User Reactivation',
      channel: 'whatsapp',
      weeklyTarget: 10,
      message(name) {
        return `Hi ${name || ''},\n\nWe noticed you haven't been active on Hostamar recently.\n\nNew features added:\n✨ 15 new templates\n✨ Faster AI generation\n✨ Improved Bangla support\n✨ New pricing from ৳1,500/month\n\nCome back and try again! Your account is still active.\n\nLogin: https://hostamar.com/dashboard\n\nQuestions? Just reply! 😊`;
      },
    },
  },
};

class OutreachAutomation {
  constructor() {
    this.stats = {
      totalSent: 0,
      totalReplied: 0,
      totalInterested: 0,
      totalConverted: 0,
      errors: [],
      lastRun: null,
    };
  }

  // API Helper
  async apiRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = `${CONFIG.baseUrl}${path}`;
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      };

      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  // Get contacts to reach out to
  async getContacts(campaignType) {
    try {
      const res = await this.apiRequest(
        `/api/crm/leads?status=new&source=${campaignType}&limit=10`
      );
      return res.leads || [];
    } catch (err) {
      console.error('Error fetching contacts:', err.message);
      return [];
    }
  }

  // Log outreach attempt
  async logOutreach(leadId, channel, message, status) {
    try {
      await this.apiRequest('/api/crm/outreach', 'POST', {
        leadId,
        channel,
        message,
        status,
      });
    } catch (err) {
      console.error('Error logging outreach:', err.message);
    }
  }

  // Update lead status
  async updateLeadStatus(leadId, status) {
    try {
      const res = await this.apiRequest(`/api/crm/leads?id=${leadId}`, 'GET');
      // Find lead and update
      await this.apiRequest('/api/crm/pipeline', 'PUT', {
        leadId,
        status,
      });
    } catch (err) {
      console.error('Error updating lead:', err.message);
    }
  }

  // Run Facebook cold outreach
  async runFacebookCold() {
    const campaign = CONFIG.campaigns.facebook_cold;
    console.log(`\n📣 Running: ${campaign.name} (target: ${campaign.weeklyTarget})`);

    const contacts = await this.getContacts('facebook');
    let sent = 0;

    for (const contact of contacts) {
      if (sent >= campaign.weeklyTarget) break;

      const message = campaign.message(contact.name);

      // Log outreach
      await this.logOutreach(contact.id, 'whatsapp', message, 'sent');

      // In production: send via WhatsApp Business API
      console.log(`  ✉️ Message to ${contact.name} (${contact.phone || 'no phone'})`);

      sent++;
      this.stats.totalSent++;

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`✅ ${campaign.name}: ${sent} messages sent`);
    return sent;
  }

  // Run B2B Email campaign
  async runEmailCampaign() {
    const campaign = CONFIG.campaigns.b2b_email;
    console.log(`\n📧 Running: ${campaign.name} (target: ${campaign.weeklyTarget})`);

    const contacts = await this.getContacts('email_outreach');
    let sent = 0;

    for (const contact of contacts) {
      if (sent >= campaign.weeklyTarget) break;

      const message = campaign.message(contact.name, contact.company);

      await this.logOutreach(contact.id, 'email', message, 'sent');
      console.log(`  ✉️ Email to ${contact.email || 'no email'}`);

      sent++;
      this.stats.totalSent++;

      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`✅ ${campaign.name}: ${sent} emails queued`);
    return sent;
  }

  // Run Warm WhatsApp campaign
  async runWhatsAppWarm() {
    const campaign = CONFIG.campaigns.whatsapp_warm;
    console.log(`\n💬 Running: ${campaign.name} (target: ${campaign.weeklyTarget})`);

    const contacts = await this.getContacts('whatsapp');
    let sent = 0;

    for (const contact of contacts) {
      if (sent >= campaign.weeklyTarget) break;

      const message = campaign.message(contact.name);
      await this.logOutreach(contact.id, 'whatsapp', message, 'sent');
      console.log(`  💬 WhatsApp to ${contact.phone || 'no phone'}`);

      sent++;
      this.stats.totalSent++;

      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`✅ ${campaign.name}: ${sent} messages sent`);
    return sent;
  }

  // Run Referral campaign (to existing customers)
  async runReferralCampaign() {
    const campaign = CONFIG.campaigns.referral;
    console.log(`\n🤝 Running: ${campaign.name} (target: ${campaign.weeklyTarget})`);

    // Get active paying customers
    try {
      const res = await this.apiRequest(
        '/api/crm/pipeline?days=30'
      );
      // Send referral requests to first N paying customers
      const customers = res.snapshots || [];
      let sent = 0;

      for (const _ of customers.slice(0, campaign.weeklyTarget)) {
        await this.logOutreach(null, 'whatsapp', campaign.message('Valued Customer'), 'sent');
        sent++;
        this.stats.totalSent++;
      }

      console.log(`✅ ${campaign.name}: ${sent} referral requests sent`);
      return sent;
    } catch {
      console.log('⚠️  No pipeline data for referral targeting');
      return 0;
    }
  }

  // Run Reactivation campaign
  async runReactivation() {
    const campaign = CONFIG.campaigns.reactivation;
    console.log(`\n🔁 Running: ${campaign.name} (target: ${campaign.weeklyTarget})`);

    // Get churned/dead leads
    try {
      const res = await this.apiRequest(
        '/api/crm/leads?status=dead&limit=20'
      );
      const deadLeads = res.leads || [];
      let sent = 0;

      for (const lead of deadLeads.slice(0, campaign.weeklyTarget)) {
        const message = campaign.message(lead.name);
        await this.logOutreach(lead.id, 'whatsapp', message, 'sent');
        console.log(`  🔁 Reactivation attempt: ${lead.name}`);

        sent++;
        this.stats.totalSent++;
        await new Promise((r) => setTimeout(r, 200));
      }

      console.log(`✅ ${campaign.name}: ${sent} reactivation attempts`);
      return sent;
    } catch {
      console.log('⚠️  No churned leads found');
      return 0;
    }
  }

  // Run all campaigns
  async runAll() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 HOSTAMAR OUTREACH AUTOMATION - RUN ALL');
    console.log('='.repeat(60));

    await this.runFacebookCold();
    await this.runEmailCampaign();
    await this.runWhatsAppWarm();
    await this.runReferralCampaign();
    await this.runReactivation();

    console.log('\n' + '='.repeat(60));
    console.log('📊 CAMPAIGN SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Total Messages Sent: ${this.stats.totalSent}`);
    console.log(`  Replies Received:    ${this.stats.totalReplied}`);
    console.log(`  Interested:          ${this.stats.totalInterested}`);
    console.log(`  Converted:           ${this.stats.totalConverted}`);
    console.log('='.repeat(60));

    this.stats.lastRun = new Date().toISOString();
    return this.stats;
  }

  // Show status
  async status() {
    try {
      const pipeline = await this.apiRequest('/api/crm/pipeline');
      console.log('\n📊 HOSTAMAR CRM STATUS');
      console.log('='.repeat(40));
      const s = pipeline.stats;
      console.log(`  New Leads:         ${s.new}`);
      console.log(`  Contacted:         ${s.contacted}`);
      console.log(`  Interested:        ${s.interested}`);
      console.log(`  Demo Scheduled:    ${s.demoScheduled}`);
      console.log(`  Converted:         ${s.converted}`);
      console.log(`  Paying Customers:  ${s.payingCustomers}`);
      console.log(`  Pending Payments:  ${s.pendingPayments}`);
      console.log(`  Total Revenue:     ৳${(s.totalRevenue?._sum?.amount || 0).toLocaleString()}`);
      console.log(`  Pending Follow-Ups:${s.pendingFollowUps} (${s.overdueFollowUps} overdue)`);
      console.log('='.repeat(40));
    } catch {
      console.log('⚠️  Could not reach API');
    }
  }
}

// CLI entry point
if (require.main === module) {
  const automation = new OutreachAutomation();
  const command = process.argv[2] || 'help';

  switch (command) {
    case 'run-all':
      automation.runAll();
      break;
    case 'run':
      const campaign = process.argv[3];
      switch (campaign) {
        case 'facebook':
          automation.runFacebookCold();
          break;
        case 'email':
          automation.runEmailCampaign();
          break;
        case 'whatsapp':
          automation.runWhatsAppWarm();
          break;
        case 'referral':
          automation.runReferralCampaign();
          break;
        case 'reactivation':
          automation.runReactivation();
          break;
        default:
          console.log('Usage: run [facebook|email|whatsapp|referral|reactivation]');
      }
      break;
    case 'status':
      automation.status();
      break;
    default:
      console.log('Usage:');
      console.log('  node scripts/outreach-automation.js run-all');
      console.log('  node scripts/outreach-automation.js run [facebook|email|whatsapp|referral|reactivation]');
      console.log('  node scripts/outreach-automation.js status');
  }
}

module.exports = OutreachAutomation;