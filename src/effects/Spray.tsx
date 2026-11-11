import {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../lib/anim';

/**
 * Spritzwasser (läuft dauerhaft, z. B. beim hektischen Kraulen): viele Tropfen fliegen in Bögen hoch
 * und landen wieder, dazu weiße Schaumflecken auf dem Wasser.
 * amount 0 … 1 = Stärke. Mittelpunkt = Ursprung der Gruppe (auf der Wasseroberfläche).
 * spread = halbe Größe des Bereichs [x, z] in Metern.
 */
export const Spray = ({time, amount, spread = [0.6, 0.9]}: {time: number; amount: number; spread?: [number, number]}) => {
  const drops = useMemo(() => {
    const r = rng(41);
    return Array.from({length: 70}, () => {
      const vy = 1.6 + r() * 2.6;
      return {
        x: (r() - 0.5) * 2,
        z: (r() - 0.5) * 2,
        vx: (r() - 0.5) * 1.4,
        vz: (r() - 0.5) * 1.4,
        vy,
        period: (2 * vy) / 9.81,
        ph: r() * 3,
        wait: 0.1 + r() * 0.5,
        s: 0.025 + r() * 0.05,
        th: r(),
      };
    });
  }, []);
  const foam = useMemo(() => {
    const r = rng(43);
    return Array.from({length: 9}, () => ({x: (r() - 0.5) * 2, z: (r() - 0.5) * 2, s: 0.18 + r() * 0.3, ph: r() * 6}));
  }, []);
  const mats = useMemo(
    () => ({
      drop: new THREE.MeshStandardMaterial({color: '#eef8ff', emissive: '#9cc6dc', emissiveIntensity: 0.35, roughness: 0.2, flatShading: true}),
      foam: new THREE.MeshBasicMaterial({color: '#e6f3fa', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide}),
    }),
    [],
  );
  if (amount <= 0.01) return null;
  return (
    <group>
      {drops.map((d, i) => {
        if (d.th > amount) return null;
        const cyc = d.period + d.wait;
        const u = (time + d.ph) % cyc;
        if (u > d.period) return null;
        const y = d.vy * u - 0.5 * 9.81 * u * u;
        return (
          <mesh
            key={i}
            material={mats.drop}
            position={[d.x * spread[0] + d.vx * u, y, d.z * spread[1] + d.vz * u]}
            scale={d.s}
          >
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        );
      })}
      {foam.map((f, i) => {
        const k = 0.6 + 0.4 * Math.sin(time * 7 + f.ph);
        return (
          <mesh
            key={`f${i}`}
            material={mats.foam}
            position={[f.x * spread[0], 0.03, f.z * spread[1]]}
            rotation={[-Math.PI / 2, 0, f.ph]}
            scale={f.s * k * (0.5 + 0.5 * amount)}
          >
            <circleGeometry args={[1, 7]} />
          </mesh>
        );
      })}
    </group>
  );
};
