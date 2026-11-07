#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(pwd)"
ISOMORPHIC_WS_SRC="$PROJECT_ROOT/node_modules/@libsql/isomorphic-ws"

# Pre-copy isomorphic-ws to where hrana-client expects it
TARGET_DIR="$PROJECT_ROOT/node_modules/@libsql/client/node_modules/@libsql"
DEST="$TARGET_DIR/isomorphic-ws"
if [ -d "$ISOMORPHIC_WS_SRC" ]; then
  mkdir -p "$TARGET_DIR"
  cp -r "$ISOMORPHIC_WS_SRC/"* "$DEST/" 2>/dev/null || cp -r "$ISOMORPHIC_WS_SRC/" "$DEST/"
  echo "Pre-copied @libsql/isomorphic-ws to $DEST"
  ls -la "$DEST/"
  if [ -f "$DEST/web.mjs" ]; then
    echo "web.mjs confirmed present"
  else
    echo "WARNING: web.mjs missing from copy"
  fi
fi

# Patch hrana-client to not import @libsql/isomorphic-ws
# Cloudflare Workers has WebSocket globally available
HRANA_CLIENT_INDEX="$PROJECT_ROOT/node_modules/@libsql/client/node_modules/@libsql/hrana-client/lib-esm/index.js"
if [ -f "$HRANA_CLIENT_INDEX" ]; then
  echo "Original hrana-client index.js (first 20 lines):"
  head -20 "$HRANA_CLIENT_INDEX"
  
  # Patch all references to @libsql/isomorphic-ws
  # 1. Dynamic import in openWs function
  sed -i 's/(await import("@libsql\/isomorphic-ws"))\.WebSocket/globalThis.WebSocket/g' "$HRANA_CLIENT_INDEX"
  # 2. Static import
  sed -i 's/import { WebSocket } from "@libsql\/isomorphic-ws";/const WebSocket = globalThis.WebSocket;/g' "$HRANA_CLIENT_INDEX"
  # 3. Export statement
  sed -i 's/export { WebSocket } from "@libsql\/isomorphic-ws";/export { WebSocket }; const WebSocket = globalThis.WebSocket;/g' "$HRANA_CLIENT_INDEX"
  # 4. Any other import from isomorphic-ws
  sed -i 's/from "@libsql\/isomorphic-ws"/from "globalThis"/g' "$HRANA_CLIENT_INDEX"
  echo "Patched hrana-client to use global WebSocket"
  
  # Verify the patch
  echo "Patched hrana-client index.js (first 20 lines):"
  head -20 "$HRANA_CLIENT_INDEX"
  grep -n "globalThis.WebSocket" "$HRANA_CLIENT_INDEX" || echo "WARNING: Patch may not have applied"
  grep -n "isomorphic-ws" "$HRANA_CLIENT_INDEX" && echo "WARNING: isomorphic-ws still referenced" || echo "No isomorphic-ws references found"
fi

echo "Running Prisma generate..."
npx prisma generate

echo "Running OpenNext build (full build including Next.js)..."
npx opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion

# Post-build: patch handler.mjs
HANDLER_PATH="$PROJECT_ROOT/.open-next/server-functions/default/handler.mjs"
if [ -f "$HANDLER_PATH" ]; then
  BEFORE=$(grep -c 'require("node:sqlite")' "$HANDLER_PATH" || true)
  sed -i 's/require("node:sqlite")/({})/g' "$HANDLER_PATH"
  AFTER=$(grep -c 'require("node:sqlite")' "$HANDLER_PATH" || true)
  echo "Patched handler.mjs: replaced $BEFORE occurrences of require(\"node:sqlite\") with ({})"
fi

# Also ensure isomorphic-ws exists in the final .open-next output
OPEN_NEXT_TARGET_DIRS=(
  "$PROJECT_ROOT/.open-next/server-functions/default/node_modules/@libsql/client/node_modules/@libsql"
)

for TARGET_DIR in "${OPEN_NEXT_TARGET_DIRS[@]}"; do
  DEST="$TARGET_DIR/isomorphic-ws"
  if [ -d "$ISOMORPHIC_WS_SRC" ] && [ ! -d "$DEST" ]; then
    mkdir -p "$TARGET_DIR"
    cp -r "$ISOMORPHIC_WS_SRC/"* "$DEST/" 2>/dev/null || cp -r "$ISOMORPHIC_WS_SRC/" "$DEST/"
    echo "Post-copied @libsql/isomorphic-ws to $DEST"
  fi
done