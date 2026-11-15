import {useLayoutEffect, useMemo, useRef} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {drumTexture, LaundryBasket, SOCK_COLORS, sockCuffGeometry, sockGeometry, SoftenerBottle} from '../actors/WaschProps';
import {YogurtCup} from '../actors/WgProps';
import {Room, std, tileTexture} from './Rooms';
import type {StageDef} from './types';

/**
 * Spezial „Waschmaschine“ – zwei Bühnen:
 *
 * "waschkeller" (WASCH): heller Waschkeller, W 5.6, D 5.0 (Rückwand z −2.5), H 3.3. Graue Bodenfliesen, Wände hell gestrichen,
 *   halbhoch gefliest. Platz für die XXL-Waschmaschine (Objekt "waschmaschine") bei WASCH.machine (0.5, −1.45), face 180 →
 *   Front bei z −0.45, Bullauge-Mitte (0.5, 1.25, −0.38), Trommelboden y 0.43. Links Wäschekorb (fest), Regal mit Waschmittel-
 *   Kartons (ohne Aufdruck) + Weichspüler, Rohre an der Rückwand, kleines Kellerfenster links oben, Glühbirne an der Decke,
 *   Bodenablauf. Vorn (z > 0) frei für Figuren + Kamera.
 *
 * "trommel-innen" (TROMMEL): das Innere der Waschmaschine als riesige Höhle – viel größer als die Maschine von außen.
 *   Lochblech-Zylinder Radius 14 (Achse entlang z, Boden y = 0 bei x = 0, Boden steigt seitlich: groundHeight), Rückwand z −34,
 *   vorn bei z 15 das riesige Bullauge (Glas-Ring, Licht fällt herein). Sockenberge links/rechts, Sockenteppich auf dem Weg
 *   (x −2.6 … 2.6, z −9 … 12), dazu riesige verlorene Dinge: Knöpfe, Münzen (ohne Motiv), Haargummis, Kassenzettel (ohne Namen),
 *   Taschentuch-Fetzen, Löffel, leerer Joghurtbecher. Am Ende des Wegs ein kleiner Sockenhügel (TROMMEL.treasure) für die
 *   Lieblingssocke. Dunstig, warmes Licht von vorn.
 */
export const WASCH = {W: 5.6, D: 5.0, H: 3.3, machine: [0.5, -1.45] as [number, number], basket: [-1.75, -1.0] as [number, number]};
export const TROMMEL = {R: 14, front: 15, back: -34, treasure: [0.4, -7.2] as [number, number]};

const drumGround = (x: number) => {
  const R = TROMMEL.R;
  const ax = Math.min(Math.abs(x), R - 0.2);
  return R - Math.sqrt(R * R - ax * ax);
};

// ---------------- Waschkeller ----------------
const LaundryRoomScene = () => {
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tileTexture('#9aa0a6', '#7b8187', [10, 22]), roughness: 0.55}),
      wall: std('#efe9dc', {roughness: 0.9}),
      tiles: new THREE.MeshStandardMaterial({map: tileTexture('#dfe9ec', '#b9c7cc', [14, 4]), roughness: 0.4}),
      pipe: std('#c9ced3', {metalness: 0.6, roughness: 0.3}),
      pipeCu: std('#c98a55', {metalness: 0.6, roughness: 0.35}),
      shelf: std('#a7835c'),
      metal: std('#7b838a', {metalness: 0.5, roughness: 0.4}),
    }),
    [],
  );
  const {W, D, H} = WASCH;
  const boxes: [number, string, number][] = [[-0.45, '#f08a5d', 0.36], [-0.05, '#5fb3e0', 0.3], [0.32, '#8fd17a', 0.34]];
  return (
    <Room
      W={W}
      D={D}
      H={H}
      floor={mats.floor}
      wall={mats.wall}
      ceiling="#f3efe6"
      window={{side: -1, z: -0.4, w: 0.9, y: 2.35, h: 0.55, sky: '#cfe6f5'}}
      light={{ambient: 0.55, hemi: 0.7, sun: 1.2, sunColor: '#fff1dc', lamp: 7, lampColor: '#ffe9c8'}}
      sunPos={[2.5, 4.5, 5]}
      ceilingLamp={false}
    >
      {/* halbhohe Fliesen an Rück- und Seitenwänden */}
      <mesh material={mats.tiles} position={[0, 0.6, -D / 2 + 0.01]}>
        <planeGeometry args={[W, 1.2]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.tiles} position={[(s * W) / 2 - s * 0.01, 0.6, 0]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[D, 1.2]} />
        </mesh>
      ))}
      {/* Rohre an der Rückwand */}
      <mesh material={mats.pipe} position={[0, 3.0, -D / 2 + 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, W, 10]} />
      </mesh>
      <mesh material={mats.pipeCu} position={[0, 2.82, -D / 2 + 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, W, 8]} />
      </mesh>
      <mesh material={mats.pipe} position={[-2.2, 1.65, -D / 2 + 0.12]}>
        <cylinderGeometry args={[0.06, 0.06, 2.7, 10]} />
      </mesh>
      {/* Glühbirne an der Decke */}
      <group position={[0.2, H, 0.2]}>
        <mesh material={mats.metal} position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
        </mesh>
        <mesh position={[0, -0.36, 0]}>
          <sphereGeometry args={[0.08, 12, 10]} />
          <meshStandardMaterial color="#fff6dc" emissive="#ffe6a8" emissiveIntensity={2.2} />
        </mesh>
      </group>
      {/* Regal links an der Rückwand mit Waschmittel-Kartons (ohne Aufdruck) + Weichspüler */}
      <group position={[-1.65, 0, -D / 2 + 0.25]}>
        {[0.9, 1.6].map((y) => (
          <mesh key={y} material={mats.shelf} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.04, 0.4]} />
          </mesh>
        ))}
        {[-0.72, 0.72].map((x) => (
          <mesh key={x} material={mats.metal} position={[x, 0.85, -0.15]}>
            <boxGeometry args={[0.03, 1.7, 0.03]} />
          </mesh>
        ))}
        {boxes.map(([x, c, h]) => (
          <mesh key={x} position={[x, 0.92 + h / 2, 0]} castShadow>
            <boxGeometry args={[0.3, h, 0.22]} />
            <meshStandardMaterial color={c} flatShading roughness={0.7} />
          </mesh>
        ))}
        <group position={[0.15, 1.62, 0.02]}>
          <SoftenerBottle />
        </group>
        <group position={[-0.3, 1.62, 0.02]} scale={0.85}>
          <SoftenerBottle />
        </group>
        {/* Wäscheklammern-Dose */}
        <mesh position={[0.55, 1.7, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.16, 12]} />
          <meshStandardMaterial color="#f4c542" flatShading />
        </mesh>
      </group>
      {/* Wäschekorb */}
      <group position={[WASCH.basket[0], 0, WASCH.basket[1]]} rotation={[0, 0.35, 0]}>
        <LaundryBasket />
      </group>
      {/* Bodenablauf */}
      <mesh material={mats.metal} position={[-0.6, 0.005, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.12, 16]} />
      </mesh>
      {/* Badematte vor der Maschine */}
      <mesh position={[0.5, 0.006, 0.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.3, 0.7]} />
        <meshStandardMaterial color="#7cc6c9" roughness={1} />
      </mesh>
    </Room>
  );
};

// ---------------- Trommel innen (riesig) ----------------
type Inst = {pos: [number, number, number]; rot: [number, number, number]; scale: number; color: string};
const Instanced = ({geometry, items, roughness = 1, side = THREE.FrontSide, colorOverride}: {geometry: THREE.BufferGeometry; items: Inst[]; roughness?: number; side?: THREE.Side; colorOverride?: string}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(...it.pos);
      o.rotation.set(...it.rot);
      o.scale.setScalar(it.scale);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, new THREE.Color(colorOverride ?? it.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items, colorOverride]);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial flatShading roughness={roughness} side={side} />
    </instancedMesh>
  );
};

/** Sockenberge: (x, z, Radius, Höhe) */
const MOUNDS: [number, number, number, number][] = [
  [-5.2, 6.5, 2.6, 2.2], [5.6, 4.2, 3.0, 2.8], [-6.5, -1.5, 3.4, 3.4], [4.8, -3.2, 2.4, 1.9], [-3.8, -9.5, 2.8, 2.5],
  [6.2, -11.5, 3.6, 3.6], [-8.5, -16, 4.5, 4.5], [2.5, -18, 3.6, 3.2], [9.5, -20, 4.8, 4.2], [-3.5, -24, 4.2, 4.0], [0.4, -7.2, 1.3, 0.75],
];
const moundHeight = (x: number, z: number) => {
  let h = 0;
  for (const [mx, mz, r, hh] of MOUNDS) {
    const d = Math.hypot(x - mx, z - mz) / r;
    if (d < 1) h = Math.max(h, hh * Math.sqrt(1 - d * d));
  }
  return h;
};

/** Stoff-Muster für die Sockenberge (viele bunte Socken-Striche) */
const moundTexture = () => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6d6478';
  g.fillRect(0, 0, 256, 256);
  const r = rng(9);
  g.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = SOCK_COLORS[Math.floor(r() * SOCK_COLORS.length)];
    g.lineWidth = 9 + r() * 6;
    const x = r() * 256;
    const y = r() * 256;
    const a = r() * Math.PI * 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22);
    g.lineTo(x + Math.cos(a) * 22 + Math.cos(a + 1.6) * 12, y + Math.sin(a) * 22 + Math.sin(a + 1.6) * 12);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
};

const DrumHallScene = ({cam}: {cam?: {pos: [number, number, number]}}) => {
  void cam;
  const frame = useCurrentFrame();
  const t = frame / 30;
  const {R, front, back} = TROMMEL;
  const len = front - back;
  const mats = useMemo(
    () => ({
      drum: new THREE.MeshStandardMaterial({map: drumTexture([70, 22], '#3f464d', '#aeb6bd'), roughness: 0.45, metalness: 0.5, side: THREE.BackSide}),
      back: new THREE.MeshStandardMaterial({map: drumTexture([28, 28], '#3f464d', '#aeb6bd'), roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide}),
      rib: std('#c8cfd5', {metalness: 0.65, roughness: 0.3}),
      hub: std('#d6dce1', {metalness: 0.7, roughness: 0.25}),
      ring: std('#f4f5f3', {roughness: 0.35}),
      rubber: std('#5d6266', {roughness: 0.9}),
      glass: new THREE.MeshBasicMaterial({color: '#fff3d6', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide}),
      beam: new THREE.MeshBasicMaterial({color: '#fff1cc', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide}),
      gold: std('#e8b923', {metalness: 0.85, roughness: 0.25}),
      silver: std('#cfd5da', {metalness: 0.85, roughness: 0.25}),
      paper: new THREE.MeshStandardMaterial({color: '#f6f4ee', roughness: 0.9, side: THREE.DoubleSide, flatShading: true}),
      tissue: std('#ffffff', {roughness: 1}),
      spoon: std('#d4d9de', {metalness: 0.85, roughness: 0.2}),
      dark: std('#2a2e33'),
    }),
    [],
  );
  const socks = useMemo(() => {
    const r = rng(2016);
    const items: Inst[] = [];
    const add = (x: number, y: number, z: number, s = 2.6) =>
      items.push({pos: [x, y, z], rot: [r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2], scale: s * (0.85 + r() * 0.3), color: SOCK_COLORS[Math.floor(r() * SOCK_COLORS.length)]});
    // Sockenberge
    for (const [mx, mz, rad, hh] of MOUNDS) {
      const n = Math.round(rad * rad * 9);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * rad;
        const x = mx + Math.cos(a) * d;
        const z = mz + Math.sin(a) * d;
        add(x, drumGround(x) + moundHeight(x, z) - 0.05 - r() * 0.15, z);
      }
    }
    // Sockenteppich auf dem Weg + überall verstreut
    for (let i = 0; i < 520; i++) {
      const x = (r() - 0.5) * 6.4;
      const z = -10 + r() * 24;
      add(x, drumGround(x) + 0.08 + r() * 0.18, z, 2.4);
    }
    for (let i = 0; i < 380; i++) {
      const x = (r() - 0.5) * 22;
      const z = back + 2 + r() * (len - 4);
      add(x, drumGround(x) + 0.05, z, 2.4);
    }
    return items;
  }, [back, len]);
  const sockGeo = useMemo(() => sockGeometry(8), []);
  const cuffGeo = useMemo(() => sockCuffGeometry(8), []);
  const moundMat = useMemo(() => new THREE.MeshStandardMaterial({map: moundTexture(), roughness: 1, flatShading: true}), []);
  // Verlorene Dinge (riesig): Typ, x, z, Drehung, Farbe
  const things = useMemo(() => {
    const r = rng(77);
    const list: {kind: string; x: number; z: number; rot: number; tilt: number; color: string}[] = [];
    const put = (kind: string, x: number, z: number, color = '#ffffff', tilt = 0) => list.push({kind, x, z, rot: r() * Math.PI * 2, tilt, color});
    // entlang des Wegs (sichtbar in den nahen Einstellungen), dazu einige weiter weg
    put('button', -1.5, 5.6, '#e2574c', 0.2); put('coin', 1.4, 4.4, 'gold', 0.3); put('hairtie', -1.2, 7.6, '#ff7eb3');
    put('coin', -1.35, 1.1, 'gold', 0.35); put('hairtie', 1.0, 0.3, '#b98ad8'); put('coin', -0.95, -0.7, 'silver', 0.15); put('button', 1.5, 1.9, '#4aa3df', 0.1);
    put('button', -2.8, -2.2, '#f4c542', 0.35); put('coin', 3.6, -6.5, 'silver', 0.3); put('coin', -4.2, 1.5, 'gold', 0.9); put('button', 2.2, -9.5, '#2f3542', 0.2);
    put('button', -5.5, 10.5, '#7bc67b', 0.6); put('hairtie', -1.9, -3.4, '#2f3542'); put('coin', 2.6, 9.6, 'gold', 0.2);
    put('receipt', -3.2, 5.4); put('receipt', 2.9, -0.8); put('receipt', -2.4, -7.8);
    put('tissue', 2.4, 6.4); put('tissue', -3.0, -5.6);
    return list;
  }, []);
  const RIB_A = [Math.PI, Math.PI / 3, -Math.PI / 3];
  return (
    <>
      <color attach="background" args={['#20262c']} />
      <fog attach="fog" args={['#262c32', 40, 110]} />
      <ambientLight intensity={0.45} color="#dfe8f0" />
      <hemisphereLight args={['#fff3dd', '#4a5058', 0.7]} />
      <directionalLight position={[3, 16, front + 6]} intensity={2.0} color="#ffe9c8" castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={16} shadow-camera-bottom={-14}
        shadow-camera-near={1} shadow-camera-far={70} shadow-bias={-0.0005} shadow-normalBias={0.04} />
      <pointLight position={[0, 6, 6]} intensity={30} distance={30} decay={1.5} color="#ffe2b8" />
      <pointLight position={[TROMMEL.treasure[0], 4, TROMMEL.treasure[1] + 1.5]} intensity={14} distance={10} decay={1.6} color="#fff0c0" />
      {/* Lochblech-Zylinder */}
      <mesh material={mats.drum} position={[0, R, (front + back) / 2]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[R, R, len, 72, 1, true]} />
      </mesh>
      <mesh material={mats.back} position={[0, R, back]}>
        <circleGeometry args={[R, 72]} />
      </mesh>
      <mesh material={mats.hub} position={[0, R, back + 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.6, 3.2, 0.6, 32]} />
      </mesh>
      {RIB_A.map((a, i) => (
        <mesh key={i} material={mats.rib} position={[Math.sin(a) * (R - 0.8), R - Math.cos(a) * (R - 0.8), (front + back) / 2]} rotation={[0, 0, -a]}>
          <boxGeometry args={[2.6, 1.8, len]} />
        </mesh>
      ))}
      {/* vorn: das riesige Bullauge (Gummi-Ring + leuchtendes Glas) + Lichtkegel */}
      <group position={[0, R * 0.62, front]}>
        <mesh material={mats.rubber}>
          <torusGeometry args={[7.2, 0.7, 12, 64]} />
        </mesh>
        <mesh material={mats.ring} position={[0, 0, 0.9]}>
          <torusGeometry args={[7.6, 0.9, 12, 64]} />
        </mesh>
        <mesh material={mats.glass} position={[0, 0, 0.3]}>
          <circleGeometry args={[7.1, 48]} />
        </mesh>
      </group>
      <mesh material={mats.beam} position={[0, 5.5, front - 8]} rotation={[Math.PI / 2 + 0.25, 0, 0]}>
        <cylinderGeometry args={[6.5, 3.5, 16, 24, 1, true]} />
      </mesh>
      {/* Sockenberge: bunter Stoff-Hügel unter den Socken */}
      {MOUNDS.map(([mx, mz, rad, hh], i) => (
        <mesh key={i} material={moundMat} position={[mx, drumGround(mx) - 0.1, mz]} scale={[rad, hh * 0.97, rad]} castShadow receiveShadow>
          <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      ))}
      {/* Socken */}
      <Instanced geometry={sockGeo} items={socks} />
      <Instanced geometry={cuffGeo} items={socks} colorOverride="#f4f1e6" side={THREE.DoubleSide} />
      {/* verlorene Dinge */}
      {things.map((it, i) => {
        const y = drumGround(it.x) + moundHeight(it.x, it.z);
        return (
          <group key={i} position={[it.x, y, it.z]} rotation={[0, it.rot, 0]}>
            {it.kind === 'coin' && (
              <group rotation={[it.tilt, 0, 0]} position={[0, 0.15 + Math.sin(it.tilt) * 0.5, 0]}>
                <mesh material={it.color === 'gold' ? mats.gold : mats.silver} castShadow>
                  <cylinderGeometry args={[0.6, 0.6, 0.1, 28]} />
                </mesh>
                <mesh material={it.color === 'gold' ? mats.gold : mats.silver} position={[0, 0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.5, 0.035, 6, 28]} />
                </mesh>
              </group>
            )}
            {it.kind === 'button' && (
              <group rotation={[it.tilt, 0, 0]} position={[0, 0.12 + Math.sin(it.tilt) * 0.45, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.48, 0.48, 0.12, 24]} />
                  <meshStandardMaterial color={it.color} roughness={0.35} flatShading />
                </mesh>
                <mesh position={[0, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.38, 0.04, 6, 24]} />
                  <meshStandardMaterial color={it.color} roughness={0.35} flatShading />
                </mesh>
                {[[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]].map(([x, z], j) => (
                  <mesh key={j} material={mats.dark} position={[x, 0.062, z]}>
                    <cylinderGeometry args={[0.06, 0.06, 0.01, 10]} />
                  </mesh>
                ))}
              </group>
            )}
            {it.kind === 'hairtie' && (
              <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2 - 0.15, 0, 0]} castShadow>
                <torusGeometry args={[0.5, 0.08, 8, 28]} />
                <meshStandardMaterial color={it.color} roughness={0.6} flatShading />
              </mesh>
            )}
            {it.kind === 'receipt' && <Receipt mat={mats.paper} />}
            {it.kind === 'tissue' && (
              <group position={[0, 0.25, 0]}>
                {[[0, 0, 0, 0.42], [0.3, -0.05, 0.15, 0.3], [-0.25, -0.08, -0.1, 0.32]].map(([x, yy, z, s], j) => (
                  <mesh key={j} material={mats.tissue} position={[x, yy, z]} scale={[s, s * 0.7, s]} rotation={[j, j * 1.3, 0]} castShadow>
                    <icosahedronGeometry args={[1, 0]} />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        );
      })}
      {/* riesiger Löffel + leerer Joghurtbecher */}
      <group position={[2.6, drumGround(2.6) + 0.25, 3.0]} rotation={[0.05, -0.9, 0]}>
        <mesh material={mats.spoon} position={[0, 0, 0.9]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <boxGeometry args={[0.18, 2.2, 0.06]} />
        </mesh>
        <mesh material={mats.spoon} position={[0, 0.05, -0.55]} scale={[1, 0.28, 1.35]} castShadow>
          <sphereGeometry args={[0.42, 16, 10]} />
        </mesh>
      </group>
      <group position={[-3.1, drumGround(-3.1) + 0.55, 2.6]} rotation={[0, 0.7, 1.4]} scale={9}>
        <YogurtCup lid={1} fill={0.01} />
      </group>
      {/* sanfte Staubkörnchen im Licht */}
      {Array.from({length: 26}).map((_, i) => {
        const r = rng(500 + i);
        const x = (r() - 0.5) * 10;
        const z = -8 + r() * 20;
        const y = 1.5 + ((r() * 6 + t * 0.15) % 6);
        return (
          <mesh key={i} position={[x + Math.sin(t * 0.3 + i) * 0.3, y, z]}>
            <sphereGeometry args={[0.035, 6, 4]} />
            <meshBasicMaterial color="#fff6dc" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
};

/** Kassenzettel (riesig, leicht eingerollt, nur Striche – kein Name, keine echten Preise) */
const Receipt = ({mat}: {mat: THREE.Material}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.7, 1.9, 1, 12);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      p.setY(i, 0.05 + Math.max(0, z - 0.4) ** 2 * 0.9);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const lines = useMemo(() => std('#8a9096'), []);
  return (
    <group>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {[-0.6, -0.4, -0.2, 0.0, 0.2].map((z, i) => (
        <mesh key={i} material={lines} position={[i % 2 ? -0.08 : 0.04, 0.056, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[i % 2 ? 0.42 : 0.5, 0.04]} />
        </mesh>
      ))}
    </group>
  );
};

export const laundryRoomStage: StageDef = {id: 'waschkeller', Component: LaundryRoomScene, climbTrees: [], groundHeight: () => 0, ambience: 'keller-atmo'};
export const drumHallStage: StageDef = {id: 'trommel-innen', Component: DrumHallScene, climbTrees: [], groundHeight: (x: number, z: number) => drumGround(x) + (Math.hypot(x - TROMMEL.treasure[0], z - TROMMEL.treasure[1]) < 1.3 ? moundHeight(x, z) : 0), ambience: 'trommel-atmo'};
