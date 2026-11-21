# Hilfsskript: erzeugt scenarios/spezial-taube-angekackt.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-taube-angekackt-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-tauben.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, den Tauben passiert NIE etwas. Der Klecks ist nur ein stilisierter weißer Cartoon-Fleck.
# Bühne: Tauben-Straße (Haus des Dummys, Strommasten, Oberleitung mit Tauben, Baum) + Parkbank auf der Wiese vorn.
#  A: UNO-Reverse-Karte leuchtet, dem Dummy wachsen weiße Flügel, er hebt ab, kreist über der Taube auf der Banklehne und lässt einen
#     weißen Cartoon-Fleck auf ihren Kopf fallen (Taube schaut verdutzt, Fragezeichen).
#  B: Lesebrille auf, Rechnung „RECHNUNG – REINIGUNG“ auf dem Block schreiben, Umschlag mit Briefmarke, Übergabe an die Brieftaube
#     (Posttasche + Mütze), die damit zur Täter-Taube auf der Oberleitung fliegt.
#  C: Dummy stapft zum Strommast mit der „TAUBEN-LADESTATION“ (Tauben auf der Leitung laden, grüne Akku-Symbole), zieht den Riesen-Stecker
#     – die Akkus springen auf „0 %“ (rot), die Tauben gehen in den Energiesparmodus und bleiben einfach sitzen (Prüfung check_c).
# Spezial-Regeln: 61–66 s, keine Dopplungen, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-taube-angekackt'
S = dict(
situation="Du wurdest mal wieder von einer Taube angekackt. Mitten auf die Schulter. Was machst du?",
o1c="UNO Reverse und zurückfliegen", o1s="A: UNO Reverse Karte. Dir wachsen Flügel, du fliegst über sie und kackst einfach zurück.",
o2c="Rechnung per Brieftaube", o2s="B: Du schickst der Taube per Brieftaube eine Rechnung für die Reinigung.",
o3c="An der Ladestation den Stecker ziehen", o3s="C: Du gehst zur Aufladestation der Tauben auf der Oberleitung und ziehst einfach den Stecker.",
e1="UNO Reverse Karte gezückt. Flügel ausgebreitet, hoch in die Luft und einmal sauber zurückgezahlt.",
e2="Ganz offiziell in Deutschland. Reinigungsrechnung schreiben, Briefmarke drauf und direkt per Brieftaube zustellen.",
e3="Ab zur Oberleitung. Einmal kräftig am Stecker ziehen – und schon ist bei den Tauben der Akku leer.",
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

# ---- Sichtbarkeit je Einstellung: Figur nur in [t0, t1] zeigen, sonst y −30 (wie spezial-tauben) ----
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
# feste Plätze (Bühne taubenstrasse, src/stage/Settlement.tsx TAUBEN)
# =====================================================================================================
HOUSE = (0.0, -12.5)
WIRE_POLES = [-20, -8, 4, 16]; WIRE_Z = 5.6
def wireY(x):
    for a, b in zip(WIRE_POLES, WIRE_POLES[1:]):
        if a <= x <= b:
            u = (x - (a + b) / 2) / ((b - a) / 2); return 6.5 - 0.28 * (1 - u * u)
    return 6.5
PS = 0.4                                   # Tauben draußen 1,4-fach
def fmt(p, f): return f'{p[0]:.2f} {p[1]:.2f} {p[2]:.2f} {f:.0f}'
WIRE_X = [-4.5 + i * 0.6 for i in range(14)]
CUL_WIRE_X = -1.5                         # Platz der Täter-Taube auf der Leitung (Antwort B)
def wire_text(skip=None):
    return ';'.join(fmt((x, wireY(x) + 0.02, WIRE_Z), 180 + ((i * 37) % 40 - 20)) for i, x in enumerate(WIRE_X) if skip is None or abs(x - skip) > 0.1)
TXT_WIRE = wire_text()
TXT_WIRE_B = wire_text(CUL_WIRE_X)
# Parkbank (Objekt "parkbank", Sitz zeigt nach +z): Lehne oben y 0.875 bei z −0.23, Armlehne y 0.68 bei x ±0.78
BENCH = (-1.6, 6.5)
CUL = (-1.25, 0.875, BENCH[1] - 0.23)     # Täter-Taube auf der Banklehne
ARM_R = (BENCH[0] + 0.78, 0.68, BENCH[1])  # rechte Armlehne (aus Sicht der Kamera)
D0 = (-0.25, 7.25)                         # Platz des Dummys neben der Bank
F0 = face_to(D0, (CUL[0], CUL[2]))         # schaut zur Taube auf der Lehne
# Tauben-Ladestation am Mast x 4 (face 90 → Vorderseite nach +x), Stecker-Griff 0,445 m vor der Mastachse
POLE_X = 4.0
PULL = (POLE_X + 0.965, WIRE_Z)            # Dummy packt den Stecker (face 270)

def flock(t, text, **kw):
    kw.setdefault('size', PS)
    return K(t, 0, 0, 'perch', 180, text=text, **kw)
def house(t):
    return K(t, *HOUSE, 'park', 180, door=0.0, mark=0.0, squish=0.0)
def bench(t):
    return K(t, *BENCH, 'park', 180)
def station(t, fill=0.0, glow=1.0):
    return K(t, POLE_X, WIRE_Z, 'park', 90, fill=fill, glow=glow)
def pig(t, p, motion='perch', face=180, **kw):
    kw.setdefault('size', PS)
    return K(t, p[0], p[2], motion, face, y=p[1], **kw)
def street(c, t0=0.0, t1=1.0, wire=TXT_WIRE, plug=True, **fk):
    """Bühne mit Haus, Bank, Ladestation und Tauben auf der Leitung"""
    c.add('haus', t0, t1, [house(t0)])
    c.add('parkbank', t0, t1, [bench(t0)])
    c.add('tauben', t0, t1, [flock(t0, wire, **fk)])
    if plug: c.add('ladestation', t0, t1, [station(t0)])

# Schulter-Punkt (linke Schulter oben) eines stehenden Dummys
def shoulder(x, z, face):
    dx, dz = rot(face, 0.165, 0.02)
    return (x + dx, 1.54, z + dz)

# =====================================================================================================
# Situation: Dummy schlendert gut gelaunt – Taube fliegt über ihn – Volltreffer auf die Schulter – er starrt drauf
# =====================================================================================================
L0 = 'situation'
TS = seclen(L0); ss = lambda s: s / TS
c_mit = cue(L0, 'situation', 'Mitten'); c_was = cue(L0, 'situation', 'Was machst')
t_hit = r3(c_mit - ss(0.25))
t_over = r3(t_hit - ss(0.55))
X_START = 2.7
SH = shoulder(D0[0], D0[1], 270)
P_OVER = (SH[0] - 0.05, 3.35, SH[2] - 0.05)
t_land = r3(c_mit + ss(1.0))
cs_ = Cast()
street(cs_)
cs_.add('dummy', 0, 1, [K(0, X_START, D0[1], 'walk', 270), K(r3(t_hit - 0.003), D0[0], D0[1], 'walk', 270),
                        K(t_hit, D0[0], D0[1], 'splatshock', 270, klecks=0.0), K(r3(t_hit + ss(0.12)), D0[0], D0[1], 'splatshock', 270, klecks=1.0),
                        K(r3(c_was), D0[0], D0[1], 'splatshock', 270, question=0.0, cut=True), K(r3(c_was + ss(0.3)), D0[0], D0[1], 'splatshock', 270, question=1.0),
                        K(1, D0[0], D0[1], 'splatshock', 270, question=1.0)])
p_start = (7.5, 5.2, 3.2)
fA = face_to((p_start[0], p_start[2]), (P_OVER[0], P_OVER[2]))
fB = face_to((P_OVER[0], P_OVER[2]), (CUL[0], CUL[2]))
cs_.add('taube', 0, 1, [pig(0, p_start, 'fly', fA), pig(t_over, P_OVER, 'fly', fA), pig(r3(t_over + ss(0.5)), (P_OVER[0] - 0.6, 2.6, P_OVER[2] - 0.3), 'fly', fB),
                        pig(r3(t_land - 0.003), CUL, 'fly', 200), pig(t_land, CUL, 'perch', 200), pig(1, CUL, 'perch', 200)])
cs_.add('klecks', t_over, t_hit, [K(t_over, P_OVER[0], P_OVER[2], 'fall', 0, y=P_OVER[1] - 0.12),
                                  K(r3((t_over + t_hit) / 2), P_OVER[0] + 0.0, P_OVER[2] + 0.02, 'fall', 0, y=P_OVER[1] - 0.12 - (P_OVER[1] - SH[1]) * 0.28),
                                  K(t_hit, SH[0], SH[2], 'fall', 0, y=SH[1] + 0.05)])
situation = {
 'camera': [
   *shot(0, c_mit - 0.003, F([[-0.9, 0, D0[1]], [X_START + 0.3, 1.9, D0[1]], [P_OVER[0], 3.6, P_OVER[2]]], -6, 5, SIT), push=0.05),
   *shot(c_mit, c_was - 0.003, M([SH[0] - 1.25, 1.85, SH[2] + 2.55], [SH[0] - 0.12, 1.42, SH[2]], 34, push=0.12)),
   *shot(c_was, 1, F([[BENCH[0] - 1.0, 0, BENCH[1]], [D0[0] + 0.4, 1.95, D0[1]], [CUL[0], 1.3, CUL[2]]], 10, 6, SIT), push=0.06),
 ],
 'actors': cs_.build(), 'stage': 'taubenstrasse',
 'sfx': [{'t': 0.02, 'id': 'tauben-gurren', 'volume': 0.35}, {'t': r3(t_over - ss(0.4)), 'id': 'fluegelschlag', 'volume': 0.5},
         {'t': r3(t_hit), 'id': 'klecks-platsch', 'volume': 0.9}, {'t': r3(c_was + ss(0.1)), 'id': 'tauben-gurren', 'volume': 0.45}],
}

# Grundaufstellung für die Karten: Dummy (Klecks auf der Schulter) neben der Bank, Taube auf der Lehne
def card_cast(c, t1, motion='stand', face=F0, culprit=True, **dk):
    c.add('dummy', 0, t1, [K(0, *D0, motion, face, klecks=1.0, **dk)])
    if culprit: c.add('taube', 0, t1, [pig(0, CUL, 'perch', 200)])
CARD_PTS = [[CUL[0] - 0.45, 0, CUL[2]], [D0[0] + 0.4, 1.95, D0[1]], [CUL[0], 1.3, CUL[2]]]

# =====================================================================================================
# Antwort A: UNO-Reverse-Karte – Flügel – abheben – über der Taube kreisen, weißer Cartoon-Fleck auf ihren Kopf
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_flue = cue(A, 'explain1', 'Flügel'); c_hoch = cue(A, 'explain1', 'hoch'); c_und = cue(A, 'explain1', 'und einmal')
c_zur = cue(A, 'explain1', 'zurückgezahlt')
cA = Cast()
street(cA)
card_cast(cA, sA, 'armscross', F0, culprit=False, brow=1.0)
# Karte zücken (holdcard), Karte zur Kamera
DA = (D0[0] - 0.1, D0[1] + 0.1)
cA.add('dummy', sA, c_flue, [K(sA, *DA, 'holdcard', 180, klecks=1.0), K(c_flue, *DA, 'holdcard', 180)])
cA.add('reversekarte', sA, c_flue, [K(sA, *DA, 'park', 180, y=1.2, hand=1, drop=-0.1, size=0.3, glow=0.0), K(r3(sA + sa(0.45)), *DA, 'park', 180, glow=1.0),
                                    K(c_flue, *DA, 'park', 180, glow=1.0)])
# Flügel wachsen + gehen auf
cA.add('dummy', c_flue, c_hoch, [K(c_flue, *DA, 'wingpose', 180, klecks=1.0, wings=0.0), K(r3(c_flue + sa(0.9)), *DA, 'wingpose', 180, wings=1.0), K(c_hoch, *DA, 'wingpose', 180, wings=1.0)])
# abheben (Flügel schlagen kräftig) – steigt bis 2,4 m (Füße)
LIFT = (CUL[0] + 0.9, CUL[2] + 0.55)
cA.add('dummy', c_hoch, c_und, [K(c_hoch, *DA, 'flyhover', 180, klecks=1.0, wings=2.0, y=0.0),
                                K(r3(c_hoch + sa(0.25)), *DA, 'flyhover', 200, y=0.35),
                                K(c_und, *LIFT, 'flyhover', 230, y=2.3)])
# Kreisen über der Taube (Radius 0,75 m um die Taube), Fleck fällt im Vorbeiflug auf ihren Kopf
R = 0.75; Y_FLY = 2.3
th0 = math.atan2(LIFT[1] - CUL[2], LIFT[0] - CUL[0])
NCI = 14
fly_keys = []
for i in range(NCI + 1):
    u = i / NCI
    th = th0 + u * 2 * math.pi * 1.05
    x = CUL[0] + R * math.cos(th); z = CUL[2] + R * math.sin(th)
    # Tangente (gegen den Uhrzeigersinn von oben = +th)
    tx, tz = -math.sin(th), math.cos(th)
    f = round(math.degrees(math.atan2(tx, -tz)) % 360, 1)
    t = c_und + (1 - c_und) * u * 0.92
    fly_keys.append(K(r3(t), x, z, 'flyhover', f, y=Y_FLY, wings=2.0, klecks=1.0))
fly_keys.append(K(1, fly_keys[-1]['x'], fly_keys[-1]['z'], 'flyhover', fly_keys[-1]['face'], y=Y_FLY, wings=2.0))
cA.add('dummy', c_und, 1, fly_keys)
t_drop = r3(c_und + (1 - c_und) * 0.28)
t_dhit = r3(t_drop + sa(0.5))
def at_circle(t):
    u = (t - c_und) / ((1 - c_und) * 0.92); th = th0 + u * 2 * math.pi * 1.05
    return (CUL[0] + R * math.cos(th), CUL[2] + R * math.sin(th))
dp = at_circle(t_drop)
HEAD = (CUL[0] + 0.0, CUL[1] + 0.46, CUL[2] + 0.03)
cA.add('klecks2', t_drop, t_dhit, [K(t_drop, dp[0], dp[1], 'fall', 0, y=Y_FLY + 0.7), K(r3((t_drop + t_dhit) / 2), (dp[0] * 0.45 + HEAD[0] * 0.55), (dp[1] * 0.45 + HEAD[2] * 0.55), 'fall', 0, y=Y_FLY + 0.15),
                                   K(t_dhit, HEAD[0], HEAD[2], 'fall', 0, y=HEAD[1] + 0.03)])
cA.parts['taube'] = []
cA.add('taube', 0, 1, [pig(0, CUL, 'perch', 200, splat=0.0, question=0.0), pig(r3(t_dhit - 0.002), CUL, 'perch', 200, splat=0.0, question=0.0),
                       pig(t_dhit, CUL, 'perch', 200, splat=1.0, question=0.0), pig(r3(t_dhit + sa(0.3)), CUL, 'nod', 200, question=1.0), pig(1, CUL, 'nod', 200, question=1.0)])
camA = [
  *shot(0, sA - 0.003, F(CARD_PTS, 8, 5, ANS), push=0.04),
  *shot(sA, c_flue - 0.003, M([DA[0] - 0.3, 1.45, DA[1] + 3.6], [DA[0] - 0.2, 1.25, DA[1]], push=0.1)),
  *shot(c_flue, c_hoch - 0.003, F([[DA[0] - 1.15, 0.2, DA[1]], [DA[0] + 1.15, 2.2, DA[1]]], 20, 6, ANS), push=0.06),
  *shot(c_hoch, c_und - 0.003, F([[DA[0], 0, DA[1]], [LIFT[0], Y_FLY + 1.9, LIFT[1]], [CUL[0] - 0.4, 0.8, CUL[2]], [DA[0] + 0.9, 1.0, DA[1]]], 5, -2, ANS), push=0.05),
  *shot(c_und, 1, F([[CUL[0] - R - 0.35, 0.75, CUL[2]], [CUL[0] + R + 0.35, Y_FLY + 1.5, CUL[2]]], 6, 8, ANS), push=0.05),
]
expA = {
 'camera': camA, 'actors': cA.build(), 'stage': 'taubenstrasse',
 'sfx': [{'t': r3(sA + sa(0.05)), 'id': 'karte-klatsch', 'volume': 0.7}, {'t': r3(sA + sa(0.4)), 'id': 'plopp', 'volume': 0.6},
         {'t': r3(c_flue + sa(0.1)), 'id': 'himmel-chor', 'volume': 0.6}, {'t': r3(c_hoch), 'id': 'fluegelschlag', 'volume': 0.6},
         {'t': r3(c_und + sa(0.4)), 'id': 'whoosh', 'volume': 0.5}, {'t': r3(t_dhit), 'id': 'klecks-platsch', 'volume': 0.9},
         {'t': r3(t_dhit + sa(0.25)), 'id': 'tauben-gurren', 'volume': 0.45}],
}

# =====================================================================================================
# Antwort B: Lesebrille, Rechnung schreiben – Umschlag + Briefmarke – Brieftaube fliegt zur Täter-Taube auf der Leitung
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_rein = cue(B, 'explain2', 'Reinigungsrechnung'); c_brief = cue(B, 'explain2', 'Briefmarke'); c_dir = cue(B, 'explain2', 'und direkt')
c_zust = cue(B, 'explain2', 'zustellen')
CUL_W = (CUL_WIRE_X, wireY(CUL_WIRE_X) + 0.02, WIRE_Z)
cB = Cast()
street(cB, 0, 1, wire=TXT_WIRE_B)
cB.add('taube', 0, 1, [pig(0, CUL_W, 'perch', 180, question=0.0)])
cB.add('dummy', 0, sB, [K(0, *D0, 'armscross', 315, klecks=1.0, brow=1.0)])
DB = (D0[0], D0[1] + 0.05)
cB.add('dummy', sB, c_brief, [K(sB, *DB, 'padwrite', 180, klecks=1.0, glasses=0.0), K(r3(sB + sb(0.5)), *DB, 'padwrite', 180, glasses=1.0), K(c_brief, *DB, 'padwrite', 180, glasses=1.0)])
cB.add('dummy', c_brief, c_dir, [K(c_brief, *DB, 'holdcard', 180, klecks=1.0, glasses=1.0), K(c_dir, *DB, 'holdcard', 180)])
env_keys = [K(c_brief, *DB, 'park', 180, y=1.2, hand=1, drop=-0.08, size=0.15, mark=0.0), K(r3(c_brief + sb(0.4)), *DB, 'park', 180, mark=0.0),
            K(r3(c_brief + sb(0.42)), *DB, 'park', 180, mark=0.55), K(r3(c_brief + sb(0.6)), *DB, 'park', 180, mark=1.0), K(c_dir, *DB, 'park', 180, mark=1.0)]
cB.add('umschlag', c_brief, c_dir, env_keys)
# Übergabe: Dummy rechts neben der Bank (face 270), Brieftaube flattert von der Armlehne hoch zur Hand
DH = (ARM_R[0] + 0.85, BENCH[1] + 0.02)
FH = 270
hx, hz = rot(FH, -0.1, 0.55)
HAND = (DH[0] + hx, 1.18, DH[1] + hz)
HOVER = (HAND[0] + 0.05, HAND[1] - 0.34, HAND[2] + 0.04)
t_give = r3(c_dir + sb(0.62))
t_take = r3(t_give + sb(0.1))
cB.add('dummy', c_dir, 1, [K(c_dir, *DH, 'handover', FH, klecks=1.0, glasses=1.0), K(r3(t_take + sb(0.4)), *DH, 'handover', FH),
                           K(r3(t_take + sb(0.43)), *DH, 'proud', FH), K(1, *DH, 'proud', FH)])
BT_SEAT = ARM_R
FLY_END = (CUL_WIRE_X + 0.55, wireY(CUL_WIRE_X + 0.55) + 0.02, WIRE_Z)
bt = [pig(0, BT_SEAT, 'perch', 90, size=0.25), pig(r3(c_dir + sb(0.15)), BT_SEAT, 'perch', 90),
      pig(r3(c_dir + sb(0.2)), BT_SEAT, 'flap', 90), pig(r3(c_dir + sb(0.55)), HOVER, 'flap', 90),
      pig(r3(t_take + sb(0.25)), HOVER, 'flap', 90),
      pig(r3(t_take + sb(0.3)), HOVER, 'fly', face_to((HOVER[0], HOVER[2]), (FLY_END[0], FLY_END[2]))),
      pig(r3(t_take + sb(0.3) + (1 - t_take - sb(0.3)) * 0.5), ((HOVER[0] + FLY_END[0]) / 2, (HOVER[1] + FLY_END[1]) / 2 + 0.8, (HOVER[2] + FLY_END[2]) / 2), 'fly', 300),
      pig(r3(1 - sb(0.9)), FLY_END, 'fly', 270), pig(r3(1 - sb(0.87)), FLY_END, 'perch', 270), pig(1, FLY_END, 'perch', 270)]
cB.add('brieftaube', c_dir, 1, bt)
cB.add('umschlag', c_dir, 1, [K(c_dir, *DH, 'park', 90, y=1.2, hand=1, drop=-0.08, size=0.15, mark=1.0, holder='dummy'),
                              K(r3(t_take - 0.002), *DH, 'park', 90, hand=1, size=0.15),
                              K(t_take, -0.16, 0.0, 'park', 90, y=0.2, hand=0, size=-0.4, attach='brieftaube', cut=True), K(1, -0.16, 0.0, 'park', 90, y=0.2, size=-0.4, attach='brieftaube')])
# Täter-Taube bekommt Post: Fragezeichen, als die Brieftaube landet
cB.parts['taube'] = []
cB.add('taube', 0, 1, [pig(0, CUL_W, 'perch', 180, question=0.0), pig(r3(1 - sb(0.75)), CUL_W, 'perch', 180, question=0.0),
                       pig(r3(1 - sb(0.55)), CUL_W, 'nod', 100, question=1.0), pig(1, CUL_W, 'nod', 100, question=1.0)])
camB = [
  *shot(0, sB - 0.003, F(CARD_PTS, 6, 4, ANS), push=0.04),
  *shot(sB, c_rein - 0.003, M([DB[0] - 0.1, 1.45, DB[1] + 3.2], [DB[0] - 0.02, 1.15, DB[1]], push=0.1)),
  # über die rechte Schulter auf den Block
  *shot(c_rein, c_brief - 0.003, M([DB[0] - 0.8, 2.4, DB[1] - 0.15], [DB[0] + 0.03, 1.12, DB[1] + 0.38], 26, push=0.1)),
  *shot(c_brief, c_dir - 0.003, M([DB[0] - 0.45, 1.6, DB[1] + 1.9], [DB[0] - 0.36, 1.55, DB[1]], 36, push=0.1)),
  *shot(c_dir, c_zust - 0.003, F([[ARM_R[0] - 0.5, 0.3, ARM_R[2]], [DH[0] + 0.3, 1.95, DH[1]], [HOVER[0], HOVER[1], HOVER[2]]], 8, 4, ANS), push=0.06),
  *shot(c_zust, 1, F([[CUL_W[0] - 0.45, CUL_W[1] - 0.2, CUL_W[2]], [FLY_END[0] + 0.45, FLY_END[1] + 0.8, FLY_END[2]], [HOVER[0], 3.6, HOVER[2]]], -42, -8, ANS), push=0.05),
]
expB = {
 'camera': camB, 'actors': cB.build(), 'stage': 'taubenstrasse',
 'sfx': [{'t': r3(sB + sb(0.4)), 'id': 'stift-kritzeln', 'volume': 0.6}, {'t': r3(c_rein + sb(0.2)), 'id': 'stift-kritzeln', 'volume': 0.6},
         {'t': r3(c_brief + sb(0.42)), 'id': 'stempel', 'volume': 0.7}, {'t': r3(c_dir + sb(0.2)), 'id': 'fluegelschlag', 'volume': 0.45},
         {'t': r3(t_take), 'id': 'papier-schieben', 'volume': 0.5}, {'t': r3(1 - sb(0.6)), 'id': 'tauben-gurren', 'volume': 0.5}],
}

# =====================================================================================================
# Antwort C: zur Ladestation stapfen – Stecker ziehen – Akkus springen auf 0 %, Tauben im Energiesparmodus (bleiben sitzen)
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_einm = cue(C, 'explain3', 'Einmal'); c_zieh = cue(C, 'explain3', 'ziehen'); c_und3 = cue(C, 'explain3', 'und schon'); c_leer = cue(C, 'explain3', 'leer')
t_pp = r3(max(c_einm + sc(0.05), c_zieh - sc(0.8)))
t_yank0 = r3(t_pp + sc(0.7)); t_yank1 = r3(t_pp + sc(1.05))
t_e0 = r3(c_und3 + sc(0.25)); t_e1 = r3(c_leer + sc(0.15))
cC = Cast()
cC.add('haus', 0, 1, [house(0)])
cC.add('parkbank', 0, 1, [bench(0)])
# Tauben laden (grüne Akkus) – nach dem Ziehen: nacheinander „0 %“ + Energiesparmodus, sie bleiben ruhig sitzen
cC.add('tauben', 0, 1, [flock(0, TXT_WIRE, glow=1.0, lock=0.0), flock(t_e0, TXT_WIRE, glow=1.0, lock=0.0), flock(t_e1, TXT_WIRE, glow=1.0, lock=1.0), flock(1, TXT_WIRE, glow=1.0, lock=1.0)])
cC.add('ladestation', 0, 1, [station(0), station(t_yank0), station(t_yank1, fill=1.0, glow=1.0), station(r3(t_yank1 + 0.002), fill=1.0, glow=0.0), station(1, fill=1.0, glow=0.0)])
cC.add('dummy', 0, sC, [K(0, *D0, 'lookup', 20, klecks=1.0)])
WALK0 = (D0[0] + 0.3, D0[1]); WALK1 = (PULL[0] + 0.25, PULL[1] + 0.7)
fw = face_to(WALK0, WALK1)
cC.add('dummy', sC, c_einm, [K(sC, *WALK0, 'sockstomp', fw, klecks=1.0), K(r3(c_einm - 0.003), *WALK1, 'sockstomp', fw)])
cC.add('dummy', c_einm, 1, [K(c_einm, *PULL, 'stand', 270, klecks=1.0), K(r3(t_pp - 0.003), *PULL, 'stand', 270), K(t_pp, *PULL, 'pullplug', 270), K(1, *PULL, 'pullplug', 270)])
camC = [
  *shot(0, sC - 0.003, F([[-1.2, 6.1, WIRE_Z], [1.2, 6.95, WIRE_Z], [POLE_X - 0.3, 6.6, WIRE_Z]], 30, -14, ANS), push=0.04),
  *shot(sC, c_einm - 0.003, F([[WALK0[0] + 1.2, 0, WALK0[1]], [POLE_X + 1.3, 2.3, WIRE_Z], [POLE_X - 0.6, 2.3, WIRE_Z]], 10, 4, ANS), push=0.05),
  *shot(c_einm, c_und3 - 0.003, M([POLE_X + 0.75, 1.5, WIRE_Z + 4.3], [POLE_X + 0.5, 1.32, WIRE_Z], push=0.1)),
  *shot(c_und3, 1, F([[-0.6, 6.1, WIRE_Z], [2.6, 7.05, WIRE_Z], [POLE_X - 0.2, 6.6, WIRE_Z]], 22, -12, ANS), push=0.04),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': 'taubenstrasse',
 'sfx': [{'t': 0.02, 'id': 'laden', 'volume': 0.45}, {'t': r3(sC + sc(0.1)), 'id': 'socken-stapfen', 'volume': 0.45},
         {'t': r3(t_yank0 + sc(0.15)), 'id': 'stecker-ziehen', 'volume': 0.9}, {'t': r3(t_e0), 'id': 'akku-leer', 'volume': 0.75}],
}
def check_c():
    """Vorgabe Inhaber: den Tauben passiert nichts – sie bleiben während der ganzen Szene auf der Leitung sitzen (kein Flug, kein Fall);
    der Stecker ist deutlich herausgezogen, BEVOR die Akkus leer werden."""
    keys = expC['actors']['tauben']
    assert all(k.get('fill', 0) == 0 for k in keys) and all(k['y'] in (0.0, HIDE) for k in keys), 'C: Tauben bewegen sich!'
    assert t_yank1 < t_e0, ('C: Akkus leer, bevor der Stecker draußen ist', t_yank1, t_e0)
    return round(t_yank1 * TC - cardC, 2), round(t_e0 * TC - cardC, 2), round(t_e1 * TC - cardC, 2)

# =====================================================================================================
# Abstimmung + Outro: Dummy (Klecks auf der Schulter) neben der Bank, Taube auf der Lehne, Tauben auf der Leitung
# =====================================================================================================
def endcast(wave=False):
    c = Cast()
    street(c)
    c.add('taube', 0, 1, [pig(0, CUL, 'perch', 200)])
    c.add('dummy', 0, 1, [K(0, *D0, 'stand', 180, klecks=1.0, question=0.0 if wave else 1.0)] + ([K(0.12, *D0, 'wave', 180), K(1, *D0, 'wave', 180)] if wave else []))
    return c.build()
V_PTS = [[BENCH[0] - 1.0, 0, BENCH[1]], [D0[0] + 0.45, 1.95, D0[1]], [CUL[0], 1.3, CUL[2]]]
vote = {'camera': shot(0, 1, F(V_PTS, 6, 3, (120, 960, 1060, 1320)), push=0.04), 'actors': endcast(), 'stage': 'taubenstrasse'}
outro = {'camera': shot(0, 1, F(V_PTS, 8, 6, (100, 980, 780, 1110)), push=0.05), 'actors': endcast(True), 'stage': 'taubenstrasse'}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du wurdest mal wieder von einer Taube angekackt – was machst du? 🐦🔌 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Den Tauben ist nichts passiert. 😄\n\n"
        "#waswürdestdutun #taube #birdsarentreal #unoreverse #comedy #quiz #dummy #spezial\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'taubenstrasse', 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Eine leuchtende UNO-Reverse-Karte (ohne Logo/Schrift) blitzt auf, dem Dummy wachsen große weiße Cartoon-Flügel, er hebt ab, kreist über der Taube auf der Banklehne und lässt im Vorbeiflug einen weißen Cartoon-Fleck auf ihren Kopf fallen. Die Taube schaut verdutzt (Fragezeichen), ihr passiert nichts.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy setzt die Lesebrille auf, schreibt auf einem Block „RECHNUNG – REINIGUNG“, klebt eine Briefmarke auf den Umschlag und übergibt ihn einer kleinen Brieftaube mit Posttasche und Mütze, die damit zur Täter-Taube auf der Oberleitung fliegt (Fragezeichen).', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Die Tauben sitzen auf der Oberleitung und laden (grüne Akku-Symbole). Der Dummy stapft zum Strommast mit dem Schild „TAUBEN-LADESTATION“ und zieht den riesigen Stecker aus der Steckdose. Die Akku-Symbole springen nacheinander auf „0 %“, die Tauben gehen in den Energiesparmodus und bleiben einfach ruhig sitzen – ihnen passiert nichts.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
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
print('C (s in der Szene): Stecker draußen / Akkus werden leer / alle leer', check_c())
print('Situation: Treffer bei', round(t_hit * TS, 2), 's | A: Fleck trifft', round(t_dhit * TA - cardA, 2), '| B: Übergabe', round(t_take * TB - cardB, 2))
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
