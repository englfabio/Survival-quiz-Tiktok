import {useMemo} from 'react';
import * as THREE from 'three';
import type {Motion} from '../data/types';
import {clamp, easeInOut, rng} from '../lib/anim';
import {BoxingGlove} from './ToothProps';

/**
 * Spezial „Dein Goldfisch hat dein Auto geklaut“ – alles comichaft und harmlos, ohne Logos/Marken. Dem Goldfisch geht es immer gut:
 * sein Glas ist immer voll Wasser und im Auto sicher angeschnallt.
 *
 *  - GoldfishBowl ("goldfisch"): rundes Glas (Radius 0,24 m, oben offen) voll Wasser mit buntem Kies, darin ein orangefarbener Low-Poly-Goldfisch
 *      mit großen Augen + schräg gestellten Augenbrauen (sehr konzentrierter Blick). Ursprung = Boden des Glases, Fisch schaut nach +z.
 *      Werte: `side` 1 = Sicherheitsgurt quer übers Glas (im Auto), `gloves` 1 = winzige rote Boxhandschuhe an den Brustflossen,
 *      `fill` 0 … 1 = Futterflocken auf dem Wasser, `turn` = Lenkwinkel in Grad (wie beim Auto, damit die Flossen am Lenkrad bleiben).
 *      Im Auto: `"attach": "car", x 0.3, y 0.7, z −0.05, face 0` (Glas auf einer Sitzerhöhung auf dem Fahrersitz – so sieht man den Fisch durch die
 *      Scheiben; Flossen erreichen das Lenkrad = BOWL_WHEEL). Mit `side` 1 erscheinen Gurt + Sitzerhöhung.
 *      Bewegungen: fishswim, steer, fishblink, fisheat, fishguard, fishpunch, fishhappy, fishback (Details in goldfishPose).
 *  - Aquarium ("aquarium"): Glasbecken 0,9 × 0,5 × 0,42 m mit Wasser, Kies, Plastikpflanzen, kleiner Taucherfigur und Luftblasen-Pumpe
 *      (Ursprung = Boden-Mitte, Vorderseite +z). Ohne Fisch (der fährt ja Auto). Zum Tragen `"attach": "dummy", x 0, y 0.72, z 0.42, face 0`.
 *  - FoodCan: Dose Fischfutter ohne Marke (orange, Fisch-Zeichnung aus einfachen Formen), in der Hand bei `scatter` (Flocken rieseln).
 *  - FlakeTrail ("futterspur"): Spur aus bunten Futterflocken auf dem Boden, WELT-Koordinaten (Figur bei (0, 0), face 180). Feld `text` =
 *      Punkte "x z;x z;…", `fill` 0 … 1 = wie weit die Spur schon liegt (ab dem ersten Punkt), `mark` 1 = Häufchen am Ende.
 *  - CarKey ("autoschluessel"): Autoschlüssel mit schwarzem Griff + Fernbedienung ohne Logo am Ring, dreht sich langsam, `glow` = funkelt.
 *  - Podium ("podest", "podest2"): kleines rot-goldenes Siegerpodest (0,55 m hoch × (1 + `size`)), Oberseite = PODIUM_H.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

export const BOWL_R = 0.24;
/** Höhe des Fisch-Mittelpunkts über dem Glasboden (ruhig) */
const FISH_Y = 0.24;
/** Lenkrad im System des Glases (Glas auf Sitzerhöhung auf dem Fahrersitz: attach car x 0.3, y 0.7, z −0.05) – Mitte + Neigung */
export const BOWL_WHEEL = {pos: [0, 0.2, 0.41] as [number, number, number], tilt: -0.45, r: 0.17};
/** Blinkerhebel (links an der Lenksäule) im System des Glases */
const BOWL_LEVER: [number, number, number] = [0.2, 0.17, 0.34];
export const PODIUM_H = 0.55;

const ORANGE = '#ff8a1c';
const ORANGE_D = '#e8650c';
const FIN = '#ffb347';

export type FishPose = {
  /** Lage des Fischs im Glas (Mittelpunkt) */
  pos: [number, number, number];
  yaw: number;
  pitch: number;
  roll: number;
  tail: number;
  /** Brustflossen frei: Schlag (Bogenmaß) */
  finL: number;
  finR: number;
  /** Brustflossen an einem Zielpunkt im System des Glases (z. B. Lenkrad) */
  tipL?: [number, number, number];
  tipR?: [number, number, number];
  mouth: number;
  /** Augenbrauen: 1 = sehr konzentriert (innen tief), 0 = entspannt, −1 = fröhlich hochgezogen */
  focus: number;
  smile: number;
  blinkEye: number;
};

const rest = (): FishPose => ({pos: [0, FISH_Y, 0], yaw: 0, pitch: 0, roll: 0, tail: 0, finL: 0, finR: 0, mouth: 0.15, focus: 0.3, smile: 0, blinkEye: 0});

/** Punkt auf dem Lenkradkranz (Winkel a: 0 = rechts aus Fahrersicht … π/2 = oben), mit Lenkwinkel steer (Bogenmaß) */
const wheelPoint = (a: number, steer: number): [number, number, number] => {
  const [cx, cy, cz] = BOWL_WHEEL.pos;
  const ang = a + steer;
  // Kranz liegt in einer Ebene, die um x geneigt ist (oben nach hinten)
  const lx = -Math.cos(ang) * BOWL_WHEEL.r; // Fahrersicht: rechts = −x (Fisch blickt +z, seine rechte Seite = −x)
  const ly = Math.sin(ang) * BOWL_WHEEL.r;
  const t = BOWL_WHEEL.tilt;
  return [cx + lx, cy + ly * Math.cos(t), cz + ly * Math.sin(t)];
};

/** Bewegungen des Goldfischs. turnDeg = Lenkwinkel (Wert turn), time = Sekunden seit Beginn der Bewegung */
export const goldfishPose = (motion: Motion, time: number, turnDeg = 0, inCar = false): FishPose => {
  const p = rest();
  const wag = Math.sin(time * 9);
  p.tail = 0.35 * wag;
  p.finL = 0.35 * Math.sin(time * 7);
  p.finR = 0.35 * Math.sin(time * 7 + 1.4);
  p.blinkEye = (time % 3.7) > 3.55 ? 1 : 0;
  const steer = (turnDeg * Math.PI) / 180;
  switch (motion) {
    case 'steer':
    case 'fishblink': {
      // nah an der Vorderseite, leicht oben, Flossen über den Rand an den Lenkradkranz
      p.pos = [0, 0.3 + 0.006 * Math.sin(time * 2.1), 0.05];
      p.pitch = -0.12;
      p.tail = 0.25 * wag;
      p.focus = 1;
      p.mouth = 0.08;
      p.roll = -steer * 0.25;
      p.yaw = steer * 0.15;
      p.tipL = wheelPoint(Math.PI / 2 + 0.75, steer);
      p.tipR = wheelPoint(Math.PI / 2 - 0.75, steer);
      if (motion === 'fishblink') {
        // linke Flosse drückt den Blinkerhebel hoch (0,25–0,6 s), dann zurück ans Lenkrad (bis 1,0 s)
        const go = easeInOut(clamp((time - 0.05) / 0.25));
        const back = easeInOut(clamp((time - 0.75) / 0.3));
        const press = clamp((time - 0.3) / 0.25);
        const lever: [number, number, number] = [BOWL_LEVER[0], BOWL_LEVER[1] + 0.03 * press, BOWL_LEVER[2]];
        const k = go * (1 - back);
        p.tipL = p.tipL.map((v, i) => v + (lever[i] - v) * k) as [number, number, number];
        p.yaw = 0.18 * k;
      }
      return p;
    }
    case 'fishback': {
      // dreht sich im Glas um und schaut konzentriert nach hinten (Rückwärts einparken), rechte Flosse bleibt am Lenkrad
      const k = easeInOut(clamp(time / 0.6));
      p.pos = [0, 0.3, 0.03];
      p.yaw = Math.PI * 0.82 * k;
      p.pitch = -0.1;
      p.focus = 1;
      p.mouth = 0.05;
      p.tipR = wheelPoint(Math.PI / 2 - 0.6, steer);
      return p;
    }
    case 'fisheat': {
      // an die Oberfläche, schnappt Flocken
      const up = easeInOut(clamp(time / 0.5));
      p.pos = [0.03 * Math.sin(time * 1.7), FISH_Y + 0.13 * up, 0.02];
      p.pitch = -0.55 * up;
      const snap = Math.max(0, Math.sin(time * 11));
      p.mouth = 0.15 + 0.85 * snap * up;
      p.focus = -0.4;
      p.smile = 0.6;
      p.tail = 0.5 * Math.sin(time * 12);
      return p;
    }
    case 'fishguard':
    case 'fishpunch': {
      const bob = Math.abs(Math.sin(time * 4.6));
      p.pos = [0, 0.28 + 0.02 * bob, 0.02];
      p.pitch = -0.08;
      p.focus = 1;
      p.mouth = 0.05;
      const guardL: [number, number, number] = [0.07, 0.4, 0.17];
      const guardR: [number, number, number] = [-0.07, 0.39, 0.17];
      p.tipL = guardL;
      p.tipR = guardR;
      if (motion === 'fishpunch') {
        const c = (time % 0.5) / 0.5;
        const left = Math.floor(time / 0.5) % 2 === 0;
        const jab = Math.sin(Math.PI * clamp(c / 0.55));
        const out: [number, number, number] = [0, 0.4, 0.34];
        if (left) p.tipL = guardL.map((v, i) => v + (out[i] + 0.02 - v) * jab) as [number, number, number];
        else p.tipR = guardR.map((v, i) => v + (out[i] - 0.02 - v) * jab) as [number, number, number];
        p.yaw = (left ? -0.18 : 0.18) * jab;
        p.mouth = 0.05 + 0.25 * jab;
      }
      return p;
    }
    case 'fishhappy': {
      p.pos = [0.03 * Math.sin(time * 2), FISH_Y + 0.02 * Math.sin(time * 4), 0.03];
      p.roll = 0.18 * Math.sin(time * 5);
      p.yaw = 0.2 * Math.sin(time * 2.4);
      p.focus = -0.8;
      p.smile = 1;
      p.mouth = 0.1;
      p.tail = 0.55 * Math.sin(time * 13);
      if (inCar) {
        // zufrieden fahren: Flossen bleiben am Lenkrad
        p.pos = [0, 0.3 + 0.01 * Math.sin(time * 4), 0.05];
        p.roll = 0.08 * Math.sin(time * 5);
        p.yaw = 0.08 * Math.sin(time * 2.4);
        p.tipL = wheelPoint(Math.PI / 2 + 0.75, steer);
        p.tipR = wheelPoint(Math.PI / 2 - 0.75, steer);
      }
      return p;
    }
    default: {
      // fishswim: ruhig im Glas
      p.pos = [0.04 * Math.sin(time * 0.9), FISH_Y + 0.02 * Math.sin(time * 1.6), 0.02 * Math.sin(time * 0.7)];
      p.yaw = 0.35 * Math.sin(time * 0.6);
      p.focus = 0.4;
      return p;
    }
  }
};

/** Flosse als flaches, spitz zulaufendes Blatt von a nach b (Welt = System des Glases) */
const FinBlade = ({a, b, mat, w = 0.05}: {a: THREE.Vector3; b: THREE.Vector3; mat: THREE.Material; w?: number}) => {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const len = Math.max(0.001, a.distanceTo(b));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return (
    <mesh material={mat} position={mid} quaternion={q} castShadow>
      <cylinderGeometry args={[w * 0.35, w * 0.6, len, 5]} />
    </mesh>
  );
};

/** Der Fisch selbst (Ursprung = Körpermitte, blickt +z, ca. 0,26 m lang) */
const FishBody = ({pose, mats, time}: {pose: FishPose; mats: ReturnType<typeof useFishMats>; time: number}) => {
  const brow = 0.35 * pose.focus;
  const lid = pose.blinkEye ? 1 : clamp(pose.focus * 0.35);
  return (
    <group>
      {/* Körper */}
      <mesh material={mats.body} scale={[0.075, 0.085, 0.12]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
      </mesh>
      {/* Bauch heller */}
      <mesh material={mats.belly} position={[0, -0.03, 0.015]} scale={[0.06, 0.05, 0.09]}>
        <icosahedronGeometry args={[1, 1]} />
      </mesh>
      {/* Schuppen-Akzente */}
      {[-1, 1].map((s) =>
        [0, 1, 2].map((i) => (
          <mesh key={`${s}${i}`} material={mats.scale} position={[s * 0.066, 0.02 - i * 0.012, 0.03 - i * 0.04]} rotation={[0, s * 0.5, 0]}>
            <circleGeometry args={[0.018, 5]} />
          </mesh>
        )),
      )}
      {/* Schwanzflosse (wedelt) */}
      <group position={[0, 0.005, -0.11]} rotation={[0, pose.tail, 0]}>
        {[1, -1].map((s) => (
          <mesh key={s} material={mats.fin} position={[0, s * 0.04, -0.06]} rotation={[s * 0.55, 0, 0]} scale={[0.012, 0.03, 0.075]} castShadow>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        ))}
      </group>
      {/* Rückenflosse */}
      <mesh material={mats.fin} position={[0, 0.09, -0.01]} rotation={[0.35, 0, 0]} scale={[0.01, 0.04, 0.06]}>
        <icosahedronGeometry args={[1, 0]} />
      </mesh>
      {/* Augen: groß, weiß, schwarze Pupille, Augenbrauen schräg = konzentriert */}
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.048, 0.035, 0.075]} rotation={[0, s * 0.45, 0]}>
          <mesh material={mats.eye} scale={[0.032, 0.036, 0.022]}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          <mesh material={mats.pupil} position={[s * -0.004, -0.002 + 0.002 * Math.sin(time * 0.7), 0.02]} scale={[0.017, 0.02, 0.008]}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
          <mesh material={mats.glint} position={[s * -0.008, 0.008, 0.027]} scale={0.005}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
          {/* Lid (halb zu bei Konzentration / beim Blinzeln) */}
          {lid > 0.02 && (
            <mesh material={mats.body} position={[0, 0.036 - 0.03 * lid, 0.012]} scale={[0.034, 0.012 + 0.024 * lid, 0.02]}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
          )}
          {/* Augenbraue */}
          <mesh material={mats.brow} position={[0, 0.045 - Math.max(0, brow) * 0.012, 0.012]} rotation={[0, 0, s * brow]}>
            <boxGeometry args={[0.042, 0.008, 0.012]} />
          </mesh>
        </group>
      ))}
      {/* Mund */}
      <group position={[0, -0.012, 0.118]}>
        <mesh material={mats.mouth} scale={[0.02, 0.006 + 0.016 * pose.mouth, 0.006]}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
        <mesh material={mats.lip} rotation={[0, 0, 0]} scale={[1, 0.5 + pose.mouth * 0.8, 1]}>
          <torusGeometry args={[0.021, 0.006, 4, 10]} />
        </mesh>
        {pose.smile > 0.05 && (
          <mesh material={mats.mouth} position={[0, -0.006, 0.004]} rotation={[0, 0, Math.PI]} scale={[1, 0.6 * pose.smile, 1]}>
            <torusGeometry args={[0.016, 0.004, 3, 8, Math.PI]} />
          </mesh>
        )}
      </group>
    </group>
  );
};

const useFishMats = () =>
  useMemo(
    () => ({
      body: std(ORANGE, {roughness: 0.35}),
      belly: std('#ffc066', {roughness: 0.4}),
      scale: new THREE.MeshStandardMaterial({color: ORANGE_D, roughness: 0.4, flatShading: true, side: THREE.DoubleSide}),
      fin: new THREE.MeshStandardMaterial({color: FIN, roughness: 0.3, flatShading: true, transparent: true, opacity: 0.88}),
      eye: std('#ffffff', {roughness: 0.2}),
      pupil: std('#111214', {roughness: 0.2}),
      glint: new THREE.MeshBasicMaterial({color: '#ffffff'}),
      brow: std('#5a2a08'),
      mouth: std('#5b1d10'),
      lip: std('#ff6f3c'),
      glass: new THREE.MeshStandardMaterial({color: '#dff3fb', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide}),
      rim: new THREE.MeshStandardMaterial({color: '#e9f7fc', roughness: 0.1, transparent: true, opacity: 0.55}),
      water: new THREE.MeshStandardMaterial({color: '#6cc6ee', roughness: 0.1, transparent: true, opacity: 0.32, depthWrite: false}),
      surface: new THREE.MeshStandardMaterial({color: '#bfeaff', roughness: 0.05, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide}),
      belt: std('#2d3138', {roughness: 0.8}),
      buckle: std('#c9ccd0', {metalness: 0.6, roughness: 0.3}),
      cushion: std('#2f6fd6', {roughness: 0.8}),
    }),
    [],
  );

const PEBBLE_COLS = ['#f27d52', '#f5c242', '#5fbfa3', '#7a8cf0', '#f2f2ea', '#e65f8e'];
const FLAKE_COLS = ['#e8442f', '#f59a23', '#f6d23a', '#7cc04a', '#c6532b'];

/** Goldfisch im runden Glas (Ursprung = Glasboden). */
export const GoldfishBowl = ({
  pose,
  belt = 0,
  gloves = 0,
  food = 0,
  time,
}: {
  pose: FishPose;
  belt?: number;
  gloves?: number;
  food?: number;
  time: number;
}) => {
  const m = useFishMats();
  const geos = useMemo(() => {
    const R = BOWL_R;
    const open = 0.5; // Öffnung oben (Polwinkel)
    const glass = new THREE.SphereGeometry(R, 24, 16, 0, Math.PI * 2, open, Math.PI - open - 0.28);
    const water = new THREE.SphereGeometry(R - 0.006, 22, 14, 0, Math.PI * 2, 0.62, Math.PI - 0.62 - 0.3);
    const r = rng(17);
    const pebbles = Array.from({length: 26}, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.15;
      return {pos: [Math.cos(a) * d, 0.035 + r() * 0.012, Math.sin(a) * d] as [number, number, number], s: 0.012 + r() * 0.01, c: PEBBLE_COLS[Math.floor(r() * PEBBLE_COLS.length)]};
    });
    const flakes = Array.from({length: 14}, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.15;
      return {x: Math.cos(a) * d, z: Math.sin(a) * d, rot: r() * 6, c: FLAKE_COLS[Math.floor(r() * FLAKE_COLS.length)]};
    });
    return {glass, water, pebbles, flakes, rimY: R + R * Math.cos(open), rimR: R * Math.sin(open), waterY: R + (R - 0.006) * Math.cos(0.62), waterR: (R - 0.006) * Math.sin(0.62)};
  }, []);
  const pebbleMats = useMemo(() => Object.fromEntries(PEBBLE_COLS.map((c) => [c, std(c, {roughness: 0.5})])), []);
  const flakeMats = useMemo(() => Object.fromEntries(FLAKE_COLS.map((c) => [c, new THREE.MeshStandardMaterial({color: c, roughness: 0.7, side: THREE.DoubleSide})])), []);
  const R = BOWL_R;
  const fishM = new THREE.Matrix4().compose(
    new THREE.Vector3(...pose.pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.pitch, pose.yaw, pose.roll, 'YXZ')),
    new THREE.Vector3(1, 1, 1),
  );
  // Flossenwurzeln in Glas-Koordinaten
  const root = (s: number) => new THREE.Vector3(s * 0.07, -0.02, 0.03).applyMatrix4(fishM);
  const freeTip = (s: number, flap: number) => new THREE.Vector3(s * (0.12 + 0.02 * Math.sin(flap)), -0.05 + 0.03 * Math.sin(flap), 0.0).applyMatrix4(fishM);
  const tipL = pose.tipL ? new THREE.Vector3(...pose.tipL) : freeTip(1, pose.finL);
  const tipR = pose.tipR ? new THREE.Vector3(...pose.tipR) : freeTip(-1, pose.finR);
  const nFood = Math.round(clamp(food) * geos.flakes.length);
  return (
    <group>
      {/* Glas + Rand + Standfläche */}
      <mesh geometry={geos.glass} material={m.glass} position={[0, R, 0]} renderOrder={3} />
      <mesh material={m.rim} position={[0, geos.rimY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[geos.rimR, 0.012, 5, 24]} />
      </mesh>
      <mesh material={m.rim} position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.12, 0.13, 0.024, 18]} />
      </mesh>
      {/* Wasser (Glas ist immer voll) */}
      <mesh geometry={geos.water} material={m.water} position={[0, R, 0]} renderOrder={1} />
      <mesh material={m.surface} position={[0, geos.waterY, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <circleGeometry args={[geos.waterR, 22]} />
      </mesh>
      {/* Kies */}
      {geos.pebbles.map((pb, i) => (
        <mesh key={i} material={pebbleMats[pb.c]} position={pb.pos} scale={pb.s}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      {/* Futterflocken auf dem Wasser */}
      {geos.flakes.slice(0, nFood).map((f, i) => (
        <mesh key={i} material={flakeMats[f.c]} position={[f.x + 0.005 * Math.sin(time * 1.3 + i), geos.waterY + 0.004, f.z]} rotation={[-Math.PI / 2, 0, f.rot + time * 0.2]}>
          <planeGeometry args={[0.022, 0.016]} />
        </mesh>
      ))}
      {/* Fisch */}
      <group matrix={fishM} matrixAutoUpdate={false}>
        <FishBody pose={pose} mats={m} time={time} />
      </group>
      {/* Brustflossen (frei oder am Ziel, z. B. Lenkrad) */}
      <FinBlade a={root(1)} b={tipL} mat={m.fin} />
      <FinBlade a={root(-1)} b={tipR} mat={m.fin} />
      {gloves > 0.5 &&
        [tipL, tipR].map((t, i) => (
          <group key={i} position={t} rotation={[Math.PI / 2 + 0.3, 0, 0]}>
            <group position={[0, 0.028, 0]}>
              <BoxingGlove s={0.42} />
            </group>
          </group>
        ))}
      {/* Sicherheitsgurt quer über das Glas (im Auto) */}
      {belt > 0.5 && (
        <group>
          <group position={[0, R + 0.02, 0]} rotation={[0, 0, -0.75]}>
            <mesh material={m.belt} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[R + 0.012, 0.016, 3, 26, Math.PI]} />
            </mesh>
          </group>
          {/* Gurtband zur Säule (oben links) + Schloss (unten rechts) */}
          <FinBlade a={new THREE.Vector3(0.18, 0.43, 0.04)} b={new THREE.Vector3(0.44, 0.62, -0.28)} mat={m.belt} w={0.06} />
          {/* Sitzerhöhung (blaues Kissen) */}
          <mesh material={m.cushion} position={[0, -0.13, -0.02]} castShadow>
            <boxGeometry args={[0.44, 0.26, 0.46]} />
          </mesh>
          <mesh material={m.buckle} position={[-0.19, 0.08, 0.05]}>
            <boxGeometry args={[0.05, 0.05, 0.03]} />
          </mesh>
        </group>
      )}
      {/* Luftblasen im Glas */}
      {[0, 1, 2].map((i) => {
        const c = ((time * 0.35 + i / 3) % 1);
        return (
          <mesh key={i} material={m.rim} position={[0.08 - i * 0.07, 0.06 + c * (geos.waterY - 0.08), -0.08 + 0.03 * i]} scale={0.008 + 0.004 * c}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Aquarium (Objekt)
// ---------------------------------------------------------------------------------------------
export const AQ = {w: 0.9, h: 0.5, d: 0.42};

/** Plastikpflanze: Stiel mit gezackten Blättern, Ursprung = Fuß. h = Höhe */
export const PlasticPlant = ({h = 1, color = '#3fcf5a', seed = 1}: {h?: number; color?: string; seed?: number}) => {
  const leaves = useMemo(() => {
    const r = rng(seed * 13 + 5);
    return Array.from({length: 7}, (_, i) => ({y: (0.18 + i * 0.12) * h, rot: r() * 6.28, tilt: 0.6 + r() * 0.5, l: (0.35 - i * 0.025) * h}));
  }, [h, seed]);
  const mats = useMemo(() => ({leaf: std(color, {roughness: 0.25}), stem: std('#2e8f40', {roughness: 0.3}), base: std('#4a4d55', {roughness: 0.5})}), [color]);
  return (
    <group>
      <mesh material={mats.base} position={[0, 0.03 * h, 0]}>
        <cylinderGeometry args={[0.08 * h, 0.1 * h, 0.06 * h, 7]} />
      </mesh>
      <mesh material={mats.stem} position={[0, 0.5 * h, 0]}>
        <cylinderGeometry args={[0.012 * h, 0.018 * h, 1.0 * h, 5]} />
      </mesh>
      {leaves.map((lf, i) => (
        <group key={i} position={[0, lf.y, 0]} rotation={[0, lf.rot, 0]}>
          <mesh material={mats.leaf} position={[lf.l * 0.45, lf.l * 0.2, 0]} rotation={[0, 0, -lf.tilt]} scale={[lf.l * 0.5, 0.012 * h + 0.004, lf.l * 0.16]}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        </group>
      ))}
      <mesh material={mats.leaf} position={[0, 1.02 * h, 0]} scale={[0.05 * h, 0.12 * h, 0.05 * h]}>
        <icosahedronGeometry args={[1, 0]} />
      </mesh>
    </group>
  );
};

/** Kleine Taucherfigur (Aquarium-Deko): Messinghelm mit Bullaugen, Anzug, schwere Schuhe. Ursprung = Füße, Höhe ca. h */
export const DiverFigure = ({h = 1, bubbles = 0, time = 0}: {h?: number; bubbles?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      suit: std('#c9b27a', {roughness: 0.7}),
      brass: std('#d9a53a', {metalness: 0.55, roughness: 0.3}),
      glass: std('#2b3b4a', {roughness: 0.1, metalness: 0.3}),
      boot: std('#3b3430'),
      base: std('#6b5a48'),
      bub: new THREE.MeshStandardMaterial({color: '#e8f8ff', roughness: 0.05, transparent: true, opacity: 0.6}),
    }),
    [],
  );
  return (
    <group scale={h}>
      <mesh material={m.base} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.06, 8]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={m.boot} position={[s * 0.07, 0.1, 0.02]}>
            <boxGeometry args={[0.1, 0.09, 0.16]} />
          </mesh>
          <mesh material={m.suit} position={[s * 0.07, 0.3, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.32, 6]} />
          </mesh>
          <mesh material={m.suit} position={[s * 0.17, 0.62, 0.03]} rotation={[-0.4, 0, s * 0.35]}>
            <cylinderGeometry args={[0.045, 0.05, 0.3, 6]} />
          </mesh>
          <mesh material={m.brass} position={[s * 0.21, 0.48, 0.09]}>
            <icosahedronGeometry args={[0.05, 0]} />
          </mesh>
        </group>
      ))}
      <mesh material={m.suit} position={[0, 0.62, 0]} scale={[1, 1.05, 0.8]}>
        <cylinderGeometry args={[0.15, 0.13, 0.36, 7]} />
      </mesh>
      <mesh material={m.brass} position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.16, 0.17, 0.06, 10]} />
      </mesh>
      <mesh material={m.brass} position={[0, 0.98, 0]}>
        <icosahedronGeometry args={[0.15, 1]} />
      </mesh>
      {[
        [0, 0.99, 0.13, 0.065],
        [0.13, 0.99, 0.0, 0.045],
        [-0.13, 0.99, 0.0, 0.045],
      ].map(([x, y, z, r], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, Math.atan2(x, z), 0]}>
          <mesh material={m.brass} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.014, 4, 12]} />
          </mesh>
          <mesh material={m.glass} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r, r, 0.012, 12]} />
          </mesh>
        </group>
      ))}
      {bubbles > 0 &&
        [0, 1, 2, 3].map((i) => {
          const c = (time * 0.5 + i / 4) % 1;
          return (
            <mesh key={i} material={m.bub} position={[0.04 * Math.sin(i * 2 + time * 3), 1.15 + c * 1.6, 0.05]} scale={0.03 + 0.03 * c}>
              <icosahedronGeometry args={[1, 1]} />
            </mesh>
          );
        })}
    </group>
  );
};

/** Luftblasen-Pumpe: Sprudelstein + Schlauch, Blasensäule (h = Höhe der Säule) */
export const BubblePump = ({h = 0.4, s = 1, time}: {h?: number; s?: number; time: number}) => {
  const m = useMemo(
    () => ({
      stone: std('#8c8f96', {roughness: 0.9}),
      hose: std('#7fd8c8', {roughness: 0.3, transparent: true, opacity: 0.85}),
      bub: new THREE.MeshStandardMaterial({color: '#f0fbff', roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.55}),
    }),
    [],
  );
  const N = 14;
  return (
    <group scale={s}>
      <mesh material={m.stone} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.04, 8]} />
      </mesh>
      <mesh material={m.hose} position={[-0.05, 0.02, -0.06]} rotation={[0.9, 0, 0.5]}>
        <cylinderGeometry args={[0.008, 0.008, 0.16, 5]} />
      </mesh>
      {Array.from({length: N}, (_, i) => {
        const c = (time * 0.55 + i / N) % 1;
        const x = 0.02 * Math.sin(i * 1.7 + time * 4 + c * 5);
        return (
          <mesh key={i} material={m.bub} position={[x, 0.05 + c * h / s, 0.015 * Math.cos(i * 2.3 + time * 3)]} scale={0.009 + 0.012 * c + 0.004 * ((i * 7) % 3)}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Aquarium-Becken (Ursprung = Boden-Mitte, Vorderseite +z) */
export const Aquarium = ({time}: {time: number}) => {
  const {w, h, d} = AQ;
  const m = useMemo(
    () => ({
      glass: new THREE.MeshStandardMaterial({color: '#dff3fb', roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide}),
      frame: std('#23262b', {roughness: 0.5}),
      water: new THREE.MeshStandardMaterial({color: '#5cb8e6', roughness: 0.1, transparent: true, opacity: 0.3, depthWrite: false}),
      back: std('#2f6f9a', {roughness: 0.9}),
    }),
    [],
  );
  const pebbles = useMemo(() => {
    const r = rng(23);
    return Array.from({length: 70}, () => ({pos: [(r() - 0.5) * (w - 0.06), 0.03 + r() * 0.03, (r() - 0.5) * (d - 0.06)] as [number, number, number], s: 0.012 + r() * 0.012, c: PEBBLE_COLS[Math.floor(r() * PEBBLE_COLS.length)]}));
  }, [w, d]);
  const pebbleMats = useMemo(() => Object.fromEntries(PEBBLE_COLS.map((c) => [c, std(c, {roughness: 0.5})])), []);
  const wl = h * 0.9;
  return (
    <group>
      {/* Bodenplatte + Rahmen */}
      <mesh material={m.frame} position={[0, 0.012, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.03, 0.024, d + 0.03]} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} material={m.frame} position={[(sx * w) / 2, h / 2, (sz * d) / 2]}>
            <boxGeometry args={[0.022, h, 0.022]} />
          </mesh>
        )),
      )}
      <mesh material={m.frame} position={[0, h, d / 2]}>
        <boxGeometry args={[w + 0.03, 0.022, 0.022]} />
      </mesh>
      <mesh material={m.frame} position={[0, h, -d / 2]}>
        <boxGeometry args={[w + 0.03, 0.022, 0.022]} />
      </mesh>
      {/* Rückwand-Folie */}
      <mesh material={m.back} position={[0, h / 2, -d / 2 + 0.004]}>
        <planeGeometry args={[w - 0.01, h - 0.01]} />
      </mesh>
      {/* Wasser + Glas */}
      <mesh material={m.water} position={[0, wl / 2 + 0.024, 0]} renderOrder={1}>
        <boxGeometry args={[w - 0.012, wl - 0.03, d - 0.012]} />
      </mesh>
      <mesh material={m.glass} position={[0, h / 2, 0]} renderOrder={3}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* Kies, Pflanzen, Taucher, Pumpe */}
      {pebbles.map((pb, i) => (
        <mesh key={i} material={pebbleMats[pb.c]} position={pb.pos} scale={pb.s}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      <group position={[-0.3, 0.04, -0.08]}>
        <PlasticPlant h={0.36} seed={1} />
      </group>
      <group position={[-0.18, 0.04, 0.06]}>
        <PlasticPlant h={0.24} seed={2} color="#7be04a" />
      </group>
      <group position={[0.32, 0.04, -0.1]}>
        <PlasticPlant h={0.32} seed={3} color="#e0559a" />
      </group>
      <group position={[0.1, 0.04, 0.0]}>
        <DiverFigure h={0.16} />
      </group>
      <group position={[0.26, 0.04, 0.08]}>
        <BubblePump h={wl - 0.08} time={time} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Fischfutter
// ---------------------------------------------------------------------------------------------
/** Dose Fischfutter ohne Marke (Ursprung = Dosenboden-Mitte, ca. 0,13 m hoch). sprinkle 0 … 1 = Flocken rieseln aus der Öffnung */
export const FoodCan = ({sprinkle = 0, time = 0}: {sprinkle?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      can: std('#2f86d6', {roughness: 0.4}),
      label: std('#ffd23a', {roughness: 0.5}),
      lid: std('#e8442f', {roughness: 0.4}),
      fish: std(ORANGE, {roughness: 0.4}),
      eye: std('#111214'),
    }),
    [],
  );
  const flakeMats = useMemo(() => FLAKE_COLS.map((c) => new THREE.MeshStandardMaterial({color: c, roughness: 0.7, side: THREE.DoubleSide})), []);
  return (
    <group>
      <mesh material={m.can} position={[0, 0.065, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.13, 12]} />
      </mesh>
      <mesh material={m.label} position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.0465, 0.0465, 0.07, 12, 1, true]} />
      </mesh>
      <mesh material={m.lid} position={[0, 0.135, 0]}>
        <cylinderGeometry args={[0.047, 0.047, 0.012, 12]} />
      </mesh>
      {/* einfacher Fisch auf dem Etikett (vorn +z) */}
      <group position={[0, 0.06, 0.047]}>
        <mesh material={m.fish} scale={[0.022, 0.014, 0.004]}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
        <mesh material={m.fish} position={[-0.026, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.012, 0.01, 0.003]}>
          <coneGeometry args={[1, 1, 3]} />
        </mesh>
        <mesh material={m.eye} position={[0.011, 0.003, 0.004]} scale={0.0035}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      </group>
      {sprinkle > 0.01 &&
        Array.from({length: 10}, (_, i) => {
          const c = (time * 1.6 + i / 10) % 1;
          return (
            <mesh
              key={i}
              material={flakeMats[i % flakeMats.length]}
              position={[0.02 * Math.sin(i * 3.1), 0.14 - c * 0.9, 0.06 + c * 0.18 + 0.02 * Math.cos(i * 1.3)]}
              rotation={[time * 5 + i, i, time * 3]}
              scale={sprinkle}
            >
              <planeGeometry args={[0.016, 0.012]} />
            </mesh>
          );
        })}
    </group>
  );
};

/** Spur aus Futterflocken (Welt-Koordinaten). points = [[x, z], …], fill = Anteil der Spur, pile = Häufchen am Ende */
export const FlakeTrail = ({points, fill = 1, pile = 0}: {points: [number, number][]; fill?: number; pile?: number}) => {
  const data = useMemo(() => {
    const r = rng(77);
    const segs: number[] = [0];
    for (let i = 1; i < points.length; i++) segs.push(segs[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const total = segs[segs.length - 1] || 1;
    const flakes: {x: number; z: number; rot: number; c: number; s: number; at: number}[] = [];
    const per = 16; // Flocken pro Meter
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1];
      const [bx, bz] = points[i];
      const len = segs[i] - segs[i - 1];
      const n = Math.max(1, Math.round(len * per));
      for (let k = 0; k < n; k++) {
        const u = (k + r()) / n;
        flakes.push({x: ax + (bx - ax) * u + (r() - 0.5) * 0.7, z: az + (bz - az) * u + (r() - 0.5) * 0.7, rot: r() * 6, c: Math.floor(r() * FLAKE_COLS.length), s: 0.6 + r() * 0.8, at: (segs[i - 1] + len * u) / total});
      }
    }
    const end = points[points.length - 1] ?? [0, 0];
    const heap = Array.from({length: 160}, () => {
      const a = r() * 6.28;
      const d = Math.sqrt(r()) * 0.55;
      return {x: end[0] + Math.cos(a) * d, z: end[1] + Math.sin(a) * d, y: 0.012 + (0.55 - d) * 0.5 * r(), rot: r() * 6, c: Math.floor(r() * FLAKE_COLS.length)};
    });
    return {flakes, heap};
  }, [points]);
  const mats = useMemo(() => FLAKE_COLS.map((c) => new THREE.MeshStandardMaterial({color: c, roughness: 0.7, side: THREE.DoubleSide})), []);
  const geo = useMemo(() => new THREE.PlaneGeometry(0.11, 0.075), []);
  return (
    <group>
      {data.flakes
        .filter((f) => f.at <= fill)
        .map((f, i) => (
          <mesh key={i} geometry={geo} material={mats[f.c]} position={[f.x, 0.014, f.z]} rotation={[-Math.PI / 2, 0, f.rot]} scale={f.s} />
        ))}
      {pile > 0.01 &&
        data.heap.map((f, i) => (
          <mesh key={`h${i}`} geometry={geo} material={mats[f.c]} position={[f.x, f.y * pile, f.z]} rotation={[-Math.PI / 2 + (f.rot % 0.8), 0, f.rot]} scale={pile} />
        ))}
    </group>
  );
};

// ---------------------------------------------------------------------------------------------
// Siegerpreis: Autoschlüssel auf Podest
// ---------------------------------------------------------------------------------------------
/** Autoschlüssel ohne Logo (Ursprung = Mitte), dreht sich langsam, glow = funkeln */
export const CarKey = ({glow = 0, time}: {glow?: number; time: number}) => {
  const m = useMemo(
    () => ({
      head: std('#25282d', {roughness: 0.4}),
      blade: std('#d7dadf', {metalness: 0.7, roughness: 0.25}),
      ring: std('#c9ccd0', {metalness: 0.7, roughness: 0.25}),
      fob: std('#3f9be0', {roughness: 0.35}),
      btn: std('#e9edf2', {roughness: 0.4}),
      spark: new THREE.MeshBasicMaterial({color: '#fff6c2'}),
    }),
    [],
  );
  return (
    <group rotation={[0, time * 0.9, 0]}>
      <group rotation={[0, 0, 0.25]}>
        <mesh material={m.head} position={[0, 0, 0]} scale={[1, 1.15, 0.45]} castShadow>
          <icosahedronGeometry args={[0.07, 0]} />
        </mesh>
        <mesh material={m.btn} position={[0, 0.02, 0.03]}>
          <boxGeometry args={[0.03, 0.02, 0.01]} />
        </mesh>
        <mesh material={m.btn} position={[0, -0.02, 0.03]}>
          <boxGeometry args={[0.03, 0.02, 0.01]} />
        </mesh>
        <mesh material={m.blade} position={[0, -0.16, 0]}>
          <boxGeometry args={[0.035, 0.2, 0.012]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={m.blade} position={[0.02, -0.11 - i * 0.05, 0]}>
            <boxGeometry args={[0.012, 0.02, 0.012]} />
          </mesh>
        ))}
        <mesh material={m.ring} position={[0, 0.11, 0]}>
          <torusGeometry args={[0.04, 0.007, 5, 14]} />
        </mesh>
        <group position={[0.07, 0.15, 0]} rotation={[0, 0, -0.5]}>
          <mesh material={m.fob} scale={[0.6, 1, 0.35]}>
            <icosahedronGeometry args={[0.05, 0]} />
          </mesh>
        </group>
      </group>
      {glow > 0.01 &&
        [0, 1, 2, 3, 4].map((i) => {
          const c = (time * 0.8 + i / 5) % 1;
          const a = i * 1.26 + time * 0.5;
          return (
            <mesh key={i} material={m.spark} position={[Math.cos(a) * 0.2, -0.05 + c * 0.25, Math.sin(a) * 0.2]} scale={0.022 * glow * Math.sin(Math.PI * c)} rotation={[0, 0, Math.PI / 4]}>
              <octahedronGeometry args={[1, 0]} />
            </mesh>
          );
        })}
    </group>
  );
};

/** Kleines Siegerpodest (Ursprung = Boden-Mitte), Oberseite PODIUM_H × (1 + size) */
export const Podium = ({size = 0}: {size?: number}) => {
  const m = useMemo(() => ({red: std('#d8392b', {roughness: 0.5}), gold: std('#f2c230', {metalness: 0.4, roughness: 0.35}), white: std('#f4f2ec')}), []);
  const H = PODIUM_H * (1 + size);
  return (
    <group>
      <mesh material={m.red} position={[0, H / 2 - 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.28, H - 0.04, 10]} />
      </mesh>
      <mesh material={m.gold} position={[0, H - 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.27, 0.27, 0.04, 10]} />
      </mesh>
      <mesh material={m.gold} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 10]} />
      </mesh>
      <mesh material={m.white} position={[0, H * 0.55, 0]}>
        <cylinderGeometry args={[0.262, 0.262, 0.05, 10, 1, true]} />
      </mesh>
    </group>
  );
};
