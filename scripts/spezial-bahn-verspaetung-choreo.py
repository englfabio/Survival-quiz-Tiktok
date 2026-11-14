# Hilfsskript: erzeugt scenarios/spezial-bahn-verspaetung.json (Texte wortgenau vom Inhaber) und richtet Bewegungen + Kameras
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-bahn-verspaetung-choreo.py
#
# Format: Spezial, aufgebaut nach dem Schema des Joghurt-Videos (scripts/mitbewohner-joghurt-choreo.py): Situation mit 3–4 harten
# Schnitten, jede Antwort = Karte (eine Einstellung) + Szene mit einem harten Schnitt pro Satz/Pointe und langsamem Heranfahren,
# Abstimmung (alle Figuren stehen, Kamera tief), Outro (Dummy wieder am Bahnsteig).
# Darstellung (vom Inhaber): alles comichaft und harmlos – NIEMAND betritt zu Fuß die Gleise; keine echten Logos/Designs
# (kein Bahn-Logo, kein ICE-Design, keine Baumaschinen-Marken). Der Dummy ist im Gleis nur IN der Lok (angehängt).
import json, os, math, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-bahn-verspaetung'
S = dict(
situation="Die Bahn hat mal wieder 90 Minuten Verspätung. Du stehst seit sechs Uhr am Bahnsteig und musst eigentlich zur Arbeit. Was machst du?",
o1c="Eigene Lok kaufen", o1s="A: Du kaufst dir eine eigene Lok und fährst ab jetzt selbst zur Arbeit.",
o2c="Mit dem Bagger zur Arbeit", o2s="B: Du fährst ab jetzt mit einem riesigen Bagger zur Arbeit.",
o3c="Nach Hause, Homeoffice", o3s="C: Du gehst wieder nach Hause und machst Homeoffice.",
e1="Du kaufst dir eine Lok. Mit Hupe, mit Mütze, mit allem. Am nächsten Morgen fährst du los. Nach drei Minuten: rotes Signal. Vor dir steht der Zug, auf den du gestern gewartet hast.",
e2="Kein Gleis, kein Signal, keine Verspätung. Nur du und dein Bagger. Höchstgeschwindigkeit: 25 Kilometer pro Stunde. Du kommst an. Nächsten Dienstag.",
e3="Du drehst einfach um und gehst nach Hause. Jogginghose an, Kaffee in der Hand, Laptop auf. Kein Bahnsteig, keine Durchsage. Und um acht Uhr eins sitzt du pünktlich im ersten Meeting.",
countdown="Also, was machst du? Schreib A, B oder C in die Kommentare.",
outro="Eine richtige Antwort gibt es diesmal nicht. Aber jeder kennt jemanden, der jeden Tag auf die Bahn wartet. Schreib A, B oder C in die Kommentare und markier ihn.",
)
# visuelle Verlängerung der Szenen (Sekunden, ohne Text) – nur so viel, dass jede Pointe zu Ende gespielt ist
EXTRA = {1: 0.6, 2: 0.5, 3: 0.5}
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

# ---- feste Plätze ----
# Bahnsteig (src/stage/Station.tsx, Variante "bahnsteig-verspaetung"): Kante z 0, weiße Linie z 0.8, Bahnsteig bis z 9.
BOARD = (-1.2, 3.1); BOARD_Y = 3.15          # Anzeigetafel (Objekt), Unterkante y 3.15, Tafel 3,1 × 0,96, beidseitig (face 0)
SPEAKER = (-2.45, 3.55, 2.42)
D0 = (0.9, 4.4)                               # Dummy am Bahnsteig
FACE_B = face_to(D0, BOARD)
P1 = (2.25, 3.5); P2 = (-2.6, 5.0); P3 = (3.3, 5.9)
def platform_people(t_hide=None, p_motion=('armscross', 'watchlook', 'stand'), q=0):
    a = {}
    faces = [face_to(P1, BOARD), face_to(P2, (0.5, 2.0)), face_to(P3, BOARD)]
    for name, P, m, f in zip(['fahrgast1', 'fahrgast2', 'fahrgast3'], [P1, P2, P3], p_motion, faces):
        a[name] = [K(0, *P, m, f, question=q)]
    return a
def board(text='+90 Min', y=BOARD_Y, x=BOARD[0], z=BOARD[1], blink=0.0):
    return [K(0, x, z, 'park', 0, y=y, text=text, blink=blink)]

# Bahnstrecke (src/stage/Railway.tsx): Gleis entlang x bei z 0, Schienenoberkante y 0.3, Signal bei (30, 2.6)
RAIL_Y = 0.3
SIGNAL = (30.0, 2.6)
LOCO_STOP = 23.4                              # Lok-Mitte beim Halt (Front bei 26.6, 3,4 m vor dem Signal)
TRAIN_REAR = 41.0                             # Ende des wartenden Zugs (Zug steht vor dem Signal-Abschnitt)
TRAIN_LEN = 5 * 17.5 + 4 * 0.55
SEAT = (0.0, 1.25, -2.05)                     # Dummy-Sitz in der Lok (Lok-System)
def lok_seat_world(lx):
    """Lok fährt nach +x (face 90): Lok-z → Welt-x"""
    return (lx + SEAT[2], 0.0)                 # (x, z) der Hüfte in der Welt
# Landstraße: Straße entlang x bei z 0, Bürogebäude bei x 74 (Eingang z −11.5)
EXC_SEAT = (-0.85, 2.6, 0.55)

shots = {}
# =========================================================================================================
# Situation: Anzeigetafel "+90 Min" + Durchsage → Dummy wartet genervt, tippt auf die Uhr → "Was machst du?"
# =========================================================================================================
c = 'situation'; L = seclen(c)
sec = lambda s, c=c: s / seclen(c)
cD = cue(c, 'Du stehst'); cA = cue(c, 'und musst'); cW = cue(c, 'Was machst')
a = platform_people()
a['anzeigetafel'] = board()
a['durchsage'] = [K(0, SPEAKER[0] + 0.25, SPEAKER[2] + 0.2, 'show', 0, y=SPEAKER[1] + 0.15, size=0.6, side=1), K(cD - 0.002, SPEAKER[0] + 0.25, SPEAKER[2] + 0.2, 'show'),
                  K(cD, SPEAKER[0] + 0.25, SPEAKER[2] + 0.2, 'park', y=HIDE)]
a['dummy'] = [K(0, *D0, 'watchtap', FACE_B), K(cW - 0.002, *D0, 'watchtap', FACE_B), K(cW, *D0, 'armscross', 175, brow=1)]
BOARD_PTS = [[BOARD[0] - 1.55, BOARD_Y + 0.96, BOARD[1]], [BOARD[0] + 1.55, BOARD_Y + 0.96, BOARD[1]], [BOARD[0] - 1.55, BOARD_Y, BOARD[1]], [BOARD[0] + 1.55, BOARD_Y, BOARD[1]]]
CAM_S0 = F(BOARD_PTS + [[SPEAKER[0], SPEAKER[1] - 0.4, SPEAKER[2]]], 8, -10, SIT)
CAM_S1 = F(body(*D0) + body(*P1) + BOARD_PTS[:2] + [[P2[0], 1.9, P2[1]]], -38, 6, SIT)
WRIST = (D0[0] - 0.2, D0[1] - 0.1)
CAM_S2 = F([[D0[0], 2.0, D0[1]], [WRIST[0], 1.15, WRIST[1]], [D0[0] + 0.25, 1.4, D0[1]], [D0[0] - 0.3, 1.9, D0[1]]], -60, 8, SIT)
CAM_S3 = F(body(*D0) + [[BOARD[0] + 1.55, BOARD_Y + 0.96, BOARD[1]], [BOARD[0], BOARD_Y + 0.96, BOARD[1]]], 10, 6, SIT)
shots['situation'] = {
    'camera': shot(0, cD, CAM_S0, 0.9) + shot(cD, cA, CAM_S1) + shot(cA, cW, CAM_S2, 0.93) + shot(cW, 1.003, CAM_S3, 0.93),
    'actors': a,
    'sfx': [{'t': 0.0, 'id': 'durchsage-gong', 'volume': 0.6}],
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

# ---------- A: Lok kaufen (VERKAUFT) → Hupe → Mütze → am Morgen losfahren → rotes Signal → vor ihm der Zug mit "+90 Min" ----------
n = 1; sa = lambda s: s / answer_len(1)
s0 = scene0(1)
tK = ac(1, 'Du kaufst'); tH = ac(1, 'Mit Hupe'); tM = ac(1, 'mit Mütze'); tA = ac(1, 'mit allem'); tN = ac(1, 'Am nächsten')
tR = ac(1, 'Nach drei'); tSig = ac(1, 'rotes Signal'); tV = ac(1, 'Vor dir'); tG = ac(1, 'auf den du')
LOK0 = 0.0                                    # Lok steht beim Kauf bei x 0
STARTX = -14.0                                # am Morgen: Start weiter hinten
a = {}
# Lok: steht → (Schnitt "Am nächsten Morgen") fährt los → bremst vor dem Signal
drive_end = tR + sa(1.6)
def lokx(t):
    if t < tN: return LOK0
    u = min(1.0, (t - tN) / (drive_end - tN))
    # anfahren + abbremsen
    e = 0.5 - 0.5 * math.cos(math.pi * u)
    return STARTX + (LOCO_STOP - STARTX) * e
lok_keys = [K(0, LOK0, 0, 'park', 90, y=RAIL_Y, ring=0, blink=0)]
lok_keys += [K(tH, LOK0, 0, 'park', 90, ring=0), K(tH + sa(0.25), LOK0, 0, 'park', 90, ring=1), K(tH + sa(1.0), LOK0, 0, 'park', 90, ring=1), K(tH + sa(1.3), LOK0, 0, 'park', 90, ring=0)]
lok_keys += [K(tA, LOK0, 0, 'park', 90, blink=0), K(tA + sa(0.3), LOK0, 0, 'park', 90, blink=1), K(tN - 0.002, LOK0, 0, 'park', 90, blink=1)]
for i in range(13):
    tt = tN + (drive_end - tN) * i / 12
    lok_keys.append(K(tt, lokx(tt), 0, 'drive' if i < 12 else 'park', 90, blink=1, ring=1 if (tN + sa(0.3) < tt < tN + sa(1.5)) else 0))
lok_keys.append(K(1, LOCO_STOP, 0, 'park', 90, blink=1, ring=0))
a['lok'] = lok_keys
a['verkauft'] = [K(0, 2.2, 3.4, 'park', 200, y=HIDE), K(tK + sa(0.2) - 0.002, 2.2, 3.4, 'park', 200, y=HIDE), K(tK + sa(0.2), 2.2, 3.4, 'show', 200, y=0),
                 K(tN - 0.002, 2.2, 3.4, 'show'), K(tN, 2.2, 3.4, 'park', y=HIDE)]
a['signal'] = [K(0, *SIGNAL, 'park', 270, good=0)]
a['zug'] = [K(0, TRAIN_REAR + TRAIN_LEN, 0, 'park', 90, y=0.15, text='+90 Min', side=1)]
# Dummy: steht staunend vor der Lok → jubelt (VERKAUFT) → (Schnitt "Mit Hupe") sitzt in der Lok und hupt → setzt die Mütze auf → stolz
# → fährt (hupt) → tippt am roten Signal aufs Lenkrad
DOUT = (-1.2, 3.2)
lx = lambda t: lokx(t)
def seat_key(t, motion, **kw):
    return K(t, SEAT[0], SEAT[2], motion, 0, y=SEAT[1], attach='lok', **kw)
a['dummy'] = [K(0, *DOUT, 'stand', face_to(DOUT, (0.0, 0.0)), lokcap=0), K(tK - 0.002, *DOUT, 'stand'), K(tK, *DOUT, 'cheer', 175),
              K(tH - 0.002, *DOUT, 'cheer', 175)]
a['dummy'] += [seat_key(tH, 'lokhorn', lokcap=0, cut=True), seat_key(tM - 0.002, 'lokhorn', lokcap=0), seat_key(tM, 'seatcapon', lokcap=0),
               seat_key(tM + sa(0.45), 'seatcapon', lokcap=0.6), seat_key(tM + sa(0.85), 'seatcapon', lokcap=1),
               seat_key(tA, 'seatwave', lokcap=1), seat_key(tN - 0.002, 'seatwave'), seat_key(tN, 'lokhorn', cut=True),
               seat_key(tR - 0.002, 'lokhorn'), seat_key(tR, 'wheeltap', brow=0), seat_key(tV + sa(0.4), 'wheeltap', brow=1)]
# Kameras
LOK_PTS = lambda x: [[x - 3.3, 3.6, -1.3], [x + 3.3, 3.6, 1.3], [x - 3.3, 0.3, 1.3], [x + 3.3, 0.3, -1.3]]
CAM_A0 = F(LOK_PTS(LOK0) + body(*DOUT), 30, 8)
CAM_AK = F(LOK_PTS(LOK0) + body(*DOUT) + [[2.2, 2.3, 3.4], [2.2, 0, 3.4]], 15, 6)
cabx = LOK0 + SEAT[2]
CAM_AH = F([[cabx - 0.4, 3.9, 0.0], [cabx + 0.5, 1.4 + 0.3, 0.0], [cabx, 3.15 + 0.3, 0.3], [cabx + 0.6, 4.0, 0.0]], 40, 10)
CAM_AM = F([[cabx, 3.45, 0.0], [cabx, 2.4, 0.0], [cabx + 0.35, 3.0, 0.3], [cabx - 0.35, 3.0, -0.3]], 25, 6)
CAM_AA = F(LOK_PTS(LOK0), -25, 10)
# fahrend: Kamera begleitet die Lok seitlich (gleiche Bewegung → Lok bleibt im Bild)
def follow(t, az=20, el=6):
    x = lokx(t)
    return F(LOK_PTS(x), az, el)
tF0 = tN; tF1 = tR
CAM_SG = F([[SIGNAL[0] - 0.5, 4.95, SIGNAL[1]], [SIGNAL[0] + 0.5, 4.95, SIGNAL[1]], [SIGNAL[0], 3.4, SIGNAL[1]], [LOCO_STOP + 3.2, 0.3, 0], [LOCO_STOP + 1, 3.0, 0]], -40, 2)
CAM_WT = F([[LOCO_STOP + SEAT[2], 3.2 + 0.3, 0.0], [LOCO_STOP + SEAT[2] + 0.6, 1.25 + 0.3 + 0.5, 0.3], [LOCO_STOP + SEAT[2] - 0.4, 2.0, -0.3]], 60, 6)
# Kamerafahrt nach vorne: hinter dem Führerhaus über die Motorhaube zum Zugende mit "+90 Min"
CAMV0 = ([LOCO_STOP - 5.5, 4.1, 1.2], [LOCO_STOP + 6, 2.9, 0.0])
CAMV1 = ([TRAIN_REAR - 9.0, 3.6, 1.6], [TRAIN_REAR, 3.4, 0.0])
CAM_G = F([[TRAIN_REAR, 4.4, -1.4], [TRAIN_REAR, 4.4, 1.4], [TRAIN_REAR, 1.0, 0], [LOCO_STOP, 3.5, 0], [LOCO_STOP + 3.2, 0.3, 1.2]], 40, 8)
shots['option1'] = {
    'camera': shot(0, tK, CAM_A0, 0.94) + shot(tK, tH, CAM_AK, 0.95) + shot(tH, tM, CAM_AH, 0.93) + shot(tM, tA, CAM_AM, 0.92) + shot(tA, tN, CAM_AA, 0.94) +
              [cam(tN, *follow(tN, 25, 7))] + [cam(tN + (tF1 - tN) * i / 4, *follow(tN + (tF1 - tN) * i / 4, 25 - 4 * i, 7)) for i in range(1, 4)] +
              [cam(tF1 - 0.003, *follow(tF1, 9, 7))] + shot(tR, tV, CAM_SG, 0.93) + [cam(tV, *CAMV0), cam(tG - 0.003, *CAMV1)] + shot(tG, 1.003, CAM_G, 0.95),
    'actors': a,
    'stage': 'bahnstrecke',
    'sfx': [{'t': r3(tK + sa(0.2)), 'id': 'plopp', 'volume': 0.7}, {'t': r3(tH + sa(0.25)), 'id': 'lok-hupe', 'volume': 0.8},
            {'t': r3(tN + sa(0.3)), 'id': 'lok-hupe', 'volume': 0.6}, {'t': r3(tN + sa(0.2)), 'id': 'lok-fahrt', 'volume': 0.6},
            {'t': r3(tR + sa(0.6)), 'id': 'bremse', 'volume': 0.6}, {'t': r3(tG + sa(0.3)), 'id': 'herzschlag', 'volume': 0.0}],
}
shots['option1']['sfx'] = [x for x in shots['option1']['sfx'] if x['volume'] > 0]

# ---------- B: riesiger Bagger auf der Landstraße, Autoschlange, Tacho 25 km/h, Kalender blättert → Büro → Chef schaut auf die Uhr ----------
n = 2; sb = lambda s: s / answer_len(2)
s0 = scene0(2)
tKe = ac(2, 'Kein Gleis'); tNu = ac(2, 'Nur du'); tHo = ac(2, 'Höchst'); tKm = ac(2, '25'); tAn = ac(2, 'Du kommst'); tDi = ac(2, 'Nächsten')
a = {}
BX0 = 0.0
SPEED = 2.2                                   # sichtbare Fahrgeschwindigkeit (m/s), comichaft langsam
def bx(t):
    if t < tKe: return BX0
    return BX0 + (t - tKe) * answer_len(2) * SPEED
ARRIVE_X = 66.0                               # vor dem Bürogebäude (Schnitt "Du kommst an")
bag = [K(0, BX0, 0.6, 'park', 90, smoke=1, tilt=0)]
for i in range(9):
    tt = tKe + (tAn - tKe) * i / 8
    bag.append(K(tt - (0.002 if i == 8 else 0), bx(tt) if i < 8 else bx(tAn - 0.002), 0.6, 'drive' if i < 8 else 'park', 90, smoke=1))
bag += [K(tAn, ARRIVE_X - 6, 0.6, 'drive', 90, smoke=1), K(tAn + sb(1.4), ARRIVE_X, 0.6, 'park', 90, smoke=0.6, tilt=-10), K(1, ARRIVE_X, 0.6, 'park', 90, tilt=-10)]
a['bagger'] = bag
# Dummy thront in der Kabine und winkt
def bseat(t, motion, **kw): return K(t, EXC_SEAT[0], EXC_SEAT[2], motion, 0, y=EXC_SEAT[1], attach='bagger', **kw)
a['dummy'] = [bseat(0, 'seatwave'), bseat(tDi - 0.002, 'seatwave'), bseat(tDi, 'seatwave')]
# Autoschlange hinter dem Bagger (fährt mit, hupt)
QGAP = 7.5
a['autoschlange'] = [K(0, BX0 - QGAP, 0.0, 'park', 90, y=HIDE, fill=1), K(tKe - 0.002, BX0 - QGAP, 0.0, 'park', 90, y=HIDE)]
for i in range(9):
    tt = tKe + (tAn - tKe) * i / 8
    a['autoschlange'].append(K(tt - (0.002 if i == 8 else 0), (bx(tt) if i < 8 else bx(tAn - 0.002)) - QGAP, 0.0, 'drive', 90, y=0, rumble=1))
a['autoschlange'].append(K(tAn, -50, 0, 'park', 90, y=HIDE))
# Tacho "25 km/h" neben der Kabine (ploppt bei "Höchstgeschwindigkeit" auf)
def tacho_pos(t):
    return (bx(t) + 1.2, 2.9)
a['tacho'] = [K(0, *tacho_pos(0), 'park', 0, y=HIDE, size=1.6)]
for i in range(6):
    tt = tHo + (tAn - tHo) * i / 5
    a['tacho'].append(K(tt - (0.002 if i == 5 else 0), *tacho_pos(tt if i < 5 else tAn - 0.002), 'show' if i < 5 else 'show', 0, y=3.5 if i < 5 else 3.5))
a['tacho'].append(K(tAn, -50, 0, 'park', y=HIDE))
# Kalender blättert Tag für Tag (Mittwoch → Dienstag) – schwebt oben im Bild neben dem Bagger, dann im Büro an der Wand
DAYS = 'Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Montag|Dienstag'
NDAYS = 7
def cal_pos(t):
    return (bx(t) - 1.0, 2.9)
a['tageskalender'] = [K(0, *cal_pos(0), 'park', 180, y=HIDE, fill=1, text=DAYS)]
flips = [tHo + sb(0.3) + (tAn - tHo - sb(0.6)) * j / (NDAYS - 1) for j in range(NDAYS)]
for j, tt in enumerate(flips):
    if j == 0:
        a['tageskalender'] += [K(tt - 0.002, *cal_pos(tt), 'park', 0, y=HIDE, fill=1), K(tt, *cal_pos(tt), 'park', 180, y=5.1, fill=1)]
    else:
        a['tageskalender'] += [K(tt - sb(0.35), *cal_pos(tt - sb(0.35)), 'park', 0, fill=j), K(tt, *cal_pos(tt), 'park', 0, fill=j + 1)]
a['tageskalender'] += [K(tAn - 0.002, *cal_pos(tAn - 0.002), 'park', 0, fill=NDAYS), K(tAn, ARRIVE_X - 3.2, 1.2, 'park', 0, y=4.4, fill=NDAYS)]
a['tageskalender'] += [K(tDi - 0.002, ARRIVE_X - 3.2, 1.2, 'park', 0), K(tDi, 1.15, -2.19, 'park', 0, y=1.45, fill=NDAYS)]
# Büro: Chef schaut auf die Uhr
a['chef'] = [K(0, 1.05, -1.0, 'stand', 180, y=HIDE), K(tDi - 0.002, 1.05, -1.0, 'stand', 180, y=HIDE), K(tDi, 0.55, -1.1, 'watchlook', 160, y=0, brow=1)]
BAG_PTS = lambda x: [[x - 3.3, 7.2, -1.2], [x + 5.6, 4.0, 1.0], [x - 3.0, 0.0, 2.2], [x + 3.0, 0.0, -1.6]]
CAB = lambda x: [x + EXC_SEAT[2], EXC_SEAT[1], 0.6 - EXC_SEAT[0]]
CAM_B0 = F(BAG_PTS(BX0), 35, -6)
def bfollow(t, az, el, pts):
    return F(pts(bx(t)), az, el)
CAB_PTS = lambda x: [[CAB(x)[0] - 0.5, CAB(x)[1] + 2.05, CAB(x)[2]], [CAB(x)[0] + 0.7, CAB(x)[1] + 0.3, CAB(x)[2] + 0.5], [CAB(x)[0], CAB(x)[1] + 0.8, CAB(x)[2] - 0.6]]
TAIL_PTS = lambda x: [[x + 3.5, 6.5, 0.6], [x - QGAP - 3 * 5.4, 1.5, 0], [x - QGAP, 0, 1.5], [x + 2.6, 5.4, 1.0], [x + 1.2, 4.2, 2.9]]
CAM_BO = F([[0.0, 2.6, -0.8], [1.5, 2.6, -0.8], [0.55, 0.0, -1.1], [1.15, 1.7, -2.19], [1.15, 1.2, -2.19]], 0, 6)
CAM_BA = F(BAG_PTS(ARRIVE_X) + [[ARRIVE_X + 8, 11.5, -16.0], [ARRIVE_X - 4, 11.5, -16.0], [ARRIVE_X - 3.2, 4.8, 1.2]], 35, 8)
tmid = (tHo + tKm) / 2
shots['option2'] = {
    'camera': shot(0, tKe, CAM_B0, 0.95) +
              [cam(tKe, *bfollow(tKe, 30, 4, BAG_PTS)), cam(tNu - 0.003, *bfollow(tNu - 0.003, 18, 4, BAG_PTS))] +
              [cam(tNu, *bfollow(tNu, 35, 4, CAB_PTS)), cam(tHo - 0.003, *bfollow(tHo - 0.003, 30, 4, CAB_PTS))] +
              [cam(tHo, *bfollow(tHo, -62, 14, TAIL_PTS)), cam(tAn - 0.003, *bfollow(tAn - 0.003, -55, 14, TAIL_PTS))] +
              shot(tAn, tDi, CAM_BA, 0.95) + shot(tDi, 1.003, CAM_BO, 0.93),
    'actors': a,
    'stage': [{'t': 0, 'stage': 'landstrasse'}, {'t': r3(tDi), 'stage': 'buero'}],
    'sfx': [{'t': 0.02, 'id': 'bagger-motor', 'volume': 0.6}, {'t': r3(tKe), 'id': 'bagger-motor', 'volume': 0.6}, {'t': r3(tHo + sb(0.1)), 'id': 'plopp', 'volume': 0.6},
            {'t': r3(tKm), 'id': 'auto-hupen', 'volume': 0.7}] +
           [{'t': r3(tt), 'id': 'kalender-blaettern', 'volume': 0.45} for tt in flips[1:]],
}

# ---------- C: am Bahnsteig umdrehen → Jogginghose → Kaffee → Laptop auf → gemütlich → Uhr 8:01 → winkt in die Videokonferenz ----------
n = 3; sc = lambda s: s / answer_len(3)
s0 = scene0(3)
tDr = ac(3, 'Du drehst'); tJ = ac(3, 'Jogginghose'); tKa = ac(3, 'Kaffee'); tLa = ac(3, 'Laptop'); tKB = ac(3, 'Kein Bahnsteig'); tU8 = ac(3, 'Und um'); tSi = ac(3, 'sitzt du')
a = platform_people()
a['anzeigetafel'] = board() + [K(tJ - 0.002, BOARD[0], BOARD[1], 'park', 0), K(tJ, BOARD[0], BOARD[1], 'park', 0, y=HIDE)]
for nm in ['fahrgast1', 'fahrgast2', 'fahrgast3']:
    k0 = a[nm][0]
    a[nm] += [K(tDr + sc(0.6), k0['x'], k0['z'], k0['motion'], k0['face'], question=0), K(tDr + sc(1.2), k0['x'], k0['z'], 'stand', face_to((k0['x'], k0['z']), (D0[0], 8.5)), question=1),
              K(tJ - 0.002, k0['x'], k0['z'], 'stand'), K(tJ, k0['x'], k0['z'], 'stand', y=HIDE)]
HOME = (0.6, 8.6)
walk_t = sc(math.hypot(HOME[0] - D0[0], HOME[1] - D0[1]) / 1.3)
CH = (-1.5, -0.4)                             # Stuhl am Schreibtisch (HOMEOFFICE.chair), Blick zum Fenster = face 270
STAND_H = (-0.6, -0.2)
a['dummy'] = [K(0, *D0, 'watchtap', FACE_B), K(tDr - 0.002, *D0, 'watchtap', FACE_B), K(tDr, *D0, 'stand', 160), K(tDr + sc(0.4), *D0, 'walk', 175),
              K(tDr + sc(0.4) + walk_t, *HOME, 'walk', 175), K(tJ - 0.002, *HOME, 'walk', 175)]
a['dummy'] += [K(tJ, *STAND_H, 'pullpants', 160, jogger=0, cut=True), K(tJ + sc(0.75), *STAND_H, 'pullpants', 160, jogger=0), K(tJ + sc(0.8), *STAND_H, 'pullpants', 160, jogger=1),
               K(tKa - 0.002, *STAND_H, 'pullpants', 160, jogger=1), K(tKa, *CH, 'drinkcoffee', 270, jogger=1, cut=True), K(tLa - 0.002, *CH, 'drinkcoffee', 270),
               K(tLa, *CH, 'laptopopen', 270), K(tKB - 0.002, *CH, 'laptopopen', 270), K(tKB, *CH, 'drinkcoffee', 270), K(tSi - 0.002, *CH, 'drinkcoffee', 270),
               K(tSi, *CH, 'deskwave', 270)]
LAP = (-2.12, -0.4, 0.74); CLK = (-2.32, -0.88, 0.74); MUG = (-2.08, 0.02, 0.74)
a['laptop'] = [K(0, LAP[0], LAP[1], 'park', 90, y=HIDE, lid=0, mark=1, glow=0), K(tJ - 0.002, LAP[0], LAP[1], 'park', 90, y=HIDE), K(tJ, LAP[0], LAP[1], 'park', 90, y=LAP[2], lid=0),
               K(tLa + sc(0.35), LAP[0], LAP[1], 'park', 90, lid=0), K(tLa + sc(1.05), LAP[0], LAP[1], 'park', 90, lid=1), K(tSi, LAP[0], LAP[1], 'park', 90, glow=0),
               K(tSi + sc(0.02), LAP[0], LAP[1], 'park', 90, glow=1)]
a['digitaluhr'] = [K(0, CLK[0], CLK[1], 'park', 90, y=HIDE, text='8:01'), K(tJ - 0.002, CLK[0], CLK[1], 'park', 90, y=HIDE), K(tJ, CLK[0], CLK[1], 'park', 70, y=CLK[2])]
a['kaffeetasse'] = [K(0, MUG[0], MUG[1], 'park', 90, y=HIDE, smoke=1), K(tKa - 0.002, MUG[0], MUG[1], 'park', 90, y=HIDE), K(tKa, MUG[0], MUG[1], 'park', 90, y=HIDE)]
CAM_C0 = F(body(*D0) + body(*P1) + BOARD_PTS[:2], -30, 6)
CAM_CW = F(body(*D0) + body(*HOME) + body(*P1) + body(*P3), 5, 6)
CAM_CJ = F(body(*STAND_H) + [[STAND_H[0], 0.0, STAND_H[1] + 0.4]], 30, 4)
SITPTS = [[CH[0], 1.45, CH[1]], [CH[0] - 0.65, 0.95, CH[1]], [CH[0] + 0.25, 0.0, CH[1]], [CH[0], 1.0, CH[1] + 0.35]]
CAM_CK = F(SITPTS, 45, 6)
CAM_CL = F([[LAP[0], 0.98, LAP[1] + 0.2], [LAP[0], 0.74, LAP[1] - 0.2], [CH[0], 1.45, CH[1]], [CH[0] - 0.3, 0.9, CH[1] + 0.3]], 140, 18)
CAM_CB = F([[-2.5, 2.2, -1.1], [-2.5, 0.0, 0.6], [CH[0] + 0.4, 1.45, CH[1]], [-0.5, 0.0, 0.4]], 70, 10)
CAM_CU = F([[CLK[0] - 0.08, 0.86, CLK[1]], [CLK[0] + 0.08, 0.74, CLK[1] + 0.08], [CLK[0], 0.74, CLK[1] - 0.12]], 75, 14)
CAM_CM = F([[LAP[0] - 0.05, 0.98, LAP[1] - 0.17], [LAP[0] - 0.05, 0.98, LAP[1] + 0.17], [LAP[0], 0.76, LAP[1]], [CH[0] + 0.1, 1.5, CH[1] - 0.25], [CH[0] - 0.1, 1.85, CH[1] - 0.45]], 115, 12)
shots['option3'] = {
    'camera': shot(0, tDr, CAM_C0, 0.94) + shot(tDr, tJ, CAM_CW, 0.95) + shot(tJ, tKa, CAM_CJ, 0.93) + shot(tKa, tLa, CAM_CK, 0.93) + shot(tLa, tKB, CAM_CL, 0.93) +
              shot(tKB, tU8, CAM_CB, 0.95) + shot(tU8, tSi, CAM_CU, 0.9) + shot(tSi, 1.003, CAM_CM, 0.93),
    'actors': a,
    'stage': [{'t': 0, 'stage': 'bahnsteig-verspaetung'}, {'t': r3(tJ), 'stage': 'wohnzimmer-homeoffice'}],
    'sfx': [{'t': r3(tLa + sc(0.4)), 'id': 'laptop-auf', 'volume': 0.7}, {'t': r3(tSi + sc(0.05)), 'id': 'videocall-ding', 'volume': 0.7},
            {'t': r3(tKa + sc(0.9)), 'id': 'kaffee-schluerfen', 'volume': 0.6}],
}

# =========================================================================================================
# Abstimmung: Dummy + Fahrgäste am Bahnsteig, Tafel "+90 Min" darüber
# =========================================================================================================
a = {}
a['anzeigetafel'] = board(y=3.0, x=-0.2, z=3.4)
a['dummy'] = [K(0, -0.2, 5.0, 'armscross', 180, brow=1)]
a['fahrgast1'] = [K(0, 1.05, 4.6, 'watchlook', 200)]
a['fahrgast2'] = [K(0, -1.45, 4.55, 'armscross', 160)]
a['fahrgast3'] = [K(0, 2.6, 3.6, 'stand', 210)]
shots['countdown'] = {'camera': [cam(0, [-0.2, 1.15, 10.4], [-0.2, 2.15, 4.5]), cam(1, [-0.2, 1.15, 9.9], [-0.2, 2.15, 4.5])], 'actors': a}

# =========================================================================================================
# Outro: Dummy wieder am Bahnsteig, neben ihm die Tafel – springt von "+90 Min" auf "+120 Min"
# =========================================================================================================
c = 'outro'
cSw = cue(c, 'Aber jeder')
a = {}
OB = (-0.9, 3.8); OD = (1.0, 4.4)
a['anzeigetafel'] = [K(0, *OB, 'park', 0, y=1.85, text='+90 Min', blink=0), K(cSw - 0.05, *OB, 'park', 0, blink=0), K(cSw - 0.002, *OB, 'park', 0, text='+90 Min', blink=1),
                     K(cSw, *OB, 'park', 0, text='+120 Min', blink=1), K(cSw + 0.12, *OB, 'park', 0, blink=0)]
a['dummy'] = [K(0, *OD, 'watchtap', 255), K(cSw - 0.002, *OD, 'watchtap', 255), K(cSw, *OD, 'aghast', 200), K(cSw + 0.18, *OD, 'aghast', 200),
              K(cSw + 0.19, *OD, 'armscross', 190, brow=1)]
CAM_O = F([[OB[0] - 1.55, 2.81, OB[1]], [OB[0] - 1.55, 1.85, OB[1]], [OD[0] + 0.3, 1.98, OD[1]], [OD[0], 0.0, OD[1]]], 8, 6, (70, 1000, 900, 1225))
shots['outro'] = {'camera': [cam(0, *CAM_O), cam(1, *dolly(CAM_O, 0.95))], 'actors': a,
                  'sfx': [{'t': r3(cSw - 0.02), 'id': 'durchsage-gong', 'volume': 0.6}]}

for sh in shots.values():
    sh['sharpCuts'] = True
    for keys in sh['actors'].values():   # fehlendes y vom vorigen Zeitpunkt übernehmen (sonst fällt der Gegenstand auf y 0)
        y = None
        for k in keys:
            if 'y' in k: y = k['y']
            elif y is not None: k['y'] = y
    for keys in sh['actors'].values():   # Schlüssel zeitlich sortiert halten
        keys.sort(key=lambda k: k['t'])

DESC = ("Die Bahn hat mal wieder 90 Minuten Verspätung – was machst du? 🚆 Schreib A, B oder C in die Kommentare!\n\n"
        "Diesmal ohne richtige Antwort, nur zum Spaß. Bitte nichts davon nachmachen. 😄\n\n"
        "#waswürdestdutun #bahn #verspätung #pendeln #zugfahren #spezial #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
    'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'bahnsteig-verspaetung',
    'situation': {'speech': S['situation']},
    'options': [
        {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy kauft eine knallbunte Lok (Schild VERKAUFT), hupt, setzt die Lokführermütze auf und fährt am nächsten Morgen stolz los. Nach kurzer Fahrt: rotes Signal, er tippt aufs Lenkrad. Kamerafahrt nach vorne: direkt vor ihm steht der Zug mit der Anzeige "+90 Min". Der Dummy ist nur in der Lok im Gleis, niemand läuft auf den Gleisen.',
         'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': shots['option1']},
        {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy thront in einem riesigen Bagger (ohne Marke) und winkt, fährt über die Landstraße, hinter ihm eine lange Autoschlange, der Tacho zeigt "25 km/h", ein Kalender blättert Tag für Tag bis Dienstag weiter, er kommt am Büro an, der Chef schaut auf die Uhr.',
         'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': shots['option2']},
        {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy dreht am Bahnsteig um und geht nach Hause, zieht die Jogginghose an, setzt sich mit Kaffee an den Schreibtisch am Fenster, klappt den Laptop auf, die Uhr zeigt 8:01, und er winkt entspannt in die Videokonferenz, in der auch der Chef zu sehen ist.',
         'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': shots['option3']},
    ],
    'countdown': {'speech': S['countdown'], 'screen': 'Stimm ab!'},
    'outro': {'speech': S['outro'], 'screen': 'Schreib A, B oder C in die Kommentare!'},
    'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team ___. Und du? 👇 Markier jemanden, der jeden Tag auf die Bahn wartet!'},
    'shots': {'situation': shots['situation'], 'countdown': shots['countdown'], 'outro': shots['outro']},
}
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
tot = seclen('situation') + sum(answer_len(i) for i in (1, 2, 3)) + max(seclen('countdown'), 5.6) + max(seclen('outro'), 4)
print('Länge ca.', round(tot, 1), 's', '(mit Stimme)' if dur else '(geschätzt)')
for k, v in [('A', answer_len(1)), ('B', answer_len(2)), ('C', answer_len(3))]: print(' Antwort', k, round(v, 1), 's')
