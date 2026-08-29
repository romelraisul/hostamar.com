/**
 * Security module — ZERO COST guards.
 * - promptInjectionFilter: heuristic pre-filter (Lakera-Guard-style) before LLM calls
 * - hardeningHeaders: canonical header set (mirrors next.config.js)
 * - sanitizeUserInput: length + control-char clamp
 * Applicable surfaces: /api/v1/chat/completions, /api/support*, agents.
 */
import { securityAgent } from '@/lib/agents/orchestrator'

export function promptInjectionFilter(input: string): { blocked: boolean; reason?: string } {
  return securityAgent(input)
}

export function sanitizeUserInput(input: string, maxLen = 8000): string {
  return String(input || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .slice(0, maxLen)
}

export const hardeningHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

/** Secret-scan gate: refuses to emit text containing live-secret patterns. */
const SECRET_PATTERNS = [/postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+/g, /\bsk-ant-[A-Za-z0-9]{10,}/g, /\bvcp_[A-Za-z0-9]{10,}/g, /LITELLM_MASTER_KEY\s*=\s*\S+/g]
export function redactSecrets(text: string): string {
  let out = text
  for (const p of SECRET_PATTERNS) out = out.replace(p, '[REDACTED]')
  return out
}
export function containsSecret(text: string): boolean {
  return SECRET_PATTERNS.some(p => p.test(text))
}
