# Kamera so wählen, dass alle Punkte in einen Bildbereich passen (Hilfe beim Planen)
import numpy as np, math
from kamera_proj import proj
def fit(points, az, el, fov=38, box=(90, 990, 470, 1250), center_y=None):
    """az = Richtung von der Mitte zur Kamera (Grad, 0 = +z, 90 = +x), el = Höhenwinkel (Grad)"""
    P = np.array(points, float); c = P.mean(0)
    d3 = np.array([math.sin(math.radians(az)) * math.cos(math.radians(el)), math.sin(math.radians(el)), math.cos(math.radians(az)) * math.cos(math.radians(el))])
    look = c.copy()
    for _ in range(60):
        lo, hi = 0.5, 60
        for _ in range(40):
            d = (lo + hi) / 2
            cam = c + d3 * d
            r = np.array(proj(cam, look, P, fov))
            if r[:, 0].min() >= box[0] and r[:, 0].max() <= box[1] and r[:, 1].min() >= box[2] and r[:, 1].max() <= box[3]: hi = d
            else: lo = d
        d = hi; cam = c + d3 * d
        r = np.array(proj(cam, look, P, fov))
        cy = (r[:, 1].min() + r[:, 1].max()) / 2; cx = (r[:, 0].min() + r[:, 0].max()) / 2
        ty = center_y or (box[2] + box[3]) / 2
        if abs(cy - ty) < 3 and abs(cx - 540) < 3: break
        look[1] += (cy - ty) / 1920 * d * 0.7
        f = look - cam; f /= np.linalg.norm(f); rgt = np.cross(f, [0, 1, 0]); rgt /= np.linalg.norm(rgt)
        look += rgt * (cx - 540) / 1080 * d * 0.35
    return [round(v, 2) for v in cam], [round(v, 2) for v in look], proj(cam, look, P, fov)
