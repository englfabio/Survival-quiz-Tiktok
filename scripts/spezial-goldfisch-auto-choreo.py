# Hilfsskript: erzeugt scenarios/spezial-goldfisch-auto.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-goldfisch-auto-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-tauben.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos. Dem Goldfisch geht es immer gut: Glas voll Wasser, im Auto angeschnallt (Wert side 1).
# Boxkampf = Show-Kampf: Dummy und Fisch boxen nur in die Luft, beide bleiben in ihrer Ecke, niemand trifft. Keine Marken/Logos.
#  A: Fisch fährt mit dem Auto vorbei, Dummy trägt das Aquarium weg – wohnt dann im riesigen Aquarium (Pflanzen, Taucher, Blasen) – Fisch fährt zufrieden.
#  B: Dummy streut eine Futterspur bis zum Supermarkt-Parkplatz, das Auto hält am Häufchen, Fisch frisst – Boxring auf dem Parkplatz:
#     Dummy zieht Handschuhe an, Fisch im Glas auf dem Podest mit Mini-Handschuhen, Autoschlüssel als Preis in der Mitte, Glocke, Boxhaltung.
#  C: Dummy im Bagger (Vollgas, sehr langsam), Fisch fährt sauber durch die Kurven, blinkt, parkt rückwärts ein, Bagger weit hinten.
# Spezial-Regeln: 61–66 s, keine Dopplungen, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-goldfisch-auto'
S = dict(
situation="Dein Goldfisch hat mal wieder dein Auto geklaut. Er sitzt in seinem Glas auf dem Fahrersitz und fährt einfach los. Was machst du?",
o1c="Sein Aquarium klauen", o1s="A: Du klaust zurück und nimmst sein Aquarium.",
o2c="Anlocken, dann Boxkampf", o2s="B: Du lockst ihn mit Fischfutter an und forderst ihn zum Boxkampf um das Auto heraus.",
o3c="Mit dem Bagger hinterher", o3s="C: Du steigst in deinen Bagger und fährst ihm hinterher.",
e1="Er nimmt dein Auto, du nimmst sein Aquarium. Ab jetzt wohnst du zwischen Plastikpflanzen und einem kleinen Taucher. Und er hat ein Auto. Fairer Tausch.",
e2="Eine Spur aus Fischfutter, direkt bis zum Parkplatz. Er hält an und frisst. Und dann: Handschuhe an. Eins gegen eins. Wer gewinnt, kriegt das Auto. Ring frei.",
e3="Vollgas. Also, Bagger-Vollgas. Er nimmt jede Kurve sauber, setzt den Blinker und parkt rückwärts ein. Du kommst einfach nicht hinterher. Er ist der bessere Fahrer.",
vote="Also, was machst du?",
# Outro des Inhabers Buchstabe für Buchstabe + (Spezial-Regel 5) angehängt: „Neue Video-Ideen? Ab in die Kommentare!“
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr. Neue Video-Ideen? Ab in die Kommentare!",
)
EXTRA = {1: float(os.environ.get('EXA', 0.0)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.0))}
TAIL = float(os.environ.get('TAIL', 0.1))
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))
VOTE_LEN = 5.6
NO_VOTE = os.environ.get('NO_VOTE', '1') == '1'

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'countdown': 0.1, 'outro': 0.3}
MINLEN = {'situation': 5, 'explain1': 6, 'explain2': 6, 'explain3': 6, 'countdown': 5, 'outro': 3}
TEXT = {'situation': S['situation'], 'option1': S['o1s'], 'option2': S['o2s'], 'option3': S['o3s'],
        'explain1': S['e1'], 'explain2': S['e2'], 'explain3': S['e3'], 'countdown': S['vote'], 'outro': S['outro']}
vd = f'{ROOT}/public/voice/{ID}'
dur = json.load(open(f'{vd}/durations.json')) if os.path.exists(f'{vd}/durations.json') else {}
ali = json.load(open(f'{vd}/alignment.json')) if os.path.exists(f'{vd}/alignment.json') else {}

def cliplen(c):
    a = dur.get(c, 0.84 + 0.0594 * len(TEXT[c]))
    return round(max(LEAD[c] + a + TAIL, MINLEN.get(c, 0)) * 30) / 30
def answer_parts(n):
    card = cliplen(f'option{n}')
    scene = cliplen(f'explain{n}') + round(EXTRA[n] * 30) / 30
    return card, scene, card + scene
def seclen(sec):
    if sec.startswith('answer'):
        return answer_parts(int(sec[-1]))[2]
    if sec == 'countdown':
        return max(cliplen('countdown'), round(VOTE_LEN * 30) / 30)
    if sec == 'outro':
        return max(cliplen('outro'), OUTRO_MIN or 4)
    return cliplen(sec)
def st_of(c, phrase, last=False, nth=0):
    txt = TEXT[c]
    if last:
        i = txt.rindex(phrase)
    else:
        i = -1
        for _ in range(nth + 1):
            i = txt.index(phrase, i + 1)
    if c in ali:
        return ali[c]['character_start_times_seconds'][i]
    return (0.84 + 0.0594 * len(txt)) * i / len(txt)
def cue(sec, clip, phrase, last=False, nth=0):
    off = 0.0
    if sec.startswith('answer') and clip.startswith('explain'):
        off = answer_parts(int(sec[-1]))[0]
    return round((off + LEAD[clip] + st_of(clip, phrase, last, nth)) / seclen(sec), 4)
r3 = lambda x: round(x, 4)
HIDE = -30.0
def K(t, x, z, motion, face=None, **kw):
    d = {'t': r3(max(0, min(1, t))), 'x': round(x, 3), 'z': round(z, 3), 'motion': motion}
    if face is not None: d['face'] = round(face, 2)
    if 'y' not in kw and 'attach' not in kw: kw['y'] = 0.0
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def cam(t, pos, look, fov=None):
    d = {'t': round(te(max(0, min(1, t))), 4), 'pos': [round(v, 3) for v in pos], 'look': look if isinstance(look, str) else [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
ANS = (100, 980, 480, 1215)
SIT = (100, 980, 280, 1215)
_fits = {}
def F(points, az, el, box=ANS, push=0.06, fov=38):
    key = json.dumps([points, az, el, box, fov])
    if key not in _fits:
        r = fit(points, az, el, fov, box) or fit(points, az, el, fov, box, dmax=250)
        assert r, f'keine Kamera gefunden: {points} {az} {el}'
        _fits[key] = r
    c, l, _ = _fits[key]
    return (c, l, fov if fov != 38 else None, push)
def M(pos, look, fov=None, push=0.06):
    return (pos, look, fov, push)
def shot(t0, t1, f, push=None):
    c, l, fv, p = f
    p = p if push is None else push
    c2 = [c[i] + (l[i] - c[i]) * p for i in range(3)]
    return [cam(t0, c, l, fv), cam(r3(t1), c2, l, fv)]
def track(t0, t1, posf, lookf, fov=None, n=8):
    """Kamera fährt mit (z. B. neben dem Auto): posf(u)/lookf(u) für u 0 … 1, viele Zeitpunkte = gleichmäßig."""
    return [cam(t0 + (t1 - t0) * i / n, posf(i / n), lookf(i / n), fov) for i in range(n + 1)]
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)

class Cast:
    def __init__(self): self.parts = {}
    def add(self, name, t0, t1, keys): self.parts.setdefault(name, []).append((r3(t0), r3(t1), keys))
    def build(self):
        out = {}
        for name, parts in self.parts.items():
            parts.sort(key=lambda p: p[0]); ks = []
            for pi, (t0, t1, keys) in enumerate(parts):
                keys = sorted(keys, key=lambda k: k['t'])
                first = dict(keys[0]); last = dict(keys[-1])
                joinP = pi > 0 and parts[pi - 1][1] >= t0 - 0.004      # schließt direkt an den vorigen Teil an
                joinN = pi + 1 < len(parts) and parts[pi + 1][0] <= t1 + 0.004
                if joinP:
                    keys[0] = dict(keys[0]); keys[0]['cut'] = True
                if joinN:
                    keys[-1] = dict(keys[-1]); keys[-1]['t'] = r3(t1 - 0.0015)
                    t1 = r3(t1 - 0.0015)
                if t0 > 0 and not joinP:
                    h = dict(first); h['t'] = r3(max(0, t0 - 0.002)); h['y'] = HIDE; h.pop('attach', None); h.pop('cut', None)
                    ks.append(h)
                for k in keys:
                    k = dict(k); k['t'] = r3(min(max(k['t'], t0), t1)); ks.append(k)
                if keys[-1]['t'] < t1 - 1e-4:
                    k = dict(keys[-1]); k['t'] = r3(t1); k.pop('cut', None); ks.append(k)
                if t1 < 1 and not joinN:
                    h = dict(last); h['t'] = r3(min(1, t1 + 0.002)); h['y'] = HIDE; h.pop('attach', None); h.pop('cut', None)
                    ks.append(h)
            if parts[0][0] > 0:
                h = dict(ks[0]); h['t'] = 0.0; h['y'] = HIDE; ks.insert(0, h)
            ks.sort(key=lambda k: k['t'])
            out[name] = ks
        return out

# =====================================================================================================
# Auto + Goldfisch
# =====================================================================================================
def car_pt(cx, cz, face, lx, lz):
    """Punkt im Auto-System (lx, lz) → Welt (x, z). Auto blickt +z im eigenen System, Drehung 180° − face."""
    th = math.radians(180 - face)
    return (cx + lx * math.cos(th) + lz * math.sin(th), cz - lx * math.sin(th) + lz * math.cos(th))
BOWL_L = (0.3, -0.05)        # Glas auf dem Fahrersitz (im Auto-System)
def bowl_w(cx, cz, face):
    return car_pt(cx, cz, face, *BOWL_L)
def car(t, x, z, face, motion='drive', **kw):
    kw.setdefault('mark', 1.0); kw.setdefault('window', 1.0); kw.setdefault('turn', 0.0); kw.setdefault('blink', 0.0)
    return K(t, x, z, motion, face, **kw)
def fish_car(t, motion, **kw):
    kw.setdefault('turn', 0.0); kw.setdefault('fill', 0.0)
    return K(t, BOWL_L[0], BOWL_L[1], motion, 0, y=0.7, attach='car', side=1.0, gloves=0.0, **kw)
def car_path(t0, t1, pts, n=None, **kw):
    """Auto entlang Punkten [(x, z), …] gleichmäßig nach Weglänge von t0 bis t1, Blick in Fahrtrichtung (rev = rückwärts)."""
    rev = kw.pop('rev', False)
    L = [0.0]
    for a, b in zip(pts, pts[1:]): L.append(L[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    out = []
    for i, p in enumerate(pts):
        j = min(i + 1, len(pts) - 1); k = max(j - 1, 0)
        d = (pts[j][0] - pts[k][0], pts[j][1] - pts[k][1])
        f = math.degrees(math.atan2(d[0], -d[1])) % 360
        if rev: f = (f + 180) % 360
        out.append(car(t0 + (t1 - t0) * L[i] / (L[-1] or 1), p[0], p[1], f, **kw))
    return out
# Lenkwinkel-Schlenker (für den Fisch + das Lenkrad), Grad
def wiggle_turn(t0, t1, n=6, amp=14):
    return [(t0 + (t1 - t0) * i / n, amp * math.sin(i * 1.7)) for i in range(n + 1)]

# Kurvige Landstraße (gleiche Formel wie kurveZ in src/stage/Goldfish.tsx)
KA, KL = 7.0, 64.0
def smoothstep(a, b, x):
    t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def kurve_z(x): return KA * math.sin(2 * math.pi * x / KL) * (1 - smoothstep(0, 18, x))
def lane(x, off=1.6):
    z = kurve_z(x); dz = (kurve_z(x + 0.1) - kurve_z(x - 0.1)) / 0.2; L = math.hypot(1, dz)
    return (x - dz / L * off, z + 1 / L * off)
def lane_face(x):
    dz = (kurve_z(x + 0.1) - kurve_z(x - 0.1)) / 0.2
    return math.degrees(math.atan2(1, -dz)) % 360
def lane_pts(x0, x1, step=1.5, off=1.6):
    n = max(2, int(abs(x1 - x0) / step)); return [lane(x0 + (x1 - x0) * i / n, off) for i in range(n + 1)]

EXC_SEAT = (-0.85, 2.6, 0.55)
def bseat(t, motion, **kw): return K(t, EXC_SEAT[0], EXC_SEAT[2], motion, 0, y=EXC_SEAT[1], attach='bagger', **kw)

# =====================================================================================================
# Situation: Wohnstraße – Fisch fährt los – Nahaufnahme im Auto – Auto weg – Dummy steht da
# =====================================================================================================
L0 = 'situation'
c_er = cue(L0, 'situation', 'Er sitzt'); c_und = cue(L0, 'situation', 'und fährt'); c_was = cue(L0, 'situation', 'Was machst')
TS = seclen(L0); ss = lambda s: s / TS
cs = Cast()
DS = (-1.6, -6.7)
cs.add('dummy', 0, c_was, [K(0, *DS, 'carshock', 110), K(c_was, *DS, 'carshock', 110)])
cs.add('dummy', c_was, 1, [K(c_was, -0.4, -6.7, 'lookaround', 180, question=1.0), K(1, -0.4, -6.7, 'lookaround', 180, question=1.0)])
# Auto: parkt aus (Schuss 1), rollt langsam (Schuss 2, Nahaufnahme), fährt davon (Schuss 3), weg (Schuss 4)
X2a, X2b = 7.0, 9.0
carS = [car(0, 0.0, -4.4, 90, 'drive'), car(r3(c_er * 0.45), 2.6, -3.0, 70), car(r3(c_er - 0.003), 5.8, -1.7, 88)]
carS += [car(c_er, X2a, -1.6, 90, cut=True), car(r3(c_und - 0.003), X2b, -1.6, 90)]
carS += [car(c_und, X2b, -1.6, 90, cut=True), car(r3(c_und + ss(0.8)), 13, -1.6, 90), car(r3(c_was - 0.003), 32, -1.6, 90)]
for tt, tv in wiggle_turn(c_er, c_und - 0.004, 5, 12):
    carS.append(car(r3(tt), X2a + (X2b - X2a) * (tt - c_er) / (c_und - c_er), -1.6, 90, turn=tv))
carS.sort(key=lambda k: k['t'])
cs.add('car', 0, c_was, carS)
fishS = [fish_car(0, 'steer')] + [fish_car(r3(tt), 'steer', turn=tv) for tt, tv in wiggle_turn(c_er, c_und - 0.004, 5, 12)] + [fish_car(c_was, 'steer')]
cs.add('goldfisch', 0, c_was, fishS)
def bowl_at_sit(u):
    x = X2a + (X2b - X2a) * u; return bowl_w(x, -1.6, 90)
situation = {
 'camera': [
   *shot(0, c_er - 0.003, F([[DS[0] - 0.4, 0, DS[1]], [DS[0] + 0.4, 1.95, DS[1]], [-1.5, 0, -5.2], [6.5, 1.6, -1.2]], 12, 8, SIT), push=0.06),
   *track(c_er, c_und - 0.003, lambda u: [bowl_at_sit(u)[0] + 0.5, 1.45, -3.55], lambda u: [bowl_at_sit(u)[0], 1.02, bowl_at_sit(u)[1]], 40, n=6),
   *shot(c_und, c_was - 0.003, M([-6.6, 1.75, -5.0], [8.0, 0.9, -2.6], push=0.04)),
   *shot(c_was, 1, F([[-0.8, 0, -6.7], [0.0, 1.95, -6.7], [-2.2, 0, -4.4], [2.2, 0.2, -4.4]], 0, 6, SIT), push=0.06),
 ],
 'actors': cs.build(), 'stage': 'wohnstrasse',
 'sfx': [{'t': 0.01, 'id': 'auto-motor', 'volume': 0.5}, {'t': r3(c_er + 0.01), 'id': 'blubbern', 'volume': 0.35},
         {'t': r3(c_und + 0.01), 'id': 'auto-motor', 'volume': 0.6}],
}

# =====================================================================================================
# Antwort A: Aquarium klauen – Auto fährt vorbei – Dummy trägt das Aquarium – wohnt im riesigen Aquarium – Fisch fährt zufrieden
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_du = cue(A, 'explain1', 'du nimmst'); c_ab = cue(A, 'explain1', 'Ab jetzt'); c_kl = cue(A, 'explain1', 'einem kleinen')
c_un = cue(A, 'explain1', 'Und er hat'); c_fa = cue(A, 'explain1', 'Fairer')
cA = Cast()
TABLE = (0.1, -0.45)
DA = (1.15, -0.25)
# Karte: Wohnzimmer, Aquarium auf dem Couchtisch, Dummy schaut es sich mit verschränkten Armen an
cA.add('aquarium', 0, sA, [K(0, *TABLE, 'park', 180, y=0.405)])
cA.add('dummy', 0, sA, [K(0, *DA, 'armscross', 255), K(sA, *DA, 'armscross', 255)])
# Straße: Fisch fährt vorbei (Spur vorn, z +1.6)
cA.add('car', sA, c_du, car_path(sA, c_du, [(-11, 1.6), (6, 1.6)]) )
cA.add('goldfisch', sA, c_du, [fish_car(sA, 'steer', turn=6.0), fish_car(c_du, 'steer', turn=-6.0)])
# Dummy trägt das Aquarium über den Gehweg
cA.add('dummy', c_du, c_ab, [K(c_du, -2.6, -6.8, 'carrywalk', 90), K(c_ab, 0.6, -6.8, 'carrywalk', 90)])
cA.add('aquarium', c_du, c_ab, [K(c_du, 0, 0.42, 'park', 0, y=0.92, attach='dummy'), K(c_ab, 0, 0.42, 'park', 0, y=0.92, attach='dummy')])
# Riesiges Aquarium von innen: Dummy liegt gemütlich im Kies
cA.add('dummy', c_ab, c_un, [K(c_ab, 0, 0, 'drumlounge', 165), K(c_un, 0, 0, 'drumlounge', 165)])
cA.add('dummy', c_fa, 1, [K(c_fa, 0, 0, 'drumlounge', 165), K(1, 0, 0, 'drumlounge', 165)])
# Fisch fährt zufrieden (Kamera fährt mit)
XA0, XA1 = 2.0, 5.0
cA.add('car', c_un, c_fa, [car(c_un, XA0, 1.6, 90, turn=4.0), car(c_fa, XA1, 1.6, 90, turn=-4.0)])
cA.add('goldfisch', c_un, c_fa, [fish_car(c_un, 'fishhappy', turn=4.0), fish_car(c_fa, 'fishhappy', turn=-4.0)])
def bowlA(u): return bowl_w(XA0 + (XA1 - XA0) * u, 1.6, 90)
camA = [
  *shot(0, sA - 0.003, F([[TABLE[0] - 0.5, 0.4, TABLE[1]], [TABLE[0] + 0.5, 0.95, TABLE[1]], [DA[0] - 0.3, 0, DA[1]], [DA[0] + 0.3, 1.95, DA[1]]], 10, 10, ANS), push=0.05),
  *shot(sA, c_du - 0.003, M([-3.0, 1.6, 13.5], [-1.0, 1.0, 0.5], push=0.03)),
  *shot(c_du, c_ab - 0.003, F([[-2.8, 0, -6.8], [0.9, 1.95, -6.8]], 8, 6, ANS), push=0.06),
  *shot(c_ab, c_kl - 0.003, M([1.2, 1.7, 5.2], [-0.2, 0.15, -3.0], 48, push=0.08)),
  *shot(c_kl, c_un - 0.003, F([[-0.6, 0, 0.6], [0.6, 1.0, -0.6], [4.4, 0, -6.5], [6.0, 4.5, -6.5]], -25, 10, ANS), push=0.07),
  *track(c_un, c_fa - 0.003, lambda u: [bowlA(u)[0] + 0.5, 1.45, -0.45], lambda u: [bowlA(u)[0], 1.02, bowlA(u)[1]], 40, n=6),
  *shot(c_fa, 1, M([-2.5, 1.0, 5.5], [0.5, 1.2, -4.0], 46, push=0.06)),
]
expA = {
 'camera': camA, 'actors': cA.build(),
 'stage': [{'t': 0, 'stage': 'wohnzimmer'}, {'t': sA, 'stage': 'wohnstrasse'}, {'t': c_ab, 'stage': 'aquarium-innen'}, {'t': c_un, 'stage': 'wohnstrasse'}, {'t': c_fa, 'stage': 'aquarium-innen'}],
 'sfx': [{'t': r3(sA + 0.005), 'id': 'auto-motor', 'volume': 0.5}, {'t': r3(c_du + 0.01), 'id': 'eimer-schwappen', 'volume': 0.45},
         {'t': r3(c_ab + 0.005), 'id': 'blubbern', 'volume': 0.5}, {'t': r3(c_un + 0.005), 'id': 'auto-motor', 'volume': 0.4},
         {'t': r3(c_fa + 0.005), 'id': 'blubbern', 'volume': 0.4}],
}

# =====================================================================================================
# Antwort B: Futterspur – Auto hält am Häufchen – Fisch frisst – Boxring: Handschuhe, Eins gegen eins, Schlüssel, Ring frei
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_di = cue(B, 'explain2', 'direkt bis'); c_ha = cue(B, 'explain2', 'Er hält'); c_fr = cue(B, 'explain2', 'und frisst')
c_ud = cue(B, 'explain2', 'Und dann'); c_ei = cue(B, 'explain2', 'Eins gegen'); c_we = cue(B, 'explain2', 'Wer gewinnt'); c_ri = cue(B, 'explain2', 'Ring frei')
cB = Cast()
PILE = (1.5, 0.0)
TRAIL = [(-44, 0.0), (-30, 0.3), (-20, -0.3), (-10, 0.2), (PILE[0], 0.0)]
TRAIL_TXT = ';'.join(f'{x:.1f} {z:.1f}' for x, z in TRAIL)
def trail_frac(x):
    L = [0.0]
    for a, b in zip(TRAIL, TRAIL[1:]): L.append(L[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    for i, (a, b) in enumerate(zip(TRAIL, TRAIL[1:])):
        if a[0] <= x <= b[0]: return (L[i] + (x - a[0]) / (b[0] - a[0]) * (L[i + 1] - L[i])) / L[-1]
    return 1.0 if x > TRAIL[-1][0] else 0.0
# Karte: Dummy steht auf dem Parkplatz, Hände in den Hüften
cB.add('dummy', 0, sB, [K(0, -4.0, -1.0, 'proud', 160), K(sB, -4.0, -1.0, 'proud', 160)])
# Spur streuen (Zufahrt)
SX0, SX1 = -36.0, -27.0
cB.add('dummy', sB, c_di, [K(sB, SX0, 0.15, 'scatter', 90), K(c_di, SX1, 0.15, 'scatter', 90)])
cB.add('futterspur', sB, c_ha, [K(sB, 0, 0, 'park', 180, text=TRAIL_TXT, fill=trail_frac(SX0 - 0.5), mark=0.0),
                                 K(r3(c_di - 0.003), 0, 0, 'park', 180, fill=trail_frac(SX1 - 0.5), mark=0.0),
                                 K(c_di, 0, 0, 'park', 180, fill=1.0, mark=1.0, cut=True), K(c_ha, 0, 0, 'park', 180, fill=1.0, mark=1.0)])
cB.add('futterspur', c_ha, c_ud, [K(c_ha, 0, 0, 'park', 180, text=TRAIL_TXT, fill=1.0, mark=1.0), K(c_ud, 0, 0, 'park', 180, fill=0.85, mark=0.6)])
# Dummy wartet neben dem Häufchen
cB.add('dummy', c_di, c_fr, [K(c_di, 4.2, -2.2, 'proud', 250), K(c_fr, 4.2, -2.2, 'proud', 250)])
# Auto rollt heran und hält am Häufchen
CARB = (-1.1, 0.0)
cB.add('car', c_ha, c_ud, [car(c_ha, -22.0, 0.0, 90, window=1.0), car(r3(c_fr - sb(0.15)), CARB[0], 0.0, 90), car(r3(c_fr - sb(0.14)), CARB[0], 0.0, 90, 'park'),
                           car(c_ud, CARB[0], 0.0, 90, 'park')])
cB.add('goldfisch', c_ha, c_ud, [fish_car(c_ha, 'steer'), fish_car(r3(c_fr - 0.003), 'steer'), fish_car(c_fr, 'fisheat', fill=1.0, cut=True), fish_car(c_ud, 'fisheat', fill=0.35)])
# Boxring auf dem Parkplatz
DR = (-1.55, -1.55); FP = (1.6, 1.6)
cB.add('dummy', c_ud, c_ei, [K(c_ud, *DR, 'gloveon', 135, gloves=0.0), K(r3(c_ud + sb(0.6)), *DR, 'gloveon', 135, gloves=0.0), K(r3(c_ud + sb(1.4)), *DR, 'gloveon', 135, gloves=1.0), K(c_ei, *DR, 'gloveon', 135, gloves=1.0)])
cB.add('dummy', c_ei, 1, [K(c_ei, *DR, 'boxbounce', 135, gloves=1.0), K(1, *DR, 'boxbounce', 135, gloves=1.0)])
cB.add('podest2', c_ei, 1, [K(c_ei, *FP, 'park', 315)])
cB.add('goldfisch', c_ei, 1, [K(c_ei, *FP, 'fishguard', 315, y=0.55, gloves=1.0, side=0.0, size=0.25),
                              K(r3(c_ri - 0.003), *FP, 'fishguard', 315, y=0.55, gloves=1.0, side=0.0, size=0.25),
                              K(c_ri, *FP, 'fishpunch', 315, y=0.55, gloves=1.0, side=0.0, size=0.25), K(1, *FP, 'fishpunch', 315, y=0.55, gloves=1.0, side=0.0, size=0.25)])
cB.add('podest', c_ud, 1, [K(c_ud, 0.0, 0.0, 'park', 180)])
cB.add('autoschluessel', c_ud, 1, [K(c_ud, 0.0, 0.0, 'park', 180, y=0.85, glow=0.0), K(c_we, 0.0, 0.0, 'park', 180, y=0.85, glow=1.0), K(1, 0.0, 0.0, 'park', 180, y=0.85, glow=1.0)])
cB.add('car', c_ud, 1, [car(c_ud, -9.3, -5.6, 0, 'park', window=0.0)])
cB.add('boxglocke', c_ri, 1, [K(c_ri, 2.7, -2.7, 'show', y=1.9, ring=1.0, size=0.6), K(1, 2.7, -2.7, 'show', y=1.9, ring=1.0, size=0.6)])
bowlB = bowl_w(CARB[0], 0.0, 90)
camB = [
  *shot(0, sB - 0.003, F([[-4.4, 0, -1.0], [-3.6, 1.95, -1.0], [-6, 0, -8], [2, 0, -8]], 5, 8, ANS), push=0.05),
  *shot(sB, c_di - 0.003, M([-28.0, 1.5, 5.6], [-33.5, 0.7, 0.0], push=0.12)),
  *shot(c_di, c_ha - 0.003, M([-6.0, 9.5, 14.0], [-12.0, 0.0, -1.0], push=0.05)),
  *shot(c_ha, c_fr - 0.003, M([-4.0, 2.2, 9.5], [-6.0, 0.6, -0.5], push=0.04)),
  *shot(c_fr, c_ud - 0.003, M([bowlB[0] + 0.55, 1.5, -2.1], [bowlB[0], 1.05, bowlB[1]], 40, push=0.08)),
  *shot(c_ud, c_ei - 0.003, F([[DR[0] - 0.3, 0.5, DR[1] - 0.3], [DR[0] + 0.3, 2.4, DR[1] + 0.3]], 135, 8, ANS), push=0.06),
  *shot(c_ei, c_we - 0.003, F([[DR[0], 0.5, DR[1]], [DR[0], 2.4, DR[1]], [FP[0], 0.5, FP[1]], [FP[0], 1.6, FP[1]]], 45, 10, ANS), push=0.05),
  *shot(c_we, c_ri - 0.003, M([1.9, 1.55, -1.1], [0.0, 1.35, 0.0], 36, push=0.1)),
  *shot(c_ri, 1, F([[DR[0], 0.5, DR[1]], [DR[0], 2.4, DR[1]], [FP[0], 0.5, FP[1]], [FP[0], 1.6, FP[1]], [2.7, 2.3, -2.7]], 45, 6, ANS), push=0.05),
]
expB = {
 'camera': camB, 'actors': cB.build(),
 'stage': [{'t': 0, 'stage': 'parkplatz'}, {'t': c_ud, 'stage': 'parkplatz-ring'}],
 'sfx': [{'t': r3(sB + 0.005), 'id': 'futter-streuen', 'volume': 0.7}, {'t': r3(c_ha + 0.005), 'id': 'auto-motor', 'volume': 0.45},
         {'t': r3(c_fr + 0.005), 'id': 'fisch-schnappen', 'volume': 0.75}, {'t': r3(c_ud + 0.005), 'id': 'handschuhe-anziehen', 'volume': 0.75},
         {'t': r3(c_we + 0.005), 'id': 'schluessel-klimpern', 'volume': 0.7}, {'t': r3(c_ri + 0.01), 'id': 'boxglocke', 'volume': 0.85}],
}

# =====================================================================================================
# Antwort C: Bagger-Vollgas – Fisch fährt sauber durch die Kurven – blinkt – parkt rückwärts ein – Bagger weit hinten
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_al = cue(C, 'explain3', 'Also'); c_ku = cue(C, 'explain3', 'Er nimmt'); c_bl = cue(C, 'explain3', 'setzt den'); c_pa = cue(C, 'explain3', 'und parkt')
c_ko = cue(C, 'explain3', 'Du kommst'); c_be = cue(C, 'explain3', 'Er ist')
cC = Cast()
def bag_at(t, x, motion='drive', **kw):
    p = lane(x, -1.6)
    kw.setdefault('smoke', 1.2); kw.setdefault('rumble', 0.4)
    return K(t, p[0], p[1], motion, lane_face(x), **kw)
# Bagger: Karte + Vollgas bei x −96 … −93, langsames Kriechen, später weit hinten bei x −40 … −38
cC.add('bagger', 0, c_ku, [bag_at(0, -96.0, 'park', smoke=0.3), bag_at(r3(sC - 0.003), -96.0, 'park', smoke=0.3), bag_at(sC, -96.0, smoke=1.8), bag_at(c_ku, -94.0, smoke=1.6)])
cC.add('dummy', 0, c_ku, [bseat(0, 'seatdrive'), bseat(r3(sC - 0.003), 'seatdrive'), bseat(sC, 'seatfloor', sweat=1.0), bseat(c_ku, 'seatfloor', sweat=1.0)])
cC.add('bagger', c_ko, c_be, [bag_at(c_ko, -34.0, smoke=1.8), bag_at(c_be, -33.0, smoke=1.8)])
cC.add('dummy', c_ko, c_be, [bseat(c_ko, 'seatfloor', sweat=1.6), bseat(c_be, 'seatfloor', sweat=1.6)])
# Auto durch die Kurven (Luftaufnahme)
XK0, XK1 = -52.0, -14.0
ptsK = lane_pts(XK0, XK1, 1.0)
cC.add('car', c_ku, c_bl, car_path(c_ku, c_bl, ptsK, window=0.0))
cC.add('goldfisch', c_ku, c_bl, [fish_car(c_ku, 'steer', turn=10.0), fish_car(c_bl, 'steer', turn=-10.0)])
# Blinker (Nahaufnahme durch die Frontscheibe): gerade Strecke, rechts blinken
XB0, XB1 = 24.0, 30.0
cC.add('car', c_bl, c_pa, [car(c_bl, XB0, 1.6, 90, blink=2.0, window=0.0), car(c_pa, XB1, 1.6, 90, blink=2.0, window=0.0)])
cC.add('goldfisch', c_bl, c_pa, [fish_car(c_bl, 'fishblink'), fish_car(c_pa, 'fishblink')])
# Rückwärts einparken: vorwärts an der Lücke vorbei, dann im Viertelkreis rückwärts hinein
SPOT = (52.0, 7.6); R = 4.5; XS = SPOT[0] + R
tF = r3(c_pa + (c_ko - c_pa) * 0.32)
fwd = car_path(c_pa, tF, [(42.0, 1.6), (XS, 1.6)], window=0.0, blink=2.0)
arc = [(XS - R * math.sin(math.radians(a)), 1.6 + R - R * math.cos(math.radians(a))) for a in range(0, 91, 10)] + [SPOT]
rev = car_path(r3(tF + 0.004), r3(c_ko - sc(0.25)), arc, rev=True, window=0.0)
cC.add('car', c_pa, c_ko, fwd + rev + [car(c_ko, *SPOT, 0, 'park', window=0.0)])
cC.add('goldfisch', c_pa, c_ko, [fish_car(c_pa, 'steer'), fish_car(tF, 'steer'), fish_car(r3(tF + 0.004), 'fishback', turn=-25.0), fish_car(c_ko, 'fishback', turn=-25.0)])
# Fisch zufrieden im perfekt eingeparkten Auto
cC.add('car', c_be, 1, [car(c_be, *SPOT, 0, 'park', window=0.0)])
cC.add('goldfisch', c_be, 1, [fish_car(c_be, 'fishhappy'), fish_car(1, 'fishhappy')])
def car_on(u):  # Position des Autos in der Luftaufnahme
    i = min(len(ptsK) - 1, int(u * (len(ptsK) - 1))); return ptsK[i]
bowlC = bowl_w(*SPOT, 0)
def bowlBl(u): return bowl_w(XB0 + (XB1 - XB0) * u, 1.6, 90)
pb0 = lane(-96, -1.6); pb1 = lane(-34, -1.6); fb = lane_face(-96)
camC = [
  *shot(0, sC - 0.003, F([[pb0[0] - 3.5, 0, pb0[1] - 3.5], [pb0[0] + 3.5, 4.8, pb0[1] + 3.5]], fb - 140, 8, ANS), push=0.04),
  *shot(sC, c_al - 0.003, M([*car_pt(pb0[0], pb0[1], fb, -0.2, 7.0)[:1], 4.1, car_pt(pb0[0], pb0[1], fb, -0.2, 7.0)[1]],
                            [car_pt(pb0[0], pb0[1], fb, -0.85, 0.6)[0], 3.15, car_pt(pb0[0], pb0[1], fb, -0.85, 0.6)[1]], 40, push=0.08)),
  *shot(c_al, c_ku - 0.003, F([[pb0[0] - 4, 0, pb0[1] - 2], [pb0[0] + 4, 4.8, pb0[1] + 2]], fb + 80, 6, ANS), push=0.03),
  *track(c_ku, c_bl - 0.003, lambda u: [car_on(u)[0] - 9.0, 24.0, car_on(u)[1] + 16.0], lambda u: [car_on(u)[0] + 3.0, 0.0, car_on(u)[1] - 1.0], 42, n=10),
  *track(c_bl, c_pa - 0.003, lambda u: [bowlBl(u)[0] + 2.7, 1.8, 0.6], lambda u: [bowlBl(u)[0], 1.0, bowlBl(u)[1]], 34, n=6),
  *shot(c_pa, c_ko - 0.003, M([50.0, 11.0, -6.5], [52.0, 0.0, 5.0], 42, push=0.04)),
  *shot(c_ko, c_be - 0.003, F([[pb1[0] - 4, 0, pb1[1] - 2], [pb1[0] + 4, 4.8, pb1[1] + 2]], lane_face(-34) - 20, 4, ANS), push=0.04),
  *shot(c_be, 1, M([bowlC[0] + 0.4, 1.75, bowlC[1] - 2.9], [bowlC[0], 1.02, bowlC[1]], 36, push=0.08)),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': 'kurvenstrasse',
 'sfx': [{'t': 0.01, 'id': 'bagger-motor', 'volume': 0.45}, {'t': r3(sC + 0.005), 'id': 'bagger-motor', 'volume': 0.75},
         {'t': r3(c_ku + 0.005), 'id': 'auto-motor', 'volume': 0.6}, {'t': r3(c_bl + 0.005), 'id': 'blinker', 'volume': 0.8},
         {'t': r3(c_ko + 0.005), 'id': 'bagger-motor', 'volume': 0.55}, {'t': r3(c_be + 0.005), 'id': 'staunen', 'volume': 0.35}],
}

# =====================================================================================================
# Abstimmung + Outro: Wohnstraße, Dummy + Fisch im Glas auf dem Podest, Auto in der Parkbucht daneben
# =====================================================================================================
VD = (-0.75, -6.7); VF = (0.45, -6.75)
def endcast(wave=False):
    c = Cast()
    c.add('car', 0, 1, [car(0, -5.6, -4.4, 90, 'park', window=0.0)])
    c.add('podest', 0, 1, [K(0, *VF, 'park', 180)])
    c.add('goldfisch', 0, 1, [K(0, *VF, 'fishhappy' if wave else 'fishswim', 180, y=0.55, side=0.0)])
    c.add('dummy', 0, 1, [K(0, *VD, 'stand', 160, question=0.0 if wave else 1.0)] + ([K(0.12, *VD, 'wave', 160), K(1, *VD, 'wave', 160)] if wave else []))
    return c.build()
V_PTS = [[VD[0] - 0.4, 0, VD[1]], [VF[0] + 0.4, 1.95, VF[1]], [-7.5, 0, -4.4], [-3.8, 1.6, -4.4]]
vote = {'camera': shot(0, 1, F(V_PTS, 10, 4, (120, 960, 1060, 1320), push=0.04)), 'actors': endcast(), 'stage': 'wohnstrasse'}
outro = {'camera': shot(0, 1, F(V_PTS, 12, 6, (100, 980, 780, 1110), push=0.05)), 'actors': endcast(True), 'stage': 'wohnstrasse'}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Dein Goldfisch hat mal wieder dein Auto geklaut – was machst du? 🐠🚗 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Dem Goldfisch geht es gut. 😄\n\n"
        "#waswürdestdutun #goldfisch #auto #fisch #boxen #spezial #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'wohnstrasse', 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Goldfisch fährt im Auto des Dummys vorbei, der Dummy trägt dafür das Aquarium des Fischs davon. Danach wohnt der Dummy im riesigen Aquarium zwischen Plastikpflanzen, neben einer Taucherfigur, Luftblasen steigen auf. Draußen fährt der Goldfisch zufrieden Auto.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy streut eine Spur aus Fischfutter bis zum Supermarkt-Parkplatz, das Auto rollt heran und hält am Futterhäufchen, der Goldfisch frisst. Dann ein Boxring auf dem Parkplatz: der Dummy zieht Boxhandschuhe an, der Goldfisch steht in seinem Glas auf einem Podest mit Mini-Handschuhen, in der Mitte der Autoschlüssel auf einem Podest. Die Glocke klingelt, beide gehen in Boxhaltung (Show-Kampf, niemand trifft).', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy gibt im Bagger Vollgas und kriecht trotzdem nur langsam voran. Der Goldfisch nimmt jede Kurve der Landstraße sauber, setzt den Blinker (Flosse am Hebel) und parkt rückwärts perfekt ein. Der Bagger ist weit abgeschlagen.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Kommentieren & folgen!', 'extra': 'Neue Video-Ideen? Ab in die Kommentare!', 'extraCue': 'Neue Video-Ideen'},
 'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team ___. Und du? 👇 Wer gewinnt den Boxkampf?'},
 'shots': {'situation': situation, 'countdown': vote, 'outro': outro},
}
if OUTRO_MIN > 0: scen['outroMin'] = OUTRO_MIN
if NO_VOTE: scen['noVote'] = True
for _sh in [situation, vote, outro, expA, expB, expC]:
    _sh['sharpCuts'] = True
    for keys in _sh['actors'].values():
        keys.sort(key=lambda k: k['t'])
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
total = seclen('situation') + answer_parts(1)[2] + answer_parts(2)[2] + answer_parts(3)[2] + (0 if NO_VOTE else seclen('countdown')) + seclen('outro')
print('Länge', round(total, 2), 's', 'audio' if dur else 'geschätzt',
      {'situation': seclen('situation'), 'A': answer_parts(1)[:2], 'B': answer_parts(2)[:2], 'C': answer_parts(3)[:2], 'vote': seclen('countdown'), 'outro': seclen('outro')})
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
