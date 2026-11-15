import {useMemo} from 'react';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut} from '../lib/anim';

/**
 * Dinosaurier (Spezial "T-Rex-Stau") – eigenständig gestaltet im stilisierten Low-Poly-Look wie alle Figuren,
 * comichaft und freundlich (Kulleraugen, stumpfe Comic-Zähne), KEIN Film-Design. Blicken im eigenen System nach +z.
 *
 * TRex ("trex"): riesig (Hüfte 3,55 m, Kopf ca. 6,5–7,5 m hoch, ca. 11 m lang), türkisgrün mit dunklen Streifen + hellem Bauch.
 *  Bewegungen: stand, bored (gelangweilt, Lider halb zu, blinzelt), yawn (gähnt: Kopf hoch + Maul weit auf 0,5–2,0 s, Ärmchen strecken),
 *  gaze (staunt mit offenem Maul nach oben), chase (rennt, Weg über Zeitpunkte), walk.
 *  Werte: turn (Kopf drehen, Grad, + = nach links), pitch (Kopf heben, Grad), jaw (Maul zusätzlich auf 0 … 1).
 * Raptor ("raptor1" blau, "raptor2" lila, "raptor3" orange): ca. 0,9 m Hüfthöhe, 2,3 m lang, bunt gefiedert mit Federkamm.
 *  Bewegungen: stand, hide (geduckt im Gebüsch), leap (Sprung, Weg + Höhe über Zeitpunkte), dance (tänzeln, hüpft von Fuß zu Fuß,
 *  wackelt mit Kopf/Schwanz, wedelt mit den Federarmen), sprint (rennt, Weg über Zeitpunkte).
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.7, flatShading: true, ...extra});

// ---------------------------------------------------------------------------------------------
// Beine (gemeinsam): Oberschenkel nach vorn, Knie, Unterschenkel nach hinten, Mittelfuß, Fuß mit 3 Zehen
// ---------------------------------------------------------------------------------------------
type Leg = {hip: number; knee: number; ankle: number};
const legCycle = (phase: number, amp: number, lift: number): Leg => {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  return {hip: -s * amp, knee: Math.max(0, c) * lift + 0.05, ankle: -Math.max(0, c) * lift * 0.7};
};

const DinoLeg = ({L, k, m}: {L: Leg; k: number; m: Record<string, THREE.Material>}) => (
  <group rotation={[L.hip, 0, 0]}>
    <mesh material={m.body} position={[0, -0.45 * k, 0.12 * k]} scale={[0.55 * k, 0.95 * k, 0.75 * k]} castShadow>
      <icosahedronGeometry args={[1, 1]} />
    </mesh>
    <group position={[0, -1.35 * k, 0.32 * k]} rotation={[L.knee, 0, 0]}>
      <mesh material={m.body} position={[0, -0.55 * k, -0.18 * k]} rotation={[0.32, 0, 0]} castShadow>
        <cylinderGeometry args={[0.24 * k, 0.17 * k, 1.25 * k, 7]} />
      </mesh>
      <group position={[0, -1.1 * k, -0.4 * k]} rotation={[L.ankle, 0, 0]}>
        <mesh material={m.body} position={[0, -0.32 * k, 0.04 * k]} rotation={[-0.25, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15 * k, 0.12 * k, 0.72 * k, 6]} />
        </mesh>
        {/* Fuß + Zehen */}
        <group position={[0, -0.66 * k, 0.12 * k]}>
          <mesh material={m.body} position={[0, 0.06 * k, 0.12 * k]} scale={[0.3 * k, 0.12 * k, 0.32 * k]} castShadow>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
          {[-0.17, 0, 0.17].map((x) => (
            <group key={x} position={[x * k, 0.04 * k, 0.4 * k]} rotation={[0, x * 0.9, 0]}>
              <mesh material={m.body} position={[0, 0, 0.12 * k]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.07 * k, 0.09 * k, 0.32 * k, 5]} />
              </mesh>
              <mesh material={m.claw} position={[0, -0.01 * k, 0.33 * k]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.06 * k, 0.16 * k, 5]} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  </group>
);

/** Kulleraugen mit Lid (lid 0 = offen … 1 = zu), Pupille schaut leicht nach vorn */
const Eye = ({r, lid, m, side}: {r: number; lid: number; m: Record<string, THREE.Material>; side: number}) => (
  <group>
    <mesh material={m.eye}>
      <sphereGeometry args={[r, 14, 10]} />
    </mesh>
    <mesh material={m.pupil} position={[side * r * 0.25, r * 0.05, r * 0.72]}>
      <sphereGeometry args={[r * 0.45, 12, 8]} />
    </mesh>
    <mesh material={m.shine} position={[side * r * 0.15 + r * 0.12, r * 0.3, r * 0.95]}>
      <sphereGeometry args={[r * 0.13, 8, 6]} />
    </mesh>
    {/* oberes Lid: Halbkugel in Körperfarbe, klappt von oben herunter */}
    <group rotation={[-Math.PI / 2 + (Math.PI / 2) * clamp(1 - lid) * 0.98 - 0.05, 0, 0]}>
      <mesh material={m.lid} scale={1.08}>
        <sphereGeometry args={[r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  </group>
);

// ---------------------------------------------------------------------------------------------
// T-Rex
// ---------------------------------------------------------------------------------------------
export type TRexPose = {
  bob: number;
  lean: number; // Körper nach vorn (rad)
  sway: number; // Körper seitlich drehen (rad)
  neck: number; // Hals heben (rad, + = hoch)
  headYaw: number;
  headPitch: number;
  jaw: number; // rad
  lid: number;
  armL: number; // Ärmchen heben (rad)
  armR: number;
  armSpread: number;
  legL: Leg;
  legR: Leg;
  tailYaw: number;
  tailLift: number;
  breathe: number;
};
const TREX_BASE = (): TRexPose => ({
  bob: 0, lean: 0.08, sway: 0, neck: 0.15, headYaw: 0, headPitch: 0, jaw: 0.06, lid: 0.1, armL: 0.2, armR: 0.2, armSpread: 0,
  legL: {hip: 0, knee: 0.05, ankle: 0}, legR: {hip: 0, knee: 0.05, ankle: 0}, tailYaw: 0, tailLift: 0, breathe: 0,
});
const blinkAt = (t: number, every = 3.4) => {
  const u = (t % every) / every;
  return u > 0.93 ? Math.sin(((u - 0.93) / 0.07) * Math.PI) : 0;
};

export const trexPose = (motion: Motion, time: number, speed = 0, turn = 0, pitch = 0, jawExtra = 0): TRexPose => {
  const p = TREX_BASE();
  p.breathe = Math.sin(time * 1.6) * 0.5 + 0.5;
  p.tailYaw = Math.sin(time * 0.9) * 0.12;
  p.headYaw = (turn * Math.PI) / 180;
  p.headPitch = (pitch * Math.PI) / 180;
  switch (motion) {
    case 'bored': {
      p.neck = 0.02 + Math.sin(time * 0.7) * 0.03;
      p.headPitch += -0.12;
      p.lid = Math.max(0.55, blinkAt(time + 1.1, 3.1));
      p.jaw = 0.04;
      p.armL = 0.05 + Math.sin(time * 0.8) * 0.05;
      p.armR = 0.05 + Math.sin(time * 0.8 + 1) * 0.05;
      p.tailYaw = Math.sin(time * 0.6) * 0.18;
      p.sway = Math.sin(time * 0.45) * 0.03;
      break;
    }
    case 'yawn': {
      const up = easeInOut(clamp(time / 0.6)) * (1 - easeInOut(clamp((time - 2.0) / 0.7)));
      const open = easeInOut(clamp((time - 0.35) / 0.55)) * (1 - easeInOut(clamp((time - 1.95) / 0.5)));
      p.neck = 0.15 + 0.42 * up;
      p.headPitch += 0.4 * up;
      p.jaw = 0.06 + 0.95 * open + Math.sin(time * 9) * 0.03 * open;
      p.lid = Math.max(0.55 * (1 - up), up * 0.95);
      p.armL = 0.2 + 1.1 * up;
      p.armR = 0.2 + 1.1 * up;
      p.armSpread = 0.5 * up;
      p.lean = 0.08 - 0.12 * up;
      p.tailLift = 0.15 * up;
      if (time > 2.7) {
        // danach wieder gelangweilt
        const b = trexPose('bored', time, speed, turn, pitch, jawExtra);
        const k = easeInOut(clamp((time - 2.7) / 0.5));
        return {...b, lid: b.lid * k + p.lid * (1 - k)};
      }
      break;
    }
    case 'gaze': {
      p.neck = 0.4;
      p.headPitch += 0.15;
      p.jaw = 0.55 + Math.sin(time * 2) * 0.03;
      p.lid = blinkAt(time, 4) * 0.8;
      p.armL = 0.6;
      p.armR = 0.6;
      p.armSpread = 0.3;
      p.lean = 0.0;
      break;
    }
    case 'chase':
    case 'walk': {
      const run = motion === 'chase';
      const stride = run ? 5.5 : 3.2;
      const ph = (time * Math.max(speed, run ? 6 : 2)) / stride * Math.PI * 2;
      p.legL = legCycle(ph, run ? 0.75 : 0.42, run ? 1.1 : 0.6);
      p.legR = legCycle(ph + Math.PI, run ? 0.75 : 0.42, run ? 1.1 : 0.6);
      p.bob = Math.abs(Math.sin(ph)) * (run ? 0.35 : 0.12);
      p.lean = run ? 0.3 : 0.12;
      p.neck = run ? -0.05 : 0.12;
      p.headPitch += run ? 0.05 : 0;
      p.jaw = run ? 0.35 + Math.sin(ph * 2) * 0.08 : 0.08;
      p.lid = 0;
      p.tailYaw = Math.sin(ph) * 0.15;
      p.tailLift = run ? 0.18 : 0.05;
      p.armL = run ? 0.7 + Math.sin(ph * 2) * 0.5 : 0.25;
      p.armR = run ? 0.7 + Math.sin(ph * 2 + 1.5) * 0.5 : 0.25;
      p.sway = Math.sin(ph) * 0.05;
      break;
    }
    default: {
      p.lid = blinkAt(time, 3.4);
    }
  }
  p.jaw += jawExtra;
  return p;
};

const TREX_C = {body: '#4d9a6c', stripe: '#2f6b4c', belly: '#efe0a6', mouth: '#7a2232', tongue: '#e27685', tooth: '#fffbea', claw: '#efe5cc'};

export const TRex = ({pose}: {pose: TRexPose}) => {
  const m = useMemo(
    () => ({
      body: std(TREX_C.body),
      lid: std(TREX_C.body),
      stripe: std(TREX_C.stripe),
      belly: std(TREX_C.belly),
      mouth: std(TREX_C.mouth, {roughness: 0.9}),
      tongue: std(TREX_C.tongue),
      tooth: std(TREX_C.tooth, {roughness: 0.4}),
      claw: std(TREX_C.claw),
      eye: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.3}),
      pupil: new THREE.MeshStandardMaterial({color: '#18181a', roughness: 0.2}),
      shine: new THREE.MeshBasicMaterial({color: '#ffffff'}),
      nostril: std('#24382c'),
    }),
    [],
  );
  const p = pose;
  const k = 1.12;
  const HIP = 3.55;
  const br = 1 + p.breathe * 0.025;
  return (
    <group position={[0, p.bob, 0]} rotation={[0, p.sway, 0]}>
      {/* Beine */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.95, HIP, 0.15]}>
          <DinoLeg L={s < 0 ? p.legL : p.legR} k={k} m={m} />
        </group>
      ))}
      <group position={[0, HIP, 0]} rotation={[p.lean, 0, 0]}>
        {/* Rumpf */}
        <mesh material={m.body} position={[0, 0.45, 0.75]} scale={[1.45 * br, 1.55 * br, 2.55]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 2]} />
        </mesh>
        <mesh material={m.belly} position={[0, 0.05, 1.15]} scale={[1.16 * br, 1.2 * br, 2.1]}>
          <icosahedronGeometry args={[1, 2]} />
        </mesh>
        {/* Rückenstreifen */}
        {[-0.4, 0.4, 1.2, 2.0].map((z, i) => (
          <mesh key={z} material={m.stripe} position={[0, 1.93 - Math.abs(z - 0.8) * 0.12, z]} rotation={[0, 0, 0]} scale={[1.0 - i * 0.05, 0.12, 0.28]}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
        ))}
        {/* Ärmchen (winzig) */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 1.05, 0.15, 2.55]} rotation={[-(s < 0 ? p.armL : p.armR), 0, s * (0.25 + p.armSpread)]}>
            <mesh material={m.body} position={[0, -0.28, 0.1]} rotation={[0.5, 0, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.11, 0.6, 6]} />
            </mesh>
            <group position={[0, -0.5, 0.3]} rotation={[-0.9, 0, 0]}>
              <mesh material={m.body} position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.1, 0.08, 0.45, 6]} />
              </mesh>
              {[-0.05, 0.05].map((x) => (
                <mesh key={x} material={m.claw} position={[x, -0.47, 0.03]} rotation={[0.3, 0, 0]}>
                  <coneGeometry args={[0.04, 0.14, 5]} />
                </mesh>
              ))}
            </group>
          </group>
        ))}
        {/* Schwanz: 4 Glieder */}
        <group position={[0, 0.55, -1.4]} rotation={[0.12 - p.tailLift, p.tailYaw, 0]}>
          <mesh material={m.body} position={[0, 0, -0.9]} scale={[1.0, 1.05, 1.5]} castShadow>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          <group position={[0, -0.05, -2.0]} rotation={[0.05, p.tailYaw * 0.8, 0]}>
            <mesh material={m.body} position={[0, 0, -0.8]} scale={[0.72, 0.75, 1.35]} castShadow>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh material={m.stripe} position={[0, 0.66, -0.6]} scale={[0.6, 0.1, 0.25]}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
            <group position={[0, -0.03, -1.9]} rotation={[0.04, p.tailYaw * 0.9, 0]}>
              <mesh material={m.body} position={[0, 0, -0.75]} scale={[0.45, 0.48, 1.2]} castShadow>
                <icosahedronGeometry args={[1, 1]} />
              </mesh>
              <group position={[0, 0, -1.65]} rotation={[0.03, p.tailYaw, 0]}>
                <mesh material={m.body} position={[0, 0, -0.55]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
                  <coneGeometry args={[0.3, 1.4, 7]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
        {/* Hals + Kopf */}
        <group position={[0, 1.15, 2.75]} rotation={[-p.neck, 0, 0]}>
          <mesh material={m.body} position={[0, 0.45, 0.45]} rotation={[0.5, 0, 0]} scale={[0.82, 1.15, 0.9]} castShadow>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          <mesh material={m.belly} position={[0, 0.2, 0.9]} rotation={[0.5, 0, 0]} scale={[0.62, 0.9, 0.55]}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          <group position={[0, 1.35, 1.05]} rotation={[-p.headPitch, p.headYaw, 0]}>
            {/* Schädel */}
            <mesh material={m.body} position={[0, 0.2, 0.35]} scale={[0.98, 0.88, 1.15]} castShadow>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            {/* Oberkiefer / Schnauze (rundlich) */}
            <mesh material={m.body} position={[0, 0.02, 1.45]} scale={[0.82, 0.52, 1.05]} castShadow>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh material={m.mouth} position={[0, -0.2, 1.35]} scale={[0.7, 0.12, 0.95]}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            {/* Zähne oben (stumpf, comichaft) */}
            {Array.from({length: 7}, (_, i) => {
              const a = (i / 6 - 0.5) * 2.2;
              return (
                <mesh key={i} material={m.tooth} position={[Math.sin(a) * 0.62, -0.38, 1.45 + Math.cos(a) * 0.82 - 0.28]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.07, 0.17, 5]} />
                </mesh>
              );
            })}
            {/* Nasenlöcher */}
            {[-1, 1].map((s) => (
              <mesh key={s} material={m.nostril} position={[s * 0.22, 0.42, 2.32]}>
                <sphereGeometry args={[0.07, 8, 6]} />
              </mesh>
            ))}
            {/* Augen + Brauenwulst */}
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.6, 0.55, 0.85]} rotation={[0, s * 0.55, 0]}>
                <Eye r={0.27} lid={p.lid} m={m} side={s} />
                <mesh material={m.stripe} position={[0, 0.27, 0.02]} rotation={[0, 0, -s * 0.15]} scale={[0.36, 0.09, 0.24]}>
                  <icosahedronGeometry args={[1, 0]} />
                </mesh>
              </group>
            ))}
            {/* Unterkiefer */}
            <group position={[0, -0.22, 0.5]} rotation={[p.jaw, 0, 0]}>
              <mesh material={m.belly} position={[0, -0.17, 0.85]} scale={[0.74, 0.3, 1.0]} castShadow>
                <icosahedronGeometry args={[1, 1]} />
              </mesh>
              <mesh material={m.mouth} position={[0, -0.02, 0.85]} scale={[0.62, 0.1, 0.88]}>
                <icosahedronGeometry args={[1, 1]} />
              </mesh>
              <mesh material={m.tongue} position={[0, 0.05, 0.75]} scale={[0.36, 0.08, 0.6]}>
                <icosahedronGeometry args={[1, 1]} />
              </mesh>
              {Array.from({length: 6}, (_, i) => {
                const a = (i / 5 - 0.5) * 2.0;
                return (
                  <mesh key={i} material={m.tooth} position={[Math.sin(a) * 0.55, 0.12, 0.85 + Math.cos(a) * 0.78 - 0.2]}>
                    <coneGeometry args={[0.06, 0.14, 5]} />
                  </mesh>
                );
              })}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Velociraptoren (gefiedert, bunt, frech)
// ---------------------------------------------------------------------------------------------
export const RAPTOR_COLORS: Record<string, {body: string; dark: string; crest: string; belly: string}> = {
  raptor1: {body: '#3d86d8', dark: '#28599a', crest: '#ff9a2e', belly: '#d9ecff'},
  raptor2: {body: '#9a63d6', dark: '#6a3f9e', crest: '#ffd23a', belly: '#f0e3ff'},
  raptor3: {body: '#f08a34', dark: '#b85f1c', crest: '#2fc4b2', belly: '#ffeccf'},
};

export type RaptorPose = {
  y: number;
  crouch: number;
  lean: number;
  roll: number;
  yaw: number;
  neck: number;
  headYaw: number;
  headPitch: number;
  jaw: number;
  arms: number; // Federarme heben/wedeln
  legL: Leg;
  legR: Leg;
  tailYaw: number;
  tailLift: number;
  tuck: number; // Beine im Sprung anziehen
};
const RAPTOR_BASE = (): RaptorPose => ({
  y: 0, crouch: 0, lean: 0.25, roll: 0, yaw: 0, neck: 0.3, headYaw: 0, headPitch: 0, jaw: 0.1, arms: 0.2,
  legL: {hip: 0, knee: 0.05, ankle: 0}, legR: {hip: 0, knee: 0.05, ankle: 0}, tailYaw: 0, tailLift: 0, tuck: 0,
});

export const raptorPose = (motion: Motion, time: number, speed = 0, seed = 0, turn = 0, pitch = 0): RaptorPose => {
  const p = RAPTOR_BASE();
  p.tailYaw = Math.sin(time * 2.2 + seed) * 0.15;
  p.headYaw = (turn * Math.PI) / 180;
  p.headPitch = (pitch * Math.PI) / 180;
  switch (motion) {
    case 'hide': {
      p.crouch = 0.42;
      p.lean = 0.5;
      p.neck = 0.05;
      p.headYaw += Math.sin(time * 1.3 + seed) * 0.35;
      p.arms = 0.0;
      p.tailLift = -0.1;
      break;
    }
    case 'leap': {
      p.lean = 0.35;
      p.tuck = 1;
      p.arms = 1.2;
      p.neck = 0.45;
      p.jaw = 0.5;
      p.tailLift = 0.25;
      break;
    }
    case 'dance': {
      const ph = time * Math.PI * 2 * 1.6 + seed;
      const hop = Math.max(0, Math.sin(ph));
      p.y = hop * 0.22;
      p.roll = Math.sin(ph) * 0.18;
      p.yaw = Math.sin(ph * 0.5) * 0.35;
      p.legL = {hip: Math.sin(ph) * 0.35, knee: 0.2 + Math.max(0, Math.sin(ph)) * 0.8, ankle: -0.3};
      p.legR = {hip: -Math.sin(ph) * 0.35, knee: 0.2 + Math.max(0, -Math.sin(ph)) * 0.8, ankle: -0.3};
      p.arms = 0.7 + Math.sin(ph * 2) * 0.6;
      p.headYaw += Math.sin(ph) * 0.4;
      p.neck = 0.45 + Math.sin(ph * 2) * 0.12;
      p.jaw = 0.35 + Math.sin(ph * 2) * 0.25;
      p.tailYaw = Math.sin(ph + 1) * 0.5;
      p.tailLift = 0.15;
      p.lean = 0.12;
      break;
    }
    case 'sprint':
    case 'run':
    case 'walk': {
      const fast = motion !== 'walk';
      const ph = ((time * Math.max(speed, fast ? 6 : 1.5)) / (fast ? 2.4 : 1.2)) * Math.PI * 2 + seed;
      p.legL = legCycle(ph, fast ? 0.8 : 0.45, fast ? 1.2 : 0.6);
      p.legR = legCycle(ph + Math.PI, fast ? 0.8 : 0.45, fast ? 1.2 : 0.6);
      p.y = Math.abs(Math.sin(ph)) * (fast ? 0.12 : 0.04);
      p.lean = fast ? 0.55 : 0.3;
      p.neck = fast ? 0.1 : 0.3;
      p.jaw = fast ? 0.3 : 0.1;
      p.arms = fast ? 0.5 + Math.sin(ph * 2) * 0.4 : 0.2;
      p.tailLift = fast ? 0.35 : 0.1;
      p.tailYaw = Math.sin(ph) * 0.12;
      break;
    }
    default:
      p.headYaw += Math.sin(time * 0.9 + seed) * 0.25;
  }
  return p;
};

export const Raptor = ({pose, name}: {pose: RaptorPose; name: string}) => {
  const c = RAPTOR_COLORS[name] ?? RAPTOR_COLORS.raptor1;
  const m = useMemo(
    () => ({
      body: std(c.body),
      lid: std(c.body),
      dark: std(c.dark),
      crest: std(c.crest),
      belly: std(c.belly),
      claw: std('#f1e8d0'),
      mouth: std('#7a2232'),
      eye: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.3}),
      pupil: new THREE.MeshStandardMaterial({color: '#18181a', roughness: 0.2}),
      shine: new THREE.MeshBasicMaterial({color: '#ffffff'}),
    }),
    [c],
  );
  const p = pose;
  const k = 0.29;
  const HIP = 0.92 * (1 - p.crouch * 0.55);
  const tuckL: Leg = p.tuck ? {hip: -0.9, knee: 1.7, ankle: -1.0} : p.legL;
  const tuckR: Leg = p.tuck ? {hip: -0.7, knee: 1.6, ankle: -0.9} : p.legR;
  return (
    <group position={[0, p.y, 0]} rotation={[0, p.yaw, p.roll]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.2, HIP, 0.0]}>
          <group scale={[1, 1 - p.crouch * 0.5, 1]}>
            <DinoLeg L={s < 0 ? tuckL : tuckR} k={k} m={m} />
          </group>
        </group>
      ))}
      <group position={[0, HIP, 0]} rotation={[p.lean, 0, 0]}>
        <mesh material={m.body} position={[0, 0.14, 0.18]} scale={[0.3, 0.32, 0.62]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        <mesh material={m.belly} position={[0, 0.04, 0.3]} scale={[0.24, 0.24, 0.48]}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        {/* Federarme */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.26, 0.12, 0.5]} rotation={[-p.arms, 0, s * (0.4 + p.arms * 0.5)]}>
            <mesh material={m.dark} position={[0, -0.16, 0.02]} scale={[0.05, 0.22, 0.14]} castShadow>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
            <mesh material={m.crest} position={[s * 0.02, -0.3, -0.06]} rotation={[0.4, 0, 0]} scale={[0.03, 0.14, 0.12]}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
          </group>
        ))}
        {/* Schwanz (steif, mit Federquaste) */}
        <group position={[0, 0.16, -0.38]} rotation={[0.1 - p.tailLift, p.tailYaw, 0]}>
          <mesh material={m.body} position={[0, 0, -0.45]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.17, 1.0, 7]} />
          </mesh>
          <group position={[0, 0, -0.95]} rotation={[0, p.tailYaw, 0]}>
            <mesh material={m.dark} position={[0, 0, -0.25]} scale={[0.14, 0.05, 0.35]}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
            <mesh material={m.crest} position={[0, 0.02, -0.5]} scale={[0.16, 0.04, 0.2]}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
          </group>
        </group>
        {/* Hals + Kopf */}
        <group position={[0, 0.3, 0.68]} rotation={[-p.neck, 0, 0]}>
          <mesh material={m.body} position={[0, 0.18, 0.05]} rotation={[-0.2, 0, 0]} scale={[0.12, 0.24, 0.12]} castShadow>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          <group position={[0, 0.42, 0.08]} rotation={[-p.headPitch + p.neck * 0.8, p.headYaw, 0]}>
            <mesh material={m.body} position={[0, 0.02, 0.06]} scale={[0.15, 0.14, 0.18]} castShadow>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh material={m.body} position={[0, -0.02, 0.27]} scale={[0.09, 0.07, 0.17]}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <group position={[0, -0.06, 0.16]} rotation={[p.jaw * 0.5, 0, 0]}>
              <mesh material={m.belly} position={[0, -0.02, 0.1]} scale={[0.075, 0.035, 0.15]}>
                <icosahedronGeometry args={[1, 1]} />
              </mesh>
            </group>
            {/* Federkamm */}
            {[0, 1, 2].map((i) => (
              <mesh key={i} material={m.crest} position={[0, 0.15 + i * 0.03, -0.02 - i * 0.07]} rotation={[-0.6 - i * 0.25, 0, 0]} scale={[0.03, 0.13 - i * 0.02, 0.05]}>
                <icosahedronGeometry args={[1, 0]} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.11, 0.07, 0.11]} rotation={[0, s * 0.6, 0]}>
                <Eye r={0.055} lid={0} m={m} side={s} />
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
};
