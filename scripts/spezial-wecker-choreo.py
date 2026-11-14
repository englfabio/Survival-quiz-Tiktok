# Hilfsskript: erzeugt scenarios/spezial-wecker.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus (solange es keine Stimme gibt: Schätzung aus der Textlänge).
# Aufruf: python3 scripts/spezial-wecker-choreo.py
# Format "spezial": Situation → Antwort A/B/C (Karte vorlesen + kleine Szene) → Abstimmung → Outro. Alles comichaft und harmlos:
# der Wecker trifft niemanden, der Nachbar wird nicht getroffen.
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-wecker'
S = dict(
situation="Dein Wecker hat mal wieder nicht geklingelt. Es ist 8 Uhr 47, und um 8 hättest du bei der Arbeit sein müssen. Was machst du?",
o1c="Wecker zum Nachbarn werfen", o1s="A: Du wirfst den Wecker zu deinem Nachbarn rüber.",
o2c="Mit dem Hammer zerschlagen", o2s="B: Du schlägst ihn mit einem Hammer kaputt.",
o3c="Liegen bleiben, Feiertag erklären", o3s="C: Du bleibst liegen und erklärst den Tag zum persönlichen Feiertag.",
e1="Der Wecker fliegt in hohem Bogen über den Zaun. Er landet mitten auf dem grünsten Rasen der ganzen Straße. Und genau da fängt er an zu klingeln.",
e2="Ein Schlag. Zwei Schläge. Der Wecker ist Geschichte. Problem gelöst. Zumindest bis morgen früh. Denn ohne Wecker verschläfst du jetzt jeden einzelnen Tag.",
e3="Zu spät ist zu spät. Also bleibst du liegen und erklärst heute zum Feiertag. Dein Chef ruft an. Er sucht den Feiertag in seinem Kalender. Er findet ihn nicht. Du schon.",
countdown="Also, was machst du? Schreib A, B oder C in die Kommentare.",
# Outro: Text vom Inhaber + vom Inhaber gewünschter Zusatz ("auch sagen, was der Dummy als Nächstes erleben soll")
outro="Eine richtige Antwort gibt es diesmal nicht. Aber du kennst bestimmt jemanden, der jeden Morgen verschläft. Schreib A, B oder C in die Kommentare und markier ihn. Und schreib auch rein, was der Dummy als Nächstes erleben soll.",
)
DESC = """Dein Wecker hat mal wieder nicht geklingelt – was machst du? ⏰ Schreib A, B oder C in die Kommentare!

Diesmal ohne richtige Antwort, nur zum Spaß. Bitte nichts davon nachmachen. 😄

#waswürdestdutun #verschlafen #wecker #arbeit #montag #spezial #comedy #quiz

Hinweis: Das gesamte Video ist KI-generiert."""
PINNED = "Ich bin Team ___. Und du? 👇 Markier jemanden, der jeden Morgen verschläft!"

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'countdown': 0.1, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'outro': 0.3}
MINLEN = {'situation': 5, 'countdown': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7, 'outro': 3}
TEXT = {'situation': S['situation'], 'option1': S['o1s'], 'option2': S['o2s'], 'option3': S['o3s'], 'explain1': S['e1'], 'explain2': S['e2'],
        'explain3': S['e3'], 'countdown': S['countdown'], 'outro': S['outro']}
EXTRA = {1: 0.0, 2: 0.0, 3: 0.0}   # sceneExtra (Sekunden) – nur falls das Video zu kurz wäre
vd = f'{ROOT}/public/voice/{ID}'
dur = json.load(open(f'{vd}/durations.json')) if os.path.exists(f'{vd}/durations.json') else {}
ali = json.load(open(f'{vd}/alignment.json')) if os.path.exists(f'{vd}/alignment.json') else {}

def frames(c):
    a = dur.get(c, 0.84 + 0.0594 * len(TEXT[c]))
    return round(max(LEAD[c] + a + 0.5, MINLEN.get(c, 0)) * 30)
def seclen(c):
    if c.startswith('answer'):
        n = int(c[-1]); return (frames(f'option{n}') + frames(f'explain{n}') + round(EXTRA[n] * 30)) / 30
    if c == 'vote': return max(frames('countdown'), round(5.6 * 30)) / 30
    if c == 'outro': return max(frames('outro'), 4 * 30) / 30
    return frames(c) / 30
def charstart(c, phrase):
    txt = TEXT[c]; i = txt.index(phrase)
    if c in ali: return ali[c]['character_start_times_seconds'][i]
    return (0.84 + 0.0594 * len(txt)) * i / len(txt)
def cue(sec_name, clip, phrase):
    """t (0..1) im Abschnitt sec_name, an dem phrase im Clip beginnt"""
    off = LEAD[clip]
    if sec_name.startswith('answer') and clip.startswith('explain'):
        off += frames('option' + sec_name[-1]) / 30
    return round((off + charstart(clip, phrase)) / seclen(sec_name), 4)
def scene0(n):
    """t, an dem die kleine Szene von Antwort n beginnt"""
    return round(frames(f'option{n}') / 30 / seclen(f'answer{n}'), 4)
r3 = lambda x: round(x, 4)
def K(t, x, z, motion, face=None, **kw):
    d = {'t': r3(t), 'x': round(x, 3), 'z': round(z, 3), 'motion': motion}
    if face is not None: d['face'] = face
    d.update({k: (round(v, 4) if isinstance(v, float) else v) for k, v in kw.items()})
    return d
def te(t):
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def te_inv(x):
    lo, hi = 0.0, 1.0
    for _ in range(50):
        m = (lo + hi) / 2
        if te(m) < x: lo = m
        else: hi = m
    return lo
def cam(t, pos, look, fov=None):
    d = {'t': round(te(t), 4), 'pos': [round(v, 3) for v in pos], 'look': [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
def sec(c, s): return s / seclen(c)
HIDE = -30
EPS = 0.002
def inherit_y(keys):
    """y gilt im Renderer NICHT weiter (fehlt = 0) – hier wird es weitergereicht, damit Gegenstände nicht auf den Boden fallen"""
    out = []; y = 0
    for k in keys:
        k = dict(k)
        if 'y' in k: y = k['y']
        else: k['y'] = y
        out.append(k)
    return out
def finish(shot):
    """y weiterreichen + harte Schnitte (Sprung > 0,5 m in ganz kurzer Zeit) ohne Überblendung"""
    for name, keys in shot['actors'].items():
        keys = inherit_y(sorted(keys, key=lambda k: k['t']))
        for a, b in zip(keys, keys[1:]):
            if b['t'] - a['t'] <= 0.006 and (math.hypot(b['x'] - a['x'], b['z'] - a['z']) > 0.5 or abs(b['y'] - a['y']) > 5):
                b['cut'] = True
        shot['actors'][name] = keys
    return shot

# ---------------- feste Plätze ----------------
# Schlafzimmer (src/stage/Bedroom.tsx): Bett x −0.05 … 1.75, z −1.9 … −0.95, Kissen rechts (x ≈ 1.47); Nachttisch (−0.3, −1.7), Platte 0,52.
HX, BZ, BF = 0.8, -1.425, 270           # Dummy im Bett: Hüfte bei x 0.8, schaut nach −x (zum Fußende/Nachttisch)
NS_H = 0.52
WECKER = (-0.4, -1.62)                 # Wecker auf dem Nachttisch (Zifferblatt zum Bett)
DIGI = (-0.17, -1.6)                   # Digitaluhr "8:47"
WALLCAL = (0.02, 1.32, -1.88)         # Abreiß-Wandkalender (blättert) an der Rückwand
PHONE = (0.45, -1.06)                  # Handy liegt auf der Decke (Kameraseite)
WIN_STAND = (-0.95, -0.4)              # vor dem offenen Fenster (linke Wand x −1.8, Mitte z −0.4)
HAMMER_STAND = (-1.12, -1.25)           # schräg vor dem Nachttisch (face 45), Wecker 0,77 m vor ihm, 0,25 m rechts
def lap_world(lx, ly, lz):
    """Dummy-System (im Bett, face 270) → Welt"""
    return (HX - lz, ly, BZ + lx)
LAPCAL_L = (-0.02, 0.66, 0.4)
LAPCAL = lap_world(*LAPCAL_L)
LAPCAL_TILT = round(math.degrees(0.62 - 0.22), 2)
CONF = (1.32, 1.85, -1.66)             # Konfetti über der Kanone
# Garten mit Nachbarrasen (src/stage/Garden.tsx): Zaun z −7, Nachbarrasen z −12.4 … −7.15, Nachbarhaus-Front z −12.5
LAND = (1.0, -10.0)                     # hier landet der Wecker
NB = (2.0, -10.9, 200)                # Nachbar (Kumpel in Orange, Gartenhut) gießt
# Büro (src/stage/Office.tsx): Wandkalender (1.15, 1.45, −2.19), Chef davor
CHEF = (1.36, -1.72)
OFFCAL = (1.15, 1.45, -2.19)

def bed_props(wecker=True, ring=0, broken=0, digi_blink=0, cal=False, phone=False, calflip=False):
    a = {}
    a['wecker'] = [K(0, WECKER[0], WECKER[1], 'stand', 191, y=NS_H if wecker else HIDE, ring=ring, broken=broken)]
    a['digitaluhr'] = [K(0, DIGI[0], DIGI[1], 'stand', 185, y=NS_H, blink=digi_blink, text='8:47')]
    a['kalender'] = [K(0, WALLCAL[0], WALLCAL[2], 'flip' if calflip else 'stand', 180, y=WALLCAL[1], text='16')]
    a['abreisskalender'] = [K(0, LAPCAL[0], LAPCAL[2], 'stand', 90, y=LAPCAL[1] if cal else HIDE, tilt=LAPCAL_TILT)]
    a['smartphone'] = [K(0, PHONE[0], PHONE[1], 'lie', 200, y=0.505 if phone else HIDE)]
    return a
def hide_all(names, t=0):
    return {n: [K(t, 0, 0, 'stand', 0, y=HIDE)] for n in names}
GARDEN_ACTORS = ['kumpel', 'giesskanne']
OFFICE_ACTORS = ['chef', 'monatskalender']

def dummy_bed(t, motion, **kw):
    return K(t, HX, BZ, motion, BF, **kw)

# Kamera-Standpunkte
CAM_WIDE = ([1.7, 1.97, 2.39], [0.3, 0.87, -1.47])          # Bett von vorn
CAM_SLEEP = ([-2.53, 1.83, -1.51], [0.21, 0.73, -1.52])      # vom Fußende (hinter der linken Wand, die von außen unsichtbar ist)
CAM_FOOT = ([-3.95, 1.72, -1.42], [0.63, 0.92, -1.42])       # Dummy sitzt im Bett und schaut zur Kamera
CAM_CLOCK = ([-0.58, 0.98, -0.18], [-0.33, 0.62, -1.61])        # Wecker + Digitaluhr nah
CAM_THROW = ([2.54, 2.24, 4.09], [-1.33, 0.93, -0.53])       # Wurf aus dem Fenster
CAM_GARDEN = ([0.0, 4.6, -1.0], [1.3, 0.5, -10.2])           # über den Zaun auf den Nachbarrasen
CAM_GNEAR = ([-8.96, 3.27, -8.63], [1.65, 0.6, -9.94])      # Wecker auf dem Rasen + Nachbar
CAM_HAMMER = ([1.65, 1.88, 4.69], [-1.29, 0.68, -1.18])      # schräg von vorn rechts
CAM_MONT = ([1.27, 2.09, 3.02], [0.7, 0.85, -1.6])           # Bett + Wandkalender
CAM_PILLOW = ([1.35, 1.91, 2.46], [0.73, 0.82, -1.45])       # Dummy halb liegend, Kalender auf dem Schoß
CAM_WRITE = ([1.57, 1.9, -0.71], [0.51, 0.79, -1.45])       # über die Schulter auf den Kalender
CAM_PARTY = ([1.6, 2.31, 3.5], [0.7, 1.11, -1.45])         # Hütchen + Konfetti
CAM_OFFICE = ([-3.41, 2.1, 2.59], [1.13, 0.7, -1.95])      # Büro: Chef am Wandkalender
CAM_HM = ([-0.68, 1.93, 2.65], [1.35, 1.3, -1.71])           # Chef nah ("Hm?")
CAM_VOTE = ([1.63, 2.37, 6.66], [0.76, 1.95, -1.6])
CAM_OUTRO = ([1.68, 2.65, 6.76], [0.81, 2.02, -1.56])
def near(c, k=0.08):
    """leicht näher heran (für langsame Kamerafahrten)"""
    p, l = c
    return [p[i] + (l[i] - p[i]) * k for i in range(3)], l

# ================= Situation =================
L0 = 'situation'
c_es = cue(L0, L0, 'Es ist 8 Uhr')
c_und = cue(L0, L0, 'und um 8')
c_was = cue(L0, L0, 'Was machst du')
t_wake = r3(c_und - sec(L0, 0.25))
situation = {
 'camera': [cam(0, *CAM_SLEEP, 40), cam(r3(c_es - EPS), *near(CAM_SLEEP), 40),
            cam(r3(c_es), *CAM_CLOCK, 40), cam(r3(t_wake - 0.01), *near(CAM_CLOCK, 0.12), 40),
            cam(r3(t_wake), *CAM_FOOT, 40), cam(r3(c_was - EPS), *near(CAM_FOOT, 0.1), 40),
            cam(r3(c_was), *CAM_WIDE, 40), cam(1, *near(CAM_WIDE, 0.05), 40)],
 'actors': {
  'dummy': [dummy_bed(0, 'bedsleep'), dummy_bed(t_wake, 'bedwake'), dummy_bed(1, 'bedwake')],
  **bed_props(digi_blink=0),
  **hide_all(GARDEN_ACTORS + OFFICE_ACTORS + ['zahnraeder', 'konfetti']),
 },
 'sharpCuts': True,
 'sfx': [{'t': r3(t_wake), 'id': 'plopp', 'volume': 0.5}],
}

# ================= Antwort A: Wecker zum Nachbarn werfen =================
A = 'answer1'
s1 = scene0(1)
a_land = cue(A, 'explain1', 'Er landet')
a_klin = cue(A, 'explain1', 'Und genau da')
a_ring = cue(A, 'explain1', 'klingeln')
t_throw = r3(s1 + sec(A, 0.05))
t_rel = r3(t_throw + sec(A, 0.62))
t_out = r3(t_rel + sec(A, 0.42))        # Wecker ist durchs Fenster → Schnitt in den Garten
t_land = r3(max(a_land + sec(A, 0.6), t_out + sec(A, 3.0)))
t_closeup = r3(a_klin - sec(A, 0.15))
# Flugbahn im Garten (Zeitlupe): von über der Kamera über den Zaun auf den Nachbarrasen
def arc_keys(t0, t1, p0, p1, apex, n=14):
    out = []
    for i in range(n + 1):
        u = i / n
        x = p0[0] + (p1[0] - p0[0]) * u
        z = p0[2] + (p1[2] - p0[2]) * u
        y = p0[1] + (p1[1] - p0[1]) * u + apex * 4 * u * (1 - u)
        out.append(K(t0 + (t1 - t0) * u, x, z, 'arc', 0, y=y))
    return out
G0 = (0.1, 3.3, -3.2)
G1 = (LAND[0], 0.0, LAND[1])
gflight = arc_keys(t_out, t_land, G0, G1, 1.2)
wecker_a = [K(0, WECKER[0], WECKER[1], 'stand', 191, y=NS_H, hand=0),
            K(r3(s1 - EPS), WECKER[0], WECKER[1], 'stand', y=NS_H, hand=0),
            # in der Hand am Fenster
            K(r3(s1), WIN_STAND[0], WIN_STAND[1], 'stand', 270, y=1.0, hand=1, drop=0.02),
            K(r3(t_rel), WIN_STAND[0], WIN_STAND[1], 'stand', y=1.0, hand=1, drop=0.02),
            K(r3(t_rel + EPS), -1.3, -0.55, 'arc', 270, y=1.85, hand=0),
            K(r3(t_out - EPS), -2.6, -0.4, 'arc', y=1.75)] + gflight + [
            K(r3(t_land + sec(A, 0.12)), LAND[0] + 0.06, LAND[1] - 0.04, 'arc', y=0.08),
            K(r3(t_land + sec(A, 0.3)), LAND[0] + 0.1, LAND[1] - 0.07, 'stand', 160, y=0.0, tilt=12),
            K(r3(a_ring - sec(A, 0.1)), LAND[0] + 0.1, LAND[1] - 0.07, 'stand', ring=0, tilt=12),
            K(r3(a_ring + sec(A, 0.1)), LAND[0] + 0.1, LAND[1] - 0.07, 'stand', ring=1, tilt=12),
            K(1, LAND[0] + 0.1, LAND[1] - 0.07, 'stand', ring=1, tilt=12)]
dummy_a = [dummy_bed(0, 'bedwake'), dummy_bed(r3(s1 - EPS), 'bedwake'),
           K(r3(s1), WIN_STAND[0], WIN_STAND[1], 'stand', 270),
           K(r3(t_throw), WIN_STAND[0], WIN_STAND[1], 'throwclock', 270),
           K(r3(t_out - EPS), WIN_STAND[0], WIN_STAND[1], 'throwclock', 270),
           K(r3(t_out), WIN_STAND[0], WIN_STAND[1], 'throwclock', 270, y=HIDE), K(1, WIN_STAND[0], WIN_STAND[1], 'stand', 270, y=HIDE)]
nb_a = [K(0, NB[0], NB[1], 'watering', NB[2], y=HIDE, gardenhat=1),
        K(r3(t_out - EPS), NB[0], NB[1], 'watering', NB[2], y=HIDE),
        K(r3(t_out), NB[0], NB[1], 'watering', NB[2], y=0),
        K(r3(a_ring), NB[0], NB[1], 'watering', NB[2]),
        K(r3(a_ring + sec(A, 0.35)), NB[0], NB[1], 'lookup', NB[2]),
        K(r3(a_ring + sec(A, 1.0)), NB[0], NB[1], 'lookup', 227, brow=1, question=1),
        K(1, NB[0], NB[1], 'lookup', 227, brow=1, question=1)]
can_a = [K(0, NB[0], NB[1], 'stand', NB[2], y=HIDE, holder='kumpel', hand=0, water=0),
         K(r3(t_out - EPS), NB[0], NB[1], 'stand', NB[2], y=HIDE),
         K(r3(t_out), NB[0], NB[1], 'stand', NB[2], y=0.9, holder='kumpel', hand=1, drop=-0.02, water=1),
         K(r3(a_ring + sec(A, 0.3)), NB[0], NB[1], 'stand', NB[2], water=1),
         K(r3(a_ring + sec(A, 0.6)), NB[0], NB[1], 'stand', NB[2], water=0),
         K(1, NB[0], NB[1], 'stand', NB[2], water=0)]
cam_a = [cam(0, *CAM_FOOT, 40), cam(r3(s1 - EPS), *near(CAM_FOOT, 0.15), 40),
         # am Fenster: Dummy wirft
         cam(r3(s1), *CAM_THROW, 40), cam(r3(t_out - EPS), *near(CAM_THROW, 0.06), 40),
         # Garten: Kamera hoch über dem eigenen Rasen, Blick über den Zaun – Wecker fliegt in Zeitlupe
         cam(r3(t_out), *CAM_GARDEN, 36), cam(r3(t_closeup - EPS), *near(CAM_GARDEN, 0.06), 36),
         # Wecker auf dem Rasen klingelt, Nachbar schaut auf
         cam(r3(t_closeup), *CAM_GNEAR, 30), cam(1, *near(CAM_GNEAR, 0.08), 30)]
answer1 = {
 'camera': cam_a,
 'stage': [{'t': 0, 'stage': 'schlafzimmer-morgen'}, {'t': t_out, 'stage': 'nachbarrasen'}],
 'actors': {
  'dummy': dummy_a,
  'wecker': wecker_a,
  'kumpel': nb_a,
  'giesskanne': can_a,
  **{k: [dict(v[0], t=0), K(r3(t_out), v[0]['x'], v[0]['z'], v[0]['motion'], y=HIDE)] for k, v in bed_props(wecker=False).items() if k != 'wecker'},
  **hide_all(OFFICE_ACTORS + ['zahnraeder', 'konfetti']),
 },
 'sharpCuts': True,
 'sfx': [{'t': r3(t_rel), 'id': 'whoosh', 'volume': 0.6}, {'t': r3(t_land), 'id': 'plopp', 'volume': 0.55},
         {'t': r3(a_ring), 'id': 'wecker-klingeln', 'volume': 0.55}],
}

# ================= Antwort B: Mit dem Hammer zerschlagen =================
B = 'answer2'
s2 = scene0(2)
b_ein = cue(B, 'explain2', 'Ein Schlag')
b_zwei = cue(B, 'explain2', 'Zwei Schläge')
b_gesch = cue(B, 'explain2', 'Der Wecker ist')
b_denn = cue(B, 'explain2', 'Denn ohne')
# Hammer-Bewegung: Treffer bei 0,6 s und 1,6 s nach Beginn → erster Treffer genau auf "Ein Schlag", zweiter vor "Zwei Schläge" (Ende)
t_h = r3(b_ein - sec(B, 0.6) + sec(B, 0.25))
hit1 = r3(t_h + sec(B, 0.6))
hit2 = r3(t_h + sec(B, 1.6))
t_bed = r3(b_denn - sec(B, 0.1))
HS = HAMMER_STAND
dummy_b = [K(0, HS[0], HS[1], 'holdhammer', 45), K(r3(t_h), HS[0], HS[1], 'hammer', 45),
           K(r3(b_gesch + sec(B, 0.3)), HS[0], HS[1], 'hammer', 45), K(r3(b_gesch + sec(B, 0.31)), HS[0], HS[1], 'cheer', 45),
           K(r3(t_bed - EPS), HS[0], HS[1], 'cheer', 45)]
# im Bett: jeden Morgen schreckt er zu spät hoch (Wechsel liegen ↔ hochschrecken, ca. alle 1,1 s)
tt = t_bed
toggle = True
while tt < 1 - sec(B, 0.3):
    dummy_b.append(dummy_bed(r3(tt), 'bedsleep' if toggle else 'bedwake'))
    tt += sec(B, 0.45 if toggle else 0.75)
    toggle = not toggle
dummy_b.append(dummy_bed(1, 'bedwake'))
wecker_b = [K(0, WECKER[0], WECKER[1], 'stand', 191, y=NS_H, broken=0),
            K(r3(hit1 - EPS), WECKER[0], WECKER[1], 'stand', broken=0), K(r3(hit1 + sec(B, 0.08)), WECKER[0], WECKER[1], 'stand', broken=0.55),
            K(r3(hit2 - EPS), WECKER[0], WECKER[1], 'stand', broken=0.55), K(r3(hit2 + sec(B, 0.08)), WECKER[0], WECKER[1], 'stand', broken=1),
            K(r3(t_bed - EPS), WECKER[0], WECKER[1], 'stand', broken=1), K(r3(t_bed), WECKER[0], WECKER[1], 'stand', y=HIDE), K(1, WECKER[0], WECKER[1], 'stand', y=HIDE)]
gears_b = [K(0, WECKER[0], WECKER[1], 'stand', 100, y=NS_H + 0.08), K(r3(hit1), WECKER[0], WECKER[1], 'burst', 100, y=NS_H + 0.08, mark=round(sec(B, 1.0) * seclen(B), 3), drop=0.55),
           K(r3(t_bed - EPS), WECKER[0], WECKER[1], 'burst'), K(r3(t_bed), WECKER[0], WECKER[1], 'stand', y=HIDE), K(1, WECKER[0], WECKER[1], 'stand', y=HIDE)]
calflip_b = [K(0, WALLCAL[0], WALLCAL[2], 'stand', 180, y=WALLCAL[1], text='16'), K(r3(t_bed), WALLCAL[0], WALLCAL[2], 'flip', 180, y=WALLCAL[1]), K(1, WALLCAL[0], WALLCAL[2], 'flip', 180)]
cam_b = [cam(0, *CAM_HAMMER, 40), cam(r3(hit1 - sec(B, 0.3)), *near(CAM_HAMMER, 0.12), 40),
         cam(r3(t_bed - EPS), *near(CAM_HAMMER, 0.2), 40),
         # Montage im Bett: Wandkalender blättert, Dummy schreckt immer wieder hoch
         cam(r3(t_bed), *CAM_MONT, 40), cam(1, *near(CAM_MONT, 0.08), 40)]
answer2 = {
 'camera': cam_b,
 'stage': 'schlafzimmer-morgen',
 'actors': {
  'dummy': dummy_b,
  'wecker': wecker_b,
  'zahnraeder': gears_b,
  'kalender': calflip_b,
  **{k: v for k, v in bed_props().items() if k not in ('wecker', 'kalender')},
  **hide_all(GARDEN_ACTORS + OFFICE_ACTORS + ['konfetti']),
 },
 'sharpCuts': True,
 'sfx': [{'t': hit1, 'id': 'hammer-schlag', 'volume': 0.7}, {'t': hit2, 'id': 'hammer-schlag', 'volume': 0.75},
         {'t': hit2, 'id': 'zahnraeder-klirren', 'volume': 0.5}, {'t': r3(t_bed), 'id': 'kalender-blaettern', 'volume': 0.5}],
}

# ================= Antwort C: Liegen bleiben, Feiertag erklären =================
C = 'answer3'
s3 = scene0(3)
c_zu = cue(C, 'explain3', 'Zu spät ist')
c_also = cue(C, 'explain3', 'Also bleibst')
c_feier = cue(C, 'explain3', 'zum Feiertag')
c_chef = cue(C, 'explain3', 'Dein Chef')
c_sucht = cue(C, 'explain3', 'Er sucht')
c_findet = cue(C, 'explain3', 'Er findet')
c_du = cue(C, 'explain3', 'Du schon')
t_flop = r3(sec(C, 1.4))
t_write = r3(s3 + sec(C, 0.1))                       # Kringel 0,3–1,4 s, Schrift 1,5–3,3 s
t_hat = r3(max(t_write + sec(C, 3.6), c_feier - sec(C, 1.0)))
t_conf = r3(t_hat + sec(C, 1.1))
t_shot = r3(t_conf + sec(C, 0.6))
t_ring = r3(max(c_chef - sec(C, 0.1), t_shot + sec(C, 0.4)))
t_pick = r3(t_ring + sec(C, 0.7))
t_office = r3(c_sucht - sec(C, 0.1))
t_turn = r3(c_findet - sec(C, 0.15))
t_back = r3(c_du - sec(C, 0.12))
dummy_c = [dummy_bed(0, 'bedwake'), dummy_bed(r3(t_flop), 'bedflop'),
           dummy_bed(r3(t_write), 'bedwrite', partyhat=0), dummy_bed(r3(t_hat), 'bedhat', partyhat=0),
           dummy_bed(r3(t_hat + sec(C, 0.35)), 'bedhat', partyhat=0), dummy_bed(r3(t_hat + sec(C, 0.8)), 'bedhat', partyhat=1),
           dummy_bed(r3(t_conf), 'bedconfetti'), dummy_bed(r3(t_pick), 'bedcall'), dummy_bed(r3(t_back), 'bedpoint'), dummy_bed(1, 'bedpoint')]
cal_c = [K(0, LAPCAL[0], LAPCAL[2], 'stand', 90, y=HIDE, tilt=LAPCAL_TILT, circle=0, write=0),
         K(r3(t_write - sec(C, 0.5)), LAPCAL[0], LAPCAL[2], 'stand', 90, y=HIDE),
         K(r3(t_write - sec(C, 0.5) + EPS), LAPCAL[0], LAPCAL[2], 'stand', 90, y=LAPCAL[1]),
         K(r3(t_write + sec(C, 0.3)), LAPCAL[0], LAPCAL[2], 'stand', circle=0, write=0),
         K(r3(t_write + sec(C, 1.4)), LAPCAL[0], LAPCAL[2], 'stand', circle=1, write=0),
         K(r3(t_write + sec(C, 1.5)), LAPCAL[0], LAPCAL[2], 'stand', circle=1, write=0),
         K(r3(t_write + sec(C, 3.3)), LAPCAL[0], LAPCAL[2], 'stand', circle=1, write=1),
         K(1, LAPCAL[0], LAPCAL[2], 'stand', circle=1, write=1)]
phone_c = [K(0, PHONE[0], PHONE[1], 'lie', 200, y=0.505, ring=0), K(r3(t_ring - EPS), PHONE[0], PHONE[1], 'lie', ring=0),
           K(r3(t_ring), PHONE[0], PHONE[1], 'lie', ring=1), K(r3(t_pick + sec(C, 0.25)), PHONE[0], PHONE[1], 'lie', ring=1),
           K(r3(t_pick + sec(C, 0.25) + EPS), PHONE[0], PHONE[1], 'lie', y=HIDE, ring=0), K(1, PHONE[0], PHONE[1], 'lie', y=HIDE)]
conf_c = [K(0, CONF[0], CONF[2], 'stand', 0, y=CONF[1], size=-0.45), K(r3(t_conf + sec(C, 0.6)), CONF[0], CONF[2], 'burst', 0, y=CONF[1]), K(1, CONF[0], CONF[2], 'burst')]
chef_c = [K(0, CHEF[0], CHEF[1], 'calsearch', 0, y=HIDE, brow=0.02),
          K(r3(t_office - EPS), CHEF[0], CHEF[1], 'calsearch', 0, y=HIDE),
          K(r3(t_office), CHEF[0], CHEF[1], 'calsearch', 0, y=0),
          K(r3(t_turn), CHEF[0], CHEF[1], 'calsearch', 0, brow=0.02),
          K(r3(t_turn + sec(C, 0.25)), CHEF[0], CHEF[1], 'chefhm', 205, brow=0.02),
          K(r3(t_turn + sec(C, 0.65)), CHEF[0], CHEF[1], 'chefhm', 205, brow=1, question=0.9),
          K(r3(t_back - EPS), CHEF[0], CHEF[1], 'chefhm', 205, brow=1, question=0.9),
          K(r3(t_back), CHEF[0], CHEF[1], 'chefhm', 205, y=HIDE), K(1, CHEF[0], CHEF[1], 'chefhm', 205, y=HIDE)]
offcal_c = [K(0, OFFCAL[0], OFFCAL[2], 'stand', 180, y=HIDE), K(r3(t_office - EPS), OFFCAL[0], OFFCAL[2], 'stand', 180, y=HIDE),
            K(r3(t_office), OFFCAL[0], OFFCAL[2], 'stand', 180, y=OFFCAL[1]), K(r3(t_back - EPS), OFFCAL[0], OFFCAL[2], 'stand', 180, y=OFFCAL[1]),
            K(r3(t_back), OFFCAL[0], OFFCAL[2], 'stand', 180, y=HIDE), K(1, OFFCAL[0], OFFCAL[2], 'stand', 180, y=HIDE)]
# alle Schlafzimmer-Figuren im Büro ausblenden (Bühne ist eine andere)
def active_at(keys, t):
    k = keys[0]
    for q in keys:
        if q['t'] <= t + 1e-9: k = q
    return k
def bed_hidden_in_office(keys):
    keys = inherit_y(keys)
    before = [k for k in keys if k['t'] < t_office - EPS]
    rest = [k for k in keys if k['t'] > t_back]
    a = dict(active_at(keys, t_office - EPS)); a['t'] = r3(t_office - EPS)
    b = dict(a); b['t'] = r3(t_office); b['y'] = HIDE
    c = dict(a); c['t'] = r3(t_back - EPS); c['y'] = HIDE
    d = dict(active_at(keys, t_back)); d['t'] = r3(t_back); d['cut'] = True
    return before + [a, b, c, d] + rest
cam_c = [cam(0, *CAM_PILLOW, 40), cam(r3(s3 - EPS), *near(CAM_PILLOW, 0.08), 40),
         # über die Schulter auf den Kalender (Kringel + "FEIERTAG")
         cam(r3(s3), *CAM_WRITE, 36), cam(r3(t_hat - EPS), *near(CAM_WRITE, 0.08), 36),
         # Hütchen, Konfetti, Handy klingelt
         cam(r3(t_hat), *CAM_PARTY, 40), cam(r3(t_office - EPS), *near(CAM_PARTY, 0.1), 40),
         # Büro: Chef sucht im Kalender
         cam(r3(t_office), *CAM_OFFICE, 40), cam(r3(t_turn - EPS), *near(CAM_OFFICE, 0.06), 40),
         cam(r3(t_turn), *CAM_HM, 36), cam(r3(t_back - EPS), *near(CAM_HM, 0.08), 36),
         # zurück im Bett: Dummy zeigt zufrieden auf seinen Kalender
         cam(r3(t_back), *near(CAM_PILLOW, 0.1), 40), cam(1, *near(CAM_PILLOW, 0.16), 40)]
bp = bed_props(cal=True, phone=True)
answer3 = {
 'camera': cam_c,
 'stage': [{'t': 0, 'stage': 'schlafzimmer-morgen'}, {'t': t_office, 'stage': 'buero'}, {'t': t_back, 'stage': 'schlafzimmer-morgen'}],
 'actors': {
  'dummy': bed_hidden_in_office(dummy_c),
  'abreisskalender': bed_hidden_in_office(cal_c),
  'smartphone': phone_c,
  'konfetti': bed_hidden_in_office(conf_c),
  'wecker': bed_hidden_in_office(bp['wecker']),
  'digitaluhr': bed_hidden_in_office(bp['digitaluhr']),
  'kalender': bed_hidden_in_office(bp['kalender']),
  'chef': chef_c,
  'monatskalender': offcal_c,
  **hide_all(GARDEN_ACTORS + ['zahnraeder']),
 },
 'sharpCuts': True,
 'sfx': [{'t': r3(t_flop + sec(C, 0.5)), 'id': 'kissen-plumps', 'volume': 0.5}, {'t': r3(t_write + sec(C, 0.3)), 'id': 'stift-kritzeln', 'volume': 0.45},
         {'t': r3(t_conf + sec(C, 0.6)), 'id': 'konfetti-knall', 'volume': 0.6}, {'t': r3(t_ring), 'id': 'handy-klingeln', 'volume': 0.45}],
}

# ================= Abstimmung + Outro =================
vote = {
 'camera': [cam(0, *CAM_VOTE, 40), cam(1, *near(CAM_VOTE, 0.05), 40)],
 'actors': {'dummy': [dummy_bed(0, 'bedsit')], **bed_props(), **hide_all(GARDEN_ACTORS + OFFICE_ACTORS + ['zahnraeder', 'konfetti'])},
 'sharpCuts': True,
}
outro = {
 'camera': [cam(0, *CAM_OUTRO, 40), cam(1, *near(CAM_OUTRO, 0.06), 40)],
 'actors': {'dummy': [dummy_bed(0, 'bedwave', partyhat=1)], **bed_props(cal=True), **hide_all(GARDEN_ACTORS + OFFICE_ACTORS + ['zahnraeder']),
            'konfetti': [K(0, 0.9, -1.4, 'burst', 0, y=2.0, size=-0.4)]},
 'sharpCuts': True,
}

for sh in (situation, answer1, answer2, answer3, vote, outro): finish(sh)

scenario = {
 'id': ID,
 'format': 'spezial',
 'category': 'spezial',
 'stage': 'schlafzimmer-morgen',
 'situation': {'speech': S['situation'], 'hook': 'Du hast mal wieder verschlafen'},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'wirft den Wecker aus dem Fenster über den Zaun auf den Rasen des Nachbarn', 'explanation': S['e1'],
   'sceneExtra': EXTRA[1], 'choreography': answer1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'schlägt mit dem Hammer auf den Wecker, danach verschläft er jeden Tag', 'explanation': S['e2'],
   'sceneExtra': EXTRA[2], 'choreography': answer2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'bleibt liegen, schreibt FEIERTAG in den Kalender, Partyhütchen, Konfetti, der Chef sucht vergeblich', 'explanation': S['e3'],
   'sceneExtra': EXTRA[3], 'choreography': answer3},
 ],
 'countdown': {'speech': S['countdown'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'A, B oder C?', 'extra': 'Was soll der Dummy als Nächstes erleben?', 'extraCue': 'Und schreib auch'},
 'publishing': {'description': DESC, 'pinnedComment': PINNED},
 'shots': {'situation': situation, 'countdown': vote, 'outro': outro},
}
json.dump(scenario, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=1)
tot = sum(seclen(c) for c in ['situation', 'answer1', 'answer2', 'answer3', 'vote', 'outro'])
print(f'geschrieben: scenarios/{ID}.json  (Länge ca. {tot:.1f} s, Stimme: {"ja" if dur else "geschätzt"})')
print(f'A: Szene ab {s1}, Abwurf {t_rel}, Schnitt Garten {t_out}, Landung {t_land}, Klingeln {a_ring}')
print(f'B: Treffer {hit1} / {hit2}, Bett ab {t_bed}')
print(f'C: Flop {t_flop}, Schreiben {t_write}, Hut {t_hat}, Konfetti {t_conf}, Klingeln {t_ring}, Büro {t_office}–{t_back}')
