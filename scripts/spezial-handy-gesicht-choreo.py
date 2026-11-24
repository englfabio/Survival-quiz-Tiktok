# Hilfsskript: erzeugt scenarios/spezial-handy-gesicht.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-handy-gesicht-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-cookies.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, niemand wird ernsthaft verletzt, alles slapstickartig im Low-Poly-Cartoon-Stil,
# KEINE Logos (Handy, App-Symbole, Karte selbst gestaltet; „UNO“ nur gesprochen + im Kartentext).
# Bühne: Schlafzimmer am Abend mit großem offenem Fenster ("schlafzimmer-nacht", src/stage/Bedroom.tsx), Bett ohne eingebaute
#        Decke/Kissen → Objekte "bettdecke" + "kissen"; Handy "betthandy", Riesenhandy "riesenhandy" (src/actors/BedPhoneProps.tsx).
#  Situation: Dummy liegt im Bett, hält das Handy über dem Gesicht → es rutscht ab und klatscht auf die Nase (Klatsch-Stern) → Totale →
#             Sternchen kreisen → Fragezeichen.
#  A: (Karte) steht mit dem Handy in der Hand und funkelt es böse an. (Szene) wirbelt es über dem Kopf wie einen Hammer, wirft es in weitem
#     Bogen durchs OFFENE FENSTER hinaus in den Nachthimmel (Funkeln) → wartet mit offener Hand → nichts → Achselzucken.
#  B: (Karte) hält die Rollentausch-Karte hoch. (Szene) Karte leuchtet, Strahlenkranz → Riesenhandy liegt im Bett unter der Decke und
#     schläft (Zzz), der Dummy schwebt waagerecht darüber → plumpst platt drauf → Rollen getauscht (Dummy liegt auf dem Handy).
#  C: (Karte) sitzt im Bett, hält das schwere Handy mit zitternden Armen. (Szene) wischt hektisch, App-Symbole und Fotos fliegen weg, das
#     Handy wird immer dünner → schwebt wie eine Feder hoch → sinkt sanft aufs Kissen, Dummy lehnt sich zurück.
# Spezial-Regeln: 61–66 s, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-handy-gesicht'
S = dict(
situation="Dir ist mal wieder das Handy direkt ins Gesicht gefallen, während du im Bett liegst. Direkt auf die Nase. Was machst du?",
o1c="Wie Thors Hammer wegwerfen", o1s="A: Du schmeißt es wie Thor seinen Hammer weg. Aber es kommt einfach nicht wieder.",
o2c="UNO Reverse im Bett", o2s="B: UNO Reverse Karte. Du fällst auf das Handy, während es mal wieder im Bett dummyt.",
o3c="Apps und Fotos löschen", o3s="C: Du löschst alle Apps und Fotos, damit es nicht mehr so schwer ist.",
e1="Mit Schwung wie ein Hammer weggeworfen. Jetzt kurz warten, bis es zurückkommt. Und ... nichts. Weg ist es.",
e2="UNO Reverse Karte gezückt. Plötzlich liegt das Handy im Bett und du fällst voll drauf. Rollen komplett getauscht.",
e3="Alle Apps weg, alle Fotos gelöscht. Sofort viel leichter. Problem auf digitale Art gelöst.",
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
# feste Plätze (Bühne schlafzimmer-nacht, src/stage/Bedroom.tsx BEDROOM; Bewegungen src/actors/Dummy.tsx handyPose:
# PHONE_LIE, phoneFacePoint, PHONE_GLARE, THOR, PHONE_SIT)
# =====================================================================================================
STAGE = 'schlafzimmer-nacht'
MAT_Y = 0.45                                   # Matratzen-Oberkante
HIP = (0.8, -1.425); FB = 270                  # Dummy im Bett (Hüfte), Beine nach −x, Kopf zum Kissen (+x)
BED_PTS = [[-0.05, 0.0, -1.9], [1.75, 1.05, -0.95]]
PILLOW = (1.47, -1.425)
WIN_C = [-1.8, 1.55, -0.4]                     # Mitte des offenen Fensters (Öffnung z −1.0 … 0.2, y 0.9 … 2.2)
WIN_PTS = [[-1.8, 0.9, -1.0], [-1.8, 2.2, 0.2]]
BED_HIP = 0.56
LIE = dict(lean=-1.3, hx=0.2, hold=0.36, rest=0.14, slip=0.3, hit=0.52)
def face_point(d, lean=LIE['lean'], hx=LIE['hx']):
    cy = BED_HIP + 0.06 + 0.74 * math.cos(lean); cz = 0.74 * math.sin(lean); a = lean + hx
    return [0.0, cy - math.sin(a) * d, cz + math.cos(a) * d]
HEAD_L = face_point(0)                        # Kopfmitte liegend (Dummy-System)
HEAD_W = W(HIP, FB, HEAD_L)
PH_TILT = round(math.degrees(math.atan2(-math.cos(LIE['lean'] + LIE['hx']), math.sin(LIE['lean'] + LIE['hx']))), 1)  # Bildschirm zum Gesicht
PHONE_GLARE = [-0.1, 1.32, 0.36]
THOR = dict(c=[-0.12, 1.9, 0.02], r=0.24, t0=0.3, t1=1.9, rel=2.15, relP=[-0.16, 1.72, 0.56])
PHONE_SIT = [0.05, 0.92, 0.36]

def kissen(t, **kw):
    v = dict(squish=0.0); v.update(kw)
    return K(t, *PILLOW, 'park', 0, y=MAT_Y, **v)
def decke(t, fill=0.62, y=0.58, x=-0.02, **kw):
    v = dict(squish=0.0); v.update(kw)
    return K(t, x, HIP[1], 'park', 0, y=y, fill=fill, **v)
def bed_props(c, t0, t1, lying=True, sitting=False, phone_on=None):
    """Kissen + Decke für eine Einstellung (liegend: Decke bis zur Brust, sitzend: bis zur Hüfte, sonst zurückgeschlagen)"""
    c.add('kissen', t0, t1, [kissen(t0)])
    if lying:
        c.add('bettdecke', t0, t1, [decke(t0, 0.62, 0.58)])
    elif sitting:
        c.add('bettdecke', t0, t1, [decke(t0, 0.43, 0.58)])
    else:
        c.add('bettdecke', t0, t1, [decke(t0, 0.5, MAT_Y + 0.005)])
def body(x, z, h=1.95, w=0.42):
    return [[x - w, 0, z], [x + w, h, z]]
LYING_PTS = [[-0.15, 0.45, -1.7], [1.7, 1.0, -1.15]]
def phone_att(t, local, tilt=PH_TILT, face=0, **kw):
    kw.setdefault('size', 0.0)
    v = dict(glow=0.0, thin=0.0, rumble=0.0, turn=0.0, hand=0.0); v.update(kw)
    return K(t, local[0], local[2], 'park', face, y=local[1], attach='dummy', tilt=tilt, **v)
def phone_w(t, p, tilt=0.0, face=0, **kw):
    v = dict(glow=0.0, thin=0.0, rumble=0.0, turn=0.0, hand=0.0, size=0.0); v.update(kw)
    return K(t, p[0], p[2], 'park', face, y=p[1], tilt=tilt, **v)

# =====================================================================================================
# Situation: liegt im Bett mit dem Handy über dem Gesicht → rutscht ab → klatscht auf die Nase → Totale → Sternchen → Fragezeichen
# =====================================================================================================
L0 = 'situation'
TS = seclen(L0); ss = lambda s: s / TS
c_gef = cue(L0, 'situation', 'gefallen'); c_wae = cue(L0, 'situation', 'während'); c_dir2 = cue(L0, 'situation', 'Direkt auf'); c_was = cue(L0, 'situation', 'Was machst')
t_sl0 = r3(max(ss(1.2), c_gef - ss(LIE['hit'] - 0.02)))       # Abrutschen beginnt, Aufprall genau auf „gefallen“
t_fall0 = r3(t_sl0 + ss(LIE['slip'])); t_hit = r3(t_sl0 + ss(LIE['hit']))
cs_ = Cast()
bed_props(cs_, 0, 1, lying=True)
cs_.add('dummy', 0, 1, [K(0, *HIP, 'bedphone', FB), K(r3(t_sl0 - 0.002), *HIP, 'bedphone', FB), K(t_sl0, *HIP, 'bedphoneslip', FB),
                        K(r3(max(c_was, t_hit + ss(1.6))), *HIP, 'bedphoneslip', FB, question=0.0), K(r3(max(c_was, t_hit + ss(1.6)) + ss(0.35)), *HIP, 'bedphoneslip', FB, question=1.0),
                        K(1, *HIP, 'bedphoneslip', FB, question=1.0)])
ph = [phone_att(0, face_point(LIE['hold']), glow=1.0, text='feed'), phone_att(r3(t_sl0 - 0.002), face_point(LIE['hold']), glow=1.0)]
for i in range(1, 7):                          # Wackeln in den Fingern
    u = i / 6
    ph.append(phone_att(r3(t_sl0 + ss(LIE['slip'] * u)), face_point(LIE['hold']), glow=1.0, turn=round(9 * math.sin(i * 2.3) * u, 1), tilt=PH_TILT + round(6 * math.sin(i * 1.7) * u, 1)))
for i in range(1, 9):                          # freier Fall (beschleunigt) bis auf die Nase
    u = i / 8
    d = LIE['hold'] - (LIE['hold'] - LIE['rest']) * u * u
    ph.append(phone_att(r3(t_fall0 + (t_hit - t_fall0) * u), face_point(d), glow=1.0, turn=round(8 * (1 - u), 1), tilt=PH_TILT - 10 * u))
ph += [phone_att(r3(t_hit + ss(0.07)), face_point(LIE['rest'] + 0.03), glow=0.8, tilt=PH_TILT - 6), phone_att(r3(t_hit + ss(0.16)), face_point(LIE['rest']), glow=0.6),
       phone_att(r3(t_hit + ss(0.3)), face_point(LIE['rest'] + 0.008), glow=0.5, tilt=PH_TILT + 3), phone_att(1, face_point(LIE['rest']), glow=0.5)]
cs_.add('betthandy', 0, 1, ph)
FACE_HIT = W(HIP, FB, face_point(LIE['rest'] + 0.05))
cs_.add('klatschstern', t_hit, r3(t_hit + ss(0.45)), [K(t_hit, FACE_HIT[0], FACE_HIT[2], 'park', 0, y=FACE_HIT[1] + 0.05, fill=0.0, size=-0.5), K(r3(t_hit + ss(0.45)), FACE_HIT[0], FACE_HIT[2], 'park', 0, y=FACE_HIT[1] + 0.05, fill=1.0, size=-0.5)])
STARS = [HEAD_W[0] + 0.05, HEAD_W[1] + 0.3, HEAD_W[2]]
t_st = r3(t_hit + ss(0.35))
cs_.add('sternchen', t_st, 1, [K(t_st, STARS[0], STARS[2], 'park', 0, y=STARS[1], fill=0.0), K(r3(t_st + ss(0.4)), STARS[0], STARS[2], 'park', 0, y=STARS[1], fill=1.0), K(1, STARS[0], STARS[2], 'park', 0, y=STARS[1], fill=1.0)])
HEADBOX = [[HEAD_W[0] - 0.25, HEAD_W[1] - 0.25, HEAD_W[2] - 0.25], [HEAD_W[0] + 0.2, HEAD_W[1] + 0.45, HEAD_W[2] + 0.25]]
PH_HOLD_W = W(HIP, FB, face_point(LIE['hold']))
Q_W = [HIP[0], 2.45, HIP[1]]
situation = {
 'camera': [
   # nah von vorn: liegt im Bett, Handy leuchtet über dem Gesicht → rutscht ab
   *shot(0, t_hit - 0.003, F([[0.4, 0.5, -1.7], [1.75, 1.0, -1.15], [PH_HOLD_W[0], PH_HOLD_W[1] + 0.1, PH_HOLD_W[2]]], -50, 30, SIT), push=0.06),
   # Klatsch: ganz nah aufs Gesicht
   *shot(t_hit, c_wae - 0.003, F(HEADBOX, -55, 48, (180, 900, 520, 1200)), push=0.05),
   # während du im Bett liegst: Totale mit Bett, Nachttischlampe, offenem Fenster
   *shot(c_wae, c_dir2 - 0.003, F([*BED_PTS, [-0.5, 0.9, -1.7]], -12, 16, SIT), push=0.04),
   # direkt auf die Nase: von schräg oben, Sternchen + Fragezeichen
   *shot(c_dir2, 1, F([*HEADBOX, [HIP[0] - 0.3, 0.5, HIP[1]], Q_W], -40, 30, SIT), push=0.05),
 ],
 'actors': cs_.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_sl0 + ss(0.05)), 'id': 'whoosh', 'volume': 0.25}, {'t': r3(t_hit), 'id': 'handy-klatsch', 'volume': 1.0},
         {'t': r3(t_st), 'id': 'funkeln', 'volume': 0.3}],
}

# =====================================================================================================
# Antwort A: Karte = funkelt das Handy böse an. Szene = Hammer-Wirbel + Wurf durchs offene Fenster → warten → nichts → Achselzucken
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_mit = cue(A, 'explain1', 'Mit Schwung'); c_jetzt = cue(A, 'explain1', 'Jetzt'); c_undA = cue(A, 'explain1', 'Und ...'); c_nix = cue(A, 'explain1', 'nichts')
c_weg = cue(A, 'explain1', 'Weg ist')
DA = (-0.2, -0.35); FA = 270                   # steht mitten im Zimmer, Blick zum Fenster (−x)
cA = Cast()
bed_props(cA, 0, 1, lying=False)
cA.add('dummy', 0, sA, [K(0, *DA, 'phoneglare', 215, angry=1.0), K(sA, *DA, 'phoneglare', 215, angry=1.0)])
t_th0 = r3(sA + sa(0.05))
t_rel = r3(max(t_th0 + sa(THOR['rel']), c_mit))
t_th0 = r3(t_rel - sa(THOR['rel']))
REL_W = W(DA, FA, THOR['relP'])
cA.add('dummy', sA, c_jetzt, [K(sA, *DA, 'stand', FA, angry=1.0, cut=True), K(t_th0, *DA, 'thorthrow', FA, angry=1.0), K(r3(t_rel + sa(0.3)), *DA, 'thorthrow', FA, angry=0.0), K(c_jetzt, *DA, 'thorthrow', FA, angry=0.0)])
cA.add('dummy', c_jetzt, c_weg, [K(c_jetzt, *DA, 'catchwait', FA), K(c_weg, *DA, 'catchwait', FA)])
cA.add('dummy', c_weg, 1, [K(c_weg, *DA, 'physikshrug', FA), K(1, *DA, 'physikshrug', FA)])
# Handy: in der Hand (hand 1) beim Anfunkeln + Wirbeln (dreht sich), ab Abwurf freier Flug durchs Fenster hinaus in den Nachthimmel
phA = [phone_w(0, REL_W, tilt=-90.0, face=215, hand=1.0, drop=0.0, text='feed', glow=0.6), phone_w(r3(sA - 0.002), REL_W, tilt=-90.0, face=215, hand=1.0, drop=0.0, glow=0.6),
       phone_w(sA, REL_W, tilt=-90.0, face=FA, hand=1.0, drop=0.0, glow=0.6, cut=True), phone_w(t_th0, REL_W, tilt=-90.0, face=FA, hand=1.0, drop=0.0, glow=0.6)]
nsp = 24
for i in range(1, nsp + 1):
    tt = t_th0 + (t_rel - t_th0) * i / nsp
    phA.append(phone_w(r3(tt - (0.002 if i == nsp else 0)), REL_W, tilt=round(-90 - 540 * i / nsp, 1), face=FA, hand=1.0, drop=0.0, glow=0.6))
# A2-Kamera (über die Schulter zum Fenster) → Endpunkt des Flugs liegt genau auf ihrer Blicklinie durchs Fenster (gut sichtbar)
CAM_A2 = W(DA, FA, [1.2, 0.85, -1.85])
LOOK_A2 = [WIN_C[0], 2.0, WIN_C[2]]
dv = [LOOK_A2[i] - CAM_A2[i] for i in range(3)]
END = [CAM_A2[i] + dv[i] * ((CAM_A2[0] + 16.0) / -dv[0]) for i in range(3)]   # bei x −16 (vor den Häusern, im Himmel)
FLY = 1.5
path = []
for i in range(0, 25):
    u = i / 24
    if u < 0.12:                               # bis zum Fenster (fast gerade, schnell)
        k = u / 0.12; p = lerp(REL_W, [WIN_C[0], WIN_C[1] + 0.05, WIN_C[2]], k)
    else:                                      # weiter Bogen hinaus (steigt) bis zum Endpunkt
        k = (u - 0.12) / 0.88; k2 = 1 - (1 - k) ** 1.6
        p = lerp([WIN_C[0], WIN_C[1] + 0.05, WIN_C[2]], END, k2); p[1] += 2.2 * math.sin(math.pi * k) * 0.5
    path.append((r3(t_rel + sa(FLY * u)), p))
for j, (tt, p) in enumerate(path):
    phA.append(phone_w(tt, p, tilt=round(-630 - 900 * j / 24, 1), face=FA, hand=0.0, glow=0.6, size=round(0.6 * j / 24, 3)))
t_gone = r3(t_rel + sa(FLY))
cA.add('betthandy', 0, t_gone, phA)
cA.add('funkelstern', t_gone, r3(t_gone + sa(0.9)), [K(t_gone, END[0], END[2], 'park', 0, y=END[1], fill=0.0, size=2.2), K(r3(t_gone + sa(0.9)), END[0], END[2], 'park', 0, y=END[1], fill=1.0, size=2.2)])
def check_a():
    """Flug: geht durch die Fensteröffnung (y 0,95 … 2,15, z −0,95 … 0,15 bei x −1,8), landet weit draußen (> 15 m), weg vom Dummy."""
    pa = REL_W; pb = path[3][1]
    for i in range(len(path) - 1):
        a, b = path[i][1], path[i + 1][1]
        if a[0] >= -1.8 >= b[0]:
            k = (a[0] + 1.8) / (a[0] - b[0]); y = a[1] + (b[1] - a[1]) * k; z = a[2] + (b[2] - a[2]) * k
            assert 0.95 < y < 2.15 and -0.95 < z < 0.15, ('A: Handy verfehlt das Fenster', y, z)
            break
    assert math.hypot(END[0] - DA[0], END[2] - DA[1]) > 14, ('A: Flug zu kurz', END)
    assert t_gone < c_undA + sa(0.2), ('A: Handy noch nicht weg bei „Und ...“', t_gone, c_undA)
    return [round(v, 1) for v in END]
DUM_UP = [[DA[0] - 0.3, 0.9, DA[1] - 0.3], [DA[0] + 0.3, 2.05, DA[1] + 0.3]]
camA = [
  # Karte: funkelt das Handy böse an
  *shot(0, sA - 0.003, F([*body(*DA), *DUM_UP], -25, 6, ANS), push=0.04),
  # Wirbeln + Wurf: von hinten seitlich, Dummy + offenes Fenster
  *shot(sA, c_jetzt - 0.003, MAN([1.7, 1.75, 3.7], [-0.9, 1.25, -0.4], 46), push=0.04),
  # Warten: über die Schulter durchs Fenster in den Nachthimmel (Funkeln)
  *shot(c_jetzt, c_undA - 0.003, MAN(CAM_A2, LOOK_A2, 46), push=0.03),
  # Und ... nichts: nah von vorn, erwartungsvoll
  *shot(c_undA, c_weg - 0.003, F(DUM_UP, -62, 4, ANS), push=0.05),
  # Weg ist es: Achselzucken, Fenster leer
  *shot(c_weg, 1, F([*body(*DA), *WIN_PTS], 20, 8, ANS), push=0.04),
]
expA = {
 'camera': camA, 'actors': cA.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_th0 + sa(0.3)), 'id': 'hammer-wirbel', 'volume': 0.8}, {'t': r3(t_rel - sa(0.05)), 'id': 'kick-whoosh', 'volume': 0.9},
         {'t': r3(t_rel + sa(0.6)), 'id': 'whoosh', 'volume': 0.35}, {'t': r3(t_gone), 'id': 'funkeln', 'volume': 0.75},
         {'t': r3(c_nix), 'id': 'leere-wind', 'volume': 0.45}],
}

# =====================================================================================================
# Antwort B: Karte = hält die Rollentausch-Karte hoch. Szene = Strahlenkranz → Riesenhandy schläft im Bett → Dummy plumpst platt drauf
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_gez = cue(B, 'explain2', 'gezückt'); c_pl = cue(B, 'explain2', 'Plötzlich'); c_und = cue(B, 'explain2', 'und du fällst'); c_voll = cue(B, 'explain2', 'voll drauf')
c_rol = cue(B, 'explain2', 'Rollen')
DB = (0.35, 0.15); FBd = 200
cB = Cast()
# Karte + „gezückt“: steht vor dem Bett, Karte hoch (holdcard), dann Strahlenkranz
cB.add('kissen', 0, c_pl, [kissen(0)]); cB.add('bettdecke', 0, c_pl, [decke(0, 0.5, MAT_Y + 0.005)])
cB.add('betthandy', 0, c_pl, [phone_w(0, [1.42, MAT_Y + 0.135, -1.2], tilt=0.0, face=250, text='feed', glow=0.4)])
cB.add('dummy', 0, c_pl, [K(0, *DB, 'holdcard', FBd), K(c_pl, *DB, 'holdcard', FBd)])
CARD_W = W(DB, FBd, [-0.3, 1.62, 0.26])
cB.add('reversekarte', 0, c_pl, [K(0, *DB, 'park', FBd, y=1.2, hand=1, drop=-0.1, size=0.3, glow=0.0), K(r3(sb(0.45)), *DB, 'park', FBd, y=1.2, hand=1, drop=-0.1, size=0.3, glow=1.0),
                                 K(c_pl, *DB, 'park', FBd, y=1.2, hand=1, drop=-0.1, size=0.3, glow=1.0)])
t_rv = r3(sB + sb(0.15))
cB.add('reverseeffekt', t_rv, c_pl, [K(t_rv, CARD_W[0], CARD_W[2] - 0.35, 'park', 0, y=CARD_W[1] + 0.0, fill=0.0, size=0.0), K(r3(t_rv + sb(0.5)), CARD_W[0], CARD_W[2] - 0.35, 'park', 0, y=CARD_W[1], fill=1.0, size=0.0),
                                      K(c_pl, CARD_W[0], CARD_W[2] - 0.35, 'park', 0, y=CARD_W[1], fill=1.0, size=0.2)])
# Riesenhandy im Bett (wie eine Matratze): Länge 1,6 m, liegt mit der Oberkante zum Kopfende (+x), schläft
GS = 7.0
G_T = 0.013 * (1 + GS)
GP = [0.85, MAT_Y + G_T / 2 + 0.002, HIP[1]]
G_TOP = GP[1] + G_T / 2
# Dummy schwebt waagerecht über dem Bett (Bauch nach unten) und plumpst bei „voll drauf“ platt aufs Handy
FEET = (-0.42, HIP[1]); FF = 90
Y_AIR = 1.75; Y_FLAT = round(G_TOP + 0.125, 3)
t_drop = r3(max(c_und + sb(0.15), c_voll - sb(0.3))); t_land = r3(t_drop + sb(0.32))
dB = [K(c_pl, *FEET, 'flopfall', FF, y=Y_AIR), K(r3(t_drop), *FEET, 'flopfall', FF, y=Y_AIR - 0.05)]
for i in range(1, 7):
    u = i / 6
    dB.append(K(r3(t_drop + (t_land - t_drop) * u), *FEET, 'flopfall', FF, y=round(Y_AIR - 0.05 - (Y_AIR - 0.05 - Y_FLAT) * u * u, 3)))
dB += [K(r3(t_land + sb(0.02)), *FEET, 'flopflat', FF, y=Y_FLAT - 0.03), K(r3(t_land + sb(0.18)), *FEET, 'flopflat', FF, y=Y_FLAT + 0.05),
       K(r3(t_land + sb(0.36)), *FEET, 'flopflat', FF, y=Y_FLAT), K(1, *FEET, 'flopflat', FF, y=Y_FLAT)]
cB.add('dummy', c_pl, 1, dB)
# Handy wird kurz platt gedrückt + wacht verdutzt auf
gK = [K(c_pl, GP[0], GP[2], 'park', 270, y=GP[1], size=GS, text='sleep', squish=0.0, glow=0.3), K(r3(t_land - 0.002), GP[0], GP[2], 'park', 270, y=GP[1], size=GS, text='sleep', squish=0.0),
      K(t_land, GP[0], GP[2], 'park', 270, y=GP[1], size=GS, text='oops', squish=1.0, glow=0.6), K(r3(t_land + sb(0.25)), GP[0], GP[2], 'park', 270, y=GP[1], size=GS, squish=0.0),
      K(r3(t_land + sb(0.45)), GP[0], GP[2], 'park', 270, y=GP[1], size=GS, squish=0.25), K(r3(t_land + sb(0.7)), GP[0], GP[2], 'park', 270, y=GP[1], size=GS, squish=0.0, glow=0.3), K(1, GP[0], GP[2], 'park', 270, y=GP[1], size=GS, squish=0.0)]
cB.add('riesenhandy', c_pl, 1, gK)
cB.add('bettdecke', c_pl, 1, [decke(c_pl, 0.33, G_TOP + 0.003, x=0.04), decke(r3(t_land - 0.002), 0.33, G_TOP + 0.003, x=0.04),
                              decke(t_land, 0.33, G_TOP + 0.003, x=0.04, squish=1.0), decke(r3(t_land + sb(0.3)), 0.33, G_TOP + 0.003, x=0.04, squish=0.2)])
HEAD_B = [FEET[0] + 1.62, Y_FLAT, FEET[1]]
t_stB = r3(t_land + sb(0.5))
cB.add('sternchen', t_stB, 1, [K(t_stB, HEAD_B[0], HEAD_B[2], 'park', 0, y=HEAD_B[1] + 0.3, fill=0.0, size=0.2), K(r3(t_stB + sb(0.4)), HEAD_B[0], HEAD_B[2], 'park', 0, y=HEAD_B[1] + 0.3, fill=1.0, size=0.2)])
IMP_B = [1.0, G_TOP + 0.25, HIP[1] + 0.3]
cB.add('klatschstern', t_land, r3(t_land + sb(0.45)), [K(t_land, *IMP_B[::2], 'park', 0, y=IMP_B[1], fill=0.0, size=0.6), K(r3(t_land + sb(0.45)), *IMP_B[::2], 'park', 0, y=IMP_B[1], fill=1.0, size=0.6)])
def check_b():
    """Dummy liegt beim Aufprall wirklich auf dem Handy (Rumpf über der Handyfläche), Aufprall bei „voll drauf“."""
    torso_x = FEET[0] + 0.9
    assert GP[0] - 0.8 < torso_x < GP[0] + 0.8, ('B: Rumpf nicht über dem Handy', torso_x)
    assert abs(t_land - c_voll) * TB < 0.6, ('B: Aufprall nicht bei „voll drauf“', (t_land - c_voll) * TB)
    return round((t_land - c_voll) * TB, 2)
G_PTS = [[0.05, MAT_Y, -1.825], [1.65, G_TOP + 0.05, -1.025]]
DB_UP = [[DB[0] - 0.45, 0.9, DB[1] - 0.3], [DB[0] + 0.3, 2.0, DB[1] + 0.3], [CARD_W[0], CARD_W[1] + 0.25, CARD_W[2]]]
camB = [
  # Karte: hält die Karte hoch (Bett mit normalem Handy dahinter)
  *shot(0, sB - 0.003, F([*body(*DB), [CARD_W[0], CARD_W[1] + 0.3, CARD_W[2]], [1.6, 0.5, -1.4]], 18, 8, ANS), push=0.04),
  # gezückt: nah auf Karte + Strahlenkranz
  *shot(sB, c_pl - 0.003, F([[CARD_W[0] - 0.55, CARD_W[1] - 0.6, CARD_W[2]], [CARD_W[0] + 0.55, CARD_W[1] + 0.6, CARD_W[2]], [DB[0], 1.35, DB[1]]], 15, 4, ANS), push=0.05),
  # plötzlich: Riesenhandy schläft im Bett, Dummy schwebt waagerecht darüber
  *shot(c_pl, c_und - 0.003, F([*G_PTS, [FEET[0], Y_AIR + 0.25, FEET[1] - 0.3], [FEET[0] + 1.7, Y_AIR - 0.2, FEET[1] + 0.3]], -15, 34, ANS), push=0.04),
  # und du fällst voll drauf: tiefer seitlich, Plumps
  *shot(c_und, c_rol - 0.003, F([*G_PTS, [FEET[0], 0.4, FEET[1]], [FEET[0] + 1.75, Y_AIR - 0.1, FEET[1]]], -35, 14, ANS), push=0.05),
  # Rollen getauscht: von schräg oben – Dummy liegt platt auf dem Handy, Handy-Gesicht schaut verdutzt
  *shot(c_rol, 1, F([*G_PTS, [FEET[0], Y_FLAT + 0.25, FEET[1]], [HEAD_B[0] + 0.1, HEAD_B[1] + 0.45, HEAD_B[2]]], -20, 50, ANS), push=0.05),
]
expB = {
 'camera': camB, 'actors': cB.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sb(0.45)), 'id': 'plopp', 'volume': 0.4}, {'t': r3(t_rv), 'id': 'reverse-zauber', 'volume': 0.9},
         {'t': r3(c_pl + sb(0.1)), 'id': 'handy-schnarchen', 'volume': 0.6}, {'t': r3(t_drop), 'id': 'whoosh', 'volume': 0.45},
         {'t': r3(t_land), 'id': 'kissen-plumps', 'volume': 1.0}, {'t': r3(t_land + sb(0.04)), 'id': 'handy-klatsch', 'volume': 0.5},
         {'t': r3(t_stB), 'id': 'funkeln', 'volume': 0.3}],
}

# =====================================================================================================
# Antwort C: Karte = hält das schwere Handy mit zitternden Armen. Szene = wischt, Apps + Fotos fliegen weg, Handy wird dünn →
#            schwebt wie eine Feder hoch → sinkt sanft aufs Kissen, Dummy lehnt sich zurück
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_alle = cue(C, 'explain3', 'Alle Apps'); c_fot = cue(C, 'explain3', 'alle Fotos'); c_sof = cue(C, 'explain3', 'Sofort'); c_prob = cue(C, 'explain3', 'Problem')
cC = Cast()
cC.add('kissen', 0, 1, [kissen(0)]); cC.add('bettdecke', 0, 1, [decke(0, 0.43, 0.58)])
HEAVY_L = [0.0, 0.8, 0.4]
cC.add('dummy', 0, sC, [K(0, *HIP, 'bedheavy', FB, sweat=0.8), K(sC, *HIP, 'bedheavy', FB, sweat=0.8)])
t_float = r3(c_sof + sc(0.05))
cC.add('dummy', sC, t_float, [K(sC, *HIP, 'bedswipe', FB, sweat=0.4, cut=True), K(r3(c_fot), *HIP, 'bedswipe', FB, sweat=0.2), K(t_float, *HIP, 'bedswipe', FB, sweat=0.0)])
cC.add('dummy', t_float, 1, [K(t_float, *HIP, 'bedsit', FB), K(r3(c_prob - sc(0.1)), *HIP, 'bedsit', FB), K(c_prob, *HIP, 'bedrelax', FB), K(1, *HIP, 'bedrelax', FB)])
# Handy: Karte = schwer (tief, zittert), Szene = in der linken Hand, wird dünner, App-Anzahl sinkt
SIT_TILT = 37.0
phC = [phone_att(0, HEAVY_L, tilt=26.0, face=180, text='apps20', rumble=1.0, glow=0.3), phone_att(r3(sC - 0.002), HEAVY_L, tilt=26.0, face=180, rumble=1.0, glow=0.3)]
apps = [20, 16, 12, 8, 5, 2, 0]
t_a0 = r3(sC + sc(0.15)); t_a1 = r3(c_fot - sc(0.1))
for i, n in enumerate(apps):
    tt = t_a0 + (t_a1 - t_a0) * i / (len(apps) - 1)
    phC.append(phone_att(r3(tt), PHONE_SIT, tilt=SIT_TILT, face=180, text=f'apps{n}', thin=round(0.45 * i / (len(apps) - 1), 3), glow=0.4, **({'cut': True} if i == 0 else {})))
t_ph = r3(c_fot); t_cl = r3(max(c_sof - sc(0.45), t_ph + sc(0.9)))
phC += [phone_att(t_ph, PHONE_SIT, tilt=SIT_TILT, face=180, text='photos', thin=0.5, glow=0.4), phone_att(r3(t_cl - 0.002), PHONE_SIT, tilt=SIT_TILT, face=180, text='photos', thin=0.8, glow=0.4),
        phone_att(t_cl, PHONE_SIT, tilt=SIT_TILT, face=180, text='clean', thin=0.85, glow=0.7), phone_att(r3(t_float - 0.002), PHONE_SIT, tilt=SIT_TILT, face=180, text='clean', thin=0.8, glow=0.5)]
cC.add('betthandy', 0, t_float, phC)
# Federflug in Weltkoordinaten: hoch über den Kopf, dann pendelnd hinab aufs Kissen (neben den Kopf)
P0 = W(HIP, FB, PHONE_SIT)
LAND = [1.5, MAT_Y + 0.13 + 0.004, -1.16]
fl = []
t_up = r3(min(c_prob - sc(0.05), t_float + sc(1.0))); t_end = r3(min(0.96, c_prob + sc(1.7)))
for i in range(0, 13):                         # sanft nach oben (federleicht)
    u = i / 12
    p = lerp(P0, [0.75, 1.62, -1.25], ease(u)); p[2] += 0.05 * math.sin(u * math.pi * 2)
    fl.append(phone_w(r3(t_float + (t_up - t_float) * u), p, tilt=round(SIT_TILT * (1 - u) + 10 * math.sin(u * 6), 1), turn=round(-65 * u, 1), face=270, text='clean', thin=0.8, glow=0.6))
for i in range(1, 25):                         # pendelt hinab (wie eine Feder)
    u = i / 24
    base_ = lerp([0.75, 1.62, -1.25], LAND, u)
    sway = math.sin(u * math.pi * 3.0) * 0.16 * (1 - u)
    p = [base_[0] + sway * 0.6, base_[1] + 0.06 * math.sin(u * math.pi) , base_[2] + sway]
    fl.append(phone_w(r3(t_up + (t_end - t_up) * u), p, tilt=round(18 * math.sin(u * math.pi * 3.0) * (1 - u), 1), turn=round((-65 + 22 * math.sin(u * math.pi * 3.0 + 0.6)) * (1 - u ** 3), 1), face=270, text='clean', thin=0.8, glow=0.5))
fl.append(phone_w(1, LAND, tilt=0.0, face=270, text='clean', thin=0.8, glow=0.3))
cC.add('betthandy', t_float, 1, fl)
for _p in cC.parts['betthandy']:
    for _k in _p[2]: _k['size'] = 0.3   # in C etwas größer (gut sichtbar beim Federflug)
APP_W = W(HIP, FB, [PHONE_SIT[0], PHONE_SIT[1] + 0.05, PHONE_SIT[2]])
cC.add('appregen', t_a0, t_ph, [K(t_a0, APP_W[0], APP_W[2], 'burst', 0, y=APP_W[1], mark=0.0, size=0.0)])
cC.add('appregen', t_ph, t_cl, [K(t_ph, APP_W[0], APP_W[2], 'burst', 0, y=APP_W[1], mark=1.0, size=0.2)])
def check_c():
    """Federflug: Handy bleibt immer über dem Bett/Kissen, schwebt über den Kopf (≥ 0,15 m Abstand) und liegt am Ende auf dem Kissen."""
    head_sit = W(HIP, FB, [0, 1.36, 0.05])
    for k in fl:
        p = (k['x'], k.get('y', 0), k['z'])
        assert -0.05 < p[0] < 1.75 and -1.9 < p[2] < -0.95, ('C: Handy verlässt das Bett', p)
        assert math.dist(p, head_sit) > 0.15 or p[1] > 1.45, ('C: Handy zu nah am Kopf', p)
    assert abs(LAND[0] - PILLOW[0]) < 0.17 and abs(LAND[2] - PILLOW[1]) < 0.3, ('C: landet nicht auf dem Kissen', LAND)
    return round((t_end - c_prob) * TC, 2)
SIT_PTS = [[HIP[0] - 0.75, 0.45, HIP[1] - 0.35], [HIP[0] + 0.3, 1.5, HIP[1] + 0.35]]
PH_W = W(HIP, FB, PHONE_SIT)
PHB = [[PH_W[0] - 0.1, PH_W[1] - 0.08, PH_W[2] - 0.1], [PH_W[0] + 0.1, PH_W[1] + 0.12, PH_W[2] + 0.1]]
camC = [
  # Karte: sitzt im Bett, Handy schwer, zittert
  *shot(0, sC - 0.003, F(SIT_PTS, -40, 14, ANS), push=0.04),
  # Alle Apps weg: über die Schulter, Bildschirm mit verschwindenden Apps + fliegende Symbole
  *shot(sC, c_fot - 0.003, F([*PHB, [PH_W[0], PH_W[1] + 0.45, PH_W[2]]], 80, 62, (140, 940, 520, 1220)), push=0.05),
  # alle Fotos gelöscht: von vorn, Fotos fliegen weg, Handy wird dünn
  *shot(c_fot, c_sof - 0.003, F([*SIT_PTS[:1], [HIP[0] + 0.3, 1.5, HIP[1] + 0.35], [APP_W[0], APP_W[1] + 0.7, APP_W[2]]], -28, 16, ANS), push=0.05),
  # sofort viel leichter: Handy schwebt hoch
  *shot(c_sof, c_prob - 0.003, F([*SIT_PTS, [0.75, 1.75, -1.25]], -18, 10, ANS), push=0.04),
  # Problem gelöst: Handy sinkt aufs Kissen, Dummy lehnt sich zurück
  *shot(c_prob, 1, F([[0.3, 0.45, -1.75], [1.75, 1.7, -1.05]], -25, 26, ANS), push=0.04),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sC + sc(0.1)), 'id': 'wischen', 'volume': 0.8}, {'t': r3(sC + sc(1.6)), 'id': 'wischen', 'volume': 0.7},
         *[{'t': r3(t_a0 + (t_a1 - t_a0) * i / (len(apps) - 1)), 'id': 'app-weg', 'volume': 0.55} for i in range(1, len(apps))],
         {'t': r3(t_ph + sc(0.2)), 'id': 'app-weg', 'volume': 0.55}, {'t': r3(t_ph + sc(0.6)), 'id': 'app-weg', 'volume': 0.55},
         {'t': r3(t_cl), 'id': 'plopp', 'volume': 0.5}, {'t': r3(t_float), 'id': 'feder', 'volume': 0.8},
         {'t': r3(t_end - sc(0.1)), 'id': 'kissen-plumps', 'volume': 0.25}, {'t': r3(c_prob + sc(0.2)), 'id': 'himmel-chor', 'volume': 0.25}],
}
expC['sfx'] = [s for s in expC['sfx'] if s['volume'] > 0 and s['t'] < 1]

# =====================================================================================================
# Abstimmung + Outro: Dummy steht vor dem Bett, Handy liegt leuchtend auf dem Kissen
# =====================================================================================================
DV = (0.2, 0.25)
PH_END = [1.42, MAT_Y + 0.135, -1.2]
def endcast(wave=False):
    c = Cast()
    c.add('kissen', 0, 1, [kissen(0)]); c.add('bettdecke', 0, 1, [decke(0, 0.5, MAT_Y + 0.005)])
    c.add('betthandy', 0, 1, [phone_w(0, PH_END, tilt=0.0, face=250, text='feed', glow=0.8)])
    c.add('dummy', 0, 1, [K(0, *DV, 'stand', 200, question=0.0 if wave else 1.0)] + ([K(0.12, *DV, 'wave', 200), K(1, *DV, 'wave', 200)] if wave else []))
    return c.build()
V_PTS = [*body(*DV), [1.6, 0.5, -1.4], [-0.1, 0.5, -1.5]]
vote = {'camera': shot(0, 1, F(V_PTS, 20, 4, (120, 960, 1060, 1320)), push=0.04), 'actors': endcast(), 'stage': STAGE}
outro = {'camera': shot(0, 1, F(V_PTS, 22, 6, (100, 980, 780, 1110)), push=0.05), 'actors': endcast(True), 'stage': STAGE}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Dir ist mal wieder das Handy direkt ins Gesicht gefallen, während du im Bett liegst – was machst du? 📱💥 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Niemand wurde verletzt. 😄\n\n"
        "#waswürdestdutun #handy #bett #unoreverse #comedy #quiz #dummy #spezial\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': STAGE, 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy wirbelt das Handy wie einen Hammer über dem Kopf und schleudert es in weitem Bogen durch das offene Fenster hinaus in den Nachthimmel (Funkeln). Dann wartet er mit offener Hand, ob es zurückfliegt – es kommt nicht. Achselzucken. Niemand wird getroffen.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Leuchtender Rollentausch-Effekt mit roter Karte (ohne Logo). Plötzlich liegt ein riesiges Handy wie eine Matratze im Bett, zugedeckt und schlafend (Zzz) – der Dummy schwebt waagerecht darüber und plumpst platt darauf. Comichaft, niemand wird verletzt.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy sitzt im Bett und wischt hektisch über das Handy, App-Symbole und Fotos fliegen davon, das Handy wird immer dünner und heller, schwebt wie eine Feder hoch und sinkt sanft aufs Kissen. Der Dummy lehnt sich zufrieden zurück.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
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
print('A (Endpunkt Flug):', check_a(), '| B (Aufprall s nach „voll drauf“):', check_b(), '| C (Landung s nach „Problem“):', check_c())
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
_st = {'S': 0, 'A': seclen('situation'), 'B': seclen('situation') + TA, 'C': seclen('situation') + TA + TB}
f = lambda sec, t: round((_st[sec] + t * {'S': TS, 'A': TA, 'B': TB, 'C': TC}[sec]) * 30)
print('Schlüsselbilder: Sit-Halten', f('S', t_sl0 * 0.6), '| Sit-Klatsch', f('S', t_hit + ss(0.15)), '| Sit-Totale', f('S', (c_wae + c_dir2) / 2), '| Sit-Frage', f('S', 0.97),
      '| A-Karte', f('A', sA * 0.6), '| A-Wirbel', f('A', t_th0 + sa(1.2)), '| A-Wurf', f('A', t_rel + sa(0.08)), '| A-Himmel', f('A', t_gone + sa(0.4)), '| A-nichts', f('A', (c_undA + c_weg) / 2), '| A-weg', f('A', 0.97),
      '| B-Karte', f('B', sB * 0.6), '| B-Effekt', f('B', (sB + c_pl) / 2), '| B-Handy', f('B', (c_pl + c_und) / 2), '| B-Fall', f('B', (t_drop + t_land) / 2), '| B-Platt', f('B', 0.97),
      '| C-Karte', f('C', sC * 0.6), '| C-Apps', f('C', (t_a0 + t_a1) / 2), '| C-Fotos', f('C', (t_ph + t_cl) / 2), '| C-Feder', f('C', t_up), '| C-Kissen', f('C', 0.98))
