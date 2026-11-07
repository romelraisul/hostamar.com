#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Building Next.js app...');
execSync('npm run build', { stdio: 'inherit', cwd: '/home/romel/hostamar.com' });

console.log('Running OpenNext build (skip Next.js build)...');
execSync('npx opennextjs-cloudflare build --skipNextBuild --dangerouslyUseUnsupportedNextVersion', { 
  stdio: 'inherit', 
  cwd: '/home/romel/hostamar.com',
  env: { ...process.env, OPEN_NEXT_SKIP_BUILD: 'true' }
});

// Patch the .open-next directory after OpenNext creates it but before esbuild
const openNextDir = '/home/romel/hostamar.com/.open-next/server-functions/default/node_modules/@libsql/client/node_modules/@libsql';
const isomorphicWsSrc = '/home/romel/hostamar.com/node_modules/@libsql/isomorphic-ws';
const isomorphicWsDest = path.join(openNextDir, 'isomorphic-ws');

if (fs.existsSync(isomorphicWsSrc)) {
  fs.mkdirSync(openNextDir, { recursive: true });
  fs.cpSync(isomorphicWsSrc, isomorphicWsDest, { recursive: true });
  console.log(`Copied @libsql/isomorphic-ws to ${isomorphicWsDest}`);
} else {
  console.warn(`Source not found: ${isomorphicWsSrc}`);
}

// Also patch the handler.mjs
const handlerPath = '/home/romel/hostamar.com/.open-next/server-functions/default/handler.mjs';
if (fs.existsSync(handlerPath)) {
  let content = fs.readFileSync(handlerPath, 'utf-8');
  const before = (content.match(/require\("node:sqlite"\)/g) || []).length;
  content = content.replace(/require\("node:sqlite"\)/g, '({})');
  const after = (content.match(/require\("node:sqlite"\)/g) || []).length;
  fs.writeFileSync(handlerPath, content);
  console.log(`Patched handler.mjs: replaced ${before} occurrences of require("node:sqlite") with ({})`);
}