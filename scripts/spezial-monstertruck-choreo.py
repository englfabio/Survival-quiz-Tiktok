# Hilfsskript: erzeugt scenarios/spezial-monstertruck.json (Texte wortgenau vom Inhaber, "Buchstabe für Buchstabe") und richtet
# Bewegungen + Kameras nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-monstertruck-choreo.py
#
# Format: Spezial, aufgebaut nach dem Schema des Joghurt-Videos (scripts/mitbewohner-joghurt-choreo.py, Vorlage-Skript
# scripts/spezial-bahn-verspaetung-choreo.py): Situation mit 3 harten Schnitten, jede Antwort = Karte (eine ruhige Einstellung) + Szene mit
# einem harten Schnitt pro Satz/Pointe und langsamem Heranfahren, Abstimmung (alle Figuren stehen, Kamera tief), Outro (Dummy neben dem
# platten Auto am Straßenrand).
# Darstellung (vom Inhaber): alles comichaft und harmlos – niemand sitzt im überfahrenen Auto, niemand wird verletzt, bei der Verfolgungsjagd
# keine Unfälle mit Menschen. Keine echten Logos (kein Mercedes-Stern, keine Monstertruck-Marken/-Designs). Unimogs stilisiert, aber an der
# typischen Form erkennbar, mit Blaulicht und Schriftzug "POLIZEI".
import json, os, math, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-monstertruck'
S = dict(
situation="Dein Auto wurde mal wieder von einem Monstertruck überfahren. Es ist jetzt ungefähr so flach wie eine Pizza. Was machst du?",
o1c="In einen größeren Monstertruck steigen", o1s="A: Du steigst in einen größeren Monstertruck und überfährst den Monstertruck.",
o2c="Als moderne Kunst verkaufen", o2s="B: Du verkaufst dein plattes Auto als moderne Kunst.",
o3c="Polizei mit Unimogs", o3s="C: Du rufst die Polizei, und die nimmt sofort die Verfolgungsjagd auf. Mit Unimogs.",
e1="Du steigst in einen Monstertruck, der noch größer ist. Noch größere Reifen, noch lauterer Motor. Und dann rollst du ganz langsam über den Monstertruck drüber.",
e2="Du rahmst dein plattes Auto ein und stellst es aus. Die Besucher staunen. Ein Museum kauft es für zwei Millionen Euro. Moderne Kunst eben.",
e3="Du rufst die Polizei. Kurz darauf rollen sie an: Unimogs mit Blaulicht und Polizei-Schriftzug. Die Verfolgungsjagd beginnt. Quer über den Acker, durch den Matsch, über jeden Hügel.",
countdown="Also, was machst du? Schreib A, B oder C in die Kommentare.",
outro="Eine richtige Antwort gibt es diesmal nicht. Aber jeder kennt jemanden, dem genau das passieren würde. Schreib A, B oder C in die Kommentare und markier ihn.",
)
# visuelle Verlängerung der Szenen (Sekunden, ohne Text) – Reaktionen: Fahrer fassungslos (A), Besucher prosten (B), längere Jagd (C)
EXTRA = {1: 1.6, 2: 1.0, 3: 1.8}
LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'countdown': 0.1,
        'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'outro': 0.3}
MINLEN = {'situation': 5, 'countdown': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7, 'outro': 3}
TEXT = {'situation': S['situation'], 'option1': S['o1s'], 'option2': S['o2s'], 'option3': S['o3s'], 'countdown': S['countdown'],
        'explain1': S['e1'], 'explain2': S['e2'], 'explain3': S['e3'], 'outro': S['outro']}
vd = f'{ROOT}/public/voice/{ID}'
dur = json.load(open(f'{vd}/durations.json')) if os.path.exists(f'{vd}/durations.json') else {}
ali = json.load(open(f'{vd}/alignment.json')) if os.path.exists(f'{vd}/alignment.json') else {}

def seclen(c):
    a = dur.get(c, 0.84 + 0.0594 * len(TEXT[c]))
    return round(max(LEAD[c] + a + 0.5, MINLEN.get(c, 0)) * 30) / 30
def start_in(c, phrase):
    """Sekunden ab Clip-Beginn (inkl. LEAD), an denen phrase beginnt"""
    txt = TEXT[c]; i = txt.index(phrase)
    st = ali[c]['character_start_times_seconds'][i] if c in ali else (0.84 + 0.0594 * len(txt)) * i / len(txt)
    return LEAD[c] + st
def cue(c, phrase):
    return round(start_in(c, phrase) / seclen(c), 4)

r3 = lambda x: round(x, 4)
def K(t, x=None, z=None, motion='park', face=None, **kw):
    d = {'t': r3(max(0, min(1, t)))}
    if x is not None: d['x'] = round(x, 3)
    if z is not None: d['z'] = round(z, 3)
    d['motion'] = motion
    if face is not None: d['face'] = face
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    """Kamera-Zeitachse (sampleCamera glättet die Zeit) → Schnitte exakt treffen"""
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def cam(t, pos, look, fov=None):
    d = {'t': round(te(max(0, min(1, t))), 4), 'pos': [round(v, 3) for v in pos], 'look': [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
def shot(t0, t1, c, k=0.92, eps=0.003):
    """eine Einstellung von t0 bis t1: Kamera c, fährt langsam heran (dolly k)"""
    return [cam(t0, *c), cam(t1 - eps, *dolly(c, k))]
def face_to(a, b): return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)
HIDE = -30
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ANS = (70, 1000, 480, 1215)      # Bildbereich in den Antwort-Abschnitten (unter der Kopfzeile, über den Untertiteln)
SIT = (70, 1000, 250, 1215)
def F(points, az, el, box=ANS, fov=38):
    r = fit(points, az, el, fov=fov, box=box)
    assert r, ('Kamera passt nicht', points, az, el)
    return (r[0], r[1])
def dolly(c, k=0.92):
    pos, look = c
    return ([look[i] + (pos[i] - look[i]) * k for i in range(3)], look)
def body(x, z, top=1.98, w=0.32, y0=0.0):
    return [[x - w, y0 + top, z], [x + w, y0 + top, z], [x, y0, z]]

# ---- Bühnen-Maße (src/stage/Monstertruck.tsx, src/actors/TruckProps.tsx) ----
PARK = (0.0, -4.4)                            # Parkbucht des Dummy-Autos (Auto face 90)
WALK_Y = 0.12                                 # Gehweg-Höhe
DW = (0.7, -6.7)                              # Dummy auf dem Gehweg neben seinem Auto
MT_SEAT = (0.0, 1.78, 0.05)                   # Fahrersitz im Monstertruck (× Maßstab), Lenkrad passt zu seat*-Bewegungen
BIG = 1.5
UM_SEAT = (0.42, 1.32, 0.62)                  # Fahrersitz im Unimog (links)
CAR_PTS = lambda x, z, flat=1: [[x - 2.1, 0.0, z - 1.0], [x + 2.1, 0.0, z + 1.0], [x, 0.25 if flat else 1.6, z]]
def truck_pts(x, z, s=1.0):
    return [[x - 2.4 * s, 3.2 * s, z], [x + 2.4 * s, 3.2 * s, z], [x - 2.4 * s, 0, z + 1.6 * s], [x + 2.4 * s, 0, z - 1.6 * s]]
def unimog_pts(x, z):
    return [[x - 2.4, 2.9, z], [x + 2.4, 2.9, z], [x - 2.4, 0, z + 1.2], [x + 2.4, 0, z - 1.2]]
def seat(t, parent, motion, s=1.0, base=MT_SEAT, **kw):
    return K(t, base[0] * s, base[2] * s, motion, 0, y=base[1] * s, attach=parent, **kw)
def flatcar(y=0.0, x=PARK[0], z=PARK[1], squish=1.0):
    return [K(0, x, z, 'park', 90, y=y, squish=squish)]

# Acker: gleiche Bodenformel wie ackerHeight in src/stage/Monstertruck.tsx
HILLS = [(-14, 1.0, 1.5, 4.5, 8), (6, -0.5, 2.1, 5.0, 9), (27, 0.5, 1.8, 4.5, 8), (48, -1.0, 2.3, 5.0, 9)]
def acker_h(x, z):
    y = sum(h * math.exp(-((x - hx) ** 2) / (2 * sx * sx) - ((z - hz) ** 2) / (2 * sz * sz)) for hx, hz, h, sx, sz in HILLS)
    y += 0.12 * math.sin(x * 0.45) * math.sin(z * 0.3 + 1)
    if z > 10: y *= max(0, 1 - (z - 10) / 6)
    return y
def acker_tilt(x, z, wb=1.5):
    """Neigung (Grad, + = Nase runter) für ein Fahrzeug, das nach +x fährt"""
    return round(-math.degrees(math.atan2(acker_h(x + wb, z) - acker_h(x - wb, z), 2 * wb)), 2)

shots = {}
# =========================================================================================================
# Situation: Monstertruck rollt über das geparkte Auto → platt wie eine Pizza → Dummy fassungslos → "Was machst du?"
# =========================================================================================================
c = 'situation'; L = seclen(c)
sec = lambda s, c=c: s / seclen(c)
cE = cue(c, 'Es ist'); cW = cue(c, 'Was machst')
T0X = -11.0; TSPEED = 4.2; TSTOP = 7.0
t_hit = (PARK[0] - 1.85 - 1.5 - T0X) / TSPEED                # Vorderräder erreichen das Auto (s)
def tx(sec_):
    x = T0X + sec_ * TSPEED
    return min(x, TSTOP) if sec_ < 0 else (x if x < TSTOP - 2 else TSTOP - 2 + (1 - math.exp(-(x - TSTOP + 2) / 2)) * 2)
a = {}
tk = []
for i in range(17):
    s_ = (cE * L) * i / 16
    x = tx(s_)
    fa = x + 1.5; ra = x - 1.5                                 # Vorder-/Hinterachse
    over_f = max(0.0, 1 - abs(fa - PARK[0]) / 2.2); over_r = max(0.0, 1 - abs(ra - PARK[0]) / 2.2)
    tk.append(K(sec(s_), x, PARK[1], 'drive' if i < 16 else 'park', 90, y=0.18 * over_f + 0.1 * over_r, tilt=-4.0 * over_f + 3.0 * over_r, smoke=1, rumble=1))
tk.append(K(1, tx(cE * L), PARK[1], 'park', 90, y=0, tilt=0, smoke=0.6, rumble=0.5))
a['monstertruck'] = tk
a['truckfahrer'] = [seat(0, 'monstertruck', 'seatdrive')]
t_flat = sec(t_hit + 0.15)
a['car'] = [K(0, *PARK, 'park', 90, squish=0), K(t_flat, *PARK, 'park', 90, squish=0), K(t_flat + sec(0.25), *PARK, 'park', 90, squish=1)]
a['dummy'] = [K(0, *DW, 'stand', 180), K(t_flat + sec(0.2), *DW, 'stand', 180), K(t_flat + sec(0.25), *DW, 'carshock', 180),
              K(cW - 0.002, *DW, 'carshock', 180), K(cW, *DW, 'carshock', 165, brow=1, question=0), K(cW + sec(0.5), *DW, 'carshock', 165, question=1)]
CAM_S0 = F(CAR_PTS(*PARK, 0) + truck_pts(-5.0, PARK[1]) + truck_pts(TSTOP - 0.5, PARK[1]) + body(DW[0], DW[1], y0=WALK_Y), 12, 10, SIT)
CAM_S1 = F(CAR_PTS(*PARK) + body(DW[0], DW[1], y0=WALK_Y), 10, 14, SIT)
CAM_S2 = F([[DW[0] - 0.4, 2.3, DW[1]], [DW[0] + 0.4, 2.3, DW[1]], [DW[0], 0.9, DW[1]], [PARK[0] + 0.5, 0.1, PARK[1] + 0.6]], 22, 8, SIT)
shots['situation'] = {
    'camera': shot(0, cE, CAM_S0, 0.94) + shot(cE, cW, CAM_S1, 0.93) + shot(cW, 1.003, CAM_S2, 0.93),
    'actors': a,
    'sfx': [{'t': 0.0, 'id': 'monstertruck-motor', 'volume': 0.6}, {'t': r3(t_flat), 'id': 'blech-knautschen', 'volume': 0.9}],
}

# =========================================================================================================
# Antwort-Abschnitte: Länge = Karte (option<n>) + Szene (explain<n>) + EXTRA
# =========================================================================================================
def answer_len(n): return round((seclen(f'option{n}') + seclen(f'explain{n}') + EXTRA[n]) * 30) / 30
def ac(n, phrase, card=False):
    tot = answer_len(n)
    if card: return r3(start_in(f'option{n}', phrase) / tot)
    return r3((seclen(f'option{n}') + start_in(f'explain{n}', phrase)) / tot)
def scene0(n): return r3(seclen(f'option{n}') / answer_len(n))

# ---------- A: noch größerer Monstertruck → hochklettern → Reifen/Motor → rollt langsam über den ersten Monstertruck ----------
n = 1; sa = lambda s: s / answer_len(1)
s0 = scene0(1)
tSt = ac(1, 'Du steigst'); tNo = ac(1, 'Noch größere'); tUn = ac(1, 'Und dann'); tGa = ac(1, 'ganz langsam')
B0 = (-4.0, 0.0)                              # großer Truck auf der Fahrbahn (face 90)
X1 = 8.0                                      # erster Monstertruck steht weiter vorn auf der Fahrbahn
a = {}
a['car'] = flatcar()
a['monstertruck'] = [K(0, X1, 0.0, 'park', 90, squish=0, smoke=0)]
DRV = (X1 + 1.6, 3.95)                        # Fahrer auf dem vorderen Gehweg neben seinem Truck
a['truckfahrer'] = [K(0, *DRV, 'stand', face_to(DRV, (X1, 0.0)))]
# Karte: Dummy steht neben dem großen Truck und schaut hoch
DA = (B0[0] + 0.6, 3.0)
CLIMB = (B0[0] + 0.1, 2.15)                   # an der Seite zwischen den Reifen (Fahrerhaus-Tür), Blick zum Truck = face 0
a['dummy'] = [K(0, *DA, 'stand', 0, brow=1), K(s0 - 0.002, *DA, 'stand', 0)]
climb_end = tNo - 0.002
a['dummy'] += [K(tSt, *CLIMB, 'truckclimb', 0, y=0.0, cut=True), K(climb_end, CLIMB[0], CLIMB[1] - 0.1, 'truckclimb', 0, y=1.55)]
a['dummy'] += [seat(tNo, 'monstertruck2', 'seattriumph', BIG, cut=True), seat(tUn - 0.002, 'monstertruck2', 'seattriumph', BIG),
               seat(tUn, 'monstertruck2', 'seatdrive', BIG), seat(1, 'monstertruck2', 'seatdrive', BIG)]
# großer Truck: steht → Motor (Rauch, Rütteln) → rollt langsam auf den ersten Truck und bleibt oben stehen
R2 = 0.86 * BIG
x_contact = X1 - 2.3 - 2.25 - R2 * 0.55        # Vorderräder berühren das Heck des ersten Trucks
def big_x(t):
    if t < tUn: return B0[0]
    u = (t - tUn) / (1 - tUn)
    return B0[0] + (X1 - 0.3 - B0[0]) * (0.5 - 0.5 * math.cos(math.pi * min(1, u * 1.08)))
def big_y_tilt(x):
    if x < x_contact: return 0.0, 0.0
    v = min(1.0, (x - x_contact) / (X1 - 0.3 - x_contact))
    return 1.75 * math.sin(min(1, v * 1.6) * math.pi / 2), -16.0 * math.sin(min(1.0, v * 1.25) * math.pi)
big = [K(0, *B0, 'park', 90, y=0, tilt=0, smoke=0.3, rumble=0.2), K(tNo, *B0, 'park', 90, smoke=0.3, rumble=0.2), K(tNo + sa(0.3), *B0, 'park', 90, smoke=1, rumble=1)]
sq = []
for i in range(15):
    t = tUn + (1 - tUn) * i / 14
    x = big_x(t); y, tl = big_y_tilt(x)
    big.append(K(t, x, 0.0, 'drive' if i < 14 else 'park', 90, y=y, tilt=tl, smoke=1, rumble=1))
    v = 0 if x < x_contact else min(1.0, (x - x_contact) / (X1 - 0.3 - x_contact))
    sq.append(K(t, X1, 0.0, 'park', 90, squish=0.62 * v))
a['monstertruck2'] = big
a['monstertruck'] += sq
t_react = tGa + sa(1.2)
a['truckfahrer'] += [K(tUn + sa(0.6), *DRV, 'stand', face_to(DRV, (X1, 0.0))), K(t_react, *DRV, 'carshock', face_to(DRV, (X1, 0.0)))]
# Kameras
CAM_AC = F(truck_pts(B0[0], B0[1], BIG) + body(*DA), 25, 6)
CAM_A1 = F([[CLIMB[0] - 1.0, 4.0, CLIMB[1] - 0.2], [CLIMB[0] + 1.0, 4.0, CLIMB[1]], [CLIMB[0], 0.0, CLIMB[1] + 0.3], [CLIMB[0] + 1.2, 0.0, CLIMB[1] - 0.6]], 12, 4)
cab_w = (B0[0] + MT_SEAT[2] * BIG, MT_SEAT[1] * BIG, 0.0)
CAM_A2 = F([[cab_w[0] - 0.4, cab_w[1] + 2.0, 0.0], [cab_w[0] + 0.6, cab_w[1] + 0.3, 0.3], [B0[0] + 2.25, 0.0, 1.8], [B0[0] + 2.25, 2.5, 1.8], [B0[0] - 0.6, 0.0, 1.8]], 55, -4)
CAM_A3 = F(truck_pts(B0[0] + 1.5, 0.0, BIG) + truck_pts(X1, 0.0) + body(*DRV, y0=WALK_Y), 62, 8)
CAM_A4 = F(truck_pts(X1 - 0.3, 0.0, BIG) + [[X1 - 0.3, 6.6, 0.0]] + body(*DRV, y0=WALK_Y), 40, 6)
CAM_A5 = F(body(*DRV, y0=WALK_Y) + [[X1 - 1.0, 5.6, 0.0], [X1 + 1.0, 3.5, 0.0]], 60, 4)
shots['option1'] = {
    'camera': shot(0, tSt, CAM_AC, 0.95) + shot(tSt, tNo, CAM_A1, 0.93) + shot(tNo, tUn, CAM_A2, 0.92) + shot(tUn, tGa + sa(0.8), CAM_A3, 0.95) +
              shot(tGa + sa(0.8), t_react, CAM_A4, 0.95) + shot(t_react, 1.003, CAM_A5, 0.93),
    'actors': a,
    'stage': 'wohnstrasse',
    'sfx': [{'t': r3(tNo + sa(0.2)), 'id': 'monstertruck-motor', 'volume': 0.9}, {'t': r3(tUn + sa(0.2)), 'id': 'monstertruck-motor', 'volume': 0.7},
            {'t': r3(tGa + sa(0.8)), 'id': 'blech-knautschen', 'volume': 0.7}],
}

# ---------- B: Museum: plattes Auto im Bilderrahmen an die Wand → Besucher staunen → Preisschild + VERKAUFT → stolz, Hände schütteln ----------
n = 2; sb = lambda s: s / answer_len(2)
s0 = scene0(2)
tRa = ac(2, 'Du rahmst'); tBe = ac(2, 'Die Besucher'); tMu = ac(2, 'Ein Museum'); tZw = ac(2, 'zwei Millionen'); tMo = ac(2, 'Moderne')
FR = (0.0, 2.75, -4.98)
DH = (0.0, -4.5)                              # Dummy beim Aufhängen (Blick zur Wand)
DP = (2.9, -3.9)                              # Dummy stolz neben dem Kunstwerk
DIR = (2.05, -3.1)                            # Museumsdirektor (besucher1)
V2 = (-1.3, -2.55); V3 = (0.6, -2.45); V1v = (-2.4, -2.9)
a = {}
a['bilderrahmen'] = [K(0, FR[0], FR[2], 'park', 180, y=HIDE), K(tRa - 0.002, FR[0], FR[2], 'park', 180, y=HIDE),
                     K(tRa, FR[0], FR[2], 'park', 180, y=FR[1] - 0.2), K(tRa + sb(0.35), FR[0], FR[2], 'park', 180, y=FR[1] - 0.2), K(tRa + sb(0.75), FR[0], FR[2], 'park', 180, y=FR[1])]
a['dummy'] = [K(0, 0.0, 1.2, 'stand', 0, brow=1), K(s0 - 0.002, 0.0, 1.2, 'stand', 0)]
a['dummy'] += [K(tRa, *DH, 'hangframe', 0, brow=0, cut=True), K(tRa + sb(1.7), *DH, 'hangframe', 0), K(tRa + sb(2.0), *DH, 'stand', 0),
               K(tRa + sb(2.4), DH[0] + 0.3, DH[1] + 1.2, 'walk', 160), K(tBe - 0.002, DH[0] + 0.6, DH[1] + 1.6, 'walk', 160)]
a['dummy'] += [K(tBe, *DP, 'proud', 200, cut=True), K(tMu - 0.002, *DP, 'proud', 200),
               K(tMu, DP[0] - 0.15, DP[1] + 0.25, 'handshake', face_to((DP[0] - 0.15, DP[1] + 0.25), DIR)), K(tMo - 0.002, DP[0] - 0.15, DP[1] + 0.25, 'handshake'),
               K(tMo, *DP, 'proud', 195), K(1, *DP, 'proud', 195)]
look_fr = lambda P: face_to(P, (FR[0], FR[2]))
a['besucher1'] = [K(0, *V1v, 'stand', look_fr(V1v), y=HIDE), K(tBe - 0.002, *V1v, 'stand', y=HIDE), K(tBe, *V1v, 'winegasp', look_fr(V1v), y=0),
                  K(tMu - 0.002, *V1v, 'winegasp'), K(tMu, *DIR, 'handshake', face_to(DIR, (DP[0] - 0.15, DP[1] + 0.25))), K(tMo - 0.002, *DIR, 'handshake'),
                  K(tMo, *DIR, 'winetoast', face_to(DIR, (0.0, 4.0))), K(1, *DIR, 'winetoast')]
a['besucher2'] = [K(0, *V2, 'stand', look_fr(V2), y=HIDE), K(tBe - 0.002, *V2, 'stand', y=HIDE), K(tBe, *V2, 'winegasp', look_fr(V2), y=0),
                  K(tMu, *V2, 'wineadmire', look_fr(V2)), K(tMo, *V2, 'winetoast', look_fr(V2) + 10), K(1, *V2, 'winetoast')]
a['besucher3'] = [K(0, *V3, 'stand', look_fr(V3), y=HIDE), K(tBe - 0.002, *V3, 'stand', y=HIDE), K(tBe + sb(0.3), *V3, 'winegasp', look_fr(V3), y=0),
                  K(tMu, *V3, 'wineadmire', look_fr(V3)), K(tMo + sb(0.2), *V3, 'winetoast', look_fr(V3) - 10), K(1, *V3, 'winetoast')]
TAG = (3.25, 3.9, -4.95)
a['preisschild'] = [K(0, TAG[0], TAG[2], 'park', 180, y=TAG[1]), K(tZw - 0.002, TAG[0], TAG[2], 'park', 180), K(tZw, TAG[0], TAG[2], 'show', 180, text='2.000.000 €')]
SOLD = (-3.4, -3.75)
t_sold = tZw + sb(1.1)
a['verkauft'] = [K(0, *SOLD, 'park', 20, y=HIDE, size=0.5), K(t_sold - 0.002, *SOLD, 'park', 20, y=HIDE), K(t_sold, *SOLD, 'show', 20, y=0)]
FRAME_PTS = [[FR[0] - 2.4, FR[1] + 1.4, FR[2]], [FR[0] + 2.4, FR[1] + 1.4, FR[2]], [FR[0] - 2.4, FR[1] - 1.4, FR[2]], [FR[0] + 2.4, FR[1] - 1.4, FR[2]]]
CAM_BC = F(body(0.0, 1.2) + FRAME_PTS[:2] + [[0.0, 0.0, -4.9]], 0, 8)
CAM_B1 = F(FRAME_PTS + body(*DH), 28, 4)
CAM_B2 = F(body(*V2) + body(*V3) + body(*V1v) + FRAME_PTS[:2], 38, 8)
CAM_B3 = F(FRAME_PTS + [[TAG[0] + 0.8, TAG[1] + 0.1, TAG[2]], [TAG[0] + 0.8, TAG[1] - 1.2, TAG[2]]] + body(*DP) + body(*DIR) + [[SOLD[0] - 0.6, 2.7, SOLD[1]], [SOLD[0], 0.0, SOLD[1]]], 8, 6)
CAM_B4 = F(body(*DP) + FRAME_PTS[1:2] + FRAME_PTS[3:4] + [[FR[0] - 0.5, FR[1] + 1.4, FR[2]], [FR[0] - 0.5, FR[1] - 1.4, FR[2]]] + body(*DIR) + body(*V3), -18, 8)
shots['option2'] = {
    'camera': shot(0, tRa, CAM_BC, 0.95) + shot(tRa, tBe, CAM_B1, 0.93) + shot(tBe, tMu, CAM_B2, 0.93) + shot(tMu, tMo, CAM_B3, 0.95) + shot(tMo, 1.003, CAM_B4, 0.93),
    'actors': a,
    'stage': 'museum',
    'sfx': [{'t': r3(tRa + sb(0.75)), 'id': 'bild-aufhaengen', 'volume': 0.7}, {'t': r3(tBe + sb(0.1)), 'id': 'staunen', 'volume': 0.7},
            {'t': r3(tZw + sb(0.05)), 'id': 'plopp', 'volume': 0.7}, {'t': r3(t_sold), 'id': 'plopp', 'volume': 0.7},
            {'t': r3(tMo + sb(0.6)), 'id': 'glaeser-klirren', 'volume': 0.6}],
}

# ---------- C: telefonieren → Polizei-Unimogs mit Blaulicht → Verfolgungsjagd → quer über den Acker, Matsch, Hügel ----------
n = 3; sc = lambda s: s / answer_len(3)
s0 = scene0(3)
tRu = ac(3, 'Du rufst'); tKu = ac(3, 'Kurz darauf'); tUm = ac(3, 'Unimogs'); tSch = ac(3, 'Polizei-Schriftzug'); tVe = ac(3, 'Die Verfolgungsjagd')
tQu = ac(3, 'Quer über'); tMa = ac(3, 'durch den Matsch'); tHu = ac(3, 'über jeden')
a = {}
a['car'] = [K(0, *PARK, 'park', 90, squish=1), K(tQu - 0.002, *PARK, 'park', 90), K(tQu, *PARK, 'park', 90, y=HIDE)]
MT_C = (9.0, PARK[1])                         # Monstertruck steht noch hinter dem Auto am Straßenrand
DC = (2.2, -6.75)
a['dummy'] = [K(0, *DC, 'carshock', 165), K(s0 - 0.002, *DC, 'carshock', 165), K(tRu, *DC, 'callpoint', 120, cut=True), K(tVe - 0.002, *DC, 'callpoint', 120),
              K(tVe, *DC, 'callpoint', 105), K(tQu - 0.002, *DC, 'callpoint', 105), K(tQu, *DC, 'stand', 105, y=HIDE)]
a['truckfahrer'] = [seat(0, 'monstertruck', 'seatdrive')]
# Unimogs: rollen auf der Fahrbahn heran (−x → +x) und halten neben dem Truck; dann Verfolgung auf der Straße; dann Acker
U_STOP = [(5.5, 1.4), (-1.0, 1.4), (-7.5, 1.4)]
U_START = [(-30.0, 1.4), (-37.0, 1.4), (-44.0, 1.4)]
arrive = tKu + sc(0.2)
stop_t = tSch + sc(0.3)
def ease(u): return 0.5 - 0.5 * math.cos(math.pi * max(0, min(1, u)))
# Acker-Jagd: Truck vorn, Unimogs dahinter (gleiche Geschwindigkeit, versetzt)
CH_X0 = -30.0; CH_X1 = 58.0
def chase_x(t, lag):
    u = (t - tQu) / (1 - tQu)
    return CH_X0 + (CH_X1 - CH_X0) * u - lag
CH_Z = {'monstertruck': 0.0, 'unimog1': -1.6, 'unimog2': 1.7, 'unimog3': -0.4}
CH_LAG = {'monstertruck': 0.0, 'unimog1': 7.5, 'unimog2': 13.0, 'unimog3': 18.5}
def field_keys(name, s=1.0, extra=None):
    out = []
    N = 26
    for i in range(N + 1):
        t = tQu + (1 - tQu) * i / N
        x = chase_x(t, CH_LAG[name]); z = CH_Z[name] + 0.6 * math.sin(x * 0.12 + len(name))
        kw = dict(y=0, tilt=acker_tilt(x, z, 1.5 * s), spray=1, splat=min(1.0, 0.2 + i / N), rumble=1)
        if extra: kw.update(extra)
        out.append(K(t, x, z, 'drive', 90, **kw))
    return out
# Monstertruck: steht → fährt los (Verfolgung) → Acker
mt = [K(0, *MT_C, 'park', 90, y=0, tilt=0, smoke=0.4, rumble=0.3, spray=0, splat=0), K(tVe, *MT_C, 'park', 90, smoke=0.4)]
for i in range(1, 9):
    t = tVe + (tQu - 0.002 - tVe) * i / 8
    u = i / 8
    mt.append(K(t, MT_C[0] + 26 * u * u, MT_C[1] + 3.0 * ease(u * 1.6), 'drive', 90 - 12 * math.sin(math.pi * min(1, u * 1.6)), smoke=1, rumble=1))
mt += field_keys('monstertruck', 1.0, {'smoke': 1})
a['monstertruck'] = mt
for j, nm in enumerate(['unimog1', 'unimog2', 'unimog3']):
    st, sp = U_START[j], U_STOP[j]
    k = [K(0, *st, 'park', 90, y=HIDE, blue=1, tilt=0, spray=0, splat=0, rumble=0.6), K(arrive - 0.002, *st, 'park', 90, y=HIDE)]
    for i in range(9):
        t = arrive + (stop_t - arrive) * i / 8
        u = ease(i / 8)
        k.append(K(t, st[0] + (sp[0] - st[0]) * u, st[1], 'drive' if i < 8 else 'park', 90, y=0, blue=1))
    for i in range(1, 7):
        t = tVe + sc(0.5) + (tQu - 0.002 - tVe - sc(0.5)) * i / 6
        u = i / 6
        k.append(K(t, sp[0] + 22 * u * u, sp[1], 'drive', 90, blue=1))
    k += field_keys(nm, 1.0, {'blue': 1})
    a[nm] = k
    cop = ['polizist', 'polizistin', 'bundespolizist'][j]
    a[cop] = [seat(0, nm, 'seatdrive', 1.0, UM_SEAT)]
# Kameras
CAM_CC = F(CAR_PTS(*PARK) + body(*DC, y0=WALK_Y) + truck_pts(*MT_C), 22, 8)
CAM_C1 = F(body(*DC, y0=WALK_Y) + [[PARK[0] + 1.2, 0.2, PARK[1]]], -20, 6)
CAM_C2 = F(unimog_pts(-12.0, 1.4) + unimog_pts(-20.0, 1.4) + [[-6.0, 0.0, 3.0]], 60, 6)
CAM_C3 = F([[U_STOP[0][0] - 1.5, 2.9, 1.4], [U_STOP[0][0] + 2.4, 2.9, 1.4], [U_STOP[0][0] - 0.4, 1.2, 2.45], [U_STOP[0][0] + 1.4, 0.0, 2.45]], 6, 4)
CAM_C4 = F(truck_pts(MT_C[0] + 7, MT_C[1] + 1.5) + unimog_pts(U_STOP[0][0] + 6, 1.4) + unimog_pts(U_STOP[1][0] + 4, 1.4), 35, 9)
def chase_cam(t, az, el, names=('monstertruck', 'unimog1'), extra_pts=()):
    pts = []
    for nm in names:
        x = chase_x(t, CH_LAG[nm]); z = CH_Z[nm]
        y0 = acker_h(x, z)
        pts += [[x - 2.4, y0 + 3.2, z], [x + 2.4, y0 + 3.2, z], [x - 2.4, y0, z + 1.6], [x + 2.4, y0, z - 1.6]]
    return F(pts + list(extra_pts), az, el)
def follow_shot(t0, t1, az0, az1, el, names, n=4):
    out = []
    for i in range(n + 1):
        t = t0 + (t1 - 0.003 - t0) * i / n
        out.append(cam(t if i < n else t1 - 0.003, *chase_cam(t, az0 + (az1 - az0) * i / n, el, names)))
    return out
shots['option3'] = {
    'camera': shot(0, tRu, CAM_CC, 0.95) + shot(tRu, tKu, CAM_C1, 0.92) + shot(tKu, tSch, CAM_C2, 0.96) + shot(tSch, tVe, CAM_C3, 0.92) +
              shot(tVe, tQu, CAM_C4, 0.95) +
              follow_shot(tQu, tMa, 28, 18, 9, ('monstertruck', 'unimog1', 'unimog2')) +
              follow_shot(tMa, tHu, 60, 50, 4, ('monstertruck', 'unimog1')) +
              follow_shot(tHu, 1.003, -62, -48, 10, ('monstertruck', 'unimog1', 'unimog2', 'unimog3')),
    'actors': a,
    'stage': [{'t': 0, 'stage': 'wohnstrasse'}, {'t': r3(tQu), 'stage': 'acker'}],
    'sfx': [{'t': r3(tRu + sc(0.1)), 'id': 'handy-waehlen', 'volume': 0.6}, {'t': r3(arrive), 'id': 'sirene', 'volume': 0.55},
            {'t': r3(tVe), 'id': 'monstertruck-motor', 'volume': 0.8}, {'t': r3(tQu), 'id': 'matsch-spritzen', 'volume': 0.7},
            {'t': r3(tMa), 'id': 'matsch-spritzen', 'volume': 0.7}, {'t': r3(tHu), 'id': 'monstertruck-motor', 'volume': 0.7}, {'t': r3(tHu + sc(0.6)), 'id': 'sirene', 'volume': 0.4}],
}

# =========================================================================================================
# Abstimmung: alle Figuren stehen am Straßenrand vor dem platten Auto, Kamera tief und ruhig, Karten darüber
# =========================================================================================================
a = {}
a['car'] = flatcar()
VD = (0.2, -6.4); VT = (-1.25, -6.7); VP = (1.55, -6.65)
a['dummy'] = [K(0, *VD, 'carshock', 180)]
a['truckfahrer'] = [K(0, *VT, 'sheepish', 165)]
a['polizist'] = [K(0, *VP, 'stand', 200, brow=1)]
a['monstertruck'] = [K(0, 7.5, PARK[1], 'park', 90)]
CAM_V = ([0.2, 1.2, 0.0], [0.2, 2.05, -6.6])
shots['countdown'] = {'camera': [cam(0, *CAM_V), cam(1, *dolly(CAM_V, 0.95))], 'actors': a}

# =========================================================================================================
# Outro: Dummy neben seinem platten Auto am Straßenrand
# =========================================================================================================
a = {}
a['car'] = flatcar()
OD = (1.2, -6.5)
a['dummy'] = [K(0, *OD, 'carshock', 200)]
CAM_O = F(CAR_PTS(*PARK) + body(*OD, y0=WALK_Y), 12, 10, (50, 1030, 760, 1250))
shots['outro'] = {'camera': [cam(0, *CAM_O), cam(1, *dolly(CAM_O, 0.95))], 'actors': a}

for sh in shots.values():
    sh['sharpCuts'] = True
    for keys in sh['actors'].values():   # fehlendes y vom vorigen Zeitpunkt übernehmen (sonst fällt der Gegenstand auf y 0)
        y = None
        for k in keys:
            if 'y' in k: y = k['y']
            elif y is not None: k['y'] = y
    for keys in sh['actors'].values():   # Schlüssel zeitlich sortiert halten
        keys.sort(key=lambda k: k['t'])

DESC = ("Dein Auto wurde mal wieder von einem Monstertruck überfahren – was machst du? 🚙💥 Schreib A, B oder C in die Kommentare!\n\n"
        "Diesmal ohne richtige Antwort, nur zum Spaß. Bitte nichts davon nachmachen. 😄\n\n"
        "#waswürdestdutun #monstertruck #auto #unimog #polizei #spezial #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
    'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'wohnstrasse',
    'situation': {'speech': S['situation']},
    'options': [
        {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy klettert in einen noch größeren Monstertruck (noch größere Reifen, Rauch, Motor), sitzt triumphierend am Steuer und rollt ganz langsam über den ersten Monstertruck, der sich zusammendrückt. Der Monstertruck-Fahrer steht daneben auf dem Gehweg und schaut fassungslos. Niemand sitzt im überfahrenen Truck.',
         'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': shots['option1']},
        {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Museumshalle mit weißen Wänden: Dummy hängt das platte Auto im goldenen Bilderrahmen an die Wand, Scheinwerfer darauf, Besucher-Dummys mit Weingläsern staunen. Preisschild "2.000.000 €" ploppt auf, dazu ein großes VERKAUFT-Schild; der Dummy schüttelt dem Museumsdirektor die Hand und steht stolz neben dem Kunstwerk.',
         'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': shots['option2']},
        {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy telefoniert und zeigt zur Straße. Drei stilisierte Polizei-Unimogs (silber/blau, Blaulicht, Schriftzug POLIZEI, kein Stern/Logo) rollen heran, der Monstertruck fährt los, die Verfolgungsjagd geht quer über den Acker am Stadtrand, durch den Matsch und über Hügel, Schlamm spritzt. Keine Unfälle, keine Menschen in Gefahr.',
         'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': shots['option3']},
    ],
    'countdown': {'speech': S['countdown'], 'screen': 'Stimm ab!'},
    'outro': {'speech': S['outro'], 'screen': 'Schreib A, B oder C in die Kommentare!'},
    'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team ___. Und du? 👇 Markier jemanden, dem genau das passieren würde!'},
    'shots': {'situation': shots['situation'], 'countdown': shots['countdown'], 'outro': shots['outro']},
}
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
tot = seclen('situation') + sum(answer_len(i) for i in (1, 2, 3)) + max(seclen('countdown'), 5.6) + max(seclen('outro'), 4)
print('Länge ca.', round(tot, 1), 's', '(mit Stimme)' if dur else '(geschätzt)')
for k, v in [('A', answer_len(1)), ('B', answer_len(2)), ('C', answer_len(3))]: print(' Antwort', k, round(v, 1), 's')
