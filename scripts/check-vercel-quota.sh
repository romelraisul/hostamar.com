#!/bin/bash
COUNT=$(vercel ls --limit 100 2>/dev/null | grep -c "Ready\|Building\|Error" || echo 0)
echo "Deployments today visible: $COUNT/100"
if [ "$COUNT" -gt 95 ]; then
  echo "🛑 95% quota - STOP all deploys until 06:00 AM BST reset"
  exit 1
fi
if [ "$COUNT" -gt 80 ]; then
  echo "⚠️ 80% quota used - batch fixes, don't push"
  exit 1
fi
echo "✅ Quota OK $COUNT/100 - can push 1x"
