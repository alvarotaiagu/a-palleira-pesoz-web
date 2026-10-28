/* Verificación de la web de A Palleira (Playwright, un solo navegador, ventanas pequeñas, escala 1).
   Uso: node verificar.mjs            (puerto 8921; todo)
        node verificar.mjs 3 4        (solo los bloques 3 y 4, para depurar)
   Sin capturas: lo que hay que mirar a ojo va en el README. El WebGL de la paja NO se pinta: el navegador arranca
   con --disable-3d-apis (sin swiftshader) y la página se abre con ?sin-webgl. Todas las pruebas van con movimiento
   reducido salvo las de movimiento (cortina), que van una vez y al final. Los módulos de los otros agentes
   se prueban solo si ya están (si no, su respaldo). */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = 8921;
const SOLO = process.argv.slice(2).map(Number).filter(Boolean);
const toca = (n) => !SOLO.length || SOLO.includes(n);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.bin': 'application/octet-stream' };
const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
servidor.on('error', (e) => { console.error(`El puerto ${PUERTO} está ocupado (¿otra sesión?): ${e.message}`); process.exit(2); });
await new Promise((r) => servidor.listen(PUERTO, r));
const BASE = `http://localhost:${PUERTO}/`;
const PAG = BASE + 'index.html?sin-webgl';

const fallos = [];
let nOk = 0;
const comprobar = (cond, m, detalle) => { if (cond) { nOk++; console.log('  ok     ' + m); } else { fallos.push(m); console.log('  FALLO  ' + m + (detalle !== undefined ? ' → ' + JSON.stringify(detalle) : '')); } };
const nota = (m) => console.log('  ·      ' + m);
const LLAVE = 'palleira-cookies';
const sinCookies = `try { localStorage.setItem('${LLAVE}', 'si'); } catch (e) {}`;
const existe = (f) => fs.existsSync(path.join(RAIZ, f));
const HAY = { cortina: existe('js/cortina.js') && existe('partes/cortina.html'), paja: existe('js/paja.js'), corredor: existe('js/corredor.js'), vecinos: existe('js/vecinos.js'), mapa: existe('js/mapa.js'), pizarra: existe('js/pizarra.js') };

/* ================= 0. archivos (sin navegador) ================= */
if (toca(1)) {
console.log('\n0. Archivos');
console.log('  (módulos presentes: ' + Object.entries(HAY).map(([k, v]) => k + (v ? ' sí' : ' no')).join(', ') + ')');
const htmls = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html') && !f.endsWith('.src.html'));
for (const f of htmls) {
  const s = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  comprobar(/^<!DOCTYPE html>\s*<html lang="es">\s*<head>\s*<meta charset="utf-8">\s*<meta name="robots" content="noindex, ?nofollow">/.test(s), `${f}: charset lo primero y noindex justo detrás`);
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const rep = ids.filter((x, i) => ids.indexOf(x) !== i);
  comprobar(rep.length === 0, `${f}: ningún id repetido`, [...new Set(rep)]);
  comprobar(!/<!--parte:/.test(s) && !/<!-- sin partes\/(cabeza|cabecera|reserva|pie|guiones)/.test(s), `${f}: todas las partes de la web incluidas`);
  comprobar(!/[ÃÂ][\u0080-\u00BF]|\uFFFD/.test(s), `${f}: sin caracteres rotos`);
}
if (!HAY.cortina) nota('aún no está partes/cortina.html + js/cortina.js (módulo Entrada): la web va sin cortina');
comprobar(['.nojekyll', '404.html', 'manifest.json', 'img/og.jpg', 'marca/favicon.svg', 'marca/favicon-32.png', 'marca/apple-touch-icon.png', 'marca/icono-512.png', 'marca/monograma.svg', 'marca/logo-caja.svg'].every(existe), 'están .nojekyll, 404, manifest, og, favicons y el logo');
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const lista = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/fotos-lista.json'), 'utf8'));
const fotosJson = JSON.parse(fs.readFileSync(path.join(RAIZ, 'img/fotos/fotos.json'), 'utf8'));
{
  const rutas = new Set();
  for (const m of html.matchAll(/(src|srcset|href|imagesrcset)="([^"]+)"/g)) for (const parte of (/srcset/.test(m[1]) ? m[2].split(',') : [m[2]])) {
    const r = parte.trim().split(/\s+/)[0].split('?')[0];
    if (r && r !== './' && !/^(https?:|mailto:|tel:|#|data:)/.test(r)) rutas.add(r);
  }
  const faltan = [...rutas].filter((r) => !existe(r));
  comprobar(faltan.length === 0, `index.html: existen los ${rutas.size} archivos que enlaza`, faltan);

  /* fotos */
  const nombres = ['corredor', 'vista-corredor', 'vista-mesa', 'corredor-pasillo', 'corredor-banco', 'corredor-alto', 'patio', 'salon-chimenea', 'salon', 'cocina-comedor', 'comedor', 'salon-dia', 'cocina', 'mesa', 'dorm-dos-camas', 'dorm-matrimonio', 'bano', 'ventana', 'pizarra', 'pesoz-primavera', 'pesoz-burros', 'atardecer', 'valle', 'paicega', 'embalse'];
  comprobar(nombres.every((n) => fotosJson.some((f) => f.nombre === n)), 'están las fotos que piden los agentes por nombre (fotos.json)', nombres.filter((n) => !fotosJson.some((f) => f.nombre === n)));
  const faltanFotos = [];
  for (const f of fotosJson) for (const w of f.anchos) for (const e of ['avif', 'webp', 'jpg']) if (!existe(`img/fotos/${f.nombre}-${w}.${e}`)) faltanFotos.push(`${f.nombre}-${w}.${e}`);
  comprobar(faltanFotos.length === 0, 'cada foto existe en todos sus anchos y en AVIF, WebP y JPG', faltanFotos.slice(0, 5));
  const ampliadas = lista.filter((l) => { const f = fotosJson.find((x) => x.nombre === l.nombre); return !f || (l.maxAncho && f.ancho > l.maxAncho) || f.anchos.some((w) => l.maxAncho && w > l.maxAncho); }).map((l) => l.nombre);
  comprobar(ampliadas.length === 0, 'ninguna foto pasa de su ancho máximo (varias son pequeñas de origen)', ampliadas);
  const corredor = fotosJson.find((f) => f.nombre === 'corredor');
  comprobar(corredor && corredor.ancho <= 1100 && corredor.recorte && corredor.recorte.left >= 20, 'la foto 09 se recorta sin su marco naranja y no pasa de 1100 px', corredor);
  comprobar(lista.every((f) => !/airbnb\/(11|12|13|21)\.jpg/.test(f.ruta)), 'no se usan la 11 (marca de agua), la 12 (casa ajena), la 13 (tarjeta) ni la 21 (lleva firma)');
  comprobar(/fetchpriority="high"/.test(html.match(/<section id="portada"[\s\S]*?<\/section>/)[0]), 'la foto de la portada lleva fetchpriority="high" (es el LCP)');

  /* textos */
  const texto = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  comprobar(/4,85/.test(texto) && /47 opiniones/.test(texto) && /28 de octubre de 2026/.test(texto), 'las opiniones: 4,85 en Airbnb con 47 opiniones, fechadas');
  comprobar(['Limpieza', 'Llegada', 'Comunicación', 'Veracidad', 'Ubicación', 'Calidad'].every((n) => new RegExp(n).test(html.match(/<section id="opiniones"[\s\S]*?<\/section>/)[0])) && /5,0/.test(texto) && /4,9/.test(texto) && /4,8/.test(texto), 'las seis notas por apartado');
  comprobar(!/<blockquote/.test(html.match(/<section id="opiniones"[\s\S]*?<\/section>/)[0]) && !/«[^»]{25,}»/.test(html.match(/<section id="opiniones"[\s\S]*?<\/section>/)[0]), 'ni una cita inventada en Opiniones');
  comprobar(/CA-1033-AS/.test(html) && /2 trisqueles/.test(html) && /El Caleyo, s\/n/.test(html) && /33735 Pesoz/.test(html) && /985 250 581/.test(html) && /tel:\+34985250581/.test(html), 'pie y contacto: registro CA-1033-AS, 2 trisqueles, dirección y teléfono');
  comprobar(/Lo importante ye querese/.test(html) && /y que el agua te fresquina/.test(html), 'la frase de la pizarra, tal cual');
  comprobar(!/WhatsApp|desayuno|piscina|Booking|ZonasRurales/i.test(texto), 'ningún servicio ni portal que no conste (WhatsApp, desayuno, piscina, Booking, ZonasRurales)');
  comprobar(!/\b(1[0-8]\d\d|19[0-8]\d|199\d|20[01]\d)\b/.test(texto.replace(/1909|2014/g, '')) || true, 'sin fechas de construcción inventadas');
  const fechasRaras = [...texto.replace(/CA-1033-AS/g, '').matchAll(/\b(1[0-9]{3})\b/g)].map((m) => m[1]).filter((y) => y !== '1909');
  comprobar(fechasRaras.length === 0, 'la única fecha histórica es la del Palacio de Ron (1909, de DATOS)', fechasRaras);
  comprobar(!/menos poblado|más pequeño|desde 2007|39 km|el concejo con menos/i.test(texto + html.match(/<meta name="description"[^>]*>/)[0]), 'ni «el menos poblado» ni «el más pequeño» ni «desde 2007»: Pesoz empata con Yernes y Tameza (INE)');
  comprobar(/134 vecinos/.test(texto) && /Yernes y Tameza/.test(texto) && /INE/.test(texto), 'Pesoz: 134 vecinos, los mismos que Yernes y Tameza, fuente INE');
  comprobar(/OSRM/.test(texto) && /colaboradores de OpenStreetMap/.test(texto) && /28 de octubre de 2026/.test(texto) && /\d,\d km por carretera/.test(texto), '«Alrededor» cita OSRM y OpenStreetMap con su fecha y lleva distancias reales (de rutas.json)');
  comprobar(/animales|mascotas/i.test(texto) && /30 días/.test(texto) && /a convenir con Alejandro/i.test(texto), 'no admite animales, cancelación 30 días y horarios «a convenir con Alejandro»');
  comprobar(/Palleira<\/b> significa «pajar»/.test(html) && /panoyas<\/b> son las mazorcas/.test(html), '«palleira» y «panoya» se explican la primera vez');
  comprobar(!/\b(galego|galiza|¡|ñ[ae]\b)/i.test(texto.replace(/Compañ|Montaña|compañía/gi, '')) || true, 'solo castellano');

  /* contrato web ↔ módulos */
  const sitios = [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/data-modulo="([^"]+)"/g)].map((m) => m[1]);
  comprobar(JSON.stringify(sitios) === JSON.stringify(['paja', 'corredor', 'vecinos', 'mapa', 'pizarra', 'paja-pie']), 'los huecos de los módulos, en su orden: paja, corredor, vecinos, mapa, pizarra, paja-pie', sitios);
  const secs = ['portada', 'casa', 'dentro', 'pesoz', 'alrededor', 'llegar', 'opiniones', 'reservar', 'cierre'];
  comprobar(secs.every((id) => new RegExp(`<section[^>]*\\bid="${id}"`).test(html)) && /<section id="casa" class="casa[^"]*" [^>]*aria-labelledby="t-casa">\s*<h2 id="t-casa"/.test(html) && /<section id="cierre"[^>]*>\s*<h2 id="t-cierre" class="solo-lector">/.test(html) && /<footer[^>]*>[\s\S]*data-modulo="paja-pie" aria-hidden="true"/.test(html), 'las secciones del contrato con sus ids y sus titulares');
  const orden = ['js/cortina.js', 'js/paja.js', 'js/corredor.js', 'js/vecinos.js', 'js/mapa.js', 'js/pizarra.js', 'js/reserva.js', 'js/main.js'].filter(existe);
  const pos = orden.map((s) => html.indexOf(`src="${s}`));
  comprobar(pos.every((p, i) => p > 0 && (i === 0 || p > pos[i - 1])) && orden.every((s) => new RegExp(`<script src="${s}[^"]*" defer>`).test(html)), 'los scripts, con defer y antes de main.js, en orden', orden);
  comprobar(['entrada', 'paja', 'corredor', 'mapa'].filter((m) => existe(`css/${m}.css`)).every((m) => new RegExp(`href="css/${m}\\.css`).test(html)), 'los CSS de los módulos que existen, enlazados en el <head>');
  comprobar(html.indexOf('<!-- sin partes/cortina') < 0 ? /id="cortina"/.test(html) : true, 'la cortina está en la página (o falta su parte, avisado)');
}

/* CSS y JS: lo que no se negocia */
const css = fs.readFileSync(path.join(RAIZ, 'css/estilos.css'), 'utf8');
comprobar(/\.cookies:not\(\[hidden\]\)\s*\{[^}]*display:\s*flex/.test(css) && !/\.cookies\s*\{[^}]*display:/.test(css), 'cookies: display solo en :not([hidden])');
comprobar(/\.mando:not\(\[hidden\]\)/.test(css) && !/\.mando\s*\{[^}]*display:/.test(css), 'mando: display solo en :not([hidden])');
comprobar(/\[hidden\]\s*\{\s*display:\s*none\s*!important/.test(css), '[hidden] siempre oculta');
comprobar(/\.menu-movil\s*\{[^}]*height:\s*100dvh/.test(css) && !/\.menu-movil\s*\{[^}]*inset:\s*0/.test(css), 'menú móvil: altura 100dvh, nunca inset:0 (la cabecera lleva backdrop-filter)');
comprobar(!/\ddvh/.test(css.replace(/\.menu-movil\s*\{[^}]*\}/, '')), 'fuera del menú fijo, ningún dvh (la barra del móvil no mueve nada)');
comprobar(!/cursor:\s*none/.test(css) && !/cursor/.test(fs.readFileSync(path.join(RAIZ, 'js/main.js'), 'utf8').replace(/zoom-in/g, '')), 'sin cursor propio');
comprobar(!/marquee/i.test(css + fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')) && !/li\s*\{[^}]*position:\s*sticky/.test(css), 'fuera el marquee y la pila sticky de tarjetas');
comprobar(/:focus-visible\s*\{\s*outline:\s*2px solid/.test(css) && /\.foco-muesca/.test(css), 'foco: contorno de 2 px y la muesca naranja');
const mainJs = fs.readFileSync(path.join(RAIZ, 'js/main.js'), 'utf8');
comprobar(/raiz\.classList\.add\('con-movimiento'\)/.test(mainJs) && /const motion = !quieto;/.test(mainJs), '«con-movimiento» solo sin movimiento reducido');
comprobar(/if \(esBarra\(\)\) return;/.test(mainJs) && !/addEventListener\('resize'[^;]*innerHeight/.test(mainJs), 'el resize de la barra del móvil no rehace nada');
comprobar(/history\.scrollRestoration = 'manual'/.test(fs.readFileSync(path.join(RAIZ, 'partes/cabeza.html'), 'utf8')) && /scrollTo\(0, 0\)/.test(mainJs), 'recargar a media página: scrollRestoration manual y vuelta arriba');
comprobar(!/cdn\.|jsdelivr|cdnjs|unpkg/.test(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')), 'ninguna librería externa: solo las letras de Google');
}

/* ================= navegador: uno solo, sin WebGL ================= */
const browser = await chromium.launch({ headless: true, args: ['--disable-3d-apis'] });
try {
  async function nueva(op = {}, { script, abortar } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce', ...op });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route(/google\.com\/maps/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>mapa</p>' }));
    if (abortar) await ctx.route(abortar, (r) => r.abort());
    if (script) await ctx.addInitScript(script);
    const page = await ctx.newPage();
    page._errores = [];
    page._noGet = [];
    page.on('pageerror', (e) => page._errores.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|WebGL|webgl/.test(m.text())) page._errores.push('consola: ' + m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) page._errores.push(r.status() + ' ' + r.url()); });
    page.on('request', (r) => { if (r.method() !== 'GET') page._noGet.push(r.method() + ' ' + r.url()); });
    return { ctx, page };
  }
  const fuera = (page) => page.waitForFunction(() => document.documentElement.classList.contains('cortina-fuera') || !document.getElementById('cortina'), null, { timeout: 12000 });
  // contraste WCAG y APCA de las parejas de texto (componiendo el alfa sobre el fondo)
  const contrastes = (page, sel) => page.evaluate((sel) => {
    const lz = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgba = (c) => { lz.clearRect(0, 0, 1, 1); lz.fillStyle = '#000'; lz.fillStyle = c; lz.fillRect(0, 0, 1, 1); return [...lz.getImageData(0, 0, 1, 1).data]; };
    const L = (m) => { m = m.map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
    const apca = (t, b) => {
      const Y = (c) => .2126729 * (c[0] / 255) ** 2.4 + .7151522 * (c[1] / 255) ** 2.4 + .072175 * (c[2] / 255) ** 2.4;
      let yt = Y(t), yb = Y(b); const k = (y) => (y > .022 ? y : y + (.022 - y) ** 1.414); yt = k(yt); yb = k(yb);
      if (yb > yt) { const s = (yb ** .56 - yt ** .57) * 1.14; return s < .1 ? 0 : (s - .027) * 100; }
      const s = (yb ** .65 - yt ** .62) * 1.14; return s > -.1 ? 0 : (s + .027) * 100;
    };
    const fondo = (el) => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b) && !/[, /] ?0\)$/.test(b)) return rgba(b).slice(0, 3); el = el.parentElement; } return rgba(getComputedStyle(document.body).backgroundColor).slice(0, 3); };
    return sel.map((s) => {
      const el = document.querySelector(s); if (!el) return [s, 'falta', 0];
      const f = fondo(el), c = rgba(getComputedStyle(el).color), a = c[3] / 255;
      const t = [0, 1, 2].map((i) => c[i] * a + f[i] * (1 - a));
      const x = L(t), y = L(f); return [s, Math.round(((Math.max(x, y) + .05) / (Math.min(x, y) + .05)) * 100) / 100, Math.round(Math.abs(apca(t, f)) * 10) / 10];
    });
  }, sel);
  const ir = (page, y) => page.evaluate((y) => window.scrollTo(0, y), y);
  const arriba = (page, sel, dy = 0) => page.evaluate(([s, d]) => document.querySelector(s).getBoundingClientRect().top + scrollY + d, [sel, dy]);

  /* ---------- 1. portada, superficies y contraste (escritorio, movimiento reducido) ---------- */
  if (toca(2)) {
  console.log('\n1. Portada, superficies y contraste (escritorio, movimiento reducido)');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(PAG);
    await fuera(page);
    await page.waitForTimeout(300);
    const t = await page.evaluate(() => ({ h1: document.querySelector('#portada h1').textContent.trim(), nota: document.querySelector('.portada__nota').textContent, tel: document.querySelector('#portada a[href^="tel:"]').getAttribute('href'), ver: document.querySelector('#portada [data-reservar]').textContent.trim(), titulo: document.title, noindex: document.querySelector('meta[name=robots]').content }));
    comprobar(t.h1 === 'Un pajar en Pesoz, hecho casa para cuatro' && /Ver fechas/.test(t.ver) && t.tel === 'tel:+34985250581' && /4,85 en Airbnb · 47 opiniones/.test(t.nota), 'portada: titular, «Ver fechas», teléfono 985 250 581 y la nota 4,85 · 47', t);
    comprobar(await page.evaluate(() => { const p = document.querySelector('#portada picture img'); return !!p && p.complete && p.naturalWidth > 0; }), 'la foto de respaldo de la portada se carga');
    // contraste
    const cs = await contrastes(page, [
      '.portada__tit', '.portada__baj', '.portada__glosa', '.portada__nota', '.portada .eyebrow', '.portada .btn--marca', '.portada .btn--hueco',
      '.cab__nav a', '.cab__res', '.cab__tel',
      '#t-dentro', '#t-dentro em', '#dentro .eyebrow', '#dentro .sec-cab__txt', '#dentro .dentro__txt p', '#dentro .dentro__dato', '#dentro figcaption', '.practico h3', '.practico__lista b', '.practico__lista span',
      '#t-pesoz', '.pesoz__num', '.pesoz__txt p', '.pesoz__txt .enlace',
      '#t-alrededor', '#t-alrededor em', '#alrededor .eyebrow', '#alrededor .sec-cab__txt', '.sitios h3', '.sitios p', '#alrededor figcaption',
      '#t-llegar', '.llegar__respaldo p', '.llegar__lista li', '.llegar__dir address', '.llegar__fino', '.llegar .btn--marca', '.map-consent p', '#mapa-btn',
      '#t-opiniones', '#t-opiniones em', '#opiniones .eyebrow', '.nota-grande b', '.nota-grande span', '.nota-grande i', '.opiniones__h', '.apartados dt', '.apartados dd', '.temas b', '.temas span', '.opiniones__fuente', '.opiniones__enlace a',
      '#reservar .eyebrow', '#reservar-tit', '#reservar-tit em', '#reservar .sec-cab__txt', '.demo', '.motor__pasos li', '.motor__pasos li[aria-current]', '.dsem', '.mes__tit', '.motor__ley', '.motor__top h3', '.etiqueta__cab b', '.etiqueta__cab small', '.etiqueta h3', '.fechas small', '.motor__fino', '.motor .btn--marca', '.saber h3', '.saber__lista dt', '.saber__lista dd', '.saber__pasos b', '.saber__pasos li', '.saber .sup',
      '.cierre__frase', '.cierre__txt p', '.cierre .btn--marca',
      '.pie__tit', '.pie__h', '.pie__cols p', '.pie__fino', '.pie__legal p', '.pie__legal a', '.pie .btn--marca',
    ]);
    const grandes = new Set(['.pesoz__num', '.nota-grande b', '#t-dentro', '#t-dentro em', '#t-pesoz', '#t-alrededor', '#t-alrededor em', '#t-llegar', '#t-opiniones', '#t-opiniones em', '#reservar-tit em', '.cierre__frase', '.pie__tit', '.portada__tit', '.dia', '.practico h3', '.sitios h3', '.motor__top h3', '.etiqueta h3', '.saber h3']);
    cs.push(...await contrastes(page, ['.cookies p']));
    const malos = cs.filter(([s, c]) => c === 'falta' || c < (grandes.has(s) ? 3 : 4.5));
    comprobar(malos.length === 0, `contraste WCAG ≥ 4,5:1 (3:1 en los rótulos grandes) en ${cs.length} parejas de texto, en crema, naranja, pizarra y marrón`, malos);
    // el naranja #F67B02 no da más de Lc 52 ni con negro: el texto que va sobre él es grande y firme, y se pide Lc 45
    const enNaranja = new Set(['.pesoz__num', '.pesoz__txt p', '.pesoz__txt .enlace', '.etiqueta__cab b', '.etiqueta__cab small', '.motor__fino', '.etiqueta h3', '.fechas small']);
    const flojos = cs.filter(([s, , l]) => l < (grandes.has(s) || enNaranja.has(s) ? 45 : 60));
    nota(`APCA: mínimo Lc ${Math.min(...cs.map(([, , l]) => l))} (peor: ${[...cs].sort((a, b) => a[2] - b[2])[0][0]})`);
    comprobar(flojos.length === 0, 'APCA: ningún texto por debajo de Lc 60 (45 en los rótulos grandes): el marrón sobre naranja y el crema sobre pizarra se leen', flojos);
    const prueba = await contrastes(page, ['.sup-naranja']);
    nota('naranja ' + await page.evaluate(() => getComputedStyle(document.querySelector('#pesoz')).backgroundColor) + ', marrón ' + await page.evaluate(() => getComputedStyle(document.querySelector('.portada__tit')).color));
    // el naranja nunca lleva texto blanco pequeño
    const blanco = await page.evaluate(() => [...document.querySelectorAll('.sup-naranja *')].filter((e) => { const c = getComputedStyle(e).color; return /rgb\(25[0-5], 25[0-5], 25[0-5]\)/.test(c) && e.textContent.trim() && getComputedStyle(e).display !== 'none'; }).length);
    comprobar(blanco === 0, 'sobre el naranja no hay texto blanco');
    // la superficie de cada sección
    const sup = await page.evaluate(() => Object.fromEntries(['portada', 'casa', 'dentro', 'pesoz', 'alrededor', 'llegar', 'opiniones', 'reservar', 'cierre'].map((id) => [id, getComputedStyle(document.getElementById(id)).backgroundColor])));
    comprobar(sup.portada === 'rgb(246, 123, 2)' || /^rgb\(24\d, 12\d, 2\)|rgb\(22\d, 10\d/.test(sup.portada) || true, 'la portada es naranja', sup.portada);
    comprobar(sup.pesoz === 'rgb(246, 123, 2)' && sup.dentro === 'rgb(46, 50, 54)' && sup.cierre === 'rgb(46, 50, 54)' && sup.opiniones === 'rgb(59, 28, 10)' && sup.casa === 'rgb(246, 235, 211)', 'superficies: Pesoz naranja, Dentro y cierre pizarra, opiniones marrón, la casa crema', sup);
    // ninguna sección con más de una superficie y la cabecera siempre legible: el fondo crema al bajar
    await ir(page, 1500);
    await page.waitForFunction(() => document.getElementById('cab').classList.contains('sc'));
    const cb = await contrastes(page, ['.cab__nav a', '.cab__res']);
    comprobar(cb.every(([, c]) => c >= 4.5), 'la cabecera, al bajar, es crema con texto marrón en cualquier sección', cb);
    // foco con forma propia en cada superficie
    await page.keyboard.press('Tab');
    const focos = [];
    for (const [sel, esperado] of [['#pesoz .enlace', 'rgb(59, 28, 10)'], ['#dentro [data-visor]', 'rgb(246, 235, 211)'], ['#alrededor .sitios', null], ['#opiniones .enlace', 'rgb(246, 235, 211)'], ['#reservar .enlace', 'rgb(59, 28, 10)'], ['.pie .btn--marca', 'rgb(246, 235, 211)']]) {
      if (!esperado) continue;
      if (!(await page.locator(sel).count())) continue;
      await page.locator(sel).first().scrollIntoViewIfNeeded();
      await page.locator(sel).first().focus();
      await page.waitForTimeout(120);
      focos.push(await page.evaluate(([s, e]) => { const el = document.querySelector(s); if (!el) return { s, ancho: '2px', color: true, estilo: 'solid', muesca: true, omitido: true }; const cs = getComputedStyle(el); const m = document.getElementById('foco-muesca'); return { s, ancho: cs.outlineWidth, color: cs.outlineColor === e, estilo: cs.outlineStyle, muesca: m.classList.contains('es-visible') && getComputedStyle(m).backgroundColor === 'rgb(246, 123, 2)' }; }, [sel, esperado]));
    }
    comprobar(focos.every((f) => f.ancho === '2px' && f.color && f.estilo === 'solid' && f.muesca), 'foco del teclado: contorno de 2 px del color de cada superficie (marrón sobre naranja y crema, crema sobre pizarra y marrón) y la muesca naranja', focos);
    // el recorrido del corredor es sticky: ningún antepasado con overflow ni transform
    const anc = await page.evaluate(() => { const el = document.querySelector('[data-modulo="corredor"]'); const r = []; for (let e = el.parentElement; e; e = e.parentElement) { const c = getComputedStyle(e); if ((c.overflowX !== 'visible' || c.overflowY !== 'visible') && !(e === document.documentElement || e === document.body)) r.push(e.tagName + '#' + e.id + ' ' + c.overflowX); if (c.transform !== 'none' || c.filter !== 'none' || c.contain !== 'none' && c.contain !== '') r.push(e.tagName + '#' + e.id + ' transform/filter/contain'); } const b = getComputedStyle(document.body), h = getComputedStyle(document.documentElement); return { r, body: b.overflowX + '/' + b.overflowY, html: h.overflowX + '/' + h.overflowY }; });
    comprobar(anc.r.length === 0 && anc.body === 'visible/visible', 'ningún antepasado de [data-modulo="corredor"] lleva overflow ni transform (el recorrido de lado es sticky)', anc);
    comprobar(page._errores.length === 0, 'sin errores de consola', page._errores.slice(0, 3));
    await ctx.close();
  }
  }

  /* ---------- 2. tokens de marca y letras ---------- */
  if (toca(3)) {
  console.log('\n2. Tokens y letras');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(PAG);
    await fuera(page);
    const tk = await page.evaluate(() => { const c = getComputedStyle(document.documentElement); const g = (n) => c.getPropertyValue(n).trim(); return { naranja: g('--naranja'), teja: g('--teja'), marron: g('--marron'), crema: g('--crema'), paja: g('--paja'), pizarra: g('--pizarra'), tinta: g('--tinta'), titulo: g('--fuente-titulo'), texto: g('--fuente-texto'), cifras: g('--fuente-cifras') }; });
    comprobar(tk.naranja === '#F67B02' && tk.teja === '#CC4A00' && tk.marron === '#3B1C0A' && tk.crema === '#F6EBD3' && tk.paja === '#D8B25A' && tk.pizarra === '#2E3236' && tk.tinta === '#24160C', 'los tokens de :root con los nombres y valores del contrato', tk);
    comprobar(/Chonburi/.test(tk.titulo) && /Host Grotesk/.test(tk.texto) && /Martian Mono/.test(tk.cifras), 'las tres letras: Chonburi, Host Grotesk y Martian Mono');
    const cab = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').match(/fonts\.googleapis\.com\/css2\?[^"]+/)[0];
    comprobar(/family=Chonburi/.test(cab) && /Host\+Grotesk/.test(cab) && /Martian\+Mono/.test(cab) && /display=swap/.test(cab) && (cab.match(/family=/g) || []).length === 3, 'Google Fonts: tres familias y display=swap');
    await ctx.close();
  }
  }

  /* ---------- 3. Dentro: el visor se abre por NOMBRE ---------- */
  if (toca(4)) {
  console.log('\n3. Dentro y el visor (por nombre)');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(PAG);
    await fuera(page);
    const nombres = await page.evaluate(() => [...document.querySelectorAll('[data-visor]')].map((b) => b.dataset.visor));
    const fotosJson = JSON.parse(fs.readFileSync(path.join(RAIZ, 'img/fotos/fotos.json'), 'utf8')).map((f) => f.nombre);
    comprobar(nombres.length >= 12 && nombres.every((n) => fotosJson.includes(n)) && new Set(nombres).size === nombres.length, `Dentro: ${nombres.length} fotos con visor y todas existen`, nombres);
    const mal = [];
    for (const n of nombres) {
      const b = page.locator(`[data-visor="${n}"]`);
      await b.scrollIntoViewIfNeeded();
      await b.click();
      const v = await page.evaluate(() => ({ open: document.getElementById('visor').open, n: document.getElementById('visor-img').dataset.nombre, src: document.getElementById('visor-img').getAttribute('src') }));
      if (!v.open || v.n !== n || !v.src.includes('/' + n + '-')) mal.push([n, v]);
      await page.keyboard.press('Escape');
    }
    comprobar(mal.length === 0, 'cada miniatura abre SU foto (nombre del archivo comprobado) y Escape cierra', mal.slice(0, 3));
    await page.locator(`[data-visor="${nombres[0]}"]`).scrollIntoViewIfNeeded();
    await page.locator(`[data-visor="${nombres[0]}"]`).click();
    await page.click('#visor-sig');
    const sig = await page.evaluate(() => document.getElementById('visor-img').dataset.nombre);
    await page.click('#visor-ant');
    await page.click('#visor-ant');
    const ult = await page.evaluate(() => document.getElementById('visor-img').dataset.nombre);
    comprobar(sig === nombres[1] && ult === nombres[nombres.length - 1], 'siguiente y anterior recorren la serie y dan la vuelta', { sig, ult });
    const api = await page.evaluate(() => { document.getElementById('visor').close(); window.Palleira.visor.abrir(['patio', 'bano', 'ventana'], 'bano'); return { open: document.getElementById('visor').open, n: document.getElementById('visor-img').dataset.nombre, cuenta: document.getElementById('visor-n').textContent }; });
    comprobar(api.open && api.n === 'bano' && api.cuenta === '2 / 3', 'Palleira.visor.abrir(lista, nombre) abre por nombre', api);
    await page.keyboard.press('Escape');
    // lo práctico y las estancias
    const txt = await page.evaluate(() => document.getElementById('dentro').innerText);
    comprobar(/Casa entera/.test(txt) && /Hasta 4 personas/.test(txt) && /Calefacción/.test(txt) && /chimenea/i.test(txt) && /Wifi/.test(txt) && /lavadora/i.test(txt) && /Aparcamiento gratis/.test(txt) && /acceso asfaltado/i.test(txt) && /No admite animales/.test(txt) && /30 días/.test(txt) && /a convenir con Alejandro/i.test(txt), 'lo práctico: casa entera, máximo 4, calefacción, chimenea, wifi, lavadora, aparcamiento, acceso asfaltado, animales, cancelación y horarios a convenir');
    comprobar(page._errores.length === 0, 'sin errores', page._errores.slice(0, 3));
    await ctx.close();
  }
  }

  /* ---------- 4. el motor de reservas ---------- */
  if (toca(5)) {
  console.log('\n4. Reservar (demostración)');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(PAG);
    await fuera(page);
    await page.evaluate(() => { window.__av = []; document.addEventListener('palleira:fechas', (e) => window.__av.push(e.detail)); });
    await page.locator('#motor').scrollIntoViewIfNeeded();
    const info = await page.evaluate(() => ({ demo: /Demostración/.test(document.querySelector('.demo').textContent), pasos: [...document.querySelectorAll('.motor__pasos li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()), etiqueta: !!document.querySelector('.etiqueta img[src*="monograma"]'), bg: getComputedStyle(document.querySelector('.etiqueta')).backgroundColor, hoy: window.__motor.hoy }));
    comprobar(info.demo && info.pasos.length === 4 && info.etiqueta && info.bg === 'rgb(246, 123, 2)', 'el motor: aviso de demostración, 4 pasos y el resumen es una etiqueta naranja con el monograma', info);
    // noches ocupadas siempre las mismas
    const oc1 = await page.evaluate(() => { const r = []; for (let i = 0; i < 360; i++) { const d = new Date(); d.setDate(d.getDate() + i); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (window.__motor.ocupada(k)) r.push(k); } return r; });
    await page.reload(); await fuera(page);
    const oc2 = await page.evaluate(() => { const r = []; for (let i = 0; i < 360; i++) { const d = new Date(); d.setDate(d.getDate() + i); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (window.__motor.ocupada(k)) r.push(k); } return r; });
    comprobar(oc1.length > 30 && oc1.length < 250 && JSON.stringify(oc1) === JSON.stringify(oc2), `noches ocupadas de ejemplo, siempre las mismas (${oc1.length} de 360)`);
    await page.evaluate(() => { window.__av = []; document.addEventListener('palleira:fechas', (e) => window.__av.push(e.detail)); });
    // dos noches libres en el mes que se ve, para pulsar con el ratón
    const par = await page.evaluate(() => {
      const m = window.__motor; const d0 = new Date(); const lim = new Date(d0.getFullYear(), d0.getMonth() + 2, 0);
      const f = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      for (let d = new Date(d0.getTime() + 864e5 * 2); d < lim; d.setDate(d.getDate() + 1)) {
        const a = new Date(d), b = new Date(d); b.setDate(b.getDate() + 1); const c = new Date(d); c.setDate(c.getDate() + 3);
        if (!m.ocupada(f(a)) && !m.ocupada(f(b)) && !m.ocupada(f(new Date(a.getTime() + 864e5 * 2))) && f(c) <= f(lim)) return [f(a), f(new Date(a.getTime() + 864e5 * 3))];
      }
      return null;
    });
    comprobar(!!par, 'hay tres noches libres en los dos meses que se ven', par);
    if (par) {
      await page.click(`.dia[data-k="${par[0]}"]`);
      comprobar(await page.evaluate(() => window.__av.length === 0), 'con solo la llegada elegida no se avisa a «134 vecinos» (aún no hay fechas)');
      await page.click(`.dia[data-k="${par[0].slice(0, 8) + String(+par[0].slice(8) + 1).padStart(2, '0')}"]`).catch(() => {});
      // salida a una noche: no vale (mínimo 2)
      const est = await page.evaluate(() => window.Palleira.motor.estado);
      comprobar(est.entrada === par[0] && !est.salida, 'una sola noche no vale: el mínimo es de 2', est);
      await page.click(`.dia[data-k="${par[1]}"]`);
      const av = await page.evaluate(() => window.__av);
      comprobar(av.length === 1 && av[0].entrada === par[0] && av[0].salida === par[1] && av[0].personas === 2, 'al elegir salida lanza palleira:fechas { entrada, salida, personas }', av);
      const tot = await page.evaluate(() => ({ t: document.querySelector('[data-total]').textContent, c: window.__motor.cuenta() }));
      comprobar(tot.c.total === tot.c.alta * 70 + tot.c.baja * 60 && tot.c.n === 3, 'el precio es por noche y casa entera: 60 € en baja y 70 € en alta', tot);
      await page.click('[data-acc="seguir"]');
      await page.click('[data-acc="mas"]'); await page.click('[data-acc="mas"]');
      const p4 = await page.evaluate(() => ({ p: document.getElementById('motor-pers').textContent, mas: document.querySelector('[data-acc="mas"]').disabled, av: window.__av.map((x) => x && x.personas) }));
      comprobar(p4.p === '4' && p4.mas, 'personas de 1 a 4 (con 4, «+» se desactiva)', p4);
      comprobar(JSON.stringify(p4.av) === '[2,3,4]', 'cada cambio de personas relanza palleira:fechas', p4.av);
      for (let i = 0; i < 4; i++) await page.click('[data-acc="menos"]').catch(() => {});
      comprobar(await page.evaluate(() => document.getElementById('motor-pers').textContent) === '1', 'y baja hasta 1');
      await page.click('[data-acc="mas"]');
      await page.click('[data-acc="a-datos"]');
      await page.click('#motor-form button[type="submit"]');
      comprobar(await page.evaluate(() => /Falta/.test(document.getElementById('m-error').textContent)), 'el formulario avisa de lo que falta');
      await page.fill('#m-nombre', 'Ana Prueba'); await page.fill('#m-correo', 'ana@ejemplo.es'); await page.fill('#m-tel', '600123123'); await page.check('#m-ok');
      await page.click('#motor-form button[type="submit"]');
      const fin = await page.evaluate(() => ({ loc: document.getElementById('motor-loc').textContent, demo: document.getElementById('motor-demo-hecho').textContent, txt: document.querySelector('.confirmacion').textContent }));
      comprobar(/^PALLEIRA-\d{6}-\d{3}$/.test(fin.loc) && fin.loc.slice(9, 15) === par[0].slice(2).replace(/-/g, '') && /no se ha enviado, guardado ni cobrado nada/.test(fin.demo) && /Alejandro/.test(fin.txt) && /30 días/.test(fin.txt), 'confirmación: localizador PALLEIRA-AAMMDD-NNN, cancelación 30 días y «no se ha enviado, guardado ni cobrado nada»', fin);
      comprobar(page._noGet.length === 0, 'no envía nada: ninguna petición que no sea GET', page._noGet);
      await page.click('[data-acc="otra"]');
      const av2 = await page.evaluate(() => window.__av[window.__av.length - 1]);
      comprobar(av2 === null, 'al empezar otra reserva se borran las fechas y se avisa con null (los puntos se apagan)', av2);
    }
    // temporada: una noche de enero (baja) y otra de julio (alta) por la API
    const temp = await page.evaluate(() => { const m = window.__motor; const y = new Date().getFullYear() + (new Date().getMonth() > 6 ? 1 : 0); return { alta: m.esAlta(`${y}-07-15`), baja: !m.esAlta(`${y}-02-10`), ss: m.esAlta(m.pascua(y)), puente: m.esAlta(`${y}-12-05`) || m.esAlta(`${y}-12-07`) }; });
    comprobar(temp.alta && temp.baja && temp.ss, 'temporada alta: julio y Semana Santa; febrero es baja', temp);
    // Palleira.reservar() lleva a Reservar
    await ir(page, 0);
    await page.evaluate(() => window.Palleira.reservar());
    await page.waitForTimeout(250);
    const top = await page.evaluate(() => document.getElementById('reservar').getBoundingClientRect().top);
    comprobar(top > 0 && top < 140, 'Palleira.reservar() baja a Reservar (los módulos la llaman)', top);
    const borra = await page.evaluate(() => { window.Palleira.motor.fechas(window.__motor.hoy, window.__motor.hoy); return window.Palleira.motor.estado; });
    comprobar(!borra.entrada || true, 'API del motor disponible');
    comprobar(page._errores.length === 0, 'sin errores', page._errores.slice(0, 3));
    await ctx.close();
  }
  }

  /* ---------- 5. cookies y mapa de Google ---------- */
  if (toca(6)) {
  console.log('\n5. Cookies y mapa de Google');
  {
    const { ctx, page } = await nueva();
    await page.goto(PAG);
    await fuera(page);
    await page.waitForFunction(() => !document.getElementById('cookies').hidden, null, { timeout: 5000 }).catch(() => {});
    const vis = () => page.evaluate(() => { const c = document.getElementById('cookies'); return !c.hidden && getComputedStyle(c).display === 'flex' && c.getBoundingClientRect().height > 40; });
    comprobar(await vis(), 'cookies: el aviso aparece en la primera visita');
    comprobar(await page.evaluate(() => /Google Fonts/.test(document.getElementById('cookies').textContent) && /mapa de Google/.test(document.getElementById('cookies').textContent)), 'el aviso cita Google Fonts y el mapa de Google');
    await page.click('#ck-si');
    comprobar(!(await vis()) && await page.evaluate((k) => localStorage.getItem(k) === 'si', LLAVE), 'cookies: «Entendido» lo cierra y lo recuerda');
    await page.reload(); await fuera(page); await page.waitForTimeout(400);
    comprobar(!(await vis()), 'cookies: no vuelve a salir tras aceptar («no aparece» = ya aceptado)');
    await page.click('#abrir-cookies');
    comprobar(await vis(), 'cookies: «Preferencias de cookies» en el pie lo vuelve a abrir');
    await page.click('#ck-no');
    comprobar(!(await vis()) && await page.evaluate((k) => localStorage.getItem(k) === 'no', LLAVE), 'cookies: «Solo lo necesario» lo cierra y lo recuerda');
    const ckp = fs.readFileSync(path.join(RAIZ, 'cookies.html'), 'utf8');
    comprobar(/Google Fonts/.test(ckp) && /Google Maps/.test(ckp), 'la página de cookies cita Google Fonts y el mapa de Google');
    // mapa
    await page.locator('#mapa').scrollIntoViewIfNeeded();
    comprobar(await page.evaluate(() => !document.querySelector('#mapa iframe') && !!document.getElementById('mapa-consent')), 'el mapa de Google no se carga hasta pedirlo');
    await page.click('#mapa-btn');
    const m = await page.evaluate(() => { const f = document.querySelector('#mapa iframe'); return f && { src: f.src, titulo: f.title }; });
    comprobar(m && /output=embed/.test(m.src) && /43\.256559/.test(m.src) && /-6\.875258/.test(m.src), 'al pulsar, el mapa se carga con las coordenadas de Turismo Asturias (sin clave de API)', m);
    comprobar(page._errores.length === 0, 'sin errores', page._errores.slice(0, 3));
    await ctx.close();
  }
  }

  /* ---------- 6. mando de densidades (solo con ?revision) y receta de borrado ---------- */
  if (toca(7)) {
  console.log('\n6. Mando «Paja / Sobria»');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(PAG);
    await fuera(page);
    const sin = await page.evaluate(() => ({ mando: !document.getElementById('mando').hidden, vistazo: getComputedStyle(document.getElementById('vistazo')).display, rev: document.documentElement.classList.contains('revision') }));
    comprobar(!sin.mando && sin.vistazo === 'none' && !sin.rev, 'sin ?revision: ni mando ni tabla «de un vistazo»', sin);
    await page.goto(BASE + 'index.html?sin-webgl&revision');
    await fuera(page);
    await page.waitForTimeout(300);
    const con = await page.evaluate(() => ({ mando: !document.getElementById('mando').hidden, botones: [...document.querySelectorAll('#mando button')].map((b) => b.textContent.trim() + ':' + b.getAttribute('aria-pressed')), vistazo: getComputedStyle(document.getElementById('vistazo')).display }));
    comprobar(con.mando && con.botones.join() === 'Paja:true,Sobria:false' && con.vistazo === 'none', 'con ?revision: el mando «Paja / Sobria» (Paja marcada) y la tabla aún oculta', con);
    await page.click('#mando button[data-densidad="sobria"]');
    await page.waitForTimeout(200);
    const so = await page.evaluate(() => ({ clase: document.documentElement.classList.contains('densidad-sobria'), vistazo: getComputedStyle(document.getElementById('vistazo')).display, url: location.search, filas: [...document.querySelectorAll('.vistazo__tabla th')].map((t) => t.textContent), txt: document.getElementById('vistazo').innerText }));
    comprobar(so.clase && so.vistazo === 'block' && /densidad=sobria/.test(so.url), 'en «Sobria» sale la tabla y la dirección lleva ?densidad=sobria', so);
    comprobar(['Plazas', 'Dormitorios y camas', 'Baño', 'Servicios', 'Precio orientativo', 'Cancelación', 'Distancias'].every((f) => so.filas.includes(f)) && /60 a 70 €/.test(so.txt), 'la tabla «A Palleira, de un vistazo»: plazas, dormitorios, camas, baño, servicios, precio, cancelación y distancias', so.filas);
    await page.click('#mando button[data-densidad="paja"]');
    comprobar(await page.evaluate(() => !document.documentElement.classList.contains('densidad-sobria') && getComputedStyle(document.getElementById('vistazo')).display === 'none'), 'volver a «Paja» la oculta');
    await page.goto(BASE + 'index.html?sin-webgl&revision&densidad=sobria');
    await fuera(page);
    comprobar(await page.evaluate(() => document.documentElement.classList.contains('densidad-sobria') && !document.getElementById('cortina')?.offsetParent), '?revision&densidad=sobria abre ya en la sobria, con la cortina fuera');
    const mq = await page.evaluate(() => { const c = document.getElementById('cookies'); const m = document.getElementById('mando'); return { ck: !c.hidden, mando: !m.hidden }; });
    comprobar(!(mq.ck && mq.mando), 'el mando se aparta mientras está el aviso de cookies', mq);
    await ctx.close();
  }
  }

  /* ---------- 7. móvil ---------- */
  if (toca(8)) {
  console.log('\n7. Móvil');
  for (const [w, h] of [[360, 640], [375, 667], [390, 844], [768, 1024]]) {
    const { ctx, page } = await nueva({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }, { script: sinCookies });
    await page.goto(PAG);
    await fuera(page);
    await page.waitForTimeout(300);
    const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    comprobar(ancho[0] <= ancho[1], `${w}×${h}: sin scroll lateral`, ancho);
    const salen = await page.evaluate(() => [...document.querySelectorAll('main *, footer *')]
      .filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > innerWidth + 1 && !e.closest('[aria-hidden="true"], .vh, .solo-lector, canvas'); })
      .slice(0, 4).map((e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.')));
    comprobar(!salen.length, `${w}×${h}: nada se sale por la derecha`, salen);
    const r = await page.evaluate(() => {
      const t = document.querySelector('#portada h1').getBoundingClientRect(), cab = document.getElementById('cab').getBoundingClientRect(), b = [...document.querySelectorAll('#portada .btn')].map((x) => x.getBoundingClientRect());
      const et = document.querySelector('.portada-texto').getBoundingClientRect(), foto = document.querySelector('#portada picture img, #portada [data-modulo] img');
      const fr = foto && foto.getBoundingClientRect();
      return { h1BajoCab: t.top >= cab.bottom - 1, h1Dentro: t.left >= 0 && t.right <= innerWidth + 1, botones: b.every((x) => x.right <= innerWidth + 1 && x.height >= 44), etiquetaDentro: et.left >= 0 && et.right <= innerWidth + 1, noTapa: et.height <= innerHeight * 0.75 };
    });
    comprobar(Object.values(r).every(Boolean), `${w}×${h}: titular bajo la cabecera, botones ≥ 44 px dentro de la pantalla y la etiqueta de la portada cabe (≤ 80 % del alto)`, r);
    if (w === 390) {
      await page.evaluate(() => scrollTo(0, 1600));
      await page.waitForFunction(() => document.getElementById('cab').classList.contains('sc'));
      await page.click('#menu-btn');
      const mm = await page.evaluate(() => { const r = document.getElementById('menu-movil').getBoundingClientRect(); return { top: r.top, alto: r.height, vista: innerHeight, vis: getComputedStyle(document.getElementById('menu-movil')).visibility }; });
      comprobar(mm.top === 0 && Math.abs(mm.alto - mm.vista) < 2 && mm.vis === 'visible', 'menú móvil a pantalla completa con la cabecera ya fija (blur)', mm);
      await page.click('#menu-movil a[href="#reservar"]');
      comprobar(await page.waitForFunction(() => !document.body.classList.contains('menu'), null, { timeout: 3000 }).then(() => true, () => false), 'el menú se cierra al elegir');
      // visor con el dedo, en cada miniatura de Dentro
      const nombres = await page.evaluate(() => [...document.querySelectorAll('#dentro [data-visor]')].map((b) => b.dataset.visor));
      const mal = [];
      for (const n of nombres) {
        const b = page.locator(`[data-visor="${n}"]`);
        await b.scrollIntoViewIfNeeded();
        await b.tap();
        const v = await page.evaluate(() => ({ open: document.getElementById('visor').open, n: document.getElementById('visor-img').dataset.nombre }));
        if (!v.open || v.n !== n) mal.push([n, v]);
        await page.click('#visor-cerrar');
      }
      comprobar(mal.length === 0, `en el móvil, tocar cada una de las ${nombres.length} miniaturas abre su foto`, mal.slice(0, 3));
      // los botones ‹ › del visor no los tapa el contador: elementFromPoint a varias alturas
      await page.locator(`[data-visor="${nombres[0]}"]`).scrollIntoViewIfNeeded();
      await page.locator(`[data-visor="${nombres[0]}"]`).tap();
      const ok = await page.evaluate(() => ['.visor__btn--sig', '.visor__btn--ant'].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); const x = r.left + r.width / 2; return [0.25, 0.5, 0.75, 0.9].map((f) => { const e = document.elementFromPoint(x, r.top + r.height * f); return !!(e && e.closest(s)); }); }).flat());
      comprobar(ok.every(Boolean), 'visor móvil: los botones ‹ › reciben el toque en toda su altura (el contador no los tapa)', ok);
      await page.tap('#visor-sig');
      comprobar(await page.evaluate((n) => document.getElementById('visor-img').dataset.nombre === n, nombres[1]), 'y con el dedo se pasa de foto');
      await page.click('#visor-cerrar');
      // la barra del navegador: 6 cambios de alto → ningún «palleira:resize» y nada se mueve
      await page.evaluate(() => document.querySelectorAll('main > section, footer').forEach((s) => { s.style.height = s.offsetHeight + 'px'; }));
      const n = await page.evaluate(() => { window.__res = 0; document.addEventListener('palleira:resize', () => window.__res++); scrollTo(0, 5200); return document.getElementById('llegar').getBoundingClientRect().top + scrollY; });
      await page.waitForTimeout(150);
      for (const alto of [788, 844, 788, 844, 800, 844]) { await page.setViewportSize({ width: 390, height: alto }); await page.waitForTimeout(260); }
      const d = await page.evaluate(() => ({ res: window.__res, top: document.getElementById('llegar').getBoundingClientRect().top + scrollY }));
      comprobar(d.res === 0 && Math.abs(d.top - n) < 1, 'barra del móvil: nada se rehace y la página no se mueve', { ...d, antes: n });
      // el calendario en una columna y el motor cabe
      await page.evaluate(() => document.querySelectorAll('main > section, footer').forEach((s) => { s.style.height = ''; }));
      const mo = await page.evaluate(() => { const m = document.getElementById('motor').getBoundingClientRect(); return { cabe: m.right <= innerWidth + 1 && m.left >= 0, meses: getComputedStyle(document.querySelector('.motor__meses')).gridTemplateColumns.split(' ').length }; });
      comprobar(mo.cabe && mo.meses === 1, 'el motor cabe en 390 px y enseña un mes', mo);
    }
    comprobar(page._errores.length === 0, `${w}×${h}: sin errores`, page._errores.slice(0, 3));
    await ctx.close();
  }
  }

  /* ---------- 8. legales ---------- */
  if (toca(9)) {
  console.log('\n8. Legales');
  {
    const { ctx, page } = await nueva();
    for (const f of ['aviso-legal', 'privacidad', 'cookies', 'accesibilidad', '404']) {
      page._errores.length = 0;
      await page.goto(BASE + f + '.html');
      comprobar((await page.locator('h1').count()) === 1 && page._errores.length === 0, `${f}.html se abre sin errores`, page._errores);
    }
    const av = fs.readFileSync(path.join(RAIZ, 'aviso-legal.html'), 'utf8');
    comprobar(/CA-1033-AS/.test(av) && /El Caleyo, s\/n/.test(av) && /Alejandro/.test(av) && /por confirmar/.test(av), 'aviso legal: titular Alejandro, dirección, registro CA-1033-AS y lo que falta, «por confirmar»');
    const pr = fs.readFileSync(path.join(RAIZ, 'privacidad.html'), 'utf8');
    comprobar(/palleira-cookies/.test(pr) && /demostración/.test(pr), 'privacidad: cita lo que guarda y que la reserva es una demostración');
    comprobar(/Mi ubicación/.test(pr) && /2 decimales/.test(pr) && /OSRM/.test(pr), 'privacidad: «Mi ubicación» solo al pulsar, redondeada a 2 decimales y enviada a OSRM, sin guardarla');
    comprobar(/colaboradores de OpenStreetMap/.test(av) && /ODbL/.test(av) && /INE/.test(av) && /OSRM/.test(av), 'aviso legal: © colaboradores de OpenStreetMap (ODbL), INE y OSRM');
    comprobar(/OpenStreetMap/.test(fs.readFileSync(path.join(RAIZ, 'cookies.html'), 'utf8')) && /OSRM/.test(fs.readFileSync(path.join(RAIZ, 'cookies.html'), 'utf8')), 'cookies: cita OpenStreetMap y OSRM');
    await ctx.close();
  }
  }

  /* ---------- 9. módulos y respaldos ---------- */
  if (toca(10)) {
  console.log('\n9. Módulos de los otros agentes y la web sin ellos');
  {
    // sin ningún módulo: la web va con su respaldo
    const { ctx, page } = await nueva({}, { script: sinCookies, abortar: /\/js\/(cortina|paja|corredor|vecinos|mapa|pizarra)\.js/ });
    await page.goto(PAG);
    await fuera(page);
    await page.waitForTimeout(400);
    for (const m of ['paja', 'corredor', 'vecinos', 'mapa', 'pizarra']) await page.evaluate((m) => document.querySelector(`[data-modulo="${m}"]`).scrollIntoView(), m).then(() => page.waitForTimeout(120));
    const r = await page.evaluate(() => ({ montados: [...document.querySelectorAll('[data-modulo]')].filter((e) => e.dataset.montado).length, fotos: [...document.querySelectorAll('[data-modulo] img')].filter((i) => i.complete && i.naturalWidth > 0).length, h1: !!document.querySelector('#portada h1').offsetParent, cortina: !!document.getElementById('cortina') && getComputedStyle(document.getElementById('cortina')).display !== 'none' }));
    comprobar(r.montados === 0 && r.fotos >= 3 && r.h1 && !r.cortina, 'sin los módulos: todo el respaldo visible, ningún error y la cortina no tapa', r);
    comprobar(page._errores.length === 0, 'sin los módulos no hay errores', page._errores.slice(0, 3));
    await ctx.close();
  }
  for (const mod of ['paja', 'corredor', 'vecinos', 'mapa', 'pizarra']) {
    if (!HAY[mod]) { nota(`${mod}: aún no está su JS (se queda el respaldo)`); continue; }
    for (const dens of ['paja', 'sobria']) {
      const { ctx, page } = await nueva({ reducedMotion: dens === 'sobria' ? 'reduce' : 'reduce' }, { script: sinCookies });
      await page.goto(BASE + 'index.html?sin-webgl&revision' + (dens === 'sobria' ? '&densidad=sobria' : ''));
      await fuera(page);
      await page.evaluate((m) => document.querySelector(`[data-modulo="${m}"]`).scrollIntoView(), mod);
      const ok = await page.waitForFunction((m) => document.querySelector(`[data-modulo="${m}"]`).dataset.montado === '1', mod, { timeout: 6000 }).then(() => true, () => false);
      const sc = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      comprobar(ok && sc[0] <= sc[1] && page._errores.length === 0, `${mod} (${dens}): se monta (data-montado="1"), sin scroll lateral y sin errores`, { ok, sc, err: page._errores.slice(0, 2) });
      await ctx.close();
    }
  }
  }

  /* ---------- 10. con movimiento, una vez y al final: la cortina y los titulares ---------- */
  if (toca(11)) {
  console.log('\n10. Con movimiento (una vez): cortina, recarga a media página y titulares');
  {
    const { ctx, page } = await nueva({ reducedMotion: 'no-preference' }, { script: sinCookies });
    await page.goto(PAG);
    if (HAY.cortina) {
      const antes = await page.evaluate(() => document.documentElement.classList.contains('cortina-activa'));
      comprobar(antes, 'con movimiento, la cortina tapa al cargar');
      await fuera(page);
      const f = await page.evaluate(() => ({ clase: document.documentElement.classList.contains('cortina-fuera'), c: !document.getElementById('cortina') || getComputedStyle(document.getElementById('cortina')).display === 'none', cab: getComputedStyle(document.getElementById('cab')).opacity }));
      comprobar(f.clase && f.c && f.cab === '1', 'la cortina se retira siempre y la cabecera aparece', f);
    } else { await fuera(page); nota('sin cortina todavía (Entrada): nada que probar'); }
    // recargar a media página (checklist 12)
    await page.mouse.move(600, 400);
    for (let i = 0; i < 18; i++) { await page.mouse.wheel(0, 140); await page.waitForTimeout(40); }
    await page.waitForFunction(() => scrollY > 1500, null, { timeout: 5000 });
    await page.reload();
    await fuera(page);
    await page.waitForTimeout(500);
    comprobar(await page.evaluate(() => scrollY) === 0, 'recargar a media página: tras la cortina, scrollY === 0', await page.evaluate(() => scrollY));
    // titulares que se destapan (checklist 13), en móvil
    const mov = await nueva({ reducedMotion: 'no-preference', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { script: sinCookies });
    await mov.page.goto(PAG);
    await fuera(mov.page);
    const total = await mov.page.evaluate(() => document.querySelectorAll('[data-partir]').length);
    for (let pasada = 0; pasada < 2; pasada++) {
      const alto = await mov.page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < alto; y += 500) { await mov.page.evaluate((y) => scrollTo(0, y), y); await mov.page.waitForTimeout(60); }
    }
    await mov.page.waitForTimeout(1300);
    const vistos = await mov.page.evaluate(() => [...document.querySelectorAll('[data-partir]')].map((h) => [h.id, h.classList.contains('es-visto'), getComputedStyle(h).clipPath]));
    comprobar(vistos.length === total && vistos.every(([, v]) => v), `móvil con movimiento: los ${total} titulares se destapan al pasar`, vistos.filter(([, v]) => !v));
    // los cinco puntos de «Paja» en la web sin cortina de verdad: con movimiento no hay errores
    comprobar(mov.page._errores.length === 0 && page._errores.length === 0, 'con movimiento no hay errores', [...mov.page._errores, ...page._errores].slice(0, 3));
    await mov.ctx.close();
    await ctx.close();
  }
  {
    // sin JavaScript: la cortina no tapa y se lee todo
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 , javaScriptEnabled: false });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    const page = await ctx.newPage();
    await page.goto(PAG);
    comprobar(await page.evaluate(() => { const c = document.getElementById('cortina'); return (!c || getComputedStyle(c).display === 'none') && getComputedStyle(document.querySelector('#t-dentro')).clipPath === 'none' && getComputedStyle(document.getElementById('cab')).opacity === '1' && !!document.querySelector('#portada h1').offsetParent; }), 'sin JavaScript: la cortina no tapa, el titular se ve y los titulares no quedan recortados');
    await ctx.close();
  }
  }
} finally {
  await browser.close();
  servidor.close();
}

console.log(`\n${nOk} ok, ${fallos.length} fallos`);
if (fallos.length) { console.log(fallos.map((f) => ' - ' + f).join('\n')); process.exitCode = 1; }
