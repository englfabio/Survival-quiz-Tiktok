import {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Chair, Plant, plankTexture, Room, std} from './Rooms';
import type {StageDef} from './types';
import {EnergyCan, GamingChair, PiratePoster} from '../actors/GamingProps';

/**
 * Bühnen für das Panikattacken-Video (wiederverwendbar):
 *
 * "schlafzimmer" – kleines, gemütliches Schlafzimmer am Abend. W 3.6 (x −1.8 … 1.8), D 3.8 (Rückwand z −1.9), H 2.5.
 *   Bett an der Rückwand rechts (x −0.05 … 1.75, z −1.9 … −0.95, Matratze 0,47 m, Kopfteil rechts an der Wand),
 *   Nachttisch mit Lampe (x −0.3, z −1.7, Platte 0,52 m), Schreibtisch an der linken Wand (x −1.8 … −1.25,
 *   z −1.0 … 0.2, Platte 0,75 m) mit Lampe, Büchern, Laptop; Stuhl in der Leseecke vorn links (Mitte −1.25, 0.55, face 145, Sitz 0,45 m) mit rundem
 *   Beistelltisch rechts daneben (−1.6, 1.0, Platte 0,72 m); Fenster links über dem Schreibtisch (Abendhimmel mit Mond), Tür in der rechten Wand vorn
 *   (z 0.55 … 1.45), Teppich, Poster, Pflanze. Platz für den Dummy an der Rückwand links: (−1.15, −1.62).
 * "aufzug" – kleine Aufzugkabine (W 1.7, D 1.6, H 2.3, Rückwand z −0.8), gebürsteter Stahl, Handlauf, Spiegel,
 *   Tastenfeld rechts, Stockwerk-Anzeige; zwei stilisierte Mitfahrende (ohne Gesicht).
 * "bahn" – volle U-/S-Bahn: Wagen entlang z (x −1.3 … 1.3), Sitzbänke an beiden Seiten, Haltestangen, Haltegriffe
 *   (Höhe ca. 1,95 m bei x ±0.45), Fenster mit vorbeihuschenden Tunnel-Lichtern, viele stilisierte Fahrgäste.
 */

/**
 * "gamingzimmer" (Spezial Pirat-Token) = Schlafzimmer am Abend, aber statt Schreibtisch/Leseecke/Nachttisch eine Gaming-Ecke an der
 * Rückwand links: Gaming-Schreibtisch x −1.75 … −0.45, z −1.9 … −1.25, Platte 0,75 m (schwarz, RGB-Leiste vorn), Mauspad, Maus, Headset,
 * Dosen ohne Marke; Gaming-Stuhl (Objekt-frei, Bühne) bei GAMING.chair (Dummy sitzt dort face 0, Laptop 0,43 m vor ihm);
 * Plakat „PIRAT-TOKEN“ (eigene Münze) über dem Tisch, RGB-Leisten an Wand + Decke (Farbwechsel), lila/türkises Licht.
 * Platz für den Laptop-Stapel unter dem Tisch: GAMING.stack. Wände von außen unsichtbar → Kamera darf hinter die Rückwand.
 */
export const GAMING = {desk: {x0: -1.75, x1: -0.45, z0: -1.9, z1: -1.25, h: 0.75}, laptop: [-1.1, 0.75, -1.5] as [number, number, number], chair: [-1.1, -0.95] as [number, number], stack: [-0.66, -1.58] as [number, number], poster: [-1.1, 1.68, -1.885] as [number, number, number]};

const GamingCorner = ({time}: {time: number}) => {
  const {desk} = GAMING;
  const W = desk.x1 - desk.x0;
  const Dp = desk.z1 - desk.z0;
  const cx = (desk.x0 + desk.x1) / 2;
  const cz = (desk.z0 + desk.z1) / 2;
  const hue = (time * 0.08) % 1;
  const ledA = new THREE.Color().setHSL(hue, 0.95, 0.55);
  const ledB = new THREE.Color().setHSL((hue + 0.5) % 1, 0.95, 0.55);
  return (
    <group>
      {/* Tischplatte + Beine (schwarz, Kante mit RGB) */}
      <mesh position={[cx, desk.h - 0.02, cz]} castShadow receiveShadow>
        <boxGeometry args={[W, 0.04, Dp]} />
        <meshStandardMaterial color="#1c1e24" roughness={0.5} />
      </mesh>
      <mesh position={[cx, desk.h - 0.045, desk.z1 + 0.003]}>
        <boxGeometry args={[W - 0.02, 0.012, 0.006]} />
        <meshBasicMaterial color={ledA} toneMapped={false} />
      </mesh>
      {/* vier schlanke Beine (unter dem Tisch frei für den Laptop-Stapel) */}
      {[desk.x0 + 0.04, desk.x1 - 0.04].flatMap((x) => [desk.z0 + 0.04, desk.z1 - 0.04].map((z) => (
        <mesh key={`${x}${z}`} position={[x, (desk.h - 0.04) / 2, z]}>
          <boxGeometry args={[0.04, desk.h - 0.04, 0.04]} />
          <meshStandardMaterial color="#2a2d35" />
        </mesh>
      )))}
      {/* großes Mauspad, Maus, Headset */}
      <mesh position={[cx + 0.05, desk.h + 0.002, cz + 0.08]} receiveShadow>
        <boxGeometry args={[W * 0.86, 0.004, 0.4]} />
        <meshStandardMaterial color="#2b2140" roughness={0.9} />
      </mesh>
      <mesh position={[cx + 0.05, desk.h + 0.005, cz + 0.08]}>
        <boxGeometry args={[W * 0.86 + 0.01, 0.002, 0.41]} />
        <meshBasicMaterial color={ledB} toneMapped={false} />
      </mesh>
      <group position={[GAMING.laptop[0] + 0.36, desk.h + 0.004, GAMING.laptop[2] + 0.12]}>
        <mesh position={[0, 0.018, 0]} scale={[1, 0.6, 1.4]} castShadow>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color="#15161a" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.032, 0.0]}>
          <boxGeometry args={[0.006, 0.004, 0.03]} />
          <meshBasicMaterial color={ledA} toneMapped={false} />
        </mesh>
      </group>
      <group position={[desk.x0 + 0.2, desk.h, desk.z0 + 0.2]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.11, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.09, 0.012, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#18191d" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.09, 0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.035, 12]} />
            <meshStandardMaterial color="#18191d" emissive={ledB} emissiveIntensity={0.4} />
          </mesh>
        ))}
      </group>
      {/* Dosen ohne Marke: auf dem Tisch + am Boden (eine umgekippt) */}
      {[
        [desk.x0 + 0.08, desk.h, desk.z0 + 0.08, '#2fd0a0', 0],
        [desk.x1 - 0.08, desk.h, desk.z1 - 0.09, '#ff5a3c', 0],
        [desk.x1 - 0.1, desk.h, desk.z0 + 0.14, '#7a5cff', 0],
        [desk.x1 - 0.18, desk.h, desk.z0 + 0.1, '#2fd0a0', 0],
        [desk.x0 + 0.16, 0, desk.z1 + 0.25, '#ff5a3c', 0],
        [desk.x0 + 0.32, 0.032, desk.z1 + 0.36, '#7a5cff', Math.PI / 2],
      ].map(([x, y, z, c, t], i) => (
        <group key={i} position={[x as number, y as number, z as number]} rotation={[0, i * 0.7, 0]}>
          <EnergyCan color={c as string} tilt={t as number} />
        </group>
      ))}
      {/* Plakat über dem Tisch */}
      <group position={GAMING.poster}>
        <PiratePoster />
      </group>
      {/* RGB-Leisten an der Rückwand (über dem Tisch) und unter der Decke */}
      <mesh position={[cx, 2.38, desk.z0 + 0.012]}>
        <planeGeometry args={[3.0, 0.025]} />
        <meshBasicMaterial color={ledB} toneMapped={false} />
      </mesh>
      <mesh position={[-1.79, 2.38, 0]}>
        <boxGeometry args={[0.01, 0.025, 3.6]} />
        <meshBasicMaterial color={ledA} toneMapped={false} />
      </mesh>
      <mesh position={[cx, 1.07, desk.z0 + 0.012]}>
        <planeGeometry args={[W - 0.1, 0.018]} />
        <meshBasicMaterial color={ledA} toneMapped={false} />
      </mesh>
      <pointLight position={[cx, 1.2, desk.z0 + 0.35]} intensity={1.6} color={ledA} distance={3.2} decay={1.6} />
      <pointLight position={[cx + 0.6, 2.2, desk.z0 + 0.6]} intensity={1.2} color={ledB} distance={4} decay={1.5} />
      <pointLight position={[0.8, 2.2, 0.4]} intensity={0.9} color="#8a5cff" distance={5} decay={1.4} />
      {/* RGB-Schein unter dem Tisch (Laptop-Stapel gut sichtbar) */}
      <pointLight position={[-0.8, 0.35, desk.z1 - 0.05]} intensity={0.9} color={ledB} distance={1.6} decay={1.6} />
    </group>
  );
};

export const BEDROOM = {W: 3.6, D: 3.8, H: 2.5, desk: {x: -1.525, z: -0.4, h: 0.75}, chair: {x: -1.25, z: 0.55, face: 145}, sideTable: {x: -1.6, z: 1.0, h: 0.72}, nightstand: {x: -0.3, z: -1.7, h: 0.52}};

const Bed = () => {
  const m = useMemo(
    () => ({
      frame: std('#9a6b43'),
      mattress: std('#f4efe6'),
      duvet: std('#6f9fc9', {roughness: 0.95}),
      duvetDark: std('#5b88b3', {roughness: 0.95}),
      pillow: std('#fbf6ec', {roughness: 0.95}),
    }),
    [],
  );
  // Bett: Länge entlang x (1.8 m), Breite entlang z (0.95 m); Ursprung = Boden, Mitte des Betts
  return (
    <group>
      <mesh material={m.frame} position={[0, 0.17, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.26, 0.95]} />
      </mesh>
      <mesh material={m.mattress} position={[0, 0.37, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.74, 0.16, 0.9]} />
      </mesh>
      {/* Bettdecke (zurückgeschlagen) */}
      <mesh material={m.duvet} position={[-0.25, 0.47, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 0.06, 0.94]} />
      </mesh>
      <mesh material={m.duvetDark} position={[0.37, 0.49, 0]} rotation={[0, 0, 0.15]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.94]} />
      </mesh>
      {/* Kopfkissen + Kopfteil rechts */}
      <mesh material={m.pillow} position={[0.62, 0.52, 0]} rotation={[0, 0, 0.12]} castShadow>
        <boxGeometry args={[0.36, 0.12, 0.7]} />
      </mesh>
      <mesh material={m.frame} position={[0.88, 0.55, 0]} castShadow>
        <boxGeometry args={[0.06, 1.0, 0.95]} />
      </mesh>
      {/* kleines Kuscheltier */}
      <group position={[0.45, 0.6, 0.28]}>
        <mesh position={[0, 0, 0]}>
          <icosahedronGeometry args={[0.08, 1]} />
          <meshStandardMaterial color="#c99b6d" flatShading />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <icosahedronGeometry args={[0.06, 1]} />
          <meshStandardMaterial color="#c99b6d" flatShading />
        </mesh>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[0, 0.16, k * 0.04]}>
            <icosahedronGeometry args={[0.022, 0]} />
            <meshStandardMaterial color="#a77a50" flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const Lamp = ({h = 0.3, shade = '#fff1d0', light = 1.6}: {h?: number; shade?: string; light?: number}) => (
  <group>
    <mesh position={[0, 0.015, 0]}>
      <cylinderGeometry args={[0.07, 0.08, 0.03, 10]} />
      <meshStandardMaterial color="#3a3f45" />
    </mesh>
    <mesh position={[0, h / 2, 0]}>
      <cylinderGeometry args={[0.012, 0.012, h, 6]} />
      <meshStandardMaterial color="#3a3f45" />
    </mesh>
    <mesh position={[0, h + 0.06, 0]}>
      <cylinderGeometry args={[0.08, 0.13, 0.15, 10, 1, true]} />
      <meshStandardMaterial color={shade} emissive="#ffd896" emissiveIntensity={0.9} side={THREE.DoubleSide} />
    </mesh>
    <pointLight position={[0, h, 0.05]} intensity={light} color="#ffd59a" distance={3.5} decay={1.5} />
  </group>
);

/** Blick aus dem Fenster am Morgen: Rasen, Holzzaun, Nachbarhaus mit rotem Dach, Baum, Sonne. Flache Kulisse bei x (schaut nach +x) */
const MorningView = ({x}: {x: number}) => {
  const P = (z: number, y: number, w: number, h: number, color: string, d = 0) => (
    <mesh position={[x - d, y, z]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
  return (
    <group>
      {P(-0.4, 0.55, 4, 1.1, '#6fb04a', 0.03)}
      {P(-0.4, 1.03, 4, 0.14, '#b48a5e', 0.0)}
      {[-1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8].map((z) => (
        <mesh key={z} position={[x + 0.01, 1.12, z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.07, 0.34]} />
          <meshBasicMaterial color="#c49a6a" />
        </mesh>
      ))}
      {P(-0.75, 1.62, 1.1, 0.95, '#f0e6d4', 0.06)}
      <mesh position={[x - 0.06, 2.095, -0.75]} rotation={[0, Math.PI / 2, 0]}>
        <shapeGeometry args={[new THREE.Shape([new THREE.Vector2(-0.68, 0), new THREE.Vector2(0.68, 0), new THREE.Vector2(0, 0.5)])]} />
        <meshBasicMaterial color="#b5523a" />
      </mesh>
      {P(-0.95, 1.55, 0.22, 0.25, '#7aa3bd', 0.055)}
      {P(-0.5, 1.55, 0.22, 0.25, '#7aa3bd', 0.055)}
      <mesh position={[x - 0.04, 1.65, 0.25]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.38, 9]} />
        <meshBasicMaterial color="#4f9a3a" />
      </mesh>
      {P(0.25, 1.15, 0.07, 0.5, '#6b4a30', 0.045)}
      <mesh position={[x - 0.08, 2.35, 0.55]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial color="#fff3b8" />
      </mesh>
    </group>
  );
};

/**
 * "schlafzimmer-nacht" (Spezial Drucker): dasselbe Schlafzimmer mitten in der Nacht – Licht AUS (nur Mondlicht durchs Fenster), Schreibtisch
 * leer geräumt (Platz für Drucker + 3D-Drucker), Lampen aus, Tür in der rechten Wand steht OFFEN (Öffnung z 0.56 … 1.44, 2,0 m hoch, dunkler
 * Flur dahinter). Das Zimmerlicht geht über das Objekt "zimmerlicht" (Wert glow 0 … 1) an. Plätze in NIGHT.
 */
export const NIGHT = {door: {z: 1.0, w: 0.88, h: 2.0}, deskTop: 0.75, desk: {x0: -1.8, x1: -1.05, z0: -1.0, z1: 0.2}, bedHip: [0.8, -1.425] as [number, number], nightstand: [-0.3, -1.7] as [number, number]};

const NightHall = ({x}: {x: number}) => (
  <group position={[x, 0, NIGHT.door.z]}>
    {/* schmaler dunkler Flur direkt hinter der Türöffnung (nur von innen durch die Tür zu sehen) */}
    <mesh position={[0.6, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.2, 1.1]} />
      <meshStandardMaterial color="#3a3026" />
    </mesh>
    <mesh position={[1.2, 1.25, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[1.1, 2.5]} />
      <meshStandardMaterial color="#4a4f63" />
    </mesh>
    {/* Zarge (Türblatt steht unsichtbar weit offen im Flur) */}
    {[[0, NIGHT.door.h + 0.04, NIGHT.door.w + 0.16, 0.08], [-NIGHT.door.w / 2 - 0.04, NIGHT.door.h / 2, 0.08, NIGHT.door.h + 0.08], [NIGHT.door.w / 2 + 0.04, NIGHT.door.h / 2, 0.08, NIGHT.door.h + 0.08]].map(([dz, y, w, h], i) => (
      <mesh key={i} position={[-0.012, y, dz]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#f7f7f5" />
      </mesh>
    ))}
  </group>
);

const BedroomScene = ({morning = false, gaming = false, night = false}: {morning?: boolean; gaming?: boolean; night?: boolean}) => {
  const frame = useCurrentFrame();
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: plankTexture([2.5, 5]), roughness: 0.7}),
      wall: std('#ecdcc6', {roughness: 0.95, flatShading: false}),
      back: std('#9fb9a6', {roughness: 0.95, flatShading: false}),
      wood: std('#a87b52'),
      woodDark: std('#7d5a3c'),
    }),
    [],
  );
  const {W, D, H, desk, chair, nightstand} = BEDROOM;
  return (
    <Room
      W={W}
      D={D}
      H={H}
      floor={mats.floor}
      wall={mats.wall}
      backWall={mats.back}
      ceiling="#f6efe4"
      window={morning ? {side: -1, z: -0.4, w: 1.0, y: 1.05, h: 1.0, sky: '#8fcdf4', open: true} : {side: -1, z: -0.4, w: 1.0, y: 1.05, h: 1.0, sky: night ? '#1d2a52' : '#3b4f86'}}
      sideDoor={night ? {side: 1, ...NIGHT.door} : undefined}
      ceilingLamp={!night}
      light={night ? {ambient: 0.13, hemi: 0.16, sun: 0.75, sunColor: '#8fa6ff', lamp: 0, lampColor: '#ffdcae'} : morning ? {ambient: 0.62, hemi: 0.75, sun: 2.4, sunColor: '#fff0d2', lamp: 1.6, lampColor: '#fff1dc'} : gaming ? {ambient: 0.36, hemi: 0.45, sun: 0.7, sunColor: '#b9c6ff', lamp: 2.2, lampColor: '#ffd9b8'} : {ambient: 0.48, hemi: 0.6, sun: 0.9, sunColor: '#c9d6ff', lamp: 3.6, lampColor: '#ffdcae'}}
      sunPos={morning ? [-5.5, 3.4, -0.2] : [-4, 3.5, 0.5]}
      bg={morning ? '#cfe6f5' : night ? '#141a30' : '#2b3558'}
    >
      {night && <NightHall x={W / 2} />}
      {/* Morgens: Blick nach draußen (Rasen, Zaun, Nachbarhaus, Baum) */}
      {morning && <MorningView x={-W / 2 - 1.3} />}
      {/* Mond + Sterne hinter dem Fenster */}
      {!morning && <><mesh position={[-W / 2 - 1.3, 2.05, -0.15]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial color="#fff6d6" />
      </mesh>
      {[
        [-0.9, 1.75],
        [-0.35, 2.2],
        [0.25, 1.95],
        [0.6, 2.35],
        [-0.65, 2.45],
      ].map(([z, y], i) => (
        <mesh key={i} position={[-W / 2 - 1.35, y, z]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.025, 5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}</>}
      {/* Bett an der Rückwand rechts */}
      <group position={[0.85, 0, -D / 2 + 0.475]}>
        <Bed />
      </group>
      {gaming && <GamingCorner time={frame / 30} />}
      {gaming && (
        <group position={[GAMING.chair[0], 0, GAMING.chair[1] + 0.02]} rotation={[0, Math.PI, 0]}>
          <GamingChair />
        </group>
      )}
      {/* Nachttisch mit Lampe */}
      {!gaming && <group position={[nightstand.x, 0, nightstand.z]}>
        <mesh material={mats.wood} position={[0, nightstand.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.42, nightstand.h, 0.38]} />
        </mesh>
        <mesh material={mats.woodDark} position={[0, nightstand.h * 0.6, 0.192]}>
          <boxGeometry args={[0.34, 0.012, 0.005]} />
        </mesh>
        <group position={[0.05, nightstand.h, -0.05]}>
          <Lamp h={0.22} light={morning ? 0.3 : night ? 0 : 1.4} />
        </group>
      </group>}
      {/* Schreibtisch an der linken Wand (unter dem Fenster) */}
      {!gaming && <><group position={[night ? -1.425 : desk.x, 0, desk.z]}>
        <mesh material={mats.wood} position={[0, desk.h - 0.025, 0]} castShadow receiveShadow>
          <boxGeometry args={[night ? 0.75 : 0.55, 0.05, 1.2]} />
        </mesh>
        {[
          [-0.23, -0.55],
          [0.23, -0.55],
          [-0.23, 0.55],
          [0.23, 0.55],
        ].map(([x, z]) => [night ? x * 1.4 : x, z]).map(([x, z], i) => (
          <mesh key={i} material={mats.woodDark} position={[x, (desk.h - 0.05) / 2, z]}>
            <boxGeometry args={[0.04, desk.h - 0.05, 0.04]} />
          </mesh>
        ))}
        {/* Lampe, Bücher, Laptop, Tasse (nachts leer geräumt für die Drucker) */}
        {!night && <><group position={[-0.12, desk.h, -0.45]}>
          <Lamp h={0.32} light={morning ? 0.25 : 1.2} />
        </group>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.1, desk.h + 0.02 + i * 0.035, 0.42]} rotation={[0, 0.1 * i, 0]} castShadow>
            <boxGeometry args={[0.22, 0.03, 0.3]} />
            <meshStandardMaterial color={['#c9573c', '#3f6fa6', '#e3b94b'][i]} flatShading />
          </mesh>
        ))}
        <mesh position={[0.02, desk.h + 0.012, -0.05]} rotation={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.26, 0.018, 0.36]} />
          <meshStandardMaterial color="#9aa3ad" metalness={0.4} roughness={0.4} />
        </mesh></>}
      </group>
      {/* Schreibtischstuhl (zur Kamera gedreht) */}
      <group position={[chair.x, 0, chair.z]} rotation={[0, ((180 - chair.face) * Math.PI) / 180, 0]}>
        <Chair color="#d07a4f" />
      </group>
      {/* runder Beistelltisch rechts neben dem Stuhl (Glas + Coolpack) */}
      <group position={[BEDROOM.sideTable.x, 0, BEDROOM.sideTable.z]}>
        <mesh material={mats.wood} position={[0, BEDROOM.sideTable.h - 0.02, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.27, 0.27, 0.04, 16]} />
        </mesh>
        <mesh material={mats.woodDark} position={[0, (BEDROOM.sideTable.h - 0.04) / 2, 0]}>
          <cylinderGeometry args={[0.03, 0.03, BEDROOM.sideTable.h - 0.04, 8]} />
        </mesh>
        <mesh material={mats.woodDark} position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.18, 0.2, 0.03, 12]} />
        </mesh>
      </group></>}
      {/* Teppich */}
      <mesh position={[0.1, 0.006, -0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.95, 20]} />
        <meshStandardMaterial color="#e6b7a0" />
      </mesh>
      {/* Tür in der rechten Wand vorn (nachts offen, siehe NightHall) */}
      {!night && <group position={[W / 2 - 0.02, 0, 1.0]}>
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[0.04, 2.08, 1.0]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
        <mesh position={[-0.02, 1.0, 0]}>
          <boxGeometry args={[0.03, 2.0, 0.88]} />
          <meshStandardMaterial color="#e9e3d6" flatShading />
        </mesh>
        <mesh position={[-0.06, 1.0, -0.34]}>
          <boxGeometry args={[0.05, 0.03, 0.14]} />
          <meshStandardMaterial color="#c0c6cc" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>}
      {/* Poster an der Rückwand über dem Bett + Regalbrett */}
      {!gaming && <><mesh position={[0.55, 1.6, -D / 2 + 0.015]}>
        <boxGeometry args={[0.6, 0.8, 0.02]} />
        <meshStandardMaterial color="#f3ede0" />
      </mesh>
      <mesh position={[0.55, 1.62, -D / 2 + 0.03]}>
        <planeGeometry args={[0.5, 0.7]} />
        <meshStandardMaterial color="#e9a14a" />
      </mesh>
      <mesh position={[0.55, 1.48, -D / 2 + 0.035]}>
        <circleGeometry args={[0.14, 12]} />
        <meshStandardMaterial color="#fbe2a6" />
      </mesh></>}
      <mesh position={[1.35, 1.75, -D / 2 + 0.11]} castShadow>
        <boxGeometry args={[0.55, 0.03, 0.2]} />
        <meshStandardMaterial color="#a87b52" />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[1.15 + i * 0.07, 1.87, -D / 2 + 0.11]} castShadow>
          <boxGeometry args={[0.05, 0.2 - (i % 2) * 0.04, 0.15]} />
          <meshStandardMaterial color={['#4f8f63', '#7d4f8f', '#3f6fa6', '#c9573c'][i]} />
        </mesh>
      ))}
      <group position={[1.45, 0, 0.15]}>
        <Plant s={1.1} />
      </group>
    </Room>
  );
};

// ---------- stilisierte Mitmenschen (ohne Gesicht) ----------
/** Einfache Person (ohne Gesicht), ca. 1,7 m. Ursprung = Boden. arm: 1 = rechter Arm hoch zum Haltegriff */
export const Commuter = ({coat = '#5a6b80', skin = '#e2b48c', hair = '#3b2a20', pants = '#2f3542', arm = 0, h = 1}: {coat?: string; skin?: string; hair?: string; pants?: string; arm?: number; h?: number}) => {
  const m = useMemo(() => ({coat: std(coat), skin: std(skin), hair: std(hair), pants: std(pants)}), [coat, skin, hair, pants]);
  return (
    <group scale={h}>
      {[-1, 1].map((k) => (
        <mesh key={k} material={m.pants} position={[k * 0.09, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.84, 7]} />
        </mesh>
      ))}
      <mesh material={m.coat} position={[0, 1.12, 0]} scale={[1, 1, 0.7]} castShadow>
        <cylinderGeometry args={[0.2, 0.18, 0.62, 8]} />
      </mesh>
      <mesh material={m.coat} position={[0, 1.42, 0]} scale={[1, 0.5, 0.7]} castShadow>
        <sphereGeometry args={[0.2, 8, 6]} />
      </mesh>
      <mesh material={m.skin} position={[0, 1.6, 0]} castShadow>
        <icosahedronGeometry args={[0.11, 1]} />
      </mesh>
      <mesh material={m.hair} position={[0, 1.66, -0.02]} scale={[1.05, 0.7, 1.05]}>
        <icosahedronGeometry args={[0.11, 1]} />
      </mesh>
      {/* Arme */}
      <mesh material={m.coat} position={[0.24, 1.1, 0]} rotation={[0, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.055, 0.05, 0.6, 6]} />
      </mesh>
      {arm > 0.5 ? (
        <mesh material={m.coat} position={[-0.22, 1.62, 0]} rotation={[0, 0, -0.15]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.6, 6]} />
        </mesh>
      ) : (
        <mesh material={m.coat} position={[-0.24, 1.1, 0]} rotation={[0, 0, -0.08]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.6, 6]} />
        </mesh>
      )}
    </group>
  );
};

// ---------- Aufzug ----------
export const ELEVATOR = {W: 1.7, D: 1.6, H: 2.3};
const ElevatorScene = () => {
  const mats = useMemo(
    () => ({
      floor: std('#4a4f57', {roughness: 0.6}),
      wall: std('#b8c0c8', {roughness: 0.35, metalness: 0.5, flatShading: false}),
      back: std('#aab3bc', {roughness: 0.3, metalness: 0.55, flatShading: false}),
    }),
    [],
  );
  const {W, D, H} = ELEVATOR;
  return (
    <Room
      W={W}
      D={D}
      H={H}
      floor={mats.floor}
      wall={mats.wall}
      backWall={mats.back}
      ceiling="#e9edf0"
      light={{ambient: 0.6, hemi: 0.6, sun: 0.7, sunColor: '#f2f6ff', lamp: 3.2, lampColor: '#f4f8ff'}}
      sunPos={[1, 4, 3]}
      bg="#1d2228"
      ceilingLamp={false}
    >
      {/* Lichtpaneel an der Decke */}
      <mesh position={[0, H - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.1, 1.0]} />
        <meshStandardMaterial color="#ffffff" emissive="#f2f7ff" emissiveIntensity={1.2} side={THREE.DoubleSide} />
      </mesh>
      {/* Handlauf hinten + Spiegel */}
      <mesh position={[0, 0.95, -D / 2 + 0.06]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, W - 0.2, 8]} />
        <meshStandardMaterial color="#d9dee2" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.6, -D / 2 + 0.01]}>
        <planeGeometry args={[1.2, 0.95]} />
        <meshStandardMaterial color="#c9d8e2" metalness={0.7} roughness={0.08} />
      </mesh>
      {/* Tastenfeld rechts */}
      <group position={[W / 2 - 0.01, 1.2, 0.35]}>
        <mesh>
          <boxGeometry args={[0.02, 0.5, 0.2]} />
          <meshStandardMaterial color="#7d868f" metalness={0.6} roughness={0.3} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[-0.012, 0.17 - Math.floor(i / 2) * 0.12, (i % 2 ? 1 : -1) * 0.045]} rotation={[0, -Math.PI / 2, 0]}>
            <circleGeometry args={[0.025, 10]} />
            <meshStandardMaterial color={i === 4 ? '#ffd24a' : '#e4e8ec'} emissive={i === 4 ? '#ffb000' : '#000000'} emissiveIntensity={0.8} />
          </mesh>
        ))}
      </group>
      {/* Stockwerk-Anzeige (Pfeil nach oben) */}
      <group position={[0, H - 0.2, -D / 2 + 0.02]}>
        <mesh>
          <boxGeometry args={[0.36, 0.14, 0.02]} />
          <meshStandardMaterial color="#14181c" />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <coneGeometry args={[0.04, 0.07, 3]} />
          <meshBasicMaterial color="#ff8a3d" />
        </mesh>
      </group>
      {/* Mitfahrende (eng!) */}
      <group position={[0.5, 0, -0.45]} rotation={[0, -0.25, 0]}>
        <Commuter coat="#3f6fa6" hair="#d9b46a" />
      </group>
      <group position={[-0.45, 0, -0.55]} rotation={[0, 0.3, 0]}>
        <Commuter coat="#7a4b6d" hair="#2a2220" skin="#a8714f" h={1.05} />
      </group>
    </Room>
  );
};

// ---------- volle Bahn ----------
const TrainScene = () => {
  const frame = useCurrentFrame();
  const mats = useMemo(
    () => ({
      floor: std('#5b5f66', {roughness: 0.8}),
      wall: std('#e7e9e6', {roughness: 0.6, flatShading: false}),
      seat: std('#2f6fa8', {roughness: 0.9}),
      pole: new THREE.MeshStandardMaterial({color: '#f2c81e', metalness: 0.4, roughness: 0.35}),
      strap: std('#e4e4e0'),
      tunnel: new THREE.MeshBasicMaterial({color: '#151a20'}),
      light: new THREE.MeshBasicMaterial({color: '#ffd28a'}),
    }),
    [],
  );
  const L = 14;
  const speed = 9; // m/s, Tunnel-Lichter huschen vorbei
  const off = ((frame / 30) * speed) % 4;
  return (
    <>
      <color attach="background" args={['#151a20']} />
      <ambientLight intensity={0.65} color="#fff8ee" />
      <hemisphereLight args={['#ffffff', '#6b665f', 0.6]} />
      <directionalLight position={[0.5, 4, 3]} intensity={0.9} color="#ffffff" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={5} shadow-camera-bottom={-5} />
      {[-4, 0, 4].map((z) => (
        <pointLight key={z} position={[0, 2.1, z]} intensity={2.2} color="#fff4e0" distance={6} decay={1.5} />
      ))}
      <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.6, L]} />
      </mesh>
      {/* Decke + Lichtleisten */}
      <mesh position={[0, 2.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, L]} />
        <meshStandardMaterial color="#f0f1ee" />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 2.28, 0]}>
          <boxGeometry args={[0.12, 0.02, L]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff7e8" emissiveIntensity={1.3} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* Wand unten + oben, Fensterband dazwischen */}
          <mesh material={mats.wall} position={[s * 1.3, 0.45, 0]} rotation={[0, -s * Math.PI / 2, 0]}>
            <planeGeometry args={[L, 0.9]} />
          </mesh>
          <mesh material={mats.wall} position={[s * 1.3, 2.05, 0]} rotation={[0, -s * Math.PI / 2, 0]}>
            <planeGeometry args={[L, 0.5]} />
          </mesh>
          <mesh material={mats.tunnel} position={[s * 1.6, 1.35, 0]} rotation={[0, -s * Math.PI / 2, 0]}>
            <planeGeometry args={[L, 1.2]} />
          </mesh>
          {Array.from({length: 5}).map((_, i) => (
            <mesh key={i} material={mats.light} position={[s * 1.58, 1.15 + (i % 2) * 0.35, -L / 2 + i * 4 + off - (s > 0 ? 1.3 : 0)]} rotation={[0, -s * Math.PI / 2, 0]}>
              <planeGeometry args={[0.9, 0.05]} />
            </mesh>
          ))}
          {/* Fensterrahmen-Stege */}
          {Array.from({length: 8}).map((_, i) => (
            <mesh key={i} material={mats.wall} position={[s * 1.29, 1.35, -L / 2 + i * 1.9]}>
              <boxGeometry args={[0.04, 1.2, 0.14]} />
            </mesh>
          ))}
          {/* Sitzbänke */}
          <mesh material={mats.seat} position={[s * 1.05, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.48, 0.1, L - 1]} />
          </mesh>
          <mesh material={mats.seat} position={[s * 1.26, 0.75, 0]} castShadow>
            <boxGeometry args={[0.08, 0.6, L - 1]} />
          </mesh>
          {/* Haltestange oben + Griffe */}
          <mesh material={mats.pole} position={[s * 0.45, 2.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, L, 8]} />
          </mesh>
          {Array.from({length: 12}).map((_, i) => {
            const z = -L / 2 + 0.6 + i * 1.1;
            const sw = Math.sin(frame / 30 * 1.1 + i) * 0.05;
            return (
              <group key={i} position={[s * 0.45, 2.08, z]} rotation={[sw, 0, 0]}>
                <mesh material={mats.strap} position={[0, -0.09, 0]}>
                  <boxGeometry args={[0.025, 0.16, 0.015]} />
                </mesh>
                <mesh material={mats.strap} position={[0, -0.2, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[0.05, 0.012, 4, 10]} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
      {/* senkrechte Stangen */}
      {[-3.0, -6.2].map((z) => (
        <mesh key={z} material={mats.pole} position={[0, 1.15, z]}>
          <cylinderGeometry args={[0.02, 0.02, 2.3, 8]} />
        </mesh>
      ))}
      {/* viele Fahrgäste */}
      {[
        [-0.55, -1.2, 0.3, '#c9573c', 1],
        [0.6, -1.6, -0.4, '#4f8f63', 1],
        [0.0, -2.6, 0.1, '#7d4f8f', 0],
        [-0.65, -3.4, 0.6, '#e3b94b', 1],
        [0.55, -4.2, -0.2, '#3f6fa6', 0],
        [-0.2, -5.0, 0.2, '#dfe4e8', 1],
        [0.75, 0.6, -0.7, '#8a5d3b', 1],
        [-0.8, 0.3, 0.9, '#5a6b80', 0],
      ].map(([x, z, r, c, a], i) => (
        <group key={i} position={[x as number, 0, z as number]} rotation={[0, r as number, 0]}>
          <Commuter coat={c as string} hair={['#3b2a20', '#d9b46a', '#2a2220', '#8a4b2a'][i % 4]} skin={['#e2b48c', '#a8714f', '#f0c9a5', '#7a4f36'][i % 4]} arm={a as number} h={0.95 + (i % 3) * 0.04} />
        </group>
      ))}
      {/* Sitzende */}
      {[
        [-1.05, -2.0, '#9a6b43'],
        [1.05, -2.8, '#c86b45'],
        [-1.05, -4.4, '#2f6f6f'],
      ].map(([x, z, c], i) => (
        <group key={i} position={[x as number, -0.42, z as number]} rotation={[0, (x as number) < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <Commuter coat={c as string} h={0.95} />
        </group>
      ))}
    </>
  );
};

export const bedroomStage: StageDef = {id: 'schlafzimmer', Component: () => <BedroomScene />, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};
/** "schlafzimmer-morgen": dasselbe Schlafzimmer am Morgen – helles Sonnenlicht, Fenster offen (ohne Mittelsteg), draußen Rasen, Zaun, Nachbarhaus */
export const gamingRoomStage: StageDef = {id: 'gamingzimmer', Component: () => <BedroomScene gaming />, climbTrees: [], groundHeight: () => 0, ambience: 'gaming-atmo'};
export const bedroomMorningStage: StageDef = {id: 'schlafzimmer-morgen', Component: () => <BedroomScene morning />, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};
export const elevatorStage: StageDef = {id: 'aufzug', Component: ElevatorScene, climbTrees: [], groundHeight: () => 0, ambience: 'aufzug-summen'};
export const trainStage: StageDef = {id: 'bahn', Component: TrainScene, climbTrees: [], groundHeight: () => 0, ambience: 'bahn-atmo'};
export const bedroomNightStage: StageDef = {id: 'schlafzimmer-nacht', Component: () => <BedroomScene night />, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};
