import {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {Instances, Sky, type Inst} from './Forest';
import {waveHeight} from './Lake';
import type {StageCam, StageDef} from './types';

/**
 * Bühne "kanal": alte Kaimauer an einem Kanal/Fluss in der Stadt.
 * Uferweg mit Kopfsteinpflaster, Bäume, Laternen, Poller, gegenüber eine zweite Kaimauer mit Häusern,
 * links eine alte Steinbogenbrücke. Wasser wie beim Seeufer (bewegte Oberfläche), nur tiefer unten.
 *
 * Koordinaten (1 Einheit = 1 Meter):
 * - Uferweg (Kopfsteinpflaster) auf y = 0, von der Mauerkante z = 0 bis z ≈ 6.2, entlang der x-Achse.
 * - Kaimauer: senkrecht bei z = 0, Wasser bei y = CANAL.water (−1.3) für z zwischen −12 und 0.
 *   Bodenhöhe über dem Wasser = Wasseroberfläche (Figuren/Objekte auf dem Kanal: y relativ zum Wasser).
 * - Gegenüberliegende Mauer bei z = −12 (Häuser dahinter), Brücke bei x = −15 (über den Kanal).
 * - Bäume am Weg bei z ≈ 5.6 (alle 6,5 m, Lücke um x = 0), Grünstreifen ab z ≈ 6.2, Häuser ab z ≈ 11.
 * - Poller an der Kante bei x = 3.2 und x = −6.5, Laternen bei z = 5.2.
 */
export const CANAL = {water: -1.3, width: 12, edgeZ: 0, walkEnd: 6.2, bridgeX: -15};

const C = {
  skyTop: '#6fa9d6',
  skyHorizon: '#f2e8d2',
  fog: '#dfe5e0',
  cobble: ['#8d8579', '#7d766c', '#9a9184', '#857c70', '#a09787', '#746d64'],
  joint: '#5b554d',
  coping: '#b4ab9b',
  wall: ['#8f8273', '#9d8f7e', '#85796b', '#a39684'],
  wallDark: '#5f564c',
  moss: '#5b6a3a',
  grass: '#7c9c45',
  grassDark: '#62833a',
  water: '#3c7f86',
  trunk: '#5b3f2a',
  leaf: ['#5d8a35', '#6f9a3c', '#4f7a30', '#86a443'],
  house: ['#d9c6a5', '#c98f6b', '#e3d7bf', '#b97a5e', '#d8b98c', '#cfc2ae'],
  roof: ['#8e3b2b', '#7a3326', '#5d4a3f', '#9a4a32'],
  iron: '#2c2f33',
};

const groundHeight = (x: number, z: number) => (z < CANAL.edgeZ && z > -CANAL.width ? CANAL.water : 0);

// ---------- Kopfsteinpflaster ----------
const useCobbles = () =>
  useMemo(() => {
    const r = rng(5);
    const out: Inst[] = [];
    const S = 0.24;
    for (let row = 0; row * S < CANAL.walkEnd - 0.5; row++) {
      const z = 0.5 + row * S + S / 2;
      const off = (row % 2) * S * 0.5;
      for (let x = -26 + off; x < 26; x += S) {
        const w = S * (0.82 + r() * 0.1);
        out.push({
          pos: [x + (r() - 0.5) * 0.02, 0.0, z + (r() - 0.5) * 0.02],
          scale: [w, 0.06 + r() * 0.025, S * (0.8 + r() * 0.1)],
          rotY: (r() - 0.5) * 0.12,
          color: C.cobble[Math.floor(r() * C.cobble.length)],
        });
      }
    }
    return out;
  }, []);

// ---------- Kaimauer (Quader-Steine) ----------
const useWallStones = (z0: number, facing: 1 | -1, seed: number) =>
  useMemo(() => {
    const r = rng(seed);
    const out: Inst[] = [];
    const H = 0.34;
    for (let row = 0; row < 7; row++) {
      const y = -0.22 - row * H;
      let x = -60 + (row % 2) * 0.4;
      while (x < 60) {
        const L = 0.6 + r() * 0.5;
        out.push({
          pos: [x + L / 2, y - H / 2, z0 + facing * (0.04 + r() * 0.03)],
          scale: [L - 0.035, H - 0.035, 0.3],
          rotY: 0,
          color: row > 3 ? C.wallDark : C.wall[Math.floor(r() * C.wall.length)],
        });
        x += L;
      }
    }
    return out;
  }, [z0, facing, seed]);

const box = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  return g;
})();
const boxBottom = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
})();

// ---------- Wasser ----------
const CanalWater = ({tau}: {tau: number}) => {
  const {geo, xz} = useMemo(() => {
    const plane = new THREE.PlaneGeometry(160, CANAL.width + 0.6, 120, 16);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, 0, -CANAL.width / 2);
    const g = plane.toNonIndexed();
    const pos = g.attributes.position as THREE.BufferAttribute;
    const xz = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      xz[i * 2] = pos.getX(i);
      xz[i * 2 + 1] = pos.getZ(i);
    }
    return {geo: g, xz};
  }, []);
  useMemo(() => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, CANAL.water + 0.6 * waveHeight(xz[i * 2], xz[i * 2 + 1], tau * 0.8));
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [geo, xz, tau]);
  return (
    <>
      {/* dunkler Kanalgrund */}
      <mesh position={[0, CANAL.water - 2.2, -CANAL.width / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, CANAL.width]} />
        <meshStandardMaterial color="#20393a" roughness={1} />
      </mesh>
      <mesh geometry={geo} renderOrder={3}>
        <meshStandardMaterial color={C.water} transparent opacity={0.86} roughness={0.12} metalness={0.15} flatShading depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
};

// ---------- Steinbogenbrücke ----------
const Bridge = () => {
  const geo = useMemo(() => {
    // Seitenansicht (z, y): Brückenkörper mit Bogen, extrudiert entlang x
    const W = CANAL.width;
    const s = new THREE.Shape();
    s.moveTo(1.5, 0.0);
    s.lineTo(1.5, 0.75);
    s.lineTo(-W - 1.5, 0.75);
    s.lineTo(-W - 1.5, 0.0);
    s.lineTo(-W, 0.0);
    s.lineTo(-W, CANAL.water - 2.4);
    s.lineTo(-W + 0.6, CANAL.water - 2.4);
    s.lineTo(-W + 0.6, CANAL.water + 0.2);
    // Bogen (Halbkreis-ähnlich) von z = −W+0.6 bis z = −0.6
    const cx = -W / 2;
    const rx = W / 2 - 0.6;
    const ry = 1.5;
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI - (i / 24) * Math.PI;
      s.lineTo(cx + Math.cos(a) * rx, CANAL.water + 0.2 + Math.sin(a) * ry);
    }
    s.lineTo(-0.6, CANAL.water - 2.4);
    s.lineTo(0, CANAL.water - 2.4);
    s.lineTo(0, 0);
    s.lineTo(1.5, 0.0);
    const g = new THREE.ExtrudeGeometry(s, {depth: 3.2, bevelEnabled: false});
    // Shape-x = Welt-z, Shape-y = Welt-y, Extrusion = Welt-x
    g.rotateY(-Math.PI / 2);
    g.translate(1.6, 0, 0);
    return g.toNonIndexed();
  }, []);
  return (
    <group position={[CANAL.bridgeX, 0, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color="#a3927c" flatShading roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* Brüstungen */}
      {[-1.45, 1.45].map((x) => (
        <mesh key={x} position={[x, 1.05, -CANAL.width / 2]} castShadow>
          <boxGeometry args={[0.3, 0.6, CANAL.width + 3]} />
          <meshStandardMaterial color="#b1a28c" flatShading roughness={0.95} />
        </mesh>
      ))}
      {/* Schlussstein-Band */}
      {[-1.62, 1.62].map((x) => (
        <mesh key={`b${x}`} position={[x, 0.68, -CANAL.width / 2]}>
          <boxGeometry args={[0.06, 0.14, CANAL.width + 3]} />
          <meshStandardMaterial color="#8a7a65" flatShading />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Häuser ----------
const House = ({x, z, w, d, h, color, roof, face}: {x: number; z: number; w: number; d: number; h: number; color: string; roof: string; face: 1 | -1}) => {
  const win = '#3b4a57';
  const rows = Math.max(1, Math.floor((h - 0.8) / 2.6));
  const cols = Math.max(1, Math.floor(w / 2));
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, h + 1.1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[d * 0.62, 1.1, w * 0.53]} castShadow>
        <coneGeometry args={[1.4, 2, 4, 1]} />
        <meshStandardMaterial color={roof} flatShading roughness={0.9} />
      </mesh>
      {Array.from({length: rows}, (_, r) =>
        Array.from({length: cols}, (_, c) => (
          <mesh key={`${r}-${c}`} position={[(c - (cols - 1) / 2) * (w / cols), 1.6 + r * 2.6, face * (d / 2 + 0.01)]}>
            <boxGeometry args={[0.8, 1.15, 0.03]} />
            <meshStandardMaterial color={win} roughness={0.3} metalness={0.2} />
          </mesh>
        )),
      )}
    </group>
  );
};

const useLayout = () =>
  useMemo(() => {
    const r = rng(81);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const grass: Inst[] = [];
    const bushes: Inst[] = [];
    const moss: Inst[] = [];
    const houses: {x: number; z: number; w: number; d: number; h: number; color: string; roof: string; face: 1 | -1}[] = [];
    const addTree = (x: number, z: number, s: number) => {
      trunks.push({pos: [x, 0, z], scale: [0.2 * s, 2.6 * s, 0.2 * s], rotY: r() * 6, color: C.trunk});
      const col = pick(C.leaf);
      crowns.push({pos: [x, 3.6 * s, z], scale: [1.6 * s, 1.5 * s, 1.6 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * 1.1 * s, 2.9 * s, z + (r() - 0.5) * 1.1 * s], scale: [1.1 * s, 1.0 * s, 1.1 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * 1.1 * s, 4.3 * s, z + (r() - 0.5) * 0.8 * s], scale: [0.95 * s, 0.9 * s, 0.95 * s], rotY: r() * 6, color: pick(C.leaf)});
    };
    // Bäume am Uferweg (Lücke um die Szene), gegenüber am anderen Ufer
    for (let x = -30; x <= 30; x += 6.5) {
      if (x > -3.5 && x < 2.5) continue;
      addTree(x + (r() - 0.5), 5.7, 1 + r() * 0.25);
    }
    for (let x = -40; x <= 40; x += 7) addTree(x + (r() - 0.5) * 2, -CANAL.width - 2.2, 1.05 + r() * 0.3);
    // Grünstreifen hinter dem Weg
    for (let i = 0; i < 900; i++) {
      const x = -35 + r() * 70;
      const z = CANAL.walkEnd + 0.1 + r() * 4.5;
      const s = 0.12 + r() * 0.2;
      grass.push({pos: [x, 0, z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: pick(['#86a64a', '#93ae50', '#6f8f3c'])});
    }
    for (let i = 0; i < 26; i++) {
      const x = -35 + r() * 70;
      if (Math.abs(x) < 4) continue;
      const s = 0.4 + r() * 0.4;
      bushes.push({pos: [x, s * 0.35, CANAL.walkEnd + 1 + r() * 3], scale: [s * 1.3, s, s * 1.2], rotY: r() * 6, color: pick(['#4c7a33', '#5d8a35', '#62833a'])});
    }
    // Moos/Algen an der Mauer knapp über dem Wasser
    for (let i = 0; i < 160; i++) {
      const x = -45 + r() * 90;
      const s = 0.12 + r() * 0.25;
      const far = r() < 0.5;
      moss.push({pos: [x, CANAL.water + 0.05 + r() * 0.18, far ? -CANAL.width + 0.06 : -0.06], scale: [s * 2, s * 0.5, 0.08], rotY: 0, color: pick([C.moss, '#4e5d33', '#667443'])});
    }
    // Häuserzeile gegenüber (Front zum Kanal) und hinter dem Grünstreifen
    let x = -46;
    while (x < 46) {
      const w = 5 + r() * 3.5;
      houses.push({x: x + w / 2, z: -CANAL.width - 7.5, w: w - 0.1, d: 7, h: 6 + r() * 5, color: pick(C.house), roof: pick(C.roof), face: 1});
      x += w;
    }
    x = -46;
    while (x < 46) {
      const w = 6 + r() * 4;
      houses.push({x: x + w / 2, z: CANAL.walkEnd + 9, w: w - 0.1, d: 7, h: 7 + r() * 4, color: pick(C.house), roof: pick(C.roof), face: -1});
      x += w;
    }
    return {trunks, crowns, grass, bushes, moss, houses};
  }, []);

const Bollard = ({x}: {x: number}) => (
  <group position={[x, 0, 0.32]}>
    <mesh position={[0, 0.2, 0]} castShadow>
      <cylinderGeometry args={[0.13, 0.16, 0.4, 10]} />
      <meshStandardMaterial color={C.iron} flatShading roughness={0.6} metalness={0.3} />
    </mesh>
    <mesh position={[0, 0.42, 0]} castShadow>
      <cylinderGeometry args={[0.19, 0.15, 0.08, 10]} />
      <meshStandardMaterial color={C.iron} flatShading roughness={0.6} metalness={0.3} />
    </mesh>
  </group>
);

const Lantern = ({x, z}: {x: number; z: number}) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 1.7, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.08, 3.4, 8]} />
      <meshStandardMaterial color={C.iron} flatShading metalness={0.3} roughness={0.6} />
    </mesh>
    <mesh position={[0, 3.55, 0]}>
      <cylinderGeometry args={[0.13, 0.2, 0.36, 6]} />
      <meshStandardMaterial color="#f4e9c6" emissive="#f4e2a8" emissiveIntensity={0.15} flatShading />
    </mesh>
    <mesh position={[0, 3.78, 0]}>
      <coneGeometry args={[0.24, 0.18, 6]} />
      <meshStandardMaterial color={C.iron} flatShading />
    </mesh>
  </group>
);

/** Geländer an der gegenüberliegenden Kante (dünn, eisern) */
const FarRailing = () => (
  <group position={[0, 0, -CANAL.width - 0.25]}>
    <mesh position={[0, 0.95, 0]}>
      <boxGeometry args={[100, 0.05, 0.05]} />
      <meshStandardMaterial color={C.iron} />
    </mesh>
    {Array.from({length: 51}, (_, i) => (
      <mesh key={i} position={[-50 + i * 2, 0.48, 0]}>
        <boxGeometry args={[0.05, 0.95, 0.05]} />
        <meshStandardMaterial color={C.iron} />
      </mesh>
    ))}
  </group>
);

const CanalScene = (_: {cam?: StageCam}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tau = frame / fps;
  const L = useLayout();
  const cobbles = useCobbles();
  const nearWall = useWallStones(0, -1, 11);
  const farWall = useWallStones(-CANAL.width, 1, 12);
  const geos = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
    trunk.translate(0, 0.5, 0);
    const crown = new THREE.IcosahedronGeometry(1, 0);
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    const cob = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    cob.translate(0, -0.5 + 0.12, 0);
    return {trunk, crown, blade, cob};
  }, []);
  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 40, 160]} />
      <Sky c={C} />
      <hemisphereLight args={['#e3edff', '#6b6a55', 0.95]} />
      <ambientLight intensity={0.16} />
      <directionalLight
        position={[-10, 16, 9]}
        intensity={2.7}
        color="#ffe6b8"
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
      {/* Fugen-Untergrund des Uferwegs */}
      <mesh position={[0, -0.01, (0.5 + CANAL.walkEnd) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, CANAL.walkEnd - 0.5]} />
        <meshStandardMaterial color={C.joint} roughness={1} />
      </mesh>
      <Instances geometry={geos.cob} items={cobbles} castShadow={false} />
      {/* Randsteine (Kaimauer-Abdeckung) */}
      <mesh position={[0, -0.11, 0.25]} receiveShadow castShadow>
        <boxGeometry args={[200, 0.24, 0.52]} />
        <meshStandardMaterial color={C.coping} flatShading roughness={0.9} />
      </mesh>
      {Array.from({length: 120}, (_, i) => (
        <mesh key={i} position={[-60 + i * 1.0, 0.012, 0.25]}>
          <boxGeometry args={[0.025, 0.004, 0.52]} />
          <meshStandardMaterial color="#8d8576" />
        </mesh>
      ))}
      {/* Mauerkörper (dahinter, damit keine Lücken sichtbar sind) */}
      <mesh position={[0, -1.6, 0.3]}>
        <boxGeometry args={[200, 3.0, 0.6]} />
        <meshStandardMaterial color={C.wallDark} flatShading />
      </mesh>
      <Instances geometry={box} items={nearWall} />
      {/* gegenüberliegende Seite */}
      <mesh position={[0, -1.6, -CANAL.width - 0.3]}>
        <boxGeometry args={[200, 3.0, 0.6]} />
        <meshStandardMaterial color={C.wallDark} flatShading />
      </mesh>
      <Instances geometry={box} items={farWall} />
      <mesh position={[0, -0.11, -CANAL.width - 0.25]} receiveShadow>
        <boxGeometry args={[200, 0.24, 0.52]} />
        <meshStandardMaterial color={C.coping} flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.02, -CANAL.width - 9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 18]} />
        <meshStandardMaterial color="#9a9184" roughness={1} />
      </mesh>
      <FarRailing />
      {/* Grünstreifen + Straße hinten */}
      <mesh position={[0, -0.005, CANAL.walkEnd + 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 6]} />
        <meshStandardMaterial color={C.grass} roughness={1} />
      </mesh>
      <mesh position={[0, -0.005, CANAL.walkEnd + 30]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 48]} />
        <meshStandardMaterial color="#8f887c" roughness={1} />
      </mesh>
      <Instances geometry={boxBottom} items={L.moss} castShadow={false} />
      <CanalWater tau={tau} />
      <Bridge />
      {[3.2, -6.5, 11].map((x) => (
        <Bollard key={x} x={x} />
      ))}
      {[-9, 8.5, 21].map((x) => (
        <Lantern key={x} x={x} z={5.2} />
      ))}
      <Instances geometry={geos.trunk} items={L.trunks} />
      <Instances geometry={geos.crown} items={L.crowns} />
      <Instances geometry={geos.crown} items={L.bushes} />
      <Instances geometry={geos.blade} items={L.grass} castShadow={false} />
      {L.houses.map((h, i) => (
        <House key={i} {...h} />
      ))}
    </>
  );
};

export const canalStage: StageDef = {
  id: 'kanal',
  Component: CanalScene,
  climbTrees: [],
  groundHeight,
  ambience: 'see-atmo',
  waterLevel: CANAL.water,
};
