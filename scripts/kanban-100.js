/**
 * HOSTAMAR 100 CUSTOMER KANBAN TRACKER
 * 
 * Use this to track every lead and customer systematically.
 * Update statuses as you contact, convert, and retain.
 */

const KanbanBoard = {
  // Stage columns
  columns: {
    visitor:     { name: "🌐 Website Visitors",       max: 0, target: 5000, color: "#9CA3AF" },
    lead:        { name: "📋 Leads (New)",            max: 200, target: 200, color: "#3B82F6" },
    contacted:   { name: "📱 Contacted",              max: 150, target: 150, color: "#60A5FA" },
    interested:  { name: "🤔 Interested",             max: 100, target: 100, color: "#F59E0B" },
    demo:        { name: "📞 Demo Scheduled",         max: 50,  target: 50,  color: "#F97316" },
    converted:   { name: "✅ Converted",              max: 75,  target: 75,  color: "#10B981" },
    paying:      { name: "💰 Paying Customers",       max: 100, target: 100, color: "#8B5CF6" },
    churned:     { name: "😞 Churned",                max: 0, target: 0,   color: "#EF4444" },
    referral:    { name: "🔄 Referral Pipeline",      max: 50,  target: 50,  color: "#EC4899" },
  },

  /**
   * FILL IN - First 100 target customers by name and source
   * Copy to a Google Sheet for tracking
   */
  targets: [
    // === ROW 1-10: Friends & Family (WARM) ===
    { id: 1,  name: "____________", phone: "01XXX", email: "___@___.com", source: "friends", stage: "visitor" },
    { id: 2,  name: "____________", phone: "01XXX", email: "___@___.com", source: "friends", stage: "visitor" },
    { id: 3,  name: "____________", phone: "01XXX", email: "___@___.com", source: "family",  stage: "visitor" },
    { id: 4,  name: "____________", phone: "01XXX", email: "___@___.com", source: "friends", stage: "visitor" },
    { id: 5,  name: "____________", phone: "01XXX", email: "___@___.com", source: "family",  stage: "visitor" },
    { id: 6,  name: "____________", phone: "01XXX", email: "___@___.com", source: "friends", stage: "visitor" },
    { id: 7,  name: "____________", phone: "01XXX", email: "___@___.com", source: "family",  stage: "visitor" },
    { id: 8,  name: "____________", phone: "01XXX", email: "___@___.com", source: "friends", stage: "visitor" },
    { id: 9,  name: "____________", phone: "01XXX", email: "___@___.com", source: "friends", stage: "visitor" },
    { id: 10, name: "____________", phone: "01XXX", email: "___@___.com", source: "family",  stage: "visitor" },

    // === ROW 11-20: Facebook Group Posts ===
    { id: 11, name: "___ from FB", phone: null, email: null, source: "facebook_group", stage: "lead" },
    { id: 12, name: "___ from FB", phone: null, email: null, source: "facebook_group", stage: "lead" },
    { id: 13, name: "___ from FB", phone: null, email: null, source: "facebook_group", stage: "lead" },
    { id: 14, name: "___ from FB", phone: null, email: null, source: "facebook_group", stage: "lead" },
    { id: 15, name: "___ from FB", phone: null, email: null, source: "facebook_group", stage: "lead" },
    { id: 16, name: "___ from FB", phone: null, email: null, source: "facebook_group", stage: "lead" },
    { id: 17, name: "___ from FB", phone: null, email: null, source: "facebook_group", stage: "lead" },
    { id: 18, name: "___ from FB", phone: null, email: null, source: "facebook_group", stage: "lead" },
    { id: 19, name: "___ from FB", phone: null, email: null, source: "facebook_group", stage: "lead" },
    { id: 20, name: "___ from FB", phone: null, email: null, source: "facebook_group", stage: "lead" },

    // === ROW 21-30: YouTube Content ===
    { id: 21, name: "___ YT", phone: null, email: null, source: "youtube", stage: "lead" },
    { id: 22, name: "___ YT", phone: null, email: null, source: "youtube", stage: "lead" },
    { id: 23, name: "___ YT", phone: null, email: null, source: "youtube", stage: "lead" },
    { id: 24, name: "___ YT", phone: null, email: null, source: "youtube", stage: "lead" },
    { id: 25, name: "___ YT", phone: null, email: null, source: "youtube", stage: "lead" },
    { id: 26, name: "___ YT", phone: null, email: null, source: "youtube", stage: "lead" },
    { id: 27, name: "___ YT", phone: null, email: null, source: "youtube", stage: "lead" },
    { id: 28, name: "___ YT", phone: null, email: null, source: "youtube", stage: "lead" },
    { id: 29, name: "___ YT", phone: null, email: null, source: "youtube", stage: "lead" },
    { id: 30, name: "___ YT", phone: null, email: null, source: "youtube", stage: "lead" },

    // === ROW 31-40: B2B Email Outreach ===
    { id: 31, name: "______ [Agency]", phone: null, email: "___@___.com", source: "email_outreach", stage: "lead" },
    { id: 32, name: "______ [Agency]", phone: null, email: "___@___.com", source: "email_outreach", stage: "lead" },
    { id: 33, name: "______ [Studio]", phone: null, email: "___@___.com", source: "email_outreach", stage: "lead" },
    { id: 34, name: "______ [Ecomm]", phone: null, email: "___@___.com", source: "email_outreach", stage: "lead" },
    { id: 35, name: "______ [Brand]", phone: null, email: "___@___.com", source: "email_outreach", stage: "lead" },
    { id: 36, name: "______ [Agency]", phone: null, email: "___@___.com", source: "email_outreach", stage: "lead" },
    { id: 37, name: "______ [Studio]", phone: null, email: "___@___.com", source: "email_outreach", stage: "lead" },
    { id: 38, name: "______ [Freelancer]", phone: null, email: "___@___.com", source: "email_outreach", stage: "lead" },
    { id: 39, name: "______ [Influencer]", phone: null, email: "___@___.com", source: "email_outreach", stage: "lead" },
    { id: 40, name: "______ [Business]", phone: null, email: "___@___.com", source: "email_outreach", stage: "lead" },

    // === ROW 41-50: WhatsApp Cold Outreach ===
    { id: 41, name: "______ [Creator]", phone: "017XX-XXXXXX", email: null, source: "whatsapp", stage: "lead" },
    { id: 42, name: "______ [Creator]", phone: "017XX-XXXXXX", email: null, source: "whatsapp", stage: "lead" },
    { id: 43, name: "______ [Creator]", phone: "017XX-XXXXXX", email: null, source: "whatsapp", stage: "lead" },
    { id: 44, name: "______ [Creator]", phone: "017XX-XXXXXX", email: null, source: "whatsapp", stage: "lead" },
    { id: 45, name: "______ [Creator]", phone: "017XX-XXXXXX", email: null, source: "whatsapp", stage: "lead" },
    { id: 46, name: "______ [Creator]", phone: "017XX-XXXXXX", email: null, source: "whatsapp", stage: "lead" },
    { id: 47, name: "______ [Creator]", phone: "017XX-XXXXXX", email: null, source: "whatsapp", stage: "lead" },
    { id: 48, name: "______ [Creator]", phone: "017XX-XXXXXX", email: null, source: "whatsapp", stage: "lead" },
    { id: 49, name: "______ [Creator]", phone: "017XX-XXXXXX", email: null, source: "whatsapp", stage: "lead" },
    { id: 50, name: "______ [Creator]", phone: "017XX-XXXXXX", email: null, source: "whatsapp", stage: "lead" },

    // === ROW 51-60: LinkedIn Outreach ===
    { id: 51, name: "______ [BD Tech]", phone: null, email: "___@linkedin.com", source: "linkedin", stage: "lead" },
    { id: 52, name: "______ [BD Tech]", phone: null, email: "___@linkedin.com", source: "linkedin", stage: "lead" },
    { id: 53, name: "______ [BD Tech]", phone: null, email: "___@linkedin.com", source: "linkedin", stage: "lead" },
    { id: 54, name: "______ [BD Tech]", phone: null, email: "___@linkedin.com", source: "linkedin", stage: "lead" },
    { id: 55, name: "______ [BD Tech]", phone: null, email: "___@linkedin.com", source: "linkedin", stage: "lead" },
    { id: 56, name: "______ [BD Tech]", phone: null, email: "___@linkedin.com", source: "linkedin", stage: "lead" },
    { id: 57, name: "______ [BD Tech]", phone: null, email: "___@linkedin.com", source: "linkedin", stage: "lead" },
    { id: 58, name: "______ [BD Tech]", phone: null, email: "___@linkedin.com", source: "linkedin", stage: "lead" },
    { id: 59, name: "______ [BD Tech]", phone: null, email: "___@linkedin.com", source: "linkedin", stage: "lead" },
    { id: 60, name: "______ [BD Tech]", phone: null, email: "___@linkedin.com", source: "linkedin", stage: "lead" },

    // === ROW 61-70: Referral Pipeline ===
    { id: 61, name: "Ref by #01", phone: null, email: null, source: "referral", stage: "lead" },
    { id: 62, name: "Ref by #02", phone: null, email: null, source: "referral", stage: "lead" },
    { id: 63, name: "Ref by #03", phone: null, email: null, source: "referral", stage: "lead" },
    { id: 64, name: "Ref by #04", phone: null, email: null, source: "referral", stage: "lead" },
    { id: 65, name: "Ref by #05", phone: null, email: null, source: "referral", stage: "lead" },
    { id: 66, name: "Ref by #06", phone: null, email: null, source: "referral", stage: "lead" },
    { id: 67, name: "Ref by #07", phone: null, email: null, source: "referral", stage: "lead" },
    { id: 68, name: "Ref by #08", phone: null, email: null, source: "referral", stage: "lead" },
    { id: 69, name: "Ref by #09", phone: null, email: null, source: "referral", stage: "lead" },
    { id: 70, name: "Ref by #10", phone: null, email: null, source: "referral", stage: "lead" },

    // === ROW 71-80: Facebook Ad Leads ===
    { id: 71, name: "Ad Lead", phone: "017XX-XXXXXX", email: null, source: "paid_ads", stage: "lead" },
    { id: 72, name: "Ad Lead", phone: "017XX-XXXXXX", email: null, source: "paid_ads", stage: "lead" },
    { id: 73, name: "Ad Lead", phone: "017XX-XXXXXX", email: null, source: "paid_ads", stage: "lead" },
    { id: 74, name: "Ad Lead", phone: "017XX-XXXXXX", email: null, source: "paid_ads", stage: "lead" },
    { id: 75, name: "Ad Lead", phone: "017XX-XXXXXX", email: null, source: "paid_ads", stage: "lead" },
    { id: 76, name: "Ad Lead", phone: "017XX-XXXXXX", email: null, source: "paid_ads", stage: "lead" },
    { id: 77, name: "Ad Lead", phone: "017XX-XXXXXX", email: null, source: "paid_ads", stage: "lead" },
    { id: 78, name: "Ad Lead", phone: "017XX-XXXXXX", email: null, source: "paid_ads", stage: "lead" },
    { id: 79, name: "Ad Lead", phone: "017XX-XXXXXX", email: null, source: "paid_ads", stage: "lead" },
    { id: 80, name: "Ad Lead", phone: "017XX-XXXXXX", email: null, source: "paid_ads", stage: "lead" },

    // === ROW 81-90: Organic SEO / Content ===
    { id: 81, name: "Organic Lead", email: "___@___.com", source: "organic", stage: "lead" },
    { id: 82, name: "Organic Lead", email: "___@___.com", source: "organic", stage: "lead" },
    { id: 83, name: "Organic Lead", email: "___@___.com", source: "organic", stage: "lead" },
    { id: 84, name: "Organic Lead", email: "___@___.com", source: "organic", stage: "lead" },
    { id: 85, name: "Organic Lead", email: "___@___.com", source: "organic", stage: "lead" },
    { id: 86, name: "Organic Lead", email: "___@___.com", source: "organic", stage: "lead" },
    { id: 87, name: "Organic Lead", email: "___@___.com", source: "organic", stage: "lead" },
    { id: 88, name: "Organic Lead", email: "___@___.com", source: "organic", stage: "lead" },
    { id: 89, name: "Organic Lead", email: "___@___.com", source: "organic", stage: "lead" },
    { id: 90, name: "Organic Lead", email: "___@___.com", source: "organic", stage: "lead" },

    // === ROW 91-100: Mix (WhatsApp Groups, Events, etc.) ===
    { id: 91, name: "______ [WA Group]", phone: "017XX-XXXXXX", email: null, source: "whatsapp_group", stage: "lead" },
    { id: 92, name: "______ [WA Group]", phone: "017XX-XXXXXX", email: null, source: "whatsapp_group", stage: "lead" },
    { id: 93, name: "______ [WA Group]", phone: "017XX-XXXXXX", email: null, source: "whatsapp_group", stage: "lead" },
    { id: 94, name: "______ [Event]", phone: null, email: "___@___.com", source: "event", stage: "lead" },
    { id: 95, name: "______ [Event]", phone: null, email: "___@___.com", source: "event", stage: "lead" },
    { id: 96, name: "______ [Partner]", phone: "017XX-XXXXXX", email: null, source: "partnership", stage: "lead" },
    { id: 97, name: "______ [Partner]", phone: "017XX-XXXXXX", email: null, source: "partnership", stage: "lead" },
    { id: 98, name: "______ [Webinar]", email: "___@___.com", source: "webinar", stage: "lead" },
    { id: 99, name: "______ [Webinar]", email: "___@___.com", source: "webinar", stage: "lead" },
    { id: 100, name: "______ [Bonus]", phone: null, email: null, source: "referral", stage: "lead" },
  ],

  // Revenue plan to reach 100 paying customers
  revenuePlan: {
    month1: { paid: 5, avgARPU: 2000, revenue: 10000, note: "₹5K = friends/family seed" },
    month2: { paid: 15, avgARPU: 2500, revenue: 37500, note: "₹37.5K = FB ads + content" },
    month3: { paid: 35, avgARPU: 2800, revenue: 98000, note: "₹98K = scaling phase" },
    month4: { paid: 100, avgARPU: 3000, revenue: 300000, note: "₹3L = target MRR" },
  },

  printSummary: function() {
    console.log("\n" + "=".repeat(60));
    console.log("🎯 HOSTAMAR 100 CUSTOMER KANBAN");
    console.log("=".repeat(60));
    console.log("\nColumns & Targets:");
    for (const [key, col] of Object.entries(this.columns)) {
      console.log(`  ${col.name.padEnd(28)} Target: ${col.target}`);
    }
    console.log("\nTotal targets defined:", this.targets.length);
    console.log("\nRevenue Projection (4-month):");
    for (const [month, data] of Object.entries(this.revenuePlan)) {
      console.log(`  ${month}: ${data.paid} paid × ৳${data.avgARPU} = ৳${data.revenue.toLocaleString()} (${data.note})`);
    }
    console.log("\n" + "=".repeat(60));
  },
};

if (require.main === module) {
  KanbanBoard.printSummary();
}

module.exports = { KanbanBoard };