import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {canvasTex, fitText, TextPlane} from '../actors/WgProps';
import {Instances, Sky, type Inst} from './Forest';
import type {StageCam, StageDef} from './types';

/**
 * Autobahn mit Stau (Spezial "T-Rex-Stau", wiederverwendbar) + Weltraum.
 *
 * "autobahn": sonniger Nachmittag, Boden flach (y = 0). Verkehr fährt nach +x.
 *  - Unsere Fahrbahn: drei Spuren, Mitten z = HIGHWAY.lanes (−3.75 / 0 / 3.75), Fahrbahnrand z ±5.625 (durchgezogene Linie),
 *    Standstreifen z 5.625 … 8.1. Außen-Leitplanke bei z = 8.6 (x −160 … 160).
 *  - Mittelstreifen (Gras) z −5.9 … −8.4 mit doppelter Leitplanke bei z = −7.15. Gegenfahrbahn z −8.65 … −19.9 (leer),
 *    Leitplanke außen bei z = −20.4.
 *  - Schilderbrücke bei x = HIGHWAY.gantryX (−48): Stützen z −7.15 / 9.4, Träger y 6.4 … 7.3, zwei blaue Schilder (erfundene Ziele,
 *    "Dinotal 2 km", "Kreidezeit 12 km"), Schilder zeigen nach −x (zum Verkehr).
 *  - Hinter der Außen-Leitplanke Böschung mit Wiese, Gebüsch für die Raptoren (HIGHWAY.bushes, z ≈ 11.5), Felder, Bäume ab z > 16,
 *    Hügel in der Ferne. Vorn (z 8.6 … 16, |x| < 60) bis auf die Büsche frei für Kameras.
 *
 * "weltraum": tiefschwarzes All mit Sternen + zarten Nebeln (für den Urknall, Effekt-Figur "urknall").
 */
export const HIGHWAY = {
  lanes: [-3.75, 0, 3.75],
  edge: 5.625,
  shoulder: 8.1,
  railOut: 8.6,
  median: -7.15,
  gantryX: -48,
  /** Gebüsch am Rand (Raptoren verstecken sich dahinter): x, z, Größe */
  bushes: [
    [-3.2, 11.6, 1.25],
    [0.6, 12.1, 1.35],
    [4.2, 11.5, 1.2],
    [-6.6, 12.4, 1.1],
    [7.8, 12.3, 1.15],
  ] as [number, number, number][],
};

const C = {
  skyTop: '#5f9fe0',
  skyHorizon: '#eef3f0',
  fog: '#dfe9ec',
  grass: '#79ab4c',
  verge: '#86b456',
  field: ['#d9c45a', '#a9c454', '#8db449', '#e0cf74'],
  trunk: '#5a4230',
  leaf: ['#4f7d35', '#5d8c3c', '#46702f', '#679a43'],
  hill: ['#8fb26a', '#7da35c', '#9cbd77'],
  asphalt: '#5a5e63',
  asphaltDark: '#4f5357',
  line: '#f2f2ee',
  rail: '#b9c0c6',
  post: '#8d959c',
};

const groundHeight = () => 0;

// ---------- Schilder (erfundene Ziele, kein echtes Schild-Design einer Firma) ----------
const signTex = (top: string, bottom: string, arrow: 'up' | 'right') =>
  canvasTex(768, 400, (g) => {
    g.fillStyle = '#1f5fb4';
    g.fillRect(0, 0, 768, 400);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 12;
    g.strokeRect(14, 14, 740, 372);
    g.fillStyle = '#ffffff';
    fitText(g, top, 330, 150, 520, 120, 700);
    fitText(g, bottom, 330, 282, 520, 100, 700);
    // Pfeil
    g.save();
    g.translate(640, 210);
    if (arrow === 'right') g.rotate(Math.PI / 4);
    g.beginPath();
    g.moveTo(0, -95);
    g.lineTo(55, -30);
    g.lineTo(20, -30);
    g.lineTo(20, 90);
    g.lineTo(-20, 90);
    g.lineTo(-20, -30);
    g.lineTo(-55, -30);
    g.closePath();
    g.fill();
    g.restore();
  });
const SIGN_L = signTex('Kreidezeit', '12 km', 'up');
const SIGN_R = signTex('Dinotal', '2 km', 'right');

/** Leitplanke entlang x (Pfosten alle 2 m, Profil-Band) */
const GuardRail = ({z, x0 = -160, x1 = 160, side = 1}: {z: number; x0?: number; x1?: number; side?: number}) => {
  const posts = useMemo(() => {
    const out: Inst[] = [];
    for (let x = x0; x <= x1; x += 2) out.push({pos: [x, 0, z], scale: [0.12, 0.75, 0.12], rotY: 0, color: C.post});
    return out;
  }, [z, x0, x1]);
  const box = useMemo(() => {
    const b = new THREE.BoxGeometry(1, 1, 1);
    b.translate(0, 0.5, 0);
    return b;
  }, []);
  return (
    <group>
      <Instances geometry={box} items={posts} />
      <mesh position={[(x0 + x1) / 2, 0.58, z + side * 0.1]} castShadow receiveShadow>
        <boxGeometry args={[x1 - x0, 0.3, 0.06]} />
        <meshStandardMaterial color={C.rail} metalness={0.55} roughness={0.35} flatShading />
      </mesh>
      <mesh position={[(x0 + x1) / 2, 0.58, z + side * 0.14]}>
        <boxGeometry args={[x1 - x0, 0.08, 0.04]} />
        <meshStandardMaterial color="#d4d9dd" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
};

/** Fahrbahn mit Markierungen: Mitte z0, halbe Breite (Spuren) */
const Carriageway = ({z0, lanes}: {z0: number; lanes: number[]}) => {
  const dashes = useMemo(() => {
    const out: Inst[] = [];
    for (const lz of [-1.875, 1.875]) for (let x = -200; x < 200; x += 12) out.push({pos: [x, 0.016, z0 + lz], scale: [6, 0.004, 0.15], rotY: 0, color: C.line});
    return out;
  }, [z0]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  void lanes;
  return (
    <group>
      <mesh position={[0, 0.01, z0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[420, 11.25]} />
        <meshStandardMaterial color={C.asphalt} roughness={0.95} />
      </mesh>
      <Instances geometry={box} items={dashes} castShadow={false} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.016, z0 + s * 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[420, 0.22]} />
          <meshStandardMaterial color={C.line} />
        </mesh>
      ))}
    </group>
  );
};

/** Schilderbrücke über unserer Fahrbahn */
const Gantry = () => {
  const m = useMemo(() => new THREE.MeshStandardMaterial({color: '#9aa3ab', metalness: 0.55, roughness: 0.4, flatShading: true}), []);
  const zA = HIGHWAY.median;
  const zB = 9.4;
  const len = zB - zA;
  return (
    <group position={[HIGHWAY.gantryX, 0, 0]}>
      {[zA, zB].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh material={m} position={[0, 3.65, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 7.3, 8]} />
          </mesh>
          <mesh material={m} position={[0, 0.15, 0]}>
            <boxGeometry args={[1.0, 0.3, 1.0]} />
          </mesh>
        </group>
      ))}
      {/* Fachwerk-Träger */}
      {[6.45, 7.25].map((y) =>
        [-0.35, 0.35].map((dx) => (
          <mesh key={`${y}${dx}`} material={m} position={[dx, y, (zA + zB) / 2]} castShadow>
            <boxGeometry args={[0.12, 0.12, len]} />
          </mesh>
        )),
      )}
      {Array.from({length: Math.floor(len / 1.4)}, (_, i) => zA + 0.7 + i * 1.4).map((z, i) => (
        <mesh key={z} material={m} position={[0, 6.85, z]} rotation={[i % 2 ? 0.6 : -0.6, 0, 0]}>
          <boxGeometry args={[0.08, 1.0, 0.08]} />
        </mesh>
      ))}
      {/* Schilder zeigen nach −x (zum Verkehr) */}
      <group position={[-0.5, 5.75, -2.2]} rotation={[0, -Math.PI / 2, 0]}>
        <TextPlane draw={SIGN_L} k="Autobahn Schild Kreidezeit" w={4.6} h={2.4} glow={0.2} />
      </group>
      <group position={[-0.5, 5.75, 3.4]} rotation={[0, -Math.PI / 2, 0]}>
        <TextPlane draw={SIGN_R} k="Autobahn Schild Dinotal" w={4.6} h={2.4} glow={0.2} />
      </group>
      {/* Rückseiten der Schilder (grau) */}
      {[-2.2, 3.4].map((z) => (
        <mesh key={z} position={[-0.47, 5.75, z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[4.6, 2.4]} />
          <meshStandardMaterial color="#8a9298" side={THREE.FrontSide} />
        </mesh>
      ))}
    </group>
  );
};

/** Busch (Gruppe aus Kugeln, flach schattiert) – auch für die Raptoren-Verstecke */
export const Bush = ({s = 1, seed = 1}: {s?: number; seed?: number}) => {
  const parts = useMemo(() => {
    const r = rng(seed * 31 + 7);
    return Array.from({length: 7}, () => ({
      p: [(r() - 0.5) * 2.2 * s, (0.55 + r() * 0.5) * s, (r() - 0.5) * 1.2 * s] as [number, number, number],
      k: (0.65 + r() * 0.45) * s,
      c: ['#3f7a34', '#4f8d3c', '#5a9a44', '#376b2d'][Math.floor(r() * 4)],
    }));
  }, [s, seed]);
  return (
    <group>
      {parts.map((q, i) => (
        <mesh key={i} position={q.p} castShadow receiveShadow>
          <icosahedronGeometry args={[q.k, 0]} />
          <meshStandardMaterial color={q.c} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
};

const useLandscape = () =>
  useMemo(() => {
    const r = rng(77);
    const pick = <X,>(a: X[]) => a[Math.floor(r() * a.length)];
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const grass: Inst[] = [];
    const hills: Inst[] = [];
    const addTree = (x: number, z: number, s: number) => {
      trunks.push({pos: [x, 0, z], scale: [0.3 * s, 2.8 * s, 0.3 * s], rotY: r() * 6, color: C.trunk});
      const col = pick(C.leaf);
      crowns.push({pos: [x, 4.0 * s, z], scale: [2.0 * s, 1.9 * s, 2.0 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * 1.3 * s, 3.2 * s, z + (r() - 0.5) * 1.3 * s], scale: [1.4 * s, 1.2 * s, 1.4 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * s, 5.0 * s, z + (r() - 0.5) * 0.8 * s], scale: [1.2 * s, 1.1 * s, 1.2 * s], rotY: r() * 6, color: pick(C.leaf)});
    };
    // Baumgruppen hinter der Böschung (vorn locker, hinten dicht)
    for (let i = 0; i < 46; i++) {
      // vorn (|x| < 90) erst ab z 70 → Kameras auf der Wiese haben freie Sicht
      const x = -140 + r() * 300;
      addTree(x, (Math.abs(x) < 90 ? 70 : 17) + r() * 40, 1 + r() * 0.6);
    }
    for (let i = 0; i < 70; i++) addTree(-160 + r() * 330, -26 - r() * 60, 1 + r() * 0.6);
    // Gras-Büschel am Rand
    for (let i = 0; i < 1300; i++) {
      const x = -90 + r() * 180;
      const z = r() < 0.75 ? 8.9 + r() * 8 : -8.3 + r() * 1.0;
      const s = 0.14 + r() * 0.2;
      grass.push({pos: [x, 0, z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: pick(['#6f9e44', '#5f8e3a', '#86b456', '#9cc062'])});
    }
    for (let i = 0; i < 26; i++) {
      const x = -260 + i * 22 + r() * 10;
      hills.push({pos: [x, -6, -140 - r() * 40], scale: [40 + r() * 30, 22 + r() * 18, 30], rotY: r() * 6, color: pick(C.hill)});
      hills.push({pos: [x, -6, 150 + r() * 40], scale: [40 + r() * 30, 18 + r() * 14, 30], rotY: r() * 6, color: pick(C.hill)});
    }
    const fields: {x: number; z: number; w: number; d: number; c: string}[] = [];
    for (let i = 0; i < 16; i++) fields.push({x: -150 + i * 20 + r() * 4, z: 40 + r() * 12, w: 18 + r() * 4, d: 22, c: C.field[i % 4]});
    for (let i = 0; i < 16; i++) fields.push({x: -150 + i * 20 + r() * 4, z: -45 - r() * 12, w: 18 + r() * 4, d: 26, c: C.field[(i + 1) % 4]});
    return {trunks, crowns, grass, hills, fields};
  }, []);

const HighwayScene = (_: {cam?: StageCam}) => {
  const L = useLandscape();
  const g = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
    trunk.translate(0, 0.5, 0);
    const crown = new THREE.IcosahedronGeometry(1, 0);
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    const hill = new THREE.SphereGeometry(1, 10, 6);
    return {trunk, crown, blade, hill};
  }, []);
  return (
    <>
      <color attach="background" args={[C.fog]} />
      <fog attach="fog" args={[C.fog, 70, 260]} />
      <Sky c={C} />
      <hemisphereLight args={['#dbe8ff', '#6d7a4a', 1.15]} />
      <ambientLight intensity={0.45} color="#fff6e6" />
      {/* Sonne von links vorn (warm), großer Schattenbereich für den Bau-Turm */}
      <directionalLight
        position={[-30, 42, 34]}
        intensity={2.3}
        color="#fff0d6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0008}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[20, 10, -16]} intensity={0.6} color="#cfe0ff" />
      {/* Wiese */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[700, 700]} />
        <meshStandardMaterial color={C.grass} roughness={1} />
      </mesh>
      {L.fields.map((f, i) => (
        <mesh key={i} position={[f.x, 0.005, f.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[f.w, f.d]} />
          <meshStandardMaterial color={f.c} roughness={1} />
        </mesh>
      ))}
      <Instances geometry={g.hill} items={L.hills} castShadow={false} />
      {/* Fahrbahnen + Standstreifen + Mittelstreifen */}
      <Carriageway z0={0} lanes={HIGHWAY.lanes} />
      <Carriageway z0={-14.275} lanes={HIGHWAY.lanes} />
      <mesh position={[0, 0.009, (HIGHWAY.edge + HIGHWAY.shoulder) / 2 + 0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[420, HIGHWAY.shoulder - HIGHWAY.edge + 0.6]} />
        <meshStandardMaterial color={C.asphaltDark} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.007, -7.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[420, 2.6]} />
        <meshStandardMaterial color={C.verge} roughness={1} />
      </mesh>
      <GuardRail z={HIGHWAY.railOut} side={-1} />
      <GuardRail z={HIGHWAY.median - 0.25} side={1} />
      <GuardRail z={HIGHWAY.median + 0.25} side={-1} />
      <GuardRail z={-20.4} side={1} />
      <Gantry />
      {/* Bäume, Gras */}
      <Instances geometry={g.trunk} items={L.trunks} />
      <Instances geometry={g.crown} items={L.crowns} />
      <Instances geometry={g.blade} items={L.grass} castShadow={false} />
      {HIGHWAY.bushes.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]}>
          <Bush s={s} seed={i + 1} />
        </group>
      ))}
    </>
  );
};

export const highwayStage: StageDef = {id: 'autobahn', Component: HighwayScene, climbTrees: [], groundHeight, ambience: 'autobahn-atmo'};

// ---------------------------------------------------------------------------------------------
// Weltraum
// ---------------------------------------------------------------------------------------------
const nebulaTex = (c1: string, c2: string) =>
  canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, c1);
    gr.addColorStop(0.45, c2);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  });
const NEB = [nebulaTex('rgba(150,90,255,0.55)', 'rgba(80,40,160,0.18)'), nebulaTex('rgba(60,170,255,0.5)', 'rgba(20,80,160,0.15)'), nebulaTex('rgba(255,120,170,0.45)', 'rgba(140,40,90,0.14)')];

const SpaceScene = ({cam}: {cam?: StageCam}) => {
  const stars = useMemo(() => {
    const r = rng(5);
    const N = 2600;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const rad = 260 + r() * 60;
      const s = Math.sqrt(1 - u * u);
      pos.set([rad * s * Math.cos(th), rad * u, rad * s * Math.sin(th)], i * 3);
      const c = new THREE.Color().setHSL(0.55 + r() * 0.15, 0.4, 0.75 + r() * 0.25);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);
  const nebs = useMemo(() => {
    const r = rng(9);
    return Array.from({length: 9}, (_, i) => {
      const th = r() * Math.PI * 2;
      const y = (r() - 0.5) * 140;
      return {p: [Math.cos(th) * 230, y, Math.sin(th) * 230] as [number, number, number], s: 110 + r() * 90, k: i % 3, rot: r() * 6};
    });
  }, []);
  const nebTex = useMemo(() => NEB.map((f) => f()), []);
  const c = cam?.pos ?? [0, 0, 0];
  return (
    <>
      <color attach="background" args={['#02030a']} />
      <ambientLight intensity={0.7} color="#c9d6ff" />
      <directionalLight position={[10, 14, 12]} intensity={1.4} color="#fff2e0" />
      <group position={c as [number, number, number]}>
        <points geometry={stars}>
          <pointsMaterial size={2.2} sizeAttenuation={false} vertexColors depthWrite={false} fog={false} />
        </points>
        {nebs.map((n, i) => (
          <mesh key={i} position={n.p} onUpdate={(o) => o.lookAt(0, 0, 0)}>
            <planeGeometry args={[n.s, n.s]} />
            <meshBasicMaterial map={nebTex[n.k]} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
          </mesh>
        ))}
      </group>
    </>
  );
};

export const spaceStage: StageDef = {id: 'weltraum', Component: SpaceScene, climbTrees: [], groundHeight, ambience: 'weltraum-atmo'};
