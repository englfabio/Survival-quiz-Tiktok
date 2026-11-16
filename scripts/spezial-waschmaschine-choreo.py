# Hilfsskript: erzeugt scenarios/spezial-waschmaschine.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-waschmaschine-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-trex-stau, Bühne "waschkeller".
# Darstellung (Vorgabe Inhaber): comichaft + harmlos. Die Waschmaschine ist IMMER AUS: keine drehende Trommel, kein Wasser, kein
# Waschgang, Anzeige dunkel, Knopf auf 0 (Kinder sollen das nicht nachmachen wollen). Waschmaschine comichaft übergroß (XXL).
#  A: Kamera fährt durch das Bullauge in einen riesigen Innenraum (Bühne "trommel-innen") voller Socken, Knöpfe, Münzen, Haargummis,
#     Kassenzettel …; der Dummy stapft durch die Sockenberge und hält am Ende die Lieblingssocke hoch wie einen Schatz.
#  B: Dummy macht es sich in der Trommel gemütlich: Handtuch als Decke, Weichspüler dampft wie eine Duftkerze, Pulli als Kissen.
#  C: Dummy klopft ans Bullauge und ruft, die Tür geht auf, der Stiefbruder (lila Dummy) schaut herein, öffnet die Tür ganz,
#     hält ihm die Hand hin und zieht ihn heraus.
# Spezial-Regeln: Länge 61–66 s, keine Dopplungen, Abstimmung nur „Also, was machst du?“ + Countdown, „A, B oder C in die
# Kommentare“ nur EINMAL im Outro (+ markieren + folgen), keine Logos.
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-waschmaschine'
S = dict(
situation="Du bist mal wieder in die Waschmaschine gefallen. Keine Ahnung, wie. Aber du steckst drin. Was machst du?",
o1c="Socken suchen", o1s="A: Du suchst alle Socken, die du in den letzten zehn Jahren verloren hast.",
o2c="Gemütlich einrichten", o2s="B: Du richtest es dir gemütlich ein. Duschen musst du dann auch nicht mehr. Win-win.",
o3c="Um Hilfe rufen", o3s="C: Du rufst um Hilfe. Aber der Einzige, der kommt, ist dein Stiefbruder.",
e1="Drinnen ist es riesig. Socken, Knöpfe, ein paar Münzen, ein Haargummi. Alles, was jemals in einer Waschmaschine verschwunden ist. Und da hinten: deine Lieblingssocke von 2016.",
e2="Handtuch als Decke, Weichspüler als Duftkerze. Gemütlicher wird's nicht. Und duschen? Brauchst du nie wieder.",
e3="Du klopfst ans Glas und rufst um Hilfe. Die Tür geht auf. Es ist dein Stiefbruder. Er macht die Tür der Waschmaschine auf und hält dir eine Hand hin und holt dich raus.",
# Vorgabe Inhaber (Nachtrag): „in die Kommentare“ nur EINMAL, dazu folgen + jemanden markieren → Abstimmung nur „Also, was machst du?“
vote="Also, was machst du?",
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr.",
)
EXTRA = {1: float(os.environ.get('EXA', 0.0)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.0))}
TAIL = float(os.environ.get('TAIL', 0.05))         # Pause nach jedem Clip (nur Pausen kürzen, Texte bleiben)
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))  # bei Bedarf: Schlussbild 2–3 s länger stehen lassen (Ziel ≥ 61 s)
VOTE_LEN = 5.6                                  # fest im Zeitplan (src/data/timeline.ts)
# Gesprochene Texte allein 64,3 s → mit Abstimmung (5,6 s) wären es über 66 s, auch ohne Pausen. Texte bleiben unverändert,
# daher entfällt der Abstimmungs-Teil (wie bei Chef/Haus weg); „in die Kommentare“ kommt genau einmal im Outro.
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

# ---- feste Plätze (src/stage/Laundry.tsx: WASCH, src/actors/WaschProps.tsx: WM) ----
MX, MZ = 0.5, -1.45            # XXL-Waschmaschine, face 180 (Front zur Kamera) → lokales System = Welt-Versatz
CY = 1.25                       # Bullauge-Mitte
FLOOR = 0.43                    # Trommelboden
FRONT = MZ + 1.0                # Vorderwand z −0.45
GLASS = MZ + 1.09               # Glas z ≈ −0.36
def wm(t=0, **kw):
    return K(t, MX, MZ, 'park', 180, y=0.0, **kw)
D_PEEK = (MX, MZ + 0.45)        # sitzt + schaut durchs Bullauge (Hände am Glas)
D_LOUNGE = (MX, MZ - 0.05)      # gemütlich zurückgelehnt, Beine Richtung Tür
D_KNOCK = (MX, MZ + 0.57)       # kniet am Glas und klopft
DRUM_PTS = [[MX - 0.85, CY - 0.85, GLASS], [MX + 0.85, CY + 0.85, GLASS], [MX, CY, GLASS]]
WM_PTS = [[MX - 1.0, 0, FRONT], [MX + 1.0, 0, FRONT], [MX - 1.0, 2.6, FRONT], [MX + 1.0, 2.6, FRONT], [MX + 1.0, 0, MZ - 1.0]]
def peek(t, motion='drumpeek', **kw):
    return K(t, *D_PEEK, motion, 180, y=FLOOR, **kw)

# =====================================================================================================
# Situation: Waschkeller – XXL-Waschmaschine (AUS) – Dummy sitzt drin und schaut durchs Bullauge
# =====================================================================================================
L0 = 'situation'
c_keine = cue(L0, 'situation', 'Keine Ahnung')
c_aber = cue(L0, 'situation', 'Aber du')
c_was = cue(L0, 'situation', 'Was machst')
a = {'waschmaschine': [wm(0, door=0.0)],
     'dummy': [peek(0), peek(r3(c_keine), question=0), peek(r3(c_keine + sec(L0, 0.4)), question=1), peek(r3(c_aber - 0.003), question=1),
               peek(c_aber, question=0)]}
situation = {
 'camera': [
   # 1) Waschkeller: Maschine (aus) + Wäschekorb, drinnen der Dummy
   *shot(0, r3(c_keine - 0.003), F(WM_PTS + [[-2.1, 0, -1.2], [-1.4, 0.42, -0.8]], 15, 8, SIT, push=0.1)),
   # 2) Keine Ahnung, wie: nah durchs Bullauge
   *shot(c_keine, r3(c_aber - 0.003), F(DRUM_PTS, 0, 4, push=0.08)),
   # 3) Aber du steckst drin: aus der Trommel nach draußen, hinter dem Dummy
   *mshot(c_aber, r3(c_was - 0.003), [MX + 0.25, 1.9, MZ - 0.7], [MX, 0.9, 1.8], 72, push=0.04),
   # 4) Was machst du? – von vorn, Hände am Glas
   *shot(c_was, 1, F([[MX - 0.55, 0.5, GLASS], [MX + 0.55, 1.75, GLASS]], 355, 6, push=0.06)),
 ],
 'actors': a,
 'sfx': [{'t': r3(c_keine + sec(L0, 0.1)), 'id': 'glas-klopfen', 'volume': 0.25}],
}

# =====================================================================================================
# Antwort A: durch das Bullauge in den riesigen Innenraum – Sockenberge – Lieblingssocke von 2016
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA)
sa = lambda s: s / TA
c_drin = cue(A, 'explain1', 'Drinnen')
c_sock = cue(A, 'explain1', 'Socken')
c_muen = cue(A, 'explain1', 'ein paar')
c_alles = cue(A, 'explain1', 'Alles, was')
c_und = cue(A, 'explain1', 'Und da')
c_lieb = cue(A, 'explain1', 'deine Lieblingssocke')
c_2016 = cue(A, 'explain1', '2016')
t_in = r3(sA + sa(0.55))                       # Bühnenwechsel: Kamera ist „durch das Glas“
TR = (0.4, -7.2)                               # Lieblingssocke liegt oben auf dem kleinen Sockenhügel
D0 = (0.0, 9.0)
STOMP = [(0.0, 8.4), (0.35, 5.0), (-0.25, 1.5), (0.3, -2.0), (0.1, -4.6), (0.4, -6.45)]
t_st0 = r3(c_sock - sa(0.1))
t_st1 = r3(c_und + sa(0.25))
t_pick = r3(max(t_st1 + sa(0.05), c_lieb - sa(0.35)))
t_grab = r3(t_pick + sa(0.9))
t_raise = r3(t_pick + sa(1.75))
dumA = [peek(0), peek(r3(t_in - 0.003)),
        K(t_in, *D0, 'gape', 0, y=0.0, cut=True), K(r3(t_st0 - 0.003), *D0, 'gape', 0),
        *path(t_st0, t_st1, STOMP, 'sockstomp'),
        K(r3(t_pick - 0.003), *STOMP[-1], 'stand', 0), K(t_pick, *STOMP[-1], 'pickup', 0), K(r3(t_raise - 0.003), *STOMP[-1], 'pickup', 0),
        K(t_raise, *STOMP[-1], 'sockraise', 0), K(1, *STOMP[-1], 'sockraise', 0)]
sockA = [K(0, TR[0], TR[1] + 0.13, 'park', 0, y=HIDE, tilt=90.0, glow=0.0, size=1.6, hand=0.0),
         K(r3(t_in), TR[0], TR[1] + 0.13, 'park', 0, y=0.06, tilt=90.0, glow=0.0, size=1.6, hand=0.0, drop=0.0),
         K(r3(c_und), TR[0], TR[1] + 0.13, 'park', 0, tilt=90.0, glow=1.0, hand=0.0),
         K(r3(t_grab - 0.002), TR[0], TR[1] + 0.13, 'park', 0, tilt=90.0, hand=0.0),
         K(r3(t_grab + sa(0.15)), TR[0], TR[1] + 0.13, 'park', 0, tilt=0.0, hand=1.0, drop=0.0),
         K(1, TR[0], TR[1] + 0.13, 'park', 0, tilt=0.0, hand=1.0, glow=1.0)]
wmA = [wm(0, door=0.0)]
hide_from(wmA, t_in)
aA = {'waschmaschine': wmA, 'dummy': dumA, 'lieblingssocke': sockA}
camA = [
  # Karte: Dummy schaut durchs Bullauge
  *shot(0, r3(sA - 0.003), F(DRUM_PTS, 8, 3, push=0.05)),
  # Kamera fährt auf das Bullauge zu … (Waschkeller)
  cam(sA, [MX + 0.05, CY + 0.35, GLASS + 2.4], [MX, CY + 0.55, MZ], 40), cam(r3(t_in - 0.003), [MX, CY + 0.6, GLASS + 0.05], [MX, CY + 0.62, MZ], 40),
  # … und durch das Glas hinein: riesiger Innenraum, der Ring des Bullauges rahmt das Bild
  cam(t_in, [0.0, 8.7, 20.5], [0.0, 2.6, 2.0], 54), cam(r3(c_sock - 0.003), [0.0, 6.2, 13.2], [0.0, 1.6, 2.0], 54),
  # Socken, Knöpfe: tief neben dem stapfenden Dummy
  cam(c_sock, [1.7, 1.3, 2.0], 'dummy', 46), cam(r3(c_muen - 0.003), [1.6, 1.3, 1.2], 'dummy', 46),
  # ein paar Münzen, ein Haargummi: tief über Münze + Haargummi, Dummy dahinter
  *mshot(c_muen, r3(c_alles - 0.003), [-1.7, 1.45, -2.8], [-0.1, 0.8, 1.4], 50, push=0.1),
  # Alles, was jemals …: hoch + weit über der ganzen Höhle
  *mshot(c_alles, r3(c_und - 0.003), [7.5, 9.5, 12.0], [0.0, 1.0, -8.0], 52, push=0.08),
  # Und da hinten: über die Schulter zur glitzernden Socke
  *mshot(c_und, r3(t_raise - 0.003), [2.0, 3.2, -10.9], [0.4, 0.95, -6.9], 40, push=0.12),
  # Schatz gefunden: tief von vorn, Socke hoch über dem Kopf
  *mshot(t_raise, 1, [0.9, 1.0, -10.2], [0.4, 2.0, -6.45], 46, push=0.06),
]
expA = {
 'camera': camA,
 'actors': aA,
 'stage': [{'t': 0, 'stage': 'waschkeller'}, {'t': t_in, 'stage': 'trommel-innen'}],
 'sfx': [{'t': r3(sA + sa(0.05)), 'id': 'whoosh', 'volume': 0.5}, {'t': r3(t_in + sa(0.2)), 'id': 'staunen', 'volume': 0.35},
         {'t': r3(t_st0 + sa(0.1)), 'id': 'socken-stapfen', 'volume': 0.6}, {'t': r3(t_st0 + sa(3.0)), 'id': 'socken-stapfen', 'volume': 0.55},
         {'t': r3(t_st0 + sa(6.0)), 'id': 'socken-stapfen', 'volume': 0.5},
         {'t': r3(c_und + sa(0.1)), 'id': 'himmel-chor', 'volume': 0.45}],
}

# =====================================================================================================
# Antwort B: gemütlich einrichten – Handtuch-Decke, Weichspüler-Duftkerze, Pulli-Kissen
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB)
sb = lambda s: s / TB
c_hand = cue(B, 'explain2', 'Handtuch')
c_weich = cue(B, 'explain2', 'Weichspüler')
c_gem = cue(B, 'explain2', 'Gemütlicher')
c_dus = cue(B, 'explain2', 'Und duschen')
c_nie = cue(B, 'explain2', 'Brauchst')
dumB = [K(0, *D_LOUNGE, 'tentsit', 180, y=FLOOR), K(r3(c_hand - 0.003), *D_LOUNGE, 'tentsit', 180), K(c_hand, *D_LOUNGE, 'drumlounge', 180), K(1, *D_LOUNGE, 'drumlounge', 180)]
towel = [K(0, MX, MZ + 0.42, 'park', 180, y=FLOOR + 0.1, fill=0.0), K(r3(c_hand + sb(0.2)), MX, MZ + 0.42, 'park', 180, fill=0.0),
         K(r3(c_hand + sb(0.9)), MX, MZ + 0.42, 'park', 180, fill=1.0)]
BOT = (MX + 0.32, MZ + 0.25)
bottle = [K(0, *BOT, 'park', 195, y=0.48, smoke=0.0), K(r3(c_weich + sb(0.1)), *BOT, 'park', 195, smoke=0.0),
          K(r3(c_weich + sb(0.7)), *BOT, 'park', 195, smoke=1.0)]
pillow = [K(0, MX, MZ - 0.62, 'park', 180, y=FLOOR - 0.03)]
aB = {'waschmaschine': [wm(0, door=0.0)], 'dummy': dumB, 'handtuchdecke': towel, 'weichspueler': bottle, 'pullikissen': pillow}
camB = [
  # Karte: Dummy sitzt in der Trommel (durchs Bullauge, leicht von rechts)
  *shot(0, r3(sB - 0.003), F(DRUM_PTS, 345, 5, push=0.05)),
  # Handtuch als Decke: in der Trommel, von der Tür aus
  *mshot(sB, r3(c_weich - 0.003), [MX + 0.35, 2.0, 0.95], [MX, 0.8, MZ - 0.1], 44, push=0.1),
  # Weichspüler als Duftkerze: nah an der dampfenden Flasche
  *mshot(c_weich, r3(c_gem - 0.003), [MX + 0.15, 0.95, 0.75], [BOT[0], 0.68, BOT[1]], 30, push=0.12),
  # Gemütlicher wird's nicht: von draußen durchs Glas
  *shot(c_gem, r3(c_dus - 0.003), F(DRUM_PTS, 12, 8, push=0.08)),
  # Und duschen? Brauchst du nie wieder: Kamera zieht auf, ganze Maschine im Keller (aus)
  cam(c_dus, *F(WM_PTS + [[-2.1, 0, -1.2]], 10, 6, SIT)[:2]), cam(1, *F(WM_PTS + [[-2.4, 0, -1.0], [2.0, 0, 0.6]], 14, 8, SIT)[:2]),
]
expB = {
 'camera': camB,
 'actors': aB,
 'sfx': [{'t': r3(c_hand + sb(0.2)), 'id': 'plopp', 'volume': 0.5}, {'t': r3(c_hand + sb(0.5)), 'id': 'kissen-plumps', 'volume': 0.4},
         {'t': r3(c_weich + sb(0.15)), 'id': 'dampf', 'volume': 0.35}],
}

# =====================================================================================================
# Antwort C: ans Glas klopfen + rufen – Tür geht auf – Stiefbruder – Hand – rausziehen
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC)
sc = lambda s: s / TC
c_klopf = cue(C, 'explain3', 'Du klopfst')
c_tuer = cue(C, 'explain3', 'Die Tür')
c_es = cue(C, 'explain3', 'Es ist')
c_er = cue(C, 'explain3', 'Er macht')
c_haelt = cue(C, 'explain3', 'hält dir')
c_holt = cue(C, 'explain3', 'holt dich')
S_OPEN = (MX + 0.82 + 0.27 + 0.02, GLASS + 0.5)     # Griff 0,5 m vor ihm, 0,27 m links (linke Hand)
S_PEEK = (MX + 0.72, GLASS + 0.62)
S_HELP = (MX - 0.1, GLASS + 0.64)                    # rechte Hand 0,62 m vor ihm → trifft die Hand des Dummys
S_BACK = (MX + 0.95, GLASS + 1.35)
D_OUT = (MX - 0.4, GLASS + 0.95)
op0 = r3(c_tuer - sc(0.45))
peek0 = r3(c_es - sc(0.15))
walk0 = r3(c_er + sc(0.05))
walk1 = r3(walk0 + sc(0.75))
help0 = r3(max(walk1 + sc(0.02), c_haelt - sc(0.5)))
pull0 = r3(max(help0 + sc(0.7), c_holt - sc(0.2)))
pull1 = r3(min(0.97, pull0 + sc(1.2)))
stepC = [K(0, S_OPEN[0] + 2.6, S_OPEN[1] + 0.4, 'stand', 270, y=HIDE), K(r3(op0 - sc(1.1)), S_OPEN[0] + 2.6, S_OPEN[1] + 0.4, 'walk', 270, y=0.0),
         K(r3(op0 - sc(0.05)), *S_OPEN, 'walk', 300), K(op0, *S_OPEN, 'wmopen', 0),
         K(r3(peek0 - 0.003), *S_OPEN, 'wmopen', 0), K(peek0, *S_PEEK, 'peekin', 345, brow=1.0), K(r3(walk0 - 0.003), *S_PEEK, 'peekin', 345, brow=1.0),
         K(walk0, *S_PEEK, 'walk', 290, brow=0.0), K(walk1, *S_HELP, 'walk', 0), K(r3(walk1 + 0.002), *S_HELP, 'stand', 0),
         K(r3(help0 - 0.003), *S_HELP, 'stand', 0), K(help0, *S_HELP, 'helphand', 0), K(r3(pull0 - 0.003), *S_HELP, 'helphand', 0),
         K(pull0, *S_HELP, 'pullback', 0), K(pull1, *S_BACK, 'pullback', 0), K(1, *S_BACK, 'pullback', 0)]
door = [wm(0, door=0.0), wm(r3(op0 + sc(0.5)), door=0.0), wm(r3(op0 + sc(1.3)), door=0.28), wm(r3(walk0), door=0.3), wm(r3(walk1 + sc(0.1)), door=1.0)]
dumC = [peek(0), peek(r3(sC - 0.003)), K(sC, *D_KNOCK, 'glassknock', 180, y=FLOOR, cut=True), K(r3(c_tuer + sc(0.3)), *D_KNOCK, 'glassknock', 180),
        K(r3(c_tuer + sc(0.35)), D_KNOCK[0], D_KNOCK[1] - 0.06, 'takehand', 180),
        K(r3(help0 - 0.003), D_KNOCK[0], D_KNOCK[1] - 0.06, 'takehand', 180), K(r3(help0 + sc(0.4)), D_KNOCK[0], D_KNOCK[1] - 0.06, 'takehand', 180),
        K(r3(pull0 - 0.003), D_KNOCK[0], D_KNOCK[1] - 0.06, 'takehand', 180), K(pull0, D_KNOCK[0], D_KNOCK[1] - 0.06, 'drumexit', 180, y=FLOOR),
        K(r3(pull0 + sc(0.55)), MX - 0.05, FRONT + 0.15, 'drumexit', 180, y=0.32), K(pull1, *D_OUT, 'drumexit', 180, y=0.0),
        K(r3(pull1 + sc(0.3)), *D_OUT, 'relief', 175, y=0.0), K(1, *D_OUT, 'relief', 175)]
waves = [K(0, MX + 0.05, GLASS + 0.12, 'park', 180, y=HIDE), K(r3(sC + sc(0.4)), MX + 0.05, GLASS + 0.12, 'show', 180, y=1.55, size=-0.1),
         K(r3(c_tuer - sc(0.1)), MX + 0.05, GLASS + 0.12, 'show', 180), K(r3(c_tuer - sc(0.08)), MX + 0.05, GLASS + 0.12, 'park', 180, y=HIDE)]
aC = {'waschmaschine': door, 'dummy': dumC, 'stiefbruder': stepC, 'durchsage': waves}
camC = [
  # Karte: Dummy sitzt drin (durchs Bullauge)
  *shot(0, r3(sC - 0.003), F(DRUM_PTS, 352, 2, push=0.05)),
  # Du klopfst ans Glas und rufst um Hilfe: nah von vorn
  *shot(sC, r3(c_tuer - 0.003), F([[MX - 0.6, 0.6, GLASS], [MX + 0.6, 1.95, GLASS]], 6, 4, push=0.08)),
  # Die Tür geht auf: aus der Trommel heraus, Licht + Stiefbruder draußen
  *shot(c_tuer, r3(c_es - 0.003), F(WM_PTS[:4] + [[S_OPEN[0] + 0.3, 0, S_OPEN[1]], [S_OPEN[0], 1.9, S_OPEN[1]]], 25, 6, push=0.05)),
  # Es ist dein Stiefbruder: er schaut zum Spalt herein (Augenbraue hoch)
  *mshot(c_es, r3(c_er - 0.003), [MX + 0.35, 1.55, MZ - 0.6], [S_PEEK[0], 1.55, S_PEEK[1]], 48, push=0.06),
  # Er macht die Tür auf und hält dir eine Hand hin: draußen von der Seite
  *shot(c_er, r3(c_holt - 0.003), F([[MX - 1.0, 0, FRONT], [MX + 1.2, 0, 0.6], [MX - 0.4, 1.95, 0.4], [MX + 1.0, 2.0, FRONT], [MX, 0.5, MZ + 0.4]], 40, 8, push=0.06)),
  # und holt dich raus: beide draußen vor der Maschine
  *shot(c_holt, 1, F([[MX - 1.1, 0, FRONT], [MX + 1.0, 0, 0.9], [MX - 0.5, 2.0, 1.2], [MX + 0.5, 2.0, 0.0]], 18, 6, push=0.06)),
]
expC = {
 'camera': camC,
 'actors': aC,
 'sfx': [{'t': r3(sC + sc(0.2)), 'id': 'glas-klopfen', 'volume': 0.75}, {'t': r3(sC + sc(1.8)), 'id': 'glas-klopfen', 'volume': 0.6},
         {'t': r3(op0 + sc(0.5)), 'id': 'tuer-klick', 'volume': 0.8}, {'t': r3(walk1 - sc(0.2)), 'id': 'tuer-knarren', 'volume': 0.35},
         {'t': r3(pull0 + sc(0.3)), 'id': 'socken-stapfen', 'volume': 0.35}],
}

# =====================================================================================================
# Abstimmung: Dummy + Stiefbruder stehen vor der (geschlossenen, ausgeschalteten) Maschine, Kamera tief + ruhig
# =====================================================================================================
VP = {'dummy': (MX - 0.55, 0.65), 'stiefbruder': (MX + 0.75, 0.75)}
aV = {'waschmaschine': [wm(0, door=0.0)],
      'dummy': [K(0, *VP['dummy'], 'stand', 172, y=0.0, question=1)],
      'stiefbruder': [K(0, *VP['stiefbruder'], 'stand', 192, y=0.0)]}
V_PTS = [[MX - 1.0, 0, FRONT], [MX + 1.0, 0, FRONT], [MX, 2.6, FRONT], [VP['dummy'][0] - 0.4, 0, VP['dummy'][1]], [VP['stiefbruder'][0] + 0.4, 0, VP['stiefbruder'][1]]]
vote = {'camera': shot(0, 1, F(V_PTS, 0, 4, (120, 960, 1060, 1320), push=0.04)), 'actors': aV}

# =====================================================================================================
# Outro: beide winken vor der Maschine
# =====================================================================================================
aO = {'waschmaschine': [wm(0, door=0.0)],
      'dummy': [K(0, *VP['dummy'], 'stand', 175, y=0.0), K(0.12, *VP['dummy'], 'wave', 175), K(1, *VP['dummy'], 'wave', 175)],
      'stiefbruder': [K(0, *VP['stiefbruder'], 'stand', 188, y=0.0), K(0.2, *VP['stiefbruder'], 'wave', 188), K(1, *VP['stiefbruder'], 'wave', 188)]}
O_PTS = [[VP['dummy'][0] - 0.5, 0, VP['dummy'][1]], [VP['stiefbruder'][0] + 0.5, 0, VP['stiefbruder'][1]], [VP['dummy'][0], 1.95, VP['dummy'][1]], [MX, 1.9, FRONT]]
outro = {'camera': shot(0, 1, F(O_PTS, 6, 6, (100, 980, 780, 1110), push=0.05)), 'actors': aO}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du bist mal wieder in die Waschmaschine gefallen – was machst du? 🧦 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Bitte niemals in eine Waschmaschine klettern. 😄\n\n"
        "#waswürdestdutun #waschmaschine #socken #wg #mitbewohner #spezial #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'waschkeller', 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Die Kamera fährt durch das Bullauge der (ausgeschalteten) Waschmaschine in einen riesigen, höhlenartigen Innenraum voller Sockenberge, Knöpfe, Münzen, Haargummis, Kassenzettel, Taschentuch-Fetzen, Löffel und Joghurtbecher. Der Dummy stapft durch die Socken und hält am Ende seine glitzernde Lieblingssocke hoch wie einen Schatz.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy macht es sich in der Trommel gemütlich: Handtuch als Decke, die Weichspüler-Flasche dampft wie eine Duftkerze, ein Pulli als Kissen. Er lehnt sich zufrieden zurück. Die Maschine bleibt aus.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy klopft ans Bullauge und ruft. Die Tür geht auf, der Stiefbruder (lila Dummy) schaut herein, öffnet die Tür ganz, hält ihm die Hand hin und zieht ihn aus der Waschmaschine heraus.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Kommentieren & folgen!'},
 'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team ___. Und du? 👇'},
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
print('Länge', round(total, 1), 's', 'audio' if dur else 'geschätzt',
      {'situation': seclen('situation'), 'A': (cardA, sceneA), 'B': (cardB, sceneB), 'C': (cardC, sceneC), 'vote': seclen('countdown'), 'outro': seclen('outro')})
print('A: Schatz hoch bei', round(t_raise * TA, 2), 's von', round(TA, 2), '| C: rausgezogen', round(pull1 * TC, 2), 's von', round(TC, 2))
if total < 61: print('ACHTUNG: unter 61 s – Szenen verlängern / Schlussbild stehen lassen')
if total > 66: print('ACHTUNG: über 66 s – Pausen kürzen')
