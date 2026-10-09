// Run: node tests/auth-token-interop.mjs
// Gate for the cold-init fix: lib/auth-utils.ts replaced jsonwebtoken with
// node:crypto HS256. This proves the swap did not log every user out:
// tokens in existing `auth_token` cookies (jsonwebtoken@9) must still verify,
// tokens we mint must verify with jsonwebtoken, and everything dubious is rejected.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const SECRET = 'test-secret-abc123'
process.env.JWT_SECRET = SECRET
process.env.NEXT_PHASE = ''
process.env.CI = ''

const outPath = fileURLToPath(new URL('./.cache/auth-utils.mjs', import.meta.url)) // in-repo so lazy import('bcryptjs') resolves
mkdirSync(dirname(outPath), { recursive: true })
execFileSync('node_modules/.bin/esbuild', ['lib/auth-utils.ts', '--format=esm', `--outfile=${outPath}`, '--log-level=error'])
const { signToken, verifyToken, comparePassword } = await import(pathToFileURL(outPath).href)

const base = { id: 'u1', email: 'a@b.co', name: 'Romel', role: 'admin' }
let pass = 0, fail = 0
const check = (name, cond) => { if (cond) { pass++; console.log('  ok   ' + name) } else { fail++; console.log('  FAIL ' + name) } }
const tamper = (t) => { const p = t.split('.'); p[2] = (p[2][0] === 'A' ? 'B' : 'A') + p[2].slice(1); return p.join('.') }

// 1-2. jsonwebtoken-signed (i.e. live cookies minted before this change)
const oldTok = jwt.sign(base, SECRET, { expiresIn: '7d' })
check('jsonwebtoken token -> new verifyToken', verifyToken(oldTok)?.id === 'u1')
const oldOrg = jwt.sign({ ...base, orgId: 'org-7' }, SECRET, { expiresIn: '7d' })
check('jsonwebtoken orgId claim survives', verifyToken(oldOrg)?.orgId === 'org-7')

// 3-4. new-signed tokens must satisfy the old verifier (rollback safety)
const newTok = signToken(base)
check('new signToken -> jsonwebtoken.verify', jwt.verify(newTok, SECRET).email === 'a@b.co')
check('new signToken header is HS256/JWT', Buffer.from(newTok.split('.')[0], 'base64url').toString() === '{"alg":"HS256","typ":"JWT"}')
check('new signToken extra claim (orgId)', jwt.verify(signToken(base, { orgId: 'org-9' }), SECRET).orgId === 'org-9')
check('new signToken exp is +7d', Math.abs(jwt.verify(newTok, SECRET).exp - (Math.floor(Date.now() / 1000) + 604800)) <= 2)

// 5-10. rejections
check('tampered signature rejected', verifyToken(tamper(oldTok)) === null)
const forged = jwt.sign({ ...base, role: 'superadmin' }, 'other-secret', { expiresIn: '7d' })
check('wrong secret rejected', verifyToken(forged) === null)
check('expired token rejected', verifyToken(jwt.sign(base, SECRET, { expiresIn: -10 })) === null)
const noneTok = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ ...base, role: 'superadmin' })).toString('base64url') + '.'
check('alg:none downgrade rejected', verifyToken(noneTok) === null)
check('garbage rejected', verifyToken('not.a.token') === null && verifyToken('') === null)

// 11. bcryptjs now arrives via dynamic import inside the function
check('comparePassword works via lazy import', await comparePassword('pw', bcrypt.hashSync('pw', 4)))
check('comparePassword rejects wrong pw', (await comparePassword('nope', bcrypt.hashSync('pw', 4))) === false)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
