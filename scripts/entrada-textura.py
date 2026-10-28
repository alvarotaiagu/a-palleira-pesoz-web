#!/usr/bin/env python
"""A Palleira · el grano de la tiza (agente Entrada): img/entrada/tiza-grano.webp.
Un mosaico de 256x256 SIN costuras (el ruido se hace con FFT, que es periódico) que js/pizarra.js / css/entrada.css usan como
máscara (mask-image) sobre la tiza y como grano sobre la pizarra. El alfa va de ~0,35 (el hueco de la tiza seca)
a 1; con una semilla fija, siempre sale igual. Uso: python -I scripts/entrada-textura.py"""
import os

import numpy as np
from PIL import Image

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
N = 256
rng = np.random.default_rng(20261028)


def ruido(sigma):
    """ruido periódico filtrado en frecuencia (gaussiana): sale en 0..1"""
    r = rng.standard_normal((N, N))
    f = np.fft.fft2(r)
    fy = np.fft.fftfreq(N)[:, None]
    fx = np.fft.fftfreq(N)[None, :]
    g = np.exp(-(fx * fx + fy * fy) * (2 * np.pi * sigma) ** 2 / 2)
    o = np.real(np.fft.ifft2(f * g))
    o = (o - o.min()) / (o.max() - o.min())
    return o


fino = ruido(0.9)      # el grano
medio = ruido(3.2)     # las manchas
vetas = ruido(1.1)
a = 0.55 * fino + 0.45 * medio
# los huecos de la tiza seca: donde el grano fino es muy bajo
a = (a - a.min()) / (a.max() - a.min())
alfa = np.clip((a - 0.18) / 0.42, 0, 1) ** 0.7
alfa = 0.34 + 0.66 * alfa
img = np.zeros((N, N, 4), np.uint8)
img[..., :3] = 255
img[..., 3] = (alfa * 255).astype(np.uint8)
ruta = os.path.join(RAIZ, 'img', 'entrada', 'tiza-grano.webp')
os.makedirs(os.path.dirname(ruta), exist_ok=True)
Image.fromarray(img, 'RGBA').save(ruta, 'WEBP', quality=60, method=6, alpha_quality=45)
print('tiza-grano.webp: %d bytes, alfa medio %.2f' % (os.path.getsize(ruta), alfa.mean()))

# los huecos de la tiza seca, al revés: alfa alta donde la tiza falla. Se pinta ENCIMA de la frase, con el color de la pizarra,
# en una capa estática (así la tiza que se anima no lleva máscara y no se repinta con ella en cada fotograma)
huecos = np.clip((1 - alfa) * 1.15, 0, 0.8)
h = np.zeros((N, N, 4), np.uint8)
h[..., :3] = 255
h[..., 3] = (huecos * 255).astype(np.uint8)
ruta2 = os.path.join(RAIZ, 'img', 'entrada', 'tiza-huecos.webp')
Image.fromarray(h, 'RGBA').save(ruta2, 'WEBP', quality=60, method=6, alpha_quality=45)
print('tiza-huecos.webp: %d bytes' % os.path.getsize(ruta2))
