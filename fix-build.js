const fs = require('fs');
const path = require('path');

// Temporarily override build script to skip prisma generate (Node 18 issue)
const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts._originalBuild = pkg.scripts.build;
pkg.scripts.build = 'next build';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('Build script overridden to skip prisma generate');