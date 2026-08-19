#!/bin/bash
# Inspect (not print) key presence/count in .env
for k in NVIDIA_API_KEY TOKENROUTER_API_KEY TOKENROUTER_API_KEY_2; do
  n=$(grep -c "^${k}=" /home/romel/.hermes/.env 2>/dev/null)
  echo "${k}: ${n} assignment(s)"
done
echo "---"
# Tell tokenrouter keys apart by length only (no values)
i=0
grep "^TOKENROUTER_API_KEY_2=" /home/romel/.hermes/.env | while IFS= read -r line; do
  i=$((i+1)); v="${line#*=}"; echo "K2 entry $i: len=${#v}"
done
grep "^TOKENROUTER_API_KEY=" /home/romel/.hermes/.env | while IFS= read -r line; do
  i=$((i+1)); v="${line#*=}"; echo "K1 entry $i: len=${#v}"
done
