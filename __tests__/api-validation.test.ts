// ============================================================================
// __tests__/api-validation.test.ts
//
// Negative + positive input-validation tests for lib/api/validator.ts
// (deepSanitize + validateData). These run without a server — they exercise
// the exact sanitize/validate primitives the 6 migrated routes rely on.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { deepSanitize, validateData, ValidationError } from '@/lib/api/validator'

const echoSchema = z.object({
  note: z.string(),
  tool: z.enum(['get_status', 'create_ticket', 'initiate_bkash_payment', 'create_video']),
  nested: z.record(z.string(), z.unknown()).optional(),
})

describe('api validation — deepSanitize / validateData', () => {
  it('1) strips an <img onerror> payload (XSS) but still parses', async () => {
    const out = deepSanitize({ note: '<img src=x onerror=alert(1)>hello', tool: 'get_status' })
    expect((out as any).note).toBe('<img src="x">hello')
    // still valid for the schema
    expect(() => validateData(echoSchema, out)).not.toThrow()
  })

  it('2) rejects javascript: scheme -> VALIDATION error', async () => {
    expect(() => validateData(echoSchema, { note: 'javascript:alert(1)', tool: 'get_status' })).toThrow(
      ValidationError
    )
    try {
      validateData(echoSchema, { note: 'javascript:alert(1)', tool: 'get_status' })
    } catch (e) {
      expect((e as ValidationError).code).toBe('MALICIOUS_STRING')
    }
  })

  it('3) rejects a 20001-char string -> STRING_TOO_LONG', async () => {
    const big = 'a'.repeat(20_001)
    try {
      validateData(echoSchema, { note: big, tool: 'get_status' })
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as ValidationError).code).toBe('STRING_TOO_LONG')
    }
  })

  it('4) prototype pollution key is stripped, not applied', async () => {
    const polluted: any = { note: 'ok', tool: 'get_status', __proto__: { isAdmin: true } }
    const out: any = deepSanitize(polluted)
    expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false)
    // the proto of a fresh object must not carry isAdmin
    expect(({} as any).isAdmin).toBeUndefined()
    expect(out.__proto__?.isAdmin).toBeUndefined()
  })

  it('5) tool=__proto__ fails enum validation -> VALIDATION_FAILED (400)', async () => {
    try {
      validateData(echoSchema, { note: 'x', tool: '__proto__' })
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as ValidationError).code).toBe('VALIDATION_FAILED')
      expect((e as ValidationError).status).toBe(400)
    }
  })
})
