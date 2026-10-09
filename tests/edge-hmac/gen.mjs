// Mints the fixture tokens for the workerd test with jsonwebtoken@9 — the same
// library/version that signed the tokens currently in users' cookies.
// Tokens are test data (throwaway secret); they go to a generated module
// rather than [vars] because local wrangler does not map [vars] onto
// process.env, and the test must not depend on that plumbing.
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const jwt = require('jsonwebtoken')

const SECRET = 'test-secret-abc123'
const base = { id: 'u1', email: 'a@b.co', name: 'Romel', role: 'admin' }
const tamper = (x) => { const p = x.split('.'); p[2] = (p[2][0] === 'A' ? 'B' : 'A') + p[2].slice(1); return p.join('.') }
const old = jwt.sign(base, SECRET, { expiresIn: '7d' })

// bcryptjs moved behind a lazy import in lib/auth-utils.ts — prove the runtime
// still verifies stored hashes (same cost factor the app uses).
const bcrypt = require('bcryptjs')
const PW = 'correct horse battery staple'
const PW_HASH = bcrypt.hashSync(PW, 10)

const fixtures = {
  SECRET,
  PW,
  PW_WRONG: 'wrong-password',
  PW_HASH,
  TOKEN_OLD: old,
  TOKEN_ORG: jwt.sign({ ...base, orgId: 'org-7' }, SECRET, { expiresIn: '7d' }),
  TOKEN_EXPIRED: jwt.sign(base, SECRET, { expiresIn: -10 }),
  TOKEN_WRONG: jwt.sign(base, 'other-secret', { expiresIn: '7d' }),
  TOKEN_NONE: Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ ...base, role: 'superadmin' })).toString('base64url') + '.',
  TOKEN_TAMPERED: tamper(old),
}

writeFileSync('tests/edge-hmac/fixtures.mjs', 'export default ' + JSON.stringify(fixtures, null, 2) + '\n')
console.log('wrote tests/edge-hmac/fixtures.mjs (' + Object.keys(fixtures).length + ' fixtures)')
