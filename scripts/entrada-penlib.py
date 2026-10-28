# Copia de asesoria-cervantes-carballo-web/scripts/penlib.py (memoria feedback_pen_stroke_pipeline.md): tubería de trazos de pluma.
"""Convierte un mapa de bits de tinta en trazos de pluma (lineas centrales).
Es la misma tuberia con la que se saco el ductus del wordmark 'Cervantes':
adelgazado Zhang-Suen -> grafo -> recorrido por giro minimo -> bezier.
"""
import numpy as np, math

CIRC = [(-1,-1),(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1)]

def adelgazar(I, max_it=200):
    """Zhang-Suen: deja la linea central de un trazo de un pixel de ancho."""
    I = I.astype(np.uint8).copy()
    def vec(P):
        return [np.roll(np.roll(P, dy, 0), dx, 1) for dy, dx in
                [(1,0),(1,-1),(0,-1),(-1,-1),(-1,0),(-1,1),(0,1),(1,1)]]
    for _ in range(max_it):
        cambio = False
        for paso in (0, 1):
            P2,P3,P4,P5,P6,P7,P8,P9 = vec(I)
            B = P2+P3+P4+P5+P6+P7+P8+P9
            seq = [P2,P3,P4,P5,P6,P7,P8,P9,P2]
            A = sum(((seq[i] == 0) & (seq[i+1] == 1)).astype(np.uint8) for i in range(8))
            c1, c2 = (P2*P4*P6, P4*P6*P8) if paso == 0 else (P2*P4*P8, P2*P6*P8)
            m = (I == 1) & (B >= 2) & (B <= 6) & (A == 1) & (c1 == 0) & (c2 == 0)
            if m.any():
                I[m] = 0; cambio = True
        if not cambio:
            break
    return I

def _vec(p, pts):
    y, x = p
    v = [(y+dy, x+dx) for dy, dx in CIRC if (y+dy, x+dx) in pts]
    return sorted(v, key=lambda q: abs(q[0]-y) + abs(q[1]-x))

def _ramas(p, pts):
    y, x = p
    m = [((y+dy, x+dx) in pts) for dy, dx in CIRC]
    if all(m): return 1
    return sum(1 for i in range(8) if m[i] and not m[i-1])

def _podar(pts, umbral):
    pts = set(pts)
    for _ in range(30):
        quitar = set()
        for p in [q for q in pts if _ramas(q, pts) == 1]:
            cam = [p]; prev = None; act = p
            while len(cam) <= umbral:
                sig = [q for q in _vec(act, pts) if q != prev and q not in cam]
                if len(sig) != 1: break
                prev, act = act, sig[0]
                if _ramas(act, pts) > 2: break
                cam.append(act)
            if len(cam) <= umbral and _ramas(cam[-1], pts) <= 2:
                quitar.update(cam)
        quitar = {q for q in quitar if _ramas(q, pts) <= 2}
        if not quitar: break
        pts -= quitar
    return pts

def trazos_de(S, podar_umbral=6, corte_giro=1.9, min_pts=12):
    """S: matriz booleana ya adelgazada. Devuelve listas de puntos (y, x)."""
    P = _podar(set(zip(*np.where(S))), podar_umbral)
    nodos = {p for p in P if _ramas(p, P) != 2}
    usado, edges, nn = set(), [], set()
    for n in sorted(nodos):
        for v in _vec(n, P):
            if v in nodos:
                k = frozenset((n, v))
                if k not in nn: nn.add(k); edges.append([n, v])
                continue
            if v in usado: continue
            cam = [n, v]; usado.add(v); prev, act = n, v
            while True:
                sig = [q for q in _vec(act, P) if q != prev and q not in usado]
                nd = [q for q in sig if q in nodos]
                if nd: cam.append(nd[0]); break
                sig = [q for q in sig if q not in nodos]
                if not sig: break
                q = sig[0]; usado.add(q); cam.append(q); prev, act = act, q
            edges.append(cam)
    rest = {p for p in P if p not in nodos and p not in usado}
    while rest:
        p = min(rest); cam = [p]; usado.add(p); rest.discard(p); prev, act = None, p
        while True:
            sig = [q for q in _vec(act, P) if q != prev and q not in usado]
            if not sig: break
            q = sig[0]; usado.add(q); rest.discard(q); cam.append(q); prev, act = act, q
        if len(cam) > 8: edges.append(cam)
    edges = [e for e in edges if len(e) >= 3]
    if not edges: return []

    def ang(a, b): return math.atan2(b[0]-a[0], b[1]-a[1])
    def d_sal(e, ini):
        q = e if ini else e[::-1]; k = min(9, len(q)-1); return ang(q[0], q[k])
    def d_ent(e, ini):
        q = e if ini else e[::-1]; k = min(9, len(q)-1); return ang(q[-1-k], q[-1])
    incid = {}
    for i, e in enumerate(edges):
        incid.setdefault(e[0], []).append((i, True))
        incid.setdefault(e[-1], []).append((i, False))
    libre = set(range(len(edges)))
    def trazar(i, ini):
        out = []
        while True:
            libre.discard(i)
            e = edges[i] if ini else edges[i][::-1]
            out.extend(e if not out else e[1:])
            d_in = d_ent(edges[i], ini); cand = []
            for j, di in incid.get(e[-1], []):
                if j not in libre: continue
                g = abs((d_sal(edges[j], di) - d_in + math.pi) % (2*math.pi) - math.pi)
                cand.append((g, j, di))
            if not cand: break
            cand.sort()
            if cand[0][0] > corte_giro: break
            _, i, ini = cand[0]
        return out
    arr = []
    for i, e in enumerate(edges):
        for p, ini in ((e[0], True), (e[-1], False)):
            if len(incid.get(p, [])) == 1: arr.append((p[1], p[0], i, ini))
    arr.sort()
    out = []
    for _, _, i, ini in arr:
        if i in libre: out.append(trazar(i, ini))
    while libre: out.append(trazar(min(libre), True))
    return [t for t in out if len(t) > min_pts]

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0]-a[0], b[1]-a[1]
    n = math.hypot(dx, dy); peor, k = -1, 0
    for i in range(1, len(pts)-1):
        p = pts[i]
        d = abs(dy*p[0] - dx*p[1] + b[0]*a[1] - b[1]*a[0]) / n if n else math.hypot(p[0]-a[0], p[1]-a[1])
        if d > peor: peor, k = d, i
    if peor > eps: return rdp(pts[:k+1], eps)[:-1] + rdp(pts[k:], eps)
    return [a, b]

def a_bezier(pts, t=0.22, dec=1):
    if len(pts) < 2: return ""
    fmt = "%." + str(dec) + "f"
    P = [pts[0]] + list(pts) + [pts[-1]]
    d = [("M" + fmt + " " + fmt) % pts[0]]
    for i in range(1, len(P)-2):
        p0, p1, p2, p3 = P[i-1], P[i], P[i+1], P[i+2]
        c1 = (p1[0] + (p2[0]-p0[0])*t, p1[1] + (p2[1]-p0[1])*t)
        c2 = (p2[0] - (p3[0]-p1[0])*t, p2[1] - (p3[1]-p1[1])*t)
        d.append(("C" + " ".join([fmt]*6)) % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]))
    return "".join(d)

def largo(pts):
    return sum(math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]) for i in range(len(pts)-1))
