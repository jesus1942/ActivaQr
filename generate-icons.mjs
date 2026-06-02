import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('./public/icons', { recursive: true });

const SRC = './public/company-logo-hd.png';

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

// 2. El simbolo original es negro sobre blanco.
//    Lo invertimos y luego tintamos a naranja (#f97316).
const simboloNaranja = await sharp(simbolo)
  .negate({ alpha: false })           // negro -> blanco
  .tint({ r: 249, g: 115, b: 22 })   // blanco -> naranja
  .png()
  .toBuffer();

// 3. Componer sobre fondo negro (#0f172a) con bordes redondeados.
//    Sombra dura neo-brutalista: offset solido a la derecha y abajo.
const CANVAS = 512;
const PAD = 80;
const maxW = CANVAS - PAD * 2;
const maxH = CANVAS - PAD * 2;
let w = maxW, h = Math.round(maxW / ratio);
if (h > maxH) { h = maxH; w = Math.round(maxH * ratio); }

const simboloResized = await sharp(simboloNaranja)
  .resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// Fondo: negro con borde redondeado naranja + sombra dura
const SHADOW = 10;
const fondo = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}">
  <!-- Sombra dura naranja (offset abajo-derecha) -->
  <rect x="${SHADOW}" y="${SHADOW}" width="${CANVAS - SHADOW}" height="${CANVAS - SHADOW}" rx="80" fill="#f97316"/>
  <!-- Fondo negro principal -->
  <rect width="${CANVAS - SHADOW}" height="${CANVAS - SHADOW}" rx="80" fill="#0f172a"/>
  <!-- Borde naranja -->
  <rect x="5" y="5" width="${CANVAS - SHADOW - 10}" height="${CANVAS - SHADOW - 10}" rx="76" fill="none" stroke="#f97316" stroke-width="10"/>
</svg>`;

const base = await sharp(Buffer.from(fondo))
  .composite([{
    input: simboloResized,
    left: Math.round((CANVAS - SHADOW - w) / 2),
    top: Math.round((CANVAS - SHADOW - h) / 2),
  }])
  .png()
  .toBuffer();

// 4. Exportar todos los tamanos
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const size of sizes) {
  await sharp(base).resize(size, size).png().toFile(`./public/icons/icon-${size}.png`);
  console.log(`Generated icon-${size}.png`);
}

// Apple touch icon
await sharp(base).resize(180, 180).flatten({ background: '#0f172a' }).png().toFile('./public/apple-touch-icon.png');
// Favicon
await sharp(base).resize(64, 64).png().toFile('./public/favicon.png');

console.log('Iconos generados — estilo neo-brutalista naranja/negro.');
