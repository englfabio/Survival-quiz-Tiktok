# Hilfsskript: erzeugt scenarios/spezial-paket-nachbar.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-paket-nachbar-choreo.py
# Format: SPEZIAL (keine richtige Antwort, keine Auflösung, keine Quellenzeile).
# Darstellung (Vorgabe Inhaber): alles comichaft + harmlos. Klappe wird mit einer kleinen Säge wie eine Katzenklappe
# ausgeschnitten (kein Einbruch-Look). KEINE echten Paketdienst-Logos oder -Farben: Paketbote in neutraler blaugrauer Uniform.
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-paket-nachbar'
S = dict(
situation="Dein Paket ist mal wieder beim Nachbarn gelandet, der nie aufmacht. Du klingelst seit drei Tagen. Was machst du?",
o1c="Vor seiner Tür campieren", o1s="A: Du campierst vor seiner Tür.",
o2c="Loch in seine Tür schneiden", o2s="B: Du schneidest ein Loch in seine Tür, damit du deine Pakete direkt rausholen kannst.",
o3c="Rechnung schicken", o3s="C: Du schickst ihm eine Rechnung, weil er dein Paket festhält. Wir sind ja schließlich in Deutschland.",
e1="Du baust dein Zelt direkt vor seiner Tür auf. Tag eins. Tag zwei. Tag fünf. Dann kommt der Paketbote, mit einem neuen Paket für dich. Er steigt über dein Zelt und klingelt beim Nachbarn.",
e2="Du schneidest eine kleine Klappe in seine Tür. Ab jetzt holst du deine Pakete einfach selbst raus. Am nächsten Morgen steckt sein Kopf in der Klappe. Und er sagt zum ersten Mal Hallo.",
e3="Fünf Euro für jeden Tag, den er dein Paket festhält. Nach einer Woche steht er vor deiner Tür. Mit dem Paket. Und mit einer Gegenrechnung für die Lagerung.",
vote="Also, was machst du? Schreib A, B oder C in die Kommentare.",
outro="Eine richtige Antwort gibt es diesmal nicht. Aber jeder hat so einen Nachbarn. Schreib A, B oder C in die Kommentare und markier jemanden, der das kennt.",
)
# Szenen rein visuell verlängern (Sekunden), falls das Video sonst unter 61 s bliebe – kein zusätzlicher Text.
# A: Reaktion Nachbar/Paketbote nach dem Klingeln, B: Nachbar winkt länger, C: Dummy erstarrt länger
EXTRA = {1: 3.6, 2: 1.2, 3: 1.6}

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'countdown': 0.1, 'outro': 0.3}
MINLEN = {'situation': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7, 'countdown': 5, 'outro': 3}
TEXT = {'situation': S['situation'], 'option1': S['o1s'], 'option2': S['o2s'], 'option3': S['o3s'],
        'explain1': S['e1'], 'explain2': S['e2'], 'explain3': S['e3'], 'countdown': S['vote'], 'outro': S['outro']}
vd = f'{ROOT}/public/voice/{ID}'
dur = json.load(open(f'{vd}/durations.json')) if os.path.exists(f'{vd}/durations.json') else {}
ali = json.load(open(f'{vd}/alignment.json')) if os.path.exists(f'{vd}/alignment.json') else {}

def cliplen(c):
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
HIDE = -30
BOX_A = (100, 980, 470, 1225)      # Antwort-Abschnitte: unter der Kopfzeile, über dem Untertitel
BOX_S = (100, 980, 300, 1225)      # Situation (nur Abzeichen oben)
def body(x, z, h=1.85, w=0.3, y=0.0):
    return [[x - w, y, z], [x + w, y, z], [x, y + h, z - w], [x, y + h, z + w]]
_fits = {}
def F(points, az, el, box=BOX_A, fov=38, push=0.05):
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

# ---- feste Plätze (Bühne "treppenhaus", siehe src/stage/Stairwell.tsx) ----
DOOR_R = (1.4, -0.03)       # Tür des Nachbarn (Scharnier vorn, gespiegelt, face 270, side 1)
DOOR_L = (-1.4, -1.43)      # Tür des Dummys (face 90)
FLAP = (1.4, 0.35, -0.5)    # Mitte der Klappe (Welt)
BELL_R = (1.392, 1.38, -1.18)
BELL_L = (-1.392, 1.38, -1.22)
RING_D = (0.97, -1.48)      # Dummy klingelt beim Nachbarn (face 90)
CAL = (0.98, 1.62, -2.78)   # Tageskalender an der Rückwand
TENT = (0.78, -0.3)
NB_IN = (2.2, -0.5)         # Nachbar drinnen (unsichtbar hinter der Wand)

def doors(t=0, r_door=0.0, r_cut=0.0, r_lid=0.0, l_door=0.0):
    return {'treppentuer': [K(t, DOOR_R[0], DOOR_R[1], 'park', 270, side=1, door=r_door, fill=r_cut, lid=r_lid)],
            'treppentuer2': [K(t, DOOR_L[0], DOOR_L[1], 'park', 90, door=l_door)]}
def bells(press_r=None, press_l=None):
    a = {'klingel': press_r or [{**K(0, BELL_R[0], BELL_R[2], 'park', 270, press=0), 'y': BELL_R[1]}],
         'klingel2': press_l or [{**K(0, BELL_L[0], BELL_L[2], 'park', 90, press=0), 'y': BELL_L[1]}]}
    return a
def bellkeys(pos, face, presses):
    """presses: Liste von Startzeiten (t), Knopf leuchtet ca. 0,35–0,8 s danach"""
    ks = [{**K(0, pos[0], pos[2], 'park', face, press=0), 'y': pos[1]}]
    for t0, secname in presses:
        ks += [{**K(r3(t0 + sec(secname, 0.33)), pos[0], pos[2], 'park', face, press=0), 'y': pos[1]},
               {**K(r3(t0 + sec(secname, 0.42)), pos[0], pos[2], 'park', face, press=1), 'y': pos[1]},
               {**K(r3(t0 + sec(secname, 0.75)), pos[0], pos[2], 'park', face, press=1), 'y': pos[1]},
               {**K(r3(t0 + sec(secname, 0.95)), pos[0], pos[2], 'park', face, press=0), 'y': pos[1]}]
    return ks
def calendar(keys):
    return [{**K(t, CAL[0], CAL[2], 'park', 180, fill=d), 'y': CAL[1]} for t, d in keys]
def hidden(name_pos=(0, 0)):
    return [K(0, name_pos[0], name_pos[1], 'stand', 0, y=HIDE)]

# ================= Situation =================
L0 = 'situation'
c_du = cue(L0, 'situation', 'Du klingelst')
c_drei = cue(L0, 'situation', 'seit drei Tagen')
c_was = cue(L0, 'situation', 'Was machst')
ring_times = [0.0]
while ring_times[-1] + sec(L0, 3.4) < 1:
    ring_times.append(r3(ring_times[-1] + sec(L0, 3.4)))
situation = {
 'camera': [*camF(0, r3(c_du - 0.003), F(body(*RING_D) + [[1.4, 0, -1.0], [1.4, 2.1, 0.0], [-1.4, 0, -2.4], [-1.4, 2.1, -1.4]], 2, 10, BOX_S)),
            *camF(c_du, r3(c_was - 0.003), F(body(*RING_D) + [[1.4, 0, -0.98], [1.4, 2.1, 0.0], [BELL_R[0], BELL_R[1], BELL_R[2]]], 282, 6)),
            *camF(c_was, 1, F([[RING_D[0], 0.9, RING_D[1] - 0.3], [RING_D[0], 1.95, RING_D[1] + 0.3], [BELL_R[0], BELL_R[1] + 0.15, BELL_R[2]]], 96, 4))],
 'actors': {**doors(), **bells(press_r=bellkeys(BELL_R, 270, [(t, L0) for t in ring_times])),
            'tageskalender': calendar([(0, 1), (r3(c_drei - 0.003), 1), (r3(c_drei + sec(L0, 0.5)), 2), (r3(c_drei + sec(L0, 1.0)), 3), (1, 3)]),
            'dummy': [K(0, RING_D[0], RING_D[1], 'ringwait', 90, brow=0.3), K(c_was, RING_D[0], RING_D[1], 'ringwait', 90, brow=1.0)]},
 'sfx': [{'t': r3(t + sec(L0, 0.4)), 'id': 'tuerklingel', 'volume': 0.45} for t in ring_times] +
        [{'t': r3(c_drei + sec(L0, 0.4)), 'id': 'kalender-blaettern', 'volume': 0.35}],
}

# ================= Antwort A: vor seiner Tür campieren =================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
tA = r3(cardA / TA)
c_zelt = cue(A, 'explain1', 'Du baust')
c_t1 = cue(A, 'explain1', 'Tag eins')
c_t2 = cue(A, 'explain1', 'Tag zwei')
c_t5 = cue(A, 'explain1', 'Tag fünf')
c_dann = cue(A, 'explain1', 'Dann kommt')
c_steigt = cue(A, 'explain1', 'Er steigt')
c_klingelt = cue(A, 'explain1', 'und klingelt')
endA = r3((cardA + LEAD['explain1'] + dur.get('explain1', 0.84 + 0.0594 * len(S['e1']))) / TA)
PITCH = (TENT[0], TENT[1] + 0.62)      # kniet vor dem Packsack
SIT = (TENT[0], TENT[1] + 0.22)        # sitzt im Eingang (face 180)
STOVE = (SIT[0] - 0.05, SIT[1] + 0.47)
pitch0 = r3(c_zelt + sec(A, 0.1))
# Paketbote: Treppe hoch, über das Zelt, klingeln, Paket abstellen
UP0 = (0.78, 4.35)
UP1 = (0.78, 0.98)
up0 = r3(c_dann - sec(A, 0.3))
up1 = r3(min(c_steigt - sec(A, 0.15), up0 + sec(A, 3.6)))
OVER = [(0.78, 0.72, 0.0), (0.78, 0.3, 0.32), (0.8, -0.25, 0.5), (0.86, -0.82, 0.34), (0.94, -1.25, 0.06), (RING_D[0], RING_D[1], 0.0)]
over0 = r3(c_steigt + sec(A, 0.05))
over1 = r3(c_klingelt - sec(A, 0.05))
ringA = r3(over1 + sec(A, 0.1))
gapA = r3(ringA + sec(A, 1.3))
turnA = r3(gapA + sec(A, 0.5))
PUT_FACE = 140
setA = r3(turnA + sec(A, 0.15))
PARCEL_A = (round(RING_D[0] + 0.5 * math.sin(math.radians(PUT_FACE)), 3), round(RING_D[1] - 0.5 * math.cos(math.radians(PUT_FACE)), 3))
pullA = r3(setA + sec(A, 1.3))
closeA = r3(pullA + sec(A, 0.7))
ovs = [over0 + (over1 - over0) * i / (len(OVER) - 1) for i in range(len(OVER))]
boteA = [K(0, UP0[0], UP0[1], 'stairsup', 0, y=HIDE), K(r3(up0 - 0.003), UP0[0], UP0[1], 'stairsup', 0, y=HIDE),
         K(up0, UP0[0], UP0[1], 'stairsup', 0, y=0), K(up1, UP1[0], UP1[1], 'stairsup', 0),
         K(r3(up1 + 0.003), UP1[0], UP1[1], 'carrystack', 0), K(r3(over0 - 0.003), OVER[0][0], OVER[0][1], 'carrystack', 0)]
for i, (x, z, y) in enumerate(OVER):
    f = face_to(OVER[i][:2], OVER[i + 1][:2]) if i < len(OVER) - 1 else 90
    boteA.append(K(r3(ovs[i]), x, z, 'stepover', f, y=y))
boteA += [K(r3(ringA - 0.003), RING_D[0], RING_D[1], 'carrystack', 90, y=0), K(ringA, RING_D[0], RING_D[1], 'botering', 90),
          K(r3(turnA - 0.003), RING_D[0], RING_D[1], 'botering', 90), K(turnA, RING_D[0], RING_D[1], 'botering', PUT_FACE),
          K(setA, RING_D[0], RING_D[1], 'setparcel', PUT_FACE), K(1, RING_D[0], RING_D[1], 'setparcel', PUT_FACE, brow=1)]
# Dummy: Zelt aufbauen, dann Tag 1 sitzen (Lichterkette), Tag 2 kochen, Tag 5 dösen; beim Paketboten schaut er hoch
dummyA = [K(0, PITCH[0], PITCH[1] + 0.5, 'stand', 0, brow=0.4), K(r3(pitch0 - 0.003), PITCH[0], PITCH[1], 'stand', 0),
          K(pitch0, PITCH[0], PITCH[1], 'pitchtent', 0),
          K(r3(c_t1 - 0.003), PITCH[0], PITCH[1], 'pitchtent', 0),
          K(c_t1, SIT[0], SIT[1], 'tentsit', 180, brow=0.0), K(r3(c_t2 - 0.003), SIT[0], SIT[1], 'tentsit', 180),
          K(c_t2, SIT[0], SIT[1], 'tentcook', 180), K(r3(c_t5 - 0.003), SIT[0], SIT[1], 'tentcook', 180),
          K(c_t5, SIT[0], SIT[1], 'tentslump', 180), K(r3(over0 - 0.003), SIT[0], SIT[1], 'tentslump', 180),
          K(over0, SIT[0], SIT[1], 'tentsit', 180, brow=1.0), K(r3(closeA), SIT[0], SIT[1], 'tentsit', 180, question=0),
          K(r3(closeA + sec(A, 0.4)), SIT[0], SIT[1], 'tentsit', 180, question=1), K(1, SIT[0], SIT[1], 'tentsit', 180, question=1)]
tent0 = r3(pitch0 + sec(A, 1.2))
tentA = [K(0, TENT[0], TENT[1], 'park', 180, fill=0, squish=0), K(tent0, TENT[0], TENT[1], 'park', 180, fill=0),
         K(r3(tent0 + sec(A, 0.8)), TENT[0], TENT[1], 'park', 180, fill=1),
         K(r3(ovs[1]), TENT[0], TENT[1], 'park', 180, squish=0), K(r3(ovs[2]), TENT[0], TENT[1], 'park', 180, squish=0.75),
         K(r3(ovs[3]), TENT[0], TENT[1], 'park', 180, squish=0.55), K(r3(ovs[4]), TENT[0], TENT[1], 'park', 180, squish=0)]
lightsA = [{**K(0, TENT[0], TENT[1] + 0.5, 'park', 180, glow=0), 'y': HIDE}, {**K(r3(c_t1 - 0.003), TENT[0], TENT[1] + 0.5, 'park', 180, glow=0), 'y': HIDE},
           {**K(c_t1, TENT[0], TENT[1] + 0.52, 'park', 180, glow=1, size=0.02), 'y': 0.86}]
stoveA = [K(0, STOVE[0], STOVE[1], 'park', 180, y=HIDE, fire=0), K(r3(c_t2 - 0.003), STOVE[0], STOVE[1], 'park', 180, y=HIDE, fire=0),
          K(c_t2, STOVE[0], STOVE[1], 'park', 180, y=0, fire=1, smoke=1), K(r3(c_t5 - 0.003), STOVE[0], STOVE[1], 'park', 180, fire=1, smoke=1),
          K(c_t5, STOVE[0], STOVE[1], 'park', 180, fire=0, smoke=0.3)]
# Nachbar: öffnet nach dem Klingeln einen Spalt, zieht das Paket hinein, Tür zu
NB_PEEK = (1.72, -1.05)
nbA = [K(0, NB_PEEK[0], NB_PEEK[1], 'stand', 260, y=HIDE), K(r3(gapA - 0.003), NB_PEEK[0], NB_PEEK[1], 'stand', 260, y=HIDE),
       K(gapA, NB_PEEK[0], NB_PEEK[1], 'doorpeek', 250, y=0, brow=1), K(1, NB_PEEK[0], NB_PEEK[1], 'doorpeek', 250)]
doorA = [K(0, DOOR_R[0], DOOR_R[1], 'park', 270, side=1, door=0), K(gapA, DOOR_R[0], DOOR_R[1], 'park', 270, side=1, door=0),
         K(r3(gapA + sec(A, 0.45)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, door=0.16),
         K(r3(closeA - 0.003), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, door=0.16), K(r3(closeA + sec(A, 0.3)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, door=0)]
parcelA = [K(0, PARCEL_A[0], PARCEL_A[1], 'park', 230, y=HIDE), K(r3(setA + sec(A, 0.98)), PARCEL_A[0], PARCEL_A[1], 'park', 230, y=HIDE),
           K(r3(setA + sec(A, 1.0)), PARCEL_A[0], PARCEL_A[1], 'park', 230, y=0), K(pullA, PARCEL_A[0], PARCEL_A[1], 'park', 230, y=0),
           K(r3(pullA + sec(A, 0.5)), 1.62, -0.9, 'park', 250, y=0), K(r3(pullA + sec(A, 0.52)), 1.62, -0.9, 'park', 250, y=HIDE)]
# Kameras
camA = [*camF(0, r3(c_t1 - 0.003), F(body(*PITCH, 1.85) + [[TENT[0] - 0.62, 0, TENT[1] - 0.7], [TENT[0] + 0.62, 0.9, TENT[1] - 0.7], [1.4, 2.1, -0.9]], 345, 12)),
        *camF(c_t1, r3(up0 - 0.003), F([[TENT[0] - 0.65, 0, TENT[1] - 0.7], [TENT[0] + 0.65, 0, TENT[1] + 0.75], [TENT[0], 0.95, TENT[1]], [CAL[0], CAL[1] + 0.22, CAL[2]], [STOVE[0], 0, STOVE[1] + 0.1]], 350, 9)),
        *camF(up0, r3(over0 - 0.003), F(body(UP1[0], 2.2, 1.9, 0.3, -1.1) + body(*UP1) + [[TENT[0], 0.9, TENT[1]]], 292, 8)),
        *camF(over0, r3(gapA - 0.003), F(body(*SIT, 1.0) + [[TENT[0], 0, TENT[1] - 0.75], [TENT[0], 0, TENT[1] + 0.75], [0.8, 2.4, -0.25], [RING_D[0], 1.9, RING_D[1]]], 278, 8)),
        *camF(gapA, 1, F(body(*RING_D) + [[1.4, 2.05, -0.97], [1.4, 0, -0.97], [PARCEL_A[0], 0, PARCEL_A[1]], [SIT[0], 1.0, SIT[1]]], 300, 10))]
expA = {
 'camera': camA,
 'actors': {**doors(), 'treppentuer': doorA, **bells(press_r=bellkeys(BELL_R, 270, [(ringA, A)])),
            'tageskalender': calendar([(0, 1), (r3(c_t2 - 0.003), 1), (r3(c_t2 + sec(A, 0.5)), 2), (r3(c_t5 - 0.003), 2),
                                       (r3(c_t5 + sec(A, 0.9)), 5), (1, 5)]),
            'dummy': dummyA, 'zelt': tentA, 'lichterkette': lightsA, 'kocher': stoveA, 'paketbote': boteA, 'paketnachbar': nbA, 'paket2': parcelA},
 'sfx': [{'t': tent0, 'id': 'plopp', 'volume': 0.6}, {'t': r3(tent0 + sec(A, 0.1)), 'id': 'geschenk-rascheln', 'volume': 0.35},
         {'t': r3(c_t2 + sec(A, 0.2)), 'id': 'kalender-blaettern', 'volume': 0.35}, {'t': r3(c_t5 + sec(A, 0.2)), 'id': 'kalender-blaettern', 'volume': 0.35},
         {'t': up0, 'id': 'schritte-treppe', 'volume': 0.5}, {'t': r3(ovs[1]), 'id': 'schleichen', 'volume': 0.4},
         {'t': r3(ringA + sec(A, 0.4)), 'id': 'tuerklingel', 'volume': 0.5}, {'t': gapA, 'id': 'tuer-knarren', 'volume': 0.5},
         {'t': r3(setA + sec(A, 0.9)), 'id': 'paket-abstellen', 'volume': 0.6}, {'t': closeA, 'id': 'tuer-zu', 'volume': 0.5}],
}

# ================= Antwort B: Klappe in die Tür sägen =================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
tB = r3(cardB / TB)
c_schneid = cue(B, 'explain2', 'Du schneidest')
c_ab = cue(B, 'explain2', 'Ab jetzt')
c_morgenB = cue(B, 'explain2', 'Am nächsten Morgen')
c_kopf = cue(B, 'explain2', 'steckt sein Kopf')
c_hallo = cue(B, 'explain2', 'Und er sagt')
KNEEL = (round(1.375 - 0.62, 3), FLAP[2])
saw0 = r3(min(c_schneid, tB + sec(B, 0.2)))
cut0 = r3(saw0 + sec(B, 0.55))
cut1 = r3(saw0 + sec(B, 2.75))
grab0 = r3(max(c_ab - sec(B, 0.15), saw0 + sec(B, 3.3)))
CYC = 1.7
n_cycles = 0
cyc = []
while grab0 + sec(B, 1.45) + sec(B, CYC) * n_cycles < c_morgenB - sec(B, 0.05) and n_cycles < 4:
    cyc.append(r3(grab0 + sec(B, CYC) * n_cycles)); n_cycles += 1
grab_end = r3(c_morgenB - 0.003)
STACK_B = (round(KNEEL[0] + 0.24, 3), round(KNEEL[1] - 0.5, 3))
MORN_D = (0.5, -0.15)
dummyB = [K(0, KNEEL[0] - 0.45, KNEEL[1] + 0.15, 'stand', 90, brow=1.0), K(r3(saw0 - 0.003), KNEEL[0], KNEEL[1], 'stand', 90),
          K(saw0, KNEEL[0], KNEEL[1], 'sawflap', 90, brow=0.3), K(r3(grab0 - 0.003), KNEEL[0], KNEEL[1], 'sawflap', 90),
          K(grab0, KNEEL[0], KNEEL[1], 'flapgrab', 90), K(grab_end, KNEEL[0], KNEEL[1], 'flapgrab', 90),
          K(c_morgenB, MORN_D[0], MORN_D[1], 'stand', 120, brow=0.0),
          K(r3(c_kopf + sec(B, 0.3)), MORN_D[0], MORN_D[1], 'stepback', 120, brow=1.0),
          K(r3(c_hallo + sec(B, 0.6)), MORN_D[0] - 0.25, MORN_D[1] + 0.12, 'wave', 115),
          K(r3(c_hallo + sec(B, 2.4)), MORN_D[0] - 0.25, MORN_D[1] + 0.12, 'wave', 115, question=1), K(1, MORN_D[0] - 0.25, MORN_D[1] + 0.12, 'wave', 115, question=1)]
# Klappe: beim Greifen offen (Hände drin), sonst fällt sie zu
lidB = [K(0, DOOR_R[0], DOOR_R[1], 'park', 270, side=1, fill=0, lid=0), K(cut0, DOOR_R[0], DOOR_R[1], 'park', 270, side=1, fill=0, lid=0),
        K(cut1, DOOR_R[0], DOOR_R[1], 'park', 270, side=1, fill=1, lid=0),
        K(r3(saw0 + sec(B, 2.9)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=0), K(r3(saw0 + sec(B, 3.2)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=0.7),
        K(r3(saw0 + sec(B, 3.3)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=0.7)]
for c0 in cyc:
    lidB += [K(r3(c0 + sec(B, 0.15)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=0.15), K(r3(c0 + sec(B, 0.42)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=1),
             K(r3(c0 + sec(B, 0.85)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=1), K(r3(c0 + sec(B, 1.15)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=0.15)]
lidB += [K(r3(c_morgenB - 0.003), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=0.1),
         K(c_morgenB, DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=0), K(r3(c_kopf - sec(B, 0.1)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=0),
         K(r3(c_kopf + sec(B, 0.25)), DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=1.0), K(1, DOOR_R[0], DOOR_R[1], 'park', 270, side=1, lid=1.0)]
stackB = [K(0, STACK_B[0], STACK_B[1], 'park', 100, fill=0)]
for i, c0 in enumerate(cyc):
    stackB += [K(r3(c0 + sec(B, 1.33)), STACK_B[0], STACK_B[1], 'park', 100, fill=round(i / 7 + 0.001, 3)),
               K(r3(c0 + sec(B, 1.36)), STACK_B[0], STACK_B[1], 'park', 100, fill=round((i + 1) / 7, 3))]
stackB += [K(r3(c_morgenB - 0.003), STACK_B[0], STACK_B[1], 'park', 100), K(c_morgenB, STACK_B[0], STACK_B[1], 'park', 100, fill=round(min(1, len(cyc) / 7 + 2 / 7), 3))]
sawB = [K(0, KNEEL[0], KNEEL[1], 'park', 0, y=HIDE), K(r3(saw0 + sec(B, 2.98)), KNEEL[0], KNEEL[1], 'park', 0, y=HIDE),
        K(r3(saw0 + sec(B, 3.0)), KNEEL[0] + 0.1, KNEEL[1] + 0.42, 'park', 20, y=0)]
NB_FLAP = (round(1.27 + 0.79, 3), FLAP[2])
nbB = [K(0, NB_FLAP[0], NB_FLAP[1], 'flappeek', 270, y=HIDE), K(r3(c_kopf - 0.003), NB_FLAP[0], NB_FLAP[1], 'flappeek', 270, y=HIDE),
       K(c_kopf, NB_FLAP[0] + 0.35, NB_FLAP[1], 'flappeek', 270, y=0), K(r3(c_kopf + sec(B, 0.35)), NB_FLAP[0], NB_FLAP[1], 'flappeek', 270, y=0),
       K(c_hallo, NB_FLAP[0], NB_FLAP[1], 'flappeek', 270, brow=0.6), K(1, NB_FLAP[0], NB_FLAP[1], 'flappeek', 270, brow=0.6)]
camB = [*camF(0, r3(cut1 - 0.003), F(body(*KNEEL, 1.3) + [[1.4, 0.05, -0.75], [1.4, 0.8, -0.25], [1.4, 1.6, -0.5]], 300, 12)),
        *camF(cut1, r3(c_morgenB - 0.003), F(body(*KNEEL, 1.3) + [[STACK_B[0], 0.9, STACK_B[1]], [1.4, 0.05, -0.8], [1.4, 0.7, -0.2]], 318, 18)),
        *camF(c_morgenB, r3(c_hallo - 0.003), F([[FLAP[0], 0.05, -0.8], [FLAP[0], 0.7, -0.2], [FLAP[0] - 0.1, 0.5, FLAP[2]]] + body(*MORN_D), 300, 6)),
        *camF(c_hallo, 1, F([[FLAP[0], 0.08, -0.78], [FLAP[0], 0.66, -0.22], [MORN_D[0] - 0.25, 2.15, MORN_D[1] + 0.12], [MORN_D[0] - 0.25, 0, MORN_D[1] + 0.12]], 282, 4))]
expB = {
 'camera': camB,
 'actors': {**doors(), 'treppentuer': lidB, **bells(), 'tageskalender': calendar([(0, 1)]),
            'dummy': dummyB, 'pakete': stackB, 'saege': sawB, 'paketnachbar': nbB},
 'sfx': [{'t': cut0, 'id': 'saegen', 'volume': 0.6}, {'t': r3(saw0 + sec(B, 3.1)), 'id': 'plopp', 'volume': 0.4}] +
        [{'t': r3(c0 + sec(B, 1.32)), 'id': 'paket-abstellen', 'volume': 0.5} for c0 in cyc] +
        [{'t': r3(c_kopf + sec(B, 0.2)), 'id': 'tuer-knarren', 'volume': 0.35}],
}

# ================= Antwort C: Rechnung schicken =================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
tC = r3(cardC / TC)
c_fuenf = cue(C, 'explain3', 'Fünf Euro')
c_woche = cue(C, 'explain3', 'Nach einer Woche')
c_steht = cue(C, 'explain3', 'steht er')
c_mit = cue(C, 'explain3', 'Mit dem Paket')
c_gegen = cue(C, 'explain3', 'Und mit einer')
c_lager = cue(C, 'explain3', 'Gegenrechnung')
SLIDE = (round(1.375 - 0.6, 3), -0.5)
SHOW = (0.45, -0.25)
slide0 = r3(max(tC + sec(C, 0.1), c_fuenf - sec(C, 0.5)))
push_t = r3(slide0 + sec(C, 1.12))
# Brief "Rechnung" am Boden: unter der Tür durch (Hand bei 0,42 → 0,75 m vor ihm, rechts 0,06)
EN0 = (round(SLIDE[0] + 0.42, 3), round(SLIDE[1] + 0.06, 3))
EN1 = (round(SLIDE[0] + 0.78, 3), round(SLIDE[1] + 0.06, 3))
letterC = [{**K(0, EN0[0], EN0[1], 'park', 90, tilt=1), 'y': HIDE, 'text': 'Rechnung'}, {**K(r3(slide0 + sec(C, 0.55)), EN0[0], EN0[1], 'park', 90, tilt=1), 'y': HIDE},
           {**K(r3(slide0 + sec(C, 0.6)), EN0[0], EN0[1], 'park', 90, tilt=1), 'y': 0.0}, {**K(push_t, EN1[0], EN1[1], 'park', 90, tilt=1), 'y': 0.0},
           {**K(r3(push_t + 0.003), EN1[0], EN1[1], 'park', 90, tilt=1), 'y': HIDE}]
# Woche: Kalender 1 → 7, Tür des Dummys, Nachbar mit Paket + Gegenrechnung
AT_L = (-0.62, -1.88)       # Nachbar vor der Tür des Dummys (face 270)
ME_L = (-1.28, -1.9)        # Dummy in seiner Tür (face 90)
ring_nb = r3(c_woche + sec(C, 0.05))
open_l = r3(c_steht + sec(C, 0.1))
offer = r3(c_mit + sec(C, 0.1))
take = r3(c_lager - sec(C, 0.1))
dummyC = [K(0, SHOW[0], SHOW[1], 'showletter', 160, brow=0.6, text='Rechnung'), K(r3(slide0 - 0.003), SHOW[0], SHOW[1], 'showletter', 160),
          K(slide0, SLIDE[0], SLIDE[1], 'slideletter', 90), K(r3(push_t + sec(C, 0.2)), SLIDE[0], SLIDE[1], 'slideletter', 90),
          K(r3(push_t + sec(C, 0.22)), SLIDE[0], SLIDE[1], 'armscross', 160), K(r3(c_woche - 0.003), SLIDE[0], SLIDE[1], 'armscross', 160),
          K(c_woche, -2.1, ME_L[1], 'stand', 90, y=0, brow=0), K(r3(open_l + sec(C, 0.3)), -2.1, ME_L[1], 'walk', 90),
          K(r3(open_l + sec(C, 1.1)), ME_L[0], ME_L[1], 'walk', 90), K(r3(open_l + sec(C, 1.13)), ME_L[0], ME_L[1], 'stand', 90),
          K(r3(take - 0.003), ME_L[0], ME_L[1], 'stand', 90, brow=0.5),
          {**K(take, ME_L[0], ME_L[1], 'letterfreeze', 90, brow=0.5), 'text': 'Gegenrechnung'},
          K(r3(take + sec(C, 1.6)), ME_L[0], ME_L[1], 'letterfreeze', 90, brow=1.0, question=0),
          K(r3(take + sec(C, 2.0)), ME_L[0], ME_L[1], 'letterfreeze', 90, question=1), K(1, ME_L[0], ME_L[1], 'letterfreeze', 90, question=1)]
nbC = [K(0, AT_L[0], AT_L[1], 'stand', 270, y=HIDE), K(r3(c_woche - 0.003), AT_L[0], AT_L[1], 'stand', 270, y=HIDE),
       K(c_woche, AT_L[0] + 0.02, AT_L[1] + 0.3, 'ringwait', 270, y=0), K(r3(open_l - 0.003), AT_L[0] + 0.02, AT_L[1] + 0.3, 'ringwait', 270),
       K(open_l, AT_L[0], AT_L[1], 'holdparcel', 270, teeth=1), K(r3(offer - 0.003), AT_L[0], AT_L[1], 'holdparcel', 270),
       K(offer, AT_L[0], AT_L[1], 'parcelletter', 270), K(r3(take - 0.003), AT_L[0], AT_L[1], 'parcelletter', 270),
       K(take, AT_L[0], AT_L[1], 'holdparcel', 270), K(1, AT_L[0], AT_L[1], 'holdparcel', 270)]
doorLC = [K(0, DOOR_L[0], DOOR_L[1], 'park', 90, door=0), K(open_l, DOOR_L[0], DOOR_L[1], 'park', 90, door=0),
          K(r3(open_l + sec(C, 0.6)), DOOR_L[0], DOOR_L[1], 'park', 90, door=0.85), K(1, DOOR_L[0], DOOR_L[1], 'park', 90, door=0.85)]
SIGN = (1.0, -0.5)
signC = [{**K(0, SIGN[0], SIGN[1], 'park', 270, size=-0.1), 'y': 2.35, 'text': '5 € / Tag'}, {**K(r3(c_fuenf - 0.003), SIGN[0], SIGN[1], 'park', 270), 'y': 2.35},
         {**K(c_fuenf, SIGN[0], SIGN[1], 'show', 270), 'y': 2.35}, {**K(r3(c_woche - 0.003), SIGN[0], SIGN[1], 'show', 270), 'y': 2.35}, {**K(c_woche, SIGN[0], SIGN[1], 'park', 270), 'y': HIDE}]
camC = [*camF(0, r3(slide0 - 0.003), F(body(*SHOW) + [[1.4, 0, -0.98], [1.4, 2.1, 0.0]], 340, 8)),
        *camF(slide0, r3(c_woche - 0.003), F(body(*SLIDE, 1.2) + [[1.4, 0, -0.98], [1.4, 0, -0.02], [SIGN[0], 2.7, SIGN[1]], [EN1[0], 0, EN1[1]]], 300, 10)),
        *camF(c_woche, r3(c_mit - 0.003), F(body(*AT_L) + body(*ME_L) + [[CAL[0], CAL[1] + 0.2, CAL[2]], [-1.4, 2.1, -2.38]], 10, 6)),
        *camF(c_mit, r3(take - 0.003), F(body(*AT_L) + body(*ME_L), 20, 6)),
        *camF(take, 1, F(body(*ME_L, 2.3, 0.28) + [[AT_L[0], 1.5, AT_L[1]]], 72, 5))]
expC = {
 'camera': camC,
 'actors': {**doors(), 'treppentuer2': doorLC, **bells(press_l=bellkeys(BELL_L, 90, [(ring_nb, C)])),
            'tageskalender': calendar([(0, 1), (r3(c_woche - 0.003), 1), (r3(c_woche + sec(C, 1.3)), 7), (1, 7)]),
            'dummy': dummyC, 'brief': letterC, 'paketnachbar': nbC, 'hinweis': signC},
 'sfx': [{'t': r3(slide0 + sec(C, 0.65)), 'id': 'papier-schieben', 'volume': 0.55}, {'t': c_fuenf, 'id': 'plopp', 'volume': 0.45},
         {'t': r3(c_woche + sec(C, 0.1)), 'id': 'kalender-blaettern', 'volume': 0.4}, {'t': r3(ring_nb + sec(C, 0.4)), 'id': 'tuerklingel', 'volume': 0.5},
         {'t': open_l, 'id': 'tuer-knarren', 'volume': 0.4}, {'t': r3(take + sec(C, 0.5)), 'id': 'brief-reissen', 'volume': 0.6}],
}

# ================= Abstimmung =================
V = 'countdown'
vring = [0.0, r3(sec(V, 3.4))]
vote = {
 'camera': [*camF(0, 1, F(body(*RING_D) + [[1.4, 0, -0.98], [1.4, 2.1, 0.0], [-1.4, 0, -2.4], [-1.4, 2.1, -1.4], [CAL[0], CAL[1], CAL[2]]], 2, 12, (100, 980, 300, 1000), push=0.03))],
 'actors': {**doors(), **bells(press_r=bellkeys(BELL_R, 270, [(t, V) for t in vring])), 'tageskalender': calendar([(0, 3)]),
            'dummy': [K(0, RING_D[0], RING_D[1], 'ringwait', 90, brow=0.6)]},
}

# ================= Outro: beide Nachbarn mit Brief, Blick in die Kamera =================
OUT_D = (-0.42, 0.1)
OUT_N = (0.46, 0.1)
outro = {
 'camera': camF(0, 1, F(body(*OUT_D, 2.05) + body(*OUT_N, 2.05), 0, 6, (160, 920, 860, 1240), push=0.04)),
 'actors': {**doors(), **bells(), 'tageskalender': calendar([(0, 7)]),
            'dummy': [{**K(0, OUT_D[0], OUT_D[1], 'showletter', 180, brow=0.6), 'text': 'Rechnung'}],
            'paketnachbar': [{**K(0, OUT_N[0], OUT_N[1], 'showletter', 180, brow=0.3, teeth=1), 'text': 'Gegenrechnung'}]},
}

DESC = ("Dein Paket ist mal wieder beim Nachbarn gelandet, der nie aufmacht – was machst du? 📦 Schreib A, B oder C in die Kommentare!\n\n"
        "Diesmal ohne richtige Antwort, nur zum Spaß. Bitte nichts davon nachmachen. 😄\n\n"
        "#waswürdestdutun #paket #nachbarn #paketbote #treppenhaus #spezial #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'treppenhaus',
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy baut ein kleines Zelt direkt vor der Tür des Nachbarn auf (Lichterkette, Campingkocher), der Kalender blättert von Tag 1 über Tag 2 zu Tag 5. Der Paketbote kommt mit einem Paketstapel die Treppe hoch, steigt über das Zelt und klingelt beim Nachbarn – der öffnet einen Spalt und zieht das Paket hinein. Dummy verdutzt.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy sägt comichaft mit einer kleinen Säge eine Katzenklappe unten in die Tür des Nachbarn und holt seine Pakete einzeln heraus. Am nächsten Morgen steckt der Nachbar den Kopf durch die Klappe und winkt freundlich – der Dummy winkt verdutzt zurück.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy schiebt einen Brief „Rechnung“ unter der Tür des Nachbarn durch (Schild „5 € / Tag“). Eine Woche später klingelt es beim Dummy: Der Nachbar steht mit dem Paket vor seiner Tür und überreicht einen Brief „Gegenrechnung“. Der Dummy öffnet ihn und erstarrt.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Schreib A, B oder C in die Kommentare'},
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ich bin Team ___. Und du? 👇 Markier jemanden, der so einen Nachbarn hat!",
 },
 'shots': {'situation': situation, 'countdown': vote, 'outro': outro},
}
for _sh in [situation, vote, outro, expA, expB, expC]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
total = seclen('situation') + TA + TB + TC + seclen('countdown') + seclen('outro')
print('Länge', round(total, 1), 's', 'audio' if dur else 'geschätzt', {'situation': seclen('situation'), 'A': (cardA, sceneA), 'B': (cardB, sceneB), 'C': (cardC, sceneC), 'vote': seclen('countdown'), 'outro': seclen('outro')})
print('cues A', dict(scene=tA, zelt=c_zelt, t1=c_t1, t2=c_t2, t5=c_t5, up=(up0, up1), over=(over0, over1), ring=ringA, gap=gapA, set=setA, pull=pullA, close=closeA, end=endA))
print('cues B', dict(scene=tB, saw=saw0, cut=(cut0, cut1), grab=grab0, cycles=cyc, morgen=c_morgenB, kopf=c_kopf, hallo=c_hallo))
print('cues C', dict(scene=tC, slide=slide0, push=push_t, fuenf=c_fuenf, woche=c_woche, steht=c_steht, mit=c_mit, take=take))
