// Construye ref/raw/pesoz.json (INE + OSM) y mete los datos ya preparados en js/mapa.js (y en js/vecinos.js, si vuelve)
// (entre /*DATOS:INICIO*/ y /*DATOS:FIN*/), para que los módulos no necesiten fetch y valgan también en file://.
//   node scripts/mapa-construir.mjs             usa ref/raw/osm-pesoz-bruto.json y baja el INE
//   node scripts/mapa-construir.mjs --sin-red   reutiliza la serie del INE ya guardada en ref/raw/pesoz.json
import fs from 'node:fs';
const UA = 'maqueta-web-local/1.0 (prueba de maqueta sin publicar)';
const leer = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const osm = leer('ref/raw/osm-pesoz-bruto.json');
const rutas = leer('ref/raw/rutas.json');
const sinRed = process.argv.includes('--sin-red');
const hoy = new Date().toISOString().slice(0, 10);

// ---------------- INE ----------------
let ine;
if (sinRed && fs.existsSync('ref/raw/pesoz.json')) ine = leer('ref/raw/pesoz.json').poblacion;
else {
  const r = await fetch('https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/2886?nult=30', { headers: { 'User-Agent': UA } });
  const t = await r.json();
  const serie = (n) => t.find((s) => s.Nombre.startsWith(n + '. Total. Total habitantes')).Data.map((d) => ({ anyo: d.Anyo, valor: d.Valor, fecha_referencia: new Date(d.Fecha).toISOString().slice(0, 10) })).sort((a, b) => b.anyo - a.anyo);
  const todos = t.filter((s) => /\. Total\. Total habitantes\. Personas/.test(s.Nombre)).map((s) => ({ n: s.Nombre.split('.')[0], v: s.Data.sort((a, b) => b.Anyo - a.Anyo)[0].Valor, a: s.Data[0].Anyo })).sort((a, b) => a.v - b.v);
  const p = serie('Pesoz');
  ine = {
    fuente: 'INE, Cifras oficiales de población de los municipios españoles (Revisión del Padrón Municipal), tabla 2886 «Asturias: Población por municipios y sexo», servicios.ine.es/wstempus, código municipal 33048',
    fecha_consulta: hoy,
    ultimo: p[0],
    serie: p.slice(0, 12),
    concejos_menos_poblados_ultimo_anyo: todos.slice(0, 4).map((x) => ({ concejo: x.n, anyo: x.a, valor: x.v })),
    yernes_y_tameza_serie: serie('Yernes y Tameza').slice(0, 8),
    nota: 'En 2025 Pesoz y Yernes y Tameza empatan a 134. En 2020-2023 Yernes y Tameza tenía menos. Wikipedia dice «segundo menos poblado desde 2007», no «el que menos».',
    por_nucleo: null,
    por_nucleo_nota: 'No se ha conseguido el Nomenclátor por núcleos (la API del INE no lo expone y nomen2 da error 500 sin navegador). Sin dato por núcleo: los puntos van agrupados en torno al núcleo de Pesoz y la web lo dice. Pendiente: bajar el Nomenclátor de https://www.ine.es/nomen2/ a mano.',
  };
}
const N = ine.ultimo.valor;

// ---------------- proyección y simplificación ----------------
const L = osm.limite[0];
const { minlat, maxlat, minlon, maxlon } = L.bounds;
const lat0 = (minlat + maxlat) / 2, KX = 111320 * Math.cos((lat0 * Math.PI) / 180), KY = 111320, M = 8; // m por unidad
const PAD = 40;
const px = (lon, lat) => [Math.round(((lon - minlon) * KX) / M + PAD), Math.round(((maxlat - lat) * KY) / M + PAD)];
const W = Math.round(((maxlon - minlon) * KX) / M + 2 * PAD), H = Math.round(((maxlat - minlat) * KY) / M + 2 * PAD);
function dp(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]; let m = 0, k = 0;
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / l; if (d > m) { m = d; k = i; } }
  if (m <= eps) return [pts[0], pts[pts.length - 1]];
  return [...dp(pts.slice(0, k + 1), eps).slice(0, -1), ...dp(pts.slice(k), eps)];
}
const proy = (g) => g.map((q) => px(q.lon, q.lat)).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
const toD = (pts) => 'M' + pts.map((p) => p.join(' ')).join('L');
const EPS = 1.1;

// límite: unir los trozos «outer» por sus extremos
let trozos = L.members.filter((m) => m.role === 'outer').map((m) => m.geometry.map((q) => [q.lon, q.lat]));
const igual = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
let anillo = trozos.shift();
while (trozos.length) {
  const fin = anillo[anillo.length - 1]; const i = trozos.findIndex((t) => igual(t[0], fin) || igual(t[t.length - 1], fin));
  if (i < 0) { console.warn('límite: trozo suelto, se dibuja aparte'); break; }
  let t = trozos.splice(i, 1)[0]; if (!igual(t[0], fin)) t = t.reverse(); anillo = anillo.concat(t.slice(1));
}
const aObj = (a) => a.map(([lon, lat]) => ({ lon, lat }));
const limite = toD(dp(proy(aObj(anillo)), EPS)) + 'Z';
const sueltos = trozos.map((t) => toD(dp(proy(aObj(t)), EPS)));

const rios = osm.rios.map((w) => ({ nombre: w.tags.name.replace('Augüeira', 'Agüeira'), d: toD(dp(proy(w.geometry), EPS * 1.5)) }));
const agua = [];
for (const w of osm.agua) {
  if (w.type === 'way' && w.geometry && w.geometry.length > 20) agua.push({ nombre: w.tags?.name || null, d: toD(dp(proy(w.geometry), EPS * 1.5)) + 'Z' });
  if (w.type === 'relation' && w.members) for (const m of w.members.filter((m) => m.role === 'outer' && m.geometry)) agua.push({ nombre: w.tags?.name || null, d: toD(dp(proy(m.geometry), EPS * 1.5)) });
}
const principales = [], locales = [];
for (const w of osm.carreteras) {
  const d = toD(dp(proy(w.geometry), EPS));
  (w.tags.ref && w.tags.highway !== 'unclassified' ? principales : locales).push(d);
}
const nom = (n) => n.tags.name.split(' / ')[1] || n.tags.name;
const nucleosOsm = osm.nucleos.filter((n) => ['hamlet', 'village'].includes(n.tags.place)).map((n) => ({ nombre: nom(n), lat: n.lat, lon: n.lon, tipo: n.tags.place, osm: 'node/' + n.id }));
const casa = { lat: rutas.casa.lat, lon: rutas.casa.lon };
const [cx, cy] = px(casa.lon, casa.lat);
const nuc = nucleosOsm.map((n) => { const [x, y] = px(n.lon, n.lat); return { ...n, x, y }; });
const pesozNucleo = nuc.find((n) => n.nombre === 'Pesoz');

// etiquetas sin choques (estimación del ancho del texto)
const FS = 17, ancho = (s) => s.length * FS * 0.56 + 6;
const lista = ['Pesoz', 'Argul', 'A Paicega', 'Pelorde', 'Lixóu', 'Brañaveya', 'Cabanela', 'Vilarmarzo', 'Serán', 'Vilabriye', 'Francos', 'Cela', 'Sanzo'];
const cajas = []; const etiquetas = [];
const choca = (a) => cajas.some((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0);
cajas.push({ x0: cx - 70, x1: cx + 70, y0: cy - 70, y1: cy + 70 }); // el cúmulo de puntos
for (const nombre of lista) {
  const n = nuc.find((q) => q.nombre === nombre); if (!n) continue;
  if (nombre === "Pesoz") { etiquetas.push({ nombre, x: n.x, y: n.y + 74, anc: "middle" }); cajas.push({ x0: n.x - 40, x1: n.x + 40, y0: n.y + 58, y1: n.y + 80 }); continue; }
  const w = ancho(nombre);
  const op = [['start', 9, 5, (x) => ({ x0: x + 7, x1: x + 9 + w })], ['end', -9, 5, (x) => ({ x0: x - 9 - w, x1: x - 7 })], ['middle', 0, -12, (x) => ({ x0: x - w / 2, x1: x + w / 2 })], ['middle', 0, 24, (x) => ({ x0: x - w / 2, x1: x + w / 2 })]];
  let puesto = false;
  for (const [anc, dx, dy, f] of op) { const c = { ...f(n.x), y0: n.y + dy - FS, y1: n.y + dy + 4 }; if (!choca(c)) { cajas.push(c); etiquetas.push({ nombre, x: n.x + dx, y: n.y + dy, anc }); puesto = true; break; } }
  if (!puesto) console.warn('etiqueta sin sitio:', nombre);
}
const plano = { w: W, h: H, escala_m_por_unidad: M, limite, limite_sueltos: sueltos, rios, agua, carreteras: { principales, locales }, nucleos: nuc.filter((n) => lista.includes(n.nombre)).map(({ nombre, x, y, tipo }) => ({ nombre, x, y, tipo })), etiquetas, casa: { x: cx, y: cy }, pesoz: { x: pesozNucleo.x, y: pesozNucleo.y } };

fs.writeFileSync('ref/raw/pesoz.json', JSON.stringify({
  generado: hoy,
  casa: { ...casa, fuente: 'Turismo Asturias (otras fuentes dan puntos a ~150 m, sin confirmar cuál es la puerta; ver DATOS-A-PALLEIRA.md)' },
  poblacion: ine,
  concejo: { nombre: 'Pesoz', relacion_osm: 'relation/346393', area_km2_wikipedia: 39, bounds: L.bounds, fuente: osm.fuente, fecha_osm: osm.fecha },
  nucleos_osm: nucleosOsm,
  lugares_osm_total: osm.nucleos.length,
  plano,
}, null, 1));

// ---------------- rutas para el mapa ----------------
const HORA = (m) => (m >= 60 ? Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min' : m + ' min');
function carreteras(r) { // refs con >= 8 km (y la última si >= 3 km), en orden de aparición, sin repetir
  const km = {}, orden = [];
  for (const t of r.tramos) if (t.ref) { km[t.ref] = (km[t.ref] || 0) + t.km; if (!orden.includes(t.ref)) orden.push(t.ref); }
  return orden.filter((x, i) => km[x] >= 8 || (i === orden.length - 1 && km[x] >= 3));
}
const origenes = [
  ['oviedo', 'Oviedo', ['oviedo-pola', 'pola-grandas', 'grandas-pesoz']],
  ['lugo', 'Lugo', ['lugo-fonsagrada', 'fonsagrada-grandas', 'grandas-pesoz']],
  ['madrid', 'Madrid', ['madrid-lugo', 'lugo-fonsagrada', 'fonsagrada-grandas', 'grandas-pesoz']],
  ['navia', 'Navia', ['navia-pesoz']],
  ['vegadeo', 'Vegadeo', ['vegadeo-garganta', 'garganta-pesoz']],
  ['fonsagrada', 'A Fonsagrada', ['fonsagrada-grandas', 'grandas-pesoz']],
  ['pola-allande', 'Pola de Allande', ['pola-grandas', 'grandas-pesoz']],
  ['grandas', 'Grandas de Salime', ['grandas-pesoz']],
].map(([id, nombre, tramos]) => { const r = rutas.destinos[id].hacia_casa; const dd = rutas.destinos[id]; return { id, nombre, lat: dd.lat, lon: dd.lon, min: r.minutos, km: r.km, texto_tiempo: HORA(r.minutos), carreteras: carreteras(r), tramos }; });
// el monograma de Entrada (marca/monograma.svg), incrustado con los ids prefijados para no chocar con otros SVG de la página
const mono = fs.readFileSync("marca/monograma.svg", "utf8");
const monograma = mono.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/, '').replace(/lg-/g, 'mp-lg-').trim();
const datosMapa = { fuente: rutas.fuente, fecha: rutas.fecha, casa, monograma, origenes };

// ---------------- inyectar ----------------
function inyecta(fichero, objeto) {
  let s = fs.readFileSync(fichero, 'utf8');
  const re = /\/\*DATOS:INICIO\*\/[\s\S]*?\/\*DATOS:FIN\*\//;
  if (!re.test(s)) throw new Error('Falta el marcador DATOS en ' + fichero);
  s = s.replace(re, () => '/*DATOS:INICIO*/ ' + JSON.stringify(objeto) + ' /*DATOS:FIN*/');
  fs.writeFileSync(fichero, s);
}
if (fs.existsSync('js/vecinos.js')) inyecta('js/vecinos.js', { habitantes: N, anyo: ine.ultimo.anyo, fecha_referencia: ine.ultimo.fecha_referencia, empate: ine.concejos_menos_poblados_ultimo_anyo.filter((c) => c.valor === N && c.concejo !== 'Pesoz').map((c) => c.concejo), fuente: 'INE, Cifras oficiales de población (padrón a 1 de enero de ' + ine.ultimo.anyo + ')', plano });
inyecta('js/mapa.js', datosMapa);
console.log('Pesoz', N, '(' + ine.ultimo.anyo + ')', 'plano', W + 'x' + H, 'principales', principales.length, 'locales', locales.length, 'etiquetas', etiquetas.length);
console.log('empate con:', JSON.stringify(ine.concejos_menos_poblados_ultimo_anyo));
origenes.forEach((o) => console.log(o.nombre, o.texto_tiempo, o.km, o.carreteras.join(',')));
