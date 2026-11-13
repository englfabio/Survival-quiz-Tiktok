# Hilfsskript: erzeugt scenarios/kaenguru-zahn.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/kaenguru-choreo.py
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'kaenguru-zahn'
S = dict(
situation="Du hast mal wieder gegen ein Känguru gekämpft. Das Känguru hat gewonnen, und dein Zahn liegt im Gras. Was machst du jetzt?",
hook="Du hast mal wieder mit einem Känguru gekämpft",
o1c="Abspülen, ins Taschentuch", o1s="Eins: Den Zahn mit Wasser abspülen und in ein Taschentuch wickeln.",
o2c="In ein Glas Wasser legen", o2s="Zwei: Den Zahn in ein Glas Leitungswasser legen.",
o3c="An der Krone fassen, H-Milch, Zahnarzt", o3s="Drei: Den Zahn nur oben anfassen, in eine Zahnrettungsbox oder H-Milch legen und sofort zum Zahnarzt.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer drei.",
e1="An der Wurzel deines Zahns sitzen empfindliche Zellen. Die braucht er, um wieder einzuwachsen. Abspülen schadet ihnen, und im trockenen Taschentuch sterben sie schnell ab.",
e2="Wasser klingt logisch, ist aber ungeeignet. Fachleute raten davon ab, einen ausgeschlagenen Zahn in Wasser aufzubewahren, denn das tut den Zellen an der Wurzel nicht gut.",
e3="Fass den Zahn nur oben an der Krone an, nie an der Wurzel, und mach ihn nicht sauber. Leg ihn in eine Zahnrettungsbox aus der Apotheke, oder notfalls in kalte H-Milch. Keine frische Milch. Und dann sofort zum Zahnarzt. Je schneller, desto besser stehen die Chancen, dass der Zahn wieder einwächst.",
outro="Und nächstes Mal: Mundschutz tragen. Wusstest du es? Schreib's in die Kommentare.",
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
    d.update(kw); return d
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
HIDE = -30
def fwd(face):
    a = math.radians(face); return (math.sin(a), -math.cos(a))
def right(face):
    """rechte Seite des Dummys (lokal −x) in Weltrichtung"""
    a = math.radians(face); return (math.cos(a), math.sin(a))

# ---- feste Plätze (Bühne outback, siehe src/stage/Outback.tsx) ----
KX, KZ, KF = 0.5, -0.35, 235            # Känguru im Ring
DX, DZ, DF = -0.42, 0.33, 55            # Dummy im Ring (Boxhaltung)
D2X, D2Z = -1.0, 0.95                   # Dummy nach dem Taumeln
LX, LZ = 0.9, 3.55                      # hier landet der Zahn im Gras
TAPX, TAPZ = 3.3, 3.7                   # Wasserhahn (Standrohr), Auslauf zeigt nach +x
TBX, TBZ, TBH = -3.3, 2.2, 0.6          # Klapptisch
GLX, GLZ = -3.5, 2.3                    # Glas / Box auf dem Tisch (Ablagestelle)
MKX, MKZ = -3.12, 2.18                  # H-Milch auf dem Tisch
PLX, PLZ, PLF = GLX - 0.42, GLZ - 0.1, 90  # Dummy vor der Ablagestelle (placetooth)
CHX, CHZ = 0.0, -0.5                    # Behandlungsstuhl (Zahnarztpraxis)
TOOTH_SIZE = 0.9                        # Zahn im Gras/Flug (comichaft groß)
ring_dummy_teeth = dict(teeth=1)
def kang(*keys):
    return [K(t, x, z, m, f) for t, x, z, m, f in keys]
def hide(name_keys_t):
    return name_keys_t

# ================= Situation =================
L0 = 'situation'
c_gew = cue(L0, 'Das Känguru hat gewonnen')
c_zahn = cue(L0, 'und dein Zahn')
c_was = cue(L0, 'Was machst du')
punch0 = r3(c_gew - sec(L0, 0.15))
hit = r3(punch0 + sec(L0, 0.4))
fly1 = r3(hit + sec(L0, 1.0))
hop0 = r3(punch0 - sec(L0, 0.9))
# Mund des Dummys (Startpunkt des Zahns): Kopf ca. 2,22 m über dem Boden (Ringboden 0,5)
mx, mz = DX + fwd(DF)[0] * 0.14, DZ + fwd(DF)[1] * 0.14
situation = {
 'camera': [cam(0, [0.5, 2.2, 6.6], [-0.1, 1.65, 0.1]), cam(r3(c_zahn - 0.004), [0.2, 2.1, 6.0], [-0.3, 1.6, 0.4]),
            cam(r3(c_zahn), [LX + 0.3, 0.85, LZ + 0.95], [LX, 0.05, LZ]), cam(r3(c_was - 0.004), [LX + 0.25, 0.75, LZ + 0.78], [LX, 0.05, LZ]),
            cam(r3(c_was), [D2X + 1.5, 2.3, D2Z - 0.45], [D2X, 2.05, D2Z]), cam(1, [D2X + 1.3, 2.28, D2Z - 0.38], [D2X, 2.05, D2Z])],
 'actors': {
  'kaenguru': [K(0, KX + 0.35, KZ - 0.25, 'guard', KF), K(hop0, KX + 0.35, KZ - 0.25, 'hop', KF), K(r3(punch0 - 0.004), KX, KZ, 'hop', KF),
               K(punch0, KX, KZ, 'punch', KF), K(r3(hit + sec(L0, 0.45)), KX, KZ, 'punch', KF), K(r3(hit + sec(L0, 0.5)), KX, KZ, 'victory', KF),
               K(1, KX, KZ, 'victory', KF)],
  'dummy': [K(0, DX, DZ, 'boxguard', DF, gloves=1, teeth=1, gap=0), K(hit, DX, DZ, 'boxguard', DF), K(r3(hit + 0.003), DX, DZ, 'hitstagger', DF, gap=1),
            K(r3(hit + sec(L0, 1.3)), D2X, D2Z, 'hitstagger', DF + 10), K(1, D2X, D2Z, 'hitstagger', DF + 10)],
  'zahn': [K(0, mx, mz, 'fly', y=HIDE, size=TOOTH_SIZE), K(r3(hit - 0.002), mx, mz, 'fly', y=HIDE), K(hit, mx, mz, 'fly', y=1.75),
           K(r3(hit + sec(L0, 0.45)), (mx + LX) / 2, (mz + LZ) / 2, 'fly', y=3.2), K(fly1, LX, LZ, 'fly', y=0.04),
           K(r3(fly1 + 0.002), LX, LZ, 'lie', 25, y=0.03), K(1, LX, LZ, 'lie', 25, y=0.03)],
 },
 'sfx': [{'t': 0.01, 'id': 'boxglocke', 'volume': 0.6}, {'t': r3(hit - sec(L0, 0.05)), 'id': 'boxschlag', 'volume': 0.9},
         {'t': r3(fly1 - sec(L0, 0.03)), 'id': 'zahn-ping', 'volume': 0.8}],
}

# ================= Optionen / Countdown / Auflösung =================
def still(p0, l0, p1, l1):
    return {'camera': [cam(0, p0, l0), cam(1, p1, l1)],
            'actors': {'kaenguru': [K(0, KX, KZ, 'victory', 215)],
                       'dummy': [K(0, D2X, D2Z, 'dazed', DF + 10, gloves=1, teeth=1, gap=1)],
                       'zahn': [K(0, LX, LZ, 'lie', 25, y=0.03, size=TOOTH_SIZE)]}}
options = still([-0.1, 2.9, 9.4], [-0.3, 1.05, 0.3], [-0.2, 2.85, 8.9], [-0.3, 1.05, 0.3])
countdown = still([-0.2, 2.85, 8.9], [-0.3, 1.05, 0.3], [-0.25, 2.8, 8.6], [-0.3, 1.05, 0.3])
reveal = still([-0.25, 2.8, 8.6], [-0.3, 1.05, 0.3], [-0.3, 2.8, 8.4], [-0.3, 1.05, 0.3])

KANG_BG = [K(0, KX, KZ, 'victory', 200)]   # Känguru jubelt im Hintergrund

# ================= Option 1: abspülen + Taschentuch =================
L1 = 'explain1'
DTX, DTZ, DTF = TAPX + 0.62, TAPZ, 270
r0, r1 = sec(L1, 0.15), sec(L1, 2.4)
w0 = r3(r1 + sec(L1, 0.15))
w1 = r3(w0 + sec(L1, 1.5))
g0, g1 = r3(w1 + sec(L1, 0.1)), r3(w1 + sec(L1, 1.3))
fz1 = r3(max(g1 + sec(L1, 0.15), cue(L1, 'Die braucht er') - sec(L1, 0.2)))
WF = 205
pf = fwd(WF)
palm = (DTX + pf[0] * 0.33, 1.0, DTZ + pf[1] * 0.33)
exp1 = {
 'camera': [cam(0, [TAPX + 0.3, 1.3, TAPZ + 2.2], [TAPX + 0.22, 0.88, TAPZ]), cam(r3(r1), [TAPX + 0.28, 1.25, TAPZ + 1.9], [TAPX + 0.22, 0.88, TAPZ]),
            cam(w0, [palm[0] + 0.2, 1.5, palm[2] + 1.8], [palm[0], 0.92, palm[2]]), cam(r3(g0), [palm[0] + 0.17, 1.42, palm[2] + 1.35], [palm[0], 0.9, palm[2]]),
            cam(fz1, [palm[0] + 0.15, 1.4, palm[2] + 1.2], [palm[0], 0.9, palm[2]]), cam(1, [palm[0] + 0.13, 1.38, palm[2] + 1.08], [palm[0], 0.9, palm[2]])],
 'actors': {
  'wasserhahn': [K(0, TAPX, TAPZ, 'stand', 90, water=0), K(r3(r0 * 0.5), TAPX, TAPZ, 'stand', 90, water=1), K(r3(r1), TAPX, TAPZ, 'stand', 90, water=1), K(r3(r1 + sec(L1, 0.3)), TAPX, TAPZ, 'stand', 90, water=0)],
  'dummy': [K(0, DTX, DTZ, 'rinsetooth', DTF, teeth=1, gap=1, gray=0, wrap=0), K(r3(r1), DTX, DTZ, 'rinsetooth', DTF),
            K(r3(r1 + 0.003), DTX, DTZ, 'holdtooth', DTF), K(r3(w0 - 0.003), DTX, DTZ, 'holdtooth', WF), K(w0, DTX, DTZ, 'wraptooth', WF, wrap=0),
            K(w1, DTX, DTZ, 'wraptooth', WF, wrap=0.55, gray=0), K(g0, DTX, DTZ, 'wraptooth', WF, gray=0), K(g1, DTX, DTZ, 'wraptooth', WF, gray=1),
            K(1, DTX, DTZ, 'wraptooth', WF, gray=1)],
  'kaenguru': KANG_BG,
 },
 'freeze': fz1,
 'sfx': [{'t': r3(r0 * 0.5), 'id': 'wasserhahn', 'volume': 0.6}],
}

# ================= Option 2: Glas Leitungswasser =================
L2 = 'explain2'
p0 = sec(L2, 0.25)
rel = r3(p0 + sec(L2, 0.8))
sink = r3(rel + sec(L2, 0.6))
gg0, gg1 = r3(sink + sec(L2, 0.3)), r3(sink + sec(L2, 1.5))
fz2 = r3(max(gg1 + sec(L2, 0.15), cue(L2, 'ist aber') - sec(L2, 0.1)))
exp2 = {
 'camera': [cam(0, [GLX + 0.45, 1.35, GLZ + 1.7], [GLX - 0.1, 0.92, GLZ - 0.05]), cam(r3(rel), [GLX + 0.25, 1.05, GLZ + 0.95], [GLX, 0.7, GLZ]),
            cam(fz2, [GLX + 0.18, 0.92, GLZ + 0.62], [GLX, 0.67, GLZ]), cam(1, [GLX + 0.15, 0.88, GLZ + 0.52], [GLX, 0.67, GLZ])],
 'actors': {
  'dummy': [K(0, PLX, PLZ, 'holdtooth', PLF, teeth=1, gap=1, gray=0), K(r3(p0 - 0.003), PLX, PLZ, 'holdtooth', PLF), K(p0, PLX, PLZ, 'placetooth', PLF), K(1, PLX, PLZ, 'placetooth', PLF)],
  'wasserglas': [K(0, GLX, GLZ, 'stand', 0, y=TBH)],
  'zahn': [K(0, GLX, GLZ, 'lie', 20, y=HIDE, size=0.25, gray=0), K(r3(rel - 0.002), GLX, GLZ, 'lie', 20, y=HIDE),
           K(rel, GLX, GLZ, 'lie', 20, y=TBH + 0.085), K(sink, GLX + 0.005, GLZ, 'lie', 35, y=TBH + 0.045),
           K(gg0, GLX + 0.005, GLZ, 'lie', 35, y=TBH + 0.045, gray=0), K(gg1, GLX + 0.005, GLZ, 'lie', 35, y=TBH + 0.045, gray=1), K(1, GLX + 0.005, GLZ, 'lie', 35, y=TBH + 0.045, gray=1)],
  'kaenguru': KANG_BG,
 },
 'freeze': fz2,
 'sfx': [{'t': r3(rel), 'id': 'zahn-ping', 'volume': 0.35}],
}

# ================= Option 3: an der Krone, Zahnrettungsbox / H-Milch, Zahnarzt =================
L3 = 'explain3'
c_fass = cue(L3, 'Fass den Zahn')
c_nie = cue(L3, 'nie an der Wurzel')
c_mach = cue(L3, 'und mach ihn')
c_leg = cue(L3, 'Leg ihn')
c_oder = cue(L3, 'oder notfalls')
c_keine = cue(L3, 'Keine frische')
c_dann = cue(L3, 'Und dann sofort')
c_je = cue(L3, 'Je schneller')
c_ein = cue(L3, 'wieder einwächst')
# A: Zahn im Gras an der Krone aufheben (Dummy schaut zur Kamera, Zahn liegt vor ihm)
PF = 180
PX, PZ = LX + 0.08, LZ - 0.52
pick0 = r3(max(sec(L3, 0.2), c_fass - sec(L3, 0.4)))
grab = r3(pick0 + sec(L3, 0.88))
eye = (PX - 0.08, 1.1, PZ + 0.44)
cut1 = r3(c_leg - sec(L3, 0.25))         # Schnitt zum Tisch
# B: in die Zahnrettungsbox legen, H-Milch daneben
b0 = r3(cut1 + sec(L3, 0.15))
brel = r3(b0 + sec(L3, 0.8))
lid_close = r3(brel + sec(L3, 0.5))
cut2 = r3(c_dann - sec(L3, 0.15))         # Schnitt zur Zahnarztpraxis
# C: Zahnarztpraxis: reinlaufen, hinsetzen, Zahn wieder drin
arrive = r3(cut2 + sec(L3, 1.1))
seated = r3(arrive + sec(L3, 0.7))
close = r3(max(c_je - sec(L3, 0.1), seated + sec(L3, 0.4)))
fix = r3(max(c_ein - sec(L3, 0.2), close + sec(L3, 0.8)))
HEAD = (CHX, 1.2, CHZ - 0.68)
dummy3 = [K(0, PX, PZ, 'stand', PF, teeth=1, gap=1, mark=1, gray=0), K(pick0, PX, PZ, 'pickcrown', PF), K(r3(cut1 - 0.003), PX, PZ, 'pickcrown', PF),
          # Tisch
          K(cut1, PLX, PLZ, 'holdtooth', PLF, mark=2), K(r3(b0 - 0.002), PLX, PLZ, 'holdtooth', PLF), K(b0, PLX, PLZ, 'placetooth', PLF), K(r3(cut2 - 0.003), PLX, PLZ, 'placetooth', PLF),
          # Praxis
          K(cut2, 1.7, 1.9, 'run', 215), K(r3(arrive - 0.003), CHX + 0.1, CHZ + 0.55, 'run', 200), K(arrive, CHX + 0.1, CHZ + 0.55, 'dentalsit', 180),
          K(seated, CHX, CHZ, 'dentalsit', 180), K(fix, CHX, CHZ, 'dentalsit', 180, gap=1), K(r3(fix + 0.004), CHX, CHZ, 'dentalsit', 180, gap=0), K(1, CHX, CHZ, 'dentalsit', 180, gap=0)]
tooth3 = [K(0, LX, LZ, 'lie', 25, y=0.03, size=TOOTH_SIZE, mark=1), K(r3(grab - 0.002), LX, LZ, 'lie', 25, y=0.03), K(grab, LX, LZ, 'lie', 25, y=HIDE),
          K(r3(brel - 0.002), GLX, GLZ, 'lie', 25, y=HIDE), K(brel, GLX, GLZ, 'lie', 70, y=TBH + 0.1, size=0.3, mark=2), K(r3(cut2 - 0.002), GLX, GLZ, 'lie', 70, y=TBH + 0.1),
          K(cut2, GLX, GLZ, 'lie', 70, y=HIDE)]
sign3 = [K(0, 0, 0, 'stand', y=HIDE), K(r3(c_nie - 0.003), 0, 0, 'stand', y=HIDE),
         K(r3(c_nie), eye[0] + 0.0, eye[2] + 0.04, 'show', y=0.95, text='Nicht anfassen', size=-0.35, below=1),
         K(r3(c_mach + sec(L3, 0.6)), eye[0] + 0.0, eye[2] + 0.04, 'show', y=0.95), K(r3(c_mach + sec(L3, 0.62)), 0, 0, 'stand', y=HIDE)]
box3 = [K(0, GLX, GLZ, 'stand', 160, y=HIDE, size=0.5, lid=1), K(r3(cut1 - 0.002), GLX, GLZ, 'stand', 160, y=HIDE), K(cut1, GLX, GLZ, 'stand', 160, y=TBH, lid=1),
        K(r3(lid_close - sec(L3, 0.05)), GLX, GLZ, 'stand', 160, y=TBH, lid=1), K(r3(lid_close + sec(L3, 0.45)), GLX, GLZ, 'stand', 160, y=TBH, lid=0),
        K(r3(cut2 - 0.002), GLX, GLZ, 'stand', 160, y=TBH), K(cut2, GLX, GLZ, 'stand', 160, y=HIDE)]
milk3 = [K(0, MKX, MKZ, 'stand', 175, y=HIDE), K(r3(cut1 - 0.002), MKX, MKZ, 'stand', 175, y=HIDE), K(cut1, MKX, MKZ, 'stand', 175, y=TBH),
         K(r3(cut2 - 0.002), MKX, MKZ, 'stand', 175, y=TBH), K(cut2, MKX, MKZ, 'stand', 175, y=HIDE)]
arzt3 = [K(0, 0.8, -0.75, 'stand', 250, y=HIDE), K(r3(cut2 - 0.002), 0.8, -0.75, 'stand', 250, y=HIDE), K(cut2, 0.8, -0.75, 'wave', 225, y=0),
         K(r3(seated), 0.8, -0.75, 'stand', 250, y=0), K(1, 0.8, -0.75, 'stand', 250, y=0)]
exp3 = {
 'stage': [{'t': 0, 'stage': 'outback'}, {'t': cut2, 'stage': 'zahnarztpraxis'}],
 'camera': [cam(0, [PX + 1.0, 1.5, PZ + 3.95], [PX - 0.03, 0.25, PZ + 0.27]), cam(r3(grab), [PX + 0.8, 1.45, PZ + 3.2], [PX - 0.03, 0.55, PZ + 0.3]),
            cam(r3(c_nie), [eye[0] + 0.3, 1.2, eye[2] + 1.2], [eye[0], 0.95, eye[2]]), cam(r3(cut1 - 0.004), [eye[0] + 0.28, 1.19, eye[2] + 1.1], [eye[0], 0.95, eye[2]]),
            cam(cut1, [GLX + 0.5, 1.35, GLZ + 1.3], [GLX + 0.15, 0.7, GLZ - 0.05]), cam(r3(brel), [GLX + 0.42, 1.25, GLZ + 1.05], [GLX + 0.12, 0.7, GLZ]),
            cam(r3(c_oder), [GLX + 0.45, 0.98, GLZ + 0.75], [MKX - 0.05, 0.74, MKZ]), cam(r3(cut2 - 0.004), [GLX + 0.45, 0.96, GLZ + 0.65], [MKX - 0.05, 0.74, MKZ]),
            cam(cut2, [0.35, 1.65, 3.4], [0.3, 0.9, -0.3]), cam(r3(close - 0.004), [0.3, 1.7, 3.0], [0.1, 0.95, -0.6]),
            cam(close, [0.12, 1.5, -0.3], [HEAD[0], HEAD[1], HEAD[2]]), cam(1, [0.1, 1.46, -0.42], [HEAD[0], HEAD[1], HEAD[2]])],
 'actors': {'dummy': dummy3, 'zahn': tooth3, 'hinweis': sign3, 'zahnrettungsbox': box3, 'hmilch': milk3, 'arzt': arzt3},
 'sfx': [{'t': r3(cut1), 'id': 'whoosh', 'volume': 0.5}, {'t': r3(brel), 'id': 'zahn-ping', 'volume': 0.4},
         {'t': r3(cut2 + sec(L3, 0.05)), 'id': 'schritte-rennen', 'volume': 0.45}, {'t': r3(fix), 'id': 'zahn-ping', 'volume': 0.9}],
}
steps3 = [{'text': 'Nur an der Krone anfassen', 'cue': 'Fass den Zahn nur oben an der Krone an'},
          {'text': 'Nicht sauber machen', 'cue': 'und mach ihn nicht sauber'},
          {'text': 'Zahnrettungsbox oder kalte H-Milch', 'cue': 'Leg ihn in eine Zahnrettungsbox'},
          {'text': 'Sofort zum Zahnarzt', 'cue': 'Und dann sofort zum Zahnarzt'}]

# ================= Outro =================
outro = {'camera': [cam(0, [1.4, 2.3, 6.4], [-0.1, 2.05, 0.1]), cam(1, [1.2, 2.3, 5.9], [-0.1, 2.05, 0.1])],
         'actors': {'kaenguru': [K(0, KX, KZ, 'victory', 200)], 'dummy': [K(0, D2X + 0.2, D2Z - 0.1, 'wave', 150, teeth=1, gap=0)]}}

DESC = ("Du hast mal wieder gegen ein Känguru gekämpft – und jetzt liegt dein Zahn im Gras. Was machst du? 🦘🥊🦷 Schreib 1, 2 oder 3 in die Kommentare!\n\n"
        "Übrigens: Nur etwa 2 % der Haushalte haben eine Zahnrettungsbox. Die gibt's in der Apotheke.\n\n"
        "Quellen:\n"
        "Land Tirol, Erste Hilfe bei Zahnunfällen: https://www.tirol.gv.at/fileadmin/themen/gesundheit-vorsorge/lds-sanitaetsdirektion/downloads/01-Kindergarten/erste_hilfe_bei_zahnunfaellen_2.pdf\n"
        "AOK, Zahnunfall richtig handeln: https://www.aok.de/pk/magazin/koerper-psyche/zaehne/zahnunfall-von-kindern-richtig-und-schnell-handeln/\n"
        "proDente, Magazin Zahnunfall: https://www.prodente.de/media/online_shop/files/Magazin_Zahnunfall.pdf\n\n"
        "Kein Ersatz für zahnärztliche Behandlung. Im Notfall: 112.\n\n"
        "#waswürdestdutun #känguru #zahnunfall #erstehilfe #wusstestdu #boxen #survival #quiz\n\nHinweis: Das gesamte Video ist KI-generiert.")
scen = {
 'id': ID, 'category': 'erste-hilfe', 'stage': 'outback',
 'situation': {'speech': S['situation'], 'hook': S['hook']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy spült den Zahn unter dem Wasserhahn ab und wickelt ihn trocken ins Taschentuch, der Zahn wird grau. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e1'], 'choreography': exp1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy legt den Zahn in ein Glas Leitungswasser, der Zahn wird grau. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e2'], 'choreography': exp2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy hebt den Zahn an der Krone hoch (Krone grün, Wurzel kurz rot mit "Nicht anfassen"), legt ihn in die Zahnrettungsbox (H-Milch daneben), läuft zum Zahnarzt und setzt sich in den Stuhl, am Ende sitzt der Zahn wieder in der Lücke. Grünes Aufleuchten.', 'explanation': S['e3'], 'steps': steps3, 'choreography': exp3},
 ],
 'correctOption': 3,
 'countdown': {'speech': S['countdown'], 'screen': 'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal': {'speech': S['reveal'], 'screen': 'Richtig ist Nummer 3'},
 'outro': {'speech': S['outro'], 'screen': S['outro']},
 'sourceLine': 'Quellen: Land Tirol · AOK · proDente',
 'sources': [
  {'name': 'Land Tirol, Erste Hilfe bei Zahnunfällen', 'url': 'https://www.tirol.gv.at/fileadmin/themen/gesundheit-vorsorge/lds-sanitaetsdirektion/downloads/01-Kindergarten/erste_hilfe_bei_zahnunfaellen_2.pdf'},
  {'name': 'AOK, Zahnunfall richtig handeln', 'url': 'https://www.aok.de/pk/magazin/koerper-psyche/zaehne/zahnunfall-von-kindern-richtig-und-schnell-handeln/'},
  {'name': 'proDente, Magazin Zahnunfall', 'url': 'https://www.prodente.de/media/online_shop/files/Magazin_Zahnunfall.pdf'},
 ],
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ehrlich: Wer hätte den Zahn ins Taschentuch gewickelt? 👇 Und gegen welches Tier soll der Dummy als Nächstes antreten?",
 },
 'shots': {'situation': situation, 'options': options, 'countdown': countdown, 'reveal': reveal, 'outro': outro},
}
for _sh in [situation, options, countdown, reveal, outro, exp1, exp2, exp3]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
print('cues', dict(gew=c_gew, hit=hit, fly1=fly1, zahn=c_zahn, was=c_was, fz1=fz1, rel=rel, fz2=fz2, pick0=pick0, grab=grab, nie=c_nie, cut1=cut1, brel=brel, cut2=cut2, arrive=arrive, close=close, fix=fix),
      'audio' if dur else 'geschätzt', {k: seclen(k) for k in TEXT})
