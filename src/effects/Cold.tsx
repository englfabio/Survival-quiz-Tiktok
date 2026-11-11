import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp} from '../lib/anim';

/**
 * Kälte-Symbol: weiße Schneeflocke auf blauem Kreis (wie ein Schild), schwebt über der Figur.
 * amount: 0 = aus, 1 = normal, bis 2 = stark (größer, pulsiert schneller, Eis-Ring breitet sich aus).
 * Schaut immer zur Kamera (Drehung kommt von außen).
 */
export const ColdBadge = ({amount, time}: {amount: number; time: number}) => {
  const m = useMemo(
    () => ({
      disc: new THREE.MeshBasicMaterial({color: '#1f6fc4', depthTest: false, transparent: true}),
      rim: new THREE.MeshBasicMaterial({color: '#ffffff', depthTest: false, transparent: true}),
      flake: new THREE.MeshBasicMaterial({color: '#ffffff', depthTest: false, transparent: true}),
      ring: new THREE.MeshBasicMaterial({color: '#9fdcff', depthTest: false, transparent: true, side: THREE.DoubleSide}),
    }),
    [],
  );
  if (amount <= 0.01) return null;
  const vis = clamp(amount * 3);
  const strong = clamp(amount - 1);
  const pulse = 1 + (0.06 + 0.1 * strong) * Math.sin(time * (5 + 6 * strong));
  const size = (0.17 + 0.09 * Math.min(amount, 2)) * vis * pulse;
  m.disc.opacity = m.rim.opacity = m.flake.opacity = vis;
  const ringK = (time * (0.8 + strong)) % 1;
  m.ring.opacity = 0.7 * strong * (1 - ringK);
  return (
    <group scale={size} renderOrder={30}>
      <mesh material={m.rim} renderOrder={30}>
        <circleGeometry args={[1.12, 28]} />
      </mesh>
      <mesh material={m.disc} renderOrder={31} position={[0, 0, 0.001]}>
        <circleGeometry args={[1, 28]} />
      </mesh>
      <group rotation={[0, 0, time * 0.4]} position={[0, 0, 0.002]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
            <mesh material={m.flake} position={[0, 0.38, 0]} renderOrder={32}>
              <planeGeometry args={[0.12, 0.76]} />
            </mesh>
            {[1, -1].map((s) => (
              <mesh key={s} material={m.flake} position={[s * 0.1, 0.52, 0]} rotation={[0, 0, s * -0.8]} renderOrder={32}>
                <planeGeometry args={[0.09, 0.3]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {strong > 0.01 && (
        <mesh material={m.ring} position={[0, 0, -0.001]} scale={1.2 + 1.2 * ringK} renderOrder={29}>
          <ringGeometry args={[0.9, 1, 32]} />
        </mesh>
      )}
    </group>
  );
};
