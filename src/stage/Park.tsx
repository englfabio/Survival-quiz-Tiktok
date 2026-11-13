import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {Instances, Sky, type Inst} from './Forest';
import type {StageCam, StageDef} from './types';

/**
 * Bühne "park": Spazierweg in einem Stadtpark in der Abenddämmerung (wiederverwendbar).
 * Kiesweg entlang der x-Achse, Parkbank, Laternen (an, warmes Licht), Mülleimer, Bäume, Büsche, Rasen,
 * in der Ferne Häuser mit erleuchteten Fenstern, Himmel mit Abendrot.
 *
 * Koordinaten (1 Einheit = 1 Meter), Boden flach (y = 0):
 * - Weg: z −1.0 … 1.0 (Mitte z = 0), x −40 … 40. Randsteine an beiden Seiten.
 * - Parkbank: Mitte PARK.bench (0, −1.65), schaut zum Weg (+z), Sitz 0,45 m hoch, 1,8 m breit (x −0.9 … 0.9).
 * - Platz für einen Gegenstand "neben der Bank": PARK.beside (1.3, −1.55).
 * - Laternen hinter dem Weg bei z −1.45: x −3.4, 4.2, −13, 13.5. Mülleimer (−1.45, −1.5).
 * - Bäume ab |z| > 3.5 bzw. hinter der Bank ab z < −3.2; vorn (z 1.2 … 6) nur Rasen + ein paar flache Büsche → Kamera vorn frei.
 * - Häuser in der Ferne ab z −32 (hinten) und z 30 (vorn).
 */
export const PARK = {bench: [0, -1.65] as [number, number], beside: [1.3, -1.55] as [number, number], pathHalf: 1.0};

const C = {
  skyTop: '#2b3f73',
  skyHorizon: '#f2a46f',
  fog: '#7c6f8f',
  grass: '#5d7a42',
  grassDark: '#41592f',
  gravel: '#a39a88',
  curb: '#8f8a80',
  trunk: '#4a3626',
  leaf: ['#3f6232', '#4b6e35', '#36552c', '#557a3b'],
  iron: '#24272c',
  wood: '#8a5a33',
  house: ['#6d6475', '#7a6f6a', '#5f5a6e', '#857a72'],
  roof: ['#3d3443', '#4a3a3a', '#363847'],
};

const groundHeight = () => 0;


const useLayout = () =>
  useMemo(() => {
    const r = rng(46);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const bushes: Inst[] = [];
    const gravel: Inst[] = [];
    const grass: Inst[] = [];
    const addTree = (x: number, z: number, s: number) => {
      trunks.push({pos: [x, 0, z], scale: [0.22 * s, 2.7 * s, 0.22 * s], rotY: r() * 6, color: C.trunk});
      const col = pick(C.leaf);
      crowns.push({pos: [x, 3.8 * s, z], scale: [1.7 * s, 1.6 * s, 1.7 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * 1.2 * s, 3.1 * s, z + (r() - 0.5) * 1.2 * s], scale: [1.2 * s, 1.0 * s, 1.2 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * 1.0 * s, 4.6 * s, z + (r() - 0.5) * 0.8 * s], scale: [1.0 * s, 0.9 * s, 1.0 * s], rotY: r() * 6, color: pick(C.leaf)});
    };
    // Baumreihe hinter der Bank (Lücke direkt hinter der Bank etwas weiter weg)
    for (let x = -36; x <= 36; x += 5.5) {
      const z = -4.2 - r() * 2.5 - (Math.abs(x) < 3 ? 2.5 : 0);
      addTree(x + (r() - 0.5) * 1.5, z, 1 + r() * 0.3);
    }
    for (let i = 0; i < 26; i++) addTree(-40 + r() * 80, -10 - r() * 14, 1.1 + r() * 0.4);
    // vorn: Bäume nur weit seitlich/hinten (Kamera-Bereich x −8 … 8, z 1 … 14 bleibt frei)
    for (let i = 0; i < 22; i++) {
      const x = -40 + r() * 80;
      const z = 4 + r() * 18;
      if (Math.abs(x) < 11 && z < 24) continue;
      addTree(x, z, 1 + r() * 0.35);
    }
    // Büsche hinter dem Weg (nicht an der Bank) und ein paar flache vorn
    for (let i = 0; i < 30; i++) {
      const x = -30 + r() * 60;
      if (Math.abs(x) < 2.6) continue;
      const s = 0.45 + r() * 0.45;
      bushes.push({pos: [x, s * 0.35, -2.2 - r() * 1.6], scale: [s * 1.4, s, s * 1.2], rotY: r() * 6, color: pick(['#3c5e2f', '#4a6c35', '#355228'])});
    }
    for (let i = 0; i < 10; i++) {
      const x = -26 + r() * 52;
      if (Math.abs(x) < 7) continue;
      const s = 0.35 + r() * 0.3;
      bushes.push({pos: [x, s * 0.3, 2.2 + r() * 3], scale: [s * 1.4, s * 0.8, s * 1.2], rotY: r() * 6, color: pick(['#3c5e2f', '#4a6c35'])});
    }
    // Kiesel auf dem Weg
    for (let i = 0; i < 700; i++) {
      const s = 0.02 + r() * 0.03;
      gravel.push({pos: [-30 + r() * 60, s * 0.25, (r() - 0.5) * 1.9], scale: [s, s * 0.5, s], rotY: r() * 6, color: pick(['#8f8676', '#b3aa98', '#9c937f', '#c2b9a6'])});
    }
    // Grashalme am Wegrand
    const blade = (x: number, z: number) => {
      const s = 0.1 + r() * 0.16;
      grass.push({pos: [x, 0, z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: pick(['#5c7a40', '#4c6a36', '#6a8748'])});
    };
    for (let i = 0; i < 900; i++) blade(-30 + r() * 60, (r() < 0.5 ? -1 : 1) * (1.15 + r() * 3.5));
    return {trunks, crowns, bushes, gravel, grass};
  }, []);

/** Parkbank aus Holzlatten mit Gusseisen-Füßen, Ursprung = Mitte am Boden, Sitzfläche zeigt nach +z */
export const ParkBench = () => {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({color: C.wood, roughness: 0.85, flatShading: true}), []);
  const iron = useMemo(() => new THREE.MeshStandardMaterial({color: C.iron, roughness: 0.6, metalness: 0.3, flatShading: true}), []);
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={`s${i}`} material={wood} position={[0, 0.45, 0.16 - i * 0.14]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.04, 0.11]} />
        </mesh>
      ))}
      {[0, 1].map((i) => (
        <mesh key={`b${i}`} material={wood} position={[0, 0.66 + i * 0.16, -0.2 - i * 0.03]} rotation={[-0.18, 0, 0]} castShadow>
          <boxGeometry args={[1.8, 0.11, 0.035]} />
        </mesh>
      ))}
      {[-0.78, 0.78].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh material={iron} position={[0, 0.22, 0.14]}>
            <boxGeometry args={[0.06, 0.44, 0.05]} />
          </mesh>
          <mesh material={iron} position={[0, 0.45, -0.2]} rotation={[-0.15, 0, 0]}>
            <boxGeometry args={[0.06, 0.92, 0.05]} />
          </mesh>
          <mesh material={iron} position={[0, 0.43, -0.03]}>
            <boxGeometry args={[0.06, 0.05, 0.42]} />
          </mesh>
          {/* Armlehne */}
          <mesh material={iron} position={[0, 0.66, 0.0]}>
            <boxGeometry args={[0.06, 0.04, 0.38]} />
          </mesh>
          <mesh material={iron} position={[0, 0.55, 0.16]}>
            <boxGeometry args={[0.05, 0.22, 0.04]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Parklaterne (an): Mast, Leuchtkopf mit warmem Licht. Ursprung = Fuß */
export const ParkLantern = ({light = true}: {light?: boolean}) => (
  <group>
    <mesh position={[0, 0.15, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.15, 0.3, 8]} />
      <meshStandardMaterial color={C.iron} flatShading metalness={0.3} roughness={0.6} />
    </mesh>
    <mesh position={[0, 1.75, 0]} castShadow>
      <cylinderGeometry args={[0.045, 0.07, 3.3, 8]} />
      <meshStandardMaterial color={C.iron} flatShading metalness={0.3} roughness={0.6} />
    </mesh>
    <mesh position={[0, 3.55, 0]}>
      <cylinderGeometry args={[0.17, 0.11, 0.42, 6]} />
      <meshStandardMaterial color="#ffe2a6" emissive="#ffc96e" emissiveIntensity={light ? 2.2 : 0.1} flatShading />
    </mesh>
    <mesh position={[0, 3.83, 0]}>
      <coneGeometry args={[0.27, 0.2, 6]} />
      <meshStandardMaterial color={C.iron} flatShading />
    </mesh>
    {light && <pointLight position={[0, 3.35, 0]} color="#ffbe6b" intensity={11} distance={10} decay={1.5} />}
  </group>
);

const TrashBin = () => (
  <group>
    <mesh position={[0, 0.42, 0]} castShadow>
      <cylinderGeometry args={[0.24, 0.22, 0.75, 10]} />
      <meshStandardMaterial color="#3e5a46" flatShading roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.82, 0]}>
      <cylinderGeometry args={[0.26, 0.26, 0.06, 10]} />
      <meshStandardMaterial color="#2f4636" flatShading />
    </mesh>
    <mesh position={[0, 0.03, 0]}>
      <cylinderGeometry args={[0.05, 0.05, 0.06, 6]} />
      <meshStandardMaterial color={C.iron} />
    </mesh>
  </group>
);

/** Häuser in der Ferne mit erleuchteten Fenstern */
const FarHouses = ({z, face, seed}: {z: number; face: 1 | -1; seed: number}) => {
  const items = useMemo(() => {
    const r = rng(seed);
    const out: {x: number; w: number; h: number; color: string; roof: string; lit: [number, number, boolean][]}[] = [];
    let x = -60;
    while (x < 60) {
      const w = 6 + r() * 5;
      const h = 7 + r() * 8;
      const lit: [number, number, boolean][] = [];
      const cols = Math.floor(w / 2);
      const rows = Math.floor((h - 1) / 2.6);
      for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) lit.push([(cc - (cols - 1) / 2) * (w / cols), 1.7 + rr * 2.6, r() < 0.45]);
      out.push({x: x + w / 2, w, h, color: C.house[Math.floor(r() * C.house.length)], roof: C.roof[Math.floor(r() * C.roof.length)], lit});
      x += w + 0.2;
    }
    return out;
  }, [seed]);
  const lit = useMemo(() => new THREE.MeshStandardMaterial({color: '#ffd38a', emissive: '#ffbf63', emissiveIntensity: 1.4}), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({color: '#2c3140', roughness: 0.4}), []);
  return (
    <group position={[0, 0, z]}>
      {items.map((h, i) => (
        <group key={i} position={[h.x, 0, 0]}>
          <mesh position={[0, h.h / 2, 0]}>
            <boxGeometry args={[h.w, h.h, 6]} />
            <meshStandardMaterial color={h.color} flatShading roughness={0.95} />
          </mesh>
          <mesh position={[0, h.h + 0.9, 0]} rotation={[0, Math.PI / 2, 0]} scale={[6 * 0.62, 0.9, h.w * 0.53]}>
            <coneGeometry args={[1.4, 2, 4, 1]} />
            <meshStandardMaterial color={h.roof} flatShading />
          </mesh>
          {h.lit.map(([wx, wy, on], j) => (
            <mesh key={j} material={on ? lit : dark} position={[wx, wy, face * 3.01]}>
              <boxGeometry args={[0.8, 1.1, 0.03]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

const ParkScene = (_: {cam?: StageCam}) => {
  const L = useLayout();
  const geos = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
    trunk.translate(0, 0.5, 0);
    const crown = new THREE.IcosahedronGeometry(1, 0);
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    const pebble = new THREE.IcosahedronGeometry(1, 0);
    return {trunk, crown, blade, pebble};
  }, []);
  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 26, 110]} />
      <Sky c={C} />
      <hemisphereLight args={['#a9b6ea', '#4a4058', 1.35]} />
      <ambientLight intensity={0.38} color="#d2c6ea" />
      {/* tief stehende Abendsonne von links hinten (warm) */}
      <directionalLight
        position={[-16, 7, -10]}
        intensity={2.1}
        color="#ffb27a"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      {/* Fülllicht von vorn (bläulich), damit die Figuren gut zu sehen sind */}
      <directionalLight position={[6, 7, 10]} intensity={1.5} color="#d6ddff" />
      {/* Rasen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color={C.grass} roughness={1} />
      </mesh>
      {/* Kiesweg + Randsteine */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 2.0]} />
        <meshStandardMaterial color={C.gravel} roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.03, s * 1.04]} receiveShadow>
          <boxGeometry args={[90, 0.06, 0.08]} />
          <meshStandardMaterial color={C.curb} flatShading />
        </mesh>
      ))}
      {/* befestigte Fläche unter der Bank */}
      <mesh position={[PARK.bench[0] + 0.3, 0.004, PARK.bench[1] + 0.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.2, 1.15]} />
        <meshStandardMaterial color="#9a917f" roughness={1} />
      </mesh>
      <Instances geometry={geos.pebble} items={L.gravel} castShadow={false} />
      <group position={[PARK.bench[0], 0, PARK.bench[1]]}>
        <ParkBench />
      </group>
      <group position={[-1.45, 0, -1.5]}>
        <TrashBin />
      </group>
      {[-3.4, 4.2, -13, 13.5].map((x) => (
        <group key={x} position={[x, 0, -1.45]}>
          <ParkLantern light={Math.abs(x) < 10} />
        </group>
      ))}
      <Instances geometry={geos.trunk} items={L.trunks} />
      <Instances geometry={geos.crown} items={L.crowns} />
      <Instances geometry={geos.crown} items={L.bushes} />
      <Instances geometry={geos.blade} items={L.grass} castShadow={false} />
      <FarHouses z={-34} face={1} seed={7} />
      <FarHouses z={32} face={-1} seed={9} />
    </>
  );
};

export const parkStage: StageDef = {
  id: 'park',
  Component: ParkScene,
  climbTrees: [],
  groundHeight,
  ambience: 'outback-atmo',
};
