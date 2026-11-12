# Nachbau der Dummy-Gelenkkette (Dummy.tsx) zum Planen von Positionen: Welt-Position von Hand/Ellbogen.
# hand(x, z, face, pose) -> np.array; pose = dict(hipY, pitch, torsoX, torsoY, torsoZ, armR=(sx,sz,bend), armL=..., foreZ)
import numpy as np
def Rx(a): c,s=np.cos(a),np.sin(a); return np.array([[1,0,0],[0,c,-s],[0,s,c]])
def Ry(a): c,s=np.cos(a),np.sin(a); return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def Rz(a): c,s=np.cos(a),np.sin(a); return np.array([[c,-s,0],[s,c,0],[0,0,1]])
def xyz(a,b,c): return Rx(a)@Ry(b)@Rz(c)
def arm_point(limb, side, foreZ=0, along=0.33, up=0):
    sx,sz,bend=limb
    v=np.array([0,-along,up]); v=xyz(bend,0,foreZ)@v; v=v+[0,-0.31,0]; v=xyz(sx,0,sz)@v; return v+[0.27*side,0.44,0]
def world(x,z,face,pose,local,y=0):
    v=xyz(pose.get('torsoX',0),pose.get('torsoY',0),pose.get('torsoZ',0))@local
    v=v+[0,0.06,0]+[0,pose.get('hipY',0.98),0]
    v=Rx(pose.get('pitch',0))@v
    v=Ry(np.radians(180-face))@v
    return v+[x,y,z]
def hand(x,z,face,pose,side=-1,along=0.33,y=0):
    limb=pose['armR'] if side==-1 else pose['armL']
    return world(x,z,face,pose,arm_point(limb,side,pose.get('foreZ',0) if side==-1 else 0,along),y)
