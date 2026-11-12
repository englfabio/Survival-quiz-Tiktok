import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, rng} from '../lib/anim';

/**
 * Comichafte Schaumblasen am Mund (z. B. Spülmaschinentab). amount 0 = aus, 1 = ein paar kleine Blasen,
 * 2 = viele Blasen, die auch übers Kinn quellen. Weiß-hellblau mit Glanzpunkt – freundlich, nicht eklig.
 * Sitzt im Kopf-System des Dummys (Mund vorn bei y ≈ −0.045, z ≈ 0.1). time = Bewegungs-/Abschnittszeit
 * (friert beim Einfrieren mit ein).
 */
const N = 26;
const BUBBLES = (() => {
  const r = rng(4711);
  return Array.from({length: N}, (_, i) => {
    const big = i >= 9; // ab Blase 9 erst bei amount > 1
    const ang = (r() - 0.5) * (big ? 1.5 : 1.1);
    return {
      i,
      ang,
      y: -0.045 - r() * (big ? 0.07 : 0.03),
      out: 0.004 + r() * 0.02,
      size: 0.009 + r() * (big ? 0.016 : 0.01),
      period: 1.1 + r() * 1.3,
      phase: r(),
      drift: big ? 0.02 + r() * 0.025 : 0.008 + r() * 0.01,
      need: big ? 1 + (i - 9) / (N - 9) : (i + 1) / 9,
    };
  });
})();

export const Foam = ({amount = 0, time = 0}: {amount?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      bubble: new THREE.MeshStandardMaterial({color: '#f4fbff', roughness: 0.15, emissive: '#cfeeff', emissiveIntensity: 0.35, transparent: true, opacity: 0.93}),
      shine: new THREE.MeshBasicMaterial({color: '#ffffff'}),
      rimBlue: new THREE.MeshStandardMaterial({color: '#bfe6ff', roughness: 0.2, emissive: '#9fd8ff', emissiveIntensity: 0.25}),
    }),
    [],
  );
  if (amount < 0.02) return null;
  return (
    <group>
      {BUBBLES.map((b) => {
        const vis = clamp((amount - b.need + 0.12) / 0.25);
        if (vis <= 0) return null;
        // Lebenszyklus: wächst, wandert etwas nach außen/unten, platzt, neu
        const life = (time / b.period + b.phase) % 1;
        const grow = clamp(life / 0.25) * (1 - clamp((life - 0.85) / 0.15));
        const s = b.size * vis * (0.55 + 0.45 * grow) * (1 + 0.08 * Math.sin(time * 9 + b.i));
        const r = 0.105 + b.out + life * b.drift * 0.4;
        const x = Math.sin(b.ang) * r;
        const z = Math.cos(b.ang) * r - 0.008;
        const y = b.y - life * b.drift;
        return (
          <group key={b.i} position={[x, y, z]}>
            <mesh material={b.i % 5 === 0 ? m.rimBlue : m.bubble} scale={s}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
            <mesh material={m.shine} position={[s * 0.35, s * 0.4, s * 0.75]} scale={s * 0.22}>
              <icosahedronGeometry args={[1, 0]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
