import {useLayoutEffect, useMemo, useRef, type ReactElement} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import type {StageDef} from './types';

/**
 * Wald-Baukasten. Daraus entstehen mehrere Bühnen (Varianten), siehe unten:
 *  - "wald": Waldweg (verläuft entlang der z-Achse), Nadel- und Laubbäume,
 *    Felsen, Büsche, Gras. Dummy startet bei (0,0), Bär steht weiter hinten (−z).
 *  - "waldlichtung": sonnige Lichtung am Waldrand mit Heidekraut, niedrigem Gras,
 *    schmalem Wanderpfad und einem warmen Stein in der Sonne (siehe Clearing.tsx).
 * Low-Poly mit flacher Schattierung. Koordinaten: 1 Einheit = 1 Meter.
 */

export type ForestColors = typeof C;

/** Einstellungen einer Wald-Variante */
export type ForestConfig = {
  colors: ForestColors;
  /** halbe Wegbreite in Metern */
  pathHalf: number;
  /** Bäume nur dort, wo diese Funktion true liefert (z. B. Lichtung freihalten) */
  treeAllowed?: (x: number, z: number) => boolean;
  trees: number;
  rocks: number;
  bushes: number;
  grass: {count: number; minH: number; maxH: number; colors: string[]};
  /** Heidekraut-Büschel (lila/rosa), 0 = keins */
  heather?: {count: number; area: (r: () => number) => [number, number]};
  light: {sun: [number, number, number]; intensity: number; color: string; hemiSky: string; hemiGround: string; hemi: number};
  fogRange: [number, number];
  showClimbTree: boolean;
  /** Zusätzliche Objekte der Variante (z. B. warmer Stein) */
  Extras?: () => ReactElement | null;
  /** Bereiche ohne Gras/Büsche (z. B. unter dem Stein) */
  keepClear?: {x: number; z: number; r: number}[];
};

const C = {
  skyTop: '#78aecb',
  skyHorizon: '#f7e2b2',
  fog: '#dcdab4',
  grass: '#6c8b3c',
  grassDark: '#4f6e2c',
  path: '#a77d4f',
  pathDark: '#8c6640',
  trunk: '#5b3f2a',
  pine: ['#2f5b3a', '#3a6b40', '#284f35'],
  leaf: ['#5d8a35', '#6f9a3c', '#4f7a30', '#86a443'],
  rock: '#8d8c84',
  bush: '#4c7a33',
};

/** Weg-Mittellinie: gerade im Spielbereich, schwingt weiter hinten/vorne aus */
export const pathX = (z: number) => {
  if (z < -20) return -3 * Math.sin((z + 20) * 0.06);
  if (z > 24) return 2.5 * Math.sin((z - 24) * 0.07);
  return 0;
};

/** Der Kletterbaum steht immer hier (für Option "Baum"). */
export const CLIMB_TREES = [{x: 3.3, z: -2.0, r: 0.32}];

const PATH_HALF = 1.25;

const makeIsFree = (cfg: ForestConfig) => (x: number, z: number, margin: number) => {
  if (Math.abs(x - pathX(z)) < cfg.pathHalf + margin) return false;
  for (const t of CLIMB_TREES) if (Math.hypot(x - t.x, z - t.z) < 2.2) return false;
  for (const k of cfg.keepClear ?? []) if (Math.hypot(x - k.x, z - k.z) < k.r + margin * 0.5) return false;
  return true;
};

/** Leichte Bodenwellen – flach in der Nähe des Weges */
const groundHeight = (x: number, z: number) => {
  const d = Math.abs(x - pathX(z));
  const k = Math.min(1, Math.max(0, (d - 3) / 10));
  return k * (Math.sin(x * 0.18) * Math.cos(z * 0.14) * 1.2 + Math.sin(x * 0.5 + z * 0.3) * 0.25);
};

// ---------- Himmel ----------
const Sky = ({c}: {c: ForestColors}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: {value: new THREE.Color(c.skyTop)},
          bottom: {value: new THREE.Color(c.skyHorizon)},
        },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
          void main(){ float h = clamp(vP.y*1.6+0.08,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.8)),1.0); }`,
      }),
    [c],
  );
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[400, 24, 12]} />
    </mesh>
  );
};

// ---------- Boden + Weg ----------
const Ground = ({c}: {c: ForestColors}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(220, 220, 90, 90);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const r = rng(7);
    const a = new THREE.Color(c.grass);
    const b = new THREE.Color(c.grassDark);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, groundHeight(x, z) - 0.02);
      const c = a.clone().lerp(b, r() * 0.6);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const ng = g.toNonIndexed();
    ng.computeVertexNormals();
    return ng;
  }, [c]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
};

const Path = ({c, half}: {c: ForestColors; half: number}) => {
  const geo = useMemo(() => {
    const r = rng(11);
    const verts: number[] = [];
    const colors: number[] = [];
    const ca = new THREE.Color(c.path);
    const cb = new THREE.Color(c.pathDark);
    const zs: number[] = [];
    for (let z = -110; z <= 110; z += 1.2) zs.push(z);
    const rows = zs.map((z) => {
      const cx = pathX(z);
      const w = half + (r() - 0.5) * 0.35 * (half / PATH_HALF);
      return [
        [cx - w, z + (r() - 0.5) * 0.3],
        [cx + (r() - 0.5) * 0.3, z],
        [cx + w, z + (r() - 0.5) * 0.3],
      ];
    });
    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = 0; j < 2; j++) {
        const p = [rows[i][j], rows[i][j + 1], rows[i + 1][j], rows[i + 1][j + 1]];
        const tri = (A: number[], B: number[], Cc: number[]) => {
          const col = ca.clone().lerp(cb, r() * 0.7);
          for (const v of [A, B, Cc]) {
            verts.push(v[0], 0.015 + r() * 0.01, v[1]);
            colors.push(col.r, col.g, col.b);
          }
        };
        tri(p[0], p[2], p[1]);
        tri(p[1], p[2], p[3]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [c, half]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
};

// ---------- Instanzen (viele gleiche Objekte, schnell gezeichnet) ----------
type Inst = {pos: [number, number, number]; scale: [number, number, number]; rotY: number; color: string};

const Instances = ({
  geometry,
  items,
  castShadow = true,
}: {
  geometry: THREE.BufferGeometry;
  items: Inst[];
  castShadow?: boolean;
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(...it.pos);
      o.scale.set(...it.scale);
      o.rotation.set(0, it.rotY, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, new THREE.Color(it.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, items.length]}
      castShadow={castShadow}
      receiveShadow
    >
      <meshStandardMaterial flatShading roughness={0.95} />
    </instancedMesh>
  );
};

const useForestLayout = (cfg: ForestConfig) =>
  useMemo(() => {
    const C = cfg.colors;
    const isFree = makeIsFree(cfg);
    const r = rng(42);
    const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
    const trunks: Inst[] = [];
    const pineLayers: Inst[] = [];
    const crowns: Inst[] = [];
    const rocks: Inst[] = [];
    const bushes: Inst[] = [];
    const grass: Inst[] = [];
    const heather: Inst[] = [];

    const addPine = (x: number, z: number, s: number) => {
      const y = groundHeight(x, z);
      trunks.push({pos: [x, y, z], scale: [0.22 * s, 1.4 * s, 0.22 * s], rotY: r() * 6, color: C.trunk});
      const col = pick(C.pine);
      for (let k = 0; k < 3; k++) {
        const w = (1.9 - k * 0.45) * s;
        pineLayers.push({
          pos: [x, y + (1.1 + k * 1.15) * s, z],
          scale: [w, 1.9 * s, w],
          rotY: r() * 6,
          color: col,
        });
      }
    };
    const addLeafy = (x: number, z: number, s: number) => {
      const y = groundHeight(x, z);
      trunks.push({pos: [x, y, z], scale: [0.25 * s, 2.4 * s, 0.25 * s], rotY: r() * 6, color: C.trunk});
      const col = pick(C.leaf);
      crowns.push({pos: [x, y + 3.2 * s, z], scale: [1.7 * s, 1.5 * s, 1.7 * s], rotY: r() * 6, color: col});
      crowns.push({
        pos: [x + (r() - 0.5) * 1.2 * s, y + 2.6 * s, z + (r() - 0.5) * 1.2 * s],
        scale: [1.1 * s, 1.0 * s, 1.1 * s],
        rotY: r() * 6,
        color: col,
      });
    };

    let placed = 0;
    let tries = 0;
    while (placed < cfg.trees && tries < 6000) {
      tries++;
      const z = -95 + r() * 125;
      const side = r() < 0.5 ? -1 : 1;
      const x = pathX(z) + side * (2.2 + Math.pow(r(), 1.3) * 34);
      if (!isFree(x, z, 1.0)) continue;
      if (cfg.treeAllowed && !cfg.treeAllowed(x, z)) continue;
      const s = 0.85 + r() * 0.75;
      if (r() < 0.55) addPine(x, z, s);
      else addLeafy(x, z, s);
      placed++;
    }
    for (let i = 0; i < cfg.rocks; i++) {
      const z = -80 + r() * 105;
      const x = pathX(z) + (r() < 0.5 ? -1 : 1) * (1.7 + r() * 16);
      if (!isFree(x, z, 0.3)) continue;
      const s = 0.25 + r() * 0.6;
      rocks.push({pos: [x, groundHeight(x, z) + s * 0.2, z], scale: [s * 1.3, s * 0.8, s], rotY: r() * 6, color: C.rock});
    }
    for (let i = 0; i < cfg.bushes; i++) {
      const z = -80 + r() * 105;
      const x = pathX(z) + (r() < 0.5 ? -1 : 1) * (1.8 + r() * 20);
      if (!isFree(x, z, 0.4)) continue;
      const s = 0.4 + r() * 0.6;
      bushes.push({pos: [x, groundHeight(x, z) + s * 0.35, z], scale: [s * 1.3, s, s * 1.2], rotY: r() * 6, color: pick([C.bush, C.leaf[2], C.grassDark])});
    }
    const G = cfg.grass;
    for (let i = 0; i < G.count; i++) {
      const z = -60 + r() * 85;
      const x = pathX(z) + (r() - 0.5) * 50;
      if (Math.abs(x - pathX(z)) < cfg.pathHalf + 0.1) continue;
      if ((cfg.keepClear ?? []).some((k) => Math.hypot(x - k.x, z - k.z) < k.r)) continue;
      const s = G.minH + r() * (G.maxH - G.minH);
      grass.push({pos: [x, groundHeight(x, z), z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: pick(G.colors)});
    }
    // Heidekraut: kleine Büschel aus mehreren lila/rosa Kugeln auf dunkelgrünem Grund
    if (cfg.heather) {
      const H = cfg.heather;
      for (let i = 0; i < H.count; i++) {
        const [x, z] = H.area(r);
        if (!isFree(x, z, 0.15)) continue;
        const s = 0.1 + r() * 0.12;
        const y = groundHeight(x, z);
        heather.push({pos: [x, y + s * 0.3, z], scale: [s * 1.6, s * 0.7, s * 1.5], rotY: r() * 6, color: pick(['#3f5a2c', '#4a6631'])});
        const n = 3 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) {
          const ss = s * (0.3 + r() * 0.25);
          heather.push({
            pos: [x + (r() - 0.5) * s * 1.6, y + s * (0.55 + r() * 0.4), z + (r() - 0.5) * s * 1.6],
            scale: [ss * 0.8, ss * 1.25, ss * 0.8],
            rotY: r() * 6,
            color: pick(['#94588c', '#a8679c', '#7f4a78', '#b07aa6', '#6e4269']),
          });
        }
      }
    }
    return {trunks, pineLayers, crowns, rocks, bushes, grass, heather};
  }, [cfg]);

const ClimbTree = ({x, z, r, C}: {x: number; z: number; r: number; C: ForestColors}) => (
  <group position={[x, 0, z]}>
    <mesh castShadow receiveShadow position={[0, 3, 0]}>
      <cylinderGeometry args={[r * 0.75, r * 1.15, 6, 7]} />
      <meshStandardMaterial color={C.trunk} flatShading roughness={1} />
    </mesh>
    {/* Äste */}
    <mesh castShadow position={[0.55, 4.6, 0.1]} rotation={[0, 0, -0.9]}>
      <cylinderGeometry args={[0.06, 0.1, 1.3, 5]} />
      <meshStandardMaterial color={C.trunk} flatShading />
    </mesh>
    <mesh castShadow position={[-0.5, 5.2, -0.2]} rotation={[0.3, 0, 0.9]}>
      <cylinderGeometry args={[0.06, 0.1, 1.2, 5]} />
      <meshStandardMaterial color={C.trunk} flatShading />
    </mesh>
    {[
      [0, 7.0, 0, 2.4],
      [1.1, 6.2, 0.4, 1.6],
      [-1.0, 6.4, -0.5, 1.7],
      [0.2, 6.0, 1.1, 1.4],
    ].map(([px, py, pz, s], i) => (
      <mesh key={i} castShadow receiveShadow position={[px, py, pz]} scale={[s, s * 0.85, s]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={C.leaf[i % C.leaf.length]} flatShading roughness={0.95} />
      </mesh>
    ))}
  </group>
);

const ForestScene = ({cfg}: {cfg: ForestConfig}) => {
  const C = cfg.colors;
  const L = useForestLayout(cfg);
  const lt = cfg.light;
  const geos = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
    trunk.translate(0, 0.5, 0);
    const cone = new THREE.ConeGeometry(1, 1, 7);
    const crown = new THREE.IcosahedronGeometry(1, 0);
    const rock = new THREE.DodecahedronGeometry(1, 0);
    const bush = new THREE.IcosahedronGeometry(1, 0);
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    return {trunk, cone, crown, rock, bush, blade};
  }, []);

  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, cfg.fogRange[0], cfg.fogRange[1]]} />
      <Sky c={C} />
      <hemisphereLight args={[lt.hemiSky, lt.hemiGround, lt.hemi]} />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={lt.sun}
        intensity={lt.intensity}
        color={lt.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      <Ground c={C} />
      <Path c={C} half={cfg.pathHalf} />
      <Instances geometry={geos.trunk} items={L.trunks} />
      <Instances geometry={geos.cone} items={L.pineLayers} />
      <Instances geometry={geos.crown} items={L.crowns} />
      <Instances geometry={geos.rock} items={L.rocks} />
      <Instances geometry={geos.bush} items={L.bushes} />
      <Instances geometry={geos.blade} items={L.grass} castShadow={false} />
      {L.heather.length > 0 && <Instances geometry={geos.crown} items={L.heather} />}
      {cfg.showClimbTree &&
        CLIMB_TREES.map((t, i) => (
          <ClimbTree key={i} {...t} C={C} />
        ))}
      {cfg.Extras && <cfg.Extras />}
    </>
  );
};

/** Baut aus einer Wald-Einstellung eine Bühne */
export const makeForestStage = (id: string, cfg: ForestConfig, ambience = 'wald-atmo'): StageDef => {
  const Component = () => <ForestScene cfg={cfg} />;
  return {
    id,
    Component,
    climbTrees: cfg.showClimbTree ? CLIMB_TREES : [],
    groundHeight,
    ambience,
  };
};

export {C as FOREST_COLORS, groundHeight as forestGroundHeight};

/** Bühne "wald" (Pilot) – Werte unverändert */
export const forestStage = makeForestStage('wald', {
  colors: C,
  pathHalf: PATH_HALF,
  trees: 260,
  rocks: 70,
  bushes: 140,
  grass: {count: 900, minH: 0.18, maxH: 0.43, colors: ['#7a9a43', '#8aa84b', '#5f7f33']},
  light: {sun: [-14, 22, 10], intensity: 2.6, color: '#ffe2b0', hemiSky: '#dfe9ff', hemiGround: '#55603a', hemi: 0.9},
  fogRange: [22, 95],
  showClimbTree: true,
});
