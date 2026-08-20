#!/usr/bin/env node
/**
 * Sync version from root package.json -> tauri.conf.json, app.json, lib/version.ts, mobile package.json, desktop package.json
 * Usage: node scripts/sync-version.js [patch|minor|major|0.1.4]
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');

function bump(current, type) {
  if (/^\d+\.\d+\.\d+$/.test(type)) return type;
  const [a,b,c] = current.split('.').map(Number);
  if (type === 'patch') return `${a}.${b}.${c+1}`;
  if (type === 'minor') return `${a}.${b+1}.0`;
  if (type === 'major') return `${a+1}.0.0`;
  throw new Error(`unknown bump ${type}`);
}

const arg = process.argv[2] || 'patch';
const rootPkgPath = path.join(root, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const next = bump(rootPkg.version, arg);
console.log(`${rootPkg.version} -> ${next}`);

function writeJson(p, obj) {
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let out = JSON.stringify(obj, null, 2);
  if (crlf) out = out.replace(/\n/g, '\r\n');
  if (!out.endsWith(crlf ? '\r\n' : '\n')) out += crlf ? '\r\n' : '\n';
  fs.writeFileSync(p, out, 'utf8');
}

// root
rootPkg.version = next;
writeJson(rootPkgPath, rootPkg);

// node-core
const ncPath = path.join(root, 'packages/node-core/package.json');
if (fs.existsSync(ncPath)) {
  const nc = JSON.parse(fs.readFileSync(ncPath, 'utf8'));
  nc.version = next;
  fs.writeFileSync(ncPath, JSON.stringify(nc, null, 2) + '\n');
}

// desktop tauri
const tauriPath = path.join(root, 'apps/desktop/src-tauri/tauri.conf.json');
if (fs.existsSync(tauriPath)) {
  const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));
  tauri.package.version = next;
  fs.writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');
}

// desktop package
const deskPkg = path.join(root, 'apps/desktop/package.json');
if (fs.existsSync(deskPkg)) {
  const d = JSON.parse(fs.readFileSync(deskPkg, 'utf8'));
  d.version = next;
  fs.writeFileSync(deskPkg, JSON.stringify(d, null, 2) + '\n');
}

// mobile app.json + package
const appJsonPath = path.join(root, 'apps/mobile/app.json');
if (fs.existsSync(appJsonPath)) {
  const aj = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  aj.expo.version = next;
  fs.writeFileSync(appJsonPath, JSON.stringify(aj, null, 2) + '\n');
}
const mobPkg = path.join(root, 'apps/mobile/package.json');
if (fs.existsSync(mobPkg)) {
  const m = JSON.parse(fs.readFileSync(mobPkg, 'utf8'));
  m.version = next;
  fs.writeFileSync(mobPkg, JSON.stringify(m, null, 2) + '\n');
}

// lib/version.ts
const vts = `import pkg from '../package.json'
export const VERSION = pkg.version as string
export const GH_BASE = \`https://github.com/romelraisul/hostamar.com/releases/download/v\${VERSION}\`
`;
fs.writeFileSync(path.join(root, 'lib/version.ts'), vts);

// replace hardcoded download refs
for (const p of ['app/download/page.tsx', 'components/home/DownloadShowcase.tsx', 'docs/download-showcase.md']) {
  const full = path.join(root, p);
  if (fs.existsSync(full)) {
    let t = fs.readFileSync(full, 'utf8');
    t = t.replace(/releases\/download\/v\d+\.\d+\.\d+/g, `releases/download/v${next}`);
    t = t.replace(/>v\d+\.\d+\.\d+</g, `>v${next}<`);
    t = t.replace(/v\d+\.\d+\.\d+-node/g, `v${next}-node`);
    t = t.replace(/RELEASE = 'v\d+\.\d+\.\d+'/g, `RELEASE = 'v${next}'`);
    fs.writeFileSync(full, t);
  }
}

console.log(`Synced ${next} -> tauri.conf, app.json, lib/version.ts, download, docs`);
if (process.argv.includes('--tag')) {
  cp.execSync(`git tag -a v${next} -m "Hostamar v${next}"`, { stdio: 'inherit' });
  console.log(`Tagged v${next}`);
}
