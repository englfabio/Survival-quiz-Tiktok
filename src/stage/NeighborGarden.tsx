import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {Instances, Sky, type Inst} from './Forest';
import {roofGeo} from './Garden';
import type {StageCam, StageDef} from './types';

/**
 * Bühne "nachbargarten" (+ Variante "nachbargarten-nacht"): zwei Gärten direkt nebeneinander hinter zwei Häusern,
 * getrennt durch einen niedrigen weißen Lattenzaun (0,7 m) mit Gartentor. Gebaut für das Spezial-Video "Nachbars Rasen",
 * wiederverwendbar für alle Nachbar-Szenen. Freundlich + comichaft (Look wie die Garten-Bühne aus dem Fliegerbomben-Video).
 *
 * Koordinaten (1 Einheit = 1 Meter), Kamera schaut meist von +z nach −z:
 * - Zaun zwischen den Gärten bei x = 0 (z −7.8 … 9), Höhe 0,7 m, Gartentor-Lücke z 3.0 … 4.0 (Tor = Figur "gartentor").
 * - LINKS (x < 0) = Garten des Dummys, RECHTS (x > 0) = Garten des Nachbarn. Die Rasenflächen selbst sind Figuren
 *   ("rasen" bei (−5.2, 0.6), "rasen2" bei (5.2, 0.6)), damit sie ihre Farbe ändern können (Werte lush / paint).
 * - Haus des Dummys (−5.2, −11.3), Haus des Nachbarn (5.2, −11.3); Hauswände zum Garten bei z = −7.8.
 *   Tür des Nachbarhauses bei x 3.4 (Stufe davor bis z −7.2), Klingel rechts neben der Tür (3.98, 1.36, −7.76),
 *   Platz vor der Tür: (3.4, −6.75). Briefkasten-Platz (Figur "briefkasten"): (2.2, −6.9).
 * - Hundehütte des Dummys (−8.3, −5.6), Blumenbeete vor dem Nachbarhaus (z −7.6 … −7.0), Rosenbüsche,
 *   Kugel-Buchsbäume am Nachbarzaun. Außen-Zäune bei x = ±10.4, vorn Hecke bei z ≈ 9.7.
 * - Nachts: Mond + Sterne, warme Fensterlichter, Gartenlampen an, bläuliches Mondlicht (Atmo `nacht-atmo`).
 */

export const NG = {
  fenceX: 0,
  fenceZ0: -7.8,
  fenceZ1: 9,
  gateZ0: 3.0,
  gateZ1: 4.0,
  houseZ: -11.3,
  wallZ: -7.8,
  door: {x: 3.4, z: -7.8},
  bell: [3.98, 1.36, -7.76] as [number, number, number],
  doorSpot: {x: 3.4, z: -6.75},
  mailbox: {x: 2.2, z: -6.9},
  lawnL: {x: -5.2, z: 0.6},
  lawnR: {x: 5.2, z: 0.6},
};

const DAY = {
  skyTop: '#58a4dc',
  skyHorizon: '#eef6fb',
  fog: '#dfeef0',
  ground: '#6f9a45',
};
const NIGHT = {
  skyTop: '#081226',
  skyHorizon: '#24345a',
  fog: '#1a2440',
  ground: '#2c3d2a',
};

const C = {
  picket: '#f5f3ee',
  wood: '#a07a52',
  woodDark: '#7d5c3c',
  hedge: ['#3f7a32', '#467f36', '#3a6e2f'],
  trunk: '#6b4a30',
  leaf: ['#4e8a35', '#5c9a3c', '#447a2e'],
};

const groundHeight = () => 0;

// ---------- Häuser ----------
const HouseBlock = ({
  x,
  z,
  wall,
  roof,
  trim,
  night,
  door,
  windowsLit = [],
}: {
  x: number;
  z: number;
  wall: string;
  roof: string;
  trim: string;
  night: boolean;
  door?: {x: number; color: string};
  windowsLit?: number[];
}) => {
  const roofG = useMemo(() => roofGeo(8.8, 7.4, 3.0), []);
  const m = useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({color: wall, roughness: 0.95, flatShading: true}),
      roof: new THREE.MeshStandardMaterial({color: roof, roughness: 0.8, flatShading: true}),
      trim: new THREE.MeshStandardMaterial({color: trim, roughness: 0.6}),
      glass: new THREE.MeshStandardMaterial({color: '#7aa3bd', roughness: 0.2, metalness: 0.25}),
      lit: new THREE.MeshStandardMaterial({color: '#ffd98a', emissive: '#ffbf5a', emissiveIntensity: 1.6, roughness: 0.4}),
      step: new THREE.MeshStandardMaterial({color: '#c9c2b5', roughness: 0.9, flatShading: true}),
      brass: new THREE.MeshStandardMaterial({color: '#d9b65a', metalness: 0.8, roughness: 0.3}),
      white: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.5}),
    }),
    [wall, roof, trim],
  );
  const windows: [number, number][] = [
    [-2.7, 1.5],
    [0.2, 1.5],
    [2.7, 1.5],
    [-2.7, 4.1],
    [0, 4.1],
    [2.7, 4.1],
  ];
  const doorLocal = door ? door.x - x : null;
  return (
    <group position={[x, 0, z]}>
      <mesh material={m.wall} position={[0, 2.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.4, 5.5, 7]} />
      </mesh>
      <mesh material={m.roof} position={[0, 5.5, 0]} geometry={roofG} castShadow />
      {windows.map(([wx, wy], i) => {
        if (doorLocal !== null && Math.abs(wx - doorLocal) < 1.1 && wy < 3) return null;
        return (
          <group key={i} position={[wx, wy, 3.51]}>
            <mesh material={m.trim}>
              <boxGeometry args={[1.25, 1.35, 0.05]} />
            </mesh>
            <mesh material={night && windowsLit.includes(i) ? m.lit : m.glass} position={[0, 0, 0.03]}>
              <boxGeometry args={[1.05, 1.15, 0.03]} />
            </mesh>
            <mesh material={m.trim} position={[0, 0, 0.05]}>
              <boxGeometry args={[0.05, 1.15, 0.02]} />
            </mesh>
            {/* Blumenkasten */}
            {wy < 3 && (
              <mesh material={m.roof} position={[0, -0.75, 0.12]}>
                <boxGeometry args={[1.1, 0.16, 0.2]} />
              </mesh>
            )}
          </group>
        );
      })}
      {door && doorLocal !== null && (
        <group position={[doorLocal, 0, 3.5]}>
          <mesh material={m.trim} position={[0, 1.15, 0.02]}>
            <boxGeometry args={[1.25, 2.4, 0.05]} />
          </mesh>
          <mesh material={new THREE.MeshStandardMaterial({color: door.color, roughness: 0.5})} position={[0, 1.1, 0.05]}>
            <boxGeometry args={[1.0, 2.2, 0.05]} />
          </mesh>
          <mesh material={m.brass} position={[0.36, 1.05, 0.1]}>
            <sphereGeometry args={[0.045, 8, 6]} />
          </mesh>
          {/* Fenster in der Tür */}
          <mesh material={night ? m.lit : m.glass} position={[0, 1.75, 0.08]}>
            <boxGeometry args={[0.5, 0.4, 0.02]} />
          </mesh>
          {/* Stufe */}
          <mesh material={m.step} position={[0, 0.08, 0.35]} receiveShadow castShadow>
            <boxGeometry args={[1.6, 0.16, 0.6]} />
          </mesh>
          {/* Klingel mit Messingplatte */}
          <group position={[0.58, 1.36, 0.04]}>
            <mesh material={m.brass}>
              <boxGeometry args={[0.1, 0.16, 0.02]} />
            </mesh>
            <mesh material={m.white} position={[0, 0, 0.015]}>
              <cylinderGeometry args={[0.025, 0.025, 0.02, 10]} />
            </mesh>
          </group>
          {/* Lampe über der Tür */}
          <mesh material={night ? m.lit : m.white} position={[0, 2.55, 0.15]}>
            <sphereGeometry args={[0.1, 8, 6]} />
          </mesh>
          {night && <pointLight position={[0, 2.4, 0.6]} intensity={5} distance={7} color="#ffcf7a" />}
        </group>
      )}
    </group>
  );
};

// ---------- Hundehütte ----------
const DogHouse = ({x, z, rot = 0}: {x: number; z: number; rot?: number}) => {
  const roof = useMemo(() => roofGeo(1.25, 1.2, 0.55), []);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.84, 1.1]} />
        <meshStandardMaterial color="#b0743e" flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.84, 0]} geometry={roof} rotation={[0, Math.PI / 2, 0]} castShadow>
        <meshStandardMaterial color="#8a3a2a" flatShading roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.33, 0.551]}>
        <circleGeometry args={[0.27, 12, 0, Math.PI]} />
        <meshBasicMaterial color="#24170e" />
      </mesh>
      <mesh position={[0, 0.17, 0.552]}>
        <planeGeometry args={[0.54, 0.34]} />
        <meshBasicMaterial color="#24170e" />
      </mesh>
    </group>
  );
};

// ---------- Mond + Sterne ----------
const NightSky = () => {
  const stars = useMemo(() => {
    const r = rng(5);
    return Array.from({length: 160}, () => {
      const a = r() * Math.PI * 2;
      const h = 0.15 + r() * 0.8;
      const rr = 300;
      return {p: [Math.cos(a) * rr * Math.cos(h), Math.sin(h) * rr, Math.sin(a) * rr * Math.cos(h)] as [number, number, number], s: 0.5 + r() * 1.1};
    });
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff', fog: false}), []);
  return (
    <group>
      {stars.map((st, i) => (
        <mesh key={i} position={st.p} material={mat} scale={st.s}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      <mesh position={[-60, 95, -230]}>
        <sphereGeometry args={[11, 20, 14]} />
        <meshBasicMaterial color="#fff6d8" fog={false} />
      </mesh>
      <mesh position={[-60, 95, -232]}>
        <circleGeometry args={[22, 24]} />
        <meshBasicMaterial color="#9fb3e6" transparent opacity={0.18} fog={false} />
      </mesh>
    </group>
  );
};

// ---------- Gartenlampe ----------
const GardenLamp = ({x, z, night}: {x: number; z: number; night: boolean}) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 0.35, 0]} castShadow>
      <cylinderGeometry args={[0.03, 0.04, 0.7, 6]} />
      <meshStandardMaterial color="#2d3136" metalness={0.5} roughness={0.4} />
    </mesh>
    <mesh position={[0, 0.76, 0]}>
      <sphereGeometry args={[0.09, 10, 8]} />
      {night ? <meshStandardMaterial color="#fff1c2" emissive="#ffd27a" emissiveIntensity={2} /> : <meshStandardMaterial color="#f2f2ee" roughness={0.3} />}
    </mesh>
    {night && <pointLight position={[0, 0.85, 0]} intensity={2.2} distance={4.5} color="#ffd88f" />}
  </group>
);

// ---------- Zäune, Hecken, Beete, Bäume ----------
const useLayout = () =>
  useMemo(() => {
    const r = rng(311);
    const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
    const pickets: Inst[] = [];
    const posts: Inst[] = [];
    const rails: {pos: [number, number, number]; len: number; rotY: number; color: string; h: number}[] = [];
    const hedges: Inst[] = [];
    const flowers: Inst[] = [];
    const bushes: Inst[] = [];
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const fence = (ax: number, az: number, bx: number, bz: number, height: number, color: string, railColor: string, skip?: (x: number, z: number) => boolean) => {
      const len = Math.hypot(bx - ax, bz - az);
      const rotY = Math.atan2(bx - ax, bz - az);
      const n = Math.round(len / 0.17);
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const x = ax + (bx - ax) * k;
        const z = az + (bz - az) * k;
        if (skip?.(x, z)) continue;
        pickets.push({pos: [x, 0, z], scale: [0.085, height + (i % 2) * 0.03, 0.025], rotY, color});
      }
      for (let p = 0; p <= Math.round(len / 2); p++) {
        const k = p / Math.round(len / 2);
        const x = ax + (bx - ax) * k;
        const z = az + (bz - az) * k;
        if (skip?.(x, z)) continue;
        posts.push({pos: [x, 0, z], scale: [0.1, height + 0.08, 0.1], rotY, color: railColor});
      }
      // Querlatten (mit Lücke für das Tor)
      const segs: [number, number][] = [];
      if (skip) {
        // Zaun entlang z bei x = 0: zwei Stücke
        segs.push([az, NG.gateZ0], [NG.gateZ1, bz]);
      } else segs.push([0, 1]);
      for (const h of [height * 0.25, height * 0.75]) {
        if (skip) {
          for (const [z0, z1] of segs) rails.push({pos: [ax, h, (z0 + z1) / 2], len: z1 - z0, rotY, color: railColor, h});
        } else rails.push({pos: [(ax + bx) / 2, h, (az + bz) / 2], len, rotY, color: railColor, h});
      }
    };
    // niedriger weißer Zaun zwischen den Gärten (mit Tor-Lücke)
    fence(NG.fenceX, NG.fenceZ0, NG.fenceX, NG.fenceZ1, 0.7, C.picket, '#e6e2d8', (_x, z) => z > NG.gateZ0 - 0.05 && z < NG.gateZ1 + 0.05);
    // Außenzäune (Holz)
    fence(-10.4, NG.wallZ, -10.4, 10, 1.0, '#b89468', C.woodDark);
    fence(10.4, NG.wallZ, 10.4, 10, 1.0, '#b89468', C.woodDark);
    // Hecken an den Außenzäunen + vorn
    for (let z = -6.8; z < 9.4; z += 0.75) {
      for (const sx of [-1, 1]) {
        const s = 0.55 + r() * 0.3;
        hedges.push({pos: [sx * 9.75, s * 0.75, z], scale: [s * 0.75, s, s * 0.8], rotY: r() * 6, color: pick(C.hedge)});
      }
    }
    for (let x = -10.2; x < 10.2; x += 0.7) {
      if (Math.abs(x) < 1.0) continue;
      const s = 0.5 + r() * 0.2;
      hedges.push({pos: [x, s * 0.7, 9.8], scale: [s * 0.8, s * 0.9, s * 0.7], rotY: r() * 6, color: pick(C.hedge)});
    }
    // Nachbar: Blumenbeet vor dem Haus (bunt, üppig) + Kugel-Buchsbäume + Rosenbüsche
    for (let i = 0; i < 120; i++) {
      const x = 1.0 + r() * 8.6;
      if (Math.abs(x - NG.door.x) < 0.95) continue;
      const z = -7.65 + r() * 0.6;
      const s = 0.05 + r() * 0.04;
      flowers.push({pos: [x, 0.2 + r() * 0.25, z], scale: [s, s, s], rotY: r() * 6, color: pick(['#f4d23c', '#e8574b', '#f6f1ea', '#b46fd0', '#f08ab2', '#ff8a3d'])});
    }
    for (let x = 1.2; x < 9.6; x += 0.55) {
      if (Math.abs(x - NG.door.x) < 0.95) continue;
      bushes.push({pos: [x, 0.18, -7.35], scale: [0.26, 0.22, 0.24], rotY: r() * 6, color: pick(['#3f8a34', '#468f3a'])});
    }
    for (const z of [-4.5, -1.5, 1.5, 6.0]) {
      bushes.push({pos: [0.55, 0.32, z], scale: [0.36, 0.34, 0.36], rotY: 0, color: '#2f7a2c'});
    }
    for (const [x, z] of [
      [9.3, -5.5],
      [9.3, -2.0],
      [9.3, 1.5],
    ] as [number, number][]) {
      bushes.push({pos: [x, 0.45, z], scale: [0.5, 0.45, 0.5], rotY: r() * 6, color: '#3d7d32'});
      for (let k = 0; k < 9; k++) {
        const a = r() * Math.PI * 2;
        flowers.push({pos: [x + Math.cos(a) * 0.42, 0.5 + r() * 0.3, z + Math.sin(a) * 0.42], scale: [0.07, 0.07, 0.07], rotY: 0, color: pick(['#e8394b', '#f28aa5', '#ffffff'])});
      }
    }
    // Dummy: ein paar welke, braune Büsche
    for (const [x, z] of [
      [-9.3, -3.0],
      [-9.3, 2.5],
      [-0.6, -5.0],
    ] as [number, number][]) {
      bushes.push({pos: [x, 0.3, z], scale: [0.42, 0.3, 0.4], rotY: r() * 6, color: pick(['#8c7a3e', '#7a6a38'])});
    }
    // Bäume hinter den Häusern
    const tree = (x: number, z: number, s: number) => {
      trunks.push({pos: [x, 0, z], scale: [0.22 * s, 2.0 * s, 0.22 * s], rotY: r() * 6, color: C.trunk});
      const col = pick(C.leaf);
      crowns.push({pos: [x, 2.8 * s, z], scale: [1.6 * s, 1.3 * s, 1.6 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + 0.7 * s, 2.4 * s, z + 0.3 * s], scale: [1.0 * s, 0.9 * s, 1.0 * s], rotY: r() * 6, color: col});
    };
    for (let i = 0; i < 30; i++) {
      const x = -45 + r() * 90;
      const z = -18 - r() * 34;
      tree(x, z, 1.3 + r() * 1.3);
    }
    for (let i = 0; i < 12; i++) {
      const sx = r() < 0.5 ? -1 : 1;
      tree(sx * (13 + r() * 18), -8 + r() * 24, 1.1 + r() * 1.0);
    }
    return {pickets, posts, rails, hedges, flowers, bushes, trunks, crowns};
  }, []);

const makeScene = (night: boolean) => {
  const Scene = ({cam}: {cam?: StageCam}) => {
    void cam;
    const L = useLayout();
    const c = night ? NIGHT : DAY;
    const geos = useMemo(() => {
      const picket = new THREE.BoxGeometry(1, 1, 1);
      picket.translate(0, 0.5, 0);
      const tip = new THREE.ConeGeometry(0.72, 0.09, 4);
      tip.rotateY(Math.PI / 4);
      tip.scale(1, 1, 0.3);
      const post = new THREE.BoxGeometry(1, 1, 1);
      post.translate(0, 0.5, 0);
      const ball = new THREE.IcosahedronGeometry(1, 0);
      const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
      trunk.translate(0, 0.5, 0);
      return {picket, tip, post, ball, trunk};
    }, []);
    // Spitzen der Latten: oben auf jeder Latte
    const tips = useMemo(
      () => L.pickets.map((p) => ({...p, pos: [p.pos[0], p.scale[1] + 0.04, p.pos[2]] as [number, number, number], scale: [p.scale[0], 1, p.scale[2]] as [number, number, number]})),
      [L],
    );
    const groundGeo = useMemo(() => {
      const g = new THREE.PlaneGeometry(240, 240, 1, 1);
      g.rotateX(-Math.PI / 2);
      return g;
    }, []);
    return (
      <>
        <color attach="background" args={[c.fog]} />
        <fog attach="fog" args={[c.fog, night ? 30 : 45, night ? 140 : 260]} />
        <Sky c={c} />
        {night && <NightSky />}
        {night ? (
          <>
            <hemisphereLight args={['#6f88cc', '#24331f', 1.05]} />
            <ambientLight intensity={0.38} color="#8597d4" />
            <directionalLight
              position={[-12, 22, -14]}
              intensity={1.9}
              color="#c3d0ff"
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-left={-18}
              shadow-camera-right={18}
              shadow-camera-top={18}
              shadow-camera-bottom={-18}
              shadow-camera-near={1}
              shadow-camera-far={80}
              shadow-bias={-0.0006}
              shadow-normalBias={0.02}
            />
          </>
        ) : (
          <>
            <hemisphereLight args={['#e8f3ff', '#5d7a3a', 1.0]} />
            <ambientLight intensity={0.18} />
            <directionalLight
              position={[-9, 20, 11]}
              intensity={3.0}
              color="#fff3dc"
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-left={-18}
              shadow-camera-right={18}
              shadow-camera-top={18}
              shadow-camera-bottom={-18}
              shadow-camera-near={1}
              shadow-camera-far={80}
              shadow-bias={-0.0006}
              shadow-normalBias={0.02}
            />
          </>
        )}
        <mesh geometry={groundGeo} position={[0, -0.005, 0]} receiveShadow>
          <meshStandardMaterial color={c.ground} roughness={1} flatShading />
        </mesh>
        {/* Gehweg vorn */}
        <mesh position={[0, 0.005, 12.5]} receiveShadow>
          <boxGeometry args={[60, 0.02, 3]} />
          <meshStandardMaterial color={night ? '#4a4d55' : '#c8c3b8'} roughness={0.95} />
        </mesh>
        <HouseBlock x={-5.2} z={NG.houseZ} wall="#e7dccb" roof="#6a5b55" trim="#ffffff" night={night} windowsLit={[0, 4]} />
        <HouseBlock x={5.2} z={NG.houseZ} wall="#f6f1e6" roof="#b5523a" trim="#ffffff" night={night} door={{x: NG.door.x, color: '#2f6f4f'}} windowsLit={[2, 3, 5]} />
        {/* Trennwand zwischen den Häusern (Doppelhaus) */}
        <mesh position={[0, 2.6, NG.houseZ]} castShadow>
          <boxGeometry args={[2.2, 5.2, 6.8]} />
          <meshStandardMaterial color="#d9cfbf" flatShading roughness={0.95} />
        </mesh>
        <DogHouse x={-8.3} z={-5.6} rot={0.35} />
        <GardenLamp x={0.45} z={-6.3} night={night} />
        <GardenLamp x={9.6} z={8.6} night={night} />
        <GardenLamp x={-9.6} z={8.6} night={night} />
        <Instances geometry={geos.picket} items={L.pickets} />
        <Instances geometry={geos.tip} items={tips} />
        <Instances geometry={geos.post} items={L.posts} />
        {L.rails.map((rl, i) => (
          <mesh key={i} position={rl.pos} rotation={[0, rl.rotY, 0]} castShadow>
            <boxGeometry args={[0.04, 0.07, rl.len]} />
            <meshStandardMaterial color={rl.color} flatShading roughness={0.9} />
          </mesh>
        ))}
        <Instances geometry={geos.ball} items={L.hedges} />
        <Instances geometry={geos.ball} items={L.bushes} />
        <Instances geometry={geos.ball} items={L.flowers} castShadow={false} />
        <Instances geometry={geos.trunk} items={L.trunks} />
        <Instances geometry={geos.ball} items={L.crowns} />
      </>
    );
  };
  return Scene;
};

export const neighborGardenStage: StageDef = {
  id: 'nachbargarten',
  Component: makeScene(false),
  climbTrees: [],
  groundHeight,
  ambience: 'wald-atmo',
};

export const neighborGardenNightStage: StageDef = {
  id: 'nachbargarten-nacht',
  Component: makeScene(true),
  climbTrees: [],
  groundHeight,
  ambience: 'nacht-atmo',
};
