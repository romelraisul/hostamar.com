#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/home/romel/hostamar.com"
ISOMORPHIC_WS_SRC="$PROJECT_ROOT/node_modules/@libsql/isomorphic-ws"

# Pre-copy isomorphic-ws to where hrana-client expects it
# This must happen BEFORE OpenNext's esbuild runs
TARGET_DIRS=(
  "$PROJECT_ROOT/.open-next/server-functions/default/node_modules/@libsql/client/node_modules/@libsql"
  "$PROJECT_ROOT/node_modules/@libsql/client/node_modules/@libsql"
)

for TARGET_DIR in "${TARGET_DIRS[@]}"; do
  DEST="$TARGET_DIR/isomorphic-ws"
  if [ -d "$ISOMORPHIC_WS_SRC" ]; then
    mkdir -p "$TARGET_DIR"
    cp -r "$ISOMORPHIC_WS_SRC" "$DEST"
    echo "Pre-copied @libsql/isomorphic-ws to $DEST"
  fi
done

echo "Building Next.js app..."
cd "$PROJECT_ROOT"
npm run build

echo "Running OpenNext build (skip Next.js build)..."
npx opennextjs-cloudflare build --skipNextBuild --dangerouslyUseUnsupportedNextVersion

# Post-build: patch handler.mjs
HANDLER_PATH="$PROJECT_ROOT/.open-next/server-functions/default/handler.mjs"
if [ -f "$HANDLER_PATH" ]; then
  BEFORE=$(grep -c 'require("node:sqlite")' "$HANDLER_PATH" || true)
  sed -i 's/require("node:sqlite")/({})/g' "$HANDLER_PATH"
  AFTER=$(grep -c 'require("node:sqlite")' "$HANDLER_PATH" || true)
  echo "Patched handler.mjs: replaced $BEFORE occurrences of require(\"node:sqlite\") with ({})"
fi

# Also ensure isomorphic-ws exists in the final .open-next output
for TARGET_DIR in "${TARGET_DIRS[@]}"; do
  DEST="$TARGET_DIR/isomorphic-ws"
  if [ -d "$ISOMORPHIC_WS_SRC" ] && [ ! -d "$DEST" ]; then
    mkdir -p "$TARGET_DIR"
    cp -r "$ISOMORPHIC_WS_SRC" "$DEST"
    echo "Post-copied @libsql/isomorphic-ws to $DEST"
  fi
done