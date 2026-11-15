import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {canvasTex, fitText, TextPlane} from './WgProps';
import {RingLines} from './WeckerProps';

/**
 * Spezial „Chef“ – Objekte, alle comichaft, harmlos und OHNE Logos/Markenzeichen:
 *  - BreakWall ("buerowand"): Bürowand 5,2 × 5 m, Wert "fill" 0 = heil … 1 = durchbrochen (Teile fliegen nach +z ihres Systems,
 *    landen höchstens ca. 2,8 m hinter der Wand, Staubwolke; Ränder links/rechts + oben bleiben stehen). fill läuft linear über 2,2 s Flugzeit.
 *  - Copier ("kopierer"): großer Büro-Kopierer (Front +z), "fill" 0 … 1 = Papierblätter fliegen heraus.
 *  - ReverseCard ("reversekarte"): rote Karte mit zwei gebogenen Pfeilen im Kreis – OHNE Schriftzug, OHNE weißes Oval, OHNE Logo.
 *    "tilt" 1 = liegt flach, "glow" = gelber Schein, "size".
 *  - BoxingBell ("boxglocke"): Boxring-Glocke (Messing auf rotem Brett) mit Hammer, "ring" = klingelt + Schall-Linien, schaut zur Kamera.
 *  - TaskStack ("aktenstapel"): wachsende Papierstapel mit Klebezetteln (DRINGEND! / SOFORT! …), "fill" 0 … 1.
 *  - Swirl ("wirbel"): comichafter Wirbel (Ringe, Streifen, Sterne), "fill" = Stärke 0 … 1.
 *  - GlassDoor ("glastuer"): Glastür mit dunklem Rahmen + Griffstange, "door" 0 … 1 (wie DoorLeaf).
 *  - SweatDrops: Schweißtropfen + Stress-Striche am Kopf (Wert "sweat" an Figuren mit Dummy-Körper).
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.7, flatShading: true, ...extra});

// ---------- Bürowand zum Durchbrechen ----------
export const WALL = {w: 5.2, h: 5, d: 0.16, hole: 2.1, top: 4.7};
const G = 9.81;
type Chunk = {c: [number, number]; w: number; h: number; v: [number, number, number]; spin: [number, number, number]; delay: number};
export const BreakWall = ({fill = 0}: {fill?: number}) => {
  const m = useMemo(
    () => ({
      paint: std('#eceae4', {roughness: 0.95}),
      core: std('#c9c4bb', {roughness: 1}),
      board: std('#c99a62'),
      pin: std('#f4f1e8'),
      frame: std('#3a3f46'),
      art: [std('#e8a93a'), std('#3f8fd6'), std('#d94b4b')],
      dust: new THREE.MeshStandardMaterial({color: '#dcd6cc', transparent: true, opacity: 0.6, roughness: 1, depthWrite: false}),
    }),
    [],
  );
  const chunks = useMemo(() => {
    const r = rng(77);
    const out: Chunk[] = [];
    const cols = 7;
    const rows = 7;
    const cw = (WALL.hole * 2) / cols;
    const rh = WALL.top / rows;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const x = -WALL.hole + cw * (i + 0.5);
        const y = rh * (j + 0.5);
        out.push({
          c: [x, y],
          w: cw * (0.92 + r() * 0.06),
          h: rh * (0.9 + r() * 0.08),
          // vorwärts höchstens ca. 2 m/s → Teile landen spätestens ca. 2,8 m hinter der Wand (Chef steht mit Abstand dahinter)
          v: [(x / WALL.hole) * (0.4 + r() * 0.5), 0.5 + r() * 1.3, 0.9 + r() * 0.7 + (1 - y / WALL.top) * 0.4],
          spin: [(r() - 0.5) * 9, (r() - 0.5) * 4, (r() - 0.5) * 8],
          delay: (1 - y / WALL.top) * 0.05 + Math.abs(x) * 0.03 + r() * 0.05,
        });
      }
    return out;
  }, []);
  const t = clamp(fill) * 2.2;
  const rim = (WALL.w / 2 - WALL.hole) / 2;
  return (
    <group>
      {fill <= 0.0001 ? (
        <>
          <mesh material={m.paint} position={[0, WALL.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[WALL.w, WALL.h, WALL.d]} />
          </mesh>
          {/* Seite −z (Großraumbüro): Pinnwand mit Zetteln */}
          <group position={[-0.6, 1.55, -WALL.d / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
            <mesh material={m.board}>
              <boxGeometry args={[1.4, 0.9, 0.03]} />
            </mesh>
            {[
              [-0.4, 0.2],
              [0.05, 0.25],
              [0.45, 0.1],
              [-0.25, -0.2],
              [0.3, -0.22],
            ].map(([x, y], i) => (
              <mesh key={i} material={m.pin} position={[x, y, 0.02]} rotation={[0, 0, (i - 2) * 0.08]}>
                <planeGeometry args={[0.26, 0.3]} />
              </mesh>
            ))}
          </group>
          {/* Seite +z (Chefbüro): Bild mit Rahmen */}
          <group position={[0.4, 1.75, WALL.d / 2 + 0.02]}>
            <mesh material={m.frame}>
              <boxGeometry args={[1.2, 0.85, 0.03]} />
            </mesh>
            {m.art.map((a, i) => (
              <mesh key={i} material={a} position={[-0.32 + i * 0.32, -0.05 + (i % 2) * 0.12, 0.02]}>
                <circleGeometry args={[0.18 - i * 0.03, 12]} />
              </mesh>
            ))}
          </group>
        </>
      ) : (
        <>
          {/* stehen bleibende Ränder + Sturz */}
          {[-1, 1].map((s) => (
            <mesh key={s} material={m.paint} position={[s * (WALL.hole + rim), WALL.h / 2, 0]} castShadow>
              <boxGeometry args={[rim * 2, WALL.h, WALL.d]} />
            </mesh>
          ))}
          <mesh material={m.paint} position={[0, (WALL.top + WALL.h) / 2, 0]} castShadow>
            <boxGeometry args={[WALL.hole * 2, WALL.h - WALL.top, WALL.d]} />
          </mesh>
          {chunks.map((k, i) => {
            const tt = Math.max(0, t - k.delay);
            const half = WALL.d * 0.8;
            // Landezeit: y(t) = c.y + v.y t − G/2 t² = half
            const a = G / 2;
            const disc = k.v[1] * k.v[1] + 4 * a * (k.c[1] - half);
            const tl = (k.v[1] + Math.sqrt(Math.max(0, disc))) / (2 * a);
            const tf = Math.min(tt, tl);
            const slide = Math.max(0, tt - tl);
            const sl = 1 - Math.exp(-slide * 4);
            const x = k.c[0] + k.v[0] * tf + k.v[0] * 0.12 * sl;
            const z = k.v[2] * tf + k.v[2] * 0.15 * sl;
            const y = tt >= tl ? half : k.c[1] + k.v[1] * tf - a * tf * tf;
            const land = clamp(slide / 0.25);
            const rx = THREE.MathUtils.lerp(k.spin[0] * tf, Math.PI / 2, land);
            const ry = k.spin[1] * tf;
            const rz = THREE.MathUtils.lerp(k.spin[2] * tf, 0, land);
            return (
              <group key={i} position={[x, y, z]} rotation={[rx, ry, rz]}>
                <mesh material={m.paint} castShadow>
                  <boxGeometry args={[k.w * 0.9, k.h * 0.9, WALL.d * 1.6]} />
                </mesh>
                <mesh material={m.core} scale={[1.0, 1.0, 1.0]} position={[0, 0, -0.005]}>
                  <boxGeometry args={[k.w * 0.92, k.h * 0.92, WALL.d * 1.45]} />
                </mesh>
              </group>
            );
          })}
          {/* Staubwolke (kurz, comichaft) */}
          {Array.from({length: 12}, (_, i) => {
            const ph = clamp((t - (i % 4) * 0.05) / 2.0);
            if (ph <= 0 || ph >= 1) return null;
            const ang = (i / 12) * Math.PI * 2;
            const rr = 0.4 + ph * 1.8;
            const op = 0.6 * Math.sin(Math.PI * ph);
            return (
              <mesh key={`d${i}`} material={m.dust} position={[Math.cos(ang) * rr * 1.1, 0.35 + (i % 3) * 0.5 + ph * 0.6, 0.6 + Math.abs(Math.sin(ang)) * rr]} scale={(0.35 + ph * 0.6) * (op > 0 ? 1 : 0)}>
                <icosahedronGeometry args={[1, 1]} />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
};

// ---------- Kopierer ----------
export const Copier = ({fill = 0}: {fill?: number}) => {
  const m = useMemo(
    () => ({
      body: std('#e4e6e8', {roughness: 0.5}),
      dark: std('#4a5058', {roughness: 0.5}),
      tray: std('#b9bec4'),
      glass: std('#2a3d52', {roughness: 0.2, metalness: 0.2}),
      paper: std('#fbfaf5', {side: THREE.DoubleSide}),
      screen: new THREE.MeshBasicMaterial({color: '#7fd0ff'}),
      green: new THREE.MeshBasicMaterial({color: '#4cd964'}),
    }),
    [],
  );
  const sheets = useMemo(() => {
    const r = rng(9);
    return Array.from({length: 9}, () => ({v: [(r() - 0.5) * 1.6, 1.5 + r() * 1.3, 0.6 + r() * 1.2] as const, spin: [(r() - 0.5) * 9, (r() - 0.5) * 9, (r() - 0.5) * 9] as const, d: r() * 0.3}));
  }, []);
  const t = clamp(fill) * 1.6;
  return (
    <group>
      <mesh material={m.body} position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 1.0, 0.68]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.04, 0]}>
        <boxGeometry args={[0.97, 0.08, 0.7]} />
      </mesh>
      {/* Papierfächer vorn */}
      {[0.18, 0.36].map((y) => (
        <mesh key={y} material={m.tray} position={[0, y, 0.345]}>
          <boxGeometry args={[0.8, 0.12, 0.01]} />
        </mesh>
      ))}
      {/* Deckel + Vorlagenglas */}
      <mesh material={m.dark} position={[0, 1.03, -0.02]} castShadow>
        <boxGeometry args={[0.9, 0.06, 0.6]} />
      </mesh>
      <mesh material={m.glass} position={[0, 1.065, -0.02]}>
        <boxGeometry args={[0.7, 0.01, 0.45]} />
      </mesh>
      {/* Bedienfeld mit Display + grüner Taste */}
      <group position={[0.25, 1.06, 0.3]} rotation={[-0.6, 0, 0]}>
        <mesh material={m.dark}>
          <boxGeometry args={[0.34, 0.03, 0.16]} />
        </mesh>
        <mesh material={m.screen} position={[-0.05, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.16, 0.09]} />
        </mesh>
        <mesh material={m.green} position={[0.11, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.022, 12]} />
        </mesh>
      </group>
      {/* Ausgabefach seitlich + Blätter */}
      <mesh material={m.tray} position={[-0.56, 0.62, 0]} rotation={[0, 0, 0.25]}>
        <boxGeometry args={[0.2, 0.02, 0.4]} />
      </mesh>
      {fill > 0.001 &&
        sheets.map((s, i) => {
          const tt = Math.max(0, t - s.d);
          const y = Math.max(0.01, 1.05 + s.v[1] * tt - 3.2 * tt * tt);
          const air = y > 0.012 ? tt : (s.v[1] + Math.sqrt(s.v[1] * s.v[1] + 4 * 3.2 * 1.04)) / (2 * 3.2);
          return (
            <mesh key={i} material={m.paper} position={[s.v[0] * air * 0.8, y, 0.1 + s.v[2] * air * 0.8]} rotation={y > 0.012 ? [s.spin[0] * tt, s.spin[1] * tt, s.spin[2] * tt] : [-Math.PI / 2, 0, i]}>
              <planeGeometry args={[0.21, 0.297]} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------- Reverse-Karte (rote Karte, zwei gebogene Pfeile im Kreis – kein Schriftzug, kein Oval, kein Logo) ----------
const arrowPair = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, lw: number) => {
  for (const rot of [0, Math.PI]) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot - 0.35);
    const a0 = Math.PI * 0.12;
    const a1 = Math.PI * 0.86;
    const head = (fill: string, stroke: number) => {
      // Pfeilspitze am Ende des Bogens (Richtung im Uhrzeigersinn)
      const ex = Math.cos(a1) * R;
      const ey = Math.sin(a1) * R;
      const tx = -Math.sin(a1);
      const ty = Math.cos(a1);
      const nx = Math.cos(a1);
      const ny = Math.sin(a1);
      const L = lw * 1.7;
      const W = lw * 1.35;
      g.beginPath();
      g.moveTo(ex + tx * L, ey + ty * L);
      g.lineTo(ex + nx * W, ey + ny * W);
      g.lineTo(ex - nx * W, ey - ny * W);
      g.closePath();
      g.fillStyle = fill;
      if (stroke) {
        g.lineWidth = stroke;
        g.strokeStyle = fill;
        g.lineJoin = 'round';
        g.stroke();
      }
      g.fill();
    };
    // dunkle Kontur
    g.lineCap = 'round';
    g.strokeStyle = '#3a0907';
    g.lineWidth = lw + lw * 0.55;
    g.beginPath();
    g.arc(0, 0, R, a0, a1);
    g.stroke();
    head('#3a0907', lw * 0.55);
    // weißer Pfeil
    g.strokeStyle = '#ffffff';
    g.lineWidth = lw;
    g.beginPath();
    g.arc(0, 0, R, a0, a1);
    g.stroke();
    head('#ffffff', 0);
    g.restore();
  }
};
const reverseTex = canvasTex(512, 768, (g) => {
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  g.clearRect(0, 0, 512, 768);
  rr(4, 4, 504, 760, 46);
  g.fillStyle = '#8f1410';
  g.fill();
  rr(22, 22, 468, 724, 34);
  const grad = g.createLinearGradient(0, 0, 512, 768);
  grad.addColorStop(0, '#f2362b');
  grad.addColorStop(1, '#c81e16');
  g.fillStyle = grad;
  g.fill();
  arrowPair(g, 256, 384, 120, 46);
  arrowPair(g, 92, 110, 38, 15);
  arrowPair(g, 420, 658, 38, 15);
});
const cardBackTex = canvasTex(256, 384, (g) => {
  g.fillStyle = '#7d1310';
  g.fillRect(0, 0, 256, 384);
  g.strokeStyle = '#a81c16';
  g.lineWidth = 10;
  for (let i = -400; i < 400; i += 34) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 384, 384);
    g.stroke();
  }
});
export const CARD = {w: 0.22, h: 0.33};
export const ReverseCard = ({size = 0, glow = 0, time = 0}: {size?: number; glow?: number; time?: number}) => {
  const k = 1 + size;
  const halo = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffd21a', transparent: true, depthWrite: false, side: THREE.DoubleSide}), []);
  halo.opacity = clamp(glow) * (0.55 + 0.25 * Math.sin(time * 9));
  return (
    <group scale={k}>
      <group position={[0, 0, 0.002]}>
        <TextPlane draw={reverseTex} k="reverse-karte" w={CARD.w} h={CARD.h} glow={0.25} />
      </group>
      <group position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]}>
        <TextPlane draw={cardBackTex} k="reverse-karte-ruecken" w={CARD.w * 0.97} h={CARD.h * 0.97} glow={0.1} />
      </group>
      {glow > 0.01 &&
        Array.from({length: 12}, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + time * 0.6;
          const L = 0.07 + 0.03 * Math.sin(time * 8 + i);
          return (
            <mesh key={i} material={halo} position={[Math.cos(a) * (0.23 + L / 2), Math.sin(a) * (0.27 + L / 2), -0.004]} rotation={[0, 0, a]}>
              <planeGeometry args={[L, 0.018]} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------- Boxring-Glocke ----------
export const BoxingBell = ({ring = 0, time = 0}: {ring?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      brass: std('#e0b84a', {metalness: 0.75, roughness: 0.25, flatShading: false}),
      board: std('#c0262a'),
      rim: std('#7a1a1c'),
      handle: std('#5a3a26'),
      head: std('#c9ced3', {metalness: 0.7, roughness: 0.3}),
    }),
    [],
  );
  const hit = ring > 0.01 ? Math.max(0, Math.sin(time * 14)) : 0;
  const shake = ring > 0.01 ? Math.sin(time * 70) * 0.03 * ring : 0;
  return (
    <group>
      <mesh material={m.rim} position={[0, 0, -0.03]}>
        <cylinderGeometry args={[0.24, 0.24, 0.03, 24]} />
      </mesh>
      <mesh material={m.board} position={[0, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 24]} />
      </mesh>
      <group rotation={[0, 0, shake]}>
        <mesh material={m.brass} position={[0, 0, 0.0]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh material={m.brass} position={[0, 0, 0.15]}>
          <sphereGeometry args={[0.025, 10, 8]} />
        </mesh>
      </group>
      {/* Hammer schlägt von rechts unten */}
      <group position={[0.2, -0.2, 0.08]} rotation={[0, 0, 0.9 - 0.5 * hit]}>
        <mesh material={m.handle} position={[0, 0.12, 0]}>
          <boxGeometry args={[0.025, 0.24, 0.025]} />
        </mesh>
        <mesh material={m.head} position={[0, 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.08, 10]} />
        </mesh>
      </group>
      <group position={[0, 0.05, 0.05]} scale={2.2}>
        <RingLines amount={ring} time={time} r={0.09} y={0} />
      </group>
    </group>
  );
};

// ---------- Aktenstapel ----------
const TASKS = ['DRINGEND!', 'SOFORT!', 'HEUTE NOCH!', 'EILT!', 'WICHTIG!', 'BIS GESTERN!', 'NOCH MEHR!'];
const noteTex = (text: string) =>
  canvasTex(256, 160, (g) => {
    g.fillStyle = '#ffe14a';
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#c8102e';
    fitText(g, text, 128, 82, 230, 74);
  });
const STACK_POS: [number, number, number][] = [
  [0.0, 0, 0.0],
  [-0.3, 0, 0.05],
  [0.3, 0, -0.02],
  [-0.15, 0, -0.25],
  [0.16, 0, -0.27],
  [-0.48, 0, -0.2],
  [0.47, 0, -0.24],
];
export const TaskStack = ({fill = 0}: {fill?: number}) => {
  const m = useMemo(() => ({paper: std('#fbfaf5', {roughness: 0.9}), edge: std('#e7e3d8', {roughness: 0.9})}), []);
  const n = STACK_POS.length;
  return (
    <group>
      {STACK_POS.map((p, i) => {
        const k = clamp(fill * n - i);
        if (k <= 0.001) return null;
        const pop = easeInOut(clamp(k / 0.35));
        const h = (0.12 + ((i * 53) % 7) * 0.05) * (0.35 + 0.65 * k);
        const drop = (1 - pop) * 0.35;
        return (
          <group key={i} position={[p[0], drop, p[2]]} rotation={[0, ((i * 31) % 9 - 4) * 0.04, 0]}>
            <mesh material={m.paper} position={[0, h / 2, 0]} castShadow>
              <boxGeometry args={[0.22, h, 0.3]} />
            </mesh>
            {[0.25, 0.5, 0.75].map((f) => (
              <mesh key={f} material={m.edge} position={[0.004 * (f * 10 - 5), h * f, 0.151]}>
                <boxGeometry args={[0.22, 0.006, 0.002]} />
              </mesh>
            ))}
            <group position={[0.02, h - 0.06, 0.152]} rotation={[0, 0, ((i % 3) - 1) * 0.12]}>
              <TextPlane draw={noteTex(TASKS[i])} k={`aufgabe-${TASKS[i]}`} w={0.13} h={0.081} glow={0.5} />
            </group>
          </group>
        );
      })}
    </group>
  );
};

// ---------- Wirbel ----------
export const Swirl = ({amount = 0, time = 0}: {amount?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      white: new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide}),
      yellow: new THREE.MeshBasicMaterial({color: '#ffd21a', transparent: true, depthWrite: false, side: THREE.DoubleSide}),
      blue: new THREE.MeshBasicMaterial({color: '#9fd8ff', transparent: true, depthWrite: false, side: THREE.DoubleSide}),
    }),
    [],
  );
  if (amount < 0.01) return null;
  m.white.opacity = 0.9 * clamp(amount);
  m.yellow.opacity = 0.9 * clamp(amount);
  m.blue.opacity = 0.55 * clamp(amount);
  const rings = 8;
  return (
    <group scale={[0.6 + 0.4 * clamp(amount), 1, 0.6 + 0.4 * clamp(amount)]}>
      {Array.from({length: rings}, (_, i) => {
        const y = 0.15 + i * 0.33;
        const r = 0.45 + i * 0.13;
        return (
          <mesh key={i} material={i % 3 === 1 ? m.blue : m.white} position={[0, y, 0]} rotation={[Math.PI / 2, 0, time * (7 + i * 0.7) + i]}>
            <torusGeometry args={[r, 0.07, 5, 28, Math.PI * 1.55]} />
          </mesh>
        );
      })}
      {Array.from({length: 10}, (_, i) => {
        const a = time * 9 + (i / 10) * Math.PI * 2;
        const y = 0.3 + ((i * 0.27 + time * 0.8) % 2.4);
        const r = 0.55 + y * 0.38;
        return (
          <mesh key={`s${i}`} material={m.yellow} position={[Math.cos(a) * r, y, Math.sin(a) * r]} rotation={[0, -a, Math.PI / 4]}>
            <octahedronGeometry args={[0.08, 0]} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- Schweiß ----------
export const SweatDrops = ({amount = 0, time = 0}: {amount?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      drop: new THREE.MeshStandardMaterial({color: '#7fd0ff', emissive: '#3aa0e0', emissiveIntensity: 0.35, roughness: 0.15, transparent: true}),
      line: new THREE.MeshBasicMaterial({color: '#3a6fb0', transparent: true, depthWrite: false}),
    }),
    [],
  );
  if (amount < 0.01) return null;
  const n = amount > 1.2 ? 5 : amount > 0.6 ? 4 : 3;
  m.line.opacity = clamp(amount) * 0.85;
  return (
    <group>
      {Array.from({length: n}, (_, i) => {
        const per = 1.0 - Math.min(0.4, amount * 0.2);
        const ph = ((time / per + i / n) % 1 + 1) % 1;
        const side = i % 2 ? 1 : -1;
        const x = side * (0.15 + (i % 3) * 0.03) + side * ph * 0.05;
        const y = 0.12 - ph * 0.34 + (i % 3) * 0.04;
        const s = 0.022 + 0.01 * (i % 2);
        m.drop.opacity = 1;
        return (
          <group key={i} position={[x, y, 0.05]} scale={clamp(amount * 1.5) * (ph < 0.85 ? 1 : (1 - ph) / 0.15)}>
            <mesh material={m.drop}>
              <sphereGeometry args={[s, 10, 8]} />
            </mesh>
            <mesh material={m.drop} position={[0, s * 1.15, 0]}>
              <coneGeometry args={[s * 0.82, s * 1.5, 10]} />
            </mesh>
          </group>
        );
      })}
      {/* Stress-Striche über dem Kopf */}
      {[-1, 0, 1].map((k) => (
        <mesh key={k} material={m.line} position={[k * 0.11, 0.33 + (k === 0 ? 0.04 : 0) + 0.015 * Math.sin(time * 18 + k), 0.02]} rotation={[0, 0, -k * 0.45]}>
          <planeGeometry args={[0.022, 0.1]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Glastür (passend zur Glaswand im Büro) ----------
/** Glastür mit dunklem Rahmen + Griffstange, Scharnier am Ursprung, Blatt nach +x (Breite 0,86 m, Höhe 2,05 m),
 *  Wert "door" 0 zu … 1 offen (schwingt nach +z des eigenen Systems, wie DoorLeaf). Objekt "glastuer". */
export const GLASS_DOOR = {w: 0.86, h: 2.05};
export const GlassDoor = ({open = 0}: {open?: number}) => {
  const m = useMemo(
    () => ({
      frame: std('#3a3f46', {metalness: 0.5, roughness: 0.4}),
      glass: new THREE.MeshStandardMaterial({color: '#cfe8f4', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide}),
      frost: new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0.45, roughness: 0.6, depthWrite: false, side: THREE.DoubleSide}),
      steel: std('#c9ced3', {metalness: 0.8, roughness: 0.25}),
    }),
    [],
  );
  const {w, h} = GLASS_DOOR;
  return (
    <group rotation={[0, -clamp(open) * 1.75, 0]}>
      <mesh material={m.glass} position={[w / 2, h / 2, 0]}>
        <planeGeometry args={[w - 0.08, h - 0.08]} />
      </mesh>
      <mesh material={m.frost} position={[w / 2, 1.2, 0.002]}>
        <planeGeometry args={[w - 0.08, 0.16]} />
      </mesh>
      {[
        [w / 2, 0.02, w, 0.04],
        [w / 2, h - 0.02, w, 0.04],
      ].map(([x, y, ww, hh], i) => (
        <mesh key={i} material={m.frame} position={[x, y, 0]}>
          <boxGeometry args={[ww, hh, 0.04]} />
        </mesh>
      ))}
      {[0.02, w - 0.02].map((x) => (
        <mesh key={x} material={m.frame} position={[x, h / 2, 0]}>
          <boxGeometry args={[0.04, h, 0.04]} />
        </mesh>
      ))}
      {[-1, 1].map((k) => (
        <mesh key={k} material={m.steel} position={[w - 0.12, 1.05, k * 0.05]}>
          <boxGeometry args={[0.025, 0.5, 0.025]} />
        </mesh>
      ))}
    </group>
  );
};
