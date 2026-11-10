import {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import type {StageDef} from './types';

/**
 * Bühne "wald": Waldweg (verläuft entlang der z-Achse), Nadel- und Laubbäume,
 * Felsen, Büsche, Gras. Low-Poly mit flacher Schattierung.
 * Koordinaten: 1 Einheit = 1 Meter. Dummy startet bei (0,0), Bär steht weiter hinten (−z).
 */

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

const isFree = (x: number, z: number, margin: number) => {
  if (Math.abs(x - pathX(z)) < PATH_HALF + margin) return false;
  for (const t of CLIMB_TREES) if (Math.hypot(x - t.x, z - t.z) < 2.2) return false;
  return true;
};

/** Leichte Bodenwellen – flach in der Nähe des Weges */
const groundHeight = (x: number, z: number) => {
  const d = Math.abs(x - pathX(z));
  const k = Math.min(1, Math.max(0, (d - 3) / 10));
  return k * (Math.sin(x * 0.18) * Math.cos(z * 0.14) * 1.2 + Math.sin(x * 0.5 + z * 0.3) * 0.25);
};

// ---------- Himmel ----------
const Sky = () => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: {value: new THREE.Color(C.skyTop)},
          bottom: {value: new THREE.Color(C.skyHorizon)},
        },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
          void main(){ float h = clamp(vP.y*1.6+0.08,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.8)),1.0); }`,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[400, 24, 12]} />
    </mesh>
  );
};

// ---------- Boden + Weg ----------
const Ground = () => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(220, 220, 90, 90);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const r = rng(7);
    const a = new THREE.Color(C.grass);
    const b = new THREE.Color(C.grassDark);
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
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
};

const Path = () => {
  const geo = useMemo(() => {
    const r = rng(11);
    const verts: number[] = [];
    const colors: number[] = [];
    const ca = new THREE.Color(C.path);
    const cb = new THREE.Color(C.pathDark);
    const zs: number[] = [];
    for (let z = -110; z <= 110; z += 1.2) zs.push(z);
    const rows = zs.map((z) => {
      const cx = pathX(z);
      const w = PATH_HALF + (r() - 0.5) * 0.35;
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
  }, []);
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

const useForestLayout = () =>
  useMemo(() => {
    const r = rng(42);
    const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
    const trunks: Inst[] = [];
    const pineLayers: Inst[] = [];
    const crowns: Inst[] = [];
    const rocks: Inst[] = [];
    const bushes: Inst[] = [];
    const grass: Inst[] = [];

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
    while (placed < 260 && tries < 6000) {
      tries++;
      const z = -95 + r() * 125;
      const side = r() < 0.5 ? -1 : 1;
      const x = pathX(z) + side * (2.2 + Math.pow(r(), 1.3) * 34);
      if (!isFree(x, z, 1.0)) continue;
      const s = 0.85 + r() * 0.75;
      if (r() < 0.55) addPine(x, z, s);
      else addLeafy(x, z, s);
      placed++;
    }
    for (let i = 0; i < 70; i++) {
      const z = -80 + r() * 105;
      const x = pathX(z) + (r() < 0.5 ? -1 : 1) * (1.7 + r() * 16);
      if (!isFree(x, z, 0.3)) continue;
      const s = 0.25 + r() * 0.6;
      rocks.push({pos: [x, groundHeight(x, z) + s * 0.2, z], scale: [s * 1.3, s * 0.8, s], rotY: r() * 6, color: C.rock});
    }
    for (let i = 0; i < 140; i++) {
      const z = -80 + r() * 105;
      const x = pathX(z) + (r() < 0.5 ? -1 : 1) * (1.8 + r() * 20);
      if (!isFree(x, z, 0.4)) continue;
      const s = 0.4 + r() * 0.6;
      bushes.push({pos: [x, groundHeight(x, z) + s * 0.35, z], scale: [s * 1.3, s, s * 1.2], rotY: r() * 6, color: pick([C.bush, C.leaf[2], C.grassDark])});
    }
    for (let i = 0; i < 900; i++) {
      const z = -60 + r() * 85;
      const x = pathX(z) + (r() - 0.5) * 50;
      if (Math.abs(x - pathX(z)) < PATH_HALF + 0.1) continue;
      const s = 0.18 + r() * 0.25;
      grass.push({pos: [x, groundHeight(x, z), z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: pick(['#7a9a43', '#8aa84b', '#5f7f33'])});
    }
    return {trunks, pineLayers, crowns, rocks, bushes, grass};
  }, []);

const ClimbTree = ({x, z, r}: {x: number; z: number; r: number}) => (
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

const ForestScene = () => {
  const L = useForestLayout();
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
      <fog attach="fog" args={[C.fog, 22, 95]} />
      <Sky />
      <hemisphereLight args={['#dfe9ff', '#55603a', 0.9]} />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[-14, 22, 10]}
        intensity={2.6}
        color="#ffe2b0"
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
      <Ground />
      <Path />
      <Instances geometry={geos.trunk} items={L.trunks} />
      <Instances geometry={geos.cone} items={L.pineLayers} />
      <Instances geometry={geos.crown} items={L.crowns} />
      <Instances geometry={geos.rock} items={L.rocks} />
      <Instances geometry={geos.bush} items={L.bushes} />
      <Instances geometry={geos.blade} items={L.grass} castShadow={false} />
      {CLIMB_TREES.map((t, i) => (
        <ClimbTree key={i} {...t} />
      ))}
    </>
  );
};

export const forestStage: StageDef = {
  id: 'wald',
  Component: ForestScene,
  climbTrees: CLIMB_TREES,
  groundHeight,
  ambience: 'wald-atmo',
};
