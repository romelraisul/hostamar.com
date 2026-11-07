#!/usr/bin/env bash
set -euo pipefail

# Use current working directory (GitHub Actions uses /home/runner/work/...)
PROJECT_ROOT="$(pwd)"
ISOMORPHIC_WS_SRC="$PROJECT_ROOT/node_modules/@libsql/isomorphic-ws"

# Pre-copy isomorphic-ws to the MAIN node_modules where OpenNext will pick it up
# This must happen BEFORE OpenNext runs so it gets bundled correctly
TARGET_DIR="$PROJECT_ROOT/node_modules/@libsql/client/node_modules/@libsql"

DEST="$TARGET_DIR/isomorphic-ws"
if [ -d "$ISOMORPHIC_WS_SRC" ]; then
  mkdir -p "$TARGET_DIR"
  # Use rsync for more reliable copying, or cp with explicit file list
  rsync -a "$ISOMORPHIC_WS_SRC/" "$DEST/"
  echo "Pre-copied @libsql/isomorphic-ws to $DEST"
  ls -la "$DEST/"
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
    rsync -a "$ISOMORPHIC_WS_SRC/" "$DEST/"
    echo "Post-copied @libsql/isomorphic-ws to $DEST"
  fi
done