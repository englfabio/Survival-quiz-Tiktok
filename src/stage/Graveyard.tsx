import {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {bareTreeGeo} from './Castle';
import {Instances, Sky, type Inst} from './Forest';
import type {StageCam, StageDef} from './types';

/**
 * Bühne "friedhof": kleiner Friedhof bei Nacht – leicht gruselig, aber freundlich (nicht verstörend).
 * Vollmond mit Lichthof, Sterne, bläuliches Mondlicht, Bodennebel, kahle Bäume, Grabsteine und Kreuze,
 * schmiedeeiserner Zaun, kleine Kapelle mit warm erleuchtetem Fenster, alte Laternen mit warmem Licht,
 * rote Grablichter.
 *
 * Koordinaten (1 Einheit = 1 Meter):
 * - Kiesweg entlang der z-Achse bei x = 0 (Breite ca. 2,2 m), Boden flach (y = 0) für |x| < 13, −26 < z < 16.
 * - Gräberreihen links/rechts ab |x| ≈ 2,4. Freie Spielfläche auf dem Weg, z −6 … +10.
 * - „Zombie-Grab“ (großer schiefer Grabstein + aufgewühlte Erde) bei (2.7, −1.6): dahinter kann der Zombie stehen.
 * - Laternen bei (1.45, −4.5), (−1.45, 3.5), (1.45, 11) – warmes Licht.
 * - Zaun bei z = −26 und x = ±13, Kapelle bei (−5, −33). Mond hinten links oben.
 */

const C = {
  skyTop: '#0a1430',
  skyHorizon: '#2d4270',
  fog: '#1d2b48',
  grass: ['#2c4038', '#33493d', '#283a33', '#3a5143'],
  path: '#8b93a3',
  pathDark: '#6e7686',
  stone: ['#8d95a3', '#7c8494', '#99a1ad', '#6f7787'],
  moss: '#556b52',
  bark: ['#2c2a2e', '#343036', '#27252a'],
  iron: '#1a1c22',
};

const groundHeight = (x: number, z: number) => {
  const dx = Math.max(0, Math.abs(x) - 13);
  const dz = Math.max(0, -26 - z, z - 16);
  const k = Math.min(1, (dx + dz) / 12);
  return k * (Math.sin(x * 0.15) * Math.cos(z * 0.12) * 1.4 + Math.sin(x * 0.4 + z * 0.2) * 0.3);
};

const Ground = () => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(240, 240, 110, 110);
    g.rotateX(-Math.PI / 2);
    const ng = g.toNonIndexed();
    const pos = ng.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const r = rng(17);
    for (let i = 0; i < pos.count; i += 3) {
      const col = new THREE.Color(C.grass[Math.floor(r() * C.grass.length)]);
      for (let k = 0; k < 3; k++) {
        pos.setY(i + k, groundHeight(pos.getX(i + k), pos.getZ(i + k)) - 0.02);
        colors.push(col.r, col.g, col.b);
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

/** Kiesweg (helle Steinchen, leicht unregelmäßige Ränder) */
const Path = () => {
  const geo = useMemo(() => {
    const r = rng(29);
    const verts: number[] = [];
    const colors: number[] = [];
    const ca = new THREE.Color(C.path);
    const cb = new THREE.Color(C.pathDark);
    for (let z = -40; z < 40; z += 0.9) {
      const rows = [z, z + 0.9].map(() => {
        const w = 1.1 + (r() - 0.5) * 0.18;
        return [-w, (r() - 0.5) * 0.2, w];
      });
      for (let j = 0; j < 2; j++) {
        const p = [
          [rows[0][j], z],
          [rows[0][j + 1], z],
          [rows[1][j], z + 0.9],
          [rows[1][j + 1], z + 0.9],
        ];
        const tri = (A: number[], B: number[], Cc: number[]) => {
          const c = ca.clone().lerp(cb, r() * 0.8);
          for (const v of [A, B, Cc]) {
            verts.push(v[0], 0.012 + r() * 0.008, v[1]);
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
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
};

// ---------- Grabsteine ----------
/** Grabstein mit Rundbogen oben (Höhe 1, Breite 1, Tiefe 1 – wird skaliert) */
const roundStoneGeo = () => {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0.5, 0.7);
  s.absarc(0, 0.7, 0.5, 0, Math.PI, false);
  s.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(s, {depth: 1, bevelEnabled: false, curveSegments: 6});
  g.translate(0, 0, -0.5);
  g.scale(1, 1 / 1.2, 1);
  return g;
};
/** Kreuz (Höhe 1) */
const crossGeo = () => {
  const a = new THREE.BoxGeometry(0.22, 1, 0.22);
  a.translate(0, 0.5, 0);
  const b = new THREE.BoxGeometry(0.7, 0.2, 0.22);
  b.translate(0, 0.7, 0);
  const g = new THREE.BufferGeometry();
  const merged = [a.toNonIndexed(), b.toNonIndexed()];
  const pos: number[] = [];
  const nor: number[] = [];
  for (const m of merged) {
    pos.push(...(m.attributes.position.array as Float32Array));
    nor.push(...(m.attributes.normal.array as Float32Array));
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
};

const useGraves = () =>
  useMemo(() => {
    const r = rng(61);
    const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
    const round: Inst[] = [];
    const crosses: Inst[] = [];
    const slabs: Inst[] = [];
    const mounds: Inst[] = [];
    const borders: Inst[] = [];
    const lights: [number, number, number][] = [];
    const flowers: Inst[] = [];
    for (const side of [-1, 1]) {
      for (let col = 0; col < 4; col++) {
        const x = side * (2.9 + col * 2.4);
        for (let z = -23; z < 15; z += 2.7) {
          const zz = z + (r() - 0.5) * 0.4;
          const xx = x + (r() - 0.5) * 0.4;
          // frei halten: Zombie-Grab und Kamera-Bereich vorne rechts/links
          if (side > 0 && col === 0 && zz > -3.5 && zz < 0.5) continue;
          if (r() < 0.12) continue;
          const tilt = (r() - 0.5) * 0.25;
          const type = r();
          const c = pick(C.stone);
          if (type < 0.55) {
            const h = 0.75 + r() * 0.45;
            round.push({pos: [xx, 0, zz], scale: [0.55 + r() * 0.25, h, 0.14], rotY: tilt, color: c});
          } else if (type < 0.8) {
            const h = 0.9 + r() * 0.5;
            crosses.push({pos: [xx, 0, zz], scale: [h * 0.9, h, h * 0.6], rotY: tilt, color: c});
          } else {
            slabs.push({pos: [xx, 0.3, zz], scale: [0.6, 0.6, 0.16], rotY: tilt, color: c});
          }
          // Grabstelle davor (Richtung Weg)
          const fz = zz + 0.85;
          if (r() < 0.6) borders.push({pos: [xx, 0.06, fz], scale: [0.85, 0.12, 1.4], rotY: 0, color: pick(C.stone)});
          else mounds.push({pos: [xx, 0.0, fz], scale: [0.45, 0.16, 0.7], rotY: 0, color: '#3a3a30'});
          if (r() < 0.35) lights.push([xx + 0.25, 0.0, zz + 0.2]);
          if (r() < 0.4) flowers.push({pos: [xx - 0.2, 0.12, fz], scale: [0.18, 0.12, 0.18], rotY: r() * 6, color: pick(['#7a4f8f', '#a2565c', '#c9a74a', '#5f7f9e'])});
        }
      }
    }
    return {round, crosses, slabs, mounds, borders, lights, flowers};
  }, []);

/** Rotes Grablicht (Glas + Flamme), leuchtet sanft */
const GraveLight = ({p, tau, i}: {p: [number, number, number]; tau: number; i: number}) => {
  const flick = 0.85 + 0.15 * Math.sin(tau * 9 + i * 1.7) * Math.sin(tau * 5.3 + i);
  return (
    <group position={p}>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.045, 0.04, 0.14, 8]} />
        <meshStandardMaterial color="#b3241c" emissive="#ff3a1e" emissiveIntensity={1.4 * flick} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 8]} />
        <meshStandardMaterial color="#6d6f73" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
};

/** Alte Laterne auf einem Pfahl, warmes Licht */
const Lantern = ({x, z, tau}: {x: number; z: number; tau: number}) => {
  const flick = 0.92 + 0.08 * Math.sin(tau * 7 + x * 3);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.4, 6]} />
        <meshStandardMaterial color={C.iron} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <boxGeometry args={[0.3, 0.38, 0.3]} />
        <meshStandardMaterial color="#ffd38a" emissive="#ffb04a" emissiveIntensity={2.2 * flick} />
      </mesh>
      <mesh position={[0, 2.88, 0]}>
        <coneGeometry args={[0.26, 0.22, 4]} />
        <meshStandardMaterial color={C.iron} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 2.42, 0]}>
        <boxGeometry args={[0.34, 0.04, 0.34]} />
        <meshStandardMaterial color={C.iron} />
      </mesh>
      <pointLight position={[0, 2.5, 0]} color="#ffb766" intensity={14 * flick} distance={11} decay={1.6} />
    </group>
  );
};

/** Schmiedeeiserner Zaun (Stäbe mit Spitzen) entlang einer Linie */
const Fence = ({from, to}: {from: [number, number]; to: [number, number]}) => {
  const items = useMemo(() => {
    const bars: Inst[] = [];
    const tips: Inst[] = [];
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const n = Math.floor(len / 0.18);
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const x = from[0] + (to[0] - from[0]) * k;
      const z = from[1] + (to[1] - from[1]) * k;
      if (Math.abs(x) < 1.3 && Math.abs(z + 26) < 0.3) continue; // Tor offen
      bars.push({pos: [x, 0.75, z], scale: [0.03, 1.5, 0.03], rotY: 0, color: C.iron});
      tips.push({pos: [x, 1.55, z], scale: [0.05, 0.14, 0.05], rotY: 0, color: C.iron});
    }
    return {bars, tips};
  }, [from, to]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cone = useMemo(() => new THREE.ConeGeometry(1, 1, 4), []);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const ang = Math.atan2(to[0] - from[0], to[1] - from[1]);
  return (
    <group>
      <Instances geometry={box} items={items.bars} castShadow={false} />
      <Instances geometry={cone} items={items.tips} castShadow={false} />
      {[0.25, 1.3].map((y) => (
        <mesh key={y} position={[(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2]} rotation={[0, ang, 0]}>
          <boxGeometry args={[0.04, 0.05, len]} />
          <meshStandardMaterial color={C.iron} />
        </mesh>
      ))}
    </group>
  );
};

/** Kleine Kapelle mit Glockentürmchen und warm erleuchtetem Fenster */
const Chapel = () => (
  <group position={[-5, 0, -33]}>
    <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
      <boxGeometry args={[5, 4.4, 7]} />
      <meshStandardMaterial color="#6e7586" flatShading roughness={0.95} />
    </mesh>
    <mesh position={[0, 5.3, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
      <cylinderGeometry args={[0.01, 3.6, 2.0, 4, 1]} />
      <meshStandardMaterial color="#2e3446" flatShading />
    </mesh>
    <mesh position={[0, 5.3, 0]} scale={[1, 1, 1.9]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[3.55, 2.0, 4]} />
      <meshStandardMaterial color="#2e3446" flatShading />
    </mesh>
    <mesh position={[0, 6.4, 3.2]} castShadow>
      <boxGeometry args={[1.2, 3.0, 1.2]} />
      <meshStandardMaterial color="#757c8d" flatShading />
    </mesh>
    <mesh position={[0, 8.5, 3.2]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[1.0, 1.6, 4]} />
      <meshStandardMaterial color="#2e3446" flatShading />
    </mesh>
    <mesh position={[0, 9.6, 3.2]}>
      <boxGeometry args={[0.08, 0.6, 0.08]} />
      <meshStandardMaterial color="#c9b26a" />
    </mesh>
    <mesh position={[0, 9.7, 3.2]}>
      <boxGeometry args={[0.32, 0.08, 0.08]} />
      <meshStandardMaterial color="#c9b26a" />
    </mesh>
    {/* Tür + Fenster (warm erleuchtet) */}
    <mesh position={[0, 1.0, 3.51]}>
      <boxGeometry args={[1.1, 2.0, 0.05]} />
      <meshStandardMaterial color="#3a2a20" />
    </mesh>
    {[-1.5, 1.5].map((x) => (
      <mesh key={x} position={[x, 2.4, 3.51]}>
        <boxGeometry args={[0.55, 1.0, 0.05]} />
        <meshStandardMaterial color="#ffcf7a" emissive="#ffa940" emissiveIntensity={1.6} />
      </mesh>
    ))}
    <mesh position={[0, 6.4, 3.81]}>
      <circleGeometry args={[0.3, 12]} />
      <meshStandardMaterial color="#ffcf7a" emissive="#ffa940" emissiveIntensity={1.4} />
    </mesh>
  </group>
);

/** Weiches Nebel-Bild (radialer Verlauf) für die Bodennebel-Schwaden */
const fogTexture = () => {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Bodennebel: flache, weiche Schwaden knapp über dem Boden, treiben langsam */
const GroundFog = ({tau}: {tau: number}) => {
  const {mat, seeds} = useMemo(() => {
    const r = rng(41);
    return {
      mat: new THREE.SpriteMaterial({map: fogTexture(), color: '#a9bce0', transparent: true, opacity: 0.2, depthWrite: false, fog: false}),
      seeds: Array.from({length: 70}, () => ({x: -16 + r() * 32, z: -28 + r() * 46, y: 0.25 + r() * 0.6, s: 3.5 + r() * 4, sp: 0.08 + r() * 0.12, ph: r() * 6})),
    };
  }, []);
  return (
    <group>
      {seeds.map((p, i) => (
        <sprite
          key={i}
          material={mat}
          position={[p.x + Math.sin(tau * p.sp + p.ph) * 1.2 + tau * 0.12, p.y, p.z + Math.cos(tau * p.sp * 0.7 + p.ph) * 0.6]}
          scale={[p.s * 1.8, p.s * 0.55, 1]}
          renderOrder={8}
        />
      ))}
    </group>
  );
};

/** Vollmond mit Lichthof + Sterne */
const Moon = () => {
  const halo = useMemo(
    () => new THREE.SpriteMaterial({map: fogTexture(), color: '#bcd0ff', transparent: true, opacity: 0.55, depthWrite: false, fog: false}),
    [],
  );
  const stars = useMemo(() => {
    const r = rng(5);
    const pts: number[] = [];
    for (let i = 0; i < 700; i++) {
      const a = r() * Math.PI * 2;
      const e = 0.12 + r() * 1.2;
      pts.push(Math.cos(a) * Math.cos(e) * 380, Math.sin(e) * 380, Math.sin(a) * Math.cos(e) * 380);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const moonPos: [number, number, number] = [-130, 150, -260];
  return (
    <group>
      <points geometry={stars}>
        <pointsMaterial color="#e9efff" size={1.6} sizeAttenuation={false} fog={false} transparent opacity={0.85} />
      </points>
      <mesh position={moonPos}>
        <icosahedronGeometry args={[16, 2]} />
        <meshBasicMaterial color="#f4efd8" fog={false} />
      </mesh>
      {[
        [-5, 4, 4],
        [6, -3, 3],
        [2, 7, 2.5],
      ].map(([x, y, r], i) => (
        <mesh key={i} position={[moonPos[0] + x, moonPos[1] + y, moonPos[2] + 15]}>
          <circleGeometry args={[r, 10]} />
          <meshBasicMaterial color="#d9d3bb" fog={false} />
        </mesh>
      ))}
      <sprite material={halo} position={moonPos} scale={[120, 120, 1]} />
    </group>
  );
};

const useTrees = () =>
  useMemo(() => {
    const r = rng(93);
    const out: Inst[] = [];
    const fixed: [number, number, number][] = [
      [-6.0, -9.5, 1.5],
      [7.2, -16, 1.7],
      [-11.5, 2, 1.6],
      [11.8, -4, 1.4],
      [-8.8, -20, 1.8],
    ];
    for (const [x, z, s] of fixed) out.push({pos: [x, 0, z], scale: [s, s * 1.15, s], rotY: x, color: C.bark[0]});
    for (let i = 0; i < 90; i++) {
      const x = -60 + r() * 120;
      const z = -70 + r() * 110;
      if (Math.abs(x) < 15 && z > -30 && z < 20) continue;
      const s = 1.3 + r() * 1.0;
      out.push({pos: [x, groundHeight(x, z) - 0.05, z], scale: [s, s * (1 + r() * 0.3), s], rotY: r() * 6, color: C.bark[Math.floor(r() * 3)]});
    }
    return out;
  }, []);

const GraveyardScene = ({cam}: {cam?: StageCam}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tau = frame / fps;
  const G = useGraves();
  const trees = useTrees();
  const geos = useMemo(
    () => ({round: roundStoneGeo(), cross: crossGeo(), box: new THREE.BoxGeometry(1, 1, 1), mound: new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), tree: bareTreeGeo(), flower: new THREE.IcosahedronGeometry(1, 0)}),
    [],
  );
  void cam;
  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 22, 85]} />
      <Sky c={C} />
      <Moon />
      <hemisphereLight args={['#7d93d6', '#1b2333', 1.05]} />
      <ambientLight intensity={0.3} color="#9fb2e8" />
      <directionalLight
        position={[-9, 14, -12]}
        intensity={1.9}
        color="#c4d4ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      {/* sanftes Fülllicht von vorn, damit Figuren gut lesbar bleiben */}
      <directionalLight position={[4, 6, 14]} intensity={0.55} color="#8fa3d9" />
      <Ground />
      <Path />
      <Instances geometry={geos.round} items={G.round} />
      <Instances geometry={geos.cross} items={G.crosses} />
      <Instances geometry={geos.box} items={G.slabs} />
      <Instances geometry={geos.box} items={G.borders} castShadow={false} />
      <Instances geometry={geos.mound} items={G.mounds} castShadow={false} />
      <Instances geometry={geos.flower} items={G.flowers} castShadow={false} />
      {G.lights.map((p, i) => (
        <GraveLight key={i} p={p} tau={tau} i={i} />
      ))}
      {/* Zombie-Grab: großer, schiefer Grabstein, aufgewühlte Erde davor */}
      <group position={[2.7, 0, -1.6]} rotation={[0, -0.25, 0.12]}>
        <mesh geometry={geos.round} scale={[0.9, 1.35, 0.18]} castShadow receiveShadow>
          <meshStandardMaterial color="#7f8798" flatShading roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.95, 0.095]}>
          <boxGeometry args={[0.5, 0.06, 0.01]} />
          <meshStandardMaterial color="#4c5262" />
        </mesh>
        <mesh position={[0, 0.82, 0.095]}>
          <boxGeometry args={[0.36, 0.05, 0.01]} />
          <meshStandardMaterial color="#4c5262" />
        </mesh>
      </group>
      <group position={[2.55, 0, -0.65]}>
        {[
          [0, 0, 0.6, 0.2, 0.75],
          [0.35, 0.1, 0.25, 0.12, 0.3],
          [-0.4, -0.2, 0.22, 0.1, 0.25],
          [0.1, 0.55, 0.2, 0.09, 0.2],
        ].map(([x, z, sx, sy, sz], i) => (
          <mesh key={i} geometry={geos.mound} position={[x, 0, z]} scale={[sx, sy, sz]} castShadow receiveShadow>
            <meshStandardMaterial color="#3b3328" flatShading roughness={1} />
          </mesh>
        ))}
      </group>
      <Lantern x={1.45} z={-4.5} tau={tau} />
      <Lantern x={-1.45} z={3.5} tau={tau} />
      <Lantern x={1.45} z={11} tau={tau} />
      <Fence from={[-13, -26]} to={[13, -26]} />
      <Fence from={[-13, -26]} to={[-13, 16]} />
      <Fence from={[13, -26]} to={[13, 16]} />
      {/* Torpfosten */}
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, 1.0, -26]} castShadow>
          <boxGeometry args={[0.4, 2.0, 0.4]} />
          <meshStandardMaterial color={C.stone[1]} flatShading />
        </mesh>
      ))}
      <Chapel />
      <Instances geometry={geos.tree} items={trees} />
      <GroundFog tau={tau} />
    </>
  );
};

export const graveyardStage: StageDef = {
  id: 'friedhof',
  Component: GraveyardScene,
  climbTrees: [],
  groundHeight,
  ambience: 'nacht-atmo',
};
