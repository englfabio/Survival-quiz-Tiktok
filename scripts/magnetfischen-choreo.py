# Hilfsskript: erzeugt scenarios/magnetfischen-granate.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/magnetfischen-choreo.py
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'magnetfischen-granate'
S = dict(
situation="Du hast mal wieder beim Magnetfischen eine Granate rausgezogen. Rostig, und sie hängt noch an deinem Magneten. Was machst du jetzt?",
o1c="Zurück ins Wasser werfen", o1s="Eins: Sie schnell zurück ins Wasser werfen.",
o2c="Ablegen, Abstand, 110", o2s="Zwei: Vorsichtig ablegen, Abstand halten und die 110 anrufen.",
o3c="Ins Auto, zur Polizei fahren", o3s="Drei: Sie ins Auto legen und selbst zur Polizei fahren.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer zwei.",
e1="Werfen ist das Gefährlichste, was du tun kannst. Alte Munition kann auch nach Jahrzehnten noch explodieren, schon ein Stoß kann reichen. Wenn du so etwas schon in der Hand hast: vorsichtig ablegen, niemals werfen.",
e3="Gut gemeint, aber lebensgefährlich. Die Polizei warnt ausdrücklich davor, gefundene Munition anzufassen, zu bewegen oder mitzunehmen. Im Auto rollt und rüttelt sie bei jeder Fahrt.",
e2="Leg die Granate vorsichtig ab, genau da, wo du stehst. Geh auf Abstand und warn andere. Dann ruf die 110. Die Polizei holt den Kampfmittelräumdienst, und der kümmert sich um den Rest. Genau so hat es ein Finder an der Saale gemacht, und die Polizei hat ihn dafür gelobt.",
outro="Und vorher checken, ob Magnetfischen bei dir überhaupt erlaubt ist. Wusstest du es? Schreib's in die Kommentare.",
)
LEAD = {'situation': 0.3, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'outro': 0.3}
MINLEN = {'situation': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7, 'outro': 3}
TEXT = {'situation': S['situation'], 'explain1': S['e1'], 'explain2': S['e2'], 'explain3': S['e3'], 'outro': S['outro']}
vd = f'{ROOT}/public/voice/{ID}'
dur = json.load(open(f'{vd}/durations.json')) if os.path.exists(f'{vd}/durations.json') else {}
ali = json.load(open(f'{vd}/alignment.json')) if os.path.exists(f'{vd}/alignment.json') else {}

def seclen(c):
    a = dur.get(c, 0.84 + 0.0594 * len(TEXT[c]))
    return round(max(LEAD[c] + a + 0.5, MINLEN[c]) * 30) / 30
def cue(c, phrase):
    """t (0..1) im Abschnitt, an dem phrase beginnt"""
    txt = TEXT[c]; i = txt.index(phrase); L = seclen(c)
    st = ali[c]['character_start_times_seconds'][i] if c in ali else (0.84 + 0.0594 * len(txt)) * i / len(txt)
    return round((LEAD[c] + st) / L, 4)
r3 = lambda x: round(x, 4)
def K(t, x, z, motion, face=None, **kw):
    d = {'t': r3(t), 'x': round(x, 3), 'z': round(z, 3), 'motion': motion}
    if face is not None: d['face'] = face
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    """Kamera-Zeitachse (sampleCamera glättet die Zeit: te = easeInOut(t)·0,35 + t·0,65) → Schnitte exakt treffen"""
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def cam(t, pos, look, fov=None):
    d = {'t': round(te(t), 4), 'pos': [round(v, 3) for v in pos], 'look': [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
def sec(c, s):
    """Sekunden → Anteil im Abschnitt"""
    return s / seclen(c)
HIDE = -30
def rot(face, lx, lz):
    """Dummy-/Auto-System → Welt (Drehung um y um 180 − face)"""
    th = math.radians(180 - face)
    return (lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th))

# ---- feste Plätze (Bühne kanal, siehe src/stage/Canal.tsx) ----
WATER = -1.3
DX, DZ, DF = 0.0, 0.62, 0            # Dummy an der Kaimauer, Blick aufs Wasser (−z)
CARX, CARZ, CARF = 5.6, 3.0, 270     # Auto am Uferweg, Front nach −x (Beifahrerseite zeigt zum Wasser, −z)
MAG_BOTTOM = 0.105 * 1.6              # Unterseite Magnet unter der Öse
GREN_R = 0.1                          # Granate liegt auf der Seite: Mitte so hoch über dem Boden
GREN_ON_MAG = dict(attach='magnet', x=0, y=-(MAG_BOTTOM + 0.092), z=0, tilt=78, face=20)
# Granate liegt nach dem Ablegen hier (vor dem Dummy, auf den Randsteinen)
gx, gz = rot(DF, -0.06, 0.56); GROUND = (DX + gx, DZ + gz)
def car_world(lx, lz):
    wx, wz = rot(CARF, lx, lz); return (CARX + wx, CARZ + wz)
def car_park(t=0, **kw):
    return K(t, CARX, CARZ, 'park', CARF, **kw)

# ================= Situation =================
L0 = 'situation'
c_gran = cue(L0, 'eine Granate')
c_rostig = cue(L0, 'Rostig')
c_haengt = cue(L0, 'und sie hängt')
c_was = cue(L0, 'Was machst')
rel = sec(L0, 0.7)
haul0 = sec(L0, 1.55)
up_t = r3(max(c_gran, haul0 + sec(L0, 1.8)))       # Magnet kommt über die Kante
st0 = r3(up_t + sec(L0, 0.35))                      # erschrecken
dummy0 = [K(0, DX, DZ, 'magthrow', DF), K(haul0, DX, DZ, 'haul', DF), K(r3(up_t + sec(L0, 0.1)), DX, DZ, 'haul', DF),
          K(st0, DX, DZ, 'startle', DF), K(1, DX, DZ, 'startle', DF)]
# Magnet: hängt beim Ausholen am Seil (0,28 m), fliegt ab dem Loslassen, platscht, wird hochgezogen
LAND = (0.25, -3.7)
mag0 = [K(0, 0, 0.3, 'park', 0, hand=1, drop=0.26, rope=1),
        K(r3(rel - sec(L0, 0.02)), 0, -0.2, 'toss', 0, hand=1),
        K(r3(rel + sec(L0, 0.08)), 0.03, -0.55, 'toss', 0, y=3.35, hand=0),
        K(r3(rel + sec(L0, 0.3)), 0.1, -1.6, 'toss', 0, y=3.6),
        K(r3(rel + sec(L0, 0.52)), 0.18, -2.7, 'toss', 0, y=2.7),
        K(r3(rel + sec(L0, 0.72)), LAND[0], LAND[1], 'toss', 0, y=0.0),
        K(r3(rel + sec(L0, 0.95)), LAND[0], LAND[1], 'park', 0, y=-0.5)]
# Hochziehen: Ruck für Ruck (Takt 0,5 s) zur Mauer, dann an der Mauer hoch
n = 6
path = [(LAND[0] + (0.05 - LAND[0]) * k / n, LAND[1] + (-0.36 - LAND[1]) * k / n, -0.5 + 0.15 * k / n) for k in range(1, n + 1)]
path += [(0.05, -0.36, 0.3), (0.05, -0.36, 1.2)]
for k, (x, z, y) in enumerate(path):
    mag0.append(K(r3(haul0 + (up_t - haul0) * (k + 1) / len(path)), x, z, 'park', 0, y=y))
mag0 += [K(r3(up_t + sec(L0, 0.02)), 0.05, -0.36, 'park', 0, y=1.2, hand=0, drop=0.34),
         K(r3(st0 + sec(L0, 0.15)), 0.05, -0.36, 'park', 0, y=1.2, hand=1, drop=0.34), K(1, 0.05, -0.36, 'park', 0, y=1.2)]
gat = r3(rel + sec(L0, 1.0))
gren0 = [K(0, 0, 0, 'park', 0, y=HIDE), K(gat, 0, 0, 'park', 0, y=HIDE), K(r3(gat + 0.001), **GREN_ON_MAG, motion='park'), K(1, **GREN_ON_MAG, motion='park')]
splash0 = [K(0, LAND[0], LAND[1], 'park', 0, y=HIDE), K(r3(rel + sec(L0, 0.72)), LAND[0], LAND[1], 'splash', 0, y=0, size=-0.55)]
WIDE0 = ([2.4, 1.8, -4.4], [0.1, 0.85, 0.4])
situation = {
 'camera': [cam(0, [1.2, 2.9, 5.0], [0.25, 0.0, -2.0]), cam(r3(up_t - 0.004), [1.15, 2.8, 4.6], [0.25, 0.0, -2.0]),
            cam(r3(up_t), *WIDE0), cam(r3(c_rostig - 0.004), [2.3, 1.75, -4.2], [0.1, 0.85, 0.4]),
            cam(r3(c_rostig), [1.15, 1.1, -2.2], [0.04, 0.85, 0.1]), cam(r3(c_was - 0.004), [1.05, 1.07, -2.0], [0.04, 0.85, 0.1]),
            cam(r3(c_was), *WIDE0), cam(1, [2.25, 1.75, -4.1], [0.1, 0.85, 0.4])],
 'actors': {'dummy': dummy0, 'magnet': mag0, 'granate': gren0, 'splash': splash0, 'car': [car_park()]},
 'sfx': [{'t': r3(rel - sec(L0, 0.15)), 'id': 'whoosh', 'volume': 0.45},
         {'t': r3(rel + sec(L0, 0.7)), 'id': 'magnet-platsch', 'volume': 0.6},
         {'t': r3(haul0), 'id': 'seil-ziehen', 'volume': 0.5},
         {'t': r3(up_t - sec(L0, 0.1)), 'id': 'spaten-klonk', 'volume': 0.35},
         {'t': r3(st0), 'id': 'herzschlag', 'volume': 0.5}],
}

# ================= Optionen / Countdown / Auflösung =================
def held_scene():
    return {'dummy': [K(0, DX, DZ, 'startle', DF)],
            'magnet': [K(0, 0.05, -0.36, 'park', 0, y=1.2, hand=1, drop=0.34, rope=1)],
            'granate': [K(0, **GREN_ON_MAG, motion='park')],
            'car': [car_park()]}
def still(p0, l0, p1, l1):
    return {'camera': [cam(0, p0, l0), cam(1, p1, l1)], 'actors': held_scene()}
OL = [0.2, -0.1, 0.6]
options = still([4.0, 4.0, -9.5], OL, [3.9, 3.9, -9.2], OL)
countdown = still([3.9, 3.9, -9.2], OL, [3.8, 3.8, -8.95], OL)
reveal = still([3.8, 3.8, -8.95], OL, [3.75, 3.75, -8.8], OL)

# ================= Option 1: zurück ins Wasser werfen (falsch) =================
L1 = 'explain1'
w0 = sec(L1, 0.45)
fz1 = r3(w0 + sec(L1, 1.25))
MAGL = rot(DF, 0.45, 0.25)
exp1 = {
 'camera': [cam(0, [-2.5, 2.05, -5.4], [0.0, 1.05, 0.6]), cam(fz1, [-2.4, 2.0, -5.2], [0.0, 1.05, 0.6]), cam(1, [-2.3, 1.98, -5.0], [0.0, 1.05, 0.6])],
 'actors': {
  'dummy': [K(0, DX, DZ, 'holdgren', DF), K(w0, DX, DZ, 'windup', DF), K(1, DX, DZ, 'windup', DF)],
  'granate': [K(0, DX, DZ, 'park', 0, hand=1, drop=0.03, tilt=10), K(1, DX, DZ, 'park', 0)],
  'magnet': [K(0, DX + MAGL[0], DZ + MAGL[1], 'park', 30, y=0.168, rope=0)],
  'car': [car_park()],
 },
 'freeze': fz1,
 'sfx': [{'t': r3(w0 + sec(L1, 0.3)), 'id': 'whoosh', 'volume': 0.3}],
}

# ================= Option 3: ins Auto, zur Polizei fahren (falsch) =================
L3 = 'explain3'
# Dummy steht am offenen Beifahrerfenster (Auto-System x −1.12, z −0.1), Blick ins Auto
PX, PZ = car_world(-1.12, -0.12)
PF = 180      # Blick zur Fahrzeugmitte (Auto face 270 → Beifahrerseite zeigt nach −z → Dummy schaut nach +z)
SEAT = dict(attach='car', x=-0.3, y=0.6, z=-0.14, face=90, tilt=80)
pl0 = sec(L3, 0.25)
hand_off0 = r3(pl0 + sec(L3, 1.0)); hand_off1 = r3(pl0 + sec(L3, 1.3))
cut3 = r3(max(pl0 + sec(L3, 2.5), cue(L3, 'Die Polizei') - sec(L3, 0.2)))
drv_end = 1.0
SPEED = 2.6
fz3 = r3(cut3 + sec(L3, 2.1))
x_end = CARX - SPEED * (seclen(L3) * (1 - cut3))
car3 = [car_park(0, window2=1), car_park(r3(cut3 - 0.002)), K(cut3, CARX, CARZ, 'drive', CARF, rumble=1), K(1, x_end, CARZ, 'drive', CARF)]
dummy3 = [K(0, PX, PZ, 'holdgren', PF), K(pl0, PX, PZ, 'placeseat', PF), K(r3(cut3 - 0.002), PX, PZ, 'placeseat', PF),
          K(cut3, attach='car', x=0.3, z=-0.2, y=0, face=0, motion='buckled'), K(1, attach='car', x=0.3, z=-0.2, y=0, face=0, motion='buckled')]
gren3 = [K(0, PX, PZ, 'park', 0, hand=1, drop=0.03, tilt=10), K(hand_off0, **SEAT, motion='park', hand=1),
         K(hand_off1, **SEAT, motion='park', hand=0), K(r3(cut3 - 0.002), **SEAT, motion='park', rumble=0),
         K(cut3, **SEAT, motion='park', rumble=1), K(1, **SEAT, motion='park')]
def track(t, xoff=0.0, frozen=False):
    x = CARX - SPEED * seclen(L3) * max(0, min(t, fz3) - cut3)
    if frozen: xoff = 0.12   # nach dem Einfrieren fährt die Kamera nur noch ein kleines Stück
    # Kamera neben dem Auto (Wasserseite), schaut von schräg oben durchs offene Beifahrerfenster auf den Sitz
    return cam(t, [x - 0.1 + xoff, 2.8, 0.55], [x + 0.14 + xoff, 0.75, CARZ - 0.3], fov=50)
exp3 = {
 'camera': [cam(0, [PX + 4.4, 2.7, PZ - 2.2], [PX - 0.3, 0.8, PZ + 0.6]), cam(r3(cut3 - 0.004), [PX + 4.1, 2.6, PZ - 2.0], [PX - 0.3, 0.8, PZ + 0.6]),
            *[track(r3(cut3 + (fz3 - cut3) * k / 12)) for k in range(13)], track(1, frozen=True)],
 'actors': {'car': car3, 'dummy': dummy3, 'granate': gren3,
            'magnet': [K(0, DX + 0.2, DZ - 0.3, 'park', 30, y=0.168, rope=0)]},
 'freeze': fz3,
 'sfx': [{'t': r3(cut3), 'id': 'kopfsteinpflaster', 'volume': 0.6}],
}

# ================= Option 2: ablegen, Abstand, 110 (richtig) =================
L2 = 'explain2'
c_leg = cue(L2, 'Leg die Granate')
c_genau = cue(L2, 'genau da')
c_abst = cue(L2, 'Geh auf Abstand')
c_warn = cue(L2, 'und warn andere')
c_ruf = cue(L2, 'Dann ruf die 110')
c_pol = cue(L2, 'Die Polizei holt')
c_saale = cue(L2, 'Genau so hat')
lw0 = r3(max(sec(L2, 0.1), c_leg - sec(L2, 0.1)))
touch = r3(lw0 + sec(L2, 1.8))
uh0 = r3(max(touch + sec(L2, 0.15), c_genau))
uh1 = r3(uh0 + sec(L2, 2.2))
rt0 = r3(max(uh1 + sec(L2, 0.05), c_abst))
FAR = (-2.6, 4.2)
wn0 = r3(max(rt0 + sec(L2, 2.6), c_warn))
rt1 = r3(wn0 - sec(L2, 0.15))
call0 = r3(max(wn0 + sec(L2, 1.6), c_ruf))
dummy2 = [K(0, DX, DZ, 'startle', DF), K(lw0, DX, DZ, 'lowerset', DF), K(uh0, DX, DZ, 'unhook', DF), K(rt0, DX, DZ, 'retreat', DF),
          K(rt1, FAR[0], FAR[1], 'retreat', 15), K(wn0, FAR[0], FAR[1], 'warn', 290), K(r3(call0 - 0.002), FAR[0], FAR[1], 'warn', 290),
          K(call0, FAR[0], FAR[1], 'call', 25), K(1, FAR[0], FAR[1], 'call', 25)]
mag2 = [K(0, 0.05, -0.36, 'park', 0, y=1.2, hand=1, drop=0.34, rope=1), K(lw0, 0.05, -0.36, 'park', 0, y=1.2, drop=0.34),
        K(touch, 0.05, -0.36, 'park', 0, y=1.2, drop=0.0), K(uh0, 0.05, -0.36, 'park', 0, y=1.2, drop=0.0),
        K(r3(uh0 + sec(L2, 1.2)), 0.05, -0.36, 'park', 0, y=1.2, drop=0.08), K(uh1, 0.05, -0.36, 'park', 0, y=1.2, drop=0.22), K(1, 0.05, -0.36, 'park', 0, y=1.2)]
GROUND_KEY = dict(x=GROUND[0], z=GROUND[1], y=GREN_R, tilt=82, face=20)
gren2 = [K(0, **GREN_ON_MAG, motion='park'), K(r3(touch - 0.002), **GREN_ON_MAG, motion='park'),
         K(touch, **GROUND_KEY, motion='park'), K(1, **GROUND_KEY, motion='park')]
# Spaziergänger (Nachbar-Figur, blau) kommt links den Uferweg entlang, bleibt stehen, dreht um
NZ = 3.2
nb0 = r3(max(0, wn0 - sec(L2, 3.0)))
nachbar2 = [K(0, -12, NZ, 'walk', 90), K(nb0, -12, NZ, 'walk', 90), K(r3(wn0 + sec(L2, 0.2)), -3.7, NZ, 'walk', 90),
            K(r3(wn0 + sec(L2, 0.25)), -3.7, NZ, 'stand', 90), K(r3(wn0 + sec(L2, 0.9)), -3.7, NZ, 'stand', 90),
            K(r3(wn0 + sec(L2, 1.0)), -3.7, NZ, 'walk', 270), K(r3(wn0 + sec(L2, 6.0)), -15, NZ, 'walk', 270), K(1, -15, NZ, 'stand', 270)]
exp2 = {
 'camera': [cam(0, [2.3, 2.75, -6.45], [0.5, 0.8, 0.4]), cam(r3(rt0 - 0.004), [2.1, 2.65, -6.1], [0.5, 0.75, 0.4]),
            cam(r3(rt0), [-0.6, 3.1, -9.0], [-1.4, 0.25, 2.5]), cam(r3(wn0), [-0.8, 3.2, -9.5], [-1.4, 0.2, 2.5]),
            cam(r3(c_pol), [-0.8, 3.15, -9.3], [-1.4, 0.2, 2.5]), cam(1, [-0.75, 3.05, -8.9], [-1.4, 0.25, 2.5])],
 'actors': {'dummy': dummy2, 'magnet': mag2, 'granate': gren2, 'nachbar': nachbar2, 'car': [car_park()]},
 'flash': call0,
 'sfx': [{'t': r3(call0 + sec(L2, 0.3)), 'id': 'handy-waehlen', 'volume': 0.45}],
}
steps2 = [{'text': 'Vorsichtig ablegen', 'cue': 'Leg die Granate'},
          {'text': 'Niemals werfen', 'cue': 'genau da'},
          {'text': 'Abstand halten, andere warnen', 'cue': 'Geh auf Abstand'},
          {'text': '110 anrufen', 'cue': 'Dann ruf die 110'}]

# ================= Outro: Dummy mit leerem Magneten an der Kaimauer =================
outro = {
 'camera': [cam(0, [1.8, 1.5, -3.6], [-0.1, 2.2, 1.0]), cam(1, [1.65, 1.48, -3.35], [-0.1, 2.2, 1.0])],
 'actors': {'dummy': [K(0, DX - 0.2, DZ + 0.5, 'stand', 340)],
            'magnet': [K(0, 0, 0, 'park', 0, y=1.0, hand=1, drop=0.38, rope=1)],
            'car': [car_park()]},
}

DESC = ("Du hast mal wieder beim Magnetfischen eine Granate rausgezogen – was machst du jetzt? 🧲💣 Schreib 1, 2 oder 3 in die Kommentare!\n\n"
        "Wichtig: Magnetfischen ist nicht überall erlaubt. Jedes Bundesland regelt das selbst, in Schleswig-Holstein ist es zum Beispiel in landeseigenen Gewässern verboten. Informier dich vorher.\n\n"
        "Quellen:\n"
        "Stadt Köln, Was mache ich, wenn ich ein Kampfmittel finde?: https://www.stadt-koeln.de/leben-in-koeln/sicherheit-ordnung/kampfmittelangelegenheiten/was-mache-ich-wenn-ich-ein-kampfmittel-finde\n"
        "Land Schleswig-Holstein, Magnetangeln: https://www.schleswig-holstein.de/uxo/DE/Themen/Fachinhalte/magnetangeln/textMagnetangeln\n"
        "Polizeimeldung zum Granatenfund in der Saale (inFranken): https://www.infranken.de/lk/main-spessart/blaulicht/graefendorf-mann-findet-granate-in-der-saale-und-verstaendigt-polizei-art-6384556\n\n"
        "Im Notfall: 110.\n\n"
        "#waswürdestdutun #magnetfischen #magnetangeln #granate #fundstücke #wusstestdu #survival #quiz")
scen = {
 'id': ID, 'category': 'fundstuecke', 'stage': 'kanal',
 'situation': {'speech': S['situation'], 'hook': 'Du hast mal wieder eine Granate geangelt'},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy hält die Granate in der Hand und holt weit aus, um sie zurück ins Wasser zu werfen. Bild friert im Ausholen ein, rotes Aufleuchten. Keine Explosion.', 'explanation': S['e1'], 'choreography': exp1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy geht in die Hocke, setzt die Granate vorsichtig am Ufer ab, löst den Magneten, geht langsam rückwärts weg, warnt einen Spaziergänger und telefoniert aus sicherer Entfernung. Grünes Aufleuchten.', 'explanation': S['e2'], 'steps': steps2, 'choreography': exp2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy legt die Granate durchs offene Fenster auf den Beifahrersitz und fährt los, das Auto rumpelt über Kopfsteinpflaster, die Granate rüttelt auf dem Sitz. Bild friert ein, rotes Aufleuchten. Keine Explosion.', 'explanation': S['e3'], 'choreography': exp3},
 ],
 'correctOption': 2,
 'countdown': {'speech': S['countdown'], 'screen': 'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal': {'speech': S['reveal'], 'screen': 'Richtig ist Nummer 2'},
 'outro': {'speech': S['outro'], 'screen': S['outro']},
 'sourceLine': 'Quellen: Stadt Köln · Land Schleswig-Holstein · Polizei',
 'sources': [
  {'name': 'Stadt Köln, Was mache ich, wenn ich ein Kampfmittel finde?', 'url': 'https://www.stadt-koeln.de/leben-in-koeln/sicherheit-ordnung/kampfmittelangelegenheiten/was-mache-ich-wenn-ich-ein-kampfmittel-finde'},
  {'name': 'Land Schleswig-Holstein, Magnetangeln', 'url': 'https://www.schleswig-holstein.de/uxo/DE/Themen/Fachinhalte/magnetangeln/textMagnetangeln'},
  {'name': 'Polizeimeldung zum Granatenfund in der Saale (inFranken)', 'url': 'https://www.infranken.de/lk/main-spessart/blaulicht/graefendorf-mann-findet-granate-in-der-saale-und-verstaendigt-polizei-art-6384556'},
 ],
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ehrlich: Wer hätte sie zurück ins Wasser geworfen? 👇 Was soll der Dummy als Nächstes finden?",
 },
 'shots': {'situation': situation, 'options': options, 'countdown': countdown, 'reveal': reveal, 'outro': outro},
}
for _sh in [situation, options, countdown, reveal, outro, exp1, exp2, exp3]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
print('cues', dict(gran=c_gran, rostig=c_rostig, up=up_t, st0=st0, fz1=fz1, cut3=cut3, fz3=fz3, lw0=lw0, touch=touch, uh0=uh0, rt0=rt0, wn0=wn0, call0=call0),
      'audio' if dur else 'geschätzt', {k: seclen(k) for k in TEXT})
