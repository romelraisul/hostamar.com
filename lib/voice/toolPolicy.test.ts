// Unit test for the voice tool-layer safety boundary (article layer 5).
// Deterministic: no HTTP / no auth / no DB. Run with: npx tsx lib/voice/toolPolicy.test.ts
import { evaluateToolCall, isToolAllowed, isDestructive } from './toolPolicy'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) {
    console.log('  ✓', name)
  } else {
    failures++
    console.error('  ✗', name)
  }
}

console.log('toolPolicy: allowlist + destructive gate')
check('get_hosting_status allowed', isToolAllowed('get_hosting_status'))
check('create_ticket is destructive', isDestructive('create_ticket'))
check('create_video not destructive', !isDestructive('create_video'))
check('unknown tool disallowed', !isToolAllowed('drop_table'))

// Golden rule: destructive WITHOUT confirmation -> 400 "Confirmation required"
const noConfirm = evaluateToolCall('create_ticket', false)
check('create_ticket w/o confirm -> 400', noConfirm.status === 400 && !noConfirm.allowed)
check('create_ticket w/o confirm -> "Confirmation required"', noConfirm.error === 'Confirmation required')

// With confirmation -> 200
const withConfirm = evaluateToolCall('create_ticket', true)
check('create_ticket WITH confirm -> 200', withConfirm.status === 200 && withConfirm.allowed)

// Non-destructive never needs confirmation
const safe = evaluateToolCall('get_hosting_status', false)
check('get_hosting_status w/o confirm -> 200', safe.status === 200 && safe.allowed)

// Disallowed tool -> 400
const bad = evaluateToolCall('rm_rf', false)
check('rm_rf -> 400 disallowed', bad.status === 400 && !bad.allowed)

// initiate_bkash_payment destructive gate
const pay = evaluateToolCall('initiate_bkash_payment', false)
check('bkash w/o confirm -> 400', pay.status === 400 && !pay.allowed)
check('bkash WITH confirm -> 200', evaluateToolCall('initiate_bkash_payment', true).allowed)

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
