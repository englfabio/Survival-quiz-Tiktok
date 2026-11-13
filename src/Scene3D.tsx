import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import {useLayoutEffect} from 'react';
import {useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {Actor, ACTORS, resolveActors, type ActorName} from './actors';
import {Rope} from './actors/MagnetProps';
import type {Shot, Vec3} from './data/types';
import {sampleCamera} from './lib/anim';
import type {StageDef} from './stage/types';

const CameraRig = ({pos, look, fov}: {pos: Vec3; look: Vec3; fov: number}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.fov = fov;
    camera.near = 0.1;
    camera.far = 900;
    camera.lookAt(...look);
    camera.updateProjectionMatrix();
  }, [camera, pos, look, fov]);
  return null;
};

/** Seil von der rechten Hand des Dummys zum Magneten (Wert "rope" am Magneten) */
const RopeLine = ({states}: {states: ReturnType<typeof resolveActors>}) => {
  const d = states.find((a) => a.name === 'dummy');
  const mg = states.find((a) => a.name === 'magnet');
  if (!d?.hand || !mg || !(mg.state.values.rope > 0.5)) return null;
  const to = new THREE.Vector3().setFromMatrixPosition(mg.matrix);
  return <Rope from={d.hand} to={to} sag={mg.state.values.drop > 0.01 ? 0.01 : 0.07} />;
};

/**
 * Zeichnet eine Einstellung ("Shot"): Bühne + Figuren + Kamera.
 * t = Fortschritt im Abschnitt (0…1), seconds = Länge des Abschnitts.
 */
export const Scene3D = ({
  stage,
  shot,
  t,
  seconds,
  camT,
}: {
  stage: StageDef;
  shot: Shot;
  t: number;
  seconds: number;
  /** eigene Kamera-Zeit (z. B. beim Einfrieren fährt die Kamera weiter), sonst = t */
  camT?: number;
}) => {
  const {width, height} = useVideoConfig();
  const states = resolveActors(shot.actors, t, seconds, stage);

  const resolveLook = (name: string): Vec3 => {
    // "dummy+bear" = Mitte zwischen beiden Figuren
    if (name.includes('+')) {
      const pts = name.split('+').map((n) => resolveLook(n.trim()));
      return [0, 1, 2].map((c) => pts.reduce((sum, p) => sum + p[c], 0) / pts.length) as Vec3;
    }
    const a = states.find((s) => s.name === name);
    if (!a) return [0, 1, 0];
    const h = ACTORS[name as ActorName]?.height ?? 1;
    return [a.pos.x, a.pos.y + h, a.pos.z];
  };
  const cam = sampleCamera(shot.camera, camT ?? t, resolveLook, shot.sharpCuts);
  const StageComp = stage.Component;

  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace}}
      camera={{fov: 38, position: [0, 2, 6]}}
    >
      <CameraRig pos={cam.pos} look={cam.look} fov={cam.fov} />
      <StageComp cam={cam} />
      {states.map((a) => (
        <Actor key={a.name} actor={a} barefoot={stage.barefoot} camPos={cam.pos} waterLevel={stage.waterLevel ?? 0} />
      ))}
      <RopeLine states={states} />
    </ThreeCanvas>
  );
};
