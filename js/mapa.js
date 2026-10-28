/* «Su mapa, rehecho» · la tarjeta de carreteras de A Palleira, redibujada.
   window.Palleira.mapa.montar(el, { movimiento, densidad }) -> { destruir() }
   Los tiempos y kilómetros (OSRM, datos de OpenStreetMap) los mete scripts/mapa-construir.mjs entre los marcadores
   de abajo desde ref/raw/rutas.json; no se editan a mano.
   Es un esquema de nudos y carreteras, no un mapa a escala. Las carreteras que no coinciden con la tarjeta original
   (la tarjeta es vieja) están corregidas con la ruta real de OSRM. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var D = /*DATOS:INICIO*/ {"fuente":"OSRM (router.project-osrm.org, perfil coche, datos de OpenStreetMap ODbL)","fecha":"2026-10-28","casa":{"lat":43.256559,"lon":-6.875258},"monograma":"<defs><mask id=\"mp-lg-seco\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"1005\" height=\"435\"><rect width=\"1005\" height=\"435\" fill=\"#fff\"/><path d=\"M169.7 256.5L177.0 266.4\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M202.7 301.2L206.0 305.7\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M246.9 361.5L254.5 371.8\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M163.0 255.6L166.5 260.4\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M194.7 298.5L203.6 310.6\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M214.0 324.7L222.0 335.7\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M147.4 244.8L151.8 250.8\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M230.7 357.9L236.7 366.0\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M177.9 294.5L182.7 301.0\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M195.0 317.8L204.7 331.0\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M227.7 362.3L232.8 369.3\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M236.3 374.0L241.6 381.2\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M146.3 260.7L150.8 266.7\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M193.1 324.0L201.0 334.8\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M224.7 367.0L232.8 378.1\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M88.5 325.8L92.2 318.7\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M110.0 272.9L118.0 258.3\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M123.6 250.1L129.0 242.4\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M94.1 327.1L99.3 316.5\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M115.5 274.1L119.4 266.5\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M131.7 248.1L134.4 244.2\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M119.0 280.8L123.6 270.9\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M94.9 349.0L100.9 340.0\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M113.5 314.6L117.7 303.0\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M135.9 263.6L143.5 252.8\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M194.6 325.2L208.8 324.8\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M164.5 331.2L180.7 331.0\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M192.9 330.7L205.6 330.3\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M109.5 336.8L115.9 336.7\" stroke=\"#000\" stroke-width=\"1.3\" stroke-linecap=\"round\"/></mask><filter id=\"mp-lg-borde\" x=\"-5%\" y=\"-5%\" width=\"110%\" height=\"110%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.06\" numOctaves=\"2\" seed=\"7\" result=\"r\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"r\" scale=\"4\" xChannelSelector=\"R\" yChannelSelector=\"G\"/></filter></defs><g id=\"mp-lg-a\" filter=\"url(#mp-lg-borde)\"><g mask=\"url(#mp-lg-seco)\" fill=\"none\" stroke=\"#3B1C0A\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path id=\"mp-lg-a1\" class=\"trazo-a\" d=\"M95.0 174.0C107.7 191.0 145.8 242.0 171.0 276.0C196.2 310.0 233.5 361.0 246.0 378.0\" stroke-width=\"28\" pathLength=\"1\"/><path id=\"mp-lg-a2\" class=\"trazo-a\" d=\"M46.0 394.0C50.0 389.2 62.7 374.0 70.0 365.0C77.3 356.0 84.5 348.2 90.0 340.0C95.5 331.8 99.3 324.0 103.0 316.0C106.7 308.0 109.0 299.7 112.0 292.0C115.0 284.3 116.8 277.7 121.0 270.0C125.2 262.3 134.3 250.0 137.0 246.0\" stroke-width=\"25\" pathLength=\"1\"/><path id=\"mp-lg-a3\" class=\"trazo-a\" d=\"M86.0 332.0C93.3 331.8 115.7 331.2 130.0 331.0C144.3 330.8 158.0 331.2 172.0 331.0C186.0 330.8 207.0 330.2 214.0 330.0\" stroke-width=\"19\" pathLength=\"1\"/></g></g><g id=\"mp-lg-p\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path class=\"p-contorno\" d=\"M277.0 374.0C274.5 367.7 268.2 348.3 262.0 336.0C255.8 323.7 248.2 313.0 240.0 300.0C231.8 287.0 222.8 271.3 213.0 258.0C203.2 244.7 190.7 231.3 181.0 220.0C171.3 208.7 163.2 200.0 155.0 190.0C146.8 180.0 138.5 169.3 132.0 160.0C125.5 150.7 118.7 142.3 116.0 134.0C113.3 125.7 113.5 117.0 116.0 110.0C118.5 103.0 124.0 97.7 131.0 92.0C138.0 86.3 148.2 79.3 158.0 76.0C167.8 72.7 179.3 70.3 190.0 72.0C200.7 73.7 213.7 79.7 222.0 86.0C230.3 92.3 235.8 101.0 240.0 110.0C244.2 119.0 246.3 130.0 247.0 140.0C247.7 150.0 246.0 160.7 244.0 170.0C242.0 179.3 237.8 190.3 235.0 196.0C232.2 201.7 228.3 202.7 227.0 204.0\" stroke=\"#3B1C0A\" stroke-width=\"42\"/><path class=\"p-crema\" d=\"M277.0 374.0C274.5 367.7 268.2 348.3 262.0 336.0C255.8 323.7 248.2 313.0 240.0 300.0C231.8 287.0 222.8 271.3 213.0 258.0C203.2 244.7 190.7 231.3 181.0 220.0C171.3 208.7 163.2 200.0 155.0 190.0C146.8 180.0 138.5 169.3 132.0 160.0C125.5 150.7 118.7 142.3 116.0 134.0C113.3 125.7 113.5 117.0 116.0 110.0C118.5 103.0 124.0 97.7 131.0 92.0C138.0 86.3 148.2 79.3 158.0 76.0C167.8 72.7 179.3 70.3 190.0 72.0C200.7 73.7 213.7 79.7 222.0 86.0C230.3 92.3 235.8 101.0 240.0 110.0C244.2 119.0 246.3 130.0 247.0 140.0C247.7 150.0 246.0 160.7 244.0 170.0C242.0 179.3 237.8 190.3 235.0 196.0C232.2 201.7 228.3 202.7 227.0 204.0\" stroke=\"#F6EBD3\" stroke-width=\"34\"/></g>","origenes":[{"id":"oviedo","nombre":"Oviedo","lat":43.3619,"lon":-5.8484,"min":133,"km":147.5,"texto_tiempo":"2 h 13 min","carreteras":["A-63","AS-216","AS-15","AS-14","AS-12"],"tramos":["oviedo-pola","pola-grandas","grandas-pesoz"]},{"id":"lugo","nombre":"Lugo","lat":43.0121,"lon":-7.5558,"min":87,"km":91.9,"texto_tiempo":"1 h 27 min","carreteras":["LU-530","LU-701","AS-12"],"tramos":["lugo-fonsagrada","fonsagrada-grandas","grandas-pesoz"]},{"id":"madrid","nombre":"Madrid","lat":40.41678,"lon":-3.703507,"min":372,"km":535,"texto_tiempo":"6 h 12 min","carreteras":["A-6","AP-6","LU-710","LU-530","LU-701","AS-12"],"tramos":["madrid-lugo","lugo-fonsagrada","fonsagrada-grandas","grandas-pesoz"]},{"id":"navia","nombre":"Navia","lat":43.5410045,"lon":-6.7206757,"min":59,"km":62.1,"texto_tiempo":"59 min","carreteras":["AS-12"],"tramos":["navia-pesoz"]},{"id":"vegadeo","nombre":"Vegadeo","lat":43.4452755,"lon":-7.0544368,"min":47,"km":47.2,"texto_tiempo":"47 min","carreteras":["AS-21","AS-11"],"tramos":["vegadeo-garganta","garganta-pesoz"]},{"id":"fonsagrada","nombre":"A Fonsagrada","lat":43.1283139,"lon":-7.0428451,"min":32,"km":31.6,"texto_tiempo":"32 min","carreteras":["LU-701","AS-12"],"tramos":["fonsagrada-grandas","grandas-pesoz"]},{"id":"pola-allande","nombre":"Pola de Allande","lat":43.271901,"lon":-6.6097123,"min":48,"km":51.2,"texto_tiempo":"48 min","carreteras":["AS-14","AS-12"],"tramos":["pola-grandas","grandas-pesoz"]},{"id":"grandas","nombre":"Grandas de Salime","lat":43.2176587,"lon":-6.8757234,"min":6,"km":6.8,"texto_tiempo":"6 min","carreteras":["AS-12"],"tramos":["grandas-pesoz"]}]} /*DATOS:FIN*/;
  var P = window.Palleira = window.Palleira || {};

  // ---- el esquema (coordenadas de la tarjeta original, 1500 de ancho)
  var NODOS = {
    lugo: [200, 370, 'g', 'Lugo'], fonsagrada: [398, 381, 'm', 'A Fonsagrada'], garganta: [537, 225, 'm', 'La Garganta'],
    vegadeo: [598, 137, 'm', 'Vegadeo'], navia: [868, 228, 'm', 'Navia'], oviedo: [1278, 352, 'g', 'Oviedo'],
    pola: [800, 518, 'm', 'Pola de Allande'], madrid: [748, 718, 'g', 'Madrid'], grandas: [640, 404, 'm', 'Grandas'], pesoz: [695, 353, 'c', 'Pesoz']
  };
  // [id, desde, hasta, rótulo, posición del rótulo (0-1), escudo oscuro]
  var VIAS = [
    ['lugo-vegadeo', 'lugo', 'vegadeo', 'N-640', 0.55, 1], ['vegadeo-navia', 'vegadeo', 'navia', 'A-8', 0.5, 1], ['navia-oviedo', 'navia', 'oviedo', 'A-8', 0.5, 1],
    ['lugo-fonsagrada', 'lugo', 'fonsagrada', 'LU-530', 0.5, 0], ['fonsagrada-grandas', 'fonsagrada', 'grandas', 'LU-701 · AS-12', 0.52, 0],
    ['vegadeo-garganta', 'vegadeo', 'garganta', 'AS-11', 0.5, 0], ['garganta-pesoz', 'garganta', 'pesoz', 'AS-11', 0.46, 0],
    ['navia-pesoz', 'navia', 'pesoz', 'AS-12', 0.5, 0], ['grandas-pesoz', 'grandas', 'pesoz', null, 0.5, 0],
    ['pola-grandas', 'pola', 'grandas', 'AS-14', 0.5, 0], ['oviedo-pola', 'oviedo', 'pola', 'A-63 · AS-15 · AS-14', 0.46, 0],
    ['madrid-lugo', 'madrid', 'lugo', 'A-6', 0.45, 1]
  ];
  var CASA_CAJA = { x: 765, y: 318, w: 252, h: 104 };
  // Dónde puede ir el rótulo de cada ciudad: [x, y, ancla, tamaño]
  var ROTULOS = {
    lugo: [196, 318, 'middle', 56], fonsagrada: [358, 215, 'middle', 44], garganta: [575, 262, 'start', 42], vegadeo: [440, 100, 'middle', 44], navia: [940, 190, 'middle', 52],
    oviedo: [1300, 445, 'middle', 56], pola: [980, 590, 'middle', 44], madrid: [800, 738, 'start', 56], grandas: [540, 470, 'middle', 44], pesoz: [630, 330, 'end', 52]
  };
  var NEAR = ['oviedo', 'lugo', 'madrid', 'navia', 'vegadeo', 'fonsagrada', 'pola-allande', 'grandas'];
  var NODO_DE = { 'pola-allande': 'pola' };

  function el_(ns, tag, attrs, padre) {
    var n = ns ? document.createElementNS(NS, tag) : document.createElement(tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(n);
    return n;
  }
  var S = function (t, a, p) { return el_(true, t, a, p); };
  var H = function (t, clase, texto, p) { var n = el_(false, t, clase ? { 'class': clase } : null, p); if (texto != null) n.textContent = texto; return n; };

  function formatoKm(km) { return km < 20 ? String(km.toFixed(1)).replace('.', ',') : String(Math.round(km)); }
  function formatoTiempo(m) { return m >= 60 ? Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min' : m + ' min'; }
  function lista(refs) {
    var l = refs.map(function (r) { return 'la ' + r; });
    return l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1];
  }
  function fechaLarga(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); var ms = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']; return m ? (+m[3]) + ' de ' + ms[+m[2] - 1] + ' de ' + m[1] : ''; }
  function distKm(a, b, c, d) { var r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r * Math.cos((a + c) * r / 2); return 6371 * Math.hypot(x, y); }
  function resumenRefs(pasos) { // mismas reglas que scripts/mapa-construir.mjs: ≥ 8 km, y la última si ≥ 3 km
    var km = {}, orden = [];
    pasos.forEach(function (t) { if (t.ref) { km[t.ref] = (km[t.ref] || 0) + t.km; if (orden.indexOf(t.ref) < 0) orden.push(t.ref); } });
    return orden.filter(function (x, i) { return km[x] >= 8 || (i === orden.length - 1 && km[x] >= 3); });
  }

  function montar(el, opciones) {
    if (!el || !D.origenes) return { destruir: function () {} };
    opciones = opciones || {};
    var reducido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mov = opciones.movimiento !== false && opciones.densidad !== 'sobria' && !reducido;
    var porId = {}; D.origenes.forEach(function (o) { porId[o.id] = o; });
    var vias = {}; VIAS.forEach(function (v) { vias[v[0]] = v; });

    el.textContent = '';
    var raiz = H('div', 'mp' + (mov ? ' mp--mov' : ''), null, el);
    var cuerpo = H('div', 'mp-cuerpo', null, raiz);

    // ================= la tarjeta =================
    var fig = H('figure', 'mp-tarjeta', null, cuerpo);
    var s = S('svg', { viewBox: '30 48 1410 830', 'aria-hidden': 'true', focusable: 'false' }, fig);
    var defs = S('defs', null, s);
    var sombra = S('linearGradient', { id: 'mp-sombra', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    S('stop', { offset: '0', 'stop-color': '#3B1C0A', 'stop-opacity': '.45' }, sombra);
    S('stop', { offset: '1', 'stop-color': '#3B1C0A', 'stop-opacity': '0' }, sombra);
    S('rect', { x: 48, y: 82, width: 1374, height: 800, rx: 66, fill: 'url(#mp-sombra)', opacity: .0 }, s);
    S('rect', { x: 40, y: 65, width: 1390, height: 800, rx: 64, 'class': 'mp-fondo' }, s);
    S('rect', { x: 62, y: 86, width: 1346, height: 758, rx: 46, 'class': 'mp-borde' }, s);
    // la marca de agua «AP» de la tarjeta
    var ma = S('g', { 'class': 'mp-marca' }, s);
    S('path', { d: 'M92 800 L150 640 L208 800 M112 760 L190 760' }, ma);
    S('path', { d: 'M178 790 L232 640 C 300 612, 330 700, 258 722' }, ma);

    var gVias = S('g', { 'class': 'mp-vias' }, s);
    function pos(id) { return NODOS[id]; }
    VIAS.forEach(function (v) { var a = pos(v[1]), b = pos(v[2]); S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], 'class': 'mp-via' }, gVias); });
    // escudos de las carreteras
    var gEsc = S('g', { 'class': 'mp-escudos' }, s);
    VIAS.forEach(function (v) {
      if (!v[3]) return;
      var a = pos(v[1]), b = pos(v[2]), x = a[0] + (b[0] - a[0]) * v[4], y = a[1] + (b[1] - a[1]) * v[4];
      var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
      var w = v[3].length * 15 + 26;
      var g = S('g', { transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')', 'class': 'mp-escudo' + (v[5] ? ' mp-escudo--oscuro' : '') }, gEsc);
      S('rect', { x: -w / 2, y: -17, width: w, height: 34, rx: 6 }, g);
      var t = S('text', { x: 0, y: 8, 'text-anchor': 'middle' }, g); t.textContent = v[3];
    });
    // la ruta (encima de las carreteras, debajo de los nudos)
    var gRuta = S('g', { 'class': 'mp-ruta-g' }, s);
    var rutaBorde = S('path', { 'class': 'mp-ruta-borde', pathLength: '1', d: 'M0 0' }, gRuta);
    var ruta = S('path', { 'class': 'mp-ruta', pathLength: '1', d: 'M0 0' }, gRuta);

    // nudos y rótulos
    var gNodos = S('g', { 'class': 'mp-nodos' }, s), nodoEls = {};
    Object.keys(NODOS).forEach(function (id) {
      var n = NODOS[id];
      var g = S('g', { 'class': 'mp-nodo mp-nodo--' + n[2], transform: 'translate(' + n[0] + ' ' + n[1] + ')' }, gNodos);
      if (id !== 'pesoz') { S('circle', { r: 42, 'class': 'mp-pulso' }, g); S('circle', { r: n[2] === 'g' ? 30 : 17, 'class': 'mp-punto' }, g); }
      else S('circle', { r: 17, 'class': 'mp-punto mp-punto--casa' }, g);
      nodoEls[id] = g;
    });
    Object.keys(ROTULOS).forEach(function (id) {
      var r = ROTULOS[id], t = S('text', { x: r[0], y: r[1], 'text-anchor': r[2], 'class': 'mp-ciudad', 'font-size': r[3] }, gNodos);
      t.textContent = id === 'grandas' ? 'Grandas' : NODOS[id][3];
    });
    // la casa: caja teja con el monograma, como en la tarjeta
    var c = CASA_CAJA, gc = S('g', { 'class': 'mp-casa' }, s);
    S('path', { d: 'M' + (c.x - 4) + ' ' + (c.y + 36) + 'L' + (c.x - 62) + ' ' + (c.y + 36), 'class': 'mp-casa-flecha' }, gc);
    S('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 16, 'class': 'mp-casa-caja' }, gc);
    if (D.monograma) { var mono = S('svg', { x: c.x + 8, y: c.y + 4, width: 78, height: 96, viewBox: '22 44 300 370', 'class': 'mp-casa-mono' }, gc); mono.innerHTML = D.monograma; }
    var t1 = S('text', { x: c.x + 96, y: c.y + 50, 'class': 'mp-casa-t1' }, gc); t1.textContent = 'ALLEIRA';
    var t2 = S('text', { x: c.x + 100, y: c.y + 80, 'class': 'mp-casa-t2' }, gc); t2.textContent = 'CASA DE ALDEA';
    // la etiqueta del tiempo
    var etq = S('g', { 'class': 'mp-etq', opacity: 0 }, s);
    var etqR = S('rect', { rx: 22, height: 54, 'class': 'mp-etq-caja' }, etq);
    var etqT = S('text', { 'text-anchor': 'middle', 'class': 'mp-etq-t' }, etq);

    // ================= el panel =================
    var panel = H('div', 'mp-panel', null, cuerpo);
    H('p', 'mp-sobre', 'Cómo llegar', panel);
    var tit = H('p', 'mp-pregunta', '¿Desde dónde vienes?', panel); tit.id = 'mp-q-' + Math.random().toString(36).slice(2, 7);
    var grupo = H('div', 'mp-origenes', null, panel); grupo.setAttribute('role', 'group'); grupo.setAttribute('aria-labelledby', tit.id);
    var botones = {};
    NEAR.forEach(function (id) {
      var o = porId[id]; if (!o) return;
      var b = H('button', 'mp-origen', o.nombre, grupo); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.dataset.origen = id;
      b.addEventListener('click', function () { elegir(id); });
      botones[id] = b;
    });
    var geo = null;
    if (navigator.geolocation) {
      geo = H('button', 'mp-origen mp-origen--geo', 'Mi ubicación', grupo); geo.type = 'button'; geo.setAttribute('aria-pressed', 'false'); geo.dataset.origen = 'ubicacion';
      geo.addEventListener('click', usarUbicacion);
    }
    if (geo) H('p', 'mp-fino', 'Mi ubicación solo se pide al pulsar el botón. No se guarda: se envía redondeada (a unos 1 km) a un servicio de rutas (OSRM) para calcular el camino y se olvida.', panel);

    var res = H('div', 'mp-resultado', null, panel);
    res.setAttribute('role', 'status'); res.setAttribute('aria-live', 'polite');
    var cifras = H('p', 'mp-cifras', null, res);
    var tiempo = H('span', 'mp-tiempo', '', cifras), kms = H('span', 'mp-km', '', cifras);
    var frase = H('p', 'mp-frase', 'Elige desde dónde vienes y trazo la ruta hasta la casa.', res);
    H('p', 'mp-fino mp-fuente', 'Tiempos y kilómetros por carretera calculados con OSRM sobre datos de OpenStreetMap el ' + fechaLarga(D.fecha) + ', sin tráfico ni paradas: orientativos. La tarjeta es un esquema, no un mapa a escala.', panel);

    // ================= la ruta =================
    var actual = null, tmr = 0, ids = [];
    function camino(tramos, origenNodo) { // nodos en orden, de origen a la casa
      var seq = [origenNodo], cur = origenNodo;
      tramos.forEach(function (t) { var v = vias[t]; cur = v[1] === cur ? v[2] : v[1]; seq.push(cur); });
      return seq;
    }
    function trazar(seq, texto, instantaneo) {
      var pts = seq.map(function (n) { return NODOS[n]; });
      var d = 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join('L');
      var largo = 0, acum = [0];
      for (var i = 1; i < pts.length; i++) { largo += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acum.push(largo); }
      var dur = instantaneo || !mov ? 0 : Math.round(900 + largo * 1.1);
      [ruta, rutaBorde].forEach(function (r) {
        r.style.transition = 'none'; r.setAttribute('d', d); r.style.strokeDashoffset = '1'; r.style.opacity = '1';
      });
      etq.setAttribute('opacity', 0);
      Object.keys(nodoEls).forEach(function (id) { nodoEls[id].classList.remove('mp-nodo--paso', 'mp-nodo--origen'); nodoEls[id].style.removeProperty('--paso'); });
      void ruta.getBoundingClientRect();
      [ruta, rutaBorde].forEach(function (r) { r.style.transition = dur ? 'stroke-dashoffset ' + dur + 'ms cubic-bezier(.65,0,.35,1)' : 'none'; r.style.strokeDashoffset = '0'; });
      seq.forEach(function (n, i) {
        var g = nodoEls[n]; g.style.setProperty('--paso', Math.round(dur * acum[i] / largo) + 'ms');
        g.classList.add(i === 0 ? 'mp-nodo--origen' : 'mp-nodo--paso');
      });
      // la etiqueta, a mitad del recorrido
      var mitad = largo / 2, k = 1; while (k < acum.length - 1 && acum[k] < mitad) k++;
      var f = (mitad - acum[k - 1]) / (acum[k] - acum[k - 1]), a = pts[k - 1], b = pts[k];
      var ex = a[0] + (b[0] - a[0]) * f, ey = a[1] + (b[1] - a[1]) * f;
      etqT.textContent = texto;
      var w = texto.length * 17.5 + 40;
      etqR.setAttribute('width', w); etqR.setAttribute('x', -w / 2); etqR.setAttribute('y', -27); etqT.setAttribute('y', 9);
      etq.setAttribute('transform', 'translate(' + ex.toFixed(1) + ' ' + (ey - 8).toFixed(1) + ')');
      clearTimeout(tmr);
      if (dur) { etq.style.transition = 'none'; tmr = setTimeout(function () { etq.style.transition = 'opacity .4s'; etq.setAttribute('opacity', 1); }, dur * 0.85); }
      else { etq.style.transition = 'none'; etq.setAttribute('opacity', 1); }
    }
    function marcar(id) {
      Object.keys(botones).forEach(function (k) { botones[k].setAttribute('aria-pressed', k === id ? 'true' : 'false'); });
      if (geo) geo.setAttribute('aria-pressed', id === 'ubicacion' ? 'true' : 'false');
    }
    function elegir(id, instantaneo) {
      var o = porId[id]; if (!o) return;
      actual = id; marcar(id);
      var origenNodo = NODO_DE[id] || id;
      trazar(camino(o.tramos, origenNodo), o.texto_tiempo + ' · ' + formatoKm(o.km) + ' km', instantaneo);
      tiempo.textContent = o.texto_tiempo; kms.textContent = formatoKm(o.km) + ' km';
      var carr = o.carreteras.length ? ', por ' + lista(o.carreteras) : '';
      frase.textContent = 'Desde ' + o.nombre + ': ' + o.texto_tiempo + ', ' + formatoKm(o.km) + ' km' + carr + '.';
      raiz.dataset.origen = id; raiz.dataset.min = String(o.min); raiz.dataset.km = String(o.km);
    }

    // ---- mi ubicación (solo si se pide; nada se guarda)
    function usarUbicacion() {
      if (!navigator.geolocation) return;
      geo.disabled = true; frase.textContent = 'Pidiendo tu ubicación al navegador…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = Math.round(pos.coords.latitude * 100) / 100, lon = Math.round(pos.coords.longitude * 100) / 100;
        pos = null;
        // nudo del esquema más cercano
        var mejor = null, dm = 1e9;
        NEAR.forEach(function (id) { var o = porId[id], d = distKm(lat, lon, o.lat, o.lon); if (d < dm) { dm = d; mejor = o; } });
        var url = 'https://router.project-osrm.org/route/v1/driving/' + lon + ',' + lat + ';' + D.casa.lon + ',' + D.casa.lat + '?overview=false&steps=true';
        fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' }).then(function (r) { return r.json(); }).then(function (j) {
          geo.disabled = false;
          if (j.code !== 'Ok' || !j.routes || !j.routes[0]) { frase.textContent = 'No encuentro una ruta por carretera desde ahí. Elige uno de los orígenes de la lista.'; return; }
          var r = j.routes[0], pasos = [];
          r.legs.forEach(function (l) { l.steps.forEach(function (st) { pasos.push({ ref: (st.ref || '').split(';')[0].trim() || null, km: st.distance / 1000 }); }); });
          var min = Math.round(r.duration / 60), km = r.distance / 1000, refs = resumenRefs(pasos);
          actual = 'ubicacion'; marcar('ubicacion');
          var nodo = NODO_DE[mejor.id] || mejor.id;
          trazar(camino(mejor.tramos, nodo), formatoTiempo(min) + ' · ' + formatoKm(km) + ' km');
          tiempo.textContent = formatoTiempo(min); kms.textContent = formatoKm(km) + ' km';
          frase.textContent = 'Desde tu ubicación (aproximada): ' + formatoTiempo(min) + ', ' + formatoKm(km) + ' km' + (refs.length ? ', por ' + lista(refs) : '') + '. El trazo parte del nudo más cercano del esquema: ' + mejor.nombre + '.';
          raiz.dataset.origen = 'ubicacion'; raiz.dataset.min = String(min); raiz.dataset.km = km.toFixed(1);
        }).catch(function () { geo.disabled = false; frase.textContent = 'No he podido calcular la ruta ahora. Elige uno de los orígenes de la lista.'; });
      }, function (err) {
        geo.disabled = false;
        frase.textContent = err && err.code === 1 ? 'No has dado permiso para usar tu ubicación. Elige uno de los orígenes de la lista.' : 'No he podido saber dónde estás. Elige uno de los orígenes de la lista.';
      }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 });
    }

    // ---- estado inicial: con movimiento, ninguno hasta que se elija; quieto o sobrio, Oviedo ya trazado
    var io = null;
    if (!mov) elegir('oviedo', true);
    else {
      // al acercarse, una pequeña presentación: el trazo de Oviedo se dibuja solo la primera vez
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); if (!actual) elegir('oviedo'); } }, { threshold: 0.45 });
        io.observe(fig);
      }
    }
    el.dataset.montado = '1';
    return { destruir: function () { clearTimeout(tmr); if (io) io.disconnect(); el.removeAttribute('data-montado'); } };
  }

  P.mapa = { montar: montar, datos: D };
})();
