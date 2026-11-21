# Hilfsskript: erzeugt scenarios/spezial-cookies.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-cookies-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-usb-kabel.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, niemand wird verletzt, alles slapstickartig im Low-Poly-Cartoon-Stil,
# KEINE Markenlogos auf Smartphone, Schüssel oder Agenten-Outfits (Handy, Website „NEWS“, Schüssel, Ordner selbst gestaltet).
# Bühne: Homeoffice mit offenem Fenster + offener Tür zum Garten ("homeoffice-cookies", src/stage/Rooms.tsx COOKIE_DOOR;
#        "-aussen" = zusätzlich Hauswand mit Fenster + Tür von außen).
#  Situation: Dummy tippt gedankenlos auf „Alle akzeptieren“ → riesiges Fenster „COOKIES AKZEPTIERT“; „Ohne zu lesen“ → lehnt sich zurück;
#             „Was machst du?“ → Fragezeichen.
#  A: (Karte) Handy zittert und leuchtet auf dem Tisch. (Szene) Tipp → dem Handy wachsen Beine, es steht auf → rennt über den Tisch,
#     springt runter, rennt zur Tür hinaus in den Garten; Dummy streckt verdutzt den Arm hinterher.
#  B: (Karte) stellt die Schüssel Milch neben das Handy. (Szene) wartet, Kinn in den Händen → ein Keks hüpft aus dem Bildschirm
#     und plumpst in die Milch; Dummy reißt die Arme hoch.
#  C: (Karte) tippt auf „Alle akzeptieren“, erste Fenster ploppen auf. (Szene) tippt wild überall, Fenster über Fenster →
#     draußen vor der Tür stehen drei Agenten Schlange (Lupe, Ordner) → Tauziehen um den Daten-Ordner, Kekse fliegen, Rauferei-Wolke.
# Spezial-Regeln: 61–66 s, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-cookies'
S = dict(
situation="Du hast mal wieder alle Cookies auf einer Website akzeptiert. Ohne zu lesen natürlich. Was machst du?",
o1c="Handy kriegt Beine und haut ab", o1s="A: Dein Handy macht sich selbstständig – ihm wachsen Beine und es haut einfach ab.",
o2c="Schüssel Milch daneben stellen", o2s="B: Du stellst eine Schüssel Milch daneben und wartest, bis sie weich werden.",
o3c="Agenten streiten um Daten", o3s="C: Du akzeptierst überall alle Cookies und Geheimagenten streiten sich um deine Daten.",
e1="Kurz geklickt, schon wachsen dem Handy Beine. Und weg rennt es. Ohne dich.",
e2="Eine Schüssel Milch daneben und abwarten. Irgendwann müssen die Cookies ja mal weich werden.",
e3="Überall auf Akzeptieren geklickt. Sofort stehen die Agenten Schlange und streiten sich um deine Cookies.",
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
# feste Plätze (Bühne homeoffice-cookies, src/stage/Rooms.tsx HOMEOFFICE/USB_GARDEN/COOKIE_DOOR; Handy src/actors/CookieProps.tsx PHONE;
# Bewegungen src/actors/Dummy.tsx cookiePose: COOKIE_PHONE, COOKIE_BOWL, COOKIE_BOWL_CARRY, COOKIE_BOWL_T)
# =====================================================================================================
STAGE = 'homeoffice-cookies'
STAGE_OUT = 'homeoffice-cookies-aussen'
CH = (-1.5, -0.4); FS = 270                    # sitzender Dummy (Blick zum Fenster)
DESK_Y = 0.74
PH_LOCAL = [-0.12, 0.757, 0.55]                # Bildschirm-Mitte (lokal, sitzend)
PH_C = W(CH, FS, PH_LOCAL)                     # (−2.05, −0.52)
PHONE_H = 0.24
PH_O = (PH_C[0] + PHONE_H / 2, PH_C[2])        # Handy-Ursprung (untere Kante, liegt zum Dummy) – face 90
BOWL = W(CH, FS, [0.3, 0, 0.56]); BOWL = (BOWL[0], BOWL[2])
DOOR_Z, DOOR_W = 1.45, 0.9
DOOR = (-2.5, DOOR_Z)
TAP = 0.4                                      # tapphone: Finger trifft bei 0,4 s
def phone(t, x=None, z=None, motion='park', face=90, y=DESK_Y, **kw):
    v = dict(tilt=90.0, legs=0.0, glow=0.0, rumble=0.0, size=0.0); v.update(kw)
    return K(t, PH_O[0] if x is None else x, PH_O[1] if z is None else z, motion, face, y=y, **v)
def body(x, z, h=1.95, w=0.42):
    return [[x - w, 0, z], [x + w, h, z]]
def seated(x=CH[0], z=CH[1]):
    return [[x - 0.35, 0.0, z - 0.3], [x + 0.2, 1.45, z + 0.3]]
DESK_PTS = [[-2.5, 0.0, -1.05], [-1.9, 0.74, 0.25]]
PH_PTS = [[PH_C[0] - 0.14, 0.74, PH_C[2] - 0.08], [PH_C[0] + 0.14, 0.8, PH_C[2] + 0.08]]
BOWL_PTS = [[BOWL[0] - 0.12, 0.74, BOWL[1] - 0.12], [BOWL[0] + 0.12, 0.84, BOWL[1] + 0.12]]
DOOR_PTS = [[-2.5, 0, DOOR_Z - 0.5], [-2.5, 2.1, DOOR_Z + 0.5]]

# =====================================================================================================
# Situation: tippt gedankenlos → „COOKIES AKZEPTIERT“ → lehnt sich zurück → Fragezeichen
# =====================================================================================================
L0 = 'situation'
TS = seclen(L0); ss = lambda s: s / TS
c_akz = cue(L0, 'situation', 'akzeptiert'); c_ohne = cue(L0, 'situation', 'Ohne'); c_was = cue(L0, 'situation', 'Was machst')
c_auf = cue(L0, 'situation', 'auf einer')
t_tap0 = r3(max(ss(0.5), c_akz - ss(TAP + 0.05))); t_tap = r3(t_tap0 + ss(TAP))
cs_ = Cast()
cs_.add('cookiehandy', 0, 1, [K(0, *PH_O, 'park', 90, y=DESK_Y, tilt=90.0, legs=0.0, glow=0.0, text='banner'), K(r3(t_tap - 0.002), *PH_O, 'park', 90, y=DESK_Y, glow=0.0, text='banner'),
                              K(t_tap, *PH_O, 'park', 90, y=DESK_Y, glow=1.0, text='ok'), K(r3(t_tap + ss(0.6)), *PH_O, 'park', 90, y=DESK_Y, glow=0.0, text='ok'), K(1, *PH_O, 'park', 90, y=DESK_Y, text='ok')])
cs_.add('dummy', 0, c_ohne, [K(0, *CH, 'chairsit', FS), K(r3(t_tap0 - 0.002), *CH, 'chairsit', FS), K(t_tap0, *CH, 'tapphone', FS), K(r3(c_ohne - 0.002), *CH, 'tapphone', FS)])
q0 = r3(max(c_was, c_ohne + ss(0.6)))
cs_.add('dummy', c_ohne, 1, [K(c_ohne, *CH, 'leanback', FS, question=0.0), K(q0, *CH, 'leanback', FS, question=0.0), K(r3(q0 + ss(0.35)), *CH, 'leanback', FS, question=1.0), K(1, *CH, 'leanback', FS, question=1.0)])
pop_sit = [{'t': r3(t_tap + ss(0.12)), 'text': 'COOKIES\nAKZEPTIERT', 'x': 540, 'y': 700, 'big': True}, {'t': r3(c_was), 'text': ''}]
FINGER_PTS = [[PH_C[0] - 0.15, 0.74, PH_C[2] - 0.12], [PH_C[0] + 0.32, 1.0, PH_C[2] + 0.12]]
situation = {
 'camera': [
   # Totale: Dummy am Schreibtisch mit dem Handy (von draußen durchs Fenster)
   *shot(0, c_akz - 0.003, F([*seated(), *PH_PTS, *DESK_PTS], -112, 14, SIT), push=0.05),
   # nah: Finger auf „Alle akzeptieren“ → grüner Haken + riesiges Fenster
   *shot(c_akz, c_ohne - 0.003, F([*PH_PTS, *FINGER_PTS], -150, 48, (140, 940, 520, 1250)), push=0.06),
   # ohne zu lesen: zurückgelehnt
   *shot(c_ohne, 1, F([[CH[0] - 0.55, 0, CH[1] - 0.45], [CH[0] + 0.3, 1.75, CH[1] + 0.45], *PH_PTS], -100, 8, SIT), push=0.05),
 ],
 'actors': cs_.build(), 'stage': STAGE, 'popups': pop_sit,
 'sfx': [{'t': r3(t_tap), 'id': 'klick', 'volume': 0.9}, {'t': r3(t_tap + ss(0.12)), 'id': 'plopp', 'volume': 0.7}],
}

# =====================================================================================================
# Antwort A: Karte = Handy zittert + leuchtet. Szene = Tipp → Beine wachsen → rennt über den Tisch, springt, zur Tür hinaus
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_kurz = cue(A, 'explain1', 'Kurz'); c_schon = cue(A, 'explain1', 'schon'); c_und = cue(A, 'explain1', 'Und weg'); c_ohneA = cue(A, 'explain1', 'Ohne dich')
cA = Cast()
# Karte: Handy zittert, Bildschirm flackert; Dummy zurückgelehnt, schaut erst später hin
ph_card = [phone(0, rumble=0.0, text='ok'), phone(r3(sa(0.6)), rumble=1.0, glow=0.6, text='ok'), phone(r3(sa(1.2)), rumble=0.4, glow=0.0), phone(r3(sa(1.8)), rumble=1.0, glow=0.8),
           phone(r3(sA - 0.002), rumble=1.0, glow=0.3)]
cA.add('dummy', 0, sA, [K(0, *CH, 'leanback', FS), K(sA, *CH, 'leanback', FS)])
# Szene: Tipp → Beine
t_tA0 = r3(sA + sa(0.05)); t_tA = r3(t_tA0 + sa(TAP))
t_up0 = r3(t_tA + sa(0.15)); t_up1 = r3(max(t_up0 + sa(1.0), c_schon + sa(0.4)))
t_turn = r3(t_up1 + sa(0.35))
cA.add('dummy', sA, c_und, [K(sA, *CH, 'chairsit', FS, cut=True), K(t_tA0, *CH, 'tapphone', FS), K(r3(t_up0 + sa(0.25)), *CH, 'tapphone', FS), K(r3(t_up0 + sa(0.27)), *CH, 'physikshrug', FS), K(c_und, *CH, 'physikshrug', FS)])
P0 = PH_O
DESK_CORNER = (-2.0, 0.12)            # Lauf auf dem Tisch bis zur vorderen Ecke
LAND = (-1.95, 0.62)                  # landet vor dem Tisch auf dem Boden
OUT1 = (-3.2, 1.75); OUT2 = (-5.6, 2.9); OUT3 = (-8.0, 4.1)
f_desk = face_to(P0, DESK_CORNER); f_land = face_to(DESK_CORNER, LAND); f_door = face_to(LAND, DOOR); f_out = face_to(DOOR, OUT2)
ph_scene = [phone(sA, rumble=0.0, glow=0.0, text='ok', cut=True), phone(r3(t_tA - 0.002), text='ok'), phone(t_tA, glow=1.0, text='ok'),
            phone(t_up0, glow=0.6, tilt=90.0, legs=0.0), phone(t_up1, tilt=0.0, legs=1.0, glow=0.0), phone(t_turn, motion='stand', face=f_desk, tilt=0.0, legs=1.0)]
# Lauf: Geschwindigkeit ca. 2,2 m/s (Comic-Trippeln)
t_run0 = r3(max(t_turn + sa(0.05), c_und - sa(0.15)))
def dist(a, b): return math.hypot(a[0] - b[0], a[1] - b[1])
V = 2.2
t_c = r3(t_run0 + sa(dist(P0, DESK_CORNER) / V))
JUMP = 0.42
t_l = r3(t_c + sa(JUMP))
t_d = r3(t_l + sa(dist(LAND, DOOR) / V))
t_o1 = r3(t_d + sa(dist(DOOR, OUT1) / V)); t_o2 = r3(t_o1 + sa(dist(OUT1, OUT2) / V)); t_o3 = r3(t_o2 + sa(dist(OUT2, OUT3) / V))
ph_scene += [phone(t_run0, motion='run', face=f_desk, tilt=0.0, legs=1.0), phone(t_c, *DESK_CORNER, motion='run', face=f_land, tilt=0.0, legs=1.0)]
N = 12
for i in range(1, N + 1):
    u = i / N
    x = DESK_CORNER[0] + (LAND[0] - DESK_CORNER[0]) * u; z = DESK_CORNER[1] + (LAND[1] - DESK_CORNER[1]) * u
    y = DESK_Y * (1 - u) + 4 * 0.22 * u * (1 - u)
    ph_scene.append(phone(r3(t_c + sa(JUMP * u)), x, z, motion='run', face=f_land, y=round(y, 3), tilt=-12.0 * math.sin(math.pi * u), legs=1.0))
ph_scene += [phone(r3(t_l + sa(0.08)), LAND[0], LAND[1], motion='run', face=f_door, y=0.0, tilt=0.0, legs=1.0),
             phone(t_d, *DOOR, motion='run', face=f_out, y=0.0, legs=1.0), phone(t_o1, *OUT1, motion='run', face=f_out, y=0.0, legs=1.0),
             phone(t_o2, *OUT2, motion='run', face=f_out, y=0.0, legs=1.0), phone(t_o3, *OUT3, motion='run', face=f_out, y=0.0, legs=1.0), phone(1, *OUT3, motion='run', face=f_out, y=-30.0, legs=1.0)]
cA.add('cookiehandy', 0, 1, ph_card + ph_scene)
cA.add('dummy', c_und, 1, [K(c_und, *CH, 'physikshrug', FS), K(r3(c_ohneA - sa(0.25)), *CH, 'physikshrug', FS), K(r3(c_ohneA - sa(0.2)), *CH, 'reachafter', FS), K(1, *CH, 'reachafter', FS)])
def check_a():
    """Handy ist beim Satz „Ohne dich“ schon an der Tür oder draußen und rennt bis zum Ende sichtbar weiter."""
    assert t_d <= c_ohneA + sa(0.6), ('A: Handy zu spät an der Tür', t_d, c_ohneA)
    assert t_o1 < 1, ('A: Lauf zu lang', t_o1)
    return round((t_d - c_ohneA) * TA, 2)
camA = [
  # Karte: Handy zittert auf dem Tisch, Dummy entspannt
  *shot(0, sA - 0.003, F([*seated(), *PH_PTS, *DESK_PTS], -118, 14, ANS), push=0.03),
  # Tipp + Beine wachsen: nah am Handy
  *shot(sA, c_und - 0.003, F([[PH_C[0] - 0.25, 0.72, PH_C[2] - 0.25], [P0[0] + 0.15, 1.25, P0[1] + 0.25], [CH[0], 1.3, CH[1]]], -125, 12, ANS), push=0.05),
  # weg rennt es: Tisch, Boden, Tür
  *shot(c_und, c_ohneA - 0.003, F([*seated(), *DESK_PTS, [LAND[0], 0, LAND[1]], *DOOR_PTS], 55, 14, ANS), push=0.04),
  # ohne dich: hinter dem Dummy Richtung Tür, Handy rennt in den Garten
  *shot(c_ohneA, 1, F([[CH[0] - 0.3, 0.2, CH[1]], [CH[0] + 0.3, 1.5, CH[1] + 0.2], *DOOR_PTS, [OUT1[0], 0, OUT1[1]]], 75, 16, ANS), push=0.05),
]
expA = {
 'camera': camA, 'actors': cA.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sa(0.6)), 'id': 'handy-klingeln', 'volume': 0.25}, {'t': r3(t_tA), 'id': 'klick', 'volume': 0.9},
         {'t': r3(t_up0), 'id': 'rasen-zauber', 'volume': 0.5}, {'t': r3(t_run0), 'id': 'handy-trippeln', 'volume': 0.8},
         {'t': r3(t_c + sa(0.05)), 'id': 'whoosh', 'volume': 0.5}, {'t': r3(t_l), 'id': 'plopp', 'volume': 0.3},
         {'t': r3(c_ohneA + sa(0.3)), 'id': 'leere-wind', 'volume': 0.45}],
}

# =====================================================================================================
# Antwort B: Karte = Schüssel Milch neben das Handy stellen. Szene = warten (Kinn in den Händen) → Keks hüpft aus dem Bildschirm in die Milch
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_eine = cue(B, 'explain2', 'Eine'); c_abw = cue(B, 'explain2', 'abwarten'); c_irg = cue(B, 'explain2', 'Irgendwann'); c_weich = cue(B, 'explain2', 'weich')
cB = Cast()
cB.add('cookiehandy', 0, 1, [phone(0, text='cookies'), phone(1, text='cookies')])
# Karte: Schüssel wird abgestellt (Weg passend zur Bewegung setbowl: Mitte zwischen den Händen − 0,05 m)
t_sb0 = r3(sb(0.25))
CARRY = [0.1, 0.9, 0.34]; SPOT = [0.3, 0.79, 0.56]; BT = (0.15, 0.95, 1.0)
bowlK = []
u = 0.0
while u <= 1.0 + 1e-6:
    mv = ease((u - BT[0]) / (BT[1] - BT[0]))
    loc = [CARRY[i] + (SPOT[i] - CARRY[i]) * mv for i in range(3)]
    w_ = W(CH, FS, [loc[0], 0, loc[2]])
    bowlK.append(K(r3(t_sb0 + sb(u)), w_[0], w_[2], 'park', 0, y=round(loc[1] - 0.05, 3), fill=0.85, mark=0.0))
    u += 1 / 30
bowlK = [dict(bowlK[0], t=0.0)] + bowlK + [K(1, *BOWL, 'park', 0, y=DESK_Y, fill=0.85, mark=0.0)]
cB.add('dummy', 0, sB, [K(0, *CH, 'setbowl', FS), K(r3(t_sb0 - 0.002), *CH, 'setbowl', FS), K(t_sb0, *CH, 'setbowl', FS), K(sB, *CH, 'setbowl', FS)])
# Szene: warten
t_hop0 = r3(c_irg + sb(0.7)); t_hop1 = r3(max(t_hop0 + sb(0.75), c_weich - sb(0.05)))
cB.add('dummy', sB, t_hop1, [K(sB, *CH, 'waitchin', FS, cut=True), K(r3(t_hop1 - 0.002), *CH, 'waitchin', FS)])
cB.add('dummy', t_hop1, 1, [K(t_hop1, *CH, 'physikshrug', FS), K(1, *CH, 'physikshrug', FS)])
# Keks: kommt aus dem Bildschirm (leuchtet), hüpft im Bogen in die Milch, schwimmt
KS = [PH_C[0], 0.78, PH_C[2]]; KE = [BOWL[0], 0.74 + 0.065, BOWL[1]]
kk = [K(t_hop0 - sb(0.35), KS[0], KS[2], 'park', 0, y=0.76, size=-0.9, glow=1.0, tilt=0.0), K(t_hop0, KS[0], KS[2], 'park', 0, y=0.8, size=0.0, glow=1.0, tilt=0.0)]
for i in range(1, 13):
    u = i / 12
    x = KS[0] + (KE[0] - KS[0]) * u; z = KS[2] + (KE[2] - KS[2]) * u
    y = 0.8 + (KE[1] - 0.8) * u + 4 * 0.28 * u * (1 - u)
    kk.append(K(r3(t_hop0 + (t_hop1 - t_hop0) * u), x, z, 'park', 0, y=round(y, 3), size=0.0, glow=round(1 - 0.6 * u, 2), tilt=round(360 * u, 1)))
kk += [K(r3(t_hop1 + sb(0.25)), KE[0], KE[2], 'park', 0, y=KE[1] - 0.012, glow=0.0, tilt=360.0), K(r3(t_hop1 + sb(0.8)), KE[0] + 0.02, KE[2], 'park', 0, y=KE[1] - 0.004, tilt=356.0),
       K(1, KE[0] - 0.01, KE[2] + 0.01, 'park', 0, y=KE[1] - 0.01, tilt=362.0)]
cB.add('keks1', r3(t_hop0 - sb(0.35)), 1, kk)
bowlK2 = [K(sB, *BOWL, 'park', 0, y=DESK_Y, fill=0.85, mark=0.0, cut=True), K(r3(t_hop1 - 0.002), *BOWL, 'park', 0, y=DESK_Y, mark=0.0), K(t_hop1, *BOWL, 'park', 0, y=DESK_Y, mark=1.0),
          K(r3(t_hop1 + sb(1.2)), *BOWL, 'park', 0, y=DESK_Y, mark=0.4), K(1, *BOWL, 'park', 0, y=DESK_Y, mark=0.2)]
cB.add('milchschuessel', 0, 1, [k for k in bowlK if k['t'] <= sB - 0.002] + bowlK2)
camB = [
  # Karte: Dummy stellt die Schüssel neben das Handy
  *shot(0, sB - 0.003, F([*seated(), *PH_PTS, *BOWL_PTS, *DESK_PTS], -112, 14, ANS), push=0.03),
  # warten: Kinn in den Händen, Handy + Schüssel vorn
  *shot(sB, c_irg - 0.003, F([[CH[0] - 0.4, 0.7, CH[1] - 0.35], [CH[0] + 0.1, 1.5, CH[1] + 0.35], *PH_PTS, *BOWL_PTS], -100, 12, ANS), push=0.06),
  # irgendwann: nah Handy + Schüssel, Keks hüpft
  *shot(c_irg, 1, F([*PH_PTS, *BOWL_PTS, [PH_C[0], 1.08, (PH_C[2] + BOWL[1]) / 2]], -115, 22, ANS), push=0.05),
]
expB = {
 'camera': camB, 'actors': cB.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_sb0 + sb(BT[1])), 'id': 'schuessel-abstellen', 'volume': 0.8}, {'t': r3(c_abw), 'id': 'leere-wind', 'volume': 0.35},
         {'t': r3(t_hop0 - sb(0.3)), 'id': 'plopp', 'volume': 0.55}, {'t': r3(t_hop1), 'id': 'milch-plopp', 'volume': 0.9},
         {'t': r3(t_hop1 + sb(0.3)), 'id': 'himmel-chor', 'volume': 0.25}],
}

# =====================================================================================================
# Antwort C: Karte = tippt auf „Alle akzeptieren“, erste Fenster. Szene = wild tippen, Fenster über Fenster → draußen:
#            Agenten stehen Schlange vor der Tür → Tauziehen um den Daten-Ordner, Kekse fliegen, Rauferei-Wolke
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_ueb = cue(C, 'explain3', 'Überall'); c_sof = cue(C, 'explain3', 'Sofort'); c_str = cue(C, 'explain3', 'und streiten'); c_cook = cue(C, 'explain3', 'Cookies')
c_akzC = cue(C, 'option3', 'akzeptierst') if False else None
cC = Cast()
# innen: Karte + „Überall auf Akzeptieren geklickt“
t_tc0 = r3(sc(0.5)); t_tc = r3(t_tc0 + sc(TAP))
cC.add('cookiehandy', 0, c_sof, [phone(0, text='many'), phone(r3(t_tc - 0.002), text='many'), phone(t_tc, glow=1.0, text='many'), phone(r3(t_tc + sc(0.5)), glow=0.0, text='many'),
                                 phone(sC, text='many', rumble=0.6, cut=True), phone(c_sof, text='many', rumble=0.6)])
cC.add('dummy', 0, sC, [K(0, *CH, 'chairsit', FS), K(r3(t_tc0 - 0.002), *CH, 'chairsit', FS), K(t_tc0, *CH, 'tapphone', FS), K(sC, *CH, 'tapphone', FS)])
cC.add('dummy', sC, c_sof, [K(sC, *CH, 'wildtap', FS), K(c_sof, *CH, 'wildtap', FS)])
POP_SPOTS = [(330, 560), (730, 640), (420, 860), (700, 470), (300, 760), (760, 860), (520, 600), (380, 450), (680, 760), (540, 920)]
popC = [{'t': r3(t_tc + sc(0.1)), 'text': 'ALLE\nAKZEPTIERT', 'x': 360, 'y': 640}, {'t': r3(t_tc + sc(0.9)), 'text': 'ALLE\nAKZEPTIERT', 'x': 700, 'y': 820}]
n_pop = 0
tt = sC + sc(0.1)
while tt < c_sof - sc(0.15) and n_pop < len(POP_SPOTS):
    x, y = POP_SPOTS[n_pop]
    popC.append({'t': r3(tt), 'text': 'ALLE\nAKZEPTIERT', 'x': x, 'y': y}); n_pop += 1; tt += sc(0.17)
popC.append({'t': r3(c_sof), 'text': ''})
# draußen: Schlange vor der Tür (Blick zur Tür = face 90 … Tür bei x −2.56)
QF = 90
Q = [(-3.15, DOOR_Z), (-3.85, DOOR_Z + 0.05), (-4.55, DOOR_Z - 0.05)]
cC.add('agent', c_sof, c_str, [K(c_sof, *Q[0], 'magnify', QF), K(c_str, *Q[0], 'magnify', QF)])
cC.add('agent2', c_sof, c_str, [K(c_sof, *Q[1], 'stand', QF), K(c_str, *Q[1], 'stand', QF)])
cC.add('agent3', c_sof, c_str, [K(c_sof, *Q[2], 'armscross', QF), K(c_str, *Q[2], 'armscross', QF)])
cC.add('lupe', c_sof, c_str, [K(c_sof, *Q[0], 'park', QF, y=1.2, hand=1.0, drop=0.0, holder='agent'), K(c_str, *Q[0], 'park', QF, y=1.2, hand=1.0, holder='agent')])
cC.add('datenordner', c_sof, c_str, [K(c_sof, *Q[1], 'park', QF, y=0.6, hand=1.0, drop=0.2, holder='agent2', size=-0.25), K(c_str, *Q[1], 'park', QF, y=0.6, hand=1.0, drop=0.2, holder='agent2', size=-0.25)])
# Tauziehen auf dem Rasen: Seil entlang z, Mitte (TX, TZ); Gruppe schwankt hin und her
TX, TZ = -4.6, 2.1
GAP = 1.45
def sway(t):
    return 0.22 * math.sin(2 * math.pi * (t - c_str) * TC / 1.15)
ag1, ag2, rope = [], [], []
u = c_str
while u <= 1 + 1e-6:
    s_ = sway(u)
    ag1.append(K(r3(u), TX, TZ - GAP + s_, 'tugpull', 180))
    ag2.append(K(r3(u), TX, TZ + GAP + s_, 'tugpull', 0))
    rope.append(K(r3(u), TX, TZ + s_, 'park', 0, y=0.86, rumble=1.0, mark=0.0))
    u += sc(1 / 15)
cC.add('agent', c_str, 1, ag1); cC.add('agent2', c_str, 1, ag2); cC.add('tauziehseil', c_str, 1, rope)
A3 = (TX + 1.25, TZ + 0.35); HEAP = (TX + 1.45, TZ - 0.6)
cC.add('agent3', c_str, 1, [K(c_str, *A3, 'snatch', 200), K(1, *A3, 'snatch', 200)])
cC.add('kekshaufen', c_str, 1, [K(c_str, *HEAP, 'park', 0)])
t_burst = r3(c_str + sc(0.35))
cC.add('keksregen', t_burst, 1, [K(t_burst, TX, TZ, 'burst', 0, y=0.6, drop=0.6, size=-0.2)])
t_cloud = r3(max(c_cook - sc(0.1), t_burst + sc(0.8)))
cC.add('raufwolke', t_cloud, 1, [K(t_cloud, TX + 0.3, TZ, 'park', 0, fill=0.0), K(r3(t_cloud + sc(0.35)), TX + 0.3, TZ, 'park', 0, fill=1.0), K(1, TX + 0.3, TZ, 'park', 0, fill=1.1)])
def check_c():
    """Agenten stehen frei auf dem Rasen (nicht in der Hauswand, Abstand zum Haus ≥ 0,4 m), Kekse landen vor dem Ende."""
    for p in Q + [(TX, TZ - GAP - 0.25), (TX, TZ + GAP + 0.25), A3]:
        assert p[0] < -2.56 - 0.4, ('C: Figur zu nah an der Hauswand', p)
    assert t_cloud < 1 - sc(0.8), ('C: Rauferei-Wolke zu spät', t_cloud)
    return n_pop
OUT_PTS = [[-2.56, 0, DOOR_Z - 0.6], [-2.56, 2.2, DOOR_Z + 0.6]]
camC = [
  # Karte: Dummy tippt, erste Fenster
  *shot(0, sC - 0.003, F([*seated(), *PH_PTS, *DESK_PTS], -112, 14, ANS), push=0.03),
  # überall auf Akzeptieren: nah, wildes Tippen
  *shot(sC, c_sof - 0.003, F([[CH[0] - 0.45, 0.7, CH[1] - 0.35], [CH[0] + 0.1, 1.45, CH[1] + 0.35], *PH_PTS], -120, 20, ANS), push=0.07),
  # draußen: Schlange vor der Tür
  *shot(c_sof, c_str - 0.003, F([*body(*Q[0], 1.95, 0.3), *body(*Q[2], 1.95, 0.3), *OUT_PTS], -38, 8, ANS), push=0.05),
  # Tauziehen + Kekse + Wolke (Hauswand mit Fenster + Tür dahinter)
  *shot(c_str, 1, F([[TX - 0.3, 0, TZ - GAP - 0.45], [TX + 0.3, 1.9, TZ + GAP + 0.45], [A3[0], 2.0, A3[1]], [HEAP[0], 0, HEAP[1]]], -62, 12, ANS), push=0.04),
]
inv_c = None
def inv_te(y):
    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if te(mid) < y: lo = mid
        else: hi = mid
    return lo
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': [{'t': 0, 'stage': STAGE}, {'t': round(inv_te(te(c_sof)), 4), 'stage': STAGE_OUT}], 'popups': popC,
 'sfx': [{'t': r3(t_tc), 'id': 'klick', 'volume': 0.9},
         *[{'t': p['t'], 'id': 'plopp', 'volume': 0.35} for p in popC if p['text']],
         *[{'t': r3(sC + sc(0.1 + 0.34 * k)), 'id': 'klick', 'volume': 0.6} for k in range(int((c_sof - sC) / sc(0.34)))],
         {'t': r3(c_sof + sc(0.1)), 'id': 'schleichen', 'volume': 0.5},
         {'t': r3(c_str), 'id': 'tauziehen', 'volume': 0.75}, {'t': r3(t_burst), 'id': 'puff', 'volume': 0.6},
         {'t': r3(t_cloud), 'id': 'rauferei', 'volume': 0.8}],
}
expC['sfx'] = [s for s in expC['sfx'] if s['t'] < 1]

# =====================================================================================================
# Abstimmung + Outro: Dummy steht neben dem Schreibtisch, Handy steht mit Beinen auf dem Tisch, Schüssel Milch daneben
# =====================================================================================================
DV = (-1.35, 0.5)
PH_STAND = (-2.08, -0.5)
def endcast(wave=False):
    c = Cast()
    c.add('cookiehandy', 0, 1, [phone(0, *PH_STAND, motion='stand', face=110, tilt=0.0, legs=1.0, text='cookies')])
    c.add('milchschuessel', 0, 1, [K(0, *BOWL, 'park', 0, y=DESK_Y, fill=0.85)])
    c.add('dummy', 0, 1, [K(0, *DV, 'stand', 215, question=0.0 if wave else 1.0)] + ([K(0.12, *DV, 'wave', 215), K(1, *DV, 'wave', 215)] if wave else []))
    return c.build()
V_PTS = [*body(*DV), *PH_PTS, [PH_STAND[0], 1.05, PH_STAND[1]], *BOWL_PTS]
vote = {'camera': shot(0, 1, F(V_PTS, 20, 3, (120, 960, 1060, 1320)), push=0.04), 'actors': endcast(), 'stage': STAGE}
outro = {'camera': shot(0, 1, F(V_PTS, 22, 6, (100, 980, 780, 1110)), push=0.05), 'actors': endcast(True), 'stage': STAGE}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du hast mal wieder alle Cookies auf einer Website akzeptiert – was machst du? 🍪📱 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Alles bleibt rein comichaft und harmlos. 😄\n\n"
        "#waswürdestdutun #cookies #internet #handy #agenten #comedy #quiz #dummy #spezial\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': STAGE, 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy tippt kurz aufs Handy – dem Smartphone wachsen lange Low-Poly-Beine, es steht auf, rennt über den Tisch, springt herunter und flitzt zur offenen Tür hinaus in den Garten. Der Dummy schaut verdutzt hinterher und streckt den Arm aus. Niemand wird verletzt.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy stellt seelenruhig eine Schüssel Milch neben das Handy und wartet, das Kinn in den Händen. Irgendwann hüpft ein bunter Keks aus dem Bildschirm und plumpst in die Milch – der Dummy reißt die Arme hoch.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy tippt wild überall auf „Alle akzeptieren“, Fenster über Fenster ploppen auf. Draußen vor der Tür stehen sofort drei Agenten-Dummys (dunkler Anzug, Sonnenbrille, Lupe, Ordner „DATEN“) Schlange – dann liefern sie sich ein comichaftes Tauziehen um den Daten-Ordner, bunte Kekse fliegen, eine Rauferei-Wolke. Niemand wird verletzt.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
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
print('A (Handy an der Tür, s nach „Ohne dich“):', check_a(), '| C (Fenster):', check_c())
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
_st = {'A': seclen('situation'), 'B': seclen('situation') + TA, 'C': seclen('situation') + TA + TB}
f = lambda sec, t: round((_st[sec] + t * {'A': TA, 'B': TB, 'C': TC}[sec]) * 30)
print('Schlüsselbilder: Sit-Tipp', round(t_tap * TS * 30), '| A-Beine', f('A', t_up1), '| A-Sprung', f('A', t_c + sa(0.2)), '| A-Tür', f('A', t_d), '| B-Keks', f('B', (t_hop0 + t_hop1) / 2),
      '| B-Milch', f('B', t_hop1 + sb(0.3)), '| C-wild', f('C', c_sof - sc(0.3)), '| C-Schlange', f('C', (c_sof + c_str) / 2), '| C-Tauziehen', f('C', t_burst + sc(0.4)), '| C-Wolke', f('C', t_cloud + sc(0.6)))
