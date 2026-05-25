const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function convertSvgToPng(inputPath, outputPath, size) {
  try {
    const svgBuffer = fs.readFileSync(inputPath);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Created: ${outputPath} (${size}x${size})`);
    return true;
  } catch (err) {
    console.error(`Error converting ${inputPath}:`, err.message);
    return false;
  }
}

async function createPlaceholderLogo(size, outputPath, text) {
  // Create a simple colored square with text overlay
  try {
    const svgLogo = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#grad)"/>
      <text x="${size/2}" y="${size * 0.68}" font-family="Arial,Helvetica,sans-serif" font-size="${size * 0.55}" font-weight="bold" fill="white" text-anchor="middle">${text}</text>
    </svg>`;
    
    await sharp(Buffer.from(svgLogo))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Created: ${outputPath} (${size}x${size})`);
    return true;
  } catch (err) {
    console.error(`Error creating placeholder logo:`, err.message);
    return false;
  }
}

async function main() {
  // Convert PWA icons
  const icon192Input = path.join(ICONS_DIR, 'icon-192x192.svg');
  const icon512Input = path.join(ICONS_DIR, 'icon-512x512.svg');
  const icon192Output = path.join(ICONS_DIR, 'icon-192x192.png');
  const icon512Output = path.join(ICONS_DIR, 'icon-512x512.png');
  const logoOutput = path.join(PUBLIC_DIR, 'logo.png');
  const ogOutput = path.join(PUBLIC_DIR, 'og-image.png');

  let success = true;

  // Convert SVG icons to PNG
  if (fs.existsSync(icon192Input)) {
    success &= await convertSvgToPng(icon192Input, icon192Output, 192);
  } else {
    console.log('icon-192x192.svg not found, creating placeholder...');
    success &= await createPlaceholderLogo(192, icon192Output, 'H');
  }

  if (fs.existsSync(icon512Input)) {
    success &= await convertSvgToPng(icon512Input, icon512Output, 512);
  } else {
    console.log('icon-512x512.svg not found, creating placeholder...');
    success &= await createPlaceholderLogo(512, icon512Output, 'H');
  }

  // Create logo.png (512x512)
  success &= await createPlaceholderLogo(512, logoOutput, 'H');

  // Create og-image.png (1200x630)
  try {
    const ogSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="ogGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#ogGrad)"/>
      <text x="600" y="300" font-family="Arial,Helvetica,sans-serif" font-size="120" font-weight="bold" fill="#3b82f6" text-anchor="middle">Hostamar</text>
      <text x="600" y="400" font-family="Arial,Helvetica,sans-serif" font-size="40" fill="#94a3b8" text-anchor="middle">Cloud Hosting — AI Marketing — Gaming — Dev IDE</text>
    </svg>`;
    
    await sharp(Buffer.from(ogSvg))
      .resize(1200, 630)
      .png()
      .toFile(ogOutput);
    console.log(`Created: ${ogOutput} (1200x630)`);
  } catch (err) {
    console.error(`Error creating og-image:`, err.message);
    success = false;
  }

  if (success) {
    console.log('\nAll assets generated successfully!');
  } else {
    console.log('\nSome assets failed to generate.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
