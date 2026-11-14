# Hilfsskript: erzeugt scenarios/spezial-nachbars-rasen.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-nachbars-rasen-choreo.py
# Format: SPEZIAL (keine richtige Antwort, keine Auflösung, keine Quellenzeile).
# Darstellung (Vorgabe Inhaber): alles comichaft + harmlos, kein Schaden für den Nachbarn, der Nachbar wirkt am Ende jeder
# Szene eher verdutzt als verärgert (Fragezeichen + hochgezogene Braue, kratzt sich am Kopf).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-nachbars-rasen'
S = dict(
situation="Der Rasen deines Nachbarn ist mal wieder grüner als deiner. Jeden Morgen schaust du über den Zaun, und jeden Morgen wird es schlimmer. Was machst du?",
o1c="Rasen grün ansprühen", o1s="A: Du sprühst deinen Rasen nachts heimlich mit grüner Farbe an.",
o2c="Seinen Rasenmäher klauen", o2s="B: Du klaust seinen Rasenmäher.",
o3c="Sein Haus kaufen, Kündigung schicken", o3s="C: Du kaufst sein Haus und schickst ihm eine Kündigung.",
e1="Gesagt, getan. Am nächsten Morgen ist dein Rasen tatsächlich grün. Dein Gartenzwerg leider auch. Und dein Hund. Und deine Schuhe.",
e2="Ohne Rasenmäher hat er keine Chance, denkst du. Am nächsten Tag kniet er mit einer Nagelschere im Garten. Und sein Rasen ist immer noch grüner.",
e3="Du kaufst sein Haus und schickst ihm die Kündigung. Er packt seine Gießkanne und geht. Und plötzlich weißt du nicht mehr, welcher Rasen eigentlich deiner ist.",
vote="Also, was machst du? Schreib A, B oder C in die Kommentare.",
outro="Eine richtige Antwort gibt es diesmal nicht. Aber dein Nachbar liest vielleicht mit. Schreib A, B oder C in die Kommentare und schick das Video dem Nachbarn mit dem grünsten Rasen.",
)
# Szenen rein visuell verlängern (Sekunden), falls das Video sonst unter 61 s bliebe – kein zusätzlicher Text
EXTRA = {1: 0.8, 2: 0.0, 3: 0.0}

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'countdown': 0.1, 'outro': 0.3}
MINLEN = {'situation': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7, 'countdown': 5, 'outro': 3}
TEXT = {'situation': S['situation'], 'option1': S['o1s'], 'option2': S['o2s'], 'option3': S['o3s'],
        'explain1': S['e1'], 'explain2': S['e2'], 'explain3': S['e3'], 'countdown': S['vote'], 'outro': S['outro']}
vd = f'{ROOT}/public/voice/{ID}'
dur = json.load(open(f'{vd}/durations.json')) if os.path.exists(f'{vd}/durations.json') else {}
ali = json.load(open(f'{vd}/alignment.json')) if os.path.exists(f'{vd}/alignment.json') else {}

def cliplen(c):
    """Länge des Abschnitts-Teils eines Clips in Sekunden (wie src/data/timeline.ts, auf ganze Bilder gerundet)"""
    a = dur.get(c, 0.84 + 0.0594 * len(TEXT[c]))
    return round(max(LEAD[c] + a + 0.5, MINLEN.get(c, 0)) * 30) / 30
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
        return max(cliplen('outro'), 4.0)
    return cliplen(sec)
def st_of(c, phrase):
    txt = TEXT[c]; i = txt.index(phrase)
    if c in ali:
        return ali[c]['character_start_times_seconds'][i]
    return (0.84 + 0.0594 * len(txt)) * i / len(txt)
def cue(sec, clip, phrase):
    """t (0..1) im Abschnitt sec, an dem phrase im Clip clip beginnt"""
    off = 0.0
    if sec.startswith('answer') and clip.startswith('explain'):
        off = answer_parts(int(sec[-1]))[0]
    return round((off + LEAD[clip] + st_of(clip, phrase)) / seclen(sec), 4)
def sec(secname, s):
    return s / seclen(secname)
r3 = lambda x: round(x, 4)
def K(t, x, z, motion, face=None, **kw):
    d = {'t': r3(t), 'x': round(x, 3), 'z': round(z, 3), 'motion': motion}
    if face is not None: d['face'] = face
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def cam(t, pos, look, fov=None):
    d = {'t': round(te(t), 4), 'pos': [round(v, 3) for v in pos], 'look': [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
def cut(t, *keys):
    """harter Schnitt bei t: vorige Einstellung endet bei t−0.003"""
    return r3(t - 0.003), r3(t)
HIDE = -30
BOX_A = (100, 980, 470, 1225)      # Antwort-Abschnitte: unter der Kopfzeile, über dem Untertitel
BOX_S = (100, 980, 300, 1225)      # Situation (nur Abzeichen oben)
def body(x, z, h=1.85, w=0.3):
    return [[x - w, 0, z], [x + w, 0, z], [x, h, z - w], [x, h, z + w]]
_fits = {}
def F(points, az, el, box=BOX_A, fov=38, push=0.05):
    """Kamera so, dass alle Punkte in box liegen; liefert (Start, Ende) mit leichter Fahrt nach vorn"""
    key = json.dumps([points, az, el, box, fov])
    if key not in _fits:
        r = fit(points, az, el, fov, box)
        assert r, f'keine Kamera gefunden: {points}'
        _fits[key] = r
    c, l, _ = _fits[key]
    c2 = [c[i] + (l[i] - c[i]) * push for i in range(3)]
    return c, l, c2
def camF(t0, t1, f, fov=None):
    c, l, c2 = f
    return [cam(t0, c, l, fov), cam(t1, c2, l, fov)]
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)

# ---- feste Plätze (Bühne "nachbargarten", siehe src/stage/NeighborGarden.tsx) ----
LAWN_L = (-5.2, 0.6)
LAWN_R = (5.2, 0.6)
GATE = (0.0, 3.0)          # Scharnier des Gartentors (Tor reicht bis z 4.0)
FENCE_D = (-0.42, -0.6)    # Dummy am Zaun (Blick nach rechts zum Nachbarn)
GNOME = (-1.7, 2.3)
DOG = (-2.75, 2.75)
MOWER0 = (1.9, 1.6)        # glänzender Rasenmäher des Nachbarn
NB_WATER = (2.7, -1.2)     # Nachbar gießt
DOOR_SPOT = (3.4, -6.42)   # Dummy vor der Tür des Nachbarn (Blick zur Tür)
NB_DOOR = (3.4, -7.42)     # Nachbar auf der Stufe
MAILBOX = (2.2, -6.9)
SOLD = (6.6, -5.0)

def lawns(t=0, l_lush=0.0, l_paint=0.0, r_lush=1.0, r_paint=0.0):
    return {'rasen': [K(t, LAWN_L[0], LAWN_L[1], 'park', 0, lush=l_lush, paint=l_paint)],
            'rasen2': [K(t, LAWN_R[0], LAWN_R[1], 'park', 0, lush=r_lush, paint=r_paint)]}
def gate(door=0.0):
    return [K(0, GATE[0], GATE[1], 'park', 0, door=door)]
def deco(paint=0.0, mower=True, dog=True):
    a = {'gartenzwerg': [K(0, GNOME[0], GNOME[1], 'park', 160, paint=paint)],
         'briefkasten': [K(0, MAILBOX[0], MAILBOX[1], 'park', 180)],
         'gartentor': gate()}
    if dog: a['hund'] = [K(0, DOG[0], DOG[1], 'sit', 150, paint=paint)]
    if mower: a['rasenmaeher'] = [K(0, MOWER0[0], MOWER0[1], 'park', 200)]
    return a

# ================= Situation =================
L0 = 'situation'
c_jeden = cue(L0, 'situation', 'Jeden Morgen')
c_schlimm = cue(L0, 'situation', 'und jeden Morgen wird')
c_was = cue(L0, 'situation', 'Was machst')
situation = {
 'camera': [*camF(0, r3(c_jeden - 0.003), F(body(*FENCE_D) + body(*NB_WATER, 2.0) + [[MOWER0[0], 0, MOWER0[1]], [GNOME[0], 0, GNOME[1]]], 4, 24, BOX_S)),
            *camF(c_jeden, r3(c_was - 0.003), F([[FENCE_D[0], 1.55, FENCE_D[1]], [FENCE_D[0] + 0.3, 0.8, FENCE_D[1]]] + body(*NB_WATER, 2.0), 252, 10)),
            *camF(c_was, 1, F(body(*FENCE_D, 1.75) + [[0, 0.7, FENCE_D[1] - 0.8], [0, 0.7, FENCE_D[1] + 0.8]], 78, 8))],
 'actors': {**lawns(), **deco(),
            'dummy': [K(0, FENCE_D[0], FENCE_D[1], 'envy', 90, brow=0.0), K(c_schlimm, FENCE_D[0], FENCE_D[1], 'envy', 90, brow=0.0),
                      K(r3(c_schlimm + sec(L0, 0.6)), FENCE_D[0], FENCE_D[1], 'envy', 90, brow=1.0)],
            'gartennachbar': [K(0, NB_WATER[0], NB_WATER[1], 'waterplants', 215)],
            'giesskanne2': [K(0, NB_WATER[0], NB_WATER[1], 'park', 215, hand=1, holder='gartennachbar', drop=0.0, tilt=38, water=1)]},
}

# ================= Antwort A: nachts grün ansprühen =================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
tA_scene = r3(cardA / TA)
c_gesagt = cue(A, 'explain1', 'Gesagt')
c_morgen = cue(A, 'explain1', 'Am nächsten Morgen')
c_zwerg = cue(A, 'explain1', 'Dein Gartenzwerg')
c_hund = cue(A, 'explain1', 'Und dein Hund')
c_schuh = cue(A, 'explain1', 'Und deine Schuhe')
endA_speech = r3((cardA + LEAD['explain1'] + dur.get('explain1', 0.84 + 0.0594 * len(S['e1']))) / TA)
TIP0 = (-6.4, 4.6)
SPRAY = (-3.4, 1.0)
spray0 = r3(max(tA_scene - sec(A, 0.6), sec(A, 2.6)))
DAY_D = (-3.0, 0.7)
dummyA = [K(0, TIP0[0], TIP0[1], 'tiptoe', face_to(TIP0, SPRAY), paint=0), K(spray0, SPRAY[0], SPRAY[1], 'tiptoe', face_to(TIP0, SPRAY)),
          K(r3(spray0 + 0.002), SPRAY[0], SPRAY[1], 'spraylawn', 230),
          K(r3(c_morgen - 0.003), SPRAY[0], SPRAY[1], 'spraylawn', 250, paint=0),
          K(c_morgen, DAY_D[0], DAY_D[1], 'armscross', 165, paint=1),
          K(r3(c_schuh - 0.003), DAY_D[0], DAY_D[1], 'armscross', 165),
          K(c_schuh, DAY_D[0], DAY_D[1], 'notice', 165), K(1, DAY_D[0], DAY_D[1], 'notice', 165)]
lawnA = [K(0, LAWN_L[0], LAWN_L[1], 'park', 0, lush=0, paint=0), K(spray0 + sec(A, 0.5), LAWN_L[0], LAWN_L[1], 'park', 0, paint=0),
         K(r3(c_morgen - 0.003), LAWN_L[0], LAWN_L[1], 'park', 0, paint=0.45), K(c_morgen, LAWN_L[0], LAWN_L[1], 'park', 0, paint=1), K(1, LAWN_L[0], LAWN_L[1], 'park', 0, paint=1)]
NB_PEEK = (0.45, 1.0)
peekA = r3(c_schuh + sec(A, 0.9))
nbA = [K(0, NB_PEEK[0], NB_PEEK[1], 'stand', 270, y=HIDE), K(r3(peekA - 0.003), NB_PEEK[0], NB_PEEK[1], 'stand', 270, y=HIDE),
       K(peekA, NB_PEEK[0], NB_PEEK[1], 'stand', 270, y=0, brow=1, question=0), K(r3(peekA + sec(A, 0.4)), NB_PEEK[0], NB_PEEK[1], 'sheepish', 270, question=1),
       K(1, NB_PEEK[0], NB_PEEK[1], 'sheepish', 270, question=1)]
expA = {
 'stage': [{'t': 0, 'stage': 'nachbargarten-nacht'}, {'t': c_morgen, 'stage': 'nachbargarten'}],
 'camera': [*camF(0, r3(spray0 - 0.003), F(body(*TIP0) + body(*SPRAY), 25, 16)),
            *camF(spray0, r3(c_morgen - 0.003), F(body(*SPRAY) + [[SPRAY[0] - 0.5, 0, SPRAY[1] + 0.9], [SPRAY[0] + 0.5, 0, SPRAY[1] + 0.9]], 40, 22)),
            *camF(c_morgen, r3(c_zwerg - 0.003), F(body(*DAY_D) + [[GNOME[0], 0, GNOME[1]], [DOG[0], 0, DOG[1]], [-0.2, 0.7, -1.0]], 12, 28)),
            *camF(c_zwerg, r3(c_hund - 0.003), F([[GNOME[0] - 0.2, 0, GNOME[1]], [GNOME[0] + 0.2, 0, GNOME[1]], [GNOME[0], 0.48, GNOME[1]]], 345, 10, (300, 780, 600, 1120))),
            *camF(c_hund, r3(c_schuh - 0.003), F([[DOG[0] - 0.3, 0, DOG[1]], [DOG[0] + 0.3, 0, DOG[1]], [DOG[0], 0.82, DOG[1]]], 335, 10, (260, 820, 560, 1130))),
            *camF(c_schuh, r3(peekA - 0.003), F([[DAY_D[0] - 0.3, 0, DAY_D[1]], [DAY_D[0] + 0.3, 0, DAY_D[1]], [DAY_D[0], 0.6, DAY_D[1]]], 345, 14, (240, 840, 560, 1150))),
            *camF(peekA, 1, F(body(*DAY_D) + body(*NB_PEEK, 2.0), 350, 14))],
 'actors': {'rasen': lawnA, 'rasen2': [K(0, LAWN_R[0], LAWN_R[1], 'park', 0, lush=1)],
            'dummy': dummyA,
            'gartenzwerg': [K(0, GNOME[0], GNOME[1], 'park', 160, paint=0), K(r3(c_morgen - 0.003), GNOME[0], GNOME[1], 'park', 160, paint=0), K(c_morgen, GNOME[0], GNOME[1], 'park', 160, paint=1)],
            'hund': [K(0, DOG[0], DOG[1], 'sit', 150, paint=0), K(r3(c_morgen - 0.003), DOG[0], DOG[1], 'sit', 150, paint=0), K(c_morgen, DOG[0], DOG[1], 'sit', 150, paint=1)],
            'gartennachbar': nbA,
            'rasenmaeher': [K(0, MOWER0[0], MOWER0[1], 'park', 200)], 'briefkasten': [K(0, MAILBOX[0], MAILBOX[1], 'park', 180)], 'gartentor': gate()},
 'sfx': [{'t': r3(sec(A, 0.3)), 'id': 'schleichen', 'volume': 0.45}, {'t': r3(spray0 + sec(A, 0.3)), 'id': 'spruehen', 'volume': 0.5},
         {'t': r3(spray0 + sec(A, 1.6)), 'id': 'spruehen', 'volume': 0.45}, {'t': c_morgen, 'id': 'rasen-zauber', 'volume': 0.35},
         {'t': r3(c_hund + sec(A, 0.3)), 'id': 'hund-bellen', 'volume': 0.3}],
}

# ================= Antwort B: Rasenmäher klauen =================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
tB_scene = r3(cardB / TB)
c_ohne = cue(B, 'explain2', 'Ohne Rasenmäher')
c_denkst = cue(B, 'explain2', 'denkst du')
c_tag = cue(B, 'explain2', 'Am nächsten Tag')
c_immer = cue(B, 'explain2', 'Und sein Rasen')
endB_speech = r3((cardB + LEAD['explain2'] + dur.get('explain2', 0.84 + 0.0594 * len(S['e2']))) / TB)
CL0 = (-0.55, 0.6)
CL1 = (0.62, 0.6)
climb0 = r3(sec(B, 0.2))
climb_end = r3(climb0 + sec(B, 2.2))
# Mäher-Diebstahl: Dummy stellt sich hinter den Mäher (Mäher zeigt mit face 200 Richtung Tor), schiebt ihn durchs Tor nach links
MF = 200
_md = (math.sin(math.radians(MF)), -math.cos(math.radians(MF)))
M_A = (round(MOWER0[0] - 0.88 * _md[0], 3), round(MOWER0[1] - 0.88 * _md[1], 3))
pts = [M_A, (1.4, 3.1), (0.9, 3.5), (-0.9, 3.5), (-2.4, 2.7)]
grab = r3(max(climb_end + sec(B, 0.9), tB_scene - sec(B, 0.2)))
seg_end = r3(min(grab + sec(B, 4.2), c_tag - 0.01))
_L = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
seg = [grab]
for l in _L:
    seg.append(r3(seg[-1] + (seg_end - grab) * l / sum(_L)))
dummyB = [K(0, CL0[0], CL0[1], 'stand', 90, paint=0), K(climb0, CL0[0], CL0[1], 'climbover', 90),
          K(r3(climb0 + sec(B, 0.9)), -0.15, CL0[1], 'climbover', 90), K(r3(climb0 + sec(B, 1.35)), 0.38, CL0[1], 'climbover', 90),
          K(climb_end, CL1[0], CL1[1], 'climbover', 90), K(r3(climb_end + 0.002), CL1[0], CL1[1], 'tiptoe', face_to(CL1, M_A)),
          K(r3(grab - 0.006), M_A[0], M_A[1], 'tiptoe', face_to(CL1, M_A)), K(r3(grab - 0.003), M_A[0], M_A[1], 'mowsneak', MF)]
for i in range(len(pts)):
    f = MF if i == 0 else face_to(pts[i - 1], pts[i]) if i == len(pts) - 1 else face_to(pts[i], pts[i + 1])
    dummyB.append(K(seg[i], pts[i][0], pts[i][1], 'mowsneak', f))
# Tag: Dummy hat den Mäher bei sich und schaut wieder über den Zaun
ENVY_B = (-0.42, -0.9)
dummyB += [K(r3(c_tag), ENVY_B[0], ENVY_B[1], 'envy', 90), K(1, ENVY_B[0], ENVY_B[1], 'envy', 90, brow=0.5)]
# Mäher: erst geparkt, beim Greifen am Dummy angehängt, am Tag neben dem Dummy
mowerB = [K(0, MOWER0[0], MOWER0[1], 'park', MF), K(r3(grab - 0.003), MOWER0[0], MOWER0[1], 'park', MF),
          {**K(grab, 0, 0.88, 'push', 0), 'attach': 'dummy', 'y': 0}, {**K(r3(c_tag - 0.003), 0, 0.88, 'push', 0), 'attach': 'dummy', 'y': 0},
          K(c_tag, -1.25, 0.15, 'park', 120), K(1, -1.25, 0.15, 'park', 120)]
gateB = [K(0, GATE[0], GATE[1], 'park', 0, door=0), K(r3(grab + sec(B, 0.5)), GATE[0], GATE[1], 'park', 0, door=0), K(r3(grab + sec(B, 1.1)), GATE[0], GATE[1], 'park', 0, door=1),
         K(r3(c_tag - 0.003), GATE[0], GATE[1], 'park', 0, door=1), K(c_tag, GATE[0], GATE[1], 'park', 0, door=0)]
SNIP = (3.0, 0.2)
nbB = [K(0, SNIP[0], SNIP[1], 'stand', 0, y=HIDE), K(r3(c_tag - 0.003), SNIP[0], SNIP[1], 'stand', 0, y=HIDE),
       K(c_tag, SNIP[0], SNIP[1], 'snip', 235, y=0, brow=0, question=0),
       K(r3(c_immer + sec(B, 1.0)), SNIP[0], SNIP[1], 'snip', 235, brow=1, question=0), K(r3(c_immer + sec(B, 1.5)), SNIP[0], SNIP[1], 'snip', 235, question=1),
       K(1, SNIP[0], SNIP[1], 'snip', 235, question=1)]
scB = [K(0, SNIP[0], SNIP[1], 'park', 0, y=HIDE), K(r3(c_tag - 0.003), SNIP[0], SNIP[1], 'park', 0, y=HIDE),
       K(c_tag, SNIP[0], SNIP[1], 'park', 235, hand=1, holder='gartennachbar', drop=0.0, y=0, size=0.7)]
expB = {
 'stage': [{'t': 0, 'stage': 'nachbargarten-nacht'}, {'t': c_tag, 'stage': 'nachbargarten'}],
 'camera': [*camF(0, r3(grab - 0.003), F(body(*CL0) + body(*CL1), 335, 8)),
            *camF(grab, r3(c_tag - 0.003), F([[x, 0, z] for x, z in pts] + [[x, 1.5, z] for x, z in pts[1:4]], 20, 22)),
            *camF(c_tag, r3(c_immer - 0.003), F([[SNIP[0] - 0.45, 0, SNIP[1]], [SNIP[0] + 0.45, 0, SNIP[1]], [SNIP[0], 1.45, SNIP[1]]], 352, 5, (200, 880, 520, 1180))),
            *camF(c_immer, 1, F(body(*ENVY_B) + [[-1.25, 0, 0.15]] + [[SNIP[0], 0, SNIP[1]], [SNIP[0], 1.5, SNIP[1]]], 2, 20))],
 'actors': {**lawns(), 'dummy': dummyB, 'rasenmaeher': mowerB, 'gartentor': gateB, 'gartennachbar': nbB, 'nagelschere': scB,
            'gartenzwerg': [K(0, GNOME[0], GNOME[1], 'park', 160)], 'hund': [K(0, DOG[0], DOG[1], 'sit', 150)],
            'briefkasten': [K(0, MAILBOX[0], MAILBOX[1], 'park', 180)]},
 'sfx': [{'t': r3(grab + sec(B, 0.1)), 'id': 'schleichen', 'volume': 0.45}, {'t': r3(c_tag + sec(B, 0.4)), 'id': 'schere-schnipp', 'volume': 0.55},
         {'t': r3(c_immer + sec(B, 0.3)), 'id': 'schere-schnipp', 'volume': 0.4}],
}

# ================= Antwort C: Haus kaufen, Kündigung =================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
tC_scene = r3(cardC / TC)
c_du = cue(C, 'explain3', 'Du kaufst')
c_schick = cue(C, 'explain3', 'und schickst')
c_packt = cue(C, 'explain3', 'Er packt')
c_ploetz = cue(C, 'explain3', 'Und plötzlich')
c_welcher = cue(C, 'explain3', 'welcher Rasen')
endC_speech = r3((cardC + LEAD['explain3'] + dur.get('explain3', 0.84 + 0.0594 * len(S['e3']))) / TC)
W0 = (2.6, -2.2)
walk_end = r3(sec(C, 2.3))
bell0 = walk_end
sign0 = r3(c_du + sec(C, 0.15))                       # unterschreiben
sold_t = r3(c_schick - sec(C, 0.15))                  # VERKAUFT-Schild ploppt
POST = (MAILBOX[0] - 0.05, MAILBOX[1] + 0.6)
post_walk = r3(sold_t + sec(C, 0.25))
post0 = r3(post_walk + sec(C, 0.85))
swap0 = r3(c_ploetz + sec(C, 0.2))
swap1 = r3(swap0 + sec(C, 2.2))
SUIT = dict(suit=1)
ME_C = (2.4, 0.4)   # Dummy im neuen (gekauften) Garten
dummyC = [K(0, W0[0], W0[1], 'walk', face_to(W0, DOOR_SPOT), **SUIT, paint=0), K(walk_end, DOOR_SPOT[0], DOOR_SPOT[1], 'walk', 0),
          K(r3(walk_end + 0.002), DOOR_SPOT[0], DOOR_SPOT[1], 'ringbell', 0),
          K(r3(sign0 - 0.003), DOOR_SPOT[0], DOOR_SPOT[1], 'ringbell', 0), K(sign0, DOOR_SPOT[0], DOOR_SPOT[1], 'fillform', 0),
          K(post_walk, DOOR_SPOT[0], DOOR_SPOT[1], 'fillform', 0), K(r3(post_walk + 0.002), DOOR_SPOT[0], DOOR_SPOT[1], 'walk', face_to(DOOR_SPOT, POST)),
          K(r3(post0 - 0.004), POST[0], POST[1], 'walk', face_to(DOOR_SPOT, POST)), K(post0, POST[0], POST[1], 'postletter', 0),
          K(r3(post0 + sec(C, 1.4)), POST[0], POST[1], 'armscross', 0),
          K(r3(c_ploetz - 0.003), POST[0], POST[1], 'armscross', 20),
          K(c_ploetz, ME_C[0], ME_C[1], 'stand', 255), K(r3(c_welcher - sec(C, 0.6)), ME_C[0], ME_C[1], 'lookaround', 255, question=0),
          K(r3(c_welcher + sec(C, 0.6)), ME_C[0], ME_C[1], 'lookaround', 255, question=1), K(1, ME_C[0], ME_C[1], 'lookaround', 255, question=1)]
# Aktenkoffer: in der Hand, beim Unterschreiben abgestellt, dann wieder weg (bleibt an der Tür stehen)
CASE_DOWN = (DOOR_SPOT[0] - 0.45, DOOR_SPOT[1] + 0.1)
caseC = [K(0, W0[0], W0[1], 'park', face_to(W0, DOOR_SPOT), hand=1, drop=0.0), K(r3(sign0 - 0.003), W0[0], W0[1], 'park', 0, hand=1),
         K(sign0, CASE_DOWN[0], CASE_DOWN[1], 'park', 300, hand=0, y=0.32), K(1, CASE_DOWN[0], CASE_DOWN[1], 'park', 300, hand=0, y=0.32)]
BOARD = (NB_DOOR[0], NB_DOOR[1] + 0.47)
contractC = [K(0, BOARD[0], BOARD[1], 'park', 180, y=HIDE), K(r3(sign0 - 0.003), BOARD[0], BOARD[1], 'park', 180, y=HIDE),
             K(sign0, BOARD[0], BOARD[1], 'park', 180, y=1.17, fill=0, tilt=-18), K(r3(sign0 + sec(C, 0.35)), BOARD[0], BOARD[1], 'park', 180, fill=0),
             K(r3(post_walk - 0.002), BOARD[0], BOARD[1], 'park', 180, fill=1), K(post_walk, BOARD[0], BOARD[1], 'park', 180, y=HIDE)]
envC = [K(0, POST[0], POST[1], 'park', 0, y=HIDE), K(r3(post_walk - 0.003), POST[0], POST[1], 'park', 0, y=HIDE),
        K(post_walk, POST[0], POST[1], 'park', 90, hand=1, drop=-0.06, y=0, size=0.35), K(r3(post0 + sec(C, 0.72)), POST[0], POST[1], 'park', 90, hand=1),
        K(r3(post0 + sec(C, 0.75)), POST[0], POST[1], 'park', 90, hand=0, y=HIDE)]
mailC = [K(0, MAILBOX[0], MAILBOX[1], 'park', 180, door=0), K(r3(post0 + sec(C, 0.45)), MAILBOX[0], MAILBOX[1], 'park', 180, door=0),
         K(r3(post0 + sec(C, 0.65)), MAILBOX[0], MAILBOX[1], 'park', 180, door=1), K(r3(post0 + sec(C, 0.9)), MAILBOX[0], MAILBOX[1], 'park', 180, door=0)]
soldC = [K(0, SOLD[0], SOLD[1], 'park', 180), K(sold_t, SOLD[0], SOLD[1], 'show', 180), K(1, SOLD[0], SOLD[1], 'show', 180)]
# Nachbar: öffnet die Tür (steht auf der Stufe), hält den Vertrag, packt die Gießkanne und geht – im linken Garten gießt er
NB_LEFT = (-3.2, 0.4)
nb_walk0 = r3(c_packt + sec(C, 0.3))
GOAWAY = [(NB_DOOR[0], NB_DOOR[1] + 0.6), (1.6, -3.5)]
nbC = [K(0, NB_DOOR[0], NB_DOOR[1], 'stand', 180, y=HIDE), K(r3(bell0 + sec(C, 0.9)), NB_DOOR[0], NB_DOOR[1], 'stand', 180, y=HIDE),
       K(r3(bell0 + sec(C, 0.95)), NB_DOOR[0], NB_DOOR[1], 'stand', 180, y=0.16, brow=1, question=1),
       K(r3(sign0 - 0.003), NB_DOOR[0], NB_DOOR[1], 'stand', 180, y=0.16, question=1),
       K(sign0, NB_DOOR[0], NB_DOOR[1], 'holdboard', 180, y=0.16, question=0, brow=0.6),
       K(r3(post_walk - 0.002), NB_DOOR[0], NB_DOOR[1], 'holdboard', 180, y=0.16),
       K(post_walk, NB_DOOR[0], NB_DOOR[1], 'stand', 180, y=0.16),
       K(r3(nb_walk0 - 0.003), NB_DOOR[0], NB_DOOR[1], 'stand', 180, y=0.16),
       K(nb_walk0, GOAWAY[0][0], GOAWAY[0][1], 'walk', face_to(GOAWAY[0], GOAWAY[1]), y=0),
       K(r3(c_ploetz - 0.003), GOAWAY[1][0], GOAWAY[1][1], 'walk', face_to(GOAWAY[0], GOAWAY[1]), y=0),
       K(c_ploetz, NB_LEFT[0], NB_LEFT[1], 'waterplants', 150, question=0, brow=0), K(1, NB_LEFT[0], NB_LEFT[1], 'waterplants', 150)]
canC = [K(0, NB_DOOR[0], NB_DOOR[1], 'park', 0, y=HIDE), K(r3(nb_walk0 - 0.003), NB_DOOR[0], NB_DOOR[1], 'park', 0, y=HIDE),
        K(nb_walk0, NB_DOOR[0], NB_DOOR[1], 'park', face_to(GOAWAY[0], GOAWAY[1]), hand=1, holder='gartennachbar', drop=0.0, y=0, tilt=0, water=0),
        K(r3(c_ploetz - 0.003), NB_DOOR[0], NB_DOOR[1], 'park', face_to(GOAWAY[0], GOAWAY[1]), hand=1, tilt=0, water=0),
        K(c_ploetz, NB_LEFT[0], NB_LEFT[1], 'park', 150, hand=1, tilt=38, water=1)]
lawnC_L = [K(0, LAWN_L[0], LAWN_L[1], 'park', 0, lush=0), K(swap0, LAWN_L[0], LAWN_L[1], 'park', 0, lush=0), K(swap1, LAWN_L[0], LAWN_L[1], 'park', 0, lush=1)]
lawnC_R = [K(0, LAWN_R[0], LAWN_R[1], 'park', 0, lush=1), K(swap0, LAWN_R[0], LAWN_R[1], 'park', 0, lush=1), K(swap1, LAWN_R[0], LAWN_R[1], 'park', 0, lush=0)]
expC = {
 'camera': [cam(0, [6.2, 2.6, 4.4], [3.0, 0.9, -4.0]), cam(r3(walk_end), [5.6, 2.2, -1.6], [3.3, 1.1, -6.6]),
            cam(r3(sign0 - 0.003), [5.4, 2.1, -2.2], [3.3, 1.15, -6.8]),
            *camF(sign0, r3(sold_t - 0.003), F(body(*DOOR_SPOT) + body(NB_DOOR[0], NB_DOOR[1], 2.05), 72, 12)),
            *camF(sold_t, r3(post0 - sec(C, 0.35)), F(body(SOLD[0], SOLD[1], 1.9, 0.7) + body(*DOOR_SPOT) + body(NB_DOOR[0], NB_DOOR[1], 2.05), 8, 12)),
            *camF(r3(post0 - sec(C, 0.35) + 0.003), r3(c_packt - 0.003), F(body(*POST) + [[MAILBOX[0], 1.35, MAILBOX[1]], [MAILBOX[0], 0, MAILBOX[1]]], 95, 8)),
            cam(c_packt, [6.4, 2.3, 1.4], [2.8, 0.95, -5.6]), cam(r3(c_ploetz - 0.003), [6.0, 2.2, 1.0], [2.4, 0.9, -4.6]),
            *camF(c_ploetz, r3(c_welcher - 0.003), F(body(*ME_C) + body(*NB_LEFT, 2.0) + [[-3.5, 0, 2.5], [3.5, 0, 2.5]], 0, 18)),
            *camF(c_welcher, 1, F(body(*ME_C, 2.3) + body(*NB_LEFT, 2.0), 300, 10))],
 'actors': {'rasen': lawnC_L, 'rasen2': lawnC_R, 'dummy': dummyC, 'aktenkoffer': caseC, 'kaufvertrag': contractC, 'kuendigung': envC,
            'briefkasten': mailC, 'verkauft': soldC, 'gartennachbar': nbC, 'giesskanne2': canC,
            'gartenzwerg': [K(0, GNOME[0], GNOME[1], 'park', 160)], 'hund': [K(0, DOG[0], DOG[1], 'sit', 150)],
            'rasenmaeher': [K(0, MOWER0[0], MOWER0[1], 'park', 200)], 'gartentor': gate()},
 'sfx': [{'t': r3(bell0 + sec(C, 0.5)), 'id': 'tuerklingel', 'volume': 0.55}, {'t': sold_t, 'id': 'plopp', 'volume': 0.6},
         {'t': r3(post0 + sec(C, 0.7)), 'id': 'briefkasten', 'volume': 0.55}, {'t': swap0, 'id': 'rasen-zauber', 'volume': 0.5}],
}

# ================= Abstimmung =================
VOTE_D = (-0.55, 2.0)
VOTE_N = (0.6, 2.0)
vote = {
 'camera': [cam(0, [0.1, 6.0, 16.5], [0.0, 1.6, -1.0]), cam(1, [0.1, 5.7, 15.6], [0.0, 1.6, -1.0])],
 'actors': {**lawns(), **deco(),
            'dummy': [K(0, VOTE_D[0], VOTE_D[1], 'armscross', 160)],
            'gartennachbar': [K(0, VOTE_N[0], VOTE_N[1], 'waterplants', 200)],
            'giesskanne2': [K(0, VOTE_N[0], VOTE_N[1], 'park', 200, hand=1, holder='gartennachbar', drop=0.0, tilt=38, water=1)]},
}

# ================= Outro: beide am Zaun, schauen in die Kamera =================
OUT_D = (-0.48, 1.4)
OUT_N = (0.5, 1.4)
outro = {
 'camera': camF(0, 1, F(body(*OUT_D, 2.1) + body(*OUT_N, 2.1), 0, 6, (160, 920, 860, 1240), push=0.04)),
 'actors': {**lawns(), **deco(),
            'dummy': [K(0, OUT_D[0], OUT_D[1], 'stand', 180, brow=0.0), K(0.35, OUT_D[0], OUT_D[1], 'wave', 180), K(1, OUT_D[0], OUT_D[1], 'wave', 180)],
            'gartennachbar': [K(0, OUT_N[0], OUT_N[1], 'stand', 180, brow=1.0), K(0.55, OUT_N[0], OUT_N[1], 'wave', 180), K(1, OUT_N[0], OUT_N[1], 'wave', 180)]},
}

DESC = ("Der Rasen deines Nachbarn ist mal wieder grüner als deiner – was machst du? 🌱 Schreib A, B oder C in die Kommentare!\n\n"
        "Diesmal ohne richtige Antwort, nur zum Spaß. Bitte nichts davon nachmachen. 😄\n\n"
        "#waswürdestdutun #nachbarn #rasen #garten #spezial #lustig #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'nachbargarten',
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Nachts schleicht der Dummy auf Zehenspitzen durch seinen Garten und sprüht den Rasen grün an. Am Morgen: Rasen neon-grün, Gartenzwerg, Hund und seine Schuhe auch. Der Nachbar schaut verdutzt über den Zaun.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Nachts steigt der Dummy über den Zaun und schleicht mit dem glänzenden Rasenmäher durchs Gartentor davon. Am nächsten Tag kniet der Nachbar mit einer Nagelschere im Garten – sein Rasen ist trotzdem grüner. Nachbar verdutzt.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy im Anzug mit Aktenkoffer klingelt, unterschreibt den Kaufvertrag, VERKAUFT-Schild ploppt auf, Brief „Kündigung“ in den Briefkasten. Der Nachbar zieht mit seiner Gießkanne nach nebenan – plötzlich wird der gekaufte Rasen braun und der alte grün. Dummy verwirrt.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Schreib A, B oder C in die Kommentare'},
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ich bin Team ___. Und du? 👇 Und welches Nachbar-Problem sollen wir als Nächstes lösen?",
 },
 'shots': {'situation': situation, 'countdown': vote, 'outro': outro},
}
for _sh in [situation, vote, outro, expA, expB, expC]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
total = seclen('situation') + TA + TB + TC + seclen('countdown') + seclen('outro')
print('Länge', round(total, 1), 's', 'audio' if dur else 'geschätzt', {'situation': seclen('situation'), 'A': (cardA, sceneA), 'B': (cardB, sceneB), 'C': (cardC, sceneC), 'vote': seclen('countdown'), 'outro': seclen('outro')})
print('cues A', dict(scene=tA_scene, spray0=spray0, morgen=c_morgen, zwerg=c_zwerg, hund=c_hund, schuh=c_schuh, peek=peekA, end=endA_speech))
print('cues B', dict(scene=tB_scene, climb=(climb0, climb_end), grab=grab, seg=seg, tag=c_tag, immer=c_immer, end=endB_speech))
print('cues C', dict(scene=tC_scene, walk_end=walk_end, sign=sign0, sold=sold_t, post=(post_walk, post0), packt=c_packt, ploetz=c_ploetz, swap=(swap0, swap1), welcher=c_welcher, end=endC_speech))
