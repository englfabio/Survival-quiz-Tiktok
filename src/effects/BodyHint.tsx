import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut} from '../lib/anim';
import {WarnBadge} from '../actors/TabProps';

/**
 * Comichafte "Röntgen"-Hinweise am Oberkörper des Dummys (immer sichtbar, liegen über dem Körper):
 *  - lunge 0 … 1: rosa Lunge erscheint (0 … 0,3), roter Pfeil wächst vom Mund hinunter in die Lunge (0,3 … 1),
 *    gelbes Warndreieck daneben.
 *  - blut 0 … 1: Magen erscheint (0 … 0,3), roter Pfeil wächst vom Magen zu einem Blutstropfen (0,3 … 1),
 *    kleine grüne Giftpunkte wandern den Pfeil entlang, Warndreieck daneben.
 * Sitzt im Oberkörper-System (Ursprung 6 cm über der Hüfte, Kopf-Mitte bei y 0,74).
 */
type V3 = [number, number, number];

const Arrow = ({from, to, amount, color = '#e5322d', r = 0.014}: {from: V3; to: V3; amount: number; color?: string; r?: number}) => {
  const m = useMemo(
    () => ({
      fill: new THREE.MeshBasicMaterial({color, depthTest: false, transparent: true}),
      edge: new THREE.MeshBasicMaterial({color: '#ffffff', depthTest: false, transparent: true}),
    }),
    [color],
  );
  const k = clamp(amount);
  if (k < 0.02) return null;
  const a = new THREE.Vector3(...from);
  const b = a.clone().lerp(new THREE.Vector3(...to), k);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const head = Math.min(0.06, len * 0.6);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const shaft = Math.max(0.001, len - head);
  return (
    <group position={a} quaternion={q}>
      <mesh material={m.edge} position={[0, shaft / 2, 0]} renderOrder={31}>
        <cylinderGeometry args={[r * 1.6, r * 1.6, shaft + 0.01, 8]} />
      </mesh>
      <mesh material={m.edge} position={[0, shaft + head / 2 - 0.004, 0]} renderOrder={31}>
        <coneGeometry args={[r * 3.6, head + 0.02, 8]} />
      </mesh>
      <mesh material={m.fill} position={[0, shaft / 2, 0]} renderOrder={33}>
        <cylinderGeometry args={[r, r, shaft, 8]} />
      </mesh>
      <mesh material={m.fill} position={[0, shaft + head / 2, 0]} renderOrder={33}>
        <coneGeometry args={[r * 2.8, head, 8]} />
      </mesh>
    </group>
  );
};

const Blob = ({pos, scale, color, rot = [0, 0, 0], amount}: {pos: V3; scale: V3; color: string; rot?: V3; amount: number}) => {
  const m = useMemo(
    () => ({
      fill: new THREE.MeshBasicMaterial({color, depthTest: false, transparent: true, opacity: 0.95}),
      edge: new THREE.MeshBasicMaterial({color: '#5b1a22', depthTest: false, transparent: true, side: THREE.BackSide}),
    }),
    [color],
  );
  const s = easeInOut(clamp(amount));
  if (s < 0.01) return null;
  return (
    <group position={pos} rotation={rot} scale={scale.map((v) => v * s) as V3}>
      <mesh material={m.edge} scale={1.13} renderOrder={29}>
        <sphereGeometry args={[1, 14, 10]} />
      </mesh>
      <mesh material={m.fill} renderOrder={30}>
        <sphereGeometry args={[1, 14, 10]} />
      </mesh>
    </group>
  );
};

const dropTexture = () => {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 220;
  const g = c.getContext('2d')!;
  const drop = () => {
    g.beginPath();
    g.moveTo(80, 8);
    g.bezierCurveTo(118, 70, 150, 110, 150, 145);
    g.arc(80, 145, 70, 0, Math.PI, false);
    g.bezierCurveTo(10, 110, 42, 70, 80, 8);
    g.closePath();
  };
  g.lineJoin = 'round';
  g.lineWidth = 14;
  g.strokeStyle = '#ffffff';
  drop();
  g.stroke();
  g.fillStyle = '#d61f1f';
  drop();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath();
  g.ellipse(55, 140, 13, 24, 0.3, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const BloodDrop = ({size, amount}: {size: number; amount: number}) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({map: dropTexture(), depthTest: false, transparent: true}), []);
  const s = size * easeInOut(clamp(amount));
  if (s < 0.001) return null;
  return <sprite material={mat} scale={[s * 0.73, s, 1]} renderOrder={44} />;
};

export const BodyHint = ({lunge = 0, blut = 0, time = 0}: {lunge?: number; blut?: number; time?: number}) => {
  const toxin = useMemo(() => new THREE.MeshBasicMaterial({color: '#7dff3a', depthTest: false, transparent: true}), []);
  if (lunge < 0.01 && blut < 0.01) return null;
  const lungShow = clamp(lunge / 0.3);
  const lungArrow = clamp((lunge - 0.3) / 0.7);
  const bellyShow = clamp(blut / 0.3);
  const bloodArrow = clamp((blut - 0.3) / 0.7);
  const sFrom: V3 = [0.03, 0.2, 0.2];
  const sTo: V3 = [0.27, 0.4, 0.2];
  return (
    <group>
      {lunge > 0.01 && (
        <>
          {/* Luftröhre */}
          <Blob pos={[0, 0.52, 0.12]} scale={[0.016, 0.07, 0.016]} color="#ff9fb2" amount={lungShow} />
          <Blob pos={[0.075, 0.35, 0.12]} scale={[0.065, 0.12, 0.04]} rot={[0, 0, -0.12]} color="#ff8fa6" amount={lungShow} />
          <Blob pos={[-0.075, 0.35, 0.12]} scale={[0.065, 0.12, 0.04]} rot={[0, 0, 0.12]} color="#ff8fa6" amount={lungShow} />
          <Arrow from={[-0.02, 0.74, 0.22]} to={[-0.02, 0.42, 0.2]} amount={lungArrow} />
          <group position={[-0.25, 0.56, 0.18]}>
            <WarnBadge size={0.15} amount={clamp(lungArrow * 1.6 - 0.6)} />
          </group>
        </>
      )}
      {blut > 0.01 && (
        <>
          <Blob pos={[0.035, 0.2, 0.12]} scale={[0.08, 0.055, 0.04]} rot={[0, 0, 0.35]} color="#f4a259" amount={bellyShow} />
          <Arrow from={sFrom} to={sTo} amount={bloodArrow} r={0.013} />
          <group position={[0.31, 0.45, 0.2]}>
            <BloodDrop size={0.13} amount={clamp(bloodArrow * 1.6 - 0.6)} />
          </group>
          {bloodArrow > 0.3 &&
            [0, 1, 2].map((i) => {
              const u = (time * 0.6 + i / 3) % 1;
              const pnt = new THREE.Vector3(...sFrom).lerp(new THREE.Vector3(...sTo), u * clamp(bloodArrow));
              return (
                <mesh key={i} material={toxin} position={[pnt.x, pnt.y + 0.025, pnt.z + 0.01]} renderOrder={36}>
                  <sphereGeometry args={[0.011, 8, 6]} />
                </mesh>
              );
            })}
          <group position={[-0.2, 0.32, 0.18]}>
            <WarnBadge size={0.15} amount={clamp(bloodArrow * 1.6 - 0.6)} />
          </group>
        </>
      )}
    </group>
  );
};
