import {useCurrentFrame} from 'remotion';
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
import {Dummy, dummyPoseBlended, rightHandLocal, sitExtras, zapPose} from './Dummy';
import {Grenade, Magnet} from './MagnetProps';
import {Bill, CordonTape, Suitcase, TapeRoll} from './StationProps';
import {Calculator, CalendarSheet, MoneyBundle, MoneyCase, ParagraphBadge, PaperForm} from './MoneyProps';
import {Dog, DOG_COLLAR, dogPose, Leash, MapPhone, Pistol, PoliceCar} from './PistolProps';
import type {Uniform} from './Dummy';
import {ColdWaterGlass, CoolPack, HeartBadge} from './PanicProps';
import {Whale, whalePose} from './Whale';
import {Eel, eelAnchors, eelPose} from './Eel';
import {Broom, FuseBox, WetTowel} from './ShockProps';
import {Kangaroo, kangarooPoseBlended} from './Kangaroo';
import {GardenTap, HintSign, MilkCarton, RescueBox, Tissue, Tooth, WaterGlass} from './ToothProps';
import {ZapAura, zapShake} from '../effects/Zap';
import {ChildLockCabinet, DishTab, KitchenRoll, MilkGlass, PaperSheet, TabPack} from './TabProps';
import {T} from '../ui/theme';
import {clamp} from '../lib/anim';
import {Snake, snakePose} from './Snake';
import {Thermometer} from './Thermometer';
import {AerialBomb, Smartphone, SmartphoneProp, SpadeProp, WarnStake, Wheelbarrow} from './GardenProps';
import {Weever, weeverPose} from './Weever';
import {QuestionMark, Zombie, zombiePoseBlended} from './Zombie';
import {Bucket, ChristmasTree, DoorLeaf, FireTruck, GiftPile} from './ChristmasProps';
import {CompressPad, FirstAidKit, PlasterStrip, Sink, SprayBottle, VaccinationPass, WallCalendar, WallClock} from './FirstAidProps';

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
  // ---- Erste Hilfe (Zombie-Biss) ----
  zombie: {height: 1.45, climbOffset: 0.2, speedLineHeight: 1.0},
  arzt: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  waschbecken: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  kalender: {height: 0, climbOffset: 0, speedLineHeight: 0},
  wanduhr: {height: 0, climbOffset: 0, speedLineHeight: 0},
  impfpass: {height: 0, climbOffset: 0, speedLineHeight: 0},
  verbandskasten: {height: 0.1, climbOffset: 0, speedLineHeight: 0},
  pflaster: {height: 0, climbOffset: 0, speedLineHeight: 0},
  sprayflasche: {height: 0, climbOffset: 0, speedLineHeight: 0},
  kompresse: {height: 0, climbOffset: 0, speedLineHeight: 0},
  // ---- Feuer (Weihnachtsbaum-Brand) ----
  weihnachtsbaum: {height: 1.2, climbOffset: 0, speedLineHeight: 0},
  zimmertuer: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  wohnungstuer: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  haustuer: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  eimer: {height: 0.2, climbOffset: 0, speedLineHeight: 0},
  geschenke: {height: 0.2, climbOffset: 0, speedLineHeight: 0},
  feuerwehrauto: {height: 1.5, climbOffset: 0, speedLineHeight: 1.2},
  // ---- Strom (Zitteraal) ----
  kumpel: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  zitteraal: {height: 0.05, climbOffset: 0, speedLineHeight: 0},
  handtuch: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
  sicherungskasten: {height: 1.5, climbOffset: 0, speedLineHeight: 0},
  besen: {height: 0.7, climbOffset: 0, speedLineHeight: 0},
  // ---- Zahnunfall (Känguru) ----
  kaenguru: {height: 1.45, climbOffset: 0.2, speedLineHeight: 0.9},
  zahn: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  taschentuch: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  wasserglas: {height: 0.07, climbOffset: 0, speedLineHeight: 0},
  wasserhahn: {height: 0.9, climbOffset: 0, speedLineHeight: 0},
  zahnrettungsbox: {height: 0.05, climbOffset: 0, speedLineHeight: 0},
  hmilch: {height: 0.12, climbOffset: 0, speedLineHeight: 0},
  hinweis: {height: 0, climbOffset: 0, speedLineHeight: 0},
  // ---- Vergiftung (Spülmaschinentab) ----
  spuelmaschinentab: {height: 0.01, climbOffset: 0, speedLineHeight: 0},
  tabpackung: {height: 0.08, climbOffset: 0, speedLineHeight: 0},
  milchglas: {height: 0.08, climbOffset: 0, speedLineHeight: 0},
  kuechenpapier: {height: 0.15, climbOffset: 0, speedLineHeight: 0},
  papierblatt: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  oberschrank: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
  // ---- Panikattacke (Wal im Zimmer) ----
  wal: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  kaltwasser: {height: 0.07, climbOffset: 0, speedLineHeight: 0},
  coolpack: {height: 0.02, climbOffset: 0, speedLineHeight: 0},
  // ---- Magnetfischen (Granate) ----
  magnet: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  granate: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  // ---- Bahnhof (herrenloser Koffer) ----
  bahnmitarbeiterin: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  bundespolizist: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  koffer: {height: 0.4, climbOffset: 0, speedLineHeight: 0},
  absperrband: {height: 0.9, climbOffset: 0, speedLineHeight: 0},
  rechnung: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  // ---- Fundstück im Wald (Pistole) ----
  pistole: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  kartenhandy: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  polizeiauto: {height: 0.9, climbOffset: 0.3, speedLineHeight: 0.7},
  hund: {height: 0.5, climbOffset: 0, speedLineHeight: 0.4},
  polizist: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  polizistin: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  // ---- Geldkoffer (Fundstücke) ----
  geldkoffer: {height: 0.2, climbOffset: 0, speedLineHeight: 0},
  geldbuendel: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  formular: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  taschenrechner: {height: 0.08, climbOffset: 0, speedLineHeight: 0},
  kalenderblatt: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  paragraf: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
} as const;

/** Bewegungen im Wasser: y bezieht sich auf die Wasseroberfläche der Bühne */
const WATER_MOTIONS = ['swim', 'struggle', 'gasp', 'crawl', 'tug', 'backfloat', 'backswim', 'edgehold', 'edgewave'];

/** Kälte-Symbol: Höhe über dem Ursprung der Figur (aufrecht im Wasser vs. liegend) */
const coldHeight = (motion: string) => (['backfloat', 'backswim', 'crawl', 'swim'].includes(motion) ? 0.7 : 2.15);

/** Körperfarbe des Nachbarn (gleiche Figur wie der Dummy, aber blau) */
const NEIGHBOR_COLOR = '#3f8fd6';
/** Körperfarbe der Ärztin/des Arztes (gleiche Figur wie der Dummy, türkis, mit weißem Kittel) */
const DOCTOR_COLOR = '#2fae9c';
/** Körperfarbe des Kumpels (zweiter Crashtest-Dummy, orange – für alle Szenen, in denen man jemandem hilft) */
const BUDDY_COLOR = '#f07a1e';
/** Figuren mit Dummy-Körper (können zittern + Blitze bekommen) */
const DUMMY_LIKE = ['dummy', 'nachbar', 'arzt', 'kumpel', 'bahnmitarbeiterin', 'bundespolizist', 'polizist', 'polizistin'];
/** Bahnmitarbeiterin: Körper hellgrau-lila, Uniform weinrot/grau mit rotem Halstuch + Zopf (ohne Logo) */
const STAFF_COLOR = '#b9a6d6';
const STAFF_UNIFORM: Uniform = {jacket: '#7b1f35', dark: '#4e1222', collar: '#e9e6e1', pants: '#3c4048', cap: '#7b1f35', band: '#3c4048', scarf: '#d8b23a', hair: '#5a3622'};
/** Bundespolizist: Körper hellgrau, stilisierte dunkelblaue Uniform (ohne echte Abzeichen) */
const POLICE_COLOR = '#aeb8c4';
const POLICE_UNIFORM: Uniform = {jacket: '#1e2b4a', dark: '#121a2e', collar: '#8fb0d6', pants: '#1a2440', cap: '#1e2b4a', band: '#8fb0d6', trim: '#2c3d63'};
/** Polizistin: gleiche Uniform, Zopf */
const POLICE_UNIFORM_W: Uniform = {...POLICE_UNIFORM, hair: '#6b4a2a'};
/** Polizist/Polizistin (Streife): Körperfarben */
const POLICE2_COLOR = '#b9c3cc';
const POLICE3_COLOR = '#c9b8a8';

/** Zahn: Drehung im Flug (rad/s) */
const TOOTH_SPIN = 13;

/** Petermännchen größer als echt (ca. 0,48 m statt 0,3 m), damit es im Hochformat gut zu sehen ist */
const WEEVER_SCALE = 1.6;

/** Kreuzotter etwas größer als echt (ca. 0,85 m statt 0,7 m), damit sie im Hochformat gut zu sehen ist */
const SNAKE_SCALE = 1.2;

export type ActorName = keyof typeof ACTORS;

/** Fertig berechnete Figur: Zustand + Lage in der Welt */
export type ResolvedActor = {name: string; state: ActorState; matrix: THREE.Matrix4; pos: THREE.Vector3; text?: string; hand?: THREE.Vector3; leashTo?: THREE.Vector3};

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
    ? rumbleMatrix(s).multiply(carLocalMatrix(carPose(s.motion, s.motionTime, s.speed), s.values.tilt))
    : name === 'zugbruecke'
      ? bridgeLocalMatrix(s.values.tilt)
      : new THREE.Matrix4();

/** Rumpeln über Kopfsteinpflaster (Wert "rumble"): kleine schnelle Stöße + Wanken */
const rumbleMatrix = (s: ActorState) => {
  const r = s.values.rumble;
  if (!(r > 0.001)) return new THREE.Matrix4();
  const tt = s.sectionTime ?? s.motionTime;
  const dy = (Math.abs(Math.sin(tt * 21)) * 0.025 + Math.abs(Math.sin(tt * 33 + 1)) * 0.012) * r;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(0, dy, 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(tt * 17) * 0.012 * r, 0, Math.sin(tt * 13 + 2) * 0.018 * r)),
    new THREE.Vector3(1, 1, 1),
  );
};

/** Berechnet alle Figuren einer Einstellung. Figuren mit "attach" werden nach ihrer "Trägerfigur" berechnet. */
export const resolveActors = (
  actors: Record<string, ActorKey[]>,
  t: number,
  sectionSeconds: number,
  stage: StageDef,
): ResolvedActor[] => {
  const entries = Object.entries(actors).filter(([, keys]) => keys.length > 0);
  const hasAttach = (keys: ActorKey[]) => keys.some((k) => k.attach);
  // Figuren mit Dummy-Körper zuerst (Gegenstände mit "hand" brauchen ihre Hand-Position)
  const rank = (n: string) => (n === 'dummy' ? 0 : DUMMY_LIKE.includes(n) ? 1 : 2);
  const free = entries.filter(([, k]) => !hasAttach(k)).sort(([a], [b]) => rank(a) - rank(b));
  const ordered = [...free, ...entries.filter(([, k]) => hasAttach(k))];
  const hands = new Map<string, THREE.Vector3>();
  const done = new Map<string, ResolvedActor>();
  // "Innen"-Matrix einer Figur: Welt-Lage inkl. Schaukeln/Abkippen (dort sitzen angehängte Figuren)
  const inner = new Map<string, THREE.Matrix4>();

  for (const [name, keys] of ordered) {
    const s = sampleActor(keys, t, sectionSeconds);
    s.breathPhase = breathPhaseAt(keys, t, sectionSeconds);
    s.heartPhase = breathPhaseAt(keys, t, sectionSeconds, 'heart');
    s.sectionTime = t * sectionSeconds;
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
    // Gegenstand in der rechten Hand des Dummys ("hand" 0 … 1, hängt "drop" Meter darunter, pendelt leicht)
    const hk = s.values.hand;
    let holder = 'dummy';
    for (const k of keys) if (k.t <= t + 1e-6 && k.holder !== undefined) holder = k.holder;
    const dummyHand = hands.get(holder);
    if (hk > 0.001 && dummyHand) {
      const st = s.sectionTime ?? 0;
      const drop = s.values.drop;
      const target = dummyHand
        .clone()
        .add(new THREE.Vector3(Math.sin(st * 2.3) * 0.12 * drop, -drop, Math.sin(st * 1.7 + 1) * 0.08 * drop));
      const p0 = new THREE.Vector3();
      const q0 = new THREE.Quaternion();
      const sc0 = new THREE.Vector3();
      base.decompose(p0, q0, sc0);
      base = new THREE.Matrix4().compose(p0.lerp(target, Math.min(1, hk)), q0, sc0);
    }
    const matrix = base.clone().multiply(ownMotionMatrix(name, s));
    inner.set(name, matrix);
    const pos = new THREE.Vector3().setFromMatrixPosition(base);
    let hand: THREE.Vector3 | undefined;
    if (DUMMY_LIKE.includes(name)) {
      hand = rightHandLocal(dummyPoseBlended(s.motion, s.motionTime, s.speed, s.prev)).applyMatrix4(matrix);
      hands.set(name, hand);
    }
    let text: string | undefined;
    for (const k of keys) if (k.t <= t + 1e-6 && k.text !== undefined) text = k.text;
    // Hund an der Leine: Ziel = rechte Hand der Figur in "holder" (Standard "nachbar")
    let leashTo: THREE.Vector3 | undefined;
    if (name === 'hund' && s.values.leash > 0.5) {
      let lh = 'nachbar';
      for (const k of keys) if (k.t <= t + 1e-6 && k.holder !== undefined) lh = k.holder;
      leashTo = hands.get(lh);
    }
    done.set(name, {name, state: s, matrix, pos, text, hand, leashTo});
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
  const clock = useCurrentFrame() / 30; // durchlaufende Zeit (Flackern, Blaulicht)
  const lines = state.motion === 'run' && state.speed > 1.5;
  const v = state.values;
  const coldPos = pos.clone().add(new THREE.Vector3(0, coldHeight(state.motion), 0));
  const qPos = pos.clone().add(new THREE.Vector3(0, 2.2, 0));
  // Herz-Symbol: links neben dem Kopf (aus Sicht der Kamera), Höhe passt zu Stehen/Sitzen
  const sitting = ['bedsitdown', 'sitbreathe', 'chairsit', 'couchsit'].includes(state.motion);
  const heartPos = pos.clone().add(new THREE.Vector3(0, sitting ? 1.6 : 2.05, 0)).add(new THREE.Vector3(camPos[0] - pos.x, 0, camPos[2] - pos.z).normalize().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(-0.32));
  // Zeit für Blitze/Zittern = Gesamtzeit im Abschnitt (läuft über Bewegungswechsel weiter, friert beim Einfrieren ein)
  const zt = state.sectionTime ?? state.motionTime;
  const shake = DUMMY_LIKE.includes(name) ? zapShake(zt, v.zap, name.length) : {pos: [0, 0, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number]};
  return (
    <>
    {name === 'zombie' && state.motion === 'confused' && (
      <group position={qPos} quaternion={billboard(qPos, camPos)}>
        <QuestionMark amount={Math.min(1, state.motionTime / 0.5)} />
      </group>
    )}
    {DUMMY_LIKE.includes(name) && v.question > 0.01 && (
      <group position={qPos} quaternion={billboard(qPos, camPos)}>
        <QuestionMark amount={v.question} />
      </group>
    )}
    {name === 'hund' && actor.leashTo && <Leash a={DOG_COLLAR.clone().applyMatrix4(matrix)} b={actor.leashTo} />}
    {name === 'dummy' && v.heart > 0.01 && (
      <group position={heartPos} quaternion={billboard(heartPos, camPos)}>
        <HeartBadge phase={state.heartPhase ?? 0} rate={v.heart} amount={clamp(v.heart / 0.3, 0, 1)} />
      </group>
    )}
    {name === 'dummy' && v.cold > 0.01 && (
      <group position={coldPos} quaternion={billboard(coldPos, camPos)}>
        <ColdBadge amount={v.cold} time={state.motionTime} />
      </group>
    )}
    <group matrix={matrix} matrixAutoUpdate={false}>
    <group position={shake.pos} rotation={shake.rot}>
      {name === 'dummy' && (
        <Dummy
          zap={v.zap}
          zapTime={zt}
          pose={sitExtras(zapPose(dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev), v.zap, zt, 3), v.pack, v.sip)}
          heave={v.heave}
          bite={state.bite}
          sting={state.sting}
          pain={v.pain}
          barefoot={barefoot}
          jacket={v.jacket}
          pants={v.pants}
          breath={v.breath}
          breathPhase={state.breathPhase}
          armbite={v.armbite}
          redness={v.redness}
          plaster={v.plaster}
          dressing={v.dressing}
          gloves={v.gloves}
          teeth={v.teeth}
          gap={v.gap}
          tooth={{gray: v.gray, mark: v.mark, wrap: v.wrap}}
          foam={v.foam}
          lunge={v.lunge}
          blut={v.blut}
          fxTime={zt}
          stash={v.stash}
          brow={v.brow}
        />
      )}
      {name === 'kaenguru' && <Kangaroo pose={kangarooPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} />}
      {name === 'zahn' && (
        <group scale={1 + v.size} rotation={state.motion === 'fly' ? [state.motionTime * TOOTH_SPIN, 0, state.motionTime * TOOTH_SPIN * 0.6] : state.motion === 'lie' ? [0.25, 0, 1.3] : [0, 0, 0]}>
          <Tooth gray={v.gray} mark={v.mark} time={clock} />
        </group>
      )}
      {name === 'taschentuch' && <Tissue wrap={v.wrap} />}
      {name === 'wasserglas' && <WaterGlass time={clock} ripple={1} />}
      {name === 'wasserhahn' && <GardenTap water={v.water} time={clock} />}
      {name === 'zahnrettungsbox' && (
        <group scale={1 + v.size}>
          <RescueBox lid={v.lid} />
        </group>
      )}
      {name === 'hmilch' && <MilkCarton />}
      {name === 'hinweis' && <HintSign text={actor.text ?? ''} time={state.motionTime} visible={state.motion === 'show'} height={0.07 * (1 + v.size)} below={v.below > 0.5} color={v.good > 0.5 ? T.green : T.red} />}
      {name === 'spuelmaschinentab' && (
        <group scale={1 + v.size}>
          <DishTab bitten={v.mark > 0.5} />
        </group>
      )}
      {name === 'tabpackung' && (
        <group scale={1 + v.size}>
          <TabPack open={v.lid} />
        </group>
      )}
      {name === 'milchglas' && <MilkGlass fill={v.fill} />}
      {name === 'kuechenpapier' && <KitchenRoll />}
      {name === 'papierblatt' && (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <PaperSheet />
        </group>
      )}
      {name === 'oberschrank' && <ChildLockCabinet door={v.door} lock={v.lock} />}
      {name === 'wal' && <Whale pose={whalePose(state.motion, state.motionTime)} size={v.size} squish={v.squish} time={zt} />}
      {name === 'kaltwasser' && <ColdWaterGlass fill={state.values.fill > 0 ? v.fill : 1} />}
      {name === 'coolpack' && <CoolPack />}
      {name === 'arzt' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={DOCTOR_COLOR} coat />
      )}
      {name === 'zombie' && <Zombie pose={zombiePoseBlended(state.motion, state.motionTime, state.speed, state.prev)} />}
      {name === 'waschbecken' && <Sink flow={state.motion === 'flow'} time={state.motionTime} />}
      {name === 'kalender' && <WallCalendar flipTime={state.motion === 'flip' ? state.motionTime : 0} />}
      {name === 'wanduhr' && <WallClock spinTime={state.motion === 'spin' ? state.motionTime : 0} time={state.motionTime} />}
      {name === 'impfpass' && <VaccinationPass open={state.motion === 'open' ? 1 : 0} />}
      {name === 'verbandskasten' && <FirstAidKit />}
      {name === 'pflaster' && <PlasterStrip />}
      {name === 'sprayflasche' && <SprayBottle />}
      {name === 'kompresse' && <CompressPad />}
      {name === 'weihnachtsbaum' && <ChristmasTree fire={v.fire} smoke={v.smoke} time={clock} />}
      {name === 'zimmertuer' && <DoorLeaf kind="zimmer" open={v.door} smoke={v.smoke} time={clock} />}
      {name === 'wohnungstuer' && <DoorLeaf kind="wohnung" open={v.door} smoke={v.smoke} time={clock} />}
      {name === 'haustuer' && <DoorLeaf kind="haus" open={v.door} smoke={v.smoke} time={clock} />}
      {name === 'eimer' && <Bucket time={clock} />}
      {name === 'geschenke' && <GiftPile />}
      {name === 'feuerwehrauto' && (
        <FireTruck spin={state.motion === 'drive' ? (state.motionTime * state.speed) / 0.5 : 0} time={clock} />
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
      {name === 'smartphone' &&
        (state.motion === 'lie' ? (
          <group position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={1.6}>
            <Smartphone />
          </group>
        ) : (
          <SmartphoneProp time={state.motionTime} />
        ))}
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
          window2={v.window2}
        />
      )}
      {name === 'splash' && state.motion === 'splash' && <Splash time={state.motionTime} size={1 + v.size} />}
      {name === 'magnet' && <Magnet />}
      {name === 'granate' && (
        <group rotation={[0, 0, deg(v.tilt)]}>
          <Grenade time={zt} rumble={v.rumble} />
        </group>
      )}
      {lines && <SpeedLines time={state.motionTime} height={ACTORS[name as ActorName]?.speedLineHeight ?? 1} />}
      {name === 'kumpel' && (
        <Dummy
          color={BUDDY_COLOR}
          brow={v.brow}
          zap={v.zap}
          zapTime={zt}
          pose={zapPose(dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev), v.zap, zt, 9)}
        />
      )}
      {name === 'bahnmitarbeiterin' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={STAFF_COLOR} uniform={STAFF_UNIFORM} />
      )}
      {name === 'bundespolizist' && (
        <>
          <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={POLICE_COLOR} uniform={POLICE_UNIFORM} brow={v.brow} />
          {state.motion === 'tapewalk' && (
            <group position={rightHandLocal(dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev))}>
              <TapeRoll />
            </group>
          )}
        </>
      )}
      {name === 'koffer' && <Suitcase handle={v.handle} tilt={v.tilt} />}
      {name === 'pistole' && <Pistol tilt={v.tilt} side={v.side} leaves={v.leaves} size={v.size} />}
      {name === 'kartenhandy' && (
        <group rotation={[deg(-v.tilt), 0, 0]}>
          <MapPhone pin={v.pin} size={v.size} />
        </group>
      )}
      {name === 'polizeiauto' && <PoliceCar pose={carPose(state.motion, state.motionTime, state.speed)} blue={v.blue} time={clock} />}
      {name === 'hund' && <Dog pose={dogPose(state.motion, state.motionTime, state.speed)} />}
      {name === 'polizist' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={POLICE2_COLOR} uniform={POLICE_UNIFORM} brow={v.brow} />
      )}
      {name === 'polizistin' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={POLICE3_COLOR} uniform={POLICE_UNIFORM_W} brow={v.brow} />
      )}
      {name === 'geldkoffer' && <MoneyCase tilt={v.tilt} lid={v.lid} money={state.values.money > 0 ? v.money : 1} />}
      {name === 'geldbuendel' && (
        <group scale={1 + v.size}>
          <MoneyBundle />
        </group>
      )}
      {name === 'formular' && <PaperForm fill={v.fill} pen={v.pen} size={v.size} />}
      {name === 'taschenrechner' && <Calculator text={actor.text ?? '30.010 €'} fill={v.fill} tilt={v.tilt} size={v.size} />}
      {name === 'kalenderblatt' && <CalendarSheet text={actor.text ?? '6 Monate'} time={state.motionTime} visible={state.motion === 'show'} size={v.size} />}
      {name === 'paragraf' && <ParagraphBadge text={actor.text ?? '§ 246'} time={state.motionTime} visible={state.motion === 'show'} size={v.size} />}
      {name === 'absperrband' && <CordonTape fill={v.fill} size={v.size} />}
      {name === 'rechnung' && <Bill size={v.size} />}
      {name === 'zitteraal' && <ZitterAal motion={state.motion} time={state.motionTime} zap={v.zap} zt={zt} />}
      {name === 'handtuch' && <WetTowel time={state.motionTime} bend={0.05} />}
      {name === 'sicherungskasten' && <FuseBox lever={v.lever} />}
      {name === 'besen' && (
        <group rotation={[deg(-v.lean), 0, 0]}>
          <Broom />
        </group>
      )}
    </group>
    </group>
    </>
  );
};

/** Zitteraal mit Blitzen (zap) */
const ZitterAal = ({motion, time, zap, zt}: {motion: string; time: number; zap: number; zt: number}) => {
  const pose = eelPose(motion as never, time);
  return (
    <>
      <Eel pose={pose} glow={0.4 + zap * (0.6 + 0.4 * Math.sin(zt * 31))} />
      <ZapAura anchors={eelAnchors(pose)} amount={zap} time={zt} seed={21} count={5} len={0.14} width={0.009} />
    </>
  );
};
