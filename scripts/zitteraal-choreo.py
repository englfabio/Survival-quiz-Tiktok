# Hilfsskript: erzeugt scenarios/zitteraal-steckdose.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/zitteraal-choreo.py
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'zitteraal-steckdose'
S = dict(
situation="Ein Zitteraal hat sich mal wieder in deiner Steckdose eingenistet. Dein Kumpel hat ihn angefasst und kommt nicht mehr los. Was machst du jetzt?",
o1c="Kumpel wegziehen", o1s="Eins: Deinen Kumpel sofort an den Armen wegziehen.",
o2c="Mit nassem Handtuch wegschlagen", o2s="Zwei: Den Aal mit einem nassen Handtuch wegschlagen.",
o3c="Erst Strom aus, dann helfen", o3s="Drei: Erst den Strom abschalten, dann deinem Kumpel helfen.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer drei.",
e1="Genau so wirst du selbst zum Opfer. Solange Strom fließen kann, darfst du einen Menschen niemals mit der Hand berühren. Sonst stehst du selbst unter Strom.",
e2="Nass ist hier das Gefährlichste überhaupt, denn Wasser leitet Strom. Wenn du etwas benutzt, dann nur einen trockenen Gegenstand, der nicht leitet, zum Beispiel einen Besenstiel.",
e3="Unterbrich zuerst den Stromkreis: Stecker ziehen, Gerät ausschalten oder die Sicherung raus. Erst dann helfen. Hat dein Kumpel danach Herzrasen, Herzstolpern oder Atemnot, oder ist er bewusstlos, sofort die 112. Der Zitteraal war ausgedacht. Aber genau so hilfst du bei jedem echten Stromunfall.",
outro="Wusstest du es? Schreib's in die Kommentare.",
)
LEAD = {'situation': 0.3, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6}
MINLEN = {'situation': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7}
TEXT = {'situation': S['situation'], 'explain1': S['e1'], 'explain2': S['e2'], 'explain3': S['e3']}
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
    return round((LEAD[c] + st) / L, 3)
r3 = lambda x: round(x, 3)
def K(t, x, z, motion, face=None, **kw):
    d = {'t': r3(t), 'x': x, 'z': z, 'motion': motion}
    if face is not None: d['face'] = face
    d.update(kw); return d
import math
def te(t):
    """Kamera-Zeitachse (sampleCamera glättet die Zeit: te = easeInOut(t)·0,35 + t·0,65) → Schnitte exakt treffen"""
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def cam(t, pos, look, fov=None):
    d = {'t': round(te(t), 4), 'pos': pos, 'look': look}
    if fov: d['fov'] = fov
    return d
def sec(c, s):
    """Sekunden → Anteil im Abschnitt"""
    return s / seclen(c)

# ---- feste Plätze (Küche, siehe src/stage/Kitchen.tsx) ----
EX, EY, EZ = 1.745, 1.12, -2.275       # Zitteraal im rechten Loch der Steckdose
KX, KZ, KF = 1.15, -1.96, 35            # Kumpel hängt fest (rechte Hand am Aal), steht schräg links davor
DX, DZ, DF = 1.85, -0.6, -40            # Dummy schaut erschrocken zu (rechts vorn)
HIDE = -30
def eel(*keys):  # (t, motion, zap[, y])
    return [K(t, EX, EZ, m, 180, y=(y if y is not None else EY), zap=z) for t, m, z, *rest in keys for y in [rest[0] if rest else None]]
def kumpel_stuck(t, zap=1, y=0):
    return K(t, KX, KZ, 'stuck', KF, zap=zap, y=y)

# ================= Situation =================
L0 = 'situation'
c_kumpel = cue(L0, 'Dein Kumpel')
c_touch = cue(L0, 'angefasst')
c_los = cue(L0, 'kommt nicht mehr los')
c_was = cue(L0, 'Was machst du')
walk0 = r3(c_kumpel - sec(L0, 0.2))
situation = {
 'camera': [cam(0, [1.72, 1.3, -1.25], [1.73, 1.2, -2.25]), cam(r3(c_kumpel - 0.004), [1.7, 1.32, -1.1], [1.72, 1.2, -2.25]),
            cam(r3(c_kumpel), [0.85, 1.65, 4.7], [1.25, 1.0, -1.6]), cam(1, [0.75, 1.65, 5.4], [1.25, 0.95, -1.6])],
 'actors': {
  'zitteraal': eel((0, 'peek', 0), (r3(c_touch), 'peek', 0), (r3(c_touch + 0.004), 'wiggle', 1), (1, 'wiggle', 1)),
  'kumpel': [K(0, 0.75, -0.9, 'stand', 30, zap=0), K(walk0, 0.75, -0.9, 'walk', 30, zap=0), K(r3(c_touch - 0.006), KX - 0.12, KZ + 0.18, 'walk', KF, zap=0),
             kumpel_stuck(r3(c_touch - 0.002), 0), kumpel_stuck(r3(c_touch + 0.006), 1), kumpel_stuck(1, 1)],
  'dummy': [K(0, DX, DZ + 0.2, 'stand', DF), K(r3(c_touch + 0.03), DX, DZ + 0.2, 'stand', DF), K(r3(c_touch + 0.035), DX, DZ + 0.2, 'recoil', DF),
            K(r3(c_touch + sec(L0, 1.3)), DX + 0.15, DZ + 0.25, 'recoil', DF), K(1, DX + 0.15, DZ + 0.25, 'recoil', DF)],
 },
 'sfx': [{'t': 0.02, 'id': 'aal-schmollen', 'volume': 0.35}, {'t': r3(c_touch), 'id': 'strom-knistern', 'volume': 0.75},
         {'t': r3(c_los + 0.05), 'id': 'strom-knistern', 'volume': 0.55}],
}
DX2, DZ2 = DX + 0.15, DZ + 0.25

# ================= Optionen / Countdown / Auflösung =================
def still(p0, l0, p1, l1):
    return {'camera': [cam(0, p0, l0), cam(1, p1, l1)],
            'actors': {'zitteraal': eel((0, 'wiggle', 1)), 'kumpel': [kumpel_stuck(0, 1)],
                       'dummy': [K(0, DX2, DZ2, 'recoil', DF)]},
            'sfx': [{'t': 0.01, 'id': 'strom-knistern', 'volume': 0.35}]}
options = still([0.75, 1.7, 5.9], [1.2, 0.75, -1.5], [0.8, 1.7, 5.5], [1.25, 0.75, -1.5])
countdown = still([0.75, 1.7, 5.5], [1.2, 0.85, -1.5], [0.8, 1.7, 5.2], [1.22, 0.85, -1.5])
reveal = still([0.8, 1.7, 5.5], [1.22, 0.8, -1.5], [0.8, 1.7, 5.4], [1.22, 0.8, -1.5])
countdown['sfx'] = []

# ================= Option 1: Kumpel an den Armen wegziehen =================
L1 = 'explain1'
g0 = sec(L1, 0.1)
grab = sec(L1, 1.0)
zap1 = r3(grab + sec(L1, 0.45))
fz1 = r3(max(cue(L1, 'Solange Strom') - sec(L1, 0.25), zap1 + sec(L1, 1.1)))
BX, BZ = 0.85, -1.53
exp1 = {
 'camera': [cam(0, [2.1, 1.65, 3.4], [1.3, 1.2, -1.8]), cam(fz1, [2.1, 1.65, 3.0], [1.3, 1.2, -1.8]), cam(1, [2.05, 1.62, 2.6], [1.3, 1.22, -1.8])],
 'actors': {
  'zitteraal': eel((0, 'wiggle', 1)),
  'kumpel': [kumpel_stuck(0, 1)],
  'dummy': [K(0, 1.7, -0.75, 'walk', -47, zap=0), K(g0, 1.7, -0.75, 'walk', -47), K(r3(grab - sec(L1, 0.15)), BX + 0.05, BZ + 0.05, 'walk', 20), K(r3(grab), BX, BZ, 'walk', 35), K(r3(grab + 0.004), BX, BZ, 'grabarms', 35, zap=0),
            K(zap1, BX, BZ, 'grabarms', 35, zap=0), K(r3(zap1 + sec(L1, 0.15)), BX, BZ, 'grabarms', 35, zap=1), K(1, BX, BZ, 'grabarms', 35, zap=1)],
 },
 'freeze': fz1,
 'sfx': [{'t': 0.01, 'id': 'strom-knistern', 'volume': 0.35}, {'t': r3(zap1), 'id': 'strom-knistern', 'volume': 0.85}],
}

# ================= Option 2: mit nassem Handtuch nach dem Aal schlagen =================
L2 = 'explain2'
sw0 = sec(L2, 0.35)
hit = r3(sw0 + sec(L2, 0.68))
fz2 = r3(max(cue(L2, 'denn Wasser') - sec(L2, 0.2), hit + sec(L2, 1.2)))
TX, TZ, TF = 1.86, -0.82, -10
exp2 = {
 'camera': [cam(0, [-0.55, 1.8, 2.75], [1.5, 1.15, -1.5]), cam(fz2, [-0.5, 1.8, 2.5], [1.5, 1.15, -1.5]), cam(1, [-0.45, 1.78, 2.25], [1.5, 1.15, -1.55])],
 'actors': {
  'zitteraal': eel((0, 'wiggle', 1)),
  'kumpel': [kumpel_stuck(0, 1)],
  'dummy': [K(0, TX, TZ, 'stand', TF, zap=0), K(r3(sw0), TX, TZ, 'towelswing', TF, zap=0), K(hit, TX, TZ, 'towelswing', TF, zap=0),
            K(r3(hit + sec(L2, 0.12)), TX, TZ, 'towelswing', TF, zap=1), K(1, TX, TZ, 'towelswing', TF, zap=1)],
 },
 'freeze': fz2,
 'sfx': [{'t': 0.01, 'id': 'strom-knistern', 'volume': 0.35}, {'t': r3(hit - sec(L2, 0.05)), 'id': 'handtuch-klatsch', 'volume': 0.8},
         {'t': r3(hit), 'id': 'strom-knistern', 'volume': 0.85}],
}

# ================= Option 3: Strom aus (Sicherung), dann helfen + 112 =================
L3 = 'explain3'
c_unter = cue(L3, 'Unterbrich')
c_stecker = cue(L3, 'Stecker ziehen')
c_sich = cue(L3, 'oder die Sicherung raus')
c_erst = cue(L3, 'Erst dann helfen')
c_hat = cue(L3, 'Hat dein Kumpel')
c_112 = cue(L3, 'sofort die 112')
c_aal = cue(L3, 'Der Zitteraal')
c_aber = cue(L3, 'Aber genau so')
flip = r3(cue(L3, 'Sicherung raus') + sec(L3, 0.15))     # Hebel unten
sw_start = r3(flip - sec(L3, 0.6))                         # switchoff beginnt (Hebel unten bei ca. 0,6 s)
cut1 = r3(min(c_stecker, sw_start - sec(L3, 1.0)))           # Schnitt Küche → Flur
cut2 = r3(min(flip + sec(L3, 0.8), c_erst - sec(L3, 0.05)))  # Schnitt Flur → Küche (Strom aus)
run0 = r3(sec(L3, 0.5))
# Dummy: Küche (rennt raus) → Flur (Sicherung) → Küche (kniet beim Kumpel, telefoniert)
FBX, FBZ = 0.82, -3.0
SWX, SWZ = 0.54, -2.13
knee0 = r3(max(cut2 + sec(L3, 1.3), c_hat - sec(L3, 0.6)))
KNX, KNZ, KNF = 1.92, -1.25, -100
PX, PZ, PF = 1.3, -1.5, 165     # Kumpel sitzt danach (schaut Richtung Kamera)
dummy3 = [K(0, DX2, DZ2, 'recoil', DF), K(run0, DX2, DZ2, 'recoil', DF), K(r3(run0 + 0.004), DX2, DZ2, 'run', 140),
          K(r3(cut1 - 0.004), 2.45, 1.6, 'run', 160),
          # Flur
          K(cut1, 0.6, 0.4, 'run', -3), K(r3(sw_start - 0.004), SWX, SWZ, 'run', 0), K(sw_start, SWX, SWZ, 'switchoff', 0),
          K(r3(cut2 - 0.004), SWX, SWZ, 'switchoff', 0),
          # Küche
          K(cut2, 2.5, 0.6, 'run', -60), K(r3(knee0 - 0.004), KNX, KNZ, 'run', KNF), K(knee0, KNX, KNZ, 'kneelcall', KNF), K(1, KNX, KNZ, 'kneelcall', KNF)]
kumpel3 = [kumpel_stuck(0, 1), kumpel_stuck(r3(cut1 - 0.002), 1), kumpel_stuck(cut1, 1, HIDE), kumpel_stuck(r3(cut2 - 0.002), 1, HIDE),
           K(cut2, KX, KZ, 'stuck', 0, zap=0.5, y=0), K(r3(cut2 + sec(L3, 0.25)), KX, KZ, 'stuck', 0, zap=0, y=0),
           K(r3(cut2 + sec(L3, 0.3)), KX, KZ, 'sitdown', 0), K(r3(cut2 + sec(L3, 1.5)), PX, PZ, 'sitdown', PF),
           K(r3(cut2 + sec(L3, 1.504)), PX, PZ, 'sit', PF), K(1, PX, PZ, 'sit', PF)]
eel3 = eel((0, 'wiggle', 1), (r3(cut1 - 0.002), 'wiggle', 1), (cut1, 'wiggle', 1, HIDE), (r3(cut2 - 0.002), 'wiggle', 1, HIDE),
           (cut2, 'withdraw', 0.5), (r3(cut2 + sec(L3, 0.25)), 'withdraw', 0), (r3(c_aal), 'withdraw', 0), (r3(c_aal + 0.004), 'peek', 0),
           (r3(c_aal + sec(L3, 1.9)), 'peek', 0), (r3(c_aal + sec(L3, 1.904)), 'withdraw', 0), (1, 'withdraw', 0))
fuse = [K(0, FBX, FBZ, 'park', 180, y=HIDE, lever=1), K(r3(cut1 - 0.002), FBX, FBZ, 'park', 180, y=HIDE), K(cut1, FBX, FBZ, 'park', 180, y=0, lever=1),
        K(r3(sw_start + sec(L3, 0.45)), FBX, FBZ, 'park', 180, y=0, lever=1), K(flip, FBX, FBZ, 'park', 180, y=0, lever=0),
        K(r3(cut2 - 0.002), FBX, FBZ, 'park', 180, y=0, lever=0), K(cut2, FBX, FBZ, 'park', 180, y=HIDE, lever=0)]
exp3 = {
 'stage': [{'t': 0, 'stage': 'kueche'}, {'t': cut1, 'stage': 'hausflur'}, {'t': cut2, 'stage': 'kueche'}],
 'camera': [cam(0, [0.5, 1.7, 5.6], [1.0, 1.25, -1.5]), cam(r3(cut1 - 0.004), [0.45, 1.7, 5.4], [0.9, 1.25, -1.4]),
            cam(cut1, [1.0, 1.5, 2.3], [0.45, 1.7, -2.6]), cam(r3(cut2 - 0.004), [1.0, 1.5, 2.0], [0.45, 1.7, -2.6]),
            cam(cut2, [0.9, 1.2, 3.8], [1.35, 1.3, -1.5]), cam(r3(c_aal - 0.004), [0.9, 1.15, 3.4], [1.35, 1.3, -1.5]),
            cam(c_aal, [1.3, 1.55, -0.95], [1.85, 1.22, -2.25]), cam(1, [1.32, 1.53, -1.05], [1.85, 1.22, -2.25])],
 'actors': {'dummy': dummy3, 'kumpel': kumpel3, 'zitteraal': eel3, 'sicherungskasten': fuse},
 'sfx': [{'t': 0.01, 'id': 'strom-knistern', 'volume': 0.35}, {'t': r3(run0), 'id': 'schritte-rennen', 'volume': 0.45},
         {'t': r3(flip - sec(L3, 0.05)), 'id': 'sicherung-klick', 'volume': 0.9}, {'t': r3(cut2 + sec(L3, 0.15)), 'id': 'aal-schmollen', 'volume': 0.6},
         {'t': r3(c_112 - sec(L3, 0.9)), 'id': 'handy-waehlen', 'volume': 0.55}],
}
steps3 = [{'text': 'Nicht anfassen', 'cue': 'Unterbrich zuerst den Stromkreis'},
          {'text': 'Stecker ziehen oder Sicherung raus', 'cue': 'Stecker ziehen'},
          {'text': 'Notfalls: trockener Besenstiel', 'cue': 'oder die Sicherung raus'},
          {'text': 'Dann helfen', 'cue': 'Erst dann helfen'},
          {'text': 'Beschwerden oder bewusstlos: 112', 'cue': 'Hat dein Kumpel danach'}]

# ================= Outro =================
outro = {'camera': [cam(0, [0.7, 1.6, 4.0], [1.05, 1.95, -1.4]), cam(1, [0.75, 1.6, 3.6], [1.05, 1.95, -1.4])],
         'actors': {'zitteraal': eel((0, 'peek', 0)), 'kumpel': [K(0, PX, PZ, 'wave', 170)], 'dummy': [K(0, 0.6, -1.2, 'wave', 165)]}}

DESC = ("Ein Zitteraal hat sich mal wieder in deiner Steckdose eingenistet – was machst du jetzt? ⚡🐍 Schreib 1, 2 oder 3 in die Kommentare! "
        "Der Aal ist ausgedacht, die Regel gilt bei jedem echten Stromunfall.\n\n"
        "Quellen:\n"
        "Deutscher Feuerwehrverband, Erste-Hilfe kompakt: Stromunfall: https://download.kfv-oh.de/Sicherheit%20und%20Gesundheit/Publikationen/Gesundheit%20und%20Fitness/Erste-Hilfe-Kompakt-DFV/16-Stromunfall.pdf\n"
        "Apotheken Umschau, Stromschlag: https://www.apotheken-umschau.de/therapie/erste-hilfe/stromschlag-warum-ist-er-gefaehrlich-738493.html\n\n"
        "Kein Ersatz für einen Erste-Hilfe-Kurs. Im Notfall: 112.\n\n"
        "#waswürdestdutun #stromunfall #erstehilfe #strom #wusstestdu #survival #notfall #quiz")
scen = {
 'id': ID, 'category': 'erste-hilfe', 'stage': 'kueche',
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy packt den zitternden Kumpel von hinten an den Armen, die Blitze springen auf ihn über, beide zittern. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e1'], 'choreography': exp1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy schlägt mit dem nassen, tropfenden Handtuch nach dem Aal, Blitze laufen das Handtuch entlang. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e2'], 'choreography': exp2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy läuft in den Flur zum Sicherungskasten und legt den Hauptschalter um, die Blitze verschwinden, der Aal zieht sich beleidigt zurück, Dummy kniet beim Kumpel und telefoniert. Grünes Aufleuchten.', 'explanation': S['e3'], 'steps': steps3, 'choreography': exp3},
 ],
 'correctOption': 3,
 'countdown': {'speech': S['countdown'], 'screen': 'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal': {'speech': S['reveal'], 'screen': 'Richtig ist Nummer 3'},
 'outro': {'speech': S['outro'], 'screen': S['outro']},
 'sourceLine': 'Quellen: Deutscher Feuerwehrverband · Apotheken Umschau',
 'sources': [
  {'name': 'Deutscher Feuerwehrverband, Erste-Hilfe kompakt: Stromunfall', 'url': 'https://download.kfv-oh.de/Sicherheit%20und%20Gesundheit/Publikationen/Gesundheit%20und%20Fitness/Erste-Hilfe-Kompakt-DFV/16-Stromunfall.pdf'},
  {'name': 'Apotheken Umschau, Stromschlag', 'url': 'https://www.apotheken-umschau.de/therapie/erste-hilfe/stromschlag-warum-ist-er-gefaehrlich-738493.html'},
 ],
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ehrlich: Wer hätte seinen Kumpel einfach weggezogen? 👇 Und welches Tier soll sich als Nächstes bei dem Dummy einnisten?",
 },
 'shots': {'situation': situation, 'options': options, 'countdown': countdown, 'reveal': reveal, 'outro': outro},
}
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
print('cues', dict(touch=c_touch, fz1=fz1, hit=hit, fz2=fz2, cut1=cut1, sw_start=sw_start, flip=flip, cut2=cut2, knee0=knee0, hat=c_hat, aal=c_aal))
