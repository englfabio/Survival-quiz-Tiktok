# Hilfsskript: erzeugt scenarios/spezial-tauben.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-tauben-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-pirat-token.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, den Tauben passiert NIE etwas. Bei C fliegen ALLE Tauben deutlich sichtbar aus dem
# Haus (auf den Baum gegenüber), BEVOR der Monstertruck darüberrollt – das Skript prüft das (check_c). Bei A keine echten Politiker/
# Regierungsgebäude: nur eine anonyme Hotline mit Warteschleife und ein Regierungs-Dummy im dunklen Anzug mit Sonnenbrille in einem
# neutralen Büro.
#  A: Dummy telefoniert genervt (Warteschleife), Regierungs-Dummy geht ran, nickt, Klick – bei jeder Taube blinkt ein rotes Licht, alle
#     fliegen gleichzeitig raus auf die Stromleitung, Lade-Symbol über ihnen.
#  B: Verhandlung am Küchentisch (Papiere hin und her, Stempel, Hand + Flügel schütteln), Tauben ordentlich auf dem Dachboden,
#     Hausordnung + Putzplan an der Tür, Dummy zufrieden in der Küche.
#  C: Tauben fliegen auf den Baum gegenüber, dann rollt der Dummy im Monstertruck über sein eigenes (leeres) Haus.
# Spezial-Regeln: 61–66 s, keine Dopplungen, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-tauben'
S = dict(
situation="Tauben haben mal wieder dein Haus eingenommen. Sie sitzen überall. Sogar im Kühlschrank. Was machst du?",
o1c="Regierung anrufen", o1s="A: Du sagst der Regierung, dass die Ladestation nicht bei dir zu Hause ist. Die Tauben sollen zurück auf die Strommasten.",
o2c="Mietvertrag aushandeln", o2s="B: Du handelst mit dem Tauben-Anführer einen Mietvertrag aus.",
o3c="Monstertruck übers eigene Haus", o3s="C: Du überfährst dein eigenes Haus mit einem Monstertruck.",
e1="Kurze Warteschleife. Dann ein Klick. Bei jeder Taube blinkt ein kleines rotes Licht. Alle fliegen gleichzeitig raus, zurück auf die Strommasten. Und laden wieder.",
e2="Lange Verhandlungen am Küchentisch. Am Ende steht es fest: Die Tauben bekommen den Dachboden, du darfst die Küche behalten. Mit Hausordnung und Putzplan.",
e3="Erst fliegen alle Tauben raus. Dann rollst du drüber. Kein Haus, keine Tauben. Problem gelöst.",
vote="Also, was machst du?",
# Outro des Inhabers Buchstabe für Buchstabe + (Spezial-Regel 5, Wunsch Inhaber) angehängt: „Neue Video-Ideen? Ab in die Kommentare!“
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr. Neue Video-Ideen? Ab in die Kommentare!",
)
EXTRA = {1: float(os.environ.get('EXA', 0.0)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.0))}
TAIL = float(os.environ.get('TAIL', 0.3))
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))
VOTE_LEN = 5.6
NO_VOTE = os.environ.get('NO_VOTE', '0') == '1'

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
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)

# ---- Sichtbarkeit je Bühne: Figur nur in [t0, t1] zeigen, sonst y −30 ----
class Cast:
    def __init__(self): self.parts = {}
    def add(self, name, t0, t1, keys): self.parts.setdefault(name, []).append((r3(t0), r3(t1), keys))
    def build(self):
        out = {}
        for name, parts in self.parts.items():
            parts.sort(key=lambda p: p[0]); ks = []
            for (t0, t1, keys) in parts:
                keys = sorted(keys, key=lambda k: k['t'])
                first = dict(keys[0]); last = dict(keys[-1])
                if t0 > 0:
                    h = dict(first); h['t'] = r3(max(0, t0 - 0.002)); h['y'] = HIDE; h.pop('attach', None); h.pop('cut', None)
                    if not h.get('x') and 'attach' in first: pass
                    ks.append(h)
                for k in keys:
                    k = dict(k); k['t'] = r3(min(max(k['t'], t0), t1)); ks.append(k)
                if keys[-1]['t'] < t1 - 1e-4:
                    k = dict(keys[-1]); k['t'] = r3(t1); k.pop('cut', None); ks.append(k)
                if t1 < 1:
                    h = dict(last); h['t'] = r3(min(1, t1 + 0.002)); h['y'] = HIDE; h.pop('attach', None); h.pop('cut', None)
                    ks.append(h)
            if parts[0][0] > 0:
                h = dict(ks[0]); h['t'] = 0.0; h['y'] = HIDE; ks.insert(0, h)
            ks.sort(key=lambda k: k['t'])
            out[name] = ks
        return out

# =====================================================================================================
# feste Plätze
# =====================================================================================================
HOUSE = (0.0, -12.5); FRONT = -9.0
WIRE_POLES = [-20, -8, 4, 16]; WIRE_Z = 5.6
def wireY(x):
    for a, b in zip(WIRE_POLES, WIRE_POLES[1:]):
        if a <= x <= b:
            u = (x - (a + b) / 2) / ((b - a) / 2); return 6.5 - 0.28 * (1 - u * u)
    return 6.5
TREE = (6.2, 9.2)
BRANCHES = [(3.1, -1, 2.4), (3.9, 1, 2.1), (4.7, -1, 1.9)]
PERCHES = [(TREE[0] + d * (0.45 + i * (L - 0.6) / 4), y + 0.09, TREE[1]) for (y, d, L) in BRANCHES for i in range(5)]
# Tauben am Haus (außen): Fensterbänke, Vordach, Traufe, Schornstein – Blick zur Straße (face 180)
HOUSE_SPOTS = [(-2.6, 0.82, -8.9), (-2.0, 0.82, -8.9), (2.0, 0.82, -8.9), (2.6, 0.82, -8.9),
               (-2.6, 3.12, -8.9), (-2.0, 3.12, -8.9), (-0.3, 3.12, -8.9), (0.3, 3.12, -8.9), (2.0, 3.12, -8.9), (2.6, 3.12, -8.9),
               (-0.5, 2.62, -8.45), (0.45, 2.62, -8.45),
               (-3.1, 5.02, -8.7), (-1.2, 5.02, -8.7), (1.1, 5.02, -8.7), (3.1, 5.02, -8.7)]
N_OUT = len(HOUSE_SPOTS)
def fmt(p, f): return f'{p[0]:.2f} {p[1]:.2f} {p[2]:.2f} {f:.0f}'
WIRE_ROW = [(x, wireY(x) + 0.02, WIRE_Z) for x in [-6.9 + i * 0.66 for i in range(N_OUT)]]
def flock_text(src, dst=None, fsrc=180, fdst=180, jitter=True):
    out = []
    for i, p in enumerate(src):
        f = fsrc + ((i * 37) % 50 - 25 if jitter else 0)
        if dst is None: out.append(fmt(p, f))
        else: out.append(fmt(p, f) + '>' + fmt(dst[i], fdst + ((i * 23) % 30 - 15 if jitter else 0)))
    return ';'.join(out)
TXT_HOUSE = flock_text(HOUSE_SPOTS)
TXT_TO_WIRE = flock_text(HOUSE_SPOTS, WIRE_ROW, 180, 180)
TXT_WIRE = ';'.join(fmt(p, 180) for p in WIRE_ROW)
TXT_TO_TREE = flock_text(HOUSE_SPOTS[:15], PERCHES, 180, 0)
# Wohnzimmer (src/stage/Rooms.tsx: Sofa Sitz 0,45 bei z −1.82, Couchtisch 0,405 bei (0.1, −0.45)); Fernseher-Objekt an der rechten Wand
TV = (1.95, 0.25)
LIVING = [(-0.75, 0.45, -1.75), (-0.15, 0.45, -1.7), (0.55, 0.45, -1.8), (-0.4, 0.86, -2.12), (0.35, 0.86, -2.12), (0.95, 0.86, -2.1),
          (-0.2, 0.405, -0.45), (0.4, 0.405, -0.55), (1.95, 1.09, 0.05), (1.95, 1.09, 0.45), (2.3, 1.8, -1.05), (-1.55, 1.8, -1.95),
          (-0.9, 0.0, 0.35), (0.85, 0.0, 0.75), (-1.6, 0.0, -0.6)]
TXT_LIVING = flock_text(LIVING, fsrc=170)
# WG-Küche (src/stage/Kitchen.tsx WG): Kühlschrank bei (−2.13, −1.94) face 180 → Fach bei (−1.95, 1.045, −1.84)
FRIDGE_P = (-1.95, 1.045, -1.80)
KITCHEN = [FRIDGE_P, (-0.75, 0.9, -2.0), (-0.15, 0.9, -2.05), (0.35, 0.9, -1.95), (-0.55, 0.76, 0.35), (0.1, 0.76, 0.75), (0.75, 0.0, 1.2), (-1.4, 0.0, 1.0)]
TXT_KITCHEN = flock_text(KITCHEN, fsrc=180)
# Dachboden (src/stage/Attic.tsx ATTIC): Nester + Boden
NESTS = [(-1.9, 0.09, -1.75), (-1.3, 0.09, -1.75), (-0.7, 0.09, -1.75), (-2.1, 0.09, -0.8), (-0.9, 1.0, -1.95), (-0.3, 1.0, -1.95)]
ATTIC_BIRDS = NESTS + [(0.35, 0.0, 0.55), (0.6, 0.0, 0.2)]
TXT_ATTIC = ';'.join(fmt(p, 120 if p[0] < -2 else 175) for p in ATTIC_BIRDS)
ATTIC_DOOR = (0.92, -2.17)

WG_TABLE = (-0.2, 0.55); TABLE_H = 0.76
D_CHAIR = (-0.98, 0.55)           # Dummy sitzt links, Blick +x (face 90)
L_TABLE = (0.15, 0.55)            # Anführer steht AUF dem rechten Tischende, Blick −x (face 270)
CONTRACT_D = (-0.56, 0.55); CONTRACT_L = (-0.3, 0.55)
OFFICE_AGENT = (0.55, -0.6); KNOPF = (1.05, -0.6)

def flock(t, text, y=0.0, **kw):
    return K(t, 0, 0, 'perch', 180, y=y, text=text, **kw)
def oflock(t, text, **kw):
    kw.setdefault('size', 0.4)
    return flock(t, text, **kw)
def house(t, **kw):
    kw.setdefault('mark', 0.0); kw.setdefault('squish', 0.0)
    return K(t, *HOUSE, 'park', 180, **kw)

# =====================================================================================================
# Situation: Haus mit Tauben – Wohnzimmer voller Tauben – Kühlschrank – Küche
# =====================================================================================================
L0 = 'situation'
c_sie = cue(L0, 'situation', 'Sie sitzen'); c_sog = cue(L0, 'situation', 'Sogar'); c_was = cue(L0, 'situation', 'Was machst')
cs_ = Cast()
DS = (0.9, -6.4)
cs_.add('haus', 0, c_sie, [house(0, door=0.0)])
cs_.add('tauben', 0, c_sie, [oflock(0, TXT_HOUSE)])
cs_.add('dummy', 0, c_sie, [K(0, *DS, 'gape', 345)])
cs_.add('fernseher', c_sie, c_sog, [K(c_sie, *TV, 'park', 270)])
cs_.add('tauben2', c_sie, c_sog, [flock(c_sie, TXT_LIVING)])
cs_.add('kuehlschrank', c_sog, 1, [K(c_sog, -2.13, -1.94, 'park', 180, door=0.0), K(r3(c_sog + 0.4 / 7.4), -2.13, -1.94, 'park', 180, door=1.0), K(1, -2.13, -1.94, 'park', 180, door=1.0)])
cs_.add('tauben3', c_sog, 1, [flock(c_sog, TXT_KITCHEN)])
cs_.add('dummy', c_sog, 1, [K(c_sog, -0.85, -1.25, 'gape', face_to((-0.85, -1.25), (-2.0, -1.85))), K(r3(c_was - 0.003), -0.85, -1.25, 'gape', face_to((-0.85, -1.25), (-2.0, -1.85))),
                              K(c_was, -0.6, -0.2, 'lookaround', 180, question=1.0, cut=True), K(1, -0.6, -0.2, 'lookaround', 180, question=1.0)])
situation = {
 'camera': [
   *shot(0, c_sie - 0.003, M([2.6, 1.7, 4.7], [0.2, 3.2, -9.0], push=0.08)),
   *shot(c_sie, c_sog - 0.003, M([0.4, 1.7, 6.2], [0.1, 0.85, -0.9], push=0.1)),
   *shot(c_sog, c_was - 0.003, M([-0.75, 1.5, 0.45], [-1.85, 1.0, -1.8], 42, push=0.1)),
   *shot(c_was, 1, M([0.2, 1.8, 5.6], [-0.5, 0.85, -0.6], push=0.06)),
 ],
 'actors': cs_.build(),
 'stage': [{'t': 0, 'stage': 'taubenstrasse'}, {'t': c_sie, 'stage': 'wohnzimmer'}, {'t': c_sog, 'stage': 'wg-kueche'}],
 'sfx': [{'t': 0.02, 'id': 'tauben-gurren', 'volume': 0.5}, {'t': r3(c_sie + 0.01), 'id': 'tauben-gurren', 'volume': 0.55},
         {'t': r3(c_sog), 'id': 'kuehlschrank-auf', 'volume': 0.6}, {'t': r3(c_sog + 0.05), 'id': 'tauben-gurren', 'volume': 0.5}],
}

# =====================================================================================================
# Antwort A: Warteschleife – Regierungs-Dummy nickt, Klick – rote Lichter – alle fliegen auf die Stromleitung – laden
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_dann = cue(A, 'explain1', 'Dann ein'); c_klick = cue(A, 'explain1', 'Klick'); c_bei = cue(A, 'explain1', 'Bei jeder')
c_alle = cue(A, 'explain1', 'Alle fliegen'); c_zur = cue(A, 'explain1', 'zurück'); c_und = cue(A, 'explain1', 'Und laden')
t_off = r3(c_dann - sa(0.35))           # Schnitt ins Büro kurz vor „Dann“
t_press = r3(c_klick - sa(0.72))         # Knopf-Treffer genau auf „Klick“
t_fly0 = r3(c_alle + sa(0.15)); t_fly1 = r3(c_und - sa(0.25))
cA = Cast()
DA = (0.25, 0.55)
# Wohnzimmer: Karte + Warteschleife + rote Lichter
cA.add('fernseher', 0, t_off, [K(0, *TV, 'park', 270)])
cA.add('tauben2', 0, t_off, [flock(0, TXT_LIVING)])
cA.add('dummy', 0, t_off, [K(0, *DA, 'call', 180), K(r3(sA - 0.003), *DA, 'call', 180), K(sA, *DA, 'callwait', 180), K(t_off, *DA, 'callwait', 180)])
cA.add('warteschleife', sA, t_off, [K(sA, DA[0] - 0.05, DA[1], 'show', y=1.98)])
cA.add('fernseher', c_bei, c_alle, [K(c_bei, *TV, 'park', 270)])
cA.add('tauben2', c_bei, c_alle, [flock(c_bei, TXT_LIVING, blink=0.0), flock(r3(c_bei + sa(0.25)), TXT_LIVING, blink=1.0)])
# Büro: Regierungs-Dummy (anonym) nickt + drückt den Knopf
cA.add('agent', t_off, c_bei, [K(t_off, *OFFICE_AGENT, 'callnod', 90), K(r3(t_press - 0.003), *OFFICE_AGENT, 'callnod', 90),
                               K(t_press, *OFFICE_AGENT, 'pressbutton', 90, cut=True), K(c_bei, *OFFICE_AGENT, 'pressbutton', 90)])
cA.add('knopf', t_off, c_bei, [K(t_off, *KNOPF, 'park', 270, press=0.0, glow=0.6, text='ZURÜCK'), K(r3(c_klick - sa(0.02)), *KNOPF, 'park', 270, press=0.0),
                               K(r3(c_klick + sa(0.05)), *KNOPF, 'park', 270, press=1.0, glow=1.0), K(c_bei, *KNOPF, 'park', 270, press=1.0)])
# Straße: alle fliegen gleichzeitig raus, auf die Leitung
cA.add('haus', c_alle, 1, [house(c_alle, door=1.0)])
cA.add('tauben', c_alle, 1, [oflock(c_alle, TXT_TO_WIRE, fill=0.0, mark=0.0, blink=1.0), flock(t_fly0, TXT_TO_WIRE, fill=0.0),
                              flock(t_fly1, TXT_TO_WIRE, fill=1.0), flock(1, TXT_TO_WIRE, fill=1.0)])
cA.add('ladesymbol', c_und, 1, [K(c_und, -2.0, WIRE_Z, 'show', y=7.35, size=0.6)])
camA = [
  *shot(0, sA - 0.003, M([0.5, 1.6, 5.4], [0.15, 1.0, -0.3], push=0.05)),
  *shot(sA, t_off - 0.003, M([0.9, 1.7, 3.6], [0.25, 1.5, 0.55], push=0.1)),
  *shot(t_off, c_bei - 0.003, M([0.55, 1.5, 2.9], [0.8, 1.2, -0.6], push=0.08)),
  *shot(c_bei, c_alle - 0.003, M([0.2, 1.25, 1.8], [-0.1, 0.6, -1.8], 40, push=0.1)),
  *shot(c_alle, c_und - 0.003, F([[-3.6, 0, FRONT], [3.6, 7.6, FRONT], [-7.0, 6.5, WIRE_Z], [3.5, 6.5, WIRE_Z]], -32, 10, ANS), push=0.04),
  *shot(c_und, 1, M([-2.0, 4.6, 12.5], [-2.0, 6.6, WIRE_Z], push=0.08)),
]
expA = {
 'camera': camA, 'actors': cA.build(),
 'stage': [{'t': 0, 'stage': 'wohnzimmer'}, {'t': t_off, 'stage': 'buero'}, {'t': c_bei, 'stage': 'wohnzimmer'}, {'t': c_alle, 'stage': 'taubenstrasse'}],
 'sfx': [{'t': 0.01, 'id': 'handy-waehlen', 'volume': 0.45}, {'t': r3(sA), 'id': 'warteschleife', 'volume': 0.55},
         {'t': r3(c_klick), 'id': 'klick', 'volume': 0.8}, {'t': r3(c_bei + sa(0.25)), 'id': 'piep', 'volume': 0.55},
         {'t': r3(t_fly0), 'id': 'fluegelschlag', 'volume': 0.75}, {'t': r3(c_und), 'id': 'laden', 'volume': 0.6}],
}

# =====================================================================================================
# Antwort B: Verhandlung am Küchentisch – Stempel – Hand + Flügel – Dachboden – Küche – Hausordnung + Putzplan
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_ende = cue(B, 'explain2', 'Am Ende'); c_steht = cue(B, 'explain2', 'steht es'); c_fest = cue(B, 'explain2', 'fest')
c_die = cue(B, 'explain2', 'Die Tauben'); c_du = cue(B, 'explain2', 'du darfst'); c_mit = cue(B, 'explain2', 'Mit Hausordnung')
t_stamp = r3(c_steht - sb(0.58)); t_hit = r3(c_steht)
t_shake = r3(max(c_fest, t_hit + sb(0.9)))
cB = Cast()
def dseat(t, motion, **kw): return K(t, *D_CHAIR, motion, 90, **kw)
def lead(t, motion, **kw): return K(t, *L_TABLE, motion, 270, y=TABLE_H, **kw)
cB.add('dummy', 0, c_die, [dseat(0, 'chairsit'), dseat(r3(sB - 0.003), 'chairsit'), dseat(sB, 'seattalk'), dseat(r3(sB + sb(1.6)), 'seattalk'),
                           dseat(r3(sB + sb(1.6) + 0.003), 'pushstack'), dseat(r3(t_stamp - 0.003), 'pushstack'), dseat(t_stamp, 'seatstamp', cut=True),
                           dseat(r3(t_shake - 0.003), 'seatstamp'), dseat(t_shake, 'seatshake'), dseat(c_die, 'seatshake')])
cB.add('taubenchef', 0, c_die, [lead(0, 'perch'), lead(r3(sB - 0.003), 'perch'), lead(sB, 'talk'), lead(r3(sB + sb(1.6)), 'talk'),
                                lead(r3(sB + sb(1.6) + 0.003), 'wingpush'), lead(r3(t_stamp - 0.003), 'wingpush'), lead(t_stamp, 'nod'),
                                lead(r3(t_shake - 0.003), 'nod'), lead(t_shake, 'wingshake'), lead(c_die, 'wingshake')])
# Mietvertrag rutscht hin und her (Schub alle 1,6 s), dann liegt er vor dem Dummy zum Stempeln
mv = [K(0, *CONTRACT_D, 'park', 90, y=TABLE_H, mark=0.0)]
t = sB + sb(1.6); side = 1
while t < t_stamp - sb(0.8):
    mv.append(K(r3(t + sb(0.15)), *(CONTRACT_L if side else CONTRACT_D), 'park', 90, y=TABLE_H)); t += sb(1.6); side ^= 1
mv += [K(r3(t_stamp - sb(0.3)), *CONTRACT_D, 'park', 90, y=TABLE_H, mark=0.0), K(r3(t_hit - 0.002), *CONTRACT_D, 'park', 90, y=TABLE_H, mark=0.0),
       K(t_hit, *CONTRACT_D, 'park', 90, y=TABLE_H, mark=1.0), K(c_die, *CONTRACT_D, 'park', 90, y=TABLE_H, mark=1.0)]
cB.add('mietvertrag', 0, c_die, mv)
cB.add('pullikissen', 0, c_die, [K(0, 0.58, 0.55, 'park', 270, y=0.45)])
# Dachboden: Tauben ordentlich in den Nestern, Anführer mit Brille
cB.add('tauben2', c_die, c_du, [flock(c_die, TXT_ATTIC)])
cB.add('taubenchef', c_die, c_du, [K(c_die, 0.15, 0.6, 'nod', 200), K(c_du, 0.15, 0.6, 'nod', 200)])
cB.add('hausordnung', c_die, 1, [K(c_die, ATTIC_DOOR[0], ATTIC_DOOR[1], 'park', 180, y=1.33)])
cB.add('putzplan', c_die, 1, [K(c_die, ATTIC_DOOR[0], ATTIC_DOOR[1], 'park', 180, y=0.72)])
# Küche: Dummy zufrieden mit Kaffee, keine Taube
cB.add('dummy', c_du, c_mit, [dseat(c_du, 'drinkcoffee'), dseat(c_mit, 'drinkcoffee')])
# Hausordnung + Putzplan an der Dachboden-Tür, Anführer daneben
cB.add('tauben2', c_mit, 1, [flock(c_mit, TXT_ATTIC)])
cB.add('taubenchef', c_mit, 1, [K(c_mit, 0.25, -1.75, 'nod', 165), K(1, 0.25, -1.75, 'nod', 165)])
camB = [
  *shot(0, sB - 0.003, M([-0.45, 1.4, 5.2], [-0.45, 0.95, 0.55], push=0.04)),
  *shot(sB, c_ende - 0.003, M([-1.75, 1.45, 1.5], [-0.15, 0.95, 0.5], push=0.1)),
  *shot(c_ende, t_shake - 0.003, M([0.15, 1.35, 2.7], [-0.5, 0.88, 0.55], push=0.08)),
  *shot(t_shake, c_die - 0.003, M([-0.4, 1.3, 3.9], [-0.42, 0.98, 0.55], push=0.1)),
  *shot(c_die, c_du - 0.003, M([0.2, 1.45, 4.3], [-0.6, 0.65, -1.2], push=0.06)),
  *shot(c_du, c_mit - 0.003, M([-0.2, 1.4, 3.6], [-0.9, 1.0, 0.5], push=0.08)),
  *shot(c_mit, 1, M([0.55, 1.15, 0.6], [0.9, 1.0, -2.17], 40, push=0.12)),
]
expB = {
 'camera': camB, 'actors': cB.build(),
 'stage': [{'t': 0, 'stage': 'wg-kueche'}, {'t': c_die, 'stage': 'dachboden'}, {'t': c_du, 'stage': 'wg-kueche'}, {'t': c_mit, 'stage': 'dachboden'}],
 'sfx': [{'t': r3(sB + sb(0.2)), 'id': 'tauben-gurren', 'volume': 0.45}, {'t': r3(sB + sb(1.75)), 'id': 'papier-schieben', 'volume': 0.5},
         {'t': r3(sB + sb(3.35)), 'id': 'papier-schieben', 'volume': 0.5}, {'t': r3(t_hit), 'id': 'stempel', 'volume': 0.9},
         {'t': r3(c_die), 'id': 'tauben-gurren', 'volume': 0.4}, {'t': r3(c_du), 'id': 'kaffee-schluerfen', 'volume': 0.5}],
}

# =====================================================================================================
# Antwort C: alle Tauben fliegen auf den Baum gegenüber – erst DANN rollt der Monstertruck über das leere Haus
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_erst = cue(C, 'explain3', 'Erst'); c_dannC = cue(C, 'explain3', 'Dann rollst'); c_kein = cue(C, 'explain3', 'Kein Haus'); c_prob = cue(C, 'explain3', 'Problem')
t_f0 = r3(c_erst + sc(0.1)); t_f1 = r3(c_dannC - sc(0.25))      # Flug fertig, bevor der Truck kommt
BIG = 1.5
SEAT = (0.0, 1.78 * BIG + 0.62, 0.05 * BIG)
def seat(t, motion, **kw): return K(t, SEAT[0], SEAT[2], motion, 0, y=SEAT[1], attach='monstertruck2', **kw)
TRUCK0 = (-14.0, 0.0)
X0, X1 = -14.0, 13.0
tD0 = r3(c_dannC); tD1 = r3(min(c_kein + sc(0.4), c_prob - sc(0.1)))
def tx(x): return tD0 + (tD1 - tD0) * (x - X0) / (X1 - X0)
truck = [K(0, *TRUCK0, 'park', 90, rumble=0.5, smoke=0.4), K(r3(tD0 - 0.003), *TRUCK0, 'park', 90, rumble=0.6, smoke=0.5),
         K(tD0, X0, HOUSE[1], 'drive', 90, tilt=0.0, rumble=0.7, smoke=0.6, cut=True),
         K(r3(tx(-4.6)), -4.6, HOUSE[1], 'drive', 90, tilt=0.0), K(r3(tx(-2.4)), -2.4, HOUSE[1], 'drive', 90, y=1.2, tilt=-9.0),
         K(r3(tx(1.2)), 1.2, HOUSE[1], 'drive', 90, y=0.8, tilt=6.0), K(r3(tx(4.6)), 4.6, HOUSE[1], 'drive', 90, y=0.0, tilt=0.0),
         K(tD1, X1, HOUSE[1], 'drive', 90, tilt=0.0), K(1, X1 + 0.6, HOUSE[1], 'park', 90, rumble=0.3)]
sq0, sq1 = r3(tx(-4.2)), r3(tx(-1.2))
cC = Cast()
cC.add('haus', 0, 1, [house(0, door=0.0), house(r3(t_f0 - 0.003), door=0.0), house(t_f0, door=1.0), house(sq0, door=1.0, squish=0.0), house(sq1, door=1.0, squish=1.0), house(1, door=1.0, squish=1.0)])
cC.add('tauben', 0, 1, [oflock(0, TXT_TO_TREE, fill=0.0, mark=0.35), flock(t_f0, TXT_TO_TREE, fill=0.0), flock(t_f1, TXT_TO_TREE, fill=1.0), flock(1, TXT_TO_TREE, fill=1.0)])
cC.add('monstertruck2', 0, 1, truck)
cC.add('dummy', 0, 1, [seat(0, 'seatdrive'), seat(r3(c_prob - 0.003), 'seatdrive'), seat(c_prob, 'seattriumph'), seat(1, 'seattriumph')])
camC = [
  *shot(0, sC - 0.003, F([[-3.6, 0, FRONT], [3.6, 7.6, FRONT], [TRUCK0[0] - 3, 0, 0], [TRUCK0[0] + 3, 4.5, 0]], -20, 8, ANS), push=0.04),
  *shot(sC, c_dannC - 0.003, F([[-3.6, 0, FRONT], [3.6, 7.6, FRONT], [TREE[0] - 2.6, 3, TREE[1]], [TREE[0] + 2.4, 5.5, TREE[1]]], 35, 10, ANS), push=0.05),
  *shot(c_dannC, c_kein - 0.003, F([[-11, 0, HOUSE[1]], [9, 7.6, HOUSE[1]], [-4, 0, -9], [4, 0, -16]], -30, 14, ANS), push=0.04),
  *shot(c_kein, c_prob - 0.003, M([3.2, 6.4, 14.5], [0.0, 0.6, HOUSE[1]], push=0.06)),
  *shot(c_prob, 1, F([[X1 + 0.6 - 4, 0, HOUSE[1] - 2.5], [X1 + 0.6 + 4, 5.5, HOUSE[1] + 2.5], [-3, 0, HOUSE[1]]], 40, 12, ANS), push=0.06),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': 'taubenstrasse',
 'sfx': [{'t': 0.01, 'id': 'monstertruck-motor', 'volume': 0.45}, {'t': r3(t_f0), 'id': 'fluegelschlag', 'volume': 0.75},
         {'t': r3(tD0), 'id': 'monstertruck-motor', 'volume': 0.65}, {'t': r3(sq0 + sc(0.1)), 'id': 'haus-knautschen', 'volume': 0.75},
         {'t': r3(c_kein + sc(0.1)), 'id': 'tauben-gurren', 'volume': 0.5}],
}
def check_c():
    """Vorgabe Inhaber: ALLE Tauben sind auf dem Baum, bevor der Truck losfährt bzw. das Haus berührt."""
    # fill = 1 bei t_f1; die langsamste Taube (Staffelung d = S) landet genau bei fill = 1 → alle sind bei t_f1 auf dem Baum
    assert t_f1 < tD0 and t_f1 < sq0, ('C: Tauben noch nicht raus!', t_f1, tD0, sq0)
    return round(t_f1 * TC - cardC, 2), round(tD0 * TC - cardC, 2), round(sq0 * TC - cardC, 2)

# =====================================================================================================
# Abstimmung + Outro: Dummy + Anführer stehen vor dem Haus, Tauben auf dem Haus
# =====================================================================================================
VD = (-0.9, -6.6); VL = (0.4, -6.5)
def endcast(wave=False):
    c = Cast()
    c.add('haus', 0, 1, [house(0)])
    c.add('tauben', 0, 1, [oflock(0, TXT_HOUSE)])
    c.add('dummy', 0, 1, [K(0, *VD, 'stand', 180, question=0.0 if wave else 1.0)] + ([K(0.12, *VD, 'wave', 180), K(1, *VD, 'wave', 180)] if wave else []))
    c.add('taubenchef', 0, 1, [K(0, *VL, 'perch' if not wave else 'flap', 190)])
    return c.build()
V_PTS = [[VD[0] - 0.4, 0, VD[1]], [VL[0] + 0.4, 1.95, VL[1]], [-3.6, 0.8, FRONT], [3.6, 3.2, FRONT]]
vote = {'camera': shot(0, 1, F(V_PTS, 8, 4, (120, 960, 1060, 1320), push=0.04)), 'actors': endcast(), 'stage': 'taubenstrasse'}
O_PTS = [[VD[0] - 0.4, 0, VD[1]], [VL[0] + 0.4, 1.95, VL[1]], [-3.6, 0.8, FRONT], [3.6, 3.2, FRONT]]
outro = {'camera': shot(0, 1, F(O_PTS, 10, 6, (100, 980, 780, 1110), push=0.05)), 'actors': endcast(True), 'stage': 'taubenstrasse'}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Tauben haben mal wieder dein Haus eingenommen – was machst du? 🐦 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Den Tauben ist nichts passiert. 😄\n\n"
        "#waswürdestdutun #tauben #birdsarentreal #haus #monstertruck #spezial #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'taubenstrasse', 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy ruft eine anonyme Hotline an, Warteschleife; ein Regierungs-Dummy im dunklen Anzug mit Sonnenbrille geht ran, nickt und drückt einen Knopf. Bei jeder Taube blinkt ein kleines rotes Licht, alle fliegen gleichzeitig raus und setzen sich in einer Reihe auf die Stromleitung; über ihnen erscheint ein Lade-Symbol.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy und der Tauben-Anführer (Krawatte, Lesebrille) verhandeln am Küchentisch, der Mietvertrag wird hin und her geschoben, ein Stempel knallt drauf, sie schütteln Hand und Flügel. Danach wohnen die Tauben ordentlich auf dem Dachboden (Hausordnung + Putzplan an der Tür), der Dummy sitzt zufrieden mit Kaffee in seiner Küche.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Erst fliegen alle Tauben aus dem Haus auf einen Baum gegenüber, im Haus ist niemand mehr. Dann rollt der Dummy im Monstertruck über sein eigenes, leeres Haus (comichaft platt). Die Tauben schauen vom Baum aus zu.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Kommentieren & folgen!', 'extra': 'Neue Video-Ideen? Ab in die Kommentare!', 'extraCue': 'Neue Video-Ideen'},
 'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team ___. Und du? 👇'},
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
print('C (s in der Szene): Tauben alle gelandet', check_c(), '= gelandet / Truck fährt los / Haus wird platt')
print('A: Knopf-Treffer', round(c_klick * TA - cardA, 2), 'Büro ab', round(t_off * TA - cardA, 2), '| B: Stempel', round(t_hit * TB - cardB, 2), 'Hand+Flügel', round(t_shake * TB - cardB, 2))
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
