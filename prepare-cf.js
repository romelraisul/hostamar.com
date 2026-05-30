// Static export script for Cloudflare Pages
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('🚀 Starting Cloudflare Pages static export...');

try {
  // Clean previous build
  console.log('🧹 Cleaning previous build...');
  fs.emptyDirSync('.next');
  
  // Generate Prisma
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Copy public files
  console.log('📁 Copying public assets...');
  if (fs.existsSync('public')) {
    fs.copySync('public', '.next', { overwrite: true });
  }
  
  console.log('✅ Static export prepared!');
  console.log('');
  console.log('Next steps:');
  console.log('1. npx prisma generate');
  console.log('2. npm run build');
  console.log('3. Upload .next folder to Cloudflare Pages');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}