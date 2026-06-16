// Single source of truth for promo / discount codes.
// Imported by: app/api/dashboard/payment/upgrade/route.ts (applyPromo)
// and by client checkout components that need to validate in real time.

export interface PromoCode {
  code: string
  percent: number
  lifetime: boolean
  label: string
  description?: string
}

export const PROMO_CODES: Record<string, PromoCode> = {
  EARLY50: {
    code: 'EARLY50',
    percent: 50,
    lifetime: true,
    label: 'Early Adopter 50%',
    description: 'প্রথম ১০০ জন সাবস্ক্রাইবারের জন্য লাইফটাইম ৫০% ডিসকাউন্ট',
  },
  ROMEL50: {
    code: 'ROMEL50',
    percent: 50,
    lifetime: true,
    label: 'WhatsApp 50%',
    description: 'WhatsApp broadcast signup-এ যারা এসেছেন তাদের জন্য',
  },
  LAUNCH25: {
    code: 'LAUNCH25',
    percent: 25,
    lifetime: false,
    label: 'Launch 25%',
    description: 'লঞ্চ অফার — প্রথম মাসের জন্য',
  },
}

export function validatePromo(code: string | undefined | null): PromoCode | null {
  if (!code) return null
  return PROMO_CODES[code.trim().toUpperCase()] ?? null
}

export function discountPrice(originalPrice: number, promo: PromoCode | null): number {
  if (!promo) return originalPrice
  return Math.round(originalPrice * (100 - promo.percent) / 100)
}
