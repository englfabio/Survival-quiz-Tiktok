import {useMemo} from 'react';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut, lerp} from '../lib/anim';

/**
 * Zitteraal (Figur "zitteraal") – stilisierter Low-Poly-Aal im Look der anderen Figuren, eher niedlich als gruselig:
 * dunkles Blaugrau, große Kulleraugen, kleine Brustflossen, leuchtend gelbe Streifen.
 * Ursprung = Loch der Steckdose (Wand bei z = 0), der Aal schaut nach +z aus der Wand heraus (face 180 an einer Rückwand).
 * Bewegungen:
 *  - peek:     aus der Steckdose herausgucken (in ca. 0,6 s), schaut sich neugierig um, blinzelt
 *  - wiggle:   zappeln (schnelles Hin-und-her, Mund offen) – passt zu "zap" (Blitze)
 *  - withdraw: beleidigt zurückziehen – Kopf weg, Augen halb zu, Schmollmund (0,4 s), dann in die Steckdose (bis 1,5 s)
 */

const BODY = '#3d5b78';
const BODY_DARK = '#2c445c';
const CHIN = '#e8a65a';
const STRIPE = '#ffe45c';

type P = [number, number, number];
export type EelPose = {
  /** wie weit der Aal aus der Wand schaut (m); ≤ 0 = ganz drin */
  out: number;
  /** Hals biegt sich nach oben (0 … 1) */
  lift: number;
  /** Zappeln: seitlicher Ausschlag (m) und Phase */
  amp: number;
  phase: number;
  /** zusätzliche Kopfdrehung (Bogenmaß) */
  yaw: number;
  tilt: number;
  /** Augenlider 0 = offen … 1 = halb zu (beleidigt) */
  lids: number;
  /** blinzeln 0 … 1 */
  blink: number;
  /** Mund: 1 = Lächeln, −1 = Schmollmund, 0 = offen ("O") */
  mouth: number;
  /** Flossen schlagen */
  fin: number;
};

const N = 22;
const LEN = 0.62;

const blinkAt = (t: number) => {
  const c = (t + 0.7) % 2.9;
  return c < 0.16 ? Math.sin((c / 0.16) * Math.PI) : 0;
};

export const eelPose = (motion: Motion, time: number): EelPose => {
  switch (motion) {
    case 'wiggle': {
      return {
        out: 0.23 + 0.015 * Math.sin(time * 11),
        lift: 0.55,
        amp: 0.035,
        phase: time * 16,
        yaw: Math.sin(time * 9) * 0.28,
        tilt: Math.sin(time * 7) * 0.15,
        lids: 0,
        blink: 0,
        mouth: 0,
        fin: time * 20,
      };
    }
    case 'withdraw': {
      // beleidigt: Kopf dreht weg, Augen halb zu, Schmollmund – dann zurück in die Steckdose
      const k = easeInOut(clamp(time / 0.4));
      const back = easeInOut(clamp((time - 0.5) / 1.0));
      return {
        out: lerp(0.22, -0.12, back),
        lift: 0.5 - 0.3 * back,
        amp: 0.006,
        phase: time * 3,
        yaw: 0.55 * k,
        tilt: 0.15 * k,
        lids: k,
        blink: 0,
        mouth: lerp(1, -1, k),
        fin: time * 4,
      };
    }
    case 'peek':
    default: {
      const k = easeInOut(clamp(time / 0.6));
      return {
        out: 0.22 * k,
        lift: 0.5 * k,
        amp: 0.012,
        phase: time * 4,
        yaw: Math.sin(time * 1.3) * 0.38 * k,
        tilt: Math.sin(time * 0.9 + 1) * 0.12,
        lids: 0,
        blink: blinkAt(time),
        mouth: 1,
        fin: time * 6,
      };
    }
  }
};

/** Wirbelsäule vom Kopf (0) bis zum Schwanz (in der Wand) */
const spineOf = (p: EelPose): P[] => {
  const pts: P[] = [];
  const out = p.out;
  for (let i = 0; i < N; i++) {
    const s = (i / (N - 1)) * LEN;
    const d = out - s; // Weg vor der Wand
    if (d <= 0) {
      pts.push([0, 0, d]);
      continue;
    }
    const u = d / Math.max(0.05, out);
    const x = p.amp * Math.sin(d * 28 - p.phase) * u;
    const y = p.lift * d * d * 3.2;
    const z = d * (1 - 0.35 * p.lift * u);
    pts.push([x, y, z]);
  }
  return pts;
};

const radiusAt = (u: number) => (u < 0.08 ? 0.03 : u < 0.8 ? 0.028 : lerp(0.028, 0.01, (u - 0.8) / 0.2));

const UP = new THREE.Vector3(0, 1, 0);

const useMats = () =>
  useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({color: BODY, roughness: 0.5, flatShading: true}),
      dark: new THREE.MeshStandardMaterial({color: BODY_DARK, roughness: 0.6, flatShading: true}),
      chin: new THREE.MeshStandardMaterial({color: CHIN, roughness: 0.6, flatShading: true}),
      white: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.3}),
      pupil: new THREE.MeshBasicMaterial({color: '#141414'}),
      shine: new THREE.MeshBasicMaterial({color: '#ffffff'}),
      blush: new THREE.MeshBasicMaterial({color: '#ff8fa0', transparent: true, opacity: 0.75}),
      mouth: new THREE.MeshBasicMaterial({color: '#1d1414'}),
      stripe: new THREE.MeshStandardMaterial({color: STRIPE, emissive: STRIPE, emissiveIntensity: 1.4, roughness: 0.4, toneMapped: false}),
    }),
    [],
  );

/** Punkte am Körper (für die Blitze), nur der sichtbare Teil vor der Wand */
export const eelAnchors = (pose: EelPose) =>
  spineOf(pose)
    .filter((q) => q[2] > 0.02)
    .filter((_, i) => i % 2 === 0)
    .map((q) => new THREE.Vector3(...q));

export const Eel = ({pose, glow = 1}: {pose: EelPose; glow?: number}) => {
  const m = useMats();
  m.stripe.emissiveIntensity = 0.9 + 1.4 * glow;
  if (pose.out <= -0.05) return null;
  const spine = spineOf(pose);
  const segs = [];
  for (let i = 0; i < spine.length - 1; i++) {
    const a = new THREE.Vector3(...spine[i]);
    const b = new THREE.Vector3(...spine[i + 1]);
    if (a.z < -0.04 && b.z < -0.04) continue; // ganz in der Wand
    const dir = b.clone().sub(a);
    const len = dir.length() || 0.001;
    dir.normalize();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const u = i / (spine.length - 1);
    const r = radiusAt(u);
    segs.push(
      <group key={i}>
        <mesh material={m.body} position={mid} quaternion={q} castShadow>
          <cylinderGeometry args={[r, radiusAt((i + 1) / (spine.length - 1)), len * 1.1, 7]} />
        </mesh>
        <mesh material={m.body} position={a}>
          <icosahedronGeometry args={[r * 1.02, 0]} />
        </mesh>
        {/* leuchtende Streifen (Ringe) */}
        {i > 0 && i % 2 === 0 && (
          <mesh material={m.stripe} position={mid} quaternion={q}>
            <cylinderGeometry args={[r * 1.07, r * 1.07, len * 0.32, 7]} />
          </mesh>
        )}
        {/* Rückenkante (dunkel) */}
        {i > 1 && (
          <mesh material={m.dark} position={mid.clone().addScaledVector(UP, r * 0.85)} quaternion={q}>
            <boxGeometry args={[r * 0.35, len * 1.05, r * 0.35]} />
          </mesh>
        )}
      </group>,
    );
  }
  // Kopf
  const h0 = new THREE.Vector3(...spine[0]);
  const h1 = new THREE.Vector3(...spine[1]);
  const fwd = h0.clone().sub(h1).normalize();
  const yawH = Math.atan2(fwd.x, fwd.z) + pose.yaw;
  const pitchH = -Math.asin(clamp(fwd.y, -1, 1)) * 0.6;
  const headPos = h0.clone().addScaledVector(fwd, 0.02);
  const eyeOpen = Math.max(0, 1 - pose.blink);
  return (
    <group>
      {segs}
      <group position={headPos} rotation={[pitchH, yawH, pose.tilt, 'YXZ']}>
        {/* Kopf (rundlich) + heller Kinnbereich */}
        <mesh material={m.body} position={[0, 0.004, 0.02]} scale={[1.0, 0.82, 1.2]} castShadow>
          <icosahedronGeometry args={[0.05, 1]} />
        </mesh>
        <mesh material={m.chin} position={[0, -0.02, 0.028]} scale={[0.8, 0.42, 0.85]}>
          <icosahedronGeometry args={[0.038, 1]} />
        </mesh>
        {/* leuchtender Streifen über die Stirn */}
        <mesh material={m.stripe} position={[0, 0.043, 0.0]} scale={[1, 0.35, 1]}>
          <boxGeometry args={[0.07, 0.02, 0.022]} />
        </mesh>
        {/* Kulleraugen */}
        {[1, -1].map((s) => (
          <group key={s} position={[0.027 * s, 0.022, 0.05]}>
            <mesh material={m.white} scale={[1, eyeOpen * 0.95 + 0.05, 1]}>
              <icosahedronGeometry args={[0.021, 1]} />
            </mesh>
            {eyeOpen > 0.3 && (
              <>
                <mesh material={m.pupil} position={[-0.003 * s, -0.002, 0.014]}>
                  <icosahedronGeometry args={[0.0115, 1]} />
                </mesh>
                <mesh material={m.shine} position={[0.002 * s, 0.005, 0.024]}>
                  <icosahedronGeometry args={[0.0038, 0]} />
                </mesh>
              </>
            )}
            {/* Augenlid: halb zu = beleidigt (innen tiefer) */}
            {pose.lids > 0.02 && (
              <mesh
                material={m.body}
                position={[0, lerp(0.04, 0.012, pose.lids), 0.004]}
                rotation={[0, 0, s * -0.35 * pose.lids]}
                scale={[1.15, 0.7, 1.15]}
              >
                <icosahedronGeometry args={[0.022, 1]} />
              </mesh>
            )}
            {/* Bäckchen */}
            <mesh material={m.blush} position={[0.012 * s, -0.024, 0.006]} rotation={[0, s * 0.5, 0]}>
              <circleGeometry args={[0.009, 8]} />
            </mesh>
          </group>
        ))}
        {/* Mund */}
        {Math.abs(pose.mouth) > 0.3 ? (
          <mesh
            material={m.mouth}
            position={[0, pose.mouth > 0 ? -0.006 : -0.018, 0.077]}
            rotation={[0, 0, pose.mouth > 0 ? Math.PI : 0]}
          >
            <torusGeometry args={[0.012, 0.0028, 4, 10, Math.PI]} />
          </mesh>
        ) : (
          <mesh material={m.mouth} position={[0, -0.012, 0.074]} scale={[1, 1.25, 0.5]}>
            <icosahedronGeometry args={[0.009, 1]} />
          </mesh>
        )}
        {/* kleine Brustflossen */}
        {[1, -1].map((s) => (
          <mesh
            key={`f${s}`}
            material={m.dark}
            position={[0.045 * s, -0.01, -0.01]}
            rotation={[0, s * 0.4, s * (0.5 + 0.3 * Math.sin(pose.fin + s))]}
            scale={[1, 0.25, 0.7]}
          >
            <icosahedronGeometry args={[0.026, 0]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
