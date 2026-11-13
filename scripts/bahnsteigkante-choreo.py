# Hilfsskript: erzeugt scenarios/bahnsteigkante-sog.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/bahnsteigkante-choreo.py
# Darstellung (Vorgabe Inhaber): Niemand fällt ins Gleis, niemand wird vom Zug erfasst. Falsche Optionen frieren ein,
# BEVOR etwas passiert (Zug ist dann noch weit weg). check_safe() prüft das rechnerisch.
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'bahnsteigkante-sog'
S = dict(
situation="Du hast mal wieder fast deinen Zug verpasst und stehst ganz vorne an der Bahnsteigkante. Da kündigt die Durchsage einen durchfahrenden Zug an. Was machst du jetzt?",
o1c="Hinter die weiße Linie", o1s="Eins: Sofort hinter die weiße Linie zurückgehen.",
o2c="Stehen bleiben, ist ja nicht im Gleis", o2s="Zwei: Einfach stehen bleiben, du bist ja nicht im Gleis.",
o3c="Handy raus, Zug filmen", o3s="Drei: Handy raus und den Zug filmen. So nah sieht man den selten.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer eins.",
e1="Geh sofort hinter die weiße Linie und bleib dort, bis der Zug steht oder vorbei ist. Genau dafür ist die Linie da. Die Bundespolizei sagt: Solange ein Zug nicht steht, sollte niemand zwischen Bahnsteigkante und weißer Linie stehen. Und auch wenn kein Zug kommt: Niemals ins Gleis. In der Oberleitung fließen 15.000 Volt.",
e2="Gefährlich. Ein schnell durchfahrender Zug erzeugt einen starken Sog. Wer zu nah an der Bahnsteigkante steht, kann zum Zug gezogen und mitgerissen werden.",
e3="Kein Video ist das wert. Wer aufs Handy schaut, merkt nicht, wie nah er der Kante kommt. Und Züge sind oft schneller und leiser, als man denkt.",
outro="Wusstest du es? Schreib's in die Kommentare.",
)
LEAD = {'situation': 0.3, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'outro': 0.3}
MINLEN = {'situation': 5, 'explain1': 7, 'explain2': 6, 'explain3': 6, 'outro': 3}
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
def face_to(a, b):
    """Blickrichtung (Grad) von Punkt a zu Punkt b (face 0 = −z, 90 = +x)"""
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)

# ---- feste Plätze (Bühne "bahnsteig", siehe src/stage/Station.tsx) ----
EDGE = 0.0                 # Bahnsteigkante (z)
LINE = 0.8                 # weiße Linie (Mitte, 0,2 m breit)
DX = 0.0
DZ_EDGE = 0.36             # Dummy ganz vorn an der Kante (Fußspitzen ca. 0,2 m vor der Kante)
DZ_SAFE = 1.9              # Dummy deutlich hinter der weißen Linie
CUP = (-1.3, 0.17)         # Becher an der Kante
TZ = -1.75                 # Gleis 3 (Mitte)
TRAIN_LEN = 5 * 17.5 + 4 * 0.55
WAVES = (-2.22, 3.48, 2.15)  # Schallwellen rechts neben dem Lautsprecher-Trichter (-2.45, 3.55, 2.42)
DUMMY_LOOK = dict(jacket=1)

def train_keys(L, x_at, t_at, speed, t_from=0.0, t_to=1.0):
    """Zug fährt nach +x (face 90) mit gleichem Tempo; x_at = Nasenposition zum Zeitpunkt t_at (Anteil)"""
    def xs(t): return x_at + (t - t_at) * seclen(L) * speed
    return [K(t_from, xs(t_from), TZ, 'pass', 90), K(t_to, xs(t_to), TZ, 'pass', 90)]

SAFETY = []
def check_safe(name, dummy_z_at_freeze, train_nose_x_at_freeze, dummy_x=0.0):
    """Falsche Option: beim Einfrieren muss der Dummy auf dem Bahnsteig stehen und der Zug noch weit weg sein."""
    ok = dummy_z_at_freeze > 0.25 and train_nose_x_at_freeze < dummy_x - 12
    SAFETY.append((name, round(dummy_z_at_freeze, 2), round(train_nose_x_at_freeze, 1), 'OK' if ok else 'FEHLER'))
    assert ok, f'{name}: unsicher beim Einfrieren'

# ================= Situation =================
L0 = 'situation'
c_da = cue(L0, 'Da kündigt')
c_was = cue(L0, 'Was machst')
RUN0 = (0.6, 4.6)
arrive = sec(L0, 1.45)
per0 = r3(c_da + sec(L0, 0.35))
dummy0 = [K(0, RUN0[0], RUN0[1], 'run', face_to(RUN0, (DX, DZ_EDGE)), breath=0, **DUMMY_LOOK),
          K(arrive, DX, DZ_EDGE, 'run', face_to(RUN0, (DX, DZ_EDGE))),
          K(r3(arrive + 0.002), DX, DZ_EDGE, 'pant', 0, breath=1.6, heave=0.9),
          K(r3(per0 - 0.002), DX, DZ_EDGE, 'pant', 0, breath=1.4, heave=0.7),
          K(per0, DX, DZ_EDGE, 'perkup', 0, breath=0.9, heave=0.3),
          K(1, DX, DZ_EDGE, 'perkup', 0, breath=0.6, heave=0.1)]
waves0 = [K(0, WAVES[0], WAVES[2], 'park', 0, y=WAVES[1]), K(r3(c_da - sec(L0, 0.25)), WAVES[0], WAVES[2], 'show', 0, y=WAVES[1], size=0.25),
          K(r3(min(c_was - sec(L0, 0.1), c_da + sec(L0, 4.2))), WAVES[0], WAVES[2], 'park', 0, y=WAVES[1])]
cup = lambda t=0: K(t, CUP[0], CUP[1], 'park', 0)
situation = {
 'camera': [cam(0, [3.3, 3.1, 10.2], [-0.9, 0.8, 1.2]), cam(r3(arrive + sec(L0, 0.3)), [3.05, 2.92, 9.5], [-0.4, 0.75, 0.25]),
            cam(r3(c_da - 0.004), [2.95, 2.88, 9.2], [-0.4, 0.75, 0.2]),
            cam(r3(c_da), [-6.2, 2.5, 10.4], [-0.6, 1.4, 0.6]), cam(r3(c_was - 0.004), [-5.8, 2.45, 9.9], [-0.6, 1.42, 0.6]),
            cam(r3(c_was), [2.6, 1.55, -5.4], [-0.3, 0.62, 0.6]), cam(1, [2.4, 1.52, -5.0], [-0.3, 0.62, 0.6])],
 'actors': {'dummy': dummy0, 'durchsage': waves0, 'becher': [cup()]},
 'sfx': [{'t': r3(arrive), 'id': 'herzschlag', 'volume': 0.25}, {'t': r3(c_da - sec(L0, 0.35)), 'id': 'durchsage-gong', 'volume': 0.6}],
}

# ================= Optionen / Countdown / Auflösung =================
OL = [0.54, -0.83, -0.44]
def still(p0, p1):
    return {'camera': [cam(0, p0, OL), cam(1, p1, OL)],
            'actors': {'dummy': [K(0, DX, DZ_EDGE, 'edgelean', 0, **DUMMY_LOOK)], 'becher': [cup()]}}
options = still([15.8, 4.3, 3.2], [15.5, 4.24, 3.01])
countdown = still([15.5, 4.24, 3.01], [15.1, 4.18, 2.85])
reveal = still([15.1, 4.18, 2.85], [14.9, 4.15, 2.78])

# ================= Option 2: stehen bleiben (falsch, als Erstes erklärt) =================
L2 = 'explain2'
V2 = 32.0
fz2 = sec(L2, 4.2)
NOSE2 = -17.0
sog2 = [K(0, DX, 0.55, 'park', 0, wind=0, drift=0.5), K(sec(L2, 1.6), DX, 0.55, 'park', 0, wind=0.0), K(fz2, DX, 0.55, 'park', 0, wind=0.95),
        K(1, DX, 0.55, 'park', 0, wind=0.95)]
dummy2 = [K(0, DX, DZ_EDGE, 'edgelean', 0, wind=0, **DUMMY_LOOK), K(sec(L2, 1.8), DX, DZ_EDGE, 'edgelean', 0, wind=0, drift=0.5),
          K(fz2, DX, DZ_EDGE, 'edgelean', 0, wind=0.8), K(1, DX, DZ_EDGE, 'edgelean', 0, wind=0.8)]
check_safe('Option 2', DZ_EDGE, NOSE2)
exp2 = {
 'camera': [cam(0, [13.1, 3.45, 3.3], [-8.39, 0.0, -0.59]), cam(fz2, [12.51, 3.31, 3.1], [-8.39, 0.0, -0.59]), cam(1, [12.1, 3.25, 3.0], [-8.39, 0.02, -0.59])],
 'actors': {'dummy': dummy2, 'zug': train_keys(L2, NOSE2, fz2, V2), 'sog': sog2, 'becher': [cup()]},
 'freeze': r3(fz2),
 'sfx': [{'t': r3(sec(L2, 0.4)), 'id': 'zug-naht', 'volume': 0.55}, {'t': r3(fz2 - sec(L2, 1.6)), 'id': 'wind-sog', 'volume': 0.45}],
}

# ================= Option 3: Handy raus, filmen (falsch) =================
L3 = 'explain3'
V3 = 30.0
fz3 = sec(L3, 4.4)
NOSE3 = -18.0
F3 = 318
P30 = (0.35, 1.0)        # startet auf/an der weißen Linie
P31 = (-0.2, 0.42)       # beim Einfrieren: ganz vorn, aber noch auf dem Bahnsteig
dummy3 = [K(0, P30[0], P30[1], 'filmphone', F3, wind=0, **DUMMY_LOOK), K(sec(L3, 0.7), P30[0], P30[1], 'filmphone', F3),
          K(fz3, P31[0], P31[1], 'filmphone', F3, wind=0.55, drift=0.4), K(1, P31[0], P31[1], 'filmphone', F3)]
phone3 = [K(0, P30[0], P30[1], 'park', (F3 + 180) % 360, hand=1, drop=0)]
sog3 = [K(0, P31[0], 0.6, 'park', 0, wind=0, drift=0.4), K(sec(L3, 2.2), P31[0], 0.6, 'park', 0, wind=0), K(fz3, P31[0], 0.6, 'park', 0, wind=0.7),
        K(1, P31[0], 0.6, 'park', 0, wind=0.7)]
check_safe('Option 3', P31[1], NOSE3, P31[0])
# Über die Schulter: hinter dem Dummy (rechts), Blick am Handy vorbei auf das Gleis, wo der Zug kommt
fw = (math.sin(math.radians(F3)), -math.cos(math.radians(F3)))
rt = (math.cos(math.radians(F3)), math.sin(math.radians(F3)))   # rechts vom Dummy
cut3 = r3(sec(L3, 2.3))
def osh(p, back=0.62, side=0.34, h=1.97):
    return [p[0] - fw[0] * back + rt[0] * side, h, p[1] - fw[1] * back + rt[1] * side]
def oshl(p):
    return [p[0] + fw[0] * 0.36, 1.42, p[1] + fw[1] * 0.36]
P3c = (P30[0] + (P31[0] - P30[0]) * 0.35, P30[1] + (P31[1] - P30[1]) * 0.35)
exp3 = {
 'camera': [cam(0, osh(P30), oshl(P30)), cam(r3(cut3 - 0.004), osh(P3c, 0.7), oshl(P3c)),
            cam(cut3, [12.5, 3.7, 3.45], [-6.05, 0.24, -0.13]), cam(fz3, [12.0, 3.6, 3.3], [-6.05, 0.24, -0.13]), cam(1, [11.6, 3.52, 3.2], [-6.05, 0.26, -0.13])],
 'actors': {'dummy': dummy3, 'filmhandy': phone3, 'zug': train_keys(L3, NOSE3, fz3, V3), 'sog': sog3, 'becher': [cup()]},
 'freeze': r3(fz3),
 'sfx': [{'t': r3(sec(L3, 0.6)), 'id': 'zug-naht', 'volume': 0.4}],
}

# ================= Option 1: hinter die weiße Linie (richtig, zum Schluss) =================
L1 = 'explain1'
c_geh = cue(L1, 'Geh sofort')
c_bleib = cue(L1, 'bleib dort')
c_genau = cue(L1, 'Genau dafür')
c_bp = cue(L1, 'Die Bundespolizei')
c_soll = cue(L1, 'sollte niemand')
c_und = cue(L1, 'Und auch wenn')
c_nie = cue(L1, 'Niemals ins Gleis')
c_ober = cue(L1, 'In der Oberleitung')
V1 = 36.0
hb0 = r3(max(sec(L1, 0.3), c_geh - sec(L1, 0.1)))
hb1 = r3(hb0 + sec(L1, 1.45))
pass_x0 = r3(hb1 + sec(L1, 1.4))            # Nase erreicht den Dummy (x 0)
tail_t = r3(pass_x0 + sec(L1, TRAIN_LEN / V1))
cup_t = r3(pass_x0 + sec(L1, CUP[0] / V1 + 0.03))
dummy1 = [K(0, DX, DZ_EDGE, 'edgelean', 0, wind=0, **DUMMY_LOOK), K(hb0, DX, DZ_EDGE, 'hurryback', 0), K(hb1, DX, DZ_SAFE, 'hurryback', 0),
          K(r3(hb1 + 0.002), DX, DZ_SAFE, 'brace', 0), K(r3(pass_x0 - sec(L1, 0.25)), DX, DZ_SAFE, 'brace', 0, wind=0, drift=0.8),
          K(r3(pass_x0 + sec(L1, 0.25)), DX, DZ_SAFE, 'brace', 0, wind=0.38), K(tail_t, DX, DZ_SAFE, 'brace', 0, wind=0.32),
          K(r3(tail_t + sec(L1, 0.8)), DX, DZ_SAFE, 'brace', 0, wind=0), K(1, DX, DZ_SAFE, 'brace', 0)]
# Kopf folgt dem Zug: "brace" dreht den Kopf 0,8–2,6 s nach Beginn von links nach rechts → Beginn so legen, dass die Nase in der Mitte ist
sog1 = [K(0, DX + 0.8, 0.5, 'park', 0, wind=0, drift=0.85, size=0.3), K(r3(pass_x0 - sec(L1, 0.35)), DX + 0.8, 0.5, 'park', 0, wind=0),
        K(r3(pass_x0 + sec(L1, 0.15)), DX + 0.8, 0.5, 'park', 0, wind=0.9), K(tail_t, DX + 0.8, 0.5, 'park', 0, wind=0.8),
        K(r3(tail_t + sec(L1, 0.7)), DX + 0.8, 0.5, 'park', 0, wind=0), K(1, DX + 0.8, 0.5, 'park', 0, wind=0)]
cup1 = [cup(0), cup(r3(cup_t - 0.002)),
        K(cup_t, CUP[0], CUP[1], 'toss', 0, y=0.0),
        K(r3(cup_t + sec(L1, 0.15)), CUP[0] + 0.4, 0.07, 'toss', 0, y=0.9),
        K(r3(cup_t + sec(L1, 0.4)), CUP[0] + 1.9, 0.04, 'toss', 0, y=2.0),
        K(r3(cup_t + sec(L1, 0.9)), CUP[0] + 14.0, 0.03, 'toss', 0, y=2.7),
        K(r3(cup_t + sec(L1, 0.902)), CUP[0] + 20.0, 0.03, 'park', 0, y=HIDE), K(1, CUP[0] + 20.0, 0.03, 'park', 0, y=HIDE)]
SIGN = (-2.6, TZ)
sign1 = [K(0, SIGN[0], SIGN[1], 'park', 0, y=HIDE), K(r3(c_ober - sec(L1, 0.15) - 0.002), SIGN[0], SIGN[1], 'park', 0, y=HIDE),
         K(r3(c_ober - sec(L1, 0.15)), SIGN[0], SIGN[1], 'show', 0, y=5.27, below=1, size=4.5, text='15.000 Volt'), K(1, SIGN[0], SIGN[1], 'show', 0)]
# Kamera: A = Zurückgehen + Durchfahrt (von der Hallenseite, rechts), B = flach über die weiße Linie, C = Blick hoch zur Oberleitung
cutB = r3(max(tail_t + sec(L1, 1.2), c_genau - sec(L1, 0.2)))
cutC = r3(c_ober - sec(L1, 0.25))
exp1 = {
 'camera': [cam(0, [6.9, 2.99, 12.47], [-0.98, 0.76, 1.53]), cam(r3(hb1), [6.75, 2.96, 12.2], [-0.98, 0.76, 1.53]), cam(r3(cutB - 0.004), [6.4, 2.9, 11.6], [-0.98, 0.78, 1.53]),
            cam(cutB, [-1.8, 2.6, -5.6], [0.8, 0.2, 1.5]), cam(r3(cutC - 0.004), [-1.6, 2.5, -5.2], [0.8, 0.2, 1.5]),
            cam(cutC, [-2.2, 1.3, 4.0], [-3.4, 4.0, -1.75]), cam(1, [-2.1, 1.3, 3.7], [-3.4, 4.05, -1.75])],
 'actors': {'dummy': dummy1, 'zug': train_keys(L1, 0.0, pass_x0, V1), 'sog': sog1, 'becher': cup1, 'hinweis': sign1},
 'flash': r3(hb1),
 'sfx': [{'t': r3(pass_x0 - sec(L1, 1.6)), 'id': 'zug-durchfahrt', 'volume': 0.7}, {'t': r3(pass_x0 - sec(L1, 0.1)), 'id': 'wind-sog', 'volume': 0.4}],
}
steps1 = [{'text': 'Hinter die weiße Linie', 'cue': 'Geh sofort'},
          {'text': 'Dort bleiben, bis der Zug steht', 'cue': 'bleib dort'},
          {'text': 'Keine Videos an der Kante', 'cue': 'sollte niemand'},
          {'text': 'Nie ins Gleis', 'cue': 'Niemals ins Gleis'}]

# ================= Outro: Dummy sicher hinter der Linie, winkt =================
outro = {
 'camera': [cam(0, [3.75, 2.45, 16.0], [0.05, 2.2, 1.71]), cam(1, [3.6, 2.4, 15.5], [0.05, 2.2, 1.71])],
 'actors': {'dummy': [K(0, DX, DZ_SAFE, 'stand', 180, **DUMMY_LOOK), K(0.15, DX, DZ_SAFE, 'wave', 180), K(1, DX, DZ_SAFE, 'wave', 180)], 'becher': [cup()]},
}

DESC = ("Du hast mal wieder fast deinen Zug verpasst und stehst ganz vorne an der Kante – was machst du jetzt? 🚆 Schreib 1, 2 oder 3 in die Kommentare!\n\n"
        "Die weiße Linie ist kein Deko-Element: Durchfahrende Züge erzeugen einen gefährlichen Sog.\n\n"
        "Quellen:\n"
        "Deutsche Bahn, Unfälle vermeiden: https://www.deutschebahn.com/de/konzern/Im-Fokus/Unfaelle-vermeiden-13001562\n"
        "Deutsche Bahn, Präventionsteams: https://www.deutschebahn.com/de/nachhaltigkeit/verantwortung_gesellschaft/unfallpraevention/Mit-den-DB-Praeventionsteams-sicher-unterwegs-an-Gleisen-und-Bahnhoefen-6852942\n"
        "Bundespolizei-Warnung nach Gleisunfall (News4teachers): https://www.news4teachers.de/2025/09/schueler-faellt-vor-einfahrendem-zug-aufs-gleis-lokfuehrer-reagiert-sofort/\n\n"
        "Im Notfall: 112.\n\n"
        "#waswürdestdutun #bahn #bahnhof #zug #weißelinie #wusstestdu #sicherheit #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'category': 'alltag', 'stage': 'bahnsteig',
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy geht zügig hinter die weiße Linie und bleibt dort stehen. Der Zug rast vorbei, nur seine Jacke flattert leicht, ein Becher an der Kante wird vom Sog mitgerissen. Grünes Aufleuchten.', 'explanation': S['e1'], 'steps': steps1, 'choreography': exp1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy bleibt an der Kante stehen und neigt sich leicht vor, der Zug nähert sich, Windlinien ziehen bereits an seiner Jacke. Bild friert ein, BEVOR etwas passiert, rotes Aufleuchten.', 'explanation': S['e2'], 'choreography': exp2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy hält das Handy hoch und filmt, schaut nur aufs Display und rutscht dabei Richtung Kante, der Zug nähert sich. Bild friert ein, BEVOR etwas passiert, rotes Aufleuchten.', 'explanation': S['e3'], 'choreography': exp3},
 ],
 'correctOption': 1,
 'countdown': {'speech': S['countdown'], 'screen': 'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal': {'speech': S['reveal'], 'screen': 'Richtig ist Nummer 1'},
 'outro': {'speech': S['outro'], 'screen': S['outro']},
 'sourceLine': 'Quellen: Deutsche Bahn · Bundespolizei',
 'sources': [
  {'name': 'Deutsche Bahn, Unfälle vermeiden', 'url': 'https://www.deutschebahn.com/de/konzern/Im-Fokus/Unfaelle-vermeiden-13001562'},
  {'name': 'Deutsche Bahn, Präventionsteams', 'url': 'https://www.deutschebahn.com/de/nachhaltigkeit/verantwortung_gesellschaft/unfallpraevention/Mit-den-DB-Praeventionsteams-sicher-unterwegs-an-Gleisen-und-Bahnhoefen-6852942'},
  {'name': 'Bundespolizei-Warnung nach Gleisunfall (News4teachers)', 'url': 'https://www.news4teachers.de/2025/09/schueler-faellt-vor-einfahrendem-zug-aufs-gleis-lokfuehrer-reagiert-sofort/'},
 ],
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ehrlich: Wer hätte den Zug gefilmt? 📱👇 Was soll dem Dummy als Nächstes am Bahnhof passieren?",
 },
 'shots': {'situation': situation, 'options': options, 'countdown': countdown, 'reveal': reveal, 'outro': outro},
}
for _sh in [situation, options, countdown, reveal, outro, exp1, exp2, exp3]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
print('Sicherheit beim Einfrieren (Dummy-z > 0.25 = auf dem Bahnsteig, Zug-Nase weit links):', SAFETY)
print('cues', dict(da=c_da, was=c_was, fz2=r3(fz2), fz3=r3(fz3), hb0=hb0, hb1=hb1, pass_x0=pass_x0, tail=tail_t, cup=cup_t, cutB=cutB, cutC=cutC, ober=c_ober),
      'audio' if dur else 'geschätzt', {k: seclen(k) for k in TEXT})
