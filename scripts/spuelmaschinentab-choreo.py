# Hilfsskript: erzeugt scenarios/spuelmaschinentab.json (Texte wortgenau vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spuelmaschinentab-choreo.py
import json, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spuelmaschinentab'
S = dict(
situation="Du hast mal wieder einen Spülmaschinentab gegessen. In deinem Mund schäumt es schon. Was machst du jetzt?",
hook="Du hast mal wieder einen Spülmaschinentab gegessen",
warning="Nicht nachmachen!",
o1c="Finger in den Hals", o1s="Eins: Finger in den Hals und alles wieder rausbrechen.",
o2c="Ein großes Glas Milch", o2s="Zwei: Schnell ein großes Glas Milch trinken.",
o3c="Ausspucken, nicht erbrechen, Giftnotruf", o3s="Drei: Reste ausspucken, auf keinen Fall erbrechen und sofort den Giftnotruf anrufen.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer drei.",
e1="Erbrechen ist hier gefährlich. Spülmittel schäumen, und beim Erbrechen kann Schaum oder Erbrochenes in die Lunge gelangen. Deshalb gilt bei Vergiftungen: niemals selbst Erbrechen auslösen.",
e2="Milch ist ein Mythos. Sie ist kein Gegenmittel. Im Gegenteil: Sie kann dafür sorgen, dass Giftstoffe schneller ins Blut gelangen.",
e3="Spuck aus, was noch im Mund ist. Kein Erbrechen. Dann sofort den Giftnotruf anrufen und sagen, was du geschluckt hast, wie viel und wann. Dort erfährst du auch, ob du etwas trinken sollst. Hast du Atemnot oder geht es dir schlecht, sofort die 112.",
outro="Tabs gehören nicht in den Mund. Und immer außer Reichweite von Kindern aufbewahren. Wusstest du es? Schreib's in die Kommentare.",
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

# ---- feste Plätze (Bühne wohnkueche, siehe src/stage/Kitchen.tsx) ----
TH = 0.76                                # Tischplatte
DX, DZ, DF = 0.05, -0.1, 180             # Dummy hinter dem Tisch, schaut zur Kamera
PACK = (-0.38, 0.42, 172)                # Packung Tabs auf dem Tisch (offen)
MILK = (-0.66, 0.36)                      # Glas Milch auf dem Tisch
ROLL = (0.33, 0.3)                       # Küchenpapier
PHONE = (-0.12, 0.62, 160)               # Smartphone liegt auf dem Tisch
CABX, CABY, CABZ = 1.3, 1.45, -2.3       # Oberschrank mit Kindersicherung (Rückwand)
SX, SZ, SF = 1.06, -1.6, 0               # Dummy links vor dem Oberschrank (stowtabs)
SHELF = (1.3, CABY + 0.22 + 0.007, -2.12)  # Packung im Schrank (auf dem Regalboden)
MOUTH = (DX, 1.74, DZ + 0.12)

def table_props(pack=True, milk=True, roll=True, phone=True, until=None):
    """Gegenstände auf dem Tisch (bleiben stehen)"""
    a = {}
    if pack: a['tabpackung'] = [K(0, PACK[0], PACK[1], 'stand', PACK[2], y=TH, lid=1)]
    if milk: a['milchglas'] = [K(0, MILK[0], MILK[1], 'stand', 0, y=TH, fill=1)]
    if roll: a['kuechenpapier'] = [K(0, ROLL[0], ROLL[1], 'stand', 200, y=TH)]
    if phone: a['smartphone'] = [K(0, PHONE[0], PHONE[1], 'lie', PHONE[2], y=TH)]
    return a
CAB0 = [K(0, CABX, CABZ, 'stand', 180, y=CABY, door=0, lock=0)]
DUM = dict(teeth=1, gap=0)

# ================= Situation =================
L0 = 'situation'
c_mund = cue(L0, 'In deinem Mund')
c_was = cue(L0, 'Was machst du')
situation = {
 'camera': [cam(0, [0.45, 1.75, 3.2], [0.0, 1.48, DZ]), cam(r3(c_mund - 0.004), [0.42, 1.74, 2.85], [0.0, 1.48, DZ]),
            cam(r3(c_mund), [0.3, 1.78, 1.35], [DX, 1.7, DZ]), cam(r3(c_was - 0.004), [0.27, 1.77, 1.2], [DX, 1.7, DZ]),
            cam(r3(c_was), [0.7, 1.85, 3.6], [-0.02, 1.45, DZ]), cam(1, [0.62, 1.83, 3.35], [-0.02, 1.45, DZ])],
 'actors': {
  'dummy': [K(0, DX, DZ, 'tabstare', DF, foam=0.55, **DUM), K(r3(c_mund), DX, DZ, 'tabstare', DF, foam=0.9), K(r3(c_was), DX, DZ, 'tabstare', DF, foam=1.25), K(1, DX, DZ, 'tabstare', DF, foam=1.3)],
  'oberschrank': CAB0,
  **table_props(),
 },
 'sfx': [{'t': 0.02, 'id': 'blubbern', 'volume': 0.35}, {'t': r3(c_mund), 'id': 'blubbern', 'volume': 0.45}],
}

# ================= Optionen / Countdown / Auflösung =================
def still(p0, l0, p1, l1):
    return {'camera': [cam(0, p0, l0), cam(1, p1, l1)],
            'actors': {'dummy': [K(0, DX, DZ, 'tabstare', DF, foam=1.3, **DUM)], 'oberschrank': CAB0, **table_props()}}
OL = [-0.1, 1.05, DZ]
options = still([1.0, 2.6, 7.0], OL, [0.95, 2.55, 6.7], OL)
countdown = still([0.95, 2.55, 6.7], OL, [0.92, 2.52, 6.5], OL)
reveal = still([0.92, 2.52, 6.5], OL, [0.9, 2.5, 6.35], OL)

# ================= Option 1: Finger in den Hals =================
L1 = 'explain1'
f0 = sec(L1, 0.2)
near = r3(f0 + sec(L1, 1.0))
lu0 = r3(near + sec(L1, 0.1))
lu1 = r3(lu0 + sec(L1, 1.5))
fz1 = r3(max(lu1 + sec(L1, 0.2), cue(L1, 'Spülmittel schäumen')))
exp1 = {
 'camera': [cam(0, [0.55, 1.68, 3.4], [DX, 1.44, DZ]), cam(r3(lu0), [0.5, 1.65, 3.1], [DX, 1.42, DZ]),
            cam(fz1, [0.47, 1.64, 2.95], [DX, 1.42, DZ]), cam(1, [0.45, 1.63, 2.8], [DX, 1.42, DZ])],
 'actors': {
  'dummy': [K(0, DX, DZ, 'stand', DF, foam=1.2, lunge=0, **DUM), K(f0, DX, DZ, 'fingermouth', DF), K(near, DX, DZ, 'fingermouth', DF, foam=1.6),
            K(lu0, DX, DZ, 'fingermouth', DF, foam=1.75, lunge=0), K(lu1, DX, DZ, 'fingermouth', DF, foam=2, lunge=1), K(1, DX, DZ, 'fingermouth', DF, foam=2, lunge=1)],
  'hinweis': [K(0, 0, 0, 'stand', y=HIDE), K(r3(lu1 - sec(L1, 0.3)), 0, 0, 'stand', y=HIDE),
              K(r3(lu1 - sec(L1, 0.3) + 0.002), DX + 0.36, DZ + 0.1, 'show', y=1.5, text='Lunge', size=0.2)],
  'oberschrank': CAB0,
  **table_props(),
 },
 'freeze': fz1,
 'sfx': [{'t': r3(near), 'id': 'blubbern', 'volume': 0.5}],
}

# ================= Option 2: Glas Milch =================
L2 = 'explain2'
m0 = sec(L2, 0.15)
bl0 = r3(m0 + sec(L2, 2.4))
bl1 = r3(bl0 + sec(L2, 1.4))
fz2 = r3(max(bl1 + sec(L2, 0.2), cue(L2, 'Sie ist kein')))
exp2 = {
 'camera': [cam(0, [0.55, 1.7, 3.4], [DX, 1.5, DZ]), cam(r3(bl0), [0.5, 1.68, 3.1], [DX, 1.48, DZ]),
            cam(fz2, [0.47, 1.67, 2.95], [DX, 1.48, DZ]), cam(1, [0.45, 1.66, 2.8], [DX, 1.48, DZ])],
 'actors': {
  'dummy': [K(0, DX, DZ, 'drinkmilk', DF, foam=1.1, blut=0, **DUM), K(bl0, DX, DZ, 'drinkmilk', DF, blut=0), K(bl1, DX, DZ, 'drinkmilk', DF, blut=1), K(1, DX, DZ, 'drinkmilk', DF, blut=1)],
  'hinweis': [K(0, 0, 0, 'stand', y=HIDE), K(r3(bl1 - sec(L2, 0.3)), 0, 0, 'stand', y=HIDE),
              K(r3(bl1 - sec(L2, 0.3) + 0.002), DX + 0.34, DZ + 0.15, 'show', y=1.66, text='Blut', size=0.2)],
  'oberschrank': CAB0,
  **table_props(milk=False),
 },
 'freeze': fz2,
}

# ================= Option 3: ausspucken, Giftnotruf, Tabs wegräumen =================
L3 = 'explain3'
c_spuck = cue(L3, 'Spuck aus')
c_dann = cue(L3, 'Dann sofort')
c_dort = cue(L3, 'Dort erfährst')
c_atem = cue(L3, 'Hast du Atemnot')
sp0 = r3(max(sec(L3, 0.1), c_spuck - sec(L3, 0.3)))
cut1 = r3(c_dann - sec(L3, 0.15))         # Schnitt: telefonieren
cut2 = r3(c_atem - sec(L3, 0.1))          # Schnitt: Tabs in den Oberschrank
st0 = r3(cut2 + sec(L3, 0.35))
rel = r3(st0 + sec(L3, 1.0))
shut0 = r3(st0 + sec(L3, 1.15))
shut1 = r3(st0 + sec(L3, 1.7))
locked = r3(st0 + sec(L3, 2.05))
dummy3 = [K(0, DX, DZ, 'stand', DF, foam=1.1, **DUM), K(sp0, DX, DZ, 'spit', DF, foam=1.1), K(r3(sp0 + sec(L3, 0.9)), DX, DZ, 'spit', DF, foam=1.0),
          K(r3(sp0 + sec(L3, 2.6)), DX, DZ, 'spit', DF, foam=0.0), K(r3(cut1 - 0.003), DX, DZ, 'spit', DF, foam=0),
          K(cut1, DX, DZ, 'call', DF, foam=0), K(r3(cut2 - 0.003), DX, DZ, 'call', DF),
          K(cut2, SX, SZ, 'stand', SF), K(st0, SX, SZ, 'stowtabs', SF), K(1, SX, SZ, 'stowtabs', SF)]
phone3 = [K(0, PHONE[0], PHONE[1], 'lie', PHONE[2], y=TH), K(r3(cut1 - 0.002), PHONE[0], PHONE[1], 'lie', PHONE[2], y=TH), K(cut1, PHONE[0], PHONE[1], 'lie', PHONE[2], y=HIDE)]
pack3 = [K(0, PACK[0], PACK[1], 'stand', PACK[2], y=TH, lid=1), K(r3(cut2 - 0.002), PACK[0], PACK[1], 'stand', PACK[2], y=TH),
         K(cut2, SHELF[0], SHELF[2], 'stand', 180, y=HIDE, lid=0), K(r3(rel - 0.002), SHELF[0], SHELF[2], 'stand', 180, y=HIDE),
         K(rel, SHELF[0], SHELF[2], 'stand', 180, y=SHELF[1], size=-0.15), K(1, SHELF[0], SHELF[2], 'stand', 180, y=SHELF[1])]
cab3 = [K(0, CABX, CABZ, 'stand', 180, y=CABY, door=1, lock=0), K(shut0, CABX, CABZ, 'stand', 180, y=CABY, door=1, lock=0),
        K(shut1, CABX, CABZ, 'stand', 180, y=CABY, door=0, lock=0), K(r3(shut1 + sec(L3, 0.1)), CABX, CABZ, 'stand', 180, y=CABY, lock=0),
        K(locked, CABX, CABZ, 'stand', 180, y=CABY, lock=1), K(1, CABX, CABZ, 'stand', 180, y=CABY, lock=1)]
sign3 = [K(0, 0, 0, 'stand', y=HIDE), K(r3(locked - 0.002), 0, 0, 'stand', y=HIDE),
         K(locked, CABX + 0.14, CABZ + 0.42, 'show', y=CABY + 0.3, text='Kindersicherung', size=0.6, good=1)]
exp3 = {
 'camera': [cam(0, [0.4, 1.7, 3.4], [-0.28, 1.38, DZ]), cam(r3(cut1 - 0.004), [0.38, 1.68, 3.1], [-0.28, 1.38, DZ]),
            cam(cut1, [0.45, 1.72, 3.5], [-0.28, 1.38, DZ]), cam(r3(cut2 - 0.004), [0.42, 1.7, 3.2], [-0.28, 1.38, DZ]),
            cam(cut2, [0.4, 2.4, 2.4], [1.05, 1.45, -1.95]), cam(1, [0.43, 2.36, 2.15], [1.06, 1.46, -1.95])],
 'actors': {'dummy': dummy3, 'smartphone': phone3, 'tabpackung': pack3, 'oberschrank': cab3, 'hinweis': sign3,
            **table_props(pack=False, phone=False)},
 'flash': locked,
 'sfx': [{'t': r3(cut1), 'id': 'whoosh', 'volume': 0.5}, {'t': r3(cut1 + sec(L3, 0.4)), 'id': 'handy-waehlen', 'volume': 0.5},
         {'t': r3(cut2), 'id': 'whoosh', 'volume': 0.5}, {'t': r3(shut1 - sec(L3, 0.1)), 'id': 'tuer-zu', 'volume': 0.5},
         {'t': r3(locked - sec(L3, 0.05)), 'id': 'sicherung-klick', 'volume': 0.8}],
}
steps3 = [{'text': 'Reste ausspucken', 'cue': 'Spuck aus'},
          {'text': 'Kein Erbrechen', 'cue': 'Kein Erbrechen'},
          {'text': 'Keine Milch', 'cue': 'Dann sofort'},
          {'text': 'Giftnotruf: Was? Wie viel? Wann?', 'cue': 'und sagen, was du geschluckt hast'},
          {'text': 'Atemnot: 112', 'cue': 'Hast du Atemnot'}]

# ================= Outro =================
outro = {'camera': [cam(0, [0.8, 1.4, 2.4], [1.2, 1.95, -1.8]), cam(1, [0.82, 1.42, 2.15], [1.2, 1.95, -1.8])],
         'actors': {'dummy': [K(0, 1.25, -1.4, 'wave', 170, **DUM)],
                    'oberschrank': [K(0, CABX, CABZ, 'stand', 180, y=CABY, door=0, lock=1)],
                    **table_props(pack=False, phone=False)}}

DESC = ("Du hast mal wieder einen Spülmaschinentab gegessen – was machst du jetzt? 🧼 Schreib 1, 2 oder 3 in die Kommentare!\n\n"
        "Bitte nicht nachmachen: Tabs gehören nicht in den Mund. Gerade Kinder verwechseln sie leicht mit Süßigkeiten, also immer außer Reichweite aufbewahren.\n\n"
        "Quellen:\n"
        "Gesundheitsportal des Bundes, Erste Hilfe bei Vergiftungen: https://gesund.bund.de/erste-hilfe-bei-vergiftungen\n"
        "Giftnotruf Berlin (Charité), Erste Maßnahmen: https://giftnotruf.charite.de/fileadmin/user_upload/microsites/ohne_AZ/m_cc05/giftnotruf/pdf/Giftnotruf-Berlin-Info.pdf\n"
        "ADAC, Erste Hilfe bei Vergiftung: https://www.adac.de/gesundheit/gesund-unterwegs/vorsorge/erste-hilfe-bei-vergiftung/\n\n"
        "Giftnotruf z. B. Berlin: 030 19240. Im Notfall: 112.\n\n"
        "#waswürdestdutun #erstehilfe #vergiftung #giftnotruf #mythos #wusstestdu #survival #quiz")
scen = {
 'id': ID, 'category': 'erste-hilfe', 'stage': 'wohnkueche',
 'situation': {'speech': S['situation'], 'hook': S['hook'], 'warning': S['warning']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': 'Dummy führt den Finger Richtung Mund (nur angedeutet), die Schaumblasen werden mehr, Warndreieck + Pfeil vom Mund in die Lunge. Bild friert ein, rotes Aufleuchten.', 'explanation': S['e1'], 'choreography': exp1},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Dummy trinkt ein großes Glas Milch, Pfeil vom Magen zum Blut (Giftpunkte wandern mit). Bild friert ein, rotes Aufleuchten.', 'explanation': S['e2'], 'choreography': exp2},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Dummy spuckt die Reste ins Küchenpapier, telefoniert ruhig, räumt am Ende die Tabs in den Oberschrank mit Kindersicherung. Grünes Aufleuchten beim Einrasten der Kindersicherung.', 'explanation': S['e3'], 'steps': steps3, 'choreography': exp3},
 ],
 'correctOption': 3,
 'countdown': {'speech': S['countdown'], 'screen': 'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal': {'speech': S['reveal'], 'screen': 'Richtig ist Nummer 3'},
 'outro': {'speech': S['outro'], 'screen': S['outro']},
 'sourceLine': 'Quellen: gesund.bund.de · Giftnotruf Berlin (Charité)',
 'sources': [
  {'name': 'Gesundheitsportal des Bundes, Erste Hilfe bei Vergiftungen', 'url': 'https://gesund.bund.de/erste-hilfe-bei-vergiftungen'},
  {'name': 'Giftnotruf Berlin (Charité), Erste Maßnahmen', 'url': 'https://giftnotruf.charite.de/fileadmin/user_upload/microsites/ohne_AZ/m_cc05/giftnotruf/pdf/Giftnotruf-Berlin-Info.pdf'},
  {'name': 'ADAC, Erste Hilfe bei Vergiftung', 'url': 'https://www.adac.de/gesundheit/gesund-unterwegs/vorsorge/erste-hilfe-bei-vergiftung/'},
 ],
 'publishing': {
  'description': DESC,
  'pinnedComment': "Ehrlich: Wer hätte zur Milch gegriffen? 🥛👇 Und was soll der Dummy als Nächstes aus Versehen erwischen?",
 },
 'shots': {'situation': situation, 'options': options, 'countdown': countdown, 'reveal': reveal, 'outro': outro},
}
for _sh in [situation, options, countdown, reveal, outro, exp1, exp2, exp3]:
    _sh['sharpCuts'] = True
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
print('cues', dict(mund=c_mund, was=c_was, near=near, lu1=lu1, fz1=fz1, bl1=bl1, fz2=fz2, sp0=sp0, cut1=cut1, cut2=cut2, rel=rel, locked=locked),
      'audio' if dur else 'geschätzt', {k: seclen(k) for k in TEXT})
