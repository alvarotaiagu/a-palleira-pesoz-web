# Portada «Desde el corredor»: recorta de la foto de portada (la 27) el marco de madera que va DELANTE del titular.
# Lo que queda transparente son las dos «ventanas» del corredor por encima del pasamanos (entre el pilar izquierdo,
# el central y el poste derecho); todo lo demás (pilares, zapatas, pasamanos, balaustres, mesa, pared) es el marco.
# Lee img/fotos/portada-1920.jpg (sale de scripts/fotos.mjs, así el marco y el fondo son los mismos píxeles)
# y escribe img/portada/marco-1920.webp y marco-960.webp. Relanzar si cambia la foto o su gradación:
#   python scripts/portada-marco.py            (con --ver deja una prueba en ref/portada-marco-ver.jpg)
import sys, os
import numpy as np
from PIL import Image, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = Image.open(os.path.join(RAIZ, 'img/fotos/portada-1920.jpg')).convert('RGB')
W, H = src.size
a = np.asarray(src).astype(int)
L = a[..., 0] * .3 + a[..., 1] * .59 + a[..., 2] * .11
madera = (L < 95) & (a[..., 0] >= a[..., 1] - 3)

def borde(y, x, paso, tope):
    """desde x (dentro de la madera) avanza mientras haya madera; para con 3 píxeles seguidos que no lo son"""
    fuera = 0
    while 0 <= x + paso < W and x != tope:
        x += paso
        if madera[y, x]: fuera = 0
        else:
            fuera += 1
            if fuera >= 3: return x - paso * 2
    return x

# las referencias, medidas sobre 1920×866: pilar central ~618–688, poste derecho ~1440–1500, pasamanos desde y≈344
k = W / 1920
CENTRO, POSTE = int(653 * k), int(1470 * k)
def pasamanos(x):
    """el pasamanos tiene unos 30 px de grueso: 14 filas seguidas de madera"""
    for y in range(int(290 * k), int(420 * k)):
        if madera[y:y + 14, x].all(): return y
    return -1
# el borde de arriba del pasamanos es una recta (poca perspectiva): se ajusta con las columnas que no se apartan de la mediana
xs = np.arange(int(90 * k), int(1430 * k)); ys = np.array([pasamanos(x) for x in xs])
ok = (ys > 0) & (np.abs(ys - np.median(ys[ys > 0])) < 6 * k)
pend, base = np.polyfit(xs[ok], ys[ok], 1)
techo_pas = np.round(pend * np.arange(W) + base).astype(int)
print('pasamanos: y = %.4f·x + %.1f' % (pend, base))

ventana = np.zeros((H, W), bool)
for y in range(0, int(400 * k)):
    izq_a = min(borde(y, 0, 1, CENTRO) + 1, int(95 * k)) if madera[y, 0] else 0   # pilar izquierdo (pegado al borde; el alero vecino no)
    der_a = borde(y, CENTRO, -1, 0)                                      # pilar central, por la izquierda
    izq_b = borde(y, CENTRO, 1, W - 1) + 1                               # pilar central, por la derecha
    der_b = borde(y, POSTE, -1, CENTRO)                                  # poste derecho, por la izquierda
    for x0, x1 in ((izq_a, der_a), (izq_b, der_b)):
        if x1 > x0: ventana[y, x0:x1] = True
ventana &= np.arange(H)[:, None] < techo_pas[None, :]

# limpiar: sin islas sueltas dentro del marco y 1 px más de ventana para que no quede halo claro en los bordes
m = Image.fromarray((ventana * 255).astype(np.uint8))
m = m.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.7))
alfa = Image.fromarray(255 - np.asarray(m))

marco = src.copy(); marco.putalpha(alfa)
os.makedirs(os.path.join(RAIZ, 'img/portada'), exist_ok=True)
for ancho in (1920, 960):
    im = marco if ancho == W else marco.resize((ancho, round(H * ancho / W)), Image.LANCZOS)
    ruta = os.path.join(RAIZ, f'img/portada/marco-{ancho}.webp')
    im.save(ruta, 'WEBP', quality=78, alpha_quality=90, method=6)
    print(ruta, im.size, os.path.getsize(ruta) // 1024, 'KB')

if '--ver' in sys.argv:
    ver = Image.new('RGB', src.size, (255, 0, 255)); ver.paste(src, (0, 0), alfa)
    ver.save(os.path.join(RAIZ, 'ref/portada-marco-ver.jpg'), quality=85)
