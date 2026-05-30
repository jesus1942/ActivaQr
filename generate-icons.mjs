import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('./public/icons', { recursive: true });

// Orange QR-like icon SVG
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#1E293B"/>
  <!-- QR corner squares -->
  <rect x="60" y="60" width="160" height="160" rx="16" fill="#F97316"/>
  <rect x="80" y="80" width="120" height="120" rx="8" fill="#1E293B"/>
  <rect x="100" y="100" width="80" height="80" rx="4" fill="#F97316"/>

  <rect x="292" y="60" width="160" height="160" rx="16" fill="#F97316"/>
  <rect x="312" y="80" width="120" height="120" rx="8" fill="#1E293B"/>
  <rect x="332" y="100" width="80" height="80" rx="4" fill="#F97316"/>

  <rect x="60" y="292" width="160" height="160" rx="16" fill="#F97316"/>
  <rect x="80" y="312" width="120" height="120" rx="8" fill="#1E293B"/>
  <rect x="100" y="332" width="80" height="80" rx="4" fill="#F97316"/>

  <!-- QR dots -->
  <rect x="292" y="292" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="340" y="292" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="388" y="292" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="436" y="292" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="292" y="340" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="388" y="340" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="292" y="388" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="340" y="388" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="436" y="388" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="292" y="436" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="388" y="436" width="36" height="36" rx="4" fill="#F97316"/>
  <rect x="436" y="436" width="36" height="36" rx="4" fill="#F97316"/>
</svg>`;

const svgBuffer = Buffer.from(svg);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(`./public/icons/icon-${size}.png`);
  console.log(`Generated icon-${size}.png`);
}

// Apple touch icon
await sharp(svgBuffer).resize(180, 180).png().toFile('./public/apple-touch-icon.png');
// Favicon
await sharp(svgBuffer).resize(32, 32).png().toFile('./public/favicon.png');

console.log('All icons generated!');
