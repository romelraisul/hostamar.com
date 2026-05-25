/**
 * HOSTAMAR 100 CUSTOMER EXECUTION PLAN
 * Daily automation + manual action checklist
 * 
 * Run this file to generate daily action plan
 */

const EXECUTION_PLAN = {
  title: "Hostamar 100 Paid Customer Sprint",
  startDate: new Date().toISOString().split('T')[0],
  targetDate: "2026-06-12", // 4 weeks from now
  goal: 100,
  current: 0, // Update daily
  
  phases: [
    {
      name: "Foundation (Days 1-3)",
      goal: "Get first 5 paying customers",
      actions: [
        "Set up CRM database (COMPLETE)",
        "Create 20 warm outreach leads (friends, family, ex-colleagues)",
        "Send WhatsApp messages with 50% discount code",
        "Process first payments manually",
        "Get 3 testimonials",
      ]
    },
    {
      name: "Early Traction (Days 4-10)", 
      goal: "Reach 25 paying customers",
      actions: [
        "Launch Facebook ads (৳500/day budget)",
        "Join 20 Facebook groups, post daily",
        "Send 100 WhatsApp cold messages",
        "Post 5 YouTube videos",
        "Launch referral program",
      ]
    },
    {
      name: "Growth (Days 11-21)",
      goal: "Reach 50 paying customers",
      actions: [
        "Scale Facebook ads (৳1000/day)",
        "Partner with 10 influencers",
        "Launch content marketing",
        "Add crypto auto-verification",
        "Hire part-time sales person",
      ]
    },
    {
      name: "Scale (Days 22-28)",
      goal: "Reach 100 paying customers",
      actions: [
        "Double ad spend",
        "Corporate outreach (50 agencies)",
        "Public speaking at tech events",
        "Press release to Bangladesh media",
        "Launch affiliate program",
      ]
    },
  ],

  dailyActions: {
    urgent: [
      "Contact 10 overdue follow-ups first",
      "Send 20 new WhatsApp messages",
      "Process pending payments",
      "Update CRM status",
    ],
    important: [
      "Post in 3 Facebook groups",
      "Create 1 educational video",
      "Send 5 B2B emails",
      "Follow up with yesterday's leads",
    ],
    growth: [
      "Add 5 new leads to CRM",
      "Test new outreach message",
      "Improve landing page",
      "Request testimonials",
    ]
  },

  messagingTemplates: {
    whatsapp: {
      cold: `Hi {name}! 🙌

I'm Romel from Hostamar.com — we help Bangladeshi creators make professional videos using AI.

🎬 5 AI videos/month for FREE
🎯 50+ ready templates  
💰 Pay with bKash/Nagad/Crypto

Want to try? Reply "YES" → I'll send access! 🎥

Romel | 01822417463`,
      
      followUp: `Hi {name}! 👋

Following up on my message about Hostamar.

We've helped {count}+ creators make videos faster.

If you're still interested, reply "DEMO" for quick walkthrough.

Otherwise, just say "STOP" and I'll remove you. 😊`,
      
      price: `💰 Our Plans:

🥉 Starter: ৳2,000/month
   - 10 AI videos/month
   - 5GB storage
   
🥈 Pro: ৳3,500/month  
   - 30 AI videos/month
   - 20GB storage
   - Priority support

Pay via: bKash/Nagad/Crypto (USDT)

Which interests you?`
    },
    
    email: {
      b2b: `Subject: Create 10x more video content in less time 🎬

Hi {name},

I noticed {company} creates great video content.

I built Hostamar.com — AI video platform that creates videos 10x faster for Bangladeshi businesses.

**Results from beta users:**
- 300% more video output
- 90% time saved
- Pay with bKash/Crypto

Would you be open to 15-min demo? I'll give you free access.

Best,
Romel
01822417463
hostamar.com`
    }
  }
};

// Export for other scripts
module.exports = { EXECUTION_PLAN };