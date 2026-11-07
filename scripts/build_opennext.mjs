#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = '/home/romel/hostamar.com';
const isomorphicWsSrc = path.join(projectRoot, 'node_modules/@libsql/isomorphic-ws');

// Pre-copy isomorphic-ws to where hrana-client expects it
// This must happen BEFORE OpenNext's esbuild runs
const targetDirs = [
  path.join(projectRoot, '.open-next/server-functions/default/node_modules/@libsql/client/node_modules/@libsql'),
  path.join(projectRoot, 'node_modules/@libsql/client/node_modules/@libsql'),
];

for (const targetDir of targetDirs) {
  const dest = path.join(targetDir, 'isomorphic-ws');
  if (fs.existsSync(isomorphicWsSrc)) {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.cpSync(isomorphicWsSrc, dest, { recursive: true });
    console.log(`Pre-copied @libsql/isomorphic-ws to ${dest}`);
  }
}

console.log('Building Next.js app...');
execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });

console.log('Running OpenNext build (skip Next.js build)...');
execSync('npx opennextjs-cloudflare build --skipNextBuild --dangerouslyUseUnsupportedNextVersion', { 
  stdio: 'inherit', 
  cwd: projectRoot,
  env: { ...process.env, OPEN_NEXT_SKIP_BUILD: 'true' }
});

// Post-build: patch handler.mjs
const handlerPath = path.join(projectRoot, '.open-next/server-functions/default/handler.mjs');
if (fs.existsSync(handlerPath)) {
  let content = fs.readFileSync(handlerPath, 'utf-8');
  const before = (content.match(/require\("node:sqlite"\)/g) || []).length;
  content = content.replace(/require\("node:sqlite"\)/g, '({})');
  const after = (content.match(/require\("node:sqlite"\)/g) || []).length;
  fs.writeFileSync(handlerPath, content);
  console.log(`Patched handler.mjs: replaced ${before} occurrences of require("node:sqlite") with ({})`);
}

// Also ensure isomorphic-ws exists in the final .open-next output
for (const targetDir of targetDirs) {
  const dest = path.join(targetDir, 'isomorphic-ws');
  if (fs.existsSync(isomorphicWsSrc) && !fs.existsSync(dest)) {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.cpSync(isomorphicWsSrc, dest, { recursive: true });
    console.log(`Post-copied @libsql/isomorphic-ws to ${dest}`);
  }
}