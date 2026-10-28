/* Genera las páginas a partir de sus fuentes *.src.html:
   1. <!--parte:partes/archivo.html--> → el contenido de ese archivo. Si no existe (la cortina mientras
      el módulo Entrada no la deje), deja un comentario y la web funciona sin ella.
   2. <img data-foto="nombre" ...> → <picture> con AVIF, WebP y JPG en todos los anchos de
      img/fotos/fotos.json (el <img> conserva sus demás atributos).
   3. Los <link> y <script> de CSS/JS propios que aún no existen (los módulos de otros agentes
      mientras no estén) se quitan con un aviso: la web no pide archivos que no hay.
   4. Ejecuta versionar.mjs para poner ?v=<huella> a CSS y JS.
   Se edita SIEMPRE el *.src.html (o la parte); el .html generado se sobrescribe. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const FOTOS = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, 'img/fotos/fotos.json'), 'utf8')).map((f) => [f.nombre, f]));

function picture(atrs) {
  const nombre = /data-foto="([^"]+)"/.exec(atrs)[1];
  const f = FOTOS.get(nombre);
  if (!f) throw new Error('Foto desconocida: ' + nombre);
  const sizes = (/\bsizes="([^"]+)"/.exec(atrs) || [, '100vw'])[1];
  const set = (ext) => f.anchos.map((w) => `img/fotos/${nombre}-${w}.${ext} ${w}w`).join(', ');
  const base = f.anchos.includes(800) ? 800 : f.anchos[f.anchos.length - 1];
  let resto = atrs.replace(/\s*data-foto="[^"]+"/, '').replace(/\s*\bsizes="[^"]+"/, '');
  if (!/\bloading=/.test(resto) && !/fetchpriority="high"/.test(resto)) resto += ' loading="lazy"';
  if (!/\bdecoding=/.test(resto)) resto += ' decoding="async"';
  return `<picture data-foto="${nombre}">`
    + `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">`
    + `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`
    + `<img src="img/fotos/${nombre}-${base}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${f.ancho}" height="${f.alto}"${resto}>`
    + `</picture>`;
}

// distancias por carretera calculadas por Mapa (ref/raw/rutas.json, OSRM): se escriben en el HTML al construir.
// Sin el fichero, los huecos [data-km] se quedan vacíos (sin cifra inventada).
const RUTAS = (() => {
  const f = path.join(RAIZ, 'ref/raw/rutas.json');
  if (!fs.existsSync(f)) { console.warn('  (sin ref/raw/rutas.json: sin distancias en «Alrededor» ni en la tabla de la sobria)'); return null; }
  return JSON.parse(fs.readFileSync(f, 'utf8')).destinos;
})();
const num = (n) => String(n).replace('.', ',');
const tiempo = (m) => (m >= 60 ? Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min' : m + ' min');
const dist = (k) => { const d = RUTAS && RUTAS[k] && (RUTAS[k].hacia_casa || RUTAS[k].desde_casa); return d ? { km: num(d.km), t: tiempo(d.minutos), nombre: RUTAS[k].nombre } : null; };
function km(html) {
  html = html.replace(/<span data-km="([^"]+)"><\/span>/g, (m, k) => {
    if (k === 'playas') { const d = dist('penarronda'); return d ? ` La más cercana de las calculadas: ${d.nombre}, a ${d.km} km por carretera (${d.t}).` : ''; }
    const d = dist(k === 'oscos' ? 'san-martin-oscos' : k);
    return d ? ` (a ${d.km} km por carretera, ${d.t})` : '';
  });
  return html.replace(/(<td data-vistazo-km>)[^<]*(<\/td>)/, (m, a, b) => {
    const l = ['grandas', 'san-martin-oscos', 'navia', 'vegadeo', 'fonsagrada', 'lugo', 'oviedo', 'madrid'].map((k) => { const d = dist(k); return d ? `${d.nombre} ${d.km} km (${d.t})` : null; }).filter(Boolean);
    return a + (l.length ? l.join(' · ') + '. Por carretera, calculado con OpenStreetMap.' : 'Las distancias por carretera están en «Cómo llegar».') + b;
  });
}

const partes = (html, prof = 0) => html.replace(/<!--parte:([^\s>]+)\s*-->/g, (m, ruta) => {
  const f = path.join(RAIZ, ruta);
  if (!fs.existsSync(f)) { console.warn('  (falta ' + ruta + ')'); return `<!-- sin ${ruta} -->`; }
  if (prof > 3) throw new Error('Partes anidadas de más: ' + ruta);
  return partes(fs.readFileSync(f, 'utf8').trim(), prof + 1);
});

const quitarAusentes = (html) => html
  .replace(/[ \t]*<link rel="stylesheet" href="(css\/[^"?]+)"[^>]*>\r?\n?/g, (m, r) => (fs.existsSync(path.join(RAIZ, r)) ? m : (console.warn('  (sin ' + r + ': se quita su <link>)'), '')))
  .replace(/[ \t]*<script (?:type="module" )?src="(js\/[^"?]+)"[^>]*><\/script>\r?\n?/g, (m, r) => (fs.existsSync(path.join(RAIZ, r)) ? m : (console.warn('  (sin ' + r + ': se quita su <script>)'), '')));

const fuentes = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.src.html'));
for (const src of fuentes) {
  let html = quitarAusentes(partes(fs.readFileSync(path.join(RAIZ, src), 'utf8')));
  html = km(html);
  html = html.replace(/<img\b([^>]*\bdata-foto="[^"]+"[^>]*)>/g, (m, a) => picture(a.replace(/\s*\/$/, '')));
  const destino = src.replace('.src.html', '.html');
  fs.writeFileSync(path.join(RAIZ, destino), html);
  console.log(`${src} → ${destino} (${(html.length / 1024).toFixed(0)} KB)`);
}
execFileSync(process.execPath, [path.join(RAIZ, 'versionar.mjs')], { stdio: 'inherit' });
