# Hilfsskript: erzeugt scenarios/spezial-pirat-token.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-pirat-token-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-waschmaschine, Bühne "gamingzimmer".
# Darstellung (Vorgabe Inhaber): „Fortnite“ und „Pirat-Token“ NUR gesprochen. KEINE echten Fortnite-Grafiken, keine Spieloberfläche, kein Logo,
# kein echtes Token-Motiv. Auf dem Laptop läuft ein selbst gestaltetes, buntes Insel-Spiel (Spielfigur, Palmen, Schatztruhen, die aufklappen und
# golden leuchten) + Zähler „Truhen geöffnet“. Plakat = selbst gestaltete goldene Piratenmünze (Totenkopf mit Piratenhut, Seil-Rand, Glanz),
# „PIRAT-TOKEN“, „Chance: 1 : 137.500 pro Schatztruhe“. Der Laptop dampft comichaft (Dampfwolken, rot glühende Tasten), kein Feuer.
#  A: Dummy schiebt den dampfenden Laptop zur Seite, holt den nächsten unter dem Tisch hervor, klappt ihn auf, spielt weiter; drunter liegen noch 3.
#  B: Dummy klappt den Laptop zu, der Dampf hört auf, er lehnt sich zurück und schaut das Plakat an.
#  C: Dummy spielt weiter, Zähler rast hoch, Dampf dichter, Tasten glühen; am Ende leuchtet eine goldene Münze auf, Dummy reißt die Arme hoch.
# Spezial-Regeln: Länge 61–66 s, keine Dopplungen, Abstimmung nur „Also, was machst du?“ + Countdown, „A, B oder C in die
# Kommentare“ nur EINMAL im Outro (+ markieren + folgen, Nachtrag Inhaber), keine Logos.
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-pirat-token'
S = dict(
situation="Du suchst mal wieder das Pirat-Token in Fortnite. Die Chance: eins zu hundertsiebenunddreißigtausendfünfhundert pro Schatztruhe. Und dein Laptop dampft schon. Was machst du?",
o1c="Nächster Laptop", o1s="A: Du holst den nächsten Laptop raus und spielst darauf weiter.",
o2c="Aufgeben, zuklappen", o2s="B: Du gibst auf und klappst den Laptop zu.",
o3c="Weiterspielen, bis es klappt", o3s="C: Du spielst auf dem dampfenden Laptop weiter, bis du das Token endlich findest.",
e1="Laptop zur Seite, nächster Laptop auf. Truhe auf, Truhe zu. Und unter dem Tisch warten noch drei weitere.",
e2="Klapp. Ruhe. Der Dampf verzieht sich. Das Token bleibt, wo es ist. Irgendwo in Truhe Nummer hundertsiebenunddreißigtausendfünfhundert.",
e3="Truhe auf. Nichts. Truhe auf. Nichts. Der Dampf wird dichter, die Tasten glühen. Aber du gibst nicht auf. Und dann: Gold.",
# Nachtrag Inhaber: „in die Kommentare“ nur EINMAL, dazu folgen + jemanden markieren, dem das auch immer passiert
# → Abstimmung nur „Also, was machst du?“, Outro wortgleich mit T-Rex/Waschmaschine (aus dem Zwischenspeicher, kostenlos).
vote="Also, was machst du?",
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr.",
)
EXTRA = {1: float(os.environ.get('EXA', 0.0)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.0))}
TAIL = float(os.environ.get('TAIL', 0.1))         # Pause nach jedem Clip (nur Pausen kürzen, Texte bleiben)
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))  # bei Bedarf: Schlussbild 2–3 s länger stehen lassen (Ziel ≥ 61 s)
VOTE_LEN = 5.6                                  # fest im Zeitplan (src/data/timeline.ts)
# Gesprochene Texte allein ca. 65 s → mit Abstimmung (5,6 s) wären es über 70 s, auch ohne Pausen. Texte bleiben unverändert,
# daher entfällt der Abstimmungs-Teil (wie bei Waschmaschine/Chef/Haus weg); „in die Kommentare“ kommt genau einmal im Outro.
NO_VOTE = os.environ.get('NO_VOTE', '1') == '1'

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'countdown': 0.1, 'outro': 0.3}   # wie src/data/timeline.ts
MINLEN = {'situation': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7, 'countdown': 5, 'outro': 3}
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
def sec(secname, s):
    return s / seclen(secname)
r3 = lambda x: round(x, 4)
def K(t, x, z, motion, face=None, **kw):
    d = {'t': r3(max(0, min(1, t))), 'x': round(x, 3), 'z': round(z, 3), 'motion': motion}
    if face is not None: d['face'] = round(face, 2)
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def cam(t, pos, look, fov=None):
    d = {'t': round(te(max(0, min(1, t))), 4), 'pos': [round(v, 3) for v in pos], 'look': look if isinstance(look, str) else [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
HIDE = -30
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
    c2 = [c[i] + (l[i] - c[i]) * push for i in range(3)]
    return c, l, c2, (fov if fov != 38 else None)
def shot(t0, t1, f):
    c, l, c2, fv = f
    return [cam(t0, c, l, fv), cam(t1, c2, l, fv)]
def mshot(t0, t1, pos, look, fov=None, push=0.06):
    p2 = [pos[i] + (look[i] - pos[i]) * push for i in range(3)]
    return [cam(t0, pos, look, fov), cam(t1, p2, look, fov)]
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)
def path(t0, t1, pts, motion, face=None, **kw):
    L = [0.0]
    for i in range(1, len(pts)):
        L.append(L[-1] + math.dist(pts[i - 1], pts[i]))
    out = []
    for i, p in enumerate(pts):
        f = face if face is not None else face_to(pts[max(0, i - 1)], pts[min(len(pts) - 1, max(1, i))])
        out.append(K(t0 + (t1 - t0) * L[i] / L[-1], *p, motion, f, **kw))
    return out
def hide_from(keys, t):
    """Figur ab t ausblenden (Bühnenwechsel)"""
    last = dict(keys[-1]); last['t'] = r3(t); last['y'] = -5000; last.pop('cut', None)
    prev = dict(keys[-1]); prev['t'] = r3(t - 0.002)
    keys.extend([prev, last])

# ---- feste Plätze (src/stage/Bedroom.tsx: GAMING, src/actors/GamingProps.tsx: GamingLaptop) ----
D = (-1.1, -0.95)                 # Dummy sitzt auf dem Gaming-Stuhl, Blick zur Rückwand (face 0)
DESK_H = 0.75
LAP = (-1.1, -1.38)               # Laptop: Tastatur 0,43 m vor ihm (face 180 = Bildschirm zum Dummy)
LAP_ASIDE = (-1.5, -1.38)         # weggeschobener Laptop (0,4 m nach links)
STACK = (-0.70, -1.45)            # Laptop-Stapel unter dem Tisch rechts neben ihm (quer, face 90)
POSTER = (-1.1, 1.68, -1.885)
SCREEN = (-1.1, 0.9, -1.53)       # Bildschirmmitte (offen)
HEAD = (-1.1, 1.22, -1.05)
COUNT0 = 48213                    # Zählerstand zu Beginn
# feste Kamera-Blickwinkel (Wände von außen unsichtbar; nie hinter die Stuhllehne, nie in den Dummy)
CAM_W = ([0.75, 1.85, 1.05], [-1.0, 1.0, -1.25], 38)        # Totale schräg von hinten rechts: Tisch, Laptop, Plakat, RGB
CAM_R = ([0.5, 1.3, -1.1], [-1.1, 1.0, -1.3], 40)            # rechts seitlich: Dummy im Profil + Laptop + Dampf
CAM_S = ([-0.42, 1.36, -0.95], [-1.02, 0.9, -1.53], 38)          # über die rechte Schulter auf den Bildschirm
CAM_F = ([-0.85, 1.8, -3.3], [-1.1, 1.05, -1.0], 30)         # von vorn durch die (unsichtbare) Rückwand, unter dem Plakat durch
CAM_U = ([-0.2, 0.26, -0.78], [-0.70, 0.1, -1.45], 42)      # ganz tief: unter den Tisch auf den Stapel
CAM_K = ([-0.45, 1.05, -1.0], [-1.1, 0.8, -1.4], 36)          # nah an Tastatur + Dampf (von rechts)
CAM_L = ([-0.95, 1.8, 0.75], [-1.1, 1.5, -1.88], 40)        # hinter dem zurückgelehnten Dummy, Blick zum Plakat        # tief rechts: zurückgelehnt, Blick hoch zum Plakat
def cs(t0, t1, c, push=0.06):
    return mshot(t0, t1, c[0], c[1], c[2], push=push)

def lap(t, x=LAP[0], z=LAP[1], **kw):
    kw.setdefault('y', DESK_H)
    return K(t, x, z, 'park', kw.pop('face', 180), **kw)
def sit(t, motion, **kw):
    return K(t, *D, motion, 0, y=0.0, **kw)
def stack(t, n):
    return K(t, *STACK, 'park', 90, y=0.0, fill=float(n))
ROOM_PTS = [[-1.75, 0, -1.9], [-0.45, 0, -1.25], [-1.75, 2.14, -1.9], [-0.45, 2.14, -1.9], [-1.1, 0, -0.55], [-0.2, 0, -0.6]]
DESK_PTS = [[-1.6, 0.75, -1.2], [-0.6, 0.75, -1.2], [-1.1, 1.35, -0.95], [-1.1, 0.55, -0.6], [-1.1, 1.05, -1.6]]
POSTER_PTS = [[POSTER[0] - 0.36, POSTER[1] - 0.49, POSTER[2]], [POSTER[0] + 0.36, POSTER[1] + 0.49, POSTER[2]]]

# =====================================================================================================
# Situation: Gaming-Zimmer am Abend – Dummy hämmert auf die Tasten – Plakat – dampfender Laptop
# =====================================================================================================
L0 = 'situation'
c_chance = cue(L0, 'situation', 'Die Chance')
c_und = cue(L0, 'situation', 'Und dein')
c_was = cue(L0, 'situation', 'Was machst')
TS = seclen(L0)
a = {'gaminglaptop': [lap(0, lid=1.0, fill=float(COUNT0), mark=0.8, smoke=0.5, glow=0.3), lap(r3(c_und), fill=float(COUNT0 + 12), smoke=0.9, glow=0.45),
                      lap(1, fill=float(COUNT0 + 16), smoke=1.1, glow=0.55)],
     'laptopstapel': [stack(0, 4)],
     'dummy': [sit(0, 'keyhammer'), sit(r3(c_und + sec(L0, 0.5) - 0.003), 'keyhammer'), sit(r3(c_und + sec(L0, 0.5)), 'fansteam'),
               sit(r3(c_was - 0.003), 'fansteam'), sit(c_was, 'screenstare')]}
situation = {
 'camera': [
   # 1) ganzes Zimmer: Gaming-Ecke mit RGB, Plakat, Dummy hämmert auf die Tasten
   *cs(0, r3(c_chance - 0.003), CAM_W, push=0.1),
   # 2) Die Chance …: das Plakat (eigene Münze, Chance-Zeile gut lesbar)
   *shot(c_chance, r3(c_und - 0.003), F(POSTER_PTS, 6, 6, (130, 950, 300, 1180), push=0.08)),
   # 3) Und dein Laptop dampft schon: über die rechte Schulter auf den dampfenden Laptop
   *cs(c_und, r3(c_was - 0.003), CAM_R, push=0.1),
   # 4) Was machst du?: schräg von vorn rechts (hinter dem Tisch) – Dummy starrt in den Dampf
   *cs(c_was, 1, CAM_F, push=0.05),
 ],
 'actors': a,
 'sfx': [{'t': 0.0, 'id': 'tastatur', 'volume': 0.55}, {'t': r3(c_und + sec(L0, 0.1)), 'id': 'dampf', 'volume': 0.45}],
}

# =====================================================================================================
# Antwort A: Laptop zur Seite – nächsten Laptop unter dem Tisch hervorholen – aufklappen – weiterspielen – noch 3 unter dem Tisch
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA)
sa = lambda s: s / TA
c_zur = cue(A, 'explain1', 'Laptop zur')
c_naech = cue(A, 'explain1', 'nächster')
c_truhe = cue(A, 'explain1', 'Truhe auf')
c_unter = cue(A, 'explain1', 'Und unter')
t_push = sA
t_grab = r3(t_push + sa(0.9))
t_take = r3(t_grab + sa(0.85))     # Griff: Laptop vom Stapel
t_high = r3(t_grab + sa(1.7))
t_set = r3(t_grab + sa(2.0))
t_open = r3(t_grab + sa(2.1))
t_play = r3(t_open + sa(1.25))
G_HIGH = (D[0], D[1] - 0.38)
dumA = [sit(0, 'keyhammer'), sit(r3(t_push - 0.003), 'keyhammer'), sit(t_push, 'pushaside', cut=True), sit(r3(t_grab - 0.003), 'pushaside'),
        sit(t_grab, 'grablaptop'), sit(r3(t_open - 0.003), 'grablaptop'), sit(t_open, 'lidopen'), sit(r3(t_play - 0.003), 'lidopen'),
        sit(t_play, 'keyhammer'), sit(1, 'keyhammer')]
lap1A = [lap(0, lid=1.0, fill=float(COUNT0 + 16), mark=0.8, smoke=1.1, glow=0.55), lap(r3(t_push + sa(0.2)), smoke=1.1),
         lap(r3(t_push + sa(0.9)), *LAP_ASIDE, smoke=1.2, glow=0.45), lap(1, *LAP_ASIDE, smoke=1.0, glow=0.35)]
lap2A = [K(0, *STACK, 'park', 90, y=HIDE, lid=0.0, fill=float(COUNT0 + 17), mark=0.75, turn=0.0, smoke=0.0, glow=0.0),
         K(r3(t_take - 0.003), *STACK, 'park', 90, y=HIDE),
         K(t_take, STACK[0] - 0.02, STACK[1] + 0.05, 'park', 90, y=0.15), K(t_high, *G_HIGH, 'park', 180, y=0.93),
         K(t_set, *LAP, 'park', 180, y=DESK_H, lid=0.0), K(r3(t_open + sa(0.15)), *LAP, 'park', 180, lid=0.0),
         K(r3(t_open + sa(0.85)), *LAP, 'park', 180, lid=1.0), K(1, *LAP, 'park', 180, lid=1.0, fill=float(COUNT0 + 20), smoke=0.15)]
stackA = [stack(0, 4), stack(r3(t_take - 0.003), 4), stack(t_take, 3), stack(1, 3)]
aA = {'gaminglaptop': lap1A, 'gaminglaptop2': lap2A, 'laptopstapel': stackA, 'dummy': dumA}
camA = [
  # Karte: Dummy hämmert auf den dampfenden Laptop (ruhige Einstellung, schräg von hinten rechts)
  *cs(0, r3(sA - 0.003), CAM_W, push=0.05),
  # Laptop zur Seite: von oben rechts, man sieht den Laptop nach links rutschen
  *mshot(t_push, r3(t_grab + sa(0.15) - 0.003), [-2.6, 1.6, -0.6], [-1.2, 0.85, -1.4], 40, push=0.06),
  # nächster Laptop auf: tief von rechts – er greift unter den Tisch, hebt den Laptop hoch, klappt ihn auf
  *mshot(t_grab + sa(0.15), r3(c_truhe - 0.003), [0.15, 0.55, -3.1], [-0.8, 0.42, -1.3], 36, push=0.06),
  # Truhe auf, Truhe zu: der neue Bildschirm über die Schulter
  *cs(c_truhe, r3(c_unter - 0.003), CAM_S, push=0.12),
  # Und unter dem Tisch warten noch drei weitere: ganz tief, Blick unter den Tisch auf den Stapel
  *cs(c_unter, 1, CAM_U, push=0.12),
]
expA = {
 'camera': camA,
 'actors': aA,
 'sfx': [{'t': r3(t_push + sa(0.2)), 'id': 'papier-schieben', 'volume': 0.5}, {'t': r3(t_take), 'id': 'geschenk-rascheln', 'volume': 0.35},
         {'t': r3(t_open + sa(0.1)), 'id': 'laptop-auf', 'volume': 0.6}, {'t': r3(t_play), 'id': 'tastatur', 'volume': 0.5},
         {'t': r3(c_truhe), 'id': 'truhe-auf', 'volume': 0.55}],
}

# =====================================================================================================
# Antwort B: Klapp. Ruhe. Dampf verzieht sich – zurücklehnen – Plakat anschauen
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB)
sb = lambda s: s / TB
c_klapp = cue(B, 'explain2', 'Klapp')
c_ruhe = cue(B, 'explain2', 'Ruhe')
c_dampf = cue(B, 'explain2', 'Der Dampf')
c_token = cue(B, 'explain2', 'Das Token')
c_irg = cue(B, 'explain2', 'Irgendwo')
t_close = r3(max(sB - sb(0.5), c_klapp - sb(1.2)))   # Deckel fällt kurz nach „Klapp.“ zu (langsam zuklappen)
t_shut = r3(t_close + sb(1.5))
dumB = [sit(0, 'keyhammer'), sit(r3(t_close - 0.003), 'keyhammer'), sit(t_close, 'closelean', cut=True), sit(1, 'closelean')]
lapB = [lap(0, lid=1.0, fill=float(COUNT0 + 16), mark=0.8, smoke=1.1, glow=0.55), lap(r3(t_close + sb(0.2)), lid=1.0),
        lap(t_shut, lid=0.0, glow=0.0, smoke=0.9), lap(r3(c_dampf + sb(1.6)), smoke=0.0), lap(1, smoke=0.0)]
aB = {'gaminglaptop': lapB, 'laptopstapel': [stack(0, 4)], 'dummy': dumB}
camB = [
  # Karte: Dummy am dampfenden Laptop, ruhig von schräg vorn rechts
  *cs(0, r3(sB - 0.003), CAM_F, push=0.04),
  # Klapp.: nah am Laptop, Deckel klappt langsam zu
  *cs(sB, r3(c_ruhe - 0.003), CAM_R, push=0.08),
  # Ruhe. Der Dampf verzieht sich: zugeklappter Laptop, letzte Dampfwolken
  *cs(c_ruhe, r3(c_token - 0.003), CAM_W, push=0.08),
  # Das Token bleibt, wo es ist: hinter dem zurückgelehnten Dummy, Blick hoch zum Plakat
  *cs(c_token, r3(c_irg - 0.003), CAM_L, push=0.06),
  # Irgendwo in Truhe Nummer 137.500: das Plakat ganz nah
  *shot(c_irg, 1, F(POSTER_PTS, 4, 4, (150, 930, 330, 1170), push=0.1)),
]
expB = {
 'camera': camB,
 'actors': aB,
 'sfx': [{'t': r3(t_shut - sb(0.35)), 'id': 'laptop-zuklappen', 'volume': 0.8}, {'t': r3(c_dampf), 'id': 'dampf', 'volume': 0.25}],
}

# =====================================================================================================
# Antwort C: Truhe auf. Nichts. (×2) – Dampf dichter, Tasten glühen – nicht aufgeben – Gold!
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC)
sc = lambda s: s / TC
c_t1 = cue(C, 'explain3', 'Truhe auf')
c_n1 = cue(C, 'explain3', 'Nichts')
c_t2 = cue(C, 'explain3', 'Truhe auf', nth=1)
c_n2 = cue(C, 'explain3', 'Nichts', nth=1)
c_dd = cue(C, 'explain3', 'Der Dampf')
c_tast = cue(C, 'explain3', 'die Tasten')
c_aber = cue(C, 'explain3', 'Aber du')
c_dann = cue(C, 'explain3', 'Und dann')
c_gold = cue(C, 'explain3', 'Gold')
# Truhen-Zyklus so legen, dass bei jedem „Truhe auf“ eine Truhe aufspringt
per = (c_t2 - c_t1) * TC
rate = round(1 / per, 4)
phase = round((-(c_t1 * TC - 0.15) * rate) % 1, 4)
t_gold = r3(c_gold - sc(0.05))
t_cheer = r3(c_gold + sc(0.25))
lapC = [lap(0, lid=1.0, fill=float(COUNT0 + 16), mark=rate, turn=phase, smoke=1.1, glow=0.55), lap(r3(c_dd), fill=float(COUNT0 + 18), smoke=1.2, glow=0.6),
        lap(r3(c_dd + 0.003), mark=4.0, turn=0.0), lap(r3(c_tast + sc(0.6)), smoke=1.9, glow=1.0, fill=float(COUNT0 + 9000)),
        lap(r3(t_gold - 0.003), fill=137499.0, smoke=2.0, glow=1.0, good=0.0), lap(t_gold, fill=137500.0, mark=0.0001, good=0.0),
        lap(r3(t_gold + sc(0.5)), good=1.0, smoke=1.6), lap(1, good=1.0, smoke=1.4, glow=0.8, fill=137500.0)]
dumC = [sit(0, 'keyhammer'), sit(r3(c_n1 - 0.003), 'keyhammer'), sit(c_n1, 'screenstare'), sit(r3(c_t2 - 0.003), 'screenstare'),
        sit(c_t2, 'keyhammer'), sit(r3(c_n2 - 0.003), 'keyhammer'), sit(c_n2, 'screenstare'), sit(r3(c_dd - 0.003), 'screenstare'),
        sit(c_dd, 'fansteam'), sit(r3(c_tast - 0.003), 'fansteam'), sit(c_tast, 'keyhammer'), sit(r3(t_cheer - 0.003), 'keyhammer'),
        sit(t_cheer, 'seatcheer'), sit(1, 'seatcheer')]
aC = {'gaminglaptop': lapC, 'laptopstapel': [stack(0, 4)], 'dummy': dumC}
camC = [
  # Karte: Dummy am dampfenden Laptop, ruhig von hinten links (andere Seite)
  *cs(0, r3(sC - 0.003), CAM_R, push=0.05),
  # Truhe auf.: Bildschirm
  *cs(sC, r3(c_n1 - 0.003), CAM_S, push=0.1),
  # Nichts.: Dummy starrt (schräg von vorn)
  *cs(c_n1, r3(c_t2 - 0.003), CAM_F, push=0.06),
  # Truhe auf.: Bildschirm, etwas näher
  *mshot(c_t2, r3(c_n2 - 0.003), [-0.55, 1.28, -1.05], [-1.02, 0.9, -1.53], 34, push=0.1),
  # Nichts.: von hinten links, Dampf steigt
  *cs(c_n2, r3(c_dd - 0.003), CAM_F, push=0.08),
  # Der Dampf wird dichter, die Tasten glühen: nah an Tastatur + Dampf, Zähler rast
  *cs(c_dd, r3(c_aber - 0.003), CAM_K, push=0.12),
  # Aber du gibst nicht auf: weiter, schräg von vorn, alles dampft
  *cs(c_aber, r3(c_dann - 0.003), CAM_W, push=0.08),
  # Und dann: Gold.: Bildschirm – goldene Münze
  *cs(c_dann, r3(t_cheer + sc(0.15) - 0.003), CAM_S, push=0.06),
  # Arme hoch: Dummy jubelt im goldenen Licht
  *cs(t_cheer + sc(0.15), 1, CAM_W, push=0.06),
]
expC = {
 'camera': camC,
 'actors': aC,
 'sfx': [{'t': r3(c_t1 + sc(0.05)), 'id': 'truhe-auf', 'volume': 0.5}, {'t': r3(c_t2 + sc(0.05)), 'id': 'truhe-auf', 'volume': 0.5},
         {'t': r3(c_dd), 'id': 'dampf', 'volume': 0.5}, {'t': r3(c_tast), 'id': 'zaehler-rattern', 'volume': 0.45}, {'t': r3(c_tast), 'id': 'tastatur', 'volume': 0.5},
         {'t': r3(t_gold), 'id': 'gold-fanfare', 'volume': 0.7}, {'t': r3(t_gold + sc(0.1)), 'id': 'himmel-chor', 'volume': 0.3}],
}

# =====================================================================================================
# Abstimmung: Dummy steht neben dem Gaming-Tisch, Laptop dampft leicht, Kamera tief + ruhig
# =====================================================================================================
VP = (-0.35, -0.55)
lapV = [lap(0, lid=1.0, fill=float(COUNT0 + 16), mark=0.8, smoke=0.8, glow=0.4)]
aV = {'gaminglaptop': lapV, 'laptopstapel': [stack(0, 4)], 'dummy': [K(0, *VP, 'stand', 200, y=0.0, question=1)]}
V_PTS = [[VP[0] - 0.35, 0, VP[1]], [VP[0] + 0.35, 1.9, VP[1]], [-0.75, 0.75, -1.25]]
vote = {'camera': shot(0, 1, F(V_PTS, 18, 4, (120, 960, 1060, 1320), push=0.04)), 'actors': aV}

# =====================================================================================================
# Outro: Dummy winkt neben dem Gaming-Tisch
# =====================================================================================================
aO = {'gaminglaptop': lapV, 'laptopstapel': [stack(0, 4)],
      'dummy': [K(0, *VP, 'stand', 195, y=0.0), K(0.12, *VP, 'wave', 195), K(1, *VP, 'wave', 195)]}
O_PTS = [[VP[0] - 0.4, 0, VP[1]], [VP[0] + 0.4, 0, VP[1]], [VP[0], 1.95, VP[1]], [-0.85, 0.75, -1.3]]
outro = {'camera': shot(0, 1, F(O_PTS, 16, 6, (100, 980, 780, 1110), push=0.05)), 'actors': aO}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du suchst mal wieder das Pirat-Token in Fortnite, aber dein Laptop dampft – was machst du? 🏴‍☠️ Schreib A, B oder C in die Kommentare!\n\n"
        "Chance laut Community: 1 zu 137.500 pro Schatztruhe. Nur zum Spaß, und bitte keinen überhitzten Laptop weiterbenutzen. 😄\n\n"
        "#waswürdestdutun #fortnite #pirattoken #gaming #laptop #spezial #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert. Nicht mit Epic Games verbunden.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'gamingzimmer', 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy schiebt den dampfenden Laptop zur Seite, zieht den nächsten unter dem Tisch hervor, klappt ihn auf und spielt weiter (Truhe auf, Truhe zu). Unter dem Tisch liegen noch drei weitere.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy klappt den Laptop langsam zu, der Dampf hört auf, er lehnt sich zurück und schaut das Plakat an der Wand an (selbst gestaltete Piratenmünze, Chance 1 : 137.500).', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy spielt weiter: Truhe auf, leer, Truhe auf, leer. Der Zähler „Truhen geöffnet“ rast hoch, der Dampf wird dichter, die Tasten glühen rot. Bei 137.500 leuchtet auf dem Bildschirm eine goldene Münze auf, der Dummy reißt die Arme hoch.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Kommentieren & folgen!'},
 'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team ___. Und du? 👇 Hast du das Pirat-Token schon gefunden?'},
 'shots': {'situation': situation, 'countdown': vote, 'outro': outro},
}
if OUTRO_MIN > 0: scen['outroMin'] = OUTRO_MIN
if NO_VOTE: scen['noVote'] = True
for _sh in [situation, vote, outro, expA, expB, expC]:
    _sh['sharpCuts'] = True
    for keys in _sh['actors'].values():
        keys.sort(key=lambda k: k['t'])
        y = None
        for k in keys:
            if 'y' in k: y = k['y']
            elif y is not None and not k.get('attach'): k['y'] = y
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
total = seclen('situation') + TA + TB + TC + (0 if NO_VOTE else seclen('countdown')) + seclen('outro')
print('Länge', round(total, 2), 's', 'audio' if dur else 'geschätzt',
      {'situation': seclen('situation'), 'A': (cardA, sceneA), 'B': (cardB, sceneB), 'C': (cardC, sceneC), 'vote': seclen('countdown'), 'outro': seclen('outro')})
print('A: Laptop offen bei', round((t_open + sa(0.85)) * TA - cardA, 2), 's der Szene, „Truhe auf“ bei', round(c_truhe * TA - cardA, 2),
      '| B: zu bei', round(t_shut * TB - cardB, 2), '„Klapp“', round(c_klapp * TB - cardB, 2), '| C: Rate', rate, 'Phase', phase)
if total < 61: print('ACHTUNG: unter 61 s – Szenen verlängern / Schlussbild stehen lassen')
if total > 66: print('ACHTUNG: über 66 s – Pausen kürzen')
