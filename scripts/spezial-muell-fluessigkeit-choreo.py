# Hilfsskript: erzeugt scenarios/spezial-muell-fluessigkeit.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-muell-fluessigkeit-choreo.py
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-cookies.
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, niemand wird verletzt, alle Tritte, Spritzer und Fahrzeugbewegungen slapstickartig im
# Low-Poly-Cartoon-Stil. Keine neuen Figuren (nur der Dummy). Keine Logos (Müllwagen, Becher, Sack ohne Aufdruck).
# Bühnen: "muellstrasse" (src/stage/Settlement.tsx MUELL: Haus des Dummys = Objekt "haus", Tür (0, −9); Nachbarhaus mit heller Fassade gegenüber,
#         Fassade bei z 8,5) und "wohnzimmer-gross" (src/stage/TrashLiving.tsx WZG: durchbrechbare Haustür-Wand, Möbel als Objekt).
#  Situation: Dummy trägt den Müllsack aus der Haustür → Ecke reißt, grüner Schleim läuft über die Hand → geht weiter, tropft →
#             „Richtig eklig“ Ekel-Pose → „Was machst du?“ Fragezeichen.
#  A: (Karte) dreht sich zur Straße, hält den Sack hoch, Blick zum Nachbarhaus. (Szene) wirft hoch, Drehung, Roundhouse-Kick → Sack fliegt im
#     hohen Bogen über die Straße → klatscht an die helle Fassade, großer Klecks, Saftnasen laufen bis zum Boden; Dummy stolz.
#     Prüfung check_a: Kick-Richtung zeigt zum Nachbarhaus, Treffer an der Fassade (nicht am Fenster/an der Tür vorbei), niemand dort.
#  B: (Karte) Sack steht neben ihm, er prüft die Schleim-Hand wie ein Kenner (schnuppern, nicken). (Szene) Becher in der linken Hand, Hand
#     tropft hinein → auf ex → Muskeln wachsen + Glitzer → Doppelbizeps-Pose.
#  C: (Karte) steht an der offenen Haustür und wirft den Sack zurück ins Haus. (Szene) Schwurhand („Nie wieder“) → innen: Haustür-Wand bricht
#     auf, Müllwagen rollt ins Wohnzimmer, Greifarm lädt den Sack ein, Möbel verrutschen, Wagen rattert rückwärts hinaus.
#     Prüfung check_c: niemand im Wohnzimmer, Dummy draußen; Arm greift genau am Sack; Wagen erst NACH dem Bühnenwechsel in Bewegung.
# Spezial-Regeln: 61–66 s, Abstimmung nur „Also, was machst du?“, Outro + „Neue Video-Ideen? Ab in die Kommentare!“ (Regel 5).
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-muell-fluessigkeit'
S = dict(
situation="Dir ist mal wieder Flüssigkeit über die Hand gelaufen, während du den Müll rausgebracht hast. Richtig eklig. Was machst du?",
o1c="Roundhouse-Kick ans Nachbarhaus", o1s="A: Du verpasst dem Sack einen Roundhouse-Kick, er fliegt ans Haus der Nachbarn und der ganze Saft läuft über die Fassade.",
o2c="Als Protein-Shot trinken", o2s="B: Du trinkst es einfach, weil es ein protein- und vitaminreicher Shot ist.",
o3c="Müllwagen ins Wohnzimmer", o3s="C: Du bringst nie wieder Müll raus und die Müllabfuhr fährt jetzt immer direkt ins Haus.",
e1="Voller Roundhouse-Kick. Der Müllsack fliegt rüber ans Nachbarhaus und der Saft läuft einmal komplett über die Fassade.",
e2="Kurz abfüllen, auf ex weg. Voll mit Proteinen und Vitaminen. Wer braucht schon ein Fitnessstudio?",
e3="Nie wieder Müll rausbringen. Dafür kommt die Müllabfuhr jetzt einfach direkt ins Wohnzimmer gefahren.",
vote="Also, was machst du?",
# Outro des Inhabers Buchstabe für Buchstabe + (Spezial-Regel 5, Wunsch Inhaber) angehängt: „Neue Video-Ideen? Ab in die Kommentare!“
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr. Neue Video-Ideen? Ab in die Kommentare!",
)
EXTRA = {1: float(os.environ.get('EXA', 0.0)), 2: float(os.environ.get('EXB', 0.0)), 3: float(os.environ.get('EXC', 0.0))}
TAIL = float(os.environ.get('TAIL', 0.05))     # Texte + Abstimmung sonst über 66 s (Spezial-Regel 1: Pausen kürzen)
SCENE_LEAD = float(os.environ.get('SCENE_LEAD', 0.3))
OUTRO_MIN = float(os.environ.get('OUTRO_MIN', 0.0))
VOTE_LEN = float(os.environ.get('VOTE_LEN', 5.6))
NO_VOTE = os.environ.get('NO_VOTE', '0') == '1'

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': SCENE_LEAD, 'explain2': SCENE_LEAD, 'explain3': SCENE_LEAD, 'countdown': 0.1, 'outro': 0.3}
MINLEN = {'situation': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7, 'countdown': 5, 'outro': 3}   # wie MIN_LEN in src/data/timeline.ts
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
def inv_te(y):
    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if te(mid) < y: lo = mid
        else: hi = mid
    return lo
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
    """lokale Koordinaten (x: + = links der Figur, z vorn) einer Figur mit Blickrichtung face → Welt-Versatz (dx, dz)"""
    th = math.radians(180 - face)
    return lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th)
def W(pos, face, local):
    dx, dz = rot(face, local[0], local[2])
    return [pos[0] + dx, local[1], pos[1] + dz]
def ease(u):
    u = max(0.0, min(1.0, u)); return 0.5 - 0.5 * math.cos(math.pi * u)
G = 9.81
def ballistic(p0, p1, T, n=14):
    """Bogen von p0 nach p1 in T Sekunden unter Schwerkraft: Liste (u, [x, y, z])"""
    vy = (p1[1] - p0[1] + 0.5 * G * T * T) / T
    out = []
    for i in range(n + 1):
        u = i / n; tt = u * T
        out.append((u, [p0[0] + (p1[0] - p0[0]) * u, p0[1] + vy * tt - 0.5 * G * tt * tt, p0[2] + (p1[2] - p0[2]) * u]))
    return out, vy

class Cast:
    """Sichtbarkeit je Einstellung: Figur nur in [t0, t1] zeigen, sonst y −30 (wie spezial-cookies)"""
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
# feste Plätze + Maße (Bewegungen in src/actors/Dummy.tsx muellPose: MUELL_DROP, BAG_HOLD, BAG_AIM, BAGKICK_*, BAGTOSS_REL, SHOT_CUP)
# =====================================================================================================
STAGE = 'muellstrasse'
STAGE_IN = 'wohnzimmer-gross'
DROP = 0.6                     # Sack hängt mit dem Knoten an der Hand (Ursprung = Sackboden)
BAG_H = 0.62
BAG_HOLD = [-0.36, 0.8, 0.06]; BAG_AIM = [-0.16, 1.22, 0.42]
BAGKICK_REL = 0.35; BAGKICK_HIT = 0.35 + 1.8 / 1.8; BAGKICK_FOOT = [-1.0, 0.93, 0.01]
BAGTOSS_REL = 0.52; BAGTOSS_HAND = [-0.16, 1.46, 0.56]
SHOTFILL_T = (0.4, 1.8)
HOUSE = (0, -12.5); DOOR = (0, -9.0)
FACADE_Z = 8.5                 # Fassade des Nachbarhauses (Richtung Straße)
NB_DOOR_X = -0.25              # Haustür des Nachbarn (Bühne: Haus um 180° gedreht)
D0 = (0.0, -4.4); F0 = 180     # Dummy auf dem Gehweg vor dem Gartenweg
def body(x, z, h=1.95, w=0.42):
    return [[x - w, 0, z - 0.3], [x + w, h, z + 0.3]]
def house_door_pts():
    return [[-0.8, 0, DOOR[1]], [0.8, 2.6, DOOR[1]]]
def bagK(t, x, z, y=0.0, face=0, **kw):
    v = dict(fill=0.0, mark=0.0, squish=0.0, tilt=0.0, turn=0.0, hand=0.0, drop=0.0); v.update(kw)
    return K(t, x, z, 'park', face, y=y, **v)
def held(t, fill=0.0, mark=0.0, **kw):
    """Sack an der rechten Hand des Dummys"""
    return K(t, 0, 0, 'park', 0, y=0.0, hand=1.0, drop=DROP, fill=fill, mark=mark, squish=0.0, tilt=0.0, turn=0.0, **kw)
haus_keys = lambda lid=0.0: [K(0, *HOUSE, 'park', 180, mark=0.0, lid=lid)]

# =====================================================================================================
# Situation: Haustür → Sack reißt, Schleim über die Hand → weiter zum Gehweg, tropft → Ekel → Fragezeichen
# =====================================================================================================
L0 = 'situation'
TS = seclen(L0); ss = lambda s: s / TS
c_fl = cue(L0, 'situation', 'Flüssigkeit'); c_hand = cue(L0, 'situation', 'Hand'); c_wae = cue(L0, 'situation', 'während')
c_rich = cue(L0, 'situation', 'Richtig'); c_was = cue(L0, 'situation', 'Was machst')
P_DOOR = (0.0, -8.45); P_STOP = (0.0, -7.1)
t_stop = r3(max(ss(1.2), c_fl - ss(0.15)))
t_tear = r3(c_fl + ss(0.15)); t_tear1 = r3(t_tear + ss(0.5))
t_sl0 = r3(t_tear + ss(0.25)); t_sl1 = r3(min(c_wae - ss(0.1), t_sl0 + ss(0.9)))
cs_ = Cast()
cs_.add('haus', 0, 1, haus_keys(1.0))
cs_.add('dummy', 0, 1, [K(0, *P_DOOR, 'bagwalk', 180, slime=0.0, question=0.0), K(r3(t_stop - 0.002), *P_STOP, 'bagwalk', 180),
                        K(t_stop, *P_STOP, 'bagstand', 180), K(t_sl0, *P_STOP, 'bagstand', 180, slime=0.0), K(t_sl1, *P_STOP, 'bagstand', 180, slime=1.0),
                        K(r3(c_wae + ss(0.1)), *P_STOP, 'bagwalk', 180, slime=1.0), K(r3(c_rich - ss(0.05)), *D0, 'bagwalk', 180, slime=1.0),
                        K(c_rich, *D0, 'bagick', 180, slime=1.0, question=0.0), K(r3(c_was + ss(0.1)), *D0, 'bagick', 180, question=0.0),
                        K(r3(c_was + ss(0.45)), *D0, 'bagick', 180, question=1.0), K(1, *D0, 'bagick', 180, question=1.0)])
cs_.add('muellsack', 0, 1, [held(0), held(r3(t_tear - 0.002)), held(t_tear1, fill=1.0, mark=0.0), held(r3(t_tear1 + ss(0.4)), fill=1.0, mark=1.0), held(1, fill=1.0, mark=1.0)])
HANDZONE = [[P_STOP[0] - 0.75, 0.05, P_STOP[1] - 0.35], [P_STOP[0] + 0.1, 1.35, P_STOP[1] + 0.35]]
situation = {
 'camera': [
   # Totale: Haus, Dummy kommt mit dem Sack aus der Tür (Kamera vom Gehweg gegenüber)
   *shot(0, c_fl - 0.003, ([2.3, 1.75, 2.2], [0.0, 1.55, -7.4], 44, None), push=0.06),
   # nah: Ecke reißt, Schleim läuft über die Hand
   *shot(c_fl, c_wae - 0.003, F(HANDZONE, -38, 14, (140, 940, 520, 1240)), push=0.07),
   # er geht weiter zum Gehweg, es tropft (seitlich)
   *shot(c_wae, c_rich - 0.003, F([*body(*P_STOP), *body(*D0), [-0.8, 0, D0[1] + 0.5]], -70, 8, SIT), push=0.05),
   # Richtig eklig: Ekel-Pose frontal, Haus dahinter
   *shot(c_rich, 1, F([[D0[0] - 0.95, 0, D0[1] - 0.3], [D0[0] + 0.5, 2.0, D0[1] + 0.3]], -14, 6, SIT), push=0.06),
 ],
 'actors': cs_.build(), 'stage': STAGE,
 'sfx': [{'t': r3(t_tear), 'id': 'muellsack-reissen', 'volume': 0.9}, {'t': r3(t_sl0), 'id': 'glitsch', 'volume': 0.7},
         {'t': r3(t_tear1 + ss(0.3)), 'id': 'schleim-tropfen', 'volume': 0.6}, {'t': r3(c_rich + ss(0.15)), 'id': 'schleim-tropfen', 'volume': 0.5}],
}

# =====================================================================================================
# Antwort A: Karte = zur Straße drehen, Sack hochhalten, Blick zum Nachbarhaus.
#            Szene = hochwerfen + Drehung + Roundhouse-Kick → Bogen über die Straße → Klatsch an die Fassade, Saftnasen laufen herunter
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA); sa = lambda s: s / TA
c_vol = cue(A, 'explain1', 'Voller'); c_der = cue(A, 'explain1', 'Der Müllsack'); c_und = cue(A, 'explain1', 'und der Saft'); c_kom = cue(A, 'explain1', 'komplett')
FA = 90                                         # Blick nach +x → rechte Seite (Kick) zeigt nach +z = zum Nachbarhaus
DA = (D0[0], D0[1] + 0.2)
cA = Cast()
t_turn = r3(sa(0.35)); t_aim = r3(sa(1.2))
cA.add('dummy', 0, sA, [K(0, *DA, 'bagstand', 160, slime=1.0), K(t_turn, *DA, 'bagstand', 160), K(r3(t_aim - 0.002), *DA, 'bagstand', FA), K(t_aim, *DA, 'bagaim', FA), K(sA, *DA, 'bagaim', FA)])
cA.add('muellsack', 0, sA, [held(0, fill=1.0, mark=1.0), held(sA, fill=1.0, mark=1.0)])
# Szene: Kick
t_k0 = r3(max(sA + sa(0.05), c_der - sa(BAGKICK_HIT + 0.08)))
t_rel = r3(t_k0 + sa(BAGKICK_REL)); t_hit = r3(t_k0 + sa(BAGKICK_HIT))
REL = W(DA, FA, [-0.18, 1.62 - DROP, 0.42])     # Sack-Ursprung beim Abwurf (Hand oben − drop)
HIT = W(DA, FA, [BAGKICK_FOOT[0] - 0.05, BAGKICK_FOOT[1] - 0.3, BAGKICK_FOOT[2]])
TGT = [DA[0] + 1.25, 2.95, FACADE_Z - 0.16]       # Sack-Ursprung beim Aufprall (Mitte ca. 3,45 m hoch, zwischen den Fenstern)
SPLAT = [TGT[0], 3.25, FACADE_Z - 0.03]
T_FLY = 1.2
t_imp = r3(t_hit + sa(T_FLY))
arc1, vy1 = ballistic(REL, HIT, (t_hit - t_rel) * TA, 10)
arc2, vy2 = ballistic(HIT, TGT, T_FLY, 18)
bag_sc = [held(t_k0, fill=1.0, mark=1.0, cut=True), held(r3(t_rel - 0.002), fill=1.0, mark=1.0)]
for u, p in arc1:
    bag_sc.append(bagK(r3(t_rel + (t_hit - t_rel) * u), p[0], p[2], y=round(p[1], 3), fill=1.0, mark=1.0, tilt=round(-60 * u, 1)))
for u, p in arc2[1:]:
    bag_sc.append(bagK(r3(t_hit + sa(T_FLY * u)), p[0], p[2], y=round(p[1], 3), fill=1.0, mark=0.6, tilt=round(-60 - 420 * u, 1), turn=round(90 * u, 1)))
# Aufprall: platt an der Wand, rutscht langsam an der Fassade herunter, fällt unten um
t_sl_end = r3(min(1 - sa(0.15), t_imp + sa(2.6)))
bag_sc += [bagK(r3(t_imp + sa(0.06)), TGT[0], TGT[2] + 0.03, y=TGT[1], fill=1.0, mark=0.0, squish=1.0, tilt=0.0),
           bagK(r3(t_imp + sa(0.5)), TGT[0], TGT[2] + 0.02, y=TGT[1] - 0.15, fill=1.0, squish=1.0),
           bagK(t_sl_end, TGT[0], TGT[2] - 0.05, y=0.0, fill=1.0, squish=0.8),
           bagK(1, TGT[0], TGT[2] - 0.25, y=0.0, fill=1.0, squish=0.6, tilt=-25.0)]
cA.add('muellsack', sA, 1, bag_sc)
t_proud = r3(t_hit + sa(1.25))
cA.add('dummy', sA, 1, [K(sA, *DA, 'bagaim', FA, slime=1.0, cut=True), K(r3(t_k0 - 0.002), *DA, 'bagaim', FA), K(t_k0, *DA, 'bagkick', FA),
                         K(r3(t_proud - 0.002), *DA, 'bagkick', FA), K(t_proud, *DA, 'proud', 160), K(1, *DA, 'proud', 160)])
cA.add('fassadenklecks', t_imp, 1, [K(t_imp, SPLAT[0], SPLAT[2], 'park', 0, y=SPLAT[1], fill=0.0, drop=SPLAT[1], size=0.15), K(r3(t_imp + sa(0.25)), SPLAT[0], SPLAT[2], 'park', 0, y=SPLAT[1], fill=0.12, drop=SPLAT[1]),
                                    K(r3(min(1, t_imp + sa(3.6))), SPLAT[0], SPLAT[2], 'park', 0, y=SPLAT[1], fill=1.0, drop=SPLAT[1])])
def check_a():
    """Kick zeigt zum Nachbarhaus (+z), Sack trifft die Fassade zwischen den Fenstern (nicht Tür/Fenster), trifft vor Satz 3."""
    hit_dir = (HIT[0] - DA[0], HIT[2] - DA[1])
    assert hit_dir[1] > 0.8 and abs(hit_dir[0]) < 0.2, ('A: Kick zeigt nicht zum Nachbarhaus', hit_dir)
    assert abs(SPLAT[0] - NB_DOOR_X) > 1.3 and 2.2 < SPLAT[1] < 3.7, ('A: Klecks an Tür/Fenster', SPLAT)
    # Fenster oben (Nachbarhaus 180° gedreht): x ±2.4/0/−2.85, y 3.8 … 5.1 → Klecks-Mitte darunter
    assert t_imp < c_und + sa(0.1), ('A: Aufprall zu spät', t_imp, c_und)
    assert t_hit < c_der, ('A: Kick nach „Der Müllsack“', t_hit, c_der)
    return round((c_und - t_imp) * TA, 2), round(vy2, 2)
APEX = max(p[1] for _, p in arc2)
camA = [
  # Karte: Dummy mit dem Sack auf dem Gehweg, dreht sich, Blick rüber
  *shot(0, sA - 0.003, ([3.4, 1.85, -0.9], [0.0, 1.05, -4.2], None, None), push=0.04),
  # Kick: seitlich auf Augenhöhe (Kick nach rechts im Bild Richtung Nachbarhaus)
  *shot(sA, c_der - 0.003, F([*body(*DA, 2.0, 0.5), [DA[0], 0.6, DA[1] + 1.25], [DA[0], 2.9, DA[1] + 0.4]], 95, 6, ANS), push=0.05),
  # Flug über die Straße: weit von der Seite, ganzer Bogen + Fassade
  *shot(c_der, c_und - 0.003, F([*body(*DA), [DA[0], APEX, (DA[1] + FACADE_Z) / 2], [TGT[0] - 1.2, 0, FACADE_Z], [TGT[0] + 1.2, 4.6, FACADE_Z]], 82, 10, ANS, fov=44), push=0.03),
  # Saft läuft über die Fassade (nah an der Fassade, Klecks + Nasen)
  *shot(c_und, c_kom - 0.003, ([SPLAT[0] - 0.3, 2.0, 0.2], [SPLAT[0], 2.35, FACADE_Z], 56, None), push=0.08),
  # einmal komplett: über die Schulter des stolzen Dummys auf die ganze Fassade
  *shot(c_kom, 1, ([-1.5, 3.1, -8.2], [1.0, 2.0, FACADE_Z], 50, None), push=0.04),
]
expA = {
 'camera': camA, 'actors': cA.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sa(0.4)), 'id': 'schleim-tropfen', 'volume': 0.4}, {'t': r3(t_k0 + sa(0.5)), 'id': 'kick-whoosh', 'volume': 0.8}, {'t': r3(t_hit), 'id': 'reste-platsch', 'volume': 0.6},
         {'t': r3(t_hit + sa(0.05)), 'id': 'whoosh', 'volume': 0.6}, {'t': r3(t_imp), 'id': 'sack-klatsch', 'volume': 1.0},
         {'t': r3(t_imp + sa(0.6)), 'id': 'schleim-tropfen', 'volume': 0.7}, {'t': r3(c_kom), 'id': 'glitsch', 'volume': 0.5}],
}

# =====================================================================================================
# Antwort B: Karte = Sack steht neben ihm, er prüft die Schleim-Hand wie ein Kenner. Szene = abfüllen → auf ex → Muskeln → Bizeps-Pose
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB); sb = lambda s: s / TB
c_kurz = cue(B, 'explain2', 'Kurz'); c_ex = cue(B, 'explain2', 'auf ex'); c_volB = cue(B, 'explain2', 'Voll mit'); c_wer = cue(B, 'explain2', 'Wer braucht')
DB = D0; FB = 180
BAG_B = W(DB, FB, [-0.55, 0, 0.12])
cB = Cast()
cB.add('muellsack', 0, 1, [bagK(0, BAG_B[0], BAG_B[2], fill=1.0, mark=0.5, turn=30.0)])
t_ins = r3(sb(0.3))
cB.add('dummy', 0, sB, [K(0, *DB, 'stand', FB, slime=1.0, muscle=0.0), K(r3(t_ins - 0.002), *DB, 'stand', FB), K(t_ins, *DB, 'handinspect', FB), K(sB, *DB, 'handinspect', FB)])
t_f0 = r3(sB + sb(0.05))
t_dr = r3(max(c_ex - sb(0.1), t_f0 + sb(SHOTFILL_T[1] + 0.1)))
t_mu0 = r3(max(c_volB - sb(0.05), t_dr + sb(1.3))); t_mu1 = r3(t_mu0 + sb(0.7))
cB.add('dummy', sB, 1, [K(sB, *DB, 'stand', FB, slime=1.0, muscle=0.0, cut=True), K(r3(t_f0 - 0.002), *DB, 'stand', FB), K(t_f0, *DB, 'shotfill', FB),
                         K(r3(t_dr - 0.002), *DB, 'shotfill', FB, slime=1.0), K(t_dr, *DB, 'shotdrink', FB, slime=0.6),
                         K(r3(t_mu0 - 0.002), *DB, 'shotdrink', FB, muscle=0.0, slime=0.3), K(t_mu0, *DB, 'flexpose', FB, muscle=0.0),
                         K(t_mu1, *DB, 'flexpose', FB, muscle=1.0, slime=0.3), K(1, *DB, 'flexpose', FB, muscle=1.0)])
cB.add('glanz', t_mu0, r3(min(1, t_mu0 + sb(2.2))), [K(t_mu0, DB[0], DB[1] + 0.15, 'park', 0, y=0.7, fill=0.0, size=-0.6), K(r3(t_mu0 + sb(0.3)), DB[0], DB[1] + 0.15, 'park', 0, y=0.7, fill=1.0, size=-0.6),
                                                     K(r3(min(1, t_mu0 + sb(2.2))), DB[0], DB[1] + 0.15, 'park', 0, y=0.7, fill=0.0, size=-0.6)])
camB = [
  # Karte: prüft die Schleim-Hand (Halbnah frontal, Sack daneben)
  *shot(0, sB - 0.003, F([[DB[0] - 0.9, 0, DB[1] - 0.3], [DB[0] + 0.5, 2.0, DB[1] + 0.4]], -12, 4, ANS), push=0.04),
  # abfüllen: nah auf Becher + tropfende Hand
  *shot(sB, c_ex - 0.003, F([[DB[0] - 0.25, 0.85, DB[1] + 0.15], [DB[0] + 0.25, 1.85, DB[1] + 0.55]], 18, 10, ANS), push=0.07),
  # auf ex: halbnah, leicht von unten
  *shot(c_ex, c_volB - 0.003, F([[DB[0] - 0.45, 0.9, DB[1] - 0.3], [DB[0] + 0.45, 2.05, DB[1] + 0.4]], -25, 2, ANS), push=0.05),
  # Muskeln wachsen: Held von unten
  *shot(c_volB, c_wer - 0.003, F([[DB[0] - 0.75, 0.55, DB[1] - 0.3], [DB[0] + 0.75, 2.05, DB[1] + 0.3]], 8, 3, ANS), push=0.05),
  # Wer braucht schon ein Fitnessstudio: andere Seite, Haus dahinter
  *shot(c_wer, 1, F([[DB[0] - 0.8, 0.0, DB[1] - 0.3], [DB[0] + 0.8, 2.05, DB[1] + 0.3]], 32, 8, ANS), push=0.05),
]
expB = {
 'camera': camB, 'actors': cB.build(), 'stage': STAGE,
 'sfx': [{'t': r3(sb(0.3) + sb(0.9)), 'id': 'schnuppern', 'volume': 0.6}, {'t': r3(t_f0 + sb(0.1)), 'id': 'plopp', 'volume': 0.5},
         {'t': r3(t_f0 + sb(0.4)), 'id': 'schleim-tropfen', 'volume': 0.7}, {'t': r3(t_dr + sb(0.4)), 'id': 'schluck', 'volume': 0.9},
         {'t': r3(t_mu0), 'id': 'muskel-pump', 'volume': 0.9}, {'t': r3(t_mu0 + sb(0.1)), 'id': 'rasen-zauber', 'volume': 0.4},
         {'t': r3(c_wer + sb(0.2)), 'id': 'gold-fanfare', 'volume': 0.35}],
}

# =====================================================================================================
# Antwort C: Karte = an der offenen Haustür, Sack zurück ins Haus werfen. Szene = Schwurhand → innen: Wand bricht auf, Müllwagen fährt ins
#            Wohnzimmer, Greifarm lädt den Sack ein, Möbel verrutschen, rückwärts wieder hinaus
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC); sc = lambda s: s / TC
c_nie = cue(C, 'explain3', 'Nie'); c_daf = cue(C, 'explain3', 'Dafür'); c_dir = cue(C, 'explain3', 'direkt'); c_gef = cue(C, 'explain3', 'gefahren')
DC = (0.0, -8.05); FC = 0
cC = Cast()
cC.add('haus', 0, 1, haus_keys(1.0))
t_ts = r3(sc(0.9)); t_tr = r3(t_ts + sc(BAGTOSS_REL))
REL_C = W(DC, FC, [BAGTOSS_HAND[0], BAGTOSS_HAND[1] - DROP, BAGTOSS_HAND[2]])
IN_C = [DOOR[0] + 0.05, 0.75, DOOR[1] - 0.6]
arcC, _ = ballistic(REL_C, IN_C, 0.55, 10)
t_in = r3(t_tr + sc(0.55))
bagC = [held(0, fill=1.0, mark=1.0), held(r3(t_tr - 0.002), fill=1.0, mark=1.0)]
for u, p in arcC:
    if p[2] < DOOR[1] - 0.05:  # hinter der Türöffnung: verschwindet im Flur
        bagC.append(bagK(r3(t_tr + sc(0.55 * u)), p[0], p[2], y=HIDE, fill=1.0)); break
    bagC.append(bagK(r3(t_tr + sc(0.55 * u)), p[0], p[2], y=round(p[1], 3), fill=1.0, mark=0.6, tilt=round(-200 * u, 1)))
cC.add('muellsack', 0, sC, bagC)
cC.add('dummy', 0, sC, [K(0, *DC, 'bagstand', FC, slime=1.0), K(r3(t_ts - 0.002), *DC, 'bagstand', FC), K(t_ts, *DC, 'bagtoss', FC), K(r3(t_tr + sc(0.9)), *DC, 'bagtoss', FC),
                        K(r3(t_tr + sc(0.95)), *DC, 'armscross', FC), K(sC, *DC, 'armscross', FC)])
# Szene 1: Schwur auf dem Weg vor dem Haus (Blick zur Kamera)
DS = (0.0, -7.2)
cC.add('dummy', sC, c_daf, [K(sC, *DS, 'swear', 180, slime=1.0, cut=True), K(r3(c_daf - 0.002), *DS, 'swear', 180)])
# Szene 2: innen – Wand bricht, Müllwagen
WZ_WALL = (1.65, -4.5); BAG_IN = (-0.95, 0.8); STOP = (1.65, 0.5); GRAB = (-2.55, 0.3)
t_in0 = c_daf
TRUCK_FRONT = 3.1
z_start = -11.0; z_wall = WZ_WALL[1] - TRUCK_FRONT - 0.1
t_go = r3(t_in0 + sc(0.05)); v0 = 6.5
t_wall = r3(t_go + sc((z_wall - z_start) / v0))
t_stop = r3(t_wall + sc(1.25))
t_arm0 = r3(t_stop + sc(0.15)); ARM = 1.55; t_arm1 = r3(t_arm0 + sc(ARM))
t_grip = r3(t_arm0 + sc(ARM * 0.34)); t_back = r3(t_arm1 + sc(0.05))
cC.add('haustuerwand', t_in0, 1, [K(t_in0, *WZ_WALL, 'park', 180, fill=0.0), K(r3(t_wall - 0.002), *WZ_WALL, 'park', 180, fill=0.0), K(t_wall, *WZ_WALL, 'park', 180, fill=0.02),
                                  K(r3(t_wall + sc(2.2)), *WZ_WALL, 'park', 180, fill=1.0)])
truck = [K(t_in0, STOP[0], z_start, 'park', 180, fill=0.0, blink=1.0, rumble=0.6), K(t_go, STOP[0], z_start, 'park', 180, rumble=0.8)]
N = 10
for i in range(1, N + 1):
    u = i / N
    truck.append(K(r3(t_go + (t_wall - t_go) * u), STOP[0], z_start + (z_wall - z_start) * u, 'park', 180, rumble=1.0))
for i in range(1, N + 1):
    u = i / N
    zz = z_wall + (STOP[1] - z_wall) * (1 - (1 - u) ** 2)
    truck.append(K(r3(t_wall + (t_stop - t_wall) * u), STOP[0], zz, 'park', 180, rumble=1.0 - 0.6 * u))
truck += [K(t_arm0, *STOP, 'park', 180, fill=0.0, rumble=0.3), K(t_arm1, *STOP, 'park', 180, fill=1.0, rumble=0.3)]
for i in range(1, N + 1):
    u = i / N
    tt = t_back + (1 - t_back) * u
    zz = STOP[1] + (-3.6 - STOP[1]) * (u ** 1.6)
    truck.append(K(r3(tt), STOP[0], zz, 'park', 180, fill=1.0, rumble=1.0))
cC.add('muellwagen', t_in0, 1, truck)
cC.add('muellsack', t_in0, t_grip, [bagK(t_in0, *BAG_IN, fill=1.0, mark=0.4, turn=50.0, tilt=-80.0, y=0.25), bagK(t_grip, *BAG_IN, fill=1.0, mark=0.4, turn=50.0, tilt=-80.0, y=0.25)])
cC.add('wohnmoebel', t_in0, 1, [K(t_in0, 0, 0, 'park', 180, fill=0.0, rumble=0.0), K(r3(t_wall + sc(0.1)), 0, 0, 'park', 180, fill=0.0, rumble=1.0),
                               K(r3(t_wall + sc(0.9)), 0, 0, 'park', 180, fill=0.75, rumble=1.0), K(t_stop, 0, 0, 'park', 180, fill=0.85, rumble=0.2),
                               K(r3(t_back + sc(0.2)), 0, 0, 'park', 180, fill=0.9, rumble=1.0), K(1, 0, 0, 'park', 180, fill=1.0, rumble=0.6)])
def check_c():
    """niemand im Wohnzimmer (Dummy nur draußen), Greifer genau am Sack, Wand bricht erst nach dem Bühnenwechsel, Sack weg bevor der Wagen fährt."""
    claw = (STOP[0] + GRAB[0] * -1 * -1, 0)  # Greifer lokal x −2.55 → Wagen face 180 (Blick +z): lokal −x = Welt −x
    gx = STOP[0] + GRAB[0]; gz = STOP[1] + GRAB[1]
    assert math.hypot(gx - BAG_IN[0], gz - BAG_IN[1]) < 0.15, ('C: Greifer verfehlt den Sack', gx, gz, BAG_IN)
    assert t_wall > t_in0 + sc(0.15), ('C: Wand bricht vor dem Schnitt', t_wall, t_in0)
    assert t_arm1 < 1 - sc(0.5), ('C: Arm zu spät', t_arm1)
    return round((1 - t_arm1) * TC, 2), round((t_wall - t_in0) * TC, 2)
INT = [[-5.0, 0, -4.5], [5.2, 3.6, 2.0]]
camC = [
  # Karte: hinter dem Dummy schräg, offene Haustür, Wurf hinein
  *shot(0, sC - 0.003, F([*body(*DC), *house_door_pts(), [-1.5, 3.0, DOOR[1]], [1.5, 0, DOOR[1]]], 28, 12, ANS), push=0.03),
  # Schwurhand (frontal, Haus mit offener Tür dahinter)
  *shot(sC, c_daf - 0.003, F([[DS[0] - 0.6, 0, DS[1] - 0.3], [DS[0] + 0.6, 2.1, DS[1] + 0.3], [-0.8, 2.6, DOOR[1]]], -8, 6, ANS), push=0.06),
  # innen: ganze Rückwand mit Haustür, Wagen bricht durch
  *shot(c_daf, c_dir - 0.003, F([[-3.0, 0, -4.5], [4.6, 3.5, -4.5], [BAG_IN[0], 0, BAG_IN[1]]], 8, 8, ANS, fov=50), push=0.04),
  # direkt ins Wohnzimmer: Greifarm packt den Sack (von vorn-links)
  *shot(c_dir, c_gef - 0.003, ([-4.3, 2.4, 4.4], [-0.3, 1.45, -0.2], 56, None), push=0.04),
  # gefahren: Totale, Wagen rattert rückwärts hinaus, Möbel schief
  *shot(c_gef, 1, ([0.9, 2.3, 9.8], [0.9, 1.55, -1.5], 56, None), push=0.03),
]
expC = {
 'camera': camC, 'actors': cC.build(), 'stage': [{'t': 0, 'stage': STAGE}, {'t': round(inv_te(te(c_daf)), 4), 'stage': STAGE_IN}],
 'sfx': [{'t': r3(t_ts + sc(0.2)), 'id': 'whoosh', 'volume': 0.5}, {'t': r3(t_in), 'id': 'kissen-plumps', 'volume': 0.6},
         {'t': r3(sC + sc(0.3)), 'id': 'himmel-chor', 'volume': 0.25}, {'t': r3(c_daf - sc(0.5)), 'id': 'auto-hupen', 'volume': 0.45},
         {'t': r3(t_go), 'id': 'muellwagen-motor', 'volume': 0.8}, {'t': r3(t_wall), 'id': 'wand-krachen', 'volume': 0.9},
         {'t': r3(t_wall + sc(0.4)), 'id': 'moebel-rutschen', 'volume': 0.7}, {'t': r3(t_arm0), 'id': 'hydraulik', 'volume': 0.7},
         {'t': r3(t_arm0 + sc(ARM * 0.84)), 'id': 'kissen-plumps', 'volume': 0.5}, {'t': r3(t_back), 'id': 'muellwagen-motor', 'volume': 0.7}],
}
expC['sfx'] = [s for s in expC['sfx'] if s['t'] < 1]
def check_cams(name, camkeys, inside_from=None):
    """Straße: Kamera nicht in der Hecke/im Nachbarhaus (z < 5,3), nicht im Haus des Dummys, nicht unter dem Boden"""
    for k in camkeys:
        x, y, z = k['pos']
        if inside_from is not None and k['t'] >= inside_from - 1e-4:
            assert y < WZG_H - 0.2 and y > 0.3, (name, 'Kamera innen', k)
            continue
        assert y > 0.3, (name, 'Kamera unter dem Boden', k)
        assert z < 5.3 or abs(x) > 19, (name, 'Kamera hinter der Hecke / im Nachbarhaus', k)
        assert not (abs(x) < 3.6 and -16.1 < z < -8.9), (name, 'Kamera im Haus', k)
        assert not (any(abs(x - hx) < 0.75 for hx in (-18, -6, 6, 18)) and -23.6 < z < -6.0), (name, 'Kamera in der Hecke', k)
WZG_H = 3.8
check_cams('Situation', situation['camera']); check_cams('A', camA); check_cams('B', camB); check_cams('C', camC, te(c_daf))

# =====================================================================================================
# Abstimmung + Outro: Dummy steht auf dem Gehweg vor seinem Haus, Sack tropft neben ihm, Schleim an der Hand
# =====================================================================================================
DV = (0.0, -4.6)
def endcast(wave=False):
    c = Cast()
    c.add('haus', 0, 1, haus_keys(0.0))
    BV = W(DV, 180, [-0.55, 0, 0.1])
    c.add('muellsack', 0, 1, [bagK(0, BV[0], BV[2], fill=1.0, mark=0.6, turn=25.0)])
    c.add('dummy', 0, 1, [K(0, *DV, 'stand', 180, slime=1.0, question=0.0 if wave else 1.0)] + ([K(0.12, *DV, 'wave', 180), K(1, *DV, 'wave', 180)] if wave else []))
    return c.build()
V_PTS = [*body(*DV), [DV[0] - 0.8, 0, DV[1]], [-1.5, 3.5, DOOR[1]], [1.5, 0, DOOR[1]]]
vote = {'camera': shot(0, 1, F(V_PTS, 12, 2, (120, 960, 1060, 1320)), push=0.04), 'actors': endcast(), 'stage': STAGE}
outro = {'camera': shot(0, 1, F(V_PTS, 14, 6, (100, 980, 780, 1110)), push=0.05), 'actors': endcast(True), 'stage': STAGE}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Dir ist mal wieder Flüssigkeit über die Hand gelaufen, während du den Müll rausgebracht hast – was machst du? 🗑️🤢 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. Niemand wurde verletzt. 😄\n\n"
        "#waswürdestdutun #müll #nachbarn #protein #comedy #quiz #dummy #spezial\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': STAGE, 'padAfter': TAIL, 'sceneLead': SCENE_LEAD,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Der Dummy dreht sich auf dem Gehweg zur Straße, hält den tropfenden Müllsack hoch und peilt das Nachbarhaus an. Dann wirft er ihn hoch, dreht sich und verpasst ihm einen überzogenen Roundhouse-Kick – der Sack fliegt im hohen Bogen über die Straße, klatscht an die helle Fassade, ein großer grüner Klecks, der Saft läuft bis zum Boden. Rein comichaft, niemand ist in der Nähe, niemand wird verletzt.', 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy prüft die schleimige Hand wie ein Kenner, lässt die Flüssigkeit in einen kleinen Becher tropfen, trinkt ihn wie einen Sport-Shot auf ex – sofort wachsen ihm Cartoon-Muskeln und er posiert mit Doppelbizeps. Rein comichaft.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Der Dummy wirft den Müllsack durch die offene Haustür zurück ins Haus und hebt die Schwurhand: nie wieder Müll rausbringen. Prompt bricht ein Müllwagen durch die Haustür ins leere Wohnzimmer, der Greifarm lädt den Sack ein, ein paar Möbel verrutschen, und der Wagen rattert rückwärts wieder hinaus. Das Haus ist innen leer, niemand wird verletzt.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
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
print('A (s von Aufprall bis „und der Saft“, vy):', check_a(), '| C (Rest nach Arm, s bis Wand):', check_c())
if total < 61: print('ACHTUNG: unter 61 s')
if total > 66: print('ACHTUNG: über 66 s')
_st = {'A': seclen('situation'), 'B': seclen('situation') + TA, 'C': seclen('situation') + TA + TB}
f = lambda sec, t: round((_st[sec] + t * {'A': TA, 'B': TB, 'C': TC}[sec]) * 30)
print('Schlüsselbilder: Sit-Tür', round(ss(0.6) * TS * 30), '| Sit-Riss', round((t_tear1 + ss(0.3)) * TS * 30), '| Sit-eklig', round((c_was + ss(0.6)) * TS * 30),
      '| A-Karte', f('A', sA * 0.8), '| A-Kick', f('A', t_hit), '| A-Flug', f('A', (t_hit + t_imp) / 2), '| A-Klecks', f('A', (c_und + c_kom) / 2), '| A-Ende', f('A', 0.97),
      '| B-Karte', f('B', sB * 0.6), '| B-Abfüllen', f('B', t_f0 + sb(1.3)), '| B-ex', f('B', t_dr + sb(0.6)), '| B-Muskeln', f('B', t_mu1 + sb(0.2)), '| B-Pose', f('B', 0.95),
      '| C-Wurf', f('C', t_tr + sc(0.15)), '| C-Schwur', f('C', (sC + c_daf) / 2), '| C-Crash', f('C', t_wall + sc(0.5)), '| C-Greifer', f('C', t_arm0 + sc(ARM * 0.5)), '| C-raus', f('C', 0.97))
