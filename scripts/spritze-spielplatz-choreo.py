# Hilfsskript: erzeugt scenarios/spritze-spielplatz.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spritze-spielplatz-choreo.py
#
# Darstellung (vom Inhaber): kein Drogenkonsum, keine Drogenkonsumenten, kein Blut. Kinder nur als kleine, bunte
# Kinder-Dummys (freundlich, nicht verängstigt). Spritze stilisiert, gut erkennbar, offene Nadel, halb im Sand neben
# etwas Verpackungsmüll. Falsche Optionen frieren ein, BEVOR etwas passiert (Option 2: bevor die Nadel den Finger berührt).
# Bühne: "spielplatz" (src/stage/Playground.tsx).
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spritze-spielplatz'
S = dict(
situation="Du hast mal wieder eine Spritze auf dem Spielplatz gefunden. Sie liegt halb im Sand, die Nadel ist offen. Was machst du jetzt?",
o1c="Aufheben, in den Müll", o1s="Eins: Vorsichtig aufheben und in den Mülleimer werfen.",
o2c="Kappe drauf, mitnehmen", o2s="Zwei: Die Kappe wieder draufstecken und die Spritze mitnehmen.",
o3c="Nicht anfassen, Kinder weg, melden", o3s="Drei: Nicht anfassen, Kinder fernhalten und den Fund melden.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer drei.",
e1="Bloß nicht. Gefährlich ist nicht die Spritze, sondern die Nadel, und ein Stich reicht. Vorsicht auch beim Müll daneben: Darunter kann noch eine weitere Nadel versteckt sein. Also auch das nicht mit bloßen Händen anfassen.",
e2="Klingt vernünftig, ist aber genau der Moment, in dem sich viele stechen. Die Kappe solltest du niemals wieder auf die Nadel stecken, denn dabei besteht Stichgefahr.",
e3="Fass nichts an, halt Kinder fern und merk dir die Stelle. Dann melde den Fund bei deiner Stadt, zum Beispiel beim Ordnungsamt, oder bei der Polizei. Die entsorgen das sicher. Und erklär Kindern: Spritzen sind kein Spielzeug, sofort einen Erwachsenen holen. Hat sich jemand gestochen, ruhig bleiben und zum Arzt. Eine HIV-Infektion durch eine Spritze vom Spielplatz ist übrigens noch nie festgestellt worden.",
outro="Teil das mit allen Eltern, die du kennst. Wusstest du es? Schreib's in die Kommentare.",
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
def K(t, x=None, z=None, motion='park', face=None, **kw):
    d = {'t': r3(t)}
    if x is not None: d['x'] = round(x, 3)
    if z is not None: d['z'] = round(z, 3)
    d['motion'] = motion
    if face is not None: d['face'] = face
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    """Kamera-Zeitachse (sampleCamera glättet die Zeit) → Schnitte exakt treffen"""
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def cam(t, pos, look, fov=None):
    d = {'t': round(te(t), 4), 'pos': [round(v, 3) for v in pos], 'look': [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
def cut(t, a0, a1, b0, b1, fa=None, fb=None, eps=0.004):
    """harter Schnitt bei t: Kamera a endet (a1), Kamera b beginnt (b0); b1 = Ende von b wird separat gesetzt"""
    return [cam(r3(t - eps), *a1, fa), cam(t, *b0, fb)]
def sec(c, s): return s / seclen(c)
HIDE = -30
def rot(face, lx, lz):
    """Figuren-System → Welt (Drehung um y um 180 − face)"""
    th = math.radians(180 - face)
    return (lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th))
def face_to(a, b): return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)
def seglen(a, b): return math.hypot(b[0] - a[0], b[1] - a[1])
def add(p, o): return (p[0] + o[0], p[1] + o[1])
def path_keys(c, t0, pts, speed, motion, extra=None):
    """Weg über mehrere Punkte mit gleichmäßigem Tempo → Liste von Zeitpunkten (Blick in Laufrichtung) + Endzeit"""
    keys = []; t = t0
    for i in range(len(pts) - 1):
        f = face_to(pts[i], pts[i + 1])
        if i == 0: keys.append(K(t, *pts[0], motion, f, **(extra or {})))
        else: keys.append(K(r3(t + 0.001), *pts[i], motion, f))
        t = r3(t + sec(c, seglen(pts[i], pts[i + 1]) / speed))
        keys.append(K(t, *pts[i + 1], motion, f))
    return keys, t

# ---- feste Plätze: Spielplatz (src/stage/Playground.tsx) ----
SP = (0.4, 0.5)          # Spritze (Kolbenmitte), halb im Sand
SY = 0.03                # Sandhöhe
SFACE = 120              # Nadel zeigt nach rechts vorn
STILT = -16              # Nadel schaut schräg aus dem Sand
CAPP = (0.74, 0.43)      # Kappe liegt daneben
LIT1 = (0.02, 0.38)
LIT2 = (1.18, 0.27)
BIN = (2.6, 1.7)
PILE = (2.32, 2.12)      # Müllhaufen neben dem Mülleimer (vorn links davon)
NEEDLE2 = (2.36, 2.16)   # versteckte zweite Nadel im Haufen
DN = (0.34, 1.25)        # Dummy entdeckt die Spritze (Blick nach −z)
DP = (0.34, 1.05)        # zum Aufheben: Spritze 0,55 m vor ihm (PINCH_SPOT)
SWING = (3.95, -3.4)     # stiller Schaukelsitz
SEAT_Y = 0.15            # Kind (Maßstab 0,6) sitzt auf 0,42 m
SIGN = (7.3, 2.6)
PHOTO_P = (6.25, 2.6)    # Dummy fotografiert das Schild (face 90)
BRANCH_LIE = (0.71, 1.77)    # Ast liegt im Gras (Ursprung = dickes Ende, Ast zeigt nach −x)
BRANCH_SET = (0.95, 0.52)    # hier wird er in den Sand gesteckt
DM = (BRANCH_SET[0], BRANCH_SET[1] + 0.44)

def static_props(blink=0.0):
    return {
        'spritze': [K(0, *SP, 'park', SFACE, y=SY, tilt=STILT, blink=blink, size=0.4)],
        'kappe': [K(0, *CAPP, 'park', 40, y=SY)],
        'muell': [K(0, *LIT1, 'park', 10, y=SY, size=-0.2, mark=0)],
        'ast': [K(0, *BRANCH_LIE, 'park', 200, y=0.02, tilt=90)],
    }
def bin_pile(blink=0.0):
    # Müllhaufen neben dem Mülleimer mit versteckter Nadel (Objekt "nadel" bringt den Haufen mit)
    return {'nadel': [K(0, *NEEDLE2, 'park', 200, blink=blink, size=0.4)]}

# Kinder: kind1 (rosa, Zöpfe) schaukelt, kind2 (blau, gelbe Kappe) hüpft an der Rutsche, kind3 (grün, rote Kappe) winkt an der Schaukel
def kids_play():
    return {
        'kind1': [K(0, *SWING, 'swingsit', 180, y=SEAT_Y)],
        'kind2': [K(0, -1.25, -3.05, 'cheer', 150)],
        'kind3': [K(0, 3.15, -2.55, 'wave', 290)],
    }

# ================= Situation =================
L0 = 'situation'
c_sie = cue(L0, 'Sie liegt')
c_was = cue(L0, 'Was machst')
W0 = (3.7, 1.7)
arrive = r3(sec(L0, 0.2 + seglen(W0, DN) / 1.25))
dummy0 = [K(0, *W0, 'walk', face_to(W0, DN)), K(arrive, *DN, 'walk', face_to(W0, DN)), K(r3(arrive + 0.002), *DN, 'notice', 0), K(1, *DN, 'notice', 0)]
cutA = r3(max(arrive + sec(L0, 0.9), c_sie - sec(L0, 0.15)))
cutB = r3(c_was - sec(L0, 0.1))
props0 = static_props()
props0['spritze'] = [K(0, *SP, 'park', SFACE, y=SY, tilt=STILT, blink=0, size=0.4), K(cutA, *SP, 'park', SFACE, blink=0),
                     K(r3(cutA + sec(L0, 0.5)), *SP, 'park', SFACE, blink=0.45), K(r3(cutB - 0.01), *SP, 'park', SFACE, blink=0.45),
                     K(cutB, *SP, 'park', SFACE, blink=0), K(1, *SP, 'park', SFACE, blink=0)]
OPT_CAM = ([-2.91, 5.05, 8.0], [-0.66, -0.45, 1.02])
situation = {
 'camera': [cam(0, [4.4, 6.59, 12.87], [1.5, -0.02, -0.74]), cam(r3(cutA - 0.004), [3.9, 6.0, 11.6], [1.3, 0.05, -0.6]),
            cam(cutA, [-0.3, 1.15, -0.05], [0.45, 0.04, 0.55], 32), cam(r3(cutB - 0.004), [-0.25, 1.1, 0.0], [0.45, 0.04, 0.55], 32),
            cam(cutB, [-2.7, 4.8, 7.6], OPT_CAM[1]), cam(1, *OPT_CAM)],
 'actors': {'dummy': dummy0, **props0, **bin_pile(), **kids_play()},
 'sfx': [{'t': r3(arrive), 'id': 'herzschlag', 'volume': 0.35}],
}

# ================= Optionen / Countdown / Auflösung =================
def still(p0, p1):
    return {'camera': [cam(0, p0, OPT_CAM[1]), cam(1, p1, OPT_CAM[1])],
            'actors': {'dummy': [K(0, *DN, 'notice', 0)], **static_props(), **bin_pile(), **kids_play()}}
def towards(p, k):
    c = OPT_CAM[1]
    return [p[i] + (c[i] - p[i]) * k for i in range(3)]
options = still(OPT_CAM[0], towards(OPT_CAM[0], 0.03))
countdown = still(towards(OPT_CAM[0], 0.03), towards(OPT_CAM[0], 0.055))
reveal = still(towards(OPT_CAM[0], 0.055), towards(OPT_CAM[0], 0.07))

# ================= Option 1: aufheben, in den Müll (falsch) =================
L1 = 'explain1'
c_vor = cue(L1, 'Vorsicht auch')
c_dar = cue(L1, 'Darunter kann')
c_weit = cue(L1, 'weitere Nadel')
st1 = sec(L1, 0.1)
pp0 = r3(st1 + sec(L1, 0.35))
grab1 = r3(pp0 + sec(L1, 0.9))
up1 = r3(pp0 + sec(L1, 2.0))
BINP = (BIN[0] - 0.62, BIN[1] + 0.02)
carry_pts = [DP, (1.25, 1.55), BINP]
carry_len = seglen(DP, carry_pts[1]) + seglen(carry_pts[1], BINP)
# so langsam gehen, dass er beim Mülleimer ankommt, kurz bevor "Darunter kann …" gesagt wird
arr1 = r3(max(up1 + sec(L1, carry_len / 1.1), c_dar - sec(L1, 0.6)))
spd1 = carry_len / ((arr1 - up1) * seclen(L1))
ck, _ = path_keys(L1, r3(up1 + 0.002), carry_pts, spd1, 'pinchcarry')
ck[-1]['t'] = arr1
bl1 = r3(c_weit - sec(L1, 0.2))
fz1 = r3(bl1 + sec(L1, 0.75))
dummy1 = [K(0, *DN, 'notice', 0), K(st1, *DN, 'walk', 0), K(pp0, *DP, 'walk', 0), K(r3(pp0 + 0.002), *DP, 'pinchpick', 0),
          K(up1, *DP, 'pinchpick', 0)] + ck + [K(r3(arr1 + 0.002), *BINP, 'pinchcarry', 90), K(1, *BINP, 'pinchcarry', 90)]
props1 = static_props()
props1['spritze'] = [K(0, *SP, 'park', SFACE, y=SY, tilt=STILT, size=0.4), K(r3(grab1 - 0.002), *SP, 'park', SFACE, y=SY), K(grab1, *SP, 'park', SFACE, y=HIDE),
                     K(1, *SP, 'park', SFACE, y=HIDE)]
nd1 = [K(0, *NEEDLE2, 'park', 200, blink=0, size=0.4), K(bl1, *NEEDLE2, 'park', 200, blink=0), K(r3(bl1 + sec(L1, 0.3)), *NEEDLE2, 'park', 200, blink=1),
       K(1, *NEEDLE2, 'park', 200, blink=1)]
cut1 = r3(up1 - sec(L1, 0.2))
exp1 = {
 'camera': [cam(0, [-3.48, 3.11, 6.19], [0.41, 0.56, 0.62]), cam(r3(cut1 - 0.004), [-3.2, 2.95, 5.8], [0.41, 0.56, 0.62]),
            cam(cut1, [3.9, 2.9, 7.4], [2.2, 0.5, 1.6]), cam(r3(fz1), [3.5, 3.0, 5.9], [2.3, 0.4, 1.85]), cam(1, [3.45, 2.95, 5.7], [2.3, 0.4, 1.85])],
 'actors': {'dummy': dummy1, **props1, 'nadel': nd1, **kids_play()},
 'freeze': fz1,
}

# ================= Option 2: Kappe drauf, mitnehmen (falsch) =================
L2 = 'explain2'
c_stech = cue(L2, 'viele stechen')
st2 = sec(L2, 0.05)
pp2 = r3(st2 + sec(L2, 0.3))
grab2 = r3(pp2 + sec(L2, 0.9))
# Einfrieren genau bei "… viele stechen" (Nadel kurz vor dem Finger)
rc0 = r3(max(pp2 + sec(L2, 1.5), c_stech + sec(L2, 0.25) - sec(L2, 1.66)))
cut2 = r3(rc0 - 0.002)
fz2 = r3(rc0 + sec(L2, 1.66))
dummy2 = [K(0, *DN, 'notice', 0), K(st2, *DN, 'walk', 0), K(pp2, *DP, 'walk', 0), K(r3(pp2 + 0.002), *DP, 'pinchpick', 0),
          K(r3(cut2 - 0.002), *DP, 'pinchpick', 0), K(rc0, *DP, 'recap', 0), K(1, *DP, 'recap', 0)]
props2 = static_props()
props2['spritze'] = [K(0, *SP, 'park', SFACE, y=SY, tilt=STILT, size=0.4), K(r3(grab2 - 0.002), *SP, 'park', SFACE, y=SY), K(grab2, *SP, 'park', SFACE, y=HIDE),
                     K(1, *SP, 'park', SFACE, y=HIDE)]
props2['kappe'] = [K(0, *CAPP, 'park', 40, y=SY), K(r3(cut2 - 0.002), *CAPP, 'park', 40, y=SY), K(cut2, *CAPP, 'park', 40, y=HIDE), K(1, *CAPP, 'park', 40, y=HIDE)]
# Nahaufnahme der Hände: Kamera vor dem Dummy (Dummy-System: x +0.1, z +1.0) leicht von oben
hc = rot(0, 0.25, 1.45)
hl = rot(0, -0.03, 0.37)
exp2 = {
 'camera': [cam(0, [-3.48, 3.11, 6.19], [0.41, 0.56, 0.62]), cam(r3(cut2 - 0.004), [-3.2, 2.95, 5.8], [0.41, 0.56, 0.62]),
            cam(cut2, [DP[0] + hc[0], 1.42, DP[1] + hc[1]], [DP[0] + hl[0], 1.08, DP[1] + hl[1]], 30),
            cam(fz2, [DP[0] + hc[0] * 0.92, 1.4, DP[1] + hc[1] * 0.92], [DP[0] + hl[0], 1.09, DP[1] + hl[1]], 30),
            cam(1, [DP[0] + hc[0] * 0.9, 1.4, DP[1] + hc[1] * 0.9], [DP[0] + hl[0], 1.09, DP[1] + hl[1]], 30)],
 'actors': {'dummy': dummy2, **props2, **bin_pile(), **kids_play()},
 'freeze': fz2,
}

# ================= Option 3: nicht anfassen, Kinder weg, melden (richtig) =================
L3 = 'explain3'
c_halt = cue(L3, 'halt Kinder')
c_merk = cue(L3, 'merk dir')
c_dann = cue(L3, 'Dann melde')
c_zum = cue(L3, 'zum Beispiel')
c_und = cue(L3, 'Und erklär')
c_hat = cue(L3, 'Hat sich')
c_hiv = cue(L3, 'Eine HIV')
KSPD = 2.2
K2A = (-0.45, 2.35)
K3A = (1.15, 2.35)
# Kinder kommen schon angerannt (Schnitt aus der Auflösung), um den Sandkasten herum
K2S = (-2.35, -0.55)
K3S = (2.45, -0.35)
k2run, k2arr = path_keys(L3, 0.0, [K2S, (-1.95, 1.1), K2A], KSPD, 'run')
k3run, k3arr = path_keys(L3, sec(L3, 0.1), [K3S, (2.0, 1.05), K3A], KSPD, 'run')
sh0 = r3(max(c_halt - sec(L3, 0.15), min(k2arr, k3arr) - sec(L3, 0.45)))
back0 = r3(max(k2arr, k3arr, sh0) + sec(L3, 1.0))
K2B = (2.75, -2.55)
K3B = (3.55, -2.4)
k2back, k2end = path_keys(L3, back0, [K2A, (2.3, 2.75), (3.7, 0.2), K2B], KSPD, 'run')
k3back, k3end = path_keys(L3, r3(back0 + sec(L3, 0.15)), [K3A, (2.6, 2.6), (4.0, 0.0), K3B], KSPD, 'run')
kid2 = k2run + [K(r3(k2arr + 0.002), *K2A, 'stand', 0), K(r3(back0 - 0.002), *K2A, 'stand', 0)] + k2back + \
       [K(r3(k2end + 0.002), *K2B, 'cheer', 160), K(1, *K2B, 'cheer', 160)]
kid3 = [K(0, *K3S, 'run', face_to(K3S, (2.0, 1.05)))] + k3run + \
       [K(r3(k3arr + 0.002), *K3A, 'stand', 345), K(r3(back0 + sec(L3, 0.15) - 0.002), *K3A, 'stand', 345)] + k3back + \
       [K(r3(k3end + 0.002), *K3B, 'cheer', 200), K(1, *K3B, 'cheer', 200)]
sh1 = r3(back0 + sec(L3, 0.1))
pk0 = r3(sh1 + sec(L3, 0.05))
pkg = r3(pk0 + sec(L3, 0.9))
pk1 = r3(pk0 + sec(L3, 2.0))
wk1 = r3(pk1 + sec(L3, seglen(DN, DM) / 0.9 + 0.1))
mk0 = r3(wk1 + 0.002)
mk1 = r3(mk0 + sec(L3, 1.6))
cutS = r3(max(mk1 + sec(L3, 0.1), c_dann + sec(L3, 0.3)))
ph0 = r3(cutS + sec(L3, 0.2))
cutK = r3(c_und - sec(L3, 0.15))
ca0 = r3(min(max(ph0 + sec(L3, 2.0), c_zum - sec(L3, 0.2)), cutK - sec(L3, 1.6)))
cutW = r3(c_hat - sec(L3, 0.1))
DK = (3.3, -1.45)
dummy3 = [K(0, *DN, 'notice', 0), K(r3(sh0 - 0.002), *DN, 'notice', 0), K(sh0, *DN, 'shoo', 180), K(sh1, *DN, 'shoo', 180),
          K(r3(sh1 + 0.002), *DN, 'stand', 180), K(pk0, *DN, 'pickup', 180), K(pk1, *DN, 'pickup', 180),
          K(r3(pk1 + 0.002), *DN, 'walk', face_to(DN, DM)), K(wk1, *DM, 'walk', face_to(DN, DM)), K(mk0, *DM, 'mark', 0), K(r3(cutS - 0.002), *DM, 'mark', 0),
          K(cutS, *PHOTO_P, 'photo', 90), K(r3(ca0 - 0.002), *PHOTO_P, 'photo', 90), K(ca0, *PHOTO_P, 'call', 90), K(r3(cutK - 0.002), *PHOTO_P, 'call', 90),
          K(cutK, *DK, 'pointtalk', 0), K(r3(cutW - 0.002), *DK, 'pointtalk', 0), K(cutW, *DK, 'listen', 0), K(1, *DK, 'listen', 0)]
# Ast: liegt im Gras → in der Hand (Mitte gegriffen, wird senkrecht) → wird in den Sand gedrückt
ast3 = [K(0, *BRANCH_LIE, 'park', 200, y=0.02, tilt=90, hand=0, drop=0.45), K(r3(pkg - 0.002), *BRANCH_LIE, 'park', 200, y=0.02, tilt=90, hand=0),
        K(pkg, *BRANCH_LIE, 'park', 200, tilt=90, hand=1), K(pk1, *BRANCH_LIE, 'park', 200, tilt=20, hand=1), K(r3(mk0 - sec(L3, 0.12)), *BRANCH_LIE, 'park', 180, tilt=0, hand=1),
        K(mk0, *BRANCH_SET, 'plant', 180, y=0, tilt=0, hand=0), K(1, *BRANCH_SET, 'plant', 180, y=0, tilt=0, hand=0)]
props3 = static_props()
props3['ast'] = ast3
kid1 = kids_play()['kind1']
kid2[-1:] = [K(r3(cutK - 0.002), *K2B, 'cheer', 160), K(cutK, 2.95, -2.45, 'listen', 170), K(1, 2.95, -2.45, 'listen', 170)]
kid3[-1:] = [K(r3(cutK - 0.002), *K3B, 'cheer', 200), K(cutK, 3.65, -2.35, 'listen', 195), K(1, 3.65, -2.35, 'listen', 195)]
kid2 = sorted(kid2, key=lambda k: k['t'])
kid3 = sorted(kid3, key=lambda k: k['t'])
exp3 = {
 'camera': [cam(0, [2.6, 4.6, 9.4], [0.6, 0.55, 0.4]), cam(r3(mk1 * 0.5), [2.4, 4.3, 8.8], [0.7, 0.5, 0.6]),
            cam(r3(cutS - 0.004), [2.3, 4.0, 8.0], [0.75, 0.5, 0.8]),
            cam(cutS, [0.65, 2.74, 7.89], [6.6, 0.67, 2.35]), cam(r3(cutK - 0.004), [1.2, 2.7, 7.4], [6.6, 0.67, 2.35]),
            cam(cutK, [7.35, 1.96, -0.06], [3.2, 0.85, -1.74]), cam(r3(cutW - 0.004), [7.15, 1.92, -0.15], [3.2, 0.85, -1.74]),
            cam(cutW, [6.19, 9.77, 13.16], [1.78, -0.89, 0.06]), cam(1, [5.9, 9.3, 12.5], [1.78, -0.89, 0.06])],
 'actors': {'dummy': dummy3, **props3, **bin_pile(), 'kind1': kid1, 'kind2': kid2, 'kind3': kid3},
 'flash': ca0,
 'sfx': [{'t': r3(ph0 + sec(L3, 1.0)), 'id': 'sicherung-klick', 'volume': 0.3}, {'t': r3(ca0 + sec(L3, 0.2)), 'id': 'handy-waehlen', 'volume': 0.45}],
}
steps3 = [{'text': 'Nicht anfassen', 'cue': 'Fass nichts an'},
          {'text': 'Kinder fernhalten', 'cue': 'halt Kinder fern'},
          {'text': 'Stelle merken', 'cue': 'merk dir die Stelle'},
          {'text': 'Bei der Stadt oder Polizei melden', 'cue': 'Dann melde den Fund'},
          {'text': 'Gestochen: zum Arzt', 'cue': 'Hat sich jemand gestochen'}]

# ================= Outro: alle winken an der Schaukel =================
outro = {
 'camera': [cam(0, [6.6, 2.4, 4.6], [3.35, 0.7, -2.0]), cam(1, [6.45, 2.35, 4.3], [3.35, 0.7, -2.0])],
 'actors': {'dummy': [K(0, 3.3, -1.3, 'wave', 175)],
            'kind1': [K(0, *SWING, 'swingsit', 180, y=SEAT_Y)],
            'kind2': [K(0, 2.85, -2.2, 'wave', 175)],
            'kind3': [K(0, 3.75, -1.95, 'cheer', 190)],
            **static_props(), **bin_pile(),
            'ast': [K(0, *BRANCH_SET, 'park', 180, y=-0.15, tilt=0)]},
}

DESC = ("Du hast mal wieder eine Spritze auf dem Spielplatz gefunden – was machst du jetzt? 🛝 Schreib 1, 2 oder 3 in die Kommentare!\n\n"
        "Wo du meldest, ist je nach Stadt unterschiedlich: Ordnungsamt, Grünflächenamt oder Gesundheitsamt. Oft steht eine Nummer am Spielplatzschild. Im Zweifel: Polizei.\n\n"
        "Quellen:\n"
        "Stadt Köln, Drogenkonsum im öffentlichen Raum – was tun?: https://www.stadt-koeln.de/leben-in-koeln/gesundheit/suchthilfe/drogenkonsum-im-oeffentlichen-raum-was-tun-fragen-antworten\n"
        "Bezirksamt Friedrichshain-Kreuzberg, Broschüre \"Umsicht – Vorsicht\": https://berlin.de/ba-friedrichshain-kreuzberg/politik-und-verwaltung/service-und-organisationseinheiten/bezirkliche-planung-und-koordinierung/planungs-und-koordinierungsstelle-gesundheit/arbeitsgebiete/umsicht-vorsicht-fixpunkt_ev_-broschuere_2023_09_fuer_website.pdf\n\n"
        "Im Notfall: 112.\n\n"
        "#waswürdestdutun #fundstücke #spielplatz #eltern #kindersicherheit #wusstestdu #quiz #sicherheit\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'category': 'fundstuecke', 'stage': 'spielplatz',
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy greift die Spritze mit bloßen Fingern und geht zum Mülleimer. Im Müllhaufen daneben blinkt eine zweite versteckte Nadel auf. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e1'], 'choreography': exp1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy versucht, die Kappe auf die Nadel zu stecken, die Nadel rutscht Richtung Finger. Bild friert ein, BEVOR die Nadel den Finger berührt, rotes Aufleuchten.', 'explanation': S['e2'], 'choreography': exp2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy bleibt stehen, schickt die Kinder freundlich weg, markiert die Stelle mit einem Ast im Sand, fotografiert das Schild am Eingang und telefoniert. Grünes Aufleuchten.', 'explanation': S['e3'], 'steps': steps3, 'choreography': exp3},
 ],
 'correctOption': 3,
 'countdown': {'speech': S['countdown'], 'screen': 'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal': {'speech': S['reveal'], 'screen': 'Richtig ist Nummer 3'},
 'outro': {'speech': S['outro'], 'screen': S['outro']},
 'sourceLine': 'Quellen: Stadt Köln · Bezirksamt Friedrichshain-Kreuzberg',
 'sources': [
  {'name': 'Stadt Köln, Drogenkonsum im öffentlichen Raum – was tun?', 'url': 'https://www.stadt-koeln.de/leben-in-koeln/gesundheit/suchthilfe/drogenkonsum-im-oeffentlichen-raum-was-tun-fragen-antworten'},
  {'name': 'Bezirksamt Friedrichshain-Kreuzberg, Broschüre "Umsicht – Vorsicht"', 'url': 'https://berlin.de/ba-friedrichshain-kreuzberg/politik-und-verwaltung/service-und-organisationseinheiten/bezirkliche-planung-und-koordinierung/planungs-und-koordinierungsstelle-gesundheit/arbeitsgebiete/umsicht-vorsicht-fixpunkt_ev_-broschuere_2023_09_fuer_website.pdf'},
 ],
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ehrlich: Wer hätte die Kappe wieder draufgesteckt? 👇 Was soll der Dummy als Nächstes finden?",
 },
 'shots': {'situation': situation, 'options': options, 'countdown': countdown, 'reveal': reveal, 'outro': outro},
}
for _sh in [situation, options, countdown, reveal, outro, exp1, exp2, exp3]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
print('cues', dict(arrive=arrive, cutA=cutA, cutB=cutB, up1=up1, arr1=arr1, bl1=bl1, fz1=fz1, cut2=cut2, fz2=fz2, stech=c_stech,
                   sh0=sh0, back0=back0, pk0=pk0, mk0=mk0, cutS=cutS, ca0=ca0, cutK=cutK, cutW=cutW, dann=c_dann),
      'audio' if dur else 'geschätzt', {k: seclen(k) for k in TEXT})
