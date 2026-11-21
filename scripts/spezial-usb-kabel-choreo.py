# Hilfsskript: erzeugt scenarios/spezial-usb-kabel.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-usb-kabel-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-tuer-druecken.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, niemand wird verletzt, alles slapstickartig im Low-Poly-Cartoon-Stil,
# KEINE Markenlogos auf Laptop oder Kabel (Laptop + Stecker selbst gestaltet, ohne Logo/Schrift).
# Bühne: Homeoffice mit offenem Fenster + Garten ("homeoffice-usb", src/stage/Rooms.tsx; "-aussen" = zusätzlich Hauswand von außen).
#  Situation: Dummy sitzt am Schreibtisch, dreht das USB-Kabel 5-mal (Zähler oben 1x … 5x), beim 6. Versuch gleitet es hinein;
#             „Physik existiert einfach nicht“ → Arme hoch; „Was machst du?“ → Fragezeichen.
#  A: (Karte) steht mit dem kleinen Cartoon-Gummihammer am Tisch, Stecker liegt (falsch herum) vor dem Anschluss.
#     (Szene) Zeigefinger „nein“ → Krocket-Schlag: Stecker knallt unter Funken + Konfetti hinein → sitzt, Anschluss leuchtet grün, stolz.
#  B: (Karte) zieht den Stecker heraus und hebt ihn auf Augenhöhe. (Szene) strenger Blick ganz nah, Zeigefinger tippt: „Schnall dich warm an“
#     → winziger Sicherheitsgurt + Mini-Helm; das Kabel nickt.
#  C: (Karte) dreht weiter (6x, 7x), dann reißt der Geduldsfaden: Fäuste, Dampf. (Szene) steht mit dem Laptop, klappt ihn falschrum nach
#     hinten zu (Knack!), wirft ihn im hohen Bogen durchs offene Fenster → Außenansicht: landet weich in der Cartoon-Mülltonne im Garten.
#     Prüfung check_c: Flugbahn geht frei durchs Fenster, landet in der Tonne, niemand draußen.
# Spezial-Regeln: 61–66 s, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-usb-kabel'
S = dict(
situation="Du hast das USB-Kabel mal wieder fünfmal gedreht, bevor es endlich in den Laptop passt. Physik existiert einfach nicht. Was machst du?",
o1c="Was nicht passt, wird passend gemacht", o1s="A: Was nicht passt, wird passend gemacht – du stöpselst es komplett aggressiv rein.",
o2c="Kabel eine Ansage machen", o2s="B: Du schaust das Kabel streng an und sagst: Schnall dich warm an!",
o3c="Laptop falschrum zuklappen und weg", o3s="C: Du klappst den Laptop in die andere Richtung zusammen und schmeißt ihn weg.",
e1="Kein Drehen mehr. Was nicht passt, wird passend gemacht. Einmal richtig reindrücken – sitzt bombenfest.",
e2="Ein strenger Blick direkt auf den Stecker. Eine klare Ansage: Schnall dich warm an. Das Kabel hat verstanden.",
e3="Genug gedreht. Laptop einfach komplett falschrum nach hinten zuklappen und im hohen Bogen wegschmeißen.",
vote="Also, was machst du?",
# Outro des Inhabers Buchstabe für Buchstabe + (Spezial-Regel 5, Wunsch Inhaber) angehängt: „Neue Video-Ideen? Ab in die Kommentare!“
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr. Neue Video-Ideen? Ab in die Kommentare!",
)
EXTRA = {1: float(os.environ.get('EXA', 0.0)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.9))}
TAIL = float(os.environ.get('TAIL', 0.3))
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))
VOTE_LEN = float(os.environ.get('VOTE_LEN', 5.6))
NO_VOTE = os.environ.get('NO_VOTE', '0') == '1'

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'countdown': 0.1, 'outro': 0.3}
MINLEN = {'situation': 5, 'option1': 3.6, 'option2': 3.6, 'option3': 4.2, 'explain1': 6, 'explain2': 6, 'explain3': 6, 'countdown': 5, 'outro': 3}
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
def M(pos, look, fov=None, push=0.06):
    return (pos, look, fov, push)
def shot(t0, t1, f, push=None):
    c, l, fv, p = f
    p = p if push is None else push
    c2 = [c[i] + (l[i] - c[i]) * p for i in range(3)]
    return [cam(t0, c, l, fv), cam(r3(t1), c2, l, fv)]
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)
def rot(face, lx, lz):
    """lokale Koordinaten (x: + = links der Figur, z vorn) einer Figur mit Blickrichtung face → Welt-Versatz (dx, dz)"""
    th = math.radians(180 - face)
    return lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th)
def W(pos, face, local):
    """Weltpunkt eines lokalen Punkts [x, y, z] der Figur bei pos (x, z) mit Blickrichtung face"""
    dx, dz = rot(face, local[0], local[2])
    return [pos[0] + dx, local[1], pos[1] + dz]

class Cast:
    """Sichtbarkeit je Einstellung: Figur nur in [t0, t1] zeigen, sonst y −30 (wie spezial-tuer-druecken)"""
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
# feste Plätze (Bühne homeoffice-usb, src/stage/Rooms.tsx HOMEOFFICE/USB_GARDEN; Laptop src/actors/UsbProps.tsx USBL/USBP;
# Bewegungen src/actors/Dummy.tsx usbPose: USB_TWIST, USB_PORT, USB_CROQ, USB_RELEASE, USB_REL_HAND)
# =====================================================================================================
STAGE = 'homeoffice-usb'
STAGE_OUT = 'homeoffice-usb-aussen'
P_TW = 0.95                                   # USB_TWIST
CH = (-1.5, -0.4); FS = 270                   # sitzender Dummy (Blick zum Fenster)
LAP = (-2.0, -0.4); LAP_Y = 0.74; LAP_F = 90  # Laptop (Bildschirm zum Dummy)
PORT = (LAP[0] + 0.03, 0.751, LAP[1] - 0.18)  # Anschluss-Öffnung (Welt), Stecker steckt entlang +z hinein
D_IN, D_TOUCH = 0.036, 0.087                  # Griffpunkt hinter der Öffnung: steckt / Spitze berührt
def plug_at(d):
    return (PORT[0], PORT[2] - d)
EYE_L = [-0.03, 1.17, 0.3]                    # Stecker auf Augenhöhe (lokal, sitzend)
def lap(t, **kw):
    v = dict(lid=1.0, fold=0.0, squish=0.0, glow=0.0, tilt=0.0); v.update(kw)
    return K(t, LAP[0], LAP[1], 'park', LAP_F, y=LAP_Y, **v)
def body(x, z, h=1.95, w=0.42):
    return [[x - w, 0, z], [x + w, h, z]]
def seated(x=CH[0], z=CH[1]):
    return [[x - 0.35, 0.0, z - 0.3], [x + 0.2, 1.45, z + 0.3]]
DESK_PTS = [[-2.5, 0.0, -1.05], [-1.9, 0.74, 0.25]]
LAP_PTS = [[LAP[0] - 0.13, LAP_Y, LAP[1] - 0.19], [LAP[0] + 0.13, LAP_Y + 0.25, LAP[1] + 0.19]]
PORT_PTS = [[PORT[0] - 0.1, 0.7, PORT[2] - 0.2], [PORT[0] + 0.08, 0.84, PORT[2] + 0.06]]
WIN_PTS = [[-2.5, 0.75, -1.05], [-2.5, 2.4, 0.25]]   # Fenster der Bühne homeoffice-usb (USB_GARDEN.win)

# =====================================================================================================
# Situation: 5 Fehlversuche (Zähler 1x … 5x), 6. Versuch gleitet hinein, Arme hoch, „Was machst du?“
# =====================================================================================================
L0 = 'situation'
TS = seclen(L0); ss = lambda s: s / TS
c_fuenf = cue(L0, 'situation', 'fünfmal'); c_bevor = cue(L0, 'situation', 'bevor'); c_phys = cue(L0, 'situation', 'Physik'); c_was = cue(L0, 'situation', 'Was machst')
t_tw0 = 0.0
t_in = r3(t_tw0 + ss(5 * P_TW)); t_in1 = r3(t_in + ss(0.24))
cs_ = Cast()
cs_.add('usblaptop', 0, 1, [lap(0), lap(r3(t_in1 - 0.002)), lap(t_in1, glow=1.0), lap(r3(t_in1 + ss(0.6)), glow=1.0), lap(r3(t_in1 + ss(1.1)), glow=0.0), lap(1)])
cs_.add('dummy', 0, c_phys, [K(0, *CH, 'twistplug', FS), K(r3(c_phys - 0.002), *CH, 'twistplug', FS)])
cs_.add('dummy', c_phys, 1, [K(c_phys, *CH, 'physikshrug', FS, question=0.0), K(r3(max(c_was, c_phys + ss(0.6))), *CH, 'physikshrug', FS, question=0.0),
                             K(r3(max(c_was, c_phys + ss(0.6)) + ss(0.35)), *CH, 'physikshrug', FS, question=1.0), K(1, *CH, 'physikshrug', FS, question=1.0)])
# Stecker: in der rechten Hand (hand 1), dreht sich nach jedem Stoß um 180° (Umdrehen 0,52–0,85·P), gleitet bei 5·P hinein
plugK = [K(0, *plug_at(0.15), 'park', 180, y=PORT[1], hand=1.0, drop=0.0, tilt=0.0, rope=0.0)]
counter = []
for k in range(5):
    a = r3(t_tw0 + ss(k * P_TW + 0.52 * P_TW)); b = r3(t_tw0 + ss(k * P_TW + 0.85 * P_TW))
    plugK += [K(a, *plug_at(0.15), 'park', 180, y=PORT[1], hand=1.0, tilt=float(k * 180)), K(b, *plug_at(0.15), 'park', 180, y=PORT[1], hand=1.0, tilt=float((k + 1) * 180))]
    counter.append({'t': b, 'text': f'{k + 1}x'})
plugK += [K(r3(t_in1 + ss(0.1)), *plug_at(D_IN), 'park', 180, y=PORT[1], hand=1.0, tilt=900.0), K(r3(t_in1 + ss(0.12)), *plug_at(D_IN), 'park', 180, y=PORT[1], hand=0.0, tilt=900.0),
          K(1, *plug_at(D_IN), 'park', 180, y=PORT[1], hand=0.0, tilt=900.0)]
cs_.add('usbstecker', 0, 1, plugK)
cs_.add('funken', t_in1, 1, [K(t_in1, PORT[0] + 0.02, PORT[2], 'burst', 180, y=PORT[1] + 0.02, mark=1.0, size=-0.4)])
counter.append({'t': r3(c_phys), 'text': ''})
situation = {
 'camera': [
   # Totale: Dummy am Schreibtisch, Laptop, Stecker an der Seite (Zähler zählt mit)
   *shot(0, c_fuenf - 0.003, F([*seated(), *LAP_PTS, *PORT_PTS], -128, 14, SIT), push=0.05),
   # nah: Stecker + Anschluss (dreht sich, passt nicht)
   *shot(c_fuenf, c_bevor - 0.003, F([*PORT_PTS, [PORT[0] - 0.05, 0.95, PORT[2] - 0.35]], -165, 16, SIT), push=0.07),
   # 6. Versuch: gleitet hinein
   *shot(c_bevor, c_phys - 0.003, F([*PORT_PTS, *LAP_PTS], -150, 22, SIT), push=0.06),
   # Physik existiert nicht: Arme hoch – „Was machst du?“
   *shot(c_phys, 1, F([[CH[0] - 0.5, 0, CH[1] - 0.45], [CH[0] + 0.25, 2.05, CH[1] + 0.45], *LAP_PTS], -105, 8, SIT), push=0.05),
 ],
 'actors': cs_.build(), 'stage': STAGE, 'counter': counter,
 'sfx': [*[{'t': r3(t_tw0 + ss(k * P_TW + 0.3 * P_TW)), 'id': 'usb-stoss', 'volume': 0.75} for k in range(5)],
         *[{'t': c['t'], 'id': 'plopp', 'volume': 0.35} for c in counter if c['text']],
         {'t': r3(t_in + ss(0.18)), 'id': 'klick', 'volume': 0.8}, {'t': r3(t_in1), 'id': 'rasen-zauber', 'volume': 0.3}],
}

# =====================================================================================================
# Antwort A: Karte = Dummy mit Gummihammer, Stecker liegt falsch herum vor dem Anschluss.
#            Szene = „nein“-Finger → Krocket-Schlag (Funken + Konfetti) → sitzt bombenfest
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_kein = cue(A, 'explain1', 'Kein'); c_was1 = cue(A, 'explain1', 'Was nicht'); c_pass = cue(A, 'explain1', 'passend'); c_ein = cue(A, 'explain1', 'Einmal'); c_bomb = cue(A, 'explain1', 'bombenfest')
DA = (-1.52, -0.95); FA = 270
cA = Cast()
t_hit = r3(c_pass + sa(0.05)); t_cq = r3(t_hit - sa(0.55))
def croquet_tilt(u):
    """Neigung des senkrecht hängenden Hammers (Grad, + = Kopf nach hinten = −z) passend zur Bewegung 'croquet' (u = s seit Start)"""
    ez = lambda x: 0.5 - 0.5 * math.cos(math.pi * max(0, min(1, x)))
    if u < 0.45: return 55 * ez(u / 0.45)
    if u < 0.55: return 55 * (1 - (u - 0.45) / 0.1)
    if u < 0.75: return -20 * ez((u - 0.55) / 0.2)
    return -20 + 15 * ez((u - 0.75) / 0.45)
cA.add('usblaptop', 0, 1, [lap(0), lap(r3(t_hit - 0.002)), lap(t_hit, squish=1.0, glow=1.0), lap(r3(t_hit + sa(0.9)), squish=0.0, glow=1.0), lap(1, glow=1.0)])
# Stecker: Spitze berührt den Anschluss (falsch herum = Drehung 180°), beim Treffer schießt er hinein (noch 0,01 tiefer = bombenfest)
cA.add('usbstecker', 0, 1, [K(0, *plug_at(D_TOUCH), 'park', 180, y=PORT[1], tilt=180.0, rope=0.0), K(r3(t_hit - 0.002), *plug_at(D_TOUCH), 'park', 180, y=PORT[1], tilt=180.0),
                            K(r3(t_hit + sa(0.07)), *plug_at(D_IN - 0.006), 'park', 180, y=PORT[1], tilt=180.0), K(1, *plug_at(D_IN - 0.006), 'park', 180, y=PORT[1], tilt=180.0)])
# Dummy: Karte = drohend bereit, Szene: nein-Finger, Schlag, stolz
cA.add('dummy', 0, c_was1, [K(0, *DA, 'malletready', FA), K(r3(c_kein - 0.002), *DA, 'malletready', FA), K(c_kein, *DA, 'nofinger', FA, cut=True), K(r3(c_was1 - 0.002), *DA, 'nofinger', FA)])
cA.add('dummy', c_was1, c_ein, [K(c_was1, *DA, 'stand', FA), K(r3(t_cq - 0.002), *DA, 'stand', FA), K(t_cq, *DA, 'croquet', FA), K(c_ein, *DA, 'croquet', FA)])
cA.add('dummy', c_ein, 1, [K(c_ein, *DA, 'proud', 200), K(1, *DA, 'proud', 200)])
# Gummihammer in der rechten Hand: Karte + nein-Finger mit Kopf nach oben (180°), beim Schlag senkrecht mit Kopf unten
hamK = [K(0, *DA, 'park', 180, y=1.0, hand=1.0, drop=0.0, tilt=180.0), K(r3(c_kein - 0.002), *DA, 'park', 180, y=1.0, hand=1.0, tilt=180.0),
        K(c_kein, *DA, 'park', 180, y=1.0, hand=1.0, tilt=0.0, cut=True), K(r3(c_was1 - 0.002), *DA, 'park', 180, y=1.0, hand=1.0, tilt=0.0),
        K(c_was1, *DA, 'park', 180, y=1.0, hand=1.0, tilt=0.0, cut=True)]
u = 0.0
while u <= 1.2 + 1e-6:
    hamK.append(K(r3(t_cq + sa(u)), *DA, 'park', 180, y=1.0, hand=1.0, tilt=round(croquet_tilt(u), 2)))
    u += 1 / 30
hamK += [K(r3(c_ein - 0.002), *DA, 'park', 180, y=1.0, hand=1.0, tilt=-5.0), K(c_ein, *DA, 'park', 180, y=1.0, hand=1.0, tilt=0.0, cut=True), K(1, *DA, 'park', 180, y=1.0, hand=1.0, tilt=0.0)]
cA.add('gummihammer', 0, 1, hamK)
cA.add('funken', t_hit, 1, [K(t_hit, PORT[0] + 0.0, PORT[2] - 0.05, 'burst', 180, y=PORT[1] + 0.03, size=0.3)])
cA.add('konfetti', t_hit, 1, [K(t_hit, PORT[0] + 0.1, PORT[2] - 0.05, 'burst', 180, y=PORT[1], size=-0.55)])
HAND_HIT = W(DA, FA, [0.147, 1.09, 0.45])
def check_a():
    """Treffer: Hammerkopf (0,29 m unter der Hand) trifft das hintere Ende des Steckers entlang +z; nicht im Tisch."""
    head = [HAND_HIT[0], HAND_HIT[1] - 0.29, HAND_HIT[2]]
    back_end = PORT[2] - D_TOUCH - 0.055
    gap = (back_end) - (head[2] + 0.081)
    assert abs(gap) < 0.02, ('A: Hammer trifft den Stecker nicht', gap)
    assert head[1] - 0.058 >= 0.738, ('A: Hammerkopf im Tisch', head)
    assert abs(head[0] - PORT[0]) < 0.02, ('A: seitlich daneben', head, PORT)
    return round(gap, 3)
P_HAM = [[HAND_HIT[0] - 0.1, 0.72, HAND_HIT[2] - 0.3], [HAND_HIT[0] + 0.1, 1.2, HAND_HIT[2] + 0.1]]
camA = [
  # Karte: eine ruhige Einstellung – Dummy mit Hammer, Tisch, Laptop, Stecker
  *shot(0, sA - 0.003, F([*body(*DA, 1.95), *LAP_PTS, *PORT_PTS], -128, 8, ANS), push=0.03),
  # „Kein Drehen mehr“: nah, Zeigefinger
  *shot(sA, c_was1 - 0.003, F([[DA[0] - 0.45, 0.85, DA[1] - 0.3], [DA[0] + 0.1, 1.95, DA[1] + 0.35]], -110, 6, ANS), push=0.06),
  # Krocket-Schlag seitlich: Hammer, Stecker, Anschluss
  *shot(c_was1, c_ein - 0.003, F([*P_HAM, *PORT_PTS, *LAP_PTS, [DA[0] - 0.4, 1.4, DA[1]]], -62, 8, ANS), push=0.05),
  # sitzt bombenfest: Anschluss leuchtet, Dummy stolz
  *shot(c_ein, 1, F([*body(*DA, 1.95), *LAP_PTS, *PORT_PTS], -150, 10, ANS), push=0.05),
]
expA = {
 'camera': camA, 'actors': cA.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sa(0.4)), 'id': 'gummi-bonk', 'volume': 0.25}, {'t': r3(sa(1.2)), 'id': 'gummi-bonk', 'volume': 0.25},
         {'t': r3(t_cq + sa(0.1)), 'id': 'whoosh', 'volume': 0.5}, {'t': r3(t_hit), 'id': 'gummi-bonk', 'volume': 0.95},
         {'t': r3(t_hit + sa(0.02)), 'id': 'strom-knistern', 'volume': 0.35}, {'t': r3(t_hit + sa(0.05)), 'id': 'konfetti-knall', 'volume': 0.45},
         {'t': r3(c_bomb), 'id': 'gold-fanfare', 'volume': 0.3}],
}

# =====================================================================================================
# Antwort B: Karte = Stecker herausziehen und auf Augenhöhe heben. Szene = strenger Blick, Ansage + Gurt + Helm, Kabel nickt
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_streng = cue(B, 'explain2', 'Ein strenger'); c_klar = cue(B, 'explain2', 'Eine klare'); c_schnall = cue(B, 'explain2', 'Schnall'); c_warm = cue(B, 'explain2', 'warm')
c_kabel = cue(B, 'explain2', 'Das Kabel')
cB = Cast()
cB.add('usblaptop', 0, 1, [lap(0)])
EYE_W = W(CH, FS, EYE_L)
cB.add('dummy', 0, c_streng, [K(0, *CH, 'liftplug', FS), K(r3(c_streng - 0.002), *CH, 'liftplug', FS)])
cB.add('dummy', c_streng, c_klar, [K(c_streng, *CH, 'stareplug', FS, angry=1.0), K(c_klar, *CH, 'stareplug', FS, angry=1.0)])
cB.add('dummy', c_klar, c_kabel, [K(c_klar, *CH, 'tapplug', FS, angry=1.0), K(c_kabel, *CH, 'tapplug', FS, angry=1.0)])
cB.add('dummy', c_kabel, 1, [K(c_kabel, *CH, 'nodplug', FS, angry=0.0), K(1, *CH, 'nodplug', FS, angry=0.0)])
t_pull = r3(sb(0.55)); t_up = r3(sb(1.2))
plugB = [K(0, *plug_at(D_IN), 'park', 180, y=PORT[1], hand=1.0, drop=0.0, tilt=180.0, rope=0.0), K(t_pull, *plug_at(D_IN), 'park', 180, y=PORT[1], hand=1.0, rope=0.0),
         K(t_up, EYE_W[0], EYE_W[2], 'park', 90, y=EYE_W[1], hand=1.0, rope=1.0),
         K(r3(c_schnall - 0.002), EYE_W[0], EYE_W[2], 'park', 90, y=EYE_W[1], hand=1.0, belt=0.0, helm=0.0),
         K(r3(c_schnall + sb(0.4)), EYE_W[0], EYE_W[2], 'park', 90, y=EYE_W[1], hand=1.0, belt=1.0, helm=0.0),
         K(r3(c_warm - 0.002), EYE_W[0], EYE_W[2], 'park', 90, y=EYE_W[1], hand=1.0, belt=1.0, helm=0.0),
         K(r3(c_warm + sb(0.35)), EYE_W[0], EYE_W[2], 'park', 90, y=EYE_W[1], hand=1.0, belt=1.0, helm=1.0),
         K(r3(c_kabel + sb(0.25)), EYE_W[0], EYE_W[2], 'park', 90, y=EYE_W[1], hand=1.0, belt=1.0, helm=1.0, nod=0.0),
         K(r3(c_kabel + sb(0.55)), EYE_W[0], EYE_W[2], 'park', 90, y=EYE_W[1], hand=1.0, belt=1.0, helm=1.0, nod=1.0),
         K(1, EYE_W[0], EYE_W[2], 'park', 90, y=EYE_W[1], hand=1.0, belt=1.0, helm=1.0, nod=1.0)]
cB.add('usbstecker', 0, 1, plugB)
HEAD_W = [CH[0] - 0.08, 1.28, CH[1]]
P_FACE = [[HEAD_W[0] - 0.2, 1.0, HEAD_W[2] - 0.2], [EYE_W[0] - 0.06, 1.4, HEAD_W[2] + 0.2]]
camB = [
  # Karte: ruhige Einstellung – Stecker raus, hoch auf Augenhöhe
  *shot(0, sB - 0.003, F([*seated(), *LAP_PTS, [EYE_W[0], 1.3, EYE_W[2]]], -128, 10, ANS), push=0.03),
  # strenger Blick im Profil, ganz nah
  *shot(sB, c_klar - 0.003, F([*P_FACE, [EYE_W[0] - 0.08, 1.12, EYE_W[2]]], -20, 4, ANS), push=0.06),
  # Ansage: Finger tippt, Gurt + Helm
  *shot(c_klar, c_kabel - 0.003, F([*P_FACE, [EYE_W[0] - 0.1, 1.05, EYE_W[2] - 0.12], [EYE_W[0] + 0.05, 1.35, EYE_W[2] + 0.15]], -75, 6, ANS), push=0.06),
  # das Kabel hat verstanden: Stecker mit Gurt + Helm nickt
  *shot(c_kabel, 1, F([[EYE_W[0] - 0.12, 1.02, EYE_W[2] - 0.12], [EYE_W[0] + 0.12, 1.3, EYE_W[2] + 0.12], [HEAD_W[0], 1.35, HEAD_W[2]]], -95, 10, ANS), push=0.05),
]
expB = {
 'camera': camB, 'actors': cB.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sb(0.4)), 'id': 'stecker-ziehen', 'volume': 0.6}, {'t': r3(c_klar + sb(0.2)), 'id': 'stift-kritzeln', 'volume': 0.0},
         {'t': r3(c_schnall + sb(0.3)), 'id': 'gurt-klick', 'volume': 0.8}, {'t': r3(c_warm + sb(0.25)), 'id': 'plopp', 'volume': 0.6},
         {'t': r3(c_kabel + sb(0.5)), 'id': 'himmel-chor', 'volume': 0.3}],
}
expB['sfx'] = [s for s in expB['sfx'] if s['volume'] > 0]

# =====================================================================================================
# Antwort C: Karte = dreht weiter (6x, 7x), Geduldsfaden reißt (Fäuste, Dampf).
#            Szene = steht mit dem Laptop, klappt ihn falschrum nach hinten, wirft ihn durchs Fenster → landet weich in der Tonne
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_genug = cue(C, 'explain3', 'Genug'); c_lap = cue(C, 'explain3', 'Laptop'); c_kompl = cue(C, 'explain3', 'komplett'); c_und = cue(C, 'explain3', 'und im')
c_weg = cue(C, 'explain3', 'wegschmeißen')
cC = Cast()
# Karte: zwei weitere Fehlversuche, dann Wut
t_rage = r3(sc(2 * P_TW + 0.1))
cC.add('dummy', 0, sC, [K(0, *CH, 'twistplug', FS), K(r3(t_rage - 0.002), *CH, 'twistplug', FS), K(t_rage, *CH, 'ragefists', FS, angry=0.0),
                        K(r3(t_rage + sc(0.4)), *CH, 'ragefists', FS, angry=1.0), K(sC, *CH, 'ragefists', FS, angry=1.0)])
DROP = (PORT[0] + 0.12, PORT[2] - 0.22)
plugC = [K(0, *plug_at(0.15), 'park', 180, y=PORT[1], hand=1.0, drop=0.0, tilt=0.0, rope=0.0)]
counterC = []
for k in range(2):
    a = r3(sc(k * P_TW + 0.52 * P_TW)); b = r3(sc(k * P_TW + 0.85 * P_TW))
    plugC += [K(a, *plug_at(0.15), 'park', 180, y=PORT[1], hand=1.0, tilt=float(k * 180)), K(b, *plug_at(0.15), 'park', 180, y=PORT[1], hand=1.0, tilt=float((k + 1) * 180))]
    counterC.append({'t': b, 'text': f'{k + 6}x'})
plugC += [K(r3(t_rage - 0.002), *plug_at(0.15), 'park', 180, y=PORT[1], hand=1.0, tilt=360.0),
          K(r3(t_rage + sc(0.25)), *DROP, 'park', 160, y=0.755, hand=0.0, tilt=360.0), K(1, *DROP, 'park', 160, y=0.755, hand=0.0, tilt=360.0)]
cC.add('usbstecker', 0, 1, plugC)
counterC.append({'t': r3(sC), 'text': ''})
cC.add('kopfdampf', t_rage, sC, [K(t_rage, CH[0] - 0.05, CH[1], 'park', 0, y=1.36, fill=0.0), K(r3(t_rage + sc(0.8)), CH[0] - 0.05, CH[1], 'park', 0, y=1.36, fill=1.0), K(sC, CH[0] - 0.05, CH[1], 'park', 0, y=1.36, fill=1.0)])
# Szene: steht vor dem Fenster (rechts neben dem Stuhl), hält den Laptop, klappt falschrum, wirft
DC = (-1.45, 0.42)
FC = face_to(DC, (-2.5, -0.3))
LAP_HELD_F = (FC + 180) % 360
t_fold0 = r3(c_kompl - sc(0.05)); t_fold1 = r3(max(t_fold0 + sc(1.3), c_und - sc(0.45)))
t_thr0 = r3(c_und - sc(0.25)); t_rel = r3(t_thr0 + sc(0.62))
REL = W(DC, FC, [-0.1, 1.72, 0.42])
BIN = (-5.2, -0.5)
LAND = [BIN[0], 0.66, BIN[1]]
FLIGHT = 1.05
def arc(u):
    peak = 0.95
    x = REL[0] + (LAND[0] - REL[0]) * u; z = REL[2] + (LAND[2] - REL[2]) * u
    y = REL[1] + (LAND[1] - REL[1]) * u + 4 * peak * u * (1 - u)
    return x, y, z
t_land = r3(t_rel + sc(FLIGHT))
cC.add('dummy', sC, t_thr0, [K(sC, *DC, 'holdlaptop', FC, angry=1.0, cut=True), K(r3(t_fold0 - 0.002), *DC, 'holdlaptop', FC, angry=1.0), K(t_fold0, *DC, 'foldlaptop', FC, angry=1.0),
                             K(r3(t_thr0 - 0.002), *DC, 'foldlaptop', FC, angry=1.0)])
cC.add('dummy', t_thr0, 1, [K(t_thr0, *DC, 'throwlaptop', FC, angry=1.0), K(r3(t_rel + sc(0.9)), *DC, 'throwlaptop', FC, angry=0.6), K(1, *DC, 'throwlaptop', FC, angry=0.0)])
cC.add('kopfdampf', sC, t_rel, [K(sC, DC[0], DC[1], 'park', 0, y=1.86, fill=1.0)])
# Laptop: Karte auf dem Tisch (Stecker raus), Szene in den Händen (hand 1), dann Flug (Bahn arc), landet in der Tonne
cC.add('usblaptop', 0, sC, [lap(0)])
lapC = [K(sC, *DC, 'park', LAP_HELD_F, y=1.1, hand=1.0, drop=0.0, lid=1.0, fold=0.0, tilt=0.0, cut=True), K(t_fold0, *DC, 'park', LAP_HELD_F, y=1.1, hand=1.0, fold=0.0),
        K(t_fold1, *DC, 'park', LAP_HELD_F, y=1.1, hand=1.0, fold=1.0), K(r3(t_rel - 0.002), *DC, 'park', LAP_HELD_F, y=1.1, hand=1.0, fold=1.0)]
N = 32
for i in range(N + 1):
    u_ = i / N
    x, y, z = arc(u_)
    lapC.append(K(r3(t_rel + sc(FLIGHT * u_)), x, z, 'park', LAP_HELD_F, y=y, hand=0.0, fold=1.0, tilt=round(-400 * u_, 1)))
lapC += [K(r3(t_land + sc(0.35)), LAND[0], LAND[2], 'park', LAP_HELD_F, y=LAND[1] - 0.06, hand=0.0, fold=1.0, tilt=-400.0), K(1, LAND[0], LAND[2], 'park', LAP_HELD_F, y=LAND[1] - 0.06, fold=1.0, tilt=-400.0)]
cC.add('usblaptop', sC, 1, lapC)
cC.add('funken', t_fold1, 1, [K(t_fold1, *DC, 'burst', 0, y=1.1, mark=1.0, size=-0.2)])
t_cut_out = r3(t_rel + sc(0.32))
cC.add('muelltonne', t_cut_out, 1, [K(t_cut_out, *BIN, 'park', 90, lid=1.0, squish=0.0), K(r3(t_land - 0.002), *BIN, 'park', 90, lid=1.0, squish=0.0), K(t_land, *BIN, 'park', 90, lid=1.0, squish=1.0),
                                    K(r3(t_land + sc(0.45)), *BIN, 'park', 90, lid=1.0, squish=0.4), K(r3(t_land + sc(0.75)), *BIN, 'park', 90, lid=0.15, squish=0.0), K(1, *BIN, 'park', 90, lid=0.15, squish=0.0)])
def check_c():
    """Flugbahn: frei durchs offene Fenster (y 0.75 … 2.4, z −1.05 … 0.25, mit Abstand für den Laptop), landet in der Tonne; draußen niemand."""
    best = None
    for i in range(2001):
        u_ = i / 2000; x, y, z = arc(u_)
        if best is None or abs(x + 2.5) < abs(best[0] + 2.5): best = (x, y, z)
    x, y, z = best
    assert 0.75 + 0.18 < y < 2.4 - 0.18 and -1.05 + 0.18 < z < 0.25 - 0.18, ('C: Laptop trifft den Fensterrahmen', best)
    # über die Schreibtischlampe (≈ (−2.32, 1.2, 0.1)) hinweg
    for i in range(2001):
        u_ = i / 2000; x, y, z = arc(u_)
        if abs(x + 2.32) < 0.15 and abs(z - 0.1) < 0.25: assert y > 1.35, ('C: Lampe im Weg', (x, y, z))
    assert t_land < 1 - sc(0.6), ('C: Landung zu spät', t_land)
    return [round(v, 2) for v in best], round(arc(0.5)[1], 2)
LAPH_PTS = [[DC[0] - 0.6, 0.95, DC[1] - 0.35], [DC[0] - 0.15, 1.45, DC[1] + 0.2]]
camC = [
  # Karte: ruhige Einstellung – weiter drehen, Zähler, Wut + Dampf
  *shot(0, sC - 0.003, F([*seated(), *LAP_PTS, *PORT_PTS, [CH[0], 1.9, CH[1]]], -128, 10, ANS), push=0.03),
  # „Genug gedreht“: steht mit dem Laptop
  *shot(sC, c_lap - 0.003, F([*body(*DC, 2.2), *LAPH_PTS], -95, 6, ANS), push=0.06),
  # falschrum nach hinten zuklappen: nah, seitlich
  *shot(c_lap, c_und - 0.003, F([*LAPH_PTS, [DC[0] - 0.15, 1.6, DC[1]]], -10, 6, ANS), push=0.06),
  # Wurf: Dummy + offenes Fenster
  *shot(c_und, t_cut_out - 0.003, F([*body(*DC, 2.2), *WIN_PTS, *DESK_PTS], 40, 8, ANS), push=0.04),
  # draußen: Laptop fliegt im Bogen aus dem Fenster und landet weich in der Tonne
  *shot(t_cut_out, 1, F([*WIN_PTS, [-2.6, 0, -1.1], [BIN[0] - 0.4, 0, BIN[1] - 0.4], [BIN[0] + 0.4, 1.0, BIN[1] + 0.4], [arc(0.5)[0], arc(0.5)[1] + 0.2, arc(0.5)[2]]], -50, 6, ANS), push=0.04),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': [{'t': 0, 'stage': STAGE}, {'t': round(te(t_cut_out), 4), 'stage': STAGE_OUT}], 'counter': counterC,
 'sfx': [*[{'t': r3(sc(k * P_TW + 0.3 * P_TW)), 'id': 'usb-stoss', 'volume': 0.75} for k in range(2)],
         *[{'t': c['t'], 'id': 'plopp', 'volume': 0.35} for c in counterC if c['text']],
         {'t': r3(t_rage + sc(0.3)), 'id': 'dampf', 'volume': 0.6},
         {'t': r3(t_fold0 + sc(0.5)), 'id': 'laptop-knacken', 'volume': 0.8}, {'t': r3(t_fold1 - sc(0.05)), 'id': 'laptop-knacken', 'volume': 0.9},
         {'t': r3(t_rel - sc(0.1)), 'id': 'whoosh', 'volume': 0.7}, {'t': r3(t_land), 'id': 'kissen-plumps', 'volume': 0.9},
         {'t': r3(t_land + sc(0.6)), 'id': 'plopp', 'volume': 0.6}],
}
# Stage-Wechsel: Kamera-Zeit ist geglättet (te), die Bühne schaltet nach Abschnitts-Zeit → Zeitpunkt passend umrechnen
def inv_te(y):
    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if te(mid) < y: lo = mid
        else: hi = mid
    return lo
expC['stage'] = [{'t': 0, 'stage': STAGE}, {'t': round(inv_te(te(t_cut_out)), 4), 'stage': STAGE_OUT}]

# =====================================================================================================
# Abstimmung + Outro: Dummy steht neben dem Schreibtisch, Laptop offen mit eingestecktem Kabel
# =====================================================================================================
DV = (-1.35, 0.5)
def endcast(wave=False):
    c = Cast()
    c.add('usblaptop', 0, 1, [lap(0)])
    c.add('usbstecker', 0, 1, [K(0, *plug_at(D_IN), 'park', 180, y=PORT[1], tilt=0.0, rope=0.0)])
    c.add('dummy', 0, 1, [K(0, *DV, 'stand', 215, question=0.0 if wave else 1.0)] + ([K(0.12, *DV, 'wave', 215), K(1, *DV, 'wave', 215)] if wave else []))
    return c.build()
V_PTS = [*body(*DV), *DESK_PTS, *LAP_PTS]
vote = {'camera': shot(0, 1, F(V_PTS, 30, 3, (120, 960, 1060, 1320)), push=0.04), 'actors': endcast(), 'stage': STAGE}
outro = {'camera': shot(0, 1, F(V_PTS, 34, 6, (100, 980, 780, 1110)), push=0.05), 'actors': endcast(True), 'stage': STAGE}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du hast das USB-Kabel mal wieder fünfmal gedreht, bevor es passt – was machst du? 🔌💻 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Alles bleibt rein comichaft und harmlos. 😄\n\n"
        "#waswürdestdutun #usb #laptop #technik #comedy #quiz #dummy #spezial\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': STAGE, 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy fackelt nicht lange: Mit einem kleinen Cartoon-Gummihammer schlägt er wie beim Krocket gegen das Ende des (falsch herum liegenden) Steckers – unter Funken und Konfetti knallt er in den Anschluss und sitzt bombenfest. Niemand wird verletzt.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy zieht den Stecker heraus, hält ihn auf Augenhöhe, schaut ihn streng an und tippt ihm mit dem Zeigefinger auf den Stecker. Das Kabel bekommt einen winzigen Sicherheitsgurt und einen Mini-Helm – und nickt.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Nach dem siebten Versuch reißt dem Dummy der Geduldsfaden: Er klappt den Laptop falschrum nach hinten zusammen (Knack!) und wirft ihn im hohen Bogen durchs offene Fenster – draußen landet er weich in einer Cartoon-Mülltonne voller Kissen. Draußen steht niemand.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
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
print('A (Spalt Hammer–Stecker m):', check_a(), '| C (Fensterdurchgang, Scheitel y):', check_c(), '| Einfügen bei', round(t_in * TS, 2), 's, „passt“ bei', round(cue(L0, 'situation', 'passt') * TS, 2), 's')
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
