import {useMemo, type ReactNode} from 'react';
import * as THREE from 'three';
import {FirstAidKit} from '../actors/FirstAidProps';
import type {StageDef} from './types';

/**
 * Innenraum-Baukasten: Raum mit Boden, drei Wänden (vorn offen – dort steht die Kamera), Decke, Fenster, Licht.
 * Daraus entstehen die Bühnen
 *  - "badezimmer": hell, gefliest, Waschtisch-Platz an der Rückwand (Waschbecken ist ein eigenes Objekt
 *    "waschbecken", siehe actors/FirstAidProps.tsx), Spiegel, Badewanne, Erste-Hilfe-Schrank, Handtuch.
 *  - "wohnzimmer": gemütlich, Sofa an der Rückwand, Teppich, Stehlampe, Pflanze, Regal, Fenster
 *    (Kalender "kalender" und Wanduhr "wanduhr" sind eigene Objekte).
 *  - "arztpraxis": hell, Schreibtisch mit Bildschirm, Arztstuhl + Patientenstuhl, Liege, Sehtafel, Schrank.
 * Koordinaten: Boden y = 0, Raum x −W/2 … W/2, Rückwand bei z = −D/2, vorn (+z) offen. Kamera im Raum halten
 * (z < D/2, |x| < W/2 − 0.3), sonst sieht man die Wände von außen.
 */

export const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.75, flatShading: true, ...extra});

/** Fliesen-Bild (wiederholt sich) */
export const tileTexture = (fill: string, grout: string, repeat: [number, number]) => {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = grout;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = fill;
  g.fillRect(3, 3, 122, 122);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
};

/** Holzdielen-Bild */
export const plankTexture = (repeat: [number, number]) => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const cols = ['#b88655', '#a9784a', '#c29261', '#ae7d4e'];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = cols[i % 4];
    g.fillRect(0, i * 32, 256, 32);
    g.fillStyle = 'rgba(60,35,15,0.5)';
    g.fillRect(0, i * 32, 256, 2);
    g.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  return t;
};

type RoomCfg = {
  W: number;
  D: number;
  H: number;
  floor: THREE.Material;
  wall: THREE.Material;
  /** Rückwand anders (z. B. Fliesen) */
  backWall?: THREE.Material;
  ceiling: string;
  /** Fenster in der linken (−x) oder rechten (+x) Wand: Mitte z, Breite, Unterkante, Höhe */
  window?: {side: 1 | -1; z: number; w: number; y: number; h: number; sky: string; /** offen: kein Mittelsteg, ein Flügel steht nach innen offen */ open?: boolean};
  light: {ambient: number; hemi: number; sun: number; sunColor: string; lamp: number; lampColor: string};
  children?: ReactNode;
  /** false = keine Standard-Wände (der Raum baut eigene Wände mit Öffnungen, siehe HoleWall) */
  walls?: boolean;
  /** Hintergrundfarbe (sonst hellblau) */
  bg?: string;
  /** Position der Hauptlampe (Licht von "draußen"), sonst automatisch */
  sunPos?: [number, number, number];
  /** Deckenleuchte zeigen */
  ceilingLamp?: boolean;
};

export const Room = ({W, D, H, floor, wall, backWall, ceiling, window, light, children, walls = true, bg = '#dde6ee', sunPos, ceilingLamp = true}: RoomCfg) => {
  const winX = window ? (window.side * W) / 2 : 0;
  return (
    <>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={light.ambient} color="#fff6ea" />
      <hemisphereLight args={['#fffaf0', '#8a7c6c', light.hemi]} />
      <directionalLight
        position={sunPos ?? [window ? winX * 3 : 3, 4.5, window ? window.z + 1.5 : 3]}
        intensity={light.sun}
        color={light.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <pointLight position={[0, H - 0.35, 0]} intensity={light.lamp} color={light.lampColor} distance={12} decay={1.4} />
      <pointLight position={[0, 1.8, D / 2 - 0.3]} intensity={light.lamp * 0.45} color="#fff3e2" distance={9} decay={1.6} />
      {/* Boden */}
      <mesh material={floor} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D + 6]} />
      </mesh>
      {/* Rückwand, Seitenwände, Decke */}
      {walls && (<>
      <mesh material={backWall ?? wall} position={[0, H / 2, -D / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          {window && window.side === s ? (
            <>
              {/* Wand um das Fenster herum (4 Teile) */}
              <mesh material={wall} position={[(s * W) / 2, H / 2, (-D / 2 + window.z - window.w / 2) / 2]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[window.z - window.w / 2 + D / 2, H]} />
              </mesh>
              <mesh material={wall} position={[(s * W) / 2, H / 2, (D / 2 + 6 + window.z + window.w / 2) / 2]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[D / 2 + 6 - window.z - window.w / 2, H]} />
              </mesh>
              <mesh material={wall} position={[(s * W) / 2, window.y / 2, window.z]} rotation={[0, -s * Math.PI / 2, 0]}>
                <planeGeometry args={[window.w, window.y]} />
              </mesh>
              <mesh material={wall} position={[(s * W) / 2, (H + window.y + window.h) / 2, window.z]} rotation={[0, -s * Math.PI / 2, 0]}>
                <planeGeometry args={[window.w, H - window.y - window.h]} />
              </mesh>
              {/* Himmel hinter dem Fenster + Rahmen */}
              <mesh position={[(s * W) / 2 + s * 1.4, window.y + window.h / 2, window.z]} rotation={[0, -s * Math.PI / 2, 0]}>
                <planeGeometry args={[window.w + 3, window.h + 3]} />
                <meshBasicMaterial color={window.sky} />
              </mesh>
              {[
                [0, window.h / 2 + 0.03, window.w + 0.12, 0.08],
                [0, -window.h / 2 - 0.03, window.w + 0.12, 0.08],
                ...(window.open ? [] : [[0, 0, 0.06, window.h]]),
              ].map(([dz, dy, w, h], i) => (
                <mesh key={i} position={[(s * W) / 2 - s * 0.03, window.y + window.h / 2 + dy, window.z + dz]} rotation={[0, -s * Math.PI / 2, 0]}>
                  <boxGeometry args={[w, h, 0.06]} />
                  <meshStandardMaterial color="#f7f7f5" />
                </mesh>
              ))}
              {window.open && (
                <group position={[(s * W) / 2 - s * 0.03, window.y + window.h / 2, window.z + window.w / 2]} rotation={[0, -s * 1.9, 0]}>
                  {/* offener Fensterflügel (Rahmen + Glas), steht nach innen */}
                  <mesh position={[0, 0, -window.w / 4]}>
                    <boxGeometry args={[0.05, window.h, window.w / 2]} />
                    <meshStandardMaterial color="#f7f7f5" transparent opacity={0.0} />
                  </mesh>
                  {[
                    [0, window.h / 2 - 0.03, 0.06, window.w / 2],
                    [0, -window.h / 2 + 0.03, 0.06, window.w / 2],
                  ].map(([, dy, hh, ww], i) => (
                    <mesh key={i} position={[0, dy, -window.w / 4]}>
                      <boxGeometry args={[0.05, hh, ww]} />
                      <meshStandardMaterial color="#f7f7f5" />
                    </mesh>
                  ))}
                  {[0.03, window.w / 2 - 0.03].map((dz) => (
                    <mesh key={dz} position={[0, 0, -dz]}>
                      <boxGeometry args={[0.05, window.h, 0.06]} />
                      <meshStandardMaterial color="#f7f7f5" />
                    </mesh>
                  ))}
                  <mesh position={[0, 0, -window.w / 4]}>
                    <boxGeometry args={[0.008, window.h - 0.08, window.w / 2 - 0.08]} />
                    <meshStandardMaterial color="#cfe8f7" transparent opacity={0.35} roughness={0.05} metalness={0.2} />
                  </mesh>
                </group>
              )}
              {[-1, 1].map((k) => (
                <mesh key={k} position={[(s * W) / 2 - s * 0.03, window.y + window.h / 2, window.z + (k * window.w) / 2]} rotation={[0, -s * Math.PI / 2, 0]}>
                  <boxGeometry args={[0.08, window.h + 0.12, 0.06]} />
                  <meshStandardMaterial color="#f7f7f5" />
                </mesh>
              ))}
            </>
          ) : (
            <mesh material={wall} position={[(s * W) / 2, H / 2, 3]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow>
              <planeGeometry args={[D + 6, H]} />
            </mesh>
          )}
          {/* Fußleiste */}
          <mesh position={[(s * W) / 2 - s * 0.01, 0.05, 3]}>
            <boxGeometry args={[0.02, 0.1, D + 6]} />
            <meshStandardMaterial color="#f2efe9" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.05, -D / 2 + 0.01]}>
        <boxGeometry args={[W, 0.1, 0.02]} />
        <meshStandardMaterial color="#f2efe9" />
      </mesh>
      </>)}
      <mesh position={[0, H, 3]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D + 6]} />
        <meshStandardMaterial color={ceiling} />
      </mesh>
      {/* Deckenleuchte */}
      {ceilingLamp && (
        <mesh position={[0, H - 0.05, 0]}>
          <cylinderGeometry args={[0.28, 0.32, 0.08, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff4dc" emissiveIntensity={1.2} />
        </mesh>
      )}
      {children}
    </>
  );
};

// ---------- Möbel (wiederverwendbar) ----------
/** Stuhl, Sitzfläche 0,45 m hoch, Lehne hinten (−z), Sitz nach +z. Ursprung = Boden unter Sitzmitte */
export const Chair = ({color = '#5b6f86', legs = '#2f3338'}: {color?: string; legs?: string}) => (
  <group>
    <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.48, 0.06, 0.46]} />
      <meshStandardMaterial color={color} flatShading roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.76, -0.22]} castShadow>
      <boxGeometry args={[0.48, 0.5, 0.05]} />
      <meshStandardMaterial color={color} flatShading roughness={0.7} />
    </mesh>
    {[
      [-0.2, -0.2],
      [0.2, -0.2],
      [-0.2, 0.2],
      [0.2, 0.2],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.2, z]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
        <meshStandardMaterial color={legs} metalness={0.5} roughness={0.4} />
      </mesh>
    ))}
  </group>
);

/** Sofa, Sitzhöhe 0,45 m, Breite 2,1 m, Rückenlehne hinten (−z). Ursprung = Boden unter der Sitzmitte (z = Mitte der Sitzfläche) */
export const Sofa = ({color = '#4f7a8c'}: {color?: string}) => {
  const m = useMemo(() => ({c: std(color, {roughness: 0.95}), d: std(new THREE.Color(color).multiplyScalar(0.8).getStyle(), {roughness: 0.95}), leg: std('#3a2a1e')}), [color]);
  return (
    <group>
      <mesh material={m.d} position={[0, 0.22, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.3, 0.9]} />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} material={m.c} position={[x, 0.41, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[0.96, 0.1, 0.72]} />
        </mesh>
      ))}
      <mesh material={m.c} position={[0, 0.68, -0.42]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[2.1, 0.62, 0.2]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.d} position={[s * 1.0, 0.48, -0.05]} castShadow>
          <boxGeometry args={[0.2, 0.36, 0.9]} />
        </mesh>
      ))}
      {/* Kissen */}
      <mesh position={[0.72, 0.62, -0.22]} rotation={[-0.3, -0.3, 0.1]} castShadow>
        <boxGeometry args={[0.36, 0.34, 0.12]} />
        <meshStandardMaterial color="#e8b04b" flatShading />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} material={m.leg} position={[x, 0.04, 0.3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.08, 6]} />
        </mesh>
      ))}
    </group>
  );
};

export const Plant = ({s = 1}: {s?: number}) => (
  <group scale={s}>
    <mesh position={[0, 0.17, 0]} castShadow>
      <cylinderGeometry args={[0.16, 0.12, 0.34, 8]} />
      <meshStandardMaterial color="#c86b45" flatShading />
    </mesh>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <mesh key={i} position={[Math.sin(i * 1.1) * 0.12, 0.55 + (i % 3) * 0.12, Math.cos(i * 1.1) * 0.12]} rotation={[Math.sin(i) * 0.5, i, Math.cos(i) * 0.5]} castShadow>
        <icosahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color={i % 2 ? '#3f8f4e' : '#4fa35c'} flatShading />
      </mesh>
    ))}
  </group>
);

/** Weißer Wandschrank mit grünem Kreuz (Erste Hilfe) */
const FirstAidCabinet = () => (
  <group>
    <mesh castShadow>
      <boxGeometry args={[0.5, 0.5, 0.16]} />
      <meshStandardMaterial color="#f6f7f8" flatShading roughness={0.4} />
    </mesh>
    <mesh position={[0, 0, 0.082]}>
      <boxGeometry args={[0.24, 0.07, 0.01]} />
      <meshStandardMaterial color="#22a35a" />
    </mesh>
    <mesh position={[0, 0, 0.082]}>
      <boxGeometry args={[0.07, 0.24, 0.01]} />
      <meshStandardMaterial color="#22a35a" />
    </mesh>
  </group>
);

// ---------- Badezimmer ----------
/** Badezimmer: W 4.2, D 4.4 → Rückwand z = −2.2. Waschbecken ("waschbecken") hierhin: x 0, z −1.66, face 180. */
export const BATH = {W: 4.2, D: 4.4, sink: {x: 0, z: -1.66}};

const BathroomScene = () => {
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tileTexture('#8d97a3', '#6f7782', [9, 22]), roughness: 0.4}),
      wall: new THREE.MeshStandardMaterial({map: tileTexture('#e9f4f7', '#c3d3d9', [16, 11]), roughness: 0.35}),
    }),
    [],
  );
  const {W, D} = BATH;
  return (
    <Room
      W={W}
      D={D}
      H={2.6}
      floor={mats.floor}
      wall={mats.wall}
      ceiling="#f7f7f5"
      window={{side: 1, z: -0.6, w: 0.9, y: 1.3, h: 0.9, sky: '#cfe8ff'}}
      light={{ambient: 0.55, hemi: 0.75, sun: 1.6, sunColor: '#fff3df', lamp: 6, lampColor: '#fff4e2'}}
    >
      {/* Spiegel mit Rahmen + Leuchte darüber */}
      <group position={[0, 1.72, -D / 2 + 0.02]}>
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.86, 0.76, 0.03]} />
          <meshStandardMaterial color="#d9dee2" />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[0.78, 0.68]} />
          <meshStandardMaterial color="#b9d3e2" roughness={0.05} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.47, 0.05]}>
          <boxGeometry args={[0.6, 0.06, 0.08]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff1d6" emissiveIntensity={1.5} />
        </mesh>
      </group>
      {/* Erste-Hilfe-Schrank rechts neben dem Spiegel */}
      <group position={[0.95, 1.62, -D / 2 + 0.09]}>
        <FirstAidCabinet />
      </group>
      {/* Ablage mit Zahnputzbecher links */}
      <group position={[-0.95, 1.3, -D / 2 + 0.08]}>
        <mesh>
          <boxGeometry args={[0.6, 0.03, 0.14]} />
          <meshStandardMaterial color="#f2f2f0" />
        </mesh>
        <mesh position={[-0.15, 0.07, 0]}>
          <cylinderGeometry args={[0.035, 0.03, 0.11, 8]} />
          <meshStandardMaterial color="#79c4c7" />
        </mesh>
        {[-0.165, -0.14].map((x, i) => (
          <mesh key={i} position={[x, 0.15, 0]} rotation={[0, 0, (i - 0.5) * 0.3]}>
            <boxGeometry args={[0.012, 0.12, 0.012]} />
            <meshStandardMaterial color={i ? '#f2c81e' : '#e3533f'} />
          </mesh>
        ))}
        <mesh position={[0.12, 0.08, 0]}>
          <cylinderGeometry args={[0.04, 0.045, 0.13, 8]} />
          <meshStandardMaterial color="#f1a6b8" />
        </mesh>
      </group>
      {/* Verbandskasten auf dem Waschtisch (links) */}
      <group position={[-0.32, 0.86, -D / 2 + 0.28]} rotation={[0, 0.25, 0]} scale={0.8}>
        <FirstAidKit />
      </group>
      {/* Badewanne an der linken Wand */}
      <group position={[-W / 2 + 0.4, 0, -D / 2 + 1.0]}>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.78, 0.56, 1.75]} />
          <meshStandardMaterial color="#fbfbfa" flatShading roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.565, 0]}>
          <boxGeometry args={[0.62, 0.01, 1.58]} />
          <meshStandardMaterial color="#d6e6ee" roughness={0.2} />
        </mesh>
      </group>
      {/* Handtuchhalter + Handtuch rechts */}
      <group position={[W / 2 - 0.03, 1.1, 0.5]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.25, 0.04]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
          <meshStandardMaterial color="#cfd5da" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.05, 0.05]} castShadow>
          <boxGeometry args={[0.45, 0.6, 0.04]} />
          <meshStandardMaterial color="#f08a5d" flatShading />
        </mesh>
      </group>
      {/* Badematte + Pflanze */}
      <mesh position={[0.1, 0.006, -1.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.8, 0.55]} />
        <meshStandardMaterial color="#7cc6c9" />
      </mesh>
      <group position={[1.75, 0, -1.9]}>
        <Plant s={1.1} />
      </group>
    </Room>
  );
};

// ---------- Wohnzimmer ----------
/**
 * Wohnzimmer: W 5, D 4.6 → Rückwand z = −2.3. Sofa (fest) mit Sitzmitte bei (0, −1.82);
 * sitzender Dummy: x −0.5 oder 0.5, z −1.85, face 180, Bewegung couchsit/couchwait.
 * Kalender ("kalender"): x 1.35, y 1.5, z −2.29, face 180. Wanduhr ("wanduhr"): x −0.35, y 1.75, z −2.29, face 180.
 * (Bilderrahmen hängt links bei x −1.0.)
 */
export const LIVING = {W: 5, D: 4.6};

const LivingScene = () => {
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: plankTexture([3, 6]), roughness: 0.7}),
      wall: std('#efe3cf', {roughness: 0.95, flatShading: false}),
      back: std('#d98f5f', {roughness: 0.95, flatShading: false}),
    }),
    [],
  );
  const {W, D} = LIVING;
  return (
    <Room
      W={W}
      D={D}
      H={2.6}
      floor={mats.floor}
      wall={mats.wall}
      backWall={mats.back}
      ceiling="#f7f3ec"
      window={{side: -1, z: -0.4, w: 1.3, y: 0.9, h: 1.3, sky: '#bfe0ff'}}
      light={{ambient: 0.5, hemi: 0.7, sun: 1.5, sunColor: '#ffe9c9', lamp: 4.5, lampColor: '#ffe7c4'}}
    >
      <group position={[0, 0, -1.82]}>
        <Sofa />
      </group>
      {/* Teppich + Couchtisch */}
      <mesh position={[0, 0.006, -0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.6, 1.7]} />
        <meshStandardMaterial color="#c9d6c4" />
      </mesh>
      <group position={[0.1, 0, -0.45]}>
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.05, 0.55]} />
          <meshStandardMaterial color="#8a5d3b" flatShading />
        </mesh>
        {[
          [-0.5, -0.22],
          [0.5, -0.22],
          [-0.5, 0.22],
          [0.5, 0.22],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.18, z]}>
            <boxGeometry args={[0.05, 0.36, 0.05]} />
            <meshStandardMaterial color="#6e482c" />
          </mesh>
        ))}
        <mesh position={[0.25, 0.45, 0.05]} castShadow>
          <cylinderGeometry args={[0.05, 0.04, 0.1, 8]} />
          <meshStandardMaterial color="#f2f0ea" />
        </mesh>
        <mesh position={[-0.2, 0.42, 0]} rotation={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.24, 0.03, 0.32]} />
          <meshStandardMaterial color="#3f6fa6" />
        </mesh>
      </group>
      {/* Stehlampe links neben dem Sofa */}
      <group position={[-1.55, 0, -1.95]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.6, 6]} />
          <meshStandardMaterial color="#2f3338" />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 10]} />
          <meshStandardMaterial color="#2f3338" />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <cylinderGeometry args={[0.14, 0.24, 0.3, 10, 1, true]} />
          <meshStandardMaterial color="#fff1d0" emissive="#ffd896" emissiveIntensity={0.8} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 1.55, 0.1]} intensity={2.2} color="#ffd9a0" distance={4} decay={1.6} />
      </group>
      {/* Regal rechts mit Büchern */}
      <group position={[W / 2 - 0.2, 0, -1.2]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[0.35, 1.8, 0.9]} />
          <meshStandardMaterial color="#9b7651" flatShading />
        </mesh>
        {[0.45, 0.9, 1.35].map((y) =>
          [-0.3, -0.18, -0.06, 0.08, 0.2, 0.3].map((z, i) => (
            <mesh key={`${y}${i}`} position={[-0.19, y + 0.15, z]}>
              <boxGeometry args={[0.04, 0.26 - (i % 3) * 0.03, 0.09]} />
              <meshStandardMaterial color={['#c9573c', '#3f6fa6', '#e3b94b', '#4f8f63', '#7d4f8f', '#dfe4e8'][i]} />
            </mesh>
          )),
        )}
      </group>
      <group position={[-1.95, 0, -1.6]}>
        <Plant s={1.3} />
      </group>
      {/* Bilderrahmen über dem Sofa */}
      <mesh position={[-1.0, 1.55, -D / 2 + 0.02]}>
        <boxGeometry args={[0.7, 0.45, 0.03]} />
        <meshStandardMaterial color="#f3ede0" />
      </mesh>
      <mesh position={[-1.0, 1.55, -D / 2 + 0.04]}>
        <planeGeometry args={[0.58, 0.33]} />
        <meshStandardMaterial color="#7fb2c9" />
      </mesh>
      <mesh position={[-1.0, 1.47, -D / 2 + 0.045]}>
        <planeGeometry args={[0.58, 0.14]} />
        <meshStandardMaterial color="#6e9b58" />
      </mesh>
    </Room>
  );
};

// ---------- Arztpraxis ----------
/**
 * Arztpraxis: W 5, D 4.6 → Rückwand z = −2.3. Schreibtisch (Oberkante 0,75, 1,1 × 0,8 m), Mitte (0.2, −1.3).
 * Arzt ("arzt") sitzt links am Tisch: x −0.45, z −1.3, face 90, chairsit/chairnod.
 * Patient (Dummy) sitzt rechts am Tisch: x 0.95, z −1.3, face 270, chairsit/showpass (linker Arm zeigt zur Kamera vorn).
 * Fenster rechts (x 2.5, z −1.8 … −0.6, Höhe 1.0 … 2.2) – dahinter kann z. B. der Zombie stehen (x 3.15, z −1.2, face 270).
 */
export const PRAXIS = {W: 5, D: 4.6};

const PraxisScene = () => {
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tileTexture('#c8d3cf', '#b5c1bd', [8, 16]), roughness: 0.5}),
      wall: std('#e3f1ec', {roughness: 0.95, flatShading: false}),
    }),
    [],
  );
  const {W, D} = PRAXIS;
  return (
    <Room
      W={W}
      D={D}
      H={2.7}
      floor={mats.floor}
      wall={mats.wall}
      ceiling="#fafafa"
      window={{side: 1, z: -1.2, w: 1.2, y: 1.0, h: 1.2, sky: '#cfe8ff'}}
      light={{ambient: 0.6, hemi: 0.75, sun: 1.5, sunColor: '#fff6e8', lamp: 6, lampColor: '#f4f8ff'}}
    >
      {/* Schreibtisch (quer, nur Beine – Knie passen darunter) */}
      <group position={[0.2, 0, -1.3]}>
        <mesh position={[0, 0.73, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.05, 0.8]} />
          <meshStandardMaterial color="#f4f1ea" flatShading />
        </mesh>
        {[
          [-0.5, -0.35],
          [0.5, -0.35],
          [-0.5, 0.35],
          [0.5, 0.35],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.36, z]} castShadow>
            <boxGeometry args={[0.05, 0.72, 0.05]} />
            <meshStandardMaterial color="#9aa8a3" metalness={0.3} />
          </mesh>
        ))}
        {/* Laptop (aufgeklappt, zum Arzt gedreht – flach, verdeckt nichts) */}
        <group position={[-0.28, 0.755, -0.18]} rotation={[0, Math.PI / 2 + 0.3, 0]}>
          <mesh position={[0, 0.01, 0]} castShadow>
            <boxGeometry args={[0.32, 0.02, 0.22]} />
            <meshStandardMaterial color="#c9ced3" metalness={0.4} roughness={0.4} />
          </mesh>
          <group position={[0, 0.02, -0.11]} rotation={[-0.35, 0, 0]}>
            <mesh position={[0, 0.1, 0]} castShadow>
              <boxGeometry args={[0.32, 0.2, 0.012]} />
              <meshStandardMaterial color="#c9ced3" metalness={0.4} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.1, 0.007]}>
              <planeGeometry args={[0.29, 0.17]} />
              <meshStandardMaterial color="#7fc6e8" emissive="#5fb1dd" emissiveIntensity={0.4} />
            </mesh>
          </group>
        </group>
        <mesh position={[-0.25, 0.76, 0.05]} rotation={[0, 0.2, 0]}>
          <boxGeometry args={[0.2, 0.012, 0.36]} />
          <meshStandardMaterial color="#e6e8ea" />
        </mesh>
        <mesh position={[0.2, 0.76, 0.15]} rotation={[0, -0.15, 0]}>
          <boxGeometry args={[0.3, 0.01, 0.22]} />
          <meshStandardMaterial color="#fdfdfb" />
        </mesh>
        <mesh position={[0.38, 0.77, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.14, 6]} />
          <meshStandardMaterial color="#2c7fd0" />
        </mesh>
      </group>
      {/* Stühle: Arzt links (schaut nach +x), Patient rechts (schaut nach −x) */}
      <group position={[-0.45, 0, -1.3]} rotation={[0, Math.PI / 2, 0]}>
        <Chair color="#3f5f7a" />
      </group>
      <group position={[0.95, 0, -1.3]} rotation={[0, -Math.PI / 2, 0]}>
        <Chair color="#6f9c8a" />
      </group>
      {/* Untersuchungsliege an der linken Wand */}
      <group position={[-W / 2 + 0.45, 0, -0.8]}>
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.14, 1.9]} />
          <meshStandardMaterial color="#5b7f99" flatShading />
        </mesh>
        <mesh position={[0, 0.68, 0]}>
          <boxGeometry args={[0.5, 0.01, 1.85]} />
          <meshStandardMaterial color="#fbfbf8" />
        </mesh>
        {[-0.8, 0.8].map((z) => (
          <mesh key={z} position={[0, 0.27, z]}>
            <boxGeometry args={[0.6, 0.54, 0.06]} />
            <meshStandardMaterial color="#c9d1d6" metalness={0.4} />
          </mesh>
        ))}
      </group>
      {/* Sehtafel + Schrank mit grünem Kreuz an der Rückwand */}
      <group position={[-1.2, 1.55, -D / 2 + 0.02]}>
        <mesh>
          <boxGeometry args={[0.5, 0.75, 0.01]} />
          <meshStandardMaterial color="#fdfdfb" />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[0, 0.27 - i * 0.1, 0.008]}>
            <boxGeometry args={[0.32 - i * 0.045, 0.045 - i * 0.005, 0.002]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        ))}
      </group>
      <group position={[1.25, 1.65, -D / 2 + 0.09]}>
        <FirstAidCabinet />
      </group>
      <group position={[1.25, 0, -D / 2 + 0.3]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.9, 1.0, 0.5]} />
          <meshStandardMaterial color="#f3f5f4" flatShading />
        </mesh>
        <mesh position={[0, 1.05, 0.05]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.12, 8]} />
          <meshStandardMaterial color="#2f9d57" />
        </mesh>
      </group>
      <group position={[-2.0, 0, 0.2]}>
        <Plant s={1.2} />
      </group>
    </Room>
  );
};

export const bathroomStage: StageDef = {id: 'badezimmer', Component: BathroomScene, climbTrees: [], groundHeight: () => 0};
export const livingRoomStage: StageDef = {id: 'wohnzimmer', Component: LivingScene, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};
export const praxisStage: StageDef = {id: 'arztpraxis', Component: PraxisScene, climbTrees: [], groundHeight: () => 0};
