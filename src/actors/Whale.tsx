import {useMemo} from 'react';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut} from '../lib/anim';

/**
 * Wal (Figur "wal") – großer, freundlicher Blauwal im Low-Poly-Look der anderen Figuren.
 * Comichaft gedrungen: ca. 3,9 m lang, 1,6 m hoch, 1,7 m breit (bei size 0). Blickt im eigenen System nach +z
 * (face 90 = Kopf zeigt nach +x). Ursprung = Boden unter dem Bauch (Mitte des Körpers).
 * Große Kulleraugen mit Lidern, rosa Bäckchen, Lächeln, Furchen an der Kehle, Brustflossen, kleine Rückenfinne,
 * Schwanzflosse, Blasloch oben am Kopf.
 * Bewegungen:
 *  - float:  schwebt gemütlich (leichtes Auf und Ab, Flossen + Schwanz wedeln langsam, atmet, blinzelt)
 *  - spout:  wie float, schnauft gemütlich: kleine Wasserfontäne aus dem Blasloch (bei 0,3 s, dann alle 3,2 s)
 *  - appear: erscheint mit "Plopp" (wächst in ca. 0,9 s aus dem Nichts, federt nach), danach wie float
 *  - shrink: schrumpft langsam (ca. 2,2 s) und verschwindet mit kleinem Glitzern
 * Werte: size (0 = normal, 0.2 = 20 % größer …), squish 0 … 1 = drückt gegen Wände (wird gestaucht, wölbt sich, wackelt).
 */

const BLUE = '#4f86c6';
const BLUE_DARK = '#3b6aa6';
const BELLY = '#cfe0ee';
const GROOVE = '#9fb7cc';

export type WhalePose = {
  /** Gesamt-Faktor aus appear/shrink (1 = normal) */
  pop: number;
  bob: number;
  fin: number;
  tail: number;
  blink: number;
  /** Atmen: Körper wird etwas dicker */
  breathe: number;
  /** Fontäne: Alter in Sekunden (< 0 = keine) */
  spoutAge: number;
  /** Glitzern beim Verschwinden 0 … 1 (Alter) */
  sparkle: number;
};

const blinkAt = (t: number) => {
  const c = (t + 1.1) % 3.4;
  // gemütliches, langsames Blinzeln
  return c < 0.34 ? Math.sin((c / 0.34) * Math.PI) : 0;
};

export const whalePose = (motion: Motion, time: number): WhalePose => {
  const idle: WhalePose = {
    pop: 1,
    bob: Math.sin(time * 1.1) * 0.05,
    fin: Math.sin(time * 1.4) * 0.35,
    tail: Math.sin(time * 0.9) * 0.18,
    blink: blinkAt(time),
    breathe: 0.5 + 0.5 * Math.sin(time * 0.8),
    spoutAge: -1,
    sparkle: -1,
  };
  switch (motion) {
    case 'spout': {
      const c = time - 0.3;
      idle.spoutAge = c < 0 ? -1 : c % 3.2;
      return idle;
    }
    case 'appear': {
      const k = clamp(time / 0.9);
      // überschwingen + nachfedern
      idle.pop = k >= 1 ? 1 + Math.sin((time - 0.9) * 9) * 0.04 * Math.exp(-(time - 0.9) * 3) : easeInOut(k) * (1 + 0.12 * Math.sin(k * Math.PI));
      return idle;
    }
    case 'shrink': {
      const k = clamp(time / 2.2);
      idle.pop = Math.max(0, 1 - easeInOut(k));
      idle.blink = time < 2 ? 0.55 : 1; // zufrieden halb geschlossene Augen
      idle.sparkle = time > 1.6 ? time - 1.6 : -1;
      return idle;
    }
  }
  return idle;
};

/** Augen: Weiß, große Pupille, Glanzpunkt, Lid von oben */
const Eye = ({side, blink, m}: {side: 1 | -1; blink: number; m: ReturnType<typeof useMats>}) => {
  const open = Math.max(0.06, 1 - blink);
  return (
    <group position={[0.66 * side, 0.98, 1.2]} rotation={[0, side * 0.95, 0]}>
      <mesh material={m.white} scale={[1, 1, 0.45]}>
        <sphereGeometry args={[0.15, 14, 10]} />
      </mesh>
      <group scale={[1, open, 1]}>
        <mesh material={m.pupil} position={[0, -0.01, 0.055]} scale={[1, 1.1, 0.4]}>
          <sphereGeometry args={[0.095, 12, 8]} />
        </mesh>
        <mesh material={m.white} position={[-0.03, 0.035, 0.095]}>
          <sphereGeometry args={[0.028, 8, 6]} />
        </mesh>
      </group>
      {/* Lid (Körperfarbe) schiebt sich von oben herunter */}
      <mesh material={m.body} position={[0, 0.15 - 0.15 * blink, 0.01]} scale={[1.08, 0.55 + 0.5 * blink, 0.55]}>
        <sphereGeometry args={[0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
};

const useMats = () =>
  useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({color: BLUE, roughness: 0.5, flatShading: true}),
      dark: new THREE.MeshStandardMaterial({color: BLUE_DARK, roughness: 0.55, flatShading: true}),
      belly: new THREE.MeshStandardMaterial({color: BELLY, roughness: 0.6, flatShading: true}),
      groove: new THREE.MeshStandardMaterial({color: GROOVE, roughness: 0.7, flatShading: true}),
      white: new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.3}),
      pupil: new THREE.MeshStandardMaterial({color: '#1b2430', roughness: 0.2}),
      mouth: new THREE.MeshStandardMaterial({color: '#23354f', roughness: 0.6}),
      blush: new THREE.MeshBasicMaterial({color: '#f29bb0', transparent: true, opacity: 0.7, depthWrite: false}),
      spout: new THREE.MeshStandardMaterial({color: '#e9f7ff', emissive: '#bfe6ff', emissiveIntensity: 0.4, roughness: 0.2, transparent: true, depthWrite: false}),
      drop: new THREE.MeshStandardMaterial({color: '#d8f1ff', emissive: '#a9dcff', emissiveIntensity: 0.4, roughness: 0.2, transparent: true, depthWrite: false}),
      spark: new THREE.MeshBasicMaterial({color: '#fff6c8', transparent: true, depthWrite: false}),
    }),
    [],
  );

/** Wasserfontäne aus dem Blasloch: Säule schießt hoch (0–0,35 s), Tropfen fallen zur Seite, ca. 1,6 s */
const Spout = ({age, m}: {age: number; m: ReturnType<typeof useMats>}) => {
  if (age < 0 || age > 1.7) return null;
  const up = easeInOut(clamp(age / 0.35));
  const fade = 1 - clamp((age - 0.7) / 0.9);
  const h = 0.75 * up;
  m.spout.opacity = 0.75 * fade;
  m.drop.opacity = 0.9 * fade;
  const drops = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tt = clamp((age - 0.25 - (i % 3) * 0.06) / 1.1);
    if (tt <= 0) continue;
    const r = 0.1 + 0.42 * tt;
    const y = h + 0.1 + 0.35 * Math.sin(tt * Math.PI) - 0.55 * tt * tt;
    drops.push(
      <mesh key={i} material={m.drop} position={[Math.cos(a) * r, y, Math.sin(a) * r * 0.8]} scale={1 - 0.4 * tt}>
        <icosahedronGeometry args={[0.035, 0]} />
      </mesh>,
    );
  }
  return (
    <group>
      <mesh material={m.spout} position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.035, Math.max(0.01, h), 8, 1, true]} />
      </mesh>
      {/* Krone der Fontäne */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        return (
          <mesh key={i} material={m.spout} position={[Math.cos(a) * 0.09 * up, h + 0.04, Math.sin(a) * 0.09 * up]} scale={up * (0.8 + 0.2 * Math.sin(age * 8 + i))}>
            <icosahedronGeometry args={[0.07, 0]} />
          </mesh>
        );
      })}
      {drops}
    </group>
  );
};

/** Glitzern beim Verschwinden */
const Sparkles = ({age, m}: {age: number; m: ReturnType<typeof useMats>}) => {
  if (age < 0 || age > 1.2) return null;
  const k = age / 1.2;
  m.spark.opacity = 1 - k;
  return (
    <group>
      {Array.from({length: 10}).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const r = 0.2 + 0.9 * Math.pow(k, 0.6);
        return (
          <mesh key={i} material={m.spark} position={[Math.cos(a) * r, 0.9 + Math.sin(a) * r * 0.7, Math.sin(a * 1.7) * 0.3]} rotation={[0, 0, a + age * 4]} scale={0.6 + 0.4 * Math.sin(i + age * 10)}>
            <octahedronGeometry args={[0.07, 0]} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Whale = ({pose, size = 0, squish = 0, time = 0}: {pose: WhalePose; size?: number; squish?: number; time?: number}) => {
  const m = useMats();
  const s = (1 + size) * pose.pop;
  // gegen die Wände drücken: Länge gestaucht, Höhe/Breite gewölbt, leichtes Drängeln
  const wob = Math.sin(time * 5.5) * 0.02 * squish;
  const sq: [number, number, number] = [1 + 0.1 * squish + wob, 1 + 0.12 * squish - wob, 1 - 0.1 * squish];
  const br = 1 + 0.025 * pose.breathe;
  return (
    <>
      {pose.sparkle >= 0 && <Sparkles age={pose.sparkle} m={m} />}
      {s > 0.002 && (
        <group scale={s} position={[0, pose.bob * s, 0]}>
          <group scale={sq}>
            {/* Körper */}
            <group scale={[br, br, 1]}>
              <mesh material={m.body} position={[0, 0.82, 0.05]} scale={[0.86, 0.78, 1.75]} castShadow receiveShadow>
                <sphereGeometry args={[1, 12, 9]} />
              </mesh>
              {/* heller Bauch + Kehle */}
              <mesh material={m.belly} position={[0, 0.6, 0.35]} scale={[0.74, 0.55, 1.45]}>
                <sphereGeometry args={[1, 12, 8]} />
              </mesh>
              {/* Kehlfurchen */}
              {[-0.3, -0.15, 0, 0.15, 0.3].map((x) => (
                <mesh key={x} material={m.groove} position={[x, 0.09 + Math.abs(x) * 0.35, 0.75]} rotation={[Math.PI / 2 - 0.12, 0, x * 0.4]} scale={[1, 1, 1]}>
                  <boxGeometry args={[0.025, 1.0, 0.015]} />
                </mesh>
              ))}
            </group>
            {/* Schwanzstiel + Fluke */}
            <group position={[0, 0.85, -1.45]} rotation={[pose.tail, 0, 0]}>
              <mesh material={m.body} position={[0, 0, -0.45]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
                <coneGeometry args={[0.48, 1.1, 9]} />
              </mesh>
              <group position={[0, 0.02, -0.95]} rotation={[pose.tail * 1.4, 0, 0]}>
                {[-1, 1].map((k) => (
                  <mesh key={k} material={m.dark} position={[k * 0.38, 0, -0.12]} rotation={[0, k * 0.5, 0]} scale={[0.5, 0.06, 0.24]} castShadow>
                    <sphereGeometry args={[1, 8, 5]} />
                  </mesh>
                ))}
              </group>
            </group>
            {/* Rückenfinne */}
            <mesh material={m.dark} position={[0, 1.55, -0.9]} rotation={[-0.6, 0, 0]} scale={[0.06, 0.22, 0.2]}>
              <coneGeometry args={[1, 1, 4]} />
            </mesh>
            {/* Brustflossen */}
            {[-1, 1].map((k) => (
              <group key={k} position={[k * 0.74, 0.45, 0.65]} rotation={[0.2, 0, k * (0.6 + pose.fin * 0.5)]}>
                <mesh material={m.dark} position={[k * 0.32, 0, -0.08]} rotation={[0, k * 0.35, 0]} scale={[0.42, 0.05, 0.16]} castShadow>
                  <sphereGeometry args={[1, 8, 5]} />
                </mesh>
              </group>
            ))}
            {/* Augen, Bäckchen, Lächeln */}
            {[-1, 1].map((k) => (
              <group key={k}>
                <Eye side={k as 1 | -1} blink={pose.blink} m={m} />
                <mesh material={m.blush} position={[k * 0.74, 0.74, 1.38]} rotation={[0, k * 1.05, 0]} scale={[1, 0.6, 1]}>
                  <circleGeometry args={[0.12, 12]} />
                </mesh>
                <mesh material={m.mouth} position={[k * 0.5, 0.64, 1.42]} rotation={[0.15, k * 0.75, k * 0.18]}>
                  <torusGeometry args={[0.36, 0.022, 4, 14, Math.PI * 0.42]} />
                </mesh>
              </group>
            ))}
            {/* Blasloch + Fontäne */}
            <mesh material={m.mouth} position={[0, 1.58, 0.75]} rotation={[-0.25, 0, 0]} scale={[1, 0.3, 0.6]}>
              <sphereGeometry args={[0.06, 8, 5]} />
            </mesh>
            <group position={[0, 1.6, 0.75]}>
              <Spout age={pose.spoutAge} m={m} />
            </group>
          </group>
        </group>
      )}
    </>
  );
};
