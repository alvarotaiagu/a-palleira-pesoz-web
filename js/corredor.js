/* A Palleira · El corredor y sus panoyas
 * window.Palleira.corredor.montar(el, { movimiento, densidad, base, foto, respaldoFotos }) -> { destruir() }
 *
 * La foto del corredor (09) se parte en capas: la fachada sin panoyas (img/corredor/base.*) y las cuatro ristras recortadas
 * en tiras (img/corredor/panoyas.*). Cada ristra es un péndulo compuesto de 4 segmentos que oscila con la velocidad del
 * scroll y se empuja con el ratón o el dedo; y es un botón que abre su ficha. Escritorio: la sección se fija y el corredor
 * se recorre de lado. Móvil: en flujo. Movimiento reducido o sobria: panoyas quietas y las cuatro fichas en rejilla.
 * Los recortes salen de scripts/corredor-recortes.py; la geometría de GEO es la de img/corredor/panoyas.json.
 */
(function () {
  'use strict';
  var P = (window.Palleira = window.Palleira || {});
  var SCRIPT = document.currentScript;
  var RAIZ = '';
  try { RAIZ = new URL('../', SCRIPT.src).href; } catch (e) { RAIZ = ''; }

  var ANCHO = 1856, ALTO = 642;
  /* x0, x1, y0, y1 de cada ristra y sus 4 tiras [sx, sy, w, h, jx, jy, ox, oy] (ver panoyas.json) */
  /*GEO*/
  var GEO = [
    { x0: 368, x1: 466, y0: 239, y1: 450, s: [[0, 0, 98, 56, 58, 0, 368, 239], [100, 0, 98, 59, 57, 3, 368, 289], [200, 0, 98, 58, 41, 3, 368, 342], [300, 0, 98, 56, 37, 3, 368, 394]] },
    { x0: 713, x1: 803, y0: 237, y1: 395, s: [[0, 61, 90, 43, 48, 0, 713, 237], [92, 61, 90, 45, 44, 3, 713, 274], [184, 61, 90, 45, 44, 3, 713, 313], [276, 61, 90, 43, 42, 3, 713, 352]] },
    { x0: 1096, x1: 1187, y0: 230, y1: 401, s: [[0, 108, 91, 46, 36, 0, 1096, 230], [93, 108, 91, 49, 41, 3, 1096, 270], [186, 108, 91, 48, 40, 3, 1096, 313], [279, 108, 91, 46, 39, 3, 1096, 355]] },
    { x0: 1429, x1: 1528, y0: 220, y1: 471, s: [[0, 159, 99, 66, 40, 0, 1429, 220], [101, 159, 99, 69, 46, 3, 1429, 280], [202, 159, 99, 68, 49, 3, 1429, 343], [303, 159, 99, 66, 50, 3, 1429, 405]] }
  ];
  /*FIN*/

  /* Las fichas: solo lo que dicen los datos de la casa (ref/DATOS-A-PALLEIRA.md) */
  var FICHAS = [
    { id: 'plazas', nombre: '4 plazas', titulo: '4 plazas',
      texto: 'Dos dormitorios dobles: uno de matrimonio y otro con dos camas y tele. Son tres camas y un baño con dos lavabos. La casa se alquila entera.',
      fotos: [['dorm-matrimonio', 'Dormitorio de matrimonio'], ['dorm-dos-camas', 'Dormitorio con dos camas']] },
    { id: 'chimenea', nombre: 'La chimenea', titulo: 'La chimenea',
      texto: 'Una chimenea en su marco de ladrillo, junto a la pared de piedra, en la sala que une comedor, salón y cocina abierta. Con leña y calefacción.',
      fotos: [['salon-chimenea', 'El salón con la chimenea y la pared de piedra']] },
    { id: 'corredor', nombre: 'El corredor', titulo: 'El corredor',
      texto: 'De madera, con las panoyas colgadas. Desde él se ven los tejados de Pesoz, el Palacio de Ron y el valle.',
      fotos: [['vista-corredor', 'Desde el corredor: los tejados de Pesoz y el valle'], ['vista-mesa', 'El corredor con la mesa y el banco']] },
    { id: 'patio', nombre: 'El patio', titulo: 'El patio',
      texto: 'Un patio con plantas, una fuente y una mesa de merendero. Además, jardín y muebles de jardín.',
      fotos: [['patio', 'El patio con la mesa de merendero']] }
  ];
  var LISTA = ['4 plazas', '2 dormitorios', '3 camas', '1 baño con 2 lavabos', 'Chimenea con leña', 'Calefacción', 'Terraza', 'Patio con fuente', 'Wifi', 'Lavadora', 'Aparcamiento gratis'];

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function reservar(ev) {
    var R = P.reservar;
    if (typeof R === 'function') { if (ev) ev.preventDefault(); R(); }
  }

  /* <picture> de una foto por nombre; si no está, cae a respaldoFotos[nombre] */
  function htmlFoto(nombre, alt, o) {
    var f = o.foto ? o.foto(nombre) : null;
    var b = o.base;
    var avif = f ? f.avif : b + 'img/fotos/' + nombre + '-800.avif';
    var webp = f ? f.webp : b + 'img/fotos/' + nombre + '-800.webp';
    var jpg = f ? f.jpg : b + 'img/fotos/' + nombre + '-800.jpg';
    var resp = o.respaldoFotos && o.respaldoFotos[nombre] ? o.respaldoFotos[nombre] : '';
    return '<picture>' + (avif ? '<source type="image/avif" srcset="' + esc(avif) + '">' : '') + (webp ? '<source type="image/webp" srcset="' + esc(webp) + '">' : '') +
      '<img src="' + esc(jpg) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async"' + (resp ? ' data-resp="' + esc(resp) + '"' : '') + '></picture>';
  }
  function respaldoFotos(raiz) {
    var imgs = raiz.querySelectorAll('img[data-resp]');
    for (var i = 0; i < imgs.length; i++) {
      (function (im) {
        im.addEventListener('error', function () {
          var r = im.getAttribute('data-resp');
          if (!r || im.dataset.cayo) return;
          im.dataset.cayo = '1';
          var pic = im.parentNode;
          if (pic && pic.tagName === 'PICTURE') { var ss = pic.querySelectorAll('source'); for (var k = 0; k < ss.length; k++) ss[k].remove(); }
          im.src = r;
        });
        if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) im.dispatchEvent(new Event('error'));
      })(imgs[i]);
    }
  }
  function htmlFicha(f, o, conId) {
    var fotos = '';
    for (var i = 0; i < f.fotos.length; i++) fotos += htmlFoto(f.fotos[i][0], f.fotos[i][1], o);
    return '<div class="corr-ficha-fotos corr-fotos-' + f.fotos.length + '">' + fotos + '</div>' +
      '<div class="corr-ficha-cuerpo"><h3 class="corr-ficha-t"' + (conId ? ' id="' + conId + '" tabindex="-1"' : '') + '>' + esc(f.titulo) + '</h3>' +
      '<p>' + esc(f.texto) + '</p><a class="corr-ficha-reservar" href="#reservar">Ver fechas</a></div>';
  }

  /* ---------- el péndulo compuesto de una ristra ---------- */
  var NSEG = 4, G = 74, ACOPLE = 52, AMORT = 1.9, DT = 1 / 120;
  function crearRistra(g, i) {
    var j, juntas = [];
    for (j = 0; j < NSEG; j++) juntas.push({ x: g.s[j][6] + g.s[j][4], y: g.s[j][7] + g.s[j][5] });
    return { g: g, i: i, juntas: juntas, phi: [0, 0, 0, 0], w: [0, 0, 0, 0], rev: 0, meta: 0, visto: false, forzada: false, boton: null };
  }
  function pasoRistra(r, viento, t) {
    var a = [0, 0, 0, 0], j, ph = r.phi, w = r.w;
    var turb = 1 + 0.3 * Math.sin(t * 2.3 + r.i * 1.9);
    for (j = 0; j < NSEG; j++) {
      var acc = -G * Math.sin(ph[j]) * (1 - 0.1 * j) - AMORT * w[j];
      if (j > 0) acc -= ACOPLE * (ph[j] - ph[j - 1]);
      if (j < NSEG - 1) acc += ACOPLE * 0.8 * (ph[j + 1] - ph[j]);
      acc += -viento * 0.0125 * (0.55 + 0.25 * j) * turb;
      a[j] = acc;
    }
    for (j = 0; j < NSEG; j++) {
      w[j] += a[j] * DT;
      ph[j] = clamp(ph[j] + w[j] * DT, -0.95, 0.95);
    }
  }
  function energia(r) {
    var e = 0;
    for (var j = 0; j < NSEG; j++) e += Math.abs(r.phi[j]) + Math.abs(r.w[j]) * 0.1;
    return e;
  }

  function montar(el, opciones) {
    opciones = opciones || {};
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var quieto = opciones.movimiento === false || opciones.densidad === 'sobria' || reduce;
    var o = { base: opciones.base != null ? opciones.base : RAIZ, foto: opciones.foto, respaldoFotos: opciones.respaldoFotos };
    var restaurar = el.innerHTML;
    var oyentes = [];
    function on(t, ev, fn, op) { t.addEventListener(ev, fn, op); oyentes.push([t, ev, fn, op]); }

    /* ---- marcado ---- */
    var uid = 'corr' + Math.floor(Math.random() * 1e6);
    var h = '<div class="corr' + (quieto ? ' corr--quieta' : ' corr--viva') + '">' +
      '<p class="corr-intro">Las <strong>panoyas</strong> son las mazorcas de maíz que se cuelgan a secar en el corredor. ' +
      (quieto ? 'Cada ristra es una cosa de la casa:' : 'Empuja una, o pulsa su nombre, y mira qué hay dentro.') + '</p>' +
      '<div class="corr-pista"><div class="corr-escenario">' +
      '<div class="corr-vista"><div class="corr-escena" role="group" aria-label="El corredor de madera con cuatro ristras de panoyas colgadas">' +
      '<picture><source type="image/webp" srcset="' + esc(o.base + 'img/corredor/base.webp') + '"><img class="corr-base" src="' + esc(o.base + 'img/corredor/base.jpg') + '" alt="" width="' + ANCHO + '" height="' + ALTO + '" decoding="async"></picture>' +
      '<div class="corr-capa"><canvas class="corr-lienzo" aria-hidden="true"></canvas>';
    var i;
    if (!quieto) {
      for (i = 0; i < GEO.length; i++) {
        var gg = GEO[i], fi = FICHAS[i];
        h += '<button type="button" class="corr-ristra" data-i="' + i + '" aria-controls="' + uid + '-ficha" aria-expanded="false" ' +
          'style="left:' + (gg.x0 / ANCHO * 100).toFixed(3) + '%;top:' + (gg.y0 / ALTO * 100).toFixed(3) + '%;width:' + ((gg.x1 - gg.x0) / ANCHO * 100).toFixed(3) + '%;height:' + ((gg.y1 - gg.y0) / ALTO * 100).toFixed(3) + '%">' +
          '<span class="corr-ristra-nombre">' + esc(fi.nombre) + '</span></button>';
      }
    }
    h += '</div></div></div>' +
      '<div class="corr-zocalo"><p class="corr-zocalo-t">Lo que tiene la casa</p><ul class="corr-lista">';
    for (i = 0; i < LISTA.length; i++) h += '<li>' + esc(LISTA[i]) + '</li>';
    h += '</ul></div>';
    if (!quieto) {
      h += '<section class="corr-ficha" id="' + uid + '-ficha" aria-labelledby="' + uid + '-t" hidden><button type="button" class="corr-cerrar" aria-label="Cerrar la ficha">Cerrar</button><div class="corr-ficha-interior"></div></section>';
    }
    h += '</div></div>';
    if (quieto) {
      h += '<div class="corr-rejilla">';
      for (i = 0; i < FICHAS.length; i++) h += '<article class="corr-ficha corr-ficha--fija" aria-labelledby="' + uid + '-t' + i + '">' + htmlFicha(FICHAS[i], o, uid + '-t' + i) + '</article>';
      h += '</div>';
    }
    h += '</div>';
    el.innerHTML = h;
    el.dataset.montado = '1';
    var raiz = el.querySelector('.corr');
    var pista = raiz.querySelector('.corr-pista'), estadio = raiz.querySelector('.corr-escenario'), vista = raiz.querySelector('.corr-vista');
    var escena = raiz.querySelector('.corr-escena'), capa = raiz.querySelector('.corr-capa'), lienzo = raiz.querySelector('.corr-lienzo');
    var ctx = lienzo.getContext('2d');
    var botones = raiz.querySelectorAll('.corr-ristra');
    var panel = raiz.querySelector('.corr-ficha:not(.corr-ficha--fija)'), panelInt = panel && panel.querySelector('.corr-ficha-interior');
    respaldoFotos(raiz);
    var rejillaLinks = raiz.querySelectorAll('.corr-ficha-reservar');
    for (i = 0; i < rejillaLinks.length; i++) on(rejillaLinks[i], 'click', reservar);

    /* atlas de las ristras */
    var atlas = new Image(), atlasListo = false;
    atlas.onload = function () { atlasListo = true; pintar(true); };
    atlas.onerror = function () { if (!atlas.dataset.png) { atlas.dataset.png = '1'; atlas.src = o.base + 'img/corredor/panoyas.png'; } };
    atlas.src = o.base + 'img/corredor/panoyas.webp';

    var ristras = GEO.map(crearRistra);
    for (i = 0; i < botones.length; i++) ristras[i].boton = botones[i];

    /* ---- medidas ---- */
    var escritorio = false, vw = 0, anchoVista = 0, altoVista = 0, esceneW = 0, k = 1, sx = 1, travel = 0, dpr = 1, topPista = 0;
    var prog = 0;
    function medir() {
      anchoVista = innerWidth; altoVista = innerHeight;
      escritorio = !quieto && innerWidth >= 900;
      raiz.classList.toggle('corr--escritorio', escritorio);
      raiz.classList.toggle('corr--flujo', !escritorio);
      var cw = document.documentElement.clientWidth;
      if (escritorio) {
        estadio.style.width = cw + 'px';
        estadio.style.marginLeft = (-raiz.getBoundingClientRect().left) + 'px';
        estadio.style.height = innerHeight + 'px';
        vw = cw;
        var alto = vista.clientHeight;
        k = Math.min(alto / ALTO, 1.1); // tope: la foto de origen es pequeña y ampliada se ve blanda
        esceneW = Math.round(ANCHO * k);
        escena.style.width = esceneW + 'px'; escena.style.height = Math.round(ALTO * k) + 'px';
        vista.style.overflow = 'hidden';
        travel = Math.max(520, (esceneW - vw) * 1.5);
        pista.style.height = (innerHeight + travel) + 'px';
      } else {
        estadio.style.width = ''; estadio.style.marginLeft = ''; estadio.style.height = ''; pista.style.height = '';
        vw = raiz.clientWidth;
        if (quieto) { esceneW = vw; } else { esceneW = Math.max(vw, Math.round(vw * 1.85)); }
        k = esceneW / ANCHO;
        escena.style.width = esceneW + 'px'; escena.style.height = Math.round(ALTO * k) + 'px';
        escena.style.transform = '';
        vista.style.overflow = '';
      }
      raiz.style.setProperty('--corr-zoc', raiz.querySelector('.corr-zocalo').offsetHeight + 'px');
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var cwpx = Math.min(Math.round(esceneW * dpr), 3000);
      lienzo.width = cwpx; lienzo.height = Math.round(cwpx * ALTO / ANCHO);
      sx = lienzo.width / ANCHO;
      capa.style.width = esceneW + 'px'; capa.style.height = Math.round(ALTO * k) + 'px';
      pintar(true);
    }

    /* ---- dibujo ---- */
    function limpiar(r) {
      var g = r.g;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(Math.floor((g.x0 - 80) * sx), Math.floor((g.y0 - 40) * sx), Math.ceil((g.x1 - g.x0 + 160) * sx), Math.ceil((g.y1 - g.y0 + 140) * sx));
    }
    function pintar(todo) {
      if (!atlasListo) return;
      for (var q = 0; q < ristras.length; q++) {
        var r = ristras[q];
        limpiar(r);
        var e = r.rev;
        if (e <= 0.001) continue;
        var ease = 1 - Math.pow(1 - e, 3);
        ctx.globalAlpha = Math.min(1, ease * 1.4);
        var px = r.juntas[0].x, py = r.juntas[0].y - (1 - ease) * 70 * (k > 0 ? 1 : 1);
        for (var j = 0; j < NSEG; j++) {
          var s = r.g.s[j], c = Math.cos(r.phi[j]), sn = Math.sin(r.phi[j]);
          ctx.setTransform(sx * c, sx * sn, -sx * sn, sx * c, sx * px, sx * py);
          ctx.drawImage(atlas, s[0], s[1], s[2], s[3], -s[4], -s[5], s[2], s[3]);
          if (j < NSEG - 1) {
            var dx = r.juntas[j + 1].x - r.juntas[j].x, dy = r.juntas[j + 1].y - r.juntas[j].y;
            px += c * dx - sn * dy; py += sn * dx + c * dy;
          }
        }
        ctx.globalAlpha = 1;
        if (r.boton) {
          r.boton.classList.toggle('visible', e > 0.7);
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    /* ---- bucle ---- */
    var raf = 0, ultimo = 0, acum = 0, tReloj = 0, viento = 0, scrollY0 = scrollY, tScroll = 0, enPantalla = false, ultimaActividad = 0;
    function despertar() { if (!quieto && !raf && enPantalla) { ultimo = 0; raf = requestAnimationFrame(cuadro); } }
    function cuadro(ts) {
      raf = 0;
      if (!enPantalla || document.hidden) return;
      var dt = ultimo ? Math.min(0.05, (ts - ultimo) / 1000) : 1 / 60;
      ultimo = ts; tReloj += dt;
      /* viento: velocidad de scroll suavizada */
      var vy = (scrollY - scrollY0) / Math.max(dt, 0.001);
      scrollY0 = scrollY;
      viento += (clamp(vy, -3500, 3500) - viento) * Math.min(1, dt * 9);
      if (escritorio) aplicarPan();
      var ahora = performance.now();
      acum += dt;
      var pasos = 0, t0 = performance.now();
      while (acum >= DT && pasos < 5) {
        for (var q = 0; q < ristras.length; q++) pasoRistra(ristras[q], viento, tReloj);
        acum -= DT; pasos++;
      }
      if (acum > DT * 5) acum = 0;
      medidaFisica = performance.now() - t0;
      /* aparición de las ristras, una a una */
      var activo = Math.abs(viento) > 4;
      for (q = 0; q < ristras.length; q++) {
        var r = ristras[q];
        var meta = r.forzada || r.meta ? 1 : 0;
        if (r.rev !== meta) {
          var antes = r.rev;
          r.rev = meta ? Math.min(1, r.rev + dt * 1.25) : Math.max(0, r.rev - dt * 2.5);
          if (antes === 0 && meta) { r.w[0] += (r.i % 2 ? -1 : 1) * 1.7; r.w[1] += (r.i % 2 ? -1 : 1) * 1.1; }
          activo = true;
        }
        if (energia(r) > 0.004) activo = true; else { for (var j = 0; j < NSEG; j++) { r.phi[j] = 0; r.w[j] = 0; } }
      }
      pintar();
      if (activo) { ultimaActividad = ahora; raf = requestAnimationFrame(cuadro); }
      else if (Math.abs(viento) > 0.5) raf = requestAnimationFrame(cuadro);
    }
    var medidaFisica = 0;

    /* ---- recorrido de lado (escritorio) ---- */
    var UMBRAL = [0.04, 0.17, 0.31, 0.5];
    function progreso() {
      var r = pista.getBoundingClientRect();
      var tramo = pista.offsetHeight - estadio.offsetHeight;
      prog = tramo > 0 ? clamp(-r.top / tramo, 0, 1) : 0;
      return prog;
    }
    function aplicarPan() {
      var p = progreso();
      var x = esceneW > vw ? -p * (esceneW - vw) : (vw - esceneW) / 2;
      escena.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      capa.style.transform = 'translate3d(' + ((0.5 - p) * 30 * k).toFixed(2) + 'px,0,0)';
      for (var q = 0; q < ristras.length; q++) {
        var m = p >= UMBRAL[q] ? 1 : 0;
        if (ristras[q].meta !== m) { ristras[q].meta = m; }
      }
    }

    /* ---- eventos ---- */
    var ultimoEvScroll = 0;
    on(window, 'scroll', function () { if (enPantalla) despertar(); }, { passive: true });
    var io = new IntersectionObserver(function (ents) {
      enPantalla = ents[0].isIntersecting;
      if (enPantalla) {
        if (!escritorio && !iniciadoFlujo) { iniciadoFlujo = true; escalonar(); }
        despertar();
      }
    }, { rootMargin: '120px 0px 120px 0px' });
    io.observe(pista);
    var iniciadoFlujo = false, temporizadores = [];
    function escalonar() {
      for (var q = 0; q < ristras.length; q++) (function (r, d) {
        temporizadores.push(setTimeout(function () { r.meta = 1; despertar(); }, d));
      })(ristras[q], 250 + q * 260);
    }
    on(document, 'visibilitychange', function () { if (!document.hidden) despertar(); });

    var anchoPrev = innerWidth, altoPrev = innerHeight;
    on(window, 'resize', function () {
      /* la barra del móvil sale y entra al cambiar el sentido del scroll: no se rehace nada (checklist punto 10) */
      if (innerWidth === anchoPrev && Math.abs(innerHeight - altoPrev) < 160) return;
      anchoPrev = innerWidth; altoPrev = innerHeight;
      var estabaEsc = escritorio;
      medir();
      if (escritorio !== estabaEsc && !escritorio && !iniciadoFlujo && enPantalla) { iniciadoFlujo = true; escalonar(); }
      if (!escritorio) for (var q = 0; q < ristras.length; q++) if (iniciadoFlujo) ristras[q].meta = 1;
      despertar();
    });

    /* empujar: el ratón o el dedo que pasan por una ristra */
    function empujar(r, v, yRel) {
      var desde = Math.floor(clamp(yRel, 0, 0.99) * NSEG);
      for (var j = 0; j < NSEG; j++) {
        var peso = j >= desde ? 1 : 0.35;
        r.w[j] += clamp(-v * 1.1, -2.6, 2.6) * peso * (0.6 + 0.25 * j);
      }
      despertar();
    }
    var ultPtr = {};
    function conBoton(b, idx) {
      var r = ristras[idx];
      on(b, 'pointermove', function (ev) {
        var t = ev.timeStamp, u = ultPtr[idx];
        ultPtr[idx] = { x: ev.clientX, t: t };
        if (!u || t - u.t > 120 || t === u.t) return;
        var v = (ev.clientX - u.x) / (t - u.t);
        if (Math.abs(v) < 0.03) return;
        var rc = b.getBoundingClientRect();
        empujar(r, v, (ev.clientY - rc.top) / Math.max(1, rc.height));
      });
      on(b, 'pointerleave', function () { ultPtr[idx] = null; });
      on(b, 'pointerdown', function (ev) {
        var rc = b.getBoundingClientRect();
        var lado = ev.clientX < rc.left + rc.width / 2 ? 1 : -1;
        empujar(r, lado * 0.9, (ev.clientY - rc.top) / Math.max(1, rc.height));
      });
      on(b, 'click', function () { abrir(idx); });
      on(b, 'focus', function () {
        r.forzada = true;
        if (escritorio) centrar(idx);
        despertar();
      });
    }
    for (i = 0; i < botones.length; i++) conBoton(botones[i], i);

    /* con el teclado, el recorrido va hasta la ristra enfocada */
    function centrar(idx) {
      var g = GEO[idx];
      var xc = (g.x0 + g.x1) / 2 * k;
      var p = esceneW > vw ? clamp((xc - vw / 2) / (esceneW - vw), 0, 1) : 0;
      var tramo = pista.offsetHeight - estadio.offsetHeight;
      var top = pista.getBoundingClientRect().top + scrollY;
      var y = top + p * tramo;
      if (Math.abs(y - scrollY) > 4) window.scrollTo({ top: y, behavior: 'auto' });
    }

    var abierta = -1;
    function abrir(idx) {
      var f = FICHAS[idx];
      if (abierta === idx) { cerrar(true); return; }
      abierta = idx;
      panelInt.innerHTML = htmlFicha(f, o, uid + '-t');
      panel.setAttribute('aria-labelledby', uid + '-t');
      respaldoFotos(panel);
      var rl = panel.querySelector('.corr-ficha-reservar'); rl.addEventListener('click', reservar);
      panel.hidden = false;
      for (var q = 0; q < botones.length; q++) botones[q].setAttribute('aria-expanded', q === idx ? 'true' : 'false');
      for (q = 0; q < botones.length; q++) botones[q].classList.toggle('activa', q === idx);
      if (escritorio) {
        var rc = botones[idx].getBoundingClientRect();
        panel.classList.toggle('a-la-izquierda', rc.left + rc.width / 2 > vw / 2);
        panel.classList.toggle('a-la-derecha', !(rc.left + rc.width / 2 > vw / 2));
      }
      raiz.classList.add('corr--con-ficha');
      var t = panel.querySelector('.corr-ficha-t');
      try { t.focus({ preventScroll: !escritorio ? false : true }); } catch (e) { /* nada */ }
      if (!escritorio) {
        var rr = panel.getBoundingClientRect();
        if (rr.top > innerHeight - 160 || rr.top < 0) panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      ristras[idx].w[0] += 1.2; despertar();
    }
    function cerrar(devolverFoco) {
      if (abierta < 0) return;
      var idx = abierta; abierta = -1;
      panel.hidden = true;
      raiz.classList.remove('corr--con-ficha');
      for (var q = 0; q < botones.length; q++) { botones[q].setAttribute('aria-expanded', 'false'); botones[q].classList.remove('activa'); }
      if (devolverFoco) botones[idx].focus({ preventScroll: true });
    }
    if (panel) {
      on(panel.querySelector('.corr-cerrar'), 'click', function () { cerrar(true); });
      on(raiz, 'keydown', function (ev) { if (ev.key === 'Escape' && abierta >= 0) { ev.preventDefault(); cerrar(true); } });
    }

    /* ---- arranque ---- */
    medir();
    if (quieto) { for (i = 0; i < ristras.length; i++) ristras[i].rev = 1; pintar(true); }
    else if (escritorio) { aplicarPan(); }
    else {
      /* en flujo, la escena es más ancha que la pantalla: se empieza viendo las dos primeras ristras */
      vista.scrollLeft = Math.max(0, esceneW * 0.15);
    }
    if (!quieto) despertar();

    var api = {
      destruir: function () {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        io.disconnect();
        for (var q = 0; q < temporizadores.length; q++) clearTimeout(temporizadores[q]);
        for (q = 0; q < oyentes.length; q++) oyentes[q][0].removeEventListener(oyentes[q][1], oyentes[q][2], oyentes[q][3]);
        el.innerHTML = restaurar;
        delete el.dataset.montado;
      },
      /* para las pruebas: estado de la física */
      _estado: function () {
        return { ristras: ristras.map(function (r) { return { phi: r.phi.slice(), w: r.w.slice(), rev: r.rev }; }), escritorio: escritorio, quieto: quieto, prog: prog, ms: medidaFisica, abierta: abierta, enMarcha: !!raf };
      },
      _empujar: function (idx, v) { empujar(ristras[idx], v, 0.2); }
    };
    return api;
  }

  P.corredor = { montar: montar };
})();
