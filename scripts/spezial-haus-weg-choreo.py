# Hilfsskript: erzeugt scenarios/spezial-haus-weg.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-haus-weg-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage), Bühnen "siedlung" + "gartenhaus-innen".
# Darstellung (Vorgabe Inhaber): comichaft + harmlos. Bei C sind alle Häuser leer, die Nachbarn stehen sicher auf der Straße und schauen zu.
# A: Klemmbausteine mit Noppen OHNE Logo/Aufdruck, jeder aufgesetzte Stein mit "Klick" (Soundeffekt klemmstein-klick, ElevenLabs).
# Spezial-Regeln: Länge 61–66 s, keine Dopplungen, Outro (A/B/C in die Kommentare NUR EINMAL + folgen + jemanden markieren), keine Marken/Logos.
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-haus-weg'
S = dict(
situation="Du kommst mal wieder nach Hause, und dein Haus ist weg. Einfach weg. Nur die Fußmatte liegt noch da. Was machst du?",
o1c="Einfach neu aufbauen", o1s="A: Du baust es einfach wieder auf. Stein für Stein.",
o2c="Ab ins Gartenhaus", o2s="B: Du gehst in dein Gartenhaus.",
o3c="Monstertruck über die Siedlung", o3s="C: Du fährst aus Frust mit einem Monstertruck über alle Häuser der Siedlung.",
e1="Klick. Klick. Klick. Stein auf Stein, Etage für Etage. Nach fünf Minuten steht es wieder da. Sogar mit Garage.",
e2="Von außen ist es nur ein kleines Gartenhaus. Aber drinnen ist es riesig. Und mittendrin steht: dein Haus. Gott sei Dank.",
e3="Ein Haus nach dem anderen. Die ganze Siedlung. Wenn du kein Haus mehr hast, dann hat hier keiner eins.",
vote="Also, was machst du? Schreib A, B oder C in die Kommentare.",
# Outro: Text des Inhabers + Wunsch des Inhabers (folgen + jemanden markieren, dem das auch immer passiert; „Kommentare“ nur einmal)
outro="Schreib A, B oder C in die Kommentare und folg gerne für mehr. Markier jemanden, dem das auch immer passiert.",
)
# Szenen rein visuell verlängern (Sekunden, ohne Text), damit das Video mindestens 61 s lang ist
EXTRA = {1: 1.7, 2: 1.7, 3: 1.8}
TAIL = 0.5
# „Schreib A, B oder C in die Kommentare“ nur EINMAL (Inhaber): Abstimmung weglassen, das Outro fordert dazu auf
NO_VOTE = True
OUTRO_MIN = 0.0   # bei Bedarf: Schlussbild 2–3 s länger stehen lassen

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
        return max(cliplen('countdown'), round(5.6 * 30) / 30)
    if sec == 'outro':
        return max(cliplen('outro'), OUTRO_MIN)
    return cliplen(sec)
def st_of(c, phrase, last=False):
    txt = TEXT[c]; i = txt.rindex(phrase) if last else txt.index(phrase)
    if c in ali:
        return ali[c]['character_start_times_seconds'][i]
    return (0.84 + 0.0594 * len(txt)) * i / len(txt)
def cue(sec, clip, phrase, last=False, nth=0):
    off = 0.0
    if sec.startswith('answer') and clip.startswith('explain'):
        off = answer_parts(int(sec[-1]))[0]
    txt = TEXT[clip]
    if nth:
        i = -1
        for _ in range(nth + 1): i = txt.index(phrase, i + 1)
        st = ali[clip]['character_start_times_seconds'][i] if clip in ali else (0.84 + 0.0594 * len(txt)) * i / len(txt)
    else:
        st = st_of(clip, phrase, last)
    return round((off + LEAD[clip] + st) / seclen(sec), 4)
def sec(secname, s):
    return s / seclen(secname)
r3 = lambda x: round(x, 4)
def K(t, x, z, motion, face=None, **kw):
    d = {'t': r3(max(0, min(1, t))), 'x': round(x, 3), 'z': round(z, 3), 'motion': motion}
    if face is not None: d['face'] = face
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def cam(t, pos, look, fov=None):
    d = {'t': round(te(max(0, min(1, t))), 4), 'pos': [round(v, 3) for v in pos], 'look': [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
HIDE = -30
ANS = (100, 980, 480, 1215)
SIT = (100, 980, 280, 1215)
def body(x, z, h=1.92, w=0.3, y=0.0):
    return [[x - w, y, z], [x + w, y, z], [x, y + h, z - w], [x, y + h, z + w]]
_fits = {}
def F(points, az, el, box=ANS, push=0.06, fov=38):
    key = json.dumps([points, az, el, box, fov])
    if key not in _fits:
        r = fit(points, az, el, fov, box) or fit(points, az, el, fov, box, dmax=150)
        assert r, f'keine Kamera gefunden: {points} {az} {el}'
        _fits[key] = r
    c, l, _ = _fits[key]
    c2 = [c[i] + (l[i] - c[i]) * push for i in range(3)]
    return c, l, c2, (fov if fov != 38 else None)
def shot(t0, t1, f):
    c, l, c2, fv = f
    return [cam(t0, c, l, fv), cam(t1, c2, l, fv)]
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)

# ---- feste Plätze (src/stage/Settlement.tsx: SIEDLUNG / SHED_HALL, src/actors/HausProps.tsx) ----
HZ = -12.5                                     # Mitte der Häuser
NEIGHBOR_X = [-36, -24, -12, 12, 24, 36]       # Häuser der Nachbarn (haus1 … haus6), Grundstück x 0 = Dummy (leer)
MAT = (0.0, -8.65)
SHED = (-3.2, -20.5)
SHED_DOOR = (SHED[0] + 0.45, SHED[1] + 1.17)   # Mitte der Türöffnung (Welt)
HOUSE_H = 7.6                                  # Haus bis First
def houses(squish=None, hide=False):
    a = {}
    for i, x in enumerate(NEIGHBOR_X):
        sq = (squish or {}).get(x, 0.0)
        a[f'haus{i + 1}'] = [K(0, x, HZ, 'park', 180, y=HIDE if hide else 0.0, mark=i + 1, squish=sq)]
    return a
def house_pts(x, z=HZ, flat=False):
    h = 0.5 if flat else HOUSE_H
    return [[x - 3.5, 0, z + 3.5], [x + 3.5, 0, z + 3.5], [x - 3.5, h, z], [x + 3.5, h, z], [x, 0, z - 3.5]]
def static(mat=True, shed=True, door=0.0, squish=None):
    a = houses(squish)
    if mat: a['fussmatte'] = [K(0, *MAT, 'park', 180, y=0.0)]
    if shed: a['gartenhaus'] = [K(0, *SHED, 'park', 180, y=0.0, door=door)]
    return a
# Nachbarn (alle mit Dummy-Körper): stehen sicher auf dem vorderen Gehweg (z ≈ 4.3), Blick zu den Häusern = face 0
NB = {'nachbar': (-8.2, 4.2), 'gartennachbar': (-6.6, 4.5), 'paketnachbar': (6.4, 4.2), 'fahrgast2': (14.0, 4.3)}

# ================= Situation: nach Hause kommen – Haus weg, nur die Fußmatte =================
L0 = 'situation'
c_und = cue(L0, 'situation', 'und dein Haus')
c_weg = cue(L0, 'situation', 'ist weg')
c_einf = cue(L0, 'situation', 'Einfach weg')
c_nur = cue(L0, 'situation', 'Nur die')
c_lieg = cue(L0, 'situation', 'liegt noch')
c_was = cue(L0, 'situation', 'Was machst')
W0 = (-4.2, -4.0); W1 = (-0.9, -4.0)
STOP = (0.0, -4.6)
MAT_ST = (MAT[0], MAT[1] - 0.45)              # hinter der Matte (Grundstücksseite), Blick zur Straße = face 180 → Schrift lesbar
walk_end = r3(c_und - 0.003)
lift0 = r3(max(c_lieg + sec(L0, 0.25), c_was - sec(L0, 1.55)))
a = static()
a['dummy'] = [K(0, *W0, 'walk', 90), K(walk_end, *W1, 'walk', 90),
              K(c_und, *STOP, 'homefreeze', 0, cut=True), K(r3(c_nur - 0.003), *STOP, 'homefreeze', 0),
              K(c_nur, *MAT_ST, 'stand', 180, cut=True), K(r3(lift0 - 0.002), *MAT_ST, 'stand', 180),
              K(lift0, *MAT_ST, 'liftmat', 180), K(c_was, *MAT_ST, 'liftmat', 180, question=0), K(r3(c_was + sec(L0, 0.6)), *MAT_ST, 'liftmat', 180, question=1)]
a['fussmatte'] = [K(0, *MAT, 'park', 180, y=0.0), K(r3(lift0 + sec(L0, 0.74)), *MAT, 'park', 180, y=0.0), K(r3(lift0 + sec(L0, 0.76)), *MAT, 'park', 180, y=HIDE)]
situation = {
 'camera': [*shot(0, r3(c_und - 0.003), F(body(*W0) + body(*W1), 15, 6, SIT)),
            # schräg die Häuserreihe entlang: rechts Haus 12, dann die Lücke, dahinter Haus −12
            *shot(c_und, r3(c_einf - 0.003), F(body(*STOP) + [[9.0, 0, -9.0], [8.5, 7.6, -12.5], [-8.5, 0, -9.0], [-9.5, 7.6, -12.5], [0, 0, HZ - 3.5], [SHED[0], 2.9, SHED[1]]], 58, 10, SIT)),
            *shot(c_einf, r3(c_nur - 0.003), F(body(*STOP) + [[STOP[0], 0.3, STOP[1] - 0.4]], 200, 14, SIT)),
            *shot(c_nur, r3(c_was - 0.003), F(body(*MAT_ST) + [[MAT[0] - 0.5, 0, MAT[1] - 0.3], [MAT[0] + 0.5, 0, MAT[1] + 0.3]], 20, 24, SIT)),
            *shot(c_was, 1, F(body(*MAT_ST, 2.0, 0.5) + [[MAT_ST[0], 0.9, MAT_ST[1] + 0.6]], 355, 6, SIT))],
 'actors': a,
 'sfx': [{'t': r3(c_einf - sec(L0, 0.2)), 'id': 'leere-wind', 'volume': 0.5}, {'t': r3(lift0 + sec(L0, 0.8)), 'id': 'geschenk-rascheln', 'volume': 0.35}],
}

# ================= Antwort A: Stein für Stein wieder aufbauen (Zeitraffer, jeder Stein „Klick“) =================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA)
sa = lambda s: s / TA
c_k = [cue(A, 'explain1', 'Klick', nth=i) for i in range(3)]
c_sas = cue(A, 'explain1', 'Stein auf Stein')
c_eta = cue(A, 'explain1', 'Etage für')
c_nach = cue(A, 'explain1', 'Nach fünf')
c_steht = cue(A, 'explain1', 'steht es')
c_sog = cue(A, 'explain1', 'Sogar')
c_gar = cue(A, 'explain1', 'Garage')
N = 155; HOUSE_DONE = 123                      # brickLayout(): Teile insgesamt / fertig ohne Garage
BH = (-0.6, HZ)                                # Klemmbaustein-Haus (Ursprung Boden-Mitte, face 180 → lokale Achsen = Welt)
PILE = (4.4, -7.3)
FRONT_X = [-2.4, -1.2, 1.2]                    # erste drei Steine (vordere Reihe, Lage 0)
FZ = BH[1] + 2.1                               # Mitte der Vorderwand
LOW_C, FAST_C, REL = 0.75, 0.42, 0.62          # STACK_CYCLE.low / .fast, STACK_RELEASE (Dummy.tsx)
# die ersten drei Steine: Aufsetzen bei den drei „Klick“ (stacklow läuft durch, Zyklus 0,75 s)
st0 = r3(c_k[0] - sa(REL * LOW_C))
rel = [r3(st0 + sa(REL * LOW_C + k * LOW_C)) for k in range(3)]
t_first = r3(min(sA, st0))
dummyA = [K(0, PILE[0] - 1.4, PILE[1] + 0.6, 'proud', 160), K(r3(t_first - 0.003), PILE[0] - 1.4, PILE[1] + 0.6, 'proud', 160)]
for k, bx in enumerate(FRONT_X):
    pos = (BH[0] + bx, FZ + 0.55)
    t_in = t_first if k == 0 else r3((rel[k - 1] + rel[k]) / 2)
    t_out = r3((rel[k] + rel[k + 1]) / 2 - 0.003) if k < 2 else r3(c_sas - 0.003)
    dummyA += [K(t_in, *pos, 'stacklow', 0, cut=True), K(t_out, *pos, 'stacklow', 0)]
fillA = [K(0, *BH, 'park', 180, y=0.0, fill=0.0)]
clicks = []
for k in range(3):
    fillA += [K(rel[k], *BH, 'park', 180, fill=round(k / N, 5)), K(r3(rel[k] + sa(0.12)), *BH, 'park', 180, fill=round((k + 1) / N, 5))]
    clicks.append(rel[k] + sa(0.1))
# Zeitraffer: „Stein auf Stein, Etage für Etage“ → bis „Nach fünf Minuten“ ist das Haus fertig (ohne Garage)
tl0 = c_sas; tl1 = r3(c_nach - sa(0.1))
fillA += [K(tl0, *BH, 'park', 180, fill=round(3 / N, 5)), K(tl1, *BH, 'park', 180, fill=round(HOUSE_DONE / N, 5))]
for i in range(4, HOUSE_DONE + 1):
    clicks.append(tl0 + (tl1 - tl0) * (i - 3) / (HOUSE_DONE - 3))
# Dummy springt im Zeitraffer rund ums Haus (alle 2 Zyklen eine neue Stelle), Roof: oben auf der Mauer
PER = [(BH[0] - 2.4, FZ + 0.55, 0), (BH[0] + 1.2, FZ + 0.55, 0), (BH[0] + 2.7 + 0.55, BH[1] + 0.6, 270), (BH[0] + 1.2, BH[1] - 2.1 - 0.55, 180),
       (BH[0] - 2.7 - 0.55, BH[1] - 0.4, 90), (BH[0] - 1.2, FZ + 0.55, 0)]
t = tl0; j = 0
while t < tl1 - sa(0.2):
    frac = (t - tl0) / (tl1 - tl0)
    x, z, f = PER[j % len(PER)]
    y = 0.0
    if frac > 0.72:                           # Dach: Dummy steht oben auf der Mauer
        x, z, f, y = (BH[0] + [-1.8, 0.6, 1.8][j % 3], BH[1] + [1.2, -1.2, 0.9][j % 3], [0, 180, 0][j % 3], 2.5)
    t2 = min(tl1 - 0.003, t + sa(2 * FAST_C))
    dummyA += [K(r3(t), x, z, 'stackfast', f, y=y, cut=True), K(r3(t2), x, z, 'stackfast', f, y=y)]
    t = t2 + 0.003; j += 1
HERO = (BH[0] - 1.6, FZ + 2.2)
dummyA += [K(r3(tl1), *HERO, 'proud', 200, y=0.0, cut=True), K(r3(c_sog - 0.003), *HERO, 'proud', 200)]
# Garage: kommt bei „Sogar mit Garage“ (schnell, jeder Stein klickt)
g0 = r3(c_sog + sa(0.05)); g1 = r3(c_gar + sa(0.55))
fillA += [K(g0, *BH, 'park', 180, fill=round(HOUSE_DONE / N, 5)), K(g1, *BH, 'park', 180, fill=1.0)]
for i in range(HOUSE_DONE + 1, N + 1):
    clicks.append(g0 + (g1 - g0) * (i - HOUSE_DONE) / (N - HOUSE_DONE))
END_A = (BH[0] + 4.6, FZ + 2.0)
dummyA += [K(c_sog, *END_A, 'proud', 210, cut=True), K(1, *END_A, 'proud', 210)]
aA = static(mat=False)
aA['klemmhaus'] = fillA
aA['klemmsteine'] = [K(0, *PILE, 'park', 160, y=0.0, fill=1.0), K(r3(c_sas), *PILE, 'park', 160, fill=1.0), K(r3(tl1), *PILE, 'park', 160, fill=0.001)]
aA['fussmatte'] = [K(0, BH[0], FZ + 0.7, 'park', 180, y=0.0)]
aA['dummy'] = dummyA
# Klicks: nie dichter als 0,075 s (sonst verschmelzen sie), leicht wechselnde Lautstärke
sfxA = []
last = -1
for i, ct in enumerate(sorted(clicks)):
    if (ct - last) * TA < 0.075: continue
    sfxA.append({'t': r3(ct), 'id': 'klemmstein-klick', 'volume': round(0.75 if ct < tl0 else 0.45 + 0.1 * (i % 3), 2)}); last = ct
sfxA += [{'t': r3(tl0), 'id': 'zeitraffer', 'volume': 0.45}]
BRICK_PT = lambda bx: [[BH[0] + bx - 0.7, 0.0, FZ + 0.3], [BH[0] + bx + 0.7, 0.0, FZ + 0.3], [BH[0] + bx, 1.5, FZ + 0.55], [BH[0] + bx, 0.6, FZ - 0.3]]
HOUSE_ALL = [[BH[0] - 3.1, 0, FZ + 0.4], [BH[0] + 7.0, 0, FZ + 0.4], [BH[0] - 3.1, 5.0, BH[1]], [BH[0] + 6.6, 2.3, BH[1] - 2.4], [BH[0] - 3, 0, BH[1] - 2.4]]
HOUSE_ONLY = [[BH[0] - 3.1, 0, FZ + 0.4], [BH[0] + 3.1, 0, FZ + 0.4], [BH[0], 5.0, BH[1]], [BH[0] - 3, 0, BH[1] - 2.4], [BH[0] + 3, 0, BH[1] - 2.4]]
expA = {
 'camera': [*shot(0, r3(sA - 0.003), F(body(PILE[0] - 1.4, PILE[1] + 0.6) + [[PILE[0] + 1.8, 0, PILE[1]], [PILE[0], 1.4, PILE[1]]], 345, 8)),
            *shot(sA, r3((rel[0] + rel[1]) / 2 - 0.003), F(BRICK_PT(FRONT_X[0]) + body(BH[0] + FRONT_X[0], FZ + 0.55), 35, 10)),
            *shot(r3((rel[0] + rel[1]) / 2), r3((rel[1] + rel[2]) / 2 - 0.003), F(BRICK_PT(FRONT_X[1]) + body(BH[0] + FRONT_X[1], FZ + 0.55), 345, 14)),
            *shot(r3((rel[1] + rel[2]) / 2), r3(c_sas - 0.003), F(BRICK_PT(FRONT_X[2]) + body(BH[0] + FRONT_X[2], FZ + 0.55), 20, 22)),
            *shot(c_sas, r3(c_eta - 0.003), F(HOUSE_ONLY + body(*PER[0][:2]), 30, 16, push=0.1)),
            *shot(c_eta, r3(tl1 - 0.003), F(HOUSE_ONLY, 330, 24, push=0.1)),
            *shot(tl1, r3(c_sog - 0.003), F(HOUSE_ONLY + body(*HERO), 15, 8)),
            *shot(c_sog, 1, F(HOUSE_ALL + body(*END_A), 25, 9))],
 'actors': aA,
 'sfx': sfxA,
 'timer': [r3(tl0), r3(c_nach + sa(0.3)), 300],
}

# ================= Antwort B: Gartenhaus – innen riesig, mittendrin das Haus =================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB)
sb = lambda s: s / TB
c_von = cue(B, 'explain2', 'Von außen')
c_aber = cue(B, 'explain2', 'Aber drinnen')
c_ries = cue(B, 'explain2', 'riesig')
c_und2 = cue(B, 'explain2', 'Und mittendrin')
c_dein = cue(B, 'explain2', 'dein Haus')
c_gott = cue(B, 'explain2', 'Gott sei')
B_W0 = (0.8, -7.0); B_W1 = (-2.0, -18.6)
OPEN_ST = (SHED_DOOR[0] + 0.55, SHED_DOOR[1] + 0.45)   # rechts vor der Tür (Griff 0,27 m links), außerhalb des Türschwungs
PEEK_ST = (SHED_DOOR[0], SHED_DOOR[1] + 0.5)
open0 = r3(sB + sb(0.15))
peek0 = r3(min(c_aber - sb(0.7), open0 + sb(1.9)))
HALL_HOUSE = (0.0, -12.0)
IN0 = (0.0, 7.3); IN1 = (0.0, 4.8)
REL_ST = (1.6, -2.6)
dummyB = [K(0, *B_W0, 'walk', face_to(B_W0, B_W1)), K(r3(sB - 0.003), *B_W1, 'walk', face_to(B_W0, B_W1)),
          K(sB, *OPEN_ST, 'shedopen', 0, cut=True), K(r3(peek0 - 0.003), *OPEN_ST, 'shedopen', 0),
          K(peek0, *PEEK_ST, 'peekin', 0), K(r3(c_aber - 0.003), *PEEK_ST, 'peekin', 0),
          # Halle: tritt durch die kleine Tür hinein und staunt nach oben
          K(c_aber, *IN0, 'walk', 0, cut=True), K(r3(c_aber + sb(1.6)), *IN1, 'walk', 0), K(r3(c_aber + sb(1.62)), *IN1, 'stand', 0, brow=1),
          K(r3(c_und2 - 0.003), *IN1, 'stand', 0),
          K(c_und2, -0.4, -1.5, 'stand', 0, cut=True), K(r3(c_gott - 0.003), -0.4, -1.5, 'stand', 0),
          K(c_gott, *REL_ST, 'relief', 165, cut=True), K(1, *REL_ST, 'relief', 165)]
shedB = [K(0, *SHED, 'park', 180, y=0.0, door=0), K(r3(open0 + sb(0.5)), *SHED, 'park', 180, door=0),
         K(r3(open0 + sb(1.2)), *SHED, 'park', 180, door=1), K(r3(c_aber - 0.003), *SHED, 'park', 180, y=0.0, door=1), K(c_aber, *SHED, 'park', 180, y=HIDE, door=1)]
aB = houses()
for k in list(aB):
    aB[k].append(K(r3(c_aber - 0.003), aB[k][0]['x'], aB[k][0]['z'], 'park', 180, y=0.0))
    aB[k].append(K(c_aber, aB[k][0]['x'], aB[k][0]['z'], 'park', 180, y=HIDE))
aB['fussmatte'] = [K(0, *MAT, 'park', 180, y=0.0), K(r3(c_aber - 0.003), *MAT, 'park', 180, y=0.0), K(c_aber, *MAT, 'park', 180, y=HIDE)]
aB['gartenhaus'] = shedB
aB['haus'] = [K(0, *HALL_HOUSE, 'park', 180, y=HIDE, mark=0), K(r3(c_aber - 0.003), *HALL_HOUSE, 'park', 180, y=HIDE), K(c_aber, *HALL_HOUSE, 'park', 180, y=0.0)]
aB['dummy'] = dummyB
HH = house_pts(*HALL_HOUSE)
expB = {
 'camera': [*shot(0, r3(sB - 0.003), F(body(*B_W0) + body(*B_W1) + [[SHED[0] - 1.3, 2.9, SHED[1]], [SHED[0] + 1.3, 0, SHED[1] + 1.2]], 10, 12)),
            *shot(sB, r3(c_aber - 0.003), F(body(*OPEN_ST) + [[SHED[0] - 1.3, 0, SHED[1] + 1.2], [SHED[0] + 1.3, 3.0, SHED[1] + 1.2], [SHED[0], 0, SHED[1] - 1.2], [SHED_DOOR[0] - 0.9, 0, SHED_DOOR[1] + 0.8]], 25, 8)),
            # innen: Kamera hinter dem Dummy an der Tür, fährt hinein und schaut nach oben in die riesige Halle
            cam(c_aber, [0.0, 1.5, 7.75], [0.0, 4.0, 0.0], 60), cam(r3(c_und2 - 0.003), [0.0, 2.4, 5.0], [0.0, 15.0, -6.0], 60),
            cam(c_und2, [0.0, 3.2, 7.4], [0.0, 3.4, -10.0], 62), cam(r3(c_gott - 0.003), [0.0, 3.0, 5.8], [0.0, 3.4, -10.0], 62),
            cam(c_gott, [3.4, 1.6, 4.2], [0.9, 2.6, -6.0], 55), cam(1, [3.2, 1.6, 3.6], [0.9, 2.6, -6.0], 55)],
 'actors': aB,
 'stage': [{'t': 0, 'stage': 'siedlung'}, {'t': c_aber, 'stage': 'gartenhaus-innen'}],
 'sfx': [{'t': r3(open0 + sb(0.5)), 'id': 'tuer-knarren', 'volume': 0.6}, {'t': r3(c_dein - sb(0.25)), 'id': 'himmel-chor', 'volume': 0.55},
         {'t': r3(c_aber + sb(0.1)), 'id': 'staunen', 'volume': 0.35}],
}

# ================= Antwort C: mit dem Monstertruck über alle (leeren!) Häuser der Siedlung =================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC)
sc = lambda s: s / TC
c_mon = cue(C, 'option3', 'mit einem Monstertruck')
c_ein = cue(C, 'explain3', 'Ein Haus')
c_ganz = cue(C, 'explain3', 'Die ganze')
c_wenn = cue(C, 'explain3', 'Wenn du')
c_dann = cue(C, 'explain3', 'dann hat')
c_kein = cue(C, 'explain3', 'keiner eins')
BIG = 1.5
SEAT = (0.0, 1.78 * BIG + 0.62, 0.05 * BIG)
def seat(t, motion, **kw):
    return K(t, SEAT[0], SEAT[2], motion, 0, y=SEAT[1], attach='monstertruck2', **kw)
TRUCK0 = (-10.0, -0.6)                         # Karte: Truck steht auf der Straße (face 90)
CLIMB = (TRUCK0[0] + 0.1, TRUCK0[1] + 2.1)     # an der Seite (Fahrerhaus), Blick zum Truck = face 0... (Truck-Seite +z)
ROWZ = HZ
X0, X1 = -47.0, 44.5
tA0 = r3(sC); tA1 = r3(min(1.0, c_kein + sc(0.9)))
def tx(x):
    return tA0 + (tA1 - tA0) * (x - X0) / (X1 - X0)
truck = [K(0, *TRUCK0, 'park', 90, y=0.0, rumble=0.2, smoke=0.2), K(r3(c_mon), *TRUCK0, 'park', 90, rumble=0.6, smoke=0.6), K(r3(sC - 0.003), *TRUCK0, 'park', 90, rumble=0.6)]
truck += [K(tA0, X0, ROWZ, 'drive', 90, y=0.0, tilt=0, rumble=0.7, smoke=0.6, cut=True)]
sqC = {}
for x in NEIGHBOR_X:
    truck += [K(r3(tx(x - 4.6)), x - 4.6, ROWZ, 'drive', 90, y=0.0, tilt=0), K(r3(tx(x - 2.4)), x - 2.4, ROWZ, 'drive', 90, y=1.2, tilt=-9),
              K(r3(tx(x + 1.2)), x + 1.2, ROWZ, 'drive', 90, y=0.8, tilt=6), K(r3(tx(x + 4.6)), x + 4.6, ROWZ, 'drive', 90, y=0.0, tilt=0)]
    sqC[x] = (r3(tx(x - 4.2)), r3(tx(x - 1.2)))
truck += [K(tA1, X1, ROWZ, 'drive', 90, y=0.0, tilt=0), K(1, X1 + 0.5, ROWZ, 'park', 90, y=0.0, tilt=0, rumble=0.4)]
aC = static(mat=True)
for i, x in enumerate(NEIGHBOR_X):
    s0_, s1_ = sqC[x]
    aC[f'haus{i + 1}'] = [K(0, x, HZ, 'park', 180, y=0.0, mark=i + 1, squish=0), K(s0_, x, HZ, 'park', 180, squish=0), K(s1_, x, HZ, 'park', 180, squish=1)]
aC['monstertruck2'] = truck
climb_end = r3(c_mon + sc(0.4))
dummyC = [K(0, CLIMB[0] + 0.9, CLIMB[1] + 0.6, 'stand', 330, brow=1), K(r3(cue(C, 'option3', 'fährst') - 0.003), CLIMB[0] + 0.9, CLIMB[1] + 0.6, 'stand', 330),
          K(cue(C, 'option3', 'fährst'), *CLIMB, 'truckclimb', 0, y=0.0, cut=True), K(climb_end, CLIMB[0], CLIMB[1] - 0.1, 'truckclimb', 0, y=1.9),
          seat(r3(climb_end + 0.003), 'seattriumph', cut=True), seat(r3(sC - 0.003), 'seattriumph'),
          seat(sC, 'seatdrive'), seat(r3(c_wenn - 0.003), 'seatdrive'), seat(c_wenn, 'seattriumph'), seat(1, 'seattriumph')]
aC['dummy'] = dummyC
for nm, (x, z) in NB.items():
    aC[nm] = [K(0, x, z, 'stand', 0), K(r3(sC + sc(0.4)), x, z, 'gape', face_to((x, z), (x * 0.4, HZ)))]
sfxC = [{'t': r3(c_mon), 'id': 'monstertruck-motor', 'volume': 0.5}, {'t': r3(sC), 'id': 'monstertruck-motor', 'volume': 0.6},
        {'t': r3(c_ganz), 'id': 'monstertruck-motor', 'volume': 0.45}, {'t': r3(c_wenn + sc(0.3)), 'id': 'staunen', 'volume': 0.45}]
for x in NEIGHBOR_X:
    sfxC.append({'t': r3(sqC[x][0] + sc(0.1)), 'id': 'haus-knautschen', 'volume': 0.7})
TRUCK_AT = lambda x: [[x - 3.6, 4.8, ROWZ], [x + 3.6, 4.8, ROWZ], [x - 3.6, 0, ROWZ + 2.4], [x + 3.6, 0, ROWZ - 2.4]]
xa = X0 + (X1 - X0) * (c_ganz - tA0) / (tA1 - tA0)
xb = X0 + (X1 - X0) * (c_wenn - tA0) / (tA1 - tA0)
xd = X0 + (X1 - X0) * (c_dann - tA0) / (tA1 - tA0)
NBP = [p for (x, z) in NB.values() for p in body(x, z)]
expC = {
 'camera': [*shot(0, r3(sC - 0.003), F([[TRUCK0[0] - 3.6, 4.8, TRUCK0[1]], [TRUCK0[0] + 3.6, 0, TRUCK0[1]], [TRUCK0[0], 0, TRUCK0[1] + 2.4]] + body(CLIMB[0] + 0.9, CLIMB[1] + 0.6), 25, 8)),
            # 1) seitlich mitfahren: erste Häuser werden plattgedrückt
            cam(sC, [X0 - 1.0, 6.5, 15.0], [X0 + 4.0, 2.2, HZ]), cam(r3(c_ganz - 0.003), [xa - 1.0, 6.5, 15.0], [xa + 4.0, 2.2, HZ]),
            # 2) hoch über der Straße: die ganze Siedlung
            *shot(c_ganz, r3(c_wenn - 0.003), F(house_pts(-24) + house_pts(24) + TRUCK_AT(xa), 292, 24, push=0.04)),
            # 3) Nachbarn staunen mit offenem Mund (sicher auf dem Gehweg)
            *shot(c_wenn, r3(c_dann - 0.003), F([p for (x, z) in list(NB.values())[:2] for p in body(x, z, 2.35)], 160, 4, fov=44)),
            # 4) alles platt, Truck auf dem letzten Haus, Nachbarn vorn
            *shot(c_dann, 1, F(house_pts(24, flat=True) + house_pts(36) + TRUCK_AT(36) + body(14.0, 4.3), 330, 12))],
 'actors': aC,
 'sfx': sfxC,
}

# ================= Abstimmung (weggelassen: noVote) – Shot bleibt für die Prüfung =================
aV = static()
aV['dummy'] = [K(0, 0.0, -5.2, 'sheepish', 180, brow=1)]
vote = {'camera': [cam(0, [0.0, 1.2, 1.5], [0.0, 1.6, -5.0]), cam(1, [0.0, 1.2, 1.2], [0.0, 1.6, -5.0])], 'actors': aV}

# ================= Outro: Dummy + Nachbarn auf dem Gehweg vor dem leeren Grundstück, winken =================
OUT_D = (0.0, -4.4)
aO = static()
aO['dummy'] = [K(0, *OUT_D, 'stand', 180, brow=0.05), K(0.25, *OUT_D, 'wave', 180), K(1, *OUT_D, 'wave', 180)]
aO['nachbar'] = [K(0, -1.5, -4.1, 'stand', 165), K(0.35, -1.5, -4.1, 'wave', 165), K(1, -1.5, -4.1, 'wave', 165)]
aO['paketnachbar'] = [K(0, 1.5, -4.1, 'stand', 195), K(0.45, 1.5, -4.1, 'wave', 195), K(1, 1.5, -4.1, 'wave', 195)]
outro = {'camera': shot(0, 1, F(body(*OUT_D, 2.1) + body(-1.5, -4.1) + body(1.5, -4.1), 0, 4, (70, 1000, 900, 1225), push=0.05)),
         'actors': aO}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du kommst mal wieder nach Hause, und dein Haus ist weg – was machst du? 🏠 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Bitte nichts davon nachmachen. 😄\n\n"
        "#waswürdestdutun #haus #zuhause #monstertruck #spezial #comedy #quiz #lustig\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'siedlung', 'padAfter': TAIL, 'noVote': NO_VOTE,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy baut sein Haus aus großen bunten Klemmbausteinen mit Noppen (ohne Logo) Stein für Stein wieder auf – erst drei Steine mit lautem Klick, dann im Zeitraffer Etage für Etage, am Ende steht das Haus, sogar mit Garage.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy öffnet die Tür des kleinen Gartenhauses. Die Kamera fährt hinein: innen eine riesige Holzhalle, viel größer als das Gartenhaus von außen, und mittendrin steht sein komplettes Haus. Er atmet erleichtert auf.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy klettert in einen riesigen Monstertruck und fährt über alle leeren Häuser der Siedlung, eins nach dem anderen – sie werden comichaft platt wie Pfannkuchen. Die Nachbarn stehen sicher auf der Straße und schauen mit offenem Mund zu.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Kommentieren & folgen!'},
 'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team ___. Und du? 👇'},
 'shots': {'situation': situation, 'countdown': vote, 'outro': outro},
}
if OUTRO_MIN > 0: scen['outroMin'] = OUTRO_MIN
for _sh in [situation, vote, outro, expA, expB, expC]:
    _sh['sharpCuts'] = True
    for keys in _sh['actors'].values():
        y = None
        for k in keys:
            if 'y' in k: y = k['y']
            elif y is not None: k['y'] = y
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
total = seclen('situation') + TA + TB + TC + (0 if NO_VOTE else seclen('countdown')) + seclen('outro')
print('Länge', round(total, 1), 's', 'audio' if dur else 'geschätzt', {'situation': seclen('situation'), 'A': (cardA, sceneA), 'B': (cardB, sceneB), 'C': (cardC, sceneC), 'outro': seclen('outro')})
print('A klicks', len(sfxA) - 1, 'rel', [round(r * TA, 2) for r in rel], 'klick-wörter', [round(c * TA, 2) for c in c_k], 'tl', round(tl0 * TA, 2), round(tl1 * TA, 2))
print('B', dict(open0=round(open0 * TB, 2), peek=round(peek0 * TB, 2), aber=round(c_aber * TB, 2)))
print('C', dict(sC=round(sC * TC, 2), ende=round(tA1 * TC, 2), squish=[round(sqC[x][1] * TC, 2) for x in NEIGHBOR_X]))
if total < 61: print('ACHTUNG: unter 61 s – Szenen verlängern / Schlussbild stehen lassen')
if total > 66: print('ACHTUNG: über 66 s – Pausen kürzen')
