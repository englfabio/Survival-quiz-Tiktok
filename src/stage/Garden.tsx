import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {Instances, Sky, type Inst} from './Forest';
import type {StageCam, StageDef} from './types';

/**
 * Bühne "garten": Hausgarten im freundlichen Tageslicht.
 * Rasen, umgegrabenes Gemüsebeet mit dunkler Erde (links noch mit Salat/Kohl bepflanzt),
 * Holzzaun (hinten + an den Seiten), Gartenhaus links hinten, Nachbarhaus hinter dem Zaun,
 * Apfelbaum, Hecken, Blumen. Für weitere Garten-Videos nutzbar.
 *
 * Koordinaten (1 Einheit = 1 Meter), Kamera schaut meist von +z nach −z:
 * - Beet: x −1.8 … 2.6, z −2.6 … 1.4 (BED). Erde liegt 4 cm über dem Rasen.
 *   Links (x < −0.3) Pflanzreihen, rechts frisch umgegraben.
 * - Grabstelle (DIG_SPOT) bei (0.3, −0.5): dunkle Mulde, Erdhaufen daneben bei (1.35, −0.25).
 * - Holzzaun hinten bei z = −7 (x −10 … 10), Seitenzäune bei x = ±10 (bis z = 14).
 * - Nachbargarten hinter dem Zaun, Nachbarhaus bei (3.5, −16). Platz für eine Figur am Zaun: (x, −7.6).
 * - Gartenhaus bei (−6, −4.4), Apfelbaum bei (6.2, −3.5). Rasen vorne (+z) bis z ≈ 14 frei,
 *   eigenes Wohnhaus mit Terrasse bei z ≈ 16 … 25 (sichtbar, wenn die Kamera von −z nach +z schaut).
 */

export const BED = {x0: -1.8, x1: 2.6, z0: -2.6, z1: 1.4, h: 0.04};
export const DIG_SPOT = {x: 0.3, z: -0.5};
export const BACK_FENCE_Z = -7;
const SIDE_FENCE_X = 10;

const C = {
  skyTop: '#58a4dc',
  skyHorizon: '#eef6fb',
  fog: '#dfeef0',
  lawn: ['#6fa63e', '#64983a', '#7cb046', '#5d8f35'],
  soil: '#4a3424',
  soilDark: '#352419',
  soilLight: '#5c412c',
  wood: '#a07a52',
  woodDark: '#7d5c3c',
  fence: '#b89468',
  shed: '#8b6a48',
  shedRoof: '#4d5359',
  houseWall: '#efe6d6',
  houseRoof: '#b5523a',
  leaf: ['#4e8a35', '#5c9a3c', '#447a2e'],
  hedge: '#3f7a32',
  trunk: '#6b4a30',
};

const inBed = (x: number, z: number) => x > BED.x0 && x < BED.x1 && z > BED.z0 && z < BED.z1;

const groundHeight = (x: number, z: number) => (inBed(x, z) ? BED.h : 0);

// ---------- Rasen ----------
const Lawn = () => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(240, 240, 120, 120);
    g.rotateX(-Math.PI / 2);
    const ng = g.toNonIndexed();
    const pos = ng.attributes.position as THREE.BufferAttribute;
    const r = rng(17);
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i += 3) {
      const c = new THREE.Color(C.lawn[Math.floor(r() * C.lawn.length)]);
      for (let k = 0; k < 3; k++) {
        const x = pos.getX(i + k);
        const z = pos.getZ(i + k);
        const far = Math.max(0, Math.hypot(x, z) - 25);
        pos.setY(i + k, -0.01 + Math.min(1.5, far * 0.02) * Math.sin(x * 0.11) * Math.cos(z * 0.09));
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

// ---------- Beet: dunkle Erde mit Schollen ----------
const Bed = () => {
  const geo = useMemo(() => {
    const r = rng(23);
    const verts: number[] = [];
    const colors: number[] = [];
    const step = 0.16;
    const soil = [C.soil, C.soilDark, C.soilLight].map((c) => new THREE.Color(c));
    const hAt = (x: number, z: number) => {
      // Schollen + Furchen im umgegrabenen Teil, glattere Pflanzreihen links
      const dug = x > -0.3;
      const bump = dug ? 0.035 * Math.sin(x * 9.1 + z * 3.3) * Math.cos(z * 8.3 - x * 2.1) : 0.012 * Math.sin(z * 9.5);
      // Mulde an der Grabstelle
      const d = Math.hypot((x - DIG_SPOT.x) / 1.05, (z - DIG_SPOT.z) / 0.62);
      const hole = d < 1 ? -0.09 * (1 - d * d) : 0;
      return BED.h + 0.015 + bump + hole;
    };
    for (let x = BED.x0; x < BED.x1 - 1e-6; x += step) {
      for (let z = BED.z0; z < BED.z1 - 1e-6; z += step) {
        const p = [
          [x, z],
          [x + step, z],
          [x, z + step],
          [x + step, z + step],
        ].map(([px, pz]) => [px, hAt(px, pz), pz]);
        const tri = (a: number[], b: number[], c: number[]) => {
          const cx = (a[0] + b[0] + c[0]) / 3;
          const cz = (a[2] + b[2] + c[2]) / 3;
          const d = Math.hypot((cx - DIG_SPOT.x) / 1.05, (cz - DIG_SPOT.z) / 0.62);
          const col = soil[Math.floor(r() * 3)].clone();
          if (d < 1) col.lerp(new THREE.Color('#2a1c13'), 0.5 * (1 - d));
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
  // Seiten des Beets (Erde sieht man an den Kanten) + Beeteinfassung aus Brettern
  const w = BED.x1 - BED.x0;
  const d = BED.z1 - BED.z0;
  const cx = (BED.x0 + BED.x1) / 2;
  const cz = (BED.z0 + BED.z1) / 2;
  return (
    <group>
      <mesh geometry={geo} receiveShadow castShadow>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
      <mesh position={[cx, BED.h / 2, cz]} receiveShadow>
        <boxGeometry args={[w, BED.h + 0.02, d]} />
        <meshStandardMaterial color={C.soilDark} flatShading roughness={1} />
      </mesh>
      {[
        [cx, BED.z0 - 0.04, w + 0.16, 0.08],
        [cx, BED.z1 + 0.04, w + 0.16, 0.08],
      ].map(([x, z, lx, lz], i) => (
        <mesh key={`h${i}`} position={[x, 0.07, z]} castShadow receiveShadow>
          <boxGeometry args={[lx, 0.14, lz]} />
          <meshStandardMaterial color={C.woodDark} flatShading roughness={0.9} />
        </mesh>
      ))}
      {[BED.x0 - 0.04, BED.x1 + 0.04].map((x, i) => (
        <mesh key={`v${i}`} position={[x, 0.07, cz]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.14, d]} />
          <meshStandardMaterial color={C.woodDark} flatShading roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Gebäude ----------
/** Einfaches Satteldach-Prisma (Dachfirst entlang x) */
const roofGeo = (w: number, d: number, h: number) => {
  const s = new THREE.Shape();
  s.moveTo(-d / 2, 0);
  s.lineTo(d / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth: w, bevelEnabled: false});
  g.translate(0, 0, -w / 2);
  g.rotateY(Math.PI / 2);
  return g;
};

const Shed = ({x, z, rot = 0}: {x: number; z: number; rot?: number}) => {
  const roof = useMemo(() => roofGeo(2.9, 2.7, 0.9), []);
  const planks = useMemo(() => Array.from({length: 12}, (_, i) => -1.2 + i * 0.22), []);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 2.1, 2.3]} />
        <meshStandardMaterial color={C.shed} flatShading roughness={0.9} />
      </mesh>
      {/* Bretter-Fugen vorne */}
      {planks.map((px) => (
        <mesh key={px} position={[px, 1.05, 1.152]}>
          <boxGeometry args={[0.02, 2.1, 0.01]} />
          <meshStandardMaterial color={C.woodDark} />
        </mesh>
      ))}
      <mesh position={[0, 2.1, 0]} castShadow geometry={roof}>
        <meshStandardMaterial color={C.shedRoof} flatShading roughness={0.8} />
      </mesh>
      {/* Tür + Fenster */}
      <mesh position={[0.45, 0.9, 1.17]}>
        <boxGeometry args={[0.8, 1.75, 0.04]} />
        <meshStandardMaterial color="#5f4630" flatShading />
      </mesh>
      <mesh position={[0.72, 0.9, 1.2]}>
        <sphereGeometry args={[0.035, 6, 4]} />
        <meshStandardMaterial color="#d9c27a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.65, 1.3, 1.17]}>
        <boxGeometry args={[0.6, 0.5, 0.04]} />
        <meshStandardMaterial color="#f2efe6" />
      </mesh>
      <mesh position={[-0.65, 1.3, 1.19]}>
        <boxGeometry args={[0.5, 0.4, 0.02]} />
        <meshStandardMaterial color="#8fb7cf" roughness={0.2} metalness={0.2} />
      </mesh>
    </group>
  );
};

const House = ({x, z, rot = 0}: {x: number; z: number; rot?: number}) => {
  const roof = useMemo(() => roofGeo(9.4, 7.6, 3.2), []);
  const windows: [number, number][] = [
    [-2.8, 1.5],
    [0, 1.5],
    [2.8, 1.5],
    [-2.8, 4.2],
    [0, 4.2],
    [2.8, 4.2],
  ];
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 2.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[9, 5.6, 7]} />
        <meshStandardMaterial color={C.houseWall} flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, 5.6, 0]} castShadow geometry={roof}>
        <meshStandardMaterial color={C.houseRoof} flatShading roughness={0.8} />
      </mesh>
      {windows.map(([wx, wy], i) => (
        <group key={i} position={[wx, wy, 3.51]}>
          <mesh>
            <boxGeometry args={[1.25, 1.35, 0.05]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[1.05, 1.15, 0.03]} />
            <meshStandardMaterial color="#7aa3bd" roughness={0.2} metalness={0.25} />
          </mesh>
        </group>
      ))}
      {/* Terrassentür */}
      <mesh position={[1.4, 1.1, 3.52]}>
        <boxGeometry args={[1.3, 2.2, 0.05]} />
        <meshStandardMaterial color="#7aa3bd" roughness={0.2} metalness={0.25} />
      </mesh>
    </group>
  );
};

// ---------- Zaun, Pflanzen, Bäume ----------
const useLayout = () =>
  useMemo(() => {
    const r = rng(77);
    const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
    const pickets: Inst[] = [];
    const rails: {pos: [number, number, number]; len: number; rotY: number}[] = [];
    const posts: Inst[] = [];
    const plants: Inst[] = [];
    const leaves: Inst[] = [];
    const flowers: Inst[] = [];
    const hedges: Inst[] = [];
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const clods: Inst[] = [];
    const tufts: Inst[] = [];

    // Zaun: Linie von a nach b (Lattenzaun)
    const fence = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      const rotY = Math.atan2(bx - ax, bz - az);
      const n = Math.round(len / 0.16);
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const x = ax + (bx - ax) * k;
        const z = az + (bz - az) * k;
        pickets.push({pos: [x, 0, z], scale: [0.09, 1.05 + (i % 2) * 0.04, 0.025], rotY, color: pick([C.fence, '#c29f74', '#ad8a60'])});
      }
      for (let p = 0; p <= Math.round(len / 2); p++) {
        const k = p / Math.round(len / 2);
        posts.push({pos: [ax + (bx - ax) * k, 0, az + (bz - az) * k], scale: [0.11, 1.2, 0.11], rotY, color: C.woodDark});
      }
      for (const h of [0.3, 0.85]) rails.push({pos: [(ax + bx) / 2, h, (az + bz) / 2], len, rotY});
    };
    fence(-SIDE_FENCE_X, BACK_FENCE_Z, SIDE_FENCE_X, BACK_FENCE_Z);
    fence(-SIDE_FENCE_X, BACK_FENCE_Z, -SIDE_FENCE_X, 16);
    fence(SIDE_FENCE_X, BACK_FENCE_Z, SIDE_FENCE_X, 16);

    // Gemüse in Reihen (links im Beet): Salat/Kohl aus Blätter-Kugeln
    for (let x = BED.x0 + 0.3; x < -0.45; x += 0.42) {
      for (let z = BED.z0 + 0.35; z < BED.z1 - 0.2; z += 0.45) {
        const s = 0.13 + r() * 0.05;
        const col = pick(['#7fb547', '#6aa23d', '#93c257', '#5c8f45']);
        plants.push({pos: [x + (r() - 0.5) * 0.06, BED.h + s * 0.45, z + (r() - 0.5) * 0.06], scale: [s, s * 0.8, s], rotY: r() * 6, color: col});
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + r();
          leaves.push({
            pos: [x + Math.cos(a) * s * 0.9, BED.h + 0.03, z + Math.sin(a) * s * 0.9],
            scale: [s * 0.7, 0.03, s * 0.45],
            rotY: -a,
            color: col,
          });
        }
      }
    }
    // Erdschollen im umgegrabenen Teil + Erdhaufen neben der Grabstelle
    for (let i = 0; i < 160; i++) {
      const x = -0.2 + r() * (BED.x1 - 0.3);
      const z = BED.z0 + 0.1 + r() * (BED.z1 - BED.z0 - 0.2);
      if (Math.hypot((x - DIG_SPOT.x) / 1.0, (z - DIG_SPOT.z) / 0.6) < 1) continue;
      const s = 0.03 + r() * 0.05;
      clods.push({pos: [x, BED.h + 0.02, z], scale: [s * 1.3, s * 0.8, s], rotY: r() * 6, color: pick([C.soil, C.soilDark, C.soilLight])});
    }
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.38;
      const x = 1.35 + Math.cos(a) * d;
      const z = -0.25 + Math.sin(a) * d * 0.7;
      const s = 0.12 * (1 - d / 0.5) + 0.04 + r() * 0.04;
      clods.push({pos: [x, BED.h + s * 0.35, z], scale: [s * 1.2, s * 0.9, s], rotY: r() * 6, color: pick([C.soil, C.soilDark, C.soilLight])});
    }

    // Hecke + Blumen vor dem hinteren Zaun (Lücke in der Mitte, damit man den Nachbarn sieht)
    for (let x = -9.4; x < 9.4; x += 0.7) {
      if (Math.abs(x - 1.5) < 3.2) continue;
      if (x < -4) continue; // dort steht das Gartenhaus
      const s = 0.55 + r() * 0.25;
      hedges.push({pos: [x, s * 0.75, BACK_FENCE_Z + 0.65], scale: [s * 0.8, s, s * 0.7], rotY: r() * 6, color: pick([C.hedge, '#467f36', '#3a6e2f'])});
    }
    for (let z = -6; z < 13; z += 0.75) {
      for (const sx of [-1, 1]) {
        const s = 0.6 + r() * 0.3;
        if (sx < 0 && z < -2.8) continue;
        hedges.push({pos: [sx * (SIDE_FENCE_X - 0.7), s * 0.75, z], scale: [s * 0.75, s, s * 0.8], rotY: r() * 6, color: pick([C.hedge, '#467f36', '#3a6e2f'])});
      }
    }
    for (let i = 0; i < 70; i++) {
      const x = -3 + r() * 12;
      if (Math.abs(x - 1.5) < 3.0) continue;
      const z = BACK_FENCE_Z + 1.15 + r() * 0.5;
      const s = 0.05 + r() * 0.04;
      flowers.push({pos: [x, 0.25 + r() * 0.2, z], scale: [s, s, s], rotY: r() * 6, color: pick(['#f4d23c', '#e8574b', '#f6f1ea', '#b46fd0', '#f08ab2'])});
    }
    // Grasbüschel (Rasen sieht weniger glatt aus)
    for (let i = 0; i < 2600; i++) {
      const x = (r() - 0.5) * 22;
      const z = -6.6 + r() * 22;
      if (x > BED.x0 - 0.15 && x < BED.x1 + 0.15 && z > BED.z0 - 0.15 && z < BED.z1 + 0.15) continue;
      const s = 0.05 + r() * 0.06;
      tufts.push({pos: [x, 0, z], scale: [s * 0.6, s, s * 0.6], rotY: r() * 6, color: pick(['#7db548', '#6fa63e', '#8bbd52', '#5f9437'])});
    }
    // Bäume: Apfelbaum im Garten + Bäume hinter dem Nachbarhaus
    const tree = (x: number, z: number, s: number) => {
      trunks.push({pos: [x, 0, z], scale: [0.22 * s, 2.0 * s, 0.22 * s], rotY: r() * 6, color: C.trunk});
      const col = pick(C.leaf);
      crowns.push({pos: [x, 2.8 * s, z], scale: [1.6 * s, 1.3 * s, 1.6 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + 0.7 * s, 2.4 * s, z + 0.3 * s], scale: [1.0 * s, 0.9 * s, 1.0 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x - 0.6 * s, 2.5 * s, z - 0.3 * s], scale: [1.1 * s, 0.95 * s, 1.1 * s], rotY: r() * 6, color: col});
    };
    tree(6.2, -3.5, 1.15);
    for (let i = 0; i < 26; i++) {
      const x = -40 + r() * 80;
      const z = -22 - r() * 30;
      if (Math.abs(x - 3.5) < 5.5 && z > -21) continue;
      tree(x, z, 1.2 + r() * 1.2);
    }
    for (let i = 0; i < 14; i++) {
      const sx = r() < 0.5 ? -1 : 1;
      tree(sx * (13 + r() * 18), -6 + r() * 26, 1.1 + r() * 1.0);
    }
    return {pickets, rails, posts, plants, leaves, flowers, hedges, trunks, crowns, clods, tufts};
  }, []);

/**
 * Perfekter Rasen des Nachbarn (Bühne "nachbarrasen"): leuchtend grüne Mähstreifen hinter dem Zaun
 * (x −9 … 10, z −12.4 … −7.15), Blumenbeet vor dem Nachbarhaus, runde Buchskugeln. Mitte des Rasens ca. (1, −9.8).
 */
export const NEIGHBOR_LAWN = {x0: -9, x1: 10, z0: -12.4, z1: -7.15};
const NeighborLawn = () => {
  const {x0, x1, z0, z1} = NEIGHBOR_LAWN;
  const stripes = useMemo(() => {
    const out: {x: number; w: number; c: string}[] = [];
    let i = 0;
    for (let x = x0; x < x1 - 0.01; x += 0.9, i++) out.push({x: x + 0.45, w: 0.9, c: i % 2 ? '#47c43a' : '#5ad646'});
    return out;
  }, [x0, x1]);
  const flowers = useMemo(() => {
    const r = rng(311);
    return Array.from({length: 90}, () => ({x: x0 + 0.5 + r() * (x1 - x0 - 1), z: z0 + 0.15 + r() * 0.45, c: ['#ff5a7a', '#ffd23a', '#ffffff', '#c86bff', '#ff8a3a'][Math.floor(r() * 5)], s: 0.05 + r() * 0.04}));
  }, [x0, x1, z0]);
  return (
    <group>
      {stripes.map((st, i) => (
        <mesh key={i} position={[st.x, 0.012, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[st.w, z1 - z0]} />
          <meshStandardMaterial color={st.c} roughness={0.95} />
        </mesh>
      ))}
      {/* Rasenkante */}
      <mesh position={[(x0 + x1) / 2, 0.02, z0 + 0.05]} receiveShadow>
        <boxGeometry args={[x1 - x0, 0.04, 0.1]} />
        <meshStandardMaterial color="#d9d2c3" flatShading />
      </mesh>
      {/* Blumenbeet vor dem Haus */}
      <mesh position={[(x0 + x1) / 2, 0.03, z0 - 0.25]} receiveShadow>
        <boxGeometry args={[x1 - x0, 0.06, 0.5]} />
        <meshStandardMaterial color="#4a3424" flatShading />
      </mesh>
      {flowers.map((f, i) => (
        <mesh key={i} position={[f.x, 0.2 + f.s, f.z - 0.75]} castShadow>
          <icosahedronGeometry args={[f.s, 0]} />
          <meshStandardMaterial color={f.c} flatShading />
        </mesh>
      ))}
      {[-6.5, 7.5].map((x) => (
        <mesh key={x} position={[x, 0.38, -8.0]} castShadow>
          <icosahedronGeometry args={[0.38, 1]} />
          <meshStandardMaterial color="#2f7a2c" flatShading />
        </mesh>
      ))}
    </group>
  );
};

const GardenScene = ({cam, neighbor = false}: {cam?: StageCam; neighbor?: boolean}) => {
  void cam;
  const L = useLayout();
  const geos = useMemo(() => {
    const picket = new THREE.BoxGeometry(1, 1, 1);
    picket.translate(0, 0.5, 0);
    // Latte mit Spitze
    const tip = new THREE.ConeGeometry(0.72, 0.09, 4);
    tip.rotateY(Math.PI / 4);
    tip.scale(1, 1, 0.3);
    tip.translate(0, 1.045, 0);
    const post = new THREE.BoxGeometry(1, 1, 1);
    post.translate(0, 0.5, 0);
    const ball = new THREE.IcosahedronGeometry(1, 0);
    const leaf = new THREE.SphereGeometry(1, 6, 3);
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
    trunk.translate(0, 0.5, 0);
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    return {picket, tip, post, ball, leaf, trunk, blade};
  }, []);
  const tips = useMemo(() => L.pickets.map((p) => ({...p, scale: [p.scale[0], p.scale[1], p.scale[2]] as [number, number, number]})), [L]);
  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 45, 260]} />
      <Sky c={C} />
      <hemisphereLight args={['#e8f3ff', '#5d7a3a', 1.0]} />
      <ambientLight intensity={0.18} />
      <directionalLight
        position={[-9, 20, 11]}
        intensity={3.0}
        color="#fff3dc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <Lawn />
      <Bed />
      {neighbor && <NeighborLawn />}
      <Shed x={-6} z={-4.4} rot={0.35} />
      <House x={3.5} z={-16} />
      {/* eigenes Wohnhaus vorne (+z), Rückseite mit Terrasse zum Garten */}
      <House x={-1} z={21} rot={Math.PI} />
      <mesh position={[-1, 0.06, 16.2]} receiveShadow>
        <boxGeometry args={[9, 0.12, 2.6]} />
        <meshStandardMaterial color="#c9c2b5" flatShading roughness={0.9} />
      </mesh>
      <Instances geometry={geos.picket} items={L.pickets} />
      <Instances geometry={geos.tip} items={tips} />
      <Instances geometry={geos.post} items={L.posts} />
      {L.rails.map((rl, i) => (
        <mesh key={i} position={rl.pos} rotation={[0, rl.rotY, 0]} castShadow>
          <boxGeometry args={[0.04, 0.08, rl.len]} />
          <meshStandardMaterial color={C.woodDark} flatShading roughness={0.9} />
        </mesh>
      ))}
      <Instances geometry={geos.ball} items={L.plants} />
      <Instances geometry={geos.leaf} items={L.leaves} castShadow={false} />
      <Instances geometry={geos.ball} items={L.clods} />
      <Instances geometry={geos.ball} items={L.hedges} />
      <Instances geometry={geos.ball} items={L.flowers} castShadow={false} />
      <Instances geometry={geos.blade} items={L.tufts} castShadow={false} />
      <Instances geometry={geos.trunk} items={L.trunks} />
      <Instances geometry={geos.ball} items={L.crowns} />
    </>
  );
};

export const gardenStage: StageDef = {
  id: 'garten',
  Component: GardenScene,
  climbTrees: [],
  groundHeight,
  // Vogelgezwitscher + leichter Wind: passt auch in den Garten (vorhandener Effekt, kostet nichts neu)
  ambience: 'wald-atmo',
};

/** Garten mit dem perfekten, leuchtend grünen Rasen des Nachbarn hinter dem Zaun (Wecker-Spezial) */
export const neighborLawnStage: StageDef = {
  id: 'nachbarrasen',
  Component: ({cam}) => <GardenScene cam={cam} neighbor />,
  climbTrees: [],
  groundHeight,
  ambience: 'wald-atmo',
};
