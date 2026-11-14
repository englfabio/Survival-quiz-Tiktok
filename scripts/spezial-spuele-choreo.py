# Hilfsskript: erzeugt scenarios/spezial-spuele.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-spuele-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage), Bühne "kueche"
# (gleiche Küchenzeile wie die WG-Küche, aber ohne Tisch – der Tisch hätte die Spüle verdeckt).
# Darstellung (Vorgabe Inhaber): comichaft, nicht zu eklig – Essensreste bunt + stilisiert (Nudeln, Paprika, grüner Klumpen).
# Bei B macht NUR der Dummy den Kick (keine Figur, die einer echten Person ähnelt). Keine Logos, keine echten Produktdesigns.
# Spezial-Regeln: Länge 61–66 s (zu kurz → EXTRA, zu lang → Pausen/Kamerafahrten kürzen, Texte nie ändern),
# Szene wiederholt die Antwort nicht, Outro = A/B/C in die Kommentare + folgen.
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-spuele'
S = dict(
situation="Du hast mal wieder Essensreste in der Spüle angefasst. Kalt. Glitschig. Undefinierbar. Was machst du?",
o1c="Aufessen", o1s="A: Du isst sie. Sind ja schließlich Lebensmittel.",
o2c="Roundhouse-Kick", o2s="B: Du machst einen Roundhouse-Kick wie Chuck Norris und spuckst alles wieder aus.",
o3c="Ganzkörper-Schutzanzug", o3s="C: Du betrittst die Küche nur noch im Ganzkörper-Schutzanzug.",
e1="Nudeln von Dienstag, ein Stück Paprika und irgendwas, das du lieber nicht wissen willst. Bissen für Bissen. Nichts wird verschwendet.",
e2="Erst die Drehung, dann der Kick. Die Teller klirren. Und alles, was du gerade im Mund hattest, fliegt in hohem Bogen zurück in die Spüle.",
e3="Anzug, Maske, Handschuhe. Abwaschen dauert jetzt drei Stunden. Aber du fasst nie wieder etwas Glitschiges an.",
vote="Also, was machst du? Schreib A, B oder C in die Kommentare.",
outro="Schreib A, B oder C in die Kommentare und folg gerne für mehr.",
)
# Szenen rein visuell verlängern (Sekunden, ohne Text), damit das Video mindestens 61 s lang ist
EXTRA = {1: 0.0, 2: 0.0, 3: 0.0}
# Pausen nach jedem Clip (Sekunden) – zum Kürzen, falls das Video über 66 s käme (Standard wie Joghurt: 0,5)
TAIL = 0.45

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
        return max(cliplen('outro'), 4.0)
    return cliplen(sec)
def st_of(c, phrase, last=False):
    txt = TEXT[c]; i = txt.rindex(phrase) if last else txt.index(phrase)
    if c in ali:
        return ali[c]['character_start_times_seconds'][i]
    return (0.84 + 0.0594 * len(txt)) * i / len(txt)
def cue(sec, clip, phrase, last=False):
    """t (0..1) im Abschnitt sec, an dem phrase im Clip clip beginnt"""
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
ANS = (100, 980, 480, 1215)      # Antwort-Abschnitte: unter der Kopfzeile, über dem Untertitel
SIT = (100, 980, 280, 1215)      # Situation (nur Abzeichen oben)
def body(x, z, h=1.92, w=0.3):
    return [[x - w, 0, z], [x + w, 0, z], [x, h, z - w], [x, h, z + w]]
_fits = {}
def F(points, az, el, box=ANS, push=0.06, fov=38):
    """Kamera so, dass alle Punkte in box liegen; liefert (Start, Ende, fov) mit langsamem Heranfahren (dolly ≈ 0,94)"""
    key = json.dumps([points, az, el, box, fov])
    if key not in _fits:
        r = fit(points, az, el, fov, box)
        assert r, f'keine Kamera gefunden: {points} {az} {el}'
        c = r[0]
        if abs(c[0]) > 2.4 or c[2] < -2.2 or c[1] > 2.5 or c[1] < 0.15:
            print('Achtung: Kamera außerhalb des Raums', c, az, el)
        _fits[key] = r
    c, l, _ = _fits[key]
    c2 = [c[i] + (l[i] - c[i]) * push for i in range(3)]
    return c, l, c2, (fov if fov != 38 else None)
def shot(t0, t1, f):
    """eine Einstellung von t0 bis t1 (harter Schnitt: die nächste beginnt 0,003 später)"""
    c, l, c2, fv = f
    return [cam(t0, c, l, fv), cam(t1, c2, l, fv)]
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)

# ---- feste Plätze: WG-Küche (src/stage/Kitchen.tsx, WG) ----
SINK = (-1.25, -1.98); SINK_Y = 0.92          # Mitte der Spüle auf der Arbeitsplatte
ST = (-1.25, -1.43)                            # Dummy vor der Spüle (0,55 m), Blick zur Spüle = face 0
FOOD = [SINK[0], 1.02, SINK[1]]                # Essensreste
RACK = (-0.72, -2.0); RACK_Y = 0.945           # Abtropfgitter rechts neben der Spüle
CLOCK = (1.45, -2.28); CLOCK_Y = 2.05          # Küchenuhr an der freien Rückwand rechts
FRIDGE = (-2.13, -1.94)
DOOR = (2.5, 0.75)
LAPTOP = (1.75, -1.88, 0.74)
CAL = (2.485, -0.45, 1.45)

def static(fill=1.0, rack=False, clock=False, door=0.0):
    a = {'spuele': [K(0, *SINK, 'park', 0, y=SINK_Y, fill=fill)]}
    if rack: a['abtropfgitter'] = [K(0, *RACK, 'park', 0, y=RACK_Y, fill=0)]
    if clock: a['kuechenuhr'] = [K(0, *CLOCK, 'park', 180, y=CLOCK_Y, fill=18, size=-0.1)]
    return a

# ================= Situation: in die Spüle gegriffen – erstarrt =================
L0 = 'situation'
c_ess = cue(L0, 'situation', 'Essensreste')
c_kalt = cue(L0, 'situation', 'Kalt')
c_gl = cue(L0, 'situation', 'Glitschig')
c_und = cue(L0, 'situation', 'Undefinierbar')
c_was = cue(L0, 'situation', 'Was machst')
reach0 = r3(min(c_kalt - sec(L0, 1.2), c_gl - sec(L0, 2.6)))   # Erstarren (1,15 s) spätestens bei "Kalt", Hand raus (2,6 s) bei "Glitschig"
reach0 = max(reach0, sec(L0, 0.3))
a = static()
a['dummy'] = [K(0, *ST, 'stand', 0), K(reach0, *ST, 'sinkreach', 0, brow=0), K(c_was, *ST, 'sinkreach', 0, brow=1)]
# Kameras: 1) halbnah von der Seite (Dummy + Spüle), 2) Hand in der Spüle von oben, 3) glitschige Hand nah, 4) halbnah, Dummy erstarrt
HAND_IN = [ST[0] + 0.05, 0.95, ST[1] - 0.55]
HAND_UP = [ST[0] + 0.34, 1.3, ST[1] - 0.36]
situation = {
 'camera': [*shot(0, r3(c_kalt - 0.003), F(body(*ST) + [[SINK[0] - 0.3, 0.9, SINK[1]], [SINK[0] + 0.3, 0.9, SINK[1]]], 28, 8, SIT)),
            *shot(c_kalt, r3(c_gl - 0.003), F([[FOOD[0] - 0.3, 0.92, FOOD[2] - 0.2], [FOOD[0] + 0.3, 0.92, FOOD[2] + 0.2], [ST[0], 1.6, ST[1]], [ST[0] + 0.3, 1.3, ST[1]]], 40, 38, SIT)),
            *shot(c_gl, r3(c_was - 0.003), F([[HAND_UP[0] - 0.25, HAND_UP[1] - 0.25, HAND_UP[2]], [HAND_UP[0] + 0.15, HAND_UP[1] + 0.35, HAND_UP[2]], [ST[0], 1.85, ST[1]]], 55, 6, SIT)),
            *shot(c_was, 1, F(body(*ST) + [[ST[0] + 0.5, 1.2, ST[1]]], 35, 8, SIT))],
 'actors': a,
 'sfx': [{'t': r3(reach0 + sec(L0, 0.85)), 'id': 'glitsch', 'volume': 0.7}],
}

# ================= Antwort A: Du isst sie – Bissen für Bissen =================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA)
c_nud = cue(A, 'explain1', 'Nudeln')
c_pap = cue(A, 'explain1', 'ein Stück Paprika')
c_irg = cue(A, 'explain1', 'irgendwas')
c_bis = cue(A, 'explain1', 'Bissen für')
c_nix = cue(A, 'explain1', 'Nichts wird')
sa = lambda s: s / TA
BITE = 2.0   # Dauer eines Bissens (pinchEat), danach kauen
# Bissen: (Start, Art 0 Nudel / 1 Paprika / 2 Klumpen) – das Stück ist bei Start + 1,0 s vor dem Gesicht
bites = []
t_prev = sA - sa(0.2)
for ph, kind in ((c_nud, 0), (c_pap, 1), (c_irg, 2)):
    t0 = max(t_prev + sa(BITE - 0.05), ph - sa(0.9))
    bites.append((r3(t0), kind)); t_prev = t0
# "Bissen für Bissen": drei schnelle Bissen hintereinander (Nudel, Nudel, Paprika grün)
fast0 = max(t_prev + sa(BITE - 0.05), c_bis - sa(0.6))
nfast = 0
t = fast0
while t + sa(BITE) <= c_nix + sa(0.25) and nfast < 3:
    bites.append((r3(t), 0 if nfast < 2 else 1)); t += sa(BITE - 0.1); nfast += 1
dummyA = [K(0, *ST, 'stand', 0, brow=0.05, mark=0)]
fillA = [K(0, *SINK, 'park', 0, y=SINK_Y, fill=1)]
eaten = 0
for i, (t0, kind) in enumerate(bites):
    dummyA.append(K(r3(t0 - 0.002), *ST, 'chew' if i else 'stand', 0, mark=kind))
    dummyA.append(K(t0, *ST, 'pinchEat', 0, mark=kind))
    dummyA.append(K(r3(t0 + sa(BITE - 0.02)), *ST, 'pinchEat', 0, mark=kind))
    dummyA.append(K(r3(t0 + sa(BITE)), *ST, 'chew', 0, mark=kind))
    eaten += 1
    fillA.append(K(r3(t0 + sa(0.7)), *SINK, 'park', 0, fill=round((6 - eaten + 1) / 6 - 0.001, 3)))
    fillA.append(K(r3(t0 + sa(0.76)), *SINK, 'park', 0, fill=round((6 - eaten) / 6 + 0.01, 3)))
# Am Ende: Spüle leer, Dummy dreht sich zur Kamera, stolz (Hände in den Hüften)
END_A = (ST[0] + 0.35, ST[1] + 0.35)
dummyA += [K(r3(c_nix - 0.003), *ST, 'chew', 0), K(c_nix, *END_A, 'proud', 200, brow=0.05), K(1, *END_A, 'proud', 200)]
fillA += [K(r3(c_nix - 0.003), *SINK, 'park', 0, fill=0.01 if eaten >= 6 else fillA[-1]['fill']), K(c_nix, *SINK, 'park', 0, fill=0)]
aA = static(); aA['spuele'] = fillA; aA['dummy'] = dummyA
FACE_PT = [[ST[0] - 0.05, 1.95, ST[1]], [ST[0] + 0.25, 1.95, ST[1]], [ST[0] + 0.25, 1.15, ST[1] - 0.5], [ST[0] - 0.15, 1.15, ST[1] - 0.5]]
expA = {
 'camera': [*shot(0, r3(sA - 0.003), F(body(*ST) + [[SINK[0] - 0.35, 0.9, SINK[1]], [SINK[0] + 0.35, 0.9, SINK[1]]], 25, 8)),
            *shot(sA, r3(c_pap - 0.003), F(FACE_PT + [[ST[0] + 0.1, 1.0, ST[1]]], 86, 4)),
            *shot(c_pap, r3(c_irg - 0.003), F(FACE_PT, 100, 6)),
            *shot(c_irg, r3(c_bis - 0.003), F([[ST[0] - 0.05, 1.95, ST[1]], [ST[0] + 0.25, 1.95, ST[1]], [ST[0] + 0.25, 1.35, ST[1] - 0.3], [ST[0] - 0.2, 1.35, ST[1]]], 92, 2)),
            *shot(c_bis, r3(c_nix - 0.003), F(body(*ST) + [[SINK[0] - 0.35, 0.9, SINK[1]], [SINK[0] + 0.35, 0.9, SINK[1]]], 12, 10)),
            *shot(c_nix, 1, F(body(*END_A) + [[SINK[0] - 0.3, 0.9, SINK[1]], [SINK[0] + 0.3, 0.9, SINK[1]]], 25, 10))],
 'actors': aA,
 'sfx': [{'t': r3(t0 + sa(1.85)), 'id': 'schmatzen', 'volume': 0.45} for (t0, _) in bites],
}

# ================= Antwort B: Drehung, Roundhouse-Kick, alles in hohem Bogen zurück in die Spüle =================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB)
sb = lambda s: s / TB
c_dreh = cue(B, 'explain2', 'Erst die Drehung')
c_kick = cue(B, 'explain2', 'dann der Kick')
c_tel = cue(B, 'explain2', 'Die Teller')
c_und2 = cue(B, 'explain2', 'Und alles')
c_fl = cue(B, 'explain2', 'fliegt')
c_zur = cue(B, 'explain2', 'zurück in die')
KB = (ST[0], ST[1] - 0.0)   # Kick vor der Spüle (Blick zur Spüle), Kick geht nach rechts (Welt +x)
rh0 = r3(c_dreh - sb(0.75))                      # Drehung beginnt (0,6 s) kurz nach "Erst"
rh0 = r3(min(rh0, c_kick - sb(2.4)))             # Kick (2,4 s) beginnt bei "dann der Kick"
spit0 = r3(c_fl - sb(0.55))                      # Ausspucken bei "fliegt"
spit0 = max(spit0, r3(rh0 + sb(5.2)))
fly0 = r3(spit0 + sb(0.55))
land = r3(fly0 + sb(1.1))
dummyB = [K(0, *KB, 'boxguard', 0, brow=0.05), K(r3(rh0 - 0.002), *KB, 'boxguard', 0), K(rh0, *KB, 'roundhouse', 0),
          K(r3(spit0 - 0.002), *KB, 'roundhouse', 0), K(spit0, *KB, 'spitarc', 0), K(1, *KB, 'spitarc', 0)]
arcB = [K(0, *KB, 'park', 0, y=HIDE, size=-0.2), K(r3(fly0 - 0.002), *KB, 'park', 0, y=HIDE), K(fly0, *KB, 'show', 0, y=0),
        K(r3(land + sb(0.05)), *KB, 'show', 0, y=0), K(r3(land + sb(0.08)), *KB, 'park', 0, y=HIDE)]
kick_peak = r3(rh0 + sb(3.3))
sinkB = [K(0, *SINK, 'park', 0, y=SINK_Y, fill=0.5, rumble=0), K(r3(kick_peak - sb(0.4)), *SINK, 'park', 0, rumble=0),
         K(r3(kick_peak), *SINK, 'park', 0, rumble=1), K(r3(c_und2 - sb(0.2)), *SINK, 'park', 0, rumble=0.0),
         K(r3(land - sb(0.05)), *SINK, 'park', 0, fill=0.5), K(r3(land + sb(0.05)), *SINK, 'park', 0, fill=1, rumble=0.6),
         K(r3(land + sb(0.6)), *SINK, 'park', 0, fill=1, rumble=0)]
aB = static(fill=0.5); aB['spuele'] = sinkB; aB['dummy'] = dummyB; aB['spuckbogen'] = arcB
KICK_TIP = [KB[0] + 1.0, 1.5, KB[1]]
expB = {
 'camera': [*shot(0, r3(sB - 0.003), F(body(*KB) + [[KB[0] + 0.6, 0.2, KB[1]], [KB[0] - 0.6, 0.2, KB[1]]], 20, 6)),
            *shot(sB, r3(c_kick - 0.003), F(body(*KB, 1.95, 0.45) + [[KB[0], 0.0, KB[1] + 0.5]], 25, 0)),
            *shot(c_kick, r3(c_tel - 0.003), F(body(*KB, 1.95, 0.35) + [KICK_TIP, [KICK_TIP[0], 0.4, KB[1]]], 5, 0)),
            *shot(c_tel, r3(c_und2 - 0.003), F([[SINK[0] - 0.32, 0.9, SINK[1] - 0.2], [SINK[0] + 0.32, 0.9, SINK[1] + 0.2], [SINK[0], 1.3, SINK[1]]], 30, 30)),
            *shot(c_und2, r3(c_zur - 0.003), F(body(*KB) + [[KB[0], 2.42, KB[1] - 0.3], [SINK[0], 0.9, SINK[1]]], 45, 4, fov=60)),
            *shot(c_zur, 1, F(body(*KB, 1.9, 0.25) + [[SINK[0] - 0.3, 0.9, SINK[1]], [SINK[0] + 0.3, 0.9, SINK[1]]], 25, 8))],
 'actors': aB,
 'sfx': [{'t': r3(rh0 + sb(0.6)), 'id': 'kick-whoosh', 'volume': 0.6}, {'t': r3(kick_peak - sb(0.3)), 'id': 'kick-whoosh', 'volume': 0.8},
         {'t': r3(kick_peak), 'id': 'teller-klirren', 'volume': 0.7}, {'t': r3(spit0 + sb(0.5)), 'id': 'ausspucken', 'volume': 0.7},
         {'t': r3(land), 'id': 'reste-platsch', 'volume': 0.7}],
}

# ================= Antwort C: im Ganzkörper-Schutzanzug – Abwaschen dauert drei Stunden =================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC)
sc = lambda s: s / TC
c_anz = cue(C, 'explain3', 'Anzug')
c_mas = cue(C, 'explain3', 'Maske')
c_han = cue(C, 'explain3', 'Handschuhe')
c_abw = cue(C, 'explain3', 'Abwaschen')
c_drei = cue(C, 'explain3', 'drei Stunden')
c_aber = cue(C, 'explain3', 'Aber du')
IN0 = (2.2, 1.6); IN1 = (0.6, -0.6)
HZ = dict(hazmat=1)
walkC = r3(min(sC - sc(0.5), sc(math.hypot(IN1[0] - IN0[0], IN1[1] - IN0[1]) / 0.55)))
door0 = sc(0.3)
dummyC = [K(0, *IN0, 'tiptoe', face_to(IN0, IN1), **HZ),
          K(walkC, *IN1, 'tiptoe', face_to(IN0, IN1)), K(r3(sC - 0.003), *IN1, 'stand', 300),
          # Szene: Anzug (ganzer Körper), Maske (Kopf), Handschuhe → an der Spüle vorsichtig abspülen (Zeitlupe)
          K(sC, *ST, 'hazwash', 0), K(1, *ST, 'hazwash', 0)]
wash_end = r3(c_aber - 0.003)
END_C = (ST[0] + 0.4, ST[1] + 0.3)
dummyC = dummyC[:-1] + [K(wash_end, *ST, 'hazwash', 0), K(c_aber, *END_C, 'proud', 200), K(1, *END_C, 'proud', 200)]
doorC = [K(0, *DOOR, 'park', 270, door=0), K(door0, *DOOR, 'park', 270, door=0), K(r3(door0 + sc(0.5)), *DOOR, 'park', 270, door=1)]
sinkC = [K(0, *SINK, 'park', 0, y=SINK_Y, fill=1, good=0, mark=0), K(sC, *SINK, 'park', 0, fill=1, good=0, mark=0.6),
         K(c_drei, *SINK, 'park', 0, fill=1, good=0, mark=0.8), K(r3(c_drei + sc(0.6)), *SINK, 'park', 0, fill=0, good=1, mark=0.3),
         K(1, *SINK, 'park', 0, fill=0, good=1, mark=0)]
rackC = [K(0, *RACK, 'park', 0, y=RACK_Y, fill=0), K(c_drei, *RACK, 'park', 0, fill=0.2), K(r3(c_drei + sc(0.6)), *RACK, 'park', 0, fill=1)]
clockC = [K(0, *CLOCK, 'park', 180, y=CLOCK_Y, fill=18, size=-0.1), K(r3(c_drei - 0.002), *CLOCK, 'park', 180, fill=18),
          K(c_drei, *CLOCK, 'spin', 180, fill=18), K(r3(c_drei + sc(0.6)), *CLOCK, 'spin', 180, fill=21), K(r3(c_drei + sc(0.62)), *CLOCK, 'park', 180, fill=21)]
aC = static(rack=True, clock=True); aC['spuele'] = sinkC; aC['abtropfgitter'] = rackC; aC['kuechenuhr'] = clockC; aC['dummy'] = dummyC
HEAD_C = [[ST[0] - 0.2, 2.0, ST[1]], [ST[0] + 0.25, 2.0, ST[1]], [ST[0] + 0.25, 1.45, ST[1] - 0.15], [ST[0] - 0.2, 1.45, ST[1]]]
HANDS_C = [[ST[0] - 0.15, 1.25, ST[1] - 0.45], [ST[0] + 0.25, 1.25, ST[1] - 0.45], [ST[0] + 0.25, 0.92, ST[1] - 0.6], [ST[0] - 0.15, 0.92, ST[1] - 0.6]]
expC = {
 'camera': [*shot(0, r3(sC - 0.003), F(body(*IN1) + body(*IN0) + [[SINK[0], 0.9, SINK[1]]], 20, 8)),
            *shot(sC, r3(c_mas - 0.003), F(body(*ST) + [[SINK[0] + 0.3, 0.9, SINK[1]]], 25, 8)),
            *shot(c_mas, r3(c_han - 0.003), F(HEAD_C, 60, 4)),
            *shot(c_han, r3(c_abw - 0.003), F(HANDS_C, 60, 30)),
            *shot(c_abw, r3(c_drei - 0.003), F(body(*ST) + [[RACK[0] + 0.2, 0.9, RACK[1]]], 25, 10)),
            *shot(c_drei, r3(c_aber - 0.003), F(body(*ST) + [[CLOCK[0] + 0.25, CLOCK_Y + 0.25, CLOCK[1]], [CLOCK[0] - 0.25, CLOCK_Y - 0.5, CLOCK[1]], [RACK[0], 0.9, RACK[1]]], 15, 6)),
            *shot(c_aber, 1, F(body(*END_C) + [[SINK[0] - 0.3, 0.9, SINK[1]], [RACK[0] + 0.2, 0.9, RACK[1]]], 18, 8))],
 'actors': aC,
 'sfx': [{'t': r3(sc(0.2)), 'id': 'schleichen', 'volume': 0.4},
         {'t': r3(c_abw), 'id': 'schrubben', 'volume': 0.5}, {'t': r3(c_drei), 'id': 'zeitraffer', 'volume': 0.6}],
}

# ================= Abstimmung (wie Joghurt: Figur steht, Kamera tief und ruhig) =================
VOTE_D = (-0.7, -0.75)
aV = static()
aV['dummy'] = [K(0, *VOTE_D, 'sheepish', 165, brow=1)]
vote = {'camera': shot(0, 1, F(body(*VOTE_D, 1.95, 0.35) + [[SINK[0], 0.9, SINK[1]]], 10, 4, (120, 960, 1010, 1240), push=0.04)), 'actors': aV}

# ================= Outro: Dummy hinter dem Tisch, winkt =================
OUT_D = (-0.2, -0.05)
aO = static()
aO['dummy'] = [K(0, *OUT_D, 'stand', 180, brow=0.05), K(0.3, *OUT_D, 'wave', 180), K(1, *OUT_D, 'wave', 180)]
outro = {'camera': shot(0, 1, F(body(*OUT_D, 2.1, 0.4) + [[SINK[0], 0.9, SINK[1]]], 0, 3, (70, 1000, 900, 1225), push=0.05)),
         'actors': aO}

DESC = ("Du hast mal wieder Essensreste in der Spüle angefasst – was machst du? 🍝 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. 😄\n\n"
        "#waswürdestdutun #küche #spüle #abwasch #wg #spezial #comedy #quiz\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'kueche', 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy isst die bunten, stilisierten Essensreste aus der Spüle Stück für Stück mit spitzen Fingern und ernstem Blick: Nudel, Paprika, grüner Klumpen. Am Ende ist die Spüle leer und er steht stolz da.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Nur der Dummy: Drehung und spektakulärer, hoher Roundhouse-Kick in Zeitlupe, die Teller in der Spüle klirren. Dann spuckt er alles in hohem Bogen zurück in die Spüle.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy kommt im weißen Ganzkörper-Schutzanzug mit Maske, Schutzbrille und Gummihandschuhen auf Zehenspitzen in die Küche und spült in Zeitlupe ab. Die Küchenuhr springt von 18 auf 21 Uhr, das Geschirr ist sauber.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Schreib A, B oder C & folg für mehr!'},
 'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team ___. Und du? 👇'},
 'shots': {'situation': situation, 'countdown': vote, 'outro': outro},
}
for _sh in [situation, vote, outro, expA, expB, expC]:
    _sh['sharpCuts'] = True
    for keys in _sh['actors'].values():   # fehlendes y vom vorigen Zeitpunkt übernehmen (sonst fällt der Gegenstand auf y 0)
        y = None
        for k in keys:
            if 'y' in k: y = k['y']
            elif y is not None: k['y'] = y
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
total = seclen('situation') + TA + TB + TC + seclen('countdown') + seclen('outro')
print('Länge', round(total, 1), 's', 'audio' if dur else 'geschätzt', {'situation': seclen('situation'), 'A': (cardA, sceneA), 'B': (cardB, sceneB), 'C': (cardC, sceneC), 'vote': seclen('countdown'), 'outro': seclen('outro')})
print('Situation', dict(reach0=reach0, kalt=c_kalt, gl=c_gl, was=c_was, freeze_s=round((reach0) * seclen(L0) + 1.15, 2), kalt_s=round(c_kalt * seclen(L0), 2)))
print('A bites', [(round(t * TA, 2), k) for t, k in bites], 'nix', round(c_nix * TA, 2))
print('B', dict(rh0=round(rh0 * TB, 2), kick=round(c_kick * TB, 2), peak=round(kick_peak * TB, 2), tel=round(c_tel * TB, 2), spit=round(spit0 * TB, 2), fliegt=round(c_fl * TB, 2), land=round(land * TB, 2)))
print('C', dict(scene=round(sC * TC, 2), drei=round(c_drei * TC, 2), aber=round(c_aber * TC, 2)))
assert 61 <= total, 'zu kurz'
if total > 66: print('ACHTUNG: über 66 s – Pausen kürzen')
