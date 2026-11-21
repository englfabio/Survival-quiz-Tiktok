import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {canvasTex, fitText, TextPlane} from './WgProps';
import {T} from '../ui/theme';

/**
 * Spezial „Cookies akzeptiert“ – alles comichaft und harmlos, Low-Poly-Cartoon-Stil, KEINE Marken/Logos.
 *
 *  - LegPhone ("cookiehandy"): markenloses Smartphone (comichaft groß: 0,12 × 0,24 m) mit Bildschirm (Feld `text`):
 *      'banner' = erfundene Website „NEWS“ mit Cookie-Banner + grünem Knopf „ALLE AKZEPTIEREN“, 'ok' = grüner Haken „AKZEPTIERT“,
 *      'cookies' = lauter bunte Kekse, 'many' = viele Cookie-Banner übereinander, 'off' = dunkel.
 *      Ursprung = Boden unter den Füßen (stehend) bzw. untere Kante (liegend). Stehend zeigt der Bildschirm nach +z (Laufrichtung).
 *      Werte: `tilt` 90 = liegt flach (Bildschirm nach oben, Oberkante zeigt nach −z), 0 = steht aufrecht; `legs` 0 … 1 = Low-Poly-Beine
 *      wachsen (0,2 m); Bewegung `run` = trippelt (Beine im Takt), `glow` = Bildschirm leuchtet kurz auf, `rumble` = zittert.
 *  - MilkBowl ("milchschuessel"): hellblaue Müslischüssel (Ø 0,22 m, 0,08 m hoch) mit Milch; `fill`, `mark` = Wellenringe (frisch hineingeplumpst).
 *  - Cookie ("keks1" … "keks8"): bunter Schoko-Keks (Ø 0,09 m), Farbe nach Nummer; `size`, `tilt` = Drehung (Flug), `glow` = leuchtet digital.
 *  - CookieHeap ("kekshaufen"): Haufen aus bunten Riesen-Keksen. CookieBurst ("keksregen", Bewegung `burst`): Kekse fliegen im Bogen heraus.
 *  - FolderStack ("ordnerstapel"): Stapel liegender Aktenordner mit Etikett „DATEN“ (Feld `text`, Standard DATEN), `fill` = Anzahl (1 … 6).
 *  - DataBinder ("datenordner"): großer stehender Ordner, Deckel mit Etikett „DATEN“ zeigt nach ±x (Seiten), `size`.
 *  - Magnifier ("lupe"): Lupe; Ursprung = Griff, Glas vorn (+z) – in der Hand mit `hand` 1 + `holder`.
 *  - TugRope ("tauziehseil"): dickes Seil entlang z (Länge 2,6 m, Mitte = Ursprung) mit rotem Band + Daten-Ordner in der Mitte; `rumble` = ruckelt.
 *  - FightCloud ("raufwolke"): Comic-Rauferei-Wolke (graue Knäuel-Wolke, Sternchen, Kekse fliegen heraus); `fill` 0 … 1 = Größe.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

export const COOKIE_COLORS = ['#d9a35b', '#f29ab8', '#8fd16a', '#7fb6f0', '#f5cf4a', '#b98ae0', '#ff9a5a', '#5fd1c4'];

// ---------- Handy-Bildschirm ----------
const drawCookie = (g: CanvasRenderingContext2D, x: number, y: number, r: number, col = '#d9a35b') => {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.14)';
  g.beginPath();
  g.arc(x + r * 0.12, y + r * 0.14, r * 0.92, 0, Math.PI * 2);
  g.arc(x, y, r, 0, Math.PI * 2, true);
  g.fill();
  g.fillStyle = '#4a2a17';
  [[-0.4, -0.35, 0.2], [0.3, -0.45, 0.16], [0.05, 0.05, 0.19], [-0.45, 0.35, 0.15], [0.42, 0.32, 0.17]].forEach(([a, b, c]) => {
    g.beginPath();
    g.arc(x + a * r, y + b * r, c * r, 0, Math.PI * 2);
    g.fill();
  });
};
const phoneTex = (mode: string) =>
  canvasTex(320, 640, (g) => {
    const W = 320;
    const H = 640;
    if (mode === 'off') {
      g.fillStyle = '#15171b';
      g.fillRect(0, 0, W, H);
      return;
    }
    if (mode === 'ok') {
      g.fillStyle = '#2fb34a';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 34;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(80, 300);
      g.lineTo(140, 360);
      g.lineTo(250, 230);
      g.stroke();
      g.fillStyle = '#ffffff';
      fitText(g, 'AKZEPTIERT', W / 2, 460, 280, 64);
      return;
    }
    if (mode === 'cookies') {
      g.fillStyle = '#fff6e3';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#c9573c';
      g.fillRect(0, 0, W, 70);
      g.fillStyle = '#ffffff';
      fitText(g, 'DEINE COOKIES', W / 2, 36, 280, 40);
      for (let i = 0; i < 12; i++) drawCookie(g, 62 + (i % 3) * 98, 140 + Math.floor(i / 3) * 128, 40, ['#d9a35b', '#f29ab8', '#8fd16a', '#7fb6f0', '#f5cf4a', '#b98ae0'][i % 6]);
      return;
    }
    // Website (erfunden, kein Logo)
    g.fillStyle = '#f4f6f9';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#2f6fb5';
    g.fillRect(0, 0, W, 64);
    g.fillStyle = '#ffffff';
    fitText(g, 'NEWS', 70, 34, 110, 40);
    g.fillStyle = '#9fb8d8';
    g.fillRect(150, 22, 140, 22);
    g.fillStyle = '#c4d2e2';
    g.fillRect(20, 86, 280, 130);
    g.fillStyle = '#7fcf86';
    g.beginPath();
    g.moveTo(20, 216);
    g.quadraticCurveTo(110, 150, 190, 200);
    g.quadraticCurveTo(250, 230, 300, 180);
    g.lineTo(300, 216);
    g.fill();
    g.fillStyle = '#ffd21a';
    g.beginPath();
    g.arc(250, 125, 22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#b9c2cd';
    for (let i = 0; i < 6; i++) g.fillRect(20, 236 + i * 26, i % 3 === 2 ? 180 : 280, 12);
    const banner = (y: number, k: number) => {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(14, y + 6, 296, 236);
      g.fillStyle = '#ffffff';
      g.fillRect(10, y, 300, 236);
      g.strokeStyle = '#1d2026';
      g.lineWidth = 4;
      g.strokeRect(10, y, 300, 236);
      drawCookie(g, 58, y + 54, 32, COOKIE_COLORS[k % COOKIE_COLORS.length]);
      g.fillStyle = '#1d2026';
      g.textAlign = 'left';
      g.font = `800 34px ${T.font}`;
      g.fillText('Wir nutzen', 104, y + 44);
      g.fillText('Cookies!', 104, y + 80);
      g.fillStyle = '#2fb34a';
      g.fillRect(24, y + 112, 272, 64);
      g.fillStyle = '#ffffff';
      fitText(g, 'ALLE AKZEPTIEREN', 160, y + 145, 250, 40);
      g.fillStyle = '#8a929c';
      fitText(g, 'Einstellungen', 160, y + 206, 200, 26, 600);
    };
    if (mode === 'many') {
      for (let k = 0; k < 4; k++) banner(40 + k * 120, k);
    } else {
      banner(392, 0);
    }
  });

export const PHONE = {w: 0.12, h: 0.24, t: 0.017, leg: 0.2};

const Leg = ({side, legs, swing, knee}: {side: number; legs: number; swing: number; knee: number}) => {
  const L = PHONE.leg * legs;
  const m = useMemo(() => ({leg: std('#3a3f47'), knee: std('#2a2e34'), shoe: std('#e8453c'), sole: std('#f4f4f2')}), []);
  if (legs < 0.02) return null;
  const half = L / 2;
  return (
    <group position={[side * 0.032, L, 0]} rotation={[swing, 0, 0]}>
      {/* Oberschenkel */}
      <mesh material={m.leg} position={[0, -half / 2, 0]} castShadow>
        <cylinderGeometry args={[0.013, 0.011, half, 6]} />
      </mesh>
      <group position={[0, -half, 0]} rotation={[knee, 0, 0]}>
        <mesh material={m.knee}>
          <icosahedronGeometry args={[0.014, 0]} />
        </mesh>
        <mesh material={m.leg} position={[0, -half / 2, 0]} castShadow>
          <cylinderGeometry args={[0.011, 0.01, half, 6]} />
        </mesh>
        {/* Turnschuh */}
        <group position={[0, -half, 0.012]} rotation={[-swing - knee, 0, 0]} scale={Math.max(0.3, legs)}>
          <mesh material={m.shoe} position={[0, 0.012, 0.008]} castShadow>
            <boxGeometry args={[0.032, 0.026, 0.06]} />
          </mesh>
          <mesh material={m.sole} position={[0, -0.002, 0.008]}>
            <boxGeometry args={[0.034, 0.008, 0.064]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export const LegPhone = ({mode = 'banner', tilt = 90, legs = 0, run = false, runTime = 0, glow = 0, rumble = 0, time = 0}: {mode?: string; tilt?: number; legs?: number; run?: boolean; runTime?: number; glow?: number; rumble?: number; time?: number}) => {
  const m = useMemo(() => ({case: std('#2a2f38', {roughness: 0.4}), rim: std('#59606b', {roughness: 0.35}), cam: std('#111318'), lens: std('#3d5f8a', {roughness: 0.2})}), []);
  const {w, h, t} = PHONE;
  const L = PHONE.leg * legs;
  const ph = runTime * 15;
  const swingA = run ? Math.sin(ph) * 0.85 : 0;
  const kneeA = (s: number) => (run ? 0.35 + 0.5 * Math.max(0, Math.sin(ph + (s > 0 ? Math.PI : 0) + 0.8)) : 0);
  const bounce = run ? Math.abs(Math.sin(ph)) * 0.025 * legs : 0;
  const sh = rumble > 0.01 ? Math.sin(time * 61) * 0.004 * rumble : 0;
  const tr = (tilt * Math.PI) / 180;
  const lift = (t / 2) * Math.sin(tr);
  return (
    <group position={[sh, lift, 0]} rotation={[-tr, 0, sh * 8]}>
      <group position={[0, bounce, 0]} rotation={[run ? 0.12 : 0, 0, run ? Math.sin(ph) * 0.05 : 0]}>
        <Leg side={1} legs={legs} swing={swingA} knee={kneeA(1)} />
        <Leg side={-1} legs={legs} swing={-swingA} knee={kneeA(-1)} />
        <group position={[0, L + h / 2, 0]}>
          <mesh material={m.case} castShadow receiveShadow>
            <boxGeometry args={[w, h, t]} />
          </mesh>
          {/* Rand */}
          <mesh material={m.rim} position={[0, 0, 0]}>
            <boxGeometry args={[w + 0.004, h + 0.004, t * 0.6]} />
          </mesh>
          {/* Kamera hinten (ohne Logo) */}
          <mesh material={m.cam} position={[-w * 0.26, h * 0.36, -t / 2 - 0.003]}>
            <boxGeometry args={[0.04, 0.04, 0.006]} />
          </mesh>
          <mesh material={m.lens} position={[-w * 0.26, h * 0.36, -t / 2 - 0.007]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.004, 10]} />
          </mesh>
          {/* Bildschirm */}
          <group position={[0, 0, t / 2 + 0.0012]}>
            <TextPlane draw={phoneTex(mode)} k={`Cookiehandy ${mode}`} w={w - 0.012} h={h - 0.016} glow={0.75 + 0.5 * glow} />
          </group>
          {glow > 0.01 && (
            <mesh position={[0, 0, t / 2 + 0.003]}>
              <planeGeometry args={[w * 1.25, h * 1.15]} />
              <meshBasicMaterial color="#d8ffe0" transparent opacity={0.35 * glow} depthWrite={false} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
};

// ---------- Milchschüssel ----------
export const BOWL = {r: 0.11, h: 0.08};
export const MilkBowl = ({fill = 1, ripple = 0, time = 0}: {fill?: number; ripple?: number; time?: number}) => {
  const m = useMemo(() => ({out: std('#7fb8e6'), inn: std('#f7f4ee'), milk: std('#fbfbf7', {roughness: 0.3, flatShading: false}), dots: std('#ffffff')}), []);
  const {r, h} = BOWL;
  const mh = 0.012 + (h - 0.022) * clamp(fill);
  return (
    <group>
      <mesh material={m.out} position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 0.62, h, 12, 1, true]} />
      </mesh>
      <mesh material={m.inn} position={[0, h / 2 + 0.001, 0]}>
        <cylinderGeometry args={[r * 0.94, r * 0.58, h - 0.004, 12, 1, true]} />
      </mesh>
      <mesh material={m.inn} position={[0, 0.006, 0]}>
        <cylinderGeometry args={[r * 0.6, r * 0.6, 0.012, 12]} />
      </mesh>
      {/* Rand */}
      <mesh material={m.dots} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.97, 0.006, 4, 16]} />
      </mesh>
      {/* Punkte außen */}
      {Array.from({length: 8}, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} material={m.dots} position={[Math.sin(a) * r * 0.86, h * 0.55, Math.cos(a) * r * 0.86]}>
            <icosahedronGeometry args={[0.009, 0]} />
          </mesh>
        );
      })}
      {fill > 0.01 && (
        <mesh material={m.milk} position={[0, mh, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[r * (0.6 + 0.34 * (mh / h)), 20]} />
        </mesh>
      )}
      {ripple > 0.01 &&
        [0, 0.33, 0.66].map((o) => {
          const u = (time * 0.9 + o) % 1;
          return (
            <mesh key={o} position={[0, mh + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.02 + u * r * 0.75, 0.026 + u * r * 0.75, 20]} />
              <meshBasicMaterial color="#d9e3ea" transparent opacity={(1 - u) * ripple} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------- Kekse ----------
export const COOKIE_R = 0.045;
export const Cookie = ({color = COOKIE_COLORS[0], glow = 0, seed = 1}: {color?: string; glow?: number; seed?: number}) => {
  const m = useMemo(
    () => ({dough: std(color, {emissive: new THREE.Color(color), emissiveIntensity: 0}), chip: std('#4a2a17')}),
    [color],
  );
  m.dough.emissiveIntensity = 0.6 * glow;
  const chips = useMemo(() => {
    const r = rng(seed * 97 + 3);
    return Array.from({length: 6}, () => {
      const a = r() * Math.PI * 2;
      const d = 0.2 + r() * 0.65;
      return [Math.cos(a) * d * COOKIE_R, Math.sin(a) * d * COOKIE_R, 0.006 + r() * 0.004] as [number, number, number];
    });
  }, [seed]);
  return (
    <group>
      <mesh material={m.dough} castShadow>
        <cylinderGeometry args={[COOKIE_R, COOKIE_R * 0.96, 0.014, 9]} />
      </mesh>
      {chips.map(([x, z, s], i) => (
        <mesh key={i} material={m.chip} position={[x, 0.008, z]}>
          <icosahedronGeometry args={[s, 0]} />
        </mesh>
      ))}
    </group>
  );
};

/** Haufen bunter Riesen-Kekse (Ursprung = Boden Mitte), Kekse je ca. Ø 0,36 m */
export const CookieHeap = () => {
  const items = useMemo(() => {
    const r = rng(77);
    const out: {p: [number, number, number]; rot: [number, number, number]; c: string; s: number}[] = [];
    const layers = [7, 5, 3, 1];
    let y = 0.03;
    layers.forEach((n, li) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + li;
        const d = n === 1 ? 0 : 0.42 - li * 0.1;
        out.push({p: [Math.cos(a) * d, y + r() * 0.02, Math.sin(a) * d], rot: [(r() - 0.5) * 0.7, r() * 6, (r() - 0.5) * 0.7], c: COOKIE_COLORS[(i + li * 3) % COOKIE_COLORS.length], s: 3.6 + r() * 0.8});
      }
      y += 0.075;
    });
    return out;
  }, []);
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={it.p} rotation={it.rot} scale={it.s}>
          <Cookie color={it.c} seed={i + 5} />
        </group>
      ))}
    </group>
  );
};

/** Kekse fliegen im Bogen aus dem Ursprung (Bewegung `burst`, time = Sekunden seit Start), landen auf y = floor */
export const CookieBurst = ({time, count = 16, power = 1, floor = -1.0, scale = 2.4}: {time: number; count?: number; power?: number; floor?: number; scale?: number}) => {
  const parts = useMemo(() => {
    const r = rng(4242);
    return Array.from({length: count}, (_, i) => {
      const a = (i / count) * Math.PI * 2 + r() * 0.4;
      const sp = (1.1 + r() * 1.2) * power;
      return {vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: (2.2 + r() * 1.6) * power, spin: (r() - 0.5) * 18, c: COOKIE_COLORS[i % COOKIE_COLORS.length], delay: r() * 0.25};
    });
  }, [count, power]);
  return (
    <group>
      {parts.map((p, i) => {
        const u = Math.max(0, time - p.delay);
        if (time < p.delay) return null;
        let y = p.vy * u - 4.9 * u * u;
        let x = p.vx * u;
        let z = p.vz * u;
        let rot = p.spin * u;
        if (y < floor) {
          // gelandet: liegen bleiben
          const tl = (p.vy + Math.sqrt(p.vy * p.vy - 4 * 4.9 * -floor)) / 9.8;
          x = p.vx * tl;
          z = p.vz * tl;
          y = floor + 0.02;
          rot = 0;
        }
        return (
          <group key={i} position={[x, y, z]} rotation={[rot, rot * 0.6, 0]} scale={scale}>
            <Cookie color={p.c} seed={i} />
          </group>
        );
      })}
    </group>
  );
};

// ---------- Ordner „DATEN“ ----------
const labelTex = (text: string) =>
  canvasTex(320, 160, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 320, 160);
    g.strokeStyle = '#1d2026';
    g.lineWidth = 10;
    g.strokeRect(5, 5, 310, 150);
    g.fillStyle = '#c3121b';
    fitText(g, text, 160, 84, 280, 120);
  });
const FOLDER_COLS = ['#2f3640', '#c3121b', '#2f6fb5', '#3a3f47', '#7a4fa0', '#2f8f5a'];
/** Stapel liegender Ordner, Rücken (mit Etikett) zeigt nach +z. Jeder Ordner 0,34 × 0,08 × 0,28 m. */
export const FolderStack = ({count = 4, text = 'DATEN'}: {count?: number; text?: string}) => {
  const n = Math.max(1, Math.round(count));
  return (
    <group>
      {Array.from({length: n}, (_, i) => (
        <group key={i} position={[(i % 2 ? 0.012 : -0.01), 0.04 + i * 0.082, 0]} rotation={[0, (i % 3 - 1) * 0.05, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.08, 0.28]} />
            <meshStandardMaterial color={FOLDER_COLS[i % FOLDER_COLS.length]} roughness={0.55} flatShading />
          </mesh>
          <group position={[0, 0, 0.1405]}>
            <TextPlane draw={labelTex(text)} k={`Ordneretikett ${text}`} w={0.15} h={0.062} glow={0.35} />
          </group>
        </group>
      ))}
    </group>
  );
};

/** großer stehender Ordner (0,1 × 0,42 × 0,34 m), Etikett auf beiden Deckeln (±x) + Rücken (+z). Ursprung = Boden Mitte */
export const DataBinder = ({text = 'DATEN', color = '#c3121b'}: {text?: string; color?: string}) => (
  <group>
    <mesh position={[0, 0.21, 0]} castShadow>
      <boxGeometry args={[0.1, 0.42, 0.34]} />
      <meshStandardMaterial color={color} roughness={0.55} flatShading />
    </mesh>
    {/* Ring-Loch am Rücken */}
    <mesh position={[0, 0.08, 0.171]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.022, 0.006, 4, 10]} />
      <meshStandardMaterial color="#e8e6e1" />
    </mesh>
    {[1, -1].map((s) => (
      <group key={s} position={[s * 0.0505, 0.25, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
        <TextPlane draw={labelTex(text)} k={`Ordneretikett ${text}`} w={0.28} h={0.14} glow={0.35} />
      </group>
    ))}
    <group position={[0, 0.27, 0.1705]}>
      <TextPlane draw={labelTex(text)} k={`Ordneretikett ${text}`} w={0.095} h={0.0475} glow={0.35} />
    </group>
  </group>
);

// ---------- Lupe ----------
export const Magnifier = () => {
  const m = useMemo(() => ({handle: std('#7a4a2a'), ring: std('#c9a23a', {metalness: 0.4, roughness: 0.35}), glass: new THREE.MeshStandardMaterial({color: '#cfeaff', transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.1})}), []);
  return (
    <group>
      <mesh material={m.handle} position={[0, 0.0, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.019, 0.13, 7]} />
      </mesh>
      <group position={[0, 0.0, 0.2]}>
        <mesh material={m.ring} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.07, 0.011, 5, 16]} />
        </mesh>
        <mesh material={m.glass}>
          <circleGeometry args={[0.066, 16]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- Tauziehseil ----------
export const TUG = {len: 2.6};
export const TugRope = ({rumble = 0, time = 0, folder = true}: {rumble?: number; time?: number; folder?: boolean}) => {
  const m = useMemo(() => ({rope: std('#c8a46a', {roughness: 0.9}), band: std('#e8453c')}), []);
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const z = -TUG.len / 2 + (TUG.len * i) / 20;
      const u = i / 20;
      pts.push(new THREE.Vector3(0, -0.06 * Math.sin(Math.PI * u), z));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.017, 6, false);
  }, []);
  const sh = Math.sin(time * 23) * 0.015 * rumble;
  return (
    <group position={[sh, 0, 0]}>
      <mesh geometry={geo} material={m.rope} castShadow />
      <mesh material={m.band} position={[0, -0.06, 0]}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
      </mesh>
      {folder && (
        <group position={[0, -0.06, 0]} rotation={[0, 0, Math.sin(time * 9) * 0.12 * rumble]}>
          {/* Schnur zum Ordner */}
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.16, 4]} />
            <meshStandardMaterial color="#e8453c" />
          </mesh>
          <group position={[0, -0.58, 0]} rotation={[0, Math.PI / 2, 0]}>
            <DataBinder />
          </group>
        </group>
      )}
    </group>
  );
};

// ---------- Rauferei-Wolke ----------
export const FightCloud = ({fill = 1, time = 0}: {fill?: number; time?: number}) => {
  const puffs = useMemo(() => {
    const r = rng(9);
    return Array.from({length: 12}, (_, i) => ({a: (i / 12) * Math.PI * 2, d: 0.35 + r() * 0.35, y: 0.5 + r() * 0.9, s: 0.38 + r() * 0.25, ph: r() * 6}));
  }, []);
  const m = useMemo(() => ({c1: std('#e9e6df'), c2: std('#cfcac0'), star: std('#ffd21a', {emissive: new THREE.Color('#ffb400'), emissiveIntensity: 0.5})}), []);
  const k = easeInOut(clamp(fill));
  if (k < 0.01) return null;
  return (
    <group scale={k}>
      {puffs.map((p, i) => {
        const a = p.a + time * (i % 2 ? 2.2 : -1.8);
        const s = p.s * (1 + 0.12 * Math.sin(time * 9 + p.ph));
        return (
          <mesh key={i} material={i % 3 ? m.c1 : m.c2} position={[Math.cos(a) * p.d, p.y + 0.06 * Math.sin(time * 11 + p.ph), Math.sin(a) * p.d]} scale={s}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        );
      })}
      {[0, 1, 2, 3].map((i) => {
        const a = time * 4 + (i * Math.PI) / 2;
        return (
          <mesh key={`s${i}`} material={m.star} position={[Math.cos(a) * 1.0, 1.7 + 0.1 * Math.sin(a * 2), Math.sin(a) * 1.0]} rotation={[0, a, 0]}>
            <octahedronGeometry args={[0.09, 0]} />
          </mesh>
        );
      })}
      {/* Kekse wirbeln um die Wolke */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = -time * 3 + (i * Math.PI * 2) / 5;
        return (
          <group key={`k${i}`} position={[Math.cos(a) * 1.05, 0.9 + 0.35 * Math.sin(time * 5 + i), Math.sin(a) * 1.05]} rotation={[time * 6 + i, time * 3, 0]} scale={3.2}>
            <Cookie color={COOKIE_COLORS[i]} seed={i + 20} />
          </group>
        );
      })}
    </group>
  );
};
