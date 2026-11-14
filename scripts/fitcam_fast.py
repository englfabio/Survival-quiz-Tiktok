# Schnelle (vektorisierte) Variante von fitcam.fit: gleiche Bedeutung der Parameter.
# fit(points, az, el, fov, box) → (Kamera, Blickpunkt, Pixel) – kleinster Abstand, bei dem alle Punkte in box liegen.
import numpy as np, math

def fit(points, az, el, fov=38, box=(90, 990, 470, 1250)):
    P = np.array(points, float); c = P.mean(0)
    d3 = np.array([math.sin(math.radians(az)) * math.cos(math.radians(el)), math.sin(math.radians(el)), math.cos(math.radians(az)) * math.cos(math.radians(el))])
    rgt = np.cross(-d3, [0, 1, 0]); rgt /= np.linalg.norm(rgt); up = np.cross(rgt, -d3)
    tx, ty = (box[0] + box[1]) / 2, (box[2] + box[3]) / 2
    t = math.tan(math.radians(fov / 2))
    oys, oxs = np.meshgrid(np.linspace(-0.6, 0.6, 49), np.linspace(-0.4, 0.4, 17), indexing='ij')
    oys = oys.ravel(); oxs = oxs.ravel()
    for d in np.arange(0.8, 60, 0.05):
        cam = c + d3 * d
        looks = c[None, :] + (up[None, :] * oys[:, None] + rgt[None, :] * oxs[:, None]) * d   # (N,3)
        f = looks - cam[None, :]; f /= np.linalg.norm(f, axis=1, keepdims=True)
        r = np.cross(f, np.array([0, 1, 0])[None, :]); r /= np.linalg.norm(r, axis=1, keepdims=True)
        u = np.cross(r, f)
        D = P[None, :, :] - cam[None, None, :]                       # (1,M,3)
        z = np.einsum('nk,mk->nm', f, D[0]); x = np.einsum('nk,mk->nm', r, D[0]); y = np.einsum('nk,mk->nm', u, D[0])
        sx = 540 + (x / z) / t * 960; sy = 960 - (y / z) / t * 960
        ok = (z.min(1) > 0) & (sx.min(1) >= box[0]) & (sx.max(1) <= box[1]) & (sy.min(1) >= box[2]) & (sy.max(1) <= box[3])
        if ok.any():
            e = np.abs((sx.min(1) + sx.max(1)) / 2 - tx) + np.abs((sy.min(1) + sy.max(1)) / 2 - ty)
            e[~ok] = 1e9
            i = int(e.argmin())
            return [round(float(v), 2) for v in cam], [round(float(v), 2) for v in looks[i]], np.stack([sx[i], sy[i]], 1).round().tolist()
    return None
