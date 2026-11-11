import type {ActorKey} from '../data/types';
import {deg, sampleActor, type ActorState} from '../lib/anim';
import type {StageDef} from '../stage/types';
import {SpeedLines} from '../effects/SpeedLines';
import {Bear, bearPose} from './Bear';
import {Dummy, dummyPose} from './Dummy';
import {Snake, snakePose} from './Snake';

/**
 * Figuren-Baukasten. Neue Figur = neue Datei + hier eintragen.
 * height = Augen-/Blickhöhe für die Kamera ("look": "bear").
 * climbOffset = Abstand vom Baumstamm beim Klettern.
 */
export const ACTORS = {
  dummy: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  bear: {height: 0.9, climbOffset: 0.12, speedLineHeight: 0.9},
  snake: {height: 0.1, climbOffset: 0.05, speedLineHeight: 0.1},
} as const;

/** Kreuzotter etwas größer als echt (ca. 0,85 m statt 0,7 m), damit sie im Hochformat gut zu sehen ist */
const SNAKE_SCALE = 1.2;

export type ActorName = keyof typeof ACTORS;

/** Endgültige Position einer Figur (inkl. "am Baum kleben" beim Klettern) */
export const resolveActor = (
  name: string,
  keys: ActorKey[],
  t: number,
  sectionSeconds: number,
  stage: StageDef,
): ActorState => {
  const s = sampleActor(keys, t, sectionSeconds);
  if (s.motion === 'climb' && stage.climbTrees.length) {
    const tree = [...stage.climbTrees].sort(
      (a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z),
    )[0];
    const dx = s.x - tree.x;
    const dz = s.z - tree.z;
    const d = Math.hypot(dx, dz) || 1;
    const off = tree.r + (ACTORS[name as ActorName]?.climbOffset ?? 0.3);
    s.x = tree.x + (dx / d) * off;
    s.z = tree.z + (dz / d) * off;
    // Blick zum Stamm: Richtung (sin f, -cos f) = -(dx,dz)/d
    s.face = (Math.atan2(-dx / d, dz / d) * 180) / Math.PI;
  } else {
    s.y += stage.groundHeight(s.x, s.z);
  }
  return s;
};

export const Actor = ({name, state}: {name: string; state: ActorState}) => {
  // Modell blickt nach +z; Blickrichtung "face" (0 = −z) → Drehung = 180° − face
  const rotY = deg(180 - state.face);
  const lines = state.motion === 'run' && state.speed > 1.5;
  return (
    <group position={[state.x, state.y, state.z]} rotation={[0, rotY, 0]}>
      {name === 'dummy' && <Dummy pose={dummyPose(state.motion, state.motionTime, state.speed)} bite={state.bite} />}
      {name === 'snake' && (
        <group scale={SNAKE_SCALE}>
          <Snake pose={snakePose(state.motion, state.motionTime, state.speed / SNAKE_SCALE)} />
        </group>
      )}
      {name === 'bear' && <Bear pose={bearPose(state.motion, state.motionTime, state.speed)} />}
      {lines && <SpeedLines time={state.motionTime} height={ACTORS[name as ActorName]?.speedLineHeight ?? 1} />}
    </group>
  );
};
