import {FOREST_COLORS, forestGroundHeight, makeForestStage} from './Forest';

/**
 * Bühne "waldlichtung": Variante des Waldes – sonnige Lichtung am Waldrand.
 * - Schmaler Wanderpfad entlang der z-Achse bei x = 0 (wie im Wald).
 * - Waldrand: Bäume nur hinten (z < −8) und links (x < −7). Rechts und vorne offene Lichtung.
 * - Heidekraut (lila Büschel), niedriges sonniges Gras.
 * - Warmer Stein in der Sonne direkt rechts neben dem Pfad (WARM_STONE), Oberseite bei y ≈ 0,26 m.
 *   Eine Schlange kann darauf liegen: Figur bei x = 0.85, z = −0.3, y = 0.26.
 * Koordinaten: 1 Einheit = 1 Meter.
 */

export const WARM_STONE = {x: 0.95, z: -0.3, top: 0.26};

const COLORS = {
  ...FOREST_COLORS,
  skyTop: '#5f9fd0',
  skyHorizon: '#fbe7b8',
  fog: '#e8e0b8',
  grass: '#86a046',
  grassDark: '#6a8a3a',
  path: '#b89262',
  pathDark: '#9c7a50',
  rock: '#a39b8c',
};

const WarmStone = () => {
  const {x, z, top} = WARM_STONE;
  const y = forestGroundHeight(x, z);
  return (
    <group position={[x, y, z]}>
      {/* großer, flacher Stein – von der Sonne beschienen */}
      <mesh castShadow receiveShadow position={[0, top * 0.45, 0]} scale={[0.62, top * 0.62, 0.5]} rotation={[0, 0.4, 0]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#b9ab95" flatShading roughness={0.85} />
      </mesh>
      {/* kleiner Nachbarstein */}
      <mesh castShadow receiveShadow position={[0.55, 0.08, -0.35]} scale={[0.22, 0.13, 0.2]} rotation={[0, 1.1, 0]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#a89c88" flatShading roughness={0.9} />
      </mesh>
    </group>
  );
};

export const clearingStage = makeForestStage('waldlichtung', {
  colors: COLORS,
  pathHalf: 0.7,
  treeAllowed: (x, z) => z < -8 - Math.max(0, x) * 0.15 || x < -7,
  trees: 230,
  rocks: 35,
  bushes: 50,
  grass: {count: 2200, minH: 0.1, maxH: 0.26, colors: ['#93ac4c', '#a3b856', '#7f9a3f', '#b2b65a']},
  heather: {
    count: 900,
    // vor allem auf der Lichtung (rechts und vorne), etwas auch links vom Pfad
    area: (r) => {
      const x = r() < 0.75 ? 0.9 + r() * 14 : -0.9 - r() * 6;
      const z = -8 + r() * 22;
      return [x, z];
    },
  },
  light: {sun: [9, 16, 9], intensity: 3.3, color: '#ffe0a6', hemiSky: '#e6efff', hemiGround: '#6b6a3a', hemi: 0.95},
  fogRange: [26, 110],
  showClimbTree: false,
  Extras: WarmStone,
  keepClear: [{x: WARM_STONE.x, z: WARM_STONE.z, r: 0.75}],
});
