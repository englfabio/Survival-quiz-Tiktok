import {useLayoutEffect, useMemo, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {plankTexture, Plant, Room, Sofa, std} from './Rooms';
import type {StageCam, StageDef} from './types';

/**
 * Bühnen für "Weihnachtsbaum-Brand" (wiederverwendbar):
 *  - "weihnachtszimmer": gemütliches Wohnzimmer am Abend, Sofa, Teppich, Fenster mit Schnee draußen,
 *    Zimmertür zum Flur (linke Wand). Der Weihnachtsbaum ist ein eigenes Objekt ("weihnachtsbaum", Feuer + Rauch).
 *  - "flur": Wohnungsflur mit Zimmertür (rechte Wand) und Wohnungstür (Rückwand) – beide Türen sind eigene Objekte.
 *  - "hauseingang": Mehrfamilienhaus von außen bei Nacht im Schnee, Weg zur Straße, Straßenlaternen.
 * Koordinaten siehe CLAUDE.md ("Weihnachts-Koordinaten").
 */

// ---------------------------------------------------------------- Bausteine
type Hole = {c: number; y0: number; w: number; h: number};

/** Wand mit rechteckigen Öffnungen (Türen/Fenster). Lokal: x −len/2 … len/2, y 0 … H, Vorderseite +z */
export const HoleWall = ({len, H, holes, material}: {len: number; H: number; holes: Hole[]; material: THREE.Material}) => {
  const parts: {x: number; y: number; w: number; h: number}[] = [];
  const sorted = [...holes].sort((a, b) => a.c - b.c);
  let cur = -len / 2;
  for (const h of sorted) {
    const l = h.c - h.w / 2;
    if (l > cur) parts.push({x: (cur + l) / 2, y: H / 2, w: l - cur, h: H});
    if (h.y0 > 0) parts.push({x: h.c, y: h.y0 / 2, w: h.w, h: h.y0});
    const top = h.y0 + h.h;
    if (top < H) parts.push({x: h.c, y: (top + H) / 2, w: h.w, h: H - top});
    cur = h.c + h.w / 2;
  }
  if (cur < len / 2) parts.push({x: (cur + len / 2) / 2, y: H / 2, w: len / 2 - cur, h: H});
  return (
    <group>
      {parts.map((p, i) => (
        <mesh key={i} material={material} position={[p.x, p.y, 0]} receiveShadow>
          <planeGeometry args={[p.w, p.h]} />
        </mesh>
      ))}
    </group>
  );
};

/** Rahmen um eine Öffnung (Zarge), steht beidseitig aus der Wand. Lokal wie HoleWall */
const Frame = ({h, color = '#f4f1ea', depth = 0.16, bottom = false}: {h: Hole; color?: string; depth?: number; bottom?: boolean}) => (
  <group>
    {[-1, 1].map((k) => (
      <mesh key={k} position={[h.c + k * (h.w / 2 + 0.03), h.y0 + h.h / 2, 0]} castShadow>
        <boxGeometry args={[0.07, h.h + 0.06, depth]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    ))}
    <mesh position={[h.c, h.y0 + h.h + 0.03, 0]}>
      <boxGeometry args={[h.w + 0.13, 0.07, depth]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
    {bottom && (
      <mesh position={[h.c, h.y0 - 0.02, 0.02]}>
        <boxGeometry args={[h.w + 0.13, 0.05, depth + 0.06]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    )}
  </group>
);

/** Fallender Schnee in einem Kasten um "center" */
export const Snowfall = ({tau, center, box = [16, 10, 16], count = 380}: {tau: number; center: [number, number, number]; box?: [number, number, number]; count?: number}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const r = rng(61);
    return Array.from({length: count}, () => ({x: r(), y: r(), z: r(), s: 0.02 + r() * 0.025, sp: 0.45 + r() * 0.4, ph: r() * 6}));
  }, [count]);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const wrap = (v: number) => ((v % 1) + 1) % 1;
    seeds.forEach((p, i) => {
      o.position.set(
        center[0] + (wrap(p.x + Math.sin(tau * 0.7 + p.ph) * 0.01 + tau * 0.004) - 0.5) * box[0],
        center[1] + (wrap(p.y - (tau * p.sp) / box[1]) - 0.5) * box[1],
        center[2] + (wrap(p.z + Math.cos(tau * 0.6 + p.ph) * 0.01) - 0.5) * box[2],
      );
      o.scale.setScalar(p.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [seeds, tau, center, box]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, seeds.length]} frustumCulled={false}>
      <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
    </instancedMesh>
  );
};

const Stars = ({radius = 300, count = 600}: {radius?: number; count?: number}) => {
  const geo = useMemo(() => {
    const r = rng(9);
    const pts: number[] = [];
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const e = 0.15 + r() * 1.2;
      pts.push(Math.cos(a) * Math.cos(e) * radius, Math.sin(e) * radius, Math.sin(a) * Math.cos(e) * radius);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [radius, count]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#e9efff" size={1.6} sizeAttenuation={false} fog={false} transparent opacity={0.85} />
    </points>
  );
};

/** Verschneite Tanne (low poly). Ursprung = Boden */
export const SnowyPine = ({s = 1}: {s?: number}) => (
  <group scale={s}>
    <mesh position={[0, 0.25, 0]}>
      <cylinderGeometry args={[0.08, 0.1, 0.5, 6]} />
      <meshStandardMaterial color="#4a3324" flatShading />
    </mesh>
    {[
      [0.4, 0.9, 0.95],
      [1.0, 0.7, 0.8],
      [1.55, 0.48, 0.65],
    ].map(([y, r, h], i) => (
      <group key={i}>
        <mesh position={[0, y + h / 2, 0]} castShadow>
          <coneGeometry args={[r, h, 7]} />
          <meshStandardMaterial color="#24503a" flatShading />
        </mesh>
        <mesh position={[0, y + h * 0.78, 0]}>
          <coneGeometry args={[r * 0.48, h * 0.42, 7]} />
          <meshStandardMaterial color="#eef3f8" flatShading />
        </mesh>
      </group>
    ))}
  </group>
);

/** Kleines Haus (Hintergrund, z. B. durchs Fenster) mit beleuchteten Fenstern und Schneedach */
const BackHouse = ({w = 6, h = 5, d = 6, color = '#8b8f9a', lit = [0, 2, 3]}: {w?: number; h?: number; d?: number; color?: string; lit?: number[]}) => (
  <group>
    <mesh position={[0, h / 2, 0]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
    <mesh position={[0, h + 0.9, 0]} rotation={[0, 0, 0]}>
      <cylinderGeometry args={[0.01, w * 0.62, 1.8, 4, 1]} />
      <meshStandardMaterial color="#eef3f8" flatShading />
    </mesh>
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} position={[(i % 2 ? 1 : -1) * w * 0.22, h * (i < 2 ? 0.3 : 0.68), d / 2 + 0.02]}>
        <planeGeometry args={[0.9, 0.8]} />
        <meshBasicMaterial color={lit.includes(i) ? '#ffcf7a' : '#2b3446'} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

/** Blick nach draußen: Nachthimmel, Schnee, Nachbarhäuser, Schneefall (in Welt-Koordinaten hinter einem Fenster) */
const NightView = ({tau, at}: {tau: number; at: [number, number, number]}) => (
  <group position={at}>
    <mesh position={[0, 3, -14]}>
      <planeGeometry args={[60, 30]} />
      <meshBasicMaterial color="#14223f" />
    </mesh>
    <mesh position={[0, 6.5, -13.9]}>
      <planeGeometry args={[60, 10]} />
      <meshBasicMaterial color="#0d1730" />
    </mesh>
    <mesh position={[0, -1.4, -6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 20]} />
      <meshStandardMaterial color="#dfe8f3" roughness={1} />
    </mesh>
    <group position={[-4, -1.4, -11]} rotation={[0, 0.2, 0]}>
      <BackHouse w={5} h={4.5} color="#9b7f72" lit={[0, 3]} />
    </group>
    <group position={[4.5, -1.4, -12]} rotation={[0, -0.25, 0]}>
      <BackHouse w={6} h={5.5} color="#7f8aa0" lit={[1, 2]} />
    </group>
    {[
      [-1.0, -5],
      [1.6, -6.5],
      [-6.5, -7],
    ].map(([x, z], i) => (
      <group key={i} position={[x, -1.4, z]}>
        <SnowyPine s={1.4 + i * 0.3} />
      </group>
    ))}
    <pointLight position={[0, 3, -3]} intensity={3} color="#aec6ff" distance={20} decay={1.2} />
    <Snowfall tau={tau} center={[0, 1, -3.5]} box={[6, 6, 5]} count={160} />
  </group>
);

// ---------------------------------------------------------------- Weihnachts-Wohnzimmer
/**
 * W 5.2, D 4.6, H 2.6 → Rückwand z −2.3, linke Wand x −2.6, rechte Wand x 2.6.
 * Fenster in der Rückwand (Mitte x −0.55, 1,4 m breit, y 0.85 … 2.15). Zimmertür in der linken Wand (Mitte z 0.75, 0,9 m breit).
 * Weihnachtsbaum hierhin: x 1.5, z −1.5, face 180. Sofa an der linken Wand (Sitzmitte x −2.05, z −1.0, schaut nach +x).
 */
export const XMAS = {W: 5.2, D: 4.6, H: 2.6, door: {x: -2.6, z: 0.75, w: 0.9, h: 2.05}, window: {x: -0.55, w: 1.4, y: 0.85, h: 1.3}, tree: {x: 1.5, z: -1.5}};

const ChristmasRoomScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tau = frame / fps;
  const {W, D, H} = XMAS;
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: plankTexture([3, 6]), roughness: 0.7}),
      wall: std('#efe1c8', {roughness: 0.95, flatShading: false}),
      back: std('#b9574a', {roughness: 0.95, flatShading: false}),
    }),
    [],
  );
  const win: Hole = {c: XMAS.window.x, y0: XMAS.window.y, w: XMAS.window.w, h: XMAS.window.h};
  const sideLen = D + 6;
  const zc = (-D / 2 + D / 2 + 6) / 2; // Mitte der Seitenwände (z)
  const door: Hole = {c: -(XMAS.door.z - zc), y0: 0, w: XMAS.door.w, h: XMAS.door.h};
  return (
    <Room
      W={W}
      D={D}
      H={H}
      floor={mats.floor}
      wall={mats.wall}
      ceiling="#f3eee5"
      walls={false}
      bg="#10182a"
      sunPos={[-1.2, 3.2, -6]}
      ceilingLamp={false}
      light={{ambient: 0.32, hemi: 0.38, sun: 0.55, sunColor: '#9fb8ff', lamp: 2.4, lampColor: '#ffd9a8'}}
    >
      {/* Wände mit Fenster (hinten) und Tür (links) */}
      <group position={[0, 0, -D / 2]}>
        <HoleWall len={W} H={H} holes={[win]} material={mats.back} />
        <Frame h={win} color="#f7f4ee" />
        {/* Fensterkreuz + Fensterbank */}
        <mesh position={[win.c, win.y0 + win.h / 2, 0.01]}>
          <boxGeometry args={[0.06, win.h, 0.06]} />
          <meshStandardMaterial color="#f7f4ee" />
        </mesh>
        <mesh position={[win.c, win.y0 + win.h * 0.62, 0.01]}>
          <boxGeometry args={[win.w, 0.06, 0.06]} />
          <meshStandardMaterial color="#f7f4ee" />
        </mesh>
        <mesh position={[win.c, win.y0 - 0.03, 0.1]}>
          <boxGeometry args={[win.w + 0.3, 0.05, 0.22]} />
          <meshStandardMaterial color="#f7f4ee" />
        </mesh>
        {/* leuchtender Fensterstern */}
        <group position={[win.c - 0.35, win.y0 + win.h - 0.35, 0.05]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial color="#fff2c4" emissive="#ffd36b" emissiveIntensity={1.4} flatShading />
          </mesh>
          <pointLight intensity={0.8} color="#ffd892" distance={2} decay={1.6} />
        </group>
        <NightView tau={tau} at={[win.c, 1.4, -0.2]} />
      </group>
      <group position={[-W / 2, 0, zc]} rotation={[0, Math.PI / 2, 0]}>
        <HoleWall len={sideLen} H={H} holes={[door]} material={mats.wall} />
        <Frame h={door} />
      </group>
      <group position={[W / 2, 0, zc]} rotation={[0, -Math.PI / 2, 0]}>
        <HoleWall len={sideLen} H={H} holes={[]} material={mats.wall} />
      </group>
      {/* Blick durch die Tür: Flur (dämmrig) + offenes Türblatt */}
      <group position={[-W / 2 - 1.1, 0, XMAS.door.z]}>
        <mesh position={[0, H / 2, 0]}>
          <boxGeometry args={[2.0, H, 2.6]} />
          <meshStandardMaterial color="#c9b79a" side={THREE.BackSide} roughness={1} />
        </mesh>
        <pointLight position={[0, 2.2, 0]} intensity={1.2} color="#ffe2b8" distance={4} decay={1.5} />
      </group>
      <group position={[-W / 2 - 0.02, 0, XMAS.door.z - XMAS.door.w / 2]} rotation={[0, -Math.PI / 2 - 1.5, 0]}>
        <mesh position={[0.43, 1.0, 0]}>
          <boxGeometry args={[0.84, 1.99, 0.045]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.6} flatShading />
        </mesh>
      </group>
      {/* Fußleisten */}
      <mesh position={[0, 0.05, -D / 2 + 0.01]}>
        <boxGeometry args={[W, 0.1, 0.02]} />
        <meshStandardMaterial color="#f2efe9" />
      </mesh>
      {/* Sofa an der linken Wand */}
      <group position={[-2.05, 0, -1.0]} rotation={[0, Math.PI / 2, 0]}>
        <Sofa color="#3f6f68" />
      </group>
      {/* Teppich + runder Beistelltisch */}
      <mesh position={[-0.2, 0.006, -0.45]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.8, 1.9]} />
        <meshStandardMaterial color="#b8463f" />
      </mesh>
      <mesh position={[-0.2, 0.008, -0.45]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.5, 1.6]} />
        <meshStandardMaterial color="#e9dcc2" />
      </mesh>
      <group position={[-1.15, 0, -0.95]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.04, 14]} />
          <meshStandardMaterial color="#8a5d3b" flatShading />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 0.44, 8]} />
          <meshStandardMaterial color="#6e482c" />
        </mesh>
        {/* Teller mit Plätzchen + Tasse */}
        <mesh position={[0.06, 0.48, 0.05]}>
          <cylinderGeometry args={[0.13, 0.11, 0.02, 12]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0.06 + Math.cos(i * 1.6) * 0.06, 0.5, 0.05 + Math.sin(i * 1.6) * 0.06]} rotation={[0, i, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.012, i % 2 ? 6 : 5]} />
            <meshStandardMaterial color={i % 2 ? '#c98a4a' : '#e0b070'} flatShading />
          </mesh>
        ))}
        <mesh position={[-0.14, 0.51, -0.08]}>
          <cylinderGeometry args={[0.04, 0.035, 0.09, 10]} />
          <meshStandardMaterial color="#c0392b" />
        </mesh>
      </group>
      {/* Stehlampe (warmes Licht) */}
      <group position={[-1.6, 0, -2.0]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.6, 6]} />
          <meshStandardMaterial color="#2f3338" />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 10]} />
          <meshStandardMaterial color="#2f3338" />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <cylinderGeometry args={[0.14, 0.24, 0.3, 10, 1, true]} />
          <meshStandardMaterial color="#fff1d0" emissive="#ffd896" emissiveIntensity={0.9} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 1.55, 0.15]} intensity={3.2} color="#ffd29a" distance={5} decay={1.5} />
      </group>
      {/* Regal rechts vorn mit Büchern + Kerzenhalter (aus) */}
      <group position={[W / 2 - 0.2, 0, 0.6]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[0.35, 1.8, 0.9]} />
          <meshStandardMaterial color="#9b7651" flatShading />
        </mesh>
        {[0.45, 0.9, 1.35].map((y) =>
          [-0.3, -0.18, -0.06, 0.08, 0.2, 0.3].map((z, i) => (
            <mesh key={`${y}${i}`} position={[-0.19, y + 0.15, z]}>
              <boxGeometry args={[0.04, 0.26 - (i % 3) * 0.03, 0.09]} />
              <meshStandardMaterial color={['#c9573c', '#3f6fa6', '#e3b94b', '#4f8f63', '#7d4f8f', '#dfe4e8'][i]} />
            </mesh>
          )),
        )}
      </group>
      <group position={[2.25, 0, 1.6]}>
        <Plant s={1.2} />
      </group>
      {/* Bild an der rechten Wand */}
      <group position={[W / 2 - 0.02, 1.55, -0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.55, 0.03]} />
          <meshStandardMaterial color="#f3ede0" />
        </mesh>
        <mesh position={[0, 0.06, 0.02]}>
          <planeGeometry args={[0.68, 0.32]} />
          <meshStandardMaterial color="#20385f" />
        </mesh>
        <mesh position={[0, -0.12, 0.022]}>
          <planeGeometry args={[0.68, 0.12]} />
          <meshStandardMaterial color="#e8eef5" />
        </mesh>
      </group>
      {/* Girlande über dem Fenster */}
      {Array.from({length: 13}, (_, i) => {
        const k = i / 12;
        const x = XMAS.window.x - 0.95 + k * 1.9;
        const y = 2.4 - Math.sin(k * Math.PI) * 0.12;
        return (
          <mesh key={i} position={[x, y, -D / 2 + 0.06]} rotation={[i, i * 0.7, 0]}>
            <icosahedronGeometry args={[0.07, 0]} />
            <meshStandardMaterial color={i % 4 === 2 ? '#d8342c' : '#2f6e45'} flatShading />
          </mesh>
        );
      })}
    </Room>
  );
};

// ---------------------------------------------------------------- Flur
/**
 * Flur: W 2.4 (x −1.2 … 1.2), D 6 → Rückwand z −3, H 2.6.
 * Zimmertür (zum Wohnzimmer) in der rechten Wand: Öffnung z −1.25 … −0.35.
 *   Türblatt "zimmertuer": x 1.2, z −1.25, face 270 (door 1 = offen in den Flur, smoke > 0 = Glut + Rauch dahinter).
 * Wohnungstür in der Rückwand: Öffnung x −0.47 … 0.47. Türblatt "wohnungstuer": x −0.47, z −3, face 180.
 */
export const HALL = {W: 2.4, D: 6, H: 2.6, roomDoor: {z0: -1.25, z1: -0.35}, flatDoor: {x0: -0.47, x1: 0.47}};

/** Flur; wreath = Weihnachtskranz an der Wand (nur in der Weihnachts-Version "flur") */
const HallBase = ({wreath}: {wreath: boolean}) => {
  const {W, D, H} = HALL;
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: plankTexture([2, 7]), roughness: 0.7}),
      wall: std('#efe6d6', {roughness: 0.95, flatShading: false}),
    }),
    [],
  );
  const sideLen = D + 6;
  const zc = 3; // Mitte der Seitenwände (z)
  const roomDoor: Hole = {c: (HALL.roomDoor.z0 + HALL.roomDoor.z1) / 2 - zc, y0: 0, w: 0.9, h: 2.02};
  const flatDoor: Hole = {c: 0, y0: 0, w: 0.94, h: 2.07};
  return (
    <Room
      W={W}
      D={D}
      H={H}
      floor={mats.floor}
      wall={mats.wall}
      ceiling="#f5f1ea"
      walls={false}
      bg="#1a1c22"
      sunPos={[1.5, 4, 3]}
      light={{ambient: 0.45, hemi: 0.5, sun: 0.7, sunColor: '#ffe9cc', lamp: 3.5, lampColor: '#ffe2b8'}}
    >
      <group position={[0, 0, -D / 2]}>
        <HoleWall len={W} H={H} holes={[flatDoor]} material={mats.wall} />
        <Frame h={flatDoor} color="#e8e2d6" />
      </group>
      {/* Treppenhaus hinter der Wohnungstür (dämmrig) */}
      <mesh position={[0, H / 2, -D / 2 - 1.2]}>
        <boxGeometry args={[2.4, H, 2.3]} />
        <meshStandardMaterial color="#9aa3ad" side={THREE.BackSide} roughness={1} />
      </mesh>
      <pointLight position={[0, 2.2, -D / 2 - 1.0]} intensity={1.5} color="#e8f0ff" distance={4} decay={1.5} />
      <group position={[-W / 2, 0, zc]} rotation={[0, Math.PI / 2, 0]}>
        <HoleWall len={sideLen} H={H} holes={[]} material={mats.wall} />
      </group>
      <group position={[W / 2, 0, zc]} rotation={[0, -Math.PI / 2, 0]}>
        <HoleWall len={sideLen} H={H} holes={[roomDoor]} material={mats.wall} />
        <Frame h={roomDoor} />
      </group>
      {/* Läufer */}
      <mesh position={[0, 0.006, -0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.95, 3.6]} />
        <meshStandardMaterial color="#7a3b35" />
      </mesh>
      <mesh position={[0, 0.008, -0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.8, 3.45]} />
        <meshStandardMaterial color="#a8534a" />
      </mesh>
      {/* Garderobe links mit Jacken + Schuhschrank */}
      <group position={[-W / 2 + 0.05, 0, -0.3]}>
        <mesh position={[0, 1.75, 0]}>
          <boxGeometry args={[0.06, 0.08, 1.2]} />
          <meshStandardMaterial color="#8a5d3b" />
        </mesh>
        {[
          [-0.35, '#2f5f8f'],
          [0.05, '#b8463f'],
          [0.4, '#4f7f4f'],
        ].map(([z, c], i) => (
          <mesh key={i} position={[0.12, 1.32, z as number]} castShadow>
            <boxGeometry args={[0.16, 0.75, 0.32]} />
            <meshStandardMaterial color={c as string} flatShading />
          </mesh>
        ))}
        <mesh position={[0.17, 0.25, 0.1]} castShadow>
          <boxGeometry args={[0.32, 0.5, 1.0]} />
          <meshStandardMaterial color="#f2efe9" flatShading />
        </mesh>
      </group>
      {/* Spiegel links */}
      <mesh position={[-W / 2 + 0.02, 1.5, -1.9]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.5, 0.8, 0.02]} />
        <meshStandardMaterial color="#b9d3e2" roughness={0.05} metalness={0.6} />
      </mesh>
      {/* Bild rechts */}
      <mesh position={[W / 2 - 0.02, 1.55, 0.9]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[0.6, 0.45, 0.02]} />
        <meshStandardMaterial color="#d9a441" />
      </mesh>
      {/* Kranz an der Wohnungstür (Wandseite) */}
      {wreath && <mesh position={[0.78, 1.6, -D / 2 + 0.05]}>
        <torusGeometry args={[0.13, 0.05, 6, 12]} />
        <meshStandardMaterial color="#2f6e45" flatShading />
      </mesh>}
    </Room>
  );
};

// ---------------------------------------------------------------- Hauseingang
/**
 * Draußen bei Nacht im Schnee. Hausfront bei z −4 (Haus x −8 … 8, 3 Stockwerke), Haustür-Öffnung x −0.52 … 0.52.
 * Türblatt "haustuer": x −0.52, z −4, face 180. Weg von der Tür bis zum Gehweg (z −4 … 4.5), Gehweg z 4.5 … 6.2,
 * Straße z 6.4 … 12.5 entlang x (Feuerwehrauto auf der Straße: z 9.4, face 90 = fährt nach +x).
 * Straßenlaternen bei (−5, 5.6) und (6.5, 5.6).
 */
export const OUTSIDE = {front: -4, door: {x0: -0.52, x1: 0.52}, street: {z0: 6.4, z1: 12.5, lane: 9.4}};

const StreetLamp = ({x, z}: {x: number; z: number}) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 2.2, 0]}>
      <cylinderGeometry args={[0.05, 0.07, 4.4, 6]} />
      <meshStandardMaterial color="#2c3036" metalness={0.5} />
    </mesh>
    <mesh position={[0, 4.45, 0]}>
      <cylinderGeometry args={[0.12, 0.25, 0.3, 6]} />
      <meshStandardMaterial color="#2c3036" />
    </mesh>
    <mesh position={[0, 4.28, 0]}>
      <sphereGeometry args={[0.13, 8, 6]} />
      <meshBasicMaterial color="#ffe0a3" toneMapped={false} />
    </mesh>
    <pointLight position={[0, 4.1, 0]} intensity={14} color="#ffd59a" distance={14} decay={1.4} />
  </group>
);

const House = () => {
  const wall = useMemo(() => std('#d7c7a8', {roughness: 0.95}), []);
  const {front} = OUTSIDE;
  const W = 16;
  const H = 9.6;
  const doorHole: Hole = {c: 0, y0: 0.3, w: 1.04, h: 2.15};
  const lit = [1, 2, 4, 7, 8, 10];
  return (
    <group>
      <group position={[0, 0, front]}>
        <HoleWall len={W} H={H} holes={[doorHole]} material={wall} />
        <Frame h={doorHole} color="#e9e4da" depth={0.3} />
        {/* Hausflur hinter der Tür (warmes Licht) */}
        <mesh position={[0, 1.4, -1.2]}>
          <boxGeometry args={[1.8, 2.8, 2.2]} />
          <meshStandardMaterial color="#e7d3a8" side={THREE.BackSide} />
        </mesh>
        <pointLight position={[0, 2.3, -1.0]} intensity={2.5} color="#ffdca5" distance={4} decay={1.4} />
        {/* Fenster (3 Stockwerke × 4) */}
        {[0, 1, 2].map((fl) =>
          [-6, -3, 3, 6].map((x, i) => {
            const n = fl * 4 + i;
            return (
              <group key={`${fl}${i}`} position={[x, 1.6 + fl * 3, 0.02]}>
                <mesh>
                  <planeGeometry args={[1.3, 1.4]} />
                  <meshBasicMaterial color={lit.includes(n) ? '#ffcf7a' : '#27324a'} toneMapped={false} />
                </mesh>
                <mesh position={[0, 0, 0.02]}>
                  <boxGeometry args={[0.06, 1.4, 0.04]} />
                  <meshStandardMaterial color="#efe9de" />
                </mesh>
                <mesh position={[0, -0.74, 0.08]}>
                  <boxGeometry args={[1.5, 0.08, 0.2]} />
                  <meshStandardMaterial color="#f4f7fa" />
                </mesh>
              </group>
            );
          }),
        )}
        {/* Treppenhausfenster über der Tür */}
        {[3.6, 6.6].map((y) => (
          <mesh key={y} position={[0, y, 0.02]}>
            <planeGeometry args={[0.8, 1.6]} />
            <meshBasicMaterial color="#ffe2a8" toneMapped={false} />
          </mesh>
        ))}
        {/* Vordach + Lampe */}
        <mesh position={[0, 2.75, 0.55]} castShadow>
          <boxGeometry args={[2.0, 0.1, 1.1]} />
          <meshStandardMaterial color="#5a5f66" />
        </mesh>
        <mesh position={[0, 2.82, 0.55]}>
          <boxGeometry args={[2.0, 0.06, 1.1]} />
          <meshStandardMaterial color="#f2f6fa" />
        </mesh>
        <mesh position={[0.85, 2.3, 0.08]}>
          <boxGeometry args={[0.16, 0.24, 0.12]} />
          <meshBasicMaterial color="#ffe6b0" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 2.4, 1.0]} intensity={5} color="#ffd9a0" distance={7} decay={1.4} />
        {/* Stufe */}
        <mesh position={[0, 0.15, 0.45]} receiveShadow castShadow>
          <boxGeometry args={[1.8, 0.3, 0.9]} />
          <meshStandardMaterial color="#9aa0a8" flatShading />
        </mesh>
        <mesh position={[0, 0.31, 0.45]}>
          <boxGeometry args={[1.8, 0.02, 0.9]} />
          <meshStandardMaterial color="#e9eff5" />
        </mesh>
      </group>
      {/* Hauskörper + Dach (Schnee) */}
      <mesh position={[0, H / 2, front - 6]}>
        <boxGeometry args={[W, H, 12]} />
        <meshStandardMaterial color="#cdbd9f" flatShading />
      </mesh>
      <mesh position={[0, H + 0.12, front - 6]}>
        <boxGeometry args={[W + 0.4, 0.25, 12.4]} />
        <meshStandardMaterial color="#eef3f8" flatShading />
      </mesh>
    </group>
  );
};

const OutsideScene = ({cam}: {cam?: StageCam}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tau = frame / fps;
  const camPos = cam?.pos ?? [0, 2, 8];
  const look = cam?.look ?? [0, 1, 0];
  const center: [number, number, number] = [(camPos[0] * 2 + look[0]) / 3, (camPos[1] * 2 + look[1]) / 3, (camPos[2] * 2 + look[2]) / 3];
  const {street} = OUTSIDE;
  const mounds = useMemo(() => {
    const r = rng(4);
    return Array.from({length: 26}, (_, i) => {
      const left = i % 2 === 0;
      return {x: -24 + (i / 26) * 48 + r() * 1.5, z: left ? street.z0 - 0.3 : street.z1 + 0.4, s: 0.5 + r() * 0.6};
    });
  }, [street.z0, street.z1]);
  return (
    <>
      <color attach="background" args={['#101a33']} />
      <fog attach="fog" args={['#18233d', 22, 90]} />
      <Stars />
      <hemisphereLight args={['#7f97d6', '#2a3346', 0.85]} />
      <ambientLight intensity={0.2} color="#cfe0ff" />
      <directionalLight
        position={[-10, 14, 12]}
        intensity={0.9}
        color="#bcd0ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0006}
      />
      {/* Schneeboden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#e6edf5" roughness={1} />
      </mesh>
      {/* Weg zur Haustür + Gehweg (geräumt, mit etwas Schnee) */}
      <mesh position={[0, 0.006, (OUTSIDE.front + 4.5) / 2 + 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.8, 4.5 - OUTSIDE.front - 0.8]} />
        <meshStandardMaterial color="#a9b0b9" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.008, 5.35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 1.7]} />
        <meshStandardMaterial color="#aab1ba" roughness={0.95} />
      </mesh>
      {/* Bordstein + Straße */}
      <mesh position={[0, 0.06, street.z0 - 0.08]}>
        <boxGeometry args={[80, 0.12, 0.16]} />
        <meshStandardMaterial color="#c9ced4" />
      </mesh>
      <mesh position={[0, 0.01, (street.z0 + street.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, street.z1 - street.z0]} />
        <meshStandardMaterial color="#3d434c" roughness={0.9} />
      </mesh>
      {Array.from({length: 16}, (_, i) => (
        <mesh key={i} position={[-30 + i * 4, 0.015, (street.z0 + street.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 0.12]} />
          <meshStandardMaterial color="#d8dde3" />
        </mesh>
      ))}
      {mounds.map((m, i) => (
        <mesh key={i} position={[m.x, 0, m.z]} scale={[m.s * 1.8, m.s * 0.5, m.s]}>
          <sphereGeometry args={[1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#eef3f8" flatShading />
        </mesh>
      ))}
      <House />
      {/* Hecken mit Schnee links/rechts vom Weg */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 3.5, 0.45, 0.5]} castShadow>
            <boxGeometry args={[4.6, 0.9, 0.8]} />
            <meshStandardMaterial color="#2f5a3f" flatShading />
          </mesh>
          <mesh position={[s * 3.5, 0.93, 0.5]}>
            <boxGeometry args={[4.7, 0.1, 0.85]} />
            <meshStandardMaterial color="#eef3f8" flatShading />
          </mesh>
        </group>
      ))}
      {[
        [-8.5, 1.5, 1.6],
        [9, 2.5, 1.8],
        [-12, -1, 2],
        [13, 0, 2.1],
        [-18, 16, 2.2],
        [16, 17, 2.4],
        [2, 18, 2.0],
      ].map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]}>
          <SnowyPine s={s} />
        </group>
      ))}
      {/* Häuser gegenüber */}
      <group position={[-9, 0, 22]} rotation={[0, Math.PI, 0]}>
        <BackHouse w={8} h={6} d={7} color="#9b7f72" lit={[0, 1, 3]} />
      </group>
      <group position={[6, 0, 23]} rotation={[0, Math.PI, 0]}>
        <BackHouse w={9} h={7} d={7} color="#7f8aa0" lit={[1, 2]} />
      </group>
      <StreetLamp x={-5} z={5.6} />
      <StreetLamp x={6.5} z={5.6} />
      <Snowfall tau={tau} center={center} />
    </>
  );
};

export const christmasRoomStage: StageDef = {id: 'weihnachtszimmer', Component: ChristmasRoomScene, climbTrees: [], groundHeight: () => 0, ambience: 'feuer-knistern'};
const HallScene = () => <HallBase wreath />;
const PlainHallScene = () => <HallBase wreath={false} />;
/** Flur ohne Weihnachtsdeko (sonst wie "flur"). Platz für den Sicherungskasten rechts neben der Wohnungstür: x 0.82, z −3 */
export const plainHallStage: StageDef = {id: 'hausflur', Component: PlainHallScene, climbTrees: [], groundHeight: () => 0};
export const hallStage: StageDef = {id: 'flur', Component: HallScene, climbTrees: [], groundHeight: () => 0};
export const outsideStage: StageDef = {id: 'hauseingang', Component: OutsideScene, climbTrees: [], groundHeight: () => 0, ambience: 'winter-atmo'};
