import fs from 'fs'
import { EdgeRuntime } from 'edge-runtime'
const code = fs.readFileSync('.next/server/middleware.js', 'utf8')
const runtime = new EdgeRuntime({ initialCode: code })
const req = new runtime.Request('https://hostamar.com/')
try {
  const res = await runtime.dispatch(req)
  console.log('INVOKE OK status=', res.status)
} catch (e) {
  console.log('INVOKE ERROR:', e && e.stack ? e.stack : e)
}
