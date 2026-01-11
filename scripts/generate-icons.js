#!/usr/bin/env node

/**
 * Generate PWA icons from a base SVG or PNG
 * Place your logo as 'logo.svg' or 'logo.png' in the public folder
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const sizes = [192, 512];
const publicDir = join(process.cwd(), 'public');

// Create a simple SVG icon if none exists
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="280" font-weight="bold" fill="white" text-anchor="middle">VM</text>
</svg>
`.trim();

console.log('📱 Generating PWA icons...\n');

// For Node.js, we'll create SVG files that can be converted later
// In a real project, you'd use sharp or canvas to create PNGs
sizes.forEach(size => {
  const filename = `icon-${size}.png.svg`;
  const filepath = join(publicDir, filename);
  writeFileSync(filepath, svgIcon);
  console.log(`✓ Created ${filename} (rename to .png after converting)`);
});

console.log('\n📝 To complete icon setup:');
console.log('1. Install ImageMagick or use an online SVG to PNG converter');
console.log('2. Convert icon-*.png.svg files to PNG format');
console.log('3. Or replace with your own 192x192 and 512x512 PNG icons\n');
