# Hilfsskript: erzeugt scenarios/spezial-drucker.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-drucker-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-cookies (Helfer übernommen).
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, slapstickartig im Low-Poly-Cartoon-Stil, KEINE Markenlogos auf den Druckern
# (Drucker, 3D-Drucker, Pass, Ticket, Koffer selbst gestaltet; Pass mit Drucker-Symbol statt Wappen).
# Bühne: Schlafzimmer bei Nacht ("schlafzimmer-nacht", src/stage/Bedroom.tsx NIGHT): Bett, Schreibtisch unter dem Fenster, Stuhl, offene Tür.
#  Situation: Dummy schläft (Zzz) – Licht geht an, Drucker rattert los und spuckt Blätter; „Was machst du?“ → Dummy schreckt hoch + Fragezeichen.
#  A: (Karte) Dummy schläft, Drucker druckt im Hintergrund. (Szene) Uhr 3:00 → KÜNDIGUNG kommt raus → Dummy tapst schlaftrunken zum Tisch →
#     unterschreibt im Halbschlaf, nickt im Stehen ein.
#  B: (Karte) Drucker rattert, neben ihm wächst ein Papierstapel. (Szene) aus dem Papier entsteht Schicht für Schicht ein 3D-Drucker →
#     beide drucken Pizza, Goldbarren, kleine Enten, die auf den Boden purzeln; Dummy staunt.
#  C: (Karte) Drucker druckt einen Hawaii-Prospekt, Display grinst. (Szene) Reisepass → Ticket (Sonnenbrille, Blumenkette) → Koffer ploppt
#     an seine Seite, Strohhut → hüpft über den Schreibtisch, springt runter und hüpft zur Tür hinaus; Dummy winkt.
# Spezial-Regeln: 61–66 s, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-drucker'
S = dict(
situation="Dein Drucker hat sich mal wieder komplett selbstständig gemacht. Mitten in der Nacht rattert er einfach los. Was machst du?",
o1c="Kündigung unterschreiben", o1s="A: Er druckt dir nachts um drei eine Kündigung – und du unterschreibst sie aus Reflex.",
o2c="3D-Drucker selbst drucken", o2s="B: Dein Drucker druckt sich selbst einen 3D-Drucker – und kann jetzt alles drucken, was er will.",
o3c="Ticket nach Hawaii drucken", o3s="C: Er druckt sich ein Flugticket nach Hawaii und haut selbst in den Urlaub ab.",
e1="Drei Uhr nachts. Eine Kündigung kommt raus. Noch halb im Schlaf greifst du zum Stift und unterschreibst einfach aus Reflex.",
e2="Aus Blatt für Blatt entsteht ein echter 3D-Drucker. Ab jetzt drucken die beiden einfach alles, worauf sie Lust haben.",
e3="Reisepass fertig, Ticket nach Hawaii gedruckt, Koffer gepackt. Und weg ist er in den Urlaub.",
vote="Also, was machst du?",
# Outro des Inhabers Buchstabe für Buchstabe + (Spezial-Regel 5, Wunsch Inhaber) angehängt: „Neue Video-Ideen? Ab in die Kommentare!“
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr. Neue Video-Ideen? Ab in die Kommentare!",
)
EXTRA = {1: float(os.environ.get('EXA', 0.0)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.4))}
TAIL = float(os.environ.get('TAIL', 0.05))
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))
VOTE_LEN = float(os.environ.get('VOTE_LEN', 5.0))
NO_VOTE = os.environ.get('NO_VOTE', '0') == '1'

ELEAD = float(os.environ.get('ELEAD', 0.35))
LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': ELEAD, 'explain2': ELEAD, 'explain3': ELEAD, 'countdown': 0.1, 'outro': 0.3}
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

class Cast:
    """Sichtbarkeit je Einstellung: Figur nur in [t0, t1] zeigen, sonst y −30 (wie spezial-usb-kabel)"""
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
# feste Plätze (Bühne schlafzimmer-nacht, src/stage/Bedroom.tsx BEDROOM/NIGHT; Drucker src/actors/DruckerProps.tsx PRINTER/PRINTER3D/SHEET;
# Bewegung signsleepy: Unterschrift SIGN_FROM → SIGN_TO 0,43 m vor dem Dummy auf 0,765 m)
# =====================================================================================================
STAGE = 'schlafzimmer-nacht'
DESK_Y = 0.75
PR = (-1.62, -0.55); PF = 90                       # Drucker auf dem Schreibtisch, Vorderseite zum Raum (+x)
SLOT = (PR[0] + 0.17, DESK_Y + 0.075, PR[1])       # Ausgabeschlitz (Welt)
TRAY = (PR[0] + 0.17 + 0.155, DESK_Y + 0.044, PR[1])  # Blatt ganz draußen vor dem Schlitz (Mitte), liegt auf Fachhöhe
P3D = (-1.53, -0.03)                               # 3D-Drucker
BED3 = (P3D[0], DESK_Y + 0.085, P3D[1] + 0.02)     # dessen Druckplatte (Welt, face 0 → lokal z = Welt z)
BED = (0.8, -1.425); BF = 270                      # Dummy im Bett (Hüfte), Kopf zum Kissen (+x)
CLOCK = (-0.44, -1.62); NS_H = 0.52                # Digitaluhr auf dem Nachttisch
SIGN = (TRAY[0] + 0.098 + 0.43, PR[1] - 0.0175); SF = 270   # Dummy unterschreibt das Blatt im Ausgabefach
DOOR = (1.8, 1.0)
def printer(t, x=PR[0], z=PR[1], motion='park', face=PF, y=DESK_Y, **kw):
    v = dict(rumble=0.0, glow=0.0, mark=0.0, glasses=0.0, lei=0.0, gardenhat=0.0, good=0.0, tilt=0.0, squish=0.0); v.update(kw)
    return K(t, x, z, motion, face, y=y, **v)
def p3(t, **kw):
    v = dict(fill=1.0, mark=0.0, glow=0.0, rumble=0.0); v.update(kw)
    return K(t, *P3D, 'park', 0, y=DESK_Y, **v)
def light(t, g): return K(t, 0, 0, 'park', 0, glow=g)
def clock(t): return K(t, *CLOCK, 'park', 185, y=NS_H, text='3:00')
def bedd(t, motion='bedsleep', **kw): return K(t, *BED, motion, BF, **kw)
def body(x, z, h=1.95, w=0.42): return [[x - w, 0, z], [x + w, h, z]]
BED_PTS = [[0.0, 0.0, -1.9], [1.75, 0.95, -0.95]]
DESK_PTS = [[-1.8, 0.0, -1.0], [-1.05, 0.75, 0.2]]
PR_PTS = [[PR[0] - 0.17, DESK_Y, PR[1] - 0.23], [PR[0] + 0.35, DESK_Y + 0.33, PR[1] + 0.23]]
P3_PTS = [[P3D[0] - 0.18, DESK_Y, P3D[1] - 0.18], [P3D[0] + 0.18, DESK_Y + 0.6, P3D[1] + 0.18]]
CLOCK_PTS = [[CLOCK[0] - 0.1, NS_H, CLOCK[1] - 0.04], [CLOCK[0] + 0.1, NS_H + 0.11, CLOCK[1] + 0.04]]
SHEET_PTS = [[TRAY[0] - 0.15, DESK_Y + 0.04, PR[1] - 0.11], [TRAY[0] + 0.15, DESK_Y + 0.05, PR[1] + 0.11]]
def dist(a, b): return math.hypot(a[0] - b[0], a[1] - b[1])

# =====================================================================================================
# Situation: Dummy schläft → Licht an, Drucker rattert los, spuckt Blätter → „Was machst du?“ hochschrecken + Fragezeichen
# =====================================================================================================
L0 = 'situation'
TS = seclen(L0); ss = lambda s: s / TS
c_dru = cue(L0, 'situation', 'Drucker'); c_mit = cue(L0, 'situation', 'Mitten'); c_rat = cue(L0, 'situation', 'rattert'); c_was = cue(L0, 'situation', 'Was machst')
t_on = r3(max(ss(0.7), c_dru))
cs_ = Cast()
cs_.add('zimmerlicht', 0, 1, [light(0, 0.0), light(r3(t_on - 0.002), 0.0), light(t_on, 1.0), light(1, 1.0)])
cs_.add('digitaluhr', 0, 1, [clock(0)])
cs_.add('drucker', 0, 1, [printer(0), printer(r3(t_on - 0.002)), printer(t_on, glow=1.0, rumble=0.4), printer(r3(t_on + ss(0.4)), glow=1.0, rumble=1.0, mark=1.0), printer(1, glow=1.0, rumble=1.0, mark=1.0)])
t_burst = r3(t_on + ss(0.5))
cs_.add('blattregen', t_burst, 1, [K(t_burst, *SLOT[::2], 'burst', PF, y=SLOT[1], drop=SLOT[1], size=0.0)])
q0 = r3(c_was + ss(0.5))
cs_.add('dummy', 0, 1, [bedd(0, zzz=1.0), bedd(r3(t_on + ss(0.3)), zzz=1.0), bedd(r3(c_was - 0.002), zzz=1.0), bedd(c_was, 'bedwake', zzz=0.0, question=0.0),
                        bedd(q0, 'bedwake', question=0.0), bedd(r3(q0 + ss(0.35)), 'bedwake', question=1.0), bedd(1, 'bedwake', question=1.0)])
situation = {
 'camera': [
   # Totale: dunkles Zimmer, Dummy schläft – Licht geht an, Drucker auf dem Schreibtisch
   *shot(0, c_mit - 0.003, F([*BED_PTS, *DESK_PTS, [-1.8, 1.6, -0.4]], 28, 16, SIT), push=0.05),
   # Drucker rattert und spuckt Blatt um Blatt
   *shot(c_mit, c_was - 0.003, F([*PR_PTS, [PR[0] + 1.3, 0.0, PR[1] - 0.4], [PR[0] + 1.3, 0.0, PR[1] + 0.4]], 62, 16, SIT), push=0.07),
   # Dummy schreckt hoch
   *shot(c_was, 1, F([[0.0, 0.3, -1.9], [1.6, 1.4, -0.95], [-0.2, 0, -0.2]], 8, 10, SIT), push=0.05),
 ],
 'actors': cs_.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_on), 'id': 'klick', 'volume': 1.0}, {'t': r3(t_on + ss(0.1)), 'id': 'drucker-rattern', 'volume': 0.9},
         {'t': r3(t_on + ss(2.9)), 'id': 'drucker-rattern', 'volume': 0.8}, {'t': r3(c_was), 'id': 'kissen-plumps', 'volume': 0.5}],
}

# =====================================================================================================
# Antwort A: Karte = Dummy schläft, Drucker druckt im Hintergrund. Szene = 3:00 → KÜNDIGUNG → schlaftrunken hin → unterschreiben
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_eine = cue(A, 'explain1', 'Eine'); c_noch = cue(A, 'explain1', 'Noch'); c_stift = cue(A, 'explain1', 'Stift'); c_unt = cue(A, 'explain1', 'unterschreibst')
cA = Cast()
cA.add('zimmerlicht', 0, 1, [light(0, 1.0)])
cA.add('digitaluhr', 0, 1, [clock(0)])
# Blatt KÜNDIGUNG gleitet aus dem Schlitz ins Fach (beginnt unter dem Gehäuse)
t_out0 = r3(c_eine + sa(0.05)); t_out1 = r3(t_out0 + sa(1.3))
def sheetA(t, u, sign=0.0):
    x = (PR[0] + 0.02) + (TRAY[0] - PR[0] - 0.02) * ease(u)
    y = SLOT[1] - 0.01 + (TRAY[1] - SLOT[1] + 0.01) * ease(u)
    return K(t, x, PR[1], 'park', PF, y=round(y, 3), fill=sign, text='kuendigung')
# Unterschrift
t_arr = r3(max(c_stift - sa(0.25), c_noch + sa(0.9)))
WALK0 = (SIGN[0] + 0.9, SIGN[1] + 0.25)
t_sig0 = r3(max(t_arr + sa(0.15), c_unt - sa(0.6)))
t_s0 = r3(t_sig0 + sa(0.6)); t_s1 = r3(t_sig0 + sa(1.8))
cA.add('blatt', c_eine, 1, [sheetA(c_eine, 0), sheetA(t_out0, 0), *[sheetA(r3(t_out0 + (t_out1 - t_out0) * k / 8), k / 8) for k in range(1, 9)],
                            sheetA(t_s0, 1), *[sheetA(r3(t_s0 + (t_s1 - t_s0) * k / 10), 1, round(k / 10, 2)) for k in range(1, 11)], sheetA(1, 1, 1.0)])
cA.add('drucker', 0, 1, [printer(0, glow=0.8, mark=1.0, rumble=0.25), printer(r3(sA - 0.002), glow=0.8, mark=1.0, rumble=0.25),
                         printer(sA, glow=0.4, cut=True), printer(r3(c_eine - 0.002), glow=0.4), printer(c_eine, glow=1.0, rumble=0.8, mark=1.0),
                         printer(r3(t_out1 + sa(0.1)), glow=1.0, rumble=0.0, mark=0.0), printer(1, glow=0.6)])
# Kuli liegt neben dem Fach, verschwindet, wenn der Dummy zugreift
KULI = (TRAY[0] + 0.05, PR[1] + 0.2)
t_grab = r3(t_sig0 + sa(0.2))
cA.add('kuli', 0, t_grab, [K(0, *KULI, 'park', 70, y=DESK_Y + 0.008)])
# Dummy: schläft (Karte + „Drei Uhr nachts“ + „Eine Kündigung“) → tapst schlaftrunken zum Tisch → unterschreibt → nickt ein
cA.add('dummy', 0, c_noch, [bedd(0, zzz=1.0), bedd(c_noch, zzz=1.0)])
fw = face_to(WALK0, SIGN)
cA.add('dummy', c_noch, 1, [K(c_noch, *WALK0, 'sleepwalk', fw, zzz=0.8, cut=True), K(t_arr, *SIGN, 'sleepwalk', SF, zzz=0.8), K(r3(t_sig0 - 0.002), *SIGN, 'sleepstand', SF, zzz=0.8),
                            K(t_sig0, *SIGN, 'signsleepy', SF, zzz=0.6), K(r3(t_sig0 + sa(2.1)), *SIGN, 'signsleepy', SF, zzz=0.3), K(r3(t_sig0 + sa(2.5)), *SIGN, 'signsleepy', SF, zzz=1.0), K(1, *SIGN, 'signsleepy', SF, zzz=1.0)])
def check_a():
    assert t_arr > c_noch, 'A: Ankunft vor dem Losgehen'
    assert t_s1 < 1, ('A: Unterschrift zu spät', t_s1)
    return round((1 - t_s1) * TA, 2)
camA = [
  # Karte: Dummy schläft im Bett, Drucker druckt im Hintergrund
  *shot(0, sA - 0.003, F([*BED_PTS, *PR_PTS, [-0.2, 1.3, -1.0]], 10, 12, ANS), push=0.03),
  # Drei Uhr nachts: Digitaluhr groß, Dummy schläft dahinter
  *shot(sA, c_eine - 0.003, F([*CLOCK_PTS, [0.3, 0.6, -1.6], [1.0, 0.75, -1.2]], 12, 14, ANS), push=0.06),
  # Kündigung kommt raus
  *shot(c_eine, c_noch - 0.003, F([*SHEET_PTS, [PR[0] - 0.1, DESK_Y + 0.25, PR[1] - 0.2], [PR[0] - 0.1, DESK_Y + 0.25, PR[1] + 0.2]], 95, 32, ANS), push=0.06),
  # schlaftrunken zum Tisch
  *shot(c_noch, c_unt - 0.003, F([*body(*WALK0), *body(*SIGN), *PR_PTS], 30, 8, ANS), push=0.04),
  # unterschreibt im Halbschlaf: Blatt + Hand + Kopf
  *shot(c_unt, 1, F([*SHEET_PTS, [SIGN[0] - 0.1, 1.75, SIGN[1]], [SIGN[0] + 0.1, 1.2, SIGN[1] + 0.25]], -25, 34, ANS), push=0.04),
]
expA = {
 'camera': camA, 'actors': cA.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sa(0.4)), 'id': 'drucker-rattern', 'volume': 0.3}, {'t': r3(sA + sa(0.2)), 'id': 'uhr-ticken', 'volume': 0.5},
         {'t': r3(c_eine), 'id': 'drucker-rattern', 'volume': 0.8}, {'t': r3(t_out1 - sa(0.2)), 'id': 'papier-schieben', 'volume': 0.6},
         {'t': r3(c_noch + sa(0.1)), 'id': 'schleichen', 'volume': 0.45}, {'t': r3(t_s0), 'id': 'stift-kritzeln', 'volume': 0.9}],
}

# =====================================================================================================
# Antwort B: Karte = Papierstapel wächst neben dem Drucker. Szene = Blatt für Blatt entsteht der 3D-Drucker → beide drucken Pizza, Gold, Enten
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_aus = cue(B, 'explain2', 'Aus'); c_ent = cue(B, 'explain2', 'entsteht'); c_3d = cue(B, 'explain2', '3D-Drucker'); c_ab = cue(B, 'explain2', 'Ab jetzt'); c_lust = cue(B, 'explain2', 'worauf')
cB = Cast()
cB.add('zimmerlicht', 0, 1, [light(0, 1.0)])
cB.add('digitaluhr', 0, 1, [clock(0)])
cB.add('drucker', 0, 1, [printer(0, glow=1.0, rumble=1.0, mark=1.0), printer(1, glow=1.0, rumble=1.0, mark=1.0)])
# Karte: Stapel wächst
STACK = (P3D[0], P3D[1])
stk = [K(r3(sB * k / 10), *STACK, 'park', 0, y=DESK_Y, fill=round(0.08 + 0.92 * k / 10, 3)) for k in range(11)]
t_built = r3(max(c_3d + sb(0.45), sB + sb(1.6)))
t_paper = r3(sB + (t_built - sB) * 0.75 / 1.0)
stk += [K(sB, *STACK, 'park', 0, y=DESK_Y, fill=1.0, cut=True), K(r3(t_paper), *STACK, 'park', 0, y=DESK_Y, fill=0.0)]
cB.add('papierstapel', 0, t_paper, stk)
cB.add('drucker3d', sB, 1, [p3(sB, fill=0.0), p3(t_paper, fill=0.75), p3(t_built, fill=1.0), p3(r3(c_ab - 0.002), fill=1.0),
                           p3(c_ab, fill=1.0, mark=1.0, glow=1.0), p3(1, fill=1.0, mark=1.0, glow=1.0)])
# fliegende Blätter vom Drucker in den Bau (drei Blätter, versetzt, je 0,45 s)
for n, nm in enumerate(['blatt2', 'blatt3', 'blatt4']):
    keys = []
    tt = sB + sb(0.15 * n)
    while tt + sb(0.45) < t_paper:
        for k in range(7):
            u = k / 6
            x = SLOT[0] + (P3D[0] - SLOT[0]) * u; z = SLOT[2] + (P3D[1] - SLOT[2]) * u
            top = DESK_Y + 0.6 * (tt - sB) / max(1e-6, t_paper - sB)
            y = SLOT[1] + (top - SLOT[1]) * u + 4 * 0.25 * u * (1 - u)
            keys.append(K(r3(tt + sb(0.45) * u), x, z, 'park', PF, y=round(y, 3), tilt=round(-40 * math.sin(math.pi * u), 1), turn=round(25 * u, 1), text='text'))
        tt += sb(0.5)
    if keys:
        cB.add(nm, keys[0]['t'], keys[-1]['t'], keys)
# Gedruckte Sachen: 3D-Drucker (Pizza, Gold) + Tintendrucker (Enten) – alle purzeln auf den Boden vor dem Schreibtisch
OBJ = [('druckobjekt1', 'pizza', '3d'), ('druckobjekt3', 'ente', 'ink'), ('druckobjekt2', 'gold', '3d'), ('druckobjekt4', 'ente', 'ink'),
       ('druckobjekt6', 'pizza', '3d'), ('druckobjekt7', 'ente', 'ink'), ('druckobjekt5', 'gold', '3d'), ('druckobjekt8', 'ente', 'ink')]
LAND = [(-0.95, -0.15), (-0.85, -0.75), (-0.7, 0.2), (-0.6, -0.45), (-0.45, -0.05), (-0.75, -1.0), (-0.95, 0.45), (-0.4, -0.75)]
obj_t = []
tt = c_ab
for i, (nm, kind, src) in enumerate(OBJ):
    if tt > 1 - sb(0.5): break
    lx, lz = LAND[i]
    keys = []
    if src == '3d':
        tp = sb(0.55)
        keys += [K(tt, BED3[0], BED3[2], 'park', 90, y=BED3[1], fill=0.0, glow=1.0, text=kind), K(r3(tt + tp), BED3[0], BED3[2], 'park', 90, y=BED3[1], fill=1.0, glow=1.0, text=kind)]
        start = (BED3[0], BED3[1], BED3[2]); t0 = tt + tp
    else:
        start = (SLOT[0], SLOT[1] - 0.04, SLOT[2]); t0 = tt
        keys += [K(tt, start[0], start[2], 'park', 90, y=start[1], fill=1.0, glow=1.0, text=kind)]
    for k in range(1, 9):
        u = k / 8
        x = start[0] + (lx - start[0]) * u; z = start[2] + (lz - start[2]) * u
        y = start[1] * (1 - u) + 4 * 0.3 * u * (1 - u)
        keys.append(K(r3(t0 + sb(0.55) * u), x, z, 'park', 90 + 200 * u, y=round(max(0, y), 3), fill=1.0, glow=round(1 - u, 2), tilt=round(30 * math.sin(math.pi * u), 1), text=kind))
    keys.append(K(1, lx, lz, 'park', 290, y=0.0, fill=1.0, glow=0.0, text=kind))
    cB.add(nm, tt, 1, keys)
    obj_t.append((r3(t0 + sb(0.55)), kind))
    tt = r3(tt + sb(0.42))
# Dummy: Karte sitzt im Bett und schaut; Szene steht im Raum und staunt
DB = (0.25, -0.5)
fdb = face_to(DB, (PR[0], PR[1] + 0.3))
cB.add('dummy', 0, sB, [bedd(0, 'bedsit'), bedd(sB, 'bedsit')])
cB.add('dummy', sB, 1, [K(sB, *DB, 'stand', fdb, cut=True), K(r3(c_ent), *DB, 'gape', fdb), K(1, *DB, 'gape', fdb)])
def check_b():
    assert t_built < c_ab + sb(0.2), ('B: 3D-Drucker zu spät fertig', t_built, c_ab)
    assert len(obj_t) >= 5, ('B: zu wenig gedruckte Sachen', len(obj_t))
    return len(obj_t)
camB = [
  # Karte: Drucker rattert, Papierstapel wächst; Dummy sitzt im Bett
  *shot(0, sB - 0.003, F([*PR_PTS, *P3_PTS, [0.3, 1.25, -1.4]], 38, 12, ANS), push=0.03),
  # Blatt für Blatt entsteht der 3D-Drucker
  *shot(sB, c_ab - 0.003, F([*P3_PTS, *PR_PTS], 50, 18, ANS), push=0.06),
  # die beiden drucken Pizza, Gold, Enten
  *shot(c_ab, c_lust - 0.003, F([*P3_PTS, *PR_PTS, [-0.4, 0, -1.0], [-0.4, 0, 0.5]], 38, 22, ANS), push=0.05),
  # worauf sie Lust haben: Totale mit staunendem Dummy + Haufen
  *shot(c_lust, 1, F([*P3_PTS, *PR_PTS, *body(*DB), [-0.4, 0, -1.0]], 35, 10, ANS), push=0.04),
]
sfxB = [{'t': r3(sb(0.3)), 'id': 'drucker-rattern', 'volume': 0.6}, {'t': r3(sb(2.9)), 'id': 'drucker-rattern', 'volume': 0.5},
        {'t': r3(sB + sb(0.1)), 'id': 'papier-schieben', 'volume': 0.7}, {'t': r3(sB + sb(0.9)), 'id': 'bau-klack', 'volume': 0.5},
        {'t': r3(t_built), 'id': 'himmel-chor', 'volume': 0.35}, {'t': r3(c_ab), 'id': 'drucker-surren', 'volume': 0.7}]
for t_, kind in obj_t:
    sfxB.append({'t': t_, 'id': 'quietsch-ente' if kind == 'ente' else 'plopp', 'volume': 0.6})
expB = {'camera': camB, 'actors': cB.build(), 'stage': STAGE, 'sfx': [s for s in sfxB if s['t'] < 1]}

# =====================================================================================================
# Antwort C: Karte = Hawaii-Prospekt, Display grinst. Szene = Reisepass → Ticket (Sonnenbrille, Blumenkette) → Koffer (Strohhut) → hüpft davon
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_tic = cue(C, 'explain3', 'Ticket'); c_kof = cue(C, 'explain3', 'Koffer'); c_und = cue(C, 'explain3', 'Und weg')
cC = Cast()
cC.add('zimmerlicht', 0, 1, [light(0, 1.0)])
cC.add('digitaluhr', 0, 1, [clock(0)])
def slide(nm, t0, dur, text=None, y_end=TRAY[1], x_end=TRAY[0], z=PR[1], face=PF, extra=None):
    ks = []
    for k in range(9):
        u = k / 8
        x = (PR[0] + 0.02) + (x_end - PR[0] - 0.02) * ease(u)
        y = SLOT[1] - 0.01 + (y_end - SLOT[1] + 0.01) * ease(u)
        d = dict(text=text) if text else {}
        ks.append(K(r3(t0 + dur * u), x, z, 'park', face, y=round(y, 3), **d))
    return ks
# Karte: Hawaii-Prospekt kommt raus
cC.add('blatt', 0, sC, slide('blatt', sc(0.4), sc(1.4), 'hawaii'))
# Szene: Pass, dann Ticket (liegen im Fach), dann fliegen beide in den Koffer
t_pass = r3(sC + sc(0.05)); t_tick = r3(c_tic)
cC.add('reisepass', t_pass, 1, [])
SUIT_L = (-0.0, -0.3)      # Koffer an der rechten Seite des Druckers (lokal x −0.33 = rechts, Drucker schaut +x → Welt −z)
t_suit = r3(c_kof + sc(0.05))
t_pack = r3(t_suit + sc(0.35))
def into_suit(nm, t0, start, h0):
    ks = []
    tgt = (PR[0] + 0.0, PR[1] - 0.36)
    for k in range(7):
        u = k / 6
        x = start[0] + (tgt[0] - start[0]) * u; z = PR[1] + (tgt[1] - PR[1]) * u
        y = h0 * (1 - u) + (DESK_Y + 0.12) * u + 4 * 0.18 * u * (1 - u)
        ks.append(K(r3(t0 + sc(0.4) * u), x, z, 'park', PF, y=round(y, 3), tilt=round(-60 * u, 1)))
    return ks
pass_keys = slide('reisepass', t_pass, sc(0.9), y_end=TRAY[1] + 0.003, x_end=TRAY[0] + 0.01) + [K(r3(t_pack - 0.002), TRAY[0] + 0.01, PR[1], 'park', PF, y=TRAY[1] + 0.003)] + into_suit('reisepass', t_pack, (TRAY[0], 0), TRAY[1])
cC.parts['reisepass'] = []
cC.add('reisepass', t_pass, r3(t_pack + sc(0.4)), pass_keys)
tick_keys = slide('flugticket', t_tick, sc(0.8), y_end=TRAY[1] + 0.016, x_end=TRAY[0] - 0.01) + [K(r3(t_pack + sc(0.1) - 0.002), TRAY[0] - 0.01, PR[1], 'park', PF, y=TRAY[1] + 0.016)] + into_suit('flugticket', r3(t_pack + sc(0.1)), (TRAY[0], 0), TRAY[1] + 0.016)
cC.add('flugticket', t_tick, r3(t_pack + sc(0.5)), tick_keys)
# Hüpf-Weg: Schreibtisch entlang (+z), Sprung runter, durchs Zimmer zur Tür hinaus
t_hop0 = r3(max(t_pack + sc(0.5), c_und - sc(0.35)))
H1 = (PR[0], 0.05)                     # vordere Schreibtischkante
H2 = (-1.0, 0.45)                      # Landung auf dem Boden
H3 = (0.4, 0.85); H4 = (DOOR[0] - 0.1, DOOR[1]); H5 = (2.7, DOOR[1])
VH = 1.7
t_h1 = r3(t_hop0 + sc(dist(PR, H1) / VH)); t_h2 = r3(t_h1 + sc(0.45))
t_h3 = r3(t_h2 + sc(dist(H2, H3) / VH)); t_h4 = r3(t_h3 + sc(dist(H3, H4) / VH)); t_h5 = r3(t_h4 + sc(dist(H4, H5) / VH))
f1 = face_to(PR, H1); f3 = face_to(H2, H3); f4 = face_to(H3, H4)
pk = dict(glow=1.0, good=1.0)
drk = [printer(0, glow=1.0, mark=1.0, rumble=0.3), printer(r3(sc(1.9)), glow=1.0, good=1.0, mark=0.0), printer(r3(sC - 0.002), **pk),
       printer(sC, mark=1.0, rumble=0.5, cut=True, **pk), printer(r3(c_tic - 0.002), mark=1.0, rumble=0.5, **pk),
       printer(c_tic, mark=1.0, rumble=0.5, **pk), printer(r3(c_tic + sc(0.3)), mark=1.0, rumble=0.4, glasses=1.0, **pk), printer(r3(c_tic + sc(0.7)), glasses=1.0, lei=1.0, **pk),
       printer(t_suit, glasses=1.0, lei=1.0, **pk), printer(r3(t_suit + sc(0.4)), glasses=1.0, lei=1.0, gardenhat=1.0, **pk), printer(r3(t_hop0 - 0.002), glasses=1.0, lei=1.0, gardenhat=1.0, **pk)]
hp = dict(glasses=1.0, lei=1.0, gardenhat=1.0, **pk)
drk += [printer(t_hop0, motion='hop', face=f1, **hp), printer(t_h1, *H1, motion='hop', face=f1, **hp)]
for k in range(1, 9):
    u = k / 8
    x = H1[0] + (H2[0] - H1[0]) * u; z = H1[1] + (H2[1] - H1[1]) * u
    y = DESK_Y * (1 - u) + 4 * 0.2 * u * (1 - u)
    drk.append(printer(r3(t_h1 + (t_h2 - t_h1) * u), x, z, motion='park', face=f3, y=round(y, 3), tilt=round(-15 * math.sin(math.pi * u), 1), **hp))
drk += [printer(r3(t_h2 + sc(0.05)), *H2, motion='hop', face=f3, y=0.0, **hp), printer(t_h3, *H3, motion='hop', face=f4, y=0.0, **hp),
        printer(t_h4, *H4, motion='hop', face=90, y=0.0, **hp), printer(t_h5, *H5, motion='hop', face=90, y=0.0, **hp), printer(1, *H5, motion='hop', face=90, y=0.0, **hp)]
cC.add('drucker', 0, 1, drk)
# Koffer hängt rechts am Drucker (lokal: x −0.33 = rechte Seite), ploppt auf
cC.add('minikoffer', t_suit, 1, [K(t_suit, -0.33, 0.0, 'park', 90, attach='drucker', y=0.0, size=-1.0), K(r3(t_suit + sc(0.25)), -0.33, 0.0, 'park', 90, attach='drucker', y=0.0, size=0.0),
                                 K(1, -0.33, 0.0, 'park', 90, attach='drucker', y=0.0, size=0.0)])
# Dummy: Karte sitzt im Bett; Szene steht im Zimmer, staunt, winkt zum Schluss
DC = (0.35, -0.6)
cC.add('dummy', 0, sC, [bedd(0, 'bedsit'), bedd(sC, 'bedsit')])
fdc = face_to(DC, PR)
cC.add('dummy', sC, 1, [K(sC, *DC, 'gape', fdc, cut=True), K(r3(c_und - 0.002), *DC, 'gape', fdc), K(c_und, *DC, 'stand', face_to(DC, H3)),
                        K(r3(t_h3 - sc(0.3)), *DC, 'wave', face_to(DC, H4)), K(1, *DC, 'wave', face_to(DC, H4))])
def check_c():
    assert t_h4 < 1, ('C: Drucker nicht an der Tür', t_h4)
    assert t_pack > t_tick + sc(0.5), ('C: Ticket noch nicht da', t_pack, t_tick)
    for p in [H2, H3]:
        assert dist(p, DC) > 0.5, ('C: Weg zu nah am Dummy', p)
    return round((1 - t_h5) * TC, 2)
SUIT_PTS = [[PR[0] - 0.12, DESK_Y, PR[1] - 0.5], [PR[0] + 0.12, DESK_Y + 0.4, PR[1] - 0.25]]
camC = [
  # Karte: Prospekt HAWAII kommt raus, Display grinst
  *shot(0, sC - 0.003, F([*PR_PTS, *SHEET_PTS], 92, 30, ANS), push=0.04),
  # Reisepass
  *shot(sC, c_tic - 0.003, F([*SHEET_PTS, [PR[0] + 0.1, DESK_Y + 0.25, PR[1]]], 105, 36, ANS), push=0.06),
  # Ticket + Sonnenbrille + Blumenkette
  *shot(c_tic, c_kof - 0.003, F([*PR_PTS, *SHEET_PTS], 70, 18, ANS), push=0.06),
  # Koffer gepackt + Strohhut
  *shot(c_kof, c_und - 0.003, F([*PR_PTS, *SUIT_PTS, [PR[0], DESK_Y + 0.6, PR[1]], [PR[0] + 0.5, DESK_Y, PR[1] + 0.3]], 40, 22, ANS), push=0.04),
  # und weg: hüpft durchs Zimmer zur Tür hinaus, Dummy winkt
  *shot(c_und, 1, F([[H1[0], DESK_Y, H1[1]], [H2[0], 0, H2[1]], [H4[0], 0.6, H4[1] - 0.45], [H4[0], 2.0, H4[1] + 0.45], *body(*DC)], -35, 16, ANS), push=0.04),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sc(0.4)), 'id': 'drucker-rattern', 'volume': 0.5}, {'t': r3(sc(1.9)), 'id': 'ukulele', 'volume': 0.5},
         {'t': r3(t_pass), 'id': 'drucker-rattern', 'volume': 0.6}, {'t': r3(c_tic + sc(0.3)), 'id': 'plopp', 'volume': 0.5}, {'t': r3(c_tic + sc(0.7)), 'id': 'plopp', 'volume': 0.5},
         {'t': r3(t_suit), 'id': 'plopp', 'volume': 0.7}, {'t': r3(t_pack), 'id': 'whoosh', 'volume': 0.4}, {'t': r3(t_suit + sc(0.4)), 'id': 'plopp', 'volume': 0.5},
         *[{'t': r3(t_hop0 + sc(0.42 * k)), 'id': 'hupf-boing', 'volume': 0.45} for k in range(12)],
         {'t': r3(c_und), 'id': 'ukulele', 'volume': 0.55}],
}
expC['sfx'] = [s for s in expC['sfx'] if s['t'] < 1]

# =====================================================================================================
# Abstimmung + Outro: Dummy steht neben dem Schreibtisch, Drucker (grinst) + 3D-Drucker, Kündigung im Fach, Ente + Pizza auf dem Tisch
# =====================================================================================================
DV = (-0.7, 0.6)
def endcast(wave=False):
    c = Cast()
    c.add('zimmerlicht', 0, 1, [light(0, 1.0)])
    c.add('digitaluhr', 0, 1, [clock(0)])
    c.add('drucker', 0, 1, [printer(0, glow=1.0, good=1.0, mark=1.0, rumble=0.2)])
    c.add('drucker3d', 0, 1, [p3(0, mark=1.0, glow=1.0)])
    c.add('blatt', 0, 1, [K(0, TRAY[0], PR[1], 'park', PF, y=TRAY[1], fill=1.0, text='kuendigung')])
    c.add('druckobjekt3', 0, 1, [K(0, -1.4, 0.32, 'park', 120, y=DESK_Y, fill=1.0, text='ente')])
    c.add('druckobjekt2', 0, 1, [K(0, -1.0, -0.2, 'park', 60, y=0.0, fill=1.0, text='gold')])
    c.add('druckobjekt1', 0, 1, [K(0, -0.85, 0.2, 'park', 0, y=0.0, fill=1.0, text='pizza')])
    c.add('dummy', 0, 1, [K(0, *DV, 'stand', 235, question=0.0 if wave else 1.0)] + ([K(0.12, *DV, 'wave', 215), K(1, *DV, 'wave', 215)] if wave else []))
    return c.build()
V_PTS = [*body(*DV), *PR_PTS, *P3_PTS, [-1.4, DESK_Y, 0.32]]
vote = {'camera': shot(0, 1, F(V_PTS, -6, 6, (120, 960, 1060, 1320)), push=0.04), 'actors': endcast(), 'stage': STAGE}
outro = {'camera': shot(0, 1, F(V_PTS, -4, 8, (100, 980, 780, 1110)), push=0.05), 'actors': endcast(True), 'stage': STAGE}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Dein Drucker hat sich mal wieder selbstständig gemacht – was machst du? 🖨️✈️ Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Alles bleibt rein comichaft und harmlos. 😄\n\n"
        "#waswürdestdutun #drucker #3ddrucker #büro #comedy #quiz #dummy #spezial\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': STAGE, 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Drucker spuckt um drei Uhr nachts ein Blatt „KÜNDIGUNG“ aus – der Dummy tapst schlaftrunken (Zzz) vom Bett zum Schreibtisch, greift zum Kuli, unterschreibt im Halbschlaf und nickt im Stehen wieder ein. Alles comichaft, niemand wird verletzt.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Neben dem rattenden Drucker wächst ein Papierstapel – Blatt für Blatt entsteht daraus ein Low-Poly-3D-Drucker. Dann drucken beide los: Pizza, Goldbarren und kleine Enten purzeln auf den Boden, der Dummy staunt mit offenem Mund.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Drucker druckt einen Hawaii-Prospekt, dann einen Fake-Reisepass und ein One-Way-Ticket, setzt Sonnenbrille, Blumenkette und Strohhut auf, packt beides in einen Mini-Koffer und hüpft über den Schreibtisch und durchs Zimmer zur Tür hinaus in den Urlaub. Der Dummy winkt.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Kommentieren & folgen!', 'extra': 'Neue Video-Ideen? Ab in die Kommentare!', 'extraCue': 'Neue Video-Ideen'},
 'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team _. Und du? 👇'},
 'shots': {'situation': situation, 'countdown': vote, 'outro': outro},
}
if OUTRO_MIN > 0: scen['outroMin'] = OUTRO_MIN
if NO_VOTE: scen['noVote'] = True
scen['explainLead'] = ELEAD
scen['voteLen'] = VOTE_LEN
for _sh in [situation, vote, outro, expA, expB, expC]:
    _sh['sharpCuts'] = True
    for keys in _sh['actors'].values():
        keys.sort(key=lambda k: k['t'])
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
total = seclen('situation') + answer_parts(1)[2] + answer_parts(2)[2] + answer_parts(3)[2] + (0 if NO_VOTE else seclen('countdown')) + seclen('outro')
print('Länge', round(total, 2), 's', 'audio' if dur else 'geschätzt',
      {'situation': seclen('situation'), 'A': answer_parts(1)[:2], 'B': answer_parts(2)[:2], 'C': answer_parts(3)[:2], 'vote': seclen('countdown'), 'outro': seclen('outro')})
for _n, _c in [('A (Rest nach Unterschrift s)', check_a), ('B (Objekte)', check_b), ('C (Rest nach Tür s)', check_c)]:
    try:
        print(_n, _c())
    except AssertionError as e:
        print('PRÜFUNG FEHLGESCHLAGEN:', e)
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
_st = {'A': seclen('situation'), 'B': seclen('situation') + TA, 'C': seclen('situation') + TA + TB}
f = lambda sec, t: round((_st[sec] + t * {'A': TA, 'B': TB, 'C': TC}[sec]) * 30)
print('Schlüsselbilder: Sit-dunkel', round(t_on * TS * 30) - 6, '| Sit-Blätter', round((c_mit + 0.6 * (c_was - c_mit)) * TS * 30), '| Sit-wach', round((q0 + ss(0.6)) * TS * 30),
      '| A-Karte', f('A', sA * 0.6), '| A-Uhr', f('A', (sA + c_eine) / 2), '| A-Kündigung', f('A', t_out1 + sa(0.15)), '| A-tapsen', f('A', (c_noch + t_arr) / 2), '| A-Unterschrift', f('A', t_s1),
      '| B-Karte', f('B', sB * 0.8), '| B-Bau', f('B', (sB + t_paper) / 2), '| B-fertig', f('B', (t_built + c_ab) / 2), '| B-Druck', f('B', (c_ab + c_lust) / 2), '| B-Haufen', f('B', 0.97),
      '| C-Karte', f('C', sC * 0.85), '| C-Pass', f('C', (sC + c_tic) / 2), '| C-Ticket', f('C', c_kof - sc(0.1)), '| C-Koffer', f('C', c_und - sc(0.1)), '| C-Sprung', f('C', (t_h1 + t_h2) / 2), '| C-Tür', f('C', t_h4))
