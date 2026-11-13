import {useMemo} from 'react';
import * as THREE from 'three';
import {useFontTexture} from '../actors/ToothProps';
import {T} from '../ui/theme';
import {Chair, Room, std, tileTexture} from './Rooms';
import type {StageDef} from './types';

/**
 * Bühne "polizeiwache": stilisierte Polizeiwache (Wachraum mit Tresen) am Abend – wiederverwendbar.
 * Ohne echte Logos/Wappen: nur das Wort "POLIZEI" auf einer blauen Tafel.
 *
 * Koordinaten (Innenraum-Baukasten, Boden y = 0, vorn offen):
 * - Raum W 6.4 × D 5.4 × H 2.8, Rückwand z = −2.7.
 * - Tresen quer durch den Raum: x −2.2 … 2.2, Platte 1,05 m hoch, z −1.3 … −0.45 (Vorderkante z −0.45),
 *   Front-Verkleidung bei z −0.55. Davor steht der Besucher (z. B. Dummy bei z −0.2, face 0),
 *   dahinter die Beamtin/der Beamte (z. B. bei z −1.7, face 180).
 * - Auf dem Tresen: Klingel (1.7, −0.75), Schild "ANMELDUNG" (−1.75, −0.9). Freie Fläche x −1.3 … 1.3.
 * - Rückwand: Tafel "POLIZEI" (Mitte x 0, Höhe 2.2), Pinnwand links, Uhr rechts, Aktenschrank (2.4, −2.4),
 *   Schreibtisch mit Bildschirm hinten links (−1.6, −2.1). Fenster links (Abendhimmel), Tür rechts (x 3.2, z 0.6).
 * - Wartebereich vorn links: zwei Stühle (−2.6, 1.2) und (−2.6, 1.8), Blick nach +x; Pflanze vorn rechts (2.8, 1.6).
 */
export const POLICE = {W: 6.4, D: 5.4, H: 2.8, counterTop: 1.05, counterFront: -0.45, counterBack: -1.3};

const signTexture = (text: string, bg: string, fg: string, w: number, h: number, font: number) => () => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `800 ${font}px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + font * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
const policeTex = signTexture('POLIZEI', '#1f3f73', '#ffffff', 1024, 256, 190);
const deskTex = signTexture('ANMELDUNG', '#ffffff', '#1f3f73', 512, 128, 86);

const SignPlane = ({draw, k, w, h, emissive = 0.35}: {draw: () => THREE.Texture; k: string; w: number; h: number; emissive?: number}) => {
  const tex = useFontTexture(draw, k);
  const mat = useMemo(
    () =>
      tex
        ? new THREE.MeshStandardMaterial({map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: emissive, roughness: 0.6})
        : new THREE.MeshStandardMaterial({color: '#1f3f73'}),
    [tex, emissive],
  );
  return (
    <mesh material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
};

/** Tresen: Platte + Front-Verkleidung, Ursprung = Mitte am Boden unter der Vorderkante */
export const ServiceCounter = ({w = 4.4}: {w?: number}) => {
  const m = useMemo(
    () => ({
      top: std('#d9dcdf', {roughness: 0.45}),
      edge: std('#9aa3ad', {roughness: 0.4, metalness: 0.3}),
      front: std('#2f4f7c', {roughness: 0.7}),
      stripe: std('#c9d6e6', {roughness: 0.6}),
      back: std('#c6cbd1', {roughness: 0.8}),
    }),
    [],
  );
  const d = POLICE.counterFront - POLICE.counterBack;
  return (
    <group>
      <mesh material={m.top} position={[0, POLICE.counterTop - 0.025, -d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.05, d]} />
      </mesh>
      <mesh material={m.edge} position={[0, POLICE.counterTop - 0.025, 0.002]}>
        <boxGeometry args={[w + 0.01, 0.055, 0.012]} />
      </mesh>
      <mesh material={m.front} position={[0, (POLICE.counterTop - 0.05) / 2, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[w, POLICE.counterTop - 0.05, 0.06]} />
      </mesh>
      <mesh material={m.stripe} position={[0, 0.72, -0.068]}>
        <boxGeometry args={[w, 0.06, 0.01]} />
      </mesh>
      {/* Arbeitsfläche dahinter (etwas tiefer) */}
      <mesh material={m.back} position={[0, 0.74, -d + 0.05]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.04, 0.35]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.front} position={[(s * w) / 2 - s * 0.03, (POLICE.counterTop - 0.05) / 2, -d / 2]} castShadow>
          <boxGeometry args={[0.06, POLICE.counterTop - 0.05, d]} />
        </mesh>
      ))}
    </group>
  );
};

const CounterBell = () => (
  <group>
    <mesh position={[0, 0.012, 0]}>
      <cylinderGeometry args={[0.055, 0.06, 0.024, 14]} />
      <meshStandardMaterial color="#2a2d33" />
    </mesh>
    <mesh position={[0, 0.045, 0]}>
      <sphereGeometry args={[0.045, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#d8c169" metalness={0.8} roughness={0.25} />
    </mesh>
    <mesh position={[0, 0.095, 0]}>
      <cylinderGeometry args={[0.008, 0.008, 0.012, 8]} />
      <meshStandardMaterial color="#d8c169" metalness={0.8} roughness={0.25} />
    </mesh>
  </group>
);

const PinBoard = () => {
  const papers = [
    [-0.3, 0.12, '#fbfaf5', -0.05],
    [0.05, 0.16, '#fff3b8', 0.06],
    [0.32, 0.08, '#fbfaf5', -0.03],
    [-0.15, -0.18, '#d9ecff', 0.04],
    [0.2, -0.17, '#fbfaf5', -0.07],
  ] as const;
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.0, 0.75, 0.03]} />
        <meshStandardMaterial color="#b98f5e" flatShading />
      </mesh>
      {papers.map(([x, y, c, r], i) => (
        <group key={i} position={[x, y, 0.018]} rotation={[0, 0, r]}>
          <mesh>
            <planeGeometry args={[0.2, 0.27]} />
            <meshStandardMaterial color={c} />
          </mesh>
          {[0, 1, 2].map((j) => (
            <mesh key={j} position={[0, 0.06 - j * 0.05, 0.001]}>
              <planeGeometry args={[0.14, 0.012]} />
              <meshStandardMaterial color="#9aa0a8" />
            </mesh>
          ))}
          <mesh position={[0, 0.115, 0.004]}>
            <sphereGeometry args={[0.012, 6, 4]} />
            <meshStandardMaterial color={i % 2 ? '#d7362b' : '#2b6fd6'} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const SimpleClock = () => (
  <group>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.2, 0.2, 0.04, 24]} />
      <meshStandardMaterial color="#26292e" />
    </mesh>
    <mesh position={[0, 0, 0.021]}>
      <circleGeometry args={[0.175, 24]} />
      <meshStandardMaterial color="#fbfaf6" />
    </mesh>
    <mesh position={[0.0, 0.05, 0.025]} rotation={[0, 0, -0.5]}>
      <boxGeometry args={[0.012, 0.11, 0.004]} />
      <meshStandardMaterial color="#1d2026" />
    </mesh>
    <mesh position={[0.05, 0.0, 0.025]} rotation={[0, 0, Math.PI / 2 + 0.2]}>
      <boxGeometry args={[0.012, 0.14, 0.004]} />
      <meshStandardMaterial color="#1d2026" />
    </mesh>
  </group>
);

const FilingCabinet = () => (
  <group>
    <mesh position={[0, 0.65, 0]} castShadow>
      <boxGeometry args={[0.5, 1.3, 0.6]} />
      <meshStandardMaterial color="#8e98a3" flatShading metalness={0.3} roughness={0.5} />
    </mesh>
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} position={[0, 0.2 + i * 0.3, 0.302]}>
        <boxGeometry args={[0.16, 0.025, 0.02]} />
        <meshStandardMaterial color="#d6dbe0" metalness={0.6} roughness={0.3} />
      </mesh>
    ))}
  </group>
);

const BackDesk = () => (
  <group>
    <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.3, 0.04, 0.7]} />
      <meshStandardMaterial color="#e8e4dc" flatShading />
    </mesh>
    {[
      [-0.6, -0.3],
      [0.6, -0.3],
      [-0.6, 0.3],
      [0.6, 0.3],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.36, z]}>
        <boxGeometry args={[0.04, 0.72, 0.04]} />
        <meshStandardMaterial color="#7a8590" metalness={0.3} />
      </mesh>
    ))}
    <group position={[0.1, 0.76, -0.12]}>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.05, 0.12, 0.05]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[0, 0.27, 0]} castShadow>
        <boxGeometry args={[0.55, 0.34, 0.03]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[0, 0.27, 0.017]}>
        <planeGeometry args={[0.5, 0.29]} />
        <meshStandardMaterial color="#7fb0e0" emissive="#5d97d6" emissiveIntensity={0.5} />
      </mesh>
    </group>
  </group>
);

const Plant = () => (
  <group>
    <mesh position={[0, 0.2, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.16, 0.4, 10]} />
      <meshStandardMaterial color="#b65f3d" flatShading />
    </mesh>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <mesh key={i} position={[Math.cos(i * 1.05) * 0.12, 0.65 + (i % 2) * 0.15, Math.sin(i * 1.05) * 0.12]} scale={[0.22, 0.32, 0.22]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={i % 2 ? '#3f7a3a' : '#4f8f44'} flatShading />
      </mesh>
    ))}
  </group>
);

const PoliceScene = () => {
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tileTexture('#b9bfc4', '#a3aab0', [10, 18]), roughness: 0.6}),
      wall: std('#e6e9e4', {roughness: 0.95, flatShading: false}),
      back: std('#dfe6ee', {roughness: 0.95, flatShading: false}),
      door: std('#7a8796', {roughness: 0.6}),
      frame: std('#5b6673', {roughness: 0.5}),
    }),
    [],
  );
  const {W, D, H} = POLICE;
  return (
    <Room
      W={W}
      D={D}
      H={H}
      floor={mats.floor}
      wall={mats.wall}
      backWall={mats.back}
      ceiling="#f4f4f2"
      window={{side: -1, z: -0.9, w: 1.4, y: 1.0, h: 1.3, sky: '#6c6a9a'}}
      light={{ambient: 0.55, hemi: 0.7, sun: 1.2, sunColor: '#fff4e6', lamp: 7, lampColor: '#f2f6ff'}}
      sunPos={[2.5, 4.5, 4]}
      bg="#2a2f45"
    >
      {/* Tresen */}
      <group position={[0, 0, POLICE.counterFront]}>
        <ServiceCounter />
      </group>
      <group position={[1.7, POLICE.counterTop, -0.75]}>
        <CounterBell />
      </group>
      <group position={[-1.75, POLICE.counterTop + 0.07, -0.9]} rotation={[-0.25, 0, 0]}>
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[0.42, 0.13, 0.015]} />
          <meshStandardMaterial color="#1f3f73" />
        </mesh>
        <group position={[0, 0, 0.0]}>
          <SignPlane draw={deskTex} k="Schild Anmeldung" w={0.4} h={0.1} emissive={0.2} />
        </group>
      </group>
      {/* Rückwand: Tafel POLIZEI, Pinnwand, Uhr */}
      <group position={[0, 2.2, -D / 2 + 0.02]}>
        <SignPlane draw={policeTex} k="Schild Polizei" w={1.9} h={0.475} emissive={0.45} />
      </group>
      <group position={[-1.75, 1.55, -D / 2 + 0.03]}>
        <PinBoard />
      </group>
      <group position={[1.6, 2.15, -D / 2 + 0.03]}>
        <SimpleClock />
      </group>
      <group position={[2.4, 0, -2.35]}>
        <FilingCabinet />
      </group>
      <group position={[-1.7, 0, -2.2]}>
        <BackDesk />
      </group>
      <group position={[-1.7, 0, -1.6]} rotation={[0, Math.PI, 0]}>
        <Chair color="#2f3f57" />
      </group>
      {/* Tür in der rechten Wand */}
      <group position={[W / 2 - 0.02, 0, 0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh material={mats.frame} position={[0, 1.06, 0]}>
          <boxGeometry args={[1.05, 2.14, 0.04]} />
        </mesh>
        <mesh material={mats.door} position={[0, 1.03, 0.015]}>
          <boxGeometry args={[0.93, 2.05, 0.04]} />
        </mesh>
        <mesh position={[-0.36, 1.05, 0.05]}>
          <boxGeometry args={[0.14, 0.03, 0.04]} />
          <meshStandardMaterial color="#d6dbe0" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      {/* Wartebereich */}
      {[1.2, 1.8].map((z) => (
        <group key={z} position={[-2.65, 0, z]} rotation={[0, Math.PI / 2, 0]}>
          <Chair color="#3d5a80" />
        </group>
      ))}
      <group position={[2.8, 0, 1.6]}>
        <Plant />
      </group>
    </Room>
  );
};

export const policeStationStage: StageDef = {
  id: 'polizeiwache',
  Component: PoliceScene,
  climbTrees: [],
  groundHeight: () => 0,
  ambience: 'uhr-ticken',
};
