/**
 * HOSTAMAR OUTREACH CAMPAIGN MANAGER
 * Manages all outbound campaigns (WhatsApp, Email, Facebook, LinkedIn)
 */

const CAMPAIGNS = {
  // === CAMPAIGN 1: Cold Outreach to Facebook Groups ===
  facebook_group_cold: {
    name: "Facebook Group Cold Outreach",
    channel: "whatsapp",
    target: 50, // contacts per week
    message: `Hi {name}! 👋

I'm Romel from Hostamar.com — AI video generation for Bangladeshi creators.

🎬 Create professional videos in minutes
🎯 50+ templates for YouTube, Facebook, TikTok
💰 Pay with bKash/Nagad/Crypto (USDT)

🎉 Beta users get 50% OFF forever!

Want to try? Reply "YES" and I'll send you access! 🎥

Romel | 01822417463 | hostamar.com`,
    followUpDelay: 48, // hours
    followUpMessage: `Hi {name}! 👋

Just following up on my message about Hostamar.

We've helped {count}+ Bangladeshi creators make videos faster. 

Still interested? Reply "DEMO" for a quick walkthrough! 😊`,
  },

  // === CAMPAIGN 2: B2B Email Outreach ===
  b2b_email: {
    name: "B2B Email Outreach",
    channel: "email",
    target: 30, // emails per week
    subject: "Create 10x more video content in less time 🎬",
    message: `Hi {name},

I noticed {company} creates great video content.

I built Hostamar.com — an AI video platform that 
creates videos 10x faster for Bangladeshi businesses.

Here's what you get:
🎯 50+ professional templates
🎬 AI-powered script writing
📹 Automatic video generation
💰 Pay with bKash/Nagad/Crypto

Our beta users increased their video output by 300%.

Would you be open to a 15-min demo? I'll give you 
a free trial.

Best,
Romel Raisul
Founder, Hostamar
📱 01822417463
🌐 hostamar.com`,
    followUpDelay: 72,
    followUpSubject: "Re: Create 10x more video content...",
    followUpMessage: `Hi {name},

Just wanted to follow up on my email about Hostamar.

Did you get a chance to check it out? I'd love to
show you how it works in a quick 5-minute demo.

Are you available this week? Just reply with a 
time that works! 😊

Best,
Romel`,
  },

  // === CAMPAIGN 3: WhatsApp Warm Outreach ===
  whatsapp_warm: {
    name: "WhatsApp Warm Contacts",
    channel: "whatsapp",
    target: 30, // messages per week
    message: `Hi {name}! 😊

Long time! I wanted to share something exciting with you.

I just launched Hostamar — an AI tool that creates 
professional videos in minutes!

🎬 10 FREE videos/month
🎯 Perfect for YouTubers, Facebook creators, businesses
💰 Plans start at just ৳2,000/month

Want to check it out? I'll send you a link! 🎥

Romel | hostamar.com`,
    followUpDelay: 36,
    followUpMessage: `Hi {name}! 👋

Quick follow-up — did you get a chance to try Hostamar?

If you're a content creator, this could save you hours 
of editing time every week.

Reply "YES" and I'll get you set up with free access! 😊`,
  },

  // === CAMPAIGN 4: Referral Program ===
  referral_blast: {
    name: "Referral Outreach",
    channel: "whatsapp",
    target: 20, // referral requests per week
    message: `Hi {name}! 😊

Hope you're enjoying Hostamar!

Quick question — do you know anyone who could benefit 
from AI video generation? Maybe a fellow creator or 
someone in your network?

If you refer them:
🏆 You get 1 FREE month added
🎉 They get 20% OFF their first month

Share your link: {referral_link}

Thank you being a valued customer! 🙏

Hostamar Team`,
  },

  // === CAMPAIGN 5: Reactivation ===
  reactivation: {
    name: "Churned User Reactivation",
    channel: "whatsapp",
    target: 10, // reactivation attempts per week
    message: `Hi {name},

We noticed you haven't been active on Hostamar recently.

We've been working hard on new features:
✨ 15 new templates added
✨ Faster AI video generation
✨ Improved Bangla text support
✨ New pricing starting at ৳1,500/month

Come back and give it another try — your account 
is still active! 🎬

Login here: {login_link}

Questions? Just reply to this message! 😊`,
  },
};

// Generate actionable task list from campaigns
function generateTasks(campaigns) {
  const tasks = [];
  const now = new Date();
  const dayOfWeek = now.getDay();

  for (const [id, campaign] of Object.entries(campaigns)) {
    // Skip reactivation on weekends
    if (id === 'reactivation' && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
    // Referral blast only on weekdays
    if (id === 'referral_blast' && dayOfWeek > 5) continue;
    
    tasks.push({
      id,
      name: campaign.name,
      channel: campaign.channel,
      target: campaign.target,
      priority: id.includes('b2b') ? 'HIGH' : 'MEDIUM',
      timeOfDay: id.includes('email') ? 'morning (9-11 AM)' : 'anytime',
    });
  }

  return tasks;
}

if (require.main === module) {
  const tasks = generateTasks(CAMPAIGNS);
  console.log('\n📋 WEEKLY OUTREACH TASKS');
  console.log('='.repeat(50));
  tasks.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.priority}] ${t.name}`);
    console.log(`     Channel: ${t.channel} | Target: ${t.target}/week | Best: ${t.timeOfDay}`);
  });
  console.log('');
}

module.exports = { CAMPAIGNS, generateTasks };