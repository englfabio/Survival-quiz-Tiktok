import {useMemo} from 'react';
import {spring} from 'remotion';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {T} from '../ui/theme';
import {useFontTexture} from './ToothProps';
import {ReadingGlasses} from './WgProps';

/**
 * Spezial „Tauben haben dein Haus eingenommen“ – alles comichaft, freundlich, ohne Logos. Den Tauben passiert nie etwas.
 *
 *  - Pigeon: stilisierte Low-Poly-Taube (ca. 0,4 m hoch), blaugrau, grün-lila schillernder Hals, helle Flügel mit zwei dunklen Binden,
 *      dunkles Schwanzband, rote Füße, große Kulleraugen. Blickt nach +z, Ursprung = zwischen den Füßen.
 *      `leader` = Tauben-Anführer: etwas größer, dunkler, kleine rote Krawatte + Lesebrille. `light` 0 … 1 = kleines rotes Blinklicht auf dem Rücken.
 *  - PigeonFlock ("tauben", "tauben2", "tauben3"): ganzer Schwarm in WELT-Koordinaten (Figur bei (0, 0), face 180, y 0 = sichtbar, y −30 = weg).
 *      Feld `text`: Tauben getrennt mit ";", je "x y z face" (sitzt) oder "x y z face>x y z face" (fliegt von → nach).
 *      Werte: `fill` 0 … 1 = Flug-Fortschritt (0 = alle sitzen am Start, 1 = alle am Ziel), `mark` = Staffelung (0 = alle gleichzeitig,
 *      0,6 = nacheinander), `blink` 0/1 = rote Lichter blinken, `size` = größer.
 *  - LeaderPigeon ("taubenchef"): Bewegungen perch (sitzen, picken), talk (mit den Flügeln gestikulieren), nod (nicken), wingshake (rechter
 *      Flügel nach vorn + schütteln, Spitze ca. 0,32 m vor ihm auf 0,42 m × Größe), wingpush (Papier über den Tisch schieben, alle 1,6 s), flap, walk.
 *  - RentContract ("mietvertrag"): Blatt „MIETVERTRAG“, liegt flach, Schrift lesbar von +z. `mark` 0 … 1 = roter Stempel „GENEHMIGT“ knallt drauf.
 *  - CleaningPlan ("putzplan") + HouseRules ("hausordnung"): Zettel/Schild senkrecht, Vorderseite +z (an Tür/Wand hängen, face wie die Wand).
 *  - TvSet ("fernseher"): Lowboard + Flachbild-Fernseher (1,0 × 0,6 m), Oberkante 1,08 m, Vorderseite +z; Bildschirm zeigt Himmel + Wolken.
 *  - HoldNotes ("warteschleife"): schwebende Musiknoten + Schild „Bitte warten …“, schaut zur Kamera, Bewegung `show`.
 *  - ChargeBadge ("ladesymbol"): grüne Batterie mit Blitz, füllt sich in Schleife, schaut zur Kamera, Bewegung `show`, `size`.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.7, flatShading: true, ...extra});

export type PigeonPose = {
  bob: number;
  headPitch: number;
  headYaw: number;
  /** Flügel ausbreiten 0 … 1 (Flug) */
  spread: number;
  /** Flügelschlag-Winkel (Bogenmaß) */
  flapL: number;
  flapR: number;
  /** Flügel nach vorn strecken 0 … 1 (Gesten) */
  reachL: number;
  reachR: number;
  wiggleL: number;
  wiggleR: number;
  /** Körper nach vorn kippen (+) bzw. Brust hoch (−) */
  pitch: number;
  /** Beine eingezogen (Flug) */
  tuck: number;
  hop: number;
  waddle: number;
};

const restPose = (): PigeonPose => ({bob: 0, headPitch: 0, headYaw: 0, spread: 0, flapL: 0, flapR: 0, reachL: 0, reachR: 0, wiggleL: 0, wiggleR: 0, pitch: -0.22, tuck: 0, hop: 0, waddle: 0});

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Sitzende Taube: wippt, schaut ruckartig umher, pickt ab und zu */
export const perchPose = (time: number, seed: number): PigeonPose => {
  const p = restPose();
  const ph = hash(seed) * 10;
  p.bob = 0.006 * Math.sin(time * 2.4 + ph);
  const step = Math.floor(time * 0.9 + ph);
  p.headYaw = (hash(step + seed * 7) - 0.5) * 1.1;
  const c = (time + ph) % (3.2 + hash(seed + 3) * 1.6);
  const peck = Math.sin(Math.PI * clamp((c - 2.4) / 0.35));
  p.headPitch = 0.7 * Math.max(0, peck) + 0.05 * Math.sin(time * 5 + ph);
  p.pitch = -0.22 + 0.25 * Math.max(0, peck);
  return p;
};

/** Fliegende Taube: Flügel weit, schneller Flügelschlag, Beine eingezogen */
export const flyPose = (time: number, seed: number, amount = 1): PigeonPose => {
  const p = restPose();
  const f = Math.sin(time * 26 + hash(seed) * 6);
  p.spread = amount;
  p.flapL = p.flapR = 0.75 * f * amount;
  p.pitch = -0.22 * (1 - amount) + 0.12 * amount;
  p.tuck = amount;
  p.headPitch = -0.15 * amount;
  return p;
};

export const leaderPose = (motion: string, time: number): PigeonPose => {
  switch (motion) {
    case 'talk': {
      const p = perchPose(time, 5);
      const a = Math.sin(time * 3.3);
      const b = Math.sin(time * 2.6 + 1.3);
      p.reachR = 0.55 + 0.35 * Math.max(0, a);
      p.reachL = 0.45 + 0.35 * Math.max(0, b);
      p.wiggleR = 0.25 * a;
      p.wiggleL = 0.25 * b;
      p.headPitch = 0.12 * Math.sin(time * 4.1);
      p.headYaw = 0.25 * Math.sin(time * 1.5);
      p.pitch = -0.28;
      p.bob = 0.01 * Math.sin(time * 6);
      return p;
    }
    case 'nod': {
      const p = restPose();
      const n = Math.max(0, Math.sin((time * Math.PI * 2) / 0.8));
      p.headPitch = 0.45 * n;
      p.pitch = -0.25 + 0.08 * n;
      return p;
    }
    case 'wingshake': {
      const p = restPose();
      const k = easeInOut(clamp(time / 0.45));
      p.reachR = k;
      p.wiggleR = 0.22 * Math.sin(time * 10) * clamp((time - 0.45) / 0.2);
      p.pitch = -0.1 * k - 0.2;
      p.headPitch = 0.1 * Math.sin(time * 3.5);
      return p;
    }
    case 'wingpush': {
      const p = restPose();
      const c = (time % 1.6) / 1.6;
      const push = easeInOut(clamp(c / 0.45)) * (1 - easeInOut(clamp((c - 0.6) / 0.4)));
      p.reachR = 0.5 + 0.5 * push;
      p.reachL = 0.5 + 0.5 * push;
      p.pitch = -0.1 + 0.3 * push;
      p.headPitch = 0.2 + 0.1 * push;
      return p;
    }
    case 'flap': {
      const p = flyPose(time, 3, 1);
      p.tuck = 0;
      p.hop = 0.05 * Math.abs(Math.sin(time * 6));
      p.pitch = -0.35;
      return p;
    }
    case 'walk': {
      const p = perchPose(time, 2);
      const s = Math.sin(time * 9);
      p.waddle = s;
      p.headPitch = 0.25 * Math.max(0, Math.sin(time * 9 + 0.5)) - 0.05;
      p.bob = 0.012 * Math.abs(s);
      return p;
    }
    default:
      return perchPose(time, 1);
  }
};

const BODY = '#8b97ad';
const BODY_LEADER = '#6f7a8f';

const usePigeonMats = (leader: boolean) =>
  useMemo(
    () => ({
      body: std(leader ? BODY_LEADER : BODY, {roughness: 0.75}),
      head: std(leader ? '#646f84' : '#7f8aa2', {roughness: 0.7}),
      neckG: std('#3f8f74', {roughness: 0.25, metalness: 0.35, emissive: '#11352a', emissiveIntensity: 0.4}),
      neckP: std('#7a5aa8', {roughness: 0.25, metalness: 0.35, emissive: '#2a1a3f', emissiveIntensity: 0.4}),
      wing: std(leader ? '#9aa4b6' : '#aeb8c9', {roughness: 0.8}),
      bar: std('#2f343d', {roughness: 0.8}),
      tail: std(leader ? '#5f6a7e' : '#7a8498', {roughness: 0.8}),
      dark: std('#2d3139', {roughness: 0.8}),
      foot: std('#e06a55', {roughness: 0.6}),
      beak: std('#3a3436', {roughness: 0.5}),
      cere: std('#f2efe8', {roughness: 0.9}),
      eye: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.25}),
      iris: new THREE.MeshStandardMaterial({color: '#f08a24', roughness: 0.3}),
      pupil: new THREE.MeshStandardMaterial({color: '#111111', roughness: 0.2}),
      red: new THREE.MeshStandardMaterial({color: '#ff2a1a', emissive: '#ff1a0a', emissiveIntensity: 2.4, roughness: 0.3}),
      redOff: new THREE.MeshStandardMaterial({color: '#5a1a14', roughness: 0.5}),
      halo: new THREE.MeshBasicMaterial({color: '#ff3a22', transparent: true, opacity: 0.35, depthWrite: false}),
      tie: std('#c8102e', {roughness: 0.5}),
    }),
    [leader],
  );

const sphere = new THREE.SphereGeometry(1, 10, 8);
const box = new THREE.BoxGeometry(1, 1, 1);
const beakGeo = new THREE.ConeGeometry(1, 1, 6);

const Wing = ({side, pose, m}: {side: 1 | -1; pose: PigeonPose; m: ReturnType<typeof usePigeonMats>}) => {
  const s = side === 1 ? 'L' : 'R';
  const spread = pose.spread;
  const reach = side === 1 ? pose.reachL : pose.reachR;
  const flap = side === 1 ? pose.flapL : pose.flapR;
  const wig = side === 1 ? pose.wiggleL : pose.wiggleR;
  // gefaltet: lange Achse (−y) zeigt nach hinten; ausgebreitet: nach außen; Geste: nach vorn
  const rx = 1.4 * (1 - spread) * (1 - reach) + (-1.25 + wig) * reach;
  const rz = side * (spread * (Math.PI / 2 + flap) + 0.35 * reach);
  void s;
  return (
    <group position={[side * 0.1, 0.035, 0.04]} rotation={[0, 0, rz]}>
      <group rotation={[rx, 0, 0]}>
        <mesh geometry={sphere} material={m.wing} position={[0, -0.1, 0]} scale={[0.024, 0.105, 0.075]} castShadow />
        <mesh geometry={box} material={m.bar} position={[side * 0.016, -0.09, 0]} scale={[0.012, 0.016, 0.1]} />
        <mesh geometry={box} material={m.bar} position={[side * 0.016, -0.125, 0]} scale={[0.012, 0.016, 0.085]} />
        <mesh geometry={sphere} material={m.dark} position={[0, -0.19, 0]} scale={[0.02, 0.04, 0.05]} />
      </group>
    </group>
  );
};

/** Eine Taube (Ursprung zwischen den Füßen, Blick +z) */
export const Pigeon = ({pose, leader = false, light = 0, time = 0}: {pose: PigeonPose; leader?: boolean; light?: number; time?: number}) => {
  const m = usePigeonMats(leader);
  const legY = 0.09 * (1 - 0.7 * pose.tuck);
  const on = light > 0.5 && Math.sin(time * Math.PI * 2 * 1.6) > -0.1;
  return (
    <group position={[0, pose.hop, 0]} rotation={[0, 0, 0.08 * pose.waddle]}>
      {/* Beine + Füße */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.04, 0, 0.01 + 0.03 * s * pose.waddle]}>
          <mesh geometry={box} material={m.foot} position={[0, legY / 2 + 0.07 * pose.tuck, 0]} scale={[0.018, legY, 0.018]} />
          {pose.tuck < 0.5 && <mesh geometry={box} material={m.foot} position={[0, 0.006, 0.02]} scale={[0.035, 0.012, 0.06]} />}
        </group>
      ))}
      {/* Körper (kippt um die Körpermitte) */}
      <group position={[0, 0.17 + pose.bob, 0]} rotation={[pose.pitch, 0, 0]}>
        <mesh geometry={sphere} material={m.body} scale={[0.12, 0.11, 0.19]} castShadow />
        <mesh geometry={sphere} material={m.neckG} position={[0, 0.07, 0.1]} scale={[0.088, 0.1, 0.085]} />
        <mesh geometry={sphere} material={m.neckP} position={[0, 0.045, 0.125]} scale={[0.08, 0.055, 0.07]} />
        <mesh geometry={box} material={m.tail} position={[0, -0.005, -0.21]} rotation={[-0.15, 0, 0]} scale={[0.11, 0.025, 0.13]} />
        <mesh geometry={box} material={m.dark} position={[0, -0.016, -0.27]} rotation={[-0.15, 0, 0]} scale={[0.112, 0.027, 0.03]} />
        <Wing side={1} pose={pose} m={m} />
        <Wing side={-1} pose={pose} m={m} />
        {/* rotes Blinklicht auf dem Rücken */}
        {light > 0.01 && (
          <group position={[0, 0.112, -0.03]}>
            <mesh geometry={box} material={m.dark} scale={[0.04, 0.02, 0.04]} />
            <mesh geometry={sphere} material={on ? m.red : m.redOff} position={[0, 0.018, 0]} scale={0.02} />
            {on && <mesh geometry={sphere} material={m.halo} position={[0, 0.018, 0]} scale={0.06} />}
          </group>
        )}
        {leader && (
          <group position={[0, 0.03, 0.175]} rotation={[-0.35, 0, 0]}>
            <mesh geometry={box} material={m.tie} position={[0, 0.03, 0]} scale={[0.03, 0.025, 0.02]} />
            <mesh material={m.tie} position={[0, -0.025, 0.004]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.022, 0.08, 4]} />
            </mesh>
          </group>
        )}
        {/* Kopf */}
        <group position={[0, 0.16, 0.14]} rotation={[pose.headPitch - pose.pitch * 0.6, pose.headYaw, 0]}>
          <mesh geometry={sphere} material={m.head} scale={0.07} castShadow />
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.042, 0.016, 0.04]}>
              <mesh geometry={sphere} material={m.eye} scale={0.027} />
              <mesh geometry={sphere} material={m.iris} position={[s * 0.004, 0, 0.018]} scale={[0.017, 0.017, 0.012]} />
              <mesh geometry={sphere} material={m.pupil} position={[s * 0.005, 0, 0.026]} scale={[0.009, 0.009, 0.006]} />
            </group>
          ))}
          <mesh geometry={beakGeo} material={m.beak} position={[0, -0.008, 0.088]} rotation={[Math.PI / 2, 0, 0]} scale={[0.017, 0.05, 0.014]} />
          <mesh geometry={sphere} material={m.cere} position={[0, 0.008, 0.07]} scale={[0.016, 0.011, 0.014]} />
          {leader && (
            <group scale={0.6} position={[0, -0.004, 0.005]}>
              <ReadingGlasses amount={1} />
            </group>
          )}
        </group>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------------------------------------
// Schwarm
// ------------------------------------------------------------------------------------------------
type Spot = [number, number, number, number];
type Bird = {a: Spot; b?: Spot};
const parseFlock = (text?: string): Bird[] =>
  (text ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [a, b] = s.split('>').map((q) => q.trim().split(/\s+/).map(Number) as Spot);
      return {a, b};
    });

const angDiff = (a: number, b: number) => {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Lage einer Schwarm-Taube zum Fortschritt p (0 … 1): Position, Blickrichtung (face), Fluganteil */
export const flockBirdAt = (bird: Bird, p: number, seed: number) => {
  const a = bird.a;
  const b = bird.b ?? bird.a;
  if (!bird.b || p <= 0) return {pos: [a[0], a[1], a[2]] as [number, number, number], face: a[3], fly: 0, dir: 0};
  if (p >= 1) return {pos: [b[0], b[1], b[2]] as [number, number, number], face: b[3], fly: 0, dir: 0};
  const e = smooth(p);
  const dist = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const h = Math.min(3.5, 0.5 + 0.22 * dist);
  const sway = Math.sin(p * Math.PI) * 0.25 * (hash(seed + 9) - 0.5) * Math.min(1, dist / 4);
  const nx = -(b[2] - a[2]) / (dist || 1);
  const nz = (b[0] - a[0]) / (dist || 1);
  const pos: [number, number, number] = [a[0] + (b[0] - a[0]) * e + nx * sway, a[1] + (b[1] - a[1]) * e + 4 * h * e * (1 - e), a[2] + (b[2] - a[2]) * e + nz * sway];
  // Flugrichtung als face (0 = −z, 90 = +x)
  const dirFace = (Math.atan2(b[0] - a[0], -(b[2] - a[2])) * 180) / Math.PI;
  const toDir = clamp(p / 0.12);
  const fromDir = clamp((1 - p) / 0.12);
  const face = p < 0.5 ? a[3] + angDiff(a[3], dirFace) * toDir : b[3] + angDiff(b[3], dirFace) * fromDir;
  const fly = Math.min(clamp(p / 0.06), clamp((1 - p) / 0.06));
  return {pos, face, fly, dir: dirFace};
};

/** Fortschritt der i-ten Taube bei Schwarm-Fortschritt fill und Staffelung mark */
export const flockProgress = (i: number, fill: number, mark: number) => {
  const S = mark + 0.05;
  const d = S * hash(i * 3.7 + 1);
  return clamp(fill * (1 + S) - d);
};

export const PigeonFlock = ({text, fill = 0, mark = 0, blink = 0, size = 0, time = 0}: {text?: string; fill?: number; mark?: number; blink?: number; size?: number; time?: number}) => {
  const birds = useMemo(() => parseFlock(text), [text]);
  return (
    <group>
      {birds.map((bird, i) => {
        const p = flockProgress(i, fill, mark);
        const at = flockBirdAt(bird, p, i);
        const pose = at.fly > 0 ? flyPose(time, i, at.fly) : perchPose(time, i);
        const sc = (0.92 + 0.16 * hash(i + 0.5)) * (1 + size);
        return (
          <group key={i} position={at.pos} rotation={[0, THREE.MathUtils.degToRad(180 - at.face), 0]} scale={sc}>
            <Pigeon pose={pose} light={blink} time={time + hash(i) * 0.3} />
          </group>
        );
      })}
    </group>
  );
};

// ------------------------------------------------------------------------------------------------
// Papiere + Schilder
// ------------------------------------------------------------------------------------------------
const paperBase = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  return {c, g};
};
const finish = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

const contractTexture = (stamp: number) => () => {
  const {c, g} = paperBase(480, 640);
  g.fillStyle = '#fbfaf4';
  g.fillRect(0, 0, 480, 640);
  g.fillStyle = '#1e2226';
  g.textAlign = 'center';
  g.font = `800 70px ${T.font}`;
  g.fillText('MIETVERTRAG', 240, 92);
  g.font = `600 34px ${T.font}`;
  g.fillStyle = '#3a4048';
  g.fillText('Dachboden: Tauben', 240, 160);
  g.fillText('Küche: Dummy', 240, 202);
  g.strokeStyle = '#b9bcc2';
  g.lineWidth = 5;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(50, 260 + i * 38);
    g.lineTo(i % 2 ? 380 : 430, 260 + i * 38);
    g.stroke();
  }
  // Unterschriften: Kritzel + Tauben-Fußabdruck
  g.strokeStyle = '#1f4fd6';
  g.lineWidth = 5;
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const x = 50 + u * 150;
    const y = 545 - 16 * Math.sin(u * 18) - 5 * u;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.strokeStyle = '#5a5f66';
  g.lineWidth = 7;
  g.lineCap = 'round';
  const fx = 360;
  const fy = 555;
  for (const a of [-0.55, 0, 0.55]) {
    g.beginPath();
    g.moveTo(fx, fy);
    g.lineTo(fx + Math.sin(a) * 42, fy - Math.cos(a) * 42);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(fx, fy);
  g.lineTo(fx, fy + 24);
  g.stroke();
  g.fillStyle = '#7a7f86';
  g.font = `600 24px ${T.font}`;
  g.fillText('Dummy', 125, 600);
  g.fillText('Tauben-Chef', 360, 600);
  if (stamp > 0.5) {
    g.save();
    g.translate(260, 400);
    g.rotate(-0.18);
    g.strokeStyle = 'rgba(214,32,32,0.9)';
    g.lineWidth = 9;
    g.strokeRect(-170, -52, 340, 104);
    g.fillStyle = 'rgba(214,32,32,0.9)';
    g.font = `800 68px ${T.font}`;
    g.textBaseline = 'middle';
    g.fillText('GENEHMIGT', 0, 4);
    g.restore();
  }
  return finish(c);
};

export const RentContract = ({mark = 0, time = 0}: {mark?: number; time?: number}) => {
  const st = mark > 0.5 ? 1 : 0;
  const tex = useFontTexture(contractTexture(st), `Mietvertrag ${st}`);
  const mat = useMemo(() => (tex ? new THREE.MeshStandardMaterial({map: tex, roughness: 0.9}) : null), [tex]);
  void time;
  return (
    <group>
      <mesh position={[0, 0.002, 0]} receiveShadow>
        <boxGeometry args={[0.245, 0.003, 0.325]} />
        <meshStandardMaterial color="#f1efe6" />
      </mesh>
      {mat && (
        <mesh material={mat} position={[0, 0.0045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.24, 0.32]} />
        </mesh>
      )}
    </group>
  );
};

const planTexture = () => () => {
  const {c, g} = paperBase(480, 640);
  g.fillStyle = '#fffdf4';
  g.fillRect(0, 0, 480, 640);
  g.fillStyle = '#2f6db5';
  g.fillRect(0, 0, 480, 110);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.font = `800 78px ${T.font}`;
  g.fillText('PUTZPLAN', 240, 84);
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const who = ['Tauben', 'Dummy', 'Tauben', 'Dummy', 'Tauben', 'Dummy', 'Tauben'];
  g.font = `700 40px ${T.font}`;
  for (let i = 0; i < 7; i++) {
    const y = 160 + i * 66;
    g.fillStyle = i % 2 ? '#eef2f8' : '#ffffff';
    g.fillRect(20, y - 44, 440, 62);
    g.fillStyle = '#1e2226';
    g.textAlign = 'left';
    g.fillText(days[i], 40, y);
    g.fillText(who[i], 140, y);
    if (i < 4) {
      g.strokeStyle = T.green;
      g.lineWidth = 9;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(390, y - 16);
      g.lineTo(405, y);
      g.lineTo(432, y - 32);
      g.stroke();
    }
  }
  return finish(c);
};

export const CleaningPlan = () => {
  const tex = useFontTexture(planTexture(), 'Putzplan');
  const mat = useMemo(() => (tex ? new THREE.MeshStandardMaterial({map: tex, roughness: 0.9}) : null), [tex]);
  return (
    <group>
      <mesh position={[0, 0, -0.002]}>
        <boxGeometry args={[0.32, 0.42, 0.004]} />
        <meshStandardMaterial color="#f4f1e6" />
      </mesh>
      {mat && (
        <mesh material={mat} position={[0, 0, 0.001]}>
          <planeGeometry args={[0.3, 0.4]} />
        </mesh>
      )}
      <mesh position={[0, 0.19, 0.006]}>
        <sphereGeometry args={[0.012, 8, 6]} />
        <meshStandardMaterial color="#d8392b" />
      </mesh>
    </group>
  );
};

const rulesTexture = () => () => {
  const {c, g} = paperBase(560, 640);
  g.fillStyle = '#f7f1df';
  g.fillRect(0, 0, 560, 640);
  g.fillStyle = '#1e2226';
  g.textAlign = 'center';
  g.font = `800 76px ${T.font}`;
  g.fillText('HAUSORDNUNG', 280, 92);
  g.fillStyle = '#d8392b';
  g.fillRect(70, 118, 420, 8);
  const rules = ['1. Tauben wohnen oben.', '2. Die Küche gehört dem Dummy.', '3. Nicht im Kühlschrank sitzen.', '4. Ruhe ab 22 Uhr.', '5. Kein Gurren vor 7 Uhr.'];
  g.textAlign = 'left';
  g.fillStyle = '#2c3238';
  g.font = `600 40px ${T.font}`;
  rules.forEach((r, i) => g.fillText(r, 46, 200 + i * 90));
  return finish(c);
};

export const HouseRules = () => {
  const tex = useFontTexture(rulesTexture(), 'Hausordnung');
  const mat = useMemo(() => (tex ? new THREE.MeshStandardMaterial({map: tex, roughness: 0.9}) : null), [tex]);
  return (
    <group>
      <mesh position={[0, 0, -0.012]} castShadow>
        <boxGeometry args={[0.5, 0.56, 0.02]} />
        <meshStandardMaterial color="#8a5d3b" flatShading />
      </mesh>
      {mat && (
        <mesh material={mat} position={[0, 0, 0.0]}>
          <planeGeometry args={[0.44, 0.5]} />
        </mesh>
      )}
    </group>
  );
};

// ------------------------------------------------------------------------------------------------
// Fernseher
// ------------------------------------------------------------------------------------------------
const tvTexture = () => {
  const {c, g} = paperBase(400, 240);
  const sky = g.createLinearGradient(0, 0, 0, 240);
  sky.addColorStop(0, '#5aa7e8');
  sky.addColorStop(1, '#bfe3ff');
  g.fillStyle = sky;
  g.fillRect(0, 0, 400, 240);
  g.fillStyle = '#ffffff';
  for (const [x, y, r] of [
    [90, 70, 26],
    [120, 62, 32],
    [150, 74, 24],
    [280, 110, 22],
    [305, 100, 30],
    [332, 112, 20],
  ]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#6fae4f';
  g.fillRect(0, 196, 400, 44);
  return finish(c);
};

export const TvSet = () => {
  const m = useMemo(
    () => ({
      board: std('#7a5a3e'),
      dark: std('#1c1e22', {roughness: 0.4}),
      screen: new THREE.MeshStandardMaterial({map: tvTexture(), emissive: '#ffffff', emissiveMap: tvTexture(), emissiveIntensity: 0.55, roughness: 0.3}),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.board} position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.44, 0.42]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.47, -0.02]}>
        <boxGeometry args={[0.3, 0.05, 0.18]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.56, -0.02]}>
        <boxGeometry args={[0.06, 0.14, 0.04]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[1.04, 0.62, 0.06]} />
      </mesh>
      <mesh material={m.screen} position={[0, 0.78, 0.031]}>
        <planeGeometry args={[0.96, 0.54]} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------------------------------------
// Warteschleife (Musiknoten) + Lade-Symbol – schauen zur Kamera
// ------------------------------------------------------------------------------------------------
const noteTexture = () => {
  const {c, g} = paperBase(128, 160);
  g.fillStyle = '#ffc400';
  g.strokeStyle = '#1e2226';
  g.lineWidth = 8;
  g.save();
  g.translate(44, 124);
  g.rotate(-0.4);
  g.beginPath();
  g.ellipse(0, 0, 28, 20, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
  g.fillRect(64, 20, 12, 108);
  g.strokeRect(64, 20, 12, 108);
  g.beginPath();
  g.moveTo(76, 20);
  g.quadraticCurveTo(122, 40, 104, 84);
  g.quadraticCurveTo(108, 52, 76, 50);
  g.closePath();
  g.fill();
  g.stroke();
  return finish(c);
};

const waitTexture = () => () => {
  const {c, g} = paperBase(560, 140);
  g.fillStyle = 'rgba(30,34,38,0.92)';
  g.beginPath();
  g.roundRect(6, 6, 548, 128, 30);
  g.fill();
  g.strokeStyle = '#ffc400';
  g.lineWidth = 8;
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = `800 76px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Bitte warten …', 280, 74);
  const t = finish(c) as THREE.CanvasTexture & {aspect: number};
  t.aspect = 560 / 140;
  return t;
};

export const HoldNotes = ({time, visible, size = 0}: {time: number; visible: boolean; size?: number}) => {
  const note = useMemo(() => new THREE.SpriteMaterial({map: noteTexture(), transparent: true, depthTest: false}), []);
  const tex = useFontTexture(waitTexture(), 'Bitte warten');
  const label = useMemo(() => (tex ? new THREE.SpriteMaterial({map: tex, transparent: true, depthTest: false}) : null), [tex]);
  if (!visible) return null;
  const s = spring({frame: time * 30, fps: 30, config: {damping: 12, stiffness: 170}}) * (1 + size);
  return (
    <group scale={s}>
      {[0, 1, 2].map((i) => {
        const c = ((time + i * 0.7) % 2.1) / 2.1;
        const x = (i - 1) * 0.16 + 0.05 * Math.sin(time * 3 + i);
        const op = Math.sin(Math.PI * c);
        return <sprite key={i} material={note} position={[x, 0.2 + c * 0.35, 0]} scale={[0.1 * (0.8 + 0.4 * op), 0.125 * (0.8 + 0.4 * op), 1]} renderOrder={41} />;
      })}
      {label && <sprite material={label} position={[0, 0.06, 0]} scale={[0.48, 0.12, 1]} renderOrder={41} />}
    </group>
  );
};

const batteryTexture = (q: number) => () => {
  const {c, g} = paperBase(320, 180);
  g.fillStyle = 'rgba(20,24,28,0.85)';
  g.beginPath();
  g.roundRect(8, 8, 304, 164, 34);
  g.fill();
  // Batterie
  g.strokeStyle = '#ffffff';
  g.lineWidth = 12;
  g.beginPath();
  g.roundRect(42, 42, 210, 96, 16);
  g.stroke();
  g.fillStyle = '#ffffff';
  g.fillRect(256, 72, 20, 36);
  g.fillStyle = '#3ddc5a';
  const w = Math.max(0, 186 * q);
  if (w > 0) {
    g.beginPath();
    g.roundRect(54, 54, w, 72, 8);
    g.fill();
  }
  // Blitz
  g.fillStyle = '#ffc400';
  g.strokeStyle = '#1e2226';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(160, 30);
  g.lineTo(118, 98);
  g.lineTo(150, 98);
  g.lineTo(136, 152);
  g.lineTo(184, 78);
  g.lineTo(152, 78);
  g.closePath();
  g.fill();
  g.stroke();
  return finish(c);
};

export const ChargeBadge = ({time, visible, size = 0}: {time: number; visible: boolean; size?: number}) => {
  const q = Math.round(clamp(0.15 + ((time * 0.45) % 1)) * 10) / 10;
  const tex = useFontTexture(batteryTexture(q), `Batterie ${q}`);
  const mat = useMemo(() => (tex ? new THREE.SpriteMaterial({map: tex, transparent: true, depthTest: false}) : null), [tex]);
  if (!visible || !mat) return null;
  const s = spring({frame: time * 30, fps: 30, config: {damping: 12, stiffness: 170}}) * (1 + size);
  const pulse = 1 + 0.04 * Math.sin(time * 6);
  return <sprite material={mat} scale={[0.64 * s * pulse, 0.36 * s * pulse, 1]} renderOrder={42} />;
};

/** Nester (Holzkiste mit Stroh) für den Dachboden – Bauteil */
export const NestBox = ({seed = 1}: {seed?: number}) => {
  const straw = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: 14}, () => ({x: (r() - 0.5) * 0.36, z: (r() - 0.5) * 0.26, ry: r() * 3, rz: (r() - 0.5) * 0.6}));
  }, [seed]);
  const m = useMemo(() => ({wood: std('#a67c52'), straw: std('#e3c56a', {roughness: 1})}), []);
  return (
    <group>
      {[
        [0, 0.06, 0.16, 0.44, 0.12, 0.03],
        [0, 0.06, -0.16, 0.44, 0.12, 0.03],
        [0.21, 0.06, 0, 0.03, 0.12, 0.32],
        [-0.21, 0.06, 0, 0.03, 0.12, 0.32],
        [0, 0.01, 0, 0.44, 0.02, 0.34],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={i} material={m.wood} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      ))}
      {straw.map((s, i) => (
        <mesh key={i} material={m.straw} position={[s.x, 0.09, s.z]} rotation={[0, s.ry, s.rz]}>
          <boxGeometry args={[0.16, 0.012, 0.012]} />
        </mesh>
      ))}
    </group>
  );
};
