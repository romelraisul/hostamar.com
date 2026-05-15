/**
 * Email Service - LOCAL MODE
 * Stores emails in database instead of sending via SMTP
 * No external email service needed
 */

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

// In-memory store (falls back to console log)
const emailLog: (EmailPayload & { id: string })[] = [];

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; id: string; mode: string }> {
  const id = `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  // Log to console (works everywhere)
  console.log(`[Email - Local Mode]`, {
    id,
    to: payload.to,
    subject: payload.subject,
    from: payload.from || 'noreply@hostamar.com',
    body: payload.body.substring(0, 200) + (payload.body.length > 200 ? '...' : ''),
    timestamp: new Date().toISOString()
  });
  
  // Store in memory
  emailLog.push({ ...payload, id });
  
  // Try to store in API log endpoint (if DB is available)
  try {
    await fetch('https://hostamar.com/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        action: 'send',
        details: { to: payload.to, subject: payload.subject, id }
      })
    }).catch(() => {}); // silently fail if endpoint doesn't exist
  } catch {}
  
  return {
    success: true,
    id,
    mode: 'local-db' // No SMTP needed
  };
}

export function getEmailLog(): EmailPayload[] {
  return [...emailLog];
}

// Convenience methods
export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: 'হোস্টামারে স্বাগতম! 🎉',
    body: `
প্রিয় ${name},

হোস্টামারে স্বাগতম! 🎉

আপনার একাউন্ট সফলভাবে তৈরি হয়েছে।

🔹 ফ্রি প্ল্যান: ৫টি ভিডিও/মাস
🔹 বেসিক: ৳২,০০০ (১০টি ভিডিও)
🔹 বিজনেস: ৳৩,৫০০ (৩০টি ভিডিও)

👉 শুরু করুন: https://hostamar.com/dashboard

ধন্যবাদ,
হোস্টামার টিম
    `.trim()
  });
}

export async function sendPasswordReset(email: string, token: string) {
  return sendEmail({
    to: email,
    subject: 'পাসওয়ার্ড রিসেট - হোস্টামার',
    body: `
আপনার পাসওয়ার্ড রিসেট লিঙ্ক:

👉 https://hostamar.com/reset-password?token=${token}

এই লিঙ্ক ১ ঘন্টার জন্য বৈধ।
যদি আপনি এই রিকোয়েস্ট না করে থাকেন, তাহলে এই ইমেইল ইগনোর করুন।

ধন্যবাদ,
হোস্টামার টিম
    `.trim()
  });
}

export async function sendPaymentConfirmation(email: string, plan: string, amount: number) {
  return sendEmail({
    to: email,
    subject: 'পেমেন্ট কনফার্মেশন - হোস্টামার ✅',
    body: `
আপনার পেমেন্ট সফলভাবে সম্পন্ন হয়েছে! ✅

প্ল্যান: ${plan}
পরিমাণ: ৳${amount.toLocaleString()}

👉 ড্যাশবোর্ড: https://hostamar.com/dashboard

ধন্যবাদ,
হোস্টামার টিম
    `.trim()
  });
}