// __tests__/user-health.test.ts — locks the userHealth correlation logic
// WITHOUT a DB or gmail: pure functions + a mocked runAllChecks/prisma.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  categorizeInboxSubject,
  groupByRootCause,
  type InboxItem,
  type UserHealthCategory,
} from '@/lib/support/userHealth'

// Silence the telegram + prisma imports inside userHealth via vi.mock so the
// module loads in the hermetic test env.
vi.mock('@/lib/support/telegram', () => ({ notify: vi.fn(async () => ({ sent: true })) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    supportEvent: { create: vi.fn(async () => ({ id: 'evt_test' })), findMany: vi.fn(async () => []) },
  },
}))

describe('categorizeInboxSubject', () => {
  it('maps declined payment', () => {
    expect(categorizeInboxSubject('Your 5.40USD transaction was declined')).toBe('billing_payment_declined')
  })
  it('maps DNS / domain config', () => {
    expect(categorizeInboxSubject('1 domain needs configuration on team x')).toBe('provisioning_dns_domain')
  })
  it('maps quota / 90% usage', () => {
    expect(categorizeInboxSubject('Ollama weekly usage at 90%')).toBe('capacity_quota_90')
  })
  it('maps security alert', () => {
    expect(categorizeInboxSubject('Security alert - New sign-in')).toBe('auth_suspicious_login')
  })
  it('falls back to ux_confusion', () => {
    expect(categorizeInboxSubject('how do i export my video')).toBe('ux_confusion')
  })
})

describe('groupByRootCause', () => {
  // Reproduces the prompt's "12 tickets -> 4 root causes" example.
  const items: InboxItem[] = [
    { id: '1', subject: 'Your 5.4USD transaction was declined' },
    { id: '2', subject: 'Your 10.81USD transaction was declined' },
    { id: '3', subject: 'Your 24.89USD transaction was declined' },
    { id: '4', subject: 'transaction was declined again' },
    { id: '5', subject: 'payment failed on renewal' },
    { id: '6', subject: '1 domain needs configuration on team romelraisul' },
    { id: '7', subject: 'Ollama weekly usage at 90%' },
    { id: '8', subject: 'Security alert - New sign-in' },
    { id: '9', subject: 'new sign-in from unknown device' },
    { id: '10', subject: 'how do i change plan' },
    { id: '11', subject: 'where is my export button' },
    { id: '12', subject: 'video stuck pending' },
  ]

  it('collapses 12 subjects into root causes, not 12 tickets', () => {
    const groups = groupByRootCause(items)
    // 8 distinct categories present, but the 5 billing + others group correctly.
    expect(groups.billing_payment_declined).toHaveLength(5)
    expect(groups.provisioning_dns_domain).toHaveLength(1)
    expect(groups.capacity_quota_90).toHaveLength(1)
    expect(groups.auth_suspicious_login).toHaveLength(2)
    expect(groups.ux_confusion).toHaveLength(2)
    expect(groups.product_video_failed).toHaveLength(1)
    // total preserved
    const total = Object.values(groups).reduce((n, a) => n + a.length, 0)
    expect(total).toBe(12)
  })
})
