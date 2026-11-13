# Hilfsskript: erzeugt scenarios/geldkoffer-million.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/geldkoffer-choreo.py
#
# Darstellung (vom Inhaber): Geld nur stilisiert (helle Bündel mit grauer Banderole + "€", keine echten Scheine),
# kein Gefängnis-Drama – bei Option 1 nur ein "§ 246"-Schild über dem Dummy.
# Bühnen: "park" (Spazierweg mit Bank + Laternen, Abenddämmerung) und "polizeiwache" (Tresen).
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'geldkoffer-million'
S = dict(
situation="Du hast mal wieder einen Koffer mit einer Million Euro gefunden. Er stand einfach neben einer Parkbank. Was machst du jetzt?",
o1c="Behalten, ist doch Glück", o1s="Eins: Behalten. Wer findet, darf auch behalten.",
o2c="Zur Polizei, Kontaktdaten angeben", o2s="Zwei: Zur Polizei bringen und deine Kontaktdaten angeben.",
o3c="Finderlohn selbst rausnehmen", o3s="Drei: Dir den Finderlohn schon mal selbst rausnehmen und den Rest abgeben.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer zwei.",
e1="Klingt verlockend, ist aber strafbar. Wer fremdes Geld behält, begeht eine Unterschlagung. Darauf stehen Geldstrafe oder bis zu drei Jahre Gefängnis. Alles über zehn Euro musst du abgeben.",
e3="Auch das geht nicht. Den Finderlohn darfst du dir nicht selbst auszahlen. Du musst alles abgeben. Und das lohnt sich trotzdem: fünf Prozent auf die ersten 500 Euro, drei Prozent auf den Rest. Bei einer Million sind das über 30.000 Euro.",
e2="Bring den Koffer zur Polizei und gib deine Kontaktdaten an, denn wer anonym abgibt, bekommt keinen Finderlohn. Bei so viel Bargeld ist die Polizei die richtige Adresse, weil es auch aus einer Straftat stammen könnte. Und anders als bei Waffen ist Geld nicht gefährlich, das darfst du selbst hinbringen. Meldet sich der Besitzer nicht, kann ein Fund nach sechs Monaten sogar dir gehören.",
outro="Ehrlich währt am längsten. Und bringt über 30.000 Euro. Wusstest du es? Schreib's in die Kommentare.",
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
def K(t, x=None, z=None, motion='park', face=None, **kw):
    d = {'t': r3(t)}
    if x is not None: d['x'] = round(x, 3)
    if z is not None: d['z'] = round(z, 3)
    d['motion'] = motion
    if face is not None: d['face'] = face
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    """Kamera-Zeitachse (sampleCamera glättet die Zeit) → Schnitte exakt treffen"""
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def te_inv(v):
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        if te(m) < v: lo = m
        else: hi = m
    return (lo + hi) / 2
def cam(t, pos, look, fov=None):
    """t = echte Abschnittszeit (0..1); wird auf die geglättete Kamera-Zeitachse umgerechnet"""
    d = {'t': round(te(t), 4), 'pos': [round(v, 3) for v in pos], 'look': [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
def sec(c, s): return s / seclen(c)
HIDE = -30
def rot(face, lx, lz):
    """Figuren-System → Welt (Drehung um y um 180 − face)"""
    th = math.radians(180 - face)
    return (lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th))
def face_to(a, b): return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)
def seglen(a, b): return math.hypot(b[0] - a[0], b[1] - a[1])
def add(p, o): return (p[0] + o[0], p[1] + o[1])
def lerp2(a, b, k): return (a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k)

# ---- feste Plätze: Park (src/stage/Park.tsx) ----
CASE_P = (1.3, -1.55)            # Koffer steht neben der Bank (PARK.beside)
KS = (CASE_P[0] + 0.55, CASE_P[1])   # hier kniet der Dummy (Koffer 0,55 m vor ihm, Blick nach −x)
DF = 270
DFS = 0                           # Blick zum Tresen (Polizeiwache)
JK = dict(jacket=1)
DROP = 0.4                        # Koffer am Griff in der Hand
def case_up(t=0, **kw): return K(t, CASE_P[0], CASE_P[1], 'park', 90, tilt=0, lid=0, **kw)
def case_lie(t=0, lid=1, **kw): return K(t, CASE_P[0], CASE_P[1], 'park', 90, tilt=90, lid=lid, **kw)
# Koffer im System des Dummys (attach): liegend vor ihm / vor der Brust / unter dem linken Arm
def case_att(t, x, y, z, face, tilt, lid=0): return K(t, x, z, 'park', face, y=y, tilt=tilt, lid=lid, attach='dummy')
# ---- Polizeiwache (src/stage/PoliceStation.tsx): Tresen-Platte 1,05 m, Vorderkante z −0.45 ----
CT = 1.05
OFF = (0.1, -1.68)                # Polizist hinter dem Tresen
DA = (0.75, -0.15)                # Dummy beim Abstellen des Koffers
DB = (-0.3, -0.15)                # Dummy am Formular
DOOR = (2.75, 0.75)
CASE_C = (DA[0] + 0.1, DA[1] - 0.48)     # Koffer auf dem Tresen (aus setcounter: Hand 0,48 m vor, 0,1 m rechts)
FORM_C = (DB[0] + 0.02, DB[1] - 0.5)     # Formular (FORM_SPOT im Dummy.tsx)

# ================= Situation =================
L0 = 'situation'
c_er = cue(L0, 'Er stand')
c_was = cue(L0, 'Was machst')
W0 = (6.2, 0.1)
W1 = (2.75, 0.1)
WT = (KS[0] + 0.1, KS[1] + 0.3)
arrive = r3(sec(L0, 0.2 + seglen(W0, W1) / 1.3))
sp1 = r3(arrive + sec(L0, 0.7))
wt = r3(sp1 + sec(L0, seglen(W1, WT) / 1.0))
ks = r3(wt + sec(L0, 0.35))
oc0 = r3(ks + 0.002)
look0 = r3(max(oc0 + sec(L0, 2.6), c_was - sec(L0, 0.1)))
dummy0 = [K(0, *W0, 'walk', 270, **JK), K(arrive, *W1, 'walk', 270), K(r3(arrive + 0.002), *W1, 'spotpoint', face_to(W1, CASE_P)),
          K(sp1, *W1, 'spotpoint', face_to(W1, CASE_P)), K(r3(sp1 + 0.002), *W1, 'walk', face_to(W1, WT)), K(wt, *WT, 'walk', face_to(W1, WT)), K(ks, *KS, 'walk', DF),
          K(oc0, *KS, 'opencase', DF), K(r3(look0 - 0.002), *KS, 'opencase', DF), K(look0, *KS, 'kneellook', DF), K(1, *KS, 'kneellook', DF)]
tip0 = r3(oc0 + sec(L0, 0.6)); tip1 = r3(oc0 + sec(L0, 1.0))
op0 = tip1; op1 = r3(oc0 + sec(L0, 1.55)); op2 = r3(oc0 + sec(L0, 1.9))
case0 = [case_up(0), case_up(tip0), case_lie(tip1, lid=0), case_lie(op1, lid=0.62), case_lie(op2, lid=1), case_lie(1, lid=1)]
cutB = r3(max(op0 - sec(L0, 0.05), c_er - sec(L0, 1.4)))
situation = {
 'camera': [cam(0, [5.6, 3.0, 13.5], [2.9, 1.15, -0.86]), cam(r3(cutB - 0.004), [4.6, 2.6, 10.5], [2.2, 0.95, -1.0]),
            cam(cutB, [3.51, 3.79, 2.76], [1.27, 0.34, -1.35], 34), cam(r3(c_was - 0.004), [3.3, 3.6, 2.45], [1.27, 0.34, -1.35], 34),
            cam(c_was, [4.56, 1.82, 2.25], [1.37, 0.45, -1.55]), cam(1, [4.3, 1.8, 2.0], [1.37, 0.45, -1.55])],
 'actors': {'dummy': dummy0, 'geldkoffer': case0},
 'sfx': [{'t': r3(sp1 - sec(L0, 0.5)), 'id': 'herzschlag', 'volume': 0.35}, {'t': r3(op0 - sec(L0, 0.1)), 'id': 'schnallen-klick', 'volume': 0.55},
         {'t': r3(op2), 'id': 'aufzug-ding', 'volume': 0.3}],
}

# ================= Optionen / Countdown / Auflösung =================
OL = [1.58, -0.58, -1.07]
def still(p0, p1):
    return {'camera': [cam(0, p0, OL), cam(1, p1, OL)],
            'actors': {'dummy': [K(0, *KS, 'kneellook', DF, **JK)], 'geldkoffer': [case_lie(0, lid=1)]}}
options = still([7.9, 7.3, 7.9], [7.73, 7.14, 7.72])
countdown = still([7.73, 7.14, 7.72], [7.6, 7.02, 7.58])
reveal = still([7.6, 7.02, 7.58], [7.5, 6.95, 7.5])

# ================= Option 1: behalten (falsch) =================
L1 = 'explain1'
c_unt = cue(L1, 'Unterschlagung')
cc0 = sec(L1, 0.15)
cc1 = r3(cc0 + sec(L1, 0.75))
tk0 = r3(cc1 + 0.002)
g1 = r3(tk0 + sec(L1, 0.35)); u1 = r3(tk0 + sec(L1, 0.9)); k1 = r3(tk0 + sec(L1, 1.3))
sn0 = r3(tk0 + sec(L1, 1.35))
P1 = (KS[0] - 0.85, 0.25)
SN_SPEED = 0.85
sn1 = r3(sn0 + sec(L1, seglen(KS, P1) / SN_SPEED))
P2 = (-12.0, 0.3)
sn2 = r3(sn1 + sec(L1, seglen(P1, P2) / SN_SPEED))
par0 = r3(max(sn1 + sec(L1, 1.2), c_unt - sec(L1, 0.4)))
fz1 = r3(par0 + sec(L1, 0.8))
def pos_at(t, a, b, ta, tb): return lerp2(a, b, (t - ta) / (tb - ta))
dummy1 = [K(0, *KS, 'kneellook', DF, **JK), K(r3(cc0 - 0.002), *KS, 'kneellook', DF), K(cc0, *KS, 'closecase', DF), K(r3(tk0 - 0.002), *KS, 'closecase', DF),
          K(tk0, *KS, 'tuckcase', DF), K(r3(sn0 - 0.002), *KS, 'tuckcase', DF), K(sn0, *KS, 'sneak', face_to(KS, P1)), K(sn1, *P1, 'sneak', 270),
          K(sn2, *P2, 'sneak', 270)]
case1 = [case_lie(0, lid=1), case_lie(r3(cc0 + sec(L1, 0.1)), lid=1), case_lie(r3(cc0 + sec(L1, 0.6)), lid=0), case_lie(g1, lid=0),
         case_att(r3(g1 + 0.002), 0, 0, 0.55, 180, 90), case_att(u1, 0, 0.82, 0.32, 180, 90), case_att(k1, 0.3, 0.86, 0.02, 90, 0),
         case_att(1, 0.3, 0.86, 0.02, 90, 0)]
par1 = [K(0, 0, 0, 'park', 0, y=HIDE, attach='dummy'), K(r3(par0 - 0.002), 0, 0, 'park', 0, y=HIDE, attach='dummy'),
        K(par0, 0, 0, 'show', 0, y=1.9, attach='dummy', size=0.1), K(1, 0, 0, 'show', 0, y=1.9, attach='dummy')]
DZ = pos_at(fz1, P1, P2, sn1, sn2)
cut1 = sn0
exp1 = {
 'camera': [cam(0, [5.54, 2.26, 1.28], [1.5, 0.46, -1.55]), cam(r3(cut1 - 0.004), [5.2, 2.2, 1.1], [1.5, 0.5, -1.55]),
            cam(cut1, [KS[0] + 1.6, 2.25, 6.7], [KS[0] - 0.7, 1.1, 0.0]),
            cam(fz1, [DZ[0] + 2.3, 2.23, 6.67], [DZ[0], 1.1, 0.32]), cam(1, [DZ[0] + 2.1, 2.2, 6.3], [DZ[0], 1.1, 0.32])],
 'actors': {'dummy': dummy1, 'geldkoffer': case1, 'paragraf': par1},
 'freeze': fz1,
 'sfx': [{'t': r3(cc0 + sec(L1, 0.55)), 'id': 'schnallen-klick', 'volume': 0.55}],
}

# ================= Option 3: Finderlohn selbst rausnehmen (falsch) =================
L3 = 'explain3'
c_musst = cue(L3, 'Du musst alles')
gw0 = sec(L3, 0.2)
NW = 3
cyc = lambda n: r3(gw0 + sec(L3, 0.3 + 1.05 + 1.5 * n))      # n-tes Bündel ist in der Jacke
gw_end = r3(gw0 + sec(L3, 0.3 + 1.5 * NW))
cut3 = r3(max(gw_end, c_musst - sec(L3, 0.6)))
dummy3 = [K(0, *KS, 'kneellook', DF, stash=0, **JK), K(r3(gw0 - 0.002), *KS, 'kneellook', DF), K(gw0, *KS, 'grabwads', DF)]
for n in range(NW):
    dummy3 += [K(r3(cyc(n) - sec(L3, 0.08)), *KS, 'grabwads', DF, stash=n), K(cyc(n), *KS, 'grabwads', DF, stash=n + 1)]
DS = (-0.6, -0.12)
dummy3 += [K(r3(cut3 - 0.003), *KS, 'grabwads', DF), K(cut3, *DS, 'sheepish', 0, stash=NW), K(1, *DS, 'sheepish', 0)]
dummy3 = sorted(dummy3, key=lambda k: k['t'])
case3 = [case_lie(0, lid=1, money=1)]
for n in range(NW):
    case3 += [case_lie(r3(cyc(n) - sec(L3, 0.5)), lid=1, money=round(1 - n / 16, 3)), case_lie(r3(cyc(n) - sec(L3, 0.48)), lid=1, money=round(1 - (n + 1) / 16, 3))]
case3 += [case_lie(r3(cut3 - 0.003), lid=1), K(cut3, 0.15, -0.75, 'park', 180, y=CT, tilt=0, lid=0), K(1, 0.15, -0.75, 'park', 180)]
br0 = r3(cut3 + sec(L3, 1.0))
fz3 = r3(br0 + sec(L3, 0.9))
pol3 = [K(0, *OFF, 'stand', 180, y=HIDE), K(r3(cut3 - 0.002), *OFF, 'stand', 180, y=HIDE), K(cut3, *OFF, 'listen', 180, y=0, brow=0.1),
        K(r3(br0 - 0.002), *OFF, 'listen', 180, brow=0.1), K(br0, *OFF, 'stand', 180, brow=0.1), K(r3(br0 + sec(L3, 0.5)), *OFF, 'stand', 180, brow=1),
        K(1, *OFF, 'stand', 180, brow=1)]
cutR = r3(br0 - sec(L3, 0.15))
exp3 = {
 'stage': [{'t': 0, 'stage': 'park'}, {'t': cut3, 'stage': 'polizeiwache'}],
 'camera': [cam(0, [-2.41, 2.74, 1.88], [1.26, 0.45, -1.96], 36), cam(r3(cut3 - 0.004), [-2.2, 2.65, 1.7], [1.26, 0.45, -1.96], 36),
            cam(cut3, [-1.45, 1.6, -2.4], [-0.55, 1.22, -0.12], 40), cam(r3(cutR - 0.004), [-1.42, 1.6, -2.33], [-0.55, 1.22, -0.12], 40),
            cam(cutR, [-0.55, 1.86, 1.4], [OFF[0], 1.67, OFF[1]], 30), cam(1, [-0.52, 1.85, 1.27], [OFF[0], 1.67, OFF[1]], 30)],
 'actors': {'dummy': dummy3, 'geldkoffer': case3, 'polizist': pol3},
 'freeze': fz3,
}

# ================= Option 2: zur Polizei, Kontaktdaten angeben (richtig) =================
L2 = 'explain2'
c_kont = cue(L2, 'gib deine Kontaktdaten')
c_fl = cue(L2, 'keinen Finderlohn')
c_bei = cue(L2, 'Bei so viel')
c_und = cue(L2, 'Und anders')
c_meld = cue(L2, 'Meldet sich')
c_sechs = cue(L2, 'nach sechs Monaten')
c_soga = cue(L2, 'sogar dir')
cl0 = sec(L2, 0.1)
cut2a = r3(cl0 + sec(L2, 0.85))
wk1 = r3(cut2a + sec(L2, seglen(DOOR, DA) / 1.25))
sc0 = r3(wk1 + 0.002)
sc_rel = r3(sc0 + sec(L2, 0.75))
sc1 = r3(sc0 + sec(L2, 1.4))
db0 = r3(sc1 + sec(L2, seglen(DA, DB) / 1.0))
ff0 = r3(db0 + 0.002)
ff1 = r3(max(ff0 + sec(L2, 3.0), c_fl - sec(L2, 0.3)))
calc0 = r3(max(ff0 + sec(L2, 1.6), c_fl - sec(L2, 0.9)))
calc_up = r3(calc0 + sec(L2, 0.7))
calc_full = r3(calc_up + sec(L2, 1.1))
flash2 = calc_full
cal0 = r3(c_meld + sec(L2, 0.1))
ch0 = r3(max(cal0 + sec(L2, 1.0), c_soga - sec(L2, 0.3)))
dummy2 = [K(0, *KS, 'kneellook', DF, **JK), K(r3(cl0 - 0.002), *KS, 'kneellook', DF), K(cl0, *KS, 'closecase', DF), K(r3(cut2a - 0.003), *KS, 'closecase', DF),
          K(cut2a, *DOOR, 'carrycase', face_to(DOOR, DA)), K(wk1, *DA, 'carrycase', face_to(DOOR, DA)), K(sc0, *DA, 'setcounter', DFS),
          K(r3(sc1 - 0.002), *DA, 'setcounter', DFS), K(sc1, *DA, 'walk', 270), K(r3(db0 - 0.002), *DB, 'walk', 270), K(ff0, *DB, 'fillform', DFS),
          K(ff1, *DB, 'fillform', DFS), K(r3(ff1 + 0.002), *DB, 'listen', DFS), K(r3(ch0 - 0.002), *DB, 'listen', DFS), K(ch0, *DB, 'cheer', 196),
          K(1, *DB, 'cheer', 196)]
case2 = [case_lie(0, lid=1), case_lie(r3(cl0 + sec(L2, 0.1)), lid=1), case_lie(r3(cl0 + sec(L2, 0.6)), lid=0), case_lie(r3(cut2a - 0.003), lid=0),
         K(cut2a, *DOOR, 'park', 180, tilt=0, lid=0, hand=1, drop=DROP), K(sc_rel, *CASE_C, 'park', 180, y=CT, tilt=0, hand=1),
         K(r3(sc_rel + 0.003), *CASE_C, 'park', 180, y=CT, hand=0), K(1, *CASE_C, 'park', 180, y=CT, hand=0)]
form2 = [K(0, *FORM_C, 'park', 180, y=HIDE, fill=0, pen=1, size=0.3), K(r3(sc1 - 0.002), *FORM_C, 'park', 180, y=HIDE),
         K(sc1, *FORM_C, 'park', 180, y=CT), K(r3(ff0 + sec(L2, 0.5)), *FORM_C, 'park', 180, y=CT, fill=0, pen=0),
         K(ff1, *FORM_C, 'park', 180, y=CT, fill=1), K(1, *FORM_C, 'park', 180, y=CT, fill=1)]
pol2 = [K(0, *OFF, 'listen', 180, y=HIDE), K(r3(cut2a - 0.002), *OFF, 'listen', 180, y=HIDE), K(cut2a, *OFF, 'listen', 180, y=0),
        K(r3(calc0 - 0.002), *OFF, 'listen', 180), K(calc0, *OFF, 'handover', 180), K(r3(cal0 - sec(L2, 0.4)), *OFF, 'handover', 180),
        K(r3(cal0 - sec(L2, 0.38)), *OFF, 'pointtalk', 210), K(r3(ch0), *OFF, 'pointtalk', 210), K(r3(ch0 + 0.002), *OFF, 'listen', 200), K(1, *OFF, 'listen', 200)]
calc2 = [K(0, *OFF, 'park', 180, y=HIDE, fill=0, hand=0, holder='polizist', drop=-0.03, size=0.9, tilt=0), K(r3(calc0 + sec(L2, 0.15)), *OFF, 'park', 180, y=HIDE, hand=0),
         K(r3(calc0 + sec(L2, 0.17)), *OFF, 'park', 180, y=0, hand=1, fill=0), K(calc_up, *OFF, 'park', 180, hand=1, fill=0),
         K(calc_full, *OFF, 'park', 180, hand=1, fill=1), K(r3(cal0 - sec(L2, 0.4)), *OFF, 'park', 180, hand=1),
         K(r3(cal0 - sec(L2, 0.38)), 0.15, -0.82, 'park', 165, y=CT, hand=0, tilt=12), K(1, 0.15, -0.82, 'park', 165, y=CT, hand=0, tilt=12)]
CALP = (0.6, -1.15)
cal2 = [K(0, *CALP, 'park', 0, y=HIDE), K(r3(cal0 - 0.002), *CALP, 'park', 0, y=HIDE), K(cal0, *CALP, 'show', 0, y=1.45, size=0.15),
        K(1, *CALP, 'show', 0, y=1.45)]
cutC = r3(max(ff0 + sec(L2, 0.4), calc0 - sec(L2, 1.4)))
cutD = r3(calc0 + sec(L2, 0.25))
cutE = r3(calc_full + sec(L2, 1.6))
cutF = r3(cal0 - sec(L2, 0.45))
exp2 = {
 'stage': [{'t': 0, 'stage': 'park'}, {'t': cut2a, 'stage': 'polizeiwache'}],
 'camera': [cam(0, [5.54, 2.26, 1.28], [1.5, 0.46, -1.55]), cam(r3(cut2a - 0.004), [5.2, 2.2, 1.1], [1.5, 0.5, -1.55]),
            cam(cut2a, [0.4, 2.7, 8.6], [0.6, 1.0, 0.0]), cam(r3(cutC - 0.004), [0.0, 2.65, 8.0], [-0.1, 1.0, -0.1]),
            cam(cutC, [-1.6, 2.6, -2.3], [-0.38, 1.12, -0.55], 54), cam(r3(cutD - 0.004), [-1.55, 2.55, -2.22], [-0.38, 1.12, -0.55], 53),
            cam(cutD, [1.16, 1.75, 2.74], [-0.36, 1.31, -1.28], 30), cam(r3(cutE - 0.004), [1.12, 1.74, 2.6], [-0.36, 1.31, -1.28], 30),
            cam(cutE, [-2.88, 3.16, 7.91], [-0.66, 0.61, -0.91]), cam(r3(cutF - 0.004), [-2.7, 3.05, 7.4], [-0.66, 0.65, -0.91]),
            cam(cutF, [-2.6, 3.0, 7.2], [-0.66, 0.65, -0.91]), cam(1, [-2.4, 2.9, 6.7], [-0.66, 0.7, -0.91])],
 'actors': {'dummy': dummy2, 'geldkoffer': case2, 'formular': form2, 'polizist': pol2, 'taschenrechner': calc2, 'kalenderblatt': cal2},
 'flash': flash2,
 'sfx': [{'t': r3(cl0 + sec(L2, 0.5)), 'id': 'schnallen-klick', 'volume': 0.55}, {'t': r3(cal0), 'id': 'kalender-blaettern', 'volume': 0.35},
         {'t': r3(ch0 + sec(L2, 0.1)), 'id': 'plopp', 'volume': 0.3}],
}
steps2 = [{'text': 'Nicht behalten', 'cue': 'Bring den Koffer'},
          {'text': 'Nichts rausnehmen', 'cue': 'Koffer zur Polizei'},
          {'text': 'Zur Polizei bringen', 'cue': 'zur Polizei und'},
          {'text': 'Kontaktdaten angeben', 'cue': 'gib deine Kontaktdaten'},
          {'text': 'Finderlohn: über 30.000 €', 'cue': 'keinen Finderlohn'}]

# ================= Outro: Polizeiwache, Dummy jubelt, Taschenrechner zeigt 30.010 € =================
outro = {
 'stage': 'polizeiwache',
 'camera': [cam(0, [-2.4, 2.9, 7.2], [0.15, 0.45, -0.5]), cam(1, [-2.2, 2.85, 6.8], [0.15, 0.45, -0.5])],
 'actors': {'dummy': [K(0, *DB, 'cheer', 196, **JK)],
            'polizist': [K(0, *OFF, 'listen', 200)],
            'geldkoffer': [K(0, *CASE_C, 'park', 180, y=CT, tilt=0)],
            'formular': [K(0, *FORM_C, 'park', 180, y=CT, fill=1, size=0.3)],
            'taschenrechner': [K(0, 0.15, -0.82, 'park', 165, y=CT, fill=1, size=0.9, tilt=12)]},
}

DESC = ("Du hast mal wieder einen Koffer mit einer Million Euro gefunden – was machst du jetzt? 💰🧳 Schreib 1, 2 oder 3 in die Kommentare!\n\n"
        "Rechenbeispiel Finderlohn bei 1.000.000 €: 5 % von 500 € = 25 € plus 3 % von 999.500 € = 29.985 €. Zusammen: 30.010 €.\n\n"
        "Quellen:\n"
        "§ 965 BGB (Anzeigepflicht), § 971 BGB (Finderlohn), § 246 StGB (Unterschlagung)\n"
        "Berliner Kurier, Geld gefunden – wann darf ich es behalten?: https://www.berliner-kurier.de/article/geld-gefunden-wann-darf-ich-es-behalten-10345746\n"
        "Sparkasse, Geld gefunden – was nun?: https://www.sparkasse.de/unsere-loesungen/privatkunden/bezahlverfahren/bargeld/geld-gefunden.html\n\n"
        "Keine Rechtsberatung.\n\n"
        "#waswürdestdutun #fundstücke #finderlohn #million #geldgefunden #wusstestdu #quiz #recht\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'category': 'fundstuecke', 'stage': 'park',
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy klappt den Koffer zu, klemmt ihn unter den Arm und schleicht nach Hause. Über ihm erscheint "§ 246". Bild friert ein, rotes Aufleuchten.', 'explanation': S['e1'], 'choreography': exp1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy bringt den Koffer zur Polizeiwache, stellt ihn auf den Tresen und füllt ein Formular mit seinen Kontaktdaten aus. Der Polizist zeigt auf dem Taschenrechner "30.010 €". Grünes Aufleuchten. Kalenderblatt "6 Monate", Dummy freut sich.', 'explanation': S['e2'], 'steps': steps2, 'choreography': exp2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy nimmt ein paar Bündel aus dem Koffer und steckt sie in seine Jacke, gibt den Rest auf der Wache ab. Der Polizist sieht die Bündel aus der Jacke schauen und hebt die Augenbraue. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e3'], 'choreography': exp3},
 ],
 'correctOption': 2,
 'countdown': {'speech': S['countdown'], 'screen': 'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal': {'speech': S['reveal'], 'screen': 'Richtig ist Nummer 2'},
 'outro': {'speech': S['outro'], 'screen': S['outro']},
 'sourceLine': 'Quellen: § 965 und § 971 BGB · § 246 StGB',
 'sources': [
  {'name': 'Berliner Kurier, Geld gefunden – wann darf ich es behalten?', 'url': 'https://www.berliner-kurier.de/article/geld-gefunden-wann-darf-ich-es-behalten-10345746'},
  {'name': 'Sparkasse, Geld gefunden – was nun?', 'url': 'https://www.sparkasse.de/unsere-loesungen/privatkunden/bezahlverfahren/bargeld/geld-gefunden.html'},
 ],
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ehrlich: Wer hätte sich schon mal ein Bündel rausgenommen? 😏👇 Was soll der Dummy als Nächstes finden?",
 },
 'shots': {'situation': situation, 'options': options, 'countdown': countdown, 'reveal': reveal, 'outro': outro},
}
for _sh in [situation, options, countdown, reveal, outro, exp1, exp2, exp3]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
print('cues', dict(er=c_er, was=c_was, arrive=arrive, oc0=oc0, cutB=cutB, sn0=sn0, par0=par0, fz1=fz1, cut3=cut3, br0=br0, fz3=fz3,
                   cut2a=cut2a, sc0=sc0, ff0=ff0, calc0=calc0, flash2=flash2, cal0=cal0, ch0=ch0), 'audio' if dur else 'geschätzt', {k: seclen(k) for k in TEXT})
