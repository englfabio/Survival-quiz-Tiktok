import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, rng} from '../lib/anim';
import {T} from '../ui/theme';

/**
 * Erste-Hilfe-Objekte (Zombie-Biss-Video), alle wiederverwendbar:
 * - Pflaster (PlasterStrip), Desinfektionsspray (SprayBottle + SprayMist), sterile Kompresse (CompressPad),
 *   Impfpass (VaccinationPass), Verbandskasten (FirstAidKit) – klein, können auch in der Hand gehalten werden
 *   (Dummy: Bewegungen applyplaster, disinfect, compress, showpass – Gegenstand erscheint automatisch).
 * - Waschbecken mit Wasserhahn (Sink): "flow" = Wasser läuft.
 * - Wandkalender (WallCalendar): "flip" = Kalenderblätter reißen ab und fliegen weg (immer schneller).
 * - Wanduhr (WallClock): "spin" = Zeiger rasen (Zeitraffer).
 * Low-Poly, flache Schattierung. Maße in Metern.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

// ---------- kleine Gegenstände ----------
export const PlasterStrip = () => {
  const m = useMemo(() => ({skin: std('#e2b78f', {roughness: 0.8}), pad: std('#f6f1ea', {roughness: 0.9})}), []);
  return (
    <group>
      <mesh material={m.skin} castShadow>
        <boxGeometry args={[0.085, 0.004, 0.03]} />
      </mesh>
      <mesh material={m.pad} position={[0, 0.003, 0]}>
        <boxGeometry args={[0.032, 0.003, 0.026]} />
      </mesh>
    </group>
  );
};

/** Sprühflasche, Sprühkopf zeigt nach +z */
export const SprayBottle = () => {
  const m = useMemo(
    () => ({body: std('#f4f7fa', {roughness: 0.35}), cap: std('#2c7fd0', {roughness: 0.4}), label: std('#2f9d57'), white: std('#ffffff')}),
    [],
  );
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Flasche steht entlang −y → nach Drehung entlang −z, Kopf vorn (+z) */}
      <group rotation={[Math.PI, 0, 0]}>
        <mesh material={m.body} position={[0, -0.05, 0]} castShadow>
          <cylinderGeometry args={[0.026, 0.028, 0.12, 10]} />
        </mesh>
        <mesh material={m.label} position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.0285, 0.0285, 0.05, 10]} />
        </mesh>
        <mesh material={m.cap} position={[0, 0.025, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.024, 0.035, 8]} />
        </mesh>
        <mesh material={m.cap} position={[0, 0.048, 0.008]}>
          <boxGeometry args={[0.02, 0.014, 0.03]} />
        </mesh>
      </group>
    </group>
  );
};

/** Sprühnebel entlang +z (von 0 bis length), amount 0 … 1 */
export const SprayMist = ({amount, length, time, color = '#e8f6ff', spread = 0.05, grain = 1}: {amount: number; length: number; time: number; color?: string; spread?: number; grain?: number}) => {
  const seeds = useMemo(() => {
    const r = rng(77);
    return Array.from({length: 26}, () => ({u: r(), a: r() * Math.PI * 2, s: 0.5 + r() * 0.7, sp: 0.7 + r() * 0.6}));
  }, []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({color, transparent: true, depthWrite: false}),
    [color],
  );
  if (amount < 0.02) return null;
  mat.opacity = Math.min(0.9, 0.55 * amount);
  return (
    <group>
      {seeds.map((p, i) => {
        const u = (p.u + time * 2.2 * p.sp) % 1;
        const z = 0.04 + u * length;
        const sp = 0.008 + u * spread;
        return (
          <mesh key={i} material={mat} position={[Math.cos(p.a) * sp, Math.sin(p.a) * sp, z]} scale={(0.006 + u * 0.016) * p.s * grain}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        );
      })}
    </group>
  );
};

export const CompressPad = () => {
  const m = useMemo(() => ({pad: std('#fbfbfb', {roughness: 1}), pack: std('#d9ecf7', {roughness: 0.5})}), []);
  return (
    <group>
      <mesh material={m.pad} castShadow>
        <boxGeometry args={[0.075, 0.006, 0.075]} />
      </mesh>
    </group>
  );
};

/** Zeichnet die Innenseite des Impfpasses */
const passTexture = () => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 360;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbf6e2';
  g.fillRect(0, 0, 512, 360);
  g.fillStyle = '#c9a52c';
  g.fillRect(254, 0, 4, 360);
  g.strokeStyle = '#b9b2a0';
  g.lineWidth = 3;
  for (const x0 of [24, 280]) {
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.moveTo(x0, 70 + k * 48);
      g.lineTo(x0 + 208, 70 + k * 48);
      g.stroke();
    }
  }
  g.fillStyle = '#3d4a7a';
  g.font = `700 30px ${T.font}`;
  g.fillText('Tetanus', 30, 58);
  g.fillText('Tetanus', 286, 58);
  // Stempel (blau) + Haken (grün)
  g.strokeStyle = '#3156b8';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(120, 200, 52, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = '#2e9b4f';
  g.lineWidth = 14;
  g.beginPath();
  g.moveTo(330, 200);
  g.lineTo(365, 240);
  g.lineTo(440, 150);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const passCover = () => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 360;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f2c81e';
  g.fillRect(0, 0, 256, 360);
  g.fillStyle = '#5a4a12';
  g.font = `800 44px ${T.font}`;
  g.textAlign = 'center';
  g.fillText('IMPF-', 128, 150);
  g.fillText('PASS', 128, 196);
  g.strokeStyle = '#5a4a12';
  g.lineWidth = 6;
  g.strokeRect(40, 230, 176, 80);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/**
 * Impfpass (gelbes Heft, ca. 10 × 14 cm). open: 0 = zu, 1 = ganz aufgeklappt.
 * Aufgeschlagen sieht man „Tetanus“-Zeilen mit Stempel und grünem Haken. Liegt in der x-y-Ebene, Vorderseite +z.
 */
export const VaccinationPass = ({open = 0}: {open?: number}) => {
  const m = useMemo(() => {
    const inside = passTexture();
    const cover = passCover();
    return {
      cover: new THREE.MeshStandardMaterial({map: cover, roughness: 0.7}),
      yellow: std('#f2c81e', {roughness: 0.7}),
      inside: new THREE.MeshStandardMaterial({map: inside, roughness: 0.9, side: THREE.DoubleSide}),
      page: std('#fbf6e2', {roughness: 0.9}),
    };
  }, []);
  const a = clamp(open) * Math.PI * 0.95;
  return (
    <group>
      {open < 0.05 ? (
        <group>
          <mesh material={m.yellow} castShadow>
            <boxGeometry args={[0.1, 0.14, 0.008]} />
          </mesh>
          <mesh material={m.cover} position={[0, 0, 0.0042]}>
            <planeGeometry args={[0.1, 0.14]} />
          </mesh>
        </group>
      ) : (
        <group>
          {/* rechte Hälfte fest, linke klappt um die Mitte auf */}
          <mesh material={m.yellow} position={[0.05, 0, -0.002]} castShadow>
            <boxGeometry args={[0.1, 0.14, 0.004]} />
          </mesh>
          <mesh material={m.inside} position={[0.05, 0, 0.0005]}>
            <planeGeometry args={[0.1, 0.14]} />
          </mesh>
          <group rotation={[0, -Math.PI + a, 0]}>
            <mesh material={m.yellow} position={[0.05, 0, -0.002]} castShadow>
              <boxGeometry args={[0.1, 0.14, 0.004]} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

/** Verbandskasten (weiß mit grünem Kreuz), ca. 30 × 20 × 10 cm */
export const FirstAidKit = () => {
  const m = useMemo(() => ({box: std('#f3f5f6', {roughness: 0.5}), green: std('#22a35a'), handle: std('#9aa3a8')}), []);
  return (
    <group>
      <mesh material={m.box} position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.2, 0.11]} />
      </mesh>
      <mesh material={m.green} position={[0, 0.1, 0.056]}>
        <boxGeometry args={[0.1, 0.03, 0.004]} />
      </mesh>
      <mesh material={m.green} position={[0, 0.1, 0.056]}>
        <boxGeometry args={[0.03, 0.1, 0.004]} />
      </mesh>
      <mesh material={m.handle} position={[0, 0.215, 0]}>
        <boxGeometry args={[0.1, 0.02, 0.025]} />
      </mesh>
    </group>
  );
};

// ---------- Waschbecken ----------
/**
 * Waschtisch mit Unterschrank, Becken und Wasserhahn. Ursprung = Boden unter der Vorderkante-Mitte,
 * Vorderseite zeigt nach +z. Arbeitsplatte y = 0.86, Auslauf des Hahns bei (0, 1.25, −0.14).
 * flow = Wasser läuft (Strahl fällt bis zur Arbeitsplatten-Höhe ins Becken).
 */
export const SINK = {top: 0.86, spout: [0, 1.25, -0.14] as [number, number, number]};

export const Sink = ({flow, time}: {flow: boolean; time: number}) => {
  const m = useMemo(
    () => ({
      cab: std('#7f9fb6', {roughness: 0.55}),
      cabDark: std('#6a879c'),
      top: std('#eef1f3', {roughness: 0.3}),
      bowl: std('#ffffff', {roughness: 0.15}),
      chrome: new THREE.MeshStandardMaterial({color: '#dfe4e8', roughness: 0.15, metalness: 0.9, flatShading: true}),
      water: new THREE.MeshStandardMaterial({color: '#5ab8ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.8, emissive: '#3d9fe8', emissiveIntensity: 0.45}),
      drop: new THREE.MeshBasicMaterial({color: '#cdeeff', transparent: true, opacity: 0.85}),
    }),
    [],
  );
  const [sx, sy, sz] = SINK.spout;
  const fall = sy - (SINK.top - 0.05);
  const drops = useMemo(() => {
    const r = rng(9);
    return Array.from({length: 14}, () => ({a: r() * Math.PI * 2, sp: 0.6 + r() * 0.8, ph: r()}));
  }, []);
  return (
    <group>
      {/* Unterschrank */}
      <mesh material={m.cab} position={[0, 0.41, -0.27]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.82, 0.52]} />
      </mesh>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} material={m.cabDark} position={[x, 0.45, -0.005]}>
          <boxGeometry args={[0.4, 0.66, 0.012]} />
        </mesh>
      ))}
      {[-0.05, 0.05].map((x) => (
        <mesh key={x} material={m.chrome} position={[x, 0.62, 0.006]}>
          <boxGeometry args={[0.012, 0.14, 0.02]} />
        </mesh>
      ))}
      {/* Arbeitsplatte mit eingelassenem Becken */}
      <mesh material={m.top} position={[0, SINK.top - 0.02, -0.28]} castShadow receiveShadow>
        <boxGeometry args={[0.96, 0.04, 0.58]} />
      </mesh>
      <mesh material={m.bowl} position={[0, SINK.top + 0.005, -0.25]}>
        <cylinderGeometry args={[0.22, 0.17, 0.02, 16]} />
      </mesh>
      <mesh position={[0, SINK.top + 0.016, -0.25]}>
        <cylinderGeometry args={[0.19, 0.19, 0.004, 16]} />
        <meshStandardMaterial color="#d6e2ea" roughness={0.2} />
      </mesh>
      <mesh material={m.chrome} position={[0, SINK.top + 0.02, -0.25]}>
        <cylinderGeometry args={[0.025, 0.025, 0.004, 10]} />
      </mesh>
      {/* Wasserhahn: Säule, Bogen, Hebel */}
      <mesh material={m.chrome} position={[sx, SINK.top + 0.17, sz - 0.18]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.34, 10]} />
      </mesh>
      <mesh material={m.chrome} position={[sx, sy + 0.05, sz - 0.09]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
      </mesh>
      <mesh material={m.chrome} position={[sx, sy + 0.02, sz]} castShadow>
        <cylinderGeometry args={[0.022, 0.02, 0.06, 8]} />
      </mesh>
      <mesh material={m.chrome} position={[sx, SINK.top + 0.36, sz - 0.24]} rotation={[flow ? -0.5 : 0, 0, 0]}>
        <boxGeometry args={[0.02, 0.02, 0.12]} />
      </mesh>
      {/* Wasserstrahl + Tropfen im Becken */}
      {flow && (
        <group>
          <mesh material={m.water} position={[sx, sy - fall / 2, sz]}>
            <cylinderGeometry args={[0.02, 0.026, fall, 8, 1, true]} />
          </mesh>
          {[0, 1, 2, 3, 4].map((k) => {
            const u = (time * 2.4 + k / 5) % 1;
            return (
              <mesh key={k} material={m.water} position={[sx, sy - u * fall, sz]} scale={[1, 1.6, 1]}>
                <icosahedronGeometry args={[0.028, 0]} />
              </mesh>
            );
          })}
          {drops.map((d, i) => {
            const u = (time * d.sp * 2 + d.ph) % 1;
            const rad = 0.03 + u * 0.09;
            return (
              <mesh key={i} material={m.drop} position={[sx + Math.cos(d.a) * rad, SINK.top + 0.03 + Math.sin(u * Math.PI) * 0.06, sz + Math.sin(d.a) * rad * 0.7]} scale={0.008 * (1 - u * 0.5)}>
                <icosahedronGeometry args={[1, 0]} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

// ---------- Wandkalender ----------
const MONTHS = ['JANUAR', 'FEBRUAR', 'MÄRZ', 'APRIL', 'MAI', 'JUNI', 'JULI', 'AUGUST', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DEZEMBER'];
const pageCache = new Map<number, THREE.CanvasTexture>();
const pageTexture = (day: number) => {
  const hit = pageCache.get(day);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 300;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fdfcf8';
  g.fillRect(0, 0, 256, 300);
  g.fillStyle = '#d23a2c';
  g.fillRect(0, 0, 256, 74);
  g.fillStyle = '#ffffff';
  g.font = `800 46px ${T.font}`;
  g.textAlign = 'center';
  g.fillText(MONTHS[10], 128, 54);
  g.fillStyle = '#25282c';
  g.font = `800 170px ${T.font}`;
  g.fillText(String(((day - 1) % 30) + 1), 128, 250);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  pageCache.set(day, t);
  return t;
};

/** Zeitpunkte, an denen ein Blatt abreißt (Sekunden seit Beginn von "flip"): erst langsam, dann immer schneller */
const tearTimes = (() => {
  const out: number[] = [];
  let t = 0.25;
  let gap = 0.6;
  for (let i = 0; i < 40; i++) {
    out.push(t);
    gap = Math.max(0.16, gap * 0.86);
    t += gap;
  }
  return out;
})();

/**
 * Abreißkalender für die Wand, ca. 0,34 × 0,46 m. Ursprung = Mitte der Rückseite, Vorderseite +z.
 * flip = Blätter reißen ab und fliegen weg; startDay = erste Tageszahl.
 */
export const WallCalendar = ({flipTime, startDay = 11}: {flipTime: number; startDay?: number}) => {
  const m = useMemo(() => ({board: std('#5b4636', {roughness: 0.8}), ring: std('#c9cdd1', {metalness: 0.7, roughness: 0.3})}), []);
  const torn = flipTime > 0 ? tearTimes.filter((t) => t <= flipTime).length : 0;
  const flying = tearTimes
    .map((t, i) => ({t, i}))
    .filter(({t}) => flipTime > t && flipTime - t < 1.3)
    .map(({t, i}) => ({age: flipTime - t, day: startDay + i, i}));
  const W = 0.3;
  const H = 0.35;
  return (
    <group>
      <mesh material={m.board} position={[0, 0, 0.01]} castShadow>
        <boxGeometry args={[0.36, 0.48, 0.02]} />
      </mesh>
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} material={m.ring} position={[x, 0.2, 0.035]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.014, 0.004, 4, 8]} />
        </mesh>
      ))}
      {/* Block + aktuelles Blatt */}
      <mesh position={[0, -0.03, 0.03]}>
        <boxGeometry args={[W, H, 0.02]} />
        <meshStandardMaterial color="#efece4" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.03, 0.0405]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={pageTexture(startDay + torn)} roughness={0.9} />
      </mesh>
      {/* abgerissene Blätter fliegen nach vorn/zur Seite und fallen */}
      {flying.map(({age, day, i}) => {
        const side = i % 2 ? 1 : -1;
        const x = side * (0.25 * age + 0.1 * age * age);
        const y = -0.03 + 0.35 * age - 1.1 * age * age;
        const z = 0.05 + 0.45 * age;
        return (
          <mesh key={day} position={[x, y, z]} rotation={[-1.6 * age, side * 2.2 * age, side * 1.2 * age]}>
            <planeGeometry args={[W, H]} />
            <meshStandardMaterial map={pageTexture(day)} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- Wanduhr ----------
/** Runde Wanduhr, Durchmesser 0,36 m, Vorderseite +z. spinTime > 0 = Zeiger rasen (Zeitraffer). */
export const WallClock = ({spinTime, time}: {spinTime: number; time: number}) => {
  const m = useMemo(() => ({rim: std('#2f3438', {roughness: 0.4}), face: std('#fbfaf5', {roughness: 0.6}), hand: std('#1d1f22'), red: std('#d23a2c')}), []);
  const minute = spinTime > 0 ? spinTime * 6 * (1 + spinTime * 0.4) : time * 0.01;
  const hour = minute / 12;
  return (
    <group>
      <mesh material={m.rim} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 24]} />
      </mesh>
      <mesh material={m.face} position={[0, 0, 0.041]}>
        <circleGeometry args={[0.16, 24]} />
      </mesh>
      {Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} material={m.hand} position={[Math.sin(a) * 0.135, Math.cos(a) * 0.135, 0.043]} rotation={[0, 0, -a]}>
            <boxGeometry args={[0.008, i % 3 ? 0.018 : 0.03, 0.002]} />
          </mesh>
        );
      })}
      <group position={[0, 0, 0.046]} rotation={[0, 0, -hour * Math.PI * 2 - 1.2]}>
        <mesh material={m.hand} position={[0, 0.045, 0]}>
          <boxGeometry args={[0.014, 0.09, 0.003]} />
        </mesh>
      </group>
      <group position={[0, 0, 0.049]} rotation={[0, 0, -minute * Math.PI * 2]}>
        <mesh material={m.hand} position={[0, 0.06, 0]}>
          <boxGeometry args={[0.009, 0.13, 0.003]} />
        </mesh>
      </group>
      <mesh material={m.red} position={[0, 0, 0.052]}>
        <circleGeometry args={[0.012, 10]} />
      </mesh>
    </group>
  );
};
