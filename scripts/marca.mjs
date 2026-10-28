/* Favicons, iconos e imagen para compartir de A Palleira, a partir del logo redibujado por Entrada
   (marca/monograma.svg = A + P; marca/logo-caja.svg = el logo entero sobre su caja teja).
   Uso: node scripts/marca.mjs   (necesita antes img/fotos/ de scripts/fotos.mjs)
   Escribe marca/favicon.svg, favicon-32.png, apple-touch-icon.png, icono-512.png e img/og.jpg (1200×630). */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const NARANJA = '#F67B02', MARRON = '#3B1C0A', CREMA = '#F6EBD3';
const mono = fs.readFileSync(path.join(RAIZ, 'marca/monograma.svg'), 'utf8').replace(/<\?xml[^>]*\?>\s*/, '');
const caja = path.join(RAIZ, 'marca/logo-caja.svg');
const vb = /viewBox="([^"]+)"/.exec(mono)[1].split(/\s+/).map(Number);   // x y w h
const rel = vb[2] / vb[3];

// el monograma centrado sobre un cuadrado naranja con borde marrón
async function icono(tam, radio) {
  const lado = tam * 0.72, alto = lado, ancho = lado * rel;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}">
    <rect width="${tam}" height="${tam}" rx="${radio}" fill="${NARANJA}"/>
    <rect x="${tam * 0.02}" y="${tam * 0.02}" width="${tam * 0.96}" height="${tam * 0.96}" rx="${radio * 0.9}" fill="none" stroke="${MARRON}" stroke-width="${Math.max(1, tam * 0.02)}"/>
    <svg x="${(tam - ancho) / 2}" y="${(tam - alto) / 2}" width="${ancho}" height="${alto}" viewBox="${vb.join(' ')}">${mono.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg>
  </svg>`;
  return Buffer.from(svg);
}
const ico = async (t, r) => sharp(await icono(t * 4, r * 4), { density: 72 }).resize(t, t, { kernel: 'lanczos3' }).png().toBuffer();
fs.writeFileSync(path.join(RAIZ, 'marca/favicon-32.png'), await ico(32, 6));
fs.writeFileSync(path.join(RAIZ, 'marca/apple-touch-icon.png'), await ico(180, 0));
fs.writeFileSync(path.join(RAIZ, 'marca/icono-512.png'), await ico(512, 0));
fs.writeFileSync(path.join(RAIZ, 'marca/favicon.svg'), (await icono(64, 12)).toString());

// og:image 1200×630: naranja, el logo entero a la izquierda y el corredor a la derecha
const logo = await sharp(caja, { density: 144 }).resize({ width: 560 }).png().toBuffer();
const lm = await sharp(logo).metadata();
const foto = await sharp(path.join(RAIZ, 'img/fotos/corredor-1024.jpg')).resize(540, 520, { fit: 'cover', position: 'centre' }).png().toBuffer();
const base = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${NARANJA}"/>
  <rect x="24" y="24" width="1152" height="582" rx="22" fill="none" stroke="${MARRON}" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
  <text x="60" y="${60 + lm.height + 70}" font-family="Georgia, serif" font-size="40" fill="${MARRON}">Un pajar en Pesoz,</text>
  <text x="60" y="${60 + lm.height + 120}" font-family="Georgia, serif" font-size="40" fill="${MARRON}">hecho casa para cuatro</text>
  <text x="60" y="${60 + lm.height + 170}" font-family="Consolas, monospace" font-size="18" letter-spacing="1" fill="${MARRON}">CASA DE ALDEA ENTERA · PESOZ, ASTURIAS</text>
  <rect x="618" y="52" width="546" height="526" rx="14" fill="${CREMA}" stroke="${MARRON}" stroke-width="3"/>
</svg>`;
await sharp(Buffer.from(base)).composite([
  { input: logo, left: 60, top: 60 },
  { input: foto, left: 621, top: 55 },
]).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(RAIZ, 'img/og.jpg'));
console.log('marca/ (favicon, iconos) e img/og.jpg listos');
