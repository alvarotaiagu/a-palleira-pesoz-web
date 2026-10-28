# Las cuatro ristras de panoyas, recortadas de la foto mejorada con IA (ref/fotos/corredor-ia-panoyas.png, la fachada
# entera con las panoyas) en vez de la 09. La foto se alinea con la base nueva (img/corredor/base.jpg, sin panoyas)
# y las ristras salen en su sitio. El atlas va a K veces la resolución de la escena (ANCHO×ALTO = 1856×642) y la
# geometría (GEO de js/corredor.js) sigue en unidades de escena. Uso: python scripts/corredor-panoyas-ia.py
import cv2, numpy as np, json, os, re
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANCHO, ALTO = 1856, 642
N = cv2.imread(os.path.join(RAIZ, 'ref/fotos/corredor-ia-panoyas.png'))
B = cv2.imread(os.path.join(RAIZ, 'img/corredor/base.jpg'))
s = B.shape[1] / ANCHO                                   # píxeles de la base por unidad de escena

def amarillo(img, flojo=False):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV); H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    if flojo: return ((H >= 10) & (H <= 32) & (S > 70) & (V > 140)).astype(np.uint8) * 255   # solo para no alinear con las panoyas
    # el maíz: amarillo vivo; la madera de la foto mejorada es naranja-parda (H ≲ 15) y no entra
    return ((H >= 16) & (H <= 30) & (S > 120) & (V > 165)).astype(np.uint8) * 255

# 1) alinear la foto con la base (sin contar las panoyas, que en la base no están)
gN, gB = cv2.cvtColor(N, cv2.COLOR_BGR2GRAY), cv2.cvtColor(B, cv2.COLOR_BGR2GRAY)
fuera = cv2.dilate(amarillo(N, True), np.ones((25, 25), np.uint8))
orb = cv2.ORB_create(8000)
kN, dN = orb.detectAndCompute(gN, 255 - fuera)
kB, dB = orb.detectAndCompute(gB, None)
m = sorted(cv2.BFMatcher(cv2.NORM_HAMMING, True).match(dN, dB), key=lambda x: x.distance)[:1500]
A, inl = cv2.estimateAffinePartial2D(np.float32([kN[x.queryIdx].pt for x in m]), np.float32([kB[x.trainIdx].pt for x in m]), method=cv2.RANSAC, ransacReprojThreshold=2.5)
# afinar con ECC sobre la foto ya llevada a la base
Nw0 = cv2.warpAffine(gN, A, (B.shape[1], B.shape[0])).astype(np.float32)
w = np.eye(2, 3, dtype=np.float32)
cc, w = cv2.findTransformECC(cv2.GaussianBlur(gB.astype(np.float32), (0, 0), 2), cv2.GaussianBlur(Nw0, (0, 0), 2), w, cv2.MOTION_AFFINE,
                             (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
A = (np.vstack([cv2.invertAffineTransform(w), [0, 0, 1]]) @ np.vstack([A, [0, 0, 1]]))[:2]
esc = float(np.sqrt(abs(np.linalg.det(A[:, :2]))))
print('alineado: inliers', int(inl.sum()), 'ecc', round(cc, 3), 'escala foto→base', round(esc, 3))

# 2) la foto en el marco de la escena, a K por unidad: K = s / esc ⇒ la foto sin ampliar (o lo menos posible)
K = max(s, s / esc)
W, H = round(ANCHO * K), round(ALTO * K)
Ak = A * (K / s)
F = cv2.warpAffine(N, Ak, (W, H), flags=cv2.INTER_LANCZOS4)
print('atlas a K =', round(K, 3))

# 3) las ristras: lo amarillo dentro de cajas alrededor de las de antes (GEO, en unidades de escena)
js = open(os.path.join(RAIZ, 'js/corredor.js'), encoding='utf8').read()
cajas = [tuple(map(int, g)) for g in re.findall(r'x0: (\d+), x1: (\d+), y0: (\d+), y1: (\d+)', js)]
firme = amarillo(F)
mascara = np.zeros(firme.shape, np.uint8)
for (x0, x1, y0, y1) in cajas:
    a, b, c, d = int((x0 - 40) * K), int((x1 + 40) * K), int((y0 - 15) * K), int((y1 + 50) * K)
    sub = np.zeros_like(firme); sub[c:d, a:b] = firme[c:d, a:b]
    sub = cv2.morphologyEx(sub, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(sub)
    k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); comp = (lab == k).astype(np.uint8) * 255
    cont, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    comp = np.zeros_like(comp); cv2.drawContours(comp, cont, -1, 255, -1)
    comp = cv2.dilate(comp, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    mascara = cv2.bitwise_or(mascara, comp)
mascara = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
# el cordel de arriba: la panoya cuelga de la barandilla, sin el trozo de pilar ni de fondo
alfa = cv2.GaussianBlur(mascara, (0, 0), 0.9)
rgba = np.dstack([F, alfa])

# 4) atlas y geometría (unidades de escena; el atlas, a K)
NSEG, SOLAPE = 4, 3
geo, filas_atlas = [], []
for (a0, a1, c0, c1) in cajas:
    a, b, c, d = int((a0 - 40) * K), int((a1 + 40) * K), int((c0 - 15) * K), int((c1 + 50) * K)
    ys, xs = np.where(mascara[c:d, a:b] > 0)
    x0, x1, y0, y1 = xs.min() + a - 3, xs.max() + a + 4, ys.min() + c - 3, ys.max() + c + 4
    alt = y1 - y0; cortes = [y0 + round(alt * j / NSEG) for j in range(NSEG + 1)]
    segs = []
    for j in range(NSEG):
        ya, yb = cortes[j] - (SOLAPE if j else 0), cortes[j + 1] + (SOLAPE if j < NSEG - 1 else 0)
        fr = mascara[cortes[j]:cortes[j] + 4, x0:x1] > 0
        jx = float(np.where(fr)[1].mean() + x0) if fr.any() else (x0 + x1) / 2
        segs.append((ya, yb, jx, cortes[j], rgba[ya:yb, x0:x1]))
    filas_atlas.append((x0, x1, y0, y1, segs))
aw = max(sum(sg[4].shape[1] + 4 for sg in f[4]) for f in filas_atlas)
ah = sum(max(sg[4].shape[0] for sg in f[4]) + 4 for f in filas_atlas)
atlas = np.zeros((ah, aw, 4), np.uint8)
y = 0
u = lambda v: round(v / K, 2)                            # píxel del marco K → unidad de escena
for (x0, x1, y0, y1, segs) in filas_atlas:
    x = 0; s_ = []
    for (ya, yb, jx, jy, im) in segs:
        h, w_ = im.shape[:2]; atlas[y:y + h, x:x + w_] = im
        s_.append([u(x), u(y), u(w_), u(h), u(jx - x0), u(jy - ya), u(x0), u(ya)])
        x += w_ + 4
    geo.append({'x0': round(u(x0)), 'x1': round(u(x1)), 'y0': round(u(y0)), 'y1': round(u(y1)), 's': s_})
    y += max(sg[4].shape[0] for sg in segs) + 4
cv2.imwrite(os.path.join(RAIZ, 'img/corredor/panoyas.png'), atlas, [cv2.IMWRITE_PNG_COMPRESSION, 9])
cv2.imwrite(os.path.join(RAIZ, 'img/corredor/panoyas.webp'), atlas, [cv2.IMWRITE_WEBP_QUALITY, 92])

# 5) la geometría y K, dentro de js/corredor.js
txt = '  var GEO = [\n' + ',\n'.join('    { x0: %d, x1: %d, y0: %d, y1: %d, s: [%s] }' % (g['x0'], g['x1'], g['y0'], g['y1'], ', '.join('[' + ', '.join(str(v) for v in sg) + ']' for sg in g['s'])) for g in geo) + '\n  ];\n  var ATLAS_K = %s;   // píxeles del atlas por unidad de escena\n' % round(K, 4)
js = re.sub(r'(/\*GEO\*/\n)[\s\S]*?(  /\*FIN\*/)', lambda mm: mm.group(1) + txt + mm.group(2), js)
open(os.path.join(RAIZ, 'js/corredor.js'), 'w', encoding='utf8').write(js)
json.dump({'ancho': ANCHO, 'alto': ALTO, 'atlas_k': K, 'ristras': geo}, open(os.path.join(RAIZ, 'img/corredor/panoyas.json'), 'w'), indent=1)
ver = B.copy(); kk = s
for g in geo: cv2.rectangle(ver, (int(g['x0'] * kk), int(g['y0'] * kk)), (int(g['x1'] * kk), int(g['y1'] * kk)), (0, 0, 255), 2)
cv2.imwrite(os.path.join(RAIZ, 'ref/panoyas-ver.jpg'), ver)
print('ok', atlas.shape, [(g['x0'], g['y0'], g['x1'], g['y1']) for g in geo])
