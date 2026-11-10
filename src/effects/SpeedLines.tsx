import {rng} from '../lib/anim';

/**
 * Effekt "Bewegungslinien": helle Striche hinter einer rennenden Figur.
 * Wird im Koordinatensystem der Figur gezeichnet (hinter = −z).
 */
const LINES = (() => {
  const r = rng(3);
  return Array.from({length: 7}, () => ({
    x: (r() - 0.5) * 0.9,
    y: (r() - 0.3) * 0.9,
    len: 0.6 + r() * 0.9,
    speed: 2.5 + r() * 2,
    offset: r(),
  }));
})();

export const SpeedLines = ({time, height}: {time: number; height: number}) => (
  <group position={[0, height, -0.5]}>
    {LINES.map((l, i) => {
      const cycle = (time * l.speed + l.offset) % 1;
      const opacity = Math.sin(cycle * Math.PI) * 0.75;
      return (
        <mesh key={i} position={[l.x, l.y, -0.2 - cycle * 1.6]}>
          <boxGeometry args={[0.025, 0.025, l.len]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={opacity} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);
