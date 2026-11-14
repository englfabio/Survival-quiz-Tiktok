import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {T} from '../ui/theme';
import {canvasTex, fitText, TextPlane} from '../actors/WgProps';
import {Instances, Sky, type Inst} from './Forest';
import type {StageCam, StageDef} from './types';

/**
 * Zwei Außen-Bühnen auf dem Land am Morgen (Spezial "Bahn-Verspätung", wiederverwendbar). Boden flach (y = 0).
 *
 * "bahnstrecke": eingleisige Bahnstrecke durch Felder und Wiesen (ohne Oberleitung, ohne echte Bahn-Designs).
 *  - Gleis entlang x bei z = 0 (Spurweite 1,435), Schotterbett z −1.8 … 1.8 (0,12 hoch), Schienenoberkante y = RAILWAY.railTop.
 *    Fahrzeuge im Gleis: y = RAILWAY.railTop, face 90 = fährt nach +x.
 *  - Platz für das Signal: RAILWAY.signal (x 30, z −2.6) – Signal-Objekt "signal" mit face 270 (Signalschirm zeigt nach −x, zum Zug).
 *  - Felder (gelb/grün gestreift), Hecken, Bäume ab |z| > 7, Hügel + Wald in der Ferne, Strommasten, Weidezaun.
 *    Vorn (z 3 … 20) zwischen x −30 … 60 nur Wiese → Kamera frei.
 *
 * "landstrasse": Landstraße entlang x bei z = 0 (Fahrbahn z −3.5 … 3.5, Mittellinie gestrichelt, Leitpfosten), Felder, Alleebäume
 *  ab |z| > 6, Schild "Büro 12 km". Am Ende (x LANDSTRASSE.office) ein Bürogebäude mit großem Schild "BÜRO" (Eingang zur Straße, +z),
 *  Parkplatz davor (x 66 … 82, z −4 … −14). Vorn (z 5 … 20) frei für Kameras.
 */
export const RAILWAY = {railTop: 0.3, gauge: 1.435, signal: [30, -2.6] as [number, number]};
export const LANDSTRASSE = {office: [74, -16] as [number, number], halfW: 3.5};

const C = {
  skyTop: '#7fb2e0',
  skyHorizon: '#f6e8cf',
  fog: '#e4e2d6',
  grass: '#7fae4f',
  grassDark: '#5f8e3a',
  field: ['#d9c45a', '#c9b24a', '#9cbc4e', '#86ab43'],
  gravel: ['#8c857a', '#7c766c', '#9a9388', '#6f6a62'],
  sleeper: '#6a5644',
  rail: '#a4abb2',
  trunk: '#5a4230',
  leaf: ['#4f7d35', '#5d8c3c', '#46702f', '#679a43'],
  hill: ['#8fb26a', '#7da35c', '#9cbd77'],
  asphalt: '#5d6166',
};

const groundHeight = () => 0;

const useCountry = (seed: number, keepFree: (x: number, z: number) => boolean) =>
  useMemo(() => {
    const r = rng(seed);
    const pick = <X,>(a: X[]) => a[Math.floor(r() * a.length)];
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const bushes: Inst[] = [];
    const grass: Inst[] = [];
    const addTree = (x: number, z: number, s: number) => {
      if (keepFree(x, z)) return;
      trunks.push({pos: [x, 0, z], scale: [0.25 * s, 2.6 * s, 0.25 * s], rotY: r() * 6, color: C.trunk});
      const col = pick(C.leaf);
      crowns.push({pos: [x, 3.7 * s, z], scale: [1.8 * s, 1.7 * s, 1.8 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * 1.2 * s, 3.0 * s, z + (r() - 0.5) * 1.2 * s], scale: [1.3 * s, 1.1 * s, 1.3 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * s, 4.6 * s, z + (r() - 0.5) * 0.8 * s], scale: [1.1 * s, 1.0 * s, 1.1 * s], rotY: r() * 6, color: pick(C.leaf)});
    };
    for (let i = 0; i < 70; i++) addTree(-80 + r() * 200, -12 - r() * 50, 1 + r() * 0.5);
    for (let i = 0; i < 40; i++) addTree(-80 + r() * 200, 24 + r() * 40, 1 + r() * 0.5);
    for (let i = 0; i < 50; i++) {
      const x = -70 + r() * 180;
      const z = (r() < 0.5 ? -1 : 1) * (6.5 + r() * 3);
      if (keepFree(x, z)) continue;
      const s = 0.5 + r() * 0.6;
      bushes.push({pos: [x, s * 0.35, z], scale: [s * 1.5, s, s * 1.2], rotY: r() * 6, color: pick(['#4f7d35', '#5d8c3c', '#3f6a2c'])});
    }
    for (let i = 0; i < 1400; i++) {
      const x = -50 + r() * 140;
      const z = (r() < 0.5 ? -1 : 1) * (2.3 + r() * 14);
      const s = 0.12 + r() * 0.18;
      grass.push({pos: [x, 0, z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: pick(['#6f9e44', '#5f8e3a', '#86b456', '#9cc062'])});
    }
    return {trunks, crowns, bushes, grass};
  }, [seed, keepFree]);

const useGeos = () =>
  useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
    trunk.translate(0, 0.5, 0);
    const crown = new THREE.IcosahedronGeometry(1, 0);
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    const box = new THREE.BoxGeometry(1, 1, 1);
    return {trunk, crown, blade, box};
  }, []);

/** Licht + Himmel + Wiese + Felder + Hügel (gemeinsam für beide Bühnen) */
const Countryside = ({seed, keepFree}: {seed: number; keepFree: (x: number, z: number) => boolean}) => {
  const L = useCountry(seed, keepFree);
  const g = useGeos();
  const fields = useMemo(() => {
    const r = rng(seed + 7);
    const out: {x: number; z: number; w: number; d: number; c: string; rows: boolean}[] = [];
    for (let i = 0; i < 14; i++) out.push({x: -90 + i * 16 + r() * 4, z: -26 - r() * 10, w: 14 + r() * 4, d: 18 + r() * 8, c: C.field[i % 4], rows: r() < 0.6});
    for (let i = 0; i < 14; i++) out.push({x: -90 + i * 16 + r() * 4, z: 40 + r() * 8, w: 14 + r() * 4, d: 16, c: C.field[(i + 2) % 4], rows: r() < 0.6});
    return out;
  }, [seed]);
  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 45, 170]} />
      <Sky c={C} />
      <hemisphereLight args={['#dbe8ff', '#6d7a4a', 1.2]} />
      <ambientLight intensity={0.45} color="#fff3df" />
      {/* Morgensonne von links vorn (warm) */}
      <directionalLight
        position={[-14, 12, 12]}
        intensity={2.2}
        color="#ffe2b8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[10, 8, -8]} intensity={0.7} color="#cfe0ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={C.grass} roughness={1} />
      </mesh>
      {fields.map((f, i) => (
        <group key={i} position={[f.x, 0.01, f.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[f.w, f.d]} />
            <meshStandardMaterial color={f.c} roughness={1} />
          </mesh>
          {f.rows &&
            Array.from({length: Math.floor(f.w / 1.6)}, (_, k) => (
              <mesh key={k} position={[-f.w / 2 + 0.8 + k * 1.6, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.35, f.d - 0.4]} />
                <meshStandardMaterial color={new THREE.Color(f.c).multiplyScalar(0.85).getStyle()} roughness={1} />
              </mesh>
            ))}
        </group>
      ))}
      {/* Hügel in der Ferne */}
      {[-120, -70, -20, 30, 80, 130, 180].map((x, i) => (
        <mesh key={x} position={[x, -6, -95 - (i % 2) * 10]} scale={[38, 22 + (i % 3) * 6, 20]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={C.hill[i % 3]} flatShading roughness={1} />
        </mesh>
      ))}
      <Instances geometry={g.trunk} items={L.trunks} />
      <Instances geometry={g.crown} items={L.crowns} />
      <Instances geometry={g.crown} items={L.bushes} />
      <Instances geometry={g.blade} items={L.grass} castShadow={false} />
      {/* Strommasten in einer Reihe hinten */}
      {Array.from({length: 9}, (_, i) => -60 + i * 22).map((x) => (
        <group key={x} position={[x, 0, -14]}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.13, 7, 6]} />
            <meshStandardMaterial color="#7a6048" flatShading />
          </mesh>
          <mesh position={[0, 6.6, 0]}>
            <boxGeometry args={[0.1, 0.1, 1.6]} />
            <meshStandardMaterial color="#7a6048" />
          </mesh>
        </group>
      ))}
      {[-0.7, 0.7].map((z) => (
        <mesh key={z} position={[30, 6.68, -14 + z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 200, 4]} />
          <meshBasicMaterial color="#3a3a3a" />
        </mesh>
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------------------------
// Bahnstrecke
// ---------------------------------------------------------------------------------------------
const Track = ({x0 = -120, x1 = 180}: {x0?: number; x1?: number}) => {
  const items = useMemo(() => {
    const r = rng(77);
    const gravel: Inst[] = [];
    const sleepers: Inst[] = [];
    for (let i = 0; i < 2200; i++) {
      const x = -40 + r() * 120;
      const z = (r() - 0.5) * 3.2;
      const s = 0.06 + r() * 0.08;
      gravel.push({pos: [x, 0.12 + s * 0.2, z], scale: [s, s * 0.6, s], rotY: r() * 6, color: C.gravel[Math.floor(r() * 4)]});
    }
    for (let x = x0; x <= x1; x += 0.65) sleepers.push({pos: [x, 0.13, 0], scale: [0.24, 0.1, 2.5], rotY: 0, color: C.sleeper});
    return {gravel, sleepers};
  }, [x0, x1]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const pebble = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  return (
    <group>
      {/* Schotterbett (Trapez) */}
      <mesh position={[(x0 + x1) / 2, 0.06, 0]} receiveShadow>
        <boxGeometry args={[x1 - x0, 0.12, 3.6]} />
        <meshStandardMaterial color="#857d71" roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(x0 + x1) / 2, 0.03, s * 2.0]} rotation={[s * 0.5, 0, 0]} receiveShadow>
          <boxGeometry args={[x1 - x0, 0.06, 0.6]} />
          <meshStandardMaterial color="#7b7368" roughness={1} />
        </mesh>
      ))}
      <Instances geometry={pebble} items={items.gravel} castShadow={false} />
      <Instances geometry={box} items={items.sleepers} castShadow={false} />
      {[-1, 1].map((s) => (
        <group key={`r${s}`} position={[(x0 + x1) / 2, 0, (s * RAILWAY.gauge) / 2]}>
          <mesh position={[0, 0.23, 0]} castShadow>
            <boxGeometry args={[x1 - x0, 0.14, 0.07]} />
            <meshStandardMaterial color={C.rail} metalness={0.7} roughness={0.3} flatShading />
          </mesh>
          <mesh position={[0, 0.295, 0]}>
            <boxGeometry args={[x1 - x0, 0.02, 0.09]} />
            <meshStandardMaterial color="#d6dbe0" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Kilometerschild / Weidezaun-Pfosten entlang der Strecke */
const FencePosts = ({z}: {z: number}) => (
  <group>
    {Array.from({length: 60}, (_, i) => -50 + i * 2.5).map((x) => (
      <mesh key={x} position={[x, 0.5, z]} castShadow>
        <boxGeometry args={[0.1, 1.0, 0.1]} />
        <meshStandardMaterial color="#8a6a48" flatShading />
      </mesh>
    ))}
    {[0.45, 0.85].map((y) => (
      <mesh key={y} position={[24, y, z]}>
        <boxGeometry args={[148, 0.02, 0.02]} />
        <meshStandardMaterial color="#d9d9d9" />
      </mesh>
    ))}
  </group>
);

const railFree = (x: number, z: number) => (Math.abs(z) < 7 && x > -60 && x < 120) || (z > 0 && z < 24 && x > -40 && x < 70);

const RailwayScene = (_: {cam?: StageCam}) => (
  <>
    <Countryside seed={91} keepFree={railFree} />
    <Track />
    <FencePosts z={-6.2} />
    <FencePosts z={7.5} />
  </>
);

export const railwayStage: StageDef = {id: 'bahnstrecke', Component: RailwayScene, climbTrees: [], groundHeight, ambience: 'wald-atmo'};

// ---------------------------------------------------------------------------------------------
// Landstraße mit Bürogebäude
// ---------------------------------------------------------------------------------------------
const roadSignTex = (text: string) =>
  canvasTex(512, 200, (g) => {
    g.fillStyle = '#f5d21a';
    g.fillRect(0, 0, 512, 200);
    g.strokeStyle = '#1d1f22';
    g.lineWidth = 12;
    g.strokeRect(8, 8, 496, 184);
    g.fillStyle = '#1d1f22';
    fitText(g, text, 256, 104, 450, 110, 800);
  });
const officeSignTex = canvasTex(1024, 256, (g) => {
  g.fillStyle = '#24456b';
  g.fillRect(0, 0, 1024, 256);
  g.fillStyle = '#ffffff';
  fitText(g, 'BÜRO', 512, 134, 900, 200, 800);
});

const OfficeBuilding = () => {
  const m = useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({color: '#e8e2d6', roughness: 0.9, flatShading: true}),
      band: new THREE.MeshStandardMaterial({color: '#9fb3c4', roughness: 0.3, metalness: 0.3}),
      frame: new THREE.MeshStandardMaterial({color: '#4a5058', roughness: 0.5}),
      door: new THREE.MeshStandardMaterial({color: '#bfe0f0', roughness: 0.15, metalness: 0.2}),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.wall} position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[16, 10, 9]} />
      </mesh>
      {[1.8, 4.6, 7.4].map((y) => (
        <mesh key={y} material={m.band} position={[0, y, 4.51]}>
          <planeGeometry args={[15, 1.5]} />
        </mesh>
      ))}
      <mesh material={m.frame} position={[0, 10.1, 0]}>
        <boxGeometry args={[16.3, 0.25, 9.3]} />
      </mesh>
      {/* Eingang */}
      <mesh material={m.frame} position={[0, 1.4, 4.6]}>
        <boxGeometry args={[3.4, 2.8, 0.2]} />
      </mesh>
      <mesh material={m.door} position={[0, 1.3, 4.72]}>
        <planeGeometry args={[3.0, 2.5]} />
      </mesh>
      {/* Schild "BÜRO" auf dem Dach */}
      <group position={[0, 11.4, 2.5]}>
        <TextPlane draw={officeSignTex} k="Schild BÜRO" w={8} h={2} glow={0.4} />
        {[-3.2, 3.2].map((x) => (
          <mesh key={x} material={m.frame} position={[x, -0.9, -0.05]}>
            <boxGeometry args={[0.12, 1.2, 0.12]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const Road = () => {
  const half = LANDSTRASSE.halfW;
  const posts = useMemo(() => Array.from({length: 40}, (_, i) => -60 + i * 5), []);
  return (
    <group>
      <mesh position={[30, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, half * 2]} />
        <meshStandardMaterial color={C.asphalt} roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[30, 0.015, s * (half - 0.25)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[300, 0.15]} />
          <meshStandardMaterial color="#f2f2ee" />
        </mesh>
      ))}
      {Array.from({length: 75}, (_, i) => -120 + i * 4).map((x) => (
        <mesh key={x} position={[x, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 0.15]} />
          <meshStandardMaterial color="#f2f2ee" />
        </mesh>
      ))}
      {/* Bankett */}
      {[-1, 1].map((s) => (
        <mesh key={`b${s}`} position={[30, 0.008, s * (half + 0.6)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[300, 1.2]} />
          <meshStandardMaterial color="#9a8f74" roughness={1} />
        </mesh>
      ))}
      {/* Leitpfosten */}
      {posts.map((x) =>
        [-1, 1].map((s) => (
          <group key={`${x}${s}`} position={[x, 0, s * (half + 1.0)]}>
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[0.12, 1.0, 0.12]} />
              <meshStandardMaterial color="#f5f5f2" flatShading />
            </mesh>
            <mesh position={[0, 0.85, 0]}>
              <boxGeometry args={[0.13, 0.2, 0.13]} />
              <meshStandardMaterial color="#1d1f22" />
            </mesh>
          </group>
        )),
      )}
      {/* Wegweiser "Büro 12 km" */}
      <group position={[-6, 0, -(half + 2.0)]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2.2, 6]} />
          <meshStandardMaterial color="#9aa0a6" metalness={0.5} />
        </mesh>
        <group position={[0, 2.2, 0.06]}>
          <TextPlane draw={roadSignTex('Büro 12 km')} k="Schild Büro 12 km" w={1.5} h={0.59} glow={0.25} />
        </group>
      </group>
      {/* Parkplatz vor dem Büro */}
      <mesh position={[LANDSTRASSE.office[0], 0.012, -8.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 10]} />
        <meshStandardMaterial color="#6b6f74" roughness={0.95} />
      </mesh>
    </group>
  );
};

const roadFree = (x: number, z: number) => (Math.abs(z) < 7 && x > -70 && x < 130) || (z > 0 && z < 24 && x > -40 && x < 90) || (Math.abs(x - LANDSTRASSE.office[0]) < 12 && z < 0 && z > -24);

const RoadScene = (_: {cam?: StageCam}) => {
  const alley = useMemo(() => {
    const r = rng(12);
    const out: [number, number, number][] = [];
    for (let x = -60; x < 120; x += 9) {
      if (Math.abs(x - LANDSTRASSE.office[0]) < 12) continue;
      out.push([x + r() * 2, -(LANDSTRASSE.halfW + 3.4), 0.9 + r() * 0.3]);
    }
    return out;
  }, []);
  return (
    <>
      <Countryside seed={53} keepFree={roadFree} />
      <Road />
      {alley.map(([x, z, s]) => (
        <group key={x} position={[x, 0, z]} scale={s}>
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.28, 2.8, 6]} />
            <meshStandardMaterial color={C.trunk} flatShading />
          </mesh>
          <mesh position={[0, 3.7, 0]} castShadow>
            <icosahedronGeometry args={[1.9, 0]} />
            <meshStandardMaterial color={C.leaf[Math.floor(x) % 4 < 0 ? 0 : Math.floor(x) % 4]} flatShading />
          </mesh>
        </group>
      ))}
      <group position={[LANDSTRASSE.office[0], 0, LANDSTRASSE.office[1]]}>
        <OfficeBuilding />
      </group>
    </>
  );
};

export const roadStage: StageDef = {id: 'landstrasse', Component: RoadScene, climbTrees: [], groundHeight, ambience: 'wald-atmo'};
void T;
