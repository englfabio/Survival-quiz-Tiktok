# Hilfsskript: erzeugt scenarios/spezial-legostein.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-legostein-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-handy-gesicht.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, slapstickartig, Low-Poly-Cartoon-Stil, KEINE Verletzungen, kein Blut, keine Logos
# (Steine ohne Schrift auf den Noppen; „Lego“ nur gesprochen).
# Bühne: großes Wohnzimmer "wohnzimmer-lego" (src/stage/TrashLiving.tsx: WZG + Haustür-Wand + Möbel, barfuß).
#  Situation: Dummy läuft ahnungslos durchs Zimmer → tritt auf den einzelnen Stein (Schmerz-Symbol) → katapultiert sich fast bis an die
#             Decke → landet, hüpft auf einem Bein + Fragezeichen.
#  KARTEN verraten nichts (Wunsch Inhaber: Antwort nicht spoilern, Bild zeigt erst in der Szene, was passiert):
#   A-Karte: sitzt auf dem Teppich, hält den Fuß.  B-Karte: trägt eine Kiste herein.  C-Karte: zeigt erschrocken auf den Stein am Boden.
#  A: Seil um den Oberschenkel → Riesen-Spielzeugschere (schnappt nur in der Luft) → hält sie weit vor sich schräg nach unten (≥ 0,5 m Abstand
#     zum Bein, keine Berührung) → „Logik pur“: Schere auf der Schulter, Daumen hoch. Bein bleibt die ganze Zeit heil.
#  B: kippt die Kiste aus → Steinberg wächst → steigt drauf → steht wie ein Fakir, ganz entspannt.
#  C: Absperrband rundherum + Schild „SPERRGEBIET“ → Totale → Seilrutsche vom Sofa quer über das abgesperrte Zimmer.
# Spezial-Regeln: 61–66 s, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-legostein'
S = dict(
situation="Du bist mal wieder auf ein Legosteinchen getreten. Der Schmerz fährt dir bis ins nächste Jahrhundert. Was machst du?",
o1c="Bein abbinden und abschneiden", o1s="A: Du bindest dein Bein ab und schneidest es ab, damit die Schmerzen aufhören.",
o2c="Berg aus Steinen unter die Füße", o2s="B: Du legst ganz viele Steine unter den Fuß, weil sie in Summe nicht wehtun.",
o3c="Sperrgebiet per Seilrutsche", o3s="C: Du erklärst das Wohnzimmer zum Sperrgebiet und bewegst dich nur noch per Seilrutsche.",
e1="Rotes Seil drum, riesige Schere raus. Wenn das Bein weg ist, tut auch nichts mehr weh. Logik pur.",
e2="Ein ganzer Berg voller Steine unter beide Füße. Verteilt tut es plötzlich gar nicht mehr weh. Genialer Trick.",
e3="Absperrband drum, Schild dran. Das Wohnzimmer ist jetzt Sperrgebiet. Ab sofort geht es nur noch per Seilrutsche durch den Raum.",
vote="Also, was machst du?",
# Outro des Inhabers Buchstabe für Buchstabe + (Spezial-Regel 5, Wunsch Inhaber) angehängt: „Neue Video-Ideen? Ab in die Kommentare!“
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr. Neue Video-Ideen? Ab in die Kommentare!",
)
EXTRA = {1: float(os.environ.get('EXA', 0.0)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.0))}
TAIL = float(os.environ.get('TAIL', 0.05))
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))
VOTE_LEN = float(os.environ.get('VOTE_LEN', 5.0))
NO_VOTE = os.environ.get('NO_VOTE', '0') == '1'
SCENE_LEAD = float(os.environ.get('SCENE_LEAD', 0.3))

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': SCENE_LEAD, 'explain2': SCENE_LEAD, 'explain3': SCENE_LEAD, 'countdown': 0.1, 'outro': 0.3}
MINLEN = {'situation': 5, 'option1': 3.6, 'option2': 3.6, 'option3': 3.6, 'explain1': 6, 'explain2': 6, 'explain3': 6, 'countdown': 5, 'outro': 3}
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
def MAN(pos, look, fov=None, push=0.05):
    return (list(pos), list(look), fov, push)
def shot(t0, t1, f, push=None):
    c, l, fv, p = f
    p = p if push is None else push
    c2 = [c[i] + (l[i] - c[i]) * p for i in range(3)]
    return [cam(t0, c, l, fv), cam(r3(t1), c2, l, fv)]
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)
def rot(face, lx, lz):
    """lokale Koordinaten (x: + = links der Figur, z vorn) einer Figur mit Blickrichtung face → Welt-Versatz (dx, dz)"""
    th = math.radians(180 - face)
    return lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th)
def W(pos, face, local):
    """Weltpunkt eines lokalen Punkts [x, y, z] der Figur bei pos (x, z) mit Blickrichtung face"""
    dx, dz = rot(face, local[0], local[2])
    return [pos[0] + dx, local[1], pos[1] + dz]
def ease(u):
    u = max(0.0, min(1.0, u)); return 0.5 - 0.5 * math.cos(math.pi * u)
def lerp(a, b, u):
    return [a[i] + (b[i] - a[i]) * u for i in range(len(a))]

class Cast:
    """Sichtbarkeit je Einstellung: Figur nur in [t0, t1] zeigen, sonst y −30 (wie spezial-handy-gesicht)"""
    def __init__(self): self.parts = {}
    def add(self, name, t0, t1, keys): self.parts.setdefault(name, []).append((r3(t0), r3(t1), keys))
    def build(self):
        out = {}
        for name, parts in self.parts.items():
            parts.sort(key=lambda p: p[0]); ks = []
            for pi, (t0, t1, keys) in enumerate(parts):
                keys = sorted(keys, key=lambda k: k['t'])
                if len(keys) == 1:
                    k2 = dict(keys[0]); k2['t'] = t1; k2.pop('cut', None); keys = keys + [k2]
                first = dict(keys[0]); last = dict(keys[-1])
                joinP = pi > 0 and parts[pi - 1][1] >= t0 - 0.004
                joinN = pi + 1 < len(parts) and parts[pi + 1][0] <= t1 + 0.004
                if joinP:
                    keys[0] = dict(keys[0]); keys[0]['cut'] = True
                if joinN:
                    keys[-1] = dict(keys[-1]); keys[-1]['t'] = r3(t1 - 0.0015)
                    t1 = r3(t1 - 0.0015)
                if t0 > 0 and not joinP:
                    h = dict(first); h['t'] = r3(max(0, t0 - 0.002)); h['y'] = HIDE; h.pop('attach', None); h.pop('cut', None)
                    h['hand'] = 0
                    ks.append(h)
                for k in keys:
                    k = dict(k); k['t'] = r3(min(max(k['t'], t0), t1)); ks.append(k)
                if keys[-1]['t'] < t1 - 1e-4:
                    k = dict(keys[-1]); k['t'] = r3(t1); k.pop('cut', None); ks.append(k)
                if t1 < 1 and not joinN:
                    h = dict(last); h['t'] = r3(min(1, t1 + 0.002)); h['y'] = HIDE; h.pop('attach', None); h.pop('cut', None)
                    h['hand'] = 0
                    ks.append(h)
            if parts[0][0] > 0:
                h = dict(ks[0]); h['t'] = 0.0; h['y'] = HIDE
                h['hand'] = 0
                ks.insert(0, h)
            ks.sort(key=lambda k: k['t'])
            out[name] = ks
        return out

# =====================================================================================================
# feste Plätze (Bühne wohnzimmer-lego; Möbel LIVING_BIG in MuellProps.tsx; Seilrutsche ZIP + Schere/Kiste in LegoProps.tsx;
# Bewegungen legoPose / LEGO / tubPour in Dummy.tsx)
# =====================================================================================================
STAGE = 'wohnzimmer-lego'
ZIP = dict(a=[-5.46, 3.06, 1.4], b=[5.46, 2.86, 1.4], start=-4.59, end=3.9, handle=0.42, hip=1.38)
def zip_y(x):
    u = (x - ZIP['a'][0]) / (ZIP['b'][0] - ZIP['a'][0]); return ZIP['a'][1] + (ZIP['b'][1] - ZIP['a'][1]) * u
ZIP_HANDS = [0.17, 1.95, 0.03]
TAPE_C = (0.0, 0.5); TAPE_SIZE = 1.9; TAPE_A = 1.4 + TAPE_SIZE     # Absperrband-Quadrat x −3.3 … 3.3, z −2.8 … 3.8
TAPE_H = 0.92
ARMREST = (-4.6, 1.4); ARM_Y = 0.66                                  # Sofa-Armlehne (Start der Seilrutsche)
BRICK_SIZE = 0.3                                                      # einzelner Stein etwas größer (gut sichtbar)
SCI = dict(show=dict(p=[0, 1.36, 0.478], tilt=-70.0), aim=dict(p=[0, 0.865, 0.567], tilt=30.0), proud=dict(p=[-0.225, 1.427, 0.075], tilt=-120.0))
TUB_L = [0, 0.95, 0.45]
def tub_pour(t):
    k1 = ease(t / 0.7); k2 = ease((t - 0.7) / 0.7)
    return dict(y=0.95 + 0.32 * k1, z=0.45 + 0.1 * k1, tilt=110 * k2)
PILE_TOP = 0.33
def body(x, z, h=1.95, w=0.42, y=0.0):
    return [[x - w, y, z - w * 0.6], [x + w, y + h, z + w * 0.6]]
def brick(t, p, glow=0.0, **kw):
    return K(t, p[0], p[1], 'park', 30, size=BRICK_SIZE, glow=glow, **kw)

# =====================================================================================================
# Situation: läuft ahnungslos → tritt auf den Stein → Katapult bis fast an die Decke → hüpft auf einem Bein + Fragezeichen
# =====================================================================================================
L0 = 'situation'
TS = seclen(L0); ss = lambda s: s / TS
c_get = cue(L0, 'situation', 'getreten'); c_der = cue(L0, 'situation', 'Der Schmerz'); c_jahr = cue(L0, 'situation', 'Jahrhundert'); c_was = cue(L0, 'situation', 'Was machst')
STEP = (1.25, 0.95); FS = 190.0                                      # hier tritt er drauf (Hüfte), Blick Richtung Kamera
WALK0 = W(STEP, FS, [0, 0, -2.2]); WALK0 = (WALK0[0], WALK0[2])
BRICK = W(STEP, FS, [-0.105, 0, 0.34]); BRICK = (BRICK[0], BRICK[2])  # Stein genau unter dem rechten Fuß beim Auftreten
t_flinch = r3(max(ss(2.0), c_get - ss(0.38)))                       # Fuß setzt bei 0,38 s auf → auf „getreten“
t_contact = r3(t_flinch + ss(0.38))
t_jump = r3(max(c_der - ss(0.05), t_contact + ss(0.45)))
Y_TOP = 1.5                                                           # Füße 1,5 m hoch → Kopf ca. 3,4 m (Decke 3,8 m)
t_peak = r3(t_jump + ss(0.55)); t_hang = r3(max(t_peak + ss(0.5), c_jahr + ss(0.2))); t_land = r3(t_hang + ss(0.45))
cs_ = Cast()
dS = [K(0, *WALK0, 'walk', FS), K(r3(t_flinch - 0.002), *STEP, 'walk', FS),
      K(t_flinch, *STEP, 'stepflinch', FS, pain=0.0), K(r3(t_contact), *STEP, 'stepflinch', FS, pain=0.0), K(r3(t_contact + ss(0.25)), *STEP, 'stepflinch', FS, pain=1.4),
      K(r3(t_jump - 0.002), *STEP, 'stepflinch', FS, pain=1.6)]
# Katapult: hoch (schnell), oben zappeln, runter
for i in range(0, 7):
    u = i / 6
    dS.append(K(r3(t_jump + (t_peak - t_jump) * u), *STEP, 'brickjump', FS, y=round(Y_TOP * (1 - (1 - u) ** 2), 3), pain=1.8, **({'cut': True} if i == 0 else {})))
dS.append(K(r3(t_hang), *STEP, 'brickjump', FS, y=Y_TOP - 0.08, pain=2.0))
for i in range(1, 6):
    u = i / 5
    dS.append(K(r3(t_hang + (t_land - t_hang) * u), *STEP, 'brickjump', FS, y=round((Y_TOP - 0.08) * (1 - u * u), 3), pain=2.0))
HOP = W(STEP, FS, [0.1, 0, 0.35]); HOP = (HOP[0], HOP[2])
dS += [K(r3(t_land + 0.002), *STEP, 'hop', FS, pain=2.0, cut=True), K(r3(c_was), *HOP, 'hop', FS, pain=1.8, question=0.0),
       K(r3(c_was + ss(0.35)), *HOP, 'hop', FS, pain=1.8, question=1.0), K(1, *HOP, 'hop', FS, pain=1.8, question=1.0)]
cs_.add('dummy', 0, 1, dS)
cs_.add('klemmstein', 0, 1, [brick(0, BRICK, 0.0), brick(r3(t_flinch - ss(0.6)), BRICK, 1.0), brick(r3(t_contact + ss(0.3)), BRICK, 0.6), brick(1, BRICK, 0.6)])
FOOT_W = [BRICK[0], 0.05, BRICK[1]]
cs_.add('klatschstern', t_contact, r3(t_contact + ss(0.45)), [K(t_contact, FOOT_W[0], FOOT_W[2], 'park', 0, y=0.18, fill=0.0, size=-0.3), K(r3(t_contact + ss(0.45)), FOOT_W[0], FOOT_W[2], 'park', 0, y=0.18, fill=1.0, size=-0.3)])
WALK_PTS = [[WALK0[0] - 0.4, 0, WALK0[1] - 0.3], [STEP[0] + 0.4, 1.95, STEP[1] + 0.5], [BRICK[0], 0, BRICK[1]]]
FOOT_PTS = [[BRICK[0] - 0.35, 0.0, BRICK[1] - 0.25], [BRICK[0] + 0.35, 0.55, BRICK[1] + 0.25]]
JUMP_PTS = [[STEP[0] - 0.9, 0, STEP[1] - 0.4], [STEP[0] + 0.9, 3.75, STEP[1] + 0.4]]
HOP_PTS = [*body(*HOP), [HOP[0], 2.5, HOP[1]], [BRICK[0], 0, BRICK[1]]]
situation = {
 'camera': [
   # ahnungslos durchs Zimmer: von vorn halbhoch, ganzer Weg + Stein am Boden
   *shot(0, t_contact - 0.003, F(WALK_PTS, -28, 12, SIT), push=0.06),
   # Auftreten: ganz nah, tief am Boden (Fuß + Stein + Klatsch-Stern)
   *shot(t_contact, t_jump - 0.003, F(FOOT_PTS, -35, 14, (160, 920, 520, 1200)), push=0.05),
   # Katapult: tief von vorn, Boden bis Decke
   *shot(t_jump, t_land + ss(0.1), F(JUMP_PTS, -22, -4, SIT), push=0.03),
   # Was machst du? hüpft auf einem Bein, Fragezeichen
   *shot(r3(t_land + ss(0.1) + 0.003), 1, F(HOP_PTS, -18, 8, SIT), push=0.05),
 ],
 'actors': cs_.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_contact), 'id': 'stein-pieks', 'volume': 1.0}, {'t': r3(t_jump), 'id': 'katapult-sprung', 'volume': 0.9},
         {'t': r3(t_land), 'id': 'kissen-plumps', 'volume': 0.5}],
}

# =====================================================================================================
# Antwort A: Karte = sitzt auf dem Teppich, hält den Fuß (verrät nichts). Szene = Seil um den Oberschenkel → Riesen-Spielzeugschere
#            schnappt in der Luft → hält sie weit vor sich schräg nach unten (keine Berührung) → Schere auf der Schulter, Daumen hoch
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_ries = cue(A, 'explain1', 'riesige'); c_wenn = cue(A, 'explain1', 'Wenn'); c_tut = cue(A, 'explain1', 'tut auch'); c_log = cue(A, 'explain1', 'Logik')
SITA = (-1.7, 0.75); FSA = 150.0
DA = (0.4, 1.0); FA = 160.0
cA = Cast()
cA.add('dummy', 0, sA, [K(0, *SITA, 'holdfoot', FSA, pain=1.6), K(sA, *SITA, 'holdfoot', FSA, pain=1.6)])
t_wrap1 = r3(min(c_ries - sa(0.1), sA + sa(1.7)))
cA.add('dummy', sA, c_ries, [K(sA, *DA, 'ropewrap', FA, angry=0.8, redrope=0.0, pain=0.0, cut=True), K(r3(sA + sa(0.25)), *DA, 'ropewrap', FA, redrope=0.05),
                             K(t_wrap1, *DA, 'ropewrap', FA, redrope=1.0, angry=0.8), K(c_ries, *DA, 'ropewrap', FA, redrope=1.0)])
cA.add('dummy', c_ries, c_wenn, [K(c_ries, *DA, 'scissorshow', FA, redrope=1.0, angry=0.8), K(c_wenn, *DA, 'scissorshow', FA, redrope=1.0, angry=0.8)])
cA.add('dummy', c_wenn, c_log, [K(c_wenn, *DA, 'scissorsaim', FA, redrope=1.0, angry=0.9), K(c_log, *DA, 'scissorsaim', FA, redrope=1.0, angry=0.9)])
cA.add('dummy', c_log, 1, [K(c_log, *DA, 'scissorsproud', FA, redrope=1.0, angry=0.0, pain=0.0), K(1, *DA, 'scissorsproud', FA, redrope=1.0, angry=0.0, pain=0.0)])
def sci(t, mode, fill=0.0, glow=0.0, **kw):
    c = SCI[mode]
    return K(t, c['p'][0], c['p'][2], 'park', 0, y=c['p'][1], attach='dummy', tilt=c['tilt'], fill=fill, glow=glow, turn=0.0, size=0.0, **kw)
# Schere ploppt bei „riesige“ in die Hände, schnappt zweimal IN DER LUFT
t_pop = r3(c_ries + sa(0.12))
sk = [sci(t_pop, 'show', 0.0)]
for j, f in enumerate([1.0, 0.1, 1.0, 0.0]):
    sk.append(sci(r3(t_pop + sa(0.35 + 0.22 * j)), 'show', f))
sk.append(sci(r3(c_wenn - 0.002), 'show', 0.0))
cA.add('riesenschere', t_pop, c_wenn, sk)
cA.add('riesenschere', c_wenn, c_log, [sci(c_wenn, 'aim', 0.0, cut=True), sci(r3(c_wenn + sa(0.5)), 'aim', 0.85), sci(c_log, 'aim', 0.85)])
cA.add('riesenschere', c_log, 1, [sci(c_log, 'proud', 0.0, glow=0.0, cut=True), sci(r3(c_log + sa(0.4)), 'proud', 0.0, glow=1.0), sci(1, 'proud', 0.0, glow=1.0)])
def check_a():
    """Schere bei „Wenn das Bein weg ist“: Klingenspitze weit vor dem Körper (≥ 0,5 m vor dem Schienbein), schnappt nur in der Luft."""
    c = SCI['aim']; th = math.radians(c['tilt'])
    tip = [c['p'][0], c['p'][1] - 0.5 * math.sin(th), c['p'][2] + 0.5 * math.cos(th)]
    shin_z = 0.25                                                    # rechtes Knie/Schienbein beim Vorbeugen höchstens ca. 0,25 m vor der Hüfte
    assert tip[2] - shin_z >= 0.5, ('A: Schere zu nah am Bein', tip)
    show = SCI['show']; th2 = math.radians(show['tilt'])
    tip2 = [0, show['p'][1] - 0.5 * math.sin(th2), show['p'][2] + 0.5 * math.cos(th2)]
    assert tip2[1] > 1.4, ('A: Schere schnappt nicht in der Luft', tip2)
    return round(tip[2] - shin_z, 2)
DUM_A = [[DA[0] - 0.5, 0, DA[1] - 0.4], [DA[0] + 0.5, 1.95, DA[1] + 0.4]]
THIGH_W = W(DA, FA, [-0.105, 0.62, 0.1])
SCI_SHOW_W = W(DA, FA, [0, 1.85, 0.6])
TIP_AIM_W = W(DA, FA, [0, 0.62, 1.0])
camA = [
  # Karte: sitzt auf dem Teppich und hält den Fuß (Schmerz-Symbol)
  *shot(0, sA - 0.003, F([[SITA[0] - 0.5, 0, SITA[1] - 0.6], [SITA[0] + 0.6, 1.15, SITA[1] + 0.6]], -20, 14, ANS), push=0.04),
  # Rotes Seil drum: nah auf das Bein + Hände (leicht von oben)
  *shot(sA, c_ries - 0.003, F([[THIGH_W[0] - 0.45, 0.2, THIGH_W[2] - 0.35], [THIGH_W[0] + 0.45, 1.75, THIGH_W[2] + 0.35]], -25, 12, ANS), push=0.05),
  # riesige Schere raus: von vorn, Schere vor dem Gesicht
  *shot(c_ries, c_wenn - 0.003, F([*DUM_A, SCI_SHOW_W], 15, 6, ANS), push=0.05),
  # Wenn das Bein weg ist …: von der Seite – Schere weit vor dem Körper, Abstand zum Bein gut sichtbar
  *shot(c_wenn, c_log - 0.003, F([*DUM_A, TIP_AIM_W], 80, 8, ANS), push=0.04),
  # Logik pur: Schere auf der Schulter, Daumen hoch, Bein mit Schleife heil
  *shot(c_log, 1, F([*DUM_A, W(DA, FA, [-0.3, 2.0, 0])], -10, 6, ANS), push=0.05),
]
expA = {
 'camera': camA, 'actors': cA.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sA + sa(0.2)), 'id': 'seil-wickeln', 'volume': 0.9}, {'t': r3(t_pop), 'id': 'plopp', 'volume': 0.6},
         {'t': r3(t_pop + sa(0.33)), 'id': 'schere-schnapp', 'volume': 0.9}, {'t': r3(c_log + sa(0.3)), 'id': 'himmel-chor', 'volume': 0.3}],
}

# =====================================================================================================
# Antwort B: Karte = trägt eine Kiste herein (verrät nichts). Szene = kippt sie aus, Steinberg wächst → steigt drauf → Fakir
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_ver = cue(B, 'explain2', 'Verteilt'); c_pl = cue(B, 'explain2', 'plötzlich'); c_gen = cue(B, 'explain2', 'Genialer')
DB = (0.9, 0.25); FBd = 180.0
PILE = W(DB, FBd, [0, 0, 1.12]); PILE = (PILE[0], PILE[2])
CARRY0 = W(DB, FBd, [0.2, 0, -2.3]); CARRY0 = (CARRY0[0], CARRY0[2])
cB = Cast()
cB.add('dummy', 0, sB, [K(0, *CARRY0, 'tubcarry', FBd, pain=1.0), K(r3(sB * 0.9), *DB, 'tubcarry', FBd, pain=1.0), K(sB, *DB, 'tubcarry', FBd, pain=1.0)])
def tubk(t, y=0.95, z=0.45, tilt=0.0, fill=1.0, mark=0.0, **kw):
    return K(t, 0, z, 'park', 0, y=y, attach='dummy', tilt=tilt, fill=fill, mark=mark, drop=y, **kw)
cB.add('steinkiste', 0, sB, [tubk(0), tubk(sB)])
# Auskippen (tubpour ab sB): Heben 0–0,7 s, Kippen 0,7–1,4 s, Strom ab ca. 1,1 s, Berg wächst bis kurz vor „Verteilt“
t_p0 = r3(sB + sb(0.05))
t_pend = r3(max(t_p0 + sb(2.3), c_ver - sb(0.15)))
tk = []
for i in range(0, 11):
    tt = 1.5 * i / 10
    pp = tub_pour(tt)
    tk.append(tubk(r3(t_p0 + sb(tt)), y=round(pp['y'], 3), z=round(pp['z'], 3), tilt=round(pp['tilt'], 1), fill=1.0, mark=0.0, **({'cut': True} if i == 0 else {})))
t_s0 = r3(t_p0 + sb(1.1))
tk[-1]['mark'] = 1.0
pp = tub_pour(1.5)
tk += [tubk(r3(t_pend - sb(0.25)), y=round(pp['y'], 3), z=round(pp['z'], 3), tilt=110.0, fill=0.0, mark=1.0), tubk(t_pend, y=round(pp['y'], 3), z=round(pp['z'], 3), tilt=110.0, fill=0.0, mark=0.0)]
cB.add('steinkiste', sB, t_pend, tk)
cB.add('dummy', sB, t_pend, [K(sB, *DB, 'tubpour', FBd, pain=1.0, cut=True), K(t_pend, *DB, 'tubpour', FBd, pain=1.0)])
# Kiste leer neben ihm abgestellt
TUB_SET = W(DB, FBd, [0.75, 0, 0.1]); TUB_SET = (TUB_SET[0], TUB_SET[2])
cB.add('steinkiste', t_pend, 1, [K(t_pend, *TUB_SET, 'park', FBd, y=0.25, tilt=0.0, fill=0.0, mark=0.0)])
cB.add('steinberg', sB, 1, [K(sB, *PILE, 'park', 0, fill=0.0), K(t_s0, *PILE, 'park', 0, fill=0.0), K(r3(t_pend - sb(0.1)), *PILE, 'park', 0, fill=1.0), K(1, *PILE, 'park', 0, fill=1.0)])
# steigt hinauf (Weg + Höhe), steht vorsichtig, dann Fakir
t_up1 = r3(min(c_pl - sb(0.1), t_pend + sb(1.0)))
cB.add('dummy', t_pend, c_gen, [K(t_pend, *DB, 'stand', FBd, pain=1.0), K(r3(t_pend + sb(0.25)), *DB, 'walk', FBd, pain=0.6),
                                K(t_up1, *PILE, 'walk', FBd, y=PILE_TOP, pain=0.0), K(r3(t_up1 + sb(0.05)), *PILE, 'stand', FBd, y=PILE_TOP),
                                K(c_gen, *PILE, 'stand', FBd, y=PILE_TOP)])
cB.add('dummy', c_gen, 1, [K(c_gen, *PILE, 'fakir', FBd, y=PILE_TOP, breath=0.35), K(1, *PILE, 'fakir', FBd, y=PILE_TOP, breath=0.35)])
def check_b():
    """Dummy steht beim Fakir mitten auf dem Berg (Füße innerhalb der flachen Standfläche r < 0,42 m)."""
    assert math.hypot(PILE[0] - PILE[0], PILE[1] - PILE[1]) < 0.42
    assert t_pend < c_ver + 0.02, ('B: Auskippen dauert zu lang', t_pend, c_ver)
    return round((c_ver - t_pend) * TB, 2)
PILE_PTS = [[PILE[0] - 0.85, 0, PILE[1] - 0.85], [PILE[0] + 0.85, 0.4, PILE[1] + 0.85]]
camB = [
  # Karte: trägt die Kiste herein (Totale, Flur-Ecke mit Haustür im Hintergrund)
  *shot(0, sB - 0.003, F([*body(*CARRY0), *body(*DB)], -12, 10, ANS), push=0.04),
  # Auskippen: schräg von vorn, Kiste + wachsender Berg
  *shot(sB, c_ver - 0.003, F([*body(*DB), [DB[0], 2.2, DB[1]], *PILE_PTS], -40, 14, ANS), push=0.05),
  # Verteilt: tief seitlich, Füße auf den Steinen
  *shot(c_ver, c_gen - 0.003, F([*PILE_PTS, *body(*PILE, y=PILE_TOP)], 55, 6, ANS), push=0.05),
  # Genialer Trick: Fakir von vorn, leicht von unten
  *shot(c_gen, 1, F([*PILE_PTS, *body(*PILE, y=PILE_TOP)], -15, 2, ANS), push=0.05),
]
expB = {
 'camera': camB, 'actors': cB.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_s0 - sb(0.1)), 'id': 'steine-schuetten', 'volume': 1.0}, {'t': r3(t_pend + sb(0.1)), 'id': 'paket-abstellen', 'volume': 0.4},
         {'t': r3(t_up1 - sb(0.3)), 'id': 'klemmstein-klick', 'volume': 0.5}, {'t': r3(c_gen + sb(0.1)), 'id': 'zen-gong', 'volume': 0.8}],
}

# =====================================================================================================
# Antwort C: Karte = zeigt erschrocken auf den Stein am Boden (verrät nichts). Szene = Absperrband + Schild → Totale Sperrgebiet →
#            Seilrutsche von der Sofa-Armlehne quer über das abgesperrte Zimmer
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_sch = cue(C, 'explain3', 'Schild'); c_das = cue(C, 'explain3', 'Das Wohnzimmer'); c_ab = cue(C, 'explain3', 'Ab sofort'); c_seil = cue(C, 'explain3', 'Seilrutsche')
STONE_C = (0.3, 0.9)
DCc = (-0.95, 2.75); FCc = face_to(DCc, STONE_C)
cC = Cast()
cC.add('dummy', 0, sC, [K(0, *DCc, 'spotpoint', FCc, pain=0.6), K(sC, *DCc, 'spotpoint', FCc, pain=0.6)])
cC.add('klemmstein', 0, 1, [brick(0, STONE_C, 1.0), brick(1, STONE_C, 1.0)])
# Absperrband zieht sich in einem Rutsch rundherum, Schild ploppt auf
t_t1 = r3(min(c_sch - sc(0.05), sC + sc(1.3)))
cC.add('absperrband', sC, 1, [K(sC, *TAPE_C, 'park', 0, size=TAPE_SIZE, fill=0.0), K(r3(sC + sc(0.1)), *TAPE_C, 'park', 0, size=TAPE_SIZE, fill=0.0),
                              K(t_t1, *TAPE_C, 'park', 0, size=TAPE_SIZE, fill=1.0), K(1, *TAPE_C, 'park', 0, size=TAPE_SIZE, fill=1.0)])
SIGN = (TAPE_C[0] + 0.0, TAPE_C[1] + TAPE_A)
t_sg = r3(c_sch + sc(0.05))
cC.add('sperrschild', t_sg, 1, [K(t_sg, *SIGN, 'park', 180, y=TAPE_H + 0.03, fill=0.0), K(r3(t_sg + sc(0.45)), *SIGN, 'park', 180, y=TAPE_H + 0.03, fill=1.0, rumble=0.5), K(1, *SIGN, 'park', 180, y=TAPE_H + 0.03, fill=1.0, rumble=0.2)])
DCW = (-4.0, 4.3)                                                     # steht draußen vor dem Band (vorn links), Arme verschränkt
cC.add('dummy', sC, c_ab, [K(sC, *DCW, 'armscross', 160, cut=True, pain=0.0), K(c_ab, *DCW, 'armscross', 160)])
# Seilrutsche: steht auf der Sofa-Armlehne, Hände an der Griffstange, fährt quer durchs Zimmer, Beine angezogen
t_go = r3(c_ab + sc(0.35)); t_arr = r3(min(0.985, t_go + sc(2.6)))
X0 = ZIP['start'] - ZIP_HANDS[2]; X1 = ZIP['end'] - ZIP_HANDS[2]
def ride_y(xd):
    return zip_y(xd + ZIP_HANDS[2]) - ZIP['handle'] - ZIP_HANDS[1]
zk = [K(0, 0, 0, 'park', 180, fill=0.0), K(t_go, 0, 0, 'park', 180, fill=0.0)]
dz = [K(c_ab, X0, ZIP['a'][2], 'zipride', 90, y=round(ride_y(X0), 3), cut=True, pain=0.0), K(t_go, X0, ZIP['a'][2], 'zipride', 90, y=round(ride_y(X0), 3))]
NZ = 16
for i in range(1, NZ + 1):
    u = i / NZ; uu = ease(u) * 0.75 + u * 0.25
    xd = X0 + (X1 - X0) * uu
    tt = r3(t_go + (t_arr - t_go) * u)
    zk.append(K(tt, 0, 0, 'park', 180, fill=round(uu, 4), rumble=round(0.6 * math.sin(math.pi * u), 3)))
    dz.append(K(tt, round(xd, 3), ZIP['a'][2], 'zipride', 90, y=round(ride_y(xd), 3)))
zk.append(K(1, 0, 0, 'park', 180, fill=1.0, rumble=0.4))
dz.append(K(1, round(X1, 3), ZIP['a'][2], 'zipride', 90, y=round(ride_y(X1), 3)))
cC.add('seilrutsche', 0, 1, zk)
cC.add('dummy', c_ab, 1, dz)
def check_c():
    """Seilrutsche: Start auf der Armlehne, Füße/Knie während der ganzen Fahrt über dem Absperrband (≥ 0,92 m + Luft), Ende vor dem Fernseher."""
    y0 = ride_y(X0)
    assert abs(y0 - ARM_Y) < 0.05, ('C: Start nicht auf der Armlehne', y0)
    lo = min(ride_y(X0 + (X1 - X0) * k / 40) + 0.98 - 0.45 for k in range(41))   # Füße hängen max. ca. 0,45 m unter der Hüfte (Beine angezogen)
    assert lo > TAPE_H + 0.05, ('C: Füße zu tief über dem Band', lo)
    assert X1 + 0.5 < 4.62, ('C: Knie stoßen an den Fernseher', X1)
    assert t_arr < 0.99, ('C: Fahrt endet nicht im Bild', t_arr)
    return round(lo, 2)
def dummy_x(t):
    ks = [k for k in dz]
    if t <= ks[0]['t']: return ks[0]['x']
    for a, b in zip(ks, ks[1:]):
        if a['t'] <= t <= b['t']:
            u = (t - a['t']) / max(1e-6, b['t'] - a['t']); return a['x'] + (b['x'] - a['x']) * u
    return ks[-1]['x']
def track_c(t0):
    """mitfahrende Kamera vorn vor dem Zimmer (Kamera-Zeitpunkte liegen wie bei cam() auf der geglätteten Zeitachse te())"""
    out = []
    n = 12
    for i in range(n + 1):
        rt = t0 + (1 - t0) * i / n
        x = dummy_x(rt)
        out.append(cam(rt, [x - 1.1, 0.95, 8.6], [x + 0.2, 1.55, 1.4]))
    return out
ROOM_PTS = [[-TAPE_A, 0, TAPE_C[1] - TAPE_A], [TAPE_A, 0, TAPE_C[1] + TAPE_A], [ZIP['a'][0] + 0.6, 3.0, 1.4], [ZIP['b'][0] - 0.6, 2.8, 1.4]]
camC = [
  # Karte: zeigt erschrocken auf den funkelnden Stein am Boden
  *shot(0, sC - 0.003, F([*body(*DCc), [STONE_C[0], 0, STONE_C[1]]], -55, 10, ANS), push=0.04),
  # Absperrband drum, Schild dran: von vorn oben, Band + Schild + Dummy draußen
  *shot(sC, c_das - 0.003, F([[-TAPE_A, 0, TAPE_C[1] - 1.0], [TAPE_A, 0, TAPE_C[1] + TAPE_A], *body(*DCW)], -8, 26, ANS), push=0.04),
  # Das Wohnzimmer ist jetzt Sperrgebiet: hohe Totale, ganzes abgesperrtes Zimmer + Seil darüber
  *shot(c_das, c_ab - 0.003, F(ROOM_PTS, 0, 30, ANS), push=0.03),
  # Ab sofort: Start auf der Sofa-Armlehne (von schräg vorn)
  *shot(c_ab, r3(t_go + sc(0.55)), F([*body(ARMREST[0], ARMREST[1], 2.45, y=ARM_Y), [ARMREST[0], 0, ARMREST[1] + 0.6], [ARMREST[0] + 1.2, 1.0, ARMREST[1]]], 40, 8, ANS), push=0.04),
  # … per Seilrutsche durch den Raum: Kamera fährt vorn mit – Dummy hoch über dem Absperrband (vorderes Band + Schild im Bild)
  *track_c(r3(t_go + sc(0.55) + 0.003)),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sC + sc(0.1)), 'id': 'absperrband', 'volume': 0.9}, {'t': r3(sC + sc(0.15)), 'id': 'whoosh', 'volume': 0.4},
         {'t': r3(t_sg), 'id': 'plopp', 'volume': 0.7}, {'t': r3(t_go), 'id': 'seilrutsche', 'volume': 0.9}, {'t': r3(min(0.97, t_arr - sc(0.1))), 'id': 'klick', 'volume': 0.5}],
}

# =====================================================================================================
# Abstimmung + Outro: Dummy steht im Zimmer, der gemeine Stein funkelt am Boden
# =====================================================================================================
DV = (0.75, 1.35)
STONE_V = (0.25, 2.05)
def endcast(wave=False):
    c = Cast()
    c.add('klemmstein', 0, 1, [brick(0, STONE_V, 1.0)])
    c.add('dummy', 0, 1, [K(0, *DV, 'stand', 200, question=0.0 if wave else 1.0)] + ([K(0.12, *DV, 'wave', 200), K(1, *DV, 'wave', 200)] if wave else []))
    return c.build()
V_PTS = [*body(*DV), [STONE_V[0], 0, STONE_V[1]], [-1.5, 0, -1.0], [2.8, 0, -1.2]]
vote = {'camera': shot(0, 1, F(V_PTS, 12, 6, (120, 960, 1060, 1320)), push=0.04), 'actors': endcast(), 'stage': STAGE}
outro = {'camera': shot(0, 1, F(V_PTS, 16, 8, (100, 980, 780, 1110)), push=0.05), 'actors': endcast(True), 'stage': STAGE}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du bist mal wieder auf ein Legosteinchen getreten – was machst du? 🧱😅 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Alles bleibt rein comichaft und harmlos. 😄\n\n"
        "#waswürdestdutun #lego #klemmbausteine #schmerz #comedy #quiz #dummy #spezial\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': STAGE, 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Karte: Der Dummy sitzt auf dem Teppich und hält seinen Fuß. Szene: Er wickelt todernst ein dickes rotes Seil um den Oberschenkel (große Schleife), holt eine riesige bunte Spielzeug-Schere hervor, lässt sie in der Luft schnappen und hält sie dann weit vor sich schräg nach unten – keine Berührung, kein Schnitt, das Bein bleibt heil. Zum Schluss Schere auf der Schulter, Daumen hoch. Rein comichaft, ohne jede Verletzung.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Karte: Der Dummy trägt eine große Spielzeug-Kiste herein. Szene: Er kippt sie aus, ein ganzer Berg bunter Klemmbausteine prasselt auf den Boden. Er steigt hinauf und steht völlig entspannt wie ein Fakir darauf (Handflächen aneinander, Gong).', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Karte: Der Dummy zeigt erschrocken auf den funkelnden Stein am Boden. Szene: Absperrband zieht sich um das Wohnzimmer, das Schild „SPERRGEBIET“ ploppt auf. Dann saust der Dummy von der Sofa-Armlehne an einer Seilrutsche quer über das abgesperrte Zimmer, ohne den Boden zu berühren.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Kommentieren & folgen!', 'extra': 'Neue Video-Ideen? Ab in die Kommentare!', 'extraCue': 'Neue Video-Ideen'},
 'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team _. Und du? 👇'},
 'shots': {'situation': situation, 'countdown': vote, 'outro': outro},
}
if SCENE_LEAD != 0.6: scen['sceneLead'] = SCENE_LEAD
if VOTE_LEN != 5.6: scen['voteLen'] = VOTE_LEN
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
print('A (Abstand Schere–Bein m):', check_a(), '| B (Puffer s vor „Verteilt“):', check_b(), '| C (tiefste Füße m):', check_c())
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
_st = {'S': 0, 'A': seclen('situation'), 'B': seclen('situation') + TA, 'C': seclen('situation') + TA + TB}
f = lambda sec, t: round((_st[sec] + t * {'S': TS, 'A': TA, 'B': TB, 'C': TC}[sec]) * 30)
KEY = {'Sit-Gehen': f('S', t_flinch * 0.6), 'Sit-Tritt': f('S', t_contact + ss(0.2)), 'Sit-Sprung': f('S', (t_peak + t_hang) / 2), 'Sit-Frage': f('S', 0.97),
       'A-Karte': f('A', sA * 0.6), 'A-Seil': f('A', (sA + c_ries) / 2 + sa(0.4)), 'A-Schere': f('A', t_pop + sa(0.5)), 'A-Zielen': f('A', (c_wenn + c_log) / 2), 'A-Logik': f('A', 0.97),
       'B-Karte': f('B', sB * 0.6), 'B-Kippen': f('B', t_s0 + sb(0.5)), 'B-Berg': f('B', (c_ver + c_gen) / 2), 'B-Fakir': f('B', 0.97),
       'C-Karte': f('C', sC * 0.6), 'C-Band': f('C', t_sg + sc(0.6)), 'C-Totale': f('C', (c_das + c_ab) / 2), 'C-Start': f('C', t_go + sc(0.2)), 'C-Fahrt': f('C', (t_go + t_arr) / 2 + sc(0.3)), 'C-Ziel': f('C', 0.985)}
_tot = round(total * 30)
KEY['Abstimmung'] = _tot - round(seclen('outro') * 30) - round(seclen('countdown') * 30) // 2
KEY['Outro'] = _tot - 20
print('Schlüsselbilder:', json.dumps(KEY, ensure_ascii=False))
json.dump(KEY, open(f'{ROOT}/out/{ID}-keys.json', 'w') if os.path.isdir(f'{ROOT}/out') else open(os.devnull, 'w'))
