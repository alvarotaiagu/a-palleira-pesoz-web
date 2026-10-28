# Paja · los puntos de destino de las hebras, sacados de la foto del corredor (ref/fotos/airbnb/09.jpg).
#
# Uso:  python scripts/paja-puntos.py            (cv2 + numpy)   → img/paja/puntos-escritorio.bin, puntos-movil.bin, puntos.json
#       python scripts/paja-puntos.py --vista X  → además, una vista previa de las hebras pintadas sobre naranja en X (.png)
#
# Qué hace:
#   1. Recorta el marco naranja pegado de la foto (y sus esquinas redondeadas y la sombra de abajo): RECORTE.
#   2. Bordes: gradiente de Sobel sobre la foto suavizada + Canny engordado 1 px (las líneas del dibujo).
#      Orientación por punto con el tensor de estructura (σ = 2,5): la hebra va a lo largo del borde (tangente).
#      Coherencia del tensor → «largo» (en las rectas limpias, hebras más largas).
#   3. Peso de cada píxel = bordes + Canny + las panoyas (amarillo, con relleno) + un poco de fondo; el cielo y los
#      árboles de detrás del tejado cuentan muy poco (polígono de la casa, a mano sobre la foto).
#   4. Muestreo sistemático sobre la distribución acumulada (reparto uniforme, sin grumos) con jitter subpíxel.
#      Barajado con semilla fija: cualquier prefijo del fichero es una submuestra uniforme (el JS recorta por ahí).
#   5. Escritorio: la foto entera. Móvil: la franja central (u 0,20–0,80), que es lo que se ve en vertical con cover.
#
# Formato .bin (little-endian): cabecera de 32 bytes
#   0  'PAJA'            4 bytes
#   4  versión u16 = 1,  6  bytes por punto u16 = 8
#   8  n.º de puntos u32
#   12 recorte x, y, w, h  u16 ×4  (px de 09.jpg)
#   20 región u0, v0, u1, v1  u16 ×4 (normalizada ×65535 sobre el recorte: dónde hay puntos)
#   28 reservado (4 bytes)
# y n × 8 bytes:  x u16, y u16 (normalizados ×65535 sobre el recorte, y hacia abajo) · ángulo u8 (0–255 → 0–π, la
# tangente del borde en px con y hacia abajo) · tono u8 (luminancia de la foto, 0 oscuro) · largo u8 · peso u8.
import json, os, struct, sys
import cv2
import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOTO = os.path.join(RAIZ, 'ref', 'fotos', 'airbnb', '09.jpg')
SALIDA = os.path.join(RAIZ, 'img', 'paja')

# recorte interior (px de 09.jpg, 1920×916): marco naranja x 0–15 y 1910–1919, sombra desde y ≈ 868,
# esquinas de abajo redondeadas (radio ≈ 20). MANDA el recorte de la foto «corredor» que genera la Web
# (scripts/fotos-lista.json): los puntos tienen que caer sobre la foto que se pinta. Si no existe, el de respaldo.
RECORTE = (24, 0, 1878, 856)          # x, y, w, h (respaldo)
try:
    for f in json.load(open(os.path.join(RAIZ, 'scripts', 'fotos-lista.json'), encoding='utf-8')):
        if f.get('nombre') == 'corredor' and f.get('recorte'):
            r = f['recorte']
            RECORTE = (int(r['left']), int(r['top']), int(r['width']), int(r['height']))
except (OSError, ValueError, KeyError):
    pass
N_ESCRITORIO = 36000
N_MOVIL = 12000
REGION_MOVIL = (0.20, 0.0, 0.80, 1.0)  # u0, v0, u1, v1
SEMILLA = 2026

# la casa (px de 09.jpg): lo de fuera es cielo y árboles. El borde de arriba sigue el tejado y la chimenea.
CASA = [(16, 290), (26, 236), (300, 160), (470, 126), (520, 104), (1500, 66), (1505, 0), (1608, 0), (1612, 60),
        (1910, 58), (1910, 900), (16, 900)]


def cargar():
    im = cv2.imread(FOTO, cv2.IMREAD_COLOR)
    if im is None:
        sys.exit('No encuentro ' + FOTO)
    x, y, w, h = RECORTE
    return im, im[y:y + h, x:x + w].copy()


def mapas(rec):
    h, w = rec.shape[:2]
    gris = cv2.cvtColor(rec, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    suave = cv2.GaussianBlur(gris, (0, 0), 1.4)
    gx = cv2.Sobel(suave, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(suave, cv2.CV_32F, 0, 1, ksize=3)
    mag = np.sqrt(gx * gx + gy * gy)
    # tensor de estructura
    s = 2.5
    jxx = cv2.GaussianBlur(gx * gx, (0, 0), s)
    jyy = cv2.GaussianBlur(gy * gy, (0, 0), s)
    jxy = cv2.GaussianBlur(gx * gy, (0, 0), s)
    fi = 0.5 * np.arctan2(2 * jxy, jxx - jyy)            # dirección del gradiente dominante
    tangente = np.mod(fi + np.pi / 2, np.pi)              # la hebra va a lo largo del borde
    raiz = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2)
    l1, l2 = (jxx + jyy + raiz) / 2, (jxx + jyy - raiz) / 2
    coher = ((l1 - l2) / (l1 + l2 + 1e-7)) ** 2
    # Canny sobre la foto suavizada (es una foto ampliada: los bordes son blandos)
    g8 = (cv2.GaussianBlur(gris, (0, 0), 1.8) * 255).astype(np.uint8)
    canny = cv2.Canny(g8, 28, 70, L2gradient=True)
    canny = cv2.dilate(canny, np.ones((2, 2), np.uint8)).astype(np.float32) / 255.0
    # las panoyas: amarillo intenso (HSV de OpenCV: H 0–180)
    hsv = cv2.cvtColor(rec, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    panoya = ((H >= 14) & (H <= 32) & (S >= 110) & (V >= 150)).astype(np.uint8)
    panoya = cv2.morphologyEx(panoya, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    panoya = cv2.morphologyEx(panoya, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    # quita manchas sueltas (flores amarillas, brillos): solo componentes grandes (las 4 ristras)
    n, et, st, _ = cv2.connectedComponentsWithStats(panoya, 8)
    limpia = np.zeros_like(panoya)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 2500 and st[i, cv2.CC_STAT_HEIGHT] > 90:
            limpia[et == i] = 1
    panoya = cv2.GaussianBlur(limpia.astype(np.float32), (0, 0), 1.2)
    # la casa
    casa = np.zeros((h, w), np.uint8)
    x0, y0 = RECORTE[0], RECORTE[1]
    cv2.fillPoly(casa, [np.array([(px - x0, py - y0) for px, py in CASA], np.int32)], 1)
    casa = cv2.GaussianBlur(casa.astype(np.float32), (0, 0), 6)
    lum = cv2.GaussianBlur(gris, (0, 0), 1.0)
    return dict(mag=mag, tangente=tangente, coher=coher, canny=canny, panoya=panoya, casa=casa, lum=lum)


def peso(m):
    mag = m['mag']
    mn = np.clip(mag / (np.percentile(mag, 99.3) + 1e-6), 0, 1) ** 0.85
    w = 0.95 * mn + 0.85 * m['canny'] + 0.75 * m['panoya'] + 0.035
    w *= 0.07 + 0.93 * m['casa']
    return w.astype(np.float64)


def muestrear(w, n, region, rng):
    h, ww = w.shape
    u0, v0, u1, v1 = region
    x0, x1 = int(round(u0 * ww)), int(round(u1 * ww))
    y0, y1 = int(round(v0 * h)), int(round(v1 * h))
    sub = np.zeros_like(w)
    sub[y0:y1, x0:x1] = w[y0:y1, x0:x1]
    cdf = np.cumsum(sub.ravel())
    cdf /= cdf[-1]
    # sistemático: u_i = (i + r) / n, con r común → reparto uniforme sobre la distribución
    u = (np.arange(n) + rng.random()) / n
    idx = np.searchsorted(cdf, u, side='right')
    idx = np.clip(idx, 0, cdf.size - 1)
    py, px = np.divmod(idx, ww)
    fx = px + rng.random(n)
    fy = py + rng.random(n)
    orden = rng.permutation(n)
    return fx[orden], fy[orden]


def empaquetar(m, fx, fy, region, rng):
    h, w = m['lum'].shape
    ix = np.clip(fx.astype(int), 0, w - 1)
    iy = np.clip(fy.astype(int), 0, h - 1)
    ang = m['tangente'][iy, ix]
    # en el relleno de las panoyas, sin borde claro: las hebras «a lo largo» de la ristra (casi verticales) con ruido
    pan = m['panoya'][iy, ix]
    coh = m['coher'][iy, ix]
    vertical = np.pi / 2 + rng.normal(0, 0.35, fx.size)
    usar_v = (pan > 0.5) & (coh < 0.25)
    ang = np.where(usar_v, np.mod(vertical, np.pi), ang)
    mag = m['mag'][iy, ix]
    magn = np.clip(mag / (np.percentile(m['mag'], 99.3) + 1e-6), 0, 1)
    tono = np.clip(m['lum'][iy, ix], 0, 1)
    # las panoyas son la nota clara del dibujo
    tono = np.where(pan > 0.5, np.maximum(tono, 0.82), tono)
    largo = np.clip(0.15 + 0.6 * coh + 0.35 * magn, 0, 1)
    pes = np.clip(0.7 * magn + 0.3 * m['canny'][iy, ix] + 0.5 * pan, 0, 1)
    n = fx.size
    cab = bytearray(32)
    cab[0:4] = b'PAJA'
    struct.pack_into('<HHI', cab, 4, 1, 8, n)
    struct.pack_into('<HHHH', cab, 12, *RECORTE)
    struct.pack_into('<HHHH', cab, 20, *[int(round(v * 65535)) for v in region])
    datos = np.zeros(n, dtype=[('x', '<u2'), ('y', '<u2'), ('a', 'u1'), ('t', 'u1'), ('l', 'u1'), ('p', 'u1')])
    datos['x'] = np.clip(np.round(fx / w * 65535), 0, 65535)
    datos['y'] = np.clip(np.round(fy / h * 65535), 0, 65535)
    datos['a'] = np.clip(np.round(ang / np.pi * 255), 0, 255)
    datos['t'] = np.round(tono * 255)
    datos['l'] = np.round(largo * 255)
    datos['p'] = np.round(pes * 255)
    return bytes(cab) + datos.tobytes(), datos


def vista(ruta, rec, datos, ancho=1400):
    """Vista previa (solo para comprobar los datos): las hebras sobre naranja, sin navegador."""
    h, w = rec.shape[:2]
    k = ancho / w
    lienzo = np.zeros((int(h * k), ancho, 3), np.uint8)
    lienzo[:] = (2, 123, 246)                       # #F67B02 en BGR
    rng = np.random.default_rng(1)
    tostado, paja, clara = np.array((22, 74, 122)), np.array((90, 178, 216)), np.array((165, 225, 245))
    for d in datos:
        x, y = float(d['x']) / 65535 * w * k, float(d['y']) / 65535 * h * k
        a = float(d['a']) / 255 * np.pi
        t = float(d['t']) / 255
        L = (5 + 9 * float(d['l']) / 255) * k * 1.2
        c = tostado + (paja - tostado) * min(t * 1.8, 1) if t < 0.55 else paja + (clara - paja) * min((t - 0.55) / 0.45, 1)
        c = np.clip(c * (0.9 + 0.2 * rng.random()), 0, 255)
        dx, dy = np.cos(a) * L / 2, np.sin(a) * L / 2
        cv2.line(lienzo, (int((x - dx) * 4), int((y - dy) * 4)), (int((x + dx) * 4), int((y + dy) * 4)),
                 tuple(int(v) for v in c), 1, cv2.LINE_AA, shift=2)
    cv2.imwrite(ruta, lienzo)


def main():
    os.makedirs(SALIDA, exist_ok=True)
    _, rec = cargar()
    m = mapas(rec)
    w = peso(m)
    rng = np.random.default_rng(SEMILLA)
    resumen = {'fuente': 'ref/fotos/airbnb/09.jpg', 'recorte': dict(zip('xywh', RECORTE)),
               'ancho': RECORTE[2], 'alto': RECORTE[3], 'bytesPorPunto': 8, 'versiones': {}}
    salidas = {}
    for nombre, n, region in (('escritorio', N_ESCRITORIO, (0.0, 0.0, 1.0, 1.0)), ('movil', N_MOVIL, REGION_MOVIL)):
        fx, fy = muestrear(w, n, region, rng)
        binario, datos = empaquetar(m, fx, fy, region, rng)
        ruta = os.path.join(SALIDA, 'puntos-%s.bin' % nombre)
        open(ruta, 'wb').write(binario)
        salidas[nombre] = datos
        resumen['versiones'][nombre] = {'fichero': 'img/paja/puntos-%s.bin' % nombre, 'puntos': n,
                                        'bytes': len(binario), 'region': list(region)}
        print('%-10s %6d puntos  %7d bytes  %s' % (nombre, n, len(binario), ruta))
    json.dump(resumen, open(os.path.join(SALIDA, 'puntos.json'), 'w'), indent=1, ensure_ascii=False)
    if '--vista' in sys.argv:
        r = sys.argv[sys.argv.index('--vista') + 1]
        vista(r, rec, salidas['escritorio'])
        vista(r.replace('.png', '-movil.png'), rec, salidas['movil'])
        print('vista:', r)


if __name__ == '__main__':
    main()
