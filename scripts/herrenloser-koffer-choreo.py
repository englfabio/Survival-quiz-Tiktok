# Hilfsskript: erzeugt scenarios/herrenloser-koffer.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/herrenloser-koffer-choreo.py
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'herrenloser-koffer'
S = dict(
situation="Du hast mal wieder einen herrenlosen Koffer am Bahnhof entdeckt. Weit und breit niemand, dem er gehören könnte. Was machst du jetzt?",
o1c="Reinschauen, wem er gehört", o1s="Eins: Kurz reinschauen, ob ein Name drinsteht.",
o2c="Zum Fundbüro bringen", o2s="Zwei: Den Koffer schnell zum Fundbüro bringen.",
o3c="Nicht anfassen, Bahnpersonal oder Polizei", o3s="Drei: Nicht anfassen, Abstand halten und Bahnpersonal oder Bundespolizei Bescheid sagen.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer drei.",
e1="Lieber nicht. Von außen kannst du nicht erkennen, was in dem Koffer ist. Genau deshalb rät die Bundespolizei: Im öffentlichen Raum herrenlose Gegenstände nicht anfassen und nicht öffnen.",
e2="Gut gemeint, aber auch das ist keine gute Idee. Wenn du den Koffer bewegst, trägst du ein unbekanntes Risiko quer durch einen vollen Bahnhof. Und die Polizei kann nicht mehr sehen, wo und wie er abgestellt wurde.",
e3="Fass nichts an und geh auf Abstand. Sag sofort Bahnpersonal oder der Bundespolizei Bescheid. Die prüfen den Koffer mit Spezialisten. Meistens ist es nur vergessenes Gepäck. Aber das kannst du von außen eben nicht erkennen.",
outro="Und lass deinen eigenen Koffer nie allein stehen. Den Polizeieinsatz kann man dir sonst in Rechnung stellen. Wusstest du es? Schreib's in die Kommentare.",
)
LEAD = {'situation': 0.3, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'outro': 0.3}
MINLEN = {'situation': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7, 'outro': 3}
TEXT = {'situation': S['situation'], 'explain1': S['e1'], 'explain2': S['e2'], 'explain3': S['e3'], 'outro': S['outro']}
vd = f'{ROOT}/public/voice/{ID}'
dur = json.load(open(f'{vd}/durations.json')) if os.path.exists(f'{vd}/durations.json') else {}
ali = json.load(open(f'{vd}/alignment.json')) if os.path.exists(f'{vd}/alignment.json') else {}

def seclen(c):
    a = dur.get(c, 0.84 + 0.0594 * len(TEXT[c]))
    return round(max(LEAD[c] + a + 0.5, MINLEN[c]) * 30) / 30
def cue(c, phrase):
    """t (0..1) im Abschnitt, an dem phrase beginnt"""
    txt = TEXT[c]; i = txt.index(phrase); L = seclen(c)
    st = ali[c]['character_start_times_seconds'][i] if c in ali else (0.84 + 0.0594 * len(txt)) * i / len(txt)
    return round((LEAD[c] + st) / L, 4)
r3 = lambda x: round(x, 4)
def K(t, x, z, motion, face=None, **kw):
    d = {'t': r3(t), 'x': round(x, 3), 'z': round(z, 3), 'motion': motion}
    if face is not None: d['face'] = face
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    """Kamera-Zeitachse (sampleCamera glättet die Zeit: te = easeInOut(t)·0,35 + t·0,65) → Schnitte exakt treffen"""
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def cam(t, pos, look, fov=None):
    d = {'t': round(te(t), 4), 'pos': [round(v, 3) for v in pos], 'look': [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
def sec(c, s):
    """Sekunden → Anteil im Abschnitt"""
    return s / seclen(c)
HIDE = -30
def rot(face, lx, lz):
    """Figuren-System → Welt (Drehung um y um 180 − face)"""
    th = math.radians(180 - face)
    return (lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th))
def face_to(a, b):
    """Blickrichtung (Grad) von Punkt a zu Punkt b (face 0 = −z, 90 = +x)"""
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)

# ---- feste Plätze (Bühne bahnhof, siehe src/stage/Station.tsx) ----
KX, KZ, KF = 0.8, 3.4, 270            # Koffer: Rollen-Achse; Front zeigt nach −x (zum Dummy)
BODY = (KX - 0.17, KZ)                # Mitte des Kofferkörpers
DX, DZ, DF = KX - 1.25, KZ, 90        # Dummy steht vor dem Koffer, Blick nach +x
LATCH_D = KX - 0.17 - 0.012 - 0.47    # Dummy-Position zum Öffnen (Hände an den Schnallen)
GRAB_D = KX - 0.17 - 0.5              # Dummy-Position zum Greifen des Tragegriffs
LF = (4.5, 24.2)                      # vor dem Fundbüro-Schalter
STAFF = (-3.3, 6.0)                   # Bahnmitarbeiterin am Bahnsteig
CASE_ON_DUMMY = dict(attach='dummy', x=-0.2, y=0, z=-1.04, face=0, tilt=40, handle=1)
def koffer(t=0, **kw):
    return K(t, KX, KZ, 'park', KF, **kw)

# ================= Situation =================
L0 = 'situation'
c_weit = cue(L0, 'Weit und breit')
c_was = cue(L0, 'Was machst')
WALK0 = (-5.0, KZ)
arrive = sec(L0, 3.0)
look0 = r3(max(arrive + sec(L0, 0.05), c_weit - sec(L0, 0.2)))
dummy0 = [K(0, WALK0[0], WALK0[1], 'walk', 90), K(arrive, DX, DZ, 'walk', 90), K(r3(arrive + 0.002), DX, DZ, 'stand', 90),
          K(look0, DX, DZ, 'lookaround', 90), K(1, DX, DZ, 'lookaround', 90)]
CL = [DX + 0.55, 0.85, KZ - 0.1]
situation = {
 'camera': [cam(0, [KX + 2.9, 1.45, KZ + 3.9], [KX - 1.6, 0.75, KZ - 0.6]), cam(r3(c_weit - 0.004), [KX + 2.6, 1.45, KZ + 3.6], [KX - 1.6, 0.8, KZ - 0.6]),
            cam(r3(c_weit), [KX + 8.5, 2.7, KZ + 0.4], [KX - 3.0, 0.6, KZ - 0.4]), cam(r3(c_was - 0.004), [KX + 8.0, 2.65, KZ + 0.4], [KX - 3.0, 0.6, KZ - 0.4]),
            cam(r3(c_was), [KX + 2.6, 1.6, KZ + 4.6], CL), cam(1, [KX + 2.4, 1.57, KZ + 4.3], CL)],
 'actors': {'dummy': dummy0, 'koffer': [koffer()]},
 'sfx': [{'t': r3(look0 + sec(L0, 2.15)), 'id': 'herzschlag', 'volume': 0.35}],
}

# ================= Optionen / Countdown / Auflösung =================
def still_scene():
    return {'dummy': [K(0, DX, DZ, 'lookaround', 90)], 'koffer': [koffer()]}
OL = [BODY[0] - 0.4, 0.0, KZ - 0.2]
def still(p0, p1):
    return {'camera': [cam(0, p0, OL), cam(1, p1, OL)], 'actors': still_scene()}
options = still([3.9, 4.0, KZ + 8.6], [3.8, 3.9, KZ + 8.3])
countdown = still([3.8, 3.9, KZ + 8.3], [3.7, 3.8, KZ + 8.05])
reveal = still([3.7, 3.8, KZ + 8.05], [3.65, 3.75, KZ + 7.9])
for sh in (options, countdown, reveal):
    # Dummy steht schon (Umschauen ist vorbei → Zeit groß, Blick nach vorn unten)
    sh['actors']['dummy'] = [K(0, DX, DZ, 'stand', 90)]

# ================= Option 1: reinschauen (falsch) =================
L1 = 'explain1'
st1 = sec(L1, 0.15)
ar1 = sec(L1, 1.0)
fz1 = r3(ar1 + sec(L1, 1.75))
exp1 = {
 'camera': [cam(0, [KX + 1.5, 1.55, KZ + 3.7], [LATCH_D + 0.3, 0.82, KZ - 0.1]), cam(fz1, [KX + 1.3, 1.5, KZ + 3.3], [LATCH_D + 0.3, 0.8, KZ - 0.1]),
            cam(1, [KX + 1.25, 1.49, KZ + 3.2], [LATCH_D + 0.3, 0.8, KZ - 0.1])],
 'actors': {
  'dummy': [K(0, DX, DZ, 'stand', 90), K(st1, DX, DZ, 'walk', 90), K(ar1, LATCH_D, DZ, 'walk', 90), K(r3(ar1 + 0.002), LATCH_D, DZ, 'bendopen', 90),
            K(1, LATCH_D, DZ, 'bendopen', 90)],
  'koffer': [koffer()],
 },
 'freeze': fz1,
 'sfx': [{'t': r3(ar1 + sec(L1, 0.95)), 'id': 'schnallen-klick', 'volume': 0.55}],
}

# ================= Option 2: zum Fundbüro bringen (falsch) =================
L2 = 'explain2'
g0 = sec(L2, 0.9)          # greift
g1 = r3(g0 + sec(L2, 1.25))  # Teleskopgriff draußen
turn = r3(g1 + sec(L2, 0.45))
SPEED2 = 1.35
# Weg: vom Koffer ein Stück nach +z, dann gerade durch die Halle zum Fundbüro
P0 = (GRAB_D, DZ)
P1 = (GRAB_D + 0.6, DZ + 1.6)
P2 = (2.6, 12.0)
P3 = (LF[0], LF[1] - 0.6)
def seglen(a, b): return math.hypot(b[0] - a[0], b[1] - a[1])
t1 = r3(turn + sec(L2, seglen(P0, P1) / SPEED2 + 0.4))
t2 = r3(t1 + sec(L2, seglen(P1, P2) / SPEED2))
t3 = r3(t2 + sec(L2, seglen(P2, P3) / SPEED2))
fz2 = r3(t2 + sec(L2, 0.9))           # friert mitten in der vollen Halle ein
f12 = face_to(P1, P2); f23 = face_to(P2, P3)
dummy2 = [K(0, DX, DZ, 'stand', 90), K(sec(L2, 0.1), DX, DZ, 'walk', 90), K(r3(g0 - sec(L2, 0.52)), GRAB_D, DZ, 'walk', 90),
          K(r3(g0 - sec(L2, 0.5)), GRAB_D, DZ, 'grabcase', 90),
          K(turn, P0[0], P0[1], 'grabcase', 90), K(r3(turn + 0.002), P0[0], P0[1], 'rollcase', 90),
          K(t1, P1[0], P1[1], 'rollcase', f12), K(t2, P2[0], P2[1], 'rollcase', f12), K(t3, P3[0], P3[1], 'rollcase', f23), K(1, P3[0], P3[1], 'rollcase', f23)]
# sauber sortieren (Greifen startet 0,5 s vor der Hand am Griff)
dummy2 = sorted(dummy2, key=lambda k: k['t'])
koffer2 = [koffer(0, handle=0, tilt=0), koffer(g1, handle=1, tilt=0), koffer(r3(turn - 0.002), handle=1, tilt=0),
           K(r3(turn + sec(L2, 0.45)), **CASE_ON_DUMMY, motion='park'), K(1, **CASE_ON_DUMMY, motion='park')]
def follow(t, p, ahead=(0.0, 1.0), off=(-3.6, 4.6, -6.6), lk=(0.5, 0.45, 2.0)):
    return cam(t, [p[0] + off[0], off[1], p[1] + off[2]], [p[0] + lk[0], lk[1], p[1] + lk[2]])
def lerp2(a, b, k): return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)
cut2 = r3(t1 - sec(L2, 0.6))
exp2 = {
 'stage': 'bahnhof-voll',
 'camera': [cam(0, [KX + 1.7, 1.6, KZ + 3.8], [GRAB_D + 0.3, 0.85, KZ - 0.1]), cam(r3(cut2 - 0.004), [KX + 1.5, 1.55, KZ + 3.5], [GRAB_D + 0.3, 0.85, KZ - 0.1]),
            *[follow(r3(cut2 + (fz2 - cut2) * k / 10), lerp2(P1, P2, min(1, max(0, (cut2 + (fz2 - cut2) * k / 10 - t1) / (t2 - t1)))) if cut2 + (fz2 - cut2) * k / 10 < t2 else lerp2(P2, P3, (cut2 + (fz2 - cut2) * k / 10 - t2) / (t3 - t2))) for k in range(11)],
            follow(1, lerp2(P2, P3, (fz2 - t2) / (t3 - t2)), off=(-3.4, 4.5, -6.2))],
 'actors': {'dummy': dummy2, 'koffer': koffer2},
 'freeze': fz2,
 'sfx': [{'t': r3(turn), 'id': 'koffer-rollen', 'volume': 0.5}, {'t': r3(t2 - sec(L2, 0.5)), 'id': 'koffer-rollen', 'volume': 0.45}],
}

# ================= Option 3: Abstand, Bescheid sagen (richtig) =================
L3 = 'explain3'
c_fass = cue(L3, 'Fass nichts an')
c_geh = cue(L3, 'und geh auf')
c_abst = cue(L3, 'Abstand.')
c_sag = cue(L3, 'Sag sofort')
c_pruef = cue(L3, 'Die prüfen')
c_meist = cue(L3, 'Meistens')
c_aber = cue(L3, 'Aber das')
RT = (KX - 2.3, KZ + 0.15)                       # Ende rückwärts
PT_FACE = face_to((-3.6, 5.0), BODY)
DP = (-3.6, 5.0)                                  # neben der Bahnmitarbeiterin
right = rot(PT_FACE, -1.0, 0)                     # rechts vom Dummy
STAFF = (DP[0] + right[0] * 0.95, DP[1] + right[1] * 0.95)
rt0 = sec(L3, 0.2)
rt1 = r3(max(rt0 + sec(L3, 1.9), c_sag - sec(L3, 1.4)))
pt0 = r3(rt1 + sec(L3, seglen(RT, DP) / 1.5 + 0.1))
staff_face0 = face_to(STAFF, DP)
call3 = r3(pt0 + sec(L3, 1.3))
dummy3 = [K(0, DX, DZ, 'stand', 90), K(rt0, DX, DZ, 'retreat', 90), K(rt1, RT[0], RT[1], 'retreat', 90), K(r3(rt1 + 0.002), RT[0], RT[1], 'walk', face_to(RT, DP)),
          K(r3(pt0 - 0.002), DP[0], DP[1], 'walk', face_to(RT, DP)), K(pt0, DP[0], DP[1], 'pointtalk', PT_FACE), K(r3(call3 + sec(L3, 1.2)), DP[0], DP[1], 'pointtalk', PT_FACE),
          K(r3(call3 + sec(L3, 1.25)), DP[0], DP[1], 'stand', PT_FACE), K(1, DP[0], DP[1], 'stand', PT_FACE)]
staff3 = [K(0, STAFF[0], STAFF[1], 'stand', 200), K(r3(pt0 - sec(L3, 0.6)), STAFF[0], STAFF[1], 'stand', staff_face0),
          K(r3(pt0 + sec(L3, 0.2)), STAFF[0], STAFF[1], 'listen', staff_face0), K(r3(call3 - 0.002), STAFF[0], STAFF[1], 'listen', staff_face0),
          K(call3, STAFF[0], STAFF[1], 'call', face_to(STAFF, BODY)), K(1, STAFF[0], STAFF[1], 'call', face_to(STAFF, BODY))]
# Absperrband: Quadrat um den Koffer, Start-Ecke vorn links (Bühne: face 90)
A = 1.25
CX, CZ = BODY
IN = 0.36
corners = [(CX - A + IN, CZ + A - IN), (CX + A - IN, CZ + A - IN), (CX + A - IN, CZ - A + IN), (CX - A + IN, CZ - A + IN)]
faces = [90, 0, 270, 180]
pol_in = r3(max(call3 + sec(L3, 0.4), c_pruef - sec(L3, 2.2)))
HALL_IN = (0.2, 8.6)
tw0 = r3(pol_in + sec(L3, seglen(HALL_IN, corners[0]) / 1.8))
SIDE = sec(L3, (2 * (A - IN)) / 1.8)
pol3 = [K(0, HALL_IN[0], HALL_IN[1], 'stand', 180, y=HIDE), K(r3(pol_in - 0.002), HALL_IN[0], HALL_IN[1], 'stand', 180, y=HIDE),
        K(pol_in, HALL_IN[0], HALL_IN[1], 'walk', face_to(HALL_IN, corners[0]), y=0), K(r3(tw0 - 0.002), corners[0][0], corners[0][1], 'walk', face_to(HALL_IN, corners[0]))]
tape3 = [K(0, CX, CZ, 'park', 90, fill=0, size=A - 1.4, y=HIDE), K(r3(tw0 - 0.003), CX, CZ, 'park', 90, fill=0, y=HIDE), K(r3(tw0 - 0.002), CX, CZ, 'park', 90, fill=0, y=0)]
tt = tw0
for i in range(4):
    a = corners[i]; b = corners[(i + 1) % 4]
    pol3.append(K(r3(tt), a[0], a[1], 'tapewalk', faces[i]))
    tape3.append(K(r3(tt + SIDE * 0.5), CX, CZ, 'park', 90, fill=(i + 0.5) / 4))
    tt += SIDE
    tape3.append(K(r3(tt), CX, CZ, 'park', 90, fill=(i + 1) / 4))
tape_done = r3(tt)
pol3.append(K(r3(tape_done), corners[0][0], corners[0][1], 'tapewalk', faces[3]))
# Kumpel kommt angerannt (von links am Bahnsteig), bleibt vor der Absperrung stehen
KU = (CX - A - 0.75, CZ + A + 0.45)
PO = (CX - A + 0.3, CZ + A - 0.25)
ku0 = r3(max(tape_done - sec(L3, 2.0), c_meist - sec(L3, 0.9)))
ku1 = r3(ku0 + sec(L3, 2.1))
hand0 = r3(max(ku1 + sec(L3, 0.5), tape_done + sec(L3, 1.0), c_aber - sec(L3, 0.2)))
swap = r3(hand0 + sec(L3, 0.75))
pol3 += [K(r3(tape_done + 0.003), corners[0][0], corners[0][1], 'walk', face_to(corners[0], PO)), K(r3(max(tape_done + sec(L3, 0.8), ku1 - sec(L3, 0.2))), PO[0], PO[1], 'walk', face_to(PO, KU)),
         K(r3(max(tape_done + sec(L3, 0.8), ku1 - sec(L3, 0.2)) + 0.002), PO[0], PO[1], 'stand', face_to(PO, KU)),
         K(hand0, PO[0], PO[1], 'handover', face_to(PO, KU)), K(1, PO[0], PO[1], 'handover', face_to(PO, KU))]
pol3 = sorted(pol3, key=lambda k: k['t'])
kumpel3 = [K(0, -12, KU[1] + 0.3, 'stand', 90, y=HIDE), K(r3(ku0 - 0.002), -12, KU[1] + 0.3, 'stand', 90, y=HIDE),
           K(ku0, -9.5, KU[1] + 0.3, 'run', 90, y=0), K(ku1, KU[0], KU[1], 'run', 90), K(r3(ku1 + 0.002), KU[0], KU[1], 'stand', face_to(KU, PO)),
           K(r3(hand0 - sec(L3, 0.8)), KU[0], KU[1], 'sheepish', face_to(KU, PO)), K(1, KU[0], KU[1], 'sheepish', face_to(KU, PO))]
MID_KP = ((KU[0] + PO[0]) / 2, (KU[1] + PO[1]) / 2)
CAM_D = [MID_KP[0] - 1.2, 2.0, MID_KP[1] - 6.4]
BILLF = face_to(MID_KP, (CAM_D[0], CAM_D[2]))
bill3 = [K(0, PO[0], PO[1], 'park', face_to(PO, KU), y=HIDE), K(r3(hand0 - 0.002), PO[0], PO[1], 'park', face_to(PO, KU), y=HIDE),
         K(hand0, PO[0], PO[1], 'park', BILLF, y=0, hand=1, holder='bundespolizist', size=0.5, drop=-0.16),
         K(swap, PO[0], PO[1], 'park', BILLF, holder='kumpel'), K(1, PO[0], PO[1], 'park', BILLF)]
cutB = r3(pt0 - sec(L3, 0.4))
cutC = r3(pol_in + sec(L3, 0.5))
cutD = r3(ku0 + sec(L3, 0.5))
MID_KP = ((KU[0] + PO[0]) / 2, (KU[1] + PO[1]) / 2)
exp3 = {
 'camera': [cam(0, [KX + 2.6, 1.8, KZ + 5.4], [-1.0, 0.85, KZ - 0.2]), cam(r3(cutB - 0.004), [KX + 2.3, 1.8, KZ + 5.1], [-1.3, 0.85, KZ - 0.1]),
            cam(cutB, [-0.2, 1.9, DP[1] - 4.8], [-2.6, 0.95, DP[1] + 0.2]), cam(r3(cutC - 0.004), [-0.4, 1.85, DP[1] - 4.5], [-2.6, 0.95, DP[1] + 0.2]),
            cam(cutC, [CX + 3.6, 4.3, CZ + 6.6], [CX - 0.4, 0.45, CZ - 0.7]), cam(r3(cutD - 0.004), [CX + 3.4, 4.1, CZ + 6.2], [CX - 0.4, 0.45, CZ - 0.7]),
            cam(cutD, CAM_D, [MID_KP[0], 1.0, MID_KP[1] + 0.2]),
            cam(1, [CAM_D[0] + 0.05, CAM_D[1], CAM_D[2] + 0.5], [MID_KP[0], 1.0, MID_KP[1] + 0.2])],
 'actors': {'dummy': dummy3, 'koffer': [koffer()], 'bahnmitarbeiterin': staff3, 'bundespolizist': pol3, 'absperrband': tape3,
            'kumpel': kumpel3, 'rechnung': bill3},
 'flash': pt0,
 'sfx': [{'t': r3(call3 + sec(L3, 0.3)), 'id': 'handy-waehlen', 'volume': 0.4}, {'t': r3(tw0), 'id': 'absperrband', 'volume': 0.5}],
}
steps3 = [{'text': 'Nicht anfassen', 'cue': 'Fass nichts an'},
          {'text': 'Nicht öffnen', 'cue': 'und geh auf'},
          {'text': 'Abstand halten', 'cue': 'Abstand.'},
          {'text': 'Bahnpersonal oder Bundespolizei informieren', 'cue': 'Sag sofort'}]

# ================= Outro: Kumpel mit Rechnung, Koffer daneben, Polizist =================
KO = (0.0, 4.4)
CAM_O = [KO[0] + 2.0, 1.6, KO[1] - 5.9]
KF_O = face_to(KO, (CAM_O[0], CAM_O[2]))
POL_O = (KO[0] + 1.15, KO[1] + 1.0)
outro = {
 'camera': [cam(0, CAM_O, [KO[0] + 0.3, 1.6, KO[1] + 0.2]), cam(1, [CAM_O[0] - 0.1, CAM_O[1], CAM_O[2] + 0.25], [KO[0] + 0.3, 1.6, KO[1] + 0.2])],
 'actors': {'kumpel': [K(0, KO[0], KO[1], 'sheepish', KF_O)],
            'rechnung': [K(0, KO[0], KO[1], 'park', KF_O, hand=1, holder='kumpel', size=0.7, drop=-0.2)],
            'koffer': [K(0, KO[0] - 0.6, KO[1] + 0.15, 'park', 90, handle=1)],
            'bundespolizist': [K(0, POL_O[0], POL_O[1], 'listen', face_to(POL_O, KO))]},
}

DESC = ("Du hast mal wieder einen herrenlosen Koffer am Bahnhof entdeckt – was machst du jetzt? 🧳 Schreib 1, 2 oder 3 in die Kommentare!\n\n"
        "Meistens ist es nur vergessenes Gepäck. Aber von außen erkennt das niemand.\n\n"
        "Quellen:\n"
        "Bundespolizei Kiel, Herrenloser Koffer am Bahnhof Lübeck: https://www.presseportal.de/blaulicht/pm/70257/6252980\n"
        "Bundespolizei Ludwigsdorf, Herrenloser Koffer am Bahnhof Görlitz: https://www.presseportal.de/blaulicht/pm/74160/6298219\n"
        "Stuttgarter Zeitung, Bundespolizei zu herrenlosen Gegenständen: https://www.stuttgarter-zeitung.de/lokales/stuttgart/polizeieinsatz-in-stuttgart-alarm-um-koffer-im-hauptbahnhof-79013865.html\n\n"
        "Im Notfall: 110.\n\n"
        "#waswürdestdutun #bahnhof #koffer #bundespolizei #fundstücke #wusstestdu #survival #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'category': 'fundstuecke', 'stage': 'bahnhof',
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy beugt sich über den Koffer und will die Schnallen öffnen. Bild friert ein, rotes Aufleuchten. Nichts Bedrohliches zu sehen.', 'explanation': S['e1'], 'choreography': exp1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy zieht den Teleskopgriff aus und rollt den Koffer quer durch die volle Bahnhofshalle Richtung Fundbüro. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e2'], 'choreography': exp2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy geht rückwärts auf Abstand, sagt der Bahnmitarbeiterin Bescheid (zeigt auf den Koffer), sie ruft die Bundespolizei, ein Bundespolizist sperrt mit Absperrband ab. Grünes Aufleuchten. Am Ende rennt der verlegene Kumpel-Dummy herbei und bekommt einen Zettel mit Euro-Zeichen (die Rechnung).', 'explanation': S['e3'], 'steps': steps3, 'choreography': exp3},
 ],
 'correctOption': 3,
 'countdown': {'speech': S['countdown'], 'screen': 'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal': {'speech': S['reveal'], 'screen': 'Richtig ist Nummer 3'},
 'outro': {'speech': S['outro'], 'screen': S['outro']},
 'sourceLine': 'Quellen: Bundespolizei',
 'sources': [
  {'name': 'Bundespolizei Kiel, Herrenloser Koffer am Bahnhof Lübeck', 'url': 'https://www.presseportal.de/blaulicht/pm/70257/6252980'},
  {'name': 'Bundespolizei Ludwigsdorf, Herrenloser Koffer am Bahnhof Görlitz', 'url': 'https://www.presseportal.de/blaulicht/pm/74160/6298219'},
  {'name': 'Stuttgarter Zeitung, Bundespolizei zu herrenlosen Gegenständen', 'url': 'https://www.stuttgarter-zeitung.de/lokales/stuttgart/polizeieinsatz-in-stuttgart-alarm-um-koffer-im-hauptbahnhof-79013865.html'},
 ],
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ehrlich: Wer hätte kurz reingeschaut? 👀👇 Was soll der Dummy als Nächstes finden?",
 },
 'shots': {'situation': situation, 'options': options, 'countdown': countdown, 'reveal': reveal, 'outro': outro},
}
for _sh in [situation, options, countdown, reveal, outro, exp1, exp2, exp3]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
print('cues', dict(weit=c_weit, was=c_was, fz1=fz1, g0=g0, turn=turn, t1=t1, t2=t2, fz2=fz2, rt1=rt1, pt0=pt0, call3=call3, pol_in=pol_in, tw0=tw0,
                   tape_done=tape_done, ku0=ku0, hand0=hand0), 'audio' if dur else 'geschätzt', {k: seclen(k) for k in TEXT})
