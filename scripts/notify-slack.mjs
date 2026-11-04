#!/usr/bin/env node
import fs from 'fs'
const webhook = process.env.SLACK_WEBHOOK_URL || fs.readFileSync('/home/romel/automation/infisical.env','utf8').match(/SLACK_WEBHOOK_URL=([^\n]+)/)?.[1]?.replace(/\"/g,'')
if (!webhook) { console.error('No SLACK_WEBHOOK_URL'); process.exit(1) }
const msg = process.argv.slice(2).join(' ') || 'Hostamar probe check'
const payload = {
  text: `Hostamar Alert: ${msg}`,
  blocks: [{type:"section", text:{type:"mrkdwn", text:`*Hostamar* — ${msg}\n_${new Date().toISOString()}_`}}]
}
fetch(webhook, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)})
  .then(r=>r.text().then(t=>console.log(`Slack status=${r.status} ${t.slice(0,100)}`)))
  .catch(e=>console.error(e))
