# Hilfsskript: erzeugt einen Auftrag für scripts/stills.mjs mit je einem Standbild pro Kamera-Einstellung (Mitte jedes Schnitts)
# Aufruf: python3 scripts/shot-stills.py <id> <ausgabeordner> [--scale 0.5] > auftrag.json
import json, math, subprocess, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sid, outdir = sys.argv[1], sys.argv[2]
scale = float(sys.argv[sys.argv.index('--scale') + 1]) if '--scale' in sys.argv else 0.5
sc = json.load(open(f'{ROOT}/scenarios/{sid}.json'))
fr = json.loads(subprocess.check_output(['node', '--experimental-strip-types', '--no-warnings', f'{ROOT}/scripts/frames.ts', sid], cwd=ROOT).decode().strip().splitlines()[-1])
te = lambda t: (0.5 - 0.5 * math.cos(math.pi * t)) * 0.35 + t * 0.65
def inv(v):
    lo, hi = 0.0, 1.0
    for _ in range(50):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if te(m) < v else (lo, m)
    return lo
jobs = []
for s in fr:
    k = s['kind']
    if k.startswith('answer'):
        sh = sc['options'][int(k[-1]) - 1]['choreography']
    else:
        sh = sc['shots']['countdown' if k == 'vote' else k]
    cams = sh['camera']
    # Einstellungen = Paare (Start, Ende) zwischen harten Schnitten
    bounds = [0.0]
    for a, b in zip(cams, cams[1:]):
        if b['t'] - a['t'] < 0.012: bounds.append((a['t'] + b['t']) / 2)
    bounds.append(1.0)
    for i in range(len(bounds) - 1):
        t = inv((bounds[i] + bounds[i + 1]) / 2) if True else 0
        f = s['from'] + int(t * (s['duration'] - 1))
        jobs.append({'comp': sid, 'frame': f, 'out': f'{outdir}/{k}-{i + 1}-f{f}.png', 'scale': scale})
print(json.dumps(jobs, indent=1))
