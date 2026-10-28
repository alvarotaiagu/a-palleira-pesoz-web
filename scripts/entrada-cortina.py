#!/usr/bin/env python
"""A Palleira · genera partes/cortina.html (agente Entrada) a partir de scripts/entrada-logo.json.

La parte lleva TODO lo que necesita para el primer pintado (sin pedir nada a la red): el puente inline
(window.Palleira.cortina), las dos hojas de pajar (SVG de tablas), la caja del logo con «ALLEIRA» y «CASA DE ALDEA»
(caminos, no letra instalada) y el monograma A + P en un SVG propio (para trazar la A y dejar caer la P y para
volar luego a la cabecera). La anima js/cortina.js. Uso: python -I scripts/entrada-cortina.py"""
import json
import os
import random

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
G = json.load(open(os.path.join(RAIZ, 'scripts', 'entrada-logo.json'), encoding='utf-8'))
MARRON = G['colores']['marron']


def hoja(lado, semilla):
    """Una hoja de pajar: 6 tablas de tonos tostados, juntas oscuras, vetas, dos travesaños con clavos y la riostra en Z.
    viewBox 0 0 100 100 con preserveAspectRatio=none: las líneas llevan non-scaling-stroke."""
    rnd = random.Random(semilla)
    tonos = ['#6B3B1D', '#5F3418', '#744322', '#663719', '#6F3F20', '#5B3116']
    n = 6
    cortes = [0]
    for i in range(1, n):
        cortes.append(round(i * 100 / n + rnd.uniform(-2.2, 2.2), 2))
    cortes.append(100)
    s = ['<svg class="cortina__tablas" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">']
    for i in range(n):
        s.append('<rect x="%g" y="0" width="%g" height="100" fill="%s"/>' % (cortes[i], cortes[i + 1] - cortes[i] + .2, rnd.choice(tonos)))
    # vetas
    for i in range(n):
        for _ in range(5):
            x = rnd.uniform(cortes[i] + 1, cortes[i + 1] - 1)
            y0 = rnd.uniform(-5, 70)
            s.append('<path d="M%.2f %.1fq%.2f %.1f %.2f %.1f" stroke="#2B1409" stroke-opacity="%.2f" stroke-width="1" vector-effect="non-scaling-stroke" fill="none"/>' % (
                x, y0, rnd.uniform(-.6, .6), rnd.uniform(14, 28), rnd.uniform(-.5, .5), rnd.uniform(30, 55), rnd.uniform(.12, .3)))
        # un nudo
        if rnd.random() < .8:
            s.append('<ellipse cx="%.2f" cy="%.1f" rx=".7" ry="1.9" fill="#2B1409" fill-opacity=".35"/>' % (rnd.uniform(cortes[i] + 2, cortes[i + 1] - 2), rnd.uniform(8, 92)))
    # juntas entre tablas
    for c in cortes[1:-1]:
        s.append('<path d="M%g 0V100" stroke="#25110A" stroke-width="2.4" vector-effect="non-scaling-stroke"/><path d="M%g 0V100" stroke="#A8693A" stroke-opacity=".28" stroke-width="1" vector-effect="non-scaling-stroke" transform="translate(.45 0)"/>' % (c, c))
    # travesaños y riostra en Z (la riostra sube desde la bisagra hasta el centro)
    bx0, bx1 = (0, 100)
    xb = ('0 82 L100 22 L100 31 L0 91 Z' if lado == 'i' else '100 82 L0 22 L0 31 L100 91 Z')
    s.append('<path d="M%s" fill="#4A2810" stroke="#25110A" stroke-width="1.6" vector-effect="non-scaling-stroke"/>' % xb)
    for y in (16, 80):
        s.append('<rect x="0" y="%d" width="100" height="8" fill="#4A2810" stroke="#25110A" stroke-width="1.6" vector-effect="non-scaling-stroke"/>' % y)
        s.append('<rect x="0" y="%d" width="100" height="1" fill="#C98A52" fill-opacity=".22"/>' % y)
        for k in range(8):
            x = 6 + k * 12.5 if lado == 'i' else 94 - k * 12.5
            s.append('<ellipse cx="%.1f" cy="%d" rx=".55" ry=".7" fill="#1B0B05"/>' % (x, y + 4))
    s.append('</svg>')
    return ''.join(s)


def caja_texto():
    vb = G['vb_logo']
    c = G['caja']
    out = ['<svg class="cortina__caja" viewBox="%g %g %g %g" aria-hidden="true" focusable="false">' % tuple(vb)]
    # sombra suave de la caja y la caja de la tarjeta (teja, borde marrón)
    out.append('<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="#1B0B05" fill-opacity=".22" transform="translate(0 14)"/>' % (c['x'], c['y'], c['w'], c['h'], c['r']))
    out.append('<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="#1B0B05" fill-opacity=".18" transform="translate(0 7)"/>' % (c['x'], c['y'], c['w'], c['h'], c['r']))
    out.append('<rect class="cortina__fondo-caja" x="%d" y="%d" width="%d" height="%d" rx="%d" fill="%s" stroke="%s" stroke-width="5"/>' % (c['x'], c['y'], c['w'], c['h'], c['r'], G['colores']['teja'], MARRON))
    for k, t in G['textos'].items():
        out.append('<g id="cp-%s" class="cortina__texto cortina__texto--%s">' % (k, k))
        for l in t['letras']:
            out.append('<path class="cortina__letra" d="%s"/>' % l['d'])
        out.append('</g>')
    out.append('</svg>')
    return ''.join(out)


def mono():
    vb = G['mono_vb']
    A = G['a']
    L = G['vb_logo']
    pos = 'left:%.3f%%;top:%.3f%%;width:%.3f%%;height:%.3f%%' % ((vb[0] - L[0]) / L[2] * 100, (vb[1] - L[1]) / L[3] * 100, vb[2] / L[2] * 100, vb[3] / L[3] * 100)
    out = ['<svg class="cortina__mono" style="%s" viewBox="%g %g %g %g" aria-hidden="true" focusable="false">' % ((pos,) + tuple(vb))]
    out.append('<defs><mask id="cp-seco" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><rect width="%d" height="%d" fill="#fff"/>' % (G['recorte'][0], G['recorte'][1], G['recorte'][0], G['recorte'][1]))
    for lista in G['cerdas'].values():
        for (x1, y1, x2, y2) in lista:
            out.append('<path d="M%g %gL%g %g" stroke="#000" stroke-width="1.3" stroke-linecap="round"/>' % (x1, y1, x2, y2))
    out.append('</mask><filter id="cp-borde" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7" result="r"/>'
               '<feDisplacementMap in="SourceGraphic" in2="r" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter></defs>')
    out.append('<g id="cp-a" filter="url(#cp-borde)"><g mask="url(#cp-seco)" fill="none" stroke="%s" stroke-linecap="round" stroke-linejoin="round">' % MARRON)
    for t in A:
        out.append('<path id="cp-%s" class="cortina__trazo" d="%s" stroke-width="%d" pathLength="1"/>' % (t['id'], t['d'], t['ancho']))
    out.append('</g></g>')
    p = G['p']
    out.append('<g id="cp-p" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="%s" stroke="%s" stroke-width="%d"/><path d="%s" stroke="%s" stroke-width="%d"/></g>' % (
        p['d'], MARRON, p['ancho'] + 2 * p['contorno'], p['d'], G['colores']['crema'], p['ancho']))
    out.append('</svg>')
    return ''.join(out)


PUENTE = r"""<script>
(function (d, w) {
  var h = d.documentElement, P = w.Palleira = w.Palleira || {}, abierta = false, fuera = false, alAbrir = [], alFuera = [];
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; if (!location.hash) w.scrollTo(0, 0); } catch (e) {}
  h.classList.add('js');
  function avisar(lista, nombre) {
    lista.splice(0).forEach(function (f) { try { f(); } catch (e) { console.warn(e); } });
    try { d.dispatchEvent(new CustomEvent(nombre)); } catch (e) {}
  }
  function abrir() { if (abierta) return; abierta = true; h.classList.add('cortina-abriendo'); avisar(alAbrir, 'palleira:cortina-abre'); }
  function retirar() {
    if (fuera) return;
    fuera = true;
    clearTimeout(red1); clearTimeout(red2);
    var c = d.getElementById('cortina');
    if (c) c.hidden = true;
    h.classList.remove('cortina-activa', 'cortina-abriendo');
    h.classList.add('cortina-fuera');
    try { if (!location.hash && (w.pageYOffset || h.scrollTop)) w.scrollTo(0, 0); } catch (e) {}
    abrir();
    avisar(alFuera, 'palleira:cortina-fuera');
    if (c) setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 60);
  }
  P.cortina = {
    alAbrirse: function (f) { if (abierta) { try { f(); } catch (e) { console.warn(e); } } else alAbrir.push(f); },
    alRetirarse: function (f) { if (fuera) { try { f(); } catch (e) { console.warn(e); } } else alFuera.push(f); },
    abrir: abrir, retirar: retirar, enMarcha: false, marcas: {},
    get abierta() { return abierta; }, get fuera() { return fuera; }
  };
  var red1 = setTimeout(function () { if (!P.cortina.enMarcha) retirar(); }, 2500);
  var red2 = setTimeout(retirar, 8000);
  var quieto = false;
  try { quieto = w.matchMedia('(prefers-reduced-motion: reduce)').matches || h.classList.contains('densidad-sobria'); } catch (e) {}
  if (quieto) retirar(); else h.classList.add('cortina-activa');
})(document, window);
</script>"""


def main():
    cab = ('<!-- ============ cortina «el monograma» (agente Entrada: partes/cortina.html + css/entrada.css + js/cortina.js) ============\n'
           '     GENERADO por scripts/entrada-cortina.py: no se edita a mano.\n'
           '     Fondo de tablas marrón tostado con dos hojas de pajar; en el centro la caja del logo: la A se traza en tres pinceladas, la P cae\n'
           '     como un cayado y se apoya cruzándola, «ALLEIRA» y «CASA DE ALDEA» se completan; las hojas giran sobre sus bisagras laterales\n'
           '     y el monograma vuela a [data-cortina-destino] (la marca de la cabecera). Unos 2,5 s.\n'
           '     El script va ANTES de la cortina: solo con JS se enseña (html.cortina-activa), así que sin JS no aparece nunca.\n'
           '     Expone Palleira.cortina = { alAbrirse(fn), alRetirarse(fn), abrir(), retirar(), abierta, fuera, enMarcha, marcas } y lanza en\n'
           '     document «palleira:cortina-abre» (cuando EMPIEZA a abrirse) y «palleira:cortina-fuera». Se retira SIEMPRE: sin JS, con movimiento\n'
           '     reducido, con densidad sobria, y con red de seguridad (si js/cortina.js no arranca en 2,5 s o se atasca, a los 8 s se va sola). -->\n')
    html = (cab + PUENTE + '\n'
            '<div class="cortina" id="cortina" aria-hidden="true" style="display:none">\n'
            '  <div class="cortina__luz"></div>\n'
            '  <div class="cortina__puertas">\n'
            '    <div class="cortina__hoja cortina__hoja--i">' + hoja('i', 3) + '<div class="cortina__sombra"></div></div>\n'
            '    <div class="cortina__hoja cortina__hoja--d">' + hoja('d', 8) + '<div class="cortina__sombra"></div></div>\n'
            '  </div>\n'
            '  <div class="cortina__marca" style="aspect-ratio:%g/%g">' % (G['vb_logo'][2], G['vb_logo'][3]) + caja_texto() + mono() + '</div>\n'
            '</div>\n')
    with open(os.path.join(RAIZ, 'partes', 'cortina.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print('partes/cortina.html: %.1f kB' % (len(html.encode('utf-8')) / 1024))


if __name__ == '__main__':
    os.makedirs(os.path.join(RAIZ, 'partes'), exist_ok=True)
    main()
