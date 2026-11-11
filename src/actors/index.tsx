import * as THREE from 'three';
import type {ActorKey} from '../data/types';
import {breathPhaseAt, deg, inheritedKeys, sampleActor, segmentAt, type ActorState} from '../lib/anim';
import type {StageDef} from '../stage/types';
import {SpeedLines} from '../effects/SpeedLines';
import {Splash} from '../effects/Splash';
import {ColdBadge} from '../effects/Cold';
import {Spray} from '../effects/Spray';
import {bridgeLocalMatrix, Drawbridge} from './CastleProps';
import {Bear, bearPose} from './Bear';
import {Car, carLocalMatrix, carPose} from './Car';
import {Basin} from './Basin';
import {Dummy, dummyPoseBlended} from './Dummy';
import {Snake, snakePose} from './Snake';
import {Thermometer} from './Thermometer';
import {AerialBomb, SmartphoneProp, SpadeProp, WarnStake, Wheelbarrow} from './GardenProps';
import {Weever, weeverPose} from './Weever';

/**
 * Figuren-Baukasten. Neue Figur = neue Datei + hier eintragen.
 * height = Augen-/Blickhöhe für die Kamera ("look": "bear").
 * climbOffset = Abstand vom Baumstamm beim Klettern.
 */
export const ACTORS = {
  dummy: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  bear: {height: 0.9, climbOffset: 0.12, speedLineHeight: 0.9},
  snake: {height: 0.1, climbOffset: 0.05, speedLineHeight: 0.1},
  car: {height: 0.9, climbOffset: 0.3, speedLineHeight: 0.7},
  splash: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
  petermaennchen: {height: 0.05, climbOffset: 0, speedLineHeight: 0},
  schuessel: {height: 0.2, climbOffset: 0, speedLineHeight: 0},
  thermometer: {height: 0, climbOffset: 0, speedLineHeight: 0},
  // ---- Garten ----
  nachbar: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  fliegerbombe: {height: 0.1, climbOffset: 0, speedLineHeight: 0},
  spaten: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
  schubkarre: {height: 0.5, climbOffset: 0, speedLineHeight: 0},
  warnstab: {height: 0.8, climbOffset: 0, speedLineHeight: 0},
  smartphone: {height: 0.12, climbOffset: 0, speedLineHeight: 0},
  // ---- Burg ----
  zugbruecke: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
} as const;

/** Bewegungen im Wasser: y bezieht sich auf die Wasseroberfläche der Bühne */
const WATER_MOTIONS = ['swim', 'struggle', 'gasp', 'crawl', 'tug', 'backfloat', 'backswim', 'edgehold', 'edgewave'];

/** Kälte-Symbol: Höhe über dem Ursprung der Figur (aufrecht im Wasser vs. liegend) */
const coldHeight = (motion: string) => (['backfloat', 'backswim', 'crawl', 'swim'].includes(motion) ? 0.7 : 2.15);

/** Körperfarbe des Nachbarn (gleiche Figur wie der Dummy, aber blau) */
const NEIGHBOR_COLOR = '#3f8fd6';

/** Petermännchen größer als echt (ca. 0,48 m statt 0,3 m), damit es im Hochformat gut zu sehen ist */
const WEEVER_SCALE = 1.6;

/** Kreuzotter etwas größer als echt (ca. 0,85 m statt 0,7 m), damit sie im Hochformat gut zu sehen ist */
const SNAKE_SCALE = 1.2;

export type ActorName = keyof typeof ACTORS;

/** Fertig berechnete Figur: Zustand + Lage in der Welt */
export type ResolvedActor = {name: string; state: ActorState; matrix: THREE.Matrix4; pos: THREE.Vector3};

/** Position einer Figur (inkl. "am Baum kleben" beim Klettern und Bodenhöhe) */
const placeOnStage = (name: string, s: ActorState, stage: StageDef) => {
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
  } else if (stage.waterLevel !== undefined && WATER_MOTIONS.includes(s.motion)) {
    // im Wasser: y bezieht sich auf die Wasseroberfläche
    s.y += stage.waterLevel;
  } else {
    s.y += stage.groundHeight(s.x, s.z);
  }
};

/** Welt-Lage einer frei stehenden Figur. Modell blickt nach +z; "face" 0 = −z → Drehung 180° − face */
const worldMatrix = (x: number, y: number, z: number, face: number) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, deg(180 - face), 0)),
    new THREE.Vector3(1, 1, 1),
  );

/** Lage im Koordinatensystem einer anderen Figur (z. B. im Auto): face 0 = nach vorne, 90 = zur Fahrertür */
const attachedMatrix = (parent: THREE.Matrix4, x: number, y: number, z: number, face: number) =>
  parent
    .clone()
    .multiply(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, deg(face), 0)),
        new THREE.Vector3(1, 1, 1),
      ),
    );

/** Zusätzliche Eigenbewegung (Auto schaukelt / kippt) – gilt auch für angehängte Figuren */
const ownMotionMatrix = (name: string, s: ActorState) =>
  name === 'car'
    ? carLocalMatrix(carPose(s.motion, s.motionTime, s.speed), s.values.tilt)
    : name === 'zugbruecke'
      ? bridgeLocalMatrix(s.values.tilt)
      : new THREE.Matrix4();

/** Berechnet alle Figuren einer Einstellung. Figuren mit "attach" werden nach ihrer "Trägerfigur" berechnet. */
export const resolveActors = (
  actors: Record<string, ActorKey[]>,
  t: number,
  sectionSeconds: number,
  stage: StageDef,
): ResolvedActor[] => {
  const entries = Object.entries(actors).filter(([, keys]) => keys.length > 0);
  const hasAttach = (keys: ActorKey[]) => keys.some((k) => k.attach);
  const ordered = [...entries.filter(([, k]) => !hasAttach(k)), ...entries.filter(([, k]) => hasAttach(k))];
  const done = new Map<string, ResolvedActor>();
  // "Innen"-Matrix einer Figur: Welt-Lage inkl. Schaukeln/Abkippen (dort sitzen angehängte Figuren)
  const inner = new Map<string, THREE.Matrix4>();

  for (const [name, keys] of ordered) {
    const s = sampleActor(keys, t, sectionSeconds);
    s.breathPhase = breathPhaseAt(keys, t, sectionSeconds);
    let base: THREE.Matrix4;
    if (!hasAttach(keys)) {
      placeOnStage(name, s, stage);
      base = worldMatrix(s.x, s.y, s.z, s.face);
    } else {
      // Endpunkte des aktuellen Abschnitts jeweils in Weltkoordinaten, dann weich mischen
      const inh = inheritedKeys(keys);
      const seg = segmentAt(keys, t);
      const endpoint = (idx: number) => {
        const k = keys[idx];
        const parent = k.attach ? inner.get(k.attach) : undefined;
        if (parent) return attachedMatrix(parent, k.x, k.y ?? 0, k.z, inh[idx].face);
        return worldMatrix(k.x, (k.y ?? 0) + stage.groundHeight(k.x, k.z), k.z, inh[idx].face);
      };
      const ka = keys[seg.i];
      const kb = keys[seg.i + 1];
      if (seg.last || !kb) {
        base = endpoint(seg.i);
      } else if (ka.attach && ka.attach === kb.attach && inner.get(ka.attach)) {
        // beide im Auto: im Auto mischen (bewegt sich mit dem Auto)
        base = attachedMatrix(inner.get(ka.attach)!, s.x, s.y, s.z, s.face);
      } else {
        const A = endpoint(seg.i);
        const B = endpoint(seg.i + 1);
        const pa = new THREE.Vector3();
        const pb = new THREE.Vector3();
        const qa = new THREE.Quaternion();
        const qb = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        A.decompose(pa, qa, sc);
        B.decompose(pb, qb, sc);
        base = new THREE.Matrix4().compose(pa.lerp(pb, seg.p), qa.slerp(qb, seg.p), new THREE.Vector3(1, 1, 1));
      }
    }
    const matrix = base.clone().multiply(ownMotionMatrix(name, s));
    inner.set(name, matrix);
    const pos = new THREE.Vector3().setFromMatrixPosition(base);
    done.set(name, {name, state: s, matrix, pos});
  }
  return entries.map(([name]) => done.get(name)!);
};

/** Drehung, damit ein flaches Symbol an Position p zur Kamera schaut */
const billboard = (p: THREE.Vector3, cam: [number, number, number]) => {
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...cam), p, new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
};

export const Actor = ({
  actor,
  barefoot = false,
  camPos = [0, 2, 8],
  waterLevel = 0,
}: {
  actor: ResolvedActor;
  barefoot?: boolean;
  camPos?: [number, number, number];
  waterLevel?: number;
}) => {
  const {name, state, matrix, pos} = actor;
  const lines = state.motion === 'run' && state.speed > 1.5;
  const v = state.values;
  const coldPos = pos.clone().add(new THREE.Vector3(0, coldHeight(state.motion), 0));
  return (
    <>
    {name === 'dummy' && v.cold > 0.01 && (
      <group position={coldPos} quaternion={billboard(coldPos, camPos)}>
        <ColdBadge amount={v.cold} time={state.motionTime} />
      </group>
    )}
    <group matrix={matrix} matrixAutoUpdate={false}>
      {name === 'dummy' && (
        <Dummy
          pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)}
          bite={state.bite}
          sting={state.sting}
          pain={v.pain}
          barefoot={barefoot}
          jacket={v.jacket}
          pants={v.pants}
          breath={v.breath}
          breathPhase={state.breathPhase}
        />
      )}
      {name === 'dummy' && v.spray > 0.01 && (
        <group position={[0, waterLevel - pos.y, state.motion === 'crawl' ? 1.1 : 0]}>
          <Spray time={state.motionTime} amount={v.spray} spread={state.motion === 'crawl' ? [0.55, 1.0] : [0.6, 0.6]} />
        </group>
      )}
      {name === 'zugbruecke' && <Drawbridge tilt={v.tilt} />}
      {name === 'nachbar' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={NEIGHBOR_COLOR} />
      )}
      {name === 'fliegerbombe' && <AerialBomb tilt={v.tilt} dirt={state.motion === 'buriedbomb'} />}
      {name === 'spaten' && <SpadeProp upright={state.motion === 'stand'} />}
      {name === 'schubkarre' && <Wheelbarrow spin={state.motion === 'push' ? (state.motionTime * state.speed) / 0.2 : 0} />}
      {name === 'warnstab' && <WarnStake time={state.motionTime} plant={state.motion === 'plant'} />}
      {name === 'smartphone' && <SmartphoneProp time={state.motionTime} />}
      {name === 'petermaennchen' && (
        <group scale={WEEVER_SCALE}>
          <Weever pose={weeverPose(state.motion, state.motionTime)} />
        </group>
      )}
      {name === 'schuessel' && <Basin time={state.motionTime} steaming={state.motion === 'steam'} />}
      {name === 'thermometer' && <Thermometer time={state.motionTime} visible={state.motion === 'show'} />}
      {name === 'snake' && (
        <group scale={SNAKE_SCALE}>
          <Snake pose={snakePose(state.motion, state.motionTime, state.speed / SNAKE_SCALE)} />
        </group>
      )}
      {name === 'bear' && <Bear pose={bearPose(state.motion, state.motionTime, state.speed)} />}
      {name === 'car' && (
        <Car
          pose={carPose(state.motion, state.motionTime, state.speed)}
          windowOpen={v.window}
          door={v.door}
          water={v.water}
          pressure={v.pressure}
        />
      )}
      {name === 'splash' && state.motion === 'splash' && <Splash time={state.motionTime} />}
      {lines && <SpeedLines time={state.motionTime} height={ACTORS[name as ActorName]?.speedLineHeight ?? 1} />}
    </group>
    </>
  );
};
