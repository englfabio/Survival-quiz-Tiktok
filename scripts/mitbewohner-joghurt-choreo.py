# Hilfsskript: erzeugt scenarios/spezial-mitbewohner-joghurt.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/mitbewohner-joghurt-choreo.py
#
# Format: Spezial (keine richtige Antwort, Abstimmung statt Auflösung). Darstellung (vom Inhaber): alles comichaft und harmlos.
# Antwort A: KEIN Feuer, KEIN Rauch, keine echte Explosion – nur ein comichaftes "PUFF" mit einer Joghurt-Welle, die die Küche weiß färbt.
# Niemand wird verletzt oder krank. Bühne: "wg-kueche" (+ "wg-kueche-nacht"), src/stage/Kitchen.tsx.
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-mitbewohner-joghurt'
S = dict(
situation="Dein Mitbewohner hat mal wieder deinen Joghurt gegessen. Schon wieder. Dein Name stand sogar drauf. Was machst du?",
o1c="Den Kühlschrank sprengen", o1s="A: Du sprengst den Kühlschrank.",
o2c="Zettel: Probe fürs Gesundheitsamt", o2s="B: Du beschriftest deinen Joghurt mit: Probe fürs Gesundheitsamt.",
o3c="Rechnung: 1,29 € plus Mahngebühren", o3s="C: Du schickst ihm eine Rechnung über 1,29 Euro. Plus Mahngebühren. Wir sind ja schließlich in Deutschland.",
e1="Wenn du keinen Joghurt hast, dann hat ihn keiner. Puff. Jetzt ist die ganze Küche Joghurt. Und dein Mitbewohner? Der findet das ziemlich lecker.",
e2="Ab jetzt steht auf deinem Joghurt: Probe fürs Gesundheitsamt. Nachts um drei steht er wieder am Kühlschrank. Er liest den Zettel. Er stellt den Becher ganz langsam zurück.",
e3="Erst kommt die Rechnung. Dann die erste Mahnung. Dann die zweite. Nach drei Wochen zahlt er endlich. In Münzen. Du stempelst: Bezahlt. Und legst alles ordentlich ab. Im Ordner Joghurt, Jahrgang 2026.",
countdown="Also, was machst du? Schreib A, B oder C in die Kommentare.",
# Outro: Text des Inhabers wortgenau + auf Wunsch des Inhabers ein Satz dazu (was der Dummy als Nächstes erleben soll)
outro="Eine richtige Antwort gibt es diesmal nicht. Aber dein Mitbewohner sollte das Video unbedingt sehen. Schreib A, B oder C in die Kommentare und markier deinen Joghurt-Dieb. Und was soll der Dummy als Nächstes erleben?",
)
# visuelle Verlängerung der Szenen (Sekunden, ohne Text) – nur so viel, dass jede Pointe zu Ende gespielt ist
EXTRA = {1: 0.6, 2: 0.8, 3: 0.0}
LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'countdown': 0.1,
        'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'outro': 0.3}
MINLEN = {'situation': 5, 'countdown': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7, 'outro': 3}
TEXT = {'situation': S['situation'], 'option1': S['o1s'], 'option2': S['o2s'], 'option3': S['o3s'], 'countdown': S['countdown'],
        'explain1': S['e1'], 'explain2': S['e2'], 'explain3': S['e3'], 'outro': S['outro']}
vd = f'{ROOT}/public/voice/{ID}'
dur = json.load(open(f'{vd}/durations.json')) if os.path.exists(f'{vd}/durations.json') else {}
ali = json.load(open(f'{vd}/alignment.json')) if os.path.exists(f'{vd}/alignment.json') else {}

def seclen(c):
    a = dur.get(c, 0.84 + 0.0594 * len(TEXT[c]))
    return round(max(LEAD[c] + a + 0.5, MINLEN.get(c, 0)) * 30) / 30
def start_in(c, phrase):
    """Sekunden ab Clip-Beginn (inkl. LEAD), an denen phrase beginnt"""
    txt = TEXT[c]; i = txt.index(phrase)
    st = ali[c]['character_start_times_seconds'][i] if c in ali else (0.84 + 0.0594 * len(txt)) * i / len(txt)
    return LEAD[c] + st
def cue(c, phrase):
    return round(start_in(c, phrase) / seclen(c), 4)

r3 = lambda x: round(x, 4)
def K(t, x=None, z=None, motion='park', face=None, **kw):
    d = {'t': r3(max(0, min(1, t)))}
    if x is not None: d['x'] = round(x, 3)
    if z is not None: d['z'] = round(z, 3)
    d['motion'] = motion
    if face is not None: d['face'] = face
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    """Kamera-Zeitachse (sampleCamera glättet die Zeit) → Schnitte exakt treffen"""
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def te_inv(x):
    lo, hi = 0.0, 1.0
    for _ in range(50):
        m = (lo + hi) / 2
        if te(m) < x: lo = m
        else: hi = m
    return (lo + hi) / 2
def cam(t, pos, look, fov=None):
    """Kamera-Zeitpunkt bei echter Zeit t (0..1) – wird in die geglättete Zeitachse umgerechnet"""
    d = {'t': round(te(max(0, min(1, t))), 4), 'pos': [round(v, 3) for v in pos], 'look': [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
def cut(t, a, b, eps=0.003):
    """harter Schnitt bei t: Kamera a (pos, look[, fov]) endet, Kamera b beginnt"""
    return [cam(t - eps, *a), cam(t, *b)]
def face_to(a, b): return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)
def rot(face, lx, lz):
    """Figuren-System (x links, z vorn) → Welt-Versatz"""
    th = math.radians(180 - face)
    return (lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th))
HIDE = -30
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam import fit
ANS = (70, 1000, 480, 1215)      # Bildbereich in den Antwort-Abschnitten (unter der Kopfzeile, über den Untertiteln)
SIT = (70, 1000, 250, 1215)
def F(points, az, el, box=ANS):
    r = fit(points, az, el, box=box)
    assert r, ('Kamera passt nicht', points, az, el)
    if abs(r[0][0]) > 2.35 or r[0][2] < -2.2 or r[0][1] > 2.5: print('Achtung: Kamera außerhalb des Raums', r[0], az, el)
    return (r[0], r[1])
def dolly(c, k=0.92):
    pos, look = c
    return ([look[i] + (pos[i] - look[i]) * k for i in range(3)], look)
def body(x, z, top=1.98, w=0.32):
    return [[x - w, top, z], [x + w, top, z], [x, 0.0, z]]

# ---- feste Plätze: WG-Küche (src/stage/Kitchen.tsx, WG) ----
FRIDGE = (-2.13, -1.94)
STAND = (-1.55, -1.05)           # vor dem Kühlschrank (fridgeopen, face 0)
CUP_IN = (-1.95, -1.84, 1.045)   # Becher im Kühlschrank (x, z, y)
DOOR = (2.5, 0.75)
TABLE_Y = 0.76
CHAIR_L = (-0.98, 0.55)
CHAIR_R = (0.58, 0.55)
DESK_CHAIR = (1.75, -1.3)
LAPTOP = (1.75, -1.88, 0.74)
SLOT = (2.25, -2.045, 1.565)
CAL = (2.485, -0.45, 1.45)
CUP_SIZE = 0.35

def fridge(door=0.0, **kw): return K(0, *FRIDGE, 'park', 180, door=door, **kw)
def static(door=0.0, cup=True, cupnote=0, laptop=0.0, folder=False, night=0.0, fridge_door=0.0):
    """Gegenstände, die in jedem Abschnitt stehen"""
    a = {
        'kuehlschrank': [fridge(fridge_door, glow=night)],
        'zimmertuer': [K(0, *DOOR, 'park', 270, door=door)],
        'laptop': [K(0, LAPTOP[0], LAPTOP[1], 'park', 180, y=LAPTOP[2], fill=laptop)],
        'kalender': [K(0, CAL[0], CAL[1], 'park', 270, y=CAL[2])],
        'ordner': [K(0, SLOT[0], SLOT[1], 'park', 180, y=SLOT[2] if folder else HIDE, text='Joghurt\n2026')],
    }
    if cup: a['joghurt'] = [K(0, CUP_IN[0], CUP_IN[1], 'park', 180, y=CUP_IN[2], size=CUP_SIZE, mark=cupnote, lid=0)]
    return a

shots = {}
# =========================================================================================================
# Situation: Mitbewohner löffelt verstohlen → Dummy öffnet den Kühlschrank, leerer Becher "DUMMY" → entsetzt
# =========================================================================================================
c = 'situation'; L = seclen(c)
sec = lambda s, c=c: s / seclen(c)
cS = cue(c, 'Schon wieder'); cN = cue(c, 'Dein Name'); cD = cue(c, 'drauf'); cW = cue(c, 'Was machst')
f0 = cS - sec(0.15)                      # Dummy beginnt die Tür zu öffnen
grab = f0 + sec(2.0)
closeup = max(cN + sec(0.4), f0 + sec(2.15))
a = static(cup=False)
a['kuehlschrank'] = [K(0, *FRIDGE, 'park', 180, door=0), K(f0 + sec(0.4), *FRIDGE, 'park', 180, door=0), K(f0 + sec(1.2), *FRIDGE, 'park', 180, door=1)]
a['joghurt'] = [K(0, CUP_IN[0], CUP_IN[1], 'park', 180, y=CUP_IN[2], size=CUP_SIZE, lid=1, fill=0.01), K(grab - 0.001, CUP_IN[0], CUP_IN[1], 'park', 180, y=CUP_IN[2]),
                K(grab, CUP_IN[0], CUP_IN[1], 'park', 180, y=HIDE)]
SPOON_AT = (-0.75, 0.05)
a['kumpel'] = [K(0, *SPOON_AT, 'spoon', 160), K(cS - 0.002, *SPOON_AT, 'spoon', 160), K(cS, *SPOON_AT, 'spoon', 160, y=HIDE)]
a['dummy'] = [K(0, *STAND, 'stand', 0, y=HIDE), K(f0 - 0.002, *STAND, 'stand', 0, y=HIDE), K(f0, *STAND, 'fridgeopen', 0, y=0),
              K(closeup - sec(0.3), *STAND, 'fridgeopen', 0), K(closeup, *STAND, 'fridgeopen', 150), K(cW - 0.001, *STAND, 'fridgeopen', 150),
              K(cW, *STAND, 'aghast', 150)]
CAM_K = F(body(*SPOON_AT), 15, 8, SIT)
CAM_F = F(body(*STAND) + [[-2.48, 2.02, -1.6], [-2.48, 0.4, -1.6]], 40, 8, SIT)
CUPW = (STAND[0] + 0.27, STAND[1] + 0.23)
CAM_C = F([[STAND[0], 1.98, STAND[1]], [CUPW[0], 1.4, CUPW[1]], [STAND[0], 1.15, STAND[1]], [CUPW[0] + 0.15, 1.7, CUPW[1]]], 30, 5, SIT)
CAM_W = F(body(*STAND) + [[-2.48, 2.02, -1.6]], 25, 8, SIT)
shots['situation'] = {
    'camera': [cam(0, *CAM_K), cam(cS - 0.003, *dolly(CAM_K)), cam(cS, *CAM_F)] +
              [cam(closeup - 0.003, *dolly(CAM_F)), cam(closeup, *CAM_C), cam(cW - 0.003, *dolly(CAM_C, 0.95)),
               cam(cW, *CAM_W), cam(1, *dolly(CAM_W))],
    'actors': a,
    'sfx': [{'t': r3(f0 + sec(0.4)), 'id': 'kuehlschrank-auf', 'volume': 0.6}, {'t': r3(cW + sec(0.05)), 'id': 'falsch', 'volume': 0.0}],
}
shots['situation']['sfx'] = [x for x in shots['situation']['sfx'] if x['volume'] > 0]

# =========================================================================================================
# Antwort-Abschnitte: Länge = Karte (option<n>) + Szene (explain<n>) + EXTRA
# =========================================================================================================
def answer_len(n): return round((seclen(f'option{n}') + seclen(f'explain{n}') + EXTRA[n]) * 30) / 30
def ac(n, phrase, card=False):
    """t (0..1) im Antwort-Abschnitt n, an dem phrase beginnt (card=True: im vorgelesenen Kartentext)"""
    tot = answer_len(n)
    if card: return r3(start_in(f'option{n}', phrase) / tot)
    return r3((seclen(f'option{n}') + start_in(f'explain{n}', phrase)) / tot)
def scene0(n): return r3(seclen(f'option{n}') / answer_len(n))

# ---------- A: großer roter Knopf → PUFF → Küche voller Joghurt → Mitbewohner probiert und grinst ----------
n = 1; L = answer_len(n); sa = lambda s: s / answer_len(1)
s0 = scene0(1); tP = ac(1, 'Puff'); tJ = ac(1, 'Jetzt ist'); tU = ac(1, 'Und dein'); tF = ac(1, 'Der findet')
BTN_D = (-0.75, -1.05)                       # Dummy hinter dem Knopf, Blick zur Kamera
BTN = (BTN_D[0], BTN_D[1] + 0.5)
press0 = tP - sa(0.76)
a = static()
a['joghurt'][0]['y'] = HIDE
a['knopf'] = [K(0, *BTN, 'park', 180, press=0, glow=0), K(press0 + sa(0.7), *BTN, 'park', 180, press=0, glow=0), K(press0 + sa(0.76), *BTN, 'park', 180, press=1, glow=1),
              K(press0 + sa(1.4), *BTN, 'park', 180, glow=0.3)]
a['dummy'] = [K(0, *BTN_D, 'stand', 180, brow=1), K(press0, *BTN_D, 'pressbutton', 180), K(tP + sa(0.25), *BTN_D, 'pressbutton', 180, splat=0),
              K(tP + sa(0.6), *BTN_D, 'pressbutton', 180, splat=1)]
a['kuehlschrank'] = [K(0, *FRIDGE, 'park', 180, door=0, rumble=0), K(tP, *FRIDGE, 'park', 180, door=0, rumble=0),
                     K(tP + sa(0.18), *FRIDGE, 'park', 180, door=1, rumble=1), K(tP + sa(1.2), *FRIDGE, 'park', 180, door=0.92, rumble=0)]
a['joghurtwelle'] = [K(0, 0, 0, 'park', 180, fill=0), K(tP, 0, 0, 'splash', 180, fill=0), K(tP + sa(1.5), 0, 0, 'splash', 180, fill=1)]
# Mitbewohner kommt aus seiner Tür, voller Joghurt, wischt sich die Stirn, probiert, grinst
IN0 = (2.95, 1.2); IN1 = (1.55, 1.05)
k_in = tU + sa(0.15)
walk_t = min(sa(math.hypot(IN1[0] - IN0[0], IN1[1] - IN0[1]) / 1.15), tF - sa(0.25) - k_in)
CAM_U = F(body(*IN1) + [[2.5, 2.05, 0.75], [2.5, 0.0, 1.61]], -35, 8)
FACE_K = 235
a['zimmertuer'] = [K(0, *DOOR, 'park', 270, door=0), K(tU, *DOOR, 'park', 270, door=0), K(tU + sa(0.5), *DOOR, 'park', 270, door=1)]
a['kumpel'] = [K(0, *IN0, 'stand', 270, y=HIDE), K(k_in - 0.001, *IN0, 'walk', 270, y=HIDE), K(k_in, *IN0, 'walk', 270, y=0, splat=1),
               K(k_in + walk_t, *IN1, 'walk', 270), K(min(tF - 0.002, k_in + walk_t + sa(0.3)), *IN1, 'stand', FACE_K),
               K(tF, *IN1, 'wipebrow', FACE_K), K(tF + sa(0.35), *IN1, 'wipebrow', FACE_K, splat=1),
               K(tF + sa(0.95), *IN1, 'wipebrow', FACE_K, splat=0.35, teeth=0), K(tF + sa(1.55), *IN1, 'wipebrow', FACE_K, teeth=1)]
CAM_A0 = F(body(*BTN_D) + [[-1.8, 2.0, -1.6], [-1.8, 0.4, -1.6]], 20, 8)
CAM_AP = F(body(*BTN_D) + [[-2.85, 2.0, -1.2], [-0.45, 2.0, -1.2], [-2.48, 0.3, -1.6]], 25, 8)
CAM_AW = F([[-2.45, 2.2, -2.0], [-2.45, 0.0, -1.0], [0.5, 2.3, -2.3], [0.4, 0.0, 0.9]], 8, 14)
CAM_AF = F([[IN1[0] - 0.35, 2.0, IN1[1]], [IN1[0] + 0.35, 2.0, IN1[1]], [IN1[0], 0.85, IN1[1]]], -55, 4)
shots['option1'] = {
    'camera': [cam(0, *CAM_A0), cam(tP - sa(0.05), *dolly(CAM_A0)), cam(tP - sa(0.05) + 0.003, *CAM_AP),
               cam(tJ, *dolly(CAM_AP, 0.96)), cam(tJ + 0.003, *CAM_AW), cam(tU - 0.003, *dolly(CAM_AW, 0.93)),
               cam(tU, *CAM_U), cam(tF - 0.003, *dolly(CAM_U)), cam(tF, *CAM_AF), cam(1, *dolly(CAM_AF, 0.95))],
    'actors': a,
    'sfx': [{'t': r3(press0 + sa(0.72)), 'id': 'knopf-druecken', 'volume': 0.8}, {'t': r3(tP), 'id': 'puff', 'volume': 0.9},
            {'t': r3(tU + sa(0.05)), 'id': 'tuer-zu', 'volume': 0.35}],
}

# ---------- B: Zettel "Probe fürs Gesundheitsamt" → nachts liest der Mitbewohner und stellt den Becher zurück ----------
n = 2; L = answer_len(n); sb = lambda s: s / answer_len(2)
s0 = scene0(2); tN = ac(2, 'Nachts'); tL = ac(2, 'Er liest'); tS = ac(2, 'Er stellt')
WR = (-0.2, 1.17)                     # Dummy vor dem Tisch, Blick −z
NOTE = (WR[0] + 0.05, WR[1] - 0.42)   # Zettel auf dem Tisch unter der rechten Hand
CUP_T = (-0.4, 0.72)                  # Becher auf dem Tisch, Etikett zum Dummy (+z)
ST = (CUP_T[0], CUP_T[1] + 0.07 * (1 + CUP_SIZE) / 1.35 + 0.37)
stick0 = s0 - sb(0.75)
side0 = stick0 - sb(0.45)
a = static(fridge_door=0)
a['joghurt'] = [K(0, CUP_T[0], CUP_T[1], 'park', 180, y=TABLE_Y, size=CUP_SIZE, mark=0, lid=0), K(stick0 + sb(0.5), CUP_T[0], CUP_T[1], 'park', 180, y=TABLE_Y, mark=0),
                K(stick0 + sb(0.52), CUP_T[0], CUP_T[1], 'park', 180, y=TABLE_Y, mark=1), K(tN - 0.002, CUP_T[0], CUP_T[1], 'park', 180, y=TABLE_Y),
                K(tN, CUP_IN[0], CUP_IN[1], 'park', 180, y=CUP_IN[2])]
a['klebezettel'] = [K(0, *NOTE, 'park', 180, y=TABLE_Y + 0.003, size=0.6), K(stick0 + sb(0.4), *NOTE, 'park', 180, y=TABLE_Y + 0.003),
                    K(stick0 + sb(0.42), *NOTE, 'park', 180, y=HIDE)]
a['stift'] = [K(0, NOTE[0] + 0.2, NOTE[1] + 0.05, 'park', 30, y=HIDE), K(side0 - 0.002, NOTE[0] + 0.2, NOTE[1] + 0.05, 'park', 30, y=HIDE),
              K(side0, NOTE[0] + 0.22, NOTE[1] + 0.05, 'park', 30, y=TABLE_Y)]
a['dummy'] = [K(0, *WR, 'writenote', 0), K(side0, *WR, 'walk', 0), K(stick0, *ST, 'sticknote', 0), K(s0 - sb(0.27), *ST, 'sticknote', 0),
              K(s0 - sb(0.25), ST[0], ST[1], 'walk', 140), K(s0 + sb(0.55), -0.95, 1.45, 'stand', 150), K(tN - 0.002, -0.95, 1.45, 'stand', 150),
              K(tN, ST[0], ST[1], 'stand', 150, y=HIDE)]
# Nacht: Mitbewohner schleicht zum Kühlschrank, öffnet, liest, stellt zurück, weicht zurück
SN0 = (0.25, -0.2)
sneak_t = sb(math.hypot(STAND[0] - SN0[0], STAND[1] - SN0[1]) / 0.95)
open0 = tN + sneak_t + sb(0.05)
read0 = max(tL, open0 + sb(1.75))
put0 = tS
put_end = put0 + sb(2.3)
REC = (-1.1, 0.1)
a['kuehlschrank'] = [K(0, *FRIDGE, 'park', 180, door=0, glow=1), K(open0 + sb(0.4), *FRIDGE, 'park', 180, door=0), K(open0 + sb(1.2), *FRIDGE, 'park', 180, door=1)]
a['joghurt'] += [K(read0 - 0.002, CUP_IN[0], CUP_IN[1], 'park', 180, y=CUP_IN[2]), K(read0, CUP_IN[0], CUP_IN[1], 'park', 180, y=HIDE),
                 K(put_end - 0.002, CUP_IN[0], CUP_IN[1], 'park', 180, y=HIDE), K(put_end, CUP_IN[0], CUP_IN[1], 'park', 180, y=CUP_IN[2])]
FACE_SN = face_to(SN0, STAND)
a['kumpel'] = [K(0, *SN0, 'stand', FACE_SN, y=HIDE), K(tN - 0.001, *SN0, 'sneak', FACE_SN, y=HIDE), K(tN, *SN0, 'sneak', FACE_SN, y=0),
               K(tN + sneak_t, *STAND, 'sneak', 0), K(open0, *STAND, 'fridgeopen', 0), K(read0, *STAND, 'readnote', 0),
               K(put0, *STAND, 'putback', 0), K(put_end + sb(0.6), *STAND, 'putback', 0),
               K(put_end + sb(0.62), *STAND, 'recoil', 20), K(1, *REC, 'recoil', 20)]
CAM_B0 = F(body(*WR) + [[NOTE[0], 0.76, NOTE[1]], [CUP_T[0], 0.95, CUP_T[1]]], 55, 22)
CAM_BC = F([[CUP_T[0] - 0.13, 0.76, CUP_T[1]], [CUP_T[0] + 0.13, 0.76, CUP_T[1]], [CUP_T[0], 0.98, CUP_T[1]]], 12, 10)
CAM_BN = F(body(*SN0) + body(*STAND) + [[-2.48, 2.02, -1.6]], 25, 8)
HOLD = (STAND[0] + 0.22, STAND[1] - 0.32)
CAM_BR = F([[STAND[0] - 0.25, 1.98, STAND[1]], [STAND[0], 1.0, STAND[1]], [HOLD[0] + 0.08, 1.6, HOLD[1]], [HOLD[0], 1.35, HOLD[1]]], 70, 5)
CAM_BP = F(body(*STAND) + [[-2.48, 2.02, -1.6], [-2.48, 0.4, -1.6]], 35, 8)
CAM_BX = F(body(*STAND) + body(*REC) + [[-2.48, 2.02, -1.6]], 25, 8)
shots['option2'] = {
    'camera': [cam(0, *CAM_B0), cam(s0 + sb(0.6) - 0.003, *dolly(CAM_B0)), cam(s0 + sb(0.6), *CAM_BC), cam(tN - 0.003, *dolly(CAM_BC, 0.9)),
               cam(tN, *CAM_BN), cam(read0 - 0.003, *dolly(CAM_BN)), cam(read0, *CAM_BR), cam(put0 - 0.003, *dolly(CAM_BR, 0.95)),
               cam(put0, *CAM_BP), cam(put_end + sb(0.5), *dolly(CAM_BP, 0.97)), cam(put_end + sb(0.5) + 0.003, *CAM_BX), cam(1, *dolly(CAM_BX))],
    'actors': a,
    'stage': [{'t': 0, 'stage': 'wg-kueche'}, {'t': r3(tN), 'stage': 'wg-kueche-nacht'}],
    'sfx': [{'t': 0.02, 'id': 'stift-kritzeln', 'volume': 0.6}, {'t': r3(stick0 + sb(0.5)), 'id': 'pflaster', 'volume': 0.6},
            {'t': r3(open0 + sb(0.4)), 'id': 'kuehlschrank-auf', 'volume': 0.6}, {'t': r3(read0 + sb(1.2)), 'id': 'herzschlag', 'volume': 0.5}],
}

# ---------- C: Rechnung tippen → Briefe unter der Tür durch → 3 Wochen → Münzen → BEZAHLT → Ordner ins Regal ----------
n = 3; L = answer_len(n); sc = lambda s: s / answer_len(3)
s0 = scene0(3)
tR = ac(3, 'Rechnung.'); tM1 = ac(3, 'erste Mahnung'); tM2 = ac(3, 'zweite'); tW = ac(3, 'Nach drei'); tMz = ac(3, 'In Münzen')
tSt = ac(3, 'Du stempelst'); tB = ac(3, 'Bezahlt'); tO = ac(3, 'Und legst'); tIO = ac(3, 'Im Ordner')
a = static(laptop=0)
a['laptop'] = [K(0, LAPTOP[0], LAPTOP[1], 'park', 180, y=LAPTOP[2], fill=0), K(sc(0.8), LAPTOP[0], LAPTOP[1], 'park', 180, fill=0),
               K(ac(3, 'Plus', card=True), LAPTOP[0], LAPTOP[1], 'park', 180, fill=1)]
a['joghurt'][0]['y'] = HIDE
# Briefe unter der Tür durchschieben (Dummy kniet vor der Tür, Blick +x)
KN = (1.62, 1.18)
slide0 = tR - sc(0.6)
LET = ['Rechnung', '1. Mahnung', '2. Mahnung']
for i, name in enumerate(['brief', 'brief2', 'brief3']):
    p0 = slide0 + sc(0.6 + 1.3 * i)
    x0 = KN[0] + 0.45; x1 = KN[0] + 0.78; x2 = 2.75
    a[name] = [K(0, x0, KN[1] - 0.04, 'park', 270, y=HIDE, tilt=1, text=LET[i], size=1.4), K(p0 - sc(0.12), x0, KN[1] - 0.04, 'park', 270, y=HIDE),
               K(p0 - sc(0.1), x0, KN[1] - 0.04, 'park', 270, y=0), K(p0 + sc(0.52), x1, KN[1] - 0.04, 'park', 270, y=0),
               K(p0 + sc(0.8), x2, KN[1] - 0.04, 'park', 270, y=0), K(p0 + sc(0.82), x2, KN[1] - 0.04, 'park', 270, y=HIDE)]
# bezahlter Brief auf dem Tisch (für den Stempel)
STP = (-0.3, -0.12)               # Dummy hinter dem Tisch, Blick zur Kamera (face 180)
PAID = (STP[0] - 0.04, STP[1] + 0.42)
stamp0 = tB - sc(0.58)
a['brief4'] = [K(0, *PAID, 'park', 180, y=HIDE, tilt=1, text='Rechnung', size=0.25, mark=0), K(tMz - 0.002, *PAID, 'park', 180, y=HIDE),
               K(tMz, *PAID, 'park', 180, y=TABLE_Y + 0.002), K(stamp0 + sc(0.57), *PAID, 'park', 180, mark=0), K(stamp0 + sc(0.58), *PAID, 'park', 180, mark=1),
               K(tO - 0.002, *PAID, 'park', 180), K(tO, *PAID, 'park', 180, y=HIDE)]
# Mitbewohner: öffnet entsetzt die Briefe (Kalender blättert hinter ihm), dann zählt er am Tisch Münzen
OL = (1.95, -0.05)
FACE_OL = 215
CAM_W3 = F([[OL[0] - 0.32, 1.98, OL[1]], [OL[0] + 0.3, 1.98, OL[1]], [OL[0], 0.75, OL[1]], [CAL[0], CAL[2] + 0.28, CAL[1]], [CAL[0], CAL[2] - 0.3, CAL[1]]], -35, 4)
ol0 = tW - sc(1.75)
coin0 = tMz
a['kumpel'] = [K(0, *OL, 'stand', FACE_OL, y=HIDE), K(ol0, *OL, 'openletters', FACE_OL, y=HIDE), K(tW - 0.001, *OL, 'openletters', FACE_OL, y=HIDE),
               K(tW, *OL, 'openletters', FACE_OL, y=0), K(tMz - 0.001, *OL, 'openletters', FACE_OL), K(tMz, *CHAIR_R, 'countcoins', 270)]
PILE = (CHAIR_R[0] - 0.4, CHAIR_R[1] + 0.02)
ncoin = lambda tt: max(0.0, (tt - coin0) * answer_len(3) / 0.8 + 0.4)
a['muenzen'] = [K(0, *PILE, 'park', 90, y=HIDE, fill=0), K(tMz - 0.002, *PILE, 'park', 90, y=HIDE), K(tMz, *PILE, 'park', 90, y=TABLE_Y, fill=0)]
for j in range(1, 13):
    tt = coin0 + sc(0.8 * j - 0.3)
    if tt >= tO: break
    a['muenzen'].append(K(tt, *PILE, 'park', 90, fill=round(j / 13, 3)))
a['kumpel'].append(K(tO - 0.001, *CHAIR_R, 'countcoins', 270))
a['kumpel'].append(K(tO, *CHAIR_R, 'chairsit', 270))
a['kalender'] = [K(0, CAL[0], CAL[1], 'park', 270, y=CAL[2]), K(tW - sc(0.2), CAL[0], CAL[1], 'flip', 270, y=CAL[2]), K(tMz, CAL[0], CAL[1], 'park', 270, y=CAL[2])]
# Dummy: tippt (Lesebrille) → kniet an der Tür → stempelt am Tisch → Ordner ins Regal
SH = (SLOT[0] - 0.02, SLOT[1] + 0.40)
shelve0 = tO + sc(0.05)
a['dummy'] = [K(0, *DESK_CHAIR, 'typedesk', 0, glasses=0), K(sc(0.7), *DESK_CHAIR, 'typedesk', 0, glasses=1), K(slide0 - 0.002, *DESK_CHAIR, 'typedesk', 0),
              K(slide0, *KN, 'slideletter', 90), K(tW - 0.001, *KN, 'slideletter', 90), K(tW, *STP, 'stand', 180, y=HIDE),
              K(tMz - 0.001, *STP, 'stand', 180, y=HIDE), K(tMz, *STP, 'stand', 180, y=0), K(stamp0, *STP, 'stamp', 180),
              K(tO - 0.001, *STP, 'stamp', 180), K(tO, *SH, 'shelve', 0)]
a['ordner'] = [K(0, SLOT[0], SLOT[1], 'park', 180, y=HIDE, text='Joghurt\n2026'), K(shelve0 + sc(1.33), SLOT[0], SLOT[1], 'park', 180, y=HIDE),
               K(shelve0 + sc(1.35), SLOT[0], SLOT[1], 'park', 180, y=SLOT[2])]
CAM_C0 = ([2.38, 1.78, -0.95], [1.75, 0.9, -1.95])
CAM_C1 = F(body(*DESK_CHAIR, top=1.6) + [[1.3, 1.9, -2.2], [2.45, 1.9, -2.2], [2.45, 0.0, -1.7]], 35, 12)
CAM_CL = F([[KN[0], 1.4, KN[1]], [KN[0] - 0.3, 0.0, KN[1]], [2.5, 1.2, 0.75], [2.5, 0.0, 1.61], [2.4, 0.0, KN[1] - 0.25]], -20, 22)
CAM_CC = F(body(*STP) + [[CHAIR_R[0], 1.45, CHAIR_R[1]], [CHAIR_R[0] + 0.25, 0.4, CHAIR_R[1]], [PILE[0], 0.76, PILE[1]], [PAID[0], 0.76, PAID[1]]], 12, 22)
CAM_CO = F(body(*SH) + [[SLOT[0], 1.9, SLOT[1]], [1.45, 1.9, SLOT[1]]], -30, 10)
CAM_CF = F([[SLOT[0] + 0.05, 1.9, SLOT[1]], [SLOT[0] - 0.55, 1.56, SLOT[1]], [SH[0], 1.98, SH[1]], [SH[0], 1.3, SH[1]]], -50, 12)
tcard2 = ac(3, 'Wir sind', card=True)
shots['option3'] = {
    'camera': [cam(0, *CAM_C0), cam(tcard2 - 0.003, *dolly(CAM_C0, 0.95)), cam(tcard2, *CAM_C1), cam(slide0 + sc(0.3) - 0.003, *dolly(CAM_C1)),
               cam(slide0 + sc(0.3), *CAM_CL), cam(tW - 0.003, *dolly(CAM_CL)), cam(tW, *CAM_W3), cam(tMz - 0.003, *dolly(CAM_W3, 0.95)),
               cam(tMz, *CAM_CC), cam(tO - 0.003, *dolly(CAM_CC, 0.95)), cam(tO, *CAM_CO), cam(tIO - 0.003, *dolly(CAM_CO, 0.95)),
               cam(tIO, *CAM_CF), cam(1, *dolly(CAM_CF, 0.93))],
    'actors': a,
    'sfx': [{'t': 0.03, 'id': 'tastatur', 'volume': 0.6}, {'t': r3(slide0 + sc(0.6)), 'id': 'papier-schieben', 'volume': 0.7},
            {'t': r3(slide0 + sc(1.9)), 'id': 'papier-schieben', 'volume': 0.7}, {'t': r3(slide0 + sc(3.2)), 'id': 'papier-schieben', 'volume': 0.7},
            {'t': r3(tW - sc(0.1)), 'id': 'kalender-blaettern', 'volume': 0.6}, {'t': r3(tMz + sc(0.1)), 'id': 'muenzen', 'volume': 0.7},
            {'t': r3(stamp0 + sc(0.58)), 'id': 'stempel', 'volume': 0.9}],
}

# =========================================================================================================
# Abstimmung: beide in der Küche, Becher auf dem Tisch
# =========================================================================================================
a = static()
a['joghurt'] = [K(0, -0.2, 0.55, 'park', 180, y=TABLE_Y, size=CUP_SIZE + 0.15, lid=0, fill=1)]
a['dummy'] = [K(0, -0.75, -0.25, 'stand', 165, brow=1)]
a['kumpel'] = [K(0, 0.35, -0.25, 'sheepish', 195)]
shots['countdown'] = {'camera': [cam(0, [-0.15, 1.05, 4.6], [-0.2, 1.75, 0.0]), cam(1, [-0.2, 1.05, 4.3], [-0.2, 1.75, 0.0])], 'actors': a}

# =========================================================================================================
# Outro: beide Mitbewohner am Küchentisch, dazwischen ein einzelner Joghurtbecher
# =========================================================================================================
a = static()
a['joghurt'] = [K(0, -0.2, 0.55, 'park', 180, y=TABLE_Y, size=CUP_SIZE + 0.25, lid=0, fill=1)]
a['dummy'] = [K(0, *CHAIR_L, 'chairsit', 90, brow=1)]
a['kumpel'] = [K(0, *CHAIR_R, 'chairsit', 270, brow=1)]
CAM_O = F([[CHAIR_L[0] - 0.25, 1.4, CHAIR_L[1]], [CHAIR_R[0] + 0.25, 1.4, CHAIR_R[1]], [-0.2, 0.76, 0.55]], 0, 10, (70, 1000, 900, 1225))
shots['outro'] = {'camera': [cam(0, *CAM_O), cam(1, *dolly(CAM_O, 0.95))], 'actors': a}

for sh in shots.values():
    sh['sharpCuts'] = True
    for keys in sh['actors'].values():   # fehlendes y vom vorigen Zeitpunkt übernehmen (sonst fällt der Gegenstand auf y 0)
        y = None
        for k in keys:
            if 'y' in k: y = k['y']
            elif y is not None: k['y'] = y

DESC = ("Dein Mitbewohner hat mal wieder deinen Joghurt gegessen – was machst du? 🥄 Schreib A, B oder C in die Kommentare!\n\n"
        "Diesmal ohne richtige Antwort, nur zum Spaß. Bitte nichts davon nachmachen. 😄\n\n"
        "#waswürdestdutun #wg #mitbewohner #wgleben #spezial #lustig #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
    'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'wg-kueche',
    'situation': {'speech': S['situation']},
    'options': [
        {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy drückt einen großen roten Knopf, comichaftes PUFF (kein Feuer, kein Rauch), eine Joghurt-Welle färbt die Küche weiß. Der Mitbewohner kommt herein, wischt sich Joghurt von der Stirn, probiert und grinst.',
         'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': shots['option1']},
        {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy schreibt einen Zettel "Probe fürs Gesundheitsamt" und klebt ihn auf seinen Joghurt. Nachts schleicht der Mitbewohner zum Kühlschrank, liest den Zettel, stellt den Becher ganz langsam zurück und weicht zurück.',
         'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': shots['option2']},
        {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy tippt mit Lesebrille eine Rechnung über 1,29 €, schiebt Rechnung, 1. und 2. Mahnung unter der Tür durch, der Kalender blättert drei Wochen weiter, der Mitbewohner zählt Münzen, der Dummy stempelt BEZAHLT und stellt den Ordner "Joghurt 2026" ins Regal.',
         'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': shots['option3']},
    ],
    'countdown': {'speech': S['countdown'], 'screen': 'Stimm ab!'},
    'outro': {'speech': S['outro'], 'screen': 'Schreib A, B oder C in die Kommentare!'},
    'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team ___. Und du? 👇 Markier deinen Joghurt-Dieb!'},
    'shots': {'situation': shots['situation'], 'countdown': shots['countdown'], 'outro': shots['outro']},
}
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
tot = seclen('situation') + sum(answer_len(i) for i in (1, 2, 3)) + max(seclen('countdown'), 5.6) + max(seclen('outro'), 4)
print('Länge ca.', round(tot, 1), 's', '(mit Stimme)' if dur else '(geschätzt)')
