import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('./public/icons', { recursive: true });

const SRC = './public/company-logo-hd.png';

// Paleta nueva (mockup): turquesa + navy profundo
const TEAL = { r: 45, g: 212, b: 191 };   // #2DD4BF (símbolo, brillante)
const TEAL_HEX = '#14B8A6';                 // borde
const NAVY = '#0B1120';                     // fondo

// 1. Extraer solo el simbolo (parte superior del logo)
const recortado = await sharp(SRC).trim({ threshold: 10 }).toBuffer();
const m = await sharp(recortado).metadata();
const altoSimbolo = Math.round(m.height * 0.76);
const simbolo = await sharp(recortado)
  .extract({ left: 0, top: 0, width: m.width, height: altoSimbolo })
  .trim({ threshold: 10 })
  .toBuffer();

const meta = await sharp(simbolo).metadata();
const ratio = meta.width / meta.height;

// 2. El simbolo original es negro sobre blanco -> invertir y tintar turquesa.
const simboloTeal = await sharp(simbolo)
  .negate({ alpha: false })
  .tint(TEAL)
  .png()
  .toBuffer();

// 3. Componer sobre fondo navy con bordes redondeados + glow turquesa sutil.
const CANVAS = 512;
const PAD = 84;
const maxW = CANVAS - PAD * 2;
const maxH = CANVAS - PAD * 2;
let w = maxW, h = Math.round(maxW / ratio);
if (h > maxH) { h = maxH; w = Math.round(maxH * ratio); }

const simboloResized = await sharp(simboloTeal)
  .resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const fondo = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="#13233a"/>
      <stop offset="100%" stop-color="${NAVY}"/>
    </radialGradient>
  </defs>
  <rect width="${CANVAS}" height="${CANVAS}" rx="96" fill="url(#g)"/>
  <rect x="6" y="6" width="${CANVAS - 12}" height="${CANVAS - 12}" rx="90" fill="none" stroke="${TEAL_HEX}" stroke-width="8" stroke-opacity="0.85"/>
</svg>`;

const base = await sharp(Buffer.from(fondo))
  .composite([{
    input: simboloResized,
    left: Math.round((CANVAS - w) / 2),
    top: Math.round((CANVAS - h) / 2),
  }])
  .png()
  .toBuffer();

// 4. Exportar todos los tamanos
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const size of sizes) {
  await sharp(base).resize(size, size).png().toFile(`./public/icons/icon-${size}.png`);
  console.log(`Generated icon-${size}.png`);
}

// Apple touch icon + favicon
await sharp(base).resize(180, 180).flatten({ background: NAVY }).png().toFile('./public/apple-touch-icon.png');
await sharp(base).resize(64, 64).png().toFile('./public/favicon.png');

// 5. Miniatura para previews (og:image 1200x630): logo + nombre sobre navy con glow.
const OGW = 1200, OGH = 630;
const ogSimbolo = await sharp(simboloTeal)
  .resize(260, 260, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
const ogFondo = `<svg xmlns="http://www.w3.org/2000/svg" width="${OGW}" height="${OGH}">
  <defs>
    <radialGradient id="og" cx="30%" cy="20%" r="90%">
      <stop offset="0%" stop-color="#13283f"/>
      <stop offset="100%" stop-color="${NAVY}"/>
    </radialGradient>
  </defs>
  <rect width="${OGW}" height="${OGH}" fill="url(#og)"/>
  <path d="M -50 180 C 300 60, 250 360, 600 260 C 950 160, 900 460, 1300 360" stroke="${TEAL_HEX}" stroke-opacity="0.35" stroke-width="3" fill="none"/>
  <path d="M -50 420 C 300 320, 300 560, 650 460 C 1000 360, 950 600, 1300 520" stroke="#22D3EE" stroke-opacity="0.25" stroke-width="2" fill="none"/>
  <text x="600" y="500" font-family="Manrope, Arial, sans-serif" font-size="84" font-weight="800" fill="#F1F5F9" text-anchor="middle">ActivaQR</text>
  <text x="600" y="552" font-family="Inter, Arial, sans-serif" font-size="30" fill="#2DD4BF" text-anchor="middle" letter-spacing="6">ACTIVOS BAJO CONTROL</text>
</svg>`;
await sharp(Buffer.from(ogFondo))
  .composite([{ input: ogSimbolo, left: Math.round((OGW - 260) / 2), top: 70 }])
  .png()
  .toFile('./public/og-image.png');
console.log('Generated og-image.png');

console.log('Iconos + miniatura generados — turquesa/navy.');
