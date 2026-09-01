/**
 * lib/tts.ts — Bangla reel scripts + captions (V25).
 * Static content: no API, no cost, always available.
 */

export function getBanglaScript(type: 'graphene' | 'custom', custom?: string): string {
  if (type === 'custom') return (custom || '').slice(0, 2000)
  return 'এক ডলার নাও, পাবে দশ কেজি ফেলে দেওয়া প্লাস্টিক। এটাকে বানাও পিওর কার্বন ফিডস্টক। তারপর ফ্ল্যাশ জুল হিটিং, একত্রিশশো কেলভিন তাপমাত্রায় চার সেকেন্ডের ঝটকা। দশ কেজি থেকে পাবে আড়াই কেজি গ্রাফিন, যার দাম একশো পঁচিশ থেকে বারোশো পঞ্চাশ ডলার।'
}

/** 4 slide captions — matched 3s each = 12s reel. */
export const REEL_CAPTIONS: string[] = [
  'এক ডলারে দশ কেজি প্লাস্টিক',
  'পিওর কার্বন ফিডস্টক বানাও',
  'ফ্ল্যাশ জুল হিটিং ৩১০০K',
  'আড়াই কেজি গ্রাফিন = $১২৫-১২৫০',
]
