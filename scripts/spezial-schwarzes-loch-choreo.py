# Hilfsskript: erzeugt scenarios/spezial-schwarzes-loch.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-schwarzes-loch-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-taube-angekackt.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, niemand wird verletzt, alles slapstickartig im Low-Poly-Cartoon-Stil.
# Bühne: große Wohnküche "kueche-gross" (Küchenzeile links mit Abwasch-Berg, rechts durchbrechbare Rückwand, draußen Rasen).
# Das Schwarze Loch schwebt mitten im Raum (KG.hole) und dreht sich die ganze Zeit.
#  A: Forscherbrille auf, Notizblock in der Hand, tief durchatmen, Kopfsprung „für die Wissenschaft“ ins Loch – kurz darauf ploppt
#     der Dummy völlig unversehrt wieder heraus und schwebt entspannt (Hände hinter dem Kopf) vor dem Loch.
#  B: Dummy stemmt den riesigen Abwasch-Berg über den Kopf, wirft ihn ins Loch, die Küche glänzt (Glitzer), Daumen hoch.
#  C: Rückwand kracht auf (dahinter warten drei Monstertrucks + zwei Bagger), eine Schanze ploppt aus dem Boden, alle fünf Fahrzeuge
#     springen nacheinander über die Schanze direkt ins Loch (Prüfung check_c: genau 3 Trucks + 2 Bagger, alle über die Schanze, alle im Loch,
#     der Dummy steht die ganze Zeit sicher weit weg).
# Spezial-Regeln: 61–66 s, keine Dopplungen, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-schwarzes-loch'
S = dict(
situation="Du hast mal wieder aus Versehen ein Schwarzes Loch in deiner Küche geöffnet. Schwebt einfach mitten im Raum. Was machst du?",
o1c="Für die Wissenschaft reinspringen", o1s="A: Für die Wissenschaft springst du einfach direkt rein.",
o2c="Abwasch reinwerfen", o2s="B: Du wirfst den gesamten Abwasch rein – dann ist es nicht mehr dein Problem.",
o3c="Monstertrucks und Bagger rein", o3s="C: Es erscheint eine Schanze – und drei Monstertrucks und zwei Bagger durchbrechen die Wand und springen rein.",
e1="Notizblock geschnappt, tief durchgeatmet. Und für die Wissenschaft einfach direkt reinspringen.",
e2="Den kompletten Abwasch geschnappt und ab ins Schwarze Loch. Problem gelöst, Küche sauber.",
e3="Die Wand hinten kracht auf, eine Schanze taucht auf – und drei Monstertrucks plus zwei Bagger springen lebensgroß direkt ins Schwarze Loch.",
vote="Also, was machst du?",
# Outro des Inhabers Buchstabe für Buchstabe + (Spezial-Regel 5, Wunsch Inhaber) angehängt: „Neue Video-Ideen? Ab in die Kommentare!“
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr. Neue Video-Ideen? Ab in die Kommentare!",
)
EXTRA = {1: float(os.environ.get('EXA', 0.3)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.0))}
# mit Pause 0,3 s + Zusatzzeit wären es 69,1 s → Pausen + Zusatzzeit gekürzt (Spezial-Regel 1, Texte unverändert)
TAIL = float(os.environ.get('TAIL', 0.12))
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))
VOTE_LEN = float(os.environ.get('VOTE_LEN', 5.6))
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
def rot(face, lx, lz):
    """lokale Koordinaten (x links/rechts, z vorn) einer Figur mit Blickrichtung face → Welt-Versatz (dx, dz)"""
    th = math.radians(180 - face)
    return lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th)

# ---- Sichtbarkeit je Einstellung: Figur nur in [t0, t1] zeigen, sonst y −30 (wie spezial-taube-angekackt) ----
class Cast:
    def __init__(self): self.parts = {}
    def add(self, name, t0, t1, keys): self.parts.setdefault(name, []).append((r3(t0), r3(t1), keys))
    def build(self):
        out = {}
        for name, parts in self.parts.items():
            parts.sort(key=lambda p: p[0]); ks = []
            for pi, (t0, t1, keys) in enumerate(parts):
                keys = sorted(keys, key=lambda k: k['t'])
                if len(keys) == 1:                                   # nur ein Zeitpunkt: bis zum Ende halten
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
# feste Plätze (Bühne kueche-gross, src/stage/Kitchen.tsx KG)
# =====================================================================================================
STAGE = 'kueche-gross'
HOLE = (1.3, 2.4, 1.0)                    # Mitte des Schwarzen Lochs (schwebt mitten im Raum)
HOLE_K = lambda t, **kw: K(t, HOLE[0], HOLE[2], 'park', 180, y=HOLE[1], **kw)
PILE = (-2.5, 0.92, -3.7)                 # Abwasch-Berg auf der Arbeitsplatte
CUPS = (-0.95, 0.92, -3.7)                # Tassen + Servietten auf der Platte (rechtes Ende)
WALL = (2.4, -4.0)                        # durchbrechbare Rückwand (Öffnung x 0.05 … 4.75)
D0 = (-2.1, 1.9)                          # Platz des Dummys (links vorn, weit weg vom Loch)
F_HOLE = face_to(D0, (HOLE[0], HOLE[2]))  # Blick zum Loch
RAMP_X = 2.4; RAMP_Z0 = -3.75; RAMP_LEN = 3.0; RAMP_H = 1.25
def ramp_h(z):
    dz = z - RAMP_Z0
    return 0.0 if dz <= 0 or dz >= RAMP_LEN else RAMP_H * dz / RAMP_LEN

def hole(t, fill=1.0, **kw):
    return HOLE_K(t, fill=fill, **kw)
def kitchen(c, t0=0.0, t1=1.0, pile=True, wall=True, cups=0.6, hole_fill=1.0):
    """Grundaufbau: Loch, Wand, Abwasch-Berg, Tassen/Servietten"""
    c.add('schwarzesloch', t0, t1, [hole(t0, hole_fill)])
    if wall: c.add('kuechenwand', t0, t1, [K(t0, *WALL, 'park', 180, fill=0.0)])
    if pile: c.add('abwasch', t0, t1, [K(t0, PILE[0], PILE[2], 'park', 180, y=PILE[1])])
    c.add('sogkram', t0, t1, [K(t0, CUPS[0], CUPS[2], 'park', face_to((CUPS[0], CUPS[2]), (HOLE[0], HOLE[2])), y=CUPS[1], fill=cups)])

HOLE_PTS = [[HOLE[0] - 1.6, HOLE[1] - 0.9, HOLE[2]], [HOLE[0] + 1.6, HOLE[1] + 1.0, HOLE[2]]]

# =====================================================================================================
# Situation: Dummy in der Küche – Loch öffnet sich – Tassen/Servietten werden angezogen – „Was machst du?“
# =====================================================================================================
L0 = 'situation'
TS = seclen(L0); ss = lambda s: s / TS
c_loch = cue(L0, 'situation', 'Schwarzes'); c_schw = cue(L0, 'situation', 'Schwebt'); c_was = cue(L0, 'situation', 'Was machst')
t_open0 = r3(c_loch - ss(0.1)); t_open1 = r3(t_open0 + ss(0.7))
cs_ = Cast()
cs_.add('schwarzesloch', 0, 1, [hole(0, 0.0), hole(t_open0, 0.0), hole(t_open1, 1.0), hole(1, 1.0)])
cs_.add('kuechenwand', 0, 1, [K(0, *WALL, 'park', 180, fill=0.0)])
cs_.add('abwasch', 0, 1, [K(0, PILE[0], PILE[2], 'park', 180, y=PILE[1])])
F_CUPS = face_to((CUPS[0], CUPS[2]), (HOLE[0], HOLE[2]))
cs_.add('sogkram', 0, 1, [K(0, CUPS[0], CUPS[2], 'park', F_CUPS, y=CUPS[1], fill=0.0), K(t_open1, CUPS[0], CUPS[2], 'park', F_CUPS, y=CUPS[1], fill=0.0),
                          K(r3(t_open1 + ss(0.8)), CUPS[0], CUPS[2], 'park', F_CUPS, y=CUPS[1], fill=1.0), K(1, CUPS[0], CUPS[2], 'park', F_CUPS, y=CUPS[1], fill=1.0)])
cs_.add('dummy', 0, 1, [K(0, *D0, 'stand', 150), K(r3(t_open0 + ss(0.15)), *D0, 'stand', 150), K(r3(t_open0 + ss(0.17)), *D0, 'aghast', F_HOLE),
                        K(r3(c_was - 0.003), *D0, 'aghast', F_HOLE), K(c_was, *D0, 'gape', 150, cut=True, question=0.0), K(r3(c_was + ss(0.3)), *D0, 'gape', 150, question=1.0),
                        K(1, *D0, 'gape', 150, question=1.0)])
situation = {
 'camera': [
   *shot(0, c_schw - 0.003, F([[D0[0] - 0.5, 0, D0[1]], [D0[0] + 0.5, 1.95, D0[1]], *HOLE_PTS], 8, 6, SIT), push=0.05),
   *shot(c_schw, c_was - 0.003, F([[CUPS[0] - 0.5, 0.9, CUPS[2]], [CUPS[0] + 0.3, 1.3, CUPS[2]], [HOLE[0] - 1.2, HOLE[1] - 0.6, HOLE[2]], [HOLE[0] + 1.2, HOLE[1] + 0.7, HOLE[2]]], 16, 4, SIT), push=0.08),
   *shot(c_was, 1, F([[D0[0] - 0.55, 0, D0[1]], [D0[0] + 0.55, 2.0, D0[1]], [HOLE[0] - 0.8, HOLE[1] - 0.4, HOLE[2]], [HOLE[0] + 0.8, HOLE[1] + 0.5, HOLE[2]]], -6, 4, SIT), push=0.06),
 ],
 'actors': cs_.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_open0), 'id': 'loch-oeffnen', 'volume': 0.8}, {'t': r3(t_open1), 'id': 'loch-summen', 'volume': 0.4},
         {'t': r3(t_open1 + ss(0.4)), 'id': 'teller-klirren', 'volume': 0.35}],
}

# Grundaufstellung für die Karten: Dummy steht links vorn, schaut halb zur Kamera, Loch rechts dahinter
CARD_PTS = [[D0[0] - 0.5, 0, D0[1]], [D0[0] + 0.5, 1.95, D0[1]], [HOLE[0] - 1.3, HOLE[1] - 0.6, HOLE[2]], [HOLE[0] + 1.3, HOLE[1] + 0.8, HOLE[2]]]

# =====================================================================================================
# Antwort A: Forscherbrille + Notizblock – tief durchatmen – Kopfsprung ins Loch – ploppt unversehrt wieder raus, schwebt entspannt
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_tief = cue(A, 'explain1', 'tief'); c_und = cue(A, 'explain1', 'Und für'); c_rein = cue(A, 'explain1', 'reinspringen')
cA = Cast()
kitchen(cA)
cA.add('dummy', 0, sA, [K(0, *D0, 'stand', 140)])
# Brille auf + Notizblock: steht etwas näher am Loch, schaut zur Kamera
DA = (-0.9, 1.75)
cA.add('dummy', sA, c_und, [K(sA, *DA, 'notebreath', 165, goggles=0.0), K(r3(sA + sa(0.7)), *DA, 'notebreath', 165, goggles=1.0), K(c_und, *DA, 'notebreath', 165, goggles=1.0)])
cA.add('notizblock', sA, c_und, [K(sA, *DA, 'park', 165, y=1.2, hand=1, drop=-0.06)])
# Absprung: Dummy steht 2,1 m vor dem Loch (Blick zum Loch), Kopfsprung hinein
DJ = (HOLE[0] - 1.1, HOLE[2] + 1.75)
FJ = face_to(DJ, (HOLE[0], HOLE[2]))
t_jump = r3(max(c_und + sa(0.3), c_rein - sa(1.2)))
t_lift = r3(t_jump + sa(0.45))
t_in = r3(t_lift + sa(0.55))
t_out0 = r3(t_in + sa(0.45)); t_out1 = r3(t_out0 + sa(0.5))
mid = ((DJ[0] + HOLE[0]) / 2, (DJ[1] + HOLE[2]) / 2)
cA.add('dummy', c_und, 1, [
    K(c_und, *DJ, 'stand', FJ, goggles=1.0), K(r3(t_jump - 0.003), *DJ, 'stand', FJ),
    K(t_jump, *DJ, 'bhleap', FJ), K(t_lift, *DJ, 'bhleap', FJ, y=0.0),
    K(r3(t_lift + sa(0.3)), mid[0], mid[1], 'bhleap', FJ, y=HOLE[1] + 0.15, shrink=0.15),
    K(t_in, HOLE[0], HOLE[2], 'bhleap', FJ, y=HOLE[1] - 0.2, shrink=1.0),
    K(r3(t_out0 - 0.003), HOLE[0], HOLE[2], 'bhleap', FJ, y=HOLE[1] - 0.2, shrink=1.0),
    # ploppt wieder raus – völlig unversehrt, schwebt entspannt (Seitenansicht), Notizblock egal
    K(t_out0, HOLE[0] - 0.2, HOLE[2] + 0.4, 'floatrelax', 270, y=HOLE[1] - 0.6, shrink=1.0, cut=True),
    K(t_out1, HOLE[0] - 0.7, HOLE[2] + 1.2, 'floatrelax', 270, y=HOLE[1] - 1.1, shrink=0.0),
    K(1, HOLE[0] - 0.85, HOLE[2] + 1.4, 'floatrelax', 270, y=HOLE[1] - 1.2, shrink=0.0),
])
cA.add('notizblock', c_und, t_out0, [K(c_und, *DJ, 'park', FJ, y=1.2, hand=1, drop=-0.06), K(r3(t_jump + sa(0.3)), *DJ, 'park', FJ, hand=1),
                                    K(t_in, HOLE[0], HOLE[2], 'park', FJ, y=HOLE[1], hand=0, shrink=1.0)])
cA.parts['schwarzesloch'] = []
cA.add('schwarzesloch', 0, 1, [hole(0), hole(r3(t_in - sa(0.2))), hole(t_in, rumble=1.0), hole(r3(t_in + sa(0.3)), rumble=0.0),
                               hole(t_out0, rumble=1.0), hole(r3(t_out0 + sa(0.3)), rumble=0.0), hole(1)])
camA = [
  *shot(0, sA - 0.003, F(CARD_PTS, 10, 5, ANS), push=0.04),
  *shot(sA, c_tief - 0.003, F([[DA[0] - 0.45, 0.55, DA[1]], [DA[0] + 0.45, 1.95, DA[1]]], 12, 4, ANS), push=0.08),
  *shot(c_tief, c_und - 0.003, F([[DA[0] - 0.35, 0.95, DA[1]], [DA[0] + 0.35, 1.95, DA[1]]], -8, 3, ANS), push=0.1),
  *shot(c_und, t_out0 - 0.003, F([[DJ[0] - 0.4, 0, DJ[1]], [DJ[0] + 0.4, 2.1, DJ[1]], *HOLE_PTS], -28, 7, ANS), push=0.05),
  *shot(t_out0, 1, F([[HOLE[0] - 1.6, HOLE[1] - 1.5, HOLE[2] + 1.4], [HOLE[0] + 1.5, HOLE[1] + 0.9, HOLE[2]], [HOLE[0] + 1.2, HOLE[1] - 1.3, HOLE[2] + 1.4]], 4, 5, ANS), push=0.05),
]
expA = {
 'camera': camA, 'actors': cA.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sA + sa(0.15)), 'id': 'plopp', 'volume': 0.5}, {'t': r3(sA + sa(0.5)), 'id': 'stift-kritzeln', 'volume': 0.45},
         {'t': r3(c_tief + sa(0.1)), 'id': 'kissen-plumps', 'volume': 0.0}, {'t': r3(t_lift), 'id': 'whoosh', 'volume': 0.6},
         {'t': r3(t_in - sa(0.15)), 'id': 'einsaugen', 'volume': 0.9}, {'t': r3(t_out0), 'id': 'plopp', 'volume': 0.8},
         {'t': r3(t_out0 + sa(0.2)), 'id': 'himmel-chor', 'volume': 0.45}],
}

# =====================================================================================================
# Antwort B: Abwasch-Berg über den Kopf stemmen – ab ins Loch – Küche glänzt
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_ab = cue(B, 'explain2', 'und ab'); c_prob = cue(B, 'explain2', 'Problem'); c_sau = cue(B, 'explain2', 'sauber')
cB = Cast()
kitchen(cB, pile=False)
cB.add('abwasch', 0, sB, [K(0, PILE[0], PILE[2], 'park', 180, y=PILE[1])])
cB.add('dummy', 0, sB, [K(0, *D0, 'stand', 200)])
# stemmen: Dummy 0,5 m vor dem Berg (face 0)
DB = (PILE[0], PILE[2] + 0.52)
t_grab = r3(sB + sb(0.1))
cB.add('dummy', sB, c_ab, [K(sB, *DB, 'stand', 0), K(t_grab, *DB, 'heavelift', 0), K(c_ab, *DB, 'heavelift', 0)])
g_at = r3(t_grab + sb(0.5)); u_at = r3(t_grab + sb(1.2))
cB.add('abwasch', sB, c_ab, [K(sB, PILE[0], PILE[2], 'park', 180, y=PILE[1]), K(g_at, PILE[0], PILE[2], 'park', 180, y=PILE[1]),
                             K(r3(g_at + 0.002), 0, 0.5, 'park', 0, y=0.92, attach='dummy', cut=True),
                             K(u_at, 0, 0.1, 'park', 0, y=2.04, attach='dummy', rumble=0.0), K(c_ab, 0, 0.1, 'park', 0, y=2.04, attach='dummy', rumble=1.0)])
# werfen: Dummy steht 2,4 m vor dem Loch (links davor), Berg über dem Kopf
DT = (HOLE[0] - 1.5, HOLE[2] + 2.0)
FT = face_to(DT, (HOLE[0], HOLE[2]))
t_rel = r3(c_ab + sb(0.45)); t_hit = r3(t_rel + sb(0.65))
hx, hz = rot(FT, 0, 0.58)
REL = (DT[0] + hx, 1.65, DT[1] + hz)
cB.add('dummy', c_ab, c_prob, [K(c_ab, *DT, 'heavethrow', FT), K(c_prob, *DT, 'heavethrow', FT)])
fly = [K(c_ab, 0, 0.1, 'park', 0, y=2.04, attach='dummy', rumble=1.0), K(r3(c_ab + sb(0.3)), 0, -0.08, 'park', 0, y=1.98, attach='dummy'),
       K(r3(t_rel - 0.002), 0, 0.56, 'park', 0, y=1.62, attach='dummy')]
for i in range(1, 7):
    u = i / 6
    x = REL[0] + (HOLE[0] - REL[0]) * u; z = REL[2] + (HOLE[2] - REL[2]) * u
    y = REL[1] + (HOLE[1] - 0.35 - REL[1]) * u + 0.9 * 4 * u * (1 - u)
    fly.append(K(r3(t_rel + (t_hit - t_rel) * u), x, z, 'park', FT, y=y, fill=round(0.55 * u, 3), shrink=round(max(0, (u - 0.35) / 0.65) ** 1.2, 3), rumble=0.0))
fly.append(K(c_prob, HOLE[0], HOLE[2], 'park', FT, y=HOLE[1] - 0.35, fill=0.55, shrink=1.0))
cB.add('abwasch', c_ab, c_prob, fly)
# sauber: Dummy an der Küchenzeile, Daumen hoch, alles glitzert
DS = (-1.7, -2.4)
cB.add('dummy', c_prob, 1, [K(c_prob, *DS, 'thumbsup', 160)])
cB.add('glanz', c_prob, 1, [K(c_prob, -2.4, -3.75, 'park', 180, y=0.75, fill=0.0), K(r3(c_prob + sb(0.35)), -2.4, -3.75, 'park', 180, y=0.75, fill=1.0),
                            K(1, -2.4, -3.75, 'park', 180, y=0.75, fill=1.0)])
cB.parts['schwarzesloch'] = []
cB.add('schwarzesloch', 0, 1, [hole(0), hole(r3(t_hit - sb(0.2))), hole(t_hit, rumble=1.0), hole(r3(t_hit + sb(0.35)), rumble=0.0), hole(1)])
camB = [
  *shot(0, sB - 0.003, F(CARD_PTS, 4, 5, ANS), push=0.04),
  *shot(sB, c_ab - 0.003, F([[DB[0] - 0.6, 0, DB[1]], [DB[0] + 0.6, 3.3, DB[1]], [PILE[0] - 0.6, 0.9, PILE[2]], [PILE[0] + 0.6, 2.0, PILE[2]]], 22, 4, ANS), push=0.07),
  *shot(c_ab, c_prob - 0.003, F([[DT[0] - 0.4, 0, DT[1]], [DT[0] + 0.5, 3.2, DT[1]], *HOLE_PTS], -32, 7, ANS), push=0.05),
  *shot(c_prob, 1, F([[-4.2, 0.4, -3.4], [-0.6, 2.1, -3.4], [DS[0] - 0.4, 0, DS[1]], [DS[0] + 0.4, 1.95, DS[1]]], 8, 6, ANS), push=0.06),
]
expB = {
 'camera': camB, 'actors': cB.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_grab + sb(0.4)), 'id': 'teller-klirren', 'volume': 0.7}, {'t': r3(c_ab + sb(0.05)), 'id': 'teller-klirren', 'volume': 0.5},
         {'t': r3(t_rel), 'id': 'whoosh', 'volume': 0.6}, {'t': r3(t_hit - sb(0.2)), 'id': 'einsaugen', 'volume': 0.9},
         {'t': r3(c_prob + sb(0.1)), 'id': 'rasen-zauber', 'volume': 0.6}],
}

# =====================================================================================================
# Antwort C: Wand kracht auf – Schanze ploppt auf – 3 Monstertrucks + 2 Bagger springen nacheinander ins Loch
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_kr = cue(C, 'explain3', 'kracht'); c_sch = cue(C, 'explain3', 'eine Schanze'); c_und3 = cue(C, 'explain3', 'und drei')
c_dir = cue(C, 'explain3', 'direkt')
t_burst = r3(c_kr - sc(0.1))
t_ramp0 = r3(c_sch + sc(0.25)); t_ramp1 = r3(t_ramp0 + sc(0.45))
# Fahrzeuge: Konvoi entlang x = RAMP_X Richtung +z (face 180), Mitte = Ursprung, halber Radstand a
V = 8.5
VEH = [('monstertruck', 1.5, 'truck'), ('monstertruck3', 1.5, 'truck'), ('monstertruck4', 1.5, 'truck'), ('bagger', 2.5, 'bagger'), ('bagger2', 2.5, 'bagger')]
GAP = {'truck': 5.6, 'bagger': 6.8}
z0s = []; z = -5.4
for i, (nm, a, kind) in enumerate(VEH):
    if i: z -= (GAP[kind] if VEH[i - 1][2] == kind else (GAP['truck'] + GAP['bagger']) / 2)
    z0s.append(z)
LIP = RAMP_Z0 + RAMP_LEN
TF = 0.5                                                    # Flugzeit von der Schanze ins Loch (s)
# Startzeit des Konvois so wählen, dass der letzte Bagger kurz nach „direkt“ im Loch verschwindet (aber nicht vor „und drei“)
def arrive(i):
    a = VEH[i][1]
    return (LIP - a - z0s[i]) / V + TF
t_go = r3(max(c_und3 + sc(0.05), c_dir + sc(0.7) - sc(arrive(len(VEH) - 1))))
cC = Cast()
cC.add('schwarzesloch', 0, 1, [hole(0)])
cC.add('abwasch', 0, 1, [K(0, PILE[0], PILE[2], 'park', 180, y=PILE[1])])
cC.add('sogkram', 0, 1, [K(0, CUPS[0], CUPS[2], 'park', F_CUPS, y=CUPS[1], fill=0.6)])
cC.add('kuechenwand', 0, 1, [K(0, *WALL, 'park', 180, fill=0.0), K(t_burst, *WALL, 'park', 180, fill=0.0), K(r3(t_burst + sc(2.2)), *WALL, 'park', 180, fill=1.0), K(1, *WALL, 'park', 180, fill=1.0)])
cC.add('schanze', 0, 1, [K(0, RAMP_X, RAMP_Z0, 'park', 180, fill=0.0), K(t_ramp0, RAMP_X, RAMP_Z0, 'park', 180, fill=0.0), K(t_ramp1, RAMP_X, RAMP_Z0, 'park', 180, fill=1.0), K(1, RAMP_X, RAMP_Z0, 'park', 180, fill=1.0)])
swallow = []
veh_log = []
for i, (nm, a, kind) in enumerate(VEH):
    tilt_k = 'tilt' if kind == 'truck' else 'pitch'
    extra = {'smoke': 0.6} if True else {}
    keys = []
    zq = z0s[i] - (1.8 if i == 0 else 0.0)                 # Truck 1 rollt beim Krachen durch die Öffnung bis z0
    keys.append(K(0, RAMP_X, zq - 6.0 if i == 0 else zq, 'park', 180, **{tilt_k: 0.0}, smoke=0.3))
    if i == 0:
        keys.append(K(r3(t_burst - sc(0.15)), RAMP_X, zq - 1.5, 'drive', 180, rumble=1.0))
        keys.append(K(r3(t_burst + sc(0.35)), RAMP_X, z0s[0], 'drive', 180, rumble=1.0))
        keys.append(K(r3(t_burst + sc(0.4)), RAMP_X, z0s[0], 'park', 180, rumble=1.0))
    keys.append(K(t_go, RAMP_X, z0s[i], 'drive', 180, rumble=1.0, smoke=0.8, **{tilt_k: 0.0}))
    # bis die Vorderachse an die Schanze stößt (z = RAMP_Z0 − a), dann rauf bis die Vorderachse an der Kante ist
    zr0 = RAMP_Z0 - a; zr1 = LIP - a
    t_r0 = t_go + sc((zr0 - z0s[i]) / V); t_r1 = t_go + sc((zr1 - z0s[i]) / V)
    keys.append(K(r3(t_r0), RAMP_X, zr0, 'drive', 180, y=0.0, **{tilt_k: 0.0}))
    for j in range(1, 5):
        u = j / 4; zc = zr0 + (zr1 - zr0) * u
        yf = ramp_h(zc + a) if zc + a < LIP else RAMP_H; yr = ramp_h(zc - a)
        keys.append(K(r3(t_r0 + (t_r1 - t_r0) * u), RAMP_X, zc, 'drive', 180, y=round((yf + yr) / 2, 3), **{tilt_k: round(-math.degrees(math.atan2(yf - yr, 2 * a)), 2)}))
    # Flug in die Lochmitte (Parabel), schrumpft ab der Hälfte, kippt mit der Nase nach unten
    P0 = (RAMP_X, keys[-1]['y'], zr1); t0f = t_r1; t1f = t_r1 + sc(TF)
    til0 = keys[-1][tilt_k]
    ff = face_to((P0[0], P0[2]), (HOLE[0], HOLE[2]))
    for j in range(1, 7):
        u = j / 6
        x = P0[0] + (HOLE[0] - P0[0]) * u; zz = P0[2] + (HOLE[2] - P0[2]) * u
        y = P0[1] + (HOLE[1] - 0.6 - P0[1]) * u + 0.8 * 4 * u * (1 - u)
        keys.append(K(r3(t0f + (t1f - t0f) * u), x, zz, 'drive', 180 + (ff - 180) * u, y=y, shrink=round(max(0, (u - 0.3) / 0.7) ** 1.3, 3),
                      **{tilt_k: round(til0 + (18 - til0) * u, 2)}))
    keys.append(K(1, HOLE[0], HOLE[2], 'park', ff, y=HOLE[1] - 0.6, shrink=1.0))
    cC.add(nm, 0, 1, keys)
    swallow.append(t1f)
    veh_log.append((nm, kind, round(t_r0 * TC - cardC, 2), round(t_r1 * TC - cardC, 2), round(t1f * TC - cardC, 2)))
cC.parts['schwarzesloch'] = []
hk = [hole(0)]
for tsw in swallow:
    hk += [hole(r3(tsw - sc(0.12))), hole(r3(tsw), rumble=1.0), hole(r3(tsw + sc(0.25)), rumble=0.0)]
hk.append(hole(1))
cC.add('schwarzesloch', 0, 1, sorted(hk, key=lambda k: k['t']))
# Dummy: steht links vorn, dreht sich beim Krachen erschrocken um, schaut danach staunend zu (immer weit weg)
cC.add('dummy', 0, 1, [K(0, *D0, 'stand', 160), K(r3(t_burst - 0.003), *D0, 'stand', 160), K(t_burst, *D0, 'aghast', 160),
                       K(r3(t_burst + sc(0.6)), *D0, 'aghast', 140), K(r3(t_burst + sc(0.65)), *D0, 'gape', 120), K(1, *D0, 'gape', 120)])
R_PTS = [[RAMP_X - 1.8, 0, RAMP_Z0], [RAMP_X + 1.8, 1.4, RAMP_Z0 + RAMP_LEN]]
ANS_C = (100, 980, 470, 1040)   # langer Untertitel in C → Geschehen höher halten
camC = [
  *shot(0, sC - 0.003, F(CARD_PTS, 10, 5, ANS), push=0.04),
  # Dummy vorn links, Wand hinten rechts kracht auf
  *shot(sC, c_sch - 0.003, F([[D0[0] - 0.5, 0, D0[1]], [D0[0] + 0.5, 1.9, D0[1]], [WALL[0] - 2.4, 0, WALL[1]], [WALL[0] + 2.4, 3.4, WALL[1]]], 12, 2, ANS_C), push=0.04),
  # Schanze ploppt auf, Truck 1 steht in der Öffnung
  *shot(c_sch, c_und3 - 0.003, F([*R_PTS, [RAMP_X - 1.3, 0, z0s[0] + 2.3], [RAMP_X + 1.3, 3.0, z0s[0]], *HOLE_PTS], 24, 2, ANS_C), push=0.05),
  # Seitenansicht: alle fünf Fahrzeuge springen nacheinander über die Schanze ins Loch
  *shot(c_und3, c_dir - 0.003, F([[RAMP_X - 1.5, 0, -7.0], [RAMP_X + 1.5, 3.0, -4.0], [HOLE[0] - 1.6, HOLE[1] - 1.0, HOLE[2]], [HOLE[0] + 1.6, HOLE[1] + 1.2, HOLE[2]], [HOLE[0], HOLE[1], HOLE[2] + 1.0], [RAMP_X + 1.8, 0, LIP]], 40, 3, ANS_C), push=0.03),
  # von vorn: der Dummy staunt, die letzten verschwinden im Loch
  *shot(c_dir, 1, F([[D0[0] - 0.5, 0, D0[1]], [D0[0] + 0.5, 1.95, D0[1]], *HOLE_PTS, [RAMP_X + 1.8, 0, RAMP_Z0]], 4, 7, ANS_C), push=0.04),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_burst - sc(0.2)), 'id': 'monstertruck-motor', 'volume': 0.6}, {'t': r3(t_burst), 'id': 'wand-krachen', 'volume': 0.9},
         {'t': r3(t_ramp0), 'id': 'plopp', 'volume': 0.8}, {'t': r3(t_go), 'id': 'monstertruck-motor', 'volume': 0.7},
         {'t': r3(swallow[2] - sc(0.6)), 'id': 'bagger-motor', 'volume': 0.6},
         *[{'t': r3(tsw - sc(0.15)), 'id': 'einsaugen', 'volume': 0.75} for tsw in swallow]],
}
def check_c():
    """Vorgabe Inhaber: genau drei Monstertrucks + zwei Bagger, alle über die Schanze, alle im Loch; der Dummy bleibt weit weg."""
    names = [n for n in expC['actors'] if n.startswith('monstertruck') or n.startswith('bagger')]
    trucks = [n for n in names if n.startswith('monstertruck')]; bag = [n for n in names if n.startswith('bagger')]
    assert len(trucks) == 3 and len(bag) == 2, ('C: Anzahl falsch', trucks, bag)
    for n in names:
        ks = expC['actors'][n]
        assert any(k.get('y', 0) > 0.5 and RAMP_Z0 < k['z'] < LIP for k in ks), ('C: nicht über die Schanze', n)
        assert ks[-1].get('shrink') == 1.0, ('C: nicht im Loch', n)
    assert all(t < 1.0 for t in swallow), ('C: nicht alle vor Szenenende im Loch', swallow)
    assert t_ramp1 < min(v[2] for v in veh_log) / TC + cardC / TC + 0.01, 'C: Schanze erst nach dem ersten Fahrzeug da'
    dmin = min(math.hypot(D0[0] - k['x'], D0[1] - k['z']) for n in names for k in expC['actors'][n] if k.get('y', 0) > -1)
    assert dmin > 3.0, ('C: Fahrzeug zu nah am Dummy', dmin)
    return veh_log, round(dmin, 2)

# =====================================================================================================
# Abstimmung + Outro: Dummy links vorn, Loch dreht sich rechts dahinter, Küche heil
# =====================================================================================================
def endcast(wave=False):
    c = Cast()
    kitchen(c)
    c.add('dummy', 0, 1, [K(0, *D0, 'stand', 160, question=0.0 if wave else 1.0)] + ([K(0.12, *D0, 'wave', 160), K(1, *D0, 'wave', 160)] if wave else []))
    return c.build()
V_PTS = [[D0[0] - 0.45, 0, D0[1]], [D0[0] + 0.45, 1.95, D0[1]], [HOLE[0] - 0.6, HOLE[1] - 0.6, HOLE[2]], [HOLE[0] + 0.6, HOLE[1] + 0.6, HOLE[2]]]
vote = {'camera': shot(0, 1, F(V_PTS, 6, 3, (120, 960, 1060, 1320)), push=0.04), 'actors': endcast(), 'stage': STAGE}
outro = {'camera': shot(0, 1, F(V_PTS, 8, 6, (100, 980, 780, 1110)), push=0.05), 'actors': endcast(True), 'stage': STAGE}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du hast mal wieder ein Schwarzes Loch in der Küche geöffnet – was machst du? 🕳️🚚 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Niemand wurde verletzt. 😄\n\n"
        "#waswürdestdutun #schwarzesloch #küche #monstertruck #bagger #comedy #quiz #dummy #spezial\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': STAGE, 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy setzt eine Forscherbrille auf, hält einen Notizblock, atmet tief durch und macht einen comichaften Kopfsprung in das Schwarze Loch. Kurz darauf ploppt er völlig unversehrt wieder heraus und schwebt entspannt mit den Händen hinter dem Kopf vor dem Loch.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy stemmt den riesigen Berg schmutzigen Abwaschs über den Kopf und wirft ihn ins Schwarze Loch, das ihn einsaugt. Danach glänzt die Küche (Glitzer) und der Dummy zeigt Daumen hoch.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Hinter dem Dummy kracht die Rückwand auf, eine Sprungschanze ploppt aus dem Boden, und drei lebensgroße Monstertrucks (rot, blau, grün) und zwei Bagger (orange, gelb) springen nacheinander über die Schanze direkt ins Schwarze Loch. Niemand sitzt darin, der Dummy steht weit weg und staunt – niemand wird verletzt.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Kommentieren & folgen!', 'extra': 'Neue Video-Ideen? Ab in die Kommentare!', 'extraCue': 'Neue Video-Ideen'},
 'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team _. Und du? 👇'},
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
print('C (Name, Art, s in der Szene: Schanze rauf / Kante / im Loch), kleinster Abstand zum Dummy:', check_c())
print('A: Sprung', round(t_jump * TA - cardA, 2), 'im Loch', round(t_in * TA - cardA, 2), 'wieder draußen', round(t_out1 * TA - cardA, 2), 'Szene', round(sceneA, 2),
      '| B: Abwurf', round(t_rel * TB - cardB, 2), 'im Loch', round(t_hit * TB - cardB, 2))
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
