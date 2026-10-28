/* ------------------------------------------------------------------
   A Palleira · Pesoz · «Paja y naranja» · lo común de la página
   - Monta los módulos (corredor, mapa, pizarra, paja-pie) con su respaldo, al acercarse a la pantalla.
   - La portada «Desde el corredor»: se abre (.abierta) cuando la cortina EMPIEZA a abrirse y, al bajar, --p separa sus capas.
   - El índice de «Dentro» marca la estancia que se ve.
   - Cabecera con fondo al bajar y la espiga en el enlace activo; menú móvil.
   - Palleira.reservar(), el visor de fotos (Palleira.visor.abrir(lista, nombre)), cookies, mapa de Google a petición,
     el foco del teclado con su muesca y el mando de maqueta (?revision).
   - La cortina es de Entrada (partes/cortina.html + js/cortina.js). El motor de reservas va en js/reserva.js.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  const raiz = document.documentElement;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = !quieto;
  const sobria = () => raiz.classList.contains('densidad-sobria');
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const P = (window.Palleira = window.Palleira || {});
  const CO = P.cortina;
  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // el resize de la barra del móvil (mismo ancho, poca altura) no rehace NADA (checklist punto 10)
  let anchoVista = innerWidth, altoVista = innerHeight;
  const esBarra = () => innerWidth === anchoVista && Math.abs(innerHeight - altoVista) < 160;

  /* ============ 1. titulares que se destapan (solo con movimiento) ============ */
  // «con-movimiento» se pone DESPUÉS de dejar los observadores listos. Se observa el contenedor, no el titular:
  // Chrome aplica el clip-path del propio elemento y no avisaba nunca (checklist punto 13).
  const titulares = $$('[data-partir]');
  if (motion && 'IntersectionObserver' in window) {
    const deCaja = new Map();
    titulares.forEach((h) => { const c = h.parentElement || h; if (!deCaja.has(c)) deCaja.set(c, []); deCaja.get(c).push(h); });
    const vistos = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { (deCaja.get(e.target) || []).forEach((h) => h.classList.add('es-visto')); vistos.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    deCaja.forEach((_, c) => vistos.observe(c));
    raiz.classList.add('con-movimiento');
  } else titulares.forEach((h) => h.classList.add('es-visto'));

  /* ============ 2. ir a un sitio ============ */
  const cabAlto = () => parseFloat(getComputedStyle(raiz).getPropertyValue('--cab')) || 72;
  const irA = (sel) => {
    const el = typeof sel === 'string' ? $(sel) : sel;
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - cabAlto() - 8;
    scrollTo({ top: Math.max(0, y), behavior: quieto || sobria() ? 'auto' : 'smooth' });
  };

  /* ============ 3. la cabecera: fondo al bajar y espiga en el enlace activo ============ */
  const cab = $('#cab');
  const enlaces = $$('.cab__nav a');
  const secciones = enlaces.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  let actual = null;
  function pintarCabecera() {
    cab.classList.toggle('sc', scrollY > 24);
    const y = cabAlto() + altoVista * 0.25;
    let sec = null;
    for (const s of secciones) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) sec = s; }
    if (sec !== actual) {
      actual = sec;
      enlaces.forEach((a) => { if (sec && a.getAttribute('href') === '#' + sec.id) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }
  }

  /* ============ 3 bis. la portada: al bajar, el marco del corredor crece más que el paisaje (--p de 0 a 1) ============ */
  const portada = $('#portada');
  let altoPortada = portada ? portada.offsetHeight : 1, pPrev = -1;
  function pintarPortada() {
    if (!portada) return;
    if (!motion || sobria()) { if (pPrev !== -1) { portada.style.removeProperty('--p'); pPrev = -1; } return; }
    const p = Math.min(1, Math.max(0, scrollY / (altoPortada || 1)));
    if (p === pPrev) return;
    pPrev = p;
    portada.style.setProperty('--p', p.toFixed(4));
  }

  /* ============ 3 ter. el índice de «Dentro»: la estancia que cruza la franja del centro de la pantalla ============ */
  const indice = $$('.estancias__indice a');
  if (indice.length && 'IntersectionObserver' in window) {
    const ids = indice.map((a) => a.getAttribute('href').slice(1));
    const dentro = new Set();
    const ioEst = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? dentro.add(e.target.id) : dentro.delete(e.target.id)));
      const id = ids.find((x) => dentro.has(x));
      if (!id) return;                                  // entre dos estancias: se queda la que había
      indice.forEach((a) => { if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-38% 0px -52% 0px' });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) ioEst.observe(el); });
  }

  /* ============ 4. módulos: corredor, mapa, pizarra y paja-pie ============ */
  const montados = new Map();     // el → { inst, respaldo }
  const esperando = new Set();    // cerca de la pantalla, pero su JS aún no ha llegado
  const nombreMod = (el) => ({ 'paja-pie': 'pajaPie' }[el.dataset.modulo] || el.dataset.modulo);
  function modulo(el) {
    const m = P[nombreMod(el)];
    return m && typeof m.montar === 'function' ? m : null;
  }
  const opciones = () => ({ movimiento: motion && !sobria(), densidad: sobria() ? 'sobria' : 'paja' });
  function montarModulo(el) {
    if (montados.has(el)) return;
    const mod = modulo(el);
    if (!mod) { esperando.add(el); return; }
    esperando.delete(el);
    const respaldo = el.innerHTML;
    try {
      const inst = mod.montar(el, opciones());
      montados.set(el, { inst, respaldo });
    } catch (er) {
      console.warn('Módulo ' + el.dataset.modulo + ': se queda el respaldo', er);
      montados.set(el, { inst: null, respaldo });
    }
  }
  const reintentar = () => { if (esperando.size) [...esperando].forEach(montarModulo); };
  addEventListener('load', reintentar);
  function remontarTodos() {
    [...montados].forEach(([el, { inst, respaldo }]) => {
      try { inst && inst.destruir && inst.destruir(); } catch (er) { console.warn(er); }
      el.innerHTML = respaldo;
      delete el.dataset.montado;
      montados.delete(el);
      montarModulo(el);
    });
  }
  // el montón del pie (paja-pie) se monta AL CARGAR, no al acercarse: si no, sale ya casi lleno y no se ve crecer
  const pajaPie = $('[data-modulo="paja-pie"]');
  if (pajaPie) montarModulo(pajaPie);
  const todos = $$('[data-modulo]').filter((el) => el !== pajaPie);
  if ('IntersectionObserver' in window) {
    const ioMod = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { ioMod.unobserve(e.target); montarModulo(e.target); }
    }), { rootMargin: '900px 0px' });
    todos.forEach((el) => ioMod.observe(el));
  } else todos.forEach(montarModulo);

  /* ============ 6. menú y anclas ============ */
  const btnMenu = $('#menu-btn'), menu = $('#menu-movil');
  const cerrarMenu = () => {
    document.body.classList.remove('menu');
    btnMenu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
  };
  btnMenu.addEventListener('click', () => {
    const abierto = document.body.classList.toggle('menu');
    btnMenu.setAttribute('aria-expanded', String(abierto));
    menu.setAttribute('aria-hidden', String(!abierto));
  });

  /* ============ 7. reservar: Palleira.reservar() ============ */
  P.reservar = function (op) {
    if (op && P.motor) {
      if (op.mes != null) P.motor.mes(op.mes);
      if (op.entrada && op.salida) P.motor.fechas(op.entrada, op.salida);
    }
    cerrarMenu();
    irA('#reservar');
  };
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-reservar]');
    if (r) { e.preventDefault(); P.reservar(); return; }
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const destino = a.getAttribute('href');
    if (destino.length < 2 || !$(destino)) return;
    e.preventDefault();
    cerrarMenu();
    irA(destino);
    setTimeout(() => {
      const t = $(destino);
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
    }, 900);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu')) { cerrarMenu(); btnMenu.focus(); } });

  /* ============ 8. cookies (y el mando se aparta mientras están) ============ */
  const ck = $('#cookies');
  const LLAVE = 'palleira-cookies';
  const leer = () => { try { return localStorage.getItem(LLAVE); } catch (e) { return null; } };
  const guardar = (v) => { try { localStorage.setItem(LLAVE, v); } catch (e) {} };
  const mando = $('#mando');
  const verMando = () => { if (mando && raiz.classList.contains('revision')) mando.hidden = !ck.hidden; };
  let cookiesPendientes = !leer();
  function mostrarCookies() {
    if (!cookiesPendientes) { verMando(); return; }
    cookiesPendientes = false;
    ck.hidden = false;
    verMando();
  }
  const cerrarCk = (v) => { guardar(v); ck.hidden = true; verMando(); };
  $('#ck-si').addEventListener('click', () => cerrarCk('si'));
  $('#ck-no').addEventListener('click', () => cerrarCk('no'));
  $('#abrir-cookies').addEventListener('click', () => { ck.hidden = false; verMando(); $('#ck-si').focus(); });

  /* ============ 9. mapa de Google solo al pedirlo ============ */
  $('#mapa-btn').addEventListener('click', () => {
    const marco = document.createElement('iframe');
    marco.src = 'https://www.google.com/maps?q=' + encodeURIComponent('43.256559,-6.875258') + '&z=15&output=embed';
    marco.loading = 'lazy';
    marco.title = 'Mapa con A Palleira en El Caleyo, Pesoz';
    marco.referrerPolicy = 'no-referrer-when-downgrade';
    $('#mapa').appendChild(marco);
    $('#mapa-consent').remove();
  });

  /* ============ 10. visor de fotos: se abre por el NOMBRE de la foto ============ */
  // Palleira.visor.abrir(lista, nombre): lista = nombres de foto (o { nombre, alt, pie }) y nombre = con cuál empieza.
  const visor = $('#visor');
  const vImg = $('#visor-img'), vPie = $('#visor-pie'), vN = $('#visor-n');
  const FOTOS = new Map();
  let fotosCargadas = false;
  function cargarFotos() {
    if (fotosCargadas) return;
    fotosCargadas = true;
    fetch('img/fotos/fotos.json').then((r) => r.json()).then((l) => l.forEach((f) => FOTOS.set(f.nombre, f))).catch(() => {});
  }
  (window.requestIdleCallback || ((f) => setTimeout(f, 2500)))(cargarFotos);
  function infoFoto(n) {
    const img = $('picture[data-foto="' + n + '"] img');
    const f = FOTOS.get(n);
    let anchos = f ? f.anchos.slice() : null, ancho = f ? f.ancho : 0, alto = f ? f.alto : 0, alt = '', pie = '';
    if (img) {
      const a = (img.getAttribute('srcset') || '').split(',').map((x) => parseInt(x.trim().split(/\s+/)[1], 10)).filter(Boolean).sort((p, q) => p - q);
      if (a.length) anchos = a;
      ancho = +img.getAttribute('width') || ancho; alto = +img.getAttribute('height') || alto;
      alt = img.alt;
      const cont = img.closest('figure');
      const cap = cont && cont.querySelector('figcaption');
      pie = cap ? cap.textContent.replace(/\s+/g, ' ').trim() : alt;
    }
    return { n, alt, pie: pie || alt, anchos: anchos && anchos.length ? anchos : [800], ancho: ancho || 1024, alto: alto || 768 };
  }
  let lista = [], actualV = 0, origen = null;
  function poner(i) {
    actualV = (i + lista.length) % lista.length;
    const f = lista[actualV];
    const peq = f.anchos.includes(800) ? 800 : f.anchos[0], gran = f.anchos[f.anchos.length - 1];
    // primero la de 800 (o la menor, ya en caché), y la grande al cargar
    vImg.src = `img/fotos/${f.n}-${peq}.jpg`;
    vImg.dataset.nombre = f.n;
    vImg.alt = f.alt;
    vImg.width = f.ancho; vImg.height = f.alto;
    vImg.style.setProperty('--nat', f.ancho + 'px');
    if (gran !== peq) {
      const grande = new Image();
      grande.onload = () => { if (vImg.dataset.nombre === f.n) vImg.src = grande.src; };
      grande.src = `img/fotos/${f.n}-${gran}.jpg`;
    }
    vPie.textContent = f.pie;
    vN.textContent = (actualV + 1) + ' / ' + lista.length;
  }
  function abrirVisor(nombres, nombre, desde) {
    if (!visor || typeof visor.showModal !== 'function') return;
    const vistos = new Set();
    lista = [];
    (nombres || []).forEach((x) => {
      const o = typeof x === 'string' ? { nombre: x } : x;
      const n = o.nombre || o.n;
      if (!n || vistos.has(n)) return;
      vistos.add(n);
      const f = infoFoto(n);
      if (o.alt) f.alt = o.alt;
      if (o.pie) f.pie = o.pie;
      lista.push(f);
    });
    if (!lista.length) return;
    let i = lista.findIndex((f) => f.n === nombre);
    if (i < 0) i = 0;
    origen = desde || document.activeElement;
    poner(i);
    if (!visor.open) visor.showModal();
  }
  P.visor = { abrir: (l, n) => abrirVisor(l, n) };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-visor]');
    if (!b) return;
    const g = b.getAttribute('data-grupo');
    const botones = g ? $$('[data-visor][data-grupo="' + g + '"]') : $$('[data-visor]', b.closest('section') || document);
    abrirVisor(botones.map((x) => x.dataset.visor), b.dataset.visor, b);
  });
  if (visor) {
    $('#visor-ant').addEventListener('click', () => poner(actualV - 1));
    $('#visor-sig').addEventListener('click', () => poner(actualV + 1));
    $('#visor-cerrar').addEventListener('click', () => visor.close());
    visor.addEventListener('click', (e) => { if (e.target === visor || e.target.classList.contains('visor__fig')) visor.close(); });
    visor.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') poner(actualV - 1); else if (e.key === 'ArrowRight') poner(actualV + 1); });
    visor.addEventListener('close', () => { if (origen && document.contains(origen)) origen.focus({ preventScroll: true }); });
  }

  /* ============ 11. el foco del teclado: contorno de 2 px y una muesca naranja en la esquina ============ */
  const muesca = $('#foco-muesca');
  let enfocado = null;
  function ponerMuesca() {
    if (!muesca) return;
    const el = enfocado;
    if (!el || !document.contains(el) || el.closest('dialog')) { muesca.classList.remove('es-visible'); return; }
    const r = el.getBoundingClientRect();
    if (!r.width) { muesca.classList.remove('es-visible'); return; }
    const fijo = !!el.closest('.cab, .cookies, .mando, .menu-movil, .saltar');
    muesca.classList.toggle('es-fijo', fijo);
    muesca.style.left = (r.left - 3 + (fijo ? 0 : scrollX)) + 'px';
    muesca.style.top = (r.top - 3 - 5 + (fijo ? 0 : scrollY)) + 'px';
    muesca.style.setProperty('--foco', getComputedStyle(el).getPropertyValue('--foco').trim() || '#3B1C0A');
    muesca.classList.add('es-visible');
  }
  // :focus-visible se decide al terminar de moverse el foco: se mira un instante después
  let tFoco = 0;
  const mirarFoco = () => {
    clearTimeout(tFoco);
    tFoco = setTimeout(() => {
      const el = document.activeElement;
      let visible = false;
      try { visible = !!el && el !== document.body && el.matches(':focus-visible'); } catch (er) {}
      enfocado = visible ? el : null;
      ponerMuesca();
    }, 0);
  };
  document.addEventListener('focusin', mirarFoco);
  document.addEventListener('focusout', mirarFoco);

  /* ============ 12. con el scroll: cabecera y módulos que esperan ============ */
  let pend = 0;
  function alScroll() {
    pend = 0;
    pintarCabecera();
    pintarPortada();
    reintentar();
    if (enfocado && muesca.classList.contains('es-fijo')) ponerMuesca();
  }
  addEventListener('scroll', () => { if (!pend) pend = requestAnimationFrame(alScroll); }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!pend) pend = requestAnimationFrame(alScroll); }).observe($('#principal'));
  alScroll();

  /* ============ 13. MANDO DE MAQUETA (no viaja al cliente) ============ */
  if (mando && raiz.classList.contains('revision')) {
    const botones = $$('button[data-densidad]', mando);
    const pintarMando = () => botones.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.densidad === 'sobria') === sobria())));
    botones.forEach((b) => b.addEventListener('click', () => {
      const antes = sobria();
      raiz.classList.toggle('densidad-sobria', b.dataset.densidad === 'sobria');
      const u = new URL(location.href);
      if (b.dataset.densidad === 'sobria') u.searchParams.set('densidad', 'sobria'); else u.searchParams.delete('densidad');
      history.replaceState(null, '', u);
      pintarMando();
      if (antes === sobria()) return;
      if (sobria() && CO && !CO.fuera && typeof CO.retirar === 'function') CO.retirar();
      remontarTodos();
      document.dispatchEvent(new CustomEvent('palleira:densidad', { detail: sobria() ? 'sobria' : 'paja' }));
    }));
    pintarMando();
    verMando();
  }
  /* fin del MANDO DE MAQUETA */

  /* ============ 5. la cortina (de Entrada): la portada se abre cuando la cortina EMPIEZA a abrirse ============ */
  function iniciarCortina() {
  const alAbrirse = (fn) => { if (CO && typeof CO.alAbrirse === 'function') CO.alAbrirse(fn); else fn(); };
  alAbrirse(() => {
    const p = $('#portada');
    if (p) p.classList.add('abierta');
  });
  const alRetirarse = (fn) => { if (CO && typeof CO.alRetirarse === 'function') CO.alRetirarse(fn); else fn(); };
  alRetirarse(() => {
    if (!location.hash && scrollY > 0) scrollTo(0, 0);        // recargar a media página (checklist punto 12)
    mostrarCookies();
  });
  // red de seguridad: sin el módulo de la cortina o con una cortina atascada, a los 9 s la página es de quien la lee
  setTimeout(() => { if (CO && !CO.fuera && typeof CO.retirar === 'function') CO.retirar(); }, 9000);
  }

  /* ============ 14. resize de verdad (no el de la barra del móvil) ============ */
  let tRes = 0;
  addEventListener('resize', () => {
    if (esBarra()) return;
    clearTimeout(tRes);
    tRes = setTimeout(() => {
      anchoVista = innerWidth; altoVista = innerHeight;
      if (portada) altoPortada = portada.offsetHeight;
      document.dispatchEvent(new CustomEvent('palleira:resize'));
      alScroll();
      ponerMuesca();
    }, 200);
  });

  iniciarCortina();

  // lo que pueden usar los módulos y las pruebas
  P.web = { motion, quieto, sobria, irA, montados, get altoVista() { return altoVista; } };
  document.dispatchEvent(new CustomEvent('palleira:web'));
})();
