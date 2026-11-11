import type {ThreeElements} from '@react-three/fiber';
import {useMemo} from 'react';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut} from '../lib/anim';

/**
 * Crashtest-Dummy aus einfachen Körperformen. Kein Gesicht.
 * Gelb mit schwarz-gelben Kreismarkierungen. Blickt im eigenen Koordinatensystem nach +z.
 * Größe ca. 1,80 m.
 */

const YELLOW = '#f3bf12';
const JOINT = '#2a2a2c';
const BLACK = '#151515';

// ---------- Pose ----------
type Limb = {sx: number; sz: number; bend: number};
export type DummyPose = {
  hipY: number;
  pitch: number; // ganzer Körper nach vorn kippen
  torsoX: number;
  torsoY: number;
  torsoZ: number;
  headX: number;
  headY: number;
  armL: Limb; // linker Arm liegt auf +x
  armR: Limb;
  legL: Limb;
  legR: Limb;
  foreZ: number; // Unterarm rechts seitlich (Winken)
  /** Band am rechten Oberschenkel: 0 = keins, 1 = fertig gewickelt */
  band: number;
  /** Handy in der rechten Hand */
  phone: boolean;
};

const base = (): DummyPose => ({
  hipY: 0.98,
  pitch: 0,
  torsoX: 0,
  torsoY: 0,
  torsoZ: 0,
  headX: 0,
  headY: 0,
  armL: {sx: 0, sz: 0.1, bend: -0.15},
  armR: {sx: 0, sz: -0.1, bend: -0.15},
  legL: {sx: 0, sz: 0.03, bend: 0},
  legR: {sx: 0, sz: -0.03, bend: 0},
  foreZ: 0,
  band: 0,
  phone: false,
});

/** Zwei Haltungen mischen (k = 0 → a, 1 → b) */
const mix = (a: DummyPose, b: DummyPose, k: number): DummyPose => {
  const L = (x: number, y: number) => x + (y - x) * k;
  const limb = (x: Limb, y: Limb): Limb => ({sx: L(x.sx, y.sx), sz: L(x.sz, y.sz), bend: L(x.bend, y.bend)});
  return {
    hipY: L(a.hipY, b.hipY),
    pitch: L(a.pitch, b.pitch),
    torsoX: L(a.torsoX, b.torsoX),
    torsoY: L(a.torsoY, b.torsoY),
    torsoZ: L(a.torsoZ, b.torsoZ),
    headX: L(a.headX, b.headX),
    headY: L(a.headY, b.headY),
    armL: limb(a.armL, b.armL),
    armR: limb(a.armR, b.armR),
    legL: limb(a.legL, b.legL),
    legR: limb(a.legR, b.legR),
    foreZ: L(a.foreZ, b.foreZ),
    band: L(a.band, b.band),
    phone: k < 0.5 ? a.phone : b.phone,
  };
};

/** Sitzen auf dem Boden: Beine nach vorn gestreckt, Hände hinten aufgestützt */
const seated = (time = 0): DummyPose => {
  const p = base();
  const breathe = Math.sin(time * 2.2) * 0.012;
  p.hipY = 0.14;
  p.legL = {sx: -1.5, sz: 0.1, bend: 0.05};
  p.legR = {sx: -1.52, sz: -0.12, bend: 0.0};
  p.torsoX = -0.12 + breathe;
  p.armL = {sx: 0.55, sz: 0.25, bend: -0.1};
  p.armR = {sx: 0.55, sz: -0.25, bend: -0.1};
  return p;
};

/** In die Hocke (Zwischenschritt beim Hinsetzen) */
const squat = (): DummyPose => {
  const p = base();
  p.hipY = 0.5;
  p.legL = {sx: -1.35, sz: 0.12, bend: 2.2};
  p.legR = {sx: -1.35, sz: -0.12, bend: 2.2};
  p.torsoX = 0.45;
  p.headX = -0.2;
  p.armL = {sx: -0.7, sz: 0.2, bend: -0.6};
  p.armR = {sx: -0.7, sz: -0.2, bend: -0.6};
  return p;
};

/** Ruhig sitzen: gebissenes rechtes Bein gestreckt und still, linkes Knie angewinkelt */
const restSit = (time: number): DummyPose => {
  const p = seated(time);
  p.legL = {sx: -2.35, sz: 0.18, bend: 2.45};
  p.torsoX = -0.04 + Math.sin(time * 2.2) * 0.012;
  // linker Unterarm liegt locker auf dem Knie
  p.armL = {sx: -0.95, sz: 0.12, bend: -0.55};
  return p;
};

const TAU = Math.PI * 2;
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;

/** Berechnet die Körperhaltung für eine Bewegung. time = Sekunden seit Bewegungsbeginn. */
export const dummyPose = (motion: Motion, time: number, speed: number): DummyPose => {
  const p = base();
  const breathe = Math.sin(time * 2.2) * 0.012;
  switch (motion) {
    case 'stand':
    case 'alert':
    case 'sniff': {
      p.torsoX = 0.02 + breathe;
      p.headX = breathe * 2;
      break;
    }
    case 'walk': {
      const ph = time * TAU * Math.max(0.8, speed * 0.62);
      const s = Math.sin(ph);
      p.legL.sx = -0.42 * s;
      p.legR.sx = 0.42 * s;
      p.legL.bend = 0.5 * Math.max(0, Math.sin(ph + 1.2));
      p.legR.bend = 0.5 * Math.max(0, Math.sin(ph + 1.2 + Math.PI));
      p.armL.sx = 0.35 * s;
      p.armR.sx = -0.35 * s;
      p.armL.bend = p.armR.bend = -0.3;
      p.hipY = 0.98 - 0.03 * Math.abs(Math.cos(ph));
      p.torsoX = 0.05;
      p.torsoY = 0.06 * s;
      break;
    }
    case 'run': {
      const ph = time * TAU * Math.max(1.2, Math.min(1.7, speed * 0.42));
      const s = Math.sin(ph);
      p.legL.sx = -0.95 * s;
      p.legR.sx = 0.95 * s;
      p.legL.bend = 0.3 + 1.2 * Math.max(0, Math.sin(ph + 1.0));
      p.legR.bend = 0.3 + 1.2 * Math.max(0, Math.sin(ph + 1.0 + Math.PI));
      p.armL.sx = 0.85 * s;
      p.armR.sx = -0.85 * s;
      p.armL.bend = p.armR.bend = -1.45;
      p.armL.sz = 0.15;
      p.armR.sz = -0.15;
      p.hipY = 0.93 + 0.07 * Math.abs(Math.sin(ph));
      p.torsoX = 0.3;
      p.torsoY = 0.12 * s;
      p.headX = -0.15;
      break;
    }
    case 'climb': {
      const ph = time * TAU * 0.7;
      const s = Math.sin(ph);
      p.armL.sx = -2.7 + 0.45 * s;
      p.armR.sx = -2.7 - 0.45 * s;
      p.armL.sz = 0.25;
      p.armR.sz = -0.25;
      p.armL.bend = -0.5 - 0.4 * Math.max(0, s);
      p.armR.bend = -0.5 - 0.4 * Math.max(0, -s);
      p.legL.sx = -0.75 - 0.45 * s;
      p.legR.sx = -0.75 + 0.45 * s;
      p.legL.bend = 1.1 + 0.4 * s;
      p.legR.bend = 1.1 - 0.4 * s;
      p.legL.sz = 0.25;
      p.legR.sz = -0.25;
      p.torsoX = 0.12;
      p.headX = -0.45;
      break;
    }
    case 'backstep':
    case 'sidestep': {
      const ph = time * TAU * 0.55;
      const s = Math.sin(ph);
      const side = motion === 'sidestep';
      p.legL.sx = side ? 0.08 * s : 0.25 * s;
      p.legR.sx = side ? -0.08 * s : -0.25 * s;
      p.legL.sz = side ? 0.03 + 0.2 * Math.max(0, s) : 0.03;
      p.legR.sz = side ? -0.03 - 0.2 * Math.max(0, -s) : -0.03;
      p.legL.bend = 0.25 * Math.max(0, s);
      p.legR.bend = 0.25 * Math.max(0, -s);
      p.hipY = 0.97 - 0.02 * Math.abs(s);
      // Hände beschwichtigend vor dem Körper
      p.armL.sx = p.armR.sx = -0.75;
      p.armL.sz = 0.25;
      p.armR.sz = -0.25;
      p.armL.bend = p.armR.bend = -0.85;
      p.torsoX = -0.03;
      break;
    }
    case 'calm': {
      const k = easeInOut(clamp(time / 0.6));
      p.armL.sx = p.armR.sx = -0.8 * k;
      p.armL.sz = 0.1 + 0.18 * k;
      p.armR.sz = -0.1 - 0.18 * k;
      p.armL.bend = p.armR.bend = -0.15 - 0.75 * k;
      p.armL.sx += Math.sin(time * 3) * 0.05 * k;
      p.armR.sx -= Math.sin(time * 3) * 0.05 * k;
      p.torsoX = -0.03 + breathe;
      p.headX = Math.sin(time * 2.4) * 0.05;
      break;
    }
    case 'stumble': {
      const k = easeInOut(clamp(time / 0.7));
      const ph = time * TAU * 1.6;
      p.pitch = 0.55 * k;
      p.hipY = 0.95 - 0.35 * k;
      p.torsoX = 0.25 + 0.2 * k;
      p.legL.sx = -0.9 * k;
      p.legL.bend = 1.5 * k;
      p.legR.sx = 0.7 * k;
      p.legR.bend = 0.6 * k;
      p.armL.sx = -1.4 * k + Math.sin(ph) * 0.4 * (1 - k * 0.6);
      p.armR.sx = -1.2 * k - Math.sin(ph) * 0.4 * (1 - k * 0.6);
      p.armL.sz = 0.5 * k;
      p.armR.sz = -0.5 * k;
      p.armL.bend = p.armR.bend = -0.3;
      p.headX = -0.4 * k;
      break;
    }
    case 'flinch': {
      // gebissen: kurz hochzucken, rechtes Bein hochreißen, dann Blick zur Wade
      const jolt = time < 0.12 ? easeInOut(time / 0.12) : 1 - easeInOut(clamp((time - 0.12) / 0.45));
      const look = easeInOut(clamp((time - 0.35) / 0.6));
      const shake = Math.sin(time * 38) * 0.04 * Math.max(0, 1 - time / 0.6);
      p.hipY = 0.98 + 0.05 * jolt;
      p.torsoX = -0.18 * jolt + 0.42 * look + shake;
      p.torsoY = -0.45 * look;
      p.headX = -0.3 * jolt + 0.55 * look;
      p.headY = -0.35 * look;
      p.legR = {sx: -0.75 * jolt + 0.35 * look, sz: -0.05 - 0.1 * look, bend: 1.4 * jolt + 0.9 * look};
      p.legL = {sx: 0.1 * jolt - 0.12 * look, sz: 0.06, bend: 0.15 * jolt + 0.2 * look};
      p.armL = {sx: -0.6 * jolt - 0.3 * look, sz: 0.1 + 0.8 * jolt + 0.15 * look, bend: -0.6 * jolt - 0.4 * look};
      p.armR = {sx: -0.6 * jolt + 0.35 * look, sz: -0.1 - 0.8 * jolt - 0.15 * look, bend: -0.6 * jolt - 0.3 * look};
      break;
    }
    case 'hurt':
      // steht, schaut besorgt zur Wade (Haltung nach dem Zusammenzucken, ohne Zucken)
      return dummyPose('flinch', 3 + time, speed);
    case 'sitdown': {
      // stehen → Hocke → sitzen (ca. 1,2 s), danach ruhig sitzen
      if (time < 0.55) return mix(p, squat(), easeInOut(time / 0.55));
      if (time < 1.2) return mix(squat(), restSit(time), easeInOut((time - 0.55) / 0.65));
      return restSit(time);
    }
    case 'sit':
      return restSit(time);
    case 'phone': {
      // ruhig sitzen, Handy mit rechts am Ohr
      const q = restSit(time);
      const k = easeInOut(clamp(time / 0.6));
      const target: Limb = {sx: -2.0, sz: 0.3, bend: -2.3};
      q.armR = {
        sx: lerpN(q.armR.sx, target.sx, k),
        sz: lerpN(q.armR.sz, target.sz, k),
        bend: lerpN(q.armR.bend, target.bend, k),
      };
      q.headY = 0.12 * k;
      q.headX = 0.08 * k + Math.sin(time * 1.7) * 0.02;
      q.torsoZ = -0.04 * k;
      q.phone = k > 0.15;
      return q;
    }
    case 'suck': {
      // sitzt, zieht das rechte Bein heran und beugt sich zur Wade
      const q = seated(time);
      const k = easeInOut(clamp(time / 0.8));
      const bob = Math.sin(time * 5) * 0.06 * clamp((time - 0.8) / 0.3);
      const target = seated(time);
      target.legR = {sx: -2.25, sz: -0.4, bend: 2.3};
      target.torsoX = 1.0 + bob;
      target.torsoY = -0.3;
      target.torsoZ = -0.15;
      target.headX = 0.75 + bob * 0.8;
      target.headY = -0.25;
      target.armR = {sx: -0.9, sz: -0.25, bend: -0.9};
      target.armL = {sx: -1.15, sz: -0.45, bend: -0.7};
      return mix(q, target, k);
    }
    case 'tourniquet': {
      // sitzt, wickelt ein Band um den rechten Oberschenkel und zieht es fest
      const q = seated(time);
      const k = easeInOut(clamp(time / 0.6));
      const wrap = clamp((time - 0.6) / 2.2); // Wickeln
      const pull = easeInOut(clamp((time - 2.9) / 0.4)); // Festziehen
      const ph = time * TAU * 1.3;
      const circ = wrap > 0 && wrap < 1 ? 1 : 0;
      const target = seated(time);
      target.torsoX = 0.62;
      target.torsoY = -0.22;
      target.headX = 0.45;
      target.headY = -0.15;
      target.armR = {sx: -1.0 + 0.25 * Math.sin(ph) * circ, sz: -0.05 - 0.15 * pull, bend: -0.6 - 0.35 * Math.cos(ph) * circ};
      target.armL = {
        sx: -1.0 - 0.25 * Math.sin(ph) * circ,
        sz: -0.28 + 0.4 * pull,
        bend: -0.6 + 0.35 * Math.cos(ph) * circ - 0.3 * pull,
      };
      target.band = wrap;
      const out = mix(q, target, k);
      out.band = wrap;
      return out;
    }
    case 'wave': {
      const k = easeInOut(clamp(time / 0.5));
      p.armR.sz = -0.1 - 2.5 * k;
      p.armR.bend = -0.2;
      p.foreZ = (-0.4 + Math.sin(time * 9) * 0.45) * k;
      p.torsoZ = 0.04 * k;
      p.torsoX = breathe;
      break;
    }
  }
  return p;
};

// ---------- Bauteile ----------
const useMats = () =>
  useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({color: YELLOW, roughness: 0.45, metalness: 0.05, flatShading: true}),
      joint: new THREE.MeshStandardMaterial({color: JOINT, roughness: 0.6, flatShading: true}),
      black: new THREE.MeshBasicMaterial({color: BLACK, side: THREE.DoubleSide}),
      yellow: new THREE.MeshBasicMaterial({color: '#ffd21a', side: THREE.DoubleSide}),
      bite: new THREE.MeshBasicMaterial({color: '#5a1a14', side: THREE.DoubleSide}),
      band: new THREE.MeshStandardMaterial({color: '#e9eef2', roughness: 0.8, flatShading: true}),
    }),
    [],
  );

type Mats = ReturnType<typeof useMats>;

/** Typische Crashtest-Markierung: Kreis in vier Viertel, schwarz/gelb im Wechsel */
const Marker = ({m, r, ...props}: {m: Mats; r: number} & ThreeElements['group']) => (
  <group {...props}>
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} material={i % 2 === 0 ? m.black : m.yellow}>
        <circleGeometry args={[r, 6, (i * Math.PI) / 2, Math.PI / 2]} />
      </mesh>
    ))}
    <mesh material={m.black} position={[0, 0, -0.001]}>
      <ringGeometry args={[r, r * 1.12, 20]} />
    </mesh>
  </group>
);

const Seg = ({
  m,
  len,
  r,
  r2,
}: {
  m: Mats;
  len: number;
  r: number;
  r2?: number;
}) => (
  <mesh material={m.body} position={[0, -len / 2, 0]} castShadow>
    <cylinderGeometry args={[r, r2 ?? r * 0.85, len, 8]} />
  </mesh>
);

const Joint = ({m, r}: {m: Mats; r: number}) => (
  <mesh material={m.joint} castShadow>
    <icosahedronGeometry args={[r, 1]} />
  </mesh>
);

const Arm = ({m, limb, side, foreZ = 0, phone = false}: {m: Mats; limb: Limb; side: 1 | -1; foreZ?: number; phone?: boolean}) => (
  <group position={[0.27 * side, 0.44, 0]} rotation={[limb.sx, 0, limb.sz]}>
    <Joint m={m} r={0.09} />
    <Seg m={m} len={0.3} r={0.08} />
    <group position={[0, -0.31, 0]} rotation={[limb.bend, 0, foreZ]}>
      <Joint m={m} r={0.07} />
      <Seg m={m} len={0.27} r={0.07} r2={0.058} />
      <mesh material={m.body} position={[0, -0.32, 0.0]} scale={[0.8, 1.1, 0.6]} castShadow>
        <icosahedronGeometry args={[0.08, 0]} />
      </mesh>
      {phone && (
        <group position={[0.045 * side, -0.33, 0.03]} rotation={[0.2, 0, 0]}>
          <mesh material={m.joint} castShadow>
            <boxGeometry args={[0.025, 0.16, 0.08]} />
          </mesh>
          <mesh position={[0.0135 * side, 0, 0]}>
            <boxGeometry args={[0.002, 0.13, 0.065]} />
            <meshBasicMaterial color="#7fd0ff" />
          </mesh>
        </group>
      )}
    </group>
  </group>
);

/** Zwei kleine Bisspunkte an der Wade (außen hinten) – kein Blut, keine Wunde */
const BiteMarks = ({m, side}: {m: Mats; side: 1 | -1}) => {
  const ang = Math.atan2(0.75 * side, -0.66); // Richtung außen-hinten
  const r = 0.082;
  return (
    <group position={[Math.sin(ang) * r, -0.15, Math.cos(ang) * r]} rotation={[0, ang, 0]}>
      {[-1, 1].map((k) => (
        <mesh key={k} material={m.bite} position={[k * 0.022, 0, 0]}>
          <circleGeometry args={[0.011, 8]} />
        </mesh>
      ))}
    </group>
  );
};

/** Band um den Oberschenkel (wächst beim Wickeln von 0 auf 1) */
const Band = ({m, amount}: {m: Mats; amount: number}) => {
  const turns = [0, 1, 2].filter((i) => amount > i / 3);
  return (
    <group position={[0, -0.13, 0]}>
      {turns.map((i) => {
        const part = clamp(amount * 3 - i);
        return (
          <mesh key={i} material={m.band} position={[0, -i * 0.035, 0]} rotation={[Math.PI / 2, 0, i * 1.3]}>
            <torusGeometry args={[0.112 - i * 0.002, 0.018, 5, 14, Math.PI * 2 * Math.max(0.05, part)]} />
          </mesh>
        );
      })}
      {amount >= 1 && (
        <mesh material={m.band} position={[0.06, -0.06, 0.1]} rotation={[0.3, 0, 0.5]}>
          <boxGeometry args={[0.04, 0.13, 0.012]} />
        </mesh>
      )}
    </group>
  );
};

const Leg = ({m, limb, side, bite = false, band = 0}: {m: Mats; limb: Limb; side: 1 | -1; bite?: boolean; band?: number}) => (
  <group position={[0.105 * side, -0.06, 0]} rotation={[limb.sx, 0, limb.sz]}>
    <Joint m={m} r={0.1} />
    <Seg m={m} len={0.43} r={0.11} r2={0.088} />
    <Marker m={m} r={0.055} position={[0.108 * side, -0.2, 0]} rotation={[0, (Math.PI / 2) * side, 0]} />
    {band > 0 && <Band m={m} amount={band} />}
    <group position={[0, -0.44, 0]} rotation={[limb.bend, 0, 0]}>
      <Joint m={m} r={0.08} />
      <Seg m={m} len={0.42} r={0.085} r2={0.065} />
      {bite && <BiteMarks m={m} side={side} />}
      <mesh material={m.joint} position={[0, -0.46, 0.06]} castShadow>
        <boxGeometry args={[0.13, 0.08, 0.27]} />
      </mesh>
    </group>
  </group>
);

export const Dummy = ({pose, bite = false}: {pose: DummyPose; bite?: boolean}) => {
  const m = useMats();
  return (
    <group rotation={[pose.pitch, 0, 0]}>
      <group position={[0, pose.hipY, 0]}>
        {/* Becken */}
        <mesh material={m.body} scale={[1.25, 0.75, 0.85]} castShadow>
          <icosahedronGeometry args={[0.15, 1]} />
        </mesh>
        <Marker m={m} r={0.05} position={[0.19, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <Marker m={m} r={0.05} position={[-0.19, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <Leg m={m} limb={pose.legL} side={1} />
        <Leg m={m} limb={pose.legR} side={-1} bite={bite} band={pose.band} />
        {/* Oberkörper */}
        <group position={[0, 0.06, 0]} rotation={[pose.torsoX, pose.torsoY, pose.torsoZ]}>
          <mesh material={m.joint} position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.16, 8]} />
          </mesh>
          <mesh material={m.body} position={[0, 0.33, 0]} scale={[1.3, 1.25, 0.8]} castShadow>
            <icosahedronGeometry args={[0.18, 1]} />
          </mesh>
          <Marker m={m} r={0.06} position={[0, 0.36, 0.147]} />
          <Arm m={m} limb={pose.armL} side={1} />
          <Arm m={m} limb={pose.armR} side={-1} foreZ={pose.foreZ} phone={pose.phone} />
          {/* Hals + Kopf (ohne Gesicht) */}
          <mesh material={m.joint} position={[0, 0.58, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.055, 0.1, 6]} />
          </mesh>
          <group position={[0, 0.74, 0]} rotation={[pose.headX, pose.headY, 0]}>
            <mesh material={m.body} scale={[0.9, 1.1, 0.95]} castShadow>
              <icosahedronGeometry args={[0.13, 1]} />
            </mesh>
            <Marker m={m} r={0.05} position={[0.118, 0.01, 0]} rotation={[0, Math.PI / 2, 0]} />
            <Marker m={m} r={0.05} position={[-0.118, 0.01, 0]} rotation={[0, -Math.PI / 2, 0]} />
          </group>
        </group>
      </group>
    </group>
  );
};
