#!/usr/bin/env node
/**
 * Contract check for the Decision API (the six dashboard PINs). Run after any
 * change to jev-server.py, the tunnel, the middleware, or the shipped route:
 *
 *   node scripts/test-decision-api.mjs                                   # local :8083
 *   ENDPOINT=https://hostamar.com/api/decision node scripts/test-decision-api.mjs   # shipped route
 *
 * Asserts what the dashboard relies on: a valid choice, calibrated probabilities,
 * and escalate exactly when confidence < 0.60 (the 60% rule).
 */
const ENDPOINT = process.env.ENDPOINT || 'http://127.0.0.1:8083/v1/decisions'
const FLOOR = 0.6

// same questions the PIN table in lib/decision-middleware.ts carries
const CASES = [
  ['model_tier', 'Which model tier should handle this request?', ['fast', 'balanced', 'pro', 'flux', 'comfyui'],
    { prompt: 'a cat', user_tier: 'free', image_size: 1024 }, 2],
  ['product_queue', 'Which product queue owns this request?', ['hostamar-core', 'ai-store', 'browser-pro', 'billing', 'abuse', 'other'],
    { subject: 'double charged on bKash', body: 'charged twice', plan: 'free' }],
  ['approval_gate', 'Does this change require human confirmation?', ['yes', 'no'],
    { tf_diff: '+ aws_vpc main cidr_block = 0.0.0.0/0', target_module: 'module/vpc', cost_delta: '+41.20' }],
  ['priority', 'What is priority level?', ['low', 'medium', 'high', 'critical'],
    { service_name: 'postgres', downtime: '7m', reboot_history: '3 in 24h' }],
  ['abuse', 'Is this request abusive?', ['yes', 'no'],
    { ip: '45.11.2.9', user_agent: 'curl/8', request_path: '/v1/chat/completions', rate: '400/min' }],
  ['audit_actor', 'Was this action a human override or an automated decision?', ['human_override', 'automated'],
    { chosen: 'yes', confidence: 0.71, model: 'jev-style-0.8b-decision-v3' }],
]

let bad = 0
for (const [pin, question, choices, context, judges] of CASES) {
  let r
  try {
    r = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ who: `test/${pin}`, question, choices, context, judges: judges ?? 1 }),
      signal: AbortSignal.timeout(120000),
    })
  } catch (e) {
    console.log(`FAIL ${pin.padEnd(15)} unreachable: ${e.message}`)
    bad++
    continue
  }
  const v = await r.json()
  const probs = v.probabilities || {}
  const sum = Object.values(probs).reduce((a, b) => a + b, 0)
  const top = Object.entries(probs).sort((a, b) => b[1] - a[1])[0]?.[0]
  const checks = {
    http_200: r.status === 200,
    choice_valid: choices.includes(v.choice),
    conf_in_range: typeof v.confidence === 'number' && v.confidence >= 0 && v.confidence <= 1,
    calibrated: Math.abs(sum - 1) < 0.02,
    top_is_choice: top === v.choice,
    '60%_rule': v.escalate === (v.confidence < FLOOR),
    ...(judges === 2 ? { agree_is_bool: typeof v.agree === 'boolean' } : {}),
  }
  const fails = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k)
  if (fails.length) bad++
  console.log(
    `${fails.length ? 'FAIL' : 'ok  '} ${pin.padEnd(15)} ${String(v.choice).padEnd(10)} ` +
    `conf=${v.confidence} escalate=${v.escalate} agree=${v.agree} judge1_ms=${v.judge1_ms} ` +
    (fails.length ? `← ${fails.join(',')}` : ''),
  )
}
console.log(bad ? `\n${bad} PIN(s) failed the contract` : '\nall 6 PINs pass the decision contract')
process.exit(bad ? 1 : 0)
