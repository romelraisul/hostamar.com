export function normalizeEmail(email: string): string {
  if (!email) return ''
  return email
    .trim()
    .toLowerCase()
    .replace(/\.com\.com+$/, '.com')
    .replace(/\.com\.com\.com+$/, '.com')
    .replace(/\s+/g, '')
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}