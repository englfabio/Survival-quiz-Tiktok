import {useMemo} from 'react';
import * as THREE from 'three';
import {Broom, Cable, Socket, Toaster} from '../actors/ShockProps';
import {Binder, Putzplan} from '../actors/WgProps';
import {Chair, Room, std, tileTexture} from './Rooms';
import type {StageDef} from './types';

/**
 * Küche ("kueche"), aus dem Innenraum-Baukasten (Rooms.tsx): W 5, D 4.6, H 2.6 → Rückwand bei z = −2.3.
 *  - Küchenzeile an der Rückwand x −2.5 … 0.55: Kühlschrank links, Spüle, Kochfeld, Oberschränke, Fliesenspiegel.
 *  - Roter Toaster auf der Arbeitsplatte (x 0.3), Kabel zur gut sichtbaren Doppel-Steckdose auf der freien Wand rechts
 *    daneben: Steckdose Mitte x 1.7, y 1.12 (Stecker links, rechtes Loch frei bei x 1.745 → dort schaut der Zitteraal
 *    heraus: "zitteraal" x 1.745, y 1.12, z −2.275, face 180).
 *  - Besen mit Holzstiel in der Ecke hinten rechts (x 2.3, z −2.05), Wanduhr oben auf der freien Wand, Fenster links.
 * Freie Fläche vor der Steckdose: x 0.6 … 2.3, z −2.2 … 0.5. Im Video: Kumpel hängt fest bei x 1.15, z −1.96, face 35.
 */
export const KITCHEN = {W: 5, D: 4.6, H: 2.6, socket: {x: 1.7, y: 1.12}, eel: {x: 1.745, y: 1.12, z: -2.275}};

const CabinetRow = ({x0, x1, front}: {x0: number; x1: number; front: THREE.Material}) => {
  const n = Math.max(1, Math.round((x1 - x0) / 0.6));
  const w = (x1 - x0) / n;
  return (
    <>
      {Array.from({length: n}).map((_, i) => (
        <group key={i} position={[x0 + w * (i + 0.5), 0, 0]}>
          <mesh material={front} position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[w - 0.012, 1, 1]} />
          </mesh>
        </group>
      ))}
    </>
  );
};

const KitchenScene = ({dining = false, wg = false, night = false}: {dining?: boolean; wg?: boolean; night?: boolean}) => {
  const {W, D, H} = KITCHEN;
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tileTexture('#e6dfd3', '#b9ae9f', [7, 9]), roughness: 0.6}),
      wall: std('#f4ecdc', {roughness: 0.95, flatShading: false}),
      back: std('#eadcc0', {roughness: 0.95, flatShading: false}),
      splash: new THREE.MeshStandardMaterial({map: tileTexture('#f8f8f4', '#c8cfd3', [16, 3.5]), roughness: 0.35}),
      front: std('#86a68f', {roughness: 0.55}),
      frontDark: std('#6f8f78', {roughness: 0.55}),
      top: std('#c99a63', {roughness: 0.6}),
      plinth: std('#3b3f45'),
      handle: std('#d9dde2', {roughness: 0.25, metalness: 0.7}),
      steel: std('#cfd4d9', {roughness: 0.25, metalness: 0.75}),
      glass: std('#1c1f24', {roughness: 0.15}),
      fridge: std('#eef0f2', {roughness: 0.35}),
      ring: std('#4a4e55', {roughness: 0.5}),
    }),
    [],
  );
  const zb = -D / 2; // Rückwand
  const x0 = -1.8;
  const x1 = 0.55;
  const depth = 0.6;
  return (
    <Room
      W={W}
      D={D}
      H={H}
      floor={mats.floor}
      wall={mats.wall}
      backWall={mats.back}
      ceiling="#f8f5ef"
      window={{side: -1, z: -0.1, w: 1.3, y: 1.0, h: 1.2, sky: night ? '#1b2a4a' : '#bfe0ff'}}
      light={
        night
          ? {ambient: 0.16, hemi: 0.22, sun: 0.55, sunColor: '#9fb8ff', lamp: 0, lampColor: '#fff1dc'}
          : {ambient: 0.5, hemi: 0.7, sun: 1.5, sunColor: '#fff0d8', lamp: 4.2, lampColor: '#fff1dc'}
      }
      bg={night ? '#0e1628' : undefined}
      ceilingLamp={!night}
    >
      {/* ---- Unterschränke + Arbeitsplatte ---- */}
      <group position={[0, 0, zb + depth / 2]}>
        <mesh material={mats.plinth} position={[(x0 + x1) / 2, 0.05, 0.02]}>
          <boxGeometry args={[x1 - x0, 0.1, depth - 0.06]} />
        </mesh>
        <group position={[0, 0.48, 0]} scale={[1, 0.76, depth - 0.02]}>
          <CabinetRow x0={x0} x1={x1} front={mats.front} />
        </group>
        {/* Griffe */}
        {[-1.6, -1.0, -0.4, 0.2].map((x) => (
          <mesh key={x} material={mats.handle} position={[x + 0.12, 0.78, depth / 2 + 0.01]}>
            <boxGeometry args={[0.16, 0.02, 0.025]} />
          </mesh>
        ))}
        {/* Backofen unter dem Kochfeld */}
        <mesh material={mats.glass} position={[-0.35, 0.47, depth / 2 - 0.0]}>
          <boxGeometry args={[0.5, 0.4, 0.02]} />
        </mesh>
        <mesh material={mats.handle} position={[-0.35, 0.71, depth / 2 + 0.02]}>
          <boxGeometry args={[0.42, 0.025, 0.03]} />
        </mesh>
        {/* Arbeitsplatte */}
        <mesh material={mats.top} position={[(x0 + x1) / 2, 0.9, 0.02]} castShadow receiveShadow>
          <boxGeometry args={[x1 - x0 + 0.03, 0.04, depth + 0.04]} />
        </mesh>
        {/* Spüle + Wasserhahn */}
        <mesh material={mats.steel} position={[-1.25, 0.921, 0.02]}>
          <boxGeometry args={[0.52, 0.006, 0.42]} />
        </mesh>
        <mesh position={[-1.25, 0.925, 0.03]}>
          <boxGeometry args={[0.44, 0.004, 0.34]} />
          <meshStandardMaterial color="#8b939b" roughness={0.3} metalness={0.6} />
        </mesh>
        <group position={[-1.25, 0.92, -0.2]}>
          <mesh material={mats.steel} position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.018, 0.022, 0.3, 8]} />
          </mesh>
          <mesh material={mats.steel} position={[0, 0.3, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.18, 8]} />
          </mesh>
        </group>
        {/* Kochfeld */}
        <mesh material={mats.glass} position={[-0.35, 0.922, 0.02]}>
          <boxGeometry args={[0.56, 0.006, 0.5]} />
        </mesh>
        {[
          [-0.13, -0.11],
          [0.13, -0.11],
          [-0.13, 0.13],
          [0.13, 0.13],
        ].map(([x, z], i) => (
          <mesh key={i} material={mats.ring} position={[-0.35 + x, 0.927, 0.02 + z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.07, 0.085, 20]} />
          </mesh>
        ))}
        {/* Schneidebrett + Obstschale */}
        <mesh position={[-0.8, 0.93, 0.05]} rotation={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.36, 0.02, 0.24]} />
          <meshStandardMaterial color="#d9b07c" flatShading />
        </mesh>
        <group position={[-1.62, 0.92, 0.0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.08, 0.07, 10, 1, true]} />
            <meshStandardMaterial color="#f2efe8" side={THREE.DoubleSide} flatShading />
          </mesh>
          {[
            [0.04, 0.05, 0.02, '#d8342a'],
            [-0.05, 0.05, 0.01, '#7fbf3f'],
            [0.0, 0.07, -0.05, '#e9b23a'],
          ].map(([x, y, z, c], i) => (
            <mesh key={i} position={[x as number, y as number, z as number]} castShadow>
              <icosahedronGeometry args={[0.045, 1]} />
              <meshStandardMaterial color={c as string} flatShading />
            </mesh>
          ))}
        </group>
      </group>
      {/* Toaster + Kabel zur Steckdose */}
      <group position={[0.3, 0.92, zb + 0.28]} rotation={[0, 0.15, 0]}>
        <Toaster />
      </group>
      <Cable
        pts={[
          [0.47, 0.95, zb + 0.22],
          [0.55, 0.925, zb + 0.12],
          [0.6, 0.93, zb + 0.05],
          [0.68, 0.88, zb + 0.035],
          [0.9, 0.84, zb + 0.035],
          [1.2, 0.86, zb + 0.035],
          [1.45, 0.93, zb + 0.04],
          [KITCHEN.socket.x - 0.11, 1.0, zb + 0.045],
          [KITCHEN.socket.x - 0.045, KITCHEN.socket.y - 0.06, zb + 0.055],
        ]}
      />
      {/* Fliesenspiegel */}
      <mesh material={mats.splash} position={[(x0 + x1) / 2, 1.2, zb + 0.005]}>
        <planeGeometry args={[x1 - x0, 0.56]} />
      </mesh>
      {/* Oberschränke */}
      <group position={[0, 1.82, zb + 0.18]}>
        <group scale={[1, 0.62, 0.35]}>
          <CabinetRow x0={x0} x1={x1} front={mats.frontDark} />
        </group>
        {[-1.6, -1.0, -0.4, 0.2].map((x) => (
          <mesh key={x} material={mats.handle} position={[x + 0.12, -0.24, 0.185]}>
            <boxGeometry args={[0.16, 0.02, 0.025]} />
          </mesh>
        ))}
      </group>
      {/* Kühlschrank (WG-Küche: eigener großer Kühlschrank als Objekt "kuehlschrank") */}
      {!wg && <group position={[-2.15, 0, zb + 0.34]}>
        <mesh material={mats.fridge} position={[0, 0.93, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.66, 1.86, 0.66]} />
        </mesh>
        <mesh material={mats.ring} position={[0, 1.25, 0.332]}>
          <boxGeometry args={[0.64, 0.012, 0.004]} />
        </mesh>
        {[1.45, 0.95].map((y) => (
          <mesh key={y} material={mats.handle} position={[0.26, y, 0.35]}>
            <boxGeometry args={[0.025, 0.28, 0.03]} />
          </mesh>
        ))}
        {/* Magnete + Zettel */}
        <mesh position={[-0.12, 1.55, 0.335]}>
          <planeGeometry args={[0.14, 0.18]} />
          <meshStandardMaterial color="#fff7b0" />
        </mesh>
        <mesh position={[0.05, 1.05, 0.335]}>
          <planeGeometry args={[0.16, 0.12]} />
          <meshStandardMaterial color="#bfe0ff" />
        </mesh>
      </group>}
      {/* Steckdose (gut sichtbar) */}
      <group position={[KITCHEN.socket.x, KITCHEN.socket.y, zb]}>
        <Socket plugLeft />
      </group>
      {/* Besen in der Ecke hinten rechts, an die Wand gelehnt */}
      {!wg && (
        <group position={[2.3, 0, zb + 0.27]} rotation={[-0.19, 0.4, 0.05]}>
          <Broom />
        </group>
      )}
      {dining && <DiningExtras zb={zb} depth={depth} x1={x1} />}
      {wg && <WgExtras zb={zb} night={night} />}
      {/* Wanduhr oben auf der freien Wand (WG: über dem Putzplan; nachts 3 Uhr) */}
      <group position={wg ? [0.95, 2.12, zb + 0.02] : [2.05, 1.95, zb + 0.02]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.03, 20]} />
          <meshStandardMaterial color="#f8f8f6" />
        </mesh>
        <mesh position={[0, 0, 0.016]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.17, 0.015, 6, 20]} />
          <meshStandardMaterial color="#3b3f45" />
        </mesh>
        <mesh position={[0, 0.05, 0.02]}>
          <boxGeometry args={[0.012, 0.11, 0.004]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {night ? (
          <mesh position={[0.04, 0, 0.022]} rotation={[0, 0, -Math.PI / 2]}>
            <boxGeometry args={[0.012, 0.08, 0.004]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        ) : (
          <mesh position={[0.04, -0.01, 0.022]} rotation={[0, 0, -1.2]}>
            <boxGeometry args={[0.01, 0.09, 0.004]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        )}
      </group>
    </Room>
  );
};

/**
 * Wohnküche ("wohnkueche") = Küche wie oben + Spülmaschine (Edelstahl-Front rechts in der Küchenzeile, x 0.0 … 0.55),
 * Küchentisch in der Raummitte (Mitte x −0.2, z 0.55, 1,2 × 0,75 m, Platte 0,76 m hoch) mit Stuhl links.
 * Der Oberschrank mit Kindersicherung ist ein eigenes Objekt ("oberschrank") – im Video an der Rückwand bei x 1.3, y 1.45.
 */
export const DINING = {table: {x: -0.2, z: 0.55, w: 1.2, d: 0.75, h: 0.76}, dishwasher: {x: 0.257, w: 0.58}};

const DiningExtras = ({zb, depth, x1}: {zb: number; depth: number; x1: number}) => {
  const m = useMemo(
    () => ({
      steel: std('#c9cfd5', {roughness: 0.3, metalness: 0.7}),
      panel: std('#2a2e33', {roughness: 0.4}),
      led: new THREE.MeshBasicMaterial({color: '#4fd8ff'}),
      ledG: new THREE.MeshBasicMaterial({color: '#5be37a'}),
      handle: std('#eef1f4', {roughness: 0.2, metalness: 0.8}),
      wood: std('#c48a52', {roughness: 0.65}),
      woodDark: std('#8e5f36', {roughness: 0.7}),
    }),
    [],
  );
  const {table, dishwasher} = DINING;
  const fz = zb + depth + 0.005;
  return (
    <>
      {/* Spülmaschine: Edelstahl-Front mit Bedienleiste oben */}
      <group position={[dishwasher.x, 0, fz]}>
        <mesh material={m.steel} position={[0, 0.47, 0.012]} castShadow>
          <boxGeometry args={[dishwasher.w, 0.76, 0.024]} />
        </mesh>
        <mesh material={m.panel} position={[0, 0.81, 0.026]}>
          <boxGeometry args={[dishwasher.w - 0.02, 0.07, 0.006]} />
        </mesh>
        {[-0.2, -0.15, -0.1].map((x, i) => (
          <mesh key={x} material={i === 2 ? m.ledG : m.led} position={[x, 0.81, 0.03]}>
            <circleGeometry args={[0.009, 10]} />
          </mesh>
        ))}
        <mesh material={m.led} position={[0.15, 0.81, 0.03]}>
          <planeGeometry args={[0.1, 0.03]} />
        </mesh>
        <mesh material={m.handle} position={[0, 0.74, 0.045]}>
          <boxGeometry args={[0.4, 0.022, 0.022]} />
        </mesh>
        {[-0.19, 0.19].map((x) => (
          <mesh key={x} material={m.handle} position={[x, 0.74, 0.033]}>
            <boxGeometry args={[0.02, 0.02, 0.02]} />
          </mesh>
        ))}
      </group>
      {/* Küchentisch */}
      <group position={[table.x, 0, table.z]}>
        <mesh material={m.wood} position={[0, table.h - 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[table.w, 0.04, table.d]} />
        </mesh>
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <mesh key={i} material={m.woodDark} position={[sx * (table.w / 2 - 0.07), (table.h - 0.04) / 2, sz * (table.d / 2 - 0.07)]} castShadow>
            <boxGeometry args={[0.05, table.h - 0.04, 0.05]} />
          </mesh>
        ))}
      </group>
      <group position={[table.x - table.w / 2 - 0.12, 0, table.z]} rotation={[0, Math.PI / 2, 0]}>
        <Chair color="#c9584a" />
      </group>
    </>
  );
};

/**
 * WG-Küche ("wg-kueche", Nacht-Variante "wg-kueche-nacht"): Küche wie oben, aber
 *  - großer Kühlschrank als eigenes Objekt ("kuehlschrank" bei WG.fridge, face 180) statt des eingebauten, kein Besen
 *  - Küchentisch (wie Wohnküche, Mitte x −0.2, z 0.55, Platte 0,76 m) mit zwei Stühlen: links WG.chairL (Blick +x), rechts WG.chairR (Blick −x)
 *  - kleiner Schreibtisch hinten rechts in der Ecke (Platte 0,74 m, Mitte WG.desk) mit Stuhl WG.deskChair (Blick −z = face 0);
 *    Laptop ist ein Objekt ("laptop" bei WG.laptop)
 *  - Wandregal über dem Schreibtisch (Brett y 1.55) mit drei Ordnern, freier Platz für "Joghurt 2026" bei WG.shelfSlot
 *  - Putzplan an der Rückwand (x 0.95, y 1.5), Wanduhr darüber (nachts 3 Uhr)
 *  - Zimmertür des Mitbewohners in der rechten Wand ("zimmertuer" bei WG.door, face 270; dahinter dunkle Öffnung)
 *  - Wandkalender an der rechten Wand ("kalender" bei WG.calendar, face 270)
 */
export const WG = {
  fridge: {x: -2.13, z: -1.94},
  table: {x: -0.2, z: 0.55, h: 0.76},
  chairL: {x: -0.98, z: 0.55},
  chairR: {x: 0.58, z: 0.55},
  desk: {x: 1.92, z: -1.98, h: 0.74, w: 1.0, d: 0.6},
  deskChair: {x: 1.75, z: -1.3},
  laptop: {x: 1.75, y: 0.74, z: -1.88},
  shelfY: 1.55,
  shelfSlot: {x: 2.25, y: 1.565, z: -2.045},
  door: {x: 2.5, z: 0.75},
  calendar: {x: 2.485, y: 1.45, z: -0.45},
};

const WgExtras = ({zb, night}: {zb: number; night: boolean}) => {
  const m = useMemo(
    () => ({
      wood: std('#c48a52', {roughness: 0.65}),
      woodDark: std('#8e5f36', {roughness: 0.7}),
      desk: std('#e9e4da', {roughness: 0.6}),
      deskLeg: std('#3b3f45', {roughness: 0.5}),
      shelf: std('#b98250', {roughness: 0.7}),
      dark: new THREE.MeshBasicMaterial({color: '#151a24'}),
      frame: std('#f2efe9', {roughness: 0.6}),
    }),
    [],
  );
  const {table, desk} = WG;
  return (
    <>
      {/* Küchentisch mit zwei Stühlen */}
      <group position={[table.x, 0, table.z]}>
        <mesh material={m.wood} position={[0, table.h - 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.04, 0.75]} />
        </mesh>
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <mesh key={i} material={m.woodDark} position={[sx * 0.53, (table.h - 0.04) / 2, sz * 0.305]} castShadow>
            <boxGeometry args={[0.05, table.h - 0.04, 0.05]} />
          </mesh>
        ))}
      </group>
      <group position={[WG.chairL.x, 0, WG.chairL.z]} rotation={[0, Math.PI / 2, 0]}>
        <Chair color="#c9584a" />
      </group>
      <group position={[WG.chairR.x, 0, WG.chairR.z]} rotation={[0, -Math.PI / 2, 0]}>
        <Chair color="#4f7a8c" />
      </group>
      {/* Schreibtisch in der Ecke + Stuhl */}
      <group position={[desk.x, 0, desk.z]}>
        <mesh material={m.desk} position={[0, desk.h - 0.015, 0]} castShadow receiveShadow>
          <boxGeometry args={[desk.w, 0.03, desk.d]} />
        </mesh>
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <mesh key={i} material={m.deskLeg} position={[sx * (desk.w / 2 - 0.04), (desk.h - 0.03) / 2, sz * (desk.d / 2 - 0.04)]} castShadow>
            <boxGeometry args={[0.035, desk.h - 0.03, 0.035]} />
          </mesh>
        ))}
        {/* Stiftebecher + Papierstapel */}
        <mesh position={[0.38, desk.h + 0.05, -0.12]} castShadow>
          <cylinderGeometry args={[0.035, 0.032, 0.1, 10]} />
          <meshStandardMaterial color="#2f6fb5" />
        </mesh>
        <mesh position={[-0.36, desk.h + 0.012, -0.05]} rotation={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.21, 0.02, 0.29]} />
          <meshStandardMaterial color="#fbfaf5" />
        </mesh>
      </group>
      <group position={[WG.deskChair.x, 0, WG.deskChair.z]} rotation={[0, Math.PI, 0]}>
        <Chair color="#5b6f86" />
      </group>
      {/* Wandregal über dem Schreibtisch mit Ordnern */}
      <group position={[desk.x, WG.shelfY, zb]}>
        <mesh material={m.shelf} position={[0, 0, 0.13]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.03, 0.26]} />
        </mesh>
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} material={m.deskLeg} position={[x, -0.06, 0.06]}>
            <boxGeometry args={[0.02, 0.12, 0.1]} />
          </mesh>
        ))}
      </group>
      {[
        {x: 1.5, text: 'Steuer', color: '#c3121b'},
        {x: 1.6, text: 'Miete', color: '#2e8a4f'},
        {x: 1.7, text: 'Strom', color: '#e0a21a'},
        {x: 1.8, text: 'WG-Kasse', color: '#6d4ab0'},
      ].map((b) => (
        <group key={b.x} position={[b.x, WG.shelfY + 0.015, zb + 0.255]}>
          <Binder text={b.text} color={b.color} size={-0.08} />
        </group>
      ))}
      {/* Putzplan */}
      <group position={[0.95, 1.5, zb + 0.008]}>
        <Putzplan />
      </group>
      {/* Zimmertür des Mitbewohners: dunkle Öffnung + Rahmen (Türblatt = Objekt "zimmertuer") */}
      <group position={[WG.door.x - 0.006, 0, WG.door.z + 0.43]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh material={m.dark} position={[0, 1.0, 0]}>
          <planeGeometry args={[0.86, 2.0]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.frame} position={[s * 0.47, 1.03, 0.01]}>
            <boxGeometry args={[0.08, 2.06, 0.03]} />
          </mesh>
        ))}
        <mesh material={m.frame} position={[0, 2.04, 0.01]}>
          <boxGeometry args={[1.02, 0.08, 0.03]} />
        </mesh>
        {/* Türschild */}
        <mesh position={[0, 1.62, 0.07]}>
          <boxGeometry args={[0.2, 0.08, 0.005]} />
          <meshStandardMaterial color="#f07a1e" />
        </mesh>
      </group>
      {night && (
        <>
          {/* Mond im Fenster + kühles Mondlicht */}
          <mesh position={[-3.7, 1.95, -0.3]}>
            <circleGeometry args={[0.18, 20]} />
            <meshBasicMaterial color="#f4f1d8" />
          </mesh>
          <pointLight position={[-1.6, 1.9, 0.4]} intensity={1.1} color="#8fa9ff" distance={6} decay={1.4} />
          <pointLight position={[0.6, 2.2, 2.6]} intensity={0.8} color="#7f93d8" distance={7} decay={1.4} />
        </>
      )}
    </>
  );
};

export const wgKitchenStage: StageDef = {id: 'wg-kueche', Component: () => <KitchenScene wg />, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};
export const wgKitchenNightStage: StageDef = {id: 'wg-kueche-nacht', Component: () => <KitchenScene wg night />, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};

export const diningKitchenStage: StageDef = {id: 'wohnkueche', Component: () => <KitchenScene dining />, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};

export const kitchenStage: StageDef = {id: 'kueche', Component: () => <KitchenScene />, climbTrees: [], groundHeight: () => 0, ambience: 'uhr-ticken'};
