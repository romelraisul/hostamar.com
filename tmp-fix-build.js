const fs = require('fs');
const path = require('path');
const pkgPath = path.join('/mnt/c/Users/romel/hostamar-local', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts.build = 'next build'; // Skip prisma generate for local prebuilt
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('Build script temporarily: next build only');

// Restore after
setTimeout(() => {
  pkg.scripts.build = 'prisma generate && next build';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('Build script restored');
}, 5000);