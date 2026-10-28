/* ------------------------------------------------------------------
   A Palleira · «La paja que se hace casa»                    (agente Paja)

   window.Palleira.paja.montar(el, opciones) → { destruir() }
     el = [data-modulo="paja"] (su <picture> de «corredor» es el respaldo y el LCP: no se toca hasta después).
     opciones = { movimiento: bool, densidad: 'paja'|'sobria', tapada?: bool, recorte?: [x, y, w, h] }
   window.Palleira.pajaPie.montar(el, opciones) → { destruir() }   el montón de paja del pie
   window.Palleira.paja.comprobar() → { ok, error }   compila los sombreadores en un lienzo de 4×4, sin pintar

   Viva (WebGL2, o WebGL1 + ANGLE_instanced_arrays): miles de hebras instanciadas (un quad por hebra). Todo el
   movimiento se calcula en el sombreador de vértices a partir del tiempo, sin texturas ping-pong:
     · vuelo: curva desde fuera por la izquierda (la ráfaga) + desplazamiento de ruido curl que se mueve; giran
       y dan vueltas sobre su eje (destello);
     · posado una a una (barrido de izquierda a derecha, los bordes fuertes antes): llegan un poco fuera del
       borde, a lo largo de su normal y torcidas, y un muelle amortiguado las deja alineadas con el borde;
     · el gesto: el puntero deja «soplos» (cápsulas de su recorrido, 36 como mucho); cada uno empuja las hebras
       cercanas con la respuesta de un muelle amortiguado (se apartan y se vuelven a posar en ~3 s);
     · el scroll se lleva la paja hacia arriba a la derecha y la desvanece (el velo se aparta);
     · tras posarse, la foto real se funde detrás y la paja queda como un velo fino y dorado.
   Quieta (movimiento reducido, densidad sobria) y respaldo (sin WebGL, ?sin-webgl, ahorro de datos): la foto y
   el dibujo de paja pintado UNA vez en canvas 2D, que se desvanece con el scroll. Sin gesto.

   Los puntos (img/paja/puntos-*.bin) salen de scripts/paja-puntos.py. Se descargan con prioridad baja cuando
   la foto de la portada ya ha cargado (no compiten con el LCP). El lienzo se crea al montar (tras alAbrirse).
   DPR ≤ 1,5; pausa fuera de pantalla y con la pestaña oculta; calidad automática; 30 fps en reposo.
   failIfMajorPerformanceCaveat: con WebGL por software (sin tarjeta) no se crea y va al respaldo.

   Parámetros de prueba: ?sin-webgl · ?hebras=N · ?paja-info (marcador) · ?paja-lenta · ?paja-rapida ·
   ?paja-puntos=movil|escritorio · ?paja-motor=falso (solo pruebas: todo menos pintar).
   Lanza en document «palleira:posada» (detail: { modo }) cuando la paja termina de posarse.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var P = (window.Palleira = window.Palleira || {});
  var d = document;
  var SCRIPT = d.currentScript && d.currentScript.src ? d.currentScript.src : '';
  var BASE = SCRIPT ? new URL('../', SCRIPT).href : new URL('./', location.href).href;
  var VERSION = SCRIPT ? new URL(SCRIPT).search : '';
  var Q = new URLSearchParams(location.search);
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var suave = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var RECORTE_FOTO = [30, 26, 1863, 806];          // el de «corredor» en scripts/fotos-lista.json (si no lo dice el .bin)
  var NS = 36;                                     // soplos a la vez
  var VIDA_SOPLO = 3.2;                            // s
  var DUR = 2.2;                                   // escala del barrido de salida (s)
  var T_POSADO = DUR * 0.72 + 2.3 + 0.9;           // sale la última en DUR·0,72, vuela ≤ 2,3 s y el muelle se calma en ~0,9 s
  var T_VELO = 1.8;                                // la foto se funde y la paja pasa a velo

  function ahorro() { try { return !!(navigator.connection && navigator.connection.saveData); } catch (e) { return false; } }
  function reducido() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function sinWebgl() { return Q.has('sin-webgl') || ahorro(); }
  function escalaTiempo() { return Q.has('paja-lenta') ? 0.35 : Q.has('paja-rapida') ? 4 : 1; }
  function avisar(modo) { try { d.dispatchEvent(new CustomEvent('palleira:posada', { detail: { modo: modo } })); } catch (e) {} }
  function azarFijo(semilla) {             // mulberry32
    var a = semilla >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function enRango(x) { return (Math.imul(x ^ (x >>> 16), 0x45d9f3b) ^ Math.imul(x, 0x27d4eb2d)) >>> 0; }

  /* ================= los puntos ================= */
  var cache = {};
  function leer(buf) {
    var dv = new DataView(buf);
    if (buf.byteLength < 32 || String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'PAJA') throw new Error('puntos: no es un fichero de paja');
    var n = dv.getUint32(8, true), bpp = dv.getUint16(6, true);
    if (bpp !== 8 || buf.byteLength < 32 + n * 8) throw new Error('puntos: tamaño inesperado');
    var r = [0, 1, 2, 3].map(function (i) { return dv.getUint16(12 + i * 2, true); });
    var g = [0, 1, 2, 3].map(function (i) { return dv.getUint16(20 + i * 2, true) / 65535; });
    return { n: n, recorte: r, region: g, u16: new Uint16Array(buf, 32, n * 4), u8: new Uint8Array(buf, 32, n * 8), bytes: buf.byteLength };
  }
  function cargarPuntos(cual) {
    if (!cache[cual]) {
      var url = BASE + 'img/paja/puntos-' + cual + '.bin' + VERSION;
      var op = { credentials: 'same-origin' };
      try { op.priority = 'low'; } catch (e) {}
      cache[cual] = fetch(url, op).then(function (r) { if (!r.ok) throw new Error('puntos: ' + r.status); return r.arrayBuffer(); }).then(leer);
      cache[cual].catch(function () { delete cache[cual]; });
    }
    return cache[cual];
  }

  /* ================= cómo cae la foto en la caja =================
     Devuelve la transformación uv de los puntos (sobre su recorte de 09.jpg) → uv del lienzo (= la caja el). */
  function recorteDe(img, op, datos) {
    var r = op && op.recorte;
    if (!r && img && img.dataset && img.dataset.recorte) r = img.dataset.recorte.trim().split(/[\s,]+/).map(Number);
    if (!r || r.length !== 4 || r.some(isNaN)) r = datos ? datos.recorte : RECORTE_FOTO;
    return r;
  }
  function encaje(el, img, rImg, rPts) {
    var rc = el.getBoundingClientRect();
    var W = rc.width || 1, H = rc.height || 1;
    if (!img) return { sx: 1, sy: 1, ox: 0, oy: 0, W: W, H: H, area: W * H };
    var ri = img.getBoundingClientRect();
    var nw = img.naturalWidth || +img.getAttribute('width') || rImg[2];
    var nh = img.naturalHeight || +img.getAttribute('height') || rImg[3];
    var cs = getComputedStyle(img);
    var fit = cs.objectFit, sx, sy;
    if (fit === 'cover') sx = sy = Math.max(ri.width / nw, ri.height / nh);
    else if (fit === 'contain' || fit === 'scale-down') sx = sy = Math.min(ri.width / nw, ri.height / nh);
    else if (fit === 'none') sx = sy = 1;
    else { sx = ri.width / nw; sy = ri.height / nh; }
    var rw = nw * sx || 1, rh = nh * sy || 1;
    var pos = (cs.objectPosition || '50% 50%').split(/\s+/);
    var lugar = function (v, libre) {
      if (!v || v === 'center') return libre / 2;
      if (v === 'left' || v === 'top') return 0;
      if (v === 'right' || v === 'bottom') return libre;
      if (/%$/.test(v)) return libre * parseFloat(v) / 100;
      return parseFloat(v) || 0;
    };
    var ix = ri.left + lugar(pos[0], ri.width - rw), iy = ri.top + lugar(pos[1] || pos[0], ri.height - rh);
    // punto (u de su recorte) → px de 09 → u de la imagen → px de página → u del lienzo
    var ax = rPts[2] / rImg[2] * rw / W, bx = ((rPts[0] - rImg[0]) / rImg[2] * rw + ix - rc.left) / W;
    var ay = rPts[3] / rImg[3] * rh / H, by = ((rPts[1] - rImg[1]) / rImg[3] * rh + iy - rc.top) / H;
    return { sx: ax, sy: ay, ox: bx, oy: by, W: W, H: H };
  }
  // qué parte de la foto (u de los puntos) se ve en la caja
  function visible(m) {
    return [clamp(-m.ox / m.sx, 0, 1), clamp(-m.oy / m.sy, 0, 1), clamp((1 - m.ox) / m.sx, 0, 1), clamp((1 - m.oy) / m.sy, 0, 1)];
  }
  function elegirFichero(el, img, op) {
    var f = Q.get('paja-puntos');
    if (f === 'movil' || f === 'escritorio') return f;
    if (ahorro()) return 'movil';
    var r = recorteDe(img, op, null);
    var v = visible(encaje(el, img, r, r));
    return v[2] - v[0] <= 0.66 && v[0] >= 0.17 && v[2] <= 0.83 ? 'movil' : 'escritorio';
  }
  function topeHebras(vivo) {
    var n = parseInt(Q.get('hebras'), 10);
    if (n > 0) return clamp(n, 200, 60000);
    var tactil = false;
    try { tactil = matchMedia('(pointer: coarse)').matches; } catch (e) {}
    var pequeno = Math.min(screen.width || innerWidth, screen.height || innerHeight) < 700;
    if (tactil && pequeno) return vivo ? 10000 : 9000;
    if (tactil || pequeno) return 18000;
    return 40000;
  }

  // las instancias: solo los puntos que caen en la caja (+3 %), en el orden del fichero (barajado: prefijo = submuestra)
  // 12 bytes por hebra: x, y (u16) · ángulo, tono, largo, peso (u8) · 4 bytes de azar fijos por punto
  function instancias(datos, m, tope) {
    var n = datos.n, u16 = datos.u16, u8 = datos.u8;
    var out = new Uint8Array(Math.min(n, tope) * 12), k = 0;
    for (var i = 0; i < n && k < tope; i++) {
      var cu = u16[i * 4] / 65535 * m.sx + m.ox, cv = u16[i * 4 + 1] / 65535 * m.sy + m.oy;
      if (cu < -0.03 || cu > 1.03 || cv < -0.03 || cv > 1.03) continue;
      var o = k * 12, s = i * 8;
      for (var j = 0; j < 8; j++) out[o + j] = u8[s + j];
      var h = enRango(i * 2654435761 + 97);
      out[o + 8] = h & 255; out[o + 9] = (h >>> 8) & 255; out[o + 10] = (h >>> 16) & 255; out[o + 11] = (h >>> 24) & 255;
      k++;
    }
    // medidas: separación media entre hebras en la zona con puntos que se ve
    var g = datos.region;
    var x0 = clamp(m.ox + g[0] * m.sx, 0, 1), x1 = clamp(m.ox + g[2] * m.sx, 0, 1);
    var y0 = clamp(m.oy + g[1] * m.sy, 0, 1), y1 = clamp(m.oy + g[3] * m.sy, 0, 1);
    var area = Math.max(1, (x1 - x0) * m.W * (y1 - y0) * m.H);
    var sep = Math.sqrt(area / Math.max(1, k));
    return { buf: out.subarray(0, k * 12), n: k, sep: sep };
  }
  // largo base, largo extra y ancho (px CSS) según la separación
  function medidas(sep) {
    return { lb: clamp(sep * 0.95, 3, 11), le: clamp(sep * 1.45, 2.5, 15), an: clamp(sep * 0.21, 0.95, 1.9) };
  }

  /* ================= el color de una hebra (el mismo en GL y en 2D) ================= */
  var TOSTADO = [0.478, 0.290, 0.086], PAJA = [0.847, 0.698, 0.353], CLARA = [0.965, 0.890, 0.651];
  function colorTono(t) {
    var a, b, k;
    if (t < 0.55) { a = TOSTADO; b = PAJA; k = clamp(t * 1.8, 0, 1); } else { a = PAJA; b = CLARA; k = clamp((t - 0.55) / 0.45, 0, 1); }
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }

  /* ================= sombreadores ================= */
  var VERT = [
    'precision highp float;',
    'attribute vec2 aEsq;',
    'attribute vec2 aDest;',
    'attribute vec4 aInfo;',
    'attribute vec4 aAzar;',
    'uniform float uT;',
    'uniform float uTn;',
    'uniform vec2 uRes;',
    'uniform vec4 uMap;',
    'uniform vec3 uHebra;',
    'uniform float uVelo;',
    'uniform float uScroll;',
    'uniform float uDur;',
    'uniform float uNumSoplos;',
    'uniform float uRadio;',
    'uniform vec4 uSoploA[NS];',
    'uniform vec4 uSoploB[NS];',
    'varying vec2 vQ;',
    'varying float vMedio;',
    'varying vec3 vCol;',
    'varying float vAlfa;',
    'varying float vBrillo;',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }',
    'float campo(vec2 p){ return ruido(p) + .5 * ruido(p * 2.03 + 7.1); }',
    // ruido curl: rotacional de un potencial escalar (sin divergencia: remolinos, no fuentes)
    'vec2 rizo(vec2 p){ const float e = .08;',
    '  return vec2(campo(p + vec2(0., e)) - campo(p - vec2(0., e)), campo(p - vec2(e, 0.)) - campo(p + vec2(e, 0.))) / (2. * e); }',
    'void main(){',
    '  float H = uRes.y, Wd = uRes.x;',
    '  float ang0 = aInfo.x * 3.14159265;',
    '  float tono = aInfo.y, largo = aInfo.z, peso = aInfo.w;',
    '  vec2 D = (aDest * uMap.xy + uMap.zw) * uRes;',
    // cuándo sale y llega cada una: barrido de izquierda a derecha; los bordes fuertes antes. Todas salen en t ≥ 0
    '  float xn = clamp(D.x / Wd, 0., 1.);',
    '  float sale = uDur * (.45 * xn + .12 * (1. - peso) + .15 * aAzar.x);',
    '  float vuelo = 1. + .7 * aAzar.y + .6 * xn;',
    '  float llegada = sale + vuelo;',
    '  float s = clamp((uT - sale) / vuelo, 0., 1.);',
    '  float e = 1. - pow(1. - s, 2.2);',
    // la ráfaga: entra por la izquierda a cualquier altura, el aire la lleva a la derecha, se pasa de su sitio y cae en él
    '  vec2 P0 = vec2(-.02 * Wd - .14 * Wd * aAzar.z, H * (.02 + .98 * aAzar.w));',
    '  vec2 C1 = P0 + vec2(Wd * (.35 + .3 * aAzar.y), -H * .1 * aAzar.x);',
    '  vec2 C2 = D + vec2(Wd * (.10 + .16 * aAzar.z), -H * (.05 + .14 * aAzar.x));',
    '  float ie = 1. - e;',
    '  vec2 B = ie * ie * ie * P0 + 3. * ie * ie * e * C1 + 3. * ie * e * e * C2 + e * e * e * D;',
    '  float env = pow(max(sin(3.14159265 * s), 0.), 1.2);',
    '  vec2 pos = B + rizo(B / H * 2.2 + vec2(uTn * .35, uTn * .05)) * H * .05 * env * (.5 + aAzar.z);',
    // llega un poco fuera de su borde (a lo largo de la normal) y torcida; el muelle la deja en su sitio
    '  vec2 dir0 = vec2(cos(ang0), sin(ang0));',
    '  vec2 nor0 = vec2(-dir0.y, dir0.x);',
    '  float tau = uT - llegada;',
    '  float muelle = tau < 0. ? e : exp(-4.2 * tau) * cos(12.5 * tau);',
    '  pos += nor0 * (aAzar.y - .5) * uHebra.z * 7. * muelle;',
    '  float ang = ang0 + (1. - e) * (1. - e) * (aAzar.w - .5) * 18. + (aAzar.x - .5) * 1.2 * muelle;',
    // reposo: respira muy poco
    '  float quieta = smoothstep(0., 1.5, tau);',
    '  vec2 brisa = rizo(D / H * 3. + vec2(uTn * .06, uTn * .03));',
    '  pos += brisa * uHebra.z * .9 * quieta;',
    '  ang += brisa.x * .04 * quieta;',
    // los soplos del puntero
    '  vec2 emp = vec2(0.); float giro = 0.;',
    '  for (int i = 0; i < NS; i++) {',
    '    if (float(i) >= uNumSoplos) break;',
    '    vec4 a = uSoploA[i]; vec4 b = uSoploB[i];',
    '    vec2 pa = pos - a.xy, ba = a.zw - a.xy;',
    '    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1.), 0., 1.);',
    '    vec2 dd = pa - ba * h;',
    '    float r2 = dot(dd, dd);',
    '    float f = exp(-r2 / (b.z * b.z));',
    '    if (f < .003) continue;',
    '    float resp = exp(-1.8 * b.x) * sin(1.9 * b.x) * 2.973 * (1. - smoothstep(2.6, 3.2, b.x));',
    '    float str = f * resp * b.y;',
    '    emp += (dd * inversesqrt(r2 + 1.) * .85 + ba * inversesqrt(dot(ba, ba) + 1.) * .55) * str * b.z;',
    '    giro += str * (aAzar.z - .5) * 5.;',
    '  }',
    '  emp *= 1. / (1. + length(emp) / (uRadio * 1.4));',
    '  pos += emp;',
    '  ang += giro;',
    // el scroll se la lleva
    '  float ida = smoothstep(.04 + .5 * aAzar.y, .72 + .26 * aAzar.y, uScroll);',
    '  pos += (vec2(.55, -1.) + rizo(D / H * 2. + 11.) * .5) * H * .9 * ida * ida;',
    '  ang += ida * (aAzar.w - .5) * 9.;',
    // vuelta sobre su eje y destello mientras vuela
    '  float fase = uTn * (5. + 7. * aAzar.w) + aAzar.x * 6.2832;',
    '  float vol = max(1. - smoothstep(.82, 1., s), ida);',
    '  float ancho = mix(1., .25 + .75 * abs(cos(fase)), vol);',
    '  vBrillo = vol * pow(abs(sin(fase)), 12.) * .55 + clamp(length(emp) / uRadio, 0., 1.) * .12;',
    // color
    '  vec3 c = tono < .55 ? mix(vec3(.478, .290, .086), vec3(.847, .698, .353), clamp(tono * 1.8, 0., 1.))',
    '                      : mix(vec3(.847, .698, .353), vec3(.965, .890, .651), clamp((tono - .55) / .45, 0., 1.));',
    '  c *= .9 + .2 * aAzar.z;',
    '  vCol = mix(c, vec3(.906, .794, .502), uVelo * .45);',
    // de velo: se quedan las de los bordes (pies derechos, balaustrada, ristras); las de las zonas lisas casi se van
    '  vAlfa = mix(1., mix(.1, .55, smoothstep(.15, .7, peso)), uVelo) * (1. - smoothstep(.5, 1., ida)) * step(.0001, s);',
    // el quad
    '  float L = (uHebra.x + uHebra.y * largo) * (.85 + .3 * aAzar.y);',
    '  float Wh = uHebra.z * ancho * .5;',
    '  vec2 dir = vec2(cos(ang), sin(ang)), nr = vec2(-dir.y, dir.x);',
    '  float mL = L * .5 + 1., mW = Wh + 1.;',
    '  vec2 v = pos + dir * aEsq.x * mL + nr * aEsq.y * mW;',
    '  vQ = vec2(aEsq.x * mL / (L * .5), aEsq.y * mW);',
    '  vMedio = Wh;',
    '  vec2 clip = v / uRes * 2. - 1.;',
    '  gl_Position = vec4(clip.x, -clip.y, 0., 1.);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying vec2 vQ;',
    'varying float vMedio;',
    'varying vec3 vCol;',
    'varying float vAlfa;',
    'varying float vBrillo;',
    'void main(){',
    '  float t = abs(vQ.x);',
    '  float m = vMedio * (1. - .45 * t * t);',                     // más fina hacia las puntas
    '  float a = clamp(m - abs(vQ.y) + .5, 0., 1.) * min(1., vMedio * 2.);',
    '  a *= 1. - smoothstep(.6, 1.05, t);',
    '  float luz = (1. - smoothstep(0., m + .35, abs(vQ.y + m * .35))) * .16;',  // una pizca de brillo a un lado
    '  vec3 col = min(vCol * (1. + luz) + vBrillo, vec3(1.));',
    '  float al = a * vAlfa;',
    '  gl_FragColor = vec4(col * al, al);',
    '}'
  ].join('\n');

  function compilar(gl, ns) {
    function sh(tipo, src) { var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var p = gl.createProgram();
    var v = sh(gl.VERTEX_SHADER, '#define NS ' + ns + '\n' + VERT), f = sh(gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, 'aEsq'); gl.bindAttribLocation(p, 1, 'aDest');
    gl.bindAttribLocation(p, 2, 'aInfo'); gl.bindAttribLocation(p, 3, 'aAzar');
    gl.linkProgram(p);
    return { p: p, v: v, f: f };
  }
  function errores(gl, pr) {
    if (gl.getProgramParameter(pr.p, gl.LINK_STATUS)) return null;
    return [gl.getShaderInfoLog(pr.v), gl.getShaderInfoLog(pr.f), gl.getProgramInfoLog(pr.p)].filter(Boolean).join('\n') || 'no enlaza';
  }

  /* ================= el motor WebGL ================= */
  function motorGL(canvas, alPerder) {
    var atr = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'default', failIfMajorPerformanceCaveat: true };
    var gl = null, v2 = false;
    try { gl = canvas.getContext('webgl2', atr); v2 = !!gl; } catch (e) { gl = null; }
    if (!gl) { try { gl = canvas.getContext('webgl', atr) || canvas.getContext('experimental-webgl', atr); } catch (e) { gl = null; } }
    if (!gl) return null;
    var div, dibujarN;
    if (v2) {
      div = function (i, n) { gl.vertexAttribDivisor(i, n); };
      dibujarN = function (n) { gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); };
    } else {
      var ext = gl.getExtension('ANGLE_instanced_arrays');
      if (!ext) return null;
      div = function (i, n) { ext.vertexAttribDivisorANGLE(i, n); };
      dibujarN = function (n) { ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, n); };
    }
    var ns = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) >= 2 * NS + 24 ? NS : 8;
    var paralelo = gl.getExtension('KHR_parallel_shader_compile');
    var pr = compilar(gl, ns);
    var u = null, perdido = false, n = 0;
    var bEsq = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bEsq);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var bInst = gl.createBuffer();
    var soA = new Float32Array(ns * 4), soB = new Float32Array(ns * 4);
    var alPerderGL = function (e) { e.preventDefault(); perdido = true; if (alPerder) alPerder(); };
    canvas.addEventListener('webglcontextlost', alPerderGL);

    var listo = new Promise(function (ok, no) {
      var intentos = 0;
      (function esperar() {
        if (paralelo && !gl.getProgramParameter(pr.p, paralelo.COMPLETION_STATUS_KHR) && intentos++ < 600) { requestAnimationFrame(esperar); return; }
        var er = errores(gl, pr);
        if (er) { no(new Error('paja: los sombreadores no compilan\n' + er)); return; }
        var nombres = ['uT', 'uTn', 'uRes', 'uMap', 'uHebra', 'uVelo', 'uScroll', 'uDur', 'uNumSoplos', 'uRadio', 'uSoploA', 'uSoploB'];
        u = {};
        nombres.forEach(function (k) { u[k] = gl.getUniformLocation(pr.p, k); });
        gl.useProgram(pr.p);
        gl.bindBuffer(gl.ARRAY_BUFFER, bEsq);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        div(0, 0);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        ok();
      })();
    });

    return {
      tipo: v2 ? 'webgl2' : 'webgl1',
      soplosMax: ns,
      listo: listo,
      get perdido() { return perdido; },
      cargar: function (inst) {
        n = inst.n;
        gl.bindBuffer(gl.ARRAY_BUFFER, bInst);
        gl.bufferData(gl.ARRAY_BUFFER, inst.buf, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.UNSIGNED_SHORT, true, 12, 0); div(1, 1);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 12, 4); div(2, 1);
        gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, 12, 8); div(3, 1);
      },
      dibujar: function (e) {
        if (perdido || !u) return;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(u.uT, e.t);
        gl.uniform1f(u.uTn, e.t % 1000);
        gl.uniform2f(u.uRes, canvas.width, canvas.height);
        gl.uniform4f(u.uMap, e.map.sx, e.map.sy, e.map.ox, e.map.oy);
        gl.uniform3f(u.uHebra, e.hebra[0], e.hebra[1], e.hebra[2]);
        gl.uniform1f(u.uVelo, e.velo);
        gl.uniform1f(u.uScroll, e.scroll);
        gl.uniform1f(u.uDur, DUR);
        gl.uniform1f(u.uRadio, e.radio);
        var k = Math.min(e.soplos.length, ns);
        for (var i = 0; i < k; i++) {
          var s = e.soplos[e.soplos.length - k + i];
          soA[i * 4] = s.x0; soA[i * 4 + 1] = s.y0; soA[i * 4 + 2] = s.x1; soA[i * 4 + 3] = s.y1;
          soB[i * 4] = e.t - s.t0; soB[i * 4 + 1] = s.fuerza; soB[i * 4 + 2] = s.radio; soB[i * 4 + 3] = 0;
        }
        gl.uniform1f(u.uNumSoplos, k);
        gl.uniform4fv(u.uSoploA, soA);
        gl.uniform4fv(u.uSoploB, soB);
        dibujarN(Math.min(n, e.n));
      },
      destruir: function () {
        canvas.removeEventListener('webglcontextlost', alPerderGL);
        try { gl.deleteBuffer(bEsq); gl.deleteBuffer(bInst); gl.deleteProgram(pr.p); } catch (e) {}
        var x = gl.getExtension('WEBGL_lose_context');
        if (x) x.loseContext();
      },
    };
  }
  // para las pruebas: todo el recorrido (tiempos, soplos, scroll, pausa) sin contexto ni píxeles
  function motorFalso() {
    var ultimo = null;
    return { tipo: 'falso', soplosMax: NS, listo: Promise.resolve(), perdido: false, cargar: function () {},
      dibujar: function (e) { ultimo = { t: e.t, velo: e.velo, scroll: e.scroll, soplos: e.soplos.length, n: e.n }; },
      get ultimo() { return ultimo; }, destruir: function () {} };
  }

  /* ================= el dibujo en 2D (respaldo y quieta) ================= */
  function pintar2D(canvas, inst, m, dpr, alfa) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    var med = medidas(inst.sep);
    var lb = med.lb * dpr, le = med.le * dpr, an = med.an * dpr;
    var b = inst.buf, u16 = new Uint16Array(b.buffer, b.byteOffset, b.byteLength >> 1);
    // cubos por tono (6) y por fuerza del borde (2): las de borde, más gruesas y opacas; las de zonas lisas, casi nada
    var TONOS = 6, cubos = [];
    for (var c = 0; c < TONOS * 2; c++) cubos.push(typeof Path2D === 'function' ? new Path2D() : null);
    if (!cubos[0]) return 0;
    for (var i = 0; i < inst.n; i++) {
      var o = i * 12;
      var x = (u16[o >> 1] / 65535 * m.sx + m.ox) * W, y = (u16[(o >> 1) + 1] / 65535 * m.sy + m.oy) * H;
      var a = b[o + 4] / 255 * Math.PI, tono = b[o + 5] / 255, largo = b[o + 6] / 255;
      var L = (lb + le * largo) * (0.85 + 0.3 * b[o + 9] / 255) * 0.5;
      var dx = Math.cos(a) * L, dy = Math.sin(a) * L;
      var cubo = Math.min(TONOS - 1, Math.floor(tono * TONOS)) * 2 + (b[o + 7] > 100 ? 1 : 0);
      cubos[cubo].moveTo(x - dx, y - dy);
      cubos[cubo].lineTo(x + dx, y + dy);
    }
    ctx.lineCap = 'round';
    for (var t = 0; t < TONOS; t++) {
      var col = colorTono((t + 0.5) / TONOS).map(function (v) { return Math.round(clamp(v, 0, 1) * 255); });
      for (var w = 0; w < 2; w++) {
        ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (w ? alfa : alfa * 0.25).toFixed(3) + ')';
        ctx.lineWidth = an * (w ? 1.1 : 0.85);
        ctx.stroke(cubos[t * 2 + w]);
      }
    }
    return inst.n;
  }

  /* ================= marcador (?paja-info) ================= */
  function marcador(el) {
    if (!Q.has('paja-info')) return null;
    var m = d.createElement('div');
    m.className = 'paja-info';
    el.appendChild(m);
    return function (txt) { m.textContent = txt; };
  }

  /* ================= montar ================= */
  function montar(el, op) {
    op = op || {};
    if (!el) return { destruir: function () {} };
    if (el.__paja) el.__paja.destruir();
    var img = el.querySelector('img');
    var vivo = op.movimiento !== false && op.densidad !== 'sobria' && !reducido();
    var modo = vivo && !sinWebgl() ? 'viva' : vivo ? 'respaldo' : 'quieta';
    var api = modo === 'viva' ? montarViva(el, img, op) : null;
    if (!api) api = montarQuieta(el, img, op, modo === 'quieta' ? 'quieta' : 'respaldo');
    el.dataset.montado = '1';
    el.__paja = api;
    return api;
  }

  // ----- quieta / respaldo: la foto y el dibujo de paja pintado una vez -----
  function montarQuieta(el, img, op, modo) {
    var canvas = d.createElement('canvas');
    canvas.className = 'paja-lienzo paja-lienzo--2d';
    canvas.setAttribute('aria-hidden', 'true');
    el.appendChild(canvas);
    el.classList.remove('paja-sin-foto', 'paja-foto-tenue');
    el.dataset.paja = modo;
    var info = marcador(el);
    var datos = null, anchoHecho = 0, altoHecho = 0, fin = false, avisado = false, pintadas = 0;
    var cual = elegirFichero(el, img, op);
    function pintar() {
      if (fin || !datos) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      anchoHecho = innerWidth; altoHecho = innerHeight;
      var rImg = recorteDe(img, op, datos);
      var m = encaje(el, img, rImg, datos.recorte);
      var inst = instancias(datos, m, topeHebras(false));
      pintadas = pintar2D(canvas, inst, m, dpr, 0.55);
      el.dataset.hebras = String(pintadas);
      canvas.classList.add('es-visible');
      if (info) info('paja ' + modo + ' · 2D · ' + pintadas + ' hebras · ' + cual);
      if (!avisado) { avisado = true; avisar(modo); }
    }
    function alScroll() {
      var r = el.getBoundingClientRect();
      var p = clamp(-r.top / Math.max(1, r.height * 0.85), 0, 1);
      canvas.style.setProperty('--paja-ida', suave(0.04, 0.8, p).toFixed(3));
    }
    function alCambiar() {
      // la barra del móvil (solo cambia el alto, poco) no rehace nada
      if (innerWidth === anchoHecho && Math.abs(innerHeight - altoHecho) < 160) return;
      pintar();
    }
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { if (anchoHecho) alCambiar(); }) : null;
    if (ro) ro.observe(el); else addEventListener('resize', alCambiar);
    addEventListener('scroll', alScroll, { passive: true });
    alScroll();
    cargarPuntos(cual).then(function (x) {
      datos = x;
      var hacer = function () { pintar(); };
      if ('requestIdleCallback' in window) requestIdleCallback(hacer, { timeout: 400 }); else setTimeout(hacer, 30);
    }).catch(function (e) {
      if (fin) return;
      el.dataset.paja = 'solo-foto';
      console.warn(e);
      if (!avisado) { avisado = true; avisar('solo-foto'); }
    });
    return {
      modo: modo,
      get hebras() { return pintadas; },
      get fichero() { return cual; },
      destruir: function () {
        fin = true;
        if (ro) ro.disconnect(); else removeEventListener('resize', alCambiar);
        removeEventListener('scroll', alScroll);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        var hud = el.querySelector('.paja-info');
        if (hud) hud.parentNode.removeChild(hud);
        delete el.dataset.montado; delete el.dataset.paja; delete el.dataset.hebras;
        el.__paja = null;
      },
    };
  }

  // ----- viva -----
  function montarViva(el, img, op) {
    var canvas = d.createElement('canvas');
    canvas.className = 'paja-lienzo';
    canvas.setAttribute('aria-hidden', 'true');
    var falso = Q.get('paja-motor') === 'falso';
    var caer = null;                                      // si el motor se pierde, se pasa a la quieta
    var motor = falso ? motorFalso() : motorGL(canvas, function () { if (caer) caer('contexto'); });
    if (!motor) return null;                              // sin WebGL (o por software): respaldo
    el.appendChild(canvas);
    var C = P.cortina;
    var tapada = op.tapada != null ? !!op.tapada : !!(C && !C.fuera && d.getElementById('cortina'));
    // la foto ya se pintó (LCP) detrás de la cortina: ahora, tapada, se quita sin que se vea. Si no hay cortina, o la
    // foto aún no ha llegado (no se puede ocultar del todo algo que no ha contado como LCP), se apaga suave (12 %)
    var fotoLista = !img || (img.complete && img.naturalWidth > 0);
    el.classList.add(tapada && fotoLista ? 'paja-sin-foto' : 'paja-foto-tenue');
    el.dataset.paja = 'cargando';
    var info = marcador(el);
    var cual = elegirFichero(el, img, op);
    var escT = escalaTiempo();
    var est = { t: 0, velo: 0, scroll: 0, n: 0, total: 0, hebra: [6, 8, 1.4], radio: 90, map: null, soplos: [],
      fase: 'cargando', calidad: 1, cuadros: 0, media: 0 };
    var datos = null, raf = 0, ultimo = 0, enVista = true, oculta = d.hidden, fin = false, posada = false;
    var anchoHecho = 0, altoHecho = 0, dpr = 1, tiempos = [], abierto = null, previo = null, par = 0, ultimoScroll = 0;

    function encajar() {
      if (fin || !datos) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5) * (est.calidad < 0.8 ? 0.8 : 1);
      var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      var tope = 3200000;
      if (w * h > tope) { var k = Math.sqrt(tope / (w * h)); w = Math.round(w * k); h = Math.round(h * k); dpr *= k; }
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      anchoHecho = innerWidth; altoHecho = innerHeight;
      var rImg = recorteDe(img, op, datos);
      est.map = encaje(el, img, rImg, datos.recorte);
      var inst = instancias(datos, est.map, topeHebras(true));
      motor.cargar(inst);
      est.total = inst.n;
      est.n = Math.round(inst.n * est.calidad);
      var med = medidas(inst.sep);
      est.hebra = [med.lb * dpr, med.le * dpr, med.an * dpr];
      est.radio = clamp(Math.min(r.width, r.height) * 0.12, 48, 130) * dpr * (esTactil ? 1.25 : 1);
      el.dataset.hebras = String(est.n);
      pedir();
    }
    var esTactil = false;
    try { esTactil = matchMedia('(pointer: coarse)').matches; } catch (e) {}

    function alScroll() {
      var r = el.getBoundingClientRect();
      var p = clamp(-r.top / Math.max(1, r.height * 0.85), 0, 1);
      if (Math.abs(p - est.scroll) > 1e-4) { est.scroll = p; ultimoScroll = performance.now(); pedir(); }
    }

    // ---- el gesto: soplos ----
    function soplar(cx, cy, tipo, fuerzaExtra) {
      if (!est.map || fin) return;
      var r = canvas.getBoundingClientRect();
      if (!r.width) return;
      if (cy < r.top - 40 || cy > r.bottom + 40) return;
      var x = (cx - r.left) * (canvas.width / r.width), y = (cy - r.top) * (canvas.height / r.height);
      var ahora = performance.now();
      var v = 0;
      if (previo && ahora - previo.t < 200) v = Math.hypot(cx - previo.x, cy - previo.y) / Math.max(8, ahora - previo.t) * 1000;
      previo = { x: cx, y: cy, t: ahora };
      var fuerza = clamp(0.35 + v / 1600, 0.35, 1) * (tipo === 'raton' ? 0.8 : 1) * (fuerzaExtra || 1);
      var s = abierto;
      if (s && est.t - s.t0 < 0.09 && Math.hypot(x - s.x1, y - s.y1) < est.radio * 2) {
        s.x1 = x; s.y1 = y; s.fuerza = Math.max(s.fuerza, fuerza);
      } else {
        var desde = s && est.t - s.t0 < 0.3 ? s : null;
        s = { x0: desde ? desde.x1 : x, y0: desde ? desde.y1 : y, x1: x, y1: y, t0: est.t, fuerza: fuerza, radio: est.radio };
        est.soplos.push(s);
        if (est.soplos.length > motor.soplosMax) est.soplos.shift();
        abierto = s;
      }
      pedir();
    }
    var zona = el.closest('section') || el.parentElement || el;
    var alPuntero = function (e) { if (e.pointerType !== 'touch') soplar(e.clientX, e.clientY, e.pointerType === 'mouse' ? 'raton' : 'lapiz'); };
    var alPulsar = function (e) { if (e.pointerType !== 'touch') soplar(e.clientX, e.clientY, 'raton', 1.3); };
    var alSalir = function () { abierto = null; previo = null; };
    var alTocar = function (e) { var t = e.touches && e.touches[0]; if (t) soplar(t.clientX, t.clientY, 'dedo', e.type === 'touchstart' ? 1.1 : 1); };
    zona.addEventListener('pointermove', alPuntero, { passive: true });
    zona.addEventListener('pointerdown', alPulsar, { passive: true });
    zona.addEventListener('pointerleave', alSalir, { passive: true });
    zona.addEventListener('touchstart', alTocar, { passive: true });
    zona.addEventListener('touchmove', alTocar, { passive: true });
    zona.addEventListener('touchend', alSalir, { passive: true });

    // ---- el bucle ----
    function pedir() { if (!raf && !fin && est.fase !== 'cargando' && enVista && !oculta) raf = requestAnimationFrame(cuadro); }
    function cuadro(ahora) {
      raf = 0;
      if (fin || !enVista || oculta) return;
      var dt = ultimo ? Math.min(0.1, (ahora - ultimo) / 1000) : 1 / 60;
      ultimo = ahora;
      // en reposo (posada, sin soplos, sin scroll que mover), a 30 fps
      var reposo = est.fase === 'velo' && est.velo >= 1 && !est.soplos.length && ahora - ultimoScroll > 400;
      if (reposo && (par++ & 1)) { raf = requestAnimationFrame(cuadro); return; }
      est.t += dt * escT * (reposo ? 2 : 1);
      while (est.soplos.length && est.t - est.soplos[0].t0 > VIDA_SOPLO) est.soplos.shift();
      if (abierto && est.t - abierto.t0 > VIDA_SOPLO) abierto = null;
      if (est.fase === 'vuelo' && est.t >= T_POSADO) {
        est.fase = 'velo';
        posada = true;
        el.classList.remove('paja-sin-foto', 'paja-foto-tenue');   // la foto se funde (transición del CSS)
        el.dataset.paja = 'posada';
        avisar('viva');
      }
      if (est.fase === 'velo' && est.velo < 1) est.velo = Math.min(1, est.velo + dt * escT / T_VELO);
      motor.dibujar(est);
      est.cuadros++;
      // calidad automática: de los cuadros 15 a 75 de vuelo; si va lento, menos hebras y menos resolución
      if (est.fase === 'vuelo' && est.cuadros > 15 && tiempos.length < 60) {
        tiempos.push(dt);
        if (tiempos.length === 60) {
          est.media = tiempos.reduce(function (a, b) { return a + b; }, 0) / 60 * 1000;
          if (est.media > 25 && est.calidad > 0.4) {
            est.calidad = est.calidad > 0.8 ? 0.6 : 0.36;
            tiempos.length = 0;
            est.cuadros = 0;
            encajar();
          }
        }
      }
      if (info && (est.cuadros % 15 === 0)) info('paja viva · ' + motor.tipo + ' · ' + est.n + '/' + est.total + ' hebras · ' + cual + ' · calidad ' + est.calidad + ' · ' + (est.media ? est.media.toFixed(1) + ' ms' : '…') + ' · ' + est.fase);
      raf = requestAnimationFrame(cuadro);
    }

    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      enVista = es[es.length - 1].isIntersecting;
      if (enVista) { ultimo = 0; pedir(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { rootMargin: '60px' }) : null;
    if (io) io.observe(el);
    var alVisibilidad = function () { oculta = d.hidden; if (!oculta) { ultimo = 0; pedir(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    d.addEventListener('visibilitychange', alVisibilidad);
    var alCambiar = function () {
      if (innerWidth === anchoHecho && Math.abs(innerHeight - altoHecho) < 160) return;   // la barra del móvil: nada
      encajar();
    };
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { if (anchoHecho) alCambiar(); }) : null;
    if (ro) ro.observe(el); else addEventListener('resize', alCambiar);
    addEventListener('scroll', alScroll, { passive: true });

    function limpiar() {
      fin = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      zona.removeEventListener('pointermove', alPuntero);
      zona.removeEventListener('pointerdown', alPulsar);
      zona.removeEventListener('pointerleave', alSalir);
      zona.removeEventListener('touchstart', alTocar);
      zona.removeEventListener('touchmove', alTocar);
      zona.removeEventListener('touchend', alSalir);
      if (io) io.disconnect();
      if (ro) ro.disconnect(); else removeEventListener('resize', alCambiar);
      d.removeEventListener('visibilitychange', alVisibilidad);
      removeEventListener('scroll', alScroll);
      try { motor.destruir(); } catch (e) {}
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      var hud = el.querySelector('.paja-info');
      if (hud) hud.parentNode.removeChild(hud);
      el.classList.remove('paja-sin-foto', 'paja-foto-tenue');
    }
    var api = {
      modo: 'viva',
      get motor() { return motor.tipo; },
      get estado() { return est; },
      get fichero() { return cual; },
      get ultimo() { return motor.ultimo; },
      destruir: function () {
        limpiar();
        delete el.dataset.montado; delete el.dataset.paja; delete el.dataset.hebras;
        el.__paja = null;
      },
    };
    // si algo falla (contexto perdido, sombreadores, datos que no llegan): la foto vuelve y el dibujo en 2D
    caer = function (por) {
      if (fin) return;
      console.warn('paja: paso al respaldo (' + por + ')');
      limpiar();
      var q = montarQuieta(el, img, op, 'respaldo');
      el.__paja = q;
      api.destruir = q.destruir;
      api.modo = 'respaldo';
    };
    var espera = setTimeout(function () { if (est.fase === 'cargando') caer('tiempo'); }, 3500);
    Promise.all([cargarPuntos(cual), motor.listo]).then(function (r) {
      clearTimeout(espera);
      if (fin) return;
      datos = r[0];
      encajar();
      if (!est.total) { caer('sin hebras'); return; }
      est.fase = 'vuelo';
      el.dataset.paja = 'vuelo';
      alScroll();
      ultimo = 0;
      pedir();
    }).catch(function (e) { clearTimeout(espera); console.warn(e); caer('error'); });
    return api;
  }

  /* ================= comprobar (pruebas): compilar y enlazar, sin pintar ================= */
  function comprobar() {
    var c = d.createElement('canvas');
    c.width = c.height = 4;
    var gl = null;
    try { gl = c.getContext('webgl'); } catch (e) {}
    if (!gl) return { ok: null, error: 'sin WebGL' };
    var pr = compilar(gl, NS), er = errores(gl, pr);
    var pr8 = compilar(gl, 8), er8 = errores(gl, pr8);
    var x = gl.getExtension('WEBGL_lose_context');
    if (x) x.loseContext();
    return { ok: !er && !er8, error: [er, er8].filter(Boolean).join('\n') };
  }

  /* ================= el montón del pie ================= */
  function montarPie(el, op) {
    op = op || {};
    if (!el) return { destruir: function () {} };
    if (el.__pajaPie) el.__pajaPie.destruir();
    var quieto = op.movimiento === false || op.densidad === 'sobria' || reducido();
    var base = d.createElement('canvas'), caida = d.createElement('canvas');
    base.className = 'paja-pie-lienzo'; caida.className = 'paja-pie-lienzo';
    base.setAttribute('aria-hidden', 'true'); caida.setAttribute('aria-hidden', 'true');
    el.appendChild(base); el.appendChild(caida);
    var hebras = [], hechas = 0, objetivo = 0, lectura = 0, anchoHecho = 0, W = 0, H = 0, dpr = 1, fin = false;
    var cayendo = [], raf = 0, enVista = false;

    function generar() {
      var r = el.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      [base, caida].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
      anchoHecho = innerWidth;
      var azar = azarFijo(11);
      var N = Math.round(clamp(W * 1.5, 450, 2400));
      // perfil del montón: uno ancho y otro pequeño a su lado, sobre el suelo del pie
      var perfil = function (x) {
        var a = Math.max(0, 1 - Math.pow((x - 0.56) / 0.36, 2)), b = Math.max(0, 1 - Math.pow((x - 0.25) / 0.13, 2));
        return Math.max(Math.pow(a, 0.9) * 0.94, Math.pow(b, 0.9) * 0.45);
      };
      hebras = [];
      var intentos = 0;
      while (hebras.length < N && intentos++ < N * 20) {
        var x = azar(), alto = perfil(x);
        var suelto = alto < 0.02;
        if (suelto && azar() > 0.05) continue;                    // alguna suelta por el suelo
        var y = suelto ? 0.02 * azar() : alto * Math.pow(azar(), 0.8);
        var cerca = suelto ? 1 : y / Math.max(alto, 0.01);
        var pend = (perfil(Math.min(1, x + 0.01)) - perfil(Math.max(0, x - 0.01))) / 0.02 * H / W;
        var ang = cerca > 0.85 ? -Math.atan(pend) + (azar() - 0.5) * 0.7 : (azar() - 0.5) * 1.5 + (azar() - 0.5) * 0.6;
        hebras.push({ x: x * W, y: H - y * H * 0.96 - 1, a: ang, L: 7 + azar() * 15, w: 0.9 + azar() * 0.9,
          c: colorTono(0.15 + azar() * 0.85), clave: y + azar() * 0.18 });
      }
      hebras.sort(function (p, q) { return p.clave - q.clave; });   // de abajo arriba: el montón crece
      return true;
    }
    function trazo(ctx, h, dx, dy, da, alfa) {
      var a = h.a + da, L = h.L * 0.5;
      ctx.strokeStyle = 'rgba(' + Math.round(h.c[0] * 255) + ',' + Math.round(h.c[1] * 255) + ',' + Math.round(h.c[2] * 255) + ',' + alfa + ')';
      ctx.lineWidth = h.w * dpr;
      ctx.beginPath();
      ctx.moveTo((h.x + dx - Math.cos(a) * L) * dpr, (h.y + dy - Math.sin(a) * L) * dpr);
      ctx.lineTo((h.x + dx + Math.cos(a) * L) * dpr, (h.y + dy + Math.sin(a) * L) * dpr);
      ctx.stroke();
    }
    function asentar(desde, hasta) {
      var ctx = base.getContext('2d');
      ctx.lineCap = 'round';
      for (var i = desde; i < hasta; i++) trazo(ctx, hebras[i], 0, 0, 0, 0.95);
    }
    function repintar() {
      var ctx = base.getContext('2d');
      ctx.clearRect(0, 0, base.width, base.height);
      cayendo = [];
      asentar(0, hechas);
    }
    function alLeer() {
      var doc = d.documentElement;
      var l = (scrollY + innerHeight) / Math.max(1, doc.scrollHeight);
      if (l > lectura) lectura = l;
      var r = el.getBoundingClientRect();
      var completo = lectura >= 0.985 || (r.top >= 0 && r.bottom <= innerHeight + 2);
      objetivo = completo ? hebras.length : Math.round(hebras.length * clamp((lectura - 0.12) / 0.86, 0, 1));
      avanzar();
    }
    function avanzar() {
      if (objetivo <= hechas || fin) return;
      if (!enVista || quieto) { asentar(hechas, objetivo); hechas = objetivo; marcar(); return; }
      var ahora = performance.now();
      for (var i = hechas; i < objetivo; i++) cayendo.push({ i: i, t0: ahora + (i - hechas) * 6, alto: 26 + Math.random() * 46, giro: (Math.random() - 0.5) * 2.4 });
      hechas = objetivo;
      marcar();
      if (!raf) raf = requestAnimationFrame(caer);
    }
    function marcar() { el.dataset.hebras = String(hechas); el.dataset.completo = hechas >= hebras.length ? '1' : '0'; }
    function caer(ahora) {
      raf = 0;
      var ctx = caida.getContext('2d');
      ctx.clearRect(0, 0, caida.width, caida.height);
      ctx.lineCap = 'round';
      var quedan = [];
      var bctx = base.getContext('2d');
      bctx.lineCap = 'round';
      for (var k = 0; k < cayendo.length; k++) {
        var c = cayendo[k], p = (ahora - c.t0) / 520;
        if (p < 0) { quedan.push(c); continue; }
        var h = hebras[c.i];
        if (p >= 1) { trazo(bctx, h, 0, 0, 0, 0.95); continue; }
        var e = p * p;                                            // cae acelerando
        trazo(ctx, h, Math.sin(p * 5 + c.i) * 4 * (1 - p), -c.alto * (1 - e), c.giro * (1 - e), 0.95);
        quedan.push(c);
      }
      cayendo = quedan;
      if (cayendo.length && !fin) raf = requestAnimationFrame(caer);
    }
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { enVista = es[es.length - 1].isIntersecting; alLeer(); }) : null;
    if (io) io.observe(el);
    var alScroll = function () { alLeer(); };
    var alCambiar = function () { if (innerWidth === anchoHecho) return; if (generar()) repintar(); };
    addEventListener('scroll', alScroll, { passive: true });
    addEventListener('resize', alCambiar);
    if (generar()) {
      if (quieto) { objetivo = hebras.length; asentar(0, objetivo); hechas = objetivo; marcar(); } else alLeer();
    }
    el.dataset.montado = '1';
    var api = {
      destruir: function () {
        fin = true;
        if (raf) cancelAnimationFrame(raf);
        if (io) io.disconnect();
        removeEventListener('scroll', alScroll);
        removeEventListener('resize', alCambiar);
        [base, caida].forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
        delete el.dataset.montado; delete el.dataset.hebras; delete el.dataset.completo;
        el.__pajaPie = null;
      },
    };
    el.__pajaPie = api;
    return api;
  }

  /* ================= precarga: los puntos, cuando la foto de la portada ya está ================= */
  (function precargar() {
    var el = d.querySelector('[data-modulo="paja"]');
    if (!el || !window.fetch) return;
    var img = el.querySelector('img');
    var ir = function () { setTimeout(function () { try { cargarPuntos(elegirFichero(el, img, null)).catch(function () {}); } catch (e) {} }, 0); };
    if (!img || (img.complete && img.naturalWidth)) ir();
    else { img.addEventListener('load', ir, { once: true }); img.addEventListener('error', ir, { once: true }); }
  })();

  P.paja = { montar: montar, comprobar: comprobar };
  P.pajaPie = { montar: montarPie };
})();
