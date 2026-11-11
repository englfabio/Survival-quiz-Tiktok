import {useLayoutEffect, useMemo, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {Instances, Sky, type Inst} from './Forest';
import type {StageCam, StageDef} from './types';

/**
 * Bühne "seeufer": Uferweg, Böschung, See mit bewegter Wasseroberfläche.
 * Taucht die Kamera unter die Wasseroberfläche (y < 0), wird automatisch die
 * Unterwasser-Ansicht gezeigt: gedämpftes blaugrünes Licht, Schwebeteilchen, Lichtstrahlen von oben.
 *
 * Koordinaten (1 Einheit = 1 Meter):
 * - Wasseroberfläche bei y = 0. Der See liegt bei −z, das Land bei +z.
 * - Uferlinie bei z ≈ 3.2 (bei x = 0), Böschung bis z ≈ 6.8 (Höhe 1,1 m), Uferweg (Schotter) bei z ≈ 7.5–9.5
 *   entlang der x-Achse. Dahinter Wiese und Bäume (ab z ≈ 11).
 * - Schilf nur bei x > 4.2 und x < −18: Einfahrt des Autos und Kamera-Bereich links bleiben frei.
 * - Gegenüberliegendes Ufer mit Hügeln und Wald bei z < −60.
 * - Bodenhöhe für Figuren: an Land die Geländehöhe, auf dem See die Wasseroberfläche (y = 0).
 *   → Auto/Dummy im Wasser: "y" = Höhe relativ zur Wasseroberfläche (−0.6 = 60 cm eingesunken).
 */

export const WATER_Y = 0;
export const SHORE = {pathZ: 8.5, pathHalf: 1.0, bankTop: 1.1};

const C = {
  skyTop: '#6aa6d3',
  skyHorizon: '#f4ead0',
  fog: '#dde6dc',
  grass: '#7c9c45',
  grassDark: '#62833a',
  sand: '#b8a174',
  mud: '#8a7a55',
  bed: '#5d6b4a',
  bedDark: '#44523c',
  path: '#c2b08c',
  pathDark: '#a8956f',
  trunk: '#5b3f2a',
  pine: ['#2f5b3a', '#3a6b40', '#284f35'],
  leaf: ['#5d8a35', '#6f9a3c', '#4f7a30', '#86a443'],
  reed: ['#7d8f3c', '#93a24a', '#6a7d35', '#a7a95a'],
  rock: '#9a978c',
  water: '#2d8a95',
  waterBelow: '#6cc3c9',
  deep: '#0d4652',
  deepFog: '#12606b',
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Uferlinie (z) abhängig von x – leicht geschwungen */
export const shoreZ = (x: number) => 3.2 + 0.5 * Math.sin(x * 0.09) + 0.25 * Math.sin(x * 0.23 + 1);

/** Geländehöhe (auch unter Wasser = Seegrund) */
export const lakeTerrain = (x: number, z: number) => {
  const d = z - shoreZ(x);
  if (d >= 0) {
    let h = SHORE.bankTop * smoothstep(0, 3.6, d);
    if (d > 7) {
      const k = Math.min(1, (d - 7) / 8);
      h += (d - 7) * 0.05 + k * (Math.sin(x * 0.2) * Math.cos(z * 0.17) * 0.9 + Math.sin(x * 0.45 + z * 0.3) * 0.2);
    }
    return h;
  }
  // Seegrund: fällt vom Ufer ab, mit leichten Wellen
  let h = Math.max(-4.6, -0.12 + d * 0.95) + Math.sin(x * 0.6) * Math.cos(z * 0.5) * 0.12 * Math.min(1, -d / 3);
  // gegenüberliegendes Ufer
  if (z < -58) h = Math.max(h, (-58 - z) * 0.35 - 3 + Math.sin(x * 0.07) * 2.5 + Math.cos(x * 0.13 + 1) * 1.5);
  return h;
};

const groundHeight = (x: number, z: number) => Math.max(lakeTerrain(x, z), WATER_Y);

/** Wellen der Wasseroberfläche (Höhe zum Zeitpunkt tau in Sekunden) */
export const waveHeight = (x: number, z: number, tau: number) =>
  0.045 * Math.sin(x * 0.55 + tau * 1.3) +
  0.035 * Math.sin(z * 0.75 - tau * 1.05 + x * 0.25) +
  0.02 * Math.sin(x * 1.6 + z * 1.9 + tau * 2.2);

// ---------- Boden (feiner am Ufer) ----------
const Ground = () => {
  const geo = useMemo(() => {
    const xs: number[] = [];
    for (let x = -100; x <= 100; x += 1.2) xs.push(x);
    const zs: number[] = [];
    for (let z = -140; z < -12; z += 2.5) zs.push(z);
    for (let z = -12; z < 16; z += 0.45) zs.push(z);
    for (let z = 16; z <= 80; z += 1.6) zs.push(z);
    const r = rng(3);
    const verts: number[] = [];
    const colors: number[] = [];
    const col = (x: number, z: number, y: number) => {
      const d = z - shoreZ(x);
      const n = r() * 0.5;
      let c: THREE.Color;
      if (y < -0.35) c = new THREE.Color(C.bed).lerp(new THREE.Color(C.bedDark), n + Math.min(0.4, -y * 0.08));
      else if (d < 0.7) c = new THREE.Color(C.mud).lerp(new THREE.Color(C.sand), 0.4 + n);
      else c = new THREE.Color(C.grass).lerp(new THREE.Color(C.grassDark), n);
      return c;
    };
    for (let i = 0; i < zs.length - 1; i++) {
      for (let j = 0; j < xs.length - 1; j++) {
        const p = [
          [xs[j], zs[i]],
          [xs[j + 1], zs[i]],
          [xs[j], zs[i + 1]],
          [xs[j + 1], zs[i + 1]],
        ].map(([x, z]) => [x, lakeTerrain(x, z), z]);
        const tri = (a: number[], b: number[], c: number[]) => {
          const cy = (a[1] + b[1] + c[1]) / 3;
          const cc = col((a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3, cy);
          for (const v of [a, b, c]) {
            verts.push(v[0], v[1], v[2]);
            colors.push(cc.r, cc.g, cc.b);
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

// ---------- Uferweg (Schotter) ----------
const ShorePath = () => {
  const geo = useMemo(() => {
    const r = rng(21);
    const verts: number[] = [];
    const colors: number[] = [];
    const ca = new THREE.Color(C.path);
    const cb = new THREE.Color(C.pathDark);
    const pz = (x: number) => shoreZ(x) + (SHORE.pathZ - 3.2);
    for (let x = -90; x < 90; x += 1.1) {
      const rows = [x, x + 1.1].map((xx) => {
        const cz = pz(xx);
        const w = SHORE.pathHalf + (r() - 0.5) * 0.25;
        return [
          [xx, cz - w],
          [xx, cz + (r() - 0.5) * 0.2],
          [xx, cz + w],
        ];
      });
      for (let j = 0; j < 2; j++) {
        const p = [rows[0][j], rows[0][j + 1], rows[1][j], rows[1][j + 1]];
        const tri = (A: number[], B: number[], Cc: number[]) => {
          const c = ca.clone().lerp(cb, r() * 0.7);
          for (const v of [A, B, Cc]) {
            verts.push(v[0], lakeTerrain(v[0], v[1]) + 0.02 + r() * 0.01, v[1]);
            colors.push(c.r, c.g, c.b);
          }
        };
        tri(p[0], p[1], p[2]);
        tri(p[1], p[3], p[2]);
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
      <meshStandardMaterial vertexColors flatShading roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ---------- Wasseroberfläche (bewegt) ----------
const Water = ({tau, below}: {tau: number; below: boolean}) => {
  const {geo, xz} = useMemo(() => {
    const plane = new THREE.PlaneGeometry(200, 150, 100, 60);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, 0, -64); // z von −139 bis +11 (am Ufer verschwindet es unter dem Gelände)
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
    for (let i = 0; i < pos.count; i++) pos.setY(i, WATER_Y + waveHeight(xz[i * 2], xz[i * 2 + 1], tau));
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [geo, xz, tau]);
  return (
    <mesh geometry={geo} renderOrder={3}>
      <meshStandardMaterial
        color={below ? C.waterBelow : C.water}
        transparent
        opacity={below ? 0.9 : 0.74}
        roughness={0.16}
        metalness={0.12}
        flatShading
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// ---------- Unterwasser: Lichtstrahlen + Schwebeteilchen ----------
const Rays = ({tau}: {tau: number}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
        uniforms: {strength: {value: 0.12}},
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float strength; varying vec2 vUv;
          void main(){ float a = pow(vUv.y, 1.6) * strength; gl_FragColor = vec4(vec3(0.75,0.97,1.0)*a, a); }`,
      }),
    [],
  );
  const rays = useMemo(() => {
    const r = rng(9);
    return Array.from({length: 11}, () => ({x: -9 + r() * 14, z: -7 + r() * 11, w: 0.35 + r() * 0.7, ph: r() * 6, tilt: 0.12 + r() * 0.1}));
  }, []);
  mat.uniforms.strength.value = 0.11;
  return (
    <group>
      {rays.map((ry, i) => {
        const flicker = 0.75 + 0.25 * Math.sin(tau * 0.9 + ry.ph);
        return (
          <mesh key={i} material={mat} position={[ry.x, -3.2, ry.z]} rotation={[0, 0, ry.tilt]} scale={[ry.w * flicker, 1, ry.w * flicker]}>
            <cylinderGeometry args={[1.0, 1.9, 6.4, 7, 1, true]} />
          </mesh>
        );
      })}
    </group>
  );
};

const Particles = ({tau, center}: {tau: number; center: [number, number, number]}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const r = rng(33);
    return Array.from({length: 320}, () => ({x: r(), y: r(), z: r(), s: 0.012 + r() * 0.025, sp: 0.05 + r() * 0.12, ph: r() * 6}));
  }, []);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const box = [12, 5, 12];
    seeds.forEach((p, i) => {
      const wrap = (v: number) => ((v % 1) + 1) % 1;
      o.position.set(
        center[0] + (wrap(p.x + Math.sin(tau * 0.2 + p.ph) * 0.02) - 0.5) * box[0],
        Math.min(-0.08, center[1] + (wrap(p.y + tau * p.sp * 0.1) - 0.5) * box[1]),
        center[2] + (wrap(p.z + tau * 0.004) - 0.5) * box[2],
      );
      o.scale.setScalar(p.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [seeds, tau, center]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, seeds.length]}>
      <meshBasicMaterial color="#d6f3ec" transparent opacity={0.55} />
    </instancedMesh>
  );
};

// ---------- Pflanzen, Bäume, Steine, Steg ----------
const useLayout = () =>
  useMemo(() => {
    const r = rng(77);
    const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
    const trunks: Inst[] = [];
    const pines: Inst[] = [];
    const crowns: Inst[] = [];
    const reeds: Inst[] = [];
    const heads: Inst[] = [];
    const rocks: Inst[] = [];
    const bushes: Inst[] = [];
    const grass: Inst[] = [];
    const addTree = (x: number, z: number, s: number) => {
      const y = lakeTerrain(x, z);
      if (r() < 0.5) {
        trunks.push({pos: [x, y, z], scale: [0.22 * s, 1.4 * s, 0.22 * s], rotY: r() * 6, color: C.trunk});
        const col = pick(C.pine);
        for (let k = 0; k < 3; k++) {
          const w = (1.9 - k * 0.45) * s;
          pines.push({pos: [x, y + (1.1 + k * 1.15) * s, z], scale: [w, 1.9 * s, w], rotY: r() * 6, color: col});
        }
      } else {
        trunks.push({pos: [x, y, z], scale: [0.25 * s, 2.4 * s, 0.25 * s], rotY: r() * 6, color: C.trunk});
        const col = pick(C.leaf);
        crowns.push({pos: [x, y + 3.2 * s, z], scale: [1.7 * s, 1.5 * s, 1.7 * s], rotY: r() * 6, color: col});
        crowns.push({pos: [x + (r() - 0.5) * 1.2 * s, y + 2.6 * s, z + (r() - 0.5) * 1.2 * s], scale: [1.1 * s, s, 1.1 * s], rotY: r() * 6, color: col});
      }
    };
    // Bäume hinter dem Weg
    for (let i = 0; i < 170; i++) {
      const x = -70 + r() * 140;
      const z = shoreZ(x) + 8.5 + Math.pow(r(), 1.4) * 45;
      addTree(x, z, 0.9 + r() * 0.8);
    }
    // gegenüberliegendes Ufer
    for (let i = 0; i < 260; i++) {
      const x = -130 + r() * 260;
      const z = -64 - r() * 50;
      if (lakeTerrain(x, z) < 0.4) continue;
      addTree(x, z, 1.3 + r() * 1.2);
    }
    // Schilf am Ufer: nur rechts der Einfahrt (x > 4.2) und weit links (x < −18).
    // Links davon (−18 … 4) bleibt frei, dort stehen meist die Kameras.
    for (let i = 0; i < 1400; i++) {
      const x = -45 + r() * 90;
      if (x > -18 && x < 4.2) continue;
      const z = shoreZ(x) - 1.1 + r() * 1.6;
      const y = Math.max(lakeTerrain(x, z), -0.5);
      const h = 0.8 + r() * 0.9;
      reeds.push({pos: [x, y, z], scale: [0.035, h, 0.035], rotY: r() * 6, color: pick(C.reed)});
      if (r() < 0.18) heads.push({pos: [x, y + h * 0.92, z], scale: [0.04, 0.12, 0.04], rotY: 0, color: '#6b4a2e'});
    }
    // Steine am Ufer und unter Wasser
    for (let i = 0; i < 90; i++) {
      const x = -40 + r() * 80;
      if (Math.abs(x) < 3.2 && r() < 0.8) continue;
      const z = shoreZ(x) - 6 + r() * 7;
      const s = 0.15 + r() * 0.45;
      rocks.push({pos: [x, lakeTerrain(x, z) + s * 0.2, z], scale: [s * 1.3, s * 0.7, s], rotY: r() * 6, color: pick([C.rock, '#857f72', '#a8a397'])});
    }
    // Büsche an der Böschung und hinter dem Weg
    for (let i = 0; i < 70; i++) {
      const x = -45 + r() * 90;
      if (Math.abs(x) < 4) continue;
      const z = shoreZ(x) + (r() < 0.5 ? 1.5 + r() * 3.5 : 7 + r() * 6);
      if (Math.abs(z - shoreZ(x) - (SHORE.pathZ - 3.2)) < SHORE.pathHalf + 0.4) continue;
      const s = 0.35 + r() * 0.5;
      bushes.push({pos: [x, lakeTerrain(x, z) + s * 0.35, z], scale: [s * 1.3, s, s * 1.2], rotY: r() * 6, color: pick(['#4c7a33', '#5d8a35', '#62833a'])});
    }
    // Gras auf der Böschung
    for (let i = 0; i < 1700; i++) {
      const x = -40 + r() * 80;
      const z = shoreZ(x) + 0.4 + r() * 16;
      if (Math.abs(z - shoreZ(x) - (SHORE.pathZ - 3.2)) < SHORE.pathHalf + 0.1) continue;
      const s = 0.12 + r() * 0.22;
      grass.push({pos: [x, lakeTerrain(x, z), z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: pick(['#86a64a', '#93ae50', '#6f8f3c'])});
    }
    return {trunks, pines, crowns, reeds, heads, rocks, bushes, grass};
  }, []);

/** Kleiner Holzsteg rechts der Einfahrt */
const Jetty = () => {
  const x0 = 8.5;
  const z0 = shoreZ(x0) + 0.8;
  const wood = '#8a6440';
  return (
    <group position={[x0, 0, z0]}>
      {Array.from({length: 9}, (_, i) => (
        <mesh key={i} castShadow receiveShadow position={[0, 0.42, -i * 0.55]}>
          <boxGeometry args={[1.3, 0.07, 0.5]} />
          <meshStandardMaterial color={i % 2 ? wood : '#7c5a39'} flatShading roughness={0.95} />
        </mesh>
      ))}
      {[-0.55, 0.55].flatMap((x) =>
        [0, -2.2, -4.4].map((z) => (
          <mesh key={`${x}${z}`} castShadow position={[x, -0.4, z]}>
            <cylinderGeometry args={[0.07, 0.08, 1.8, 6]} />
            <meshStandardMaterial color="#5d432b" flatShading />
          </mesh>
        )),
      )}
    </group>
  );
};

const LakeScene = ({cam}: {cam?: StageCam}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tau = frame / fps;
  const L = useLayout();
  const camPos = cam?.pos ?? [0, 2, 6];
  const below = camPos[1] < WATER_Y + waveHeight(camPos[0], camPos[2], tau) - 0.02;
  const geos = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
    trunk.translate(0, 0.5, 0);
    const cone = new THREE.ConeGeometry(1, 1, 7);
    const crown = new THREE.IcosahedronGeometry(1, 0);
    const rock = new THREE.DodecahedronGeometry(1, 0);
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    const head = new THREE.CylinderGeometry(1, 1, 1, 5);
    return {trunk, cone, crown, rock, blade, head};
  }, []);
  // Teilchen schweben um den Blickpunkt der Kamera
  const look = cam?.look ?? [0, -1, 0];
  const center: [number, number, number] = [(camPos[0] + look[0]) / 2, -2.4, (camPos[2] + look[2]) / 2];

  return (
    <>
      <color attach="background" args={[below ? C.deep : C.fog]} />
      <fog attach="fog" args={below ? [C.deepFog, 0.5, 15] : [C.fog, 35, 170]} />
      {!below && <Sky c={C} />}
      <hemisphereLight args={below ? ['#9fe3e6', '#0d3a40', 1.1] : ['#e3edff', '#5b6a3c', 0.95]} />
      <ambientLight intensity={below ? 0.35 : 0.15} />
      <directionalLight
        position={[-12, 18, 11]}
        intensity={below ? 1.2 : 2.8}
        color={below ? '#bff2f0' : '#ffe6b8'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      <Ground />
      <ShorePath />
      <Water tau={tau} below={below} />
      <Jetty />
      <Instances geometry={geos.trunk} items={L.trunks} />
      <Instances geometry={geos.cone} items={L.pines} />
      <Instances geometry={geos.crown} items={L.crowns} />
      <Instances geometry={geos.blade} items={L.reeds} castShadow={false} />
      <Instances geometry={geos.head} items={L.heads} castShadow={false} />
      <Instances geometry={geos.rock} items={L.rocks} />
      <Instances geometry={geos.crown} items={L.bushes} />
      <Instances geometry={geos.blade} items={L.grass} castShadow={false} />
      {below && (
        <>
          <Rays tau={tau} />
          <Particles tau={tau} center={center} />
        </>
      )}
    </>
  );
};

export const lakeStage: StageDef = {
  id: 'seeufer',
  Component: LakeScene,
  climbTrees: [],
  groundHeight,
  // Hintergrundgeräusch "see-atmo" wird im Schritt "Stimme + Ton" erzeugt und dann hier eingetragen
};
