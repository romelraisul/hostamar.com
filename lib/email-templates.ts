// ============================================================================
// Email & Notification Templates for Hostamar
// Bangladesh-focused email marketing system
// ============================================================================

export const EmailTemplates = {
  // Welcome email after registration
  welcome: {
    subject: 'হোস্টামার-এ স্বাগতম! 🎉 আপনার ফ্রি ট্রায়াল শুরু হয়েছে',
    body: `
      <div style="font-family: 'Noto Sans Bengali', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎬 Hostamar</h1>
          <p style="color: #d4e5ff; margin: 8px 0 0;">AI ভিডিও জেনারেশন প্ল্যাটফর্ম</p>
        </div>
        <div style="padding: 24px; background: #f8fafc;">
          <p style="font-size: 16px; color: #334155;">নমস্কার <strong>{{name}}</strong>!</p>
          <p>আপনি সফলভাবে হোস্টামারে রেজিস্টার করেছেন। আপনার ৭ দিনের ফ্রি ট্রায়াল এখন সক্রিয়!</p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1e293b; margin-top: 0;">🎁 আপনার ফ্রি ট্রাইলার কী পাবেন?</h3>
            <ul style="color: #475569;">
              <li>✅ ৫টি ফ্রি AI ভিডিও</li>
              <li>✅ ৭২০p কোয়ালিটি</li>
              <li>✅ ৩টি টেমপ্লেট ব্যবহার</li>
              <li>✅ বাংলা টেক্সট সাপোর্ট</li>
            </ul>
          </div>

          <a href="{{site_url}}/generate" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            ভিডিও তৈরি শুরু করুন →
          </a>

          <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
            কোনো সাহায্য দরকার? আমাদের সাপোর্ট দলে যোগাযোগ করুন:<br>
            📧 {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@hostamar.com'}<br>
            📱 ফেসবুক গ্রুপ: Hostamar Community
          </p>
        </div>
        <div style="background: #1e293b; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #94a3b8; margin: 0;">© 2026 Hostamar.com — বাংলাদেশের প্রথম AI ভিডিও প্ল্যাটফর্ম</p>
        </div>
      </div>
    `
  },

  // Payment confirmation email
  paymentConfirmed: {
    subject: '💳 পেমেন্ট সফলভাবে সম্পন্ন হয়েছে! — Hostamar',
    body: `
      <div style="font-family: 'Noto Sans Bengali', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">✅ পেমেন্ট সফল!</h1>
          <p style="color: #d1fae5; margin: 8px 0 0;">আপনার অর্ডার কনফার্ম হয়েছে</p>
        </div>
        <div style="padding: 24px; background: #f8fafc;">
          <p>নমস্কার <strong>{{name}}</strong>,</p>
          <p>আপনার পেমেন্ট সফলভাবে প্রাপ্ত হয়েছে। নিচের বিবরণ দেখুন:</p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">অর্ডার আইডি:</td><td><strong>{{orderId}}</strong></td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">পেমেন্ট পদ্ধতি:</td><td>{{paymentMethod}}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">পরিমাণ:</td><td><strong>৳{{amount}}</strong></td></tr>
              <tr><td style="padding: 8px 0;">তারিখ:</td><td>{{date}}</td></tr>
            </table>
          </div>

          <a href="{{site_url}}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ড্যাশবোর্ড দেখুন →
          </a>
        </div>
      </div>
    `
  },

  // Subscription renewal reminder
  renewalReminder: {
    subject: '⏰ আপনার সাবস্ক্রিপশন শীঘ্রই expire হবে!',
    body: `
      <div style="font-family: 'Noto Sans Bengali', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">⏰ সাবস্ক্রিপশন স্মারক</h1>
          <p style="color: #fef3c7; margin: 8px 0 0;">আপনার পরিকল্পিত {{plan}} সাবস্ক্রিপশন {{daysLeft}} দিনে expire হবে</p>
        </div>
        <div style="padding: 24px; background: #f8fafc;">
          <p>নমস্কার <strong>{{name}}</strong>,</p>
          <p>আপনার <strong>{{plan}}</strong> সাবস্ক্রিপশন {{daysLeft}} দিন পর {{expiryDate}} তারিখে expire হয়ে যাবে। সুবিধাগুলো বজায় রাখতে এখনই রニュー করুন!</p>
          
          <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #92400e; font-weight: bold;">🔒 র뉴য়েল বিল্ডিং ডিসকাউন্ট: {{discount}}%</p>
          </div>

          <a href="{{site_url}}/payment" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            এখনই রিউন করুন →
          </a>
        </div>
      </div>
    `
  },

  // Referral notification
  referralBonus: {
    subject: '🎉 অভিনন্দন! আপনার রেফারেল সফল হয়েছে!',
    body: `
      <div style="font-family: 'Noto Sans Bengali', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">🎉 CONGRATULATIONS!</h1>
          <p style="color: #ddd6fe; margin: 8px 0 0;">আপনার রেফারেল বোনাস পাওয়া গেছে!</p>
        </div>
        <div style="padding: 24px; background: #f8fafc;">
          <p><strong>{{referrerName}}</strong>, আপনার রেফার {{referredName}} কে সফলভাবে আমন্ত্রণ জানিয়েছেন।</p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #7c3aed; margin: 0;">৳{{bonusAmount}}</p>
            <p style="color: #64748b; margin: 4px 0 0;">বোনাস যোগ করা হয়েছে আপনার অ্যাকাউন্টে</p>
          </div>
          
          <p style="text-align: center; font-size: 14px; color: #64748b;">
            আরও বন্ধুদের আমন্ত্রণ জানান এবং আরও উপার্জন করুন!
          </p>
          <p style="text-align: center; margin-top: 20px;">
            <a href="{{site_url}}/refer" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              আরও রেফার করুন →
            </a>
          </p>
        </div>
      </div>
    `
  },

  // Video delivery notification
  videoReady: {
    subject: '🎬 আপনার ভিডিও প্রস্তুত! — Hostamar',
    body: `
      <div style="font-family: 'Noto Sans Bengali', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ec4899, #db2777); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">🎬 ভিডিও প্রস্তুত!</h1>
          <p style="color: #f9a8d4; margin: 8px 0 0;">আপনার AI-তৈরি ভিডিও ডাউনলোড করতে প্রস্তুত</p>
        </div>
        <div style="padding: 24px; background: #f8fafc;">
          <p>নমস্কার <strong>{{name}}</strong>,</p>
          <p>আপনার "<strong>{{videoTitle}}</strong>" শিরোনামের ভিডিও সফলভাবে তৈরি হয়েছে!</p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 12px;">🎥</div>
            <p style="font-size: 18px; font-weight: bold; color: #1e293b;">{{videoTitle}}</p>
            <p style="color: #64748b; margin-top: 4px;">কোয়ালিটি: {{quality}} | দৈর্ঘ্য: {{duration}}s</p>
          </div>

          <a href="{{site_url}}/videos/{{videoId}}" style="display: inline-block; background: #ec4899; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-right: 10px;">
            ভিডিও দেখুন →
          </a>
          <a href="{{videoUrl}}" style="display: inline-block; background: #1e293b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ডাউনলোড করুন ↓
          </a>
        </div>
      </div>
    `
  },

  // Weekly digest / marketing email
  weeklyDigest: {
    subject: `📰 এই সপ্তাহের হোস্টামার হাইলাইট — নতুন ফিচার ও অফার!`,
    body: `
      <div style="font-family: 'Noto Sans Bengali', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">📰 Weekly Digest</h1>
          <p style="color: #bae6fd; margin: 8px 0 0;">হোস্টামার থেকে সপ্তাহের আপডেট</p>
        </div>
        <div style="padding: 24px; background: #f8fafc;">
          <p>নমস্কার <strong>{{name}}</strong>,</p>
          <p>এই সপ্তাহে যা নতুন হয়েছে:</p>
          
          <div style="margin: 20px 0;">
            <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #3b82f6;">
              <h4 style="margin: 0 0 4px; color: #1e293b;">🚀 নতুন: ৪K ভিডিও সাপোর্ট</h4>
              <p style="margin: 0; color: #64748b; font-size: 14px;">এখন প্রো ও বিজনেস প্যাকেজে ৪K কোয়ালিটিতে ভিডিও তৈরি করুন!</p>
            </div>
            <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #8b5cf6;">
              <h4 style="margin: 0 0 4px; color: #1e293b;">🆕 নতুন টেমপ্লেট: Product Launch</h4>
              <p style="margin: 0; color: #64748b; font-size: 14px;">প্রোডাক্ট লঞ্চারের জন্য বিশেষ টেমপ্লেট যোগ করা হয়েছে।</p>
            </div>
            <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #f59e0b;">
              <h4 style="margin: 0 0 4px; color: #1e293b;">🎁 অফার: স্টার্টার প্যাকেজে ২০% ডিসকাউন্ট</h4>
              <p style="margin: 0; color: #64748b; font-size: 14px;">সীমিত সময়ের জন্য স্টার্টার প্যাকেজে বিশেষ ছাড় পান!</p>
            </div>
          </div>

          <a href="{{site_url}}" style="display: inline-block; background: #0ea5e9; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            হোস্টামারে যান →
          </a>
        </div>
      </div>
    `
  }
}

// Notification system for in-app notifications
export const NotificationService = {
  createNotification: async (userId, type, data) => {
    // This would integrate with your database
    return {
      userId,
      type,
      title: data.title || '',
      message: data.message || '',
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: data.actionUrl || ''
    }
  },

  // Send push notification via service worker
  sendPushNotification: async (subscription, payload) => {
    const webpush = await import('web-push')
    return webpush.sendNotification(subscription, JSON.stringify(payload))
  }
}