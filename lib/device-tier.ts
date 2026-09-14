// lib/device-tier.ts — V36.33: pick the right brain for the user's device.
// Tier 3 (old mobile/PC) -> cloud hostamar-lite (qwen3.5:2b, think:false).
// Tier 1-2 -> progressively more local inference.

export type DeviceTier = {
  tier: 1 | 2 | 3;
  label: string;
  labelBn: string;
  ramGB: number;
  cores: number;
  webgpu: boolean;
  brain: 'hostamar-lite' | 'hostamar-own-fast' | 'hostamar-own';
  recommendation: string;
  recommendationBn: string;
};

export function getDeviceTier(): DeviceTier {
  const nav: any = typeof navigator !== 'undefined' ? navigator : {};
  const ramGB = Number(nav.deviceMemory) || 4; // Chrome-only API; default = mid
  const cores = Number(nav.hardwareConcurrency) || 4;
  const webgpu = typeof (nav as any).gpu !== 'undefined';

  if (ramGB <= 2 || (!webgpu && ramGB <= 3)) {
    return {
      tier: 3, label: 'Old device — cloud brain', labelBn: 'পুরনো ডিভাইস — ক্লাউড ব্রেইন',
      ramGB, cores, webgpu, brain: 'hostamar-lite',
      recommendation: 'Cloud-only mode (~5MB app). All AI runs on hostamar-lite.',
      recommendationBn: 'শুধু ক্লাউড মোড (~৫MB অ্যাপ)। সব AI hostamar-lite-এ চলবে।',
    };
  }
  if (ramGB >= 6 && webgpu) {
    return {
      tier: 1, label: 'New device — full local', labelBn: 'নতুন ডিভাইস — ফুল লোকাল',
      ramGB, cores, webgpu, brain: 'hostamar-own',
      recommendation: 'Local-first. Heavy jobs route to the 115GB main brain.',
      recommendationBn: 'লোকাল-ফার্স্ট। ভারী কাজ ১১৫GB মেইন ব্রেইনে যাবে।',
    };
  }
  return {
    tier: 2, label: 'Mid device — hybrid', labelBn: 'মাঝারি ডিভাইস — হাইব্রিড',
    ramGB, cores, webgpu, brain: 'hostamar-own-fast',
    recommendation: 'Hybrid. Fast local drafts, cloud for heavy reasoning.',
    recommendationBn: 'হাইব্রিড। দ্রুত লোকাল ড্রাফট, ভারী রিজনিং ক্লাউডে।',
  };
}
