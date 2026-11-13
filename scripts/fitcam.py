# Kamera so wählen, dass alle Punkte in einen Bildbereich passen (Hilfe beim Planen)
import numpy as np, math
from kamera_proj import proj
def fit(points, az, el, fov=38, box=(90, 990, 470, 1250)):
    """az = Richtung von der Mitte zur Kamera (Grad, 0 = +z, 90 = +x), el = Höhenwinkel (Grad).
    Sucht den kleinsten Abstand, bei dem alle Punkte im Bildbereich box (x0, x1, y0, y1) liegen."""
    P = np.array(points, float); c = P.mean(0)
    d3 = np.array([math.sin(math.radians(az)) * math.cos(math.radians(el)), math.sin(math.radians(el)), math.cos(math.radians(az)) * math.cos(math.radians(el))])
    rgt = np.cross(-d3, [0, 1, 0]); rgt /= np.linalg.norm(rgt); up = np.cross(rgt, -d3)
    tx, ty = (box[0] + box[1]) / 2, (box[2] + box[3]) / 2
    for d in np.arange(0.8, 40, 0.05):
        best = None
        for oy in np.linspace(-0.6, 0.6, 49):
            for ox in np.linspace(-0.4, 0.4, 17):
                cam = c + d3 * d
                look = c + (up * oy + rgt * ox) * d
                r = np.array(proj(cam, look, P, fov))
                if r[:, 0].min() >= box[0] and r[:, 0].max() <= box[1] and r[:, 1].min() >= box[2] and r[:, 1].max() <= box[3]:
                    e = abs((r[:, 0].min() + r[:, 0].max()) / 2 - tx) + abs((r[:, 1].min() + r[:, 1].max()) / 2 - ty)
                    if best is None or e < best[0]: best = (e, cam, look, r)
        if best:
            return [round(float(v), 2) for v in best[1]], [round(float(v), 2) for v in best[2]], best[3].tolist()
    return None
