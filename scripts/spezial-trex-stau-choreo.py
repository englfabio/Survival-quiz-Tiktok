# Hilfsskript: erzeugt scenarios/spezial-trex-stau.json (Texte Buchstabe für Buchstabe vom Inhaber) und richtet die Bewegungen
# nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/spezial-trex-stau-choreo.py [ninetys|rampen]
# Format: SPEZIAL (keine richtige Antwort). Schema wie spezial-mitbewohner-joghurt (Vorlage) / spezial-chef, Bühne "autobahn".
# Darstellung (Vorgabe Inhaber): comichaft + harmlos, niemand wird verletzt (auch der T-Rex nicht). Dinos eigenständig gestaltet.
#  A: Bau-Technik wie im Spiel erkennbar (Holzwände + Holztreppen ploppen aus dem Nichts, Bau-Rhythmus), aber Bauteile, Farben,
#     Oberflächen + Spiel-Anzeige selbst gestaltet – keine Original-Grafik, kein Logo.
#     Variante "ninetys": Wand, Wand, Treppe im Wechsel → das Auto fährt in einer engen Spirale nach oben (springt an jeder Ecke + dreht 90°,
#     die nächste Treppe entsteht unter ihm), oben über den T-Rex hinweg, auf der anderen Seite umgedrehte Treppen nach unten.
#     Variante "rampen": Rampen in einer Linie hoch, über den T-Rex hinweg, umgedrehte Treppen nach unten.
#  B: roter Knopf "URKNALL" → greller Blitz, alles zieht sich in einen Punkt zusammen, Schwärze, neuer Sternenhimmel entsteht.
#  C: drei Velociraptoren springen aus dem Gebüsch, tänzeln vor dem T-Rex, rennen über die Wiese davon, der T-Rex hinterher,
#     der Dummy fährt winkend weiter.
# Spezial-Regeln: Länge 61–66 s, keine Dopplungen, Abstimmung nur „Also, was machst du?“ + Countdown, „A, B oder C in die
# Kommentare“ nur im Outro (+ markieren + folgen), keine Logos/echten Spielgrafiken.
import json, os, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitcam_fast import fit
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID = 'spezial-trex-stau'
VARIANT = sys.argv[1] if len(sys.argv) > 1 else 'rampen'   # Ninetys getestet: Auto im engen Turm kaum zu sehen → Rampen
A_TEXT = {
 'ninetys': dict(o1c="Ninetys wie in Fortnite", o1s="A: Du baust Ninetys wie in Fortnite und fährst einfach über ihn drüber.",
                 e1="Wand, Wand, Treppe. Wand, Wand, Treppe. Mitten im Fahren, immer höher, über den T-Rex hinweg. Und auf der anderen Seite baust du dir den Weg einfach wieder runter."),
 'rampen': dict(o1c="Rampen wie in Fortnite", o1s="A: Du baust Rampen wie in Fortnite und fährst einfach über ihn drüber.",
                e1="Rampe, Rampe, Rampe. Mitten im Fahren, immer höher, über den T-Rex hinweg. Und auf der anderen Seite baust du dir den Weg einfach wieder runter."),
}[VARIANT]
S = dict(
situation="Du stehst mal wieder im Stau, weil ein T-Rex auf der Autobahn steht. Er bewegt sich keinen Zentimeter. Was machst du?",
o2c="Urknall auslösen", o2s="B: Du löst den Urknall aus. Dann gibt es auch keinen Stau mehr.",
o3c="Raptoren als Köder", o3s="C: Du schickst ein paar Velociraptoren als Köder los, die ihn weglocken.",
e2="Ein Knopf. Ein Knall. Alles fängt von vorne an. Kein T-Rex. Kein Stau. Gar nichts.",
e3="Drei Raptoren, ein Plan. Sie tänzeln vor ihm herum und rennen los. Der T-Rex hinterher. Die Autobahn ist frei.",
vote="Also, was machst du?",
outro="Schreib A, B oder C in die Kommentare, markier jemanden, dem das auch immer passiert, und folg gerne für mehr.",
**A_TEXT,
)
EXTRA = {1: 0.0, 2: 0.0, 3: 0.0}
TAIL = 0.15         # Pause nach jedem Clip (gekürzt, damit ≤ 66 s – Texte unverändert)
OUTRO_MIN = 0.0     # bei Bedarf: Schlussbild 2–3 s länger stehen lassen (Ziel ≥ 61 s)
VOTE_LEN = 5.6

LEAD = {'situation': 0.3, 'option1': 0.15, 'option2': 0.15, 'option3': 0.15, 'explain1': 0.6, 'explain2': 0.6, 'explain3': 0.6, 'countdown': 0.1, 'outro': 0.3}
MINLEN = {'situation': 5, 'explain1': 6, 'explain2': 6, 'explain3': 7, 'countdown': 5, 'outro': 3}
TEXT = {'situation': S['situation'], 'option1': S['o1s'], 'option2': S['o2s'], 'option3': S['o3s'],
        'explain1': S['e1'], 'explain2': S['e2'], 'explain3': S['e3'], 'countdown': S['vote'], 'outro': S['outro']}
vd = f'{ROOT}/public/voice/{ID}'
dur = json.load(open(f'{vd}/durations.json')) if os.path.exists(f'{vd}/durations.json') else {}
ali = json.load(open(f'{vd}/alignment.json')) if os.path.exists(f'{vd}/alignment.json') else {}
# Stimme passt nur, wenn sie zum Text der gewählten Variante gehört
if dur and 'explain1' in ali and ''.join(ali['explain1']['characters']) != TEXT['explain1']:
    dur, ali = {}, {}

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
def sec(secname, s):
    return s / seclen(secname)
r3 = lambda x: round(x, 4)
def K(t, x, z, motion, face=None, **kw):
    d = {'t': r3(max(0, min(1, t))), 'x': round(x, 3), 'z': round(z, 3), 'motion': motion}
    if face is not None: d['face'] = round(face, 2)
    d.update({k: (round(v, 3) if isinstance(v, float) else v) for k, v in kw.items()}); return d
def te(t):
    return (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def cam(t, pos, look, fov=None):
    d = {'t': round(te(max(0, min(1, t))), 4), 'pos': [round(v, 3) for v in pos], 'look': look if isinstance(look, str) else [round(v, 3) for v in look]}
    if fov: d['fov'] = fov
    return d
HIDE = -30
ANS = (100, 980, 480, 1215)
SIT = (100, 980, 280, 1215)
def body(x, z, h=1.92, w=0.3, y=0.0):
    return [[x - w, y, z], [x + w, y, z], [x, y + h, z - w], [x, y + h, z + w]]
_fits = {}
def F(points, az, el, box=ANS, push=0.06, fov=38):
    key = json.dumps([points, az, el, box, fov])
    if key not in _fits:
        r = fit(points, az, el, fov, box) or fit(points, az, el, fov, box, dmax=250)
        assert r, f'keine Kamera gefunden: {points} {az} {el}'
        _fits[key] = r
    c, l, _ = _fits[key]
    c2 = [c[i] + (l[i] - c[i]) * push for i in range(3)]
    return c, l, c2, (fov if fov != 38 else None)
def shot(t0, t1, f):
    c, l, c2, fv = f
    return [cam(t0, c, l, fv), cam(t1, c2, l, fv)]
def mshot(t0, t1, pos, look, fov=None, push=0.06):
    p2 = [pos[i] + (look[i] - pos[i]) * push for i in range(3)]
    return [cam(t0, pos, look, fov), cam(t1, p2, look, fov)]
def face_to(a, b):
    return round(math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1]))) % 360, 1)
def path(t0, t1, pts, motion, face, **kw):
    L = [0.0]
    for i in range(1, len(pts)):
        L.append(L[-1] + math.dist(pts[i - 1], pts[i]))
    out = []
    for i, p in enumerate(pts):
        f = face if face is not None else face_to(pts[max(0, i - 1)], pts[min(len(pts) - 1, max(1, i))])
        out.append(K(t0 + (t1 - t0) * L[i] / L[-1], *p, motion, f, **kw))
    return out

# ---- feste Plätze (src/stage/Highway.tsx: HIGHWAY) ----
CAR0 = (-15.0, -3.75)             # Auto des Dummys: vorderstes Auto, linke Spur, Blick +x (face 90)
JAM0 = (-15.0, 0.0)               # Stau-Figur (vorderste Reihe), Lücke für das Auto des Dummys
TREX = (9.0, 0.3)                 # T-Rex quer über allen Spuren, Kopf zum Standstreifen (+z), face 180
SEAT = dict(attach='car', y=0.0)  # Dummy im Auto (Fahrersitz)
def seat(t, motion='buckled', **kw):
    return K(t, 0.3, -0.2, motion, 0, **SEAT, **kw)
def seat_free(t, motion, **kw):    # Sitz-Bewegungen aus dem Stuhl-Baukasten (wheeltap, seatwave) im Auto
    return K(t, 0.3, -0.2, motion, 0, attach='car', y=0.02, **kw)
CAR_H = 1.6
def car_pts(x, z, y=0.0, along='x'):
    if along == 'x':
        return [[x - 1.9, y, z - 0.8], [x + 1.9, y, z + 0.8], [x, y + CAR_H, z]]
    return [[x - 0.8, y, z - 1.9], [x + 0.8, y, z + 1.9], [x, y + CAR_H, z]]
TREX_PTS = [[TREX[0] - 1.8, 0, TREX[1] - 9.0], [TREX[0] + 1.8, 0, TREX[1] + 5.4], [TREX[0], 7.2, TREX[1] + 4.6], [TREX[0], 5.5, TREX[1]]]
TREX_HEAD = [[TREX[0] - 0.9, 5.6, TREX[1] + 3.6], [TREX[0] + 0.9, 7.2, TREX[1] + 6.0]]
def trex_static(motion='bored', **kw):
    return [K(0, *TREX, motion, 180, y=0.0, **kw)]
def jam(t=0, **kw):
    return [K(t, *JAM0, 'park', 180, y=0.0, **kw)]
RAPT = ['raptor1', 'raptor2', 'raptor3']
def hide_all(a, t):
    """Figuren ausblenden (für den Bühnenwechsel in den Weltraum)"""
    for n, keys in a.items():
        last = dict(keys[-1]); last['t'] = r3(t); last['y'] = -5000; last.pop('cut', None)
        prev = dict(keys[-1]); prev['t'] = r3(t - 0.002)
        keys.extend([prev, last])

# =====================================================================================================
# Situation: Stau – T-Rex steht auf der Autobahn – gähnt – „Was machst du?“
# =====================================================================================================
L0 = 'situation'
c_weil = cue(L0, 'situation', 'weil ein')
c_er = cue(L0, 'situation', 'Er bewegt')
c_was = cue(L0, 'situation', 'Was machst')
a = {'stau': jam(rumble=0.0), 'trex': [K(0, *TREX, 'bored', 180, y=0.0), K(r3(c_er + sec(L0, 0.15)), *TREX, 'yawn', 180), K(1, *TREX, 'yawn', 180)],
     'car': [K(0, *CAR0, 'park', 90, y=0.0, mark=1)],
     'dummy': [seat_free(0, 'wheeltap', brow=1), seat_free(r3(c_was - 0.003), 'wheeltap'), seat(c_was, 'buckled', question=0, cut=True), seat(r3(c_was + sec(L0, 0.4)), 'buckled', question=1)]}
situation = {
 'camera': [
   # 1) im Stau: Dummy tippt genervt aufs Lenkrad, ringsum Autos (seitlich durchs Fahrerfenster)
   *mshot(0, r3(c_weil - 0.003), [CAR0[0] + 1.6, 1.75, CAR0[1] - 4.6], [CAR0[0] + 0.25, 1.05, CAR0[1] - 0.2], 44, push=0.12),
   # 2) weil ein T-Rex auf der Autobahn steht: hoch hinter dem Stau, Blick nach vorn zum T-Rex
   *shot(c_weil, r3(c_er - 0.003), F([[-60, 0, -5.6], [-60, 0, 5.6], [TREX[0] + 2, 0, -9], [TREX[0], 7.5, TREX[1] + 5]], 270 + 18, 22, SIT, push=0.1)),
   # 3) er bewegt sich keinen Zentimeter: T-Rex gähnt (von vorn unten, Autos klein davor)
   *shot(c_er, r3(c_was - 0.003), F(TREX_HEAD + [[TREX[0] - 2, 0, TREX[1] + 3], [TREX[0] + 2, 0, TREX[1] + 3]], 15, 6, SIT, push=0.08)),
   # 4) Was machst du? Dummy im Auto schaut fragend, T-Rex im Hintergrund
   *mshot(c_was, 1, [CAR0[0] + 3.4, 1.55, CAR0[1] - 4.2], [CAR0[0] + 0.35, 1.2, CAR0[1] - 0.15], 40, push=0.08),
 ],
 'actors': a,
 'sfx': [{'t': 0.02, 'id': 'auto-hupen', 'volume': 0.35}, {'t': r3(c_er + sec(L0, 0.3)), 'id': 't-rex-gaehnen', 'volume': 0.8}],
}

# =====================================================================================================
# Antwort A: Ninetys (Spirale) bzw. Rampen – über den T-Rex – umgedrehte Treppe runter
# =====================================================================================================
A = 'answer1'
cardA, sceneA, TA = answer_parts(1)
sA = r3(cardA / TA)
sa = lambda s: s / TA
BS, BH = 7.0, 5.25
SLOPE = math.degrees(math.atan2(BH, BS))      # 36,87°
DIRS = {0: (0, 1), 90: (1, 0), 180: (0, -1), 270: (-1, 0)}   # r → (dx, dz): r 0 = +z
def dvec(r): return DIRS[r % 360]
def facing(r):                                 # Fahrtrichtung r → face (face 0 = −z, 90 = +x, 180 = +z)
    dx, dz = dvec(r); return face_to((0, 0), (dx, dz))
pieces = []                                    # (Art, x, y, z, r, Zeit t)
def piece(kind, x, y, z, r, t):
    pieces.append((kind, x, y, z, r, t))
carA = [K(0, *CAR0, 'park', 90, y=0.0, mark=1, tilt=0)]
def ck(t, x, z, y, face, tilt, motion='drive', **kw):
    carA.append(K(t, x, z, motion, face, y=y, tilt=tilt, **kw))
HUD_SEL = []
def sel(t, s): HUD_SEL.append({'t': r3(t), 'sel': s})
Y_OFF = 0.02                                   # Auto knapp über der Bretter-Oberfläche

if VARIANT == 'ninetys':
    c_w = [cue(A, 'explain1', 'Wand', nth=i) for i in range(4)]
    c_tr = [cue(A, 'explain1', 'Treppe', nth=i) for i in range(2)]
    c_mit = cue(A, 'explain1', 'Mitten im')
    c_imm = cue(A, 'explain1', 'immer höher')
    c_ueb = cue(A, 'explain1', 'über den')
    c_hin = cue(A, 'explain1', 'hinweg')
    c_und = cue(A, 'explain1', 'Und auf')
    c_ba = cue(A, 'explain1', 'baust du')
    c_run = cue(A, 'explain1', 'runter')
    TILE = (-6.5, 4.0)
    ORDER = [0, 270, 180, 90]                  # Treppen steigen: +z, −x, −z, +x (Drehung jeweils +90°)
    LV = len(ORDER)
    def tile_pt(along_r, a_off, side_r, s_off):
        (ax, az), (sx, sz) = dvec(along_r), dvec(side_r)
        return (TILE[0] + ax * a_off + sx * s_off, TILE[1] + az * a_off + sz * s_off)
    def ramp_h(k, s):                          # Höhe auf Treppe k bei Abstand s (entlang ihrer Richtung) von der Mitte
        return k * BH + BH * (max(-BS / 2, min(BS / 2, s)) + BS / 2) / BS
    STRIP, S_LAND, S_TOP = 1.3, -1.6, 1.6
    def wall_at(k, edge_r, t):
        ex, ez = dvec(edge_r)
        piece('W', TILE[0] + ex * BS / 2, k * BH, TILE[1] + ez * BS / 2, edge_r, t)
    # ---- Zeitplan je Ebene (Wand, Wand, Treppe) ----
    lvl_t = [(c_w[0], c_w[1], c_tr[0]), (c_w[2], c_w[3], c_tr[1])]
    q = (c_imm - c_mit) / 3
    lvl_t.append((c_mit, r3(c_mit + q), r3(c_mit + 2 * q)))
    q2 = (c_ueb - c_imm) / 3
    lvl_t.append((c_imm, r3(c_imm + q2), r3(c_imm + 2 * q2)))
    for k, r in enumerate(ORDER):
        w1, w2, st = lvl_t[k]
        prev_r = ORDER[k - 1] if k > 0 else 90   # Ebene 0: Spur an der +x-Seite
        edges = [(r + 90) % 360 if k > 0 else 270, (r + 180) % 360 if k > 0 else 90]   # +d(k+1), −d(k) | Ebene 0: −x, +x
        wall_at(k, edges[0], w1); wall_at(k, edges[1], w2)
        piece('S', TILE[0], k * BH, TILE[1], r, st)
        sel(w1 - sa(0.05), 'wall'); sel(st - sa(0.05), 'stair')
    # ---- Auto: losfahren, rechts abbiegen, Treppe 0 hoch ----
    st0 = lvl_t[0][2]
    R0 = 3.2
    x_turn_end = TILE[0] + STRIP              # Spur an der +x-Seite der Treppe 0
    x_turn0 = x_turn_end - R0
    z_turn_end = CAR0[1] + R0
    t_go = r3(sA + sa(0.25))
    t_arrive = r3(st0 + sa(0.25))             # Auto erreicht den Treppenfuß kurz nach „Treppe“
    # gleichmäßig: gerade → Viertelkreis → gerade bis z 0,5 (Treppenfuß)
    seg_a = x_turn0 - CAR0[0]
    seg_b = math.pi / 2 * R0
    seg_c = (TILE[1] - BS / 2) - z_turn_end
    tot = seg_a + seg_b + seg_c
    tt = lambda d: t_go + (t_arrive - t_go) * d / tot
    ck(t_go, *CAR0, 0.0, 90, 0)
    ck(tt(seg_a), x_turn0, CAR0[1], 0.0, 90, 0)
    for i in range(1, 5):
        ang = math.pi / 2 * i / 4
        ck(tt(seg_a + seg_b * i / 4), x_turn0 + R0 * math.sin(ang), CAR0[1] + R0 * (1 - math.cos(ang)), 0.0, 90 + 90 * i / 4, 0)
    ck(t_arrive, x_turn_end, TILE[1] - BS / 2, 0.0, 180, 0)
    # ---- Spirale ----
    t_cur = t_arrive
    for k, r in enumerate(ORDER):
        prev_r = ORDER[k - 1] if k > 0 else 90
        s_from = S_LAND if k > 0 else -BS / 2 + 1.0
        p_from = tile_pt(r, s_from, prev_r, STRIP)
        p_top = tile_pt(r, S_TOP, prev_r, STRIP)
        nxt = lvl_t[k + 1] if k + 1 < LV else None
        t_top = r3(nxt[1] - sa(0.1)) if nxt else r3(c_ueb - sa(0.05))
        if k == 0:
            ck(r3(t_arrive + sa(0.18)), *p_from, ramp_h(0, s_from) + Y_OFF, facing(r), -SLOPE * 0.8)
        else:
            ck(t_cur, *p_from, ramp_h(k, s_from) + Y_OFF, facing(r), -SLOPE)
        ck(t_top, *p_top, ramp_h(k, S_TOP) + Y_OFF, facing(r), -SLOPE)
        if nxt:
            # Sprung + Drehung um 90°, die nächste Treppe entsteht unter dem Auto
            r2 = ORDER[k + 1]
            land = tile_pt(r2, S_LAND, r, STRIP)
            apex_t = r3(nxt[2] + sa(0.04))
            y_land = ramp_h(k + 1, S_LAND) + Y_OFF
            mid = ((p_top[0] + land[0]) / 2 + dvec(r)[0] * 0.5, (p_top[1] + land[1]) / 2 + dvec(r)[1] * 0.5)
            f_mid = (facing(r) + 45 + (360 if facing(r) + 45 < facing(r) else 0))
            ck(apex_t, *mid, y_land + 1.3, facing(r) + 60, -12)
            t_cur = r3(apex_t + sa(0.2))
            ck(t_cur, *land, y_land, facing(r2) if facing(r2) > facing(r) else facing(r2) + 360, -SLOPE)
    # ---- oben: Kuppe, über den T-Rex, umgedrehte Treppen nach unten (entlang +x) ----
    top_r = ORDER[-1]                          # +x
    side_r = ORDER[-2]                         # Spur an der −z-Seite
    k_top = LV
    z_lane = tile_pt(top_r, 0, side_r, STRIP)[1]
    x_edge = TILE[0] + BS / 2
    H_TOP = LV * BH
    n_down = LV
    t_crest = r3(c_hin - sa(0.05))
    t_ground = r3(c_run + sa(0.35))
    down_len = n_down * BS
    for j in range(n_down):
        xc = x_edge + BS * (j + 0.5)
        t_need = t_crest + (t_ground - t_crest) * (j * BS) / down_len
        piece('D', xc, H_TOP - (j + 1) * BH, TILE[1], 90, r3(min(t_need - sa(0.45), c_ueb + sa(0.15) * j) if j == 0 else t_need - sa(0.45)))
        sel(r3((min(t_need - sa(0.45), c_ueb) if j == 0 else t_need - sa(0.45)) - sa(0.05)), 'stair')
    ck(t_crest, x_edge + 0.6, z_lane, H_TOP + 0.35, 90, 0)
    for j in range(1, n_down + 1):
        x = x_edge + BS * j
        ck(r3(t_crest + (t_ground - t_crest) * j / n_down), x if j < n_down else x + 1.2, z_lane, H_TOP - j * BH + Y_OFF + (0 if j < n_down else -Y_OFF), 90, SLOPE if j < n_down else 0)
    ck(r3(min(0.999, t_ground + sa(1.6))), x_edge + down_len + 16, z_lane, 0.0, 90, 0)
    ck(1, x_edge + down_len + 17, z_lane, 0.0, 90, 0, motion='park')
    sel(r3(t_ground), '')
    T_HUD = (r3(sA - sa(0.6)), r3(min(1.0, t_ground + sa(0.5))))
else:
    # ------------------------- Variante Rampen: in einer Linie -------------------------
    c_r = [cue(A, 'explain1', 'Rampe', nth=i) for i in range(3)]
    c_mit = cue(A, 'explain1', 'Mitten im')
    c_imm = cue(A, 'explain1', 'immer höher')
    c_ueb = cue(A, 'explain1', 'über den')
    c_hin = cue(A, 'explain1', 'hinweg')
    c_ba = cue(A, 'explain1', 'baust du')
    c_run = cue(A, 'explain1', 'runter')
    Z_L = CAR0[1]
    X0 = -11.0                                  # Fuß der ersten Rampe
    n_up = 3
    for i in range(n_up):
        t_i = c_r[i] if i < 3 else c_imm
        piece('S', X0 + BS * (i + 0.5), i * BH, Z_L, 90, t_i)
        sel(t_i - sa(0.05), 'stair')
    x_top = X0 + n_up * BS
    H_TOP = n_up * BH
    t_go = r3(sA + sa(0.2))
    ck(t_go, *CAR0, 0.0, 90, 0)
    t_base = r3(c_r[0] + sa(0.35))
    ck(t_base, X0 - 1.0, Z_L, 0.0, 90, 0)
    t_top = r3(c_hin - sa(0.05))
    ck(r3(t_base + sa(0.15)), X0 + 0.8, Z_L, BH * 0.8 / BS + Y_OFF, 90, -SLOPE)
    ck(t_top, x_top - 0.4, Z_L, H_TOP - 0.3 + Y_OFF, 90, -SLOPE)
    t_ground = r3(c_run + sa(0.35))
    n_down = n_up
    for j in range(n_down):
        t_need = t_top + (t_ground - t_top) * j / n_down
        piece('D', x_top + BS * (j + 0.5), H_TOP - (j + 1) * BH, Z_L, 90, r3(t_need - sa(0.45)))
        sel(r3(t_need - sa(0.5)), 'stair')
    ck(r3(t_top + sa(0.12)), x_top + 0.6, Z_L, H_TOP + 0.3, 90, 0)
    for j in range(1, n_down + 1):
        ck(r3(t_top + (t_ground - t_top) * j / n_down), x_top + BS * j + (1.2 if j == n_down else 0), Z_L, H_TOP - j * BH + (Y_OFF if j < n_down else 0), 90, SLOPE if j < n_down else 0)
    ck(r3(min(0.999, t_ground + sa(1.6))), x_top + BS * n_down + 16, Z_L, 0.0, 90, 0)
    ck(1, x_top + BS * n_down + 17, Z_L, 0.0, 90, 0, motion='park')
    sel(r3(t_ground), '')
    T_HUD = (r3(sA - sa(0.6)), r3(min(1.0, t_ground + sa(0.5))))
    TILE = (X0 + BS * 1.5, Z_L)
    LV = n_up

carA.sort(key=lambda k: k['t'])
# Bau-Figur: Teile nach Zeit sortiert, fill-Schritte
pieces.sort(key=lambda p: p[5])
txt = ';'.join(f'{k} {x:.2f} {y:.2f} {z:.2f} {r}' for k, x, y, z, r, _ in pieces)
POP = 0.28
bau = [K(0, 0, 0, 'park', 180, y=0.0, fill=0.0, text=txt)]
for i, p in enumerate(pieces):
    t0 = max(p[5], bau[-1]['t'] + 0.002)
    bau += [K(r3(t0), 0, 0, 'park', 180, fill=float(i)), K(r3(t0 + sa(POP)), 0, 0, 'park', 180, fill=float(i + 1))]
bau.sort(key=lambda k: k['t'])
for i in range(1, len(bau)):
    if bau[i]['t'] <= bau[i - 1]['t']: bau[i]['t'] = r3(bau[i - 1]['t'] + 0.001)
# Dummy fährt (angeschnallt), am Ende Faust hoch? → winkt aus dem Auto
dummyA = [seat(0, 'buckled'), seat(r3(T_HUD[1] - 0.003), 'buckled'), seat_free(T_HUD[1], 'seatwave'), seat_free(1, 'seatwave')]
def car_at(t):
    for i in range(len(carA) - 1):
        a0, a1 = carA[i], carA[i + 1]
        if a0['t'] <= t <= a1['t']:
            u = (t - a0['t']) / max(1e-6, a1['t'] - a0['t'])
            return [a0[c] + (a1[c] - a0[c]) * u for c in ('x', 'y', 'z')]
    return [carA[-1]['x'], carA[-1]['y'], carA[-1]['z']]
trexA = [K(0, *TREX, 'bored', 180, y=0.0), K(r3(c_ueb - sa(0.6)), *TREX, 'gaze', 180, pitch=0, turn=0),
         K(r3(c_hin + sa(0.4)), *TREX, 'gaze', 180, pitch=35, turn=-60), K(r3(t_ground), *TREX, 'gaze', 180, pitch=20, turn=-110), K(1, *TREX, 'gaze', 180, pitch=10, turn=-140)]
aA = {'stau': jam(), 'car': carA, 'dummy': dummyA, 'trex': trexA, 'bau': bau}
TOWER_H = LV * BH
TOWER_PTS = [[TILE[0] - BS / 2, 0, TILE[1] - BS / 2], [TILE[0] + BS / 2, 0, TILE[1] + BS / 2], [TILE[0], TOWER_H + 2, TILE[1]]]
if VARIANT == 'ninetys':
    t1 = lvl_t[0][2]; t2 = lvl_t[1][2]
    camA = [
      # Karte: Stau von der Seite, Auto vorn links, T-Rex dahinter
      *shot(0, r3(sA - 0.003), F(car_pts(*CAR0) + [[CAR0[0] - 8, 0, 3.75], [TREX[0], 7.0, TREX[1] + 4]], 340, 8, push=0.05)),
      # 1) Wand, Wand, Treppe: Auto biegt ab, erste Ebene entsteht (Kamera vorn rechts, etwas erhöht)
      *shot(sA, r3(c_w[2] - 0.003), F([[TILE[0] - 3.5, 0, TILE[1] - 3.5], [TILE[0] + 3.5, 0, TILE[1] + 3.5], [TILE[0], BH + 1.0, TILE[1]]] + car_pts(CAR0[0] + 3, CAR0[1]), 330, 14, push=0.08)),
      # 2) Wand, Wand, Treppe: Auto springt + dreht, zweite Ebene entsteht (von schräg oben in den Turm hinein)
      *shot(c_w[2], r3(c_mit - 0.003), F([[TILE[0] - 3.5, 0, TILE[1] - 3.5], [TILE[0] + 3.5, 0, TILE[1] + 3.5], [TILE[0], 2 * BH + 2.0, TILE[1]]], 30, 38, push=0.08)),
      # 3) Mitten im Fahren, immer höher: ganzer Turm, Kamera steigt mit
      cam(c_mit, *F(TOWER_PTS, 15, 22)[:2]), cam(r3(c_ueb - 0.003), *F(TOWER_PTS, 25, 36)[:2]),
      # 4) über den T-Rex hinweg: von der Seite tief, Blick nach oben – Auto fährt hoch über ihn
      *shot(c_ueb, r3(c_und - 0.003), F([[TILE[0] + 2, TOWER_H + 1.5, TILE[1]], [TREX[0] + 4, TOWER_H - 2 * BH, TILE[1]], [TREX[0], 0, TREX[1] + 5], [TREX[0], 7.2, TREX[1] + 4.5]], 355, 4, push=0.05)),
      # 5) auf der anderen Seite runter: von vorn rechts, Treppen entstehen vor dem Auto
      *shot(c_und, 1, F([[TILE[0] + 3.5, TOWER_H, TILE[1]], [TILE[0] + 3.5 + BS * LV + 10, 0, TILE[1]], [TREX[0], 7, TREX[1] + 4]], 25, 12, push=0.06)),
    ]
else:
    LINE_UP = [[X0 - 1, 0, CAR0[1] - 3.5], [x_top, 0, CAR0[1] + 3.5], [x_top, H_TOP + 1.5, CAR0[1]]]
    camA = [
      *shot(0, r3(sA - 0.003), F(car_pts(*CAR0) + [[CAR0[0] - 8, 0, 3.75], [TREX[0], 7.0, TREX[1] + 4]], 340, 8, push=0.05)),
      # 1) Rampe, Rampe, Rampe: Rampen ploppen vor dem Auto auf
      *shot(sA, r3(c_mit - 0.003), F(car_pts(*CAR0) + [[X0 - 1, 0, CAR0[1] - 3.5], [X0 + BS * 2, BH * 2, CAR0[1] + 3.5]], 325, 12, push=0.08)),
      # 2) Mitten im Fahren, immer höher: ganze Rampe von der Seite, T-Rex daneben
      *shot(c_mit, r3(c_ueb - 0.003), F(LINE_UP + [[TREX[0], 7.2, TREX[1] + 4.5]], 345, 10, push=0.08)),
      # 3) über den T-Rex hinweg: tief neben dem T-Rex, Blick nach oben
      *shot(c_ueb, r3(c_ba - 0.003), F([[x_top - 5, H_TOP + 1.6, CAR0[1]], [x_top + 5, H_TOP - 4, CAR0[1]], [TREX[0], 0, TREX[1] + 5], [TREX[0], 7.2, TREX[1] + 4.5]], 5, 3, push=0.05)),
      # 4) auf der anderen Seite runter
      *shot(c_ba, 1, F([[x_top, H_TOP, CAR0[1]], [x_top + BS * 3 + 10, 0, CAR0[1]], [TREX[0], 7, TREX[1] + 4]], 25, 12, push=0.06)),
    ]
klacks = [{'t': r3(p[5] + sa(0.08)), 'id': 'bau-klack', 'volume': 0.7} for p in pieces]
expA = {
 'camera': camA,
 'actors': aA,
 'hud': list(T_HUD), 'hudSel': HUD_SEL,
 'sfx': [{'t': r3(sA + sa(0.1)), 'id': 'auto-motor', 'volume': 0.6}] + klacks + [{'t': r3(c_hin), 'id': 'staunen', 'volume': 0.35}, {'t': r3(t_ground), 'id': 'auto-landung', 'volume': 0.7}],
}

# =====================================================================================================
# Antwort B: Knopf URKNALL – Blitz – alles zieht sich zusammen – Schwärze – neuer Sternenhimmel
# =====================================================================================================
B = 'answer2'
cardB, sceneB, TB = answer_parts(2)
sB = r3(cardB / TB)
sb = lambda s: s / TB
c_knopf = cue(B, 'explain2', 'Ein Knopf')
c_knall = cue(B, 'explain2', 'Ein Knall')
c_alles = cue(B, 'explain2', 'Alles fängt')
c_kein = cue(B, 'explain2', 'Kein T-Rex')
c_kst = cue(B, 'explain2', 'Kein Stau')
c_gar = cue(B, 'explain2', 'Gar nichts')
D_B = (CAR0[0] + 3.6, CAR0[1])               # Dummy steht vor seinem Auto, Blick +x (zum T-Rex)
BTN = (D_B[0] + 0.5, D_B[1])                 # Knopf 0,5 m vor ihm
PRESS_HIT = 0.72
pr0 = r3(c_knall - sb(PRESS_HIT) + sb(0.05))
t_hit = r3(pr0 + sb(PRESS_HIT))
imp0 = t_hit
imp1 = r3(t_hit + sb(0.75))
imp2 = r3(t_hit + sb(1.05))
dummyB = [K(0, D_B[0] - 0.4, D_B[1] + 0.2, 'stand', 90, y=0.0), K(r3(sb(0.6)), D_B[0] - 0.4, D_B[1] + 0.2, 'stand', 100, question=1),
          K(r3(sB - 0.003), D_B[0] - 0.4, D_B[1] + 0.2, 'stand', 100, question=0),
          K(sB, *D_B, 'stand', 90, cut=True, question=0), K(r3(pr0 - 0.003), *D_B, 'stand', 90), K(pr0, *D_B, 'pressbutton', 90), K(1, *D_B, 'pressbutton', 90)]
knopf = [K(0, *BTN, 'park', 270, y=HIDE, text='URKNALL'), K(r3(sb(0.25)), *BTN, 'park', 270, y=HIDE),
         K(r3(sb(0.27)), *BTN, 'park', 270, y=0.0, press=0, glow=0.3), K(r3(t_hit - sb(0.02)), *BTN, 'park', 270, press=0, glow=0.4),
         K(t_hit, *BTN, 'park', 270, press=1, glow=1)]
aB = {'stau': jam(), 'trex': trex_static('bored'), 'car': [K(0, *CAR0, 'park', 90, y=0.0, mark=1, door=0.9)], 'dummy': dummyB, 'knopf': knopf}
hide_all(aB, imp2)
aB['urknall'] = [K(0, 0, 0, 'park', 180, y=HIDE, fill=0), K(r3(imp2 - 0.002), 0, 0, 'park', 180, y=HIDE, fill=0),
                 K(imp2, 0, 0, 'park', 180, y=0.0, fill=0.0), K(r3(imp2 + sb(0.5)), 0, 0, 'park', 180, fill=0.13), K(1, 0, 0, 'park', 180, fill=1.0)]
BTN_PTS = [[BTN[0] - 0.4, 0, BTN[1] - 0.4], [BTN[0] + 0.4, 1.05, BTN[1] + 0.4]]
camB = [
  # Karte: Dummy steht neben seinem Auto, Knopf ploppt auf, T-Rex dahinter
  *shot(0, r3(sB - 0.003), F(body(D_B[0] - 0.4, D_B[1] + 0.2) + BTN_PTS + car_pts(*CAR0), 70, 8, push=0.05)),
  # 1) Ein Knopf: nah von der Seite, Schild URKNALL lesbar
  *mshot(sB, r3(c_knall - 0.003), [BTN[0] + 0.15, 0.95, BTN[1] + 1.55], [BTN[0], 0.62, BTN[1]], 42, push=0.1),
  # 2) Ein Knall: Dummy drückt (Knopf in Bildmitte = Mitte des Zusammenziehens)
  *mshot(c_knall, imp2, [D_B[0] + 0.5, 1.25, D_B[1] + 3.6], [BTN[0] - 0.1, 0.95, BTN[1]], 46, push=0.05),
  # 3) Alles fängt von vorne an: neuer Sternenhimmel entsteht (Weltraum)
  cam(r3(imp2 + 0.002), [0, 6, 120], [0, 0, 0], 50), cam(r3(c_kein - 0.003), [0, 10, 95], [0, 0, 0], 50),
  # 4) Kein T-Rex. Kein Stau.: Flug durch die neuen Galaxien
  *mshot(c_kein, r3(c_gar - 0.003), [-30, 18, 60], [10, 0, -20], 55, push=0.12),
  # 5) Gar nichts.: weit, ruhig
  *mshot(c_gar, 1, [20, -10, 150], [0, 0, 0], 48, push=0.05),
]
expB = {
 'camera': camB,
 'actors': aB,
 'stage': [{'t': 0, 'stage': 'autobahn'}, {'t': imp2, 'stage': 'weltraum'}],
 'implode': [imp0, imp1, imp2],
 'sfx': [{'t': r3(sb(0.25)), 'id': 'plopp', 'volume': 0.6}, {'t': r3(t_hit - sb(0.03)), 'id': 'knopf-druecken', 'volume': 0.8},
         {'t': r3(t_hit), 'id': 'urknall', 'volume': 0.9}],
}

# =====================================================================================================
# Antwort C: Raptoren als Köder – tänzeln – rennen weg, T-Rex hinterher – Dummy fährt winkend weiter
# =====================================================================================================
C = 'answer3'
cardC, sceneC, TC = answer_parts(3)
sC = r3(cardC / TC)
sc = lambda s: s / TC
c_drei = cue(C, 'explain3', 'Drei Raptoren')
c_plan = cue(C, 'explain3', 'ein Plan')
c_sie = cue(C, 'explain3', 'Sie tänzeln')
c_renn = cue(C, 'explain3', 'und rennen')
c_der = cue(C, 'explain3', 'Der T-Rex')
c_die = cue(C, 'explain3', 'Die Autobahn')
from_bush = {'raptor1': (-3.2, 10.1), 'raptor2': (0.6, 10.5), 'raptor3': (4.2, 10.0)}
dance_at = {'raptor1': (TREX[0] - 2.4, TREX[1] + 7.4), 'raptor2': (TREX[0] + 0.3, TREX[1] + 8.4), 'raptor3': (TREX[0] + 2.6, TREX[1] + 7.2)}
run_to = {'raptor1': (TREX[0] - 8, 55), 'raptor2': (TREX[0] + 1, 60), 'raptor3': (TREX[0] + 9, 54)}
aC = {'stau': jam(), 'car': [], 'dummy': [], 'trex': []}
lp0 = r3(c_drei + sc(0.1))
for i, n in enumerate(RAPT):
    b = from_bush[n]; d = dance_at[n]; e = run_to[n]
    l0 = r3(lp0 + sc(0.18) * i)
    l1 = r3(l0 + sc(0.75))
    mid = ((b[0] + d[0]) / 2, (b[1] + d[1]) / 2)
    keys = [K(0, *b, 'hide', 0, y=0.0), K(r3(l0 - 0.003), *b, 'hide', face_to(b, d)),
            K(l0, *b, 'leap', face_to(b, d), y=0.0), K(r3((l0 + l1) / 2), *mid, 'leap', face_to(b, d), y=1.6), K(l1, *d, 'leap', face_to(b, d), y=0.0),
            K(r3(l1 + 0.002), *d, 'dance', 0 + (i - 1) * 15, y=0.0), K(r3(c_renn - 0.003), *d, 'dance', 0 + (i - 1) * 15)]
    run0 = r3(c_renn + sc(0.05 * i))
    keys += [K(run0, *d, 'sprint', face_to(d, e)), K(r3(run0 + sc(0.5)), d[0] + (e[0] - d[0]) * 0.06, 9.6, 'leap', face_to(d, e), y=1.2),
             K(r3(run0 + sc(0.85)), d[0] + (e[0] - d[0]) * 0.12, 12.5, 'sprint', face_to(d, e), y=0.0), K(1, *e, 'sprint', face_to(d, e))]
    aC[n] = keys
tr0 = r3(c_der - sc(0.15))
aC['trex'] = [K(0, *TREX, 'bored', 180, y=0.0), K(r3(c_sie - sc(0.2)), *TREX, 'gaze', 180, pitch=-25, turn=0),
              K(r3(c_renn - 0.003), *TREX, 'gaze', 180, pitch=-30, turn=15), K(tr0, *TREX, 'chase', 180, pitch=0, turn=0),
              K(1, TREX[0], 62, 'chase', 180)]
# Dummy fährt winkend weiter (ab „Die Autobahn ist frei“)
dr0 = r3(c_die - sc(0.2))
aC['car'] = [K(0, *CAR0, 'park', 90, y=0.0, mark=1), K(r3(dr0 - 0.003), *CAR0, 'park', 90), K(dr0, *CAR0, 'drive', 90), K(1, CAR0[0] + 34, CAR0[1], 'drive', 90)]
aC['dummy'] = [seat(0, 'buckled'), seat(r3(c_renn), 'buckled'), seat_free(r3(c_renn + 0.002), 'seatwave'), seat_free(1, 'seatwave')]
BUSH_PTS = [[-4.5, 0, 10.5], [5.5, 0, 12.6], [0.6, 1.6, 12.1]]
camC = [
  # Karte: Gebüsch am Rand, drei Raptoren lugen hervor, T-Rex-Kopf darüber
  *shot(0, r3(sC - 0.003), F([[-4.2, 0, 9.6], [5.2, 0, 10.6], [0.6, 1.5, 10.5]], 185, 6, push=0.06)),
  # 1) Drei Raptoren, ein Plan.: sie springen aus dem Gebüsch über die Leitplanke
  *shot(sC, r3(c_sie - 0.003), F(BUSH_PTS + [[d[0], 0, d[1]] for d in dance_at.values()], 20, 8, push=0.06)),
  # 2) Sie tänzeln vor ihm herum: tief vor dem T-Rex, Raptoren vorn, T-Rex schaut hinunter
  *shot(c_sie, r3(c_renn - 0.003), F([p for d in dance_at.values() for p in body(d[0], d[1], 1.3)] + TREX_HEAD, 90, 5, push=0.06)),
  # 3) und rennen los. Der T-Rex hinterher.: von der Seite, alle laufen über die Wiese davon
  *mshot(c_renn, r3(c_die - 0.003), [TREX[0] + 26, 6.0, 14], [TREX[0] - 2, 3.0, 22], 50, push=0.08),
  # 4) Die Autobahn ist frei: Dummy fährt winkend weiter (von vorn seitlich)
  cam(c_die, [TREX[0] - 6, 1.7, -13.0], 'car', 46), cam(1, [TREX[0] - 5, 1.7, -12.5], 'car', 46),
]
stomps = [{'t': r3(tr0 + sc(0.1)), 'id': 't-rex-stampfen', 'volume': 0.75}]
expC = {
 'camera': camC,
 'actors': aC,
 'sfx': [{'t': r3(lp0), 'id': 'laub-rascheln', 'volume': 0.6}, {'t': r3(lp0 + sc(0.2)), 'id': 'raptor-kreischen', 'volume': 0.6},
         {'t': r3(c_sie + sc(0.3)), 'id': 'raptor-kreischen', 'volume': 0.55}] + stomps + [{'t': r3(dr0 + sc(0.05)), 'id': 'auto-motor', 'volume': 0.5}],
}

# =====================================================================================================
# Abstimmung: alle stehen, Kamera tief + ruhig
# =====================================================================================================
VP = {'dummy': (-10.0, 5.8), 'raptor1': (-12.4, 6.2), 'raptor2': (-7.6, 6.2), 'raptor3': (-8.9, 4.0)}
TV = (-5.5, -1.8)   # T-Rex dahinter (Abstimmung/Outro)
aV = {'stau': jam(), 'car': [K(0, *CAR0, 'park', 90, y=0.0, mark=1)], 'trex': [K(0, *TV, 'stand', 215, y=0.0, pitch=-10)]}
aV['dummy'] = [K(0, *VP['dummy'], 'stand', 170, y=0.0, question=1)]
for i, n in enumerate(RAPT):
    aV[n] = [K(0, *VP[n], 'stand', 180 + (i - 1) * 12, y=0.0)]
vote = {'camera': mshot(0, 1, [-13.4, 3.6, 17.6], [-9.8, 2.0, 4.6], 50, push=0.04),
        'actors': aV}

# =====================================================================================================
# Outro: alle winken / tänzeln, T-Rex gähnt
# =====================================================================================================
aO = {'stau': jam(), 'car': [K(0, *CAR0, 'park', 90, y=0.0, mark=1)],
      'trex': [K(0, *TV, 'stand', 215, y=0.0), K(0.25, *TV, 'yawn', 215), K(1, *TV, 'yawn', 215)]}
aO['dummy'] = [K(0, *VP['dummy'], 'stand', 175, y=0.0), K(0.15, *VP['dummy'], 'wave', 175), K(1, *VP['dummy'], 'wave', 175)]
for i, n in enumerate(RAPT):
    aO[n] = [K(0, *VP[n], 'stand', 180, y=0.0), K(0.1 + 0.08 * i, *VP[n], 'dance', 180), K(1, *VP[n], 'dance', 180)]
outro = {'camera': mshot(0, 1, [-13.6, 3.8, 20.5], [-9.8, 0.2, 4.6], 50, push=0.05),
         'actors': aO, 'sfx': [{'t': 0.3, 'id': 't-rex-gaehnen', 'volume': 0.45}]}
if OUTRO_MIN > 0:
    outro['fade'] = [round(1 - 1.6 / OUTRO_MIN, 3), 0.99, 0.85]

DESC = ("Du stehst mal wieder im Stau, weil ein T-Rex auf der Autobahn steht – was machst du? 🦖 Schreib A, B oder C in die Kommentare!\n\n"
        "Nur zum Spaß. 😄\n\n"
        "#waswürdestdutun #trex #dino #stau #autobahn #fortnite #spezial #comedy\n\n"
        "Hinweis: Das gesamte Video ist KI-generiert. Nicht mit Epic Games verbunden.")
A_ACTION = {
 'ninetys': 'Das Auto fährt aus dem Stau los und baut sich mitten im Fahren eine enge Spirale aus Holzwänden und Holztreppen (Wand, Wand, Treppe – Teile ploppen als blaue Bau-Vorschau auf und werden zu Holz, selbst gestaltet, keine Original-Grafik). An jeder Ecke springt es hoch, dreht sich um 90°, und die nächste Treppe entsteht darunter. Oben fährt es über den T-Rex hinweg und baut sich auf der anderen Seite umgedrehte Treppen nach unten. Dazu eine selbst gestaltete Spiel-Anzeige (Lebensbalken, leeres Inventar, Minikarte, Bau-Auswahl).',
 'rampen': 'Das Auto fährt aus dem Stau los und baut sich mitten im Fahren Rampen aus Holz (ploppen als blaue Bau-Vorschau auf und werden zu Holz, selbst gestaltet, keine Original-Grafik), fährt immer höher über den T-Rex hinweg und baut sich auf der anderen Seite umgedrehte Treppen nach unten. Dazu eine selbst gestaltete Spiel-Anzeige.',
}[VARIANT]
scen = {
 'id': ID, 'format': 'spezial', 'category': 'spezial', 'stage': 'autobahn', 'padAfter': TAIL,
 'situation': {'speech': S['situation']},
 'options': [
  {'card': S['o1c'], 'speech': S['o1s'], 'dummyAction': A_ACTION, 'explanation': S['e1'], 'sceneExtra': EXTRA[1], 'choreography': expA},
  {'card': S['o2c'], 'speech': S['o2s'], 'dummyAction': 'Der Dummy steht neben seinem Auto, ein großer roter Knopf mit der Aufschrift URKNALL ploppt auf. Er drückt ihn: greller Lichtblitz, alles zieht sich in einen leuchtenden Punkt zusammen, Schwärze, dann entsteht ein neuer Sternenhimmel mit Galaxien. Kein T-Rex, kein Stau.', 'explanation': S['e2'], 'sceneExtra': EXTRA[2], 'choreography': expB},
  {'card': S['o3c'], 'speech': S['o3s'], 'dummyAction': 'Drei bunte, gefiederte Velociraptoren springen aus dem Gebüsch, tänzeln frech vor dem T-Rex herum und rennen über die Wiese davon. Der T-Rex jagt ihnen hinterher (niemand wird verletzt), die Autobahn ist frei und der Dummy fährt winkend weiter.', 'explanation': S['e3'], 'sceneExtra': EXTRA[3], 'choreography': expC},
 ],
 'countdown': {'speech': S['vote'], 'screen': 'Stimm ab!'},
 'outro': {'speech': S['outro'], 'screen': 'Kommentieren & folgen!'},
 'publishing': {'description': DESC, 'pinnedComment': 'Ich bin Team ___. Und du? 👇'},
 'shots': {'situation': situation, 'countdown': vote, 'outro': outro},
}
if OUTRO_MIN > 0: scen['outroMin'] = OUTRO_MIN
for _sh in [situation, vote, outro, expA, expB, expC]:
    _sh['sharpCuts'] = True
    for keys in _sh['actors'].values():
        keys.sort(key=lambda k: k['t'])
        y = None
        for k in keys:
            if 'y' in k: y = k['y']
            elif y is not None and not k.get('attach'): k['y'] = y
json.dump(scen, open(f'{ROOT}/scenarios/{ID}.json', 'w'), ensure_ascii=False, indent=2)
total = seclen('situation') + TA + TB + TC + seclen('countdown') + seclen('outro')
print('Variante', VARIANT, '| Länge', round(total, 1), 's', 'audio' if dur else 'geschätzt',
      {'situation': seclen('situation'), 'A': (cardA, sceneA), 'B': (cardB, sceneB), 'C': (cardC, sceneC), 'vote': seclen('countdown'), 'outro': seclen('outro')})
print('A Teile', len(pieces), 'Boden erreicht', round(t_ground * TA, 2), 's von', round(TA, 2))
print('B Knopf', round(t_hit * TB, 2), 'schwarz', round(imp2 * TB, 2))
if total < 61: print('ACHTUNG: unter 61 s – Szenen verlängern / Schlussbild stehen lassen')
if total > 66: print('ACHTUNG: über 66 s – Pausen kürzen')
