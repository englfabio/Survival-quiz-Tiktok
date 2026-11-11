import {useLayoutEffect, useMemo, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {rng} from '../lib/anim';
import {Instances, Sky, type Inst} from './Forest';
import {waveHeight} from './Lake';
import type {StageCam, StageDef} from './types';

/**
 * Bühne "burg": mittelalterliche Steinburg im Winter mit Burggraben (dunkles, kaltes Wasser),
 * Torhaus mit Rundbogen-Tor und zwei Rundtürmen, kahle Bäume, Raureif, leichter Schneefall, kaltes bläuliches Licht.
 * Die Zugbrücke ist ein eigenes Objekt ("zugbruecke", siehe actors/CastleProps.tsx) – Scharnier bei
 * CASTLE.hinge, dort mit "face": 180 und "y": 1.0 hinstellen.
 *
 * Koordinaten (1 Einheit = 1 Meter):
 * - Wasseroberfläche des Grabens bei y = 0. Graben zwischen z = −3 (Burgmauer) und z = +3 (Außenufer), entlang x.
 *   Wassertiefe ca. 2,5 m. Im Graben ist "Boden" = Wasseroberfläche (y = Höhe relativ zum Wasser).
 * - Burgmauer (Vorderseite) bei z = −3, Torbogen bei x = −1.4 … 1.4, Torschwelle bei y = 1.0.
 * - Außenufer: Mauerkante (zum Festhalten) bei z = 3.0, Oberkante y = 0.45; dahinter steigt das Ufer bis y = 1.0 (ab z ≈ 5).
 *   Brückenkopf (Steinsockel) bei |x| < 1.5, z 3.4 … 5.0 auf Höhe 1.0, Weg führt von dort nach +z.
 * - Kahle Bäume nur bei |x| > 6 oder z > 14 (Kamera-Bereich am Ufer bleibt frei).
 */

export const CASTLE = {
  hinge: [0, 1.0, -3.0] as [number, number, number],
  wallZ: -3.0,
  edgeZ: 3.0,
  edgeTop: 0.45,
  bankTop: 1.0,
  moatDepth: 2.6,
};

const C = {
  skyTop: '#88aac8',
  skyHorizon: '#e6edf2',
  fog: '#cdd9e3',
  stone: ['#8d939a', '#7f868e', '#979ca2', '#757c84'],
  stoneDark: '#646b73',
  roof: '#475468',
  snow: '#f1f5f8',
  frost: '#dfe8ee',
  grass: '#8a9c86',
  grassFrost: '#b9c6c0',
  dirt: '#7d7266',
  path: '#a39889',
  pathDark: '#8b8072',
  water: '#1a3a4c',
  bed: '#1d2a30',
  bark: ['#4a4039', '#3f3732', '#55493f'],
  banner: '#8e2a2a',
  dark: '#14171b',
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Geländehöhe am Außenufer (z > 3) */
const bankHeight = (x: number, z: number) => {
  if (z < 3.35) return CASTLE.edgeTop;
  let h = CASTLE.edgeTop + (CASTLE.bankTop - CASTLE.edgeTop) * smoothstep(3.35, 5.0, z);
  if (z > 9) {
    const k = Math.min(1, (z - 9) / 14);
    h += k * (Math.sin(x * 0.16) * Math.cos(z * 0.13) * 1.1 + (z - 9) * 0.06 + Math.sin(x * 0.4 + z * 0.2) * 0.2);
  }
  return h;
};

/** Bodenhöhe für Figuren: Burg innen 1.0, Graben = Wasseroberfläche (0), Ufer = Gelände, Brückenkopf 1.0 */
const groundHeight = (x: number, z: number) => {
  if (z < CASTLE.wallZ - 0.05) return CASTLE.bankTop;
  if (z <= CASTLE.edgeZ) return 0;
  if (Math.abs(x) < 1.5 && z < 5.0) return CASTLE.bankTop;
  return bankHeight(x, z);
};

// ---------- Außenufer (Boden mit Raureif) ----------
const Bank = () => {
  const geo = useMemo(() => {
    const r = rng(5);
    const xs: number[] = [];
    for (let x = -110; x <= 110; x += 1.1) xs.push(x);
    const zs: number[] = [3.0, 3.35];
    for (let z = 3.8; z < 20; z += 0.55) zs.push(z);
    for (let z = 20; z <= 120; z += 2.2) zs.push(z);
    const verts: number[] = [];
    const colors: number[] = [];
    const ga = new THREE.Color(C.grass);
    const gb = new THREE.Color(C.grassFrost);
    const fr = new THREE.Color(C.frost);
    for (let i = 0; i < zs.length - 1; i++) {
      for (let j = 0; j < xs.length - 1; j++) {
        const p = [
          [xs[j], zs[i]],
          [xs[j + 1], zs[i]],
          [xs[j], zs[i + 1]],
          [xs[j + 1], zs[i + 1]],
        ].map(([x, z]) => [x, bankHeight(x, z), z]);
        const tri = (a: number[], b: number[], c: number[]) => {
          const n = r();
          const col = n < 0.18 ? fr.clone().lerp(gb, r() * 0.4) : ga.clone().lerp(gb, 0.25 + r() * 0.6);
          for (const v of [a, b, c]) {
            verts.push(v[0], v[1], v[2]);
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

/** Weg vom Brückenkopf weg (gefrorener Kies) */
const Path = () => {
  const geo = useMemo(() => {
    const r = rng(23);
    const verts: number[] = [];
    const colors: number[] = [];
    const ca = new THREE.Color(C.path);
    const cb = new THREE.Color(C.pathDark);
    const px = (z: number) => (z > 14 ? 2.2 * Math.sin((z - 14) * 0.08) : 0);
    for (let z = 5.0; z < 90; z += 1.0) {
      const rows = [z, z + 1.0].map((zz) => {
        const w = 1.15 + (r() - 0.5) * 0.2;
        return [px(zz) - w, px(zz), px(zz) + w];
      });
      for (let j = 0; j < 2; j++) {
        const p = [
          [rows[0][j], z],
          [rows[0][j + 1], z],
          [rows[1][j], z + 1],
          [rows[1][j + 1], z + 1],
        ];
        const tri = (A: number[], B: number[], Cc: number[]) => {
          const c = ca.clone().lerp(cb, r() * 0.7);
          for (const v of [A, B, Cc]) {
            verts.push(v[0], bankHeight(v[0], v[1]) + 0.02 + r() * 0.01, v[1]);
            colors.push(c.r, c.g, c.b);
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
      <meshStandardMaterial vertexColors flatShading roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ---------- Wasser im Graben (dunkel, kalt, kaum Wellen) ----------
const Water = ({tau}: {tau: number}) => {
  const {geo, xz} = useMemo(() => {
    const plane = new THREE.PlaneGeometry(220, 6.4, 140, 10);
    plane.rotateX(-Math.PI / 2);
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
    for (let i = 0; i < pos.count; i++) pos.setY(i, 0.45 * waveHeight(xz[i * 2], xz[i * 2 + 1], tau * 0.6));
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [geo, xz, tau]);
  return (
    <mesh geometry={geo} renderOrder={3}>
      <meshStandardMaterial
        color={C.water}
        transparent
        opacity={0.9}
        roughness={0.07}
        metalness={0.3}
        flatShading
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/** Eisschollen am Rand des Grabens */
const IceFloes = ({tau}: {tau: number}) => {
  const floes = useMemo(() => {
    const r = rng(19);
    const out: {x: number; z: number; s: number; rot: number; sides: number}[] = [];
    for (let i = 0; i < 80; i++) {
      const x = -60 + r() * 120;
      const side = r() < 0.5 ? -1 : 1;
      const z = side * (2.55 + r() * 0.35);
      // frei halten: Brücke, Sturzstelle, Festhalte-Stelle
      if (Math.abs(x) < 1.8) continue;
      if (side > 0 && x > 1.5 && x < 5.5) continue;
      out.push({x, z, s: 0.25 + r() * 0.5, rot: r() * 6, sides: 5 + Math.floor(r() * 3)});
    }
    return out;
  }, []);
  return (
    <group>
      {floes.map((f, i) => (
        <mesh key={i} position={[f.x, 0.03 + 0.45 * waveHeight(f.x, f.z, tau * 0.6), f.z]} rotation={[-Math.PI / 2, 0, f.rot]} scale={[f.s * 1.3, f.s, 1]}>
          <circleGeometry args={[1, f.sides]} />
          <meshStandardMaterial color="#dceaf2" roughness={0.3} transparent opacity={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Burg ----------
/** Vorderseite des Torhauses mit Rundbogen-Öffnung (als Form ausgeschnitten) */
const gateFrontGeo = () => {
  const s = new THREE.Shape();
  s.moveTo(-3.4, -CASTLE.moatDepth);
  s.lineTo(3.4, -CASTLE.moatDepth);
  s.lineTo(3.4, 9.6);
  s.lineTo(-3.4, 9.6);
  s.closePath();
  const h = new THREE.Path();
  h.moveTo(-1.4, 1.0);
  h.lineTo(1.4, 1.0);
  h.lineTo(1.4, 3.7);
  h.absarc(0, 3.7, 1.4, 0, Math.PI, false);
  h.lineTo(-1.4, 1.0);
  s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, {depth: 3.2, bevelEnabled: false, curveSegments: 10});
  g.translate(0, 0, -3.2);
  return g;
};

const Battlements = ({x0, x1, z, y, step = 1.0}: {x0: number; x1: number; z: number; y: number; step?: number}) => {
  const items = useMemo(() => {
    const out: Inst[] = [];
    for (let x = x0 + step / 2; x < x1; x += step) {
      out.push({pos: [x, y + 0.36, z], scale: [step * 0.58, 0.72, 0.7], rotY: 0, color: C.stone[Math.floor(Math.abs(x * 7)) % C.stone.length]});
    }
    return out;
  }, [x0, x1, z, y, step]);
  const snow = useMemo(() => items.map((it) => ({...it, pos: [it.pos[0], y + 0.75, z] as [number, number, number], scale: [it.scale[0] + 0.04, 0.07, 0.74] as [number, number, number], color: C.snow})), [items, y, z]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return (
    <>
      <Instances geometry={box} items={items} />
      <Instances geometry={box} items={snow} castShadow={false} />
    </>
  );
};

/** Rundturm mit Zinnenkranz, Schießscharten und Kegeldach mit Schnee */
const Tower = ({x, z, r, h, flag = false}: {x: number; z: number; r: number; h: number; flag?: boolean}) => {
  const y0 = -CASTLE.moatDepth;
  const H = h - y0;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, y0 + H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 1.06, H, 12]} />
        <meshStandardMaterial color={C.stone[0]} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, h + 0.35, 0]} castShadow>
        <cylinderGeometry args={[r * 1.12, r * 1.12, 0.7, 12]} />
        <meshStandardMaterial color={C.stone[2]} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, h + 0.72, 0]}>
        <cylinderGeometry args={[r * 1.14, r * 1.14, 0.06, 12]} />
        <meshStandardMaterial color={C.snow} flatShading />
      </mesh>
      <mesh position={[0, h + 0.7 + r * 1.15, 0]} castShadow>
        <coneGeometry args={[r * 1.25, r * 2.3, 12]} />
        <meshStandardMaterial color={C.roof} flatShading roughness={0.8} />
      </mesh>
      {/* Schnee auf dem Dach (untere Hälfte heller) */}
      <mesh position={[0, h + 0.75 + r * 0.45, 0]}>
        <coneGeometry args={[r * 1.27, r * 0.9, 12, 1, true]} />
        <meshStandardMaterial color={C.snow} flatShading side={THREE.DoubleSide} />
      </mesh>
      {[0.3, 0.62].map((f) =>
        [-0.5, 0.5].map((a) => (
          <mesh key={`${f}${a}`} position={[Math.sin(a) * (r + 0.01), h * f, Math.cos(a) * (r + 0.01)]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.12, 0.7, 0.04]} />
            <meshStandardMaterial color={C.dark} />
          </mesh>
        )),
      )}
      {flag && (
        <group position={[0, h + 0.7 + r * 2.3, 0]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 1.4, 5]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[0.45, 1.05, 0]}>
            <boxGeometry args={[0.85, 0.45, 0.02]} />
            <meshStandardMaterial color={C.banner} flatShading />
          </mesh>
        </group>
      )}
    </group>
  );
};

/** Einzelne Steinblöcke auf den Mauerflächen (Struktur) */
const useStones = () =>
  useMemo(() => {
    const r = rng(31);
    const out: Inst[] = [];
    // Mauer links/rechts vom Torhaus + Torhaus-Front
    for (let i = 0; i < 900; i++) {
      const x = -34 + r() * 68;
      const y = -0.2 + r() * 7.0;
      const onGate = Math.abs(x) < 3.4;
      if (onGate && Math.abs(x) < 1.6 && y < 5.3) continue;
      if (Math.abs(x) > 3.2 && Math.abs(x) < 6.3) continue; // Türme
      const z = CASTLE.wallZ + 0.02;
      out.push({pos: [x, y, z], scale: [0.55 + r() * 0.5, 0.28 + r() * 0.14, 0.08], rotY: 0, color: C.stone[Math.floor(r() * C.stone.length)]});
    }
    // vereiste Steine knapp über dem Wasser (heller)
    for (let i = 0; i < 160; i++) {
      const x = -34 + r() * 68;
      if (Math.abs(x) < 1.6) continue;
      out.push({pos: [x, 0.05 + r() * 0.35, CASTLE.wallZ + 0.03], scale: [0.4 + r() * 0.5, 0.18 + r() * 0.12, 0.08], rotY: 0, color: C.frost});
    }
    return out;
  }, []);

const CastleBuildings = () => {
  const gate = useMemo(gateFrontGeo, []);
  const stones = useStones();
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const wallH = 7.0;
  const y0 = -CASTLE.moatDepth;
  return (
    <group>
      {/* Torhaus */}
      <mesh geometry={gate} position={[0, 0, CASTLE.wallZ]} castShadow receiveShadow>
        <meshStandardMaterial color={C.stone[1]} flatShading roughness={0.95} />
      </mesh>
      {/* Rahmen aus hellen Bogensteinen */}
      {Array.from({length: 13}, (_, i) => {
        const a = (i / 12) * Math.PI;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.55, 3.7 + Math.sin(a) * 1.55, CASTLE.wallZ + 0.06]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.32, 0.42, 0.14]} />
            <meshStandardMaterial color={i % 2 ? C.stone[2] : C.stone[3]} flatShading />
          </mesh>
        );
      })}
      {/* dunkler Torgang + hochgezogenes Fallgitter */}
      <mesh position={[0, 3.0, CASTLE.wallZ - 3.1]}>
        <boxGeometry args={[2.8, 4.4, 0.1]} />
        <meshBasicMaterial color={C.dark} />
      </mesh>
      <mesh position={[0, 1.0, CASTLE.wallZ - 1.6]} receiveShadow>
        <boxGeometry args={[2.8, 0.06, 3.2]} />
        <meshStandardMaterial color={C.stoneDark} flatShading />
      </mesh>
      {[-1.05, -0.35, 0.35, 1.05].map((x) => (
        <mesh key={x} position={[x, 4.75, CASTLE.wallZ - 0.7]}>
          <boxGeometry args={[0.09, 1.4, 0.09]} />
          <meshStandardMaterial color="#2a2b2e" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      {/* Kettenrollen über dem Tor */}
      {[1.32, -1.32].map((x) => (
        <mesh key={x} position={[x, 4.9, CASTLE.wallZ + 0.05]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 0.2, 10]} />
          <meshStandardMaterial color="#2a2b2e" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      <Battlements x0={-3.4} x1={3.4} z={CASTLE.wallZ - 0.35} y={9.6} step={0.9} />
      <mesh position={[0, 9.62, CASTLE.wallZ - 1.6]}>
        <boxGeometry args={[6.8, 0.05, 3.2]} />
        <meshStandardMaterial color={C.snow} flatShading />
      </mesh>
      {/* Ringmauer links und rechts */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={box} position={[s * 20.5, y0 + (wallH - y0) / 2, CASTLE.wallZ - 1.25]} scale={[29, wallH - y0, 2.5]} castShadow receiveShadow>
            <meshStandardMaterial color={C.stone[0]} flatShading roughness={0.95} />
          </mesh>
          <mesh position={[s * 20.5, wallH + 0.01, CASTLE.wallZ - 1.25]}>
            <boxGeometry args={[29, 0.05, 2.5]} />
            <meshStandardMaterial color={C.snow} flatShading />
          </mesh>
          <Battlements x0={s > 0 ? 6 : -35} x1={s > 0 ? 35 : -6} z={CASTLE.wallZ - 0.35} y={wallH} />
        </group>
      ))}
      <Instances geometry={box} items={stones} castShadow={false} />
      {/* Türme: zwei am Tor, zwei Ecktürme */}
      <Tower x={-4.7} z={-3.9} r={1.6} h={11} flag />
      <Tower x={4.7} z={-3.9} r={1.6} h={11} flag />
      <Tower x={-21} z={-4.2} r={2.0} h={10} />
      <Tower x={21} z={-4.2} r={2.0} h={10} />
      {/* Bergfried + Palas hinter der Mauer */}
      <mesh position={[-3, 8, -15]} castShadow>
        <boxGeometry args={[6, 16, 6]} />
        <meshStandardMaterial color={C.stone[3]} flatShading roughness={0.95} />
      </mesh>
      <Battlements x0={-6} x1={0} z={-12.1} y={16} step={0.9} />
      <mesh position={[-3, 18.6, -15]} castShadow>
        <coneGeometry args={[4.6, 5, 4]} />
        <meshStandardMaterial color={C.roof} flatShading />
      </mesh>
      <mesh position={[-3, 16.9, -15]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[4.65, 1.6, 4, 1, true]} />
        <meshStandardMaterial color={C.snow} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[8, 6, -13]} castShadow>
        <boxGeometry args={[9, 8, 5]} />
        <meshStandardMaterial color={C.stone[2]} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[8, 11.2, -13]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.01, 3.6, 2.6, 4, 1]} />
        <meshStandardMaterial color={C.roof} flatShading />
      </mesh>
    </group>
  );
};

// ---------- Außenufer: Mauerkante, Brückenkopf ----------
const BankEdge = () => {
  const {blocks, frost} = useMemo(() => {
    const r = rng(13);
    const blocks: Inst[] = [];
    const frost: Inst[] = [];
    for (let x = -80; x < 80; x += 0.9) {
      const w = 0.86;
      blocks.push({pos: [x + 0.45, CASTLE.edgeTop - 0.12, CASTLE.edgeZ + 0.18], scale: [w, 0.26, 0.42], rotY: 0, color: C.stone[Math.floor(r() * 4)]});
      frost.push({pos: [x + 0.45, CASTLE.edgeTop + 0.012, CASTLE.edgeZ + 0.18], scale: [w, 0.02, 0.43], rotY: 0, color: r() < 0.5 ? C.snow : C.frost});
    }
    return {blocks, frost};
  }, []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return (
    <group>
      {/* Uferwand bis zum Grabenboden */}
      <mesh position={[0, (CASTLE.edgeTop - 0.25 - CASTLE.moatDepth) / 2, CASTLE.edgeZ + 0.2]} receiveShadow>
        <boxGeometry args={[220, CASTLE.edgeTop - 0.25 + CASTLE.moatDepth, 0.4]} />
        <meshStandardMaterial color={C.stoneDark} flatShading roughness={1} />
      </mesh>
      <Instances geometry={box} items={blocks} />
      <Instances geometry={box} items={frost} castShadow={false} />
      {/* Grabenboden */}
      <mesh position={[0, -CASTLE.moatDepth, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[220, 7]} />
        <meshStandardMaterial color={C.bed} roughness={1} />
      </mesh>
      {/* Brückenkopf: Sockel unter dem Brückenende + Plattform */}
      <mesh position={[0, 0.0, 3.2]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 1.2, 0.4]} />
        <meshStandardMaterial color={C.stone[1]} flatShading />
      </mesh>
      <mesh position={[0, 0.5, 4.2]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 1.0, 1.6]} />
        <meshStandardMaterial color={C.stone[3]} flatShading />
      </mesh>
      <mesh position={[0, 1.005, 4.2]}>
        <boxGeometry args={[3.02, 0.02, 1.62]} />
        <meshStandardMaterial color={C.frost} flatShading />
      </mesh>
      {[-1.35, 1.35].map((x) => (
        <group key={x} position={[x, 1.0, 4.85]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.36, 0.9, 0.36]} />
            <meshStandardMaterial color={C.stone[2]} flatShading />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <boxGeometry args={[0.4, 0.06, 0.4]} />
            <meshStandardMaterial color={C.snow} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ---------- Kahle Bäume, Raureif-Gras, Schneeflecken ----------
const bareTreeGeo = () => {
  const r = rng(71);
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.12, 0.22, 2.6, 6);
  trunk.translate(0, 1.3, 0);
  parts.push(trunk);
  const addBranch = (base: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
    const g = new THREE.CylinderGeometry(rad * 0.55, rad, len, 5);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
    g.translate(base.x, base.y, base.z);
    parts.push(g);
    if (depth <= 0) return;
    const tip = base.clone().add(dir.clone().normalize().multiplyScalar(len));
    const n = depth > 1 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const nd = dir.clone().normalize().add(new THREE.Vector3(Math.cos(a) * 0.8, 0.25 + r() * 0.3, Math.sin(a) * 0.8)).normalize();
      addBranch(tip, nd, len * (0.55 + r() * 0.15), rad * 0.6, depth - 1);
    }
  };
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + r();
    addBranch(new THREE.Vector3(0, 1.6 + i * 0.3, 0), new THREE.Vector3(Math.cos(a) * 0.7, 1, Math.sin(a) * 0.7), 1.3, 0.1, 2);
  }
  addBranch(new THREE.Vector3(0, 2.5, 0), new THREE.Vector3(0.1, 1, 0.05), 1.4, 0.1, 2);
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
};

const useBankLayout = () =>
  useMemo(() => {
    const r = rng(88);
    const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
    const trees: Inst[] = [];
    const tufts: Inst[] = [];
    const snow: Inst[] = [];
    const rocks: Inst[] = [];
    const bushes: Inst[] = [];
    const ok = (x: number, z: number, m: number) => !(Math.abs(x) < 6 + m && z < 14) && Math.abs(x - (z > 14 ? 2.2 * Math.sin((z - 14) * 0.08) : 0)) > 2 + m;
    for (let i = 0; i < 260; i++) {
      const x = -70 + r() * 140;
      const z = 5.5 + Math.pow(r(), 1.3) * 70;
      if (!ok(x, z, 0.5)) continue;
      const s = 1.0 + r() * 0.9;
      trees.push({pos: [x, bankHeight(x, z) - 0.05, z], scale: [s, s * (0.9 + r() * 0.3), s], rotY: r() * 6, color: pick(C.bark)});
    }
    for (let i = 0; i < 2600; i++) {
      const x = -45 + r() * 90;
      const z = 3.6 + r() * 26;
      if (Math.abs(x) < 1.6 && z < 5.2) continue;
      if (Math.abs(x - (z > 14 ? 2.2 * Math.sin((z - 14) * 0.08) : 0)) < 1.3 && z > 5) continue;
      const s = 0.1 + r() * 0.18;
      tufts.push({pos: [x, bankHeight(x, z), z], scale: [s * 0.45, s, s * 0.45], rotY: r() * 6, color: pick(['#c9d4cf', '#a9b8a8', '#dfe7e6', '#93a490'])});
    }
    for (let i = 0; i < 160; i++) {
      const x = -50 + r() * 100;
      const z = 4 + r() * 40;
      if (Math.abs(x) < 1.6 && z < 5.2) continue;
      const s = 0.4 + r() * 1.4;
      snow.push({pos: [x, bankHeight(x, z) + 0.015, z], scale: [s * 1.4, 0.03, s], rotY: r() * 6, color: r() < 0.6 ? C.snow : C.frost});
    }
    for (let i = 0; i < 50; i++) {
      const x = -40 + r() * 80;
      const z = 5 + r() * 25;
      if (!ok(x, z, 0)) continue;
      const s = 0.2 + r() * 0.45;
      rocks.push({pos: [x, bankHeight(x, z) + s * 0.2, z], scale: [s * 1.3, s * 0.7, s], rotY: r() * 6, color: pick(C.stone)});
    }
    for (let i = 0; i < 60; i++) {
      const x = -45 + r() * 90;
      const z = 6 + r() * 25;
      if (!ok(x, z, 0)) continue;
      const s = 0.3 + r() * 0.4;
      bushes.push({pos: [x, bankHeight(x, z) + s * 0.3, z], scale: [s * 1.3, s, s * 1.2], rotY: r() * 6, color: pick(['#6f7a66', '#7d8774', '#5f6a58'])});
    }
    return {trees, tufts, snow, rocks, bushes};
  }, []);

/** Leichter Schneefall um den Blickpunkt der Kamera */
const Snowfall = ({tau, center}: {tau: number; center: [number, number, number]}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const r = rng(53);
    return Array.from({length: 420}, () => ({x: r(), y: r(), z: r(), s: 0.018 + r() * 0.025, sp: 0.5 + r() * 0.5, ph: r() * 6}));
  }, []);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const box = [18, 12, 18];
    const wrap = (v: number) => ((v % 1) + 1) % 1;
    seeds.forEach((p, i) => {
      o.position.set(
        center[0] + (wrap(p.x + Math.sin(tau * 0.7 + p.ph) * 0.01 + tau * 0.006) - 0.5) * box[0],
        center[1] + (wrap(p.y - (tau * p.sp) / box[1]) - 0.5) * box[1],
        center[2] + (wrap(p.z + Math.cos(tau * 0.6 + p.ph) * 0.01) - 0.5) * box[2],
      );
      o.scale.setScalar(p.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [seeds, tau, center]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, seeds.length]}>
      <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
    </instancedMesh>
  );
};

const CastleScene = ({cam}: {cam?: StageCam}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tau = frame / fps;
  const L = useBankLayout();
  const geos = useMemo(() => {
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    return {tree: bareTreeGeo(), blade, disc: new THREE.CylinderGeometry(1, 1, 1, 7), rock: new THREE.DodecahedronGeometry(1, 0), crown: new THREE.IcosahedronGeometry(1, 0)};
  }, []);
  const camPos = cam?.pos ?? [0, 2, 8];
  const look = cam?.look ?? [0, 1, 0];
  const center: [number, number, number] = [(camPos[0] * 2 + look[0]) / 3, (camPos[1] * 2 + look[1]) / 3, (camPos[2] * 2 + look[2]) / 3];

  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 28, 150]} />
      <Sky c={C} />
      <hemisphereLight args={['#dbe7ff', '#59636e', 1.0]} />
      <ambientLight intensity={0.18} color="#cfe0ff" />
      <directionalLight
        position={[-13, 11, 12]}
        intensity={2.1}
        color="#e3ecff"
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
      <directionalLight position={[10, 5, -6]} intensity={0.35} color="#9fbfe6" />
      <CastleBuildings />
      <Bank />
      <Path />
      <BankEdge />
      <Water tau={tau} />
      <IceFloes tau={tau} />
      <Instances geometry={geos.tree} items={L.trees} />
      <Instances geometry={geos.blade} items={L.tufts} castShadow={false} />
      <Instances geometry={geos.disc} items={L.snow} castShadow={false} />
      <Instances geometry={geos.rock} items={L.rocks} />
      <Instances geometry={geos.crown} items={L.bushes} />
      <Snowfall tau={tau} center={center} />
    </>
  );
};

export const castleStage: StageDef = {
  id: 'burg',
  Component: CastleScene,
  climbTrees: [],
  groundHeight,
  ambience: 'winter-atmo',
  waterLevel: 0,
};
