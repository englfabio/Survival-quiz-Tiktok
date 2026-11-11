import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';

/**
 * Objekte für Garten-Videos (wiederverwendbar):
 *  - AerialBomb  ("fliegerbombe"): rostige Fliegerbombe, stilisiert, mit Leitwerk
 *  - Spade       ("spaten"): Spaten – liegt (park) oder steckt in der Erde (stand); hält der Dummy auch selbst
 *  - Wheelbarrow ("schubkarre"): Schubkarre, rollt mit "roll"
 *  - WarnStake   ("warnstab"): rot-weißer Warnstab mit Absperrband-Fähnchen
 *  - Smartphone  ("smartphone"): Handy; hält der Dummy bei "call" automatisch
 * Alle Objekte blicken im eigenen Koordinatensystem nach +z (wie die Figuren).
 */

const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, flatShading: true, roughness: 0.8, ...extra});

// ---------------- Fliegerbombe ----------------
/** Länge ca. 1,15 m, Ø 0,32 m. Ursprung = Mitte, Längsachse = z (Spitze bei +z). */
export const BOMB_LEN = 1.15;
export const BOMB_R = 0.16;
const RUST = ['#8a5530', '#9b6235', '#6f4a35', '#a86b3a', '#7d5a45', '#6a5a50', '#94592e', '#5f5048'];

const rustify = (g: THREE.BufferGeometry, seed: number) => {
  const ng = g.index ? g.toNonIndexed() : g;
  const r = rng(seed);
  const pos = ng.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const c = new THREE.Color(RUST[Math.floor(r() * RUST.length)]);
    for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
  }
  ng.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  ng.computeVertexNormals();
  return ng;
};

const CRUMBS: [number, number, number][] = (() => {
  const r = rng(12);
  return Array.from({length: 14}, () => [(r() - 0.5) * 0.16, -0.35 + r() * 0.75, 0.012 + r() * 0.02] as [number, number, number]);
})();

export const AerialBomb = ({tilt = 0, dirt = false}: {tilt?: number; dirt?: boolean}) => {
  const geos = useMemo(() => {
    // Umriss (Radius über Länge), um die Längsachse gedreht
    const prof: [number, number][] = [
      [0.0, -0.58],
      [0.075, -0.58],
      [0.09, -0.46],
      [0.145, -0.26],
      [BOMB_R, -0.12],
      [BOMB_R, 0.18],
      [0.148, 0.32],
      [0.115, 0.44],
      [0.065, 0.53],
      [0.0, 0.575],
    ];
    const body = new THREE.LatheGeometry(
      prof.map(([rr, z]) => new THREE.Vector2(rr, z)),
      12,
    );
    body.rotateX(Math.PI / 2); // Lathe-Achse y → z
    const ring = new THREE.CylinderGeometry(0.19, 0.19, 0.14, 12, 1, true);
    ring.rotateX(Math.PI / 2);
    return {body: rustify(body, 3), ring: rustify(ring, 4)};
  }, []);
  const m = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0.15}),
      fin: new THREE.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0.15, side: THREE.DoubleSide}),
      band: mat('#4a2e1c', {roughness: 1}),
      fuze: mat('#6d5a3d', {roughness: 0.9, metalness: 0.2}),
      dirt: mat('#3b281b', {roughness: 1}),
    }),
    [],
  );
  const finGeo = useMemo(() => rustify(new THREE.BoxGeometry(0.014, 0.18, 0.26), 9), []);
  return (
    <group rotation={[(tilt * Math.PI) / 180, 0, 0]}>
      <mesh geometry={geos.body} material={m.body} castShadow receiveShadow />
      {/* Bänder (Aufhängung) */}
      {[-0.05, 0.12].map((z) => (
        <mesh key={z} material={m.band} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[BOMB_R + 0.006, BOMB_R + 0.006, 0.035, 12, 1, true]} />
        </mesh>
      ))}
      {/* Zünder an der Spitze */}
      <mesh material={m.fuze} position={[0, 0, 0.575]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.05, 8]} />
      </mesh>
      {/* Leitwerk: 4 Flossen + Ring */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, 0, Math.PI / 4 + (i * Math.PI) / 2]}>
          <mesh geometry={finGeo} material={m.fin} position={[0, 0.1, -0.48]} castShadow />
        </group>
      ))}
      <mesh geometry={geos.ring} material={m.fin} position={[0, 0, -0.52]} castShadow />
      {/* Erdkrümel oben drauf (frisch ausgegraben) */}
      {dirt &&
        CRUMBS.map((c, i) => (
          <mesh key={i} material={m.dirt} position={[c[0], BOMB_R * Math.cos(c[0] / BOMB_R) - 0.005, c[1]]} scale={c[2]}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        ))}
    </group>
  );
};

// ---------------- Spaten ----------------
/** Griff (D-Griff) im Ursprung, Stiel nach −y, Blatt unten. Länge ca. 1,05 m. */
export const SPADE_LEN = 1.05;
export const Spade = () => {
  const m = useMemo(
    () => ({
      wood: mat('#b88a55', {roughness: 0.7}),
      grip: mat('#2b2b2d', {roughness: 0.6}),
      steel: mat('#9aa3ab', {roughness: 0.35, metalness: 0.7}),
      dirt: mat('#3e2a1c', {roughness: 1}),
    }),
    [],
  );
  return (
    <group>
      {/* D-Griff */}
      <mesh material={m.grip} position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 0.13, 6]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} material={m.grip} position={[s * 0.05, -0.03, 0]} rotation={[0, 0, s * 0.45]}>
          <cylinderGeometry args={[0.012, 0.012, 0.13, 5]} />
        </mesh>
      ))}
      {/* Stiel */}
      <mesh material={m.wood} position={[0, -0.45, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.022, 0.78, 7]} />
      </mesh>
      {/* Tülle + Blatt */}
      <mesh material={m.steel} position={[0, -0.86, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.04, 0.08, 7]} />
      </mesh>
      <mesh material={m.steel} position={[0, -0.97, 0]} castShadow>
        <boxGeometry args={[0.19, 0.17, 0.012]} />
      </mesh>
      <mesh material={m.dirt} position={[0, -1.03, 0]}>
        <boxGeometry args={[0.192, 0.06, 0.016]} />
      </mesh>
    </group>
  );
};

/** Spaten als frei stehendes Objekt: "park" = liegt auf dem Boden, "stand" = steckt in der Erde */
export const SpadeProp = ({upright}: {upright: boolean}) =>
  upright ? (
    <group position={[0, SPADE_LEN - 0.12, 0]} rotation={[0.12, 0, 0.06]}>
      <Spade />
    </group>
  ) : (
    <group position={[0, 0.03, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
      <Spade />
    </group>
  );

// ---------------- Schubkarre ----------------
/**
 * Länge ca. 1,5 m. Rad vorne (+z), Griffe hinten (Griffenden bei z −0.85, Höhe 0,55 m).
 * Wer schiebt, steht ca. 1,15 m hinter der Mitte (Dummy-Position = Karre − 1,15 m in Fahrtrichtung).
 * Ladefläche: Mitte bei (0, 0.42, 0.05) – dort liegt Ladung (z. B. Bombe mit attach "schubkarre").
 */
export const BARROW_PUSH_OFFSET = 1.15;
export const Wheelbarrow = ({spin}: {spin: number}) => {
  const m = useMemo(
    () => ({
      tray: mat('#2f6fb0', {roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide}),
      frame: mat('#33373c', {roughness: 0.6, metalness: 0.4}),
      tire: mat('#1d1d1f', {roughness: 0.9}),
      hub: mat('#c9ced3', {roughness: 0.3, metalness: 0.7}),
      grip: mat('#e0b53a', {roughness: 0.6}),
    }),
    [],
  );
  const trayGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.5, 0.33, 0.3, 4, 1, true);
    g.rotateY(Math.PI / 4);
    g.scale(0.82, 1, 1.15);
    return g;
  }, []);
  const tube = (a: [number, number, number], b: [number, number, number], r: number, material: THREE.Material, key: string) => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const len = va.distanceTo(vb);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    return (
      <mesh key={key} material={material} position={mid} quaternion={q} castShadow>
        <cylinderGeometry args={[r, r, len, 6]} />
      </mesh>
    );
  };
  return (
    <group>
      {/* Mulde */}
      <mesh geometry={trayGeo} material={m.tray} position={[0, 0.5, 0.05]} castShadow receiveShadow />
      <mesh material={m.tray} position={[0, 0.355, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.38, 0.54]} />
      </mesh>
      {/* Holme + Griffe */}
      {[1, -1].map((s) => (
        <group key={s}>
          {tube([s * 0.18, 0.2, 0.62], [s * 0.27, 0.55, -0.85], 0.018, m.frame, 'h')}
          {tube([s * 0.27, 0.55, -0.85], [s * 0.285, 0.58, -1.0], 0.024, m.grip, 'g')}
          {/* Stützbein */}
          {tube([s * 0.24, 0.42, -0.35], [s * 0.25, 0.0, -0.42], 0.016, m.frame, 'l')}
        </group>
      ))}
      {/* Rad */}
      <group position={[0, 0.2, 0.62]} rotation={[spin, 0, 0]}>
        <mesh material={m.tire} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.09, 12]} />
        </mesh>
        <mesh material={m.hub} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.1, 8]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------- Warnstab ----------------
/** Rot-weiß gestreifter Stab (1,25 m) mit Absperrband-Fähnchen oben. Ursprung = untere Spitze. */
const STAKE_LEN = 1.25;
export const WarnStake = ({time, plant}: {time: number; plant: boolean}) => {
  const m = useMemo(
    () => ({
      red: mat('#e02a20', {roughness: 0.5}),
      white: mat('#f6f4ef', {roughness: 0.5}),
      tapeRed: mat('#e02a20', {roughness: 0.6, side: THREE.DoubleSide}),
      tapeWhite: mat('#f6f4ef', {roughness: 0.6, side: THREE.DoubleSide}),
    }),
    [],
  );
  // "plant": wird von oben in die Erde gedrückt (0,3 … 0,9 s), danach steckt er 0,15 m tief
  const y = plant ? 0.35 - 0.5 * easeInOut(clamp((time - 0.3) / 0.6)) : -0.15;
  const segs = 8;
  const segLen = STAKE_LEN / segs;
  return (
    <group position={[0, y, 0]}>
      {Array.from({length: segs}, (_, i) => (
        <mesh key={i} material={i % 2 ? m.white : m.red} position={[0, segLen * (i + 0.5), 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, segLen, 7]} />
        </mesh>
      ))}
      <mesh material={m.red} position={[0, -0.04, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.022, 0.08, 7]} />
      </mesh>
      {/* Absperrband: zwei flatternde Streifen */}
      {[0, 1].map((k) => (
        <group key={k} position={[0, STAKE_LEN - 0.06 - k * 0.07, 0]} rotation={[0, 0.6 + k * 0.5 + Math.sin(time * 4 + k) * 0.25, Math.sin(time * 5.3 + k * 2) * 0.12]}>
          {[0, 1, 2, 3].map((j) => (
            <mesh key={j} material={j % 2 ? m.tapeWhite : m.tapeRed} position={[0.03 + j * 0.075, -j * 0.012, 0]} rotation={[Math.sin(time * 6 + j + k) * 0.35, 0, 0]}>
              <planeGeometry args={[0.075, 0.05]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// ---------------- Smartphone ----------------
/** Handy 7,5 × 15,5 cm. Bildschirm zeigt nach +z, Oberkante bei +y. Ursprung = Mitte. */
export const Smartphone = ({glow = true}: {glow?: boolean}) => {
  const m = useMemo(
    () => ({
      body: mat('#1b1d21', {roughness: 0.4, metalness: 0.4}),
      screen: new THREE.MeshStandardMaterial({color: '#0d2233', emissive: '#3fa9ff', emissiveIntensity: glow ? 0.55 : 0, roughness: 0.2}),
      call: new THREE.MeshBasicMaterial({color: '#2fd36b'}),
    }),
    [glow],
  );
  return (
    <group>
      <mesh material={m.body} castShadow>
        <boxGeometry args={[0.075, 0.155, 0.01]} />
      </mesh>
      <mesh material={m.screen} position={[0, 0.003, 0.0055]}>
        <planeGeometry args={[0.066, 0.138]} />
      </mesh>
      <mesh material={m.call} position={[0, -0.045, 0.0062]}>
        <circleGeometry args={[0.012, 10]} />
      </mesh>
    </group>
  );
};

/** Handy als frei stehendes Objekt (zum Anschauen im Baukasten): steht leicht schräg */
export const SmartphoneProp = ({time}: {time: number}) => (
  <group position={[0, 0.12, 0]} rotation={[-0.25, Math.sin(time * 0.8) * 0.4, 0]} scale={2}>
    <Smartphone />
  </group>
);
