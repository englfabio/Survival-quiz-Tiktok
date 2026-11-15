import {useMemo} from 'react';
import * as THREE from 'three';
import {canvasTex, TextPlane, fitText} from '../actors/WgProps';
import {Chair, Plant, plankTexture, std} from './Rooms';
import {ExecChair} from './Office';
import type {StageDef} from './types';

/**
 * Bühne "bueroetage" (Spezial „Chef“, wiederverwendbar): helle Büro-Etage mit Großraumbüro und gläsernem Chefbüro.
 * Hohe Loft-Decke (Wände 5 m, keine sichtbare Decke) → auch der große Bagger passt hinein.
 *
 *  - Großraumbüro: x −16 … 0, z −6.2 … 10 (Teppich blaugrau). Rückwand z −6.2 mit großen Fenstern (Hochhäuser), linke Wand x −16.
 *    Schreibtisch-Inseln mit Bildschirmen + Stühlen nur bei z ≥ 1.2 (BUERO.desks; vor dem Platz des Dummys
 *    ist frei, damit Kameras von vorn freie Sicht haben) → der Streifen z −5.8 … −1.8 vor der Chefbüro-Wand
 *    ist frei (Fahrweg des Baggers, Mitte BUERO.lane z −3.8, Breite 4 m → z −5.8 … −1.8). Platz des Dummys: Schreibtisch BUERO.myDesk (−4.2, 2.4), Stuhl davor
 *    BUERO.mySeat (−4.2, 3.05), Blick zum Tisch = face 0.
 *  - Kaffee-Theke frei stehend links vor dem Chefbüro: x −2.8 … −0.8, z 0.45 … 1.05 (Platte 0,92 m) mit Kaffeemaschine (ohne Logo)
 *    bei BUERO.coffee (−1.0, 0.75), Front zum Großraumbüro (+z); davor stehen: BUERO.coffeeStand (−1.0, 1.33), face 0 → Blick über die
 *    Theke durchs Glas ins Chefbüro (z. B. Kaffee trinken und zuschauen).
 *  - Chefbüro: x 0 … 6.4, z −6.2 … −1.0 (Holzboden). Linke Wand (x 0) ist ein OBJEKT ("buerowand", ChefProps.tsx) → kann vom Bagger
 *    durchbrochen werden; bitte immer mit (0, −3.6) face 90 einsetzen (Breite 5,2 m). Vorderwand = Glaswand (z −1.0) mit Türöffnung x 1.0 … 1.86
 *    (Türblatt = Objekt "glastuer" bei BUERO.doorHinge (1.86, −1.0) face 0 → geht nach innen ins Chefbüro auf). Schild „CHEF“ neben der Tür.
 *    Chef-Schreibtisch BUERO.desk (3.9, −4.5) (Platte 0,76 m, 2,0 × 0,9 m), Chefsessel dahinter BUERO.chair (3.9, −5.3)
 *    (Sitz 0,54 m, Blick +z = face 180), Besucher vor dem Tisch BUERO.visitor (3.9, −3.45), face 0. Aktenregal + Pflanze hinten rechts an der Rückwand, Fenster hinten.
 *  - Wände und Glas sind von außen unsichtbar bzw. durchsichtig → Kameras dürfen außerhalb stehen.
 */
export const BUERO = {
  H: 5,
  backZ: -6.2,
  lane: -3.8,
  wallX: 0,
  chef: {x0: 0, x1: 6.4, z0: -6.2, z1: -1.0},
  door: [1.0, -1.0] as [number, number],
  /** Türblatt "glastuer" (oder "zimmertuer"): Scharnier rechts bei (1.86, −1.0), face 0 → geht nach innen ins Chefbüro auf */
  doorHinge: [1.86, -1.0] as [number, number],
  doorW: 0.86,
  desk: {x: 3.9, z: -4.5, h: 0.76},
  chair: [3.9, -5.3] as [number, number],
  visitor: [3.9, -3.45] as [number, number],
  myDesk: [-4.2, 2.4] as [number, number],
  mySeat: [-4.2, 3.05] as [number, number],
  coffee: [-1.0, 0.75] as [number, number],
  coffeeStand: [-1.0, 1.33] as [number, number],
  desks: [
    [-4.2, 2.4],
    [-5.9, 2.4],
    [-10.2, 2.4],
    [-11.9, 2.4],
    [-10.2, 4.6],
    [-11.9, 4.6],
  ] as [number, number][],
};

const chefSignTex = canvasTex(256, 96, (g) => {
  g.fillStyle = '#2b2f36';
  g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#ffd21a';
  fitText(g, 'CHEF', 128, 50, 220, 70);
});

/** Arbeitsplatz im Großraumbüro: weißer Tisch (Platte 0,74 m) mit Bildschirm, Tastatur, Becher, Ablage; Stuhl vorn (+z) */
export const OfficeDesk = ({seed = 0, chair = true}: {seed?: number; chair?: boolean}) => {
  const m = useMemo(
    () => ({
      top: std('#f2f2ee', {roughness: 0.5}),
      leg: std('#6b7078', {metalness: 0.5, roughness: 0.4}),
      black: std('#202327', {roughness: 0.4}),
      screen: new THREE.MeshBasicMaterial({color: ['#6aa6e0', '#7cc4b0', '#9aa8e8'][seed % 3]}),
      paper: std('#fbfaf5'),
      divider: std(['#7fa7c9', '#9cc08a', '#e3b46a'][seed % 3], {roughness: 0.9}),
    }),
    [seed],
  );
  return (
    <group>
      <mesh material={m.top} position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.04, 0.8]} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} material={m.leg} position={[x, 0.35, 0]}>
          <boxGeometry args={[0.05, 0.7, 0.7]} />
        </mesh>
      ))}
      {/* Trennwand hinten */}
      <mesh material={m.divider} position={[0, 1.0, -0.41]} castShadow>
        <boxGeometry args={[1.5, 0.55, 0.04]} />
      </mesh>
      {/* Bildschirm (zeigt zum Stuhl, +z) */}
      <group position={[0.05, 0.74, -0.18]}>
        <mesh material={m.black} position={[0, 0.12, 0]}>
          <boxGeometry args={[0.04, 0.24, 0.03]} />
        </mesh>
        <mesh material={m.black} position={[0, 0.36, 0]} castShadow>
          <boxGeometry args={[0.6, 0.36, 0.03]} />
        </mesh>
        <mesh material={m.screen} position={[0, 0.36, 0.017]}>
          <planeGeometry args={[0.55, 0.31]} />
        </mesh>
      </group>
      <mesh material={m.black} position={[0.05, 0.75, 0.12]}>
        <boxGeometry args={[0.45, 0.02, 0.15]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={m.paper} position={[-0.5, 0.75 + i * 0.012, 0.05]} rotation={[0, 0.1 * i + seed, 0]}>
          <boxGeometry args={[0.22, 0.01, 0.3]} />
        </mesh>
      ))}
      <mesh position={[0.55, 0.79, 0.1]}>
        <cylinderGeometry args={[0.04, 0.035, 0.1, 10]} />
        <meshStandardMaterial color={['#e8a93a', '#d94b4b', '#4b8fd9'][seed % 3]} roughness={0.4} />
      </mesh>
      {chair && (
        <group position={[0, 0, 0.65]} rotation={[0, Math.PI, 0]}>
          <Chair color={['#3d4f66', '#2f5d55', '#5a4a6b'][seed % 3]} />
        </group>
      )}
    </group>
  );
};

/** Kaffeemaschine ohne Logo (Vollautomat, dunkelgrau + Edelstahl, grüne Taste) */
export const CoffeeMachine = () => {
  const m = useMemo(() => ({body: std('#2c3036', {roughness: 0.4}), steel: std('#c7ccd2', {metalness: 0.7, roughness: 0.25}), green: new THREE.MeshBasicMaterial({color: '#4cd964'})}), []);
  return (
    <group>
      <mesh material={m.body} position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.34, 0.5, 0.42]} />
      </mesh>
      <mesh material={m.steel} position={[0, 0.36, 0.215]}>
        <boxGeometry args={[0.3, 0.2, 0.01]} />
      </mesh>
      <mesh material={m.steel} position={[0, 0.2, 0.17]}>
        <boxGeometry args={[0.12, 0.04, 0.1]} />
      </mesh>
      <mesh material={m.steel} position={[0, 0.03, 0.17]}>
        <boxGeometry args={[0.26, 0.02, 0.14]} />
      </mesh>
      <mesh material={m.green} position={[0.1, 0.42, 0.222]}>
        <circleGeometry args={[0.018, 12]} />
      </mesh>
    </group>
  );
};

const OpenOfficeScene = () => {
  const mats = useMemo(
    () => ({
      carpet: std('#8796a6', {roughness: 1}),
      planks: new THREE.MeshStandardMaterial({map: plankTexture([5, 5]), roughness: 0.6, color: '#d2bea3'}),
      wall: new THREE.MeshStandardMaterial({color: '#eceae4', roughness: 0.95, side: THREE.FrontSide}),
      wallBlue: new THREE.MeshStandardMaterial({color: '#cdd8e0', roughness: 0.95}),
      glass: new THREE.MeshStandardMaterial({color: '#cfe8f4', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false}),
      frost: new THREE.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0.45, roughness: 0.6, depthWrite: false}),
      frame: std('#3a3f46', {metalness: 0.5, roughness: 0.4}),
      sky: new THREE.MeshBasicMaterial({color: '#b9dcf4'}),
      desk: std('#5a3a26', {roughness: 0.45}),
      deskDark: std('#3e281a', {roughness: 0.5}),
      black: std('#1c1e21', {roughness: 0.4}),
      screen: new THREE.MeshBasicMaterial({color: '#5d8fc9'}),
      shelf: std('#8a6a4a'),
      counter: std('#e9e4da', {roughness: 0.6}),
      counterTop: std('#4b5058', {roughness: 0.35}),
      lamp: new THREE.MeshStandardMaterial({color: '#fffbe8', emissive: '#fff4d0', emissiveIntensity: 0.8}),
      rug: std('#2f4f6f'),
    }),
    [],
  );
  const {H, backZ, chef, desk} = BUERO;
  const towers = useMemo(
    () => Array.from({length: 22}, (_, i) => ({x: -15.5 + i * 1.0, h: 2.2 + ((i * 37) % 17) / 6, c: ['#9fb3c4', '#8aa0b4', '#a8bacb', '#91a7ba'][i % 4]})),
    [],
  );
  return (
    <>
      <color attach="background" args={['#dfe8ee']} />
      <ambientLight intensity={0.55} color="#fff6ea" />
      <hemisphereLight args={['#fffaf0', '#7c7a74', 0.85]} />
      <directionalLight
        position={[6, 9, 8]}
        intensity={1.9}
        color="#fff4e2"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
      <pointLight position={[3.4, 3.6, -3.4]} intensity={2.2} color="#fff6ea" distance={10} decay={1.4} />
      <pointLight position={[-6, 3.6, 2.5]} intensity={2.4} color="#fff6ea" distance={14} decay={1.4} />
      {/* Böden: Teppich im Großraumbüro, Holz im Chefbüro */}
      <mesh material={mats.carpet} rotation={[-Math.PI / 2, 0, 0]} position={[-4, 0, 17]} receiveShadow>
        <planeGeometry args={[60, 50]} />
      </mesh>
      <mesh material={mats.planks} rotation={[-Math.PI / 2, 0, 0]} position={[(chef.x0 + chef.x1) / 2, 0.003, (chef.z0 + chef.z1) / 2]} receiveShadow>
        <planeGeometry args={[chef.x1 - chef.x0, chef.z1 - chef.z0]} />
      </mesh>
      <mesh material={mats.rug} rotation={[-Math.PI / 2, 0, 0]} position={[desk.x, 0.006, desk.z + 0.4]} receiveShadow>
        <planeGeometry args={[3.2, 2.6]} />
      </mesh>
      {/* Rückwand mit Fensterband (Hochhäuser), von außen unsichtbar */}
      <mesh material={mats.wall} position={[-4.8, H / 2, backZ]} receiveShadow>
        <planeGeometry args={[22.4, H]} />
      </mesh>
      <mesh material={mats.sky} position={[-4.8, 2.6, backZ - 1.6]}>
        <planeGeometry args={[22.4, 3.0]} />
      </mesh>
      {towers.map((t, i) => (
        <mesh key={i} position={[t.x, 1.1 + t.h / 2, backZ - 1.4]}>
          <planeGeometry args={[0.8, t.h]} />
          <meshBasicMaterial color={t.c} />
        </mesh>
      ))}
      {/* Fensteröffnungen: hellblaue Scheiben vor der Wand mit Rahmen */}
      {[-14, -10.6, -7.2, -3.8, 1.6, 4.8].map((x) => (
        <group key={x} position={[x, 2.6, backZ + 0.01]}>
          <mesh>
            <planeGeometry args={[2.6, 2.6]} />
            <meshBasicMaterial color="#bfe0f5" />
          </mesh>
          {[-0.35, 0.35].map((s) => (
            <mesh key={s} material={mats.frame} position={[s * 2.6 * 1.43, 0, 0.02]}>
              <boxGeometry args={[0.08, 2.7, 0.04]} />
            </mesh>
          ))}
          {[-1.3, 1.3].map((y) => (
            <mesh key={y} material={mats.frame} position={[0, y, 0.02]}>
              <boxGeometry args={[2.7, 0.08, 0.04]} />
            </mesh>
          ))}
          {[-1.3, 0, 1.3].map((x2) => (
            <mesh key={`v${x2}`} material={mats.frame} position={[x2, 0, 0.02]}>
              <boxGeometry args={[0.06, 2.7, 0.04]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* linke Wand des Großraumbüros + rechte Wand des Chefbüros (nur von innen sichtbar) */}
      <mesh material={mats.wall} position={[-16, H / 2, 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16.4, H]} />
      </mesh>
      <mesh material={mats.wallBlue} position={[chef.x1, H / 2, (chef.z0 + chef.z1) / 2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[chef.z1 - chef.z0, H]} />
      </mesh>
      {/* Glaswand vorn (z −1.0) mit Türöffnung x 1.0 … 1.86, Pfosten, Milchglas-Streifen, Schild CHEF */}
      {[
        [chef.x0, BUERO.door[0]],
        [BUERO.door[0] + BUERO.doorW, chef.x1],
      ].map(([a, b], i) => (
        <group key={i}>
          <mesh material={mats.glass} position={[(a + b) / 2, H / 2, chef.z1]}>
            <planeGeometry args={[b - a, H]} />
          </mesh>
          <mesh material={mats.frost} position={[(a + b) / 2, 1.2, chef.z1 + 0.005]}>
            <planeGeometry args={[b - a, 0.18]} />
          </mesh>
        </group>
      ))}
      <mesh material={mats.glass} position={[BUERO.door[0] + BUERO.doorW / 2, (H + 2.05) / 2, chef.z1]}>
        <planeGeometry args={[BUERO.doorW, H - 2.05]} />
      </mesh>
      {[chef.x0 + 0.03, BUERO.door[0], BUERO.door[0] + BUERO.doorW, 3.4, chef.x1 - 0.03].map((x) => (
        <mesh key={x} material={mats.frame} position={[x, H / 2, chef.z1]} castShadow>
          <boxGeometry args={[0.07, H, 0.07]} />
        </mesh>
      ))}
      <mesh material={mats.frame} position={[BUERO.door[0] + BUERO.doorW / 2, 2.05, chef.z1]}>
        <boxGeometry args={[BUERO.doorW, 0.07, 0.07]} />
      </mesh>
      <mesh material={mats.frame} position={[(chef.x0 + chef.x1) / 2, 0.03, chef.z1]}>
        <boxGeometry args={[chef.x1 - chef.x0, 0.06, 0.08]} />
      </mesh>
      <group position={[BUERO.door[0] + BUERO.doorW + 0.45, 1.6, chef.z1 + 0.02]}>
        <TextPlane draw={chefSignTex} k="chef-schild" w={0.5} h={0.19} glow={0.4} />
      </group>
      {/* Chef-Schreibtisch (Platte 0,76 m), Bildschirm + Telefon zeigen zum Chef (−z) */}
      <group position={[desk.x, 0, desk.z]}>
        <mesh material={mats.desk} position={[0, desk.h - 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.06, 0.9]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={mats.deskDark} position={[s * 0.83, (desk.h - 0.06) / 2, 0]} castShadow>
            <boxGeometry args={[0.32, desk.h - 0.06, 0.85]} />
          </mesh>
        ))}
        <mesh material={mats.deskDark} position={[0, desk.h * 0.55, 0.41]}>
          <boxGeometry args={[1.35, desk.h * 0.7, 0.03]} />
        </mesh>
        <group position={[-0.6, desk.h, -0.18]} rotation={[0, Math.PI - 0.3, 0]}>
          <mesh material={mats.black} position={[0, 0.12, 0]}>
            <boxGeometry args={[0.04, 0.22, 0.03]} />
          </mesh>
          <mesh material={mats.black} position={[0, 0.33, 0.0]} castShadow>
            <boxGeometry args={[0.62, 0.38, 0.03]} />
          </mesh>
          <mesh material={mats.screen} position={[0, 0.33, 0.017]}>
            <planeGeometry args={[0.57, 0.33]} />
          </mesh>
        </group>
        <group position={[0.72, desk.h, -0.2]} rotation={[0, Math.PI + 0.3, 0]}>
          <mesh material={mats.black} position={[0, 0.04, 0]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 0.07, 0.2]} />
          </mesh>
        </group>
        <mesh position={[0.35, desk.h + 0.08, -0.25]}>
          <cylinderGeometry args={[0.04, 0.04, 0.14, 10]} />
          <meshStandardMaterial color="#1c1e21" />
        </mesh>
      </group>
      <group position={[BUERO.chair[0], 0, BUERO.chair[1]]}>
        <ExecChair />
      </group>
      {/* Aktenregal rechts im Chefbüro + Pflanze */}
      <group position={[chef.x1 - 1.35, 0, chef.z0 + 0.22]}>
        {[0.02, 0.6, 1.2, 1.8].map((y) => (
          <mesh key={y} material={mats.shelf} position={[0, y + 0.015, 0]} castShadow>
            <boxGeometry args={[1.4, 0.03, 0.35]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} material={mats.shelf} position={[s * 0.69, 0.92, 0]}>
            <boxGeometry args={[0.03, 1.84, 0.35]} />
          </mesh>
        ))}
        {[0.6, 1.2].map((y) =>
          [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <mesh key={`${y}${i}`} position={[-0.56 + i * 0.14, y + 0.2, 0.02]} castShadow>
              <boxGeometry args={[0.1, 0.34, 0.28]} />
              <meshStandardMaterial color={['#2f6fcf', '#d23a2c', '#3f9a4a', '#e3b94b', '#7d4f8f', '#3a3f46'][(i + y * 10) % 6]} flatShading />
            </mesh>
          )),
        )}
      </group>
      <group position={[chef.x1 - 0.3, 0, chef.z0 + 0.45]}>
        <Plant s={1.2} />
      </group>
      {/* Großraumbüro: Schreibtisch-Inseln (frei bleibt der Bagger-Weg z −5.6 … −1.6) */}
      {BUERO.desks.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, z > 3.5 ? Math.PI : 0, 0]}>
          <OfficeDesk seed={i} />
        </group>
      ))}
      {/* Hängelampen über den Inseln */}
      {[-5.05, -11.05].map((x) =>
        (x > -8 ? [2.4] : [2.4, 4.6]).map((z) => (
          <group key={`${x}${z}`} position={[x, 3.3, z]}>
            <mesh material={mats.frame} position={[0, 0.85, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 1.7, 4]} />
            </mesh>
            <mesh material={mats.lamp}>
              <cylinderGeometry args={[0.32, 0.38, 0.12, 16]} />
            </mesh>
          </group>
        )),
      )}
      {/* Kaffee-Theke vor dem Chefbüro (Maschine zeigt zur Glaswand) */}
      <group position={[-1.8, 0, 0.75]}>
        <mesh material={mats.counter} position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.9, 0.6]} />
        </mesh>
        <mesh material={mats.counterTop} position={[0, 0.91, 0]}>
          <boxGeometry args={[2.04, 0.04, 0.64]} />
        </mesh>
        <group position={[BUERO.coffee[0] + 1.8, 0.93, BUERO.coffee[1] - 0.75]}>
          <CoffeeMachine />
        </group>
        {[-0.7, -0.52, -0.34].map((x, i) => (
          <mesh key={x} position={[x, 0.98, -0.1]}>
            <cylinderGeometry args={[0.04, 0.035, 0.1, 10]} />
            <meshStandardMaterial color={['#e8a93a', '#ffffff', '#4b8fd9'][i]} roughness={0.4} />
          </mesh>
        ))}
      </group>
      {/* Pflanzen im Großraumbüro */}
      {[
        [-15.2, -5.4],
        [-15.2, 7.5],
        [-8.6, -5.7],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Plant s={1.5} />
        </group>
      ))}
    </>
  );
};

export const openOfficeStage: StageDef = {id: 'bueroetage', Component: OpenOfficeScene, climbTrees: [], groundHeight: () => 0, ambience: 'buero-atmo'};
