# Hilfsskript: erzeugt scenarios/spezial-nase-erwischt.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-nase-erwischt-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-cookies.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, niemand wird verletzt, alles slapstickartig im Low-Poly-Cartoon-Stil.
# Bühne: Büro-Etage aus dem Chef-Video ("bueroetage", src/stage/OpenOffice.tsx BUERO) – Dummy am Schreibtisch (−4.2, 2.4),
#        Kollege (kollege1) am Nachbartisch links (−5.9), weitere Kollegen hinten (kollege2/3), Schild „AUSGANG“ hängt im Gang.
#  Situation: Dummy poppelt in Gedanken versunken → Kollege dreht sich um, große Augen, „!“ → alle anderen schauen auch → Dummy erstarrt.
#  A: (Karte) steht auf, erklärt todernst, tippt an die Nase. (Szene) zieht – PLOPP – ein riesiger gelber Spielzeug-Bagger fliegt aus der
#     Nase, wächst und landet vor ihm auf dem Boden; Daumen hoch.
#  B: (Karte) steht kerzengerade, todernster Blick. (Szene) Nahaufnahme todernst → sucht mit der Hand über den Augen → läuft suchend
#     herum, während das Schild „AUSGANG“ direkt hinter ihm leuchtet; Kollege mit Fragezeichen.
#  C: (Karte) Finger bleibt drin, Blick zurück zum Bildschirm. (Szene) Nahaufnahme Finger → lehnt sich entspannt zurück →
#     Kollege zuckt mit den Schultern und arbeitet weiter, alle tippen wieder.
# Spezial-Regeln: 61–66 s, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-nase-erwischt'
S = dict(
situation="Du poppelst mal wieder in der Nase und wirst erwischt. Direkt vor allen anderen. Was machst du?",
o1c="Den Bagger gerade rücken", o1s="A: Du sagst, du hättest einen Bagger schief sitzen gehabt – und ziehst einen riesigen Bagger aus der Nase, der vor dir steht.",
o2c="Nach dem Ausgang suchen", o2s="B: Du sagst todernst: Ich suche nach dem Ausgang, ich hab mich verlaufen.",
o3c="Finger stecken lassen", o3s="C: Du lässt den Finger stecken und tust so, als ob alles normal ist.",
e1="Bagger schief gesessen. Einmal kräftig ziehen – und schon steht ein riesiger Bagger vor dir. Völlig logisch.",
e2="Todernsster Blick. Du suchst natürlich nur nach dem Ausgang, weil du dich komplett verlaufen hast.",
e3="Finger bleibt einfach stecken. Und du tust so, als wäre das das Normalste auf der Welt.",
vote="Also, was machst du?",
# Outro des Inhabers Buchstabe für Buchstabe + (Spezial-Regel 5, Wunsch Inhaber) angehängt: „Neue Video-Ideen? Ab in die Kommentare!“
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr. Neue Video-Ideen? Ab in die Kommentare!",
)
EXTRA = {1: float(os.environ.get('EXA', 0.0)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.0))}
TAIL = float(os.environ.get('TAIL', 0.3))
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))
VOTE_LEN = float(os.environ.get('VOTE_LEN', 5.6))
NO_VOTE = os.environ.get('NO_VOTE', '0') == '1'

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'countdown': 0.1, 'outro': 0.3}
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
def dist(a, b): return math.hypot(a[0] - b[0], a[1] - b[1])

class Cast:
    """Sichtbarkeit je Einstellung: Figur nur in [t0, t1] zeigen, sonst y −30 (wie spezial-cookies)"""
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
# feste Plätze (Bühne bueroetage, src/stage/OpenOffice.tsx BUERO; Bewegungen src/actors/Dummy.tsx nosePose; Objekte src/actors/NoseProps.tsx)
# =====================================================================================================
STAGE = 'bueroetage'
CH = (-4.2, 3.05); FS = 0                      # Dummy sitzt an seinem Schreibtisch (BUERO.mySeat), Blick zum Tisch
K1 = (-5.9, 3.05)                              # Kollege am Nachbartisch links (sitzend)
K1_TURN = 72                                   # gedreht zum Dummy (rechts von ihm)
K2 = (-10.2, 3.05); K2_TURN = face_to(K2, CH)  # Kollegin hinten (sitzend)
K3 = (-11.9, 3.95); K3_TURN = face_to(K3, CH)  # Kollege hinten, Tisch gedreht (Blick +z = 180)
XS = (-3.0, 1.6); XS_Y = 2.3                   # Schild „AUSGANG“ hängt im Gang über dem Bagger-Weg (Schrift zeigt ±z)
DESK = [[-4.95, 0, 2.0], [-3.45, 1.28, 2.8]]
def seated(x=CH[0], z=CH[1]):
    return [[x - 0.32, 0.0, z - 0.35], [x + 0.32, 1.5, z + 0.3]]
def body(x, z, h=1.95, w=0.36):
    return [[x - w, 0, z], [x + w, h, z]]
HEAD = [[CH[0] - 0.2, 1.1, CH[1] - 0.25], [CH[0] + 0.2, 1.5, CH[1] + 0.12]]
def sign_k(t, glow=0.0):
    return K(t, *XS, 'park', 0, y=XS_Y, mark=1.0, glow=glow, size=0.35)
def k1_seat(t, motion='typedesk', face=0, **kw):
    v = dict(eyes=0.0, alarm=0.0, question=0.0); v.update(kw)
    return K(t, *K1, motion, face, **v)
def dummy_seat(t, motion, **kw):
    v = dict(sweat=0.0, question=0.0, angry=0.0); v.update(kw)
    return K(t, *CH, motion, FS, **v)
def background(cast, t0, t1, look=None):
    """weitere Kollegen hinten: tippen – oder schauen ab Zeitpunkt look mit großen Augen herüber"""
    if look is None:
        cast.add('kollege2', t0, t1, [K(t0, *K2, 'typedesk', 0, eyes=0.0)])
        cast.add('kollege3', t0, t1, [K(t0, *K3, 'typedesk', 180, eyes=0.0)])
    else:
        cast.add('kollege2', t0, t1, [K(t0, *K2, 'typedesk', 0, eyes=0.0), K(look, *K2, 'typedesk', 0, eyes=0.0), K(r3(look + 0.02), *K2, 'seatstare', K2_TURN, eyes=1.0)])
        l3 = r3(look + 0.015)
        cast.add('kollege3', t0, t1, [K(t0, *K3, 'typedesk', 180, eyes=0.0), K(l3, *K3, 'typedesk', 180, eyes=0.0), K(r3(l3 + 0.02), *K3, 'seatstare', K3_TURN, eyes=1.0)])

# =====================================================================================================
# Situation: poppelt verträumt → Kollege dreht sich um (große Augen, „!“) → alle schauen → Dummy erstarrt mit Finger in der Nase
# =====================================================================================================
L0 = 'situation'
TS = seclen(L0); ss = lambda s: s / TS
c_erw = cue(L0, 'situation', 'und wirst'); c_dir = cue(L0, 'situation', 'Direkt'); c_was = cue(L0, 'situation', 'Was machst')
c_erw2 = cue(L0, 'situation', 'erwischt')
t_turn = r3(c_erw + ss(0.15))
cs_ = Cast()
cs_.add('dummy', 0, t_turn + ss(0.25), [dummy_seat(0, 'nosepick')])
cs_.add('dummy', t_turn + ss(0.25), 1, [dummy_seat(t_turn + ss(0.25), 'nosecaught'), dummy_seat(r3(c_was - 0.002), 'nosecaught'), dummy_seat(r3(c_was + ss(0.3)), 'nosecaught', sweat=1.2, question=0.0),
                                        dummy_seat(r3(c_was + ss(0.6)), 'nosecaught', sweat=1.2, question=1.0), dummy_seat(1, 'nosecaught', sweat=1.2, question=1.0)])
cs_.add('kollege1', 0, 1, [k1_seat(0), k1_seat(t_turn), k1_seat(r3(t_turn + ss(0.25)), 'seatstare', K1_TURN), k1_seat(r3(t_turn + ss(0.4)), 'seatstare', K1_TURN, eyes=1.0, alarm=1.0),
                           k1_seat(1, 'seatstare', K1_TURN, eyes=1.0, alarm=1.0)])
background(cs_, 0, 1, r3(c_dir + ss(0.15)))
cs_.add('ausgangschild', 0, 1, [sign_k(0)])
situation = {
 'camera': [
   # Dummy poppelt verträumt am Schreibtisch (von vorn rechts, Kollege daneben)
   *shot(0, c_erw - 0.003, F([*seated(), *seated(*K1), [CH[0] - 0.1, 0.75, CH[1] - 0.7]], 112, 10, SIT), push=0.06),
   # erwischt: über die rechte Schulter des Dummys zum Kollegen, der sich umdreht
   *shot(c_erw, c_dir - 0.003, F([*HEAD, [K1[0] - 0.3, 0.6, K1[1] - 0.3], [K1[0] + 0.3, 1.5, K1[1] + 0.3]], 102, 6, SIT), push=0.05),
   # direkt vor allen anderen: weite Einstellung, alle schauen herüber
   *shot(c_dir, c_was - 0.003, F([*seated(), *seated(*K1), *seated(*K2), [K3[0], 1.4, K3[1]], [K3[0], 0, K3[1]]], 40, 16, SIT), push=0.04),
   # was machst du: nah, erstarrt mit Finger in der Nase
   *shot(c_was, 1, F([[CH[0] - 0.28, 0.95, CH[1] - 0.3], [CH[0] + 0.28, 1.62, CH[1] + 0.15]], 96, 4, SIT), push=0.05),
 ],
 'actors': cs_.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_turn), 'id': 'whoosh', 'volume': 0.5}, {'t': r3(t_turn + ss(0.35)), 'id': 'plopp', 'volume': 0.6},
         {'t': r3(c_dir + ss(0.2)), 'id': 'staunen', 'volume': 0.45}, {'t': r3(c_was + ss(0.5)), 'id': 'leere-wind', 'volume': 0.35}],
}

# =====================================================================================================
# Antwort A: Karte = steht im Gang, erklärt todernst (tippt an die Nase). Szene = zieht → PLOPP → Bagger wächst + landet vor ihm
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_bag = cue(A, 'explain1', 'Bagger schief'); c_ein = cue(A, 'explain1', 'Einmal'); c_und = cue(A, 'explain1', 'und schon'); c_voe = cue(A, 'explain1', 'Völlig')
DA = (-3.15, 3.55); FA_CARD = 255; FA = 90
BG = (-0.95, 3.5); BG_FACE = 240
POP = 1.15                                     # NOSE_YANK_POP in Dummy.tsx
FLY = 0.62                                     # Flugzeit Nase → Boden
cA = Cast()
cA.add('dummy', 0, sA, [K(0, *DA, 'nosetalk', FA_CARD, angry=0.55)])
cA.add('kollege1', 0, 1, [k1_seat(0, 'seatstare', K1_TURN, eyes=1.0)])
background(cA, 0, 1)
cA.add('ausgangschild', 0, 1, [sign_k(0)])
# Szene: „Bagger schief gesessen.“ = Hand zur Nase, Ruckler; großer Ruck so, dass PLOPP kurz vor „und schon“ kommt
t_y0 = r3(max(sA + sa(0.1), c_und - sa(POP + 0.15)))
t_pop = r3(t_y0 + sa(POP))
t_land = r3(t_pop + sa(FLY))
cA.add('dummy', sA, c_voe, [K(sA, *DA, 'stand', FA, angry=0.55, cut=True), K(r3(t_y0 - 0.002), *DA, 'stand', FA, angry=0.55), K(t_y0, *DA, 'noseyank', FA, angry=0.55),
                            K(r3(c_voe - 0.002), *DA, 'noseyank', FA, angry=0.2)])
cA.add('dummy', c_voe, 1, [K(c_voe, *DA, 'thumbsup', FA - 25, angry=0.0)])
# Bagger: winzig an der Nase (Ursprung knapp unter der Nasenspitze), fliegt im Bogen, wächst, landet + federt
NOSE = W(DA, FA, [0.0, 1.66, 0.2])
bk = []
N = 16
for i in range(N + 1):
    u = i / N
    x = NOSE[0] + (BG[0] - NOSE[0]) * ease(u * 1.05 if u < 0.95 else 1)
    z = NOSE[2] + (BG[1] - NOSE[2]) * u
    y = max(0.0, NOSE[1] * (1 - u) + 4 * 0.55 * u * (1 - u))
    fc = FA + (BG_FACE - FA) * ease(u)
    bk.append(K(r3(t_pop + sa(FLY * u)), x, z, 'park', fc, y=round(y, 3), fill=round(u ** 2.5, 3), squish=0.0, tilt=0.0, glow=0.0))
bk += [K(r3(t_land + sa(0.12)), *BG, 'park', BG_FACE, y=0.0, fill=1.0, squish=1.0), K(r3(t_land + sa(0.3)), *BG, 'park', BG_FACE, y=0.0, fill=1.0, squish=0.0),
       K(r3(t_land + sa(0.45)), *BG, 'park', BG_FACE, y=0.0, fill=1.0, squish=0.35), K(r3(t_land + sa(0.6)), *BG, 'park', BG_FACE, y=0.0, fill=1.0, squish=0.0, glow=1.0),
       K(r3(c_voe), *BG, 'park', BG_FACE, y=0.0, fill=1.0, glow=1.0, tilt=0.0), K(r3(c_voe + sa(0.5)), *BG, 'park', BG_FACE, y=0.0, fill=1.0, glow=1.0, tilt=18.0),
       K(1, *BG, 'park', BG_FACE, y=0.0, fill=1.0, glow=1.0, tilt=8.0)]
cA.add('spielbagger', t_pop, 1, bk)
cA.add('ploppstern', t_pop, r3(t_pop + sa(1.0)), [K(t_pop, NOSE[0] + 0.15, NOSE[2] + 0.1, 'park', 0, y=1.8, fill=0.0, size=-0.25), K(r3(t_pop + sa(1.0)), NOSE[0] + 0.15, NOSE[2] + 0.1, 'park', 0, y=1.8, fill=1.0, size=-0.25)])
def check_a():
    """PLOPP vor „und schon“, Bagger steht vor „Völlig logisch“, Schaufel berührt den Dummy nicht (Abstand Bagger-Mitte → Dummy ≥ 2,0 m)."""
    assert t_pop <= c_und + sa(0.05), ('A: PLOPP zu spät', t_pop, c_und)
    assert t_land + sa(0.3) < c_voe, ('A: Bagger landet zu spät', t_land, c_voe)
    assert dist(BG, DA) >= 2.0, ('A: Bagger zu nah', dist(BG, DA))
    return round((c_und - t_pop) * TA, 2)
BAG_PTS = [[BG[0] - 1.45, 0, BG[1] - 0.9], [BG[0] + 0.9, 1.8, BG[1] + 1.2]]
camA = [
  # Karte: Dummy im Gang erklärt todernst, Kollege mit großen Augen
  *shot(0, sA - 0.003, F([*body(*DA), *seated(*K1)], 18, 8, ANS), push=0.04),
  # „Bagger schief gesessen“: nah, Hand an der Nase (Profil)
  *shot(sA, c_ein - 0.003, F([[DA[0] - 0.25, 1.15, DA[1] - 0.2], [DA[0] + 0.45, 1.95, DA[1] + 0.2]], 62, 4, ANS), push=0.05),
  # „Einmal kräftig ziehen“: Profil, Platz vor ihm für den Flug
  *shot(c_ein, c_und - 0.003, F([*body(*DA), [DA[0] + 1.5, 0.4, DA[1]], [DA[0] + 1.2, 1.9, DA[1]]], 8, 6, ANS), push=0.04),
  # „und schon steht ein riesiger Bagger vor dir“: weit, Bagger vorn, Dummy dahinter, Kollege hinten
  *shot(c_und, c_voe - 0.003, F([*body(*DA), *BAG_PTS, *seated(*K1), [BG[0] + 0.3, 0, BG[1] + 1.6]], 38, 10, ANS), push=0.03),
  # „Völlig logisch“: Dummy Daumen hoch neben dem Bagger
  *shot(c_voe, 1, F([*body(*DA), *BAG_PTS], 20, 6, ANS), push=0.05),
]
expA = {
 'camera': camA, 'actors': cA.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_y0 + sa(0.45)), 'id': 'seil-ziehen', 'volume': 0.45}, {'t': r3(t_pop), 'id': 'plopp', 'volume': 0.95}, {'t': r3(t_pop + sa(0.02)), 'id': 'whoosh', 'volume': 0.5},
         {'t': r3(t_pop + sa(0.05)), 'id': 'rasen-zauber', 'volume': 0.45}, {'t': r3(t_land + sa(0.05)), 'id': 'kissen-plumps', 'volume': 0.8},
         {'t': r3(t_land + sa(0.5)), 'id': 'bagger-motor', 'volume': 0.25}, {'t': r3(c_voe + sa(0.3)), 'id': 'staunen', 'volume': 0.35}],
}

# =====================================================================================================
# Antwort B: Karte = steht kerzengerade, todernst. Szene = Nahaufnahme todernster Blick → sucht (Hand über den Augen) → läuft suchend herum,
#            das Schild „AUSGANG“ leuchtet direkt hinter ihm; Kollege mit Fragezeichen
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_tod = cue(B, 'explain2', 'Todernsster'); c_such = cue(B, 'explain2', 'Du suchst'); c_weil = cue(B, 'explain2', 'weil du')
DB = (-3.1, 3.55); FB = 185                    # Blick zur Kamera (+z), Schild hängt 2 m hinter ihm
cB = Cast()
cB.add('dummy', 0, sB, [K(0, *DB, 'butlerstand', FB, angry=0.7)])
cB.add('dummy', sB, c_such, [K(sB, *DB, 'stand', FB, angry=1.0, cut=True)])
cB.add('dummy', c_such, c_weil, [K(c_such, *DB, 'exitsearch', FB, angry=0.8)])
# verlaufen: langsam suchend im Bogen herumlaufen (Weg vor dem Schild)
P1 = (-2.45, 4.05); P2 = (-2.2, 4.9); P3 = (-3.0, 5.35)
v_ = 0.55
t_w0 = r3(c_weil + sb(0.15)); t_w1 = r3(t_w0 + sb(dist(DB, P1) / v_)); t_w2 = r3(t_w1 + sb(dist(P1, P2) / v_)); t_w3 = r3(t_w2 + sb(dist(P2, P3) / v_))
wk = [K(c_weil, *DB, 'exitsearch', FB, angry=0.8), K(t_w0, *DB, 'exitsearch', face_to(DB, P1), angry=0.8), K(t_w1, *P1, 'exitsearch', face_to(P1, P2), angry=0.8),
      K(t_w2, *P2, 'exitsearch', face_to(P2, P3), angry=0.8), K(min(1, t_w3), *P3, 'exitsearch', face_to(P2, P3), angry=0.8), K(1, *P3, 'exitsearch', 270, angry=0.8)]
cB.add('dummy', c_weil, 1, wk)
cB.add('kollege1', 0, 1, [k1_seat(0, 'seatstare', K1_TURN, eyes=1.0), k1_seat(r3(c_weil + sb(0.3)), 'seatstare', K1_TURN, eyes=0.7, question=0.0),
                          k1_seat(r3(c_weil + sb(0.7)), 'seatstare', K1_TURN, eyes=0.7, question=1.0), k1_seat(1, 'seatstare', K1_TURN, eyes=0.7, question=1.0)])
background(cB, 0, 1)
cB.add('ausgangschild', 0, 1, [sign_k(0), sign_k(r3(c_such)), sign_k(r3(c_such + sb(0.4)), 1.0), sign_k(1, 1.0)])
def check_b():
    """Dummy läuft frei (Abstand zu Kollegen-Tisch/Theke) und bleibt sichtbar vor dem Schild."""
    for p in [DB, P1, P2, P3]:
        assert p[0] > -3.4 or p[1] > 3.7, ('B: Weg zu nah am Schreibtisch', p)
        assert not (-2.9 < p[0] < -0.7 and p[1] < 1.3), ('B: Weg in der Theke', p)
    return round(min(1, t_w3) * TB, 2)
SIGN_PTS = [[XS[0] - 0.45, XS_Y - 0.2, XS[1]], [XS[0] + 0.45, XS_Y + 0.2, XS[1]]]
camB = [
  # Karte: kerzengerade + todernst, Schild „AUSGANG“ hinter ihm
  *shot(0, sB - 0.003, F([*body(*DB), *SIGN_PTS], 12, 6, ANS), push=0.04),
  # „Todernsster Blick“: Nahaufnahme Kopf
  *shot(sB, c_such - 0.003, F([[DB[0] - 0.22, 1.55, DB[1] - 0.15], [DB[0] + 0.22, 2.0, DB[1] + 0.15]], 6, 2, ANS), push=0.07),
  # „Du suchst natürlich nur nach dem Ausgang“: sucht mit der Hand über den Augen, Schild leuchtet direkt dahinter
  *shot(c_such, c_weil - 0.003, F([*body(*DB), *SIGN_PTS], 2, 10, ANS), push=0.05),
  # „weil du dich komplett verlaufen hast“: weit, läuft suchend herum, Kollege mit Fragezeichen, Schild leuchtet
  *shot(c_weil, 1, F([*body(*DB), *body(*P2), *body(*P3), *SIGN_PTS, [K1[0], 2.25, K1[1]], [K1[0], 0.4, K1[1]]], 28, 14, ANS), push=0.04),
]
expB = {
 'camera': camB, 'actors': cB.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sB + sb(0.15)), 'id': 'whoosh', 'volume': 0.4}, {'t': r3(c_such + sb(0.4)), 'id': 'piep', 'volume': 0.35},
         {'t': r3(c_weil + sb(0.2)), 'id': 'schleichen', 'volume': 0.45}],
}

# =====================================================================================================
# Antwort C: Karte = Finger bleibt drin, Blick zurück zum Bildschirm. Szene = Nahaufnahme Finger → lehnt sich entspannt zurück →
#            Kollege zuckt mit den Schultern und arbeitet weiter
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_fin = cue(C, 'explain3', 'Finger bleibt'); c_tust = cue(C, 'explain3', 'Und du'); c_norm = cue(C, 'explain3', 'als wäre')
cC = Cast()
cC.add('dummy', 0, c_tust, [dummy_seat(0, 'nosepick'), dummy_seat(sC, 'nosepick', cut=True)])
cC.add('dummy', c_tust, 1, [dummy_seat(c_tust, 'fingerstay')])
t_shrug = r3(c_norm + sc(0.2))
cC.add('kollege1', 0, 1, [k1_seat(0, 'seatstare', K1_TURN, eyes=1.0), k1_seat(r3(t_shrug - 0.002), 'seatstare', K1_TURN, eyes=1.0),
                          k1_seat(t_shrug, 'physikshrug', K1_TURN, eyes=0.0), k1_seat(r3(t_shrug + sc(1.1)), 'physikshrug', 10, eyes=0.0),
                          k1_seat(r3(t_shrug + sc(1.3)), 'typedesk', 0), k1_seat(1, 'typedesk', 0)])
background(cC, 0, 1)
cC.add('ausgangschild', 0, 1, [sign_k(0)])
camC = [
  # Karte: Finger bleibt in der Nase, Kollege starrt
  *shot(0, sC - 0.003, F([*seated(), *seated(*K1), [CH[0] - 0.1, 0.75, CH[1] - 0.7]], 112, 10, ANS), push=0.04),
  # „Finger bleibt einfach stecken“: Nahaufnahme
  *shot(sC, c_tust - 0.003, F([[CH[0] - 0.22, 1.1, CH[1] - 0.2], [CH[0] + 0.22, 1.55, CH[1] + 0.12]], 100, 6, ANS), push=0.07),
  # „Und du tust so“: zurückgelehnt, entspannt (von der Seite)
  *shot(c_tust, c_norm - 0.003, F([*seated(), [CH[0] - 0.1, 0.75, CH[1] - 0.7]], 105, 8, ANS), push=0.05),
  # „als wäre das das Normalste auf der Welt“: weit, Kollege zuckt mit den Schultern, alle arbeiten weiter
  *shot(c_norm, 1, F([*seated(), *seated(*K1), *seated(*K2), [CH[0], 0.75, CH[1] - 0.7]], 60, 14, ANS), push=0.04),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': STAGE,
 'sfx': [{'t': r3(c_tust + sc(0.2)), 'id': 'kissen-plumps', 'volume': 0.4}, {'t': r3(t_shrug + sc(0.1)), 'id': 'tastatur', 'volume': 0.0},
         {'t': r3(t_shrug + sc(1.3)), 'id': 'tastatur', 'volume': 0.4}],
}
expC['sfx'] = [s for s in expC['sfx'] if s['volume'] > 0 and s['t'] < 1]

# =====================================================================================================
# Abstimmung + Outro: alle stehen im Gang – Dummy, Kollege, Spielzeug-Bagger; Schild „AUSGANG“ hängt dahinter
# =====================================================================================================
DV = (-3.05, 3.75); KV = (-4.3, 4.0); BV = (-1.45, 3.45)
def endcast(wave=False):
    c = Cast()
    c.add('dummy', 0, 1, [K(0, *DV, 'stand', 195, question=0.0 if wave else 1.0)] + ([K(0.12, *DV, 'wave', 195), K(1, *DV, 'wave', 195)] if wave else []))
    c.add('kollege1', 0, 1, [K(0, *KV, 'stand', 160, eyes=0.0 if wave else 1.0)] + ([K(0.2, *KV, 'wave', 160), K(1, *KV, 'wave', 160)] if wave else []))
    c.add('spielbagger', 0, 1, [K(0, *BV, 'park', 215, fill=1.0, glow=1.0, tilt=10.0)])
    c.add('ausgangschild', 0, 1, [sign_k(0)])
    background(c, 0, 1)
    return c.build()
V_PTS = [*body(*DV), *body(*KV), [BV[0] - 0.8, 0, BV[1] - 0.6], [BV[0] + 0.8, 1.75, BV[1] + 0.6]]
vote = {'camera': shot(0, 1, F(V_PTS, 14, 3, (120, 960, 1060, 1320)), push=0.04), 'actors': endcast(), 'stage': STAGE}
outro = {'camera': shot(0, 1, F(V_PTS, 16, 6, (100, 980, 780, 1110)), push=0.05), 'actors': endcast(True), 'stage': STAGE}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du poppelst mal wieder in der Nase und wirst erwischt – was machst du? 😅🚜 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Alles bleibt rein comichaft und harmlos. 😄\n\n"
        "#waswürdestdutun #bagger #erwischt #peinlich #comedy #quiz #dummy #spezial\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': STAGE, 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy erklärt todernst, er habe nur einen Bagger schief sitzen gehabt, greift an die Nase und zieht – PLOPP – fliegt ein winziger gelber Spielzeug-Bagger heraus, wächst im Flug und landet groß und harmlos vor ihm auf dem Boden. Daumen hoch. Rein comichaft, niemand wird verletzt.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy bleibt komplett ernst, steht kerzengerade auf, schaut sich mit der Hand über den Augen suchend im Büro um und läuft suchend herum – während das Schild „AUSGANG“ direkt hinter ihm leuchtet. Der Kollege bekommt ein Fragezeichen.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy lässt den Finger einfach in der Nase stecken, lehnt sich entspannt zurück, die andere Hand hinter dem Kopf, und tut so, als wäre das die normalste Haltung der Welt. Der Kollege zuckt mit den Schultern und arbeitet weiter.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
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
    for k in _sh['actors'].get('dummy', []):
        k['nose'] = 1.0
    for keys in _sh['actors'].values():
        keys.sort(key=lambda k: k['t'])
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
total = seclen('situation') + answer_parts(1)[2] + answer_parts(2)[2] + answer_parts(3)[2] + (0 if NO_VOTE else seclen('countdown')) + seclen('outro')
print('Länge', round(total, 2), 's', 'audio' if dur else 'geschätzt',
      {'situation': seclen('situation'), 'A': answer_parts(1)[:2], 'B': answer_parts(2)[:2], 'C': answer_parts(3)[:2], 'vote': seclen('countdown'), 'outro': seclen('outro')})
print('A (PLOPP s vor „und schon“):', check_a(), '| B (Weg fertig bei s):', check_b())
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
_st = {'A': seclen('situation'), 'B': seclen('situation') + TA, 'C': seclen('situation') + TA + TB}
f = lambda sec, t: round((_st[sec] + t * {'A': TA, 'B': TB, 'C': TC}[sec]) * 30)
print('Schlüsselbilder: Sit-poppeln', round(ss(1.5) * TS * 30), '| Sit-erwischt', round((c_dir - ss(0.4)) * TS * 30), '| Sit-alle', round((c_was - ss(0.3)) * TS * 30),
      '| Sit-erstarrt', round((1 - ss(0.3)) * TS * 30),
      '| A-Karte', f('A', sA / 2), '| A-Nase', f('A', (sA + c_ein) / 2), '| A-Ruck', f('A', t_pop - sa(0.3)), '| A-Flug', f('A', t_pop + sa(0.3)), '| A-Bagger', f('A', (c_und + c_voe) / 2 + sa(0.4)),
      '| A-logisch', f('A', c_voe + sa(0.8)),
      '| B-Karte', f('B', sB / 2), '| B-Blick', f('B', (sB + c_such) / 2), '| B-sucht', f('B', (c_such + c_weil) / 2), '| B-verlaufen', f('B', c_weil + sb(1.5)),
      '| C-Karte', f('C', sC / 2), '| C-Finger', f('C', (sC + c_tust) / 2), '| C-zurück', f('C', (c_tust + c_norm) / 2), '| C-normal', f('C', c_norm + sc(1.2)))
