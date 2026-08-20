#!/usr/bin/env node
// Reapply publishing singleVariant fix after expo prebuild (since android/ is gitignored)
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'apps/mobile/android/app/build.gradle');
if (!fs.existsSync(p)) { console.log('no android/app/build.gradle yet, run expo prebuild first'); process.exit(0); }
let t = fs.readFileSync(p, 'utf8');
if (t.includes('publishing {') && t.includes('singleVariant("release")')) {
  console.log('publishing already present');
  process.exit(0);
}
t = t.replace('android {', 'android {\n    publishing {\n        singleVariant("release")\n    }');
fs.writeFileSync(p, t);
console.log('Patched android publishing fix');
