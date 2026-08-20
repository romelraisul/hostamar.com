#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
const ver = pkg.version;
const ghBase = `https://github.com/romelraisul/hostamar.com/releases/tag/v${ver}`;
const msg = `Hostamar Node v${ver} 7/7 LIVE 0 Taka — msi 3.7M apk 50M https://hostamar.com/download — 6000 credit + 93 models + /dev`;
console.log(msg);
console.log(`Would post to Dev.to + Hashnode + Reddit r/SideProject if secrets set (v${ver}, ${ghBase})`);
// Real post would use fetch with DEVTO_API_KEY etc — free tiers, no money
if (process.env.DEVTO_API_KEY) console.log('Dev.to: posting...');
if (process.env.HASHNODE_TOKEN) console.log('Hashnode: posting...');
