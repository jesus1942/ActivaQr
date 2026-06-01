import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('./public/icons', { recursive: true });

const SRC = './public/company-logo-hd.png'; // 5000x5000, simbolo arriba + texto abajo

// 1. Trim del blanco para obtener el bloque simbolo+texto.
const recortado = await sharp(SRC).trim({ threshold: 10 }).toBuffer();
const m = await sharp(recortado).metadata();
// El texto ocupa la franja inferior: nos quedamos con el ~64% superior (el simbolo).
const altoSimbolo = Math.round(m.height * 0.76);
const simbolo = await sharp(recortado)
  .extract({ left: 0, top: 0, width: m.width, height: altoSimbolo })
  .trim({ threshold: 10 })
  .toBuffer();

const meta = await sharp(simbolo).metadata();
const ratio = meta.width / meta.height;

// 2. Componer sobre fondo blanco redondeado, simbolo centrado con padding.
const CANVAS = 512;
const PAD = 96; // zona segura para iconos maskable
const maxW = CANVAS - PAD * 2;
const maxH = CANVAS - PAD * 2;
let w = maxW, h = Math.round(maxW / ratio);
if (h > maxH) { h = maxH; w = Math.round(maxH * ratio); }

const simboloResized = await sharp(simbolo)
  .resize(w, h, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toBuffer();

const fondo = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}">
  <rect width="${CANVAS}" height="${CANVAS}" rx="96" fill="#ffffff"/>
  <rect x="6" y="6" width="${CANVAS - 12}" height="${CANVAS - 12}" rx="90" fill="none" stroke="#0f172a" stroke-width="12"/>
</svg>`;

const base = await sharp(Buffer.from(fondo))
  .composite([{ input: simboloResized, left: Math.round((CANVAS - w) / 2), top: Math.round((CANVAS - h) / 2) }])
  .png()
  .toBuffer();

// 3. Exportar todos los tamanos.
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const size of sizes) {
  await sharp(base).resize(size, size).png().toFile(`./public/icons/icon-${size}.png`);
  console.log(`Generated icon-${size}.png`);
}

// Apple touch icon (sin transparencia, fondo blanco).
await sharp(base).resize(180, 180).flatten({ background: '#ffffff' }).png().toFile('./public/apple-touch-icon.png');
// Favicon.
await sharp(base).resize(64, 64).png().toFile('./public/favicon.png');

console.log('Iconos generados desde el logo.');
