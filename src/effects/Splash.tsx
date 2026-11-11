import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, rng} from '../lib/anim';

/**
 * Effekt "Platschen": Wasser spritzt auf (Tropfen fliegen hoch und fallen zurück,
 * dazu ein Ring, der sich auf der Wasseroberfläche ausbreitet). Dauer ca. 1,6 s.
 * Figur "splash" mit Bewegung "splash" in der Szenario-Datei; time = Sekunden seit Beginn.
 */
export const Splash = ({time, size = 1}: {time: number; size?: number}) => {
  const drops = useMemo(() => {
    const r = rng(17);
    return Array.from({length: 46}, () => {
      const a = r() * Math.PI * 2;
      const sp = 1.2 + r() * 2.4;
      return {dx: Math.cos(a) * sp * (0.4 + r() * 0.6), dz: Math.sin(a) * sp * (0.25 + r() * 0.5), vy: 2.6 + r() * 3.2, s: 0.05 + r() * 0.08};
    });
  }, []);
  const mats = useMemo(
    () => ({
      drop: new THREE.MeshStandardMaterial({color: '#eafcff', emissive: '#a8e6ef', emissiveIntensity: 0.35, roughness: 0.2, flatShading: true}),
      ring: new THREE.MeshBasicMaterial({color: '#e8fbff', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false}),
    }),
    [],
  );
  if (time < 0 || time > 2.2) return null;
  const g = 9.81;
  const ringK = clamp(time / 1.6);
  mats.ring.opacity = 0.75 * (1 - ringK);
  return (
    <group scale={size}>
      {drops.map((d, i) => {
        const tt = time * 0.85;
        const y = d.vy * tt - 0.5 * g * tt * tt;
        if (y < -0.05) return null;
        return (
          <mesh key={i} material={mats.drop} position={[d.dx * tt, y, d.dz * tt]} scale={d.s * (1 - clamp(time / 2.2) * 0.5)}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        );
      })}
      <mesh material={mats.ring} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.8 + ringK * 3.2, 0.5 + ringK * 2.2, 1]}>
        <ringGeometry args={[0.85, 1, 24]} />
      </mesh>
    </group>
  );
};
