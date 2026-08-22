#!/usr/bin/env bash
# Smoke-test the full TV command flow against local dev server (secret: dev-test-secret-12345).
set -u
cd /home/romel/hostamar-build
SECRET="dev-test-secret-12345"
BASE="http://localhost:3210"

echo "--- 1. agent/destinations WITH secret ---"
curl -s -m 15 -H "x-agent-secret: $SECRET" "$BASE/api/tv/agent/destinations" | head -c 250; echo

echo "--- 2. queue RELOAD_PLAYLIST directly in DB ---"
node --input-type=module -e "
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
process.env.DATABASE_URL = readFileSync('.env.local','utf8').match(/^DATABASE_URL=(.+)\$/m)[1].trim().replace(/^[\"']|[\"']\$/g,'');
const p = new PrismaClient();
const c = await p.tvCommand.create({ data: { action: 'RELOAD_PLAYLIST' } });
console.log('queued', c.id, c.status);
await p.\$disconnect();
"

echo "--- 3. agent polls commands ---"
POLL="$(curl -s -m 15 "$BASE/api/tv/agent/commands?secret=$SECRET")"
echo "$POLL" | head -c 400; echo
CMD_ID="$(echo "$POLL" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).commands[0].id)}catch{console.log('')}})")"
if [ -n "$CMD_ID" ]; then
  echo "--- 4. ack $CMD_ID DONE ---"
  curl -s -m 15 -X POST -H "Content-Type: application/json" \
    -d "{\"commandId\":\"$CMD_ID\",\"status\":\"DONE\",\"log\":\"smoke\",\"secret\":\"$SECRET\"}" \
    "$BASE/api/tv/agent/ack"; echo
else
  echo "NO PENDING COMMAND IN POLL — flow broken"
fi

echo "--- 5. verify command no longer pending ---"
curl -s -m 15 "$BASE/api/tv/agent/commands?secret=$SECRET" | head -c 200; echo
