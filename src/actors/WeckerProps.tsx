import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {std} from '../stage/Rooms';
import {T} from '../ui/theme';
import {useFontTexture} from './ToothProps';

/**
 * Objekte für das Spezial-Video "Wecker" (wiederverwendbar, alles comichaft und harmlos):
 *  - AlarmClock ("wecker"): altmodischer Wecker mit zwei Glocken + Hämmerchen, rotes Gehäuse, Zifferblatt zeigt 8:47.
 *      Ursprung = Mitte unten, Zifferblatt nach +z, ca. 0,2 m hoch. ring 0 … 1 = klingelt (wackelt, Hämmerchen schlägt,
 *      gelbe Klingel-Linien), broken 0 … 1 = kaputt (plattgedrückt, Glocken verbogen, Zifferblatt hängt schief).
 *  - DigitalClock ("digitaluhr"): kleiner Radiowecker mit großen roten Ziffern (Text, Standard "8:47"), Front +z.
 *  - Hammer: Holzstiel + Stahlkopf (in der Hand des Dummys automatisch bei "hammer").
 *  - ConfettiCannon + ConfettiBurst: Konfetti-Kanone (Papprohr, bunt) – Konfetti schießt nach oben und rieselt herab.
 *  - TearCalendar ("abreisskalender"): Abreißkalender zum Hinstellen (NOVEMBER / 16 / MONTAG), circle 0 … 1 = roter Kringel
 *      um die Zahl wird gezogen, write 0 … 1 = "FEIERTAG" wird von links nach rechts in Rot daruntergeschrieben.
 *  - MonthCalendar ("monatskalender"): großer Wandkalender mit Monatsübersicht (November, ohne Feiertage), Front +z.
 *  - GearBurst ("zahnraeder"): Zahnräder, Federn und Schrauben fliegen comichaft heraus (Bewegung "burst").
 *  - WateringCan ("giesskanne"): grüne Gießkanne, water 1 = Wasser läuft aus der Brause.
 *  - PartyHat / GardenHat: Hütchen für Figuren mit Dummy-Körper (Werte "partyhat" / "gardenhat").
 *  - RingLines: gelbe Klingel-Striche (für Wecker und klingelndes Handy).
 */

/** gelbe Klingel-Striche links + rechts ("((( )))"), schauen nach +z */
export const RingLines = ({amount, time, r = 0.16, y = 0.12}: {amount: number; time: number; r?: number; y?: number}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffd21a', transparent: true, depthWrite: false, side: THREE.DoubleSide}), []);
  if (amount < 0.01) return null;
  mat.opacity = clamp(amount * 1.5);
  return (
    <group position={[0, y, 0]}>
      {[-1, 1].map((s) =>
        [0, 1, 2].map((i) => {
          const ph = ((time * 3.2 + i / 3) % 1 + 1) % 1;
          const rr = r + ph * 0.14;
          return (
            <mesh key={`${s}${i}`} material={mat} position={[s * rr * 0.15, 0, 0.02]} rotation={[0, 0, s > 0 ? -0.9 : Math.PI - 0.9]} scale={1 - ph * 0.4}>
              <torusGeometry args={[rr, 0.009, 4, 12, 1.8]} />
            </mesh>
          );
        }),
      )}
    </group>
  );
};

// ---------- Wecker ----------
export const AlarmClock = ({ring = 0, broken = 0, time = 0}: {ring?: number; broken?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      body: std('#d8372c', {roughness: 0.35, metalness: 0.25}),
      chrome: std('#e2e6ea', {roughness: 0.2, metalness: 0.85}),
      face: std('#fbf7ea', {roughness: 0.6}),
      dark: std('#1d1f22'),
      red: std('#d8372c'),
    }),
    [],
  );
  const shake = ring > 0.01 ? Math.sin(time * 70) * 0.09 * ring : 0;
  const hop = ring > 0.01 ? Math.abs(Math.sin(time * 35)) * 0.012 * ring : 0;
  const b = clamp(broken);
  const squash = 1 - 0.45 * b;
  // 8:47 – Minutenzeiger auf 47, Stundenzeiger kurz vor 9
  const minA = (47 / 60) * Math.PI * 2;
  const hourA = ((8 + 47 / 60) / 12) * Math.PI * 2;
  const R = 0.075;
  return (
    <group position={[0, hop, 0]} rotation={[0, 0, shake]}>
      <group scale={[1 + 0.25 * b, squash, 1 + 0.15 * b]}>
        {/* Füßchen */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.chrome} position={[s * 0.05, 0.015, 0]} rotation={[0, 0, s * (0.5 + b * 0.6)]}>
            <cylinderGeometry args={[0.007, 0.01, 0.04, 6]} />
          </mesh>
        ))}
        {/* Gehäuse (Trommel) */}
        <group position={[0, 0.03 + R, 0]} rotation={[0, 0, b * 0.25]}>
          <mesh material={m.body} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[R, R, 0.05, 20]} />
          </mesh>
          <mesh material={m.chrome} position={[0, 0, 0.026]}>
            <torusGeometry args={[R - 0.004, 0.006, 5, 20]} />
          </mesh>
          <group position={[0, 0, 0.027]} rotation={[0, 0, b * 0.6]}>
            <mesh material={m.face}>
              <circleGeometry args={[R - 0.008, 20]} />
            </mesh>
            {Array.from({length: 12}, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return (
                <mesh key={i} material={m.dark} position={[Math.sin(a) * 0.055, Math.cos(a) * 0.055, 0.001]} rotation={[0, 0, -a]}>
                  <boxGeometry args={[0.004, i % 3 ? 0.008 : 0.014, 0.001]} />
                </mesh>
              );
            })}
            <group rotation={[0, 0, -hourA]} position={[0, 0, 0.002]}>
              <mesh material={m.dark} position={[0, 0.02, 0]}>
                <boxGeometry args={[0.008, 0.04, 0.002]} />
              </mesh>
            </group>
            <group rotation={[0, 0, -minA]} position={[0, 0, 0.003]}>
              <mesh material={m.dark} position={[0, 0.028, 0]}>
                <boxGeometry args={[0.005, 0.058, 0.002]} />
              </mesh>
            </group>
            <group rotation={[0, 0, -1.2]} position={[0, 0, 0.004]}>
              <mesh material={m.red} position={[0, 0.022, 0]}>
                <boxGeometry args={[0.003, 0.046, 0.002]} />
              </mesh>
            </group>
          </group>
          {/* zwei Glocken oben + Bügel + Hämmerchen */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.05, R * 0.82, -0.002]} rotation={[0, 0, s * (-0.55 - b * 0.9)]}>
              <mesh material={m.chrome} position={[0, 0.02, 0]} castShadow>
                <sphereGeometry args={[0.038, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
              <mesh material={m.chrome} position={[0, 0.06, 0]}>
                <sphereGeometry args={[0.007, 6, 4]} />
              </mesh>
            </group>
          ))}
          <mesh material={m.chrome} position={[0, R * 1.1, -0.004]}>
            <boxGeometry args={[0.012, 0.02, 0.012]} />
          </mesh>
          <group position={[0, R * 1.05, 0.0]} rotation={[0, 0, ring > 0.01 ? Math.sin(time * 70) * 0.7 : 0]}>
            <mesh material={m.chrome} position={[0, 0.02, 0]}>
              <boxGeometry args={[0.004, 0.04, 0.004]} />
            </mesh>
            <mesh material={m.chrome} position={[0, 0.042, 0]}>
              <sphereGeometry args={[0.008, 6, 4]} />
            </mesh>
          </group>
          {/* Tragegriff */}
          <mesh material={m.chrome} position={[0, R + 0.02, -0.02]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.03, 0.004, 4, 12, Math.PI]} />
          </mesh>
          {/* Aufziehschlüssel hinten */}
          <mesh material={m.chrome} position={[0, 0, -0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.02, 6]} />
          </mesh>
          <mesh material={m.chrome} position={[0, 0, -0.047]}>
            <boxGeometry args={[0.04, 0.012, 0.004]} />
          </mesh>
        </group>
        {/* herausspringende Feder, wenn kaputt */}
        {b > 0.4 && (
          <group position={[0.06, 0.05 + R, 0.03]} rotation={[0.3, 0, -0.9]} scale={clamp((b - 0.4) * 2.5)}>
            <Spring len={0.09} />
          </group>
        )}
      </group>
      <RingLines amount={ring} time={time} r={0.12} y={0.13} />
    </group>
  );
};

/** kleine Spiralfeder entlang +y */
const Spring = ({len = 0.08, r = 0.012}: {len?: number; r?: number}) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const turns = 7;
    for (let i = 0; i <= turns * 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, (i / (turns * 12)) * len, Math.sin(a) * r));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.0022, 4, false);
  }, [len, r]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#cfd4d9" metalness={0.8} roughness={0.25} />
    </mesh>
  );
};

/** Zahnrad (flach, Achse z) */
const Gear = ({r, teeth = 8, color = '#e0b43a'}: {r: number; teeth?: number; color?: string}) => {
  const mat = useMemo(() => std(color, {metalness: 0.7, roughness: 0.3}), [color]);
  return (
    <group>
      <mesh material={mat} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, 0.006, 14]} />
      </mesh>
      {Array.from({length: teeth}, (_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        return (
          <mesh key={i} material={mat} position={[Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[r * 0.35, r * 0.32, 0.006]} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Zahnräder, Federn, Schrauben fliegen in alle Richtungen (comichaft), fallen mit Schwerkraft auf y = floor.
 * time = Sekunden seit dem Schlag; hit2 > 0 = zweiter Schwung ab dieser Zeit.
 */
export const GearBurst = ({time, hit2 = -1, floor = -0.5}: {time: number; hit2?: number; floor?: number}) => {
  const parts = useMemo(() => {
    const r = rng(91);
    return Array.from({length: 22}, (_, i) => ({
      kind: i % 3,
      wave: i < 10 ? 0 : 1,
      vx: (r() - 0.5) * 2.2,
      vy: 1.4 + r() * 1.8,
      vz: (r() - 0.3) * 1.6,
      spin: (r() - 0.5) * 24,
      s: 0.6 + r() * 0.8,
      color: ['#e0b43a', '#c9ced3', '#d8372c'][i % 3],
    }));
  }, []);
  return (
    <group>
      {parts.map((p, i) => {
        const t0 = p.wave === 0 ? 0 : hit2;
        if (t0 < 0) return null;
        const a = time - t0;
        if (a <= 0 || a > 3.5) return null;
        // Weg in "Teile-Einheiten" (×0,35 = Meter); landet auf floor (Meter unter dem Ursprung)
        const fl = floor / 0.35;
        const tLand = (p.vy + Math.sqrt(p.vy * p.vy - 19.6 * fl)) / 9.8;
        const aa = Math.min(a, tLand);
        const y = p.vy * aa - 4.9 * aa * aa;
        const x = p.vx * aa;
        const z = p.vz * aa;
        const rot = p.spin * aa;
        return (
          <group key={i} position={[x * 0.35, y * 0.35, z * 0.35]} rotation={[rot * 0.7, rot, rot * 0.3]} scale={p.s}>
            {p.kind === 0 && <Gear r={0.022} color={p.color} />}
            {p.kind === 1 && <Spring len={0.05} r={0.008} />}
            {p.kind === 2 && <Gear r={0.014} teeth={6} color="#c9ced3" />}
          </group>
        );
      })}
    </group>
  );
};

// ---------- Digitaluhr ----------
const digitalTexture = (text: string) => () => {
  const c = document.createElement('canvas');
  c.width = 420;
  c.height = 200;
  const g = c.getContext('2d')!;
  g.fillStyle = '#121416';
  g.fillRect(0, 0, 420, 200);
  g.fillStyle = '#ff3b2a';
  g.shadowColor = '#ff3b2a';
  g.shadowBlur = 18;
  g.font = `800 176px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 210, 106);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
export const DigitalClock = ({text = '8:47', blink = 0, time = 0}: {text?: string; blink?: number; time?: number}) => {
  const tex = useFontTexture(digitalTexture(text), `Digitaluhr ${text}`);
  const m = useMemo(() => ({case: std('#2b2f35', {roughness: 0.5}), dark: std('#15171a')}), []);
  const on = blink > 0.5 ? Math.sin(time * 9) > -0.3 : true;
  return (
    <group>
      <mesh material={m.case} position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.2, 0.11, 0.07]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.005, -0.005]}>
        <boxGeometry args={[0.18, 0.01, 0.06]} />
      </mesh>
      {tex && (
        <mesh position={[0, 0.063, 0.0365]}>
          <planeGeometry args={[0.17, 0.081]} />
          <meshBasicMaterial map={tex} toneMapped={false} color={on ? '#ffffff' : '#7a4a4a'} />
        </mesh>
      )}
    </group>
  );
};

// ---------- Hammer ----------
/** Hammer: Stiel entlang −y (Griff am Ursprung = in der Hand), Kopf am Ende quer (entlang z, Schlagfläche −z) */
export const Hammer = () => {
  const m = useMemo(() => ({wood: std('#b07a45'), steel: std('#8c949c', {metalness: 0.8, roughness: 0.3}), grip: std('#2a2c30')}), []);
  return (
    <group>
      <mesh material={m.grip} position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.019, 0.019, 0.1, 8]} />
      </mesh>
      <mesh material={m.wood} position={[0, -0.15, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.017, 0.24, 8]} />
      </mesh>
      <group position={[0, -0.28, 0]}>
        <mesh material={m.steel} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <boxGeometry args={[0.045, 0.13, 0.045]} />
        </mesh>
        <mesh material={m.steel} position={[0, 0, -0.075]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.026, 0.03, 10]} />
        </mesh>
        <mesh material={m.steel} position={[0, 0, 0.07]} rotation={[Math.PI / 2 + 0.4, 0, 0]}>
          <boxGeometry args={[0.04, 0.05, 0.015]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- Konfetti ----------
/** Konfetti-Kanone: buntes Papprohr entlang −y (Griff am Ursprung), Öffnung bei y −0.32 */
export const ConfettiCannon = () => {
  const m = useMemo(() => ({tube: std('#7a3fd1', {roughness: 0.6}), stripe: std('#ffd21a'), cap: std('#22b8a8'), gold: std('#f2c14e', {metalness: 0.6, roughness: 0.3})}), []);
  return (
    <group>
      <mesh material={m.cap} position={[0, -0.0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.07, 10]} />
      </mesh>
      <mesh material={m.tube} position={[0, -0.18, 0]} castShadow>
        <cylinderGeometry args={[0.048, 0.035, 0.26, 12]} />
      </mesh>
      {[-0.12, -0.2, -0.28].map((y) => (
        <mesh key={y} material={m.stripe} position={[0, y, 0]}>
          <cylinderGeometry args={[0.046 - (y + 0.12) * -0.04, 0.046 - (y + 0.12) * -0.04, 0.02, 12]} />
        </mesh>
      ))}
      <mesh material={m.gold} position={[0, -0.315, 0]}>
        <torusGeometry args={[0.048, 0.006, 4, 14]} />
      </mesh>
    </group>
  );
};

const CONFETTI_COLORS = ['#ff4d6d', '#ffd21a', '#3ad1ff', '#7bdc4a', '#b06bff', '#ff9a2e', '#ffffff'];
/**
 * Konfetti: schießt aus dem Ursprung nach oben (Richtung +y der Welt) und rieselt flatternd herab.
 * time = Sekunden seit dem Schuss. Gruppe sollte aufrecht in der Welt stehen.
 */
export const ConfettiBurst = ({time, count = 70, power = 1}: {time: number; count?: number; power?: number}) => {
  const parts = useMemo(() => {
    const r = rng(57);
    return Array.from({length: count}, (_, i) => {
      const a = r() * Math.PI * 2;
      const sp = 0.25 + r() * 0.9;
      return {
        vx: Math.cos(a) * sp,
        vz: Math.sin(a) * sp,
        vy: 2.6 + r() * 1.8,
        spin: 4 + r() * 10,
        ph: r() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        streamer: i % 9 === 0,
      };
    });
  }, [count]);
  const mats = useMemo(() => Object.fromEntries(CONFETTI_COLORS.map((c) => [c, new THREE.MeshBasicMaterial({color: c, side: THREE.DoubleSide})])), []);
  if (time <= 0 || time > 6) return null;
  return (
    <group>
      {parts.map((p, i) => {
        // schneller Schuss nach oben, dann Luftwiderstand: sinkt langsam mit Flattern
        const up = 1 - Math.exp(-time * 3.2);
        const h = (p.vy / 3.2) * up * power - Math.max(0, time - 0.35) * 0.32;
        const drift = (1 - Math.exp(-time * 2.5)) * power;
        const x = p.vx * drift * 0.8 + Math.sin(time * 2.1 + p.ph) * 0.06 * clamp(time - 0.3);
        const z = p.vz * drift * 0.8 + Math.cos(time * 1.7 + p.ph) * 0.06 * clamp(time - 0.3);
        const s = p.streamer ? 1 : 1;
        return (
          <mesh key={i} material={mats[p.color]} position={[x, h, z]} rotation={[time * p.spin + p.ph, time * p.spin * 0.6, p.ph]} scale={s}>
            {p.streamer ? <planeGeometry args={[0.012, 0.11]} /> : <planeGeometry args={[0.028, 0.02]} />}
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- Hütchen ----------
/** Partyhütchen (Kegel, bunt gestreift, Bommel). Ursprung = Unterkante Mitte */
export const PartyHat = () => {
  const m = useMemo(() => ({a: std('#ff4d8d', {roughness: 0.6}), b: std('#ffd21a'), pom: std('#3ad1ff', {roughness: 0.9})}), []);
  return (
    <group>
      <mesh material={m.a} position={[0, 0.11, 0]} castShadow>
        <coneGeometry args={[0.075, 0.22, 14]} />
      </mesh>
      {[0.04, 0.1, 0.16].map((y) => (
        <mesh key={y} material={m.b} position={[0, y, 0]}>
          <cylinderGeometry args={[0.075 * (1 - (y - 0.005) / 0.22) + 0.002, 0.075 * (1 - (y - 0.025) / 0.22) + 0.002, 0.02, 14, 1, true]} />
        </mesh>
      ))}
      <mesh material={m.pom} position={[0, 0.225, 0]}>
        <icosahedronGeometry args={[0.028, 1]} />
      </mesh>
    </group>
  );
};

/** Gartenhut: breite Krempe, Strohfarbe mit grünem Band. Ursprung = Unterkante Mitte */
export const GardenHat = () => {
  const m = useMemo(() => ({straw: std('#e6c77a', {roughness: 0.95}), band: std('#3f8a3a')}), []);
  return (
    <group>
      <mesh material={m.straw} position={[0, 0.0, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.25, 0.015, 18]} />
      </mesh>
      <mesh material={m.straw} position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.11, 14]} />
      </mesh>
      <mesh material={m.band} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.128, 0.132, 0.03, 14]} />
      </mesh>
    </group>
  );
};

// ---------- Abreißkalender ----------
const tearTexture = (month: string, day: string, weekday: string) => () => {
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 440;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fdfcf8';
  g.fillRect(0, 0, 360, 440);
  g.fillStyle = '#2f6fcf';
  g.fillRect(0, 0, 360, 86);
  g.fillStyle = '#ffffff';
  g.font = `800 62px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(month, 180, 46);
  g.fillStyle = '#25282c';
  g.font = `800 200px ${T.font}`;
  g.fillText(day, 180, 205);
  g.font = `700 50px ${T.font}`;
  g.fillStyle = '#5b6066';
  g.fillText(weekday, 180, 325);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
const writeTexture = (text: string) => () => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 512, 128);
  g.fillStyle = '#e0261c';
  g.font = `italic 800 108px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.save();
  g.translate(256, 66);
  g.rotate(-0.06);
  g.fillText(text, 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
/** Seiten-Maße des Abreißkalenders (für die Stift-Bewegung): Blatt 0,18 × 0,22 m, Mitte der Zahl bei y 0,155 über dem Ursprung */
export const TEAR_CAL = {w: 0.18, h: 0.22, numY: 0.155, writeY: 0.075, lean: 0.22};
/**
 * Abreißkalender mit Aufsteller. Ursprung = Mitte unten, Blatt nach +z (leicht nach hinten gelehnt).
 * circle 0 … 1 = roter Kringel um die Zahl, write 0 … 1 = "FEIERTAG" erscheint von links nach rechts.
 */
export const TearCalendar = ({circle = 0, write = 0, month = 'NOVEMBER', day = '16', weekday = 'MONTAG', text = 'FEIERTAG', size = 0}: {circle?: number; write?: number; month?: string; day?: string; weekday?: string; text?: string; size?: number}) => {
  const page = useFontTexture(tearTexture(month, day, weekday), `Abreisskalender ${month} ${day} ${weekday}`);
  const wtex = useFontTexture(writeTexture(text), `Kalender-Schrift ${text}`);
  const m = useMemo(() => ({board: std('#3d4a5c', {roughness: 0.7}), paper: std('#efece4', {roughness: 0.9}), ring: std('#c9cdd1', {metalness: 0.7, roughness: 0.3}), red: new THREE.MeshBasicMaterial({color: '#e0261c', side: THREE.DoubleSide})}), []);
  // Schrift von links nach rechts: Ausschnitt der Textur (Kopie, damit "repeat" nur hier gilt)
  const wt = useMemo(() => {
    if (!wtex) return null;
    const c = wtex.clone();
    c.needsUpdate = true;
    return c;
  }, [wtex]);
  const k = clamp(write);
  if (wt) {
    wt.repeat.set(Math.max(0.001, k), 1);
    wt.offset.set(0, 0);
  }
  const {w, h, numY, writeY} = TEAR_CAL;
  const ringGeo = useMemo(() => new THREE.TorusGeometry(0.052, 0.0045, 4, 40, Math.PI * 2 * 1.08), []);
  const cK = clamp(circle);
  return (
    <group scale={1 + size}>
      <group rotation={[-TEAR_CAL.lean, 0, 0]}>
        <mesh material={m.board} position={[0, h / 2 + 0.01, -0.006]} castShadow>
          <boxGeometry args={[w + 0.03, h + 0.04, 0.012]} />
        </mesh>
        <mesh material={m.paper} position={[0, h / 2 + 0.005, 0.004]}>
          <boxGeometry args={[w, h, 0.012]} />
        </mesh>
        {page && (
          <mesh position={[0, h / 2 + 0.005, 0.0105]}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial map={page} roughness={0.9} />
          </mesh>
        )}
        {[-0.045, 0.045].map((x) => (
          <mesh key={x} material={m.ring} position={[x, h + 0.02, 0.006]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.009, 0.003, 4, 8]} />
          </mesh>
        ))}
        {/* roter Kringel (wird gezogen) */}
        {cK > 0.01 && (
          <mesh material={m.red} position={[0, numY, 0.013]} rotation={[0, 0, Math.PI / 2 + 0.3]} scale={[1.05, 1.2, 1]}>
            <torusGeometry args={[0.052, 0.0045, 4, 40, Math.PI * 2 * 1.08 * cK]} />
          </mesh>
        )}
        {/* "FEIERTAG" in Rot */}
        {wt && k > 0.01 && (
          <mesh position={[-w * 0.46 + (w * 0.92 * k) / 2, writeY - 0.012, 0.0135]}>
            <planeGeometry args={[w * 0.92 * k, w * 0.92 * 0.25]} />
            <meshBasicMaterial map={wt} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        )}
      </group>
      {/* Aufsteller hinten */}
      <mesh material={m.board} position={[0, 0.08, -0.06]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[0.06, 0.17, 0.008]} />
      </mesh>
      {void ringGeo}
    </group>
  );
};

// ---------- Monats-Wandkalender (Büro) ----------
const monthTexture = () => {
  const c = document.createElement('canvas');
  c.width = 560;
  c.height = 640;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fdfcf8';
  g.fillRect(0, 0, 560, 640);
  g.fillStyle = '#2b3a55';
  g.fillRect(0, 0, 560, 120);
  g.fillStyle = '#ffffff';
  g.font = `800 84px ${T.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('NOVEMBER', 280, 64);
  const days = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
  const cw = 560 / 7;
  g.font = `700 34px ${T.font}`;
  days.forEach((d, i) => {
    g.fillStyle = i > 4 ? '#8a8f96' : '#2b3a55';
    g.fillText(d, cw * i + cw / 2, 152);
  });
  // November 2026 beginnt an einem Sonntag
  g.font = `700 44px ${T.font}`;
  let col = 6;
  let row = 0;
  for (let d = 1; d <= 30; d++) {
    const x = cw * col + cw / 2;
    const y = 212 + row * 84;
    g.strokeStyle = '#d9d6cc';
    g.lineWidth = 2;
    g.strokeRect(cw * col + 3, y - 38, cw - 6, 78);
    g.fillStyle = col > 4 ? '#8a8f96' : '#25282c';
    g.fillText(String(d), x, y);
    col++;
    if (col > 6) {
      col = 0;
      row++;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
/** Großer Wandkalender 0,56 × 0,64 m, Ursprung = Mitte, Front +z. Keine Feiertage eingetragen. */
export const MonthCalendar = () => {
  const tex = useFontTexture(monthTexture, 'Monatskalender November');
  const m = useMemo(() => ({board: std('#c9ced3', {metalness: 0.4, roughness: 0.4})}), []);
  return (
    <group>
      <mesh material={m.board} position={[0, 0.34, 0.005]}>
        <boxGeometry args={[0.6, 0.04, 0.02]} />
      </mesh>
      <mesh position={[0, 0, 0.006]} castShadow>
        <boxGeometry args={[0.56, 0.64, 0.008]} />
        <meshStandardMaterial color="#efece4" />
      </mesh>
      {tex && (
        <mesh position={[0, 0, 0.0105]}>
          <planeGeometry args={[0.56, 0.64]} />
          <meshStandardMaterial map={tex} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
};

// ---------- Gießkanne ----------
/** Grüne Gießkanne. Ursprung = Griff (oben Mitte), Brause zeigt nach +z. water 0 … 1 = Wasser läuft */
export const WateringCan = ({water = 0, time = 0}: {water?: number; time?: number}) => {
  const m = useMemo(() => ({can: std('#3b9a4a', {roughness: 0.4, metalness: 0.2}), rose: std('#2f7c3b'), water: new THREE.MeshStandardMaterial({color: '#9fd8ff', transparent: true, opacity: 0.75, roughness: 0.1})}), []);
  return (
    <group>
      {/* Griff */}
      <mesh material={m.can} position={[0, -0.02, -0.05]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.07, 0.012, 5, 12, Math.PI]} />
      </mesh>
      <mesh material={m.can} position={[0, -0.16, -0.04]} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.2, 14]} />
      </mesh>
      {/* Tülle + Brause */}
      <mesh material={m.can} position={[0, -0.13, 0.13]} rotation={[1.0, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.018, 0.25, 8]} />
      </mesh>
      <mesh material={m.rose} position={[0, -0.05, 0.24]} rotation={[1.0, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.015, 0.04, 10]} />
      </mesh>
      {water > 0.01 &&
        Array.from({length: 10}, (_, i) => {
          const ph = ((time * 1.8 + i / 10) % 1 + 1) % 1;
          return (
            <mesh key={i} material={m.water} position={[Math.sin(i * 2.4) * 0.025 * (1 + ph), -0.07 - ph * 0.5, 0.27 + ph * 0.12]} scale={water}>
              <sphereGeometry args={[0.008, 5, 3]} />
            </mesh>
          );
        })}
    </group>
  );
};

/** kleines Hilfs-Ease, damit Konfetti/Teile weich starten */
export const popIn = (t: number) => easeInOut(clamp(t));
