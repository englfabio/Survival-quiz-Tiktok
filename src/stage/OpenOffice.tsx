import {useMemo} from 'react';
import * as THREE from 'three';
import {Chair, Plant, std, tileTexture} from './Rooms';
import {ExecChair} from './Office';
import {canvasTex, TextPlane} from '../actors/WgProps';
import type {StageDef} from './types';

/**
 * Bühne "grossraumbuero" (Spezial "Chef", wiederverwendbar): Großraumbüro vorn + großes Chefbüro hinten, getrennt durch eine Trennwand.
 * Koordinaten (Boden y 0, Decke offen – keine Decke, damit Kameras auch von oben schauen können; Wände 3,6 m hoch):
 *  - Ganze Fläche x −6.5 … 6.5, z −8.5 … 7 (vorn +z offen). Seitenwände/Rückwand nur von innen sichtbar (Kamera darf dahinter).
 *  - Trennwand bei z = OO.PZ (−2.5), 0,15 m dick, von beiden Seiten sichtbar:
 *      x −6.5 … −3.2 fest | x −3.2 … 1.2 = Lücke für das Objekt "buerowand" (bricht auf; Mitte OO.breach (−1.0, −2.5)) |
 *      x 1.2 … 2.0 fest | Türöffnung x 2.0 … 2.9 (2,1 m hoch, Türblatt = Objekt "zimmertuer", Scharnier OO.door) |
 *      x 2.9 … 3.3 fest | Glasfenster x 3.3 … 6.1 (Brüstung 0,9, oben 2,5) | x 6.1 … 6.5 fest. Schild "CHEF" neben der Tür.
 *  - Chefbüro (z −8.5 … −2.5): Chef-Schreibtisch Mitte OO.desk (−0.6, −6.3), Platte 0,76, 2,0 × 0,85 (Vorderkante z −5.88), Chefsessel
 *      OO.chair (−0.6, −7.15), Rückwand mit drei großen Fenstern (Hochhäuser), Aktenregal links, Pflanze, Teppich.
 *      Platz vor dem Schreibtisch für den Besucher: OO.visitor (−0.6, −5.35) face 0. Freie Kampffläche rechts: x 1.5 … 5, z −6.5 … −3.5.
 *  - Großraumbüro (z −2.5 … 7): Schreibtisch des Dummys links OO.myDesk (−4.4, 1.1) mit Stuhl OO.myChair (−4.4, 0.5) (Dummy sitzt face 180,
 *      also zur Kamera), zwei Kollegen-Tische rechts (x 3.9, z 3.0 / 3.8), Kaffee-Ecke an der rechten Wand: Theke x 5.9 … 6.5, z −2.3 … −0.3,
 *      Kaffeemaschine OO.coffee (6.15, 0.95, −1.3), Dummy davor OO.coffeeStand (5.45, −1.3) face 90.
 *      Freie Bagger-Bahn: x −2.6 … 0.6 über die ganze Tiefe.
 *  - Variante "grossraumbuero-offen": gleiche Bühne OHNE die festen Teile der Trennwand (Schnittbild) – für Kameras, die aus dem
 *      Großraumbüro ins Chefbüro schauen. Dazu "buerowand"/"zimmertuer" im Shot ausblenden.
 */
export const OO = {
  W: 13,
  H: 3.6,
  PZ: -2.5,
  back: -8.5,
  breach: {x: -1.0, z: -2.5},
  door: {x: 2.0, z: -2.5, w: 0.9},
  desk: {x: -0.6, z: -6.3, h: 0.76},
  chair: {x: -0.6, z: -7.15},
  visitor: {x: -0.6, z: -5.35},
  myDesk: {x: -4.4, z: 1.1, h: 0.74},
  myChair: {x: -4.4, z: 0.5},
  coffee: {x: 6.15, y: 0.95, z: -1.3},
  coffeeStand: {x: 5.45, z: -1.3},
};

const signTex = canvasTex(256, 96, (g) => {
  g.fillStyle = '#2b2f36';
  g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#f2c230';
  g.font = `800 64px "Barlow Condensed", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('CHEF', 128, 52);
});

/** Bürotisch mit Bildschirm (Ursprung = Boden unter Tischmitte, Arbeitsplatz-Seite −z, Bildschirm hinten +z… über flip drehen) */
export const OfficeDesk = ({w = 1.5, d = 0.75, h = 0.74, screen = true, color = '#e9e3d6'}: {w?: number; d?: number; h?: number; screen?: boolean; color?: string}) => {
  const m = useMemo(
    () => ({
      top: std(color, {roughness: 0.5}),
      leg: std('#4a4f57', {metalness: 0.4}),
      black: std('#1c1e21', {roughness: 0.4}),
      scr: new THREE.MeshBasicMaterial({color: '#6aa0d8'}),
      key: std('#d6d9dc'),
    }),
    [color],
  );
  return (
    <group>
      <mesh material={m.top} position={[0, h - 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.04, d]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.leg} position={[s * (w / 2 - 0.06), (h - 0.04) / 2, 0]}>
          <boxGeometry args={[0.05, h - 0.04, d - 0.1]} />
        </mesh>
      ))}
      {screen && (
        <group position={[0.15, h, d / 2 - 0.2]} rotation={[0, Math.PI + 0.25, 0]}>
          <mesh material={m.black} position={[0, 0.12, 0]}>
            <boxGeometry args={[0.04, 0.24, 0.03]} />
          </mesh>
          <mesh material={m.black} position={[0, 0.33, 0]} castShadow>
            <boxGeometry args={[0.56, 0.34, 0.03]} />
          </mesh>
          <mesh material={m.scr} position={[0, 0.33, 0.017]}>
            <planeGeometry args={[0.51, 0.29]} />
          </mesh>
        </group>
      )}
      {screen && (
        <mesh material={m.key} position={[0, h + 0.012, -0.05]}>
          <boxGeometry args={[0.42, 0.02, 0.14]} />
        </mesh>
      )}
    </group>
  );
};

/** Kaffeemaschine (Ursprung = Unterkante Mitte, Front +z). Tasse steht auf dem Abtropfgitter bei (0, 0.07, 0.09) */
export const CoffeeMachine = () => {
  const m = useMemo(
    () => ({
      body: std('#2c3035', {roughness: 0.35}),
      steel: std('#b9bec4', {metalness: 0.7, roughness: 0.25}),
      led: new THREE.MeshBasicMaterial({color: '#7dff9a'}),
      bean: std('#6b4226'),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.body} position={[0, 0.25, -0.04]} castShadow>
        <boxGeometry args={[0.36, 0.5, 0.32]} />
      </mesh>
      <mesh material={m.steel} position={[0, 0.03, 0.06]}>
        <boxGeometry args={[0.3, 0.04, 0.16]} />
      </mesh>
      <mesh material={m.body} position={[0, 0.47, 0.1]}>
        <boxGeometry args={[0.3, 0.07, 0.12]} />
      </mesh>
      <mesh material={m.steel} position={[0, 0.41, 0.12]}>
        <cylinderGeometry args={[0.02, 0.02, 0.06, 8]} />
      </mesh>
      <mesh material={m.led} position={[0.1, 0.47, 0.161]}>
        <circleGeometry args={[0.018, 12]} />
      </mesh>
      <mesh material={m.bean} position={[0, 0.53, -0.08]}>
        <boxGeometry args={[0.24, 0.06, 0.18]} />
      </mesh>
    </group>
  );
};

const Partition = ({mats}: {mats: Record<string, THREE.Material>}) => {
  const {PZ, H} = OO;
  const t = 0.15;
  const seg = (x0: number, x1: number, y0 = 0, y1 = H) => (
    <mesh key={`${x0}${y0}`} material={mats.wall} position={[(x0 + x1) / 2, (y0 + y1) / 2, PZ]} castShadow receiveShadow>
      <boxGeometry args={[x1 - x0, y1 - y0, t]} />
    </mesh>
  );
  return (
    <group>
      {seg(-6.5, -3.2)}
      {seg(1.2, 2.0)}
      {seg(2.0, 2.9, 2.1, H)}
      {seg(2.9, 3.3)}
      {seg(3.3, 6.1, 0, 0.9)}
      {seg(3.3, 6.1, 2.5, H)}
      {seg(6.1, 6.5)}
      {/* Türrahmen */}
      {[2.0, 2.9].map((x) => (
        <mesh key={x} material={mats.frame} position={[x, 1.05, PZ]}>
          <boxGeometry args={[0.06, 2.1, t + 0.04]} />
        </mesh>
      ))}
      <mesh material={mats.frame} position={[2.45, 2.12, PZ]}>
        <boxGeometry args={[0.96, 0.06, t + 0.04]} />
      </mesh>
      {/* Glas + Rahmen */}
      <mesh material={mats.glass} position={[4.7, 1.7, PZ]}>
        <boxGeometry args={[2.8, 1.6, 0.02]} />
      </mesh>
      {[3.3, 4.7, 6.1].map((x) => (
        <mesh key={x} material={mats.frame} position={[x, 1.7, PZ]}>
          <boxGeometry args={[0.06, 1.66, t + 0.03]} />
        </mesh>
      ))}
      {[0.9, 2.5].map((y) => (
        <mesh key={y} material={mats.frame} position={[4.7, y, PZ]}>
          <boxGeometry args={[2.86, 0.06, t + 0.03]} />
        </mesh>
      ))}
      {/* Schild CHEF neben der Tür (beide Seiten) */}
      {[1, -1].map((s) => (
        <group key={s} position={[1.6, 1.62, PZ + s * (t / 2 + 0.006)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <TextPlane draw={signTex} k="Schild CHEF" w={0.5} h={0.19} glow={0.25} />
        </group>
      ))}
    </group>
  );
};

const OpenOfficeScene = ({cutaway = false}: {cutaway?: boolean}) => {
  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({map: tileTexture('#9aa4ae', '#8a949e', [8, 10]), roughness: 0.85}),
      carpet: std('#7c8f9e', {roughness: 1}),
      wall: std('#e9e6df', {roughness: 0.95, flatShading: false}),
      side: std('#dfe6ea', {roughness: 0.95, flatShading: false}),
      back: std('#cdd6dc', {roughness: 0.95, flatShading: false}),
      frame: std('#5b6068', {metalness: 0.3}),
      glass: new THREE.MeshStandardMaterial({color: '#d6eef8', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false}),
      desk: std('#5a3a26', {roughness: 0.45}),
      deskDark: std('#3e281a', {roughness: 0.5}),
      black: std('#1c1e21', {roughness: 0.4}),
      screen: new THREE.MeshBasicMaterial({color: '#5d8fc9'}),
      paper: std('#f7f5ef'),
      shelf: std('#8a6a4a'),
      counter: std('#f1efe9', {roughness: 0.5}),
      counterDark: std('#9aa2aa'),
      sky: new THREE.MeshBasicMaterial({color: '#a9d4f2'}),
      lamp: new THREE.MeshStandardMaterial({color: '#ffffff', emissive: '#fff4dc', emissiveIntensity: 1.1}),
    }),
    [],
  );
  const {W, H, PZ, back, desk, chair, myDesk, myChair, coffee} = OO;
  return (
    <>
      <color attach="background" args={['#d8e4ec']} />
      <ambientLight intensity={0.62} color="#fff6ea" />
      <hemisphereLight args={['#fffaf0', '#8a7c6c', 0.75]} />
      <directionalLight
        position={[4, 9, 6]}
        intensity={1.7}
        color="#fff4e2"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <pointLight position={[0, 3.2, -5.5]} intensity={2.0} color="#fff6ea" distance={12} decay={1.4} />
      <pointLight position={[0, 3.2, 2.0]} intensity={2.0} color="#fff6ea" distance={14} decay={1.4} />
      {/* Boden */}
      <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.75]} receiveShadow>
        <planeGeometry args={[W, 15.5]} />
      </mesh>
      {/* Rückwand des Chefbüros mit drei Fenstern + Hochhäusern */}
      {[
        [-6.5, -4.6],
        [-3.0, -1.8],
        [0.6, 1.8],
        [4.2, 6.5],
      ].map(([a, b]) => (
        <mesh key={a} material={mats.back} position={[(a + b) / 2, H / 2, back]} receiveShadow>
          <planeGeometry args={[b - a, H]} />
        </mesh>
      ))}
      {[-3.8, -0.6, 3.0].map((cx) => (
        <group key={cx}>
          <mesh material={mats.back} position={[cx, 0.45, back]}>
            <planeGeometry args={[1.6 + (cx === -0.6 ? 0.8 : 0), 0.9]} />
          </mesh>
          <mesh material={mats.back} position={[cx, 3.25, back]}>
            <planeGeometry args={[1.6 + (cx === -0.6 ? 0.8 : 0), 0.7]} />
          </mesh>
          <mesh material={mats.sky} position={[cx, 1.7, back - 1.2]}>
            <planeGeometry args={[4.5, 3]} />
          </mesh>
          {[-0.9, -0.3, 0.3, 0.9].map((dx, i) => (
            <mesh key={dx} position={[cx + dx, 0.9 + (0.6 + ((i * 0.37 + cx) % 0.9)) / 2, back - 1.0]}>
              <planeGeometry args={[0.5, 0.6 + ((i * 0.37 + Math.abs(cx)) % 0.9) + 0.6]} />
              <meshBasicMaterial color={['#9fb3c4', '#8aa0b4', '#a8bacb', '#91a7ba'][i]} />
            </mesh>
          ))}
          <mesh material={mats.frame} position={[cx, 0.9, back + 0.03]}>
            <boxGeometry args={[1.66 + (cx === -0.6 ? 0.8 : 0), 0.06, 0.06]} />
          </mesh>
          <mesh material={mats.frame} position={[cx, 2.9, back + 0.03]}>
            <boxGeometry args={[1.66 + (cx === -0.6 ? 0.8 : 0), 0.06, 0.06]} />
          </mesh>
        </group>
      ))}
      {/* Seitenwände (von außen unsichtbar) */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.side} position={[(s * W) / 2, H / 2, -0.75]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[15.5, H]} />
        </mesh>
      ))}
      {/* Trennwand Großraum | Chefbüro */}
      {!cutaway && <Partition mats={mats} />}
      {cutaway && (
        <mesh material={mats.frame} position={[0, 0.01, PZ]}>
          <boxGeometry args={[W, 0.02, 0.15]} />
        </mesh>
      )}
      {/* ---------- Chefbüro ---------- */}
      <mesh position={[desk.x, 0.006, desk.z + 0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.0, 3.2]} />
        <meshStandardMaterial color="#8a2f2f" />
      </mesh>
      <group position={[desk.x, 0, desk.z]}>
        <mesh material={mats.desk} position={[0, desk.h - 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.06, 0.85]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={mats.deskDark} position={[s * 0.85, (desk.h - 0.06) / 2, 0]} castShadow>
            <boxGeometry args={[0.3, desk.h - 0.06, 0.8]} />
          </mesh>
        ))}
        <mesh material={mats.deskDark} position={[0, desk.h * 0.55, 0.38]}>
          <boxGeometry args={[1.4, desk.h * 0.7, 0.03]} />
        </mesh>
        <group position={[-0.55, desk.h, -0.22]} rotation={[0, 0.35, 0]}>
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
        <group position={[0.7, desk.h, -0.1]} rotation={[0, -0.3, 0]}>
          <mesh material={mats.black} position={[0, 0.04, 0]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 0.07, 0.2]} />
          </mesh>
        </group>
      </group>
      <group position={[chair.x, 0, chair.z]}>
        <ExecChair />
      </group>
      <group position={[-5.2, 0, back + 0.25]}>
        {[0.02, 0.6, 1.2, 1.8].map((y) => (
          <mesh key={y} material={mats.shelf} position={[0, y + 0.015, 0]} castShadow>
            <boxGeometry args={[1.2, 0.03, 0.35]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} material={mats.shelf} position={[s * 0.59, 0.92, 0]}>
            <boxGeometry args={[0.03, 1.84, 0.35]} />
          </mesh>
        ))}
        {[0.6, 1.2].map((y) =>
          [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <mesh key={`${y}${i}`} position={[-0.46 + i * 0.13, y + 0.2, 0.02]} castShadow>
              <boxGeometry args={[0.09, 0.34, 0.28]} />
              <meshStandardMaterial color={['#2f6fcf', '#d23a2c', '#3f9a4a', '#e3b94b', '#7d4f8f', '#3a3f46'][(i + y * 10) % 6]} flatShading />
            </mesh>
          )),
        )}
      </group>
      <group position={[5.6, 0, back + 0.6]}>
        <Plant s={1.4} />
      </group>
      <group position={[-5.8, 0, -3.3]}>
        <Plant s={1.2} />
      </group>
      {/* ---------- Großraumbüro ---------- */}
      <mesh material={mats.carpet} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 2.2]} receiveShadow>
        <planeGeometry args={[W - 0.4, 9.2]} />
      </mesh>
      {/* Tisch des Dummys (Arbeitsplatz −z … er sitzt hinter dem Tisch mit Blick +z) */}
      <group position={[myDesk.x, 0, myDesk.z]}>
        <OfficeDesk h={myDesk.h} screen={false} />
        <group position={[0.55, myDesk.h, -0.12]} rotation={[0, -0.6, 0]}>
          <mesh material={mats.black} position={[0, 0.12, 0]}>
            <boxGeometry args={[0.04, 0.24, 0.03]} />
          </mesh>
          <mesh material={mats.black} position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.5, 0.3, 0.03]} />
          </mesh>
          <mesh material={mats.screen} position={[0, 0.32, -0.017]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.45, 0.25]} />
          </mesh>
        </group>
      </group>
      <group position={[myChair.x, 0, myChair.z]}>
        <Chair color="#3f6fa8" />
      </group>
      {/* Kollegen-Tische rechts (zwei Reihen) + hinten links */}
      {[
        [3.9, 3.0, 0],
        [3.9, 3.8, Math.PI],
      ].map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <OfficeDesk color={i % 2 ? '#e6dfd0' : '#ece6da'} />
          <group position={[0, 0, -0.62]} rotation={[0, 0, 0]}>
            <Chair color={['#3f9a4a', '#d27a2c', '#7d4f8f', '#2f6fcf', '#c94a4a'][i]} />
          </group>
        </group>
      ))}
      {/* Kaffee-Ecke rechts */}
      <group position={[6.2, 0, -1.3]}>
        <mesh material={mats.counter} position={[0, 0.92, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.06, 2.0]} />
        </mesh>
        <mesh material={mats.counterDark} position={[0.02, 0.45, 0]}>
          <boxGeometry args={[0.56, 0.9, 1.96]} />
        </mesh>
      </group>
      <group position={[coffee.x, coffee.y, coffee.z]} rotation={[0, -Math.PI / 2, 0]}>
        <CoffeeMachine />
      </group>
      {[-0.65, 0.55].map((dz) => (
        <mesh key={dz} material={mats.paper} position={[6.2, 0.98, -1.3 + dz]}>
          <cylinderGeometry args={[0.05, 0.045, 0.1, 10]} />
        </mesh>
      ))}
      <group position={[5.9, 0, 2.4]}>
        <Plant s={1.3} />
      </group>
      {/* Deckenleuchten (hängen, ohne Decke) */}
      {[
        [-3, 0.8],
        [2.8, 0.8],
        [-3, 4.4],
        [2.8, 4.4],
        [-0.6, -5.5],
      ].map(([x, z], i) => (
        <group key={i} position={[x, H - 0.4, z]}>
          <mesh material={mats.frame} position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.6, 4]} />
          </mesh>
          <mesh material={mats.lamp}>
            <boxGeometry args={[1.2, 0.05, 0.22]} />
          </mesh>
        </group>
      ))}
    </>
  );
};

export const openOfficeStage: StageDef = {id: 'grossraumbuero', Component: () => <OpenOfficeScene />, climbTrees: [], groundHeight: () => 0, ambience: 'buero-atmo'};
export const openOfficeCutStage: StageDef = {id: 'grossraumbuero-offen', Component: () => <OpenOfficeScene cutaway />, climbTrees: [], groundHeight: () => 0, ambience: 'buero-atmo'};
