#!/bin/bash
# Parallel recon for SSO + guard deploy
cd /mnt/c/Users/User/hostamar.com 2>/dev/null || cd /home/romel/hostamar.com 2>/dev/null

echo "=== 1. SSO env var names expected by code ==="
grep -rhoE '"(GOOGLE[A-Z_]*)"|(GOOGLE[A-Z_]*):' lib/ app/ 2>/dev/null | sort -u | head
grep -rlE 'GoogleProvider|google.*client' lib/auth*.ts lib/auth-config.ts app/api/auth/ 2>/dev/null | head -5

echo ""
echo "=== 2. Callback route provider key ==="
grep -rn "GOOGLE" app/api/auth/ lib/ 2>/dev/null | grep -iE "client_id|client_secret|env" | head -8

echo ""
echo "=== 3. Guard :12436 listen ==="
ss -tlnp 2>/dev/null | grep 12436

echo ""
echo "=== 4. Vercel link ==="
cat .vercel/project.json 2>/dev/null
which vercel; vercel --version 2>&1 | head -1

echo ""
echo "=== 5. Vercel auth status ==="
vercel whoami 2>&1 | head -3
