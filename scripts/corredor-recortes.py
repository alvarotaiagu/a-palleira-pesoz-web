# Recorta la foto 09 (corredor con las 4 ristras) en capas: base sin panoyas (inpaint) y atlas de las 4 ristras en tiras
# para el péndulo compuesto. Uso: python scripts/corredor-recortes.py   (cv2 + numpy). Escribe en img/corredor/.
import cv2, numpy as np, json, os, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = cv2.imread(os.path.join(RAIZ, 'ref/fotos/airbnb/09.jpg'))
# recorte interior: fuera el marco naranja y su sombra; arriba se corta el cielo, abajo en el zócalo de pizarra
X0, X1, Y0, Y1 = 34, 1890, 190, 832
hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV)
H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
amarillo = ((H >= 12) & (H <= 30) & (S > 120) & (V > 150)).astype(np.uint8) * 255
# cajas de búsqueda de cada ristra (x0,x1,y0,y1) en la foto completa
cajas = [(395, 510, 405, 660), (735, 845, 430, 600), (1120, 1225, 415, 600), (1455, 1570, 405, 660)]
mascara = np.zeros(amarillo.shape, np.uint8)
for (a, b, c, d) in cajas:
    sub = np.zeros_like(amarillo); sub[c:d, a:b] = amarillo[c:d, a:b]
    sub = cv2.morphologyEx(sub, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(sub)
    if n < 2: continue
    k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    comp = (lab == k).astype(np.uint8) * 255
    # rellena huecos
    cont, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    comp = np.zeros_like(comp); cv2.drawContours(comp, cont, -1, 255, -1)
    mascara = cv2.bitwise_or(mascara, comp)
# histéresis: lo amarillo flojo pegado a lo firme también es panoya (las puntas claras bajo el poste)
flojo = ((H >= 10) & (H <= 32) & (S > 70) & (V > 140)).astype(np.uint8) * 255
cerca = cv2.dilate(mascara, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
mascara = cv2.bitwise_or(mascara, cv2.bitwise_and(flojo, cerca))
mascara = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
# base: cada agujero se rellena con la misma franja de la barandilla desplazada en horizontal (el balaustre se repite),
# elegida por el menor error en el anillo que rodea el agujero; lo que quede se rellena con inpaint
gorda = cv2.dilate(mascara, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
base = src.copy().astype(np.float32)
srcf = src.astype(np.float32)
flores = (((H <= 7) | (H >= 31)) & (S > 90) & (V > 100)).astype(np.uint8) * 255
flores = cv2.morphologyEx(flores, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
prohibido = cv2.dilate(gorda, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
def parchear(reg, ya, yb, sube=None, baja_=None):
    """rellena el agujero reg entre las filas ya..yb con la misma franja desplazada en horizontal"""
    global base
    ys, xs = np.where(reg[ya:yb] > 0)
    if not len(xs): return
    xa, xb = xs.min() - 6, xs.max() + 7
    sub = reg[ya:yb, xa:xb] > 0
    anillo = (cv2.dilate(sub.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))) > 0) & ~sub
    mejor, mdx = 1e18, 0
    for dx in range(-1400, 1401):
        if abs(dx) < 40: continue
        xa2, xb2 = xa + dx, xb + dx
        if xa2 < 190 or xb2 > 1770: continue
        if prohibido[ya:yb, xa2:xb2].any() or (flores[ya:yb, xa2:xb2] > 0).mean() > 0.008: continue
        err = ((srcf[ya:yb, xa2:xb2] - srcf[ya:yb, xa:xb]) ** 2).sum(2)[anillo].mean()
        if err < mejor: mejor, mdx = err, dx
    if mejor < 1e17:
        blend = np.clip(cv2.GaussianBlur(sub.astype(np.float32), (0, 0), 3.0)[..., None] * 1.6, 0, 1)
        filas = np.arange(ya, yb, dtype=np.float32)
        rampa = np.ones_like(filas)
        if sube: rampa *= np.clip((filas - sube[0]) / (sube[1] - sube[0]), 0, 1)   # entra poco a poco
        if baja_: rampa *= np.clip((baja_[1] - filas) / (baja_[1] - baja_[0]), 0, 1)  # sale poco a poco
        blend = blend * rampa[:, None, None]
        base[ya:yb, xa:xb] = base[ya:yb, xa:xb] * (1 - blend) + srcf[ya:yb, xa + mdx:xb + mdx] * blend
        print('  franja', ya, yb, 'dx', mdx, 'err', round(mejor))
for (a, b, c, d) in cajas:
    reg = np.zeros_like(gorda); reg[c - 20:d + 20, a - 20:b + 20] = gorda[c - 20:d + 20, a - 20:b + 20]
    print('ristra', a)
    parchear(reg, 405, 508, baja_=(492, 508))
    parchear(reg, 492, 598, sube=(492, 508))
base = base.astype(np.uint8)
baja = gorda.copy(); baja[:598] = 0  # solo lo que cuelga sobre la pizarra
base = cv2.inpaint(base, baja, 6, cv2.INPAINT_TELEA)
os.makedirs(os.path.join(RAIZ, 'img/corredor'), exist_ok=True)
cv2.imwrite(os.path.join(RAIZ, 'img/corredor/base.jpg'), base[Y0:Y1, X0:X1], [cv2.IMWRITE_JPEG_QUALITY, 86])
cv2.imwrite(os.path.join(RAIZ, 'img/corredor/base.webp'), base[Y0:Y1, X0:X1], [cv2.IMWRITE_WEBP_QUALITY, 82])
# alfa suave de las panoyas
alfa = cv2.GaussianBlur(cv2.dilate(mascara, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))), (0, 0), 1.3)
rgba = np.dstack([src, alfa])
NSEG = 4; SOLAPE = 3
ristras = []; tiras = []; filas = []
for i, (a, b, c, d) in enumerate(cajas):
    ys, xs = np.where(mascara[c:d, a:b] > 0)
    x0, x1, y0, y1 = xs.min() + a - 4, xs.max() + a + 5, ys.min() + c - 4, ys.max() + c + 5
    # eje: centro de masa por franja; el péndulo cuelga del punto superior
    alt = y1 - y0; cortes = [y0 + round(alt * j / NSEG) for j in range(NSEG + 1)]
    juntas = []
    for j in range(NSEG):
        fr = mascara[cortes[j]:cortes[j + 1], x0:x1]
        yy, xx = np.where(fr > 0)
        juntas.append(float(xx.mean() + x0) if len(xx) else (x0 + x1) / 2)
    juntas_x = [juntas[0]] + juntas[:]  # x de la junta j (la primera = centro de la franja superior)
    # x de cada junta: se toma el centro de la franja que empieza ahí (la superior, el del primer tramo)
    segs = []
    for j in range(NSEG):
        ya, yb = cortes[j] - (SOLAPE if j else 0), cortes[j + 1] + (SOLAPE if j < NSEG - 1 else 0)
        recorte = rgba[ya:yb, x0:x1]
        segs.append({'ya': ya, 'yb': yb, 'jx': juntas[j] if j == 0 else float(np.mean(np.where(mascara[cortes[j]:cortes[j] + 3, x0:x1] > 0)[1]) + x0) if (mascara[cortes[j]:cortes[j] + 3, x0:x1] > 0).any() else juntas[j], 'jy': cortes[j], 'img': recorte})
    ristras.append({'x0': x0, 'x1': x1, 'y0': y0, 'y1': y1, 'segs': segs})
# atlas: una fila por ristra, las tiras una al lado de otra
ancho_total = max(sum(s['img'].shape[1] + 2 for s in r['segs']) for r in ristras)
alto_total = sum(max(s['img'].shape[0] for s in r['segs']) + 2 for r in ristras)
atlas = np.zeros((alto_total, ancho_total, 4), np.uint8)
meta = []; y = 0
for r in ristras:
    x = 0; fila = []; hmax = max(s['img'].shape[0] for s in r['segs'])
    for s in r['segs']:
        h, w = s['img'].shape[:2]
        atlas[y:y + h, x:x + w] = s['img']
        # coordenadas relativas a la escena recortada (X0,Y0)
        fila.append({'sx': x, 'sy': y, 'w': w, 'h': h, 'jx': round(s['jx'] - r['x0'], 1), 'jy': round(s['jy'] - s['ya'], 1), 'ox': r['x0'] - X0, 'oy': s['ya'] - Y0})
        x += w + 2
    meta.append({'x0': r['x0'] - X0, 'x1': r['x1'] - X0, 'y0': r['y0'] - Y0, 'y1': r['y1'] - Y0, 'segs': fila})
    y += hmax + 2
cv2.imwrite(os.path.join(RAIZ, 'img/corredor/panoyas.png'), atlas, [cv2.IMWRITE_PNG_COMPRESSION, 9])
cv2.imwrite(os.path.join(RAIZ, 'img/corredor/panoyas.webp'), atlas, [cv2.IMWRITE_WEBP_QUALITY, 90])
# zócalo: color medio de la pizarra bajo el recorte, para continuar la banda
zoc = src[Y1 - 80:Y1 - 8, 1690:1780]
col = [int(v) for v in np.median(zoc.reshape(-1, 3), 0)[::-1]]
json.dump({'ancho': X1 - X0, 'alto': Y1 - Y0, 'zocalo': '#%02x%02x%02x' % tuple(col), 'ristras': meta}, default=int, fp=open(os.path.join(RAIZ, 'img/corredor/panoyas.json'), 'w'), indent=1)
print('ok', X1 - X0, Y1 - Y0, col, atlas.shape)
