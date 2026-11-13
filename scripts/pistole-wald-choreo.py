# Hilfsskript: erzeugt scenarios/pistole-wald.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/pistole-wald-choreo.py
#
# Sicherheitsregel für die Darstellung (vom Inhaber): Die Pistole zeigt NIE auf eine Person oder in die Kamera.
# Liegend zeigt der Lauf nach links vorn in den leeren Wald (face 285), in der Hand nach links unten (face 270, tilt 80)
# bzw. beim Herumfummeln zur Seite in den leeren Wald (face 270, tilt 25). Alle Kameras stehen deshalb rechts (+x) oder
# hinter dem Dummy (+z). Die Prüfung am Ende (check_muzzle) rechnet für jede Kamera den Winkel zum Lauf nach.
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'pistole-wald'
S = dict(
situation="Du hast mal wieder eine Pistole beim Waldspaziergang gefunden. Sie liegt einfach im Laub. Was machst du jetzt?",
o1c="Liegen lassen, Stelle merken, 110", o1s="Eins: Nicht anfassen, die Stelle merken und die 110 anrufen.",
o2c="Einstecken, zur Polizei bringen", o2s="Zwei: Einstecken und selbst zur Polizei bringen.",
o3c="Erst mal entladen", o3s="Drei: Erst mal entladen, damit nichts passieren kann.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer eins.",
e1="Lass die Waffe liegen, wo sie ist, und fass sie nicht an. Merk dir die Stelle genau, am besten mit dem Standort im Handy. Halt andere fern und ruf die 110. Das gilt übrigens auch für Schreckschuss- oder Spielzeugwaffen. Von außen erkennst du den Unterschied nicht.",
e2="Gut gemeint, aber keine gute Idee. Laut Polizei muss eine gefundene Waffe am Fundort bleiben, bis sich die Polizei sie angesehen hat. Wer mit einer Waffe in der Tasche unterwegs ist, kann außerdem schnell in ein gefährliches Missverständnis geraten, zum Beispiel bei einer Polizeikontrolle.",
e3="Auf keinen Fall. Auch alte Waffen können nach Jahrzehnten noch funktionieren und geladen sein. Wer sich mit Waffen nicht auskennt, bringt sich beim Herumhantieren selbst in Gefahr. Und falls die Waffe mit einer Straftat zu tun hat, zerstörst du wichtige Spuren.",
outro="Wusstest du es? Schreib's in die Kommentare.",
)
LEAD = {'situation': 0.3, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'outro': 0.3}
MINLEN = {'situation': 5, 'explain1': 7, 'explain2': 6, 'explain3': 6, 'outro': 3}
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
CAMS = []   # (Abschnitt, Kamera-Position) für die Lauf-Prüfung
def cam(t, pos, look, fov=None, _sec=None):
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
def seglen(a, b): return math.hypot(b[0] - a[0], b[1] - a[1])
def add(p, o): return (p[0] + o[0], p[1] + o[1])

# ---- feste Plätze (Bühne waldherbst, siehe src/stage/AutumnForest.tsx) ----
PS = (0.35, -1.2)                 # Pistole liegt im Laub (PISTOL_SPOT)
PSIZE = 0.35                      # Pistole etwas größer als echt (ca. 35 cm), damit man sie im Hochformat erkennt
PF = 285                          # Lauf zeigt nach links (leicht vorn) in den leeren Wald
DF = 0                            # Dummy schaut den Weg entlang (−z)
D0 = (-0.12, 0.05)                # Dummy bleibt hier stehen (Pistole ca. 1,3 m vor ihm, leicht rechts)
off = rot(DF, -0.08, 0.52)        # PICK_SPOT (Dummy.tsx) in Weltkoordinaten
PU = (PS[0] - off[0], PS[1] - off[1])   # hier steht der Dummy zum Aufheben
HELD = dict(face=270, tilt=80, side=0, leaves=0, size=PSIZE)    # in der Hand: Lauf nach links unten (auf den Boden)
FIDD = dict(face=270, tilt=25, side=0, leaves=0, size=PSIZE)    # beim Herumfummeln: Lauf zur Seite in den leeren Wald
JACKET = dict(jacket=1)
def lying(t=0, **kw):
    return K(t, PS[0], PS[1], 'park', PF, side=1, leaves=1, tilt=0, size=PSIZE, **kw)

# ================= Situation =================
L0 = 'situation'
c_sie = cue(L0, 'Sie liegt')
c_was = cue(L0, 'Was machst')
WALK0 = (-0.12, 3.9)
arrive = r3(sec(L0, 0.2 + seglen(WALK0, D0) / 1.35))
dummy0 = [K(0, WALK0[0], WALK0[1], 'walk', DF, **JACKET), K(arrive, D0[0], D0[1], 'walk', DF), K(r3(arrive + 0.002), D0[0], D0[1], 'spotpoint', DF),
          K(1, D0[0], D0[1], 'spotpoint', DF)]
situation = {
 'camera': [cam(0, [5.6, 2.0, -4.4], [-0.1, 0.85, 1.4]), cam(r3(c_sie - 0.004), [5.2, 1.9, -4.0], [-0.05, 0.8, 0.6]),
            cam(c_sie, [1.3, 0.78, -2.25], [PS[0] - 0.02, 0.05, PS[1]]), cam(r3(c_was - 0.004), [1.2, 0.72, -2.1], [PS[0] - 0.02, 0.05, PS[1]]),
            cam(c_was, [4.6, 2.2, -3.8], [0.05, 0.6, -0.5]), cam(1, [4.3, 2.1, -3.5], [0.05, 0.6, -0.5])],
 'actors': {'dummy': dummy0, 'pistole': [lying()]},
 'sfx': [{'t': 0.0, 'id': 'laub-rascheln', 'volume': 0.45}, {'t': r3(arrive + sec(L0, 0.1)), 'id': 'herzschlag', 'volume': 0.35}],
}

# ================= Optionen / Countdown / Auflösung =================
OL = [0.1, -0.7, -0.5]
def still(p0, p1):
    return {'camera': [cam(0, p0, OL), cam(1, p1, OL)],
            'actors': {'dummy': [K(0, D0[0], D0[1], 'stand', DF, **JACKET)], 'pistole': [lying()]}}
options = still([11.6, 5.0, 3.1], [11.3, 4.95, 2.9])
countdown = still([11.3, 4.95, 2.9], [11.05, 4.9, 2.75])
reveal = still([11.05, 4.9, 2.75], [10.9, 4.88, 2.65])

# ================= Option 1: liegen lassen, Stelle merken, 110 (richtig) =================
L1 = 'explain1'
c_fass = cue(L1, 'fass sie nicht an')
c_merk = cue(L1, 'Merk dir die Stelle')
c_stand = cue(L1, 'Standort im Handy')
c_halt = cue(L1, 'Halt andere fern')
c_ruf = cue(L1, 'ruf die 110')
c_das = cue(L1, 'Das gilt')
c_von = cue(L1, 'Von außen')
D1 = (D0[0], D0[1] + 0.85)                       # einen Schritt zurück (rückwärts, Blick bleibt zur Pistole)
sb0 = sec(L1, 0.35)
sb1 = r3(sb0 + sec(L1, 0.9))
mp0 = r3(max(sb1 + sec(L1, 0.6), c_merk - sec(L1, 0.4)))      # Handy raus
pin0 = r3(max(mp0 + sec(L1, 1.0), c_stand - sec(L1, 0.9)))   # Pin fällt (Hinweis bleibt vor dem Schnitt ca. 1 s sichtbar)
pin1 = r3(pin0 + sec(L1, 0.7))
sh0 = r3(c_halt - sec(L1, 0.25))                              # Stopp-Hand
call0 = r3(max(sh0 + sec(L1, 1.0), c_ruf - sec(L1, 0.2)))     # telefonieren
pol0 = r3(max(call0 + sec(L1, 1.0), c_das - sec(L1, 1.6)))    # Polizei kommt
# Spaziergänger mit Hund kommt von vorn (−z) den Weg entlang, bleibt auf Abstand stehen
WS = (0.6, -4.3)
WK0 = (0.6, -15.0)
wk_arr = r3(sh0 + sec(L1, 0.7))
wk_start = r3(wk_arr - sec(L1, seglen(WK0, WS) / 1.25))
DOG_OFF = rot(180, -0.55, 0.3)    # Hund rechts neben dem Spaziergänger, leicht vorn
dummy1 = [K(0, D0[0], D0[1], 'stand', DF, **JACKET), K(sb0, D0[0], D0[1], 'stepback', DF), K(sb1, D1[0], D1[1], 'stepback', DF),
          K(r3(mp0 - 0.002), D1[0], D1[1], 'stepback', DF), K(mp0, D1[0], D1[1], 'markphone', DF), K(r3(sh0 - 0.002), D1[0], D1[1], 'markphone', DF),
          K(sh0, D1[0], D1[1], 'stophand', DF), K(r3(call0 - 0.002), D1[0], D1[1], 'stophand', DF), K(call0, D1[0], D1[1], 'call', DF)]
# Handy mit Karte in der rechten Hand
PHF = DF - 90 + 360                # Bildschirm zeigt zur linken Seite des Dummys (dort steht die Kamera), 45° nach oben gekippt
phone1 = [K(0, D1[0], D1[1], 'park', PHF, y=HIDE, tilt=45, pin=0, size=0.25, drop=-0.1), K(r3(mp0 + sec(L1, 0.25)), D1[0], D1[1], 'park', PHF, y=HIDE, hand=0),
          K(r3(mp0 + sec(L1, 0.27)), D1[0], D1[1], 'park', PHF, y=0, hand=1), K(pin0, D1[0], D1[1], 'park', PHF, pin=0),
          K(pin1, D1[0], D1[1], 'park', PHF, pin=1), K(r3(sh0 + sec(L1, 0.2)), D1[0], D1[1], 'park', PHF, hand=1),
          K(r3(sh0 + sec(L1, 0.22)), D1[0], D1[1], 'park', PHF, y=HIDE, hand=0)]
walker1 = [K(0, WK0[0], WK0[1], 'stand', 180, y=HIDE), K(r3(wk_start - 0.002), WK0[0], WK0[1], 'stand', 180, y=HIDE),
           K(wk_start, WK0[0], WK0[1], 'walk', 180, y=0), K(wk_arr, WS[0], WS[1], 'walk', 180), K(r3(wk_arr + 0.002), WS[0], WS[1], 'stand', 180),
           K(r3(wk_arr + sec(L1, 0.6)), WS[0], WS[1], 'listen', 180), K(1, WS[0], WS[1], 'listen', 180)]
dog1 = [K(0, *add(WK0, DOG_OFF), 'stand', 180, y=HIDE, leash=1, holder='nachbar'), K(r3(wk_start - 0.002), *add(WK0, DOG_OFF), 'stand', 180, y=HIDE),
        K(wk_start, *add(WK0, DOG_OFF), 'walk', 180, y=0), K(wk_arr, *add(WS, DOG_OFF), 'walk', 180), K(r3(wk_arr + 0.002), *add(WS, DOG_OFF), 'stand', 180),
        K(r3(wk_arr + sec(L1, 0.5)), *add(WS, DOG_OFF), 'sit', 180), K(1, *add(WS, DOG_OFF), 'sit', 180)]
# Polizei (zwei Streifenbeamte) kommt von hinten (+z) den Weg entlang
P1S, P2S = (2.4, 4.2), (3.2, 4.9)
P1E = (1.05, -0.75)                  # neben der Fundstelle (rechts, hinter dem Lauf), schaut auf die Pistole
P2E = (0.78, 0.95)                   # rechts neben dem Dummy, redet mit ihm
P1M = (1.5, 0.9)
p_arr1 = r3(pol0 + sec(L1, (seglen(P1S, P1M) + seglen(P1M, P1E)) / 1.4))
p_arr2 = r3(pol0 + sec(L1, seglen(P2S, P2E) / 1.4))
pol_1 = [K(0, *P1S, 'stand', 180, y=HIDE), K(r3(pol0 - 0.002), *P1S, 'stand', 180, y=HIDE), K(pol0, *P1S, 'walk', face_to(P1S, P1M), y=0),
         K(r3(pol0 + sec(L1, seglen(P1S, P1M) / 1.4)), *P1M, 'walk', face_to(P1M, P1E)), K(p_arr1, *P1E, 'walk', face_to(P1M, P1E)),
         K(r3(p_arr1 + 0.002), *P1E, 'stand', face_to(P1E, PS)), K(1, *P1E, 'stand', face_to(P1E, PS))]
pol_2 = [K(0, *P2S, 'stand', 180, y=HIDE), K(r3(pol0 - 0.002), *P2S, 'stand', 180, y=HIDE),
         K(pol0, *P2S, 'walk', face_to(P2S, P2E), y=0), K(r3(p_arr2), *P2E, 'walk', face_to(P2S, P2E)),
         K(r3(p_arr2 + 0.002), *P2E, 'listen', face_to(P2E, D1)), K(1, *P2E, 'listen', face_to(P2E, D1))]
talk1 = r3(max(p_arr2 + sec(L1, 0.6), call0 + sec(L1, 1.5)))
dummy1 += [K(r3(talk1 - 0.002), D1[0], D1[1], 'call', DF), K(talk1, D1[0], D1[1], 'pointtalk', DF), K(1, D1[0], D1[1], 'pointtalk', DF)]
flash1 = r3(p_arr2 + sec(L1, 0.1))
# Kameras
PH = rot(DF, -0.04, 0.3)
PHONE_W = (D1[0] + PH[0], 1.22, D1[1] + PH[1])
cutB = r3(mp0 + sec(L1, 0.45))
cutC = r3(sh0 - sec(L1, 0.5))
cutD = r3(call0 + sec(L1, 0.05))
cutE = pol0
# Nahaufnahme Handy: Kamera vor dem Bildschirm (zwischen Brust und Handy, von oben), Bildschirm-Normale = zum Dummy + 70° nach oben
def PCAM(d):
    n = (math.sin(math.radians(PHF)) * math.cos(math.radians(45)), math.sin(math.radians(45)), -math.cos(math.radians(PHF)) * math.cos(math.radians(45)))
    return [PHONE_W[0] + n[0] * d, PHONE_W[1] + n[1] * d, PHONE_W[2] + n[2] * d]
exp1 = {
 'camera': [cam(0, [4.6, 1.9, -3.9], [-0.05, 0.8, 0.0]), cam(r3(cutB - 0.004), [4.3, 1.85, -3.5], [-0.05, 0.85, 0.3]),
            cam(cutB, PCAM(0.95), PHONE_W), cam(r3(cutC - 0.004), PCAM(0.85), PHONE_W),
            cam(cutC, [1.1, 2.9, 7.0], [0.1, 0.55, -2.4]), cam(r3(cutD - 0.004), [1.05, 2.85, 6.6], [0.1, 0.55, -2.4]),
            cam(cutD, [3.6, 1.8, 4.6], [-0.1, 0.95, 0.6]), cam(r3(cutE - 0.004), [3.45, 1.8, 4.4], [-0.1, 0.95, 0.6]),
            cam(cutE, [6.2, 3.6, 5.6], [-0.1, 0.45, -0.3]), cam(1, [5.9, 3.45, 5.2], [-0.1, 0.45, -0.3])],
 'actors': {'dummy': dummy1, 'pistole': [lying()], 'kartenhandy': phone1, 'nachbar': walker1, 'hund': dog1, 'polizist': pol_1, 'polizistin': pol_2},
 'flash': flash1,
 'sfx': [{'t': r3(sb0), 'id': 'laub-rascheln', 'volume': 0.35}, {'t': r3(pin0 + sec(L1, 0.45)), 'id': 'zahn-ping', 'volume': 0.45},
         {'t': r3(wk_arr + sec(L1, 0.1)), 'id': 'hund-bellen', 'volume': 0.35}, {'t': r3(call0 + sec(L1, 0.3)), 'id': 'handy-waehlen', 'volume': 0.4},
         {'t': r3(pol0), 'id': 'laub-rascheln', 'volume': 0.4}],
}
steps1 = [{'text': 'Nicht anfassen', 'cue': 'fass sie nicht an'},
          {'text': 'Stelle merken (Standort im Handy)', 'cue': 'Merk dir die Stelle'},
          {'text': 'Andere fernhalten', 'cue': 'Halt andere fern'},
          {'text': '110 anrufen', 'cue': 'ruf die 110'}]

# ================= Option 2: einstecken, zur Polizei bringen (falsch) =================
L2 = 'explain2'
c_wer = cue(L2, 'Wer mit einer Waffe')
c_miss = cue(L2, 'gefährliches Missverständnis')
w0 = sec(L2, 0.25)
w1 = r3(w0 + sec(L2, seglen(D0, PU) / 1.0))
pk0 = r3(w1 + 0.002)               # pickup
grab = r3(pk0 + sec(L2, 0.9))
upd = r3(pk0 + sec(L2, 2.0))
po0 = r3(upd + sec(L2, 0.9))       # pocket
inpk = r3(po0 + sec(L2, 0.7))
po1 = r3(po0 + sec(L2, 1.35))
cutS = r3(max(po1 + sec(L2, 1.3), c_wer - sec(L2, 1.0)))
AWAY = (PU[0] - 0.3, PU[1] - (cutS - po1) * seclen(L2) * 1.3)
POCKET = dict(attach='dummy', x=-0.24, y=0.86, z=0.06, face=180, tilt=72, side=0, leaves=0, size=0.1)
# Straße (Bühne waldstrasse): Dummy kommt aus dem Wald, biegt links ab, Streife steht links am Gehweg
SA = (0.05, 2.9)
SB = (0.05, 6.0)
SC = (-2.25, 6.0)
PC1 = (-3.65, 6.15)                # Polizist (stoppt den Dummy)
PC2 = (-4.35, 5.55)                # Polizistin
CARP = (-6.6, 8.15)                # Streifenwagen am Straßenrand, Front Richtung Dummy (+x)
s1 = r3(cutS + sec(L2, seglen(SA, SB) / 1.3))
s2 = r3(s1 + sec(L2, seglen(SB, SC) / 1.3))
stopP = r3(s2 - sec(L2, 0.9))
q0 = r3(max(s2 + sec(L2, 0.7), c_miss - sec(L2, 0.3)))
fz2 = r3(q0 + sec(L2, 0.75))
dummy2 = [K(0, D0[0], D0[1], 'stand', DF, **JACKET), K(w0, D0[0], D0[1], 'walk', face_to(D0, PU)), K(w1, PU[0], PU[1], 'walk', face_to(D0, PU)),
          K(pk0, PU[0], PU[1], 'pickup', DF), K(r3(po0 - 0.002), PU[0], PU[1], 'pickup', DF), K(po0, PU[0], PU[1], 'pocket', DF),
          K(r3(po1 - 0.002), PU[0], PU[1], 'pocket', DF), K(po1, PU[0], PU[1], 'walk', 355), K(r3(cutS - 0.003), *AWAY, 'walk', 355),
          K(cutS, *SA, 'walk', 0), K(s1, *SB, 'walk', 0), K(r3(s1 + 0.002), *SB, 'walk', 270), K(s2, *SC, 'walk', 270),
          K(r3(s2 + 0.002), *SC, 'stand', 270), K(1, *SC, 'stand', 270)]
pist2 = [lying(0), lying(r3(grab - sec(L2, 0.05))),
         K(r3(grab), PS[0], PS[1], 'park', PF, side=1, leaves=0, tilt=0, hand=1),
         K(r3(upd), PS[0], PS[1], 'park', **HELD, hand=1), K(r3(inpk - 0.002), PS[0], PS[1], 'park', **HELD, hand=1),
         K(inpk, motion='park', hand=1, **POCKET), K(r3(inpk + sec(L2, 0.3)), motion='park', hand=0, **POCKET), K(1, motion='park', hand=0, **POCKET)]
pol2a = [K(0, *PC1, 'stand', 90, y=HIDE), K(r3(cutS - 0.002), *PC1, 'stand', 90, y=HIDE), K(cutS, *PC1, 'listen', 90, y=0),
         K(r3(stopP - 0.002), *PC1, 'listen', 90), K(stopP, *PC1, 'stophand', 90), K(r3(q0 - 0.002), *PC1, 'stophand', 90, question=0),
         K(r3(q0 + sec(L2, 0.45)), *PC1, 'stophand', 90, question=1), K(1, *PC1, 'stophand', 90, question=1)]
pol2b = [K(0, *PC2, 'stand', 75, y=HIDE), K(r3(cutS - 0.002), *PC2, 'stand', 75, y=HIDE), K(cutS, *PC2, 'stand', 75, y=0),
         K(r3(q0 + sec(L2, 0.1) - 0.002), *PC2, 'stand', 75, question=0), K(r3(q0 + sec(L2, 0.55)), *PC2, 'stand', 75, question=1), K(1, *PC2, 'stand', 75, question=1)]
car2 = [K(0, *CARP, 'park', 90, y=HIDE, blue=1), K(r3(cutS - 0.002), *CARP, 'park', 90, y=HIDE), K(cutS, *CARP, 'park', 90, y=0), K(1, *CARP, 'park', 90)]
exp2 = {
 'stage': [{'t': 0, 'stage': 'waldherbst'}, {'t': cutS, 'stage': 'waldstrasse'}],
 'camera': [cam(0, [4.7, 1.85, 2.3], [0.15, 0.7, -0.8]), cam(r3(po1 - 0.004), [4.3, 1.8, 2.0], [0.15, 0.75, -0.8]),
            cam(po1, [4.3, 1.8, 2.0], [0.1, 0.8, -1.4]), cam(r3(cutS - 0.004), [4.0, 1.9, 0.6], [AWAY[0], 0.8, AWAY[1] - 0.5]),
            cam(cutS, [4.0, 2.6, -5.5], [-2.8, 0.45, 6.3]), cam(r3(fz2), [3.6, 2.5, -4.6], [-2.9, 0.55, 6.3]), cam(1, [3.45, 2.47, -4.3], [-2.95, 0.55, 6.3])],
 'actors': {'dummy': dummy2, 'pistole': pist2, 'polizist': pol2a, 'polizistin': pol2b, 'polizeiauto': car2},
 'freeze': fz2,
 'sfx': [{'t': r3(pk0 + sec(L2, 0.4)), 'id': 'laub-rascheln', 'volume': 0.4}, {'t': r3(po1), 'id': 'laub-rascheln', 'volume': 0.35}],
}

# ================= Option 3: erst mal entladen (falsch) =================
L3 = 'explain3'
w30 = sec(L3, 0.2)
w31 = r3(w30 + sec(L3, seglen(D0, PU) / 1.1))
pk3 = r3(w31 + 0.002)
grab3 = r3(pk3 + sec(L3, 0.9))
up3 = r3(pk3 + sec(L3, 2.0))
fd0 = r3(up3 + sec(L3, 0.05))
fz3 = r3(fd0 + sec(L3, 1.1))
dummy3 = [K(0, D0[0], D0[1], 'stand', DF, **JACKET), K(w30, D0[0], D0[1], 'walk', face_to(D0, PU)), K(w31, PU[0], PU[1], 'walk', face_to(D0, PU)),
          K(pk3, PU[0], PU[1], 'pickup', DF), K(r3(fd0 - 0.002), PU[0], PU[1], 'pickup', DF), K(fd0, PU[0], PU[1], 'fiddle', DF), K(1, PU[0], PU[1], 'fiddle', DF)]
pist3 = [lying(0), lying(r3(grab3 - sec(L3, 0.05))),
         K(grab3, PS[0], PS[1], 'park', PF, side=1, leaves=0, tilt=0, hand=1),
         K(up3, PS[0], PS[1], 'park', **HELD, hand=1), K(r3(fd0 + sec(L3, 0.4)), PS[0], PS[1], 'park', **FIDD, hand=1), K(1, PS[0], PS[1], 'park', **FIDD, hand=1)]
exp3 = {
 'camera': [cam(0, [4.3, 1.8, -3.4], [0.05, 0.75, -0.4]), cam(r3(up3 - 0.004), [4.0, 1.75, -3.1], [0.1, 0.75, -0.6]),
            cam(up3, [1.0, 1.45, -4.3], [0.25, 0.95, -0.8]), cam(fz3, [0.96, 1.43, -4.0], [0.25, 0.95, -0.8]), cam(1, [0.94, 1.42, -3.88], [0.25, 0.95, -0.8])],
 'actors': {'dummy': dummy3, 'pistole': pist3},
 'freeze': fz3,
 'sfx': [{'t': r3(pk3 + sec(L3, 0.4)), 'id': 'laub-rascheln', 'volume': 0.4}],
}

# ================= Outro: Polizei an der Fundstelle, Spaziergänger mit Hund, Dummy =================
outro = {
 'camera': [cam(0, [8.6, 4.0, 3.2], [0.1, 0.1, -1.0]), cam(1, [8.2, 3.85, 2.9], [0.1, 0.1, -1.0])],
 'actors': {'dummy': [K(0, D1[0], D1[1], 'listen', 20, **JACKET)], 'pistole': [lying()],
            'polizist': [K(0, *P1E, 'stand', face_to(P1E, PS))], 'polizistin': [K(0, *P2E, 'pointtalk', face_to(P2E, D1))],
            'nachbar': [K(0, *WS, 'listen', 180)], 'hund': [K(0, *add(WS, DOG_OFF), 'sit', 180, leash=1, holder='nachbar')]},
}

# ================= Prüfung: zeigt der Lauf irgendwo in Richtung Kamera oder Person? =================
def muzzle_dir(face, tilt):
    f, tl = math.radians(face), math.radians(tilt)
    return (math.sin(f) * math.cos(tl), -math.sin(tl), -math.cos(f) * math.cos(tl))
def angle_to(src, dirv, pt):
    d = (pt[0] - src[0], pt[1] - src[1], pt[2] - src[2]); n = math.sqrt(sum(v * v for v in d)) or 1
    return math.degrees(math.acos(max(-1, min(1, sum(a * b / n for a, b in zip(dirv, d))))))
def check_muzzle():
    lie = muzzle_dir(PF, 0); src = (PS[0], 0.03, PS[1]); worst = []
    for name, sh in [('situation', situation), ('options', options), ('explain1', exp1), ('explain3', exp3), ('outro', outro)]:
        for c in sh['camera']:
            worst.append((round(angle_to(src, lie, c['pos'])), name, 'Kamera'))
    for p in [P1E, P2E, D1, D0, WS, add(WS, DOG_OFF)]:
        worst.append((round(angle_to(src, lie, (p[0], 1.0, p[1]))), 'explain1', f'Person {p}'))
    held = muzzle_dir(HELD['face'], HELD['tilt']); fid = muzzle_dir(FIDD['face'], FIDD['tilt']); hsrc = (PU[0] - 0.05, 1.0, PU[1] - 0.33)
    for c in exp3['camera']:
        worst.append((round(angle_to(hsrc, fid, c['pos'])), 'explain3 (fummeln)', 'Kamera'))
    for c in exp2['camera'][:4] + exp3['camera']:
        worst.append((round(angle_to(hsrc, held, c['pos'])), 'in der Hand', 'Kamera'))
    worst.sort()
    print('kleinste Winkel Lauf ↔ Kamera/Person (Grad, > 60 = ok):', worst[:6])
    assert worst[0][0] > 60, 'STOPP: Lauf zeigt zu nah Richtung Kamera/Person'
check_muzzle()

DESC = ("Du hast mal wieder eine Pistole beim Waldspaziergang gefunden – was machst du jetzt? 🌲🔫 Schreib 1, 2 oder 3 in die Kommentare!\n\n"
        "Gilt auch für Schreckschuss- und Spielzeugwaffen: Von außen erkennt man den Unterschied nicht.\n\n"
        "Quellen:\n"
        "Polizeipräsidium Reutlingen, Umgang mit Fundwaffen: https://www.kreis-tuebingen.de/site/LRA-Tuebingen-Internet-2022/get/params_E-991504896/20680400/Polizei%20Fundwaffen.pdf\n"
        "Die Rheinpfalz, Waffen und Munition im Wald gefunden: https://www.rheinpfalz.de/lokal/pirmasens_artikel,-granaten-pistolen-munition-im-pf%C3%A4lzerwald-wie-verhalte-ich-mich-beim-fund-richtig-_arid,5899184.html\n\n"
        "Im Notfall: 110.\n\n"
        "#waswürdestdutun #fundstücke #wald #polizei #wusstestdu #survival #notfall #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'category': 'fundstuecke', 'stage': 'waldherbst',
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy tritt einen Schritt zurück, markiert den Standort im Handy (Karten-Pin), hält einen Spaziergänger mit Hund mit erhobener Hand fern, telefoniert; zwei Streifenpolizisten kommen. Grünes Aufleuchten.', 'explanation': S['e1'], 'steps': steps1, 'choreography': exp1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy hebt die Pistole auf (Lauf zeigt nach unten), steckt sie in die Jackentasche und geht los. An der Straße hält ihn eine Polizeistreife an, Fragezeichen über den Polizisten. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e2'], 'choreography': exp2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy hebt die Pistole auf und fummelt daran herum (Lauf zeigt zur Seite in den leeren Wald). Bild friert sofort ein, rotes Aufleuchten.', 'explanation': S['e3'], 'choreography': exp3},
 ],
 'correctOption': 1,
 'countdown': {'speech': S['countdown'], 'screen': 'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal': {'speech': S['reveal'], 'screen': 'Richtig ist Nummer 1'},
 'outro': {'speech': S['outro'], 'screen': S['outro']},
 'sourceLine': 'Quellen: Polizeipräsidium Reutlingen · Die Rheinpfalz',
 'sources': [
  {'name': 'Polizeipräsidium Reutlingen, Umgang mit Fundwaffen', 'url': 'https://www.kreis-tuebingen.de/site/LRA-Tuebingen-Internet-2022/get/params_E-991504896/20680400/Polizei%20Fundwaffen.pdf'},
  {'name': 'Die Rheinpfalz, Waffen und Munition im Wald gefunden', 'url': 'https://www.rheinpfalz.de/lokal/pirmasens_artikel,-granaten-pistolen-munition-im-pf%C3%A4lzerwald-wie-verhalte-ich-mich-beim-fund-richtig-_arid,5899184.html'},
 ],
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ehrlich: Wer hätte sie eingesteckt und zur Polizei gebracht? 👇 Was soll der Dummy als Nächstes finden?",
 },
 'shots': {'situation': situation, 'options': options, 'countdown': countdown, 'reveal': reveal, 'outro': outro},
}
for _sh in [situation, options, countdown, reveal, outro, exp1, exp2, exp3]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
print('cues', dict(sie=c_sie, was=c_was, arrive=arrive, sb1=sb1, mp0=mp0, pin0=pin0, sh0=sh0, call0=call0, pol0=pol0, flash1=flash1,
                   grab=grab, po0=po0, cutS=cutS, s2=s2, q0=q0, fz2=fz2, fz3=fz3), 'audio' if dur else 'geschätzt', {k: seclen(k) for k in TEXT})
