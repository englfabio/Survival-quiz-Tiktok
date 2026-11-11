import {useLayoutEffect, useMemo, useRef} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {clamp, rng} from '../lib/anim';

/**
 * Objekte für "Weihnachtsbaum-Brand" (alle im gleichen Low-Poly-Look, wiederverwendbar):
 *  - Weihnachtsbaum ("weihnachtsbaum") mit Kugeln, Lichterkette, Stern, Geschenken darunter.
 *    Werte: fire (0 = aus … 1 = Flammen bis zur Decke … 1.6 = riesig), smoke (Rauchschicht unter der Decke 0 … 1.5).
 *  - Stilisierte Flammen (Flames) + Rauch (SmokeLayer) – auch einzeln nutzbar.
 *  - Türen ("zimmertuer", "wohnungstuer", "haustuer"): Wert door 0 = zu … 1 = offen; smoke > 0 = Glut + Rauch dahinter.
 *  - Eimer mit Wasser ("eimer"), Geschenkpakete ("geschenke"), Feuerwehrauto ("feuerwehrauto", stilisiert, ohne Logos).
 */

const TAU = Math.PI * 2;
const flat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.7, flatShading: true, ...extra});

/** Deckenhöhe der Weihnachts-Bühnen (Flammen und Rauch richten sich danach) */
export const CEILING = 2.6;

// ---------------------------------------------------------------- Flammen
type Tongue = {x: number; y: number; z: number; s: number; h: number; ph: number; f: number; c: number; lean: number; dir: number};

const FLAME_COLORS = ['#ff4d1a', '#ff7a1a', '#ffab2e', '#ffd84a'];

/**
 * Flammenzungen (unbeleuchtet, leuchtend), flackern über die Zeit.
 * pts = Fußpunkte der Zungen, jeweils mit Größe; amount 0…1 blendet sie ein.
 */
const FlameTongues = ({tongues, time, amount}: {tongues: Tongue[]; time: number; amount: number}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 5, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({vertexColors: false, toneMapped: false}), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    tongues.forEach((p, i) => {
      const fl = 0.75 + 0.25 * Math.sin(time * p.f + p.ph) + 0.12 * Math.sin(time * p.f * 2.3 + p.ph * 1.7);
      const a = amount * clamp(p.s);
      o.position.set(p.x, p.y, p.z);
      o.rotation.set(Math.sin(time * 3.1 + p.ph) * 0.12 + p.lean * Math.cos(p.dir), 0, Math.cos(time * 2.7 + p.ph) * 0.12 + p.lean * Math.sin(p.dir));
      o.scale.set(p.s * 0.13 * a + 0.0001, p.h * fl * a * 1.1 + 0.0001, p.s * 0.13 * a + 0.0001);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.set(FLAME_COLORS[p.c]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [tongues, time, amount]);
  return <instancedMesh ref={ref} args={[geo, mat, tongues.length]} frustumCulled={false} />;
};

/** Zufällige, feste Verteilung der Flammenzungen am Baum (Kegel) */
const useTreeTongues = (fire: number, treeH: number, treeR: number) => {
  const seeds = useMemo(() => {
    const r = rng(77);
    return Array.from({length: 150}, () => ({u: r(), a: r() * TAU, rr: 0.55 + r() * 0.5, s: 0.6 + r() * 0.6, h: 0.35 + r() * 0.45, ph: r() * 9, f: 7 + r() * 6, c: Math.floor(r() * 4), lean: (r() - 0.5) * 0.3}));
  }, []);
  return useMemo(() => {
    const out: Tongue[] = [];
    const burnTop = Math.min(1, fire) * treeH; // bis wohin der Baum brennt
    const big = 1 + Math.max(0, fire - 1) * 1.6;
    for (const p of seeds) {
      const y = p.u * treeH;
      if (y > burnTop + 0.05) continue;
      // Kegel: Radius nimmt nach oben ab
      const rad = treeR * (1 - y / treeH) * p.rr * (1 + (big - 1) * 0.35);
      const grow = clamp((burnTop - y) / 0.4 + 0.25);
      // Flammenlänge: so dass bei fire 1 die oberen Zungen die Decke erreichen
      const reach = (0.45 + (y / treeH) * 0.55) * (fire >= 0.95 ? (CEILING - y) * 0.75 + 0.3 : 0.8);
      out.push({x: Math.cos(p.a) * rad, y, z: Math.sin(p.a) * rad, s: (p.s + 0.25) * grow * big, h: Math.max(0.25, reach * p.h * 2.1) * grow * Math.min(big, 1.35), ph: p.ph, f: p.f, c: p.c, lean: p.lean, dir: p.a});
    }
    // Flammen, die unter der Decke entlanglaufen (ab fire ≈ 0.9)
    const ceil = clamp((fire - 0.88) / 0.12);
    if (ceil > 0) {
      const spread = 0.55 + Math.max(0, fire - 1) * 2.2;
      for (let i = 0; i < 26; i++) {
        const p = seeds[i];
        const a = p.a;
        const d = spread * Math.sqrt(p.rr - 0.5) * 1.1;
        out.push({x: Math.cos(a) * d, y: CEILING - 0.55 - p.u * 0.25, z: Math.sin(a) * d, s: (0.9 + p.s * 0.8) * ceil * big * 0.9, h: 0.75 * ceil, ph: p.ph, f: p.f, c: p.c, lean: 0.9, dir: a});
      }
    }
    return out;
  }, [seeds, fire, treeH, treeR]);
};

// ---------------------------------------------------------------- Rauch
/**
 * Rauchschicht unter der Decke + aufsteigende Rauchsäule über dem Feuer.
 * Grenzen (bounds) relativ zum Ursprung: [x0, x1, z0, z1] – außerhalb kein Rauch (damit die Kamera frei bleibt).
 */
export const SmokeLayer = ({
  amount,
  time,
  bounds,
  column = 0,
  ceiling = CEILING,
}: {
  amount: number;
  time: number;
  bounds: [number, number, number, number];
  column?: number;
  ceiling?: number;
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({color: '#4a4c52', roughness: 1, flatShading: true, transparent: true, opacity: 0.88}), []);
  const seeds = useMemo(() => {
    const r = rng(31);
    return Array.from({length: 320}, (_, i) => ({x: r(), z: r(), y: r(), s: 0.3 + r() * 0.25, ph: r() * 9, col: i < 30, rot: r() * 6}));
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    const [x0, x1, z0, z1] = bounds;
    const thick = 0.12 + Math.min(1.5, amount) * 0.4; // Dicke der Schicht (amount 1 → bis ca. 1,9 m herab)
    const reach = Math.min(1, amount * 1.25); // wie weit sie sich schon ausgebreitet hat (vom Ursprung aus)
    seeds.forEach((p, i) => {
      let x: number;
      let y: number;
      let z: number;
      let s: number;
      if (p.col) {
        // Säule: steigt vom Feuer zur Decke
        const k = (p.y + time * 0.35) % 1;
        x = Math.sin(p.ph + time) * 0.12 * k;
        z = Math.cos(p.ph + time * 0.8) * 0.12 * k;
        y = 1.6 + k * (ceiling - 1.8);
        s = p.s * 0.6 * (0.4 + k * 0.6) * clamp(column);
      } else {
        x = x0 + p.x * (x1 - x0) + Math.sin(time * 0.25 + p.ph) * 0.1;
        z = z0 + p.z * (z1 - z0) + Math.cos(time * 0.2 + p.ph) * 0.1;
        const dist = Math.hypot(x, z);
        const maxD = Math.hypot(Math.max(-x0, x1), Math.max(-z0, z1));
        const here = clamp((reach * maxD * 1.05 - dist) / 0.8);
        y = ceiling - 0.08 - p.y * thick;
        s = p.s * 0.75 * (0.8 + Math.min(1.5, amount) * 0.25) * here * clamp(amount * 3);
      }
      o.position.set(x, y, z);
      o.rotation.set(p.rot, p.rot * 0.7 + time * 0.05, 0);
      o.scale.set(s * 1.5 + 0.0001, s * 0.35 + 0.0001, s * 1.4 + 0.0001);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      const g = 0.24 + ((i * 37) % 10) * 0.012 - Math.min(1.5, amount) * 0.04;
      m.setColorAt(i, col.setRGB(g, g, g * 1.06));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [seeds, amount, time, bounds, column, ceiling]);
  return <instancedMesh ref={ref} args={[geo, mat, seeds.length]} frustumCulled={false} />;
};

// ---------------------------------------------------------------- Geschenke
const GIFT_COLORS: [string, string][] = [
  ['#d8342c', '#f4d35e'],
  ['#2f7fc1', '#f2f2f2'],
  ['#3f9a54', '#e64a3c'],
  ['#f2c230', '#c0392b'],
  ['#8e44ad', '#f4d35e'],
  ['#f2f2f2', '#d8342c'],
];

/** Ein Geschenkpaket mit Schleife. Ursprung = Boden-Mitte */
export const Gift = ({w = 0.32, h = 0.24, d = 0.28, color = 0}: {w?: number; h?: number; d?: number; color?: number}) => {
  const [box, ribbon] = GIFT_COLORS[color % GIFT_COLORS.length];
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={box} roughness={0.6} flatShading />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w + 0.006, h + 0.006, 0.05]} />
        <meshStandardMaterial color={ribbon} roughness={0.5} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[0.05, h + 0.006, d + 0.006]} />
        <meshStandardMaterial color={ribbon} roughness={0.5} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 0.045, h + 0.03, 0]} rotation={[0, 0, k * 0.7]}>
          <torusGeometry args={[0.035, 0.012, 4, 8]} />
          <meshStandardMaterial color={ribbon} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};

/** Kleiner Stapel Geschenke ("geschenke") */
export const GiftPile = () => (
  <group>
    <group position={[-0.2, 0, 0.05]} rotation={[0, 0.3, 0]}>
      <Gift color={0} w={0.36} h={0.26} d={0.3} />
    </group>
    <group position={[0.2, 0, -0.05]} rotation={[0, -0.2, 0]}>
      <Gift color={1} w={0.3} h={0.2} d={0.3} />
    </group>
    <group position={[-0.05, 0.26, 0.05]} rotation={[0, 0.9, 0]}>
      <Gift color={3} w={0.22} h={0.16} d={0.2} />
    </group>
  </group>
);

// ---------------------------------------------------------------- Weihnachtsbaum
/** Baumhöhe (ohne Stern) und unterer Radius */
export const TREE = {h: 2.05, r: 0.78};

/** Rauch-Grenzen für die Bühne "weihnachtszimmer" (relativ zum Baum bei x 1.45, z −1.55, face 180) */
export const ROOM_SMOKE_BOUNDS: [number, number, number, number] = [-3.9, 1.0, -0.7, 2.7];

export const ChristmasTree = ({
  fire = 0,
  smoke = 0,
  time,
  smokeBounds = ROOM_SMOKE_BOUNDS,
  gifts = true,
}: {
  fire?: number;
  smoke?: number;
  time: number;
  smokeBounds?: [number, number, number, number];
  gifts?: boolean;
}) => {
  const {h, r} = TREE;
  const burnt = clamp(fire * 1.1);
  const needle = useMemo(() => flat('#2f7a45'), []);
  const needleDark = useMemo(() => flat('#245f37'), []);
  useLayoutEffect(() => {
    // angekohlt: Nadeln werden dunkler, je stärker es brennt
    needle.color.set('#2f7a45').lerp(new THREE.Color('#2a2622'), burnt * 0.8);
    needleDark.color.set('#245f37').lerp(new THREE.Color('#1f1b18'), burnt * 0.8);
  }, [burnt, needle, needleDark]);
  const deco = useMemo(() => {
    const rr = rng(12);
    const balls: {p: [number, number, number]; c: string; s: number}[] = [];
    const cols = ['#d8342c', '#f2c230', '#2f7fc1', '#e8e8f0', '#d8342c', '#f2c230'];
    for (let i = 0; i < 34; i++) {
      const y = 0.4 + rr() * (h - 0.55);
      const a = rr() * TAU;
      const rad = r * (1 - (y - 0.25) / (h - 0.2)) * 0.92 + 0.03;
      balls.push({p: [Math.cos(a) * rad, y - 0.05, Math.sin(a) * rad], c: cols[i % cols.length], s: 0.045 + rr() * 0.025});
    }
    const lights: [number, number, number][] = [];
    for (let i = 0; i < 70; i++) {
      const k = i / 70;
      const y = 0.35 + k * (h - 0.45);
      const a = k * TAU * 4.5;
      const rad = r * (1 - (y - 0.25) / (h - 0.2)) * 0.95 + 0.02;
      lights.push([Math.cos(a) * rad, y - 0.04, Math.sin(a) * rad]);
    }
    return {balls, lights};
  }, [h, r]);
  const tongues = useTreeTongues(fire, h, r);
  const flick = 0.85 + 0.15 * Math.sin(time * 13) + 0.08 * Math.sin(time * 29);
  const layers = [
    {y: 0.28, rad: r, ht: 0.85},
    {y: 0.72, rad: r * 0.78, ht: 0.75},
    {y: 1.12, rad: r * 0.56, ht: 0.65},
    {y: 1.5, rad: r * 0.34, ht: 0.58},
  ];
  return (
    <group>
      {/* Ständer + Stamm */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.24, 0.2, 8]} />
        <meshStandardMaterial color="#9b2b23" flatShading roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.4, 6]} />
        <meshStandardMaterial color="#5e3b22" flatShading />
      </mesh>
      {layers.map((l, i) => (
        <mesh key={i} material={i % 2 ? needleDark : needle} position={[0, l.y + l.ht / 2, 0]} rotation={[0, i * 0.6, 0]} castShadow receiveShadow>
          <coneGeometry args={[l.rad, l.ht, 9, 1]} />
        </mesh>
      ))}
      {/* Stern */}
      <mesh position={[0, h + 0.08, 0]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color="#ffd54a" emissive="#ffb300" emissiveIntensity={0.7 * (1 - burnt)} flatShading />
      </mesh>
      {deco.balls.map((b, i) => (
        <mesh key={i} position={b.p} castShadow>
          <icosahedronGeometry args={[b.s, 1]} />
          <meshStandardMaterial color={b.c} roughness={0.25} metalness={0.4} flatShading />
        </mesh>
      ))}
      {deco.lights.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.018, 6, 4]} />
          <meshBasicMaterial color={(i + Math.floor(time * 2)) % 3 ? '#fff1b8' : '#ffd36b'} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0, 1.0, 0.5]} intensity={(1 - burnt) * 1.2} color="#ffd892" distance={3} decay={1.6} />
      {/* Geschenke darunter */}
      {gifts && (
        <group>
          {[
            [0.55, 0.45, 0.4, 0, 0.36, 0.26, 0.3],
            [-0.5, 0.42, -0.3, 1, 0.3, 0.22, 0.3],
            [0.05, 0.62, 0.2, 2, 0.4, 0.2, 0.32],
            [-0.15, 0.85, 0.9, 3, 0.26, 0.3, 0.24],
            [0.62, -0.05, -0.5, 4, 0.28, 0.18, 0.26],
            [-0.62, -0.15, 0.6, 5, 0.3, 0.24, 0.3],
          ].map(([x, z, ry, c, w, hh, d], i) => (
            <group key={i} position={[x, 0, z]} rotation={[0, ry, 0]}>
              <Gift color={c} w={w} h={hh} d={d} />
            </group>
          ))}
        </group>
      )}
      {/* Feuer */}
      {fire > 0.01 && (
        <>
          <FlameTongues tongues={tongues} time={time} amount={clamp(fire * 6)} />
          <pointLight position={[0, Math.min(2.2, 0.6 + fire * 1.2), 0.6]} intensity={(4 + fire * 9) * flick} color="#ff8a2a" distance={10} decay={1.3} />
          <pointLight position={[-1.2, 1.4, 1.4]} intensity={(1.5 + fire * 3) * flick} color="#ff7a20" distance={8} decay={1.5} />
        </>
      )}
      {smoke > 0.01 && <SmokeLayer amount={smoke} time={time} bounds={smokeBounds} column={clamp(fire * 2)} />}
    </group>
  );
};

// ---------------------------------------------------------------- Türen
export type DoorKind = 'zimmer' | 'wohnung' | 'haus';
const DOOR_STYLE: Record<DoorKind, {leaf: string; w: number; h: number; glass: boolean}> = {
  zimmer: {leaf: '#f4f1ea', w: 0.86, h: 2.0, glass: false},
  wohnung: {leaf: '#7a5233', w: 0.94, h: 2.05, glass: false},
  haus: {leaf: '#3d5a4e', w: 1.05, h: 2.15, glass: true},
};

/**
 * Türblatt mit Griff. Ursprung = Boden an der Scharnier-Seite, Tür liegt geschlossen entlang +x (Breite w).
 * open 0 = zu, 1 = 100° offen (schwingt nach +z). smoke > 0: hinter der Türöffnung (−z) Glut + Rauch.
 */
export const DoorLeaf = ({kind, open, smoke = 0, time}: {kind: DoorKind; open: number; smoke?: number; time: number}) => {
  const st = DOOR_STYLE[kind];
  const ang = -clamp(open) * 1.75;
  const flick = 0.8 + 0.2 * Math.sin(time * 11) + 0.1 * Math.sin(time * 23);
  return (
    <group>
      <group rotation={[0, ang, 0]}>
        <mesh position={[st.w / 2, st.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[st.w - 0.02, st.h - 0.01, 0.045]} />
          <meshStandardMaterial color={st.leaf} roughness={0.6} flatShading />
        </mesh>
        {/* Füllungen */}
        {!st.glass &&
          [0.55, 1.42].map((y) => (
            <mesh key={y} position={[st.w / 2, y, 0.026]}>
              <boxGeometry args={[st.w - 0.24, y < 1 ? 0.7 : 0.82, 0.008]} />
              <meshStandardMaterial color={new THREE.Color(st.leaf).multiplyScalar(0.9).getStyle()} roughness={0.6} />
            </mesh>
          ))}
        {st.glass && (
          <mesh position={[st.w / 2, 1.35, 0.026]}>
            <boxGeometry args={[st.w - 0.3, 1.0, 0.01]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffcf86" emissiveIntensity={0.6} roughness={0.2} />
          </mesh>
        )}
        {/* Griff (beide Seiten) */}
        {[-1, 1].map((k) => (
          <group key={k} position={[st.w - 0.1, 1.02, k * 0.045]}>
            <mesh>
              <boxGeometry args={[0.03, 0.03, 0.04]} />
              <meshStandardMaterial color="#c9ced3" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[-0.06, 0, k * 0.02]}>
              <boxGeometry args={[0.13, 0.025, 0.025]} />
              <meshStandardMaterial color="#c9ced3" metalness={0.8} roughness={0.25} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Glut + Rauch hinter der Tür (nur zu sehen, solange sie offen ist) */}
      {smoke > 0.01 && (
        <group position={[st.w / 2, 0, -0.06]}>
          <mesh position={[0, st.h / 2, -0.9]}>
            <boxGeometry args={[st.w + 0.6, st.h + 0.3, 0.05]} />
            <meshBasicMaterial color={new THREE.Color('#ff7a26').multiplyScalar(0.55 + 0.25 * flick).getStyle()} toneMapped={false} />
          </mesh>
          <mesh position={[0, st.h - 0.35, -0.5]}>
            <boxGeometry args={[st.w + 0.6, 0.7, 0.7]} />
            <meshStandardMaterial color="#3e4045" roughness={1} flatShading transparent opacity={0.92} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const k = ((time * 0.45 + i / 6) % 1) * clamp(open * 3);
            return (
              <mesh key={i} position={[(i % 3 - 1) * 0.25, st.h - 0.25 - (i % 2) * 0.2, -0.3 + k * 0.9]} scale={0.12 + k * 0.25} rotation={[i, i * 0.5, 0]}>
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#45474c" roughness={1} flatShading transparent opacity={0.85 * (1 - k * 0.6) * clamp(open * 3)} />
              </mesh>
            );
          })}
          <pointLight position={[0, 1.0, 0.4]} intensity={2.2 * flick * clamp(open * 2)} color="#ff8a2a" distance={4} decay={1.6} />
        </group>
      )}
    </group>
  );
};

// ---------------------------------------------------------------- Eimer
/** Eimer mit Wasser. Ursprung = Boden-Mitte, Höhe 0,3 m */
export const Bucket = ({time = 0, slosh = 0}: {time?: number; slosh?: number}) => (
  <group>
    <mesh position={[0, 0.15, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.115, 0.3, 10, 1, true]} />
      <meshStandardMaterial color="#4a8fd0" roughness={0.45} flatShading side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.005, 0]}>
      <cylinderGeometry args={[0.115, 0.115, 0.01, 10]} />
      <meshStandardMaterial color="#3f7db8" />
    </mesh>
    <mesh position={[0, 0.25, 0]} rotation={[Math.sin(time * 9) * 0.08 * slosh, 0, Math.cos(time * 7) * 0.08 * slosh]}>
      <cylinderGeometry args={[0.14, 0.14, 0.012, 10]} />
      <meshStandardMaterial color="#8fd3ff" roughness={0.1} metalness={0.1} emissive="#3a8ac0" emissiveIntensity={0.25} />
    </mesh>
    <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0]}>
      <torusGeometry args={[0.152, 0.012, 4, 14, Math.PI]} />
      <meshStandardMaterial color="#d9dde2" metalness={0.6} roughness={0.3} />
    </mesh>
  </group>
);

// ---------------------------------------------------------------- Feuerwehrauto
/**
 * Feuerwehrauto (stilisiert, ohne Logos/Schrift). Länge ca. 6,8 m, Front zeigt nach +z.
 * spin = Raddrehung (Bogenmaß). Blaulicht blinkt immer.
 */
export const FireTruck = ({spin = 0, time}: {spin?: number; time: number}) => {
  const red = useMemo(() => flat('#d0261d', {roughness: 0.4}), []);
  const dark = useMemo(() => flat('#24272b'), []);
  const steel = useMemo(() => new THREE.MeshStandardMaterial({color: '#c4cad0', metalness: 0.7, roughness: 0.3}), []);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({color: '#203445', roughness: 0.1, metalness: 0.5}), []);
  const blink = (ph: number) => (Math.sin(time * 14 + ph) > 0.2 ? 1 : 0.15);
  const L = 6.8;
  return (
    <group>
      {/* Fahrgestell */}
      <mesh material={dark} position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[2.2, 0.35, L - 0.2]} />
      </mesh>
      {/* Kabine vorne */}
      <mesh material={red} position={[0, 1.55, L / 2 - 1.05]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.85, 2.0]} />
      </mesh>
      <mesh material={glass} position={[0, 1.95, L / 2 - 0.04]}>
        <boxGeometry args={[2.2, 0.85, 0.04]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={glass} position={[s * 1.21, 1.95, L / 2 - 0.75]}>
          <boxGeometry args={[0.03, 0.75, 1.0]} />
        </mesh>
      ))}
      {/* Aufbau hinten mit Rollläden */}
      <mesh material={red} position={[0, 1.7, -0.95]} castShadow receiveShadow>
        <boxGeometry args={[2.45, 2.2, 4.6]} />
      </mesh>
      {[-1, 1].map((s) =>
        [-2.5, -1.0, 0.5].map((z) => (
          <mesh key={`${s}${z}`} material={steel} position={[s * 1.235, 1.75, z + 0.1]}>
            <boxGeometry args={[0.02, 1.45, 1.3]} />
          </mesh>
        )),
      )}
      {/* weißer Streifen */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.23, 0.88, 0]}>
          <boxGeometry args={[0.02, 0.14, L - 0.3]} />
          <meshStandardMaterial color="#f2f2f2" />
        </mesh>
      ))}
      {/* Leiter auf dem Dach */}
      <group position={[0, 2.92, -0.9]}>
        {[-0.38, 0.38].map((x) => (
          <mesh key={x} material={steel} position={[x, 0, 0]}>
            <boxGeometry args={[0.07, 0.07, 4.9]} />
          </mesh>
        ))}
        {Array.from({length: 12}, (_, i) => (
          <mesh key={i} material={steel} position={[0, 0, -2.3 + i * 0.42]}>
            <boxGeometry args={[0.76, 0.035, 0.035]} />
          </mesh>
        ))}
      </group>
      {/* Blaulichter */}
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={x} position={[x, 2.56, L / 2 - 1.0]}>
          <boxGeometry args={[0.45, 0.16, 0.22]} />
          <meshBasicMaterial color={new THREE.Color('#2e7bff').multiplyScalar(blink(i * Math.PI)).getStyle()} toneMapped={false} />
        </mesh>
      ))}
      {[-0.95, 0.95].map((x, i) => (
        <mesh key={x} position={[x, 2.88, -3.1]}>
          <boxGeometry args={[0.2, 0.14, 0.2]} />
          <meshBasicMaterial color={new THREE.Color('#2e7bff').multiplyScalar(blink(i * Math.PI + 1)).getStyle()} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0, 3.1, L / 2 - 1.0]} intensity={6 * blink(0)} color="#3d7dff" distance={14} decay={1.3} />
      {/* Scheinwerfer */}
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, 0.95, L / 2 + 0.005]}>
          <boxGeometry args={[0.35, 0.2, 0.03]} />
          <meshBasicMaterial color="#fff6d8" toneMapped={false} />
        </mesh>
      ))}
      {/* Stoßstange */}
      <mesh material={steel} position={[0, 0.55, L / 2 + 0.05]}>
        <boxGeometry args={[2.35, 0.25, 0.12]} />
      </mesh>
      {/* Räder */}
      {[
        [L / 2 - 1.1, 1],
        [L / 2 - 1.1, -1],
        [-1.5, 1],
        [-1.5, -1],
        [-2.55, 1],
        [-2.55, -1],
      ].map(([z, s], i) => (
        <group key={i} position={[s * 1.08, 0.5, z]} rotation={[spin, 0, Math.PI / 2]}>
          <mesh material={dark} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 0.36, 12]} />
          </mesh>
          <mesh material={steel} position={[0, -s * 0.19, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Zeit in Sekunden (für Flackern) */
export const useSeconds = () => useCurrentFrame() / 30;
