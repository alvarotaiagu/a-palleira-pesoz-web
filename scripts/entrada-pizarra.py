#!/usr/bin/env python
"""A Palleira · la pizarra a tiza (agente Entrada): del cartel real (ref/fotos/airbnb/22.jpg) a img/entrada/pizarra.svg.

La frase «Lo importante ye querese y que el agua te fresquina» se escribe con LA LETRA DE LA PROPIA PIZARRA, no con
una fuente: se saca la tiza de la foto (fondo local restado, umbral con histéresis, cierre, huecos pequeños rellenos,
mediana), se adelgaza (Zhang-Suen), se recorre el esqueleto por giro mínimo (tubería de la memoria feedback_pen_stroke_pipeline,
copiada en scripts/entrada-penlib.py), se ordena letra a letra (líneas de arriba abajo, letras de izquierda a derecha) y se
guarda UN path por trazo en orden de escritura, con su largo (data-l) y su línea (data-f).

Se comprueba contra la foto: se vuelve a pintar el esqueleto con el grosor medido y se imprime el IoU con la tiza.

Salidas:
  img/entrada/pizarra.svg        los trazos (viewBox con margen; el ancho de tiza va en stroke-width del grupo)
  scripts/entrada-pizarra.json   los mismos datos para las pruebas (nº de trazos, largos, orden)

Uso: python -I scripts/entrada-pizarra.py [--ver ruta.png]   (--ver: UNA imagen con los trazos sobre la tiza, para mirarla)
"""
import importlib.util
import json
import math
import os
import sys

import cv2
import numpy as np
from scipy import ndimage as ndi

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
spec = importlib.util.spec_from_file_location('penlib', os.path.join(RAIZ, 'scripts', 'entrada-penlib.py'))
penlib = importlib.util.module_from_spec(spec)
spec.loader.exec_module(penlib)

FOTO = os.path.join(RAIZ, 'ref', 'fotos', 'airbnb', '22.jpg')
ESC = 0.5          # se adelgaza a media resolución
MARGEN = 70        # margen del viewBox (px de la foto)
COLAS_Q = [(638, 1076, 664, 1106), (433, 1479, 470, 1511)]   # cajas (px de la foto) de las colas de la primera y la segunda Q
LINEAS = [(470, 770), (810, 1135), (1190, 1545), (1625, 1995)]   # bandas de las cuatro líneas (px de la foto)


def mascara_tiza():
    im = cv2.imread(FOTO)
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    bg = cv2.GaussianBlur(g, (0, 0), 40)
    d = cv2.GaussianBlur(g, (0, 0), 2.0) - bg
    d[:440] = -99
    d[2020:] = -99
    lo, hi = d > 22, d > 50
    lab, n = ndi.label(lo)
    keep = np.zeros(n + 1, bool)
    keep[np.unique(lab[hi])] = True
    keep[0] = False
    m = keep[lab].astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    inv = m == 0
    lab2, n2 = ndi.label(inv)
    sz = ndi.sum(inv, lab2, range(1, n2 + 1))
    for i, s in enumerate(sz):
        if s < 900:            # solo huecos pequeños: los ojos de la O, la Q, la A, la P y la R se quedan
            m[lab2 == i + 1] = 1
    m = cv2.medianBlur(m * 255, 11)
    lab, n = ndi.label(m > 0)
    sz = ndi.sum(m > 0, lab, range(1, n + 1))
    for i, s in enumerate(sz):
        if s < 2500:
            m[lab == i + 1] = 0
    return m > 0


def linea_de(y):
    for i, (a, b) in enumerate(LINEAS):
        if a <= y <= b:
            return i
    return min(range(len(LINEAS)), key=lambda i: abs(y - (LINEAS[i][0] + LINEAS[i][1]) / 2))


def dibujar(trazos, ancho, forma):
    """Vuelve a pintar los trazos (puntos (x, y) en px de la foto) con grosor y cap redondo"""
    im = np.zeros(forma, np.uint8)
    r = int(round(ancho / 2))
    for t in trazos:
        pts = np.array([[int(round(x)), int(round(y))] for x, y in t], np.int32)
        cv2.polylines(im, [pts.reshape(-1, 1, 2)], False, 255, int(round(ancho)))
        for x, y in (t[0], t[-1]):
            cv2.circle(im, (int(round(x)), int(round(y))), r, 255, -1)
    return im > 0


def main():
    m = mascara_tiza()
    # grosor medio de la tiza: doble de la distancia al borde sobre el esqueleto
    dist = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 5)
    h2, w2 = int(m.shape[0] * ESC), int(m.shape[1] * ESC)
    chico = cv2.resize(m.astype(np.uint8) * 255, (w2, h2), interpolation=cv2.INTER_AREA) > 127
    lab, n = ndi.label(chico)
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        comps.append({'i': i, 'x0': xs.min(), 'x1': xs.max(), 'y0': ys.min(), 'y1': ys.max(), 'cy': (ys.min() + ys.max()) / 2 / ESC})
    for c in comps:
        c['linea'] = linea_de(c['cy'])
    comps.sort(key=lambda c: (c['linea'], c['x0']))

    todos = []        # trazos en px de la foto: lista de listas [(x, y)]
    info = []
    for c in comps:
        y0, y1, x0, x1 = max(0, c['y0'] - 4), c['y1'] + 5, max(0, c['x0'] - 4), c['x1'] + 5
        sub = (lab[y0:y1, x0:x1] == c['i'])
        S = penlib.adelgazar(sub, 200) > 0
        trazos = penlib.trazos_de(S, podar_umbral=7, corte_giro=1.9, min_pts=6)
        if not trazos:
            continue
        # fuera de la caja: puntos (y, x) -> (x, y) de la foto, ordenados de izquierda a derecha por su arranque
        ts = []
        for t in trazos:
            pts = [((p[1] + x0) / ESC, (p[0] + y0) / ESC) for p in t]
            pts = penlib.rdp(pts, 2.6)
            if len(pts) >= 2:
                ts.append(pts)
        ts.sort(key=lambda t: (t[0][0] + t[-1][0]) / 2)
        for t in ts:
            todos.append(t)
            info.append(c['linea'])

    # prolongar cada extremo libre un poco hacia el borde real de la tiza: el esqueleto se queda ~medio grosor dentro
    sk_d = [dist[int(round(y)), int(round(x))] for t in todos for x, y in t]
    ancho = float(np.median(sk_d)) * 2
    print('trazos: %d  componentes: %d  grosor de tiza ~ %.1f px' % (len(todos), len(comps), ancho))

    # --- prolongar cada extremo hacia el borde real de la tiza (el esqueleto se queda ~medio grosor dentro)
    for t in todos:
        for fin in (0, -1):
            for _ in range(1):
                a = t[fin]
                b = t[fin + 1] if fin == 0 else t[fin - 1]
                k = min(len(t) - 1, 6)
                b = t[k] if fin == 0 else t[-1 - k]
                dx, dy = a[0] - b[0], a[1] - b[1]
                n = math.hypot(dx, dy) or 1
                dx, dy = dx / n, dy / n
                paso = 0
                while paso < ancho * 0.75:
                    px, py = a[0] + dx * (paso + 1), a[1] + dy * (paso + 1)
                    if not (0 <= int(py) < m.shape[0] and 0 <= int(px) < m.shape[1]) or not m[int(py), int(px)]:
                        break
                    paso += 1
                if paso >= 3:
                    nuevo = (a[0] + dx * (paso - 1), a[1] + dy * (paso - 1))
                    if fin == 0: t.insert(0, nuevo)
                    else: t.append(nuevo)

    # --- la T de «TE FRESQUINA» sale cortada por el borde de la foto: su barra se completa por simetría con la que se ve
    for k, t in enumerate(todos):
        if info[k] == 3 and t[0][0] < 40 and t[-1][1] < t[0][1] - 100:
            top = min(range(len(t)), key=lambda i: t[i][1])
            tallo_x = float(np.median([x for x, y in t[:max(2, top - 1)]]))
            esq = (tallo_x, t[top][1])
            der = t[-1]
            izq = (tallo_x - (der[0] - tallo_x), der[1])
            tallo = sorted(t[:top + 1], key=lambda q: q[1])
            tallo = [(tallo_x, tallo[0][1])] + [(tallo_x + (q[0] - tallo_x) * .5, q[1]) for q in tallo[1:]]
            barra = [izq, esq] + list(t[top + 1:])
            todos[k:k + 1] = [barra, tallo]
            info[k:k + 1] = [3, 3]
            print('  T de TE completada por simetria (barra %d px a la izquierda)' % (der[0] - tallo_x))
            break

    # --- colas de la Q: el esqueleto las poda como si fueran espolones
    resto_q = m & ~cv2.dilate(dibujar(todos, ancho, m.shape).astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)
    rlq, rnq = ndi.label(resto_q)
    todos_pts = [(k, q) for k, t in enumerate(todos) for q in t]
    for (bx0, by0, bx1, by1) in COLAS_Q:
        enc = [j for j in range(1, rnq + 1) if (lambda yy, xx: xx.min() >= bx0 - 6 and xx.max() <= bx1 + 6 and yy.min() >= by0 - 6 and yy.max() <= by1 + 6)(*np.nonzero(rlq == j))]
        if not enc: print('  cola de Q no encontrada en', (bx0, by0, bx1, by1)); continue
        yy, xx = np.nonzero(np.isin(rlq, enc))
        cx, cy = xx.mean(), yy.mean()
        k0, q0 = min(todos_pts, key=lambda kq: math.hypot(kq[1][0] - cx, kq[1][1] - cy))
        lejos = max(range(len(xx)), key=lambda i: math.hypot(xx[i] - q0[0], yy[i] - q0[1]))
        fin = (float(xx[lejos]), float(yy[lejos]))
        # el último tramo hacia el centro de la tiza de la cola
        medio = ((q0[0] + fin[0]) / 2 * .5 + cx * .5, (q0[1] + fin[1]) / 2 * .5 + cy * .5)
        todos.insert(k0 + 1, [q0, medio, fin])
        info.insert(k0 + 1, info[k0])
        todos_pts = [(k, q) for k, t in enumerate(todos) for q in t]
        print('  cola de Q añadida en', (bx0, by0), '->', (round(fin[0]), round(fin[1])))

    # --- restos: trozos de tiza que el esqueleto no cubre (colas de la Q...). Se miran antes de dar por buenos los trazos.
    pint0 = dibujar(todos, ancho, m.shape)
    resto = m & ~cv2.dilate(pint0.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)
    rl, rn = ndi.label(resto)
    for j in range(1, rn + 1):
        yy, xx = np.nonzero(rl == j)
        if len(yy) > 300:
            print('  resto %d: %d px en x %d-%d, y %d-%d' % (j, len(yy), xx.min(), xx.max(), yy.min(), yy.max()))

    # --- comprobación: IoU del esqueleto repintado contra la tiza de la foto
    pint = dibujar(todos, ancho, m.shape)
    iou = (pint & m).sum() / float((pint | m).sum())
    cubierto = (pint & m).sum() / float(m.sum())
    print('IoU esqueleto repintado / tiza: %.2f   tiza cubierta: %.2f' % (iou, cubierto))

    if '--ver' in sys.argv:
        ruta = sys.argv[sys.argv.index('--ver') + 1]
        base = cv2.cvtColor((m * 90).astype(np.uint8), cv2.COLOR_GRAY2BGR)
        for t in todos:
            pts = np.array([[int(x), int(y)] for x, y in t], np.int32)
            cv2.polylines(base, [pts.reshape(-1, 1, 2)], False, (0, 220, 255), 5)
            cv2.circle(base, (int(t[0][0]), int(t[0][1])), 9, (0, 255, 0), -1)
        cv2.imwrite(ruta, cv2.resize(base[420:2040], (960, int(1620 * 0.5))))
        print('vista ->', ruta)

    # --- coordenadas del viewBox
    xs = [x for t in todos for x, y in t]
    ys = [y for t in todos for x, y in t]
    vx0, vy0 = math.floor(min(xs) - MARGEN), math.floor(min(ys) - MARGEN)
    vw, vh = math.ceil(max(xs) + MARGEN) - vx0, math.ceil(max(ys) + MARGEN) - vy0

    # el viewBox empieza en 0 0: las coordenadas se trasladan; el largo de cada trazo (polilínea) va en data-l
    paths, datos = [], []
    for k, (t, ln) in enumerate(zip(todos, info)):
        tt = [(x - vx0, y - vy0) for x, y in t]
        d = penlib.a_bezier(tt, t=0.2, dec=1)
        largo = penlib.largo(tt)
        paths.append('<path class="trazo" data-n="%d" data-f="%d" data-l="%d" d="%s"/>' % (k, ln, round(largo), d))
        datos.append({'n': k, 'linea': ln, 'largo': round(largo, 1), 'x0': round(tt[0][0], 1), 'y0': round(tt[0][1], 1), 'x1': round(tt[-1][0], 1), 'y1': round(tt[-1][1], 1)})
    svg = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="img" aria-label="Lo importante ye querese y que el agua te fresquina">'
           '<title>Lo importante ye querese y que el agua te fresquina</title>'
           '<g id="frase" fill="none" stroke="#F1EAD8" stroke-width="%.1f" stroke-linecap="round" stroke-linejoin="round">%s</g></svg>\n') % (
        vw, vh, ancho, '\n'.join(paths))
    os.makedirs(os.path.join(RAIZ, 'img', 'entrada'), exist_ok=True)
    with open(os.path.join(RAIZ, 'img', 'entrada', 'pizarra.svg'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(svg)
    with open(os.path.join(RAIZ, 'scripts', 'entrada-pizarra.json'), 'w', encoding='utf-8') as f:
        json.dump({'viewBox': [0, 0, vw, vh], 'ancho': round(ancho, 1), 'lineas': len(LINEAS), 'trazos': datos, 'iou': round(float(iou), 3)}, f)
    print('img/entrada/pizarra.svg: %.1f kB, viewBox 0 0 %d %d' % (len(svg.encode()) / 1024, vw, vh))


if __name__ == '__main__':
    main()
