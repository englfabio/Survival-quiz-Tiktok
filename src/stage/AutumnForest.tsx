import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';
import {FOREST_COLORS, forestGroundHeight, Instances, makeForestStage, type Inst} from './Forest';

/**
 * Herbst-Bühnen (Variante des Wald-Baukastens, Fundstücke-Video "Pistole im Wald"):
 *  - "waldherbst":  Wald mit Weg (wie "wald", Weg entlang der z-Achse bei x = 0), herbstlich: Laubbäume orange/rot/gelb,
 *                   Nadelbäume grün, gelbliches Gras, viel Laub auf dem Weg und daneben, tiefe warme Sonne.
 *                   Laubhaufen an der Fundstelle PISTOL_SPOT (rechts am Wegrand). Kein Kletterbaum.
 *  - "waldstrasse": Waldrand an einer Straße. Der Waldweg endet bei z ≈ 4.6 am Gehweg. Gehweg z 5 … 7, Bordstein,
 *                   Straße (Asphalt, Mittellinie gestrichelt) z 7 … 13 entlang x, gegenüber Gehweg z 13 … 14.6,
 *                   Häuserzeile ab z ≈ 18, Straßenlaterne (3.5, 5.3). Boden flach zwischen z ≈ 2 und 20.
 * Koordinaten: 1 Einheit = 1 Meter.
 */

/** Fundstelle im Laub (rechter Wegrand) */
export const PISTOL_SPOT = {x: 0.35, z: -1.2};
/** Bodenhöhe der Lichtung rechts vom Weg: flach (Kameras) */
const autumnGround = (x: number, z: number) => {
  const inside = Math.min(x - 0, 16 - x, z + 8, 10 - z);
  const w = Math.min(1, Math.max(0, inside / 3));
  return forestGroundHeight(x, z) * (1 - 0.9 * w * w * (3 - 2 * w));
};

/** Straße (Bühne "waldstrasse") */
export const STREET = {walkZ0: 5.0, walkZ1: 7.0, curbZ: 7.0, roadZ0: 7.0, roadZ1: 13.0, centerZ: 10.0, farWalkZ1: 14.6, pathEnd: 4.6};

const AUTUMN = {
  ...FOREST_COLORS,
  skyTop: '#7aa6c4',
  skyHorizon: '#f6d7a6',
  fog: '#e2cfa6',
  grass: '#8d8a45',
  grassDark: '#6f6a35',
  path: '#a07448',
  pathDark: '#87603a',
  trunk: '#4f3826',
  pine: ['#2f5537', '#3a643d', '#294b33'],
  leaf: ['#d9822b', '#c9551f', '#e2a93a', '#b8402a', '#9a8a33', '#e0b347'],
  rock: '#8b877c',
  bush: '#8e6a2c',
};

const LEAF_COLORS = ['#d9822b', '#c9551f', '#e2a93a', '#b8402a', '#a8652a', '#e6c04e', '#8f4a22', '#c7922f'];

/** Flaches Laubblatt (liegt auf dem Boden) */
const useLeafGeo = () =>
  useMemo(() => {
    const g = new THREE.CircleGeometry(1, 5);
    g.rotateX(-Math.PI / 2);
    g.scale(1, 1, 0.62);
    return g;
  }, []);

/**
 * Laub auf dem Boden: dicht auf dem Weg, lockerer daneben, Haufen an einer Stelle.
 * area(r) liefert Zufallspunkte; keep(x, z) = darf dort Laub liegen.
 */
export const LeafLitter = ({
  count,
  area,
  ground,
  seed = 3,
  heap,
  keep,
  lift = 0.03,
}: {
  count: number;
  area: (r: () => number) => [number, number];
  ground: (x: number, z: number) => number;
  seed?: number;
  heap?: {x: number; z: number; r: number; n: number};
  keep?: (x: number, z: number) => boolean;
  lift?: number;
}) => {
  const geo = useLeafGeo();
  const items = useMemo(() => {
    const r = rng(seed);
    const out: Inst[] = [];
    const add = (x: number, z: number, y: number, s: number) =>
      out.push({pos: [x, y, z], scale: [s, 1, s], rotY: r() * 6.3, color: LEAF_COLORS[Math.floor(r() * LEAF_COLORS.length)]});
    for (let i = 0; i < count; i++) {
      const [x, z] = area(r);
      if (keep && !keep(x, z)) continue;
      add(x, z, ground(x, z) + lift + r() * 0.012, 0.022 + r() * 0.026);
    }
    if (heap) {
      for (let i = 0; i < heap.n; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * heap.r;
        const x = heap.x + Math.cos(a) * d;
        const z = heap.z + Math.sin(a) * d * 0.8;
        const h = (1 - d / heap.r) * 0.035;
        add(x, z, ground(x, z) + lift + h * r(), 0.025 + r() * 0.025);
      }
    }
    return out;
  }, [count, area, ground, seed, heap, keep, lift]);
  return <Instances geometry={geo} items={items} castShadow={false} />;
};

// ---------------- Bühne "waldherbst" ----------------
const pathArea = (r: () => number): [number, number] => {
  const z = -30 + r() * 42;
  // 65 % auf dem Weg, Rest daneben
  const x = r() < 0.65 ? (r() - 0.5) * 2.6 : (r() < 0.5 ? -1 : 1) * (1.3 + Math.pow(r(), 1.5) * 9);
  return [x, z];
};

const AutumnExtras = () => (
  <LeafLitter count={7000} area={pathArea} ground={autumnGround} heap={{x: PISTOL_SPOT.x + 0.05, z: PISTOL_SPOT.z, r: 0.6, n: 160}} />
);

export const autumnForestStage = makeForestStage('waldherbst', {
  colors: AUTUMN,
  ground: autumnGround,
  pathHalf: 1.25,
  trees: 270,
  rocks: 60,
  bushes: 120,
  grass: {count: 800, minH: 0.15, maxH: 0.36, colors: ['#a59a4c', '#8e8a43', '#b39d52', '#7d7c3a']},
  light: {sun: [12, 17, 7], intensity: 3.1, color: '#ffd7a3', hemiSky: '#f3eadb', hemiGround: '#7a6440', hemi: 1.15},
  fogRange: [20, 90],
  // kleine Lichtung rechts vom Weg (Platz für Kameras, die von rechts auf die Fundstelle schauen)
  treeAllowed: (x, z) => !(x > 1.4 && x < 14 && z > -7 && z < 9),
  decoAllowed: (x, z) => !(x > 1.4 && x < 14 && z > -7 && z < 9),
  showClimbTree: false,
  Extras: AutumnExtras,
  keepClear: [{x: PISTOL_SPOT.x, z: PISTOL_SPOT.z, r: 0.9}],
});

// ---------------- Bühne "waldstrasse" ----------------
const smooth01 = (v: number) => {
  const c = Math.min(1, Math.max(0, v));
  return c * c * (3 - 2 * c);
};
/** Boden: flach im Straßenbereich (z ≈ 2 … 20), sonst Wald-Bodenwellen */
const streetGround = (x: number, z: number) => {
  const out = z < 2 ? (2 - z) / 6 : z > 20 ? (z - 20) / 6 : 0;
  return forestGroundHeight(x, z) * smooth01(out);
};

const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, flatShading: true, roughness: 0.9, ...extra});

const House = ({x, z, w, d, h, wall, roof}: {x: number; z: number; w: number; d: number; h: number; wall: string; roof: string}) => {
  const m = useMemo(() => ({wall: mat(wall), roof: mat(roof), win: mat('#2f3e4c', {roughness: 0.3, emissive: '#3a3020', emissiveIntensity: 0.15}), door: mat('#5a3b28')}), [wall, roof]);
  const roofGeo = useMemo(() => {
    const s = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.3, 0), new THREE.Vector2(w / 2 + 0.3, 0), new THREE.Vector2(0, h * 0.55)]);
    const g = new THREE.ExtrudeGeometry(s, {depth: d + 0.5, bevelEnabled: false});
    g.translate(0, 0, -(d + 0.5) / 2);
    return g;
  }, [w, d, h]);
  return (
    <group position={[x, 0, z]}>
      <mesh material={m.wall} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <mesh geometry={roofGeo} material={m.roof} position={[0, h, 0]} castShadow />
      {/* Fenster + Tür zur Straße (−z) */}
      {[-w / 3, w / 3].map((wx) =>
        [h * 0.32, h * 0.72].map((wy) => (
          <mesh key={`${wx}${wy}`} material={m.win} position={[wx, wy, -d / 2 - 0.01]}>
            <planeGeometry args={[0.9, 0.9]} />
          </mesh>
        )),
      )}
      <mesh material={m.door} position={[0, 1.0, -d / 2 - 0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.95, 2.0]} />
      </mesh>
    </group>
  );
};

const StreetLamp = ({x, z}: {x: number; z: number}) => {
  const m = useMemo(() => ({pole: mat('#4a4f55', {roughness: 0.6, metalness: 0.3}), lamp: mat('#f3ecd2', {emissive: '#fff1c0', emissiveIntensity: 0.25})}), []);
  return (
    <group position={[x, 0, z]}>
      <mesh material={m.pole} position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 4.8, 6]} />
      </mesh>
      <mesh material={m.pole} position={[0, 4.75, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 5]} />
      </mesh>
      <mesh material={m.lamp} position={[0, 4.68, 0.9]}>
        <boxGeometry args={[0.28, 0.1, 0.45]} />
      </mesh>
    </group>
  );
};

const Road = () => {
  const S = STREET;
  const m = useMemo(
    () => ({
      asphalt: mat('#4b4d52', {roughness: 0.95}),
      line: mat('#eeeeea', {roughness: 0.7}),
      walk: mat('#a9a59c', {roughness: 0.95}),
      walkDark: mat('#98948b', {roughness: 0.95}),
      curb: mat('#c4c1b8', {roughness: 0.85}),
      hedge: mat('#5c6a2f'),
      fence: mat('#e8e3d6'),
    }),
    [],
  );
  const L = 260;
  const dashes = useMemo(() => Array.from({length: 60}, (_, i) => -90 + i * 3), []);
  const slabs = useMemo(() => Array.from({length: 90}, (_, i) => -90 + i * 2), []);
  return (
    <group>
      {/* Gehweg (Waldseite) mit Plattenfugen */}
      <mesh material={m.walk} position={[0, 0.06, (S.walkZ0 + S.walkZ1) / 2]} receiveShadow>
        <boxGeometry args={[L, 0.12, S.walkZ1 - S.walkZ0]} />
      </mesh>
      {slabs.map((x) => (
        <mesh key={x} material={m.walkDark} position={[x, 0.121, (S.walkZ0 + S.walkZ1) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.04, S.walkZ1 - S.walkZ0]} />
        </mesh>
      ))}
      {/* Bordstein */}
      <mesh material={m.curb} position={[0, 0.07, S.curbZ - 0.08]}>
        <boxGeometry args={[L, 0.14, 0.18]} />
      </mesh>
      {/* Straße */}
      <mesh material={m.asphalt} position={[0, 0.02, (S.roadZ0 + S.roadZ1) / 2]} receiveShadow>
        <boxGeometry args={[L, 0.04, S.roadZ1 - S.roadZ0]} />
      </mesh>
      {dashes.map((x) => (
        <mesh key={x} material={m.line} position={[x, 0.042, S.centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 0.12]} />
        </mesh>
      ))}
      {[S.roadZ0 + 0.3, S.roadZ1 - 0.3].map((z) => (
        <mesh key={z} material={m.line} position={[0, 0.042, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[L, 0.1]} />
        </mesh>
      ))}
      {/* gegenüber: Bordstein + Gehweg + Hecken/Zäune vor den Häusern */}
      <mesh material={m.curb} position={[0, 0.07, S.roadZ1 + 0.08]}>
        <boxGeometry args={[L, 0.14, 0.18]} />
      </mesh>
      <mesh material={m.walk} position={[0, 0.06, (S.roadZ1 + S.farWalkZ1) / 2]} receiveShadow>
        <boxGeometry args={[L, 0.12, S.farWalkZ1 - S.roadZ1]} />
      </mesh>
      {[-17, -6, 5, 16].map((x) => (
        <mesh key={x} material={m.hedge} position={[x, 0.45, S.farWalkZ1 + 0.5]} castShadow>
          <boxGeometry args={[7.5, 0.9, 0.7]} />
        </mesh>
      ))}
      <House x={-17} z={21} w={7} d={6} h={5.2} wall="#e9dcc4" roof="#8a3b2c" />
      <House x={-6} z={21.5} w={7.5} d={6} h={5.8} wall="#d9e2e6" roof="#5a4a44" />
      <House x={5} z={21} w={7} d={6} h={5.4} wall="#efe4c9" roof="#9c4630" />
      <House x={16} z={21.5} w={7.5} d={6} h={5.6} wall="#e1d3c8" roof="#6a3e30" />
      <StreetLamp x={3.5} z={5.3} />
      <StreetLamp x={-14} z={5.3} />
    </group>
  );
};

const streetLeafArea = (r: () => number): [number, number] => {
  const u = r();
  if (u < 0.35) return [(r() - 0.5) * 40, STREET.walkZ0 + r() * (STREET.walkZ1 - STREET.walkZ0)];
  if (u < 0.45) return [(r() - 0.5) * 40, STREET.roadZ0 + r() * 1.2];
  return [(r() - 0.5) * 3, -20 + r() * 24.6];
};
const streetLeafY = (x: number, z: number) => (z >= STREET.walkZ0 && z <= STREET.walkZ1 ? 0.1 : z > STREET.roadZ0 && z < STREET.roadZ1 ? 0.015 : streetGround(x, z));

const StreetExtras = () => (
  <>
    <Road />
    <LeafLitter count={2600} area={streetLeafArea} ground={streetLeafY} seed={9} />
  </>
);

export const streetStage = makeForestStage('waldstrasse', {
  colors: AUTUMN,
  pathHalf: 1.0,
  pathRange: [-110, STREET.pathEnd],
  ground: streetGround,
  treeAllowed: (x, z) => z < 2.2 && !(x > 0.6 && x < 7 && z > -6),
  decoAllowed: (x, z) => (z < 4.2 && !(x > 0.6 && x < 7 && z > -6)) || z > STREET.farWalkZ1 + 1.2,
  trees: 300,
  rocks: 40,
  bushes: 110,
  grass: {count: 1200, minH: 0.15, maxH: 0.34, colors: ['#a59a4c', '#8e8a43', '#b39d52', '#7d7c3a']},
  light: {sun: [12, 17, 7], intensity: 3.1, color: '#ffd7a3', hemiSky: '#f3eadb', hemiGround: '#7a6440', hemi: 1.15},
  fogRange: [24, 100],
  showClimbTree: false,
  Extras: StreetExtras,
});
