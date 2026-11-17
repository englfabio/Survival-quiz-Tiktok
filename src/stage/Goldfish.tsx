import {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {T} from '../ui/theme';
import {useFontTexture} from '../actors/ToothProps';
import {BubblePump, DiverFigure, PlasticPlant} from '../actors/FishProps';
import {Instances, Sky, type Inst} from './Forest';
import {DayLight, useTreeGeos} from './Monstertruck';
import {OUTBACK, Ring} from './Outback';
import {FarHouses, ParkLantern, TrashBin} from './Park';
import type {StageCam, StageDef} from './types';

/**
 * Bühnen für das Spezial „Dein Goldfisch hat dein Auto geklaut“ (wiederverwendbar, alles ohne Logos/Marken).
 *
 * "parkplatz" (PARKPLATZ): Supermarkt-Parkplatz am Tag. Fahrgasse entlang x bei z 0 (z −3 … 3), Zufahrt von links (x < −22).
 *  Parkbuchten hinten (z −3 … −8, Mitten x = −15.6 + 3.1·i, Auto face 0 = Nase zum Markt) und vorn (z 3 … 8, Nase +z), weiße Linien.
 *  Hinten neutraler Supermarkt (Front z −16.5, x −14 … 14) mit Schild „SUPERMARKT“ (keine Marke), Glas-Eingang, Einkaufswagen-Häuschen,
 *  Laternen, Bäume in Pflanzinseln, Hecken; vorn (z > 9) Grünstreifen → Kamera frei. Häufchen-Platz für die Futterspur: PARKPLATZ.pile.
 * "parkplatz-ring": derselbe Parkplatz, in der Mitte steht der Boxring aus dem Känguru-Video (Ring-Mitte (0, 0), Boden 0,5 m, Ecken ±2,6;
 *  rote Ecke (−2.6, −2.6)). Auto des Dummys parkt in der Bucht PARKPLATZ.ringCar.
 * "kurvenstrasse" (KURVE): kurvige Landstraße am Tag zwischen Feldern + Hügeln. Mittellinie z = kurveZ(x) (Sinus, ab x 15 gerade bei z 0),
 *  Fahrbahn ±3.2, Rechtsverkehr Richtung +x = Spur bei +1.6 (rechte Seite = +z). Leitpfosten, Bäume nur ab 9 m neben der Straße.
 *  Am Ende rechts ein kleiner Parkplatz (Asphalt x 40 … 70, z 3.2 … 11) mit 6 Buchten quer zur Straße (Mitten KURVE.spots, Auto face 0 = rückwärts
 *  eingeparkt, Nase zur Straße).
 * "aquarium-innen" (AQUA): das Innere des Aquariums als riesiger Raum (viel größer als von außen): bunter Kies, riesige Plastikpflanzen,
 *  Taucherfigur (ca. 4 m), Luftblasen-Pumpe mit dicker Blasensäule, Glaswände mit schwarzen Kanten, Lichtstrahlen von oben, Wasseroberfläche bei y 16.
 *  Platz des Dummys AQUA.home (0, 0) – sitzt zwischen den Pflanzen. Kamera innen (z < 9).
 */

export const PARKPLATZ = {pile: [1.5, 0] as [number, number], ringCar: [-9.3, -5.6] as [number, number], spotsBack: (i: number) => [-15.5 + 3.1 * i, -5.6] as [number, number]};

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.85, flatShading: true, ...extra});

const LEAF = ['#4f7d35', '#5d8c3c', '#46702f', '#679a43'];

const signTexture = () => {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2f8f4e';
  g.fillRect(0, 0, 1024, 192);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `800 140px ${T.font}`;
  g.fillText('SUPERMARKT', 512, 102);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Einkaufswagen (stilisiert, ohne Aufdruck), Ursprung = Boden, Griff hinten (−z) */
const Cart = () => {
  const m = useMemo(() => ({metal: std('#b9c0c7', {metalness: 0.6, roughness: 0.35}), handle: std('#2f8f4e'), wheel: std('#25282d')}), []);
  return (
    <group>
      <mesh material={m.metal} position={[0, 0.62, 0.05]} castShadow>
        <boxGeometry args={[0.52, 0.34, 0.8]} />
      </mesh>
      <mesh material={m.handle} position={[0, 0.95, -0.42]}>
        <boxGeometry args={[0.56, 0.05, 0.05]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={m.metal} position={[s * 0.22, 0.3, 0.05]}>
            <boxGeometry args={[0.03, 0.5, 0.8]} />
          </mesh>
          {[-0.3, 0.38].map((z) => (
            <mesh key={z} material={m.wheel} position={[s * 0.22, 0.05, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.05, 0.05, 0.04, 8]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

const ParkingScene = ({ring = false}: {ring?: boolean}) => {
  const g = useTreeGeos();
  const tex = useFontTexture(signTexture, 'supermarkt-schild');
  const m = useMemo(
    () => ({
      asphalt: std('#5f6368', {roughness: 0.95}),
      white: std('#eeeeea', {roughness: 0.6}),
      curb: std('#b9b6ae'),
      walk: std('#c7c2b8', {roughness: 0.95}),
      grass: std('#7fae4f', {roughness: 1}),
      wall: std('#efe9dd', {roughness: 0.9}),
      wall2: std('#d9d1c2', {roughness: 0.9}),
      roof: std('#8b9097'),
      glass: std('#7fa9c4', {roughness: 0.2, metalness: 0.3}),
      frame: std('#3a3f46'),
      awning: std('#d8392b'),
      green: std('#2f8f4e'),
      soil: std('#6b5040'),
    }),
    [],
  );
  const L = useMemo(() => {
    const r = rng(53);
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const hedges: Inst[] = [];
    const grass: Inst[] = [];
    const tree = (x: number, z: number, s = 1) => {
      trunks.push({pos: [x, 0.1, z], scale: [0.2 * s, 2.4 * s, 0.2 * s], rotY: r() * 6, color: '#5a4230'});
      const col = LEAF[Math.floor(r() * 4)];
      crowns.push({pos: [x, 3.3 * s, z], scale: [1.6 * s, 1.5 * s, 1.6 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + 0.4, 2.8 * s, z + 0.3], scale: [1.1 * s, 0.9 * s, 1.1 * s], rotY: r() * 6, color: col});
    };
    for (const x of [-22, 22]) for (const z of [-8, 6]) tree(x, z, 1.0 + r() * 0.2);
    for (let x = -40; x <= 40; x += 8) tree(x, 12 + r() * 2, 1.1);
    for (let x = -46; x <= 46; x += 2.2) hedges.push({pos: [x, 0.4, 9.8], scale: [1.3, 0.8, 0.9], rotY: r() * 0.3, color: ['#4f7d35', '#5d8c3c', '#3f6a2c'][Math.floor(r() * 3)]});
    for (let i = 0; i < 700; i++) {
      const x = -60 + r() * 120;
      const z = 10.5 + r() * 20;
      const s = 0.1 + r() * 0.14;
      grass.push({pos: [x, 0, z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: ['#6f9e44', '#5f8e3a', '#86b456'][Math.floor(r() * 3)]});
    }
    return {trunks, crowns, hedges, grass};
  }, []);
  const lines: [number, number, number, number][] = [];
  for (let i = 0; i <= 11; i++) {
    const x = -17 + 3.1 * i;
    lines.push([x, -5.6, 0.1, 5.0]);
    lines.push([x, 5.6, 0.1, 5.0]);
  }
  return (
    <>
      <DayLight sun={[-16, 18, 14]} shadow={26} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={m.grass}>
        <planeGeometry args={[400, 400]} />
      </mesh>
      {/* Asphaltfläche + Zufahrt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -1.2]} receiveShadow material={m.asphalt}>
        <planeGeometry args={[44, 20.4]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-45, 0.01, 0]} receiveShadow material={m.asphalt}>
        <planeGeometry args={[50, 6.4]} />
      </mesh>
      {lines.map(([x, z, w, d], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.016, z]} material={m.white}>
          <planeGeometry args={[w, d]} />
        </mesh>
      ))}
      {[-3.1, 3.1].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, z]} material={m.white}>
          <planeGeometry args={[37.4, 0.1]} />
        </mesh>
      ))}
      {/* Fahrpfeile */}
      {[-12, 12].map((x) => (
        <group key={x} position={[x, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh material={m.white} position={[-0.4, 0, 0]}>
            <planeGeometry args={[1.6, 0.22]} />
          </mesh>
          <mesh material={m.white} position={[0.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <circleGeometry args={[0.5, 3]} />
          </mesh>
        </group>
      ))}
      {/* Bordsteine */}
      <mesh position={[0, 0.07, 9.0]} material={m.curb} castShadow receiveShadow>
        <boxGeometry args={[44, 0.14, 0.22]} />
      </mesh>
      {/* Gehweg vor dem Markt */}
      <mesh position={[0, 0.06, -12.8]} material={m.walk} receiveShadow>
        <boxGeometry args={[44, 0.12, 7.4]} />
      </mesh>
      {/* Supermarkt */}
      <group position={[0, 0, -21.5]}>
        <mesh material={m.wall} position={[0, 2.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[28, 5.2, 10]} />
        </mesh>
        <mesh material={m.roof} position={[0, 5.35, 0]}>
          <boxGeometry args={[28.6, 0.3, 10.6]} />
        </mesh>
        <mesh material={m.wall2} position={[0, 0.35, 5.01]}>
          <boxGeometry args={[28, 0.7, 0.04]} />
        </mesh>
        {/* Fensterband + Glas-Eingang */}
        {[-10, -6, 6, 10].map((x) => (
          <group key={x} position={[x, 2.1, 5.02]}>
            <mesh material={m.frame}>
              <boxGeometry args={[3.4, 2.4, 0.05]} />
            </mesh>
            <mesh material={m.glass} position={[0, 0, 0.03]}>
              <boxGeometry args={[3.2, 2.2, 0.03]} />
            </mesh>
          </group>
        ))}
        <group position={[0, 1.45, 5.02]}>
          <mesh material={m.frame}>
            <boxGeometry args={[4.4, 2.9, 0.05]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={m.glass} position={[s * 1.06, 0, 0.03]}>
              <boxGeometry args={[2.0, 2.7, 0.03]} />
            </mesh>
          ))}
        </group>
        {/* Vordach */}
        <mesh material={m.awning} position={[0, 3.35, 6.2]} rotation={[0.15, 0, 0]} castShadow>
          <boxGeometry args={[7, 0.12, 2.4]} />
        </mesh>
        {/* Schild */}
        <mesh position={[0, 4.35, 5.06]}>
          <planeGeometry args={[9, 1.69]} />
          {tex ? <meshBasicMaterial map={tex} toneMapped={false} /> : <meshBasicMaterial color="#2f8f4e" />}
        </mesh>
      </group>
      {/* Einkaufswagen-Häuschen + Wagen */}
      <group position={[11, 0.12, -11.5]}>
        <mesh material={m.green} position={[0, 2.2, 0]} castShadow>
          <boxGeometry args={[4.2, 0.12, 2.2]} />
        </mesh>
        {[-2, 2].map((x) =>
          [-1, 1].map((z) => (
            <mesh key={`${x}${z}`} material={m.frame} position={[x, 1.1, z]}>
              <boxGeometry args={[0.08, 2.2, 0.08]} />
            </mesh>
          )),
        )}
        {[-1.2, -0.6, 0, 0.6].map((x) => (
          <group key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <Cart />
          </group>
        ))}
      </group>
      <group position={[-7.5, 0.12, -10.6]} rotation={[0, 0.5, 0]}>
        <Cart />
      </group>
      {/* Laternen, Mülleimer */}
      {[-20, 0, 20].map((x) => (
        <group key={x} position={[x, 0, x === 0 ? -9.3 : 9.2]}>
          <ParkLantern light={false} />
        </group>
      ))}
      <group position={[-3, 0.12, -10.0]}>
        <TrashBin />
      </group>
      {/* Pflanzinseln */}
      {[-22, 22].map((x) =>
        [-8, 6].map((z) => (
          <mesh key={`${x}${z}`} material={m.soil} position={[x, 0.08, z]} receiveShadow>
            <boxGeometry args={[2.4, 0.16, 2.4]} />
          </mesh>
        )),
      )}
      <FarHouses z={-44} face={1} seed={11} day />
      <Instances geometry={g.trunk} items={L.trunks} />
      <Instances geometry={g.crown} items={L.crowns} />
      <Instances geometry={g.box} items={L.hedges} />
      <Instances geometry={g.blade} items={L.grass} castShadow={false} />
      {ring && <Ring />}
    </>
  );
};

const inRing = (x: number, z: number) => Math.abs(x) < OUTBACK.apron && Math.abs(z) < OUTBACK.apron;

// ---------------------------------------------------------------------------------------------
// Kurvige Landstraße
// ---------------------------------------------------------------------------------------------
export const KURVE = {A: 7, L: 64, flat0: 0, flat1: 18, half: 3.2, spots: [44, 48, 52, 56, 60, 64].map((x) => [x, 7.6] as [number, number])};
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Mittellinie der Landstraße (gleiche Formel im Choreo-Skript: kurve_z) */
export const kurveZ = (x: number) => KURVE.A * Math.sin((2 * Math.PI * x) / KURVE.L) * (1 - smoothstep(KURVE.flat0, KURVE.flat1, x));

const ribbon = (f: (x: number) => number, x0: number, x1: number, off0: number, off1: number, step = 0.8) => {
  const pos: number[] = [];
  const idx: number[] = [];
  let n = 0;
  for (let x = x0; x <= x1 + 1e-6; x += step) {
    const z = f(x);
    const dz = (f(x + 0.1) - f(x - 0.1)) / 0.2;
    const len = Math.hypot(1, dz);
    const nx = -dz / len;
    const nz = 1 / len;
    pos.push(x + nx * off0, 0, z + nz * off0, x + nx * off1, 0, z + nz * off1);
    if (n > 0) {
      const a = (n - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    n++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

const CurvyRoadScene = (_: {cam?: StageCam}) => {
  const g = useTreeGeos();
  const m = useMemo(
    () => ({
      asphalt: new THREE.MeshStandardMaterial({color: '#5d6166', roughness: 0.95, side: THREE.DoubleSide}),
      white: new THREE.MeshStandardMaterial({color: '#eeeeea', roughness: 0.6, side: THREE.DoubleSide}),
      grass: std('#82b052', {roughness: 1}),
      post: std('#f4f4f0'),
      postBand: std('#1d1f22'),
      field1: std('#c9b45a', {roughness: 1}),
      field2: std('#6f9e44', {roughness: 1}),
      field3: std('#9b7b4f', {roughness: 1}),
      hill: std('#6e9a48', {roughness: 1}),
      hill2: std('#5d8a3e', {roughness: 1}),
      lot: std('#5f6368', {roughness: 0.95}),
      sign: std('#2a64c8', {roughness: 0.5}),
      pole: std('#9aa0a6', {metalness: 0.5, roughness: 0.4}),
    }),
    [],
  );
  const geos = useMemo(() => {
    const road = ribbon(kurveZ, -140, 100, -KURVE.half, KURVE.half);
    const edgeL = ribbon(kurveZ, -140, 100, -KURVE.half + 0.25, -KURVE.half + 0.4);
    const edgeR = ribbon(kurveZ, -140, 100, KURVE.half - 0.4, KURVE.half - 0.25);
    const dashes: THREE.BufferGeometry[] = [];
    for (let x = -140; x < 100; x += 6) dashes.push(ribbon(kurveZ, x, x + 3, -0.07, 0.07, 0.5));
    return {road, edgeL, edgeR, dashes};
  }, []);
  const L = useMemo(() => {
    const r = rng(91);
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const grass: Inst[] = [];
    const posts: [number, number][] = [];
    const tree = (x: number, z: number, s = 1) => {
      trunks.push({pos: [x, 0, z], scale: [0.25 * s, 2.8 * s, 0.25 * s], rotY: r() * 6, color: '#5a4230'});
      const col = LEAF[Math.floor(r() * 4)];
      crowns.push({pos: [x, 3.9 * s, z], scale: [1.9 * s, 1.8 * s, 1.9 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + 0.5, 3.2 * s, z + 0.4], scale: [1.3 * s, 1.1 * s, 1.3 * s], rotY: r() * 6, color: col});
    };
    for (let x = -130; x < 95; x += 7 + r() * 6) {
      const zc = kurveZ(x);
      const side = r() < 0.5 ? -1 : 1;
      const z = zc + side * (10 + r() * 14);
      if (x > 36 && x < 74 && z > 0 && z < 18) continue; // Parkplatz frei lassen
      tree(x, z, 0.9 + r() * 0.4);
    }
    for (let x = -130; x < 95; x += 12) {
      const zc = kurveZ(x);
      const dz = (kurveZ(x + 0.1) - kurveZ(x - 0.1)) / 0.2;
      const len = Math.hypot(1, dz);
      for (const s of [-1, 1]) {
        if (s > 0 && x > 38 && x < 70) continue;
        posts.push([x + (-dz / len) * s * 4.0, zc + (1 / len) * s * 4.0]);
      }
    }
    for (let i = 0; i < 1400; i++) {
      const x = -120 + r() * 210;
      const z = -40 + r() * 80;
      if (Math.abs(z - kurveZ(x)) < 3.6) continue;
      if (x > 38 && x < 72 && z > 2.8 && z < 11.5) continue;
      const s = 0.1 + r() * 0.16;
      grass.push({pos: [x, 0, z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: ['#6f9e44', '#5f8e3a', '#86b456'][Math.floor(r() * 3)]});
    }
    return {trunks, crowns, grass, posts};
  }, []);
  return (
    <>
      <DayLight sun={[-20, 22, 16]} shadow={30} far={260} near={70} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={m.grass}>
        <planeGeometry args={[600, 600]} />
      </mesh>
      {/* Felder */}
      {[
        [-60, -28, 40, 24, m.field1],
        [-10, -30, 34, 22, m.field3],
        [-70, 26, 44, 22, m.field2],
        [-20, 30, 30, 20, m.field1],
        [30, -28, 36, 22, m.field2],
      ].map(([x, z, w, d, mat], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x as number, 0.005, z as number]} material={mat as THREE.Material} receiveShadow>
          <planeGeometry args={[w as number, d as number]} />
        </mesh>
      ))}
      {/* Hügel in der Ferne */}
      {[
        [-90, -90, 40, 14, m.hill],
        [-20, -110, 55, 18, m.hill2],
        [60, -95, 45, 15, m.hill],
        [-60, 110, 50, 16, m.hill2],
        [40, 105, 40, 13, m.hill],
      ].map(([x, z, r, h, mat], i) => (
        <mesh key={i} position={[x as number, 0, z as number]} scale={[r as number, h as number, (r as number) * 0.7]} material={mat as THREE.Material}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
      ))}
      {/* Straße */}
      <mesh geometry={geos.road} material={m.asphalt} position={[0, 0.012, 0]} receiveShadow />
      <mesh geometry={geos.edgeL} material={m.white} position={[0, 0.016, 0]} />
      <mesh geometry={geos.edgeR} material={m.white} position={[0, 0.016, 0]} />
      {geos.dashes.map((d, i) => (
        <mesh key={i} geometry={d} material={m.white} position={[0, 0.017, 0]} />
      ))}
      {/* Leitpfosten */}
      {L.posts.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh material={m.post} position={[0, 0.5, 0]}>
            <boxGeometry args={[0.12, 1.0, 0.12]} />
          </mesh>
          <mesh material={m.postBand} position={[0, 0.85, 0]}>
            <boxGeometry args={[0.13, 0.12, 0.13]} />
          </mesh>
        </group>
      ))}
      {/* Parkplatz am Ende (rechts der Straße) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[55, 0.011, 7.0]} material={m.lot} receiveShadow>
        <planeGeometry args={[30, 7.8]} />
      </mesh>
      {[42, 46, 50, 54, 58, 62, 66].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.017, 7.9]} material={m.white}>
          <planeGeometry args={[0.12, 5.0]} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[54, 0.017, 10.4]} material={m.white}>
        <planeGeometry args={[24.1, 0.12]} />
      </mesh>
      <group position={[39.5, 0, 4.4]}>
        <mesh material={m.pole} position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
        </mesh>
        <mesh material={m.sign} position={[0, 2.25, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <boxGeometry args={[0.6, 0.6, 0.03]} />
        </mesh>
      </group>
      <Instances geometry={g.trunk} items={L.trunks} />
      <Instances geometry={g.crown} items={L.crowns} />
      <Instances geometry={g.blade} items={L.grass} castShadow={false} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------
// Aquarium von innen (riesig)
// ---------------------------------------------------------------------------------------------
export const AQUA = {home: [0, 0] as [number, number], halfW: 22, back: -30, front: 12, surface: 16};
const PEBBLES = ['#f27d52', '#f5c242', '#5fbfa3', '#7a8cf0', '#f2f2ea', '#e65f8e', '#c9b27a'];

const AquariumHall = (_: {cam?: StageCam}) => {
  const frame = useCurrentFrame();
  const time = frame / 30;
  const g = useMemo(() => ({ico: new THREE.IcosahedronGeometry(1, 0), ray: new THREE.CylinderGeometry(1.2, 3.2, 26, 8, 1, true)}), []);
  const m = useMemo(
    () => ({
      floor: std('#d8c39a', {roughness: 1}),
      glass: new THREE.MeshStandardMaterial({color: '#9fd8ee', roughness: 0.05, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false}),
      edge: std('#1f2328', {roughness: 0.5}),
      ray: new THREE.MeshBasicMaterial({color: '#e6fbff', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide}),
      surface: new THREE.MeshStandardMaterial({color: '#c9f2ff', roughness: 0.1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, emissive: '#7fd6f2', emissiveIntensity: 0.35}),
      speck: new THREE.MeshBasicMaterial({color: '#f4fdff', transparent: true, opacity: 0.55}),
      back: std('#2c6f95', {roughness: 1}),
      rock: std('#8a8f97', {roughness: 0.9}),
    }),
    [],
  );
  const L = useMemo(() => {
    const r = rng(29);
    const pebbles: Inst[] = [];
    for (let i = 0; i < 2600; i++) {
      const x = (r() - 0.5) * AQUA.halfW * 2;
      const z = AQUA.back + r() * (AQUA.front - AQUA.back);
      const s = 0.12 + r() * 0.28;
      pebbles.push({pos: [x, s * 0.35, z], scale: [s, s * 0.7, s * 0.9], rotY: r() * 6, color: PEBBLES[Math.floor(r() * PEBBLES.length)]});
    }
    const specks = Array.from({length: 70}, () => [(r() - 0.5) * 30, 0.5 + r() * 14, -24 + r() * 32, r() * 6] as [number, number, number, number]);
    return {pebbles, specks};
  }, []);
  const plants: [number, number, number, string, number][] = [
    [-3.2, -2.2, 6.5, '#3fcf5a', 1],
    [-5.5, -6, 9, '#2fb36a', 2],
    [3.4, -3.6, 7.5, '#e0559a', 3],
    [6.5, -9, 10, '#7be04a', 4],
    [-9, -13, 11, '#3fcf5a', 5],
    [-2.0, 2.6, 4.2, '#7be04a', 6],
    [10, -3, 8, '#3fcf5a', 7],
    [-12, -2, 7, '#e0559a', 8],
    [1.5, -14, 12, '#2fb36a', 9],
  ];
  return (
    <>
      <color attach="background" args={['#2a7ea8']} />
      <fog attach="fog" args={['#3e93b8', 18, 70]} />
      <hemisphereLight args={['#bdf0ff', '#3b6a5a', 1.3]} />
      <ambientLight intensity={0.45} color="#dff6ff" />
      <directionalLight
        position={[6, 30, 10]}
        intensity={1.9}
        color="#f2fdff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      {/* Kiesboden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (AQUA.back + AQUA.front) / 2]} material={m.floor} receiveShadow>
        <planeGeometry args={[AQUA.halfW * 2, AQUA.front - AQUA.back]} />
      </mesh>
      <Instances geometry={g.ico} items={L.pebbles} />
      {/* Rückwand-Folie + Glaswände mit Kanten */}
      <mesh material={m.back} position={[0, AQUA.surface / 2, AQUA.back - 0.3]}>
        <planeGeometry args={[AQUA.halfW * 2, AQUA.surface + 4]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.glass} position={[s * AQUA.halfW, AQUA.surface / 2, (AQUA.back + AQUA.front) / 2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[AQUA.front - AQUA.back, AQUA.surface + 4]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} material={m.edge} position={[s * AQUA.halfW, AQUA.surface / 2, AQUA.back]}>
          <boxGeometry args={[0.6, AQUA.surface + 4, 0.6]} />
        </mesh>
      ))}
      <mesh material={m.edge} position={[0, 0.2, AQUA.back]}>
        <boxGeometry args={[AQUA.halfW * 2, 0.6, 0.6]} />
      </mesh>
      {/* Wasseroberfläche (von unten) */}
      <mesh material={m.surface} position={[0, AQUA.surface, -8]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[AQUA.halfW * 2.4, 60, 24, 24]} />
      </mesh>
      {/* Lichtstrahlen */}
      {[
        [-8, -10, 0.2],
        [4, -14, -0.15],
        [12, -6, 0.1],
        [-2, -4, -0.05],
      ].map(([x, z, tilt], i) => (
        <mesh key={i} geometry={g.ray} material={m.ray} position={[x, 10, z]} rotation={[0, 0, tilt + 0.03 * Math.sin(time * 0.6 + i)]} />
      ))}
      {/* Riesige Plastikpflanzen */}
      {plants.map(([x, z, h, c, seed]) => (
        <group key={seed} position={[x, 0, z]} rotation={[0, seed * 0.7 + 0.05 * Math.sin(time * 0.8 + seed), 0.03 * Math.sin(time * 0.7 + seed)]}>
          <PlasticPlant h={h} color={c} seed={seed} />
        </group>
      ))}
      {/* Taucherfigur + Luftblasen-Pumpe */}
      <group position={[5.2, 0, -6.5]} rotation={[0, -0.5, 0]}>
        <DiverFigure h={4.2} bubbles={1} time={time} />
      </group>
      <group position={[-7.5, 0, -8]}>
        <BubblePump h={AQUA.surface} s={9} time={time} />
      </group>
      <mesh material={m.rock} position={[8.5, 0.8, -15]} scale={[3, 2.2, 2.4]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
      </mesh>
      {/* Schwebeteilchen */}
      {L.specks.map(([x, y, z, ph], i) => (
        <mesh key={i} material={m.speck} position={[x + 0.3 * Math.sin(time * 0.4 + ph), y + ((time * 0.25 + ph) % 3), z]} scale={0.03}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      <Sky c={{skyTop: '#2a7ea8', skyHorizon: '#3e93b8'}} />
    </>
  );
};

export const parkingStage: StageDef = {id: 'parkplatz', Component: () => <ParkingScene />, climbTrees: [], groundHeight: () => 0, ambience: 'wald-atmo'};
export const parkingRingStage: StageDef = {
  id: 'parkplatz-ring',
  Component: () => <ParkingScene ring />,
  climbTrees: [],
  groundHeight: (x, z) => (inRing(x, z) ? OUTBACK.floor : 0),
  ambience: 'wald-atmo',
};
export const curvyRoadStage: StageDef = {id: 'kurvenstrasse', Component: CurvyRoadScene, climbTrees: [], groundHeight: () => 0, ambience: 'wald-atmo'};
export const aquariumHallStage: StageDef = {id: 'aquarium-innen', Component: AquariumHall, climbTrees: [], groundHeight: () => 0, ambience: 'aquarium-atmo'};
