import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut} from '../lib/anim';
import {T} from '../ui/theme';
import {Car, CAR, type CarPose} from './Car';
import {useFontTexture} from './ToothProps';

/**
 * Objekte für das Fundstücke-Video "Pistole im Wald" (wiederverwendbar):
 *  - Pistol ("pistole"): stilisierte, ältere Pistole ohne Marke, etwas Rost, optional Laub darauf.
 *      Ursprung = Mitte des Griffs (dort hält die Hand). Lauf zeigt im eigenen System nach +z → "face" = Richtung des Laufs
 *      (gleiche Regel wie bei Figuren: 0 = −z, 90 = +x). Werte: "tilt" = Lauf nach unten neigen (Grad),
 *      "side" 0 = aufrecht … 1 = liegt auf der Seite, "leaves" 0 … 1 = Laubblätter darauf, "size" = größer.
 *  - MapPhone ("kartenhandy"): Smartphone mit Karte auf dem Bildschirm. Wert "pin" 0 … 1 = roter Karten-Pin fällt
 *      herunter, ab 1 erscheint "Fundort gespeichert". Bildschirm zeigt im eigenen System nach +z, "tilt" = nach hinten kippen.
 *  - PoliceCar ("polizeiauto"): Kleinwagen in Silber/Blau mit Aufschrift "POLIZEI" (keine echten Logos/Wappen) und
 *      Blaulicht-Balken auf dem Dach ("blue" 1 = Blaulicht blinkt). Bewegungen wie "car" (park, drive).
 *  - Dog ("hund"): freundlicher Low-Poly-Hund (ca. 0,55 m Rückenhöhe), "walk" / "stand" / "sit", wedelt.
 *      Leine ("leash" 1) vom Halsband zur rechten Hand der Figur in "holder" (Standard "nachbar").
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.7, flatShading: true, ...extra});

// ---------------- Pistole ----------------
const usePistolMats = () =>
  useMemo(
    () => ({
      metal: std('#45484c', {roughness: 0.55, metalness: 0.35}),
      dark: std('#26282b', {roughness: 0.6, metalness: 0.3}),
      grip: std('#5a4232', {roughness: 0.9}),
      rust: std('#8d4a22', {roughness: 1}),
      rust2: std('#a35d2c', {roughness: 1}),
      hole: new THREE.MeshBasicMaterial({color: '#0b0b0c'}),
      leafA: std('#d9822b', {side: THREE.DoubleSide, roughness: 1}),
      leafB: std('#c9551f', {side: THREE.DoubleSide, roughness: 1}),
      leafC: std('#e2b347', {side: THREE.DoubleSide, roughness: 1}),
    }),
    [],
  );

const leafGeo = (() => {
  const g = new THREE.CircleGeometry(1, 5);
  g.scale(1, 0.6, 1);
  return g;
})();

/** Pistole selbst (aufrecht, Lauf +z, Ursprung Griffmitte), Maße echt (ca. 19 cm lang) */
const PistolBody = () => {
  const m = usePistolMats();
  return (
    <group>
      {/* Griff, leicht nach hinten geneigt */}
      <group rotation={[-0.28, 0, 0]}>
        <mesh material={m.grip} castShadow>
          <boxGeometry args={[0.03, 0.105, 0.042]} />
        </mesh>
        {/* Griffschalen-Riffeln */}
        {[-0.03, -0.01, 0.01, 0.03].map((y) => (
          <mesh key={y} material={m.dark} position={[0, y, 0]}>
            <boxGeometry args={[0.032, 0.004, 0.036]} />
          </mesh>
        ))}
        {/* Magazinboden */}
        <mesh material={m.dark} position={[0, -0.056, 0]}>
          <boxGeometry args={[0.032, 0.008, 0.046]} />
        </mesh>
      </group>
      {/* Rahmen + Schlitten */}
      <mesh material={m.metal} position={[0, 0.07, 0.045]} castShadow>
        <boxGeometry args={[0.028, 0.034, 0.19]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.048, 0.06]}>
        <boxGeometry args={[0.024, 0.014, 0.15]} />
      </mesh>
      {/* Griffrillen am Schlitten hinten */}
      {[-0.035, -0.027, -0.019].map((z) => (
        <mesh key={z} material={m.dark} position={[0, 0.072, z]}>
          <boxGeometry args={[0.03, 0.026, 0.003]} />
        </mesh>
      ))}
      {/* Kimme + Korn */}
      <mesh material={m.dark} position={[0, 0.09, -0.04]}>
        <boxGeometry args={[0.016, 0.008, 0.008]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.09, 0.13]}>
        <boxGeometry args={[0.005, 0.008, 0.008]} />
      </mesh>
      {/* Mündung: dunkles Loch vorn */}
      <mesh material={m.hole} position={[0, 0.072, 0.1405]}>
        <circleGeometry args={[0.006, 8]} />
      </mesh>
      {/* Abzugsbügel + Abzug */}
      <mesh material={m.dark} position={[0, 0.03, 0.035]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.022, 0.004, 4, 10, Math.PI]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.035, 0.028]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.005, 0.022, 0.006]} />
      </mesh>
      {/* Rost-Flecken */}
      {[
        [0.0145, 0.075, 0.08, 0.03, 0.016, m.rust],
        [0.0145, 0.062, 0.01, 0.022, 0.012, m.rust2],
        [-0.0145, 0.078, 0.05, 0.035, 0.014, m.rust],
        [-0.0145, 0.06, 0.11, 0.02, 0.012, m.rust2],
        [0, 0.0875, 0.02, 0.018, 0.02, m.rust],
      ].map(([x, y, z, w, h, mm], i) => (
        <mesh key={i} material={mm as THREE.Material} position={[x as number, y as number, z as number]} rotation={i === 4 ? [-Math.PI / 2, 0, 0] : [0, (x as number) > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <planeGeometry args={[w as number, h as number]} />
        </mesh>
      ))}
    </group>
  );
};

export const Pistol = ({tilt = 0, side = 0, leaves = 0, size = 0}: {tilt?: number; side?: number; leaves?: number; size?: number}) => {
  const m = usePistolMats();
  const s = 1.35 * (1 + size);
  const sd = clamp(side);
  return (
    <group scale={s}>
      {/* liegt auf der Seite: um die Laufachse gedreht + angehoben, damit sie auf dem Boden aufliegt */}
      <group position={[0, sd * 0.016, -sd * 0.045]} rotation={[0, 0, (sd * Math.PI) / 2]}>
        <group rotation={[(tilt * Math.PI) / 180, 0, 0]} position={[0, -sd * 0.0, 0]}>
          <group position={[0, 0, 0]}>
            <PistolBody />
          </group>
        </group>
      </group>
      {leaves > 0.01 &&
        [
          [0.0, 0.045, 0.03, 0.04, 0.4, m.leafA],
          [0.012, 0.047, 0.11, 0.034, 1.6, m.leafB],
          [-0.02, 0.043, -0.03, 0.032, 2.6, m.leafC],
        ].map(([x, y, z, r, rot, mm], i) => (
          <mesh
            key={i}
            geometry={leafGeo}
            material={mm as THREE.Material}
            position={[x as number, (y as number) * sd + 0.004, z as number]}
            rotation={[-Math.PI / 2 + 0.15 * (i - 1), 0, rot as number]}
            scale={(r as number) * clamp(leaves)}
          />
        ))}
    </group>
  );
};

// ---------------- Handy mit Karte ----------------
const mapTexture = (label: boolean) => () => {
  const c = document.createElement('canvas');
  c.width = 264;
  c.height = 552;
  const g = c.getContext('2d')!;
  // Kartengrund
  g.fillStyle = '#efe9da';
  g.fillRect(0, 0, 264, 552);
  // Waldflächen
  g.fillStyle = '#a9cf8c';
  g.beginPath();
  g.moveTo(0, 70);
  g.bezierCurveTo(120, 40, 220, 120, 264, 90);
  g.lineTo(264, 470);
  g.bezierCurveTo(170, 500, 80, 440, 0, 480);
  g.closePath();
  g.fill();
  g.fillStyle = '#93c178';
  for (const [x, y, r] of [[60, 160, 40], [200, 210, 48], [90, 360, 52], [210, 400, 36]]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // Straße oben
  g.strokeStyle = '#ffffff';
  g.lineWidth = 18;
  g.beginPath();
  g.moveTo(0, 40);
  g.lineTo(264, 30);
  g.stroke();
  g.strokeStyle = '#f2c94c';
  g.lineWidth = 10;
  g.stroke();
  // Waldweg (gestrichelt)
  g.strokeStyle = '#b58a52';
  g.lineWidth = 7;
  g.setLineDash([14, 9]);
  g.beginPath();
  g.moveTo(130, 36);
  g.bezierCurveTo(110, 180, 170, 300, 132, 552);
  g.stroke();
  g.setLineDash([]);
  // eigener Standort (blauer Punkt)
  g.fillStyle = 'rgba(47,128,237,0.25)';
  g.beginPath();
  g.arc(140, 318, 24, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2f80ed';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(140, 318, 11, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // obere Leiste
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 264, 22);
  g.fillStyle = '#333';
  g.font = `700 15px ${T.font}`;
  g.textBaseline = 'middle';
  g.fillText('12:04', 12, 12);
  if (label) {
    // Hinweis-Karte unten
    g.fillStyle = '#ffffff';
    g.shadowColor = 'rgba(0,0,0,0.25)';
    g.shadowBlur = 10;
    g.beginPath();
    g.roundRect(14, 432, 236, 96, 16);
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#d63a2f';
    g.beginPath();
    g.arc(52, 480, 18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = `800 26px ${T.font}`;
    g.textAlign = 'center';
    g.fillText('✓', 52, 482);
    g.textAlign = 'left';
    g.fillStyle = '#1f2328';
    g.font = `800 30px ${T.font}`;
    g.fillText('Fundort', 82, 466);
    g.fillText('gespeichert', 82, 498);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

const PHONE_W = 0.075;
const PHONE_H = 0.155;

export const MapPhone = ({pin = 0, size = 0}: {pin?: number; size?: number}) => {
  const texA = useFontTexture(mapTexture(false), 'Karte');
  const texB = useFontTexture(mapTexture(true), 'Karte gespeichert');
  const tex = pin >= 0.999 ? texB : texA;
  const m = useMemo(
    () => ({
      body: std('#1b1d21', {roughness: 0.4, metalness: 0.4}),
      pin: std('#e0362c', {roughness: 0.45, emissive: '#5a0a05', emissiveIntensity: 0.4}),
      pinDot: new THREE.MeshBasicMaterial({color: '#ffffff'}),
      shadow: new THREE.MeshBasicMaterial({color: '#000000', transparent: true, opacity: 0.25}),
    }),
    [],
  );
  const screen = useMemo(
    () =>
      tex
        ? new THREE.MeshStandardMaterial({map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.75, roughness: 0.3})
        : new THREE.MeshStandardMaterial({color: '#efe9da'}),
    [tex],
  );
  // Pin fällt (0 … 0,7) und federt (0,7 … 1)
  const p = clamp(pin);
  const fall = p < 0.7 ? easeInOut(p / 0.7) : 1;
  const bounce = p >= 0.7 ? Math.sin(((p - 0.7) / 0.3) * Math.PI) * 0.06 : 0;
  const pinY = 0.006 + (1 - fall) * 0.05 + bounce * 0.05;
  const pinOn = p > 0.01;
  // Pin-Spitze auf der Karte: etwas über dem blauen Punkt (Texturkoordinate 140/264, 290/552)
  const px = (140 / 264 - 0.5) * (PHONE_W - 0.009);
  const py = (0.5 - 300 / 552) * (PHONE_H - 0.017);
  return (
    <group scale={1 + size}>
      <mesh material={m.body} castShadow>
        <boxGeometry args={[PHONE_W, PHONE_H, 0.01]} />
      </mesh>
      <mesh material={screen} position={[0, 0, 0.0055]}>
        <planeGeometry args={[PHONE_W - 0.009, PHONE_H - 0.017]} />
      </mesh>
      {pinOn && (
        <group position={[px, py, 0.0058]}>
          <mesh material={m.shadow} position={[0.002, -0.001, 0.0002]} scale={[1, 0.5, 1]}>
            <circleGeometry args={[0.004 * fall, 10]} />
          </mesh>
          {/* Pin: Spitze unten an der Stelle, Kopf darüber (schwebt beim Fallen über dem Bildschirm) */}
          <group position={[0, 0, pinY]} scale={0.55 + 0.45 * fall}>
            <mesh material={m.pin} position={[0, 0.011, 0.002]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.0055, 0.016, 8]} />
            </mesh>
            <mesh material={m.pin} position={[0, 0.021, 0.002]}>
              <sphereGeometry args={[0.0085, 12, 8]} />
            </mesh>
            <mesh material={m.pinDot} position={[0, 0.021, 0.0108]}>
              <circleGeometry args={[0.0032, 10]} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

// ---------------- Polizeiauto ----------------
const policeText = () => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 512, 96);
  g.fillStyle = '#1d3f8f';
  g.font = `800 84px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('POLIZEI', 256, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

export const PoliceCar = ({pose, blue = 0, time = 0}: {pose: CarPose; blue?: number; time?: number}) => {
  const tex = useFontTexture(policeText, 'Polizei-Schrift');
  const m = useMemo(
    () => ({
      stripe: std('#2457c5', {roughness: 0.4}),
      stripe2: std('#9fc2ee', {roughness: 0.4}),
      bar: std('#2a2d31', {roughness: 0.5}),
      blueOn: new THREE.MeshStandardMaterial({color: '#4f8dff', emissive: '#2f6bff', emissiveIntensity: 2.2, transparent: true, opacity: 0.95}),
      blueOff: std('#1e3c8a', {roughness: 0.3, transparent: true, opacity: 0.9}),
    }),
    [],
  );
  const text = useMemo(() => (tex ? new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false}) : null), [tex]);
  const on = blue > 0.5;
  const ph = (time * 2.6) % 1;
  const leftOn = on && ph < 0.5 && ph % 0.25 < 0.16;
  const rightOn = on && ph >= 0.5 && ph % 0.25 < 0.16;
  const X = 0.815;
  return (
    <group>
      <Car pose={pose} color="#e8ebee" />
      {/* blaue Streifen an beiden Seiten (Fahrertür bleibt hier zu) */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh material={m.stripe} position={[s * X, 0.56, 0]}>
            <boxGeometry args={[0.012, 0.13, 3.1]} />
          </mesh>
          <mesh material={m.stripe2} position={[s * X, 0.47, 0]}>
            <boxGeometry args={[0.012, 0.04, 3.1]} />
          </mesh>
          {text && (
            <mesh material={text} position={[s * (X + 0.004), 0.8, -0.2]} rotation={[0, s * Math.PI / 2, 0]}>
              <planeGeometry args={[1.3, 0.24]} />
            </mesh>
          )}
        </group>
      ))}
      {/* Haube */}
      <mesh material={m.stripe} position={[0, 0.875, 1.25]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.9, 0.012, 0.5]} />
      </mesh>
      {/* Blaulicht-Balken */}
      <group position={[0, CAR.roofY + 0.09, -0.4]}>
        <mesh material={m.bar}>
          <boxGeometry args={[1.0, 0.05, 0.22]} />
        </mesh>
        <mesh material={leftOn ? m.blueOn : m.blueOff} position={[0.3, 0.07, 0]}>
          <boxGeometry args={[0.36, 0.1, 0.2]} />
        </mesh>
        <mesh material={rightOn ? m.blueOn : m.blueOff} position={[-0.3, 0.07, 0]}>
          <boxGeometry args={[0.36, 0.1, 0.2]} />
        </mesh>
        {leftOn && <pointLight color="#3f7bff" intensity={2.5} distance={6} position={[0.3, 0.2, 0]} />}
        {rightOn && <pointLight color="#3f7bff" intensity={2.5} distance={6} position={[-0.3, 0.2, 0]} />}
      </group>
    </group>
  );
};

// ---------------- Hund ----------------
export type DogPose = {legs: [number, number, number, number]; bodyPitch: number; hipDrop: number; head: number; tail: number; bob: number; sit: number};

/** Haltung des Hundes. time = Sekunden seit Beginn der Bewegung */
export const dogPose = (motion: string, time: number, speed: number): DogPose => {
  const tail = Math.sin(time * 14) * 0.55;
  if (motion === 'walk' || motion === 'run') {
    const f = (speed > 0.05 ? speed : 1) * 2.2;
    const s = Math.sin(time * f * Math.PI);
    return {legs: [s * 0.5, -s * 0.5, -s * 0.5, s * 0.5], bodyPitch: 0, hipDrop: 0, head: Math.sin(time * f * Math.PI * 2) * 0.05, tail, bob: Math.abs(s) * 0.02, sit: 0};
  }
  if (motion === 'sit') {
    const k = easeInOut(clamp(time / 0.6));
    return {legs: [0, 0, 0, 0], bodyPitch: -0.55 * k, hipDrop: 0.2 * k, head: 0.25 * k + Math.sin(time * 1.5) * 0.04, tail: tail * 0.6, bob: 0, sit: k};
  }
  return {legs: [0, 0, 0, 0], bodyPitch: 0, hipDrop: 0, head: Math.sin(time * 1.2) * 0.06, tail, bob: Math.sin(time * 2.4) * 0.004, sit: 0};
};

/** Halsband in Hund-Koordinaten (für die Leine) */
export const DOG_COLLAR = new THREE.Vector3(0, 0.6, 0.33);

export const Dog = ({pose}: {pose: DogPose}) => {
  const m = useMemo(
    () => ({
      fur: std('#b8783c'),
      light: std('#f1e3c8'),
      dark: std('#5b3a22'),
      nose: std('#1b1b1b', {roughness: 0.4}),
      eye: std('#141414', {roughness: 0.2}),
      collar: std('#d6352b'),
      tongue: std('#e97b8a'),
    }),
    [],
  );
  const legPos: [number, number][] = [
    [0.1, 0.22],
    [-0.1, 0.22],
    [0.1, -0.24],
    [-0.1, -0.24],
  ];
  return (
    <group position={[0, pose.bob, 0]}>
      {/* Hinterteil sinkt beim Sitzen, Körper richtet sich vorn auf (Drehung um die Hinterbeine) */}
      <group position={[0, -pose.hipDrop * 0.5, -0.24]} rotation={[pose.bodyPitch, 0, 0]}>
        <group position={[0, 0, 0.24]}>
          {/* Körper */}
          <mesh material={m.fur} position={[0, 0.44, 0]} scale={[0.17, 0.15, 0.32]} castShadow>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          <mesh material={m.light} position={[0, 0.4, 0.2]} scale={[0.12, 0.11, 0.12]}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          {/* Vorderbeine */}
          {legPos.slice(0, 2).map(([x, z], i) => (
            <group key={i} position={[x, 0.36, z]} rotation={[pose.legs[i] * (1 - pose.sit), 0, 0]}>
              <mesh material={m.fur} position={[0, -0.17, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.03, 0.34, 6]} />
              </mesh>
              <mesh material={m.light} position={[0, -0.34, 0.015]}>
                <boxGeometry args={[0.06, 0.035, 0.08]} />
              </mesh>
            </group>
          ))}
          {/* Hinterbeine (beim Sitzen angewinkelt) */}
          {legPos.slice(2).map(([x, z], i) => (
            <group key={i} position={[x, 0.38, z]} rotation={[pose.legs[i + 2] * (1 - pose.sit) - pose.bodyPitch - 1.2 * pose.sit, 0, 0]}>
              <mesh material={m.fur} position={[0, -0.17, 0]} castShadow>
                <cylinderGeometry args={[0.045, 0.03, 0.36 - 0.12 * pose.sit, 6]} />
              </mesh>
              <mesh material={m.light} position={[0, -0.35 + 0.06 * pose.sit, 0.015]}>
                <boxGeometry args={[0.06, 0.035, 0.08]} />
              </mesh>
            </group>
          ))}
          {/* Schwanz */}
          <group position={[0, 0.5, -0.3]} rotation={[-0.9, pose.tail, 0]}>
            <mesh material={m.fur} position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.03, 0.22, 5]} />
            </mesh>
          </group>
          {/* Halsband */}
          <mesh material={m.collar} position={[0, 0.58, 0.31]} rotation={[1.0, 0, 0]}>
            <torusGeometry args={[0.075, 0.014, 5, 12]} />
          </mesh>
          {/* Kopf */}
          <group position={[0, 0.64, 0.36]} rotation={[pose.head - pose.bodyPitch * 0.8, 0, 0]}>
            <mesh material={m.fur} scale={[0.11, 0.1, 0.11]} castShadow>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh material={m.light} position={[0, -0.025, 0.1]} scale={[0.06, 0.05, 0.08]}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh material={m.nose} position={[0, -0.005, 0.175]}>
              <sphereGeometry args={[0.018, 8, 6]} />
            </mesh>
            <mesh material={m.tongue} position={[0, -0.06, 0.13]} rotation={[0.4, 0, 0]}>
              <boxGeometry args={[0.03, 0.006, 0.05]} />
            </mesh>
            {[1, -1].map((s) => (
              <group key={s}>
                <mesh material={m.eye} position={[s * 0.045, 0.035, 0.088]}>
                  <sphereGeometry args={[0.014, 8, 6]} />
                </mesh>
                {/* Schlappohren */}
                <mesh material={m.dark} position={[s * 0.1, 0.0, -0.01]} rotation={[0, 0, s * 0.35]} scale={[0.025, 0.08, 0.055]}>
                  <icosahedronGeometry args={[1, 0]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
};

/** Leine zwischen zwei Weltpunkten, hängt leicht durch */
export const Leash = ({a, b}: {a: THREE.Vector3; b: THREE.Vector3}) => {
  const mat = useMemo(() => std('#d6352b', {roughness: 0.6}), []);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, -Math.max(0.02, 0.35 - len * 0.25), 0));
  const seg = (p: THREE.Vector3, q: THREE.Vector3, i: number) => {
    const c = p.clone().add(q).multiplyScalar(0.5);
    const l = p.distanceTo(q);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
    return (
      <mesh key={i} material={mat} position={c} quaternion={quat}>
        <cylinderGeometry args={[0.008, 0.008, l, 5]} />
      </mesh>
    );
  };
  return <>{[seg(a, mid, 0), seg(mid, b, 1)]}</>;
};
