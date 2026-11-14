import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {Instances, Sky, type Inst} from './Forest';
import {FarHouses, ParkLantern, TrashBin} from './Park';
import type {StageCam, StageDef} from './types';

/**
 * Drei Bühnen für das Spezial "Monstertruck" (wiederverwendbar). Alles am Tag, freundlich, ohne Logos/Marken.
 *
 * "wohnstrasse" (WOHNSTRASSE): Straße in einem Wohngebiet, entlang x bei z = 0 (Fahrbahn z −3.2 … 3.2, Mittellinie gestrichelt).
 *  - Hinten (−z) Parkstreifen z −3.2 … −5.6 mit weißen Parkbuchten (alle 5,6 m), Bordstein, Gehweg z −5.6 … −8.2, Vorgärten mit Hecken,
 *    Reihenhäuser in Pastellfarben ab z −13, Straßenbäume + Laternen auf dem Gehweg (x ±… alle 14 m, nicht bei |x| < 5).
 *  - Parkplatz des Dummy-Autos: WOHNSTRASSE.park (0, −4.4), Auto face 90 (Front nach +x). Gehweg-Platz daneben: WOHNSTRASSE.walk (0.6, −6.6).
 *  - Vorn (+z): Bordstein, schmaler Gehweg z 3.2 … 5.4, dann Wiese → Kameras frei.
 *
 * "museum" (MUSEUM): helle Museumshalle, weiße Wände, heller Holzboden. Rückwand z −5 (x −7 … 7), Seitenwände x ±7 (von außen
 *  unsichtbar → Kamera darf dahinter), Höhe 5,2. Platz für das große Kunstwerk: MUSEUM.frame (0, 2.75, −4.98) an der Rückwand,
 *  zwei Scheinwerfer an einer Deckenschiene strahlen darauf. Kordel-Absperrung davor (z −3.4, x −2.6 … 2.6), weitere stilisierte
 *  Fantasie-Bilder an den Seitenwänden, Sockel mit Skulptur, Sitzbank (0, 2.0). Vorn offen.
 *
 * "acker" (ACKER): matschiger Acker am Stadtrand. Furchen entlang x, Hügel (ACKER.hills, Bodenhöhe acker_height), dunkle
 *  Matschpfützen, Feldrand mit Gras, Bäume + Stadt-Silhouette (Häuser, Hochhäuser) im Hintergrund (−z). Verfolgungsweg entlang +x bei
 *  z ≈ 0 von x −40 bis 70. Vorn (z 8 … 30) flach → Kameras frei.
 */
export const WOHNSTRASSE = {park: [0, -4.4] as [number, number], walk: [0.6, -6.6] as [number, number], curb: -5.6, roadHalf: 3.2};
export const MUSEUM = {frame: [0, 2.75, -4.98] as [number, number, number], backZ: -5, halfW: 7, height: 5.2};
export const ACKER = {
  hills: [
    {x: -14, z: 1.0, h: 1.5, sx: 4.5, sz: 8},
    {x: 6, z: -0.5, h: 2.1, sx: 5.0, sz: 9},
    {x: 27, z: 0.5, h: 1.8, sx: 4.5, sz: 8},
    {x: 48, z: -1.0, h: 2.3, sx: 5.0, sz: 9},
  ],
};

/** Bodenhöhe auf dem Acker (Hügel + leichte Wellen). Gleiche Formel steht im Choreo-Skript (acker_height). */
export const ackerHeight = (x: number, z: number) => {
  let y = 0;
  for (const h of ACKER.hills) y += h.h * Math.exp(-((x - h.x) ** 2) / (2 * h.sx * h.sx) - ((z - h.z) ** 2) / (2 * h.sz * h.sz));
  y += 0.12 * Math.sin(x * 0.45) * Math.sin(z * 0.3 + 1);
  // vorn (Kamera-Bereich) flach auslaufen
  if (z > 10) y *= Math.max(0, 1 - (z - 10) / 6);
  return y;
};

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.85, flatShading: true, ...extra});

const DayLight = ({fog = '#e6e8e4', near = 50, far = 180, sun = [-14, 16, 12] as [number, number, number], shadow = 22}: {fog?: string; near?: number; far?: number; sun?: [number, number, number]; shadow?: number}) => (
  <>
    <color attach="background" args={[fog]} />
    <fog attach="fog" args={[fog, near, far]} />
    <Sky c={{skyTop: '#79b0e3', skyHorizon: '#eef0e8'}} />
    <hemisphereLight args={['#dbe8ff', '#6d6a5a', 1.2]} />
    <ambientLight intensity={0.45} color="#fff3df" />
    <directionalLight
      position={sun}
      intensity={2.2}
      color="#fff0d6"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-shadow}
      shadow-camera-right={shadow}
      shadow-camera-top={shadow}
      shadow-camera-bottom={-shadow}
      shadow-camera-near={1}
      shadow-camera-far={90}
      shadow-bias={-0.0006}
      shadow-normalBias={0.03}
    />
    <directionalLight position={[10, 8, -8]} intensity={0.6} color="#cfe0ff" />
  </>
);

const useTreeGeos = () =>
  useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
    trunk.translate(0, 0.5, 0);
    const crown = new THREE.IcosahedronGeometry(1, 0);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    return {trunk, crown, box, blade};
  }, []);
const LEAF = ['#4f7d35', '#5d8c3c', '#46702f', '#679a43'];

// ---------------------------------------------------------------------------------------------
// Wohnstraße
// ---------------------------------------------------------------------------------------------
const HOUSE_COLS = ['#f2d6b3', '#cfe3e8', '#f4c7c3', '#e8e2a8', '#d6e6c3', '#efe6da', '#c9d3ef'];
const ROOF_COLS = ['#9c4a35', '#7d4436', '#5d5f66', '#8a5a3a'];

const Terrace = ({seed}: {seed: number}) => {
  const items = useMemo(() => {
    const r = rng(seed);
    const out: {x: number; w: number; h: number; color: string; roof: string}[] = [];
    let x = -70;
    while (x < 80) {
      const w = 6.5 + r() * 2.5;
      out.push({x: x + w / 2, w, h: 6 + r() * 2.2, color: HOUSE_COLS[Math.floor(r() * HOUSE_COLS.length)], roof: ROOF_COLS[Math.floor(r() * ROOF_COLS.length)]});
      x += w + 0.05;
    }
    return out;
  }, [seed]);
  const m = useMemo(() => ({win: std('#5b7a96', {roughness: 0.3, metalness: 0.3}), frame: std('#f7f7f2'), door: std('#6a4a32'), step: std('#bdb7ad')}), []);
  return (
    <group position={[0, 0, -17]}>
      {items.map((h, i) => (
        <group key={i} position={[h.x, 0, 0]}>
          <mesh position={[0, h.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[h.w, h.h, 7]} />
            <meshStandardMaterial color={h.color} flatShading roughness={0.95} />
          </mesh>
          <mesh position={[0, h.h + 1.1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[7 * 0.62, 1.1, h.w * 0.53]} castShadow>
            <coneGeometry args={[1.4, 2, 4, 1]} />
            <meshStandardMaterial color={h.roof} flatShading />
          </mesh>
          {[-1, 1].map((s) =>
            [1.9, 4.6].map((y) => (
              <group key={`${s}${y}`} position={[s * h.w * 0.25, y, 3.51]}>
                <mesh material={m.frame}>
                  <boxGeometry args={[1.25, 1.35, 0.04]} />
                </mesh>
                <mesh material={m.win} position={[0, 0, 0.02]}>
                  <boxGeometry args={[1.05, 1.15, 0.03]} />
                </mesh>
              </group>
            )),
          )}
          <mesh material={m.door} position={[0, 1.05, 3.52]}>
            <boxGeometry args={[1.0, 2.1, 0.05]} />
          </mesh>
          <mesh material={m.step} position={[0, 0.08, 3.85]}>
            <boxGeometry args={[1.6, 0.16, 0.7]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const StreetScene = (_: {cam?: StageCam}) => {
  const g = useTreeGeos();
  const L = useMemo(() => {
    const r = rng(41);
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const hedges: Inst[] = [];
    const grass: Inst[] = [];
    for (let x = -63; x <= 70; x += 14) {
      if (Math.abs(x) < 5) continue;
      for (const z of [-7.4]) {
        const s = 0.9 + r() * 0.25;
        trunks.push({pos: [x, 0.12, z], scale: [0.22 * s, 2.6 * s, 0.22 * s], rotY: r() * 6, color: '#5a4230'});
        const col = LEAF[Math.floor(r() * 4)];
        crowns.push({pos: [x, 3.6 * s, z], scale: [1.7 * s, 1.6 * s, 1.7 * s], rotY: r() * 6, color: col});
        crowns.push({pos: [x + 0.5, 3.0 * s, z + 0.3], scale: [1.2 * s, 1.0 * s, 1.2 * s], rotY: r() * 6, color: col});
      }
    }
    for (let x = -70; x < 80; x += 2.2) {
      if (r() < 0.12) continue;
      const s = 0.7 + r() * 0.3;
      hedges.push({pos: [x, 0.45 * s, -9.4], scale: [1.3, 0.9 * s, 0.9], rotY: r() * 0.3, color: ['#4f7d35', '#5d8c3c', '#3f6a2c'][Math.floor(r() * 3)]});
    }
    for (let i = 0; i < 900; i++) {
      const x = -50 + r() * 110;
      const z = r() < 0.5 ? 5.8 + r() * 18 : -10 - r() * 3;
      const s = 0.1 + r() * 0.14;
      grass.push({pos: [x, 0, z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: ['#6f9e44', '#5f8e3a', '#86b456'][Math.floor(r() * 3)]});
    }
    return {trunks, crowns, hedges, grass};
  }, []);
  const m = useMemo(
    () => ({
      asphalt: std('#5d6166', {roughness: 0.95}),
      park: std('#53575c', {roughness: 0.95}),
      white: std('#eeeeea', {roughness: 0.6}),
      curb: std('#b9b6ae'),
      walk: std('#c7c2b8', {roughness: 0.95}),
      walk2: std('#b5afa4', {roughness: 0.95}),
      grass: std('#7fae4f', {roughness: 1}),
      sign: std('#2a64c8', {roughness: 0.5}),
      pole: std('#9aa0a6', {metalness: 0.5, roughness: 0.4}),
    }),
    [],
  );
  const curb = WOHNSTRASSE.curb;
  return (
    <>
      <DayLight />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={m.grass}>
        <planeGeometry args={[400, 400]} />
      </mesh>
      {/* Fahrbahn + Mittellinie */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.01, 0]} receiveShadow material={m.asphalt}>
        <planeGeometry args={[200, 6.4]} />
      </mesh>
      {Array.from({length: 40}, (_, i) => -95 + i * 5).map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, 0]} material={m.white}>
          <planeGeometry args={[2.4, 0.13]} />
        </mesh>
      ))}
      {/* Parkstreifen mit Buchten */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.012, (-3.2 + curb) / 2]} receiveShadow material={m.park}>
        <planeGeometry args={[200, -3.2 - curb]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.016, -3.25]} material={m.white}>
        <planeGeometry args={[200, 0.1]} />
      </mesh>
      {Array.from({length: 30}, (_, i) => -2.8 - 5.6 * 12 + i * 5.6).map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.016, (-3.2 + curb) / 2]} material={m.white}>
          <planeGeometry args={[0.1, -3.2 - curb - 0.1]} />
        </mesh>
      ))}
      {/* Bordsteine + Gehwege */}
      {[curb, 3.2].map((z) => (
        <mesh key={z} position={[5, 0.07, z + (z < 0 ? -0.1 : 0.1)]} material={m.curb} castShadow receiveShadow>
          <boxGeometry args={[200, 0.14, 0.22]} />
        </mesh>
      ))}
      <mesh position={[5, 0.06, curb - 1.4]} material={m.walk} receiveShadow>
        <boxGeometry args={[200, 0.12, 2.6]} />
      </mesh>
      <mesh position={[5, 0.06, 4.3]} material={m.walk} receiveShadow>
        <boxGeometry args={[200, 0.12, 2.0]} />
      </mesh>
      {Array.from({length: 70}, (_, i) => -95 + i * 3).map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.125, curb - 1.4]} material={m.walk2}>
          <planeGeometry args={[0.05, 2.6]} />
        </mesh>
      ))}
      {/* Vorgarten-Wiese */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.02, -11]} receiveShadow material={m.grass}>
        <planeGeometry args={[200, 5.6]} />
      </mesh>
      <Terrace seed={5} />
      <FarHouses z={-34} face={1} seed={9} day />
      <Instances geometry={g.trunk} items={L.trunks} />
      <Instances geometry={g.crown} items={L.crowns} />
      <Instances geometry={g.box} items={L.hedges} />
      <Instances geometry={g.blade} items={L.grass} castShadow={false} />
      {/* Laternen + Mülleimer auf dem Gehweg */}
      {[-56, -28, 14, 42, 70].map((x) => (
        <group key={x} position={[x, 0.12, -7.9]}>
          <ParkLantern light={false} />
        </group>
      ))}
      <group position={[-9, 0.12, -7.6]}>
        <TrashBin />
      </group>
      {/* Parken-Schild */}
      <group position={[-7.5, 0.12, -5.95]}>
        <mesh material={m.pole} position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
        </mesh>
        <mesh material={m.sign} position={[0, 2.25, 0.04]}>
          <boxGeometry args={[0.5, 0.5, 0.03]} />
        </mesh>
        <mesh material={m.white} position={[0, 2.25, 0.06]}>
          <boxGeometry args={[0.1, 0.34, 0.01]} />
        </mesh>
        <mesh material={m.white} position={[0.06, 2.36, 0.06]}>
          <boxGeometry args={[0.14, 0.12, 0.01]} />
        </mesh>
      </group>
    </>
  );
};

// ---------------------------------------------------------------------------------------------
// Museum
// ---------------------------------------------------------------------------------------------
/** Fantasie-Bild (Leinwand mit Formen), keine echten Kunstwerke */
const ArtPiece = ({w, h, kind}: {w: number; h: number; kind: number}) => {
  const m = useMemo(
    () => ({
      frame: std('#2b2b2e', {roughness: 0.5}),
      canvas: std(['#f3efe6', '#1f3b5c', '#f6e7c8'][kind % 3], {roughness: 0.95}),
      a: std(['#e2442f', '#f3bf12', '#2fae9c'][kind % 3], {roughness: 0.8}),
      b: std(['#2457c5', '#f6f2e8', '#c9417a'][kind % 3], {roughness: 0.8}),
    }),
    [kind],
  );
  return (
    <group>
      <mesh material={m.frame} position={[0, 0, 0.03]} castShadow>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.06]} />
      </mesh>
      <mesh material={m.canvas} position={[0, 0, 0.065]}>
        <boxGeometry args={[w, h, 0.01]} />
      </mesh>
      {kind === 0 && (
        <>
          <mesh material={m.a} position={[-w * 0.12, h * 0.08, 0.075]}>
            <circleGeometry args={[Math.min(w, h) * 0.3, 20]} />
          </mesh>
          <mesh material={m.b} position={[w * 0.2, -h * 0.2, 0.076]} rotation={[0, 0, 0.4]}>
            <planeGeometry args={[w * 0.35, h * 0.12]} />
          </mesh>
        </>
      )}
      {kind === 1 &&
        [0, 1, 2].map((i) => (
          <mesh key={i} material={i % 2 ? m.a : m.b} position={[0, h * (0.28 - i * 0.28), 0.075]} rotation={[0, 0, 0.1 * (i - 1)]}>
            <planeGeometry args={[w * 0.8, h * 0.12]} />
          </mesh>
        ))}
      {kind === 2 && (
        <>
          <mesh material={m.a} position={[0, -h * 0.05, 0.075]}>
            <circleGeometry args={[Math.min(w, h) * 0.32, 3]} />
          </mesh>
          <mesh material={m.b} position={[w * 0.18, h * 0.22, 0.076]}>
            <circleGeometry args={[Math.min(w, h) * 0.1, 12]} />
          </mesh>
        </>
      )}
    </group>
  );
};

const MuseumScene = (_: {cam?: StageCam}) => {
  const {halfW: X, backZ: Z, height: H} = MUSEUM;
  const m = useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({color: '#f7f6f2', roughness: 0.95, side: THREE.FrontSide}),
      floor: std('#d9c4a2', {roughness: 0.7, flatShading: false}),
      board: std('#c9b38f', {roughness: 0.7}),
      skirting: std('#e2e0da'),
      rail: std('#2a2b2e', {metalness: 0.5, roughness: 0.4}),
      lamp: std('#1f2023', {metalness: 0.4, roughness: 0.4}),
      lens: new THREE.MeshStandardMaterial({color: '#fff8e2', emissive: '#fff2c8', emissiveIntensity: 2}),
      post: std('#c9a24a', {metalness: 0.7, roughness: 0.3}),
      rope: std('#a3172e', {roughness: 0.7}),
      plinth: std('#fbfaf7'),
      sculpt: std('#2fae9c', {roughness: 0.35, metalness: 0.3}),
      bench: std('#3b3d42', {roughness: 0.6}),
      benchTop: std('#b48a5a', {roughness: 0.7}),
    }),
    [],
  );
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(MUSEUM.frame[0], MUSEUM.frame[1], MUSEUM.frame[2]);
    o.updateMatrixWorld();
    return o;
  }, []);
  const D = 16;
  return (
    <>
      <color attach="background" args={['#ecebe6']} />
      <hemisphereLight args={['#ffffff', '#b8a98c', 1.05]} />
      <ambientLight intensity={0.55} color="#fff6ea" />
      <directionalLight position={[3, 9, 8]} intensity={0.9} color="#fff3e0" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-bias={-0.0006} shadow-normalBias={0.03} />
      {/* Scheinwerfer auf das Kunstwerk */}
      <primitive object={target} />
      {[-2.2, 2.2].map((x) => (
        <spotLight key={x} position={[x, H - 0.4, Z + 3.2]} target={target} angle={0.42} penumbra={0.55} intensity={13} distance={14} decay={1.6} color="#fff1d0" />
      ))}
      {/* Boden mit Dielen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, Z + D / 2]} material={m.floor} receiveShadow>
        <planeGeometry args={[X * 2, D]} />
      </mesh>
      {Array.from({length: 28}, (_, i) => -X + 0.25 + i * 0.5).map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.002, Z + D / 2]} material={m.board}>
          <planeGeometry args={[0.02, D]} />
        </mesh>
      ))}
      {/* Rückwand + Seitenwände (Innenseite sichtbar) */}
      <mesh position={[0, H / 2, Z]} material={m.wall} receiveShadow>
        <planeGeometry args={[X * 2, H]} />
      </mesh>
      <mesh position={[-X, H / 2, Z + D / 2]} rotation={[0, Math.PI / 2, 0]} material={m.wall} receiveShadow>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh position={[X, H / 2, Z + D / 2]} rotation={[0, -Math.PI / 2, 0]} material={m.wall} receiveShadow>
        <planeGeometry args={[D, H]} />
      </mesh>
      <mesh position={[0, H, Z + D / 2]} rotation={[Math.PI / 2, 0, 0]} material={m.wall}>
        <planeGeometry args={[X * 2, D]} />
      </mesh>
      {/* Sockelleisten */}
      <mesh position={[0, 0.06, Z + 0.02]} material={m.skirting}>
        <boxGeometry args={[X * 2, 0.12, 0.04]} />
      </mesh>
      {/* Deckenschiene mit Strahlern */}
      <mesh position={[0, H - 0.25, Z + 3.2]} material={m.rail}>
        <boxGeometry args={[X * 2 - 1, 0.06, 0.08]} />
      </mesh>
      {[-5.2, -2.2, 2.2, 5.2].map((x) => (
        <group key={x} position={[x, H - 0.4, Z + 3.2]} rotation={[-0.75, 0, -x * 0.04]}>
          <mesh material={m.lamp} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 0.34, 10]} />
          </mesh>
          <mesh material={m.lens} position={[0, 0, -0.175]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.14, 12]} />
          </mesh>
        </group>
      ))}
      {/* weitere Bilder an den Seitenwänden */}
      <group position={[-X + 0.01, 2.4, Z + 3.2]} rotation={[0, Math.PI / 2, 0]}>
        <ArtPiece w={1.8} h={1.4} kind={0} />
      </group>
      <group position={[-X + 0.01, 2.2, Z + 7.0]} rotation={[0, Math.PI / 2, 0]}>
        <ArtPiece w={1.2} h={1.8} kind={1} />
      </group>
      <group position={[X - 0.01, 2.4, Z + 3.4]} rotation={[0, -Math.PI / 2, 0]}>
        <ArtPiece w={1.6} h={1.6} kind={2} />
      </group>
      <group position={[X - 0.01, 2.3, Z + 7.2]} rotation={[0, -Math.PI / 2, 0]}>
        <ArtPiece w={1.4} h={1.1} kind={0} />
      </group>
      {/* Kordel-Absperrung vor dem Kunstwerk */}
      {[-2.6, -0.87, 0.87, 2.6].map((x) => (
        <group key={x} position={[x, 0, Z + 1.55]}>
          <mesh material={m.post} position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.16, 0.18, 0.04, 12]} />
          </mesh>
          <mesh material={m.post} position={[0, 0.48, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.95, 8]} />
          </mesh>
          <mesh material={m.post} position={[0, 0.97, 0]}>
            <sphereGeometry args={[0.055, 8, 6]} />
          </mesh>
        </group>
      ))}
      {[-1.735, 0, 1.735].map((x) => (
        <mesh key={x} material={m.rope} position={[x, 0.93, Z + 1.55]} rotation={[0, 0, Math.PI]} scale={[1, 0.3, 1]}>
          <torusGeometry args={[0.87, 0.025, 5, 16, Math.PI]} />
        </mesh>
      ))}
      {/* Sockel mit Skulptur (links hinten) */}
      <group position={[-5.0, 0, Z + 1.6]}>
        <mesh material={m.plinth} position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.8, 1.1, 0.8]} />
        </mesh>
        <mesh material={m.sculpt} position={[0, 1.5, 0]} rotation={[0.4, 0.6, 0.2]} castShadow>
          <torusKnotGeometry args={[0.28, 0.08, 48, 6]} />
        </mesh>
      </group>
      {/* Sitzbank */}
      <group position={[0, 0, Z + 7.6]}>
        <mesh material={m.benchTop} position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[2.4, 0.08, 0.6]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.bench} position={[s * 1.0, 0.21, 0]}>
            <boxGeometry args={[0.08, 0.42, 0.5]} />
          </mesh>
        ))}
      </group>
    </>
  );
};

// ---------------------------------------------------------------------------------------------
// Acker am Stadtrand
// ---------------------------------------------------------------------------------------------
const FieldScene = (_: {cam?: StageCam}) => {
  const g = useTreeGeos();
  const ground = useMemo(() => {
    const geo = new THREE.PlaneGeometry(260, 150, 160, 80);
    geo.rotateX(-Math.PI / 2);
    geo.translate(15, 0, -25);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const cols: number[] = [];
    const r = rng(12);
    const mud = new THREE.Color('#6b4a2e');
    const mud2 = new THREE.Color('#5a3d25');
    const grass = new THREE.Color('#7a9a45');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const furrow = 0.06 * Math.sin(z * 4.2);
      pos.setY(i, ackerHeight(x, z) + furrow - 0.02);
      const edge = z < -36 || z > 22 || x < -70 || x > 95;
      const c = edge ? grass.clone() : (Math.sin(z * 4.2) > 0 ? mud : mud2).clone();
      c.offsetHSL(0, 0, (r() - 0.5) * 0.04);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);
  const L = useMemo(() => {
    const r = rng(23);
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const clods: Inst[] = [];
    const tufts: Inst[] = [];
    for (let i = 0; i < 60; i++) {
      const x = -90 + r() * 200;
      const z = -40 - r() * 12;
      const s = 1 + r() * 0.6;
      trunks.push({pos: [x, 0, z], scale: [0.25 * s, 2.6 * s, 0.25 * s], rotY: r() * 6, color: '#5a4230'});
      const col = LEAF[Math.floor(r() * 4)];
      crowns.push({pos: [x, 3.7 * s, z], scale: [1.8 * s, 1.7 * s, 1.8 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + (r() - 0.5) * 1.4, 3.0 * s, z + (r() - 0.5)], scale: [1.3 * s, 1.1 * s, 1.3 * s], rotY: r() * 6, color: col});
    }
    for (let i = 0; i < 700; i++) {
      const x = -60 + r() * 140;
      const z = -30 + r() * 48;
      const s = 0.06 + r() * 0.12;
      clods.push({pos: [x, ackerHeight(x, z) + s * 0.3, z], scale: [s * 1.4, s * 0.7, s], rotY: r() * 6, color: ['#5a3d25', '#7a5634', '#4b3320'][Math.floor(r() * 3)]});
    }
    for (let i = 0; i < 500; i++) {
      const x = -60 + r() * 140;
      const z = r() < 0.5 ? 22 + r() * 6 : -36 - r() * 4;
      const s = 0.15 + r() * 0.2;
      tufts.push({pos: [x, 0, z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: ['#6f9e44', '#86b456', '#5f8e3a'][Math.floor(r() * 3)]});
    }
    return {trunks, crowns, clods, tufts};
  }, []);
  const puddles = useMemo(() => {
    const r = rng(31);
    const out: {x: number; z: number; w: number; d: number; rot: number}[] = [];
    for (const [x, z] of [[-4, 1.5], [17, -0.8], [38, 1.2], [-26, -1.5], [60, 0.4], [-4, -6], [17, 6], [38, -7], [8, 12], [-20, 9]] as [number, number][])
      out.push({x, z, w: 3.5 + r() * 3, d: 2 + r() * 1.8, rot: r() * 3});
    return out;
  }, []);
  const m = useMemo(
    () => ({
      ground: new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, flatShading: true}),
      puddle: new THREE.MeshStandardMaterial({color: '#3f2a18', roughness: 0.12, metalness: 0.2}),
      tower: std('#c9cfd6', {roughness: 0.8}),
      tower2: std('#aeb6c0', {roughness: 0.8}),
      win: std('#6d8aa6', {roughness: 0.3, metalness: 0.3}),
    }),
    [],
  );
  return (
    <>
      <DayLight near={60} far={220} shadow={28} />
      <mesh geometry={ground} material={m.ground} receiveShadow />
      {puddles.map((p, i) => (
        <mesh key={i} material={m.puddle} position={[p.x, ackerHeight(p.x, p.z) + 0.03, p.z]} rotation={[-Math.PI / 2, 0, p.rot]} scale={[p.w, p.d, 1]}>
          <circleGeometry args={[0.5, 12]} />
        </mesh>
      ))}
      <Instances geometry={g.crown} items={L.clods} castShadow={false} />
      <Instances geometry={g.blade} items={L.tufts} castShadow={false} />
      <Instances geometry={g.trunk} items={L.trunks} />
      <Instances geometry={g.crown} items={L.crowns} />
      {/* Stadtrand: Häuser + Hochhäuser */}
      <FarHouses z={-58} face={1} seed={17} day />
      {[-50, -22, 4, 30, 62, 88].map((x, i) => (
        <group key={x} position={[x, 0, -72 - (i % 2) * 8]}>
          <mesh material={i % 2 ? m.tower : m.tower2} position={[0, (18 + (i % 3) * 7) / 2, 0]}>
            <boxGeometry args={[9, 18 + (i % 3) * 7, 8]} />
          </mesh>
          {Array.from({length: 5 + (i % 3) * 2}, (_, k) => (
            <mesh key={k} material={m.win} position={[0, 2.5 + k * 3.2, 4.02]}>
              <boxGeometry args={[7.2, 1.2, 0.04]} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
};

/** Gehwege liegen 0,12 m höher als die Fahrbahn */
export const streetHeight = (_x: number, z: number) => ((z < WOHNSTRASSE.curb - 0.05 && z > WOHNSTRASSE.curb - 2.75) || (z > 3.25 && z < 5.3) ? 0.12 : 0);
export const streetHomeStage: StageDef = {id: 'wohnstrasse', Component: StreetScene, climbTrees: [], groundHeight: streetHeight, ambience: 'wald-atmo'};
export const museumStage: StageDef = {id: 'museum', Component: MuseumScene, climbTrees: [], groundHeight: () => 0, ambience: 'museum-atmo'};
export const fieldStage: StageDef = {id: 'acker', Component: FieldScene, climbTrees: [], groundHeight: ackerHeight, ambience: 'wald-atmo'};
