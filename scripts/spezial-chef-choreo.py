# Hilfsskript: erzeugt scenarios/spezial-chef.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-chef-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-haus-weg, Bühne "grossraumbuero"
# (+ Schnittbild-Variante "grossraumbuero-offen" für Blicke ins Chefbüro).
# Darstellung (Vorgabe Inhaber): comichaft + harmlos.
#  A: nur Möbel, Wand und Kopierer gehen kaputt – Chef und alle Kollegen stehen deutlich sichtbar sicher an der Seite und staunen.
#  B: Reverse-Karte = rote Karte mit zwei gebogenen Pfeilen im Kreis, OHNE Schriftzug, OHNE weißes Oval, OHNE Logo.
#  C: Show-Boxkampf mit Handschuhen auf beiden Seiten, keine Verletzungen (niemand wird getroffen, nur Deckung/Ausweichen).
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
# Szenen rein visuell verlängern (Sekunden, ohne Text), damit das Video mindestens 61 s lang ist
EXTRA = {1: 0.0, 2: 0.0, 3: 0.0}
TAIL = 0.4   # Pause nach jedem Clip (Video sonst 65,7 s – Inhaber: ca. 1 Minute, nicht viel mehr)
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
if len(sys.argv) > 1 and sys.argv[1] == '--extra':
    EXTRA.update({int(k): float(v) for k, v in (a.split('=') for a in sys.argv[2:])})

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
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)

# ---- feste Plätze (src/stage/OpenOffice.tsx: OO) ----
PZ = -2.5
BREACH = (-1.0, PZ)
DOOR_HINGE = (2.9, PZ)                         # Türblatt "zimmertuer" face 0: Scharnier rechts, Blatt bis x 2.04, schwingt ins Chefbüro (−z)
DESK = (-0.6, -6.3); DESK_H = 0.76; DESK_FRONT = -5.88
CHAIR = (-0.6, -7.15)
CHEF_BEHIND = (-0.6, -6.95)
VIS = (-0.6, -5.2)
MYDESK = (-4.4, 1.1); MYDESK_H = 0.74
MYCHAIR = (-4.4, 0.5)
COFFEE_ST = (5.45, -1.3)
FIGHT_C = (4.0, -4.3); FIGHT_K = (5.25, -4.3)  # Chef / Känguru: Kampffläche rechts, gut durchs Glasfenster zu sehen
BG = -0.25                                     # Bagger im Büro auf 75 % verkleinert (Wert "size")
BS = 1 + BG
BSEAT = dict(x=round(-0.85 * BS, 3), y=1.9, z=round(0.55 * BS, 3))
BX = -1.0                                      # Bagger fährt mittig auf den Durchbruch zu (Blick −z = face 0)
def bag_seat(t, motion, **kw):
    return K(t, BSEAT['x'], BSEAT['z'], motion, 0, y=BSEAT['y'], attach='bagger', **kw)
def walls(t0=0.0, show=True):
    """Bürowand + Tür (heil). show=False → ausgeblendet (Schnittbild)."""
    y = 0.0 if show else HIDE
    return {'buerowand': [K(t0, *BREACH, 'park', 0, y=y)],
            'zimmertuer': [K(t0, *DOOR_HINGE, 'park', 0, y=y, door=0)]}
def mystack(fill=0.85):
    return [K(0, MYDESK[0] + 0.35, MYDESK[1] + 0.05, 'park', 0, y=MYDESK_H, fill=fill, mark=1)]
def office(show=True, stack=0.85):
    a = walls(show=show)
    a['aktenstapel2'] = mystack(stack)
    return a

# ================= Situation: Chef nervt am Schreibtisch – seit Wochen, jeden Tag mehr =================
L0 = 'situation'
c_seit = cue(L0, 'situation', 'Seit Wochen')
c_jed = cue(L0, 'situation', 'Jeden Tag')
c_was = cue(L0, 'situation', 'Was machst')
CHEF_AT = (-3.15, 0.95)
a = office(stack=0.0)
a['dummy'] = [K(0, *MYCHAIR, 'typedesk', 180), K(r3(c_jed - 0.003), *MYCHAIR, 'typedesk', 180),
              K(c_jed, *MYCHAIR, 'typedesk', 180, cut=True), K(r3(c_was - 0.003), *MYCHAIR, 'typedesk', 180),
              K(c_was, *MYCHAIR, 'deskslump', 180, cut=True), K(r3(c_was + sec(L0, 0.9)), *MYCHAIR, 'deskslump', 180, question=0),
              K(r3(c_was + sec(L0, 1.4)), *MYCHAIR, 'deskslump', 180, question=1), K(1, *MYCHAIR, 'deskslump', 180, question=1)]
a['chef'] = [K(0, *CHEF_AT, 'chefnag', 270), K(r3(c_jed - 0.003), *CHEF_AT, 'chefnag', 270),
             K(c_jed, *CHEF_AT, 'pilefiles', 270, cut=True), K(r3(c_was - 0.003), *CHEF_AT, 'pilefiles', 270),
             K(c_was, CHEF_AT[0] + 0.15, CHEF_AT[1] - 0.1, 'chefnag', 255, cut=True), K(1, CHEF_AT[0] + 0.15, CHEF_AT[1] - 0.1, 'chefnag', 255)]
# Aktenstapel wächst: bei jedem Abwurf (Zyklus 1,1 s, Abwurf 0,55 s) ein Stück höher
CAL = (MYDESK[0] - 0.45, MYDESK[1] - 0.05)
STACK = (MYDESK[0] + 0.5, MYDESK[1] + 0.12)
stk = [K(0, *STACK, 'park', 0, y=MYDESK_H, fill=0.12, mark=0)]
n_drop = 0; tt = c_jed + sec(L0, 0.55 + 0.05)
while tt < c_was - sec(L0, 0.1):
    n_drop += 1
    stk += [K(r3(tt - sec(L0, 0.02)), *STACK, 'park', 0, fill=round(0.12 + 0.17 * (n_drop - 1), 3), mark=min(1, n_drop // 3)),
            K(r3(tt + sec(L0, 0.04)), *STACK, 'park', 0, fill=round(0.12 + 0.17 * n_drop, 3), mark=min(1, n_drop // 3))]
    tt += sec(L0, 1.1)
stk += [K(c_was, *STACK, 'park', 0, fill=0.8, mark=1, cut=True), K(1, *STACK, 'park', 0, fill=0.8, mark=1)]
a['aktenstapel'] = stk
a['tageskalender'] = [K(0, CAL[0], CAL[1], 'park', 180, y=MYDESK_H + 0.2, good=1, fill=1), K(r3(c_seit + sec(L0, 0.1)), CAL[0], CAL[1], 'park', 180, fill=1),
                      K(r3(c_jed - sec(L0, 0.15)), CAL[0], CAL[1], 'park', 180, fill=24)]
plumps = []
tt = c_jed + sec(L0, 0.55)
while tt < c_was - sec(L0, 0.1):
    plumps.append({'t': r3(tt), 'id': 'akten-plumps', 'volume': 0.6}); tt += sec(L0, 1.1)
CALP = [[CAL[0] - 0.2, MYDESK_H + 0.02, CAL[1]], [CAL[0] + 0.2, MYDESK_H + 0.4, CAL[1]]]
situation = {
 'camera': [*shot(0, r3(c_seit - 0.003), F(seated(*MYCHAIR) + body(*CHEF_AT) + [[MYDESK[0] - 0.75, 0.74, MYDESK[1] + 0.4]], 30, 10, SIT)),
            *shot(c_seit, r3(c_jed - 0.003), F(CALP + [[MYCHAIR[0], 1.45, MYCHAIR[1]]], 10, 10, SIT, push=0.1)),
            *shot(c_jed, r3(c_was - 0.003), F(seated(*MYCHAIR) + body(*CHEF_AT) + [[STACK[0], MYDESK_H + 1.2, STACK[1]]], 335, 14, SIT)),
            *shot(c_was, 1, F(seated(*MYCHAIR, 0) + [[STACK[0], MYDESK_H + 1.1, STACK[1]], [MYDESK[0] - 0.8, 0.74, MYDESK[1] + 0.4], [MYCHAIR[0], 2.3, MYCHAIR[1]]], 340, 14, SIT, push=0.08))],
 'actors': a,
 'sfx': [{'t': r3(c_seit + sec(L0, 0.1)), 'id': 'kalender-blaettern', 'volume': 0.6}] + plumps,
}

# ================= Antwort A: mit dem Bagger durch die Wand – Kündigung auf den Tisch =================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA)
sa = lambda s: s / TA
c_wand = cue(A, 'explain1', 'Die Wand')
c_kop = cue(A, 'explain1', 'Der Kopierer')
c_alle = cue(A, 'explain1', 'Alle stehen')
c_dann = cue(A, 'explain1', 'Dann hältst')
c_wirf = cue(A, 'explain1', 'wirfst')
c_kue = cue(A, 'explain1', 'Kündigung')
c_tisch = cue(A, 'explain1', 'auf den Tisch')
# Fahrweg (Bagger-Mitte z): Karte 6.2 → 3.0, Szene: 1.6 → Wand bricht bei z 0.55 → Kopierer bei −0.9 → steht bei −1.6
Z_STOP = -1.6
t_brk = r3(c_wand + sa(0.25))
t_cop = r3(c_kop + sa(0.05))
t_stop = r3(c_alle + sa(0.6))
bag = [K(0, BX, 6.2, 'drive', 0, y=0.0, size=BG, tilt=10, smoke=0.25), K(r3(sA - 0.003), BX, 3.2, 'drive', 0, tilt=10),
       K(sA, BX, 1.3, 'drive', 0, tilt=6, cut=True), K(t_brk, BX, 0.55, 'drive', 0, tilt=6), K(t_cop, BX, -0.75, 'drive', 0, tilt=4),
       K(t_stop, BX, Z_STOP, 'park', 0, tilt=4), K(1, BX, Z_STOP, 'park', 0, tilt=4)]
COP0 = (-2.05, -3.35); COP1 = (-4.6, -4.0)
cop = [K(0, *COP0, 'park', 180, y=0.0, tilt=0), K(r3(t_cop - 0.002), *COP0, 'park', 180, tilt=0),
       K(r3(t_cop), *COP0, 'burst', 180, tilt=0), K(r3(t_cop + sa(0.7)), COP1[0] + 0.5, COP1[1] + 0.2, 'burst', 200, tilt=25),
       K(r3(t_cop + sa(1.1)), *COP1, 'burst', 210, tilt=84), K(1, *COP1, 'burst', 210, tilt=84)]
wallA = [K(0, *BREACH, 'park', 0, y=0.0), K(r3(t_brk - 0.002), *BREACH, 'park', 0), K(t_brk, *BREACH, 'burst', 0), K(1, *BREACH, 'burst', 0)]
# Dummy in der Kabine: fährt (seatdrive), hält an, wirft den Brief (Abwurf 0,62 s nach Start von seatthrow)
throw0 = r3(c_wirf - sa(0.35))
rel = r3(throw0 + sa(0.62))
dummyA = [bag_seat(0, 'seatdrive'), bag_seat(r3(throw0 - 0.003), 'seatdrive'), bag_seat(throw0, 'seatthrow', text='KÜNDIGUNG'), bag_seat(1, 'seatthrow')]
# Brief fliegt im Bogen aus der Kabine auf den Tisch (comichaft groß, damit „KÜNDIGUNG“ lesbar ist)
HANDW = (BX - BSEAT['x'] + 0.1, Z_STOP - BSEAT['z'] - 0.6)  # Kabine vorn (Welt, face 0 → lokal x → Welt −x)
LAND = (DESK[0] + 0.25, DESK[1] + 0.12)
fly = r3(rel + sa(0.75))
letter = [K(0, *HANDW, 'park', 180, y=HIDE, text='KÜNDIGUNG'), K(r3(rel - 0.002), *HANDW, 'park', 0, y=HIDE),
          K(rel, *HANDW, 'toss', 0, y=3.2, size=0.9, spin=0, tilt=0),
          K(r3((rel + fly) / 2), (HANDW[0] + LAND[0]) / 2, (HANDW[1] + LAND[1]) / 2, 'toss', 0, y=3.0, spin=1.0),
          K(r3(fly - 0.002), *LAND, 'toss', 0, y=DESK_H + 0.12, spin=2.0, tilt=0),
          K(fly, *LAND, 'park', 180, y=DESK_H, spin=0, tilt=1), K(1, *LAND, 'park', 180, y=DESK_H, tilt=1)]
CHEF_SAFE = (3.9, -5.3)
KOL = {'kollege1': (-5.4, -1.3), 'kollege2': (1.85, -1.45), 'kollege3': (2.35, 0.35)}
aA = office(stack=0.85)
aA['buerowand'] = wallA
aA['bagger'] = bag
aA['kopierer'] = cop
aA['dummy'] = dummyA
aA['brief'] = letter
aA['chef'] = [K(0, *CHEF_SAFE, 'stand', 270), K(r3(t_brk + sa(0.1)), *CHEF_SAFE, 'gape', face_to(CHEF_SAFE, (BX, -2.8))),
              K(r3(fly + sa(0.2)), *CHEF_SAFE, 'gape', face_to(CHEF_SAFE, LAND))]
for nm, p in KOL.items():
    aA[nm] = [K(0, *p, 'gape', face_to(p, (BX, 2.0))), K(sA, *p, 'gape', face_to(p, (BX, -1.5)), cut=True), K(1, *p, 'gape', face_to(p, (BX, -2.5)))]
BAG_PTS = lambda z: [[BX - 1.55, 0, z + 2.1], [BX + 1.55, 0, z + 2.1], [BX - 1.55, 0, z - 2.6], [BX + 1.55, 0, z - 2.6], [BX + 0.4, 3.55, z], [BX - 1.5, 2.6, z - 2.2]]
CAB = lambda z: [[BX + 0.64 - 0.6, 2.0, z - 0.4], [BX + 0.64 + 0.6, 3.5, z + 0.2]]
sfxA = [{'t': 0.0, 'id': 'bagger-motor', 'volume': 0.55}, {'t': r3(sA), 'id': 'bagger-motor', 'volume': 0.6},
        {'t': r3(t_brk - sa(0.05)), 'id': 'wand-durchbruch', 'volume': 0.85}, {'t': r3(t_cop), 'id': 'kopierer-rutschen', 'volume': 0.75},
        {'t': r3(c_alle + sa(0.1)), 'id': 'staunen', 'volume': 0.45}, {'t': r3(rel), 'id': 'kick-whoosh', 'volume': 0.45},
        {'t': r3(fly), 'id': 'karte-klatsch', 'volume': 0.7}]
expA = {
 # Karte: Bagger rollt durchs Großraumbüro, Kollegen sicher an der Seite
 'camera': [*shot(0, r3(sA - 0.003), F(BAG_PTS(4.7) + body(*KOL['kollege1']) + body(*KOL['kollege3']), 18, 16)),
            # 1) im Chefbüro: die Wand gibt nach, Bagger schiebt sich herein
            *shot(sA, r3(c_kop - 0.003), F([[BX - 2.2, 0, PZ], [BX + 2.2, 0, PZ], [BX - 2.2, 3.6, PZ], [BX + 2.2, 3.6, PZ], [BX, 0.5, PZ - 1.8]], 205, 12, push=0.08)),
            # 2) Kopierer rutscht + kippt (Blick von rechts)
            *shot(c_kop, r3(c_alle - 0.003), F([[COP0[0] - 0.6, 0, COP0[1]], [COP1[0] - 0.6, 0, COP1[1] - 0.6], [COP0[0], 1.4, COP0[1]], [BX, 2.6, -2.0], [BX - 1.6, 0, -3.8]], 235, 18)),
            # 3) von oben: alle stehen sicher an der Seite (Chef rechts im Chefbüro, Kollegen im Großraumbüro)
            *shot(c_alle, r3(c_dann - 0.003), F(body(*CHEF_SAFE) + [p for q in KOL.values() for p in body(*q)] + BAG_PTS(Z_STOP), 8, 52, push=0.04)),
            # 4) Bagger hält, Dummy wirft – Brief fliegt auf den Tisch
            *shot(c_dann, r3(c_kue - 0.003), F(CAB(Z_STOP) + [[DESK[0] - 1.0, DESK_H, DESK[1]], [DESK[0] + 1.0, DESK_H, DESK[1]]], 145, 10)),
            # 5) Brief liegt auf dem Tisch, Chef staunt
            *shot(c_kue, 1, F([[LAND[0] - 0.55, DESK_H, LAND[1] - 0.35], [LAND[0] + 0.55, DESK_H, LAND[1] + 0.35], [LAND[0], DESK_H + 0.35, LAND[1]]], 345, 50, push=0.05))],
 'actors': aA,
 'sfx': sfxA,
}

# ================= Antwort B: Reverse-Karte – Wirbel, Plätze getauscht, jetzt nervst du ihn =================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB)
sb = lambda s: s / TB
c_karte = cue(B, 'explain2', 'Die Karte')
c_wirb = cue(B, 'explain2', 'Ein kurzer')
c_ploetz = cue(B, 'explain2', 'plötzlich')
c_abj = cue(B, 'explain2', 'Ab jetzt')
c_jedB = cue(B, 'explain2', 'Jeden Tag')
slam0 = r3(max(sB + sb(0.05), c_karte - sb(0.2)))
hit = r3(slam0 + sb(0.55))
CARD_AT = (VIS[0] + 0.05, VIS[1] - 0.5)
sw0 = c_wirb; swap = r3(c_ploetz - sb(0.05))
dummyB = [K(0, *VIS, 'cardshow', 0), K(r3(slam0 - 0.003), *VIS, 'cardshow', 0),
          K(slam0, *VIS, 'cardslam', 0), K(r3(sw0 - 0.003), *VIS, 'cardslam', 0),
          K(sw0, *VIS, 'whirl', 0, spin=0, y=0.0), K(r3(swap - 0.003), VIS[0], VIS[1] - 0.25, 'whirl', 0, spin=3.0, y=0.45),
          K(swap, *CHAIR, 'desktap', 180, spin=0, y=0.0, cut=True), K(r3(c_abj - 0.003), *CHAIR, 'desktap', 180),
          K(c_abj, *CHAIR, 'deskpush', 180), K(r3(c_jedB - 0.003), *CHAIR, 'deskpush', 180),
          K(c_jedB, *CHAIR, 'desktap', 180, cut=True), K(1, *CHAIR, 'desktap', 180)]
chefB = [K(0, *CHEF_BEHIND, 'chefnag', 180), K(r3(hit - 0.003), *CHEF_BEHIND, 'chefnag', 180),
         K(hit, *CHEF_BEHIND, 'gape', 180), K(r3(sw0 - 0.003), *CHEF_BEHIND, 'gape', 180),
         K(sw0, *CHEF_BEHIND, 'whirl', 180, spin=0, y=0.0), K(r3(swap - 0.003), CHEF_BEHIND[0], CHEF_BEHIND[1] + 0.25, 'whirl', 180, spin=-3.0, y=0.45),
         K(swap, *VIS, 'sweatstand', 0, spin=0, y=0.0, sweat=0.6, cut=True), K(r3(c_jedB - 0.003), *VIS, 'sweatstand', 0, sweat=0.8),
         K(c_jedB, VIS[0], VIS[1] + 0.15, 'sweatstand', 0, sweat=1.0, cut=True), K(1, VIS[0], VIS[1] + 0.15, 'sweatstand', 0, sweat=1.0)]
STB = (DESK[0] + 0.3, DESK_FRONT + 0.2)      # Stapel vorn auf dem Tisch (beim Chef)
stkB = [K(0, *STB, 'park', 0, y=HIDE, fill=0.0), K(r3(c_abj - 0.002), *STB, 'park', 0, y=HIDE, fill=0.0),
        K(c_abj, *STB, 'park', 0, y=DESK_H, fill=0.1, mark=0)]
tt = c_abj + sb(0.7); n = 0
while tt < c_jedB - sb(0.1):
    n += 1
    stkB += [K(r3(tt), *STB, 'park', 0, fill=round(0.1 + 0.12 * (n - 1), 3)), K(r3(tt + sb(0.15)), *STB, 'park', 0, fill=round(0.1 + 0.12 * n, 3))]
    tt += sb(1.4)
stkB += [K(r3(c_jedB), *STB, 'park', 0, fill=0.45, mark=1, cut=True), K(1, *STB, 'park', 0, fill=1.0, mark=2)]
CALB = (DESK[0] - 0.7, DESK[1] + 0.1)
aB = walls(show=False)
aB['reversekarte'] = [K(0, *CARD_AT, 'park', 15, y=HIDE, size=0.6), K(r3(hit - 0.002), *CARD_AT, 'park', 15, y=HIDE),
                      K(hit, *CARD_AT, 'park', 15, y=DESK_H + 0.002), K(1, *CARD_AT, 'park', 15, y=DESK_H + 0.002)]
aB['wirbel'] = [K(0, VIS[0], (VIS[1] + CHEF_BEHIND[1]) / 2, 'park', 0, y=0.0, fill=0, size=0.6), K(sw0, VIS[0], (VIS[1] + CHEF_BEHIND[1]) / 2, 'park', 0, fill=0),
                K(r3(sw0 + sb(0.35)), VIS[0], (VIS[1] + CHEF_BEHIND[1]) / 2, 'park', 0, fill=1), K(r3(swap + sb(0.15)), VIS[0], (VIS[1] + CHEF_BEHIND[1]) / 2, 'park', 0, fill=1),
                K(r3(swap + sb(0.6)), VIS[0], (VIS[1] + CHEF_BEHIND[1]) / 2, 'park', 0, fill=0)]
aB['dummy'] = dummyB
aB['chef'] = chefB
aB['aktenstapel'] = stkB
aB['tageskalender'] = [K(0, CALB[0], CALB[1], 'park', 180, y=HIDE, good=1, fill=1), K(r3(c_jedB - 0.002), CALB[0], CALB[1], 'park', 180, y=HIDE),
                       K(c_jedB, CALB[0], CALB[1], 'park', 180, y=DESK_H + 0.75, fill=1), K(r3(c_jedB + sb(0.25)), CALB[0], CALB[1], 'park', 180, fill=1),
                       K(r3(1 - sb(0.3)), CALB[0], CALB[1], 'park', 180, fill=31)]
DESK_PTS = [[DESK[0] - 1.0, 0, DESK[1] + 0.42], [DESK[0] + 1.0, 0, DESK[1] + 0.42], [DESK[0] - 1.0, DESK_H, DESK[1] - 0.42], [DESK[0] + 1.0, DESK_H, DESK[1] - 0.42]]
sfxB = [{'t': r3(hit - sb(0.03)), 'id': 'karte-klatsch', 'volume': 0.8}, {'t': r3(sw0), 'id': 'wirbel', 'volume': 0.75},
        {'t': r3(c_jedB + sb(0.2)), 'id': 'kalender-blaettern', 'volume': 0.55}]
tt = c_abj + sb(0.75)
while tt < c_jedB - sb(0.1):
    sfxB.append({'t': r3(tt), 'id': 'papier-schieben', 'volume': 0.5}); tt += sb(1.4)
tt = c_jedB + sb(0.4)
while tt < 1 - sb(0.4):
    sfxB.append({'t': r3(tt), 'id': 'akten-plumps', 'volume': 0.45}); tt += sb(0.7)
expB = {
 # Karte: Dummy hält dem Chef die Karte hin (Chef hinter dem Schreibtisch belehrt ihn)
 'camera': [*shot(0, r3(sB - 0.003), F(body(*VIS) + [[CHEF_BEHIND[0], 1.95, CHEF_BEHIND[1]], [VIS[0] - 0.1, 1.85, VIS[1] - 0.45]], 145, 8)),
            # 1) Nah: die Karte knallt auf den Tisch
            *shot(sB, r3(c_wirb - 0.003), F([[CARD_AT[0] - 0.35, DESK_H, CARD_AT[1] - 0.3], [CARD_AT[0] + 0.35, DESK_H, CARD_AT[1] + 0.3], [VIS[0], 1.75, VIS[1]], [CHEF_BEHIND[0], 1.75, CHEF_BEHIND[1]]], 40, 30, push=0.08)),
            # 2) Wirbel – beide drehen sich, Plätze getauscht
            *shot(c_wirb, r3(c_ploetz - 0.003), F(body(*VIS, 2.5) + body(*CHEF_BEHIND, 2.5) + DESK_PTS, 20, 10)),
            *shot(c_ploetz, r3(c_abj - 0.003), F(seated(*CHAIR) + body(*VIS) + DESK_PTS, 70, 10, push=0.08)),
            # 3) du schiebst ihm Stapel hin, er schwitzt
            *shot(c_abj, r3(c_jedB - 0.003), F(seated(*CHAIR) + body(*VIS) + [[STB[0], DESK_H + 0.6, STB[1]]], 60, 12)),
            # 4) jeden Tag mehr: Kalender blättert, Stapel wächst
            *shot(c_jedB, 1, F(seated(*CHAIR) + body(VIS[0], VIS[1] + 0.15) + [[STB[0], DESK_H + 1.35, STB[1]], [CALB[0], DESK_H + 1.0, CALB[1]]], 295, 10, push=0.05))],
 'actors': aB,
 'stage': [{'t': 0, 'stage': 'grossraumbuero-offen'}],
 'sfx': sfxB,
}

# ================= Antwort C: Känguru reinlassen – Glocke, Show-Kampf, du holst Kaffee =================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC)
sc = lambda s: s / TC
c_tuer = cue(C, 'explain3', 'Die Tür')
c_hupf = cue(C, 'explain3', 'Das Känguru')
c_glock = cue(C, 'explain3', 'Die Glocke')
c_runde = cue(C, 'explain3', 'Runde eins')
c_epi = cue(C, 'explain3', 'Ein epischer')
c_und = cue(C, 'explain3', 'Und du')
HANDLE_X = 2.14
D_ST = (HANDLE_X - 0.3, PZ + 0.45)            # vor der Tür (Großraumbüro), Griff 0,3 m rechts
D_ASIDE = (D_ST[0] - 0.55, D_ST[1] + 0.25)
K0 = (3.05, -1.2)
DOOR_MID = (2.47, PZ)
K_IN = (2.8, -4.0)
open0 = r3(max(sC + sc(0.05), c_tuer - sc(0.15)))
dummyC = [K(0, *D_ST, 'stand', 0), K(r3(open0 - 0.003), *D_ST, 'stand', 0),
          K(open0, *D_ST, 'dooropen', 0), K(r3(open0 + sc(1.1)), *D_ST, 'dooropen', 0), K(r3(open0 + sc(1.5)), *D_ASIDE, 'dooropen', 20),
          K(r3(c_und - 0.003), *D_ASIDE, 'dooropen', 20),
          K(c_und, *COFFEE_ST, 'getcoffee', 90, cut=True), K(r3(c_und + sc(2.6)), *COFFEE_ST, 'getcoffee', 90), K(r3(c_und + sc(2.62)), *COFFEE_ST, 'coffeesip', 120), K(1, *COFFEE_ST, 'coffeesip', 120)]
door = [K(0, *DOOR_HINGE, 'park', 0, y=0.0, door=0), K(r3(open0 + sc(0.4)), *DOOR_HINGE, 'park', 0, door=0), K(r3(open0 + sc(1.0)), *DOOR_HINGE, 'park', 0, door=1), K(1, *DOOR_HINGE, 'park', 0, door=1)]
hop0 = r3(c_hupf - sc(0.05))
kang = [K(0, *K0, 'guard', 330), K(r3(hop0 - 0.003), *K0, 'guard', 330),
        K(hop0, *K0, 'hop', face_to(K0, DOOR_MID)), K(r3(hop0 + sc(0.7)), DOOR_MID[0], PZ + 0.35, 'hop', 0), K(r3(hop0 + sc(1.3)), DOOR_MID[0], PZ - 0.6, 'hop', 0),
        K(r3(c_glock - 0.003), *K_IN, 'hop', face_to((DOOR_MID[0], PZ - 0.6), K_IN)),
        K(c_glock, *FIGHT_K, 'guard', 270, cut=True), K(r3(c_epi - 0.003), *FIGHT_K, 'guard', 270)]
chefC = [K(0, *CHEF_BEHIND, 'stand', 180), K(r3(hop0 + sc(0.6)), *CHEF_BEHIND, 'gape', face_to(CHEF_BEHIND, (DOOR_MID[0], PZ - 0.6))),
         K(c_glock, *FIGHT_C, 'boxguard', 90, gloves=1, cut=True), K(r3(c_epi - 0.003), *FIGHT_C, 'boxguard', 90, gloves=1)]
# Show-Kampf: abwechselnd Schlag + Ausweichen, niemand wird getroffen (Abstand 1,25 m, Schläge landen in der Luft/an der Deckung)
seq = [('punch', 'boxdodge'), ('guard', 'jab'), ('punch', 'boxdodge'), ('hop', 'jab'), ('punch', 'boxdodge'), ('guard', 'jab')]
tt = c_epi; i = 0
fight_end = c_und
while tt < fight_end - sc(0.05):
    km, cm = seq[i % len(seq)]
    t2 = min(fight_end - 0.003, tt + sc(0.85))
    dx = 0.0 if km != 'hop' else 0.35
    kang += [K(r3(tt), FIGHT_K[0] + dx, FIGHT_K[1], km, 270, cut=True), K(r3(t2), FIGHT_K[0] + dx, FIGHT_K[1], km, 270)]
    chefC += [K(r3(tt), *FIGHT_C, cm, 90, gloves=1, cut=True), K(r3(t2), *FIGHT_C, cm, 90, gloves=1)]
    tt = t2 + 0.003; i += 1
# hinter dem Glasfenster kämpfen sie weiter, während du Kaffee holst
FIGHT_C2 = (FIGHT_C[0] + 0.3, -3.2); FIGHT_K2 = (FIGHT_K[0] + 0.15, -3.2)
tt = c_und; i = 0
while tt < 1 - 0.003:
    km, cm = seq[i % len(seq)]
    t2 = min(1.0, tt + sc(0.85))
    kang += [K(r3(tt), *FIGHT_K2, km, 270, cut=True), K(r3(t2), *FIGHT_K2, km, 270)]
    chefC += [K(r3(tt), *FIGHT_C2, cm, 90, gloves=1, cut=True), K(r3(t2), *FIGHT_C2, cm, 90, gloves=1)]
    tt = t2 + 0.003; i += 1
aC = office(stack=0.85)
aC['zimmertuer'] = door
aC['dummy'] = dummyC
aC['kaenguru'] = kang
aC['chef'] = chefC
GLV = (DESK[0] + 0.55, DESK[1] + 0.05)
aC['boxhandschuhe'] = [K(0, *GLV, 'park', 20, y=DESK_H), K(r3(c_glock - 0.003), *GLV, 'park', 20, y=DESK_H), K(c_glock, *GLV, 'park', 20, y=HIDE)]
BELL = ((FIGHT_C[0] + FIGHT_K[0]) / 2, FIGHT_C[1])
aC['boxglocke'] = [K(0, *BELL, 'park', 0, y=2.75, size=0.5), K(r3(c_glock + sc(0.05)), *BELL, 'show', 0, y=2.75), K(r3(c_epi - 0.003), *BELL, 'show', 0, y=2.75), K(c_epi, *BELL, 'park', 0, y=2.75)]
sfxC = [{'t': r3(open0 + sc(0.4)), 'id': 'tuer-knarren', 'volume': 0.55}, {'t': r3(c_glock + sc(0.05)), 'id': 'boxglocke', 'volume': 0.8},
        {'t': r3(c_und + sc(0.5)), 'id': 'kaffeemaschine', 'volume': 0.6}]
for k in range(4):
    sfxC.append({'t': r3(hop0 + sc(0.1 + 0.6 * k)), 'id': 'plopp', 'volume': 0.2})
tt = c_epi + sc(0.35); k = 0
while tt < 1 - sc(0.2):
    sfxC.append({'t': r3(tt), 'id': 'kick-whoosh' if k % 2 else 'boxschlag', 'volume': 0.4 if tt < c_und else 0.18}); tt += sc(0.85); k += 1
FIGHT_PTS = body(*FIGHT_C) + body(*FIGHT_K, 1.8)
expC = {
 # Karte: Dummy + Känguru vor der Chef-Tür (Schild CHEF)
 'camera': [*shot(0, r3(sC - 0.003), F(body(*D_ST) + body(*K0, 1.8) + [[2.0, 2.2, PZ], [2.9, 0, PZ]], 340, 8)),
            # 1) Tür geht auf
            *shot(sC, r3(c_hupf - 0.003), F(body(*D_ST) + [[2.0, 0, PZ], [2.9, 2.2, PZ], [2.9, 0, PZ - 0.9]] + body(*K0, 1.8), 350, 8)),
            # 2) Känguru hüpft ins Chefbüro (Blick aus dem Chefbüro zur Tür), Chef staunt, Handschuhe liegen auf dem Tisch
            *shot(c_hupf, r3(c_glock - 0.003), F([[2.0, 0, PZ], [2.9, 2.2, PZ]] + body(*K_IN, 1.8), 165, 8)),
            # 3) Glocke: Runde eins – beide in Boxhaltung
            *shot(c_glock, r3(c_epi - 0.003), F(FIGHT_PTS + [[BELL[0], 3.15, BELL[1]]], 0, 6, push=0.05, fov=50)),
            # 4) epischer Kampf: schnelle Schnitte
            *shot(c_epi, r3(c_epi + (c_und - c_epi) * 0.5 - 0.003), F(FIGHT_PTS, 355, 4, push=0.12, fov=50)),
            *shot(r3(c_epi + (c_und - c_epi) * 0.5), r3(c_und - 0.003), F(FIGHT_PTS, 330, 18, push=0.12)),
            # 5) du holst dir in Ruhe einen Kaffee – hinter dem Glasfenster boxen sie weiter
            *shot(c_und, 1, F(body(*COFFEE_ST) + body(*FIGHT_C2) + body(*FIGHT_K2, 1.8), 330, 4, push=0.05, fov=45))],
 'actors': aC,
 'stage': [{'t': 0, 'stage': 'grossraumbuero'}, {'t': c_glock, 'stage': 'grossraumbuero-offen'}, {'t': c_und, 'stage': 'grossraumbuero'}],
 'sfx': sfxC,
}
# Im Schnittbild (Runde eins + Kampf) Wand/Tür ausblenden, danach wieder da
for nm in ['buerowand']:
    aC[nm] = [K(0, *BREACH, 'park', 0, y=0.0), K(r3(c_glock - 0.003), *BREACH, 'park', 0, y=0.0), K(c_glock, *BREACH, 'park', 0, y=HIDE),
              K(r3(c_und - 0.003), *BREACH, 'park', 0, y=HIDE), K(c_und, *BREACH, 'park', 0, y=0.0)]
aC['zimmertuer'] = [K(0, *DOOR_HINGE, 'park', 0, y=0.0, door=0), K(r3(open0 + sc(0.4)), *DOOR_HINGE, 'park', 0, door=0), K(r3(open0 + sc(1.0)), *DOOR_HINGE, 'park', 0, door=1),
                    K(r3(c_glock - 0.003), *DOOR_HINGE, 'park', 0, y=0.0, door=1), K(c_glock, *DOOR_HINGE, 'park', 0, y=HIDE),
                    K(r3(c_und - 0.003), *DOOR_HINGE, 'park', 0, y=HIDE), K(c_und, *DOOR_HINGE, 'park', 0, y=0.0, door=1)]

# ================= Abstimmung (weggelassen: noVote) – Shot bleibt für die Prüfung =================
aV = office()
aV['dummy'] = [K(0, 0.0, 0.5, 'stand', 180)]
vote = {'camera': [cam(0, [0.0, 1.2, 6.0], [0.0, 1.4, 0.5]), cam(1, [0.0, 1.2, 5.7], [0.0, 1.4, 0.5])], 'actors': aV}

# ================= Outro: Dummy mit Kaffee, Chef (Handschuhe) + Känguru winken =================
OUT_D = (0.0, 0.6)
aO = office()
aO['dummy'] = [K(0, *OUT_D, 'coffeesip', 180), K(1, *OUT_D, 'coffeesip', 180)]
aO['chef'] = [K(0, -1.35, 0.35, 'stand', 165, gloves=1), K(0.3, -1.35, 0.35, 'wave', 165, gloves=1), K(1, -1.35, 0.35, 'wave', 165, gloves=1)]
aO['kaenguru'] = [K(0, 1.45, 0.35, 'guard', 195), K(0.4, 1.45, 0.35, 'victory', 195), K(1, 1.45, 0.35, 'victory', 195)]
outro = {'camera': shot(0, 1, F(body(*OUT_D, 2.1) + body(-1.35, 0.35) + body(1.45, 0.35, 1.9), 0, 4, (70, 1000, 900, 1225), push=0.05)),
         'actors': aO}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Dein Chef geht dir mal wieder auf die Nerven – was machst du? 💼 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Bitte nichts davon nachmachen. 😄\n\n"
        "#waswürdestdutun #chef #arbeit #büro #unoreverse #spezial #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'grossraumbuero', 'padAfter': TAIL, 'noVote': NO_VOTE,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy fährt mit einem (verkleinerten) Bagger durchs Großraumbüro, die Bürowand bricht comichaft auf, der Kopierer wird zur Seite geschoben und kippt um. Chef und Kollegen stehen deutlich sichtbar sicher an der Seite und staunen. Der Bagger hält, der Dummy wirft den Brief „KÜNDIGUNG“ aus der Kabine auf den Tisch des Chefs.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy knallt eine rote Reverse-Karte (zwei gebogene Pfeile im Kreis, ohne Schrift, ohne Oval, ohne Logo) auf den Tisch. Ein bunter Wirbel – Dummy und Chef tauschen die Plätze. Jetzt sitzt der Dummy im Chefsessel, trommelt ungeduldig und schiebt dem schwitzenden Chef Stapel von Aufgaben hin, jeden Tag mehr.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy öffnet die Tür zum Chefbüro, das Känguru mit Boxhandschuhen hüpft hinein, die Boxglocke klingelt, Chef (blaue Handschuhe) und Känguru liefern sich einen Show-Boxkampf ohne Treffer. Der Dummy holt sich in Ruhe einen Kaffee, hinter dem Glasfenster wird weitergeboxt.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
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
print('A', dict(brk=round(t_brk * TA, 2), cop=round(t_cop * TA, 2), rel=round(rel * TA, 2), fly=round(fly * TA, 2)))
print('B', dict(hit=round(hit * TB, 2), swap=round(swap * TB, 2)))
print('C', dict(open=round(open0 * TC, 2), hop=round(hop0 * TC, 2), glocke=round(c_glock * TC, 2), kaffee=round(c_und * TC, 2)))
if total < 61: print('ACHTUNG: unter 61 s – Szenen verlängern / Schlussbild stehen lassen')
if total > 66: print('ACHTUNG: über 66 s – Pausen kürzen')
