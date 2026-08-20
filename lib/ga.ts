export function gaEvent(name: 'hero_cta_click' | 'pricing_click' | 'bkash_click', params?: Record<string, unknown>) {
  try { (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', name, params || {}) } catch {}
}
