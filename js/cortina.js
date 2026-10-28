/* ------------------------------------------------------------------
   A Palleira · cortina «el monograma» (agente Entrada).
   Sobre un fondo de tablas marrón tostado (dos hojas de pajar), la caja del logo: la A se traza en tres
   pinceladas (pathLength + strokeDashoffset, escritos a mano en cada fotograma: no hay redondeo de GSAP que
   pueda saltarse el trazo), la P cae girando como un cayado, rebota y se queda apoyada cruzándola, «ALLEIRA»
   se completa letra a letra y «CASA DE ALDEA» aparece debajo. Después las hojas se abren desde el centro como
   las puertas de un pajar (giran sobre sus bisagras laterales, en perspectiva leve) y el monograma vuela a
   [data-cortina-destino] (la marca de la cabecera). Unos 2,5 s.

   Contrato (ENCARGO.md): window.Palleira.cortina = { alAbrirse(fn), alRetirarse(fn), abrir(), retirar(),
   abierta, fuera, enMarcha, marcas }. El puente lo pone el script de partes/cortina.html ANTES que este
   fichero, así existe desde el primer pintado y los demás módulos pueden suscribirse aunque este fichero tarde.
   Este fichero solo hace la animación y se arranca solo.
   - alAbrirse(fn) se llama cuando EMPIEZA a abrirse (no cuando acaba). También: evento «palleira:cortina-abre».
   - alRetirarse(fn) cuando ya no está. También: evento «palleira:cortina-fuera» y clase html.cortina-fuera.
   - Se salta (la cortina se retira sin animar) si la página tardó más de 2 s en arrancar, con movimiento
     reducido y con densidad sobria.
   - Todo se pinta con una función del tiempo (pintar(t)): el mismo fotograma sale igual siempre y se puede
     medir. Reloj que no se traga los atascos: un fotograma de más de 0,1 s cuenta como 0,1 s.
   ------------------------------------------------------------------ */
(function (w, d) {
  'use strict';
  var P = w.Palleira = w.Palleira || {};
  var CC = P.cortina;
  var cort = d.getElementById('cortina');
  if (!CC || !cort || cort.__montada) return;
  cort.__montada = true;

  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var sub = function (t, a, b) { return clamp((t - a) / (b - a), 0, 1); };          // 0..1 dentro de [a, b]
  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeInOutSine = function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; };
  var easeInOutCubic = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeInOutExpo = function (t) { return t <= 0 ? 0 : (t >= 1 ? 1 : (t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2)); };

  // tiempos en ms desde que arranca la animación
  var T = {
    caja: [0, 260],
    a1: [80, 520], a2: [440, 760], a3: [700, 900],       // las tres pinceladas de la A
    cae: [600, 1080], rebota: [1080, 1400],              // la P
    alleira0: 1000, alleiraPaso: 50, alleiraDur: 210,    // «ALLEIRA» letra a letra
    casa0: 1250, casaPaso: 22, casaDur: 240,             // «CASA DE ALDEA»
    abre: 1720,                                          // empieza a abrirse (alAbrirse)
    puertas: [1720, 2480], vuelo: [1720, 2420],
    fuera: 2520
  };

  var quieto = function () {
    var q = false;
    try { q = w.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    return q || d.documentElement.classList.contains('densidad-sobria');
  };
  var marcas = CC.marcas = CC.marcas || {};
  marcas.montado = Math.round(w.performance.now());

  // sin animación: movimiento reducido, sobria, o la página ya tardó más de 2 s en arrancar
  if (quieto()) { marcas.quieto = true; CC.retirar(); return; }
  if (w.performance.now() > (CC.umbral || 2000)) { marcas.tarde = true; CC.retirar(); return; }

  var $ = function (s, r) { return (r || cort).querySelector(s); };
  var marca = $('.cortina__marca'), caja = $('.cortina__caja'), mono = $('.cortina__mono');
  var a = [$('#cp-a1'), $('#cp-a2'), $('#cp-a3')];
  var pG = $('#cp-p');
  var letras = [].slice.call(cort.querySelectorAll('#cp-alleira .cortina__letra'));
  var casaG = $('#cp-casa');
  var casa = [].slice.call(cort.querySelectorAll('#cp-casa .cortina__letra'));
  var hojaI = $('.cortina__hoja--i'), hojaD = $('.cortina__hoja--d');
  var sombras = [].slice.call(cort.querySelectorAll('.cortina__sombra'));
  var luz = $('.cortina__luz');
  if (!marca || !caja || !mono || !a[0] || !a[1] || !a[2] || !pG || !hojaI || !hojaD) { CC.retirar(); return; }

  CC.enMarcha = true;
  cort.classList.add('es-lista');

  // la P: pivote del giro en el aire (el centro de su caja) y en el apoyo (su punta)
  var PIV = { cx: 195, cy: 220, pie: [277, 374] };
  var VB = (caja.getAttribute('viewBox') || '8 30 990 384').split(/\s+/).map(Number);
  var ys = -900;           // altura de la que cae, en unidades del dibujo: se mide al empezar
  var vuelo = null;        // { dx, dy, s } del vuelo a la cabecera, medido al empezar a abrirse
  var aterrizado = false;
  var abierta = false;

  function medirCaida() {
    var r = marca.getBoundingClientRect();
    var k = r.width / VB[2] || 1;
    ys = -(r.top / k) - 470;
  }

  // el destino: la marca de la cabecera. Si el elemento marcado lleva dentro la imagen del monograma, se aterriza sobre ella
  // (no sobre el enlace entero, que puede llevar también el texto «A Palleira»).
  function rectDestino(dest) {
    var t = dest && (dest.querySelector('img, svg') || dest);
    var r = t ? t.getBoundingClientRect() : null;
    return r && r.width > 4 && r.height > 4 ? r : null;
  }

  function medirVuelo() {
    var dest = d.querySelector('[data-cortina-destino]');
    var r0 = mono.getBoundingClientRect();
    var r1 = rectDestino(dest);
    vuelo = { dest: r1 ? dest : null, r0: { cx: r0.left + r0.width / 2, cy: r0.top + r0.height / 2, h: r0.height }, dx: 0, dy: 0, s: 1.12 };
    if (r1) apuntar(r1);
  }
  function apuntar(r1) {
    vuelo.dx = (r1.left + r1.width / 2) - vuelo.r0.cx;
    vuelo.dy = (r1.top + r1.height / 2) - vuelo.r0.cy;
    vuelo.s = r1.height / vuelo.r0.h;
  }

  function pintar(t) {
    // --- la caja y su rótulo entran
    var uc = easeOutCubic(sub(t, T.caja[0], T.caja[1]));
    marca.style.opacity = uc;
    marca.style.transform = 'translate(-50%,-50%) scale(' + (.94 + .06 * uc).toFixed(4) + ')';

    // --- la A: tres pinceladas
    var rangos = [T.a1, T.a2, T.a3];
    for (var i = 0; i < 3; i++) {
      var u = easeInOutSine(sub(t, rangos[i][0], rangos[i][1]));
      a[i].style.strokeDashoffset = (1 - u).toFixed(4);
      a[i].style.opacity = t >= rangos[i][0] ? 1 : 0;          // un punto suelto antes de que le toque (cap redondo)
    }

    // --- la P: cae girando, rebota y se apoya
    if (t < T.cae[0]) pG.style.opacity = 0;
    else {
      pG.style.opacity = 1;
      var tr;
      if (t < T.cae[1]) {
        var uf = sub(t, T.cae[0], T.cae[1]);
        tr = 'translate(0 ' + (ys * (1 - uf * uf)).toFixed(2) + ') rotate(' + (-360 * (1 - uf)).toFixed(2) + ' ' + PIV.cx + ' ' + PIV.cy + ')';
      } else {
        var ur = sub(t, T.rebota[0], T.rebota[1]);
        var y = -26 * Math.exp(-1.2 * ur) * Math.abs(Math.sin(2 * Math.PI * ur));
        var rot = 7 * Math.exp(-2 * ur) * Math.sin(2 * Math.PI * ur);
        tr = 'translate(0 ' + y.toFixed(2) + ') rotate(' + rot.toFixed(2) + ' ' + PIV.pie[0] + ' ' + PIV.pie[1] + ')';
      }
      pG.setAttribute('transform', tr);
    }

    // --- el rótulo
    for (i = 0; i < letras.length; i++) {
      var ul = easeOutCubic(sub(t, T.alleira0 + i * T.alleiraPaso, T.alleira0 + i * T.alleiraPaso + T.alleiraDur));
      letras[i].style.opacity = ul;
      letras[i].style.transform = 'translateY(' + ((1 - ul) * 12).toFixed(2) + 'px)';
    }
    for (i = 0; i < casa.length; i++) {
      var uk = easeOutCubic(sub(t, T.casa0 + i * T.casaPaso, T.casa0 + i * T.casaPaso + T.casaDur));
      casa[i].style.opacity = uk;
      casa[i].style.transform = 'translateY(' + ((1 - uk) * 8).toFixed(2) + 'px)';
    }
    if (casaG) casaG.style.opacity = 1;

    // --- se abre: las hojas giran sobre sus bisagras, el monograma vuela a la cabecera
    if (t >= T.abre && !abierta) {
      abierta = true;
      medirVuelo();
      marcas.abre = Math.round(w.performance.now());
      CC.abrir();                                      // alAbrirse(fn): EMPIEZA a abrirse
    }
    var up = easeInOutExpo(sub(t, T.puertas[0], T.puertas[1]));
    if (t >= T.puertas[0] - 40) {
      hojaI.style.transform = 'rotateY(' + (100 * up).toFixed(2) + 'deg)';
      hojaD.style.transform = 'rotateY(' + (-100 * up).toFixed(2) + 'deg)';
      sombras.forEach(function (s) { s.style.opacity = (.7 * up).toFixed(3); });
      if (luz) luz.style.opacity = (Math.sin(Math.PI * clamp(up * 1.15, 0, 1)) * .85).toFixed(3);
      // el rótulo y la caja se apartan mientras el monograma emprende el vuelo
      caja.style.opacity = (1 - sub(t, T.vuelo[0], T.vuelo[0] + 320)).toFixed(3);
      if (vuelo) {
        // la cabecera puede estar entrando a la vez: se vuelve a medir el destino en cada fotograma
        if (vuelo.dest) { var rr = rectDestino(vuelo.dest); if (rr) apuntar(rr); }
        var uv = easeInOutCubic(sub(t, T.vuelo[0], T.vuelo[1]));
        mono.style.transform = 'translate(' + (vuelo.dx * uv).toFixed(2) + 'px,' + (vuelo.dy * uv).toFixed(2) + 'px) scale(' + (1 + (vuelo.s - 1) * uv).toFixed(4) + ')';
        var ua = sub(uv, .9, 1);
        mono.style.opacity = vuelo.dest ? (1 - ua).toFixed(3) : (1 - sub(uv, .45, 1)).toFixed(3);
        if (vuelo.dest && uv >= .9 && !aterrizado) { aterrizado = true; d.documentElement.classList.add('cortina-aterriza'); }
      }
    }
  }

  var reloj = 0, ult = null, hecho = false, raf = 0;
  function paso(ahora) {
    if (hecho) return;
    if (ult === null) ult = ahora;
    reloj += Math.min(ahora - ult, 100);
    ult = ahora;
    pintar(reloj);
    marcas.t = Math.round(reloj);
    if (reloj >= T.fuera) { terminar(); return; }
    raf = w.requestAnimationFrame(paso);
  }
  function terminar() {
    if (hecho) return;
    hecho = true;
    w.cancelAnimationFrame(raf);
    marcas.fuera = Math.round(w.performance.now());
    CC.retirar();
  }

  medirCaida();
  pintar(0);
  marcas.arranca = Math.round(w.performance.now());
  raf = w.requestAnimationFrame(paso);

  // por si el navegador no llega a pintar (pestaña oculta mucho rato): la red de seguridad del puente la retira a los 8 s;
  // y si algo falla aquí dentro, se retira ya
  w.addEventListener('error', function (e) { if (!CC.fuera && e && e.filename && /cortina\.js/.test(e.filename)) { hecho = true; CC.retirar(); } });

  CC.destruir = terminar;
  CC.tiempos = T;
  CC.pintar = pintar;   // solo para las pruebas
})(window, document);
