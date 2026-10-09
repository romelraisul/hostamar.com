// Workerd-side proof for the cold-init fix (run via tests/edge-hmac/run.sh).
// Node already proves interop; this proves the *runtime*: node:crypto
// createHmac/timingSafeEqual + Buffer base64url must behave in workerd with
// nodejs_compat @ compatibility_date 2024-11-01 exactly as they do in Node,
// verifying the same jsonwebtoken@9 tokens users already hold.
// The JWT secret is inlined by esbuild --define (see run.sh) because local
// wrangler does not map [vars] onto process.env.
import { verifyToken, signToken, comparePassword } from './auth-utils.mjs'
import F from './fixtures.mjs'

export default {
  async fetch() {
    const results = {
      buffer_base64url_ok: Buffer.from('abc').toString('base64url') === 'YWJj',
      old_token_verifies: verifyToken(F.TOKEN_OLD)?.id === 'u1',
      orgid_claim_survives: verifyToken(F.TOKEN_ORG)?.orgId === 'org-7',
      expired_rejected: verifyToken(F.TOKEN_EXPIRED) === null,
      wrong_secret_rejected: verifyToken(F.TOKEN_WRONG) === null,
      alg_none_rejected: verifyToken(F.TOKEN_NONE) === null,
      tampered_rejected: verifyToken(F.TOKEN_TAMPERED) === null,
      roundtrip_own_signature: verifyToken(signToken({ id: 'u9', email: 'x@y.z', name: 'N', role: 'admin' }))?.id === 'u9',
      // lazy `await import('bcryptjs')` must resolve inside the bundled worker
      compare_correct_password: (await comparePassword(F.PW, F.PW_HASH)) === true,
      compare_wrong_password: (await comparePassword(F.PW_WRONG, F.PW_HASH)) === false,
    }
    const allOk = Object.values(results).every((x) => x === true)
    return Response.json({ allOk, runtime: navigator.userAgent, results })
  },
}
