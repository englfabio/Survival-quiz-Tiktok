# Hilfsskript: erzeugt scenarios/wal-panikattacke.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/wal-panikattacke-choreo.py
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'wal-panikattacke'
S = dict(
situation="Ein Wal ist mal wieder in deinem Zimmer, und du bekommst richtig Platzangst. Dein Herz rast, du kriegst kaum Luft. Was machst du jetzt?",
o1c="Schnell viel Luft holen", o1s="Eins: Ganz schnell hintereinander Luft holen, damit du genug Sauerstoff bekommst.",
o2c="Gegen die Angst ankämpfen", o2s="Zwei: Die Angst mit aller Kraft unterdrücken und dagegen ankämpfen.",
o3c="Lang ausatmen, Angst zulassen", o3s="Drei: Langsam atmen, vor allem lange ausatmen, und dir sagen: Das geht vorbei.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer drei.",
e1="Genau das macht es schlimmer. Wer in Panik schnell atmet, gerät leicht in eine Hyperventilation. Dann geraten Sauerstoff und Kohlendioxid im Körper aus dem Gleichgewicht, und du fühlst dich oft noch schlechter.",
e2="Auch das geht nach hinten los. Wer gegen die Angst ankämpft, macht sie meistens nur noch stärker. Fachleute raten: die Angst kommen lassen, statt gegen sie zu kämpfen.",
e3="Atme ruhig und lass dir beim Ausatmen mehr Zeit als beim Einatmen. Lass die Angst da sein und sag dir: Das geht vorbei. Eine Panikattacke fühlt sich schrecklich an, hört aber wieder auf. Kaltes Wasser trinken oder etwas Kühles in den Nacken kann zusätzlich helfen. Und bei starken Brustschmerzen oder wenn es dir zum ersten Mal passiert: ärztlich abklären lassen.",
outro="Der Wal war ausgedacht. Aber im Aufzug oder in der vollen Bahn fühlt sich Panik genauso an. Wusstest du es? Schreib's in die Kommentare.",
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
    d = {'t': round(te(t), 4), 'pos': [round(v, 3) for v in pos], 'look': [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
def sec(c, s):
    """Sekunden → Anteil im Abschnitt"""
    return s / seclen(c)
HIDE = -30

def ease(u): return 0.5 - 0.5 * math.cos(math.pi * max(0, min(1, u)))
def value_at(keys, name, t):
    """Wert wie im Renderer (geerbt, zwischen Zeitpunkten mit easeInOut)"""
    vals = []; cur = 0
    for k in keys:
        if name in k: cur = k[name]
        vals.append(cur)
    if t <= keys[0]['t']: return vals[0]
    for i in range(len(keys) - 1):
        if t < keys[i + 1]['t']:
            u = (t - keys[i]['t']) / (keys[i + 1]['t'] - keys[i]['t'])
            return vals[i] + (vals[i + 1] - vals[i]) * ease(u)
    return vals[-1]
def heart_sfx(c, keys, t_end=1.0, vol=0.35, vol_end=None):
    """Herzschlag-Ton bei jedem Schlag des Herz-Symbols (bis t_end)"""
    L = seclen(c); out = []; ph = 0; N = 1200
    for i in range(N):
        t = (i + 0.5) / N
        if t > t_end: break
        b0 = math.floor(ph)
        ph += value_at(keys, 'heart', t) * L / N
        if math.floor(ph) > b0 or i == 0 and value_at(keys, 'heart', t) > 0:
            v = vol if vol_end is None else vol + (vol_end - vol) * t
            out.append({'t': r3(max(0, t - 0.5 / N)), 'id': 'herzschlag', 'volume': round(v, 3)})
    # beim allerersten Schlag (Phase 0) schlägt das Herz sofort
    return out

# ---- feste Plätze (Bühne schlafzimmer, siehe src/stage/Bedroom.tsx) ----
DX, DZ, DF = -1.12, -1.66, 162            # Dummy an der Rückwand links, schaut leicht zum Wal
WX, WZ, WF, WY = 1.25, -0.95, 252, 0.12   # Wal schwebt über dem Bett, Kopf zum Dummy
CHX, CHZ, CHF = -0.95, -0.55, 160         # Schreibtischstuhl (zur Kamera gedreht)
DESK_H = 0.75
def rot(face, lx, lz):
    """Dummy-System → Welt (Drehung um y um 180 − face)"""
    th = math.radians(180 - face)
    return (lx * math.cos(th) + lz * math.sin(th), -lx * math.sin(th) + lz * math.cos(th))
# Glas + Coolpack auf dem Schreibtisch, rechts neben dem sitzenden Dummy (passt zu SIT_SPOT_* in Dummy.tsx)
gx, gz = rot(CHF, -0.5, 0.3); GLASS = (CHX + gx, CHZ + gz)
px, pz = rot(CHF, -0.5, 0.1); PACK = (CHX + px, CHZ + pz)
def desk_props(glass=True, pack=True):
    a = {}
    a['kaltwasser'] = [K(0, GLASS[0], GLASS[1], 'stand', 0, y=DESK_H if glass else HIDE, fill=1)]
    a['coolpack'] = [K(0, PACK[0], PACK[1], 'stand', 120, y=DESK_H + 0.018 if pack else HIDE)]
    return a
def whale(size=0.05, squish=0.35, motion='spout'):
    return [K(0, WX, WZ, motion, WF, y=WY, size=size, squish=squish)]

# ================= Situation =================
L0 = 'situation'
c_platz = cue(L0, 'und du bekommst')
c_herz = cue(L0, 'Dein Herz rast')
c_was = cue(L0, 'Was machst du')
dummy0 = [K(0, DX, DZ, 'wallpress', DF, heart=1.5, breath=1.2, heave=0.5),
          K(c_platz, DX, DZ, 'wallpress', DF, heart=1.8, breath=1.4, heave=0.7),
          K(c_herz, DX, DZ, 'wallpress', DF, heart=2.3, breath=1.8, heave=1.0),
          K(1, DX, DZ, 'wallpress', DF, heart=2.4, breath=1.9, heave=1.0)]
situation = {
 'camera': [cam(0, [-0.15, 1.75, 4.3], [-0.05, 1.15, -1.1]), cam(r3(c_herz - 0.004), [-0.2, 1.7, 3.9], [-0.1, 1.15, -1.1]),
            cam(r3(c_herz), [-0.35, 1.6, 0.6], [DX + 0.15, 1.45, DZ]), cam(r3(c_was - 0.004), [-0.4, 1.58, 0.35], [DX + 0.15, 1.45, DZ]),
            cam(r3(c_was), [-0.2, 1.8, 4.0], [-0.05, 1.15, -1.1]), cam(1, [-0.2, 1.75, 3.75], [-0.05, 1.15, -1.1])],
 'actors': {
  'dummy': dummy0,
  'wal': [K(0, WX, WZ, 'appear', WF, y=WY, size=0, squish=0.1), K(sec(L0, 1.6), WX, WZ, 'appear', WF, size=0.05, squish=0.35),
          K(sec(L0, 1.62), WX, WZ, 'spout', WF), K(1, WX, WZ, 'spout', WF)],
  **desk_props(),
 },
 'tight': [{'t': 0, 'v': 0.15}, {'t': c_platz, 'v': 0.4}, {'t': c_herz, 'v': 0.7}, {'t': 1, 'v': 0.75}],
 'sfx': [{'t': 0.0, 'id': 'plopp', 'volume': 0.6}, {'t': r3(sec(L0, 1.6) + sec(L0, 0.3)), 'id': 'wal-schnaufen', 'volume': 0.5},
         {'t': r3(sec(L0, 1.6) + sec(L0, 3.5)), 'id': 'wal-schnaufen', 'volume': 0.4}] + heart_sfx(L0, dummy0, vol=0.3),
}

# ================= Optionen / Countdown / Auflösung =================
def still(p0, l0, p1, l1, c=None):
    d = [K(0, DX, DZ, 'wallpress', DF, heart=2.1, breath=1.6, heave=0.85)]
    sh = {'camera': [cam(0, p0, l0), cam(1, p1, l1)],
          'actors': {'dummy': d, 'wal': whale(), **desk_props()},
          'tight': [{'t': 0, 'v': 0.45}]}
    return sh
OL = [0.0, 1.0, -1.1]
options = still([0.15, 2.7, 6.6], OL, [0.12, 2.65, 6.3], OL)
countdown = still([0.12, 2.65, 6.3], OL, [0.1, 2.62, 6.1], OL)
reveal = still([0.1, 2.62, 6.1], OL, [0.08, 2.6, 5.95], OL)

# ================= Option 1: schnell viel Luft holen =================
L1 = 'explain1'
fz1 = r3(max(sec(L1, 4.4), cue(L1, 'Wer in Panik')))
dummy1 = [K(0, DX, DZ, 'wallpress', DF, heart=2.2, breath=1.7, heave=0.9),
          K(sec(L1, 0.3), DX, DZ, 'wallpress', DF, heart=2.3, breath=2.0, heave=1.0),
          K(fz1, DX, DZ, 'wallpress', DF, heart=3.4, breath=3.2, heave=1.0),
          K(1, DX, DZ, 'wallpress', DF)]
exp1 = {
 'camera': [cam(0, [0.1, 1.75, 3.6], [-0.3, 1.25, -1.2]), cam(fz1, [-0.15, 1.65, 2.6], [-0.55, 1.35, -1.3]), cam(1, [-0.2, 1.62, 2.4], [-0.6, 1.36, -1.3])],
 'actors': {
  'dummy': dummy1,
  'wal': [K(0, WX, WZ, 'spout', WF, y=WY, size=0.05, squish=0.35), K(sec(L1, 0.5), WX, WZ, 'spout', WF, size=0.05, squish=0.35),
          K(fz1, WX - 0.1, WZ, 'spout', WF, size=0.3, squish=1.0), K(1, WX - 0.1, WZ, 'spout', WF)],
  **desk_props(),
 },
 'tight': [{'t': 0, 'v': 0.5}, {'t': fz1, 'v': 1.0}],
 'freeze': fz1,
 'sfx': [{'t': r3(sec(L1, 0.5)), 'id': 'wal-schnaufen', 'volume': 0.45}] + heart_sfx(L1, dummy1, t_end=fz1, vol=0.35),
}

# ================= Option 2: gegen die Angst ankämpfen =================
L2 = 'explain2'
fz2 = r3(max(sec(L2, 4.0), cue(L2, 'Wer gegen')))
dummy2 = [K(0, DX, DZ, 'wallpress', DF, heart=2.2, breath=1.6, heave=0.8),
          K(sec(L2, 0.25), DX, DZ + 0.05, 'clench', DF, heart=2.3, breath=1.0, heave=0.3),
          K(fz2, DX, DZ + 0.05, 'clench', DF, heart=3.0, breath=1.0, heave=0.3),
          K(1, DX, DZ + 0.05, 'clench', DF)]
exp2 = {
 'camera': [cam(0, [0.1, 1.75, 3.6], [-0.3, 1.25, -1.2]), cam(fz2, [-0.15, 1.65, 2.6], [-0.55, 1.35, -1.3]), cam(1, [-0.2, 1.62, 2.4], [-0.6, 1.36, -1.3])],
 'actors': {
  'dummy': dummy2,
  'wal': [K(0, WX, WZ, 'spout', WF, y=WY, size=0.05, squish=0.35), K(sec(L2, 0.6), WX, WZ, 'spout', WF, size=0.05, squish=0.35),
          K(fz2, WX - 0.1, WZ, 'spout', WF, size=0.3, squish=1.0), K(1, WX - 0.1, WZ, 'spout', WF)],
  **desk_props(),
 },
 'tight': [{'t': 0, 'v': 0.5}, {'t': fz2, 'v': 1.0}],
 'freeze': fz2,
 'sfx': [{'t': r3(sec(L2, 0.6)), 'id': 'wal-schnaufen', 'volume': 0.45}] + heart_sfx(L2, dummy2, t_end=fz2, vol=0.35),
}

# ================= Option 3: lang ausatmen, Angst zulassen =================
L3 = 'explain3'
c_atme = cue(L3, 'Atme ruhig')
c_lass = cue(L3, 'Lass die Angst')
c_vorbei = cue(L3, 'Das geht vorbei')
c_panik = cue(L3, 'Eine Panikattacke')
c_auf = cue(L3, 'hört aber wieder auf')
c_wasser = cue(L3, 'Kaltes Wasser')
c_kuehl = cue(L3, 'oder etwas Kühles')
c_brust = cue(L3, 'Und bei starken')
SX, SZ = CHX + rot(CHF, 0, 0.3)[0], CHZ + rot(CHF, 0, 0.3)[1]   # steht vor dem Stuhl
sit0 = r3(max(sec(L3, 0.15), c_atme - sec(L3, 1.0)))
breathe0 = r3(sit0 + sec(L3, 1.2))
sip0 = r3(c_wasser); sip1 = r3(sip0 + sec(L3, 1.1)); sip2 = r3(sip1 + sec(L3, 1.0)); sip3 = r3(sip2 + sec(L3, 0.9))
pk0 = r3(max(sip3 + sec(L3, 0.1), c_kuehl)); pk1 = r3(pk0 + sec(L3, 1.3))
shr0 = r3(c_auf)
gone = r3(shr0 + sec(L3, 2.2))
dummy3 = [K(0, SX, SZ, 'stand', CHF, heart=2.3, breath=1.4, heave=0.6, pack=0, sip=0),
          K(sit0, SX, SZ, 'bedsitdown', CHF), K(breathe0, CHX, CHZ, 'bedsitdown', CHF, heart=2.0, breath=0, heave=0),
          K(c_vorbei, CHX, CHZ, 'bedsitdown', CHF, heart=1.5),
          K(c_auf, CHX, CHZ, 'bedsitdown', CHF, heart=1.15),
          K(sip0, CHX, CHZ, 'bedsitdown', CHF, heart=1.05, sip=0), K(sip1, CHX, CHZ, 'bedsitdown', CHF, sip=1),
          K(sip2, CHX, CHZ, 'bedsitdown', CHF, sip=1), K(sip3, CHX, CHZ, 'bedsitdown', CHF, sip=0),
          K(pk0, CHX, CHZ, 'bedsitdown', CHF, pack=0), K(pk1, CHX, CHZ, 'bedsitdown', CHF, pack=1, heart=1.0),
          K(1, CHX, CHZ, 'bedsitdown', CHF, pack=1, heart=1.0)]
# Glas/Coolpack verschwinden vom Tisch, sobald sie in der Hand sind (Wert 0,35 → bei ca. 35 % der Bewegung)
def handoff(a, b, f=0.42): return r3(a + (b - a) * f)
glass3 = [K(0, GLASS[0], GLASS[1], 'stand', 0, y=DESK_H, fill=1), K(r3(handoff(sip0, sip1) - 0.002), GLASS[0], GLASS[1], 'stand', 0, y=DESK_H),
          K(handoff(sip0, sip1), GLASS[0], GLASS[1], 'stand', 0, y=HIDE), K(r3(handoff(sip3, sip2) - 0.002), GLASS[0], GLASS[1], 'stand', 0, y=HIDE),
          K(handoff(sip3, sip2), GLASS[0], GLASS[1], 'stand', 0, y=DESK_H, fill=0.7), K(1, GLASS[0], GLASS[1], 'stand', 0, y=DESK_H)]
pack3 = [K(0, PACK[0], PACK[1], 'stand', 120, y=DESK_H + 0.018), K(r3(handoff(pk0, pk1) - 0.002), PACK[0], PACK[1], 'stand', 120, y=DESK_H + 0.018),
         K(handoff(pk0, pk1), PACK[0], PACK[1], 'stand', 120, y=HIDE)]
wal3 = [K(0, WX, WZ, 'spout', WF, y=WY, size=0.05, squish=0.35), K(c_lass, WX, WZ, 'spout', WF, size=-0.05, squish=0.1),
        K(c_panik, WX, WZ, 'spout', WF, size=-0.25, squish=0), K(r3(shr0 - 0.002), WX, WZ, 'spout', WF, size=-0.3),
        K(shr0, WX, WZ, 'shrink', WF, size=-0.3), K(1, WX, WZ, 'shrink', WF)]
exp3 = {
 'camera': [cam(0, [0.55, 1.45, 2.6], [-0.75, 1.0, -0.75]), cam(r3(c_wasser - 0.004), [0.45, 1.4, 2.25], [-0.8, 0.98, -0.65]),
            cam(r3(c_wasser), [0.2, 1.35, 1.55], [-0.95, 1.0, -0.55]), cam(1, [0.15, 1.33, 1.4], [-0.95, 1.0, -0.55])],
 'actors': {'dummy': dummy3, 'wal': wal3, 'kaltwasser': glass3, 'coolpack': pack3},
 'tight': [{'t': 0, 'v': 0.55}, {'t': c_lass, 'v': 0.35}, {'t': c_vorbei, 'v': 0.15}, {'t': c_panik, 'v': 0}],
 'breathGuide': [breathe0, r3(c_wasser - sec(L3, 0.2))],
 'flash': gone,
 'sfx': [{'t': r3(shr0), 'id': 'schrumpfen', 'volume': 0.55}] + heart_sfx(L3, dummy3, t_end=c_wasser, vol=0.3, vol_end=0.1),
}
steps3 = [{'text': 'Kurz ein, lang aus', 'cue': 'Atme ruhig'},
          {'text': 'Angst zulassen', 'cue': 'Lass die Angst'},
          {'text': '"Das geht vorbei"', 'cue': 'Das geht vorbei'},
          {'text': 'Etwas Kühles in den Nacken', 'cue': 'etwas Kühles in den Nacken'},
          {'text': 'Brustschmerz oder erstes Mal: ärztlich abklären', 'cue': 'Und bei starken'}]

# ================= Outro: Zimmer leer → Aufzug → volle Bahn =================
L4 = 'outro'
c_aufzug = cue(L4, 'Aber im Aufzug')
c_bahn = cue(L4, 'oder in der vollen Bahn')
cut_a = r3(c_aufzug - sec(L4, 0.1))
cut_b = r3(c_bahn - sec(L4, 0.05))
dummyO = [K(0, CHX, CHZ, 'sitbreathe', CHF, heart=0, pack=1),
          K(r3(cut_a - 0.002), CHX, CHZ, 'sitbreathe', CHF, heart=0, pack=1),
          K(cut_a, 0.0, 0.2, 'uneasy', 180, heart=1.7, pack=0),
          K(r3(cut_b - 0.002), 0.0, 0.2, 'uneasy', 180, heart=1.8),
          K(cut_b, -0.31, -0.5, 'holdstrap', 180, heart=1.8), K(1, -0.31, -0.5, 'holdstrap', 180, heart=1.8)]
outro = {
 'stage': [{'t': 0, 'stage': 'schlafzimmer'}, {'t': cut_a, 'stage': 'aufzug'}, {'t': cut_b, 'stage': 'bahn'}],
 'camera': [cam(0, [0.35, 1.5, 2.9], [-0.6, 1.0, -0.8]), cam(r3(cut_a - 0.004), [0.33, 1.48, 2.7], [-0.6, 1.0, -0.8]),
            cam(cut_a, [0.0, 1.6, 2.9], [0.0, 1.25, -0.3]), cam(r3(cut_b - 0.004), [0.0, 1.58, 2.6], [0.0, 1.25, -0.3]),
            cam(cut_b, [0.35, 1.65, 2.9], [-0.25, 1.3, -1.2]), cam(1, [0.3, 1.63, 2.6], [-0.25, 1.3, -1.2])],
 'actors': {'dummy': dummyO,
            'kaltwasser': [K(0, GLASS[0], GLASS[1], 'stand', 0, y=DESK_H, fill=0.7), K(r3(cut_a - 0.002), GLASS[0], GLASS[1], 'stand', 0, y=DESK_H), K(cut_a, 0, 0, 'stand', 0, y=HIDE)]},
 'tight': [{'t': 0, 'v': 0}, {'t': r3(cut_a - 0.002), 'v': 0}, {'t': cut_a, 'v': 0.35}, {'t': 1, 'v': 0.45}],
 'sfx': [{'t': r3(cut_a + sec(L4, 0.2)), 'id': 'aufzug-ding', 'volume': 0.35}] + [c for c in heart_sfx(L4, dummyO, vol=0.18) if c['t'] >= cut_a],
}

DESC = ("Ein Wal ist mal wieder in deinem Zimmer, und du bekommst Platzangst – was machst du jetzt? 🐋 Schreib 1, 2 oder 3 in die Kommentare!\n\n"
        "Der Wal ist ausgedacht, die Tipps helfen bei echten Panikattacken – im Aufzug, in der Bahn oder einfach so.\n\n"
        "Wenn dich Panikattacken öfter erwischen: Sprich mit deiner Hausärztin oder deinem Hausarzt. Hilfe und Austausch gibt's auch bei der Deutschen Angst-Hilfe.\n\n"
        "Quellen:\n"
        "Deutsche Angst-Hilfe e.V., Was tun bei Panikattacken?: https://www.angstselbsthilfe.de/wissen/selbsthilfe-bei-angststoerungen/was-tun-bei-panikattacken/\n"
        "ARS MEDICI, Angst, Panik und Hyperventilation: https://www.rosenfluh.ch/media/arsmedici/2012/03/Angst_Panik_und_Hyperventilation.pdf\n\n"
        "Kein Ersatz für ärztliche oder psychotherapeutische Behandlung. Im Notfall: 112.\n\n"
        "#waswürdestdutun #panikattacke #platzangst #angst #mentalhealth #wusstestdu #survival #quiz")
scen = {
 'id': ID, 'category': 'psyche', 'stage': 'schlafzimmer',
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy an die Wand gedrückt atmet immer schneller (Brustkorb hebt sich hektisch, Atemwolken), Herz-Symbol pocht schneller, der Wal wird noch größer, Raum wird enger. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e1'], 'choreography': exp1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy verkrampft sich und ballt die Fäuste, zittert vor Anspannung, der Wal wird noch größer, Raum wird enger. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e2'], 'choreography': exp2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy setzt sich, atmet ruhig (Atem-Anzeige: kurz ein, lang aus; Bauch hebt und senkt sich), Herz-Symbol wird langsamer, Raum wird weit, der Wal schrumpft und verschwindet; Dummy trinkt kaltes Wasser und legt ein Coolpack in den Nacken. Grünes Aufleuchten, wenn der Wal weg ist.', 'explanation': S['e3'], 'steps': steps3, 'choreography': exp3},
 ],
 'correctOption': 3,
 'countdown': {'speech': S['countdown'], 'screen': 'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal': {'speech': S['reveal'], 'screen': 'Richtig ist Nummer 3'},
 'outro': {'speech': S['outro'], 'screen': S['outro']},
 'sourceLine': 'Quellen: Deutsche Angst-Hilfe e.V. · ARS MEDICI (Ärztezeitschrift)',
 'sources': [
  {'name': 'Deutsche Angst-Hilfe e.V., Was tun bei Panikattacken?', 'url': 'https://www.angstselbsthilfe.de/wissen/selbsthilfe-bei-angststoerungen/was-tun-bei-panikattacken/'},
  {'name': 'ARS MEDICI, Angst, Panik und Hyperventilation', 'url': 'https://www.rosenfluh.ch/media/arsmedici/2012/03/Angst_Panik_und_Hyperventilation.pdf'},
 ],
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ehrlich: Wer hätte auch einfach schneller geatmet? 👇 Und welches Tier soll als Nächstes im Zimmer des Dummys auftauchen?",
 },
 'shots': {'situation': situation, 'options': options, 'countdown': countdown, 'reveal': reveal, 'outro': outro},
}
for _sh in [situation, options, countdown, reveal, outro, exp1, exp2, exp3]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
print('cues', dict(herz=c_herz, fz1=fz1, fz2=fz2, sit0=sit0, breathe0=breathe0, sip0=sip0, pk0=pk0, shr0=shr0, gone=gone, cut_a=cut_a, cut_b=cut_b),
      'audio' if dur else 'geschätzt', {k: seclen(k) for k in TEXT})
