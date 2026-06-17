# PWA Icons — Placeholder Notes

## Current state
- `icon-192x192.svg` and `icon-512x512.svg` are SVG placeholders that work for modern browsers
- `manifest.json` references `/icons/icon-192x192.png` and `/icons/icon-512x512.png` (PNG format)

## To generate proper PNG icons
Use any of these methods:

### Option 1: Inkscape CLI (if installed)
```bash
# 192x192
inkscape public/icons/icon-192x192.svg -w 192 -h 192 -o public/icons/icon-192x192.png
# 512x512  
inkscape public/icons/icon-512x512.svg -w 512 -h 512 -o public/icons/icon-512x512.png
```

### Option 2: Sharp (Node.js)
```bash
npm install --save-dev sharp
node -e "
const sharp = require('sharp');
sharp('public/icons/icon-512x512.svg').resize(192,192).png().toFile('public/icons/icon-192x192.png');
sharp('public/icons/icon-512x512.svg').resize(512,512).png().toFile('public/icons/icon-512x512.png');
"
```

### Option 3: Online converter
Upload the SVGs to https://convertio.co/svg-png/ and download as 192x192 and 512x512 PNGs.

## Screenshots
`/screenshots/desktop.png` (1280x720) and `/screenshots/mobile.png` (750x1334) are referenced in manifest.json but not yet created. Generate these from actual app screenshots after deployment.
