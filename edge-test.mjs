import fs from 'fs'
import { EdgeRuntime } from 'edge-runtime'
const code = fs.readFileSync('.next/server/middleware.js', 'utf8')
try {
  const runtime = new EdgeRuntime({ initialCode: code })
  await runtime.evaluate(`globalThis.__loaded=true`)
  console.log('LOADED OK — no __dirname error at module init')
} catch (e) {
  console.log('EDGE ERROR:', e && e.stack ? e.stack : e)
}
