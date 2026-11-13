import {useMemo} from 'react';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut, rng} from '../lib/anim';

/**
 * Stilisierter Low-Poly-Kleinwagen (Dreitürer), gleicher Look wie Dummy und Bär:
 * einfache Formen, flach schattiert. Blickt im eigenen Koordinatensystem nach +z.
 * Ca. 3,7 m lang, 1,6 m breit, 1,63 m hoch. Linkslenker: Fahrerseite = +x (links in Fahrtrichtung).
 *
 * Bewegliche Teile (Werte 0…1 aus der Szenario-Datei): Fahrerfenster (window), Fahrertür (door),
 * Wasser im Innenraum (water, in Metern), Wasserdruck-Pfeile (pressure).
 * Sitzposition Fahrer (für "attach": "car"): x 0.3, z −0.2, y 0.
 */

export const CAR = {
  length: 3.7,
  width: 1.6,
  wheelR: 0.3,
  floorY: 0.32,
  sillY: 1.0, // Unterkante Seitenfenster (Gürtellinie)
  roofY: 1.56, // Unterkante Dach innen
  /** Drehpunkt beim Abkippen (Fahrzeugmitte) */
  pivotY: 0.6,
  driverSeat: {x: 0.3, z: -0.2},
};

const BODY = '#f2efe6';
const TRIM = '#26292d';
const DARK = '#1b1d20';
const SEAT = '#3a3f46';
const GLASS = '#a8d8e8';

export type CarPose = {
  wheelAngle: number;
  /** zusätzliche Bewegung (Schaukeln im Wasser) – wird auch auf mitfahrende Figuren angewendet */
  dy: number;
  roll: number;
  pitch: number;
  /** Luftblasen (0 = keine) */
  bubbles: number;
  time: number;
};

/** Bewegungsanteil des Autos (Räder, Schaukeln). time = Sekunden seit Beginn der Bewegung. */
export const carPose = (motion: Motion, time: number, speed: number): CarPose => {
  const p: CarPose = {wheelAngle: 0, dy: 0, roll: 0, pitch: 0, bubbles: 0, time};
  switch (motion) {
    case 'drive':
      p.wheelAngle = (time * speed) / CAR.wheelR;
      p.dy = Math.sin(time * 17) * 0.006;
      break;
    case 'roll':
      p.wheelAngle = (time * speed * 0.9) / CAR.wheelR;
      p.roll = Math.sin(time * 6) * 0.012;
      break;
    case 'float': {
      // Treiben: langsames Auf und Ab + Schaukeln
      p.dy = Math.sin(time * 1.3) * 0.035;
      p.roll = Math.sin(time * 0.9 + 0.6) * 0.035;
      p.pitch = Math.sin(time * 1.1 + 1.4) * 0.02;
      break;
    }
    case 'sink': {
      p.dy = Math.sin(time * 1.1) * 0.02;
      p.roll = Math.sin(time * 0.8) * 0.04;
      p.pitch = Math.sin(time * 1.5) * 0.015;
      p.bubbles = clamp(time / 0.6);
      break;
    }
  }
  return p;
};

/** Matrix für die Schaukel-Bewegung + Abkippen (um die Fahrzeugmitte), im Auto-Koordinatensystem */
export const carLocalMatrix = (pose: CarPose, tiltDeg: number) => {
  const m = new THREE.Matrix4().makeTranslation(0, pose.dy, 0);
  const pivotUp = new THREE.Matrix4().makeTranslation(0, CAR.pivotY, 0);
  const rot = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler((tiltDeg * Math.PI) / 180 + pose.pitch, 0, pose.roll, 'XYZ'),
  );
  const pivotDown = new THREE.Matrix4().makeTranslation(0, -CAR.pivotY, 0);
  return m.multiply(pivotUp).multiply(rot).multiply(pivotDown);
};

// ---------- Bauteile ----------

/** Seitenprofil (z, y) → Körper entlang x extrudiert, Breite w, mittig */
const profileGeo = (pts: [number, number][], w: number, bevel = 0.035) => {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: w - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
  });
  g.rotateY(-Math.PI / 2);
  g.translate(w / 2 - bevel, 0, 0);
  return g.toNonIndexed();
};

/** Viereck (Glas) aus 4 Punkten (z, y) bei festem x */
const quadGeo = (pts: [number, number][], thickness = 0.012) => {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(shape, {depth: thickness, bevelEnabled: false});
  g.rotateY(-Math.PI / 2);
  g.translate(thickness / 2, 0, 0);
  return g;
};

/** Balken von Punkt a nach Punkt b (für Säulen, Rahmen) */
const Bar = ({a, b, r = 0.035, mat}: {a: [number, number, number]; b: [number, number, number]; r?: number; mat: THREE.Material}) => {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const len = va.distanceTo(vb);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return (
    <mesh material={mat} position={mid} quaternion={q} castShadow>
      <boxGeometry args={[r * 2, len, r * 2]} />
    </mesh>
  );
};

const useCarMats = (color: string) =>
  useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({color, roughness: 0.38, metalness: 0.08, flatShading: true}),
      trim: new THREE.MeshStandardMaterial({color: TRIM, roughness: 0.7, flatShading: true}),
      dark: new THREE.MeshStandardMaterial({color: DARK, roughness: 0.85, flatShading: true}),
      seat: new THREE.MeshStandardMaterial({color: SEAT, roughness: 0.9, flatShading: true}),
      rim: new THREE.MeshStandardMaterial({color: '#c9ccd0', roughness: 0.35, metalness: 0.4, flatShading: true}),
      glass: new THREE.MeshStandardMaterial({
        color: GLASS,
        roughness: 0.08,
        metalness: 0.1,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      head: new THREE.MeshStandardMaterial({color: '#fff6d8', emissive: '#fff1b8', emissiveIntensity: 0.35, flatShading: true}),
      tail: new THREE.MeshStandardMaterial({color: '#c8282a', emissive: '#7a1010', emissiveIntensity: 0.3, flatShading: true}),
      water: new THREE.MeshStandardMaterial({
        color: '#3f9aa4',
        roughness: 0.2,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      waterTop: new THREE.MeshStandardMaterial({
        color: '#7cc8cf',
        roughness: 0.15,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      arrow: new THREE.MeshStandardMaterial({color: '#e9fbff', emissive: '#6fe3ff', emissiveIntensity: 0.7, flatShading: true}),
      arrowEdge: new THREE.MeshBasicMaterial({color: '#0d4c5c'}),
      bubble: new THREE.MeshStandardMaterial({
        color: '#e6fbff',
        emissive: '#9fe9f5',
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
        flatShading: true,
      }),
    }),
    [color],
  );
type CarMats = ReturnType<typeof useCarMats>;

const Wheel = ({m, x, z, angle}: {m: CarMats; x: number; z: number; angle: number}) => (
  <group position={[x, CAR.wheelR, z]} rotation={[angle, 0, 0]}>
    <mesh material={m.dark} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[CAR.wheelR, CAR.wheelR, 0.22, 10]} />
    </mesh>
    <mesh material={m.rim} position={[Math.sign(x) * 0.112, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.17, 0.17, 0.01, 6]} />
    </mesh>
  </group>
);

// Maße des Innenraums / der Fenster (z, y)
const Z_FRONT_CABIN = 0.72; // Spritzwand
const Z_A_TOP = 0.18; // obere Ecke A-Säule
const Z_B = -0.42; // B-Säule (Hinterkante Fahrertür)
const Z_C = -1.1; // C-Säule unten
const Z_C_TOP = -0.98;
const Y_SILL = CAR.sillY;
const Y_ROOF = CAR.roofY;
const SIDE_X = 0.77;

/** Fahrertür mit Fenster. Drehpunkt an der Vorderkante. open 0…1, windowOpen 0…1 */
const DriverDoor = ({m, open, windowOpen}: {m: CarMats; open: number; windowOpen: number}) => {
  const len = Z_FRONT_CABIN - Z_B;
  // Fensterscheibe (Trapez), fährt nach unten in die Tür
  const glass = useMemo(
    () =>
      quadGeo([
        [Z_B + 0.04, Y_SILL],
        [Z_FRONT_CABIN - 0.1, Y_SILL],
        [Z_A_TOP + 0.04, Y_ROOF - 0.04],
        [Z_B + 0.04, Y_ROOF - 0.04],
      ]),
    [],
  );
  const drop = (Y_ROOF - Y_SILL - 0.04) * clamp(windowOpen);
  return (
    // Drehpunkt: Vorderkante der Tür
    <group position={[SIDE_X, 0, Z_FRONT_CABIN]} rotation={[0, easeInOut(clamp(open)) * 1.05, 0]}>
      <group position={[-SIDE_X, 0, -Z_FRONT_CABIN]}>
        {/* Türblech (außen) */}
        <mesh material={m.body} position={[SIDE_X, (0.3 + Y_SILL) / 2, (Z_B + Z_FRONT_CABIN) / 2]} castShadow receiveShadow>
          <boxGeometry args={[0.07, Y_SILL - 0.3, len - 0.02]} />
        </mesh>
        {/* Zierleiste + Türgriff */}
        <mesh material={m.trim} position={[SIDE_X + 0.036, 0.62, (Z_B + Z_FRONT_CABIN) / 2]}>
          <boxGeometry args={[0.01, 0.04, len - 0.1]} />
        </mesh>
        <mesh material={m.trim} position={[SIDE_X + 0.04, 0.86, Z_B + 0.2]}>
          <boxGeometry args={[0.02, 0.035, 0.16]} />
        </mesh>
        {/* Armlehne innen mit Fensterheber-Knopf */}
        <mesh material={m.seat} position={[SIDE_X - 0.07, 0.78, 0.12]}>
          <boxGeometry args={[0.08, 0.06, 0.5]} />
        </mesh>
        <mesh material={m.trim} position={[SIDE_X - 0.08, 0.815, 0.26]}>
          <boxGeometry args={[0.04, 0.02, 0.06]} />
        </mesh>
        {/* Fensterrahmen (oben + hinten), bewegt sich mit der Tür */}
        <Bar mat={m.trim} a={[SIDE_X, Y_ROOF - 0.02, Z_B]} b={[SIDE_X, Y_ROOF - 0.02, Z_A_TOP]} r={0.025} />
        <Bar mat={m.trim} a={[SIDE_X, Y_SILL, Z_B + 0.01]} b={[SIDE_X, Y_ROOF - 0.02, Z_B + 0.01]} r={0.025} />
        <Bar mat={m.trim} a={[SIDE_X, Y_SILL, Z_FRONT_CABIN - 0.04]} b={[SIDE_X, Y_ROOF - 0.02, Z_A_TOP]} r={0.025} />
        {/* Scheibe (verschwindet beim Herunterfahren im Türblech) */}
        {windowOpen < 0.99 && (
          <mesh geometry={glass} material={m.glass} position={[SIDE_X, -drop, 0]} renderOrder={2} />
        )}
      </group>
    </group>
  );
};

/** Wasserdruck-Pfeile, die von außen auf die Fahrertür zeigen */
const PressureArrows = ({m, amount, time}: {m: CarMats; amount: number; time: number}) => {
  if (amount <= 0.01) return null;
  // [Höhe, Position entlang der Tür, Takt]
  const spots: [number, number, number][] = [
    [0.5, -0.1, 0],
    [0.5, 0.45, 0.25],
    [0.85, 0.2, 0.5],
    [0.85, -0.35, 0.75],
  ];
  return (
    <group>
      {spots.map(([y, z, ph], i) => {
        const pulse = (time * 1.4 + ph) % 1;
        const push = Math.sin(pulse * Math.PI) * 0.12;
        const s = amount * 1.2;
        return (
          <group key={i} position={[SIDE_X + 0.95 - push, y, z]} rotation={[0, 0, Math.PI / 2]} scale={s}>
            {/* +y der Gruppe zeigt nach −x (zur Tür) → Spitze bei +y */}
            <mesh material={m.arrow} position={[0, 0.36, 0]}>
              <coneGeometry args={[0.11, 0.2, 4]} />
            </mesh>
            <mesh material={m.arrow} position={[0, 0.02, 0]}>
              <boxGeometry args={[0.06, 0.5, 0.06]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** Luftblasen, die beim Sinken aufsteigen */
const Bubbles = ({m, amount, time}: {m: CarMats; amount: number; time: number}) => {
  const seeds = useMemo(() => {
    const r = rng(5);
    return Array.from({length: 22}, () => ({x: (r() - 0.5) * 1.4, z: (r() - 0.5) * 2.6, ph: r(), s: 0.03 + r() * 0.05, sp: 0.6 + r() * 0.6}));
  }, []);
  if (amount <= 0) return null;
  return (
    <group>
      {seeds.map((b, i) => {
        const u = (time * b.sp * 0.5 + b.ph) % 1;
        return (
          <mesh key={i} material={m.bubble} position={[b.x + Math.sin(time * 3 + i) * 0.05, Y_ROOF + u * 2.6, b.z]} scale={b.s * amount * (0.6 + u)}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Car = ({
  pose,
  windowOpen = 0,
  door = 0,
  water = 0,
  pressure = 0,
  window2 = 0,
  color = BODY,
}: {
  /** Beifahrerfenster 0 = zu … 1 = offen */
  window2?: number;
  pose: CarPose;
  windowOpen?: number;
  door?: number;
  water?: number;
  pressure?: number;
  color?: string;
}) => {
  const m = useCarMats(color);
  const geos = useMemo(() => {
    const W = CAR.width;
    // Motorhaube + Front
    const front = profileGeo(
      [
        [Z_FRONT_CABIN, 0.26],
        [1.72, 0.26],
        [1.85, 0.4],
        [1.84, 0.7],
        [1.62, 0.86],
        [Z_FRONT_CABIN + 0.05, Y_SILL - 0.02],
        [Z_FRONT_CABIN, Y_SILL - 0.02],
      ],
      W,
    );
    // Heck (unterer Teil bis zur Gürtellinie)
    const rear = profileGeo(
      [
        [Z_C, 0.26],
        [-1.72, 0.26],
        [-1.86, 0.42],
        [-1.86, 0.92],
        [-1.78, Y_SILL + 0.02],
        [Z_C, Y_SILL + 0.02],
      ],
      W,
    );
    // Dach
    const roof = profileGeo(
      [
        [Z_C_TOP - 0.06, Y_ROOF],
        [Z_A_TOP + 0.04, Y_ROOF],
        [Z_A_TOP - 0.02, Y_ROOF + 0.07],
        [Z_C_TOP + 0.02, Y_ROOF + 0.07],
      ],
      W - 0.06,
      0.025,
    );
    return {front, rear, roof};
  }, []);

  // Frontscheibe: von (z 0.72, y 1.0) nach (z 0.18, y 1.56)
  const wsLen = Math.hypot(Z_FRONT_CABIN - Z_A_TOP, Y_ROOF - Y_SILL);
  // Neigung um die x-Achse: y-Achse der Scheibe zeigt von unten nach oben entlang der Säule
  const wsAng = -Math.atan2(Z_FRONT_CABIN - Z_A_TOP, Y_ROOF - Y_SILL);
  const rwLen = Math.hypot(Z_C - Z_C_TOP, Y_ROOF - Y_SILL);
  const rwAng = Math.atan2(Z_C_TOP - Z_C, Y_ROOF - Y_SILL);
  const w = Math.min(water, Y_ROOF - CAR.floorY - 0.02);

  return (
    <group>
      {/* Bodenplatte + Schweller */}
      <mesh material={m.dark} position={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={[CAR.width - 0.04, 0.08, 3.3]} />
      </mesh>
      <mesh geometry={geos.front} material={m.body} castShadow receiveShadow />
      <mesh geometry={geos.rear} material={m.body} castShadow receiveShadow />
      <mesh geometry={geos.roof} material={m.body} castShadow receiveShadow />
      {/* Seitenwand Beifahrer (−x) und hinterer Teil Fahrerseite */}
      <mesh material={m.body} position={[-SIDE_X, (0.3 + Y_SILL) / 2, (Z_C + Z_FRONT_CABIN) / 2]} castShadow receiveShadow>
        <boxGeometry args={[0.07, Y_SILL - 0.3, Z_FRONT_CABIN - Z_C]} />
      </mesh>
      <mesh material={m.trim} position={[-SIDE_X - 0.036, 0.62, (Z_C + Z_FRONT_CABIN) / 2]}>
        <boxGeometry args={[0.01, 0.04, Z_FRONT_CABIN - Z_C - 0.1]} />
      </mesh>
      <mesh material={m.body} position={[SIDE_X, (0.3 + Y_SILL) / 2, (Z_C + Z_B) / 2]} castShadow receiveShadow>
        <boxGeometry args={[0.07, Y_SILL - 0.3, Z_B - Z_C]} />
      </mesh>
      {/* Säulen */}
      {[1, -1].map((s) => (
        <group key={s}>
          <Bar mat={m.body} a={[s * SIDE_X, Y_SILL - 0.02, Z_FRONT_CABIN]} b={[s * SIDE_X, Y_ROOF + 0.02, Z_A_TOP]} r={0.04} />
          <Bar mat={m.body} a={[s * SIDE_X, Y_SILL, Z_B - 0.03]} b={[s * SIDE_X, Y_ROOF, Z_B - 0.03]} r={0.04} />
          <Bar mat={m.body} a={[s * SIDE_X, Y_SILL, Z_C + 0.03]} b={[s * SIDE_X, Y_ROOF + 0.02, Z_C_TOP]} r={0.05} />
        </group>
      ))}
      {/* Scheiben (fest) */}
      <mesh material={m.glass} position={[0, (Y_SILL + Y_ROOF) / 2, (Z_FRONT_CABIN + Z_A_TOP) / 2]} rotation={[wsAng, 0, 0]} renderOrder={2}>
        <boxGeometry args={[1.5, wsLen, 0.01]} />
      </mesh>
      <mesh material={m.glass} position={[0, (Y_SILL + Y_ROOF) / 2, (Z_C + Z_C_TOP) / 2]} rotation={[rwAng, 0, 0]} renderOrder={2}>
        <boxGeometry args={[1.5, rwLen, 0.01]} />
      </mesh>
      {/* Seitenfenster Beifahrerseite + hinteres Fenster Fahrerseite */}
      {/* Beifahrerseite: hinteres Fenster fest, vorderes kann sich öffnen (window2) */}
      <mesh material={m.glass} position={[-SIDE_X, (Y_SILL + Y_ROOF) / 2, (Z_C + Z_B) / 2]} renderOrder={2}>
        <boxGeometry args={[0.01, Y_ROOF - Y_SILL, Z_B - Z_C - 0.08]} />
      </mesh>
      {window2 < 0.99 && (
        <mesh
          material={m.glass}
          position={[-SIDE_X, (Y_SILL + Y_ROOF) / 2 - (Y_ROOF - Y_SILL - 0.04) * clamp(window2), (Z_B + Z_A_TOP + 0.25) / 2]}
          scale={[1, 1 - clamp(window2) * 0.98, 1]}
          renderOrder={2}
        >
          <boxGeometry args={[0.01, Y_ROOF - Y_SILL, Z_A_TOP + 0.25 - Z_B]} />
        </mesh>
      )}
      <mesh material={m.glass} position={[SIDE_X, (Y_SILL + Y_ROOF) / 2, (Z_C + Z_B) / 2]} renderOrder={2}>
        <boxGeometry args={[0.01, Y_ROOF - Y_SILL, Z_B - Z_C - 0.08]} />
      </mesh>

      {/* Innenraum: Armaturenbrett, Lenkrad, Sitze */}
      <mesh material={m.dark} position={[0, 0.86, 0.6]}>
        <boxGeometry args={[1.48, 0.2, 0.26]} />
      </mesh>
      <group position={[CAR.driverSeat.x, 0.9, 0.36]} rotation={[-0.45, 0, 0]}>
        <mesh material={m.dark}>
          <torusGeometry args={[0.17, 0.022, 5, 14]} />
        </mesh>
        <mesh material={m.dark} position={[0, 0, -0.01]}>
          <cylinderGeometry args={[0.04, 0.04, 0.05, 6]} />
        </mesh>
        <mesh material={m.dark} position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.26, 5]} />
        </mesh>
      </group>
      {[CAR.driverSeat.x, -CAR.driverSeat.x].map((x) => (
        <group key={x} position={[x, 0, CAR.driverSeat.z]}>
          <mesh material={m.seat} position={[0, 0.44, 0.02]}>
            <boxGeometry args={[0.48, 0.12, 0.5]} />
          </mesh>
          <mesh material={m.seat} position={[0, 0.8, -0.3]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.48, 0.66, 0.12]} />
          </mesh>
          <mesh material={m.seat} position={[0, 1.24, -0.39]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.28, 0.18, 0.1]} />
          </mesh>
        </group>
      ))}
      <mesh material={m.seat} position={[0, 0.5, -0.85]}>
        <boxGeometry args={[1.3, 0.14, 0.42]} />
      </mesh>

      {/* Front: Grill, Stoßstangen, Lichter */}
      <mesh material={m.trim} position={[0, 0.34, 1.83]}>
        <boxGeometry args={[1.62, 0.16, 0.12]} />
      </mesh>
      <mesh material={m.trim} position={[0, 0.34, -1.83]}>
        <boxGeometry args={[1.62, 0.16, 0.12]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.56, 1.855]}>
        <boxGeometry args={[0.7, 0.14, 0.02]} />
      </mesh>
      {[0.56, -0.56].map((x) => (
        <group key={x}>
          <mesh material={m.head} position={[x, 0.64, 1.83]}>
            <boxGeometry args={[0.32, 0.14, 0.06]} />
          </mesh>
          <mesh material={m.tail} position={[x, 0.78, -1.86]}>
            <boxGeometry args={[0.26, 0.16, 0.04]} />
          </mesh>
        </group>
      ))}
      {/* Außenspiegel */}
      {[1, -1].map((s) => (
        <mesh key={s} material={m.trim} position={[s * 0.9, 1.06, 0.6]}>
          <boxGeometry args={[0.1, 0.1, 0.16]} />
        </mesh>
      ))}

      {/* Räder */}
      {[0.73, -0.73].map((x) =>
        [1.18, -1.2].map((z) => <Wheel key={`${x}${z}`} m={m} x={x} z={z} angle={pose.wheelAngle} />),
      )}

      <DriverDoor m={m} open={door} windowOpen={windowOpen} />

      {/* Wasser im Innenraum */}
      {w > 0.01 && (
        <group position={[0, CAR.floorY + w / 2, (Z_C + Z_FRONT_CABIN) / 2 - 0.02]}>
          <mesh material={m.water} renderOrder={1}>
            <boxGeometry args={[1.46, w, Z_FRONT_CABIN - Z_C - 0.1]} />
          </mesh>
          <mesh material={m.waterTop} position={[0, w / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
            <planeGeometry args={[1.46, Z_FRONT_CABIN - Z_C - 0.1, 4, 6]} />
          </mesh>
        </group>
      )}

      <PressureArrows m={m} amount={pressure} time={pose.time} />
      <Bubbles m={m} amount={pose.bubbles} time={pose.time} />
    </group>
  );
};
