# Rechnet 3D-Weltpunkte in Bildpixel (1080x1920, fov 38) um - hilft beim Planen der Kamera.
# Beispiel: python3 -c "from kamera_proj import proj; print(proj([0,2,-5],[0,0.5,1],[[0,1,1]]))"
import numpy as np
def proj(cam, look, pts, fov=38):
    cam=np.array(cam,float); look=np.array(look,float)
    f=look-cam; f/=np.linalg.norm(f)
    r=np.cross(f,[0,1,0]); r/=np.linalg.norm(r)
    u=np.cross(r,f)
    t=np.tan(np.radians(fov/2))
    out=[]
    for p in pts:
        d=np.array(p,float)-cam
        z=d@f; x=d@r; y=d@u
        sy=960-(y/z)/t*960; sx=540+(x/z)/t*960
        out.append((round(sx),round(sy)))
    return out
