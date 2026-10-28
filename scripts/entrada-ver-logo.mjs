/* Renderiza marca/logo-caja.svg, logo.svg (sobre crema) y monograma.svg en UNA imagen a escala 1, solo para que el
   agente Entrada compare su redibujo con el recorte. No es una prueba de la web.
   Uso: node scripts/entrada-ver-logo.mjs salida.png */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');
const salida = process.argv[2] || 'logo.png';
const u = (f) => pathToFileURL(path.join(RAIZ, 'marca', f)).href;
const html = path.join(RAIZ, 'marca', '.ver-logo.tmp.html');
fs.writeFileSync(html, `<!doctype html><body style="margin:0;background:#F67B02"><div style="display:flex;gap:10px;align-items:flex-start">
  <img src="${u('logo-caja.svg')}" width="640" style="display:block">
  <div style="background:#F6EBD3;padding:10px"><img src="${u('monograma.svg')}" height="150" style="display:block"></div>
  </div><div style="background:#F6EBD3;padding:8px;margin-top:10px;width:440px"><img src="${u('logo.svg')}" width="420" style="display:block"></div></body>`);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 520 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(html).href);
  await page.waitForTimeout(300);
  await page.screenshot({ path: salida });
} finally { await browser.close(); fs.rmSync(html, { force: true }); }
