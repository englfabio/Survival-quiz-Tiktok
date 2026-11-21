import {useMemo} from 'react';
import * as THREE from 'three';
import {HoleWall} from './Christmas';
import {Plant, Room, std, tileTexture} from './Rooms';
import type {StageDef} from './types';

/**
 * Bühne „eingangshalle“ (Spezial „Tür drücken“): heller Eingangsbereich eines Hauses (Foyer) am Tag.
 *  - Raum W 8 × D 6 (Rückwand z −3), Höhe 3,4, großes Schachbrett-Fliesenmuster, warme Wände mit Holz-Sockelleiste,
 *    zwei Deckenleuchten, Wandlampen.
 *  - Mitten in der Rückwand die Türöffnung (FOYER.door: x −0.5 … 0.5, 2,2 m hoch) – das Türblatt + Zarge ist das Objekt
 *    „druecktuer“ bei (0, −3), face 180. Dahinter ein sonniger Innenhof (Rasen, Hecke, Himmel), damit man bei offener Tür hinaussieht.
 *  - Zwei Säulen (FOYER.pillars) bei x ±2.3, z −0.4 (0,5 × 0,5 m) – hinter der linken Säule ist der sichere Deckungsplatz
 *    FOYER.cover (−2.75, 0.15).
 *  - Pflanzen in Kübeln links/rechts neben der Tür (x ±1.95) und vorn an den Seiten, Bank links an der Wand, Fußmatte vor der Tür.
 *  - Platz rechts neben der Tür bis x 1.75 frei (Schiebetür rollt dorthin), vorn offen für Kameras (z bis ca. 9).
 */
export const FOYER = {
  W: 8,
  D: 6,
  H: 3.4,
  back: -3,
  door: {x0: -0.5, x1: 0.5, h: 2.2},
  pillars: [[-2.3, -0.4], [2.3, -0.4]] as [number, number][],
  pillar: 0.5,
  cover: [-2.75, 0.15] as [number, number],
};

const Pillar = ({m}: {m: Record<string, THREE.Material>}) => (
  <group>
    <mesh material={m.pillar} position={[0, FOYER.H / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[FOYER.pillar, FOYER.H, FOYER.pillar]} />
    </mesh>
    <mesh material={m.trim} position={[0, 0.08, 0]} castShadow>
      <boxGeometry args={[FOYER.pillar + 0.1, 0.16, FOYER.pillar + 0.1]} />
    </mesh>
    <mesh material={m.trim} position={[0, FOYER.H - 0.1, 0]}>
      <boxGeometry args={[FOYER.pillar + 0.12, 0.2, FOYER.pillar + 0.12]} />
    </mesh>
  </group>
);

const WallLamp = ({m}: {m: Record<string, THREE.Material>}) => (
  <group>
    <mesh material={m.brass} position={[0, 0, 0.04]}>
      <boxGeometry args={[0.1, 0.16, 0.06]} />
    </mesh>
    <mesh material={m.glow} position={[0, 0.1, 0.12]}>
      <cylinderGeometry args={[0.1, 0.07, 0.16, 10]} />
    </mesh>
  </group>
);

const FoyerScene = () => {
  const {W, D, H} = FOYER;
  const m = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tileTexture('#eae3d6', '#c9bfae', [W / 0.8, (D + 6) / 0.8]), roughness: 0.45}),
      floor2: new THREE.MeshStandardMaterial({color: '#7f8a96', roughness: 0.5}),
      wall: std('#e9dcc6', {roughness: 0.95, flatShading: false}),
      wood: std('#a9784a', {roughness: 0.6}),
      pillar: std('#f3efe8', {roughness: 0.7, flatShading: false}),
      trim: std('#dcd4c6', {roughness: 0.6}),
      brass: std('#c9a24a', {metalness: 0.6, roughness: 0.35}),
      glow: new THREE.MeshStandardMaterial({color: '#fff6dc', emissive: '#ffe9b8', emissiveIntensity: 1.3}),
      mat: std('#5d4a3a', {roughness: 1}),
      grass: std('#7fc45a', {roughness: 1}),
      hedge: std('#4e9a4a'),
      bench: std('#8a5d3b'),
      metal: std('#3a3f46', {metalness: 0.4, roughness: 0.4}),
    }),
    [W, D],
  );
  const doorHole = {c: 0, y0: 0, w: FOYER.door.x1 - FOYER.door.x0, h: FOYER.door.h};
  return (
    <Room
      W={W}
      D={D}
      H={H}
      floor={m.floor}
      wall={m.wall}
      ceiling="#f6f2ea"
      walls={false}
      ceilingLamp={false}
      bg="#cfe3f2"
      sunPos={[2.5, 5.5, 5]}
      light={{ambient: 0.5, hemi: 0.55, sun: 1.15, sunColor: '#fff1dc', lamp: 3.2, lampColor: '#ffe9c8'}}
    >
      {/* Rückwand mit Türöffnung */}
      <group position={[0, 0, FOYER.back]}>
        <HoleWall len={W} H={H} holes={[doorHole]} material={m.wall} />
        {/* Holz-Sockel (Wandverkleidung bis 0,95 m) links + rechts der Tür */}
        {[-1, 1].map((k) => (
          <group key={k}>
            <mesh material={m.wood} position={[k * (0.6 + (W / 2 - 0.6) / 2), 0.475, 0.012]}>
              <boxGeometry args={[W / 2 - 0.6, 0.95, 0.02]} />
            </mesh>
            <mesh material={m.trim} position={[k * (0.6 + (W / 2 - 0.6) / 2), 0.96, 0.03]}>
              <boxGeometry args={[W / 2 - 0.6, 0.04, 0.05]} />
            </mesh>
            <group position={[k * 2.05, 2.45, 0]}>
              <WallLamp m={m} />
            </group>
          </group>
        ))}
        {/* Bild über der Bank links */}
        <group position={[-3.0, 1.75, 0.02]}>
          <mesh material={m.wood}>
            <boxGeometry args={[0.9, 0.65, 0.04]} />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[0.78, 0.53]} />
            <meshStandardMaterial color="#8ec6e8" />
          </mesh>
          <mesh position={[0.05, -0.12, 0.03]}>
            <circleGeometry args={[0.22, 3]} />
            <meshStandardMaterial color="#6fae5a" />
          </mesh>
          <mesh position={[0.22, 0.12, 0.03]}>
            <circleGeometry args={[0.07, 10]} />
            <meshStandardMaterial color="#ffd21a" />
          </mesh>
        </group>
      </group>
      {/* Seitenwände mit Sockel */}
      {[-1, 1].map((s) => (
        <group key={s} position={[(s * W) / 2, 0, 3]} rotation={[0, -s * Math.PI / 2, 0]}>
          <mesh material={m.wall} position={[0, H / 2, 0]} receiveShadow>
            <planeGeometry args={[D + 6, H]} />
          </mesh>
          <mesh material={m.wood} position={[0, 0.475, 0.012]}>
            <boxGeometry args={[D + 6, 0.95, 0.02]} />
          </mesh>
        </group>
      ))}
      {/* Innenhof hinter der Tür (sonnig) */}
      <group position={[0, 0, FOYER.back - 0.12]}>
        <mesh material={m.grass} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -5]}>
          <planeGeometry args={[12, 10]} />
        </mesh>
        <mesh position={[0, 3, -10]}>
          <planeGeometry args={[14, 8]} />
          <meshBasicMaterial color="#bfe3fb" />
        </mesh>
        {[-3.2, -1.4, 0.6, 2.4, 4.0].map((x, i) => (
          <mesh key={x} material={m.hedge} position={[x, 0.55 + (i % 2) * 0.1, -8.6]} scale={[1.2, 0.75 + (i % 2) * 0.15, 0.8]} castShadow>
            <icosahedronGeometry args={[0.9, 1]} />
          </mesh>
        ))}
        <pointLight position={[0, 2.4, -2.5]} intensity={2.2} color="#fff4dc" distance={7} decay={1.4} />
      </group>
      {/* Säulen */}
      {FOYER.pillars.map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <Pillar m={m} />
        </group>
      ))}
      {/* Fußmatte vor der Tür */}
      <mesh material={m.mat} position={[0, 0.006, FOYER.back + 0.45]} receiveShadow>
        <boxGeometry args={[1.0, 0.012, 0.6]} />
      </mesh>
      {/* Pflanzen */}
      {[
        [-1.95, FOYER.back + 0.4, 1.1],
        [1.95, FOYER.back + 0.4, 1.1],
        [-3.55, 1.6, 1.3],
        [3.55, 1.6, 1.3],
      ].map(([x, z, s]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <Plant s={s} />
        </group>
      ))}
      {/* Bank links an der Wand */}
      <group position={[-3.0, 0, FOYER.back + 0.35]}>
        <mesh material={m.bench} position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.06, 0.4]} />
        </mesh>
        {[-0.6, 0.6].map((x) => (
          <mesh key={x} material={m.metal} position={[x, 0.22, 0]}>
            <boxGeometry args={[0.05, 0.44, 0.36]} />
          </mesh>
        ))}
      </group>
      {/* Deckenleuchten */}
      {[-1.6, 2.0].map((z) => (
        <mesh key={z} material={m.glow} position={[0, H - 0.05, z]}>
          <cylinderGeometry args={[0.32, 0.36, 0.08, 18]} />
        </mesh>
      ))}
      <pointLight position={[0, H - 0.4, 2.0]} intensity={1.6} color="#ffe9c8" distance={10} decay={1.4} />
    </Room>
  );
};

export const foyerStage: StageDef = {id: 'eingangshalle', Component: FoyerScene, climbTrees: [], groundHeight: () => 0, ambience: 'treppenhaus-atmo'};
