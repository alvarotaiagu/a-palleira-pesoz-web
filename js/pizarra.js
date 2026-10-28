/* ------------------------------------------------------------------
   A Palleira · la pizarra del cierre (agente Entrada).
   «Lo importante ye querese y que el agua te fresquina», escrito a tiza trazo a trazo con LA LETRA DE LA PROPIA
   PIZARRA (el esqueleto de las letras de la foto 22, un path por trazo en orden de escritura: img/entrada/pizarra.svg,
   que saca scripts/entrada-pizarra.py). Cada trazo avanza con pathLength + strokeDashoffset escritos a mano en cada
   fotograma (sin GSAP: no hay autoRound que pueda saltarse el trazo). La tiza lleva el grano de una capa estática
   encima (img/entrada/tiza-huecos.webp, del color de la pizarra) y, al terminar cada trazo, suelta un poco de polvo. Se escribe al entrar
   en pantalla (no con scrub).

   Contrato (ENCARGO.md): window.Palleira.pizarra.montar(el, opciones) -> { destruir() }.
   - Sustituye el contenido de `el`: el respaldo (foto + frase en texto) se queda DENTRO, oculto, y vuelve si se
     destruye o si el SVG no carga. Pone el.dataset.montado = '1'; al acabar de escribir, el.dataset.escrita = '1'.
   - opciones: { movimiento: bool, densidad: 'paja'|'sobria', ruta: 'img/entrada/pizarra.svg' }. Con movimiento
     false, densidad sobria o prefers-reduced-motion la frase sale ya escrita y quieta (el CONTENIDO es el mismo).
   - Debajo: «Está escrito en la pizarra de la casa.» y el botón «Ver fechas» (Palleira.reservar() si existe; si no,
     enlaza a #reservar).
   - Para las pruebas: la asa devuelta tiene { trazos, progreso(), pintar(ms), escribir(), duracion }.
   ------------------------------------------------------------------ */
(function (w, d) {
  'use strict';
  var P = w.Palleira = w.Palleira || {};
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FRASE = 'Lo importante ye querese y que el agua te fresquina';

  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var easeInOutSine = function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; };

  function quieto(op) {
    var q = false;
    try { q = w.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    return q || op.movimiento === false || op.densidad === 'sobria' || d.documentElement.classList.contains('densidad-sobria');
  }

  function el_(tag, cls, attrs) {
    var e = d.createElementNS(SVGNS, tag);
    if (cls) e.setAttribute('class', cls);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* los restos de borrado: pasadas anchas y borrosas de un trapo, de un trazo de tiza muy pálido. Una sola vez. */
  function restos(vw, vh) {
    var s = el_('svg', 'pizarra__fondo', { viewBox: '0 0 ' + vw + ' ' + vh, 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'none' });
    var defs = el_('defs');
    defs.innerHTML = '<filter id="pz-borrosa" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="' + Math.round(vw / 90) + '"/></filter>';
    s.appendChild(defs);
    var g = el_('g', '', { filter: 'url(#pz-borrosa)', fill: 'none', stroke: '#F1EAD8', 'stroke-linecap': 'round' });
    var pasadas = [
      [.04, .20, .30, .13, .62, .24, .96, .12, .07, .10], [.02, .52, .26, .44, .55, .56, .98, .47, .06, .13],
      [.05, .86, .34, .78, .70, .90, .95, .80, .05, .09], [.10, .32, .22, .38, .40, .30, .68, .36, .04, .08],
      [.30, .68, .48, .62, .74, .70, .92, .64, .045, .07]
    ];
    pasadas.forEach(function (p) {
      var path = el_('path', '', {
        d: 'M' + (p[0] * vw).toFixed(0) + ' ' + (p[1] * vh).toFixed(0) + 'C' + (p[2] * vw).toFixed(0) + ' ' + (p[3] * vh).toFixed(0) + ' ' + (p[4] * vw).toFixed(0) + ' ' + (p[5] * vh).toFixed(0) + ' ' + (p[6] * vw).toFixed(0) + ' ' + (p[7] * vh).toFixed(0),
        'stroke-width': (p[8] * vw).toFixed(0), 'stroke-opacity': p[9]
      });
      g.appendChild(path);
    });
    s.appendChild(g);
    return s;
  }

  function montar(el, op) {
    op = op || {};
    if (!el) return { destruir: function () {} };
    if (el.__pizarra) return el.__pizarra;

    var raf = 0, io = null, vivo = true, hecho = false, construido = null, respaldo = null;
    var asa = {
      trazos: [], duracion: 0, escrita: false,
      progreso: function () { return hecho ? 1 : (asa._t || 0) / (asa.duracion || 1); },
      destruir: destruir
    };
    el.__pizarra = asa;

    var ruta = op.ruta || el.getAttribute('data-svg') || 'img/entrada/pizarra.svg';
    var pedido = w.fetch ? w.fetch(ruta, { credentials: 'same-origin' }) : Promise.reject(new Error('sin fetch'));
    pedido.then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) { if (vivo) construir(txt); })
      .catch(function (e) { el.dataset.pizarra = 'respaldo'; if (w.console) console.warn('pizarra: se queda el respaldo (' + e.message + ')'); });

    function construir(txt) {
      var doc = new w.DOMParser().parseFromString(txt, 'image/svg+xml');
      var origen = doc.documentElement;
      var vb = (origen.getAttribute('viewBox') || '0 0 2000 1600').split(/\s+/).map(Number);
      var vw = vb[2], vh = vb[3];
      var grupo = origen.querySelector('#frase');
      var paths = grupo ? [].slice.call(grupo.querySelectorAll('path.trazo')) : [];
      if (!paths.length) throw new Error('sin trazos');

      // --- la estructura (el respaldo se guarda dentro, oculto)
      respaldo = d.createElement('div');
      respaldo.className = 'pizarra__respaldo';
      respaldo.hidden = true;
      while (el.firstChild) respaldo.appendChild(el.firstChild);

      var raiz = d.createElement('div');
      raiz.className = 'pizarra';
      var tablero = d.createElement('div');
      tablero.className = 'pizarra__tablero';
      tablero.style.aspectRatio = vw + ' / ' + vh;
      tablero.appendChild(restos(vw, vh));
      var grano = d.createElement('div'); grano.className = 'pizarra__grano'; grano.setAttribute('aria-hidden', 'true');
      tablero.appendChild(grano);

      var svg = el_('svg', 'pizarra__frase', { viewBox: '0 0 ' + vw + ' ' + vh, role: 'img', 'aria-label': FRASE, focusable: 'false' });
      var tg = el_('g', 'pizarra__trazos', { fill: 'none', 'stroke-width': origen.querySelector('#frase').getAttribute('stroke-width') || '32', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      var largos = [], lineas = [];
      paths.forEach(function (p) {
        var n = el_('path', 'trazo', { d: p.getAttribute('d'), pathLength: '1' });
        n.style.strokeDasharray = '1 1';
        n.style.strokeDashoffset = '1';
        n.style.opacity = '0';                      // un punto suelto antes de que le toque (cap redondo)
        tg.appendChild(n);
        asa.trazos.push(n);
        largos.push(parseFloat(p.getAttribute('data-l')) || 200);
        lineas.push(parseInt(p.getAttribute('data-f'), 10) || 0);
      });
      var polvoG = el_('g', 'pizarra__polvo', { fill: '#F1EAD8' });
      svg.appendChild(tg);
      svg.appendChild(polvoG);
      tablero.appendChild(svg);
      var huecos = d.createElement('div'); huecos.className = 'pizarra__huecos'; huecos.setAttribute('aria-hidden', 'true');
      tablero.appendChild(huecos);
      raiz.appendChild(tablero);

      var pie = d.createElement('p'); pie.className = 'pizarra__pie'; pie.textContent = 'Está escrito en la pizarra de la casa.';
      var boton = d.createElement('a'); boton.className = 'pizarra__boton'; boton.href = '#reservar'; boton.textContent = 'Ver fechas';
      boton.addEventListener('click', function (e) {
        if (P.reservar && typeof P.reservar === 'function') { e.preventDefault(); try { P.reservar(); } catch (er) { console.warn(er); } }
      });
      var cola = d.createElement('div'); cola.className = 'pizarra__cola';
      cola.appendChild(pie); cola.appendChild(boton);
      raiz.appendChild(cola);

      el.appendChild(respaldo);
      el.appendChild(raiz);
      el.dataset.montado = '1';
      construido = raiz;

      // --- el horario: la velocidad se reparte para que la frase entera lleve ~6 s (los 75 trazos: unos 80 ms cada uno)
      var gap = 22, gapLinea = 220, durMin = 50, objetivo = 6000;
      var v = 2200;
      for (var it = 0; it < 12; it++) {
        var tot = 0;
        for (var i = 0; i < largos.length; i++) tot += Math.max(durMin, largos[i] / v * 1000) + (i && lineas[i] !== lineas[i - 1] ? gapLinea : gap);
        v *= tot / objetivo;
      }
      var inicio = [], dur = [], t0 = 250;
      for (i = 0; i < largos.length; i++) {
        if (i) t0 += (lineas[i] !== lineas[i - 1] ? gapLinea : gap);
        inicio.push(t0);
        dur.push(Math.max(durMin, largos[i] / v * 1000));
        t0 += dur[i];
      }
      asa.duracion = t0;
      asa.inicio = inicio;
      asa.dur = dur;

      // --- polvo: un puñado de motas que caen al acabar cada trazo
      var motas = [];
      for (i = 0; i < 36; i++) {
        var c = el_('circle', '', { r: '3', cx: '0', cy: '0' });
        c.style.opacity = '0';
        polvoG.appendChild(c);
        motas.push({ c: c, vida: 0, x: 0, y: 0, vx: 0, vy: 0, r: 3, v0: 1 });
      }
      var puntos = {}, avisados = {};
      var semilla = 7;
      var alea = function () { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
      function soltar(k) {
        var p = asa.trazos[k];
        var fin = p.getPointAtLength(p.getTotalLength());
        var n = 0;
        for (var j = 0; j < motas.length && n < 4; j++) {
          var m = motas[j];
          if (m.vida > 0) continue;
          m.vida = m.v0 = .55 + alea() * .5; m.x = fin.x + (alea() - .5) * 26; m.y = fin.y + (alea() - .3) * 20;
          m.vx = (alea() - .5) * 46; m.vy = 18 + alea() * 40; m.r = 1.6 + alea() * 3.2;
          m.c.setAttribute('r', m.r.toFixed(1));
          n++;
        }
      }

      function pintar(t) {
        asa._t = t;
        for (var i = 0; i < asa.trazos.length; i++) {
          var u = easeInOutSine(clamp((t - inicio[i]) / dur[i], 0, 1));
          var n = asa.trazos[i];
          n.style.strokeDashoffset = (1 - u).toFixed(4);
          n.style.opacity = t >= inicio[i] ? '1' : '0';
          if (u >= 1 && !avisados[i]) { avisados[i] = true; if (polvoOn) soltar(i); }
        }
      }
      var polvoOn = true;
      function polvo(dt) {
        for (var j = 0; j < motas.length; j++) {
          var m = motas[j];
          if (m.vida <= 0) continue;
          m.vida -= dt;
          m.x += m.vx * dt; m.y += m.vy * dt; m.vy += 40 * dt; m.vx *= .97;
          m.c.setAttribute('cx', m.x.toFixed(1)); m.c.setAttribute('cy', m.y.toFixed(1));
          m.c.style.opacity = m.vida > 0 ? (clamp(m.vida / m.v0, 0, 1) * .55).toFixed(3) : '0';
        }
      }

      function acabar() {
        if (hecho) return;
        hecho = true; asa.escrita = true;
        pintar(asa.duracion + 1);
        for (var j = 0; j < motas.length; j++) motas[j].c.style.opacity = '0';
        el.dataset.escrita = '1';
      }
      asa.pintar = pintar;
      asa.acabar = acabar;

      function escribir() {
        if (hecho || asa._corriendo) return;
        asa._corriendo = true;
        var reloj = 0, ult = null;
        function paso(ahora) {
          if (!vivo || hecho) return;
          if (ult === null) ult = ahora;
          var dt = Math.min(ahora - ult, 100);        // un atasco cuenta como 0,1 s: la tiza no salta
          ult = ahora; reloj += dt;
          pintar(reloj);
          polvo(dt / 1000);
          if (reloj >= asa.duracion + 700) { acabar(); return; }
          raf = w.requestAnimationFrame(paso);
        }
        raf = w.requestAnimationFrame(paso);
      }
      asa.escribir = escribir;

      if (quieto(op)) { polvoOn = false; acabar(); return; }

      // se escribe al entrar en pantalla (no con scrub)
      pintar(0);
      if ('IntersectionObserver' in w) {
        io = new w.IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); io = null; escribir(); }
        }, { threshold: .35 });
        io.observe(tablero);
      } else escribir();
    }

    function destruir() {
      vivo = false;
      if (raf) w.cancelAnimationFrame(raf);
      if (io) { io.disconnect(); io = null; }
      if (construido && construido.parentNode) construido.parentNode.removeChild(construido);
      if (respaldo) { while (respaldo.firstChild) el.appendChild(respaldo.firstChild); if (respaldo.parentNode) respaldo.parentNode.removeChild(respaldo); }
      delete el.dataset.montado; delete el.dataset.escrita;
      delete el.__pizarra;
    }
    return asa;
  }

  P.pizarra = { montar: montar, frase: FRASE };
})(window, document);
