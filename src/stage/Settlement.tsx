import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {Instances, Sky, type Inst} from './Forest';
import {FarHouses, ParkLantern} from './Park';
import type {StageCam, StageDef} from './types';

/**
 * Zwei Bühnen für das Spezial „Haus weg“ (wiederverwendbar, freundlich, Tageslicht, ohne Logos):
 *
 * "siedlung" (SIEDLUNG): Siedlungsstraße mit Einfamilienhaus-Grundstücken.
 *  - Straße entlang x bei z 0 (Fahrbahn z −3 … 3, Mittellinie gestrichelt), Gehweg hinten z −3 … −5, vorn z 3 … 5 (Zuschauer-Platz der
 *    Nachbarn, Blick zu den Häusern = face 0). Alles flach (Boden y 0).
 *  - Grundstücke hinter der Straße, je 12 m breit, Mitten bei x = 0 (Dummy), ±12, ±24, ±36 (SIEDLUNG.lots), z −5.4 … −24.
 *    Niedrige Hecken zwischen den Grundstücken, vorn ein niedriger weißer Zaun mit Lücke für den Weg (x −0.7 … 0.7).
 *  - Die Häuser selbst sind OBJEKTE (`haus`, `haus1` … `haus6`, siehe HausProps.tsx) → Mitte bei (x, SIEDLUNG.houseZ = −12.5),
 *    Vorderseite (Tür) bei z −9, face 180. So können sie im Video plattgedrückt werden.
 *  - Grundstück des Dummys (x 0): leer – nur Rasen mit einem hellen Erd-Rechteck, wo das Haus stand (7 × 7 m), Weg bis z −9.
 *    Fußmatte (Objekt `fussmatte`) bei SIEDLUNG.mat (0, −8.65). Gartenhaus (Objekt `gartenhaus`) hinten im Garten bei SIEDLUNG.shed
 *    (−3.2, −20.5), face 180 (Tür zur Straße).
 *  - Hinten Bäume + ferne Häuser, Laternen auf dem vorderen Gehweg. Vorn (z 5 … 40) Wiese → Kameras frei.
 *
 * "gartenhaus-innen" (SHED_HALL): das Gartenhaus von innen – eine riesige Holzhalle, viel größer als von außen (gewollt):
 *  - Holzdielen-Boden, Bretterwände x ±24, Rückwand z −34, Vorderwand z 8 mit der kleinen Gartenhaus-Tür (Öffnung 0,8 × 1,8 m bei x 0),
 *    Höhe 18 m, Dachbalken, große Hängelampen, winzig wirkende Gartengeräte an den Wänden, Regale mit Blumentöpfen.
 *  - Mitte frei für das Haus des Dummys (Objekt `haus` bei SHED_HALL.house (0, −12)) auf einem Rasenstück 14 × 14 m.
 *  - Kamera innen kurz hinter der Tür starten (z ≈ 7.5) und in die Halle hineinfahren (Vorderwand ist fest).
 */
export const SIEDLUNG = {
  lots: [-36, -24, -12, 0, 12, 24, 36],
  houseZ: -12.5,
  front: -9,
  mat: [0, -8.65] as [number, number],
  shed: [-3.2, -20.5] as [number, number],
  roadHalf: 3,
  walkBack: -5,
  walkFront: 5,
};
export const SHED_HALL = {house: [0, -12] as [number, number], door: [0, 8] as [number, number], halfW: 24, backZ: -34, height: 18};

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, flatShading: true, roughness: 0.9, ...extra});

const Light = ({fog = '#e8ece4'}: {fog?: string}) => (
  <>
    <color attach="background" args={[fog]} />
    <fog attach="fog" args={[fog, 60, 200]} />
    <Sky c={{skyTop: '#6eaee6', skyHorizon: '#eef2ea'}} />
    <hemisphereLight args={['#dbe8ff', '#6d6a5a', 1.2]} />
    <ambientLight intensity={0.45} color="#fff3df" />
    <directionalLight
      position={[-16, 20, 14]}
      intensity={2.2}
      color="#fff0d6"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={30}
      shadow-camera-bottom={-30}
      shadow-camera-near={1}
      shadow-camera-far={110}
      shadow-bias={-0.0006}
      shadow-normalBias={0.03}
    />
    <directionalLight position={[12, 8, -10]} intensity={0.55} color="#cfe0ff" />
  </>
);

const useGeos = () =>
  useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 6);
    trunk.translate(0, 0.5, 0);
    const crown = new THREE.IcosahedronGeometry(1, 0);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const blade = new THREE.ConeGeometry(0.5, 1, 3);
    blade.translate(0, 0.5, 0);
    return {trunk, crown, box, blade};
  }, []);

const LEAF = ['#4f7d35', '#5d8c3c', '#46702f', '#679a43'];

const SettlementScene = (_: {cam?: StageCam}) => {
  const g = useGeos();
  const L = useMemo(() => {
    const r = rng(53);
    const trunks: Inst[] = [];
    const crowns: Inst[] = [];
    const hedges: Inst[] = [];
    const grass: Inst[] = [];
    const pickets: Inst[] = [];
    const flowers: Inst[] = [];
    // Hecken zwischen den Grundstücken
    for (const bx of [-42, -30, -18, -6, 6, 18, 30, 42]) {
      for (let z = -6.2; z > -23.5; z -= 1.1) {
        const s = 0.85 + r() * 0.25;
        hedges.push({pos: [bx, 0.5 * s, z], scale: [0.9, 1.0 * s, 1.2], rotY: r() * 0.3, color: ['#4f7d35', '#5d8c3c', '#3f6a2c'][Math.floor(r() * 3)]});
      }
    }
    // hintere Hecke
    for (let x = -48; x < 48; x += 1.3) hedges.push({pos: [x, 0.7, -24.4], scale: [1.5, 1.4, 1.1], rotY: r() * 0.3, color: ['#4f7d35', '#3f6a2c'][Math.floor(r() * 2)]});
    // niedriger weißer Zaun vorn an jedem Grundstück (Lücke für den Weg)
    for (let x = -47.8; x < 48; x += 0.36) {
      const lx = ((x + 6) % 12 + 12) % 12 - 6; // Lage im Grundstück
      if (Math.abs(lx) < 0.75) continue;
      pickets.push({pos: [x, 0.38, -5.45], scale: [0.09, 0.76, 0.05], rotY: 0, color: '#f4f2ec'});
    }
    // Bäume hinten + an den Seiten
    for (let i = 0; i < 26; i++) {
      const x = -60 + i * 4.8 + (r() - 0.5) * 2;
      const z = -27 - r() * 6;
      const s = 1.0 + r() * 0.5;
      trunks.push({pos: [x, 0, z], scale: [0.25 * s, 3 * s, 0.25 * s], rotY: r() * 6, color: '#5a4230'});
      const col = LEAF[Math.floor(r() * 4)];
      crowns.push({pos: [x, 4.0 * s, z], scale: [2.0 * s, 1.8 * s, 2.0 * s], rotY: r() * 6, color: col});
      crowns.push({pos: [x + 0.6, 3.3 * s, z + 0.4], scale: [1.4 * s, 1.2 * s, 1.4 * s], rotY: r() * 6, color: col});
    }
    // ein Baum + Büsche je Grundstück hinten im Garten (nicht beim Gartenhaus des Dummys)
    for (const lx of SIEDLUNG.lots) {
      const x = lx + 3.6 + (r() - 0.5);
      const z = -20 - r() * 2;
      const s = 0.8 + r() * 0.3;
      trunks.push({pos: [x, 0, z], scale: [0.2 * s, 2.4 * s, 0.2 * s], rotY: r() * 6, color: '#6b4a30'});
      crowns.push({pos: [x, 3.0 * s, z], scale: [1.5 * s, 1.4 * s, 1.5 * s], rotY: r() * 6, color: LEAF[Math.floor(r() * 4)]});
      for (let k = 0; k < 6; k++) {
        flowers.push({pos: [lx - 4.5 + r() * 2.2, 0.12, -7 - r() * 1.2], scale: [0.12, 0.2, 0.12], rotY: r() * 6, color: ['#e85d75', '#f2c14e', '#ffffff', '#b07ad8'][Math.floor(r() * 4)]});
      }
    }
    // Grasbüschel vorn (Wiese) und in den Gärten
    for (let i = 0; i < 1100; i++) {
      const front = r() < 0.55;
      const x = -55 + r() * 110;
      const z = front ? 5.6 + r() * 30 : -6 - r() * 18;
      if (!front && Math.abs(x) < 4.2 && z > -16.5 && z < -8.5) continue; // Erdfläche des Dummys frei halten
      const s = 0.09 + r() * 0.13;
      grass.push({pos: [x, 0, z], scale: [s * 0.5, s, s * 0.5], rotY: r() * 6, color: ['#6f9e44', '#5f8e3a', '#86b456'][Math.floor(r() * 3)]});
    }
    return {trunks, crowns, hedges, grass, pickets, flowers};
  }, []);
  const m = useMemo(
    () => ({
      asphalt: std('#5f6368', {roughness: 0.95}),
      white: std('#eeeeea', {roughness: 0.6}),
      curb: std('#b9b6ae'),
      walk: std('#c9c4ba', {roughness: 0.95}),
      walk2: std('#b5afa4', {roughness: 0.95}),
      grass: std('#7fae4f', {roughness: 1}),
      lawn: std('#86b552', {roughness: 1}),
      path: std('#cbbfa8', {roughness: 0.95}),
      soil: std('#a08463', {roughness: 1}),
      soilEdge: std('#8a6e4f', {roughness: 1}),
      post: std('#f4f2ec'),
      mailbox: std('#3a6fb0', {roughness: 0.5}),
    }),
    [],
  );
  return (
    <>
      <Light />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={m.grass}>
        <planeGeometry args={[400, 400]} />
      </mesh>
      {/* Gärten (etwas helleres Grün) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -14.8]} receiveShadow material={m.lawn}>
        <planeGeometry args={[96, 18.8]} />
      </mesh>
      {/* Erdfläche, wo das Haus des Dummys stand */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, SIEDLUNG.houseZ]} receiveShadow material={m.soilEdge}>
        <planeGeometry args={[7.4, 7.4]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, SIEDLUNG.houseZ]} receiveShadow material={m.soil}>
        <planeGeometry args={[7.0, 7.0]} />
      </mesh>
      {/* Wege von der Straße zur (früheren) Haustür, bei jedem Grundstück */}
      {SIEDLUNG.lots.map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.014, (-5.0 + SIEDLUNG.front) / 2]} receiveShadow material={m.path}>
          <planeGeometry args={[1.3, -5.0 - SIEDLUNG.front + 0.2]} />
        </mesh>
      ))}
      {/* Straße */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow material={m.asphalt}>
        <planeGeometry args={[220, 6]} />
      </mesh>
      {Array.from({length: 44}, (_, i) => -108 + i * 5).map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, 0]} material={m.white}>
          <planeGeometry args={[2.4, 0.13]} />
        </mesh>
      ))}
      {[-3, 3].map((z) => (
        <mesh key={z} position={[0, 0.06, z + (z < 0 ? -0.08 : 0.08)]} material={m.curb} castShadow receiveShadow>
          <boxGeometry args={[220, 0.12, 0.16]} />
        </mesh>
      ))}
      {[-4.05, 4.05].map((z) => (
        <mesh key={z} position={[0, 0.02, z]} material={m.walk} receiveShadow>
          <boxGeometry args={[220, 0.04, 1.9]} />
        </mesh>
      ))}
      {Array.from({length: 74}, (_, i) => -110 + i * 3).map((x) =>
        [-4.05, 4.05].map((z) => (
          <mesh key={`${x}${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.042, z]} material={m.walk2}>
            <planeGeometry args={[0.05, 1.9]} />
          </mesh>
        )),
      )}
      {/* Zaun-Querlatten */}
      {[0.22, 0.6].map((y) => (
        <mesh key={y} position={[0, y, -5.42]} material={m.post}>
          <boxGeometry args={[96, 0.06, 0.03]} />
        </mesh>
      ))}
      <Instances geometry={g.box} items={L.pickets} />
      <Instances geometry={g.trunk} items={L.trunks} />
      <Instances geometry={g.crown} items={L.crowns} />
      <Instances geometry={g.box} items={L.hedges} />
      <Instances geometry={g.crown} items={L.flowers} castShadow={false} />
      <Instances geometry={g.blade} items={L.grass} castShadow={false} />
      <FarHouses z={-44} face={1} seed={13} day />
      {/* Briefkästen am Weg */}
      {SIEDLUNG.lots.map((x) => (
        <group key={x} position={[x + 1.15, 0, -5.9]}>
          <mesh material={m.post} position={[0, 0.5, 0]}>
            <boxGeometry args={[0.08, 1.0, 0.08]} />
          </mesh>
          <mesh material={m.mailbox} position={[0, 1.05, 0]} castShadow>
            <boxGeometry args={[0.32, 0.26, 0.22]} />
          </mesh>
        </group>
      ))}
      {/* Laternen vorn */}
      {[-30, -6, 18, 42].map((x) => (
        <group key={x} position={[x, 0, 5.3]}>
          <ParkLantern light={false} />
        </group>
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------------------------
// Gartenhaus von innen: riesige Holzhalle
// ---------------------------------------------------------------------------------------------
const PlankWall = ({w, h, color, seed}: {w: number; h: number; color: string; seed: number}) => {
  const items = useMemo(() => {
    const r = rng(seed);
    const out: {x: number; c: string}[] = [];
    const n = Math.round(w / 0.9);
    const base = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const c = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.06);
      out.push({x: -w / 2 + (i + 0.5) * (w / n), c: `#${c.getHexString()}`});
    }
    return out;
  }, [w, color, seed]);
  return (
    <group>
      {items.map((p, i) => (
        <mesh key={i} position={[p.x, h / 2, 0]} receiveShadow>
          <boxGeometry args={[w / items.length - 0.04, h, 0.2]} />
          <meshStandardMaterial color={p.c} flatShading roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

const HallScene = (_: {cam?: StageCam}) => {
  const H = SHED_HALL.height;
  const W = SHED_HALL.halfW * 2;
  const D = SHED_HALL.door[1] - SHED_HALL.backZ;
  const midZ = (SHED_HALL.door[1] + SHED_HALL.backZ) / 2;
  const m = useMemo(
    () => ({
      floor: std('#b08a5e'),
      floor2: std('#9c7650'),
      beam: std('#6e4d30'),
      lamp: std('#2f3134', {roughness: 0.5, metalness: 0.4}),
      bulb: new THREE.MeshStandardMaterial({color: '#fff3c4', emissive: '#ffe08a', emissiveIntensity: 1.4}),
      lawn: std('#7fb04e', {roughness: 1}),
      shelf: std('#8a6440'),
      pot: std('#c4683d'),
      leaf: std('#4f8a35'),
      steel: std('#9aa3aa', {metalness: 0.5, roughness: 0.4}),
      handle: std('#a5753f'),
      green: std('#3f8f4a', {roughness: 0.5}),
      red: std('#c63b2c', {roughness: 0.5}),
    }),
    [],
  );
  const boards = useMemo(() => Array.from({length: Math.round(W / 1.2)}, (_, i) => -W / 2 + 0.6 + i * 1.2), [W]);
  return (
    <>
      <color attach="background" args={['#2a1f16']} />
      <fog attach="fog" args={['#3a2c1f', 45, 110]} />
      <hemisphereLight args={['#ffe9c4', '#5a4330', 1.0]} />
      <ambientLight intensity={0.55} color="#ffe6c2" />
      <directionalLight
        position={[-10, H - 1, 4]}
        intensity={1.5}
        color="#ffe2b0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      <pointLight position={[0, H - 3, -12]} intensity={260} distance={60} decay={1.6} color="#ffd998" />
      <pointLight position={[0, 4, 4]} intensity={40} distance={20} decay={1.6} color="#ffd998" />
      {/* Holzdielen */}
      {boards.map((x, i) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, midZ]} receiveShadow material={i % 2 ? m.floor : m.floor2}>
          <planeGeometry args={[1.16, D]} />
        </mesh>
      ))}
      {/* Rasenstück unter dem Haus */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[SHED_HALL.house[0], 0.02, SHED_HALL.house[1]]} receiveShadow material={m.lawn}>
        <planeGeometry args={[15, 14]} />
      </mesh>
      {/* Wände (Rückwand, Seiten, Vorderwand mit kleiner Tür) */}
      <group position={[0, 0, SHED_HALL.backZ]}>
        <PlankWall w={W} h={H} color="#a37b52" seed={3} />
      </group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * SHED_HALL.halfW, 0, midZ]} rotation={[0, (s * Math.PI) / 2, 0]}>
          <PlankWall w={D} h={H} color="#9b7349" seed={5 + s} />
        </group>
      ))}
      {/* Vorderwand: links + rechts der Tür und über der Tür (nur innen sichtbar) */}
      <group position={[0, 0, SHED_HALL.door[1]]}>
        <mesh position={[-(SHED_HALL.halfW + 0.4) / 2, H / 2, 0]} material={m.floor2}>
          <boxGeometry args={[SHED_HALL.halfW - 0.4, H, 0.2]} />
        </mesh>
        <mesh position={[(SHED_HALL.halfW + 0.4) / 2, H / 2, 0]} material={m.floor2}>
          <boxGeometry args={[SHED_HALL.halfW - 0.4, H, 0.2]} />
        </mesh>
        <mesh position={[0, (H + 1.8) / 2, 0]} material={m.floor2}>
          <boxGeometry args={[0.8, H - 1.8, 0.2]} />
        </mesh>
      </group>
      {/* Dachbalken + Hängelampen */}
      {[-24, -12, 0].map((z) => (
        <group key={z}>
          <mesh position={[0, H - 0.6, z]} material={m.beam} castShadow>
            <boxGeometry args={[W, 0.7, 0.6]} />
          </mesh>
          {[-12, 0, 12].map((x) => (
            <group key={x} position={[x, H - 0.6, z + 6]}>
              <mesh material={m.lamp} position={[0, -2.2, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 4.4, 4]} />
              </mesh>
              <mesh material={m.lamp} position={[0, -4.6, 0]}>
                <coneGeometry args={[1.0, 0.9, 10, 1, true]} />
              </mesh>
              <mesh material={m.bulb} position={[0, -4.95, 0]}>
                <sphereGeometry args={[0.32, 10, 8]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {[-18, -6, 6, 18].map((x) => (
        <mesh key={x} position={[x, H - 1.2, midZ]} material={m.beam} castShadow>
          <boxGeometry args={[0.5, 0.5, D]} />
        </mesh>
      ))}
      {/* Regale an der linken Wand mit Blumentöpfen (wirken winzig) */}
      {[1.0, 2.2].map((y) => (
        <group key={y} position={[-SHED_HALL.halfW + 0.5, y, -4]}>
          <mesh material={m.shelf} castShadow>
            <boxGeometry args={[0.7, 0.08, 6]} />
          </mesh>
          {[-2.4, -1.2, 0, 1.2, 2.4].map((z) => (
            <group key={z} position={[0, 0.2, z]}>
              <mesh material={m.pot}>
                <cylinderGeometry args={[0.18, 0.13, 0.3, 8]} />
              </mesh>
              <mesh material={m.leaf} position={[0, 0.28, 0]}>
                <icosahedronGeometry args={[0.2, 0]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Gartengeräte an der rechten Wand (Rechen, Schaufel) + Gießkanne + Schubkarre */}
      {[-3, -1.8, -0.6].map((z, i) => (
        <group key={z} position={[SHED_HALL.halfW - 0.4, 0, z]} rotation={[0, 0, -0.12]}>
          <mesh material={m.handle} position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.7, 5]} />
          </mesh>
          <mesh material={m.steel} position={[0, 1.75, 0]}>
            <boxGeometry args={[0.06, 0.08, i === 1 ? 0.3 : 0.5]} />
          </mesh>
        </group>
      ))}
      <group position={[SHED_HALL.halfW - 1.4, 0, 1.5]}>
        <mesh material={m.green} position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 0.5, 10]} />
        </mesh>
        <mesh material={m.green} position={[0.3, 0.35, 0]} rotation={[0, 0, -0.9]}>
          <cylinderGeometry args={[0.03, 0.04, 0.6, 5]} />
        </mesh>
      </group>
      <group position={[-SHED_HALL.halfW + 2, 0, 3]}>
        <mesh material={m.red} position={[0, 0.5, 0]}>
          <boxGeometry args={[0.6, 0.3, 0.9]} />
        </mesh>
        <mesh material={m.lamp} position={[0, 0.2, 0.55]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.08, 10]} />
        </mesh>
      </group>
    </>
  );
};

export const settlementStage: StageDef = {id: 'siedlung', Component: SettlementScene, climbTrees: [], groundHeight: () => 0, ambience: 'wald-atmo'};
export const shedHallStage: StageDef = {id: 'gartenhaus-innen', Component: HallScene, climbTrees: [], groundHeight: () => 0, ambience: 'museum-atmo'};
