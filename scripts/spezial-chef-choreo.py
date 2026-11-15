# Hilfsskript: erzeugt scenarios/spezial-chef.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-chef-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-haus-weg, Bühne "bueroetage".
# Darstellung (Vorgabe Inhaber): comichaft + harmlos.
#  A: Bagger bricht durch die Wand, schiebt den Kopierer zur Seite – NUR Möbel/Wände/Kopierer gehen kaputt; Chef + Kollegen stehen
#     deutlich sichtbar sicher an der Seite und staunen.
#  B: Reverse-Karte = rote Karte mit zwei gebogenen Pfeilen im Kreis, OHNE Schriftzug, OHNE weißes Oval, OHNE Logo.
#  C: Show-Boxkampf mit Boxhandschuhen auf beiden Seiten, keine Treffer am Körper, keine Verletzungen.
# Spezial-Regeln: Länge 61–66 s, keine Dopplungen, Outro (A/B/C in die Kommentare NUR EINMAL + folgen + jemanden markieren), keine Logos.
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-chef'
S = dict(
situation="Dein Chef geht dir mal wieder auf die Nerven. Seit Wochen. Jeden Tag ein bisschen mehr. Was machst du?",
o1c="Mit dem Bagger kündigen", o1s="A: Du fährst mit dem Bagger durchs Büro und wirfst ihm die Kündigung hin.",
o2c="Uno-Reverse-Karte", o2s="B: Du spielst die Uno-Reverse-Karte. Ab jetzt bist du sein Chef.",
o3c="Das Känguru reinlassen", o3s="C: Du lässt das Känguru mit den Boxhandschuhen in sein Büro.",
e1="Die Wand gibt nach. Der Kopierer auch. Alle stehen sicher an der Seite und staunen. Dann hältst du an und wirfst ihm die Kündigung auf den Tisch.",
e2="Die Karte liegt auf dem Tisch. Ein kurzer Wirbel, und plötzlich sitzt du auf seinem Stuhl. Ab jetzt gehst du ihm auf die Nerven. Jeden Tag ein bisschen mehr.",
e3="Die Tür geht auf. Das Känguru hüpft rein. Die Glocke klingelt: Runde eins. Ein epischer Kampf. Und du holst dir in Ruhe einen Kaffee.",
vote="Also, was machst du? Schreib A, B oder C in die Kommentare.",
# Outro: Text des Inhabers + Wunsch des Inhabers (folgen + jemanden markieren, dem das auch immer passiert; „Kommentare“ nur einmal)
outro="Schreib A, B oder C in die Kommentare und folg gerne für mehr. Markier jemanden, dem das auch immer passiert.",
)
EXTRA = {1: 0.0, 2: 0.0, 3: 0.0}
TAIL = 0.3   # Pause nach jedem Clip (gekürzt, damit ≤ 66 s und nah an 1 Minute – Texte unverändert)
NO_VOTE = True
OUTRO_MIN = 0.0   # bei Bedarf: Schlussbild 2–3 s länger stehen lassen (Ziel ≥ 61 s)

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
def cue(sec, clip, phrase, last=False):
    off = 0.0
    if sec.startswith('answer') and clip.startswith('explain'):
        off = answer_parts(int(sec[-1]))[0]
    return round((off + LEAD[clip] + st_of(clip, phrase, last)) / seclen(sec), 4)
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
def seated(x, z, y=0.0):
    return body(x, z, 1.5, 0.3, y)
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
def mshot(t0, t1, pos, look, fov=None, push=0.06):
    """Kamera von Hand gesetzt (enge Innenräume), langsam heranfahren"""
    p2 = [pos[i] + (look[i] - pos[i]) * push for i in range(3)]
    return [cam(t0, pos, look, fov), cam(t1, p2, look, fov)]
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)
def path(t0, t1, pts, motion, face, **kw):
    """Weg mit gleichmäßigem Tempo über mehrere Punkte"""
    L = [0.0]
    for i in range(1, len(pts)):
        L.append(L[-1] + math.dist(pts[i - 1], pts[i]))
    out = []
    for i, p in enumerate(pts):
        f = face if face is not None else face_to(pts[max(0, i - 1)], pts[min(len(pts) - 1, max(1, i))])
        out.append(K(t0 + (t1 - t0) * L[i] / L[-1], *p, motion, f, **kw))
    return out

# ---- feste Plätze (src/stage/OpenOffice.tsx: BUERO) ----
WALL = (0.0, -3.6)                      # Bürowand-Objekt, face 90 (Teile fliegen nach +x ins Chefbüro)
LANE = -3.7                             # Bagger-Fahrweg (Mitte), Breite 4 m
DESK = (3.9, -4.5); DESK_H = 0.76
CHAIR = (3.9, -5.3); CHAIR_Y = 0.09     # Chefsessel (Sitz 0,54 m) → Figuren dort mit y 0.09, face 180
VISITOR = (3.9, -3.7)
DOOR_HINGE = (1.86, -1.0)
MY_DESK = (-4.2, 2.4); MY_SEAT = (-4.2, 3.05)
COFFEE_ST = (-1.0, 1.33)
COPIER0 = (0.9, -3.0)
CHEF_SAFE = (5.05, -5.5)  # hinter seinem Schreibtisch neben dem Regal (3,4 m vom Bagger, Wandteile fliegen höchstens bis x 3,5)                # Chef bei A: sicher in der Ecke vorn rechts im Chefbüro
COLL = {'kollege1': (-3.4, 1.2), 'kollege2': (-4.4, 1.4), 'kollege3': (-5.4, 1.2)}   # Kollegen bei A: sicher an der Seite, ca. 3 m vom Bagger
SEAT_B = dict(attach='bagger', y=2.6)   # im Bagger: x −0.85, z 0.55 (Kabine), face 0
def bseat(t, motion, **kw):
    return K(t, -0.85, 0.55, motion, 0, **SEAT_B, **kw)
def door(t, v):
    return K(t, *DOOR_HINGE, 'park', 0, y=0.0, door=v)
def wall(t, v):
    return K(t, *WALL, 'park', 90, y=0.0, fill=v)
def static(wallfill=0.0, doorv=0.0, copier=True):
    a = {'buerowand': [wall(0, wallfill)], 'glastuer': [door(0, doorv)]}
    if copier: a['kopierer'] = [K(0, *COPIER0, 'park', 90, y=0.0)]
    return a
def colleagues(motion='stand', faces=None):
    return {n: [K(0, x, z, motion, (faces or {}).get(n, 180))] for n, (x, z) in COLL.items()}

# ================= Situation: Chef nervt am Platz des Dummys =================
L0 = 'situation'
c_seit = cue(L0, 'situation', 'Seit Wochen')
c_jed = cue(L0, 'situation', 'Jeden Tag')
c_meh = cue(L0, 'situation', 'bisschen mehr')
c_was = cue(L0, 'situation', 'Was machst')
CHEF_NAG = (-3.45, 2.85)
a = static()
a['dummy'] = [K(0, *MY_SEAT, 'typedesk', 0), K(r3(c_seit - 0.003), *MY_SEAT, 'typedesk', 0),
              K(c_seit, *MY_SEAT, 'deskslump', 0, cut=True), K(r3(c_was - 0.003), *MY_SEAT, 'deskslump', 0),
              K(c_was, MY_SEAT[0] - 0.75, MY_SEAT[1] + 0.35, 'stand', 180, cut=True, brow=1), K(r3(c_was + sec(L0, 0.5)), MY_SEAT[0] - 0.75, MY_SEAT[1] + 0.35, 'stand', 180, question=1)]
a['chef'] = [K(0, *CHEF_NAG, 'nagpoint', face_to(CHEF_NAG, (MY_DESK[0], MY_DESK[1] + 0.2))), K(r3(c_was - 0.003), *CHEF_NAG, 'nagpoint', face_to(CHEF_NAG, (MY_DESK[0], MY_DESK[1] + 0.2))),
             K(c_was, -3.3, 3.0, 'watchlook', 240, cut=True), K(1, -3.3, 3.0, 'watchlook', 240)]
# „Seit Wochen“: Kalender auf der Trennwand blättert Woche für Woche
WEEKS = 'Woche 1|Woche 2|Woche 3|Woche 4|Woche 5|Woche 6|Woche 7'
CAL = (MY_DESK[0] - 0.45, MY_DESK[1] - 0.38)
a['tageskalender'] = [K(0, *CAL, 'park', 180, y=1.05, fill=1, text=WEEKS), K(r3(c_seit + sec(L0, 0.15)), *CAL, 'park', 180, fill=1),
                      K(r3(c_jed - sec(L0, 0.1)), *CAL, 'park', 180, fill=6)]
# „Jeden Tag ein bisschen mehr“: Aufgaben-Stapel wachsen auf dem Tisch
STACK_ME = (MY_DESK[0] + 0.15, MY_DESK[1] - 0.05)
a['aktenstapel'] = [K(0, *STACK_ME, 'park', 180, y=0.74, fill=0.0), K(r3(c_jed), *STACK_ME, 'park', 180, fill=0.0), K(r3(c_was - sec(L0, 0.1)), *STACK_ME, 'park', 180, fill=1.0)]
a.update(colleagues('typedesk', {}))
for n, (x, z) in [('kollege1', (-5.9, 3.05)), ('kollege2', (-10.2, 3.05)), ('kollege3', (-11.9, 3.05))]:
    a[n] = [K(0, x, z, 'typedesk', 0)]
SLUMP_PTS = seated(*MY_SEAT) + [[MY_DESK[0] - 0.75, 0.74, MY_DESK[1] - 0.4], [MY_DESK[0] + 0.75, 1.3, MY_DESK[1] - 0.4]]
situation = {
 'camera': [*shot(0, r3(c_seit - 0.003), F(seated(*MY_SEAT) + body(*CHEF_NAG) + [[MY_DESK[0] - 0.75, 0.74, MY_DESK[1]]], 18, 12, SIT)),
            *shot(c_seit, r3(c_jed - 0.003), F([[CAL[0] - 0.25, 0.85, CAL[1]], [CAL[0] + 0.25, 1.45, CAL[1]]] + seated(*MY_SEAT), 340, 10, SIT, push=0.1)),
            *shot(c_jed, r3(c_was - 0.003), F(SLUMP_PTS + [[STACK_ME[0], 1.4, STACK_ME[1]]] + body(*CHEF_NAG), 15, 26, SIT)),
            *shot(c_was, 1, F(body(MY_SEAT[0] - 0.75, MY_SEAT[1] + 0.35, 2.3) + body(-3.3, 3.0), 0, 6, SIT))],
 'actors': a,
 'sfx': [{'t': 0.02, 'id': 'tastatur', 'volume': 0.35}, {'t': r3(c_seit + sec(L0, 0.1)), 'id': 'kalender-blaettern', 'volume': 0.45},
         {'t': r3(c_jed + sec(L0, 0.15)), 'id': 'papierstapel', 'volume': 0.6}, {'t': r3(c_meh), 'id': 'papierstapel', 'volume': 0.6}],
}

# ================= Antwort A: mit dem Bagger durch die Wand, Kündigung auf den Tisch =================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA)
sa = lambda s: s / TA
c_wand = cue(A, 'explain1', 'Die Wand')
c_kop = cue(A, 'explain1', 'Der Kopierer')
c_alle = cue(A, 'explain1', 'Alle stehen')
c_stau = cue(A, 'explain1', 'staunen')
c_mid = cue(A, 'explain1', 'an der Seite')
c_dann = cue(A, 'explain1', 'Dann hältst')
c_wirf = cue(A, 'explain1', 'wirfst ihm')
c_tisch = cue(A, 'explain1', 'auf den Tisch')
BX0, BX_HIT, BX_STOP = -9.6, -2.75, -1.2          # Bagger-Mitte (x): Start, Wand berührt (Front x 0), Halt
t_hit = r3(c_wand + sa(0.35))                      # Wand bricht kurz nach „Die Wand“
t_stop = r3(c_dann + sa(0.35))
bx_card_end = -4.3
BX_COP = COPIER0[0] - 0.34 - 2.8                  # Bagger-Mitte, wenn die Front den Kopierer berührt
t_cop0 = r3(max(t_hit + sa(0.3), c_kop + sa(0.1)))
t_cop1 = r3(c_alle - sa(0.1))                      # Kopierer ist zur Seite geschoben
bag = [K(0, BX0, LANE, 'drive', 90, y=0.0, tilt=60, smoke=0.6), K(r3(sA - 0.003), bx_card_end, LANE, 'drive', 90, tilt=60),
       K(sA, bx_card_end, LANE, 'drive', 90, cut=True), K(t_hit, BX_HIT, LANE, 'drive', 90), K(t_cop0, BX_COP, LANE, 'drive', 90),
       K(t_cop1, -1.6, LANE, 'drive', 90),
       K(t_stop, BX_STOP, LANE, 'drive', 90), K(r3(t_stop + sa(0.02)), BX_STOP, LANE, 'park', 90, smoke=0.3), K(1, BX_STOP, LANE, 'park', 90)]
def bag_x(t):
    for i in range(len(bag) - 1):
        if bag[i]['t'] <= t <= bag[i + 1]['t']:
            u = (t - bag[i]['t']) / max(1e-6, bag[i + 1]['t'] - bag[i]['t'])
            return bag[i]['x'] + (bag[i + 1]['x'] - bag[i]['x']) * u
    return bag[-1]['x']
# Kopierer: ab Front-Kontakt (Front = Mitte + 2.8 = Kopierer-Rückseite 0.56) bis zum Halt mitgeschoben + zur Seite
def t_at_x(x):
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if bag_x(mid) < x: lo = mid
        else: hi = mid
    return lo
COPIER1 = (2.35, -1.42)
wallA = [wall(0, 0.0), wall(r3(t_hit - 0.003), 0.0), wall(t_hit, 0.001), wall(r3(t_hit + sa(2.2)), 1.0)]
copA = [K(0, *COPIER0, 'park', 90, y=0.0, tilt=0, fill=0), K(t_cop0, *COPIER0, 'park', 90, rumble=1),
        K(r3(t_cop0 + (t_cop1 - t_cop0) * 0.6), 1.7, -2.1, 'park', 118, tilt=-8, fill=0.6), K(t_cop1, *COPIER1, 'park', 132, tilt=-14, fill=1.0, rumble=0),
        K(1, *COPIER1, 'park', 132, tilt=-14)]
# Dummy im Bagger; Brief fliegt bei THROW_RELEASE (0,7 s) aus der Kabine auf den Tisch
THROW_REL = 0.7
th0 = r3(max(t_stop + sa(0.1), c_wirf - sa(0.45)))
t_rel = r3(th0 + sa(THROW_REL))
dummyA = [bseat(0, 'seatdrive', text='KÜNDIGUNG'), bseat(r3(th0 - 0.003), 'seatdrive'), bseat(th0, 'seatthrow'), bseat(1, 'seatthrow')]
# Hand beim Abwurf (Welt): Kabine (−0.85, 2.6, 0.55) im Bagger (face 90) + Hand (0,14 rechts, 1,32 hoch, 0,55 vorn)
hand_rel = (BX_STOP + 0.55 + 0.55, 2.6 + 1.32, LANE + 0.85 + 0.14)
LAND = (DESK[0] - 0.35, DESK[1] + 0.2)
t_land = r3(min(0.985, t_rel + sa(0.75)))
arc = []
for i in range(6):
    u = i / 5
    x = hand_rel[0] + (LAND[0] - hand_rel[0]) * u
    z = hand_rel[2] + (LAND[1] - hand_rel[2]) * u
    y = hand_rel[1] + (DESK_H + 0.01 - hand_rel[1]) * u + 1.2 * math.sin(math.pi * u)
    arc.append(K(t_rel + (t_land - t_rel) * u, x, z, 'toss', 90 + 160 * u, y=y - 0.0))
letterA = [K(0, *LAND, 'park', 0, y=HIDE, text='KÜNDIGUNG'), K(r3(t_rel - 0.003), *LAND, 'park', 0, y=HIDE)] + arc + \
          [K(r3(t_land + 0.002), *LAND, 'park', 200, y=DESK_H + 0.005, tilt=1), K(1, *LAND, 'park', 200, y=DESK_H + 0.005, tilt=1)]
aA = static(copier=False)
aA['buerowand'] = wallA
aA['kopierer'] = copA
aA['bagger'] = bag
aA['dummy'] = dummyA
aA['brief'] = letterA
aA['chef'] = [K(0, *CHEF_SAFE, 'stand', face_to(CHEF_SAFE, (0, -3.6))), K(r3(t_hit + sa(0.1)), *CHEF_SAFE, 'gape', face_to(CHEF_SAFE, (0, -3.6))),
              K(r3(t_rel), *CHEF_SAFE, 'gape', face_to(CHEF_SAFE, LAND)), K(1, *CHEF_SAFE, 'gape', face_to(CHEF_SAFE, LAND), sweat=0.8)]
for n, (x, z) in COLL.items():
    f = face_to((x, z), (0, -3.6))
    aA[n] = [K(0, x, z, 'stand', f), K(r3(sA + sa(0.3)), x, z, 'gape', f)]
BAG_AT = lambda bx: [[bx - 2.8, 0, LANE - 2], [bx + 2.8, 0, LANE + 2], [bx - 0.1, 4.8, LANE + 0.85], [bx + 3.5, 4.4, LANE - 0.75]]
WALL_PTS = [[0, 0, -5.7], [0, 0, -1.5], [0, 4.6, -5.7], [0, 4.6, -1.5]]
SAFE_PTS = body(*CHEF_SAFE) + [p for (x, z) in COLL.values() for p in body(x, z)]
expA = {
 'camera': [*shot(0, r3(sA - 0.003), F(BAG_AT(-7.0) + body(-5.0, 0.7), 300, 10)),
            # 1) im Chefbüro: die Wand gibt nach (Kamera rechts vorn, sicher)
            *shot(sA, r3(c_kop - 0.003), F(WALL_PTS + [[2.2, 0, -3.6]], 105, 6)),
            # 2) der Kopierer wird zur Seite geschoben
            *mshot(c_kop, r3(c_alle - 0.003), [5.6, 2.4, -1.25], [1.4, 0.9, -2.6], 55),
            # 3a) Kollegen stehen sicher an der Seite und staunen, dahinter der Bagger in der Wand
            *shot(c_alle, r3(c_mid - 0.003), F([p for (x, z) in COLL.values() for p in body(x, z)] + [[-1.0, 4.6, LANE + 0.85]], 330, 8)),
            # 3b) Chef steht sicher in der Ecke seines Büros und staunt
            *mshot(c_mid, r3(c_dann - 0.003), [4.3, 1.65, -1.4], [4.65, 1.2, -5.0], 50),
            # 4) Kabine: anhalten + werfen
            *mshot(c_dann, r3(c_tisch - sa(0.25)), [2.9, 3.1, -1.35], [-0.1, 3.75, -2.75], 50),
            # 5) Brief landet auf dem Chef-Schreibtisch, Chef staunt sicher in der Ecke
            *mshot(r3(c_tisch - sa(0.25) + 0.003), 1, [3.9, 1.95, -1.3], [4.1, 1.05, -4.9], 50)],
 'actors': aA,
 'sfx': [{'t': 0.01, 'id': 'bagger-motor', 'volume': 0.55}, {'t': r3(sA), 'id': 'bagger-motor', 'volume': 0.6},
         {'t': r3(t_hit), 'id': 'wand-krachen', 'volume': 0.85}, {'t': r3(t_cop0), 'id': 'kopierer-rutschen', 'volume': 0.7},
         {'t': r3(c_alle + sa(0.6)), 'id': 'staunen', 'volume': 0.45}, {'t': r3(th0 + sa(0.5)), 'id': 'whoosh', 'volume': 0.45},
         {'t': r3(t_land), 'id': 'papierstapel', 'volume': 0.55}],
}

# ================= Antwort B: Reverse-Karte – Wirbel – Plätze getauscht =================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB)
sb = lambda s: s / TB
c_karte = cue(B, 'explain2', 'Die Karte')
c_wirb = cue(B, 'explain2', 'Ein kurzer')
c_ploetz = cue(B, 'explain2', 'und plötzlich')
c_ab = cue(B, 'explain2', 'Ab jetzt')
c_ner = cue(B, 'explain2', 'Nerven')
c_jt = cue(B, 'explain2', 'Jeden Tag')
c_mehr = cue(B, 'explain2', 'bisschen mehr')
SLAP_HIT = 0.75
slap0 = r3(max(sB + sb(0.05), c_karte + sb(0.25) - sb(SLAP_HIT)))
t_slap = r3(slap0 + sb(SLAP_HIT))
CARD_SPOT = (VISITOR[0] - 0.05, VISITOR[1] - 0.6)
sw0 = r3(c_wirb - sb(0.05)); sw1 = r3(c_ploetz + sb(0.35)); swap = r3((sw0 + sw1) / 2)
dummyB = [K(0, *VISITOR, 'holdcard', 160), K(r3(sB - 0.003), *VISITOR, 'holdcard', 160),
          K(sB, *VISITOR, 'stand', 0, cut=True), K(r3(slap0 - 0.003), *VISITOR, 'stand', 0),
          K(slap0, *VISITOR, 'slapcard', 0), K(r3(sw0 - 0.003), *VISITOR, 'slapcard', 0),
          K(sw0, *VISITOR, 'spinswap', 0), K(r3(swap - 0.003), *VISITOR, 'spinswap', 0),
          K(swap, *CHAIR, 'spinswap', 180, y=CHAIR_Y, cut=True), K(r3(sw1 - 0.003), *CHAIR, 'spinswap', 180),
          K(sw1, *CHAIR, 'desktap', 180, cut=True), K(r3(c_ab + sb(0.5)), *CHAIR, 'desktap', 180),
          K(r3(c_ab + sb(0.53)), *CHAIR, 'pushstack', 180), K(r3(c_jt - 0.003), *CHAIR, 'pushstack', 180),
          K(c_jt, *CHAIR, 'desktap', 180, cut=True), K(1, *CHAIR, 'desktap', 180)]
chefB = [K(0, *CHAIR, 'chairsit', 180, y=CHAIR_Y, brow=1), K(r3(slap0 + sb(SLAP_HIT)), *CHAIR, 'chairsit', 180, brow=1),
         K(sw0, *CHAIR, 'spinswap', 180, y=CHAIR_Y), K(r3(swap - 0.003), *CHAIR, 'spinswap', 180),
         K(swap, *VISITOR, 'spinswap', 0, y=0.0, cut=True), K(r3(sw1 - 0.003), *VISITOR, 'spinswap', 0),
         K(sw1, *VISITOR, 'sweatstand', 0, cut=True, sweat=0.4), K(r3(c_jt), *VISITOR, 'sweatstand', 0, sweat=1.0), K(1, *VISITOR, 'sweatstand', 0, sweat=2.0)]
# Karte: in der Hand (hand 1) bis zum Knall, dann flach auf dem Tisch (zur Kamera/zum Besucher lesbar = face 180)
cardK = [K(0, *VISITOR, 'park', 180, y=1.2, hand=1, drop=-0.1, size=0.3), K(r3(t_slap - 0.003), *VISITOR, 'park', 180, hand=1, drop=-0.04),
         K(t_slap, *CARD_SPOT, 'park', 180, y=DESK_H + 0.006, hand=0, tilt=1, glow=0, size=0.45), K(r3(t_slap + sb(0.15)), *CARD_SPOT, 'park', 180, glow=1),
         K(r3(sw0 + sb(0.3)), *CARD_SPOT, 'park', 180, glow=1), K(r3(sw1), *CARD_SPOT, 'park', 180, glow=0)]
swirl = [K(0, *DESK, 'park', 0, y=0.0, fill=0), K(sw0, *DESK, 'park', 0, fill=0), K(r3(sw0 + sb(0.3)), *DESK, 'park', 0, fill=1),
         K(r3(sw1 - sb(0.3)), *DESK, 'park', 0, fill=1), K(sw1, *DESK, 'park', 0, fill=0)]
STACK_B = (DESK[0] + 0.1, DESK[1] + 0.12)
stackB = [K(0, *STACK_B, 'park', 180, y=DESK_H, fill=0), K(r3(c_ab + sb(0.4)), *STACK_B, 'park', 180, fill=0), K(r3(c_jt), *STACK_B, 'park', 180, fill=0.43),
          K(r3(c_mehr + sb(0.8)), *STACK_B, 'park', 180, fill=1.0)]
DAYS = 'Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Montag|Dienstag'
CALB = (DESK[0] - 1.25, DESK[1] + 0.05)
calB = [K(0, *CALB, 'park', 180, y=HIDE, fill=1, text=DAYS, good=1, size=0.6), K(r3(c_jt - 0.003), *CALB, 'park', 180, y=HIDE),
        K(c_jt, *CALB, 'park', 180, y=1.85, fill=1), K(r3(c_jt + sb(0.25)), *CALB, 'park', 180, fill=1), K(r3(c_mehr + sb(0.9)), *CALB, 'park', 180, fill=6)]
aB = static(wallfill=0.0, copier=False)
aB['dummy'] = dummyB
aB['chef'] = chefB
aB['reversekarte'] = cardK
aB['wirbel'] = swirl
aB['aktenstapel'] = stackB
aB['tageskalender'] = calB
DESK_PTS = [[DESK[0] - 1, DESK_H, DESK[1] - 0.45], [DESK[0] + 1, DESK_H, DESK[1] + 0.45]]
expB = {
 'camera': [*mshot(0, r3(sB - 0.003), [3.35, 1.5, -1.3], [3.9, 1.35, -3.7], 46),
            # 1) Karte knallt auf den Tisch (nah, von schräg oben)
            *shot(sB, r3(c_wirb - 0.003), F([[CARD_SPOT[0] - 0.35, DESK_H, CARD_SPOT[1] - 0.25], [CARD_SPOT[0] + 0.35, DESK_H, CARD_SPOT[1] + 0.25], [VISITOR[0], 1.95, VISITOR[1]]], 80, 36, push=0.1)),
            # 2) Wirbel über dem Schreibtisch
            *shot(c_wirb, r3(c_ploetz + sb(0.4) - 0.003), F(DESK_PTS + [[DESK[0], 2.9, DESK[1]], [DESK[0] - 1.5, 0, DESK[1]], [DESK[0] + 1.5, 0, DESK[1]]], 15, 10)),
            # 3) Dummy im Chefsessel (von vorn über den Tisch), Chef steht davor
            *shot(r3(c_ploetz + sb(0.4)), r3(c_ab - 0.003), F(seated(*CHAIR, CHAIR_Y) + DESK_PTS + body(*VISITOR), 65, 12)),
            # 4) Dummy schiebt Stapel, Chef schwitzt (über die Schulter des Chefs)
            *mshot(c_ab, r3(c_jt - 0.003), [5.7, 1.65, -2.5], [3.9, 1.0, -4.6], 50),
            # 5) Jeden Tag ein bisschen mehr: Kalender blättert, Stapel wachsen, Chef schwitzt immer mehr
            *mshot(c_jt, 1, [1.45, 1.75, -1.45], [3.75, 1.3, -4.3], 46)],
 'actors': aB,
 'sfx': [{'t': r3(t_slap), 'id': 'karte-klatsch', 'volume': 0.9}, {'t': r3(sw0), 'id': 'wirbel', 'volume': 0.75},
         {'t': r3(c_ab + sb(0.6)), 'id': 'papierstapel', 'volume': 0.55}, {'t': r3(c_ab + sb(2.2)), 'id': 'papierstapel', 'volume': 0.55},
         {'t': r3(c_jt + sb(0.3)), 'id': 'kalender-blaettern', 'volume': 0.45}, {'t': r3(c_mehr), 'id': 'papierstapel', 'volume': 0.6}],
}

# ================= Antwort C: Känguru rein – Boxglocke – Show-Kampf – Kaffee =================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC)
sc = lambda s: s / TC
c_tuer = cue(C, 'explain3', 'Die Tür')
c_kang = cue(C, 'explain3', 'Das Känguru')
c_glo = cue(C, 'explain3', 'Die Glocke')
c_rund = cue(C, 'explain3', 'Runde eins')
c_epi = cue(C, 'explain3', 'Ein epischer')
c_und = cue(C, 'explain3', 'Und du holst')
c_kaff = cue(C, 'explain3', 'Kaffee')
D_DOOR = (1.45, -0.48)                   # Dummy vor der Tür (Griff 0,5 vor / 0,35 links), face 0
D_ASIDE = (0.4, -0.35)
K_WAIT = (2.6, 0.2)
K_FIGHT = (2.35, -3.4); C_FIGHT = (3.6, -3.4)
dh0 = r3(max(sC + sc(0.05), c_tuer - sc(0.2)))
doorC = [door(0, 0), door(r3(dh0 + sc(0.3)), 0), door(r3(dh0 + sc(1.0)), 0.62), door(r3(c_und - 0.003), 0.62), door(c_und, 0), door(1, 0)]
kang = [K(0, *K_WAIT, 'guard', 160), K(r3(c_kang - 0.003), *K_WAIT, 'guard', face_to(K_WAIT, (1.43, -0.9)))]
kang += path(c_kang, r3(c_glo - sc(0.1)), [K_WAIT, (1.75, -0.2), (1.43, -0.6), (1.43, -1.6), (2.0, -2.7), K_FIGHT], 'hop', None)
kang += [K(r3(c_glo - sc(0.05)), *K_FIGHT, 'guard', 90)]
# Show-Kampf: Schläge treffen nur die Handschuhe (Abstand 1,25 m, Faust ca. 0,6–0,75 m vor der Figur)
t = c_epi
while t < 0.995:
    kang += [K(r3(t), *K_FIGHT, 'punch', 90), K(r3(min(0.999, t + sc(0.75))), *K_FIGHT, 'guard', 90)]
    t += sc(1.5)
dumC = [K(0, D_DOOR[0] + 0.5, D_DOOR[1] + 0.3, 'stand', 330), K(r3(dh0 - 0.003), *D_DOOR, 'stand', 0),
        K(dh0, *D_DOOR, 'doorhold', 0, cut=True), K(r3(c_kang + sc(0.2)), *D_DOOR, 'doorhold', 0),
        K(r3(c_kang + sc(0.25)), *D_ASIDE, 'doorhold', 60), K(r3(c_glo - 0.003), *D_ASIDE, 'doorhold', 60),
        K(c_glo, *D_ASIDE, 'stand', 120), K(r3(c_und - 0.003), *D_ASIDE, 'stand', 240),
        K(c_und, *COFFEE_ST, 'pourcoffee', 0, cut=True), K(r3(c_kaff - sc(0.45)), *COFFEE_ST, 'pourcoffee', 0),
        K(r3(c_kaff - sc(0.42)), *COFFEE_ST, 'standcoffee', 20), K(1, *COFFEE_ST, 'standcoffee', 20)]
chefC = [K(0, *C_FIGHT, 'stand', 0, gloves=1), K(r3(c_kang + sc(0.5)), *C_FIGHT, 'stand', 270, gloves=1, brow=1),
         K(r3(c_glo - sc(0.05)), *C_FIGHT, 'boxguard', 270), K(r3(c_epi - 0.003), *C_FIGHT, 'boxguard', 270),
         K(c_epi, *C_FIGHT, 'boxpunch', 270), K(1, *C_FIGHT, 'boxpunch', 270, sweat=0.6)]
BELL = (2.97, -3.4)
bell = [K(0, *BELL, 'park', 180, y=HIDE, size=-0.3), K(r3(c_glo - 0.003), *BELL, 'park', 180, y=HIDE),
        K(c_glo, *BELL, 'show', 180, y=1.98, ring=1), K(r3(c_rund + sc(0.9)), *BELL, 'show', 180, ring=1), K(r3(c_epi), *BELL, 'show', 180, ring=0),
        K(r3(c_epi + 0.003), *BELL, 'park', 180, y=HIDE)]
aC = static(copier=False)
aC['glastuer'] = doorC
aC['kaenguru'] = kang
aC['dummy'] = dumC
aC['chef'] = chefC
aC['boxglocke'] = bell
FIGHT_PTS = body(*K_FIGHT, 1.8) + body(*C_FIGHT, 2.0)
punch_sfx = []
t = c_epi + sc(0.4)
while t < 0.99:
    punch_sfx.append({'t': r3(t), 'id': 'boxschlag', 'volume': 0.55}); t += sc(0.75)
expC = {
 'camera': [*shot(0, r3(sC - 0.003), F(body(*K_WAIT, 1.8) + body(D_DOOR[0] + 0.5, D_DOOR[1] + 0.3) + [[1.0, 2.05, -1.0], [1.86, 0, -1.0]], 345, 6)),
            # 1) Tür geht auf (von innen aus dem Chefbüro)
            *mshot(sC, r3(c_kang - 0.003), [-0.6, 1.5, 1.6], [1.45, 1.1, -0.8], 50),
            # 2) Känguru hüpft rein (Chef staunt vorn rechts)
            *mshot(c_kang, r3(c_glo - 0.003), [0.5, 1.5, -4.6], [2.2, 1.0, -1.8], 55),
            # 3) Glocke + Runde eins: beide in Boxhaltung, Glocke darüber
            *mshot(c_glo, r3(c_epi - 0.003), [2.97, 1.25, -1.15], [2.97, 1.55, -3.4], 64),
            # 4) epischer Kampf: tief + seitlich, langsam herum
            cam(c_epi, [1.7, 0.8, -1.6], [2.98, 1.3, -3.4], 54), cam(r3(c_und - 0.003), [1.15, 0.9, -2.6], [2.98, 1.3, -3.4], 54),
            # 5) Dummy holt sich in Ruhe Kaffee und schaut dem Kampf durchs Glas zu (wie Fernsehen)
            *mshot(c_und, 1, [-4.18, 3.2, 5.11], [0.96, 0.6, -1.02], 44, push=0.05)],
 'actors': aC,
 'sfx': [{'t': r3(dh0 + sc(0.35)), 'id': 'tuer-knarren', 'volume': 0.55}, {'t': r3(c_kang + sc(0.05)), 'id': 'kaenguru-hops', 'volume': 0.6},
         {'t': r3(c_glo + sc(0.05)), 'id': 'boxglocke', 'volume': 0.85}, {'t': r3(c_epi), 'id': 'staunen', 'volume': 0.3},
         {'t': r3(c_und + sc(0.2)), 'id': 'kaffee-eingiessen', 'volume': 0.55}, {'t': r3(c_kaff), 'id': 'kaffee-schluerfen', 'volume': 0.55}] + punch_sfx,
}

# ================= Abstimmung (weggelassen: noVote) – Shot bleibt für die Prüfung =================
aV = static()
aV['dummy'] = [K(0, -1.0, 1.8, 'stand', 180, brow=1)]
vote = {'camera': [cam(0, [-1.0, 1.2, 7.5], [-1.0, 1.6, 1.0]), cam(1, [-1.0, 1.2, 7.2], [-1.0, 1.6, 1.0])], 'actors': aV}

# ================= Outro: alle im Großraumbüro, winken =================
OUT = {'dummy': (-2.2, 0.0 + 1.9), 'chef': (-3.5, 2.1), 'kaenguru': (-0.85, 2.05), 'kollege1': (-4.6, 1.55), 'kollege2': (0.3, 1.55)}
aO = static()
aO['dummy'] = [K(0, *OUT['dummy'], 'stand', 180), K(0.2, *OUT['dummy'], 'wave', 180), K(1, *OUT['dummy'], 'wave', 180)]
aO['chef'] = [K(0, *OUT['chef'], 'stand', 165, gloves=1, sweat=0.5), K(0.35, *OUT['chef'], 'wave', 165), K(1, *OUT['chef'], 'wave', 165)]
aO['kaenguru'] = [K(0, *OUT['kaenguru'], 'guard', 195), K(0.3, *OUT['kaenguru'], 'victory', 195), K(1, *OUT['kaenguru'], 'victory', 195)]
aO['kollege1'] = [K(0, *OUT['kollege1'], 'stand', 160), K(0.45, *OUT['kollege1'], 'wave', 160), K(1, *OUT['kollege1'], 'wave', 160)]
aO['kollege2'] = [K(0, *OUT['kollege2'], 'stand', 200), K(0.5, *OUT['kollege2'], 'wave', 200), K(1, *OUT['kollege2'], 'wave', 200)]
outro = {'camera': shot(0, 1, F([p for k, (x, z) in OUT.items() for p in body(x, z, 2.1)], 0, 4, (70, 1000, 900, 1225), push=0.05)),
         'actors': aO}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Dein Chef geht dir mal wieder auf die Nerven – was machst du? 💼 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Bitte nichts davon nachmachen. 😄\n\n"
        "#waswürdestdutun #chef #arbeit #büro #unoreverse #spezial #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'bueroetage', 'padAfter': TAIL, 'noVote': NO_VOTE,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy fährt mit einem riesigen Bagger durch das Großraumbüro, die Wand zum Chefbüro gibt nach, der Kopierer wird zur Seite geschoben – nur Möbel, Wand und Kopierer gehen kaputt. Chef und Kollegen stehen sicher an der Seite und staunen. Der Dummy hält an und wirft die Kündigung aus der Kabine auf den Tisch des Chefs.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy knallt eine rote Karte mit zwei gebogenen Pfeilen im Kreis (ohne Schrift, ohne Oval, ohne Logo) auf den Tisch. Ein Wirbel – Dummy und Chef tauschen die Plätze. Der Dummy sitzt im Chefsessel, tippt ungeduldig auf den Tisch und schiebt dem schwitzenden Chef Stapel von Aufgaben hin, jeden Tag mehr.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy öffnet die Bürotür, das Känguru mit den Boxhandschuhen hüpft ins Chefbüro, eine Boxglocke klingelt. Känguru und Chef (auch mit Boxhandschuhen) liefern sich einen comichaften Show-Kampf ohne Treffer am Körper. Der Dummy holt sich in Ruhe einen Kaffee.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
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
        keys.sort(key=lambda k: k['t'])
        y = None
        for k in keys:
            if 'y' in k: y = k['y']
            elif y is not None: k['y'] = y
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
total = seclen('situation') + TA + TB + TC + (0 if NO_VOTE else seclen('countdown')) + seclen('outro')
print('Länge', round(total, 1), 's', 'audio' if dur else 'geschätzt', {'situation': seclen('situation'), 'A': (cardA, sceneA), 'B': (cardB, sceneB), 'C': (cardC, sceneC), 'outro': seclen('outro')})
print('A', dict(hit=round(t_hit * TA, 2), cop=round(t_cop0 * TA, 2), stop=round(t_stop * TA, 2), throw=round(th0 * TA, 2), land=round(t_land * TA, 2)))
print('B', dict(slap=round(t_slap * TB, 2), swirl=(round(sw0 * TB, 2), round(sw1 * TB, 2))))
print('C', dict(door=round(dh0 * TC, 2), bell=round(c_glo * TC, 2), fight=round(c_epi * TC, 2), coffee=round(c_und * TC, 2)))
if total < 61: print('ACHTUNG: unter 61 s – Szenen verlängern / Schlussbild stehen lassen')
if total > 66: print('ACHTUNG: über 66 s – Pausen kürzen')
