import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, rng} from '../lib/anim';

/**
 * Schüssel / Zinkwanne mit heißem, dampfendem Wasser (Figurname "schuessel").
 * Bewegung "steam" = dampft, alles andere (z. B. "park") = Wasser ohne Dampf.
 * Größe: Ø ca. 0,5 m oben, 0,2 m hoch – ein Fuß passt hinein.
 * Für weitere Videos nutzbar (Verbrühung, Erfrierung …).
 */
const R_TOP = 0.26;
const R_BOT = 0.21;
const H = 0.2;
export const BASIN_WATER = 0.14;

export const Basin = ({time, steaming}: {time: number; steaming: boolean}) => {
  const mats = useMemo(
    () => ({
      zinc: new THREE.MeshStandardMaterial({color: '#c9d1d7', roughness: 0.45, metalness: 0.25, flatShading: true, side: THREE.DoubleSide}),
      rim: new THREE.MeshStandardMaterial({color: '#e1e6ea', roughness: 0.4, metalness: 0.3, flatShading: true}),
      water: new THREE.MeshStandardMaterial({color: '#a9dde3', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.82, flatShading: true}),
    }),
    [],
  );
  const puffs = useMemo(() => {
    const r = rng(41);
    return Array.from({length: 14}, (_, i) => ({ph: i / 14 + r() * 0.05, a: r() * Math.PI * 2, d: r() * 0.14, s: 0.05 + r() * 0.04, sway: r() * 6}));
  }, []);
  const rWater = R_BOT + (R_TOP - R_BOT) * (BASIN_WATER / H);
  return (
    <group>
      {/* Wanne (offener Kegelstumpf) + Boden + Rand */}
      <mesh material={mats.zinc} position={[0, H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R_TOP, R_BOT, H, 14, 1, true]} />
      </mesh>
      <mesh material={mats.zinc} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[R_BOT, 14]} />
      </mesh>
      <mesh material={mats.rim} position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[R_TOP, 0.012, 5, 14]} />
      </mesh>
      {/* zwei Griffe */}
      {[1, -1].map((s) => (
        <mesh key={s} material={mats.rim} position={[s * (R_TOP + 0.02), H - 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.035, 0.008, 4, 8, Math.PI]} />
        </mesh>
      ))}
      {/* Wasser */}
      <mesh material={mats.water} position={[0, BASIN_WATER, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[rWater, 14]} />
      </mesh>
      {/* Dampf: Wölkchen steigen auf, werden größer und durchsichtiger */}
      {steaming &&
        puffs.map((p, i) => {
          const cycle = 2.4;
          const u = (((time / cycle + p.ph) % 1) + 1) % 1;
          const fadeIn = clamp(time / 0.6);
          const y = BASIN_WATER + 0.02 + u * 0.5;
          const x = Math.cos(p.a) * p.d + Math.sin(time * 1.3 + p.sway) * 0.03 * u;
          const z = Math.sin(p.a) * p.d;
          const s = p.s * (0.5 + u * 1.3);
          return (
            <mesh key={i} position={[x, y, z]} scale={s} renderOrder={5}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                color="#ffffff"
                roughness={1}
                transparent
                opacity={0.38 * Math.sin(Math.PI * u) * fadeIn}
                depthWrite={false}
                flatShading
              />
            </mesh>
          );
        })}
    </group>
  );
};
