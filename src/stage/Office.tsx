import {useMemo} from 'react';
import * as THREE from 'three';
import {Plant, plankTexture, Room, std} from './Rooms';
import type {StageDef} from './types';

/**
 * Bühne "buero": kleines Chef-Büro am Vormittag (Wecker-Spezial, wiederverwendbar).
 * W 4.4 (x −2.2 … 2.2), D 4.4 (Rückwand z −2.2), H 2.7. Fenster in der rechten Wand (Stadt-Himmel).
 *  - Chef-Schreibtisch (dunkles Holz, Platte 0,76 m) Mitte (−0.55, −0.35), 1,8 × 0,85 m, mit Bildschirm, Tischtelefon,
 *    Aktenstapel, Stifteköcher, Namensschild; großer Chefsessel dahinter (−0.55, −1.15).
 *  - Platz für den Wandkalender ("monatskalender"): Rückwand rechts, OFFICE.calendar (1.15, 1.45, −2.19).
 *    Chef davor stehend: OFFICE.chefAtCal (1.05, −1.6), face 0.
 *  - Aktenregal links an der Rückwand, Pflanze vorn rechts, Teppich.
 */
export const OFFICE = {W: 4.4, D: 4.4, H: 2.7, desk: {x: -0.55, z: -0.35, h: 0.76}, chair: {x: -0.55, z: -1.15}, calendar: {x: 1.15, y: 1.45, z: -2.19}, chefAtCal: {x: 1.05, z: -1.62}};

const ExecChair = () => {
  const m = useMemo(() => ({leather: std('#2b2d31', {roughness: 0.45}), steel: std('#b9bec4', {metalness: 0.7, roughness: 0.3})}), []);
  return (
    <group>
      <mesh material={m.steel} position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} material={m.steel} position={[Math.sin((i / 5) * Math.PI * 2) * 0.2, 0.04, Math.cos((i / 5) * Math.PI * 2) * 0.2]} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
          <boxGeometry args={[0.04, 0.03, 0.4]} />
        </mesh>
      ))}
      <mesh material={m.leather} position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.6, 0.12, 0.58]} />
      </mesh>
      <mesh material={m.leather} position={[0, 0.98, -0.27]} rotation={[-0.08, 0, 0]} castShadow>
        <boxGeometry args={[0.6, 0.95, 0.12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.leather} position={[s * 0.32, 0.66, 0]}>
          <boxGeometry args={[0.08, 0.06, 0.45]} />
        </mesh>
      ))}
    </group>
  );
};

const OfficeScene = () => {
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: plankTexture([3, 5]), roughness: 0.6, color: '#c9b49a'}),
      wall: std('#e9e6df', {roughness: 0.95, flatShading: false}),
      back: std('#cdd6dc', {roughness: 0.95, flatShading: false}),
      desk: std('#5a3a26', {roughness: 0.45}),
      deskDark: std('#3e281a', {roughness: 0.5}),
      black: std('#1c1e21', {roughness: 0.4}),
      screen: new THREE.MeshBasicMaterial({color: '#5d8fc9'}),
      paper: std('#f7f5ef'),
      brass: std('#c9a24a', {metalness: 0.7, roughness: 0.3}),
      shelf: std('#8a6a4a'),
    }),
    [],
  );
  const {W, D, H, desk, chair} = OFFICE;
  return (
    <Room
      W={W}
      D={D}
      H={H}
      floor={mats.floor}
      wall={mats.wall}
      backWall={mats.back}
      ceiling="#f4f3ef"
      window={{side: 1, z: -0.6, w: 1.3, y: 0.95, h: 1.3, sky: '#a9d4f2'}}
      light={{ambient: 0.6, hemi: 0.7, sun: 1.8, sunColor: '#fff4e2', lamp: 2.4, lampColor: '#fff6ea'}}
      sunPos={[5, 3.5, -0.2]}
      bg="#d8e4ec"
    >
      {/* Hochhäuser hinter dem Fenster */}
      {[
        [-1.2, 0.9, '#9fb3c4'],
        [-0.6, 1.3, '#8aa0b4'],
        [0.0, 1.0, '#a8bacb'],
        [0.5, 1.5, '#91a7ba'],
      ].map(([z, h, c], i) => (
        <mesh key={i} position={[W / 2 + 1.3, 0.95 + (h as number) / 2, z as number]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.45, h as number]} />
          <meshBasicMaterial color={c as string} />
        </mesh>
      ))}
      {/* Schreibtisch */}
      <group position={[desk.x, 0, desk.z]}>
        <mesh material={mats.desk} position={[0, desk.h - 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.06, 0.85]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={mats.deskDark} position={[s * 0.75, (desk.h - 0.06) / 2, 0]} castShadow>
            <boxGeometry args={[0.3, desk.h - 0.06, 0.8]} />
          </mesh>
        ))}
        <mesh material={mats.deskDark} position={[0, desk.h * 0.55, 0.38]}>
          <boxGeometry args={[1.2, desk.h * 0.7, 0.03]} />
        </mesh>
        {/* Bildschirm */}
        <group position={[-0.35, desk.h, -0.2]} rotation={[0, 0.35, 0]}>
          <mesh material={mats.black} position={[0, 0.01, 0]}>
            <boxGeometry args={[0.22, 0.02, 0.15]} />
          </mesh>
          <mesh material={mats.black} position={[0, 0.12, 0]}>
            <boxGeometry args={[0.04, 0.22, 0.03]} />
          </mesh>
          <mesh material={mats.black} position={[0, 0.33, 0.01]} castShadow>
            <boxGeometry args={[0.62, 0.38, 0.03]} />
          </mesh>
          <mesh material={mats.screen} position={[0, 0.33, 0.027]}>
            <planeGeometry args={[0.57, 0.33]} />
          </mesh>
        </group>
        {/* Tischtelefon (Hörer liegt daneben) */}
        <group position={[0.5, desk.h, -0.05]} rotation={[0, -0.3, 0]}>
          <mesh material={mats.black} position={[0, 0.04, 0]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 0.07, 0.2]} />
          </mesh>
          <mesh material={mats.black} position={[0.15, 0.025, 0.08]} rotation={[0, 0.5, 0]}>
            <boxGeometry args={[0.05, 0.04, 0.22]} />
          </mesh>
        </group>
        {/* Akten, Stifte, Namensschild */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} material={mats.paper} position={[0.1, desk.h + 0.012 + i * 0.022, -0.2]} rotation={[0, 0.08 * i, 0]} castShadow>
            <boxGeometry args={[0.3, 0.02, 0.4]} />
          </mesh>
        ))}
        <mesh material={mats.black} position={[-0.75, desk.h + 0.06, -0.25]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 10]} />
        </mesh>
        <mesh material={mats.brass} position={[0.1, desk.h + 0.03, 0.3]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[0.32, 0.07, 0.02]} />
        </mesh>
      </group>
      {/* Chefsessel */}
      <group position={[chair.x, 0, chair.z]}>
        <ExecChair />
      </group>
      {/* Aktenregal links an der Rückwand */}
      <group position={[-1.6, 0, -D / 2 + 0.2]}>
        {[0.02, 0.6, 1.2, 1.8].map((y) => (
          <mesh key={y} material={mats.shelf} position={[0, y + 0.015, 0]} castShadow>
            <boxGeometry args={[0.9, 0.03, 0.35]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} material={mats.shelf} position={[s * 0.44, 0.92, 0]}>
            <boxGeometry args={[0.03, 1.84, 0.35]} />
          </mesh>
        ))}
        {[0.6, 1.2].map((y) =>
          [0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={`${y}${i}`} position={[-0.33 + i * 0.13, y + 0.2, 0.02]} castShadow>
              <boxGeometry args={[0.09, 0.34, 0.28]} />
              <meshStandardMaterial color={['#2f6fcf', '#d23a2c', '#3f9a4a', '#e3b94b', '#7d4f8f', '#3a3f46'][(i + y * 10) % 6]} flatShading />
            </mesh>
          )),
        )}
      </group>
      {/* Teppich + Pflanze */}
      <mesh position={[-0.4, 0.006, -0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.8, 2.2]} />
        <meshStandardMaterial color="#8a2f2f" />
      </mesh>
      <group position={[1.7, 0, 0.9]}>
        <Plant s={1.3} />
      </group>
    </Room>
  );
};

export const officeStage: StageDef = {id: 'buero', Component: OfficeScene, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};
