import fs from 'fs'
import { EdgeRuntime } from 'edge-runtime'

const code = fs.readFileSync('.next/server/middleware.js', 'utf8')
const runtime = new EdgeRuntime({ initialCode: code })

// The bundle registers the middleware as _ENTRIES.middleware_middleware
try {
  const result = await runtime.evaluate(`
    const mod = _ENTRIES['middleware_middleware'];
    const fn = mod.default || mod.middleware || mod;
    const req = new Request('https://hostamar.com/');
    fn(req).then(r => ({ status: r.status, ok: true })).catch(e => ({ error: e && e.stack ? e.stack : String(e) }));
  `)
  console.log('DISPATCH RESULT:', JSON.stringify(result))
} catch (e) {
  console.log('TOP-LEVEL ERROR:', e && e.stack ? e.stack : e)
}
