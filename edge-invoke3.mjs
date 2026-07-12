import fs from 'fs'
import { EdgeRuntime } from 'edge-runtime'

let code = fs.readFileSync('.next/server/middleware.js', 'utf8')
// Append an invocation that exercises the middleware with a real Request
code += `
;globalThis.__dispatch = async function() {
  const mod = _ENTRIES['middleware_middleware'];
  const fn = mod && (mod.default || mod.middleware || mod);
  if (typeof fn !== 'function') return { error: 'no middleware fn, keys=' + Object.keys(mod||{}) };
  try {
    const req = new Request('https://hostamar.com/');
    const res = await fn(req);
    return { status: res.status };
  } catch (e) {
    return { error: (e && e.stack) ? e.stack : String(e) };
  }
};
`
const runtime = new EdgeRuntime({ initialCode: code })
try {
  const result = await runtime.evaluate(`globalThis.__dispatch()`)
  console.log('DISPATCH RESULT:', JSON.stringify(result, null, 2))
} catch (e) {
  console.log('TOP-LEVEL ERROR:', e && e.stack ? e.stack : e)
}
