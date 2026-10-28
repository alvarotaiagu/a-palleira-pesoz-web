#!/usr/bin/env python
"""A Palleira · el logo REDIBUJADO (agente Entrada).

El logo solo existe como un recorte diminuto de la tarjeta de Airbnb (ref/fotos/logo-recorte.png, 1005x435, muy
borroso). No se calca: se redibuja con medidas propias (memoria feedback_logo_jpg_redibujar_rectas.md):
  - la A es de TRES pinceladas (la diagonal larga, la pata izquierda y la barra), cada una un camino con grosor
    (así la cortina los traza con pathLength + strokeDashoffset) y con textura de pincel seco (máscara de cerdas);
  - la P es un cayado crema (el trazo es una sola curva) con su contorno oscuro;
  - «ALLEIRA» y «CASA DE ALDEA» son capitales con remate (Tinos, Apache 2.0, a caminos: el SVG no depende de ninguna
    letra instalada), con el ancho y la altura medidos en el recorte.
Las coordenadas son las del recorte (1005x435) para poder compararlas: se calcula el IoU de la P y de la A visible
contra las máscaras del recorte (se imprime) y se deja UNA superposición para mirarla (--superponer).

Salidas:
  marca/logo.svg         el logo completo, sin caja (vale sobre naranja y sobre crema)
  marca/logo-caja.svg    el mismo con la caja teja redondeada de la tarjeta
  marca/monograma.svg    solo A + P (viewBox 0 0 300 370)
  scripts/entrada-logo.json  la geometría para la cortina (js/cortina.js y partes/cortina.html)

Uso:  python -I scripts/entrada-logo.py [--superponer ruta.png]
"""
import json
import math
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MARRON = '#3B1C0A'   # --marron
CREMA = '#F6EBD3'    # --crema
TEJA = '#CC4A00'     # --teja
NARANJA = '#F67B02'  # --naranja
ANCHO_REC, ALTO_REC = 1005, 435

# ---------------------------------------------------------------- geometría (coordenadas del recorte)
# la P: línea central del cayado, de la punta apoyada abajo a la derecha, subiendo por el palo, la curva y el gancho
P_PTS = [(277, 374), (262, 336), (240, 300), (213, 258), (181, 220), (155, 190), (132, 160), (116, 134), (116, 110), (131, 92), (158, 76), (190, 72), (222, 86), (240, 110), (247, 140), (244, 170), (235, 196), (227, 204)]
P_ANCHO = 34
P_CONTORNO = 4   # el contorno oscuro a cada lado
# la A: tres pinceladas
A_TRAZOS = [
    {'id': 'a1', 'ancho': 28, 'pts': [(95, 174), (171, 276), (246, 378)]},                                           # la diagonal larga
    {'id': 'a2', 'ancho': 25, 'pts': [(46, 394), (70, 365), (90, 340), (103, 316), (112, 292), (121, 270), (137, 246)]},  # la pata izquierda
    {'id': 'a3', 'ancho': 19, 'pts': [(86, 332), (130, 331), (172, 331), (214, 330)]},                             # la barra
]
# el texto: (cadena, ancho de caja izquierdo, derecho, línea base, alto de capital, peso)
TEXTOS = [
    {'id': 'alleira', 'txt': 'ALLEIRA', 'x0': 268, 'x1': 850, 'base': 258, 'cap': 88, 'peso': 700, 'sx': 0.8},
    {'id': 'casa', 'txt': 'CASA DE ALDEA', 'x0': 312, 'x1': 958, 'base': 366, 'cap': 54, 'peso': 700, 'sx': 0.86},
]
CAJA = {'x': 14, 'y': 34, 'w': 976, 'h': 372, 'r': 52}
MONO_VB = (22, 44, 300, 370)   # x, y, ancho, alto del monograma (A + P) dentro del recorte


def catmull_a_bezier(pts, t=0.5):
    """Catmull-Rom -> lista de cúbicas [(p0, c1, c2, p1), ...]"""
    out = []
    n = len(pts)
    for i in range(n - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < n else pts[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
        out.append((p1, c1, c2, p2))
    return out


def d_de(pts, dx=0.0, dy=0.0):
    f = lambda p: '%.1f %.1f' % (p[0] - dx, p[1] - dy)
    b = catmull_a_bezier(pts)
    s = 'M' + f(b[0][0])
    for _, c1, c2, p in b:
        s += 'C' + f(c1) + ' ' + f(c2) + ' ' + f(p)
    return s


def aplanar(pts, paso=2.0):
    """Polilínea densa de la curva (para rasterizar, para medir y para las cerdas)"""
    out = []
    for p0, c1, c2, p1 in catmull_a_bezier(pts):
        n = max(8, int(math.dist(p0, p1) / paso))
        for k in range(n):
            t = k / n
            u = 1 - t
            out.append((u**3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t**3 * p1[0],
                        u**3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t**3 * p1[1]))
    out.append(pts[-1])
    return out


def longitud(poli):
    return sum(math.dist(poli[i], poli[i + 1]) for i in range(len(poli) - 1))


# ---------------------------------------------------------------- texto a caminos
def texto_a_camino(cfg, fuente):
    cmap = fuente.getBestCmap()
    gs = fuente.getGlyphSet()
    upm = fuente['head'].unitsPerEm
    cap_u = fuente['OS/2'].sCapHeight
    s = cfg['cap'] / cap_u
    sx = cfg.get('sx', 1.0)   # estrechado horizontal: el rótulo original es más estrecho que Tinos
    glifos = [cmap[ord(c)] for c in cfg['txt']]
    adv = [fuente['hmtx'][g][0] * s * sx for g in glifos]
    n = len(glifos)
    # ancho real de la caja: del borde izquierdo de la primera a la derecha de la última (sin los espacios de los lados)
    ink0 = fuente['glyf'][glifos[0]].xMin * s * sx
    ultimo = fuente['glyf'][glifos[-1]]
    ink1_extra = (fuente['hmtx'][glifos[-1]][0] - ultimo.xMax) * s * sx
    total = sum(adv) - ink0 - ink1_extra
    t = ((cfg['x1'] - cfg['x0']) - total) / (n - 1)
    x = cfg['x0'] - ink0
    letras = []
    centros = cfg.get('centros')
    for k, (ch, g, a) in enumerate(zip(cfg['txt'], glifos, adv)):
        if centros:
            gl = fuente['glyf'][g]
            x = centros[k] - (gl.xMin + gl.xMax) / 2 * s * sx
        if ch != ' ':
            pen = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
            gs[g].draw(TransformPen(pen, (s * sx, 0, 0, -s, x, cfg['base'])))
            gl = fuente['glyf'][g]
            letras.append({'ch': ch, 'd': pen.getCommands(), 'x0': x + gl.xMin * s * sx, 'x1': x + gl.xMax * s * sx})
        x += a + t
    return {'letras': letras, 'tracking': round(t, 2), 'cap': cfg['cap']}


# ---------------------------------------------------------------- cerdas de pincel seco (máscara)
def cerdas(poli, ancho, semilla):
    """Líneas finas paralelas al trazo, que se cortan por tramos: el hueco de las cerdas del pincel seco, más
    abundante hacia el final de la pincelada. Devuelve [(x1,y1,x2,y2), ...] para dibujarlas en negro en la máscara."""
    rnd = random.Random(semilla)
    L = longitud(poli)
    # parámetro de longitud acumulada
    acum = [0.0]
    for i in range(len(poli) - 1):
        acum.append(acum[-1] + math.dist(poli[i], poli[i + 1]))

    def en(s):
        s = max(0, min(L, s))
        lo, hi = 0, len(acum) - 1
        while hi - lo > 1:
            m = (lo + hi) // 2
            if acum[m] <= s: lo = m
            else: hi = m
        seg = acum[hi] - acum[lo] or 1
        u = (s - acum[lo]) / seg
        x = poli[lo][0] + (poli[hi][0] - poli[lo][0]) * u
        y = poli[lo][1] + (poli[hi][1] - poli[lo][1]) * u
        dx, dy = poli[hi][0] - poli[lo][0], poli[hi][1] - poli[lo][1]
        d = math.hypot(dx, dy) or 1
        return x, y, -dy / d, dx / d   # punto y normal

    salida = []
    n_lin = max(3, int(ancho / 5.5))
    for k in range(n_lin):
        off = (k + 0.5) / n_lin - 0.5   # -0.5 .. 0.5
        off = off * ancho * 0.92 + rnd.uniform(-.6, .6)
        s = rnd.uniform(0, L * 0.25)
        while s < L:
            # los huecos son más largos y frecuentes cuanto más cerca del final
            f = s / L
            gap = rnd.uniform(5, 16) * (0.35 + f * 1.15)
            run = rnd.uniform(10, 34) * (1.25 - f * 0.9)
            if rnd.random() < 0.10 + 0.45 * f:
                a = en(s)
                b = en(s + gap)
                salida.append((a[0] + a[2] * off, a[1] + a[3] * off, b[0] + b[2] * off, b[1] + b[3] * off))
            s += gap + run
    return salida


# ---------------------------------------------------------------- composición SVG
def defs_a(trazos_pol, prefijo):
    """mask de cerdas para la A (los trazos en blanco, los huecos de cerdas en negro) y filtro de borde"""
    m = ['<mask id="%s-seco" maskUnits="userSpaceOnUse" x="0" y="0" width="%d" height="%d"><rect width="%d" height="%d" fill="#fff"/>' % (prefijo, ANCHO_REC, ALTO_REC, ANCHO_REC, ALTO_REC)]
    for t, pol in zip(A_TRAZOS, trazos_pol):
        for (x1, y1, x2, y2) in cerdas(pol, t['ancho'], 11 + ord(t['id'][-1])):
            m.append('<path d="M%.1f %.1fL%.1f %.1f" stroke="#000" stroke-width="1.3" stroke-linecap="round"/>' % (x1, y1, x2, y2))
    m.append('</mask>')
    m.append('<filter id="%s-borde" x="-5%%" y="-5%%" width="110%%" height="110%%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7" result="r"/>'
             '<feDisplacementMap in="SourceGraphic" in2="r" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter>' % prefijo)
    return ''.join(m)


def grupo_a(prefijo, con_animacion_ids=True):
    s = ['<g id="%s-a" filter="url(#%s-borde)"><g mask="url(#%s-seco)" fill="none" stroke="%s" stroke-linecap="round" stroke-linejoin="round">' % (prefijo, prefijo, prefijo, MARRON)]
    for t in A_TRAZOS:
        s.append('<path id="%s-%s" class="trazo-a" d="%s" stroke-width="%d" pathLength="1"/>' % (prefijo, t['id'], d_de(t['pts']), t['ancho']))
    s.append('</g></g>')
    return ''.join(s)


def grupo_p(prefijo):
    d = d_de(P_PTS)
    return ('<g id="%s-p" fill="none" stroke-linecap="round" stroke-linejoin="round">'
            '<path class="p-contorno" d="%s" stroke="%s" stroke-width="%d"/>'
            '<path class="p-crema" d="%s" stroke="%s" stroke-width="%d"/></g>') % (prefijo, d, MARRON, P_ANCHO + 2 * P_CONTORNO, d, CREMA, P_ANCHO)


def grupo_texto(prefijo, textos):
    s = []
    for cfg in TEXTOS:
        t = textos[cfg['id']]
        s.append('<g id="%s-%s" fill="%s">' % (prefijo, cfg['id'], MARRON))
        for i, l in enumerate(t['letras']):
            s.append('<path class="letra" data-i="%d" d="%s"/>' % (i, l['d']))
        s.append('</g>')
    return ''.join(s)


def svg(vb, cuerpo, titulo, caja=False, defs=''):
    x, y, w, h = vb
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%g %g %g %g" role="img" aria-label="%s">'
            '<title>%s</title><defs>%s</defs>%s</svg>\n') % (x, y, w, h, titulo, titulo, defs, cuerpo)


# ---------------------------------------------------------------- comprobación contra el recorte
def rasterizar(pol_trazos, W=ANCHO_REC, H=ALTO_REC, k=2):
    im = Image.new('L', (W * k, H * k), 0)
    d = ImageDraw.Draw(im)
    for pol, ancho in pol_trazos:
        r = ancho * k / 2
        for i in range(len(pol) - 1):
            d.line([(pol[i][0] * k, pol[i][1] * k), (pol[i + 1][0] * k, pol[i + 1][1] * k)], fill=255, width=int(round(ancho * k)))
        for p in pol:
            d.ellipse([p[0] * k - r, p[1] * k - r, p[0] * k + r, p[1] * k + r], fill=255)
    return np.array(im.resize((W, H), Image.LANCZOS)) > 127


def iou(a, b):
    u = (a | b).sum()
    return float((a & b).sum()) / u if u else 0.0


def main():
    sup = None
    if '--superponer' in sys.argv:
        sup = sys.argv[sys.argv.index('--superponer') + 1]

    fuente = TTFont(os.path.join(RAIZ, 'scripts', 'entrada-fuentes', 'tinos-700.woff'))
    textos = {c['id']: texto_a_camino(c, fuente) for c in TEXTOS}

    p_pol = aplanar(P_PTS)
    a_pol = [aplanar(t['pts']) for t in A_TRAZOS]

    # ---- comparación con el recorte
    rec = np.array(Image.open(os.path.join(RAIZ, 'ref', 'fotos', 'logo-recorte.png')).convert('RGB')).astype(int)
    R, G, B = rec[..., 0], rec[..., 1], rec[..., 2]
    crema_rec = (R > 215) & (G > 185) & (B > 150)
    crema_rec[:, 330:] = False
    oscuro_rec = (R < 95) & (G < 70)
    mp = rasterizar([(p_pol, P_ANCHO)])
    ma = rasterizar([(pol, t['ancho']) for pol, t in zip(a_pol, A_TRAZOS)])
    zona = np.zeros_like(mp); zona[120:420, 0:262] = True
    a_visible = ma & ~rasterizar([(p_pol, P_ANCHO + 2 * P_CONTORNO)]) & zona
    print('IoU de la P contra el recorte:        %.2f' % iou(mp, crema_rec))
    print('IoU de la A visible contra el recorte: %.2f' % iou(a_visible, oscuro_rec & zona))
    # la caja de las letras: columnas ocupadas de «ALLEIRA» contra las oscuras del recorte (línea 1)
    for c in TEXTOS:
        t = textos[c['id']]
        print('%-8s tracking %.1f px, letras %d' % (c['id'], t['tracking'], len(t['letras'])))

    if sup:
        base = Image.open(os.path.join(RAIZ, 'ref', 'fotos', 'logo-recorte.png')).convert('RGB')
        capa = Image.new('RGBA', base.size, (0, 0, 0, 0))
        dd = ImageDraw.Draw(capa)
        for nombre, m, col in (('p', mp, (0, 255, 255, 110)), ('a', ma, (0, 255, 0, 110))):
            ys, xs = np.nonzero(m)
            for x, y in zip(xs[::1], ys[::1]):
                capa.putpixel((int(x), int(y)), col)
        for c in TEXTOS:
            for l in textos[c['id']]['letras']:
                dd.rectangle([l['x0'], c['base'] - c['cap'], l['x1'], c['base']], outline=(0, 255, 255, 255))
        Image.alpha_composite(base.convert('RGBA'), capa).convert('RGB').save(sup)
        print('superposición ->', sup)

    # ---- SVG
    todo_pol = a_pol
    defs = defs_a(todo_pol, 'lg')
    cuerpo_ap = grupo_a('lg') + grupo_p('lg')
    cuerpo = cuerpo_ap + grupo_texto('lg', textos)
    vb_logo = (8, 30, 990, 384)
    os.makedirs(os.path.join(RAIZ, 'marca'), exist_ok=True)
    abre = lambda f, c: open(os.path.join(RAIZ, 'marca', f), 'w', encoding='utf-8').write(c)
    abre('logo.svg', svg(vb_logo, cuerpo, 'A Palleira, casa de aldea', defs=defs))
    caja = '<rect x="%d" y="%d" width="%d" height="%d" rx="%d" fill="%s" stroke="%s" stroke-width="5"/>' % (CAJA['x'], CAJA['y'], CAJA['w'], CAJA['h'], CAJA['r'], TEJA, MARRON)
    abre('logo-caja.svg', svg(vb_logo, caja + cuerpo, 'A Palleira, casa de aldea', defs=defs))
    abre('monograma.svg', svg(MONO_VB, cuerpo_ap, 'A Palleira', defs=defs))

    # ---- geometría para la cortina (la cortina dibuja su propio SVG con estos datos)
    geom = {
        'recorte': [ANCHO_REC, ALTO_REC],
        'vb_logo': vb_logo,
        'mono_vb': MONO_VB,
        'caja': CAJA,
        'colores': {'marron': MARRON, 'crema': CREMA, 'teja': TEJA, 'naranja': NARANJA},
        'p': {'d': d_de(P_PTS), 'ancho': P_ANCHO, 'contorno': P_CONTORNO, 'pts': P_PTS, 'punta': list(P_PTS[0]), 'pie': list(P_PTS[0])},
        'a': [{'id': t['id'], 'ancho': t['ancho'], 'd': d_de(t['pts']), 'largo': round(longitud(pol), 1)} for t, pol in zip(A_TRAZOS, a_pol)],
        'textos': {k: {'tracking': v['tracking'], 'letras': v['letras']} for k, v in textos.items()},
        'cerdas': {t['id']: [[round(v, 1) for v in s] for s in cerdas(pol, t['ancho'], 11 + ord(t['id'][-1]))] for t, pol in zip(A_TRAZOS, a_pol)},
    }
    with open(os.path.join(RAIZ, 'scripts', 'entrada-logo.json'), 'w', encoding='utf-8') as f:
        json.dump(geom, f, ensure_ascii=False)
    print('hecho: marca/logo.svg, logo-caja.svg, monograma.svg, scripts/entrada-logo.json')


if __name__ == '__main__':
    main()
