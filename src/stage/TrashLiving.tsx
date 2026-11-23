import {useMemo} from 'react';
import * as THREE from 'three';
import {FamilyHouse} from '../actors/HausProps';
import {FarHouses} from './Park';
import {Room, std, tileTexture} from './Rooms';
import type {StageDef} from './types';

/**
 * Großes Wohnzimmer des Dummys (Spezial Müll-Flüssigkeit, "wohnzimmer-gross", `WZG`, Atmo `uhr-ticken`): W 11, D 9 (Rückwand z −4,5), H 3,8,
 * Dielenboden, warme Tapete, Fenster links. Die Rückwand LINKS (x −5,5 … −2,2) ist fest, der Rest ist das Objekt "haustuerwand" bei
 * WZG.wall (1.65, −4.5), face 180 (Haustür in der Mitte, durchbrechbar; Öffnung x −0.05 … 3.35, 3,3 m hoch).
 * Dahinter draußen: Vorgarten-Rasen, Einfahrt (x 1.65) bis zur Straße (z −14 … −20), Häuser gegenüber – der Müllwagen wartet dort
 * (x 1.65, z ≤ −12, face 180 = fährt nach +z ins Zimmer). Möbel = Objekt "wohnmoebel" bei (0, 0), face 180 (Lage in LIVING_BIG,
 * MuellProps.tsx). Freier Platz für den Müllsack WZG.bag (−0.95, 0.8) – genau dort greift der Arm des Müllwagens, wenn der Wagen bei
 * WZG.truckStop (1.65, 0.5) steht. Seitenwände von außen unsichtbar → Kameras dürfen außerhalb stehen; Decke bis z 10.
 */
export const WZG = {W: 11, D: 9, H: 3.8, wall: [1.65, -4.5] as [number, number], bag: [-0.95, 0.8] as [number, number], truckStop: [1.65, 0.5] as [number, number]};

const BigLivingScene = () => {
  const {W, D, H} = WZG;
  const zb = -D / 2;
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tileTexture('#c9945e', '#a87645', [3, 40]), roughness: 0.75}),
      wall: std('#f1e3c6', {roughness: 0.95, flatShading: false}),
      lawn: std('#84bf58', {roughness: 1}),
      drive: std('#b8b2a8', {roughness: 0.95}),
      asphalt: std('#5f6368', {roughness: 0.95}),
      hedge: std('#3f7d3a'),
      hedge2: std('#4c8c44'),
      white: std('#eeeeea'),
      trunk: std('#7a5434'),
      leaf: std('#4f9e45'),
    }),
    [],
  );
  return (
    <Room
      W={W}
      D={D}
      H={H}
      floor={mats.floor}
      wall={mats.wall}
      ceiling="#f8f4ec"
      window={{side: -1, z: 0.6, w: 2.2, y: 0.85, h: 1.7, sky: '#bfe0ff'}}
      light={{ambient: 0.6, hemi: 0.8, sun: 1.5, sunColor: '#fff0d8', lamp: 5.5, lampColor: '#fff1dc'}}
      bg="#bfe0ff"
      backX={[-W / 2, -2.2]}
      sunPos={[-5, 7, 4]}
    >
      {/* Boden + Decke laufen nach vorn weiter */}
      <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 14]} receiveShadow>
        <planeGeometry args={[W, 20]} />
      </mesh>
      {/* ---- draußen hinter der Haustür-Wand ---- */}
      <mesh material={mats.lawn} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, zb - 6]} receiveShadow>
        <planeGeometry args={[80, 12]} />
      </mesh>
      <mesh material={mats.drive} rotation={[-Math.PI / 2, 0, 0]} position={[WZG.wall[0], 0.008, zb - 5.5]}>
        <planeGeometry args={[3.4, 11]} />
      </mesh>
      <mesh material={mats.asphalt} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, zb - 15]}>
        <planeGeometry args={[120, 8]} />
      </mesh>
      {Array.from({length: 16}, (_, i) => -38 + i * 5).map((x) => (
        <mesh key={x} material={mats.white} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, zb - 15]}>
          <planeGeometry args={[2.4, 0.13]} />
        </mesh>
      ))}
      <mesh material={mats.lawn} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, zb - 40]}>
        <planeGeometry args={[160, 42]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={s > 0 ? mats.hedge : mats.hedge2} position={[WZG.wall[0] + s * 5.5, 0.6, zb - 10.5]} castShadow>
          <boxGeometry args={[7, 1.2, 1.0]} />
        </mesh>
      ))}
      {[-12, 0, 12].map((x, i) => (
        <group key={x} position={[x + 1.65, 0, zb - 27]}>
          <FamilyHouse look={[1, 4, 2][i]} seed={3 + i} />
        </group>
      ))}
      {[
        [-7, -7],
        [9, -8],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, zb + z]}>
          <mesh material={mats.trunk} position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.18, 0.25, 2.2, 6]} />
          </mesh>
          <mesh material={mats.leaf} position={[0, 3.0, 0]} castShadow>
            <icosahedronGeometry args={[1.5, 0]} />
          </mesh>
        </group>
      ))}
      <FarHouses z={zb - 52} face={1} seed={9} day />
      {/* Deckenleuchten */}
      {[-2.5, 2.5].map((x) => (
        <mesh key={x} position={[x, H - 0.05, 0.5]}>
          <cylinderGeometry args={[0.3, 0.34, 0.08, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff4dc" emissiveIntensity={1.2} />
        </mesh>
      ))}
    </Room>
  );
};

export const bigLivingStage: StageDef = {id: 'wohnzimmer-gross', Component: () => <BigLivingScene />, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};
