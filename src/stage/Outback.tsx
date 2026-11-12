import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {Instances, Sky, type Inst} from './Forest';
import type {StageDef} from './types';

/**
 * Bühne "outback": Boxring mitten in der roten australischen Steppe bei Sonnenuntergang.
 * Roter Sandboden, Grasbüschel (v. a. rund um den Ring), Eukalyptusbäume, flache rote Tafelberge am Horizont,
 * tiefstehende Sonne, warmes Licht. Neben dem Ring ein Klapptisch (Ablage für Glas, Box, Milch).
 *
 * Koordinaten (1 Einheit = 1 Meter), Kamera schaut meist von +z nach −z (Sonne hinten links):
 * - Ring: Mitte (0, 0), Ringboden 0,5 m hoch (groundHeight), Kampffläche x/z −2.5 … 2.5, Eckpfosten bei ±2.6,
 *   Seile 0,45 / 0,8 / 1,15 m über dem Ringboden, Ringschürze bis ±2.85.
 * - Grasstreifen rund um den Ring (Abstand 2,9 … 4,3 m von der Mitte), vorn (+z) dichter.
 * - Klapptisch: TABLE (−3.3, 2.2), Platte 0,6 m hoch, 0,8 × 0,5 m.
 * - Eukalyptusbäume bei (−8, −7), (9, −9), (−13, 2), (12, 6), (−4, −16), (5, −22).
 */

export const OUTBACK = {ringHalf: 2.5, post: 2.6, apron: 2.85, floor: 0.5, table: {x: -3.3, z: 2.2, h: 0.6}};

const C = {
  skyTop: '#4a3f7a',
  skyHorizon: '#ff9a52',
  fog: '#e48d5c',
  sand: ['#b9532c', '#c4603a', '#a8482a', '#cf6c3f', '#b35a35'],
  grass: ['#b9a24a', '#a8963e', '#c8ae55', '#8f8a3a'],
  gum: ['#7f9a78', '#8aa585', '#6f8a6c'],
  trunk: '#e8e0d4',
  mesa: '#8c3b26',
};

const inRing = (x: number, z: number) => Math.abs(x) < OUTBACK.apron && Math.abs(z) < OUTBACK.apron;
const groundHeight = (x: number, z: number) => (inRing(x, z) ? OUTBACK.floor : 0);

// ---------- roter Sandboden ----------
const Ground = () => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(400, 400, 140, 140);
    g.rotateX(-Math.PI / 2);
    const ng = g.toNonIndexed();
    const pos = ng.attributes.position as THREE.BufferAttribute;
    const r = rng(41);
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i += 3) {
      const c = new THREE.Color(C.sand[Math.floor(r() * C.sand.length)]);
      for (let k = 0; k < 3; k++) {
        const x = pos.getX(i + k);
        const z = pos.getZ(i + k);
        const far = Math.max(0, Math.hypot(x, z) - 14);
        pos.setY(i + k, -0.01 + Math.min(2.5, far * 0.03) * Math.sin(x * 0.07 + 1) * Math.cos(z * 0.06));
        colors.push(c.r, c.g, c.b);
      }
    }
    ng.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    ng.computeVertexNormals();
    return ng;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
};

// ---------- Boxring ----------
const Ring = () => {
  const {floor, post, apron, ringHalf} = OUTBACK;
  const mats = useMemo(
    () => ({
      canvas: new THREE.MeshStandardMaterial({color: '#e9e2d2', roughness: 0.95, flatShading: true}),
      apron: new THREE.MeshStandardMaterial({color: '#1d4f91', roughness: 0.8, flatShading: true}),
      skirt: new THREE.MeshStandardMaterial({color: '#173d70', roughness: 0.9, flatShading: true}),
      stripe: new THREE.MeshStandardMaterial({color: '#ffc400', roughness: 0.7}),
      post: new THREE.MeshStandardMaterial({color: '#8c949b', metalness: 0.6, roughness: 0.35, flatShading: true}),
      red: new THREE.MeshStandardMaterial({color: '#d42a22', roughness: 0.5, flatShading: true}),
      blue: new THREE.MeshStandardMaterial({color: '#2a64c8', roughness: 0.5, flatShading: true}),
      white: new THREE.MeshStandardMaterial({color: '#f2f0ea', roughness: 0.5, flatShading: true}),
      rope: new THREE.MeshStandardMaterial({color: '#f4f1ea', roughness: 0.45}),
      ropeRed: new THREE.MeshStandardMaterial({color: '#d42a22', roughness: 0.45}),
      stool: new THREE.MeshStandardMaterial({color: '#3a3f46', roughness: 0.6, flatShading: true}),
    }),
    [],
  );
  const corners: [number, number, THREE.Material][] = [
    [-post, -post, mats.red],
    [post, -post, mats.white],
    [post, post, mats.blue],
    [-post, post, mats.white],
  ];
  const ropeH = [0.45, 0.8, 1.15];
  return (
    <group>
      {/* Podest mit Schürze */}
      <mesh material={mats.skirt} position={[0, floor / 2 - 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[apron * 2, floor - 0.04, apron * 2]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={mats.stripe} position={[0, floor - 0.13, 0]} rotation={[0, (i * Math.PI) / 2, 0]}>
          <boxGeometry args={[apron * 2 + 0.01, 0.05, apron * 2 + 0.01]} />
        </mesh>
      ))}
      <mesh material={mats.apron} position={[0, floor - 0.02, 0]} receiveShadow>
        <boxGeometry args={[apron * 2 + 0.04, 0.05, apron * 2 + 0.04]} />
      </mesh>
      <mesh material={mats.canvas} position={[0, floor + 0.006, 0]} receiveShadow>
        <boxGeometry args={[ringHalf * 2 + 0.3, 0.012, ringHalf * 2 + 0.3]} />
      </mesh>
      {/* Eckpfosten mit Polstern */}
      {corners.map(([x, z, pad], i) => (
        <group key={i} position={[x, floor, z]}>
          <mesh material={mats.post} position={[0, 0.68, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 1.36, 8]} />
          </mesh>
          <mesh material={pad} position={[0, 0.8, 0]} rotation={[0, Math.atan2(-x, -z) + Math.PI, 0]} castShadow>
            <boxGeometry args={[0.2, 0.9, 0.2]} />
          </mesh>
        </group>
      ))}
      {/* Seile */}
      {ropeH.map((h, hi) =>
        [0, 1, 2, 3].map((side) => {
          const a = corners[side];
          const b = corners[(side + 1) % 4];
          const mx = (a[0] + b[0]) / 2;
          const mz = (a[1] + b[1]) / 2;
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const rot = Math.atan2(b[0] - a[0], b[1] - a[1]);
          return (
            <mesh key={`${hi}-${side}`} material={hi === 1 ? mats.ropeRed : mats.rope} position={[mx, floor + h, mz]} rotation={[Math.PI / 2, 0, -rot]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, len, 6]} />
            </mesh>
          );
        }),
      )}
      {/* Hocker in der roten Ecke (Känguru-Ecke) */}
      <group position={[-post + 0.45, floor, -post + 0.45]}>
        <mesh material={mats.stool} position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.06, 10]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={mats.stool} position={[Math.sin(i * 2.1) * 0.14, 0.22, Math.cos(i * 2.1) * 0.14]} rotation={[Math.cos(i * 2.1) * 0.15, 0, -Math.sin(i * 2.1) * 0.15]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.45, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ---------- Klapptisch neben dem Ring ----------
const Table = () => {
  const {x, z, h} = OUTBACK.table;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h - 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.04, 0.5]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.7} flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          {[-1, 1].map((t) => (
            <mesh key={t} position={[s * 0.33, h / 2 - 0.02, t * 0.2]} rotation={[0, 0, s * 0.06]} castShadow>
              <cylinderGeometry args={[0.015, 0.015, h - 0.04, 6]} />
              <meshStandardMaterial color="#6b737a" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Handtuch über der Ecke */}
      <mesh position={[0.28, h + 0.01, -0.12]} rotation={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.22, 0.03, 0.18]} />
        <meshStandardMaterial color="#e8c13a" roughness={0.95} flatShading />
      </mesh>
    </group>
  );
};

// ---------- Eukalyptusbaum ----------
const Gum = ({x, z, s = 1, seed = 1}: {x: number; z: number; s?: number; seed?: number}) => {
  const r = useMemo(() => rng(seed * 97), [seed]);
  const parts = useMemo(() => {
    const out: {pos: [number, number, number]; sc: [number, number, number]; col: string}[] = [];
    for (let i = 0; i < 7; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.6 + r() * 1.4;
      out.push({pos: [Math.cos(a) * d, 4.2 + r() * 1.6, Math.sin(a) * d], sc: [1.0 + r() * 0.8, 0.55 + r() * 0.35, 1.0 + r() * 0.8], col: C.gum[i % 3]});
    }
    return out;
  }, [r]);
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 1.6, 0]} rotation={[0, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.16, 0.26, 3.2, 7]} />
        <meshStandardMaterial color={C.trunk} roughness={0.8} flatShading />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 0.45, 3.6, 0.1 * k]} rotation={[0.1 * k, 0, -k * 0.55]} castShadow>
          <cylinderGeometry args={[0.07, 0.12, 1.6, 6]} />
          <meshStandardMaterial color={C.trunk} roughness={0.8} flatShading />
        </mesh>
      ))}
      {parts.map((p, i) => (
        <mesh key={i} position={p.pos} scale={p.sc} castShadow>
          <icosahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial color={p.col} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Tafelberge am Horizont ----------
const Mesas = () => {
  const items = [
    {x: -70, z: -150, w: 60, h: 14, d: 25},
    {x: 30, z: -170, w: 45, h: 20, d: 30},
    {x: 110, z: -120, w: 50, h: 11, d: 22},
    {x: -150, z: -60, w: 40, h: 12, d: 30},
  ];
  return (
    <>
      {items.map((m, i) => (
        <mesh key={i} position={[m.x, m.h / 2 - 1, m.z]} scale={[m.w, m.h, m.d]}>
          <cylinderGeometry args={[0.42, 0.5, 1, 9]} />
          <meshStandardMaterial color={C.mesa} roughness={1} flatShading />
        </mesh>
      ))}
    </>
  );
};

const useLayout = () =>
  useMemo(() => {
    const r = rng(7);
    const tufts: Inst[] = [];
    const add = (x: number, z: number, big = 1) => {
      if (inRing(x, z)) return;
      if (Math.hypot(x - OUTBACK.table.x, z - OUTBACK.table.z) < 0.5) return;
      const s = (0.08 + r() * 0.1) * big;
      tufts.push({pos: [x, 0, z], scale: [s * 1.4, s * (1.3 + r() * 0.8), s * 1.4], rotY: r() * 6, color: C.grass[Math.floor(r() * C.grass.length)]});
    };
    // Grasstreifen um den Ring
    for (let i = 0; i < 520; i++) {
      const a = r() * Math.PI * 2;
      const d = 2.95 + r() * 1.6;
      const x = Math.cos(a) * d * 1.05;
      const z = Math.sin(a) * d * (Math.sin(a) > 0 ? 1.15 : 1);
      add(x, z);
    }
    // vorn dichter (dort landet der Zahn)
    for (let i = 0; i < 260; i++) add(-3.5 + r() * 7, 2.95 + r() * 1.8, 0.9);
    // verstreut in der Steppe
    for (let i = 0; i < 700; i++) {
      const x = (r() - 0.5) * 120;
      const z = (r() - 0.5) * 120;
      if (Math.hypot(x, z) < 5) continue;
      add(x, z, 2.2 + r() * 2.2);
    }
    const stones: Inst[] = [];
    for (let i = 0; i < 160; i++) {
      const x = (r() - 0.5) * 70;
      const z = (r() - 0.5) * 70;
      if (Math.hypot(x, z) < 4.5) continue;
      const s = 0.06 + r() * 0.25;
      stones.push({pos: [x, s * 0.3, z], scale: [s * 1.3, s * 0.7, s], rotY: r() * 6, color: r() > 0.5 ? '#8e3f25' : '#a1543a'});
    }
    return {tufts, stones};
  }, []);

const OutbackScene = () => {
  const L = useLayout();
  const geos = useMemo(() => {
    const blade = new THREE.ConeGeometry(0.5, 1, 4);
    blade.translate(0, 0.5, 0);
    // Grasbüschel = drei geneigte Halme
    const parts = [0, 1, 2, 3, 4].map((i) => {
      const g = blade.clone();
      g.rotateZ(Math.sin(i * 2.4) * 0.45);
      g.rotateY(i * 1.3);
      g.translate(Math.sin(i * 2.4) * 0.15, 0, Math.cos(i * 1.9) * 0.15);
      return g;
    });
    const merged = mergeGeos(parts);
    const ball = new THREE.IcosahedronGeometry(1, 0);
    return {tuft: merged, ball};
  }, []);
  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 50, 300]} />
      <Sky c={C} />
      {/* tiefstehende Sonne hinten links */}
      <mesh position={[-120, 22, -230]}>
        <sphereGeometry args={[16, 20, 14]} />
        <meshBasicMaterial color="#fff1b8" fog={false} />
      </mesh>
      <mesh position={[-120, 22, -232]}>
        <sphereGeometry args={[30, 20, 14]} />
        <meshBasicMaterial color="#ffc36e" transparent opacity={0.35} fog={false} />
      </mesh>
      <hemisphereLight args={['#ffc9a0', '#7a3a2a', 1.0]} />
      <ambientLight intensity={0.25} color="#ffe2c8" />
      {/* Sonne (warm, flach von hinten links) + Aufhelllicht von vorn */}
      <directionalLight
        position={[-12, 7, -9]}
        intensity={2.4}
        color="#ffb36a"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[6, 6, 12]} intensity={1.15} color="#ffd9b8" />
      <Ground />
      <Ring />
      <Table />
      <Mesas />
      <Gum x={-8} z={-7} s={1.1} seed={1} />
      <Gum x={9} z={-9} s={1.25} seed={2} />
      <Gum x={-13} z={2} s={1} seed={3} />
      <Gum x={12} z={6} s={1.15} seed={4} />
      <Gum x={-4} z={-16} s={1.3} seed={5} />
      <Gum x={5} z={-22} s={1.2} seed={6} />
      <Gum x={-20} z={-25} s={1.4} seed={7} />
      <Instances geometry={geos.tuft} items={L.tufts} castShadow={false} />
      <Instances geometry={geos.ball} items={L.stones} />
    </>
  );
};

/** Mehrere Geometrien zu einer zusammenfügen (nur Positionen + Normalen) */
const mergeGeos = (gs: THREE.BufferGeometry[]) => {
  const pos: number[] = [];
  for (const g of gs) {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
};

export const outbackStage: StageDef = {
  id: 'outback',
  Component: OutbackScene,
  climbTrees: [],
  groundHeight,
  ambience: 'outback-atmo',
};
