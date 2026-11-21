# Hilfsskript: erzeugt scenarios/spezial-tuer-druecken.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-tuer-druecken-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-schwarzes-loch.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, niemand wird verletzt, alles slapstickartig im Low-Poly-Cartoon-Stil.
# Bühne: Eingangshalle "eingangshalle" (Tür mit großem Schild „DRÜCKEN“ mitten in der Rückwand, zwei Säulen, dahinter ein sonniger Hof).
#  Situation: Dummy zieht mit aller Kraft an der Tür, „DRÜCKEN“ leuchtet direkt über ihm – die Tür gibt keinen Millimeter nach.
#  A: (Karte) Knallfrosch an die Tür kleben, Zündschnur brennt, Dummy rennt hinter die linke Säule in Deckung und hält sich die Ohren zu.
#     (Szene) „BUMM!“ – Comic-Knall mit Rauchwölkchen + Konfetti, die Tür fliegt nach HINTEN in den Hof (weg vom Dummy). Dummy kommt
#     unversehrt hervor, spaziert durch die leere Öffnung, Daumen hoch. Prüfung check_a: Dummy beim Knall hinter der Säule, ≥ 3,5 m weg.
#  B: (Karte) Dummy holt den Werkzeugkasten. (Szene) auf dem Tritt schraubt er mit dem Akkuschrauber eine Laufschiene über die Tür, das Blatt
#     hängt sich mit Laufrollen ein, er schiebt es ganz entspannt zur Seite, stolz, spaziert hindurch.
#  C: (Karte) Dummy wartet cool. (Szene) Butler-Dummy (Frack, Fliege, weiße Handschuhe) ploppt auf und verbeugt sich, drückt die Tür vornehm auf,
#     rollt den roten Teppich aus, der Dummy schreitet hindurch, der Butler verbeugt sich.
# Spezial-Regeln: 61–66 s, keine Dopplungen, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-tuer-druecken'
S = dict(
situation="Du ziehst mal wieder an einer Tür, obwohl groß DRÜCKEN dransteht. Volle Kraft voraus. Was machst du?",
o1c="Tür einfach wegbomben", o1s="A: Du sprengst die Tür mit einem lauten Knall – dann muss man weder ziehen noch drücken.",
o2c="Schiebetür daraus machen", o2s="B: Du baust daraus einfach eine Schiebetür.",
o3c="Butler öffnet ab jetzt", o3s="C: Du lässt dir ab jetzt jede Tür von deinem Butler aufmachen.",
e1="Ein lauter Knall, Tür weg. Muss man weder ziehen noch drücken. Problem erledigt.",
e2="Schiene dran, seitlich aufschieben. Fertig ist die Schiebetür. Ziehen und Drücken sind Geschichte.",
e3="Ab sofort übernimmt der Butler. Vornehm aufmachen, roten Teppich ausrollen – nie wieder falsch an der Tür ziehen.",
vote="Also, was machst du?",
# Outro des Inhabers Buchstabe für Buchstabe + (Spezial-Regel 5, Wunsch Inhaber) angehängt: „Neue Video-Ideen? Ab in die Kommentare!“
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr. Neue Video-Ideen? Ab in die Kommentare!",
)
EXTRA = {1: float(os.environ.get('EXA', 0.4)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.0))}
TAIL = float(os.environ.get('TAIL', 0.3))
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))
VOTE_LEN = float(os.environ.get('VOTE_LEN', 5.6))
NO_VOTE = os.environ.get('NO_VOTE', '0') == '1'

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'countdown': 0.1, 'outro': 0.3}
# Karte A braucht Zeit zum Ankleben + In-Deckung-Rennen (Kartentext ist lang genug), Karte B zum Werkzeug holen
MINLEN = {'situation': 5, 'option1': 5.4, 'option2': 3.6, 'explain1': 6, 'explain2': 6, 'explain3': 6, 'countdown': 5, 'outro': 3}
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
    """lokale Koordinaten (x links/rechts, z vorn) einer Figur mit Blickrichtung face → Welt-Versatz (dx, dz)"""
    th = math.radians(180 - face)
    return lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th)

class Cast:
    """Sichtbarkeit je Einstellung: Figur nur in [t0, t1] zeigen, sonst y −30 (wie spezial-schwarzes-loch)"""
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
# feste Plätze (Bühne eingangshalle, src/stage/Foyer.tsx FOYER; Tür src/actors/DoorProps.tsx PDOOR/PRAIL)
# =====================================================================================================
STAGE = 'eingangshalle'
WALL_Z = -3.0
LEAF_T = 0.05
HANDLE = (0.36, 1.02, WALL_Z + LEAF_T / 2 + 0.07 - LEAF_T / 2)      # Griffstange (vorn), z −2.93
SIGN = (0.0, 1.93, WALL_Z + 0.01)
PILLAR = (-2.3, -0.4); PW = 0.5
COVER = (-2.75, 0.15)                                               # Deckung hinter der linken Säule
def door(t, **kw):
    v = dict(door=0.0, glow=1.0, rumble=0.0, fill=0.0, rail=0.0, slide=0.0); v.update(kw)
    return K(t, 0.0, WALL_Z, 'park', 180, **v)
DOOR_PTS = [[-0.62, 0, WALL_Z], [0.62, 2.3, WALL_Z]]
SIGN_PTS = [[-0.45, 1.76, WALL_Z], [0.45, 2.1, WALL_Z]]
def body(x, z, h=1.95, w=0.42):
    return [[x - w, 0, z], [x + w, h, z]]

# Dummy zieht: Hände 0,45 m vor ihm an der Griffstange
DP = (HANDLE[0], HANDLE[2] + 0.45)

# =====================================================================================================
# Situation: Dummy zieht mit aller Kraft – „DRÜCKEN“ leuchtet über ihm – Tür rührt sich nicht – „Was machst du?“
# =====================================================================================================
L0 = 'situation'
TS = seclen(L0); ss = lambda s: s / TS
c_obw = cue(L0, 'situation', 'obwohl'); c_vol = cue(L0, 'situation', 'Volle'); c_was = cue(L0, 'situation', 'Was machst')
cs_ = Cast()
cs_.add('druecktuer', 0, 1, [door(0, rumble=1.0), door(r3(c_was - 0.003), rumble=1.0), door(c_was, rumble=0.0), door(1, rumble=0.0)])
DQ = (0.95, -1.45)
cs_.add('dummy', 0, c_was, [K(0, *DP, 'pulldoor', 0, sweat=0.0), K(c_vol, *DP, 'pulldoor', 0, sweat=0.4), K(r3(c_vol + ss(0.6)), *DP, 'pulldoor', 0, sweat=1.2),
                            K(c_was, *DP, 'pulldoor', 0, sweat=1.2)])
cs_.add('dummy', c_was, 1, [K(c_was, *DQ, 'gape', 195, sweat=0.6, question=0.0), K(r3(c_was + ss(0.35)), *DQ, 'gape', 195, question=1.0, sweat=0.0), K(1, *DQ, 'gape', 195, question=1.0, sweat=0.0)])
situation = {
 'camera': [
   *shot(0, c_obw - 0.003, F([*body(*DP), *DOOR_PTS], -30, 6, SIT), push=0.05),
   *shot(c_obw, c_vol - 0.003, F([*SIGN_PTS, [DP[0] - 0.3, 1.25, DP[1]], [DP[0] + 0.3, 1.9, DP[1]]], -14, 4, SIT), push=0.06),
   *shot(c_vol, c_was - 0.003, F([*body(*DP), [0.6, 0.0, WALL_Z], [0.6, 2.15, WALL_Z]], 26, 1, SIT), push=0.07),
   *shot(c_was, 1, F([*body(*DQ, 2.15), *DOOR_PTS], -10, 5, SIT), push=0.05),
 ],
 'actors': cs_.build(), 'stage': STAGE,
 'sfx': [{'t': 0.02, 'id': 'tuer-ruetteln', 'volume': 0.7}, {'t': r3(c_vol), 'id': 'tuer-ruetteln', 'volume': 0.85}],
}

# =====================================================================================================
# Antwort A: Karte = Knallfrosch ankleben, Zündschnur an, ab hinter die Säule. Szene = BUMM, Tür fliegt weg, Daumen hoch
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_knall = cue(A, 'explain1', 'Knall'); c_weg = cue(A, 'explain1', 'Tür weg'); c_muss = cue(A, 'explain1', 'Muss'); c_prob = cue(A, 'explain1', 'Problem')
DA = (-0.1, HANDLE[2] + 0.5)                       # vor der Tür, rechte Hand trifft x 0
CRACK = (0.0, 1.12, WALL_Z + 0.0)                  # Knallfrosch an der Tür (Rückseite an der Türfläche)
t_pl0 = sa(0.35); t_press = r3(t_pl0 + sa(0.85)); t_lit = r3(t_pl0 + sa(1.2))
t_run = r3(t_pl0 + sa(1.45))
RUN = [DA, (-1.2, -0.9), (-1.9, 0.45), COVER]
seg = [math.hypot(RUN[i + 1][0] - RUN[i][0], RUN[i + 1][1] - RUN[i][1]) for i in range(3)]
V_RUN = 3.6
t_cov = r3(t_run + sa(sum(seg) / V_RUN))
t_boom = r3(c_knall - sa(0.12))
cA = Cast()
cA.add('druecktuer', 0, 1, [door(0), door(r3(t_boom - 0.003)), door(t_boom, glow=0.0), door(r3(t_boom + sa(0.95)), glow=0.0, fill=1.0), door(1, glow=0.0, fill=1.0)])
keysD = [K(0, *DA, 'stand', 0), K(r3(t_pl0 - 0.003), *DA, 'stand', 0), K(t_pl0, *DA, 'plantcracker', 0), K(r3(t_run - 0.003), *DA, 'plantcracker', 0)]
acc = 0.0
for i in range(3):
    f = face_to(RUN[i], RUN[i + 1])
    keysD.append(K(r3(t_run + sa(acc / V_RUN)), *RUN[i], 'run', f))
    acc += seg[i]
keysD.append(K(r3(t_cov - 0.003), *COVER, 'run', face_to(RUN[2], RUN[3])))
FC = 150
keysD += [K(t_cov, *COVER, 'coverears', FC), K(r3(c_weg + sa(0.35)), *COVER, 'coverears', FC)]
# kommt unversehrt hervor, steht auf, spaziert durch die leere Öffnung, Daumen hoch in der Öffnung
DW1 = (-1.6, -0.3); DW2 = (-0.25, -2.2); DTH = (0.0, WALL_Z - 0.3)
t_up = r3(max(c_weg + sa(0.4), t_boom + sa(1.4))); t_w0 = r3(max(c_muss - sa(0.1), t_up + sa(0.5)))
t_w1 = r3(t_w0 + (c_prob - t_w0) * math.hypot(DW1[0] - COVER[0], DW1[1] - COVER[1]) / (math.hypot(DW1[0] - COVER[0], DW1[1] - COVER[1]) + math.hypot(DW2[0] - DW1[0], DW2[1] - DW1[1])))
t_w2 = r3(t_w1 + sa(math.hypot(DW2[0] - DW1[0], DW2[1] - DW1[1]) / 1.4))
keysD += [K(t_up, *COVER, 'stand', FC), K(r3(t_w0 - 0.003), *COVER, 'stand', face_to(COVER, DW1)),
          K(t_w0, *COVER, 'walk', face_to(COVER, DW1)), K(t_w1, *DW1, 'walk', face_to(DW1, DW2)), K(r3(c_prob - 0.003), *DW2, 'walk', face_to(DW1, DW2)),
          K(c_prob, *DTH, 'thumbsup', 180, cut=True), K(1, *DTH, 'thumbsup', 180)]
cA.add('dummy', 0, 1, keysD)
cA.add('knallfrosch', 0, t_boom, [K(0, *DA, 'park', 0, y=1.1, hand=1.0, drop=0.0, fill=0.0), K(r3(t_press - sa(0.1)), *DA, 'park', 0, y=1.1, hand=1.0, drop=0.0),
                                  K(t_press, CRACK[0], CRACK[2], 'park', 180, y=CRACK[1], hand=0.0, fill=0.0), K(t_lit, CRACK[0], CRACK[2], 'park', 180, y=CRACK[1], fill=0.0),
                                  K(t_boom, CRACK[0], CRACK[2], 'park', 180, y=CRACK[1], fill=1.0)])
cA.add('knallwolke', t_boom, 1, [K(t_boom, 0.0, WALL_Z + 0.35, 'park', 180, y=1.15, fill=0.0), K(r3(t_boom + sa(2.6)), 0.0, WALL_Z + 0.35, 'park', 180, y=1.15, fill=1.0)])
cA.add('konfetti', t_boom, 1, [K(t_boom, 0.0, WALL_Z + 0.5, 'burst', 180, y=0.9, size=0.4)])
def check_a():
    """Vorgabe Inhaber: Dummy steht beim Knall sicher hinter der Säule (Säule zwischen Tür und Dummy), niemand wird getroffen."""
    ks = cA.build()['dummy']
    k = [k for k in ks if k['t'] <= t_boom][-1]
    assert k['motion'] == 'coverears' and (k['x'], k['z']) == COVER, ('A: Dummy nicht in Deckung', k)
    # Säule liegt auf der Linie Tür → Dummy
    for u in [i / 50 for i in range(51)]:
        x = 0 + (COVER[0] - 0) * u; z = WALL_Z + (COVER[1] - WALL_Z) * u
        if abs(x - PILLAR[0]) < PW / 2 and abs(z - PILLAR[1]) < PW / 2: break
    else:
        raise AssertionError('A: Säule nicht zwischen Tür und Dummy')
    dist = math.hypot(COVER[0], COVER[1] - WALL_Z)
    assert dist > 3.5 and t_cov < t_boom, ('A: zu nah / zu spät', dist, t_cov, t_boom)
    # ab dem Knall bis zum Verziehen des Rauchs bleibt er in der Deckung
    assert t_up >= r3(t_boom + sa(1.3)) - 0.01, ('A: steht zu früh auf', t_up, t_boom)
    return round(dist, 2), round((t_boom - t_cov) * TA, 2)
P_COV = [[COVER[0] - 0.4, 0, COVER[1]], [COVER[0] + 0.4, 1.5, COVER[1]]]
camA = [
  # Karte: eine ruhige Einstellung – Tür, Säule und Deckungsplatz im Bild
  *shot(0, sA - 0.003, F([*DOOR_PTS, *body(*DA), [PILLAR[0] - 0.3, 0, PILLAR[1]], [PILLAR[0] + 0.3, 2.2, PILLAR[1]], *P_COV], 36, 8, ANS), push=0.03),
  # BUMM: Säule + Dummy in Deckung vorn links, Tür fliegt hinten weg
  *shot(sA, c_weg - 0.003, F([*DOOR_PTS, [0, 2.9, WALL_Z], *P_COV, [PILLAR[0] - 0.3, 0, PILLAR[1]], [PILLAR[0] + 0.3, 2.0, PILLAR[1]]], 42, 8, ANS), push=0.04),
  # Tür weg: leere Öffnung, Rauch verzieht sich, dahinter liegt das Türblatt im Hof
  *shot(c_weg, c_muss - 0.003, F([*DOOR_PTS, [0, 0.1, WALL_Z - 4.4]], 4, 6, ANS), push=0.07),
  # er spaziert los zur Öffnung
  *shot(c_muss, c_prob - 0.003, F([*P_COV, *body(*DW1), *body(*DW2), *DOOR_PTS], -12, 7, ANS), push=0.05),
  # Daumen hoch in der leeren Türöffnung
  *shot(c_prob, 1, F([*body(*DTH, 2.0), *DOOR_PTS], 6, 4, ANS), push=0.06),
]
expA = {
 'camera': camA, 'actors': cA.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_press - sa(0.05)), 'id': 'klick', 'volume': 0.5}, {'t': r3(t_lit), 'id': 'zuendschnur', 'volume': 0.55},
         {'t': r3(t_run), 'id': 'schritte-rennen', 'volume': 0.5}, {'t': r3(t_cov + sa(0.1)), 'id': 'zuendschnur', 'volume': 0.5},
         {'t': r3(t_boom), 'id': 'cartoon-bumm', 'volume': 0.95}, {'t': r3(t_boom + sa(0.05)), 'id': 'konfetti-knall', 'volume': 0.5},
         {'t': r3(c_prob), 'id': 'himmel-chor', 'volume': 0.35}],
}

# =====================================================================================================
# Antwort B: Karte = Werkzeug holen. Szene = Schiene anschrauben, einhängen, seitlich aufschieben, stolz, durchspazieren
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_sch = cue(B, 'explain2', 'Schiene'); c_seit = cue(B, 'explain2', 'seitlich'); c_fert = cue(B, 'explain2', 'Fertig'); c_zieh = cue(B, 'explain2', 'Ziehen')
STOOL = (0.0, WALL_Z + 0.33)
DSTOOL = (0.0, WALL_Z + 0.4)                       # steht oben auf dem Tritt
BOX_AT = (-0.85, WALL_Z + 0.45)
cB = Cast()
t_rail1 = r3(c_seit - sb(0.35))
t_sl0 = r3(c_seit + sb(0.15)); t_sl1 = r3(min(c_fert - sb(0.05), t_sl0 + sb(1.3)))
cB.add('druecktuer', 0, 1, [door(0), door(sB), door(r3(sB + sb(0.25))), door(t_rail1, rail=1.0), door(t_sl0, rail=1.0), door(t_sl1, rail=1.0, slide=1.0), door(1, rail=1.0, slide=1.0)])
# Karte: mit dem Werkzeugkasten zur Tür, abstellen
DB0 = (-2.2, -0.6); DB1 = (BOX_AT[0] + 0.32, BOX_AT[1] + 0.28)
t_cb1 = r3(sb(math.hypot(DB1[0] - DB0[0], DB1[1] - DB0[1]) / 1.3) + sb(0.1))
cB.add('dummy', 0, sB, [K(0, *DB0, 'carrycase', face_to(DB0, DB1)), K(t_cb1, *DB1, 'carrycase', face_to(DB0, DB1)), K(r3(t_cb1 + sb(0.25)), *DB1, 'stand', 200),
                        K(sB, *DB1, 'stand', 200)])
cB.add('werkzeugkasten', 0, sB, [K(0, *DB0, 'park', face_to(DB0, DB1), hand=1.0, drop=0.34), K(t_cb1, *DB1, 'park', face_to(DB0, DB1), hand=1.0, drop=0.34),
                                 K(r3(t_cb1 + sb(0.2)), *BOX_AT, 'park', 200, hand=0.0)])
cB.add('werkzeugkasten', sB, 1, [K(sB, *BOX_AT, 'park', 200)])
cB.add('tritt', 0, c_seit, [K(0, *STOOL, 'park', 180)])
cB.add('tritt', c_seit, 1, [K(c_seit, -1.45, WALL_Z + 0.45, 'park', 160)])
# Szene: auf dem Tritt schrauben
cB.add('dummy', sB, c_seit, [K(sB, *DSTOOL, 'drillrail', 0, y=0.42), K(c_seit, *DSTOOL, 'drillrail', 0, y=0.42)])
# seitlich aufschieben: Hand an der Griffstange (rollt mit), Dummy schlurft mit
HZ = WALL_Z + LEAF_T / 2 + 0.11 + 0.07          # Griff vorn, wenn das Blatt in der Schiene hängt
DS0 = (HANDLE[0] + 0.05, HZ + 0.42); DS1 = (HANDLE[0] + 1.08 + 0.05, HZ + 0.42)
cB.add('dummy', c_seit, c_fert, [K(c_seit, *DS0, 'slidepush', 0), K(t_sl0, *DS0, 'slidepush', 0), K(t_sl1, *DS1, 'slidepush', 0), K(c_fert, *DS1, 'slidepush', 0)])
# Fertig: stolz neben der offenen Schiebetür
DF = (-0.95, -2.05)
cB.add('dummy', c_fert, c_zieh, [K(c_fert, *DF, 'armscross', 165)])
# Ziehen und Drücken sind Geschichte: spaziert durch die Öffnung in den Hof, dreht sich um, Daumen hoch
DZ0 = (-0.4, -1.3); DZ1 = (0.0, WALL_Z - 1.0)
t_z1 = r3(c_zieh + sb(math.hypot(DZ1[0] - DZ0[0], DZ1[1] - DZ0[1]) / 1.4))
cB.add('dummy', c_zieh, 1, [K(c_zieh, *DZ0, 'walk', face_to(DZ0, DZ1)), K(t_z1, *DZ1, 'walk', face_to(DZ0, DZ1)), K(r3(t_z1 + 0.003), *DZ1, 'thumbsup', 180), K(1, *DZ1, 'thumbsup', 180)])
RAIL_PTS = [[-0.7, 2.3, WALL_Z], [1.8, 2.42, WALL_Z]]
camB = [
  *shot(0, sB - 0.003, F([*body(*DB0), *body(*DB1), *DOOR_PTS, [-1.2, 0, WALL_Z]], 2, 6, ANS), push=0.03),
  *shot(sB, c_seit - 0.003, F([*body(DSTOOL[0], DSTOOL[1], 2.5), *RAIL_PTS], 24, 2, ANS), push=0.06),
  *shot(c_seit, c_fert - 0.003, F([*DOOR_PTS, [1.7, 0, WALL_Z], [1.7, 2.4, WALL_Z], *body(*DS0), *body(*DS1)], -12, 4, ANS), push=0.05),
  *shot(c_fert, c_zieh - 0.003, F([*body(*DF), [-0.62, 0, WALL_Z], [1.75, 2.45, WALL_Z]], 14, 5, ANS), push=0.05),
  *shot(c_zieh, 1, F([*body(*DZ0), *DOOR_PTS, [0, 0, DZ1[1]], [0, 1.95, DZ1[1]]], 4, 7, ANS), push=0.05),
]
expB = {
 'camera': camB, 'actors': cB.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_cb1 + sb(0.2)), 'id': 'paket-abstellen', 'volume': 0.5}, {'t': r3(sB + sb(0.35)), 'id': 'akkuschrauber', 'volume': 0.7},
         {'t': r3(t_rail1 - sb(0.1)), 'id': 'plopp', 'volume': 0.5}, {'t': r3(t_sl0), 'id': 'schiebetuer', 'volume': 0.8},
         {'t': r3(c_fert + sb(0.1)), 'id': 'gold-fanfare', 'volume': 0.35}],
}

# =====================================================================================================
# Antwort C: Karte = Dummy wartet cool. Szene = Butler ploppt auf + verbeugt sich, drückt die Tür auf, roter Teppich, Dummy schreitet hindurch
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_ab = cue(C, 'explain3', 'Ab sofort'); c_vor = cue(C, 'explain3', 'Vornehm'); c_rot = cue(C, 'explain3', 'roten'); c_nie = cue(C, 'explain3', 'nie wieder')
DCW = (0.0, 2.2)                                    # Dummy wartet am Ende des Teppichs
CARPET0 = (0.0, WALL_Z + 0.05)
cC = Cast()
# Tür: Butler drückt sie mit links auf (doorhold: drücken 0,3–1,0 s), danach schwingt sie vornehm ganz auf
BD = (HANDLE[0] + 0.35, HANDLE[2] + 0.5)            # Butler vor der Tür, linke Hand am Griff
t_dh = r3(c_vor - sc(0.05)); t_open1 = r3(t_dh + sc(1.0)); t_open2 = r3(t_open1 + sc(0.6))
cC.add('druecktuer', 0, 1, [door(0), door(t_dh + sc(0.3)), door(t_open1, door=0.25), door(t_open2, door=1.0), door(1, door=1.0)])
DCC = (1.0, -1.35)
cC.add('dummy', 0, sC, [K(0, *DCC, 'stand', 200), K(r3(sC * 0.25), *DCC, 'armscross', 200), K(sC, *DCC, 'armscross', 200)])
BB = (-0.8, WALL_Z + 0.55)
cC.add('butler', sC, c_vor, [K(sC, *BB, 'butlerstand', 160, shrink=1.0), K(r3(sC + sc(0.35)), *BB, 'butlerstand', 160, shrink=0.0),
                             K(r3(c_ab + sc(0.55)), *BB, 'bow', 160), K(c_vor, *BB, 'bow', 160)])
cC.add('dummy', sC, c_vor, [K(sC, *DCW, 'armscross', 180), K(c_vor, *DCW, 'armscross', 180)])
cC.add('butler', c_vor, c_rot, [K(c_vor, *BD, 'butlerstand', 0), K(t_dh, *BD, 'doorhold', 0), K(c_rot, *BD, 'doorhold', 0)])
# Teppich: Butler steht in der offenen Tür und gibt der Rolle einen Schubs
BCP = (0.0, WALL_Z - 0.38)
t_cp = r3(c_rot - sc(0.25)); t_c0 = r3(t_cp + sc(0.6)); t_c1 = r3(min(c_nie - sc(0.05), t_c0 + sc(1.3)))
cC.add('butler', c_rot, c_nie, [K(c_rot, *BCP, 'butlerstand', 180), K(t_cp, *BCP, 'carpetpush', 180), K(c_nie, *BCP, 'carpetpush', 180)])
cC.add('teppich', c_rot, 1, [K(c_rot, *CARPET0, 'park', 180, fill=0.0), K(t_c0, *CARPET0, 'park', 180, fill=0.0), K(t_c1, *CARPET0, 'park', 180, fill=1.0), K(1, *CARPET0, 'park', 180, fill=1.0)])
cC.add('dummy', c_vor, c_nie, [K(c_vor, *DCW, 'armscross', 180)])
# nie wieder falsch ziehen: Dummy schreitet über den Teppich durch die offene Tür, Butler verbeugt sich daneben
BN = (0.85, WALL_Z + 0.5)
DN1 = (0.0, WALL_Z - 0.9)
cC.add('butler', c_nie, 1, [K(c_nie, *BN, 'butlerstand', 205), K(r3(c_nie + sc(0.25)), *BN, 'bow', 205), K(1, *BN, 'bow', 205)])
cC.add('dummy', c_nie, 1, [K(c_nie, 0.0, 0.9, 'walk', 0), K(1, *DN1, 'walk', 0)])
CAR_PTS = [[-0.6, 0, WALL_Z], [0.6, 0, WALL_Z + 4.7]]
camC = [
  *shot(0, sC - 0.003, F([*body(*DCC), *DOOR_PTS], 0, 5, ANS), push=0.03),
  *shot(sC, c_vor - 0.003, F([*body(*BB), *DOOR_PTS], 22, 4, ANS), push=0.07),
  *shot(c_vor, c_rot - 0.003, F([*body(*BD), *DOOR_PTS], -26, 4, ANS), push=0.06),
  *shot(c_rot, c_nie - 0.003, F([*body(*BCP), *DOOR_PTS, *CAR_PTS, *body(*DCW)], 26, 14, ANS), push=0.04),
  *shot(c_nie, 1, F([*body(0.0, 0.9), *body(*BN), *DOOR_PTS, [0, 0, 1.2]], 26, 8, ANS), push=0.05),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sC + sc(0.05)), 'id': 'plopp', 'volume': 0.7}, {'t': r3(t_dh + sc(0.3)), 'id': 'tuer-knarren', 'volume': 0.5},
         {'t': r3(t_c0), 'id': 'teppich-rollen', 'volume': 0.7}, {'t': r3(c_nie + sc(0.1)), 'id': 'gold-fanfare', 'volume': 0.35}],
}

# =====================================================================================================
# Abstimmung + Outro: Dummy steht rechts vor der Tür (Schild frei), Butler links daneben, Tür zu, Schild leuchtet
# =====================================================================================================
DV = (0.95, -1.95); BV = (-0.95, -2.2)
def endcast(wave=False):
    c = Cast()
    c.add('druecktuer', 0, 1, [door(0)])
    c.add('dummy', 0, 1, [K(0, *DV, 'stand', 200, question=0.0 if wave else 1.0)] + ([K(0.12, *DV, 'wave', 200), K(1, *DV, 'wave', 200)] if wave else []))
    c.add('butler', 0, 1, [K(0, *BV, 'butlerstand', 160)])
    return c.build()
V_PTS = [*body(*DV), *body(*BV), *DOOR_PTS]
vote = {'camera': shot(0, 1, F(V_PTS, 4, 3, (120, 960, 1060, 1320)), push=0.04), 'actors': endcast(), 'stage': STAGE}
outro = {'camera': shot(0, 1, F(V_PTS, 6, 6, (100, 980, 780, 1110)), push=0.05), 'actors': endcast(True), 'stage': STAGE}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du ziehst mal wieder an einer Tür, obwohl „Drücken“ dransteht – was machst du? 🚪💥 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Niemand wurde verletzt. 😄\n\n"
        "#waswürdestdutun #tür #drücken #ziehen #butler #comedy #quiz #dummy #spezial\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': STAGE, 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy klebt einen überzogenen Cartoon-Knallfrosch an die Tür, zündet ihn an und geht hinter der linken Säule in sicherem Abstand in Deckung (Ohren zuhalten). Mit einem comichaften „BUMM!“ samt Rauchwölkchen und Konfetti fliegt die Tür nach hinten in den Hof – niemand wird getroffen. Der Dummy kommt unversehrt hervor, spaziert durch die leere Öffnung und zeigt Daumen hoch.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy holt den Werkzeugkasten, schraubt auf einem Tritt mit dem Akkuschrauber eine Laufschiene über die Tür, hängt das Türblatt mit Laufrollen ein und schiebt es ganz entspannt zur Seite. Stolz spaziert er hindurch – Schilder egal.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Ein Butler-Dummy mit Frack, Fliege und weißen Handschuhen ploppt auf, verbeugt sich, drückt die Tür vornehm auf und rollt einen kleinen roten Teppich aus. Der Dummy schreitet hindurch, der Butler verbeugt sich – alles comichaft und harmlos.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
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
print('A (Abstand Deckung–Tür m, s in Deckung vor dem Knall):', check_a(), '| Knall bei', round(t_boom * TA - cardA, 2), 's der Szene, Deckung bei', round(t_cov * TA, 2), 's der Karte')
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
