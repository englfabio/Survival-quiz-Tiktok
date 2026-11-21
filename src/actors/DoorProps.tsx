import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut, rng} from '../lib/anim';
import {canvasTex, fitText, TextPlane} from './WgProps';

/**
 * Spezial „Tür drücken statt ziehen“ – alles comichaft und harmlos, niemand wird verletzt.
 *
 *  - PushDoor ("druecktuer"): Tür mit Zarge + Türblatt (hell holzfarben) und großem gelbem Schild „DRÜCKEN“ (Mitte 1,93 m hoch).
 *      Ursprung = Mitte der Türöffnung am Boden, Wand-Vorderseite bei z 0, vorn = +z. Öffnung PDOOR.w × PDOOR.h.
 *      Bänder (Scharniere) links (−x), Griffstange rechts bei x +0.36 auf 1,02 m (steht 0,07 m vor dem Blatt).
 *      Werte: `door` 0 zu … 1 offen (geht nach HINTEN auf = drücken), `glow` 0 … 1 = Schild leuchtet + pulsiert,
 *      `rumble` = Griff rüttelt (Tür gibt keinen Millimeter nach), `fill` 0 … 1 = comichaft aus den Angeln gesprengt (fliegt nach
 *      hinten in den Hof, überschlägt sich, liegt dann flach ca. 4,2 m hinter der Wand), `rail` 0 … 1 = Laufschiene über der Tür wird
 *      angeschraubt (Schrauben ploppen nacheinander auf, ab 0,85 hängt das Blatt mit zwei Laufrollen VOR der Wand in der Schiene),
 *      `slide` 0 … 1 = Blatt rollt 1,08 m nach rechts (+x) zur Seite.
 *  - Firecracker ("knallfrosch"): überzogener Cartoon-Knallfrosch (drei dicke rote Stangen, gelbes Band, geringelte Zündschnur).
 *      Ursprung = Rückseite Mitte (klebt mit −z an der Tür), `fill` 0 … 1 = Zündschnur brennt ab (Funken an der Spitze), `size`.
 *      In der Hand: `hand` 1.
 *  - BoomCloud ("knallwolke"): Comic-Knall – gelb-orangener Zackenstern mit „BUMM!“, weiße Rauchwölkchen, die aufquellen und
 *      langsam verwehen (kein Feuer). `fill` 0 → 1 (im Video ca. 2,4 s). Schaut immer zur Kamera. `size`.
 *  - RedCarpet ("teppich"): roter Teppich mit goldenen Kanten, Ursprung = Anfang (an der Tür), rollt nach +z aus; `fill` 0 … 1
 *      (Länge CARPET.len), die Rolle läuft vorn mit und wird dünner.
 *  - Toolbox ("werkzeugkasten"): roter Werkzeugkasten mit Griff (ohne Marke). Tragen: `hand` 1, `drop` 0.32.
 *  - StepStool ("tritt"): kleiner Tritt mit zwei Stufen, Standfläche oben 0,42 m (Figur darauf: y 0.42).
 *  - Drill (Dummy tool 'drill'): gelb-schwarzer Akkuschrauber ohne Logo.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.7, flatShading: true, ...extra});

export const PDOOR = {w: 1.0, h: 2.2, leafT: 0.05, handleX: 0.36, handleY: 1.02, signY: 1.92};
/** Laufschiene: von x −0.62 bis +1.72, Unterkante y 2.3 */
export const PRAIL = {x0: -0.62, x1: 1.72, y: 2.3, slide: 1.08};

const signTex = canvasTex(640, 220, (g) => {
  g.fillStyle = '#ffd21a';
  g.fillRect(0, 0, 640, 220);
  g.strokeStyle = '#1b1b1b';
  g.lineWidth = 14;
  g.strokeRect(10, 10, 620, 200);
  g.fillStyle = '#141414';
  fitText(g, 'DRÜCKEN', 320, 116, 560, 190, 800);
});

/** Schild „DRÜCKEN“ (0,88 × 0,3 m) mit Leuchten */
const PushSign = ({glow = 0, time = 0}: {glow?: number; time?: number}) => {
  const pulse = 0.55 + 0.45 * Math.sin(time * 7.5);
  const g = clamp(glow) * pulse;
  const halo = useMemo(() => new THREE.MeshBasicMaterial({color: '#fff27a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending}), []);
  halo.opacity = 0.5 * g;
  return (
    <group>
      <mesh position={[0, 0, -0.004]}>
        <boxGeometry args={[0.9, 0.32, 0.008]} />
        <meshStandardMaterial color="#1b1b1b" />
      </mesh>
      <group position={[0, 0, 0.002]}>
        <TextPlane draw={signTex} k="schild-druecken" w={0.88} h={0.3} glow={0.3 + 0.2 * g} />
      </group>
      {g > 0.01 && (
        <>
          <mesh material={halo} position={[0, 0, -0.002]}>
            <planeGeometry args={[1.0, 0.44]} />
          </mesh>
          <pointLight position={[0, 0, 0.45]} intensity={1.2 * g} color="#ffe45c" distance={2.0} decay={1.6} />
        </>
      )}
    </group>
  );
};

/** Türblatt (lokal: Mitte des Blatts, vorn +z) */
const Leaf = ({m, glow, time, rumble, rollers}: {m: Record<string, THREE.Material>; glow: number; time: number; rumble: number; rollers: number}) => {
  const {w, h, leafT, handleX, handleY, signY} = PDOOR;
  const rat = rumble * (Math.sin(time * 47) * 0.012 + Math.sin(time * 31) * 0.008);
  return (
    <group>
      <mesh material={m.leaf} castShadow receiveShadow>
        <boxGeometry args={[w - 0.02, h - 0.02, leafT]} />
      </mesh>
      {/* zwei Kassetten (Füllungen) */}
      {[0.27, -0.5].map((y, i) => (
        <mesh key={i} material={m.panel} position={[0, y, leafT / 2 + 0.004]}>
          <boxGeometry args={[w - 0.26, i ? 0.7 : 0.5, 0.012]} />
        </mesh>
      ))}
      {/* Griffstange rechts (rüttelt) */}
      <group position={[handleX, handleY - h / 2 + rat, 0]}>
        {[-0.17, 0.17].map((y) => (
          <mesh key={y} material={m.steel} position={[0, y, leafT / 2 + 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.07, 8]} />
          </mesh>
        ))}
        <mesh material={m.steel} position={[0, 0, leafT / 2 + 0.07]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.42, 10]} />
        </mesh>
      </group>
      <group position={[0, signY - h / 2, leafT / 2 + 0.02]}>
        <PushSign glow={glow} time={time} />
      </group>
      {/* Laufrollen oben (Schiebetür) */}
      {rollers > 0.01 &&
        [-0.33, 0.33].map((x) => (
          <group key={x} position={[x, h / 2, 0.0]} scale={easeInOut(rollers)}>
            <mesh material={m.steel} position={[0, 0.06, 0]}>
              <boxGeometry args={[0.05, 0.12, 0.03]} />
            </mesh>
            <mesh material={m.dark} position={[0, 0.13, 0.0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.05, 12]} />
            </mesh>
          </group>
        ))}
    </group>
  );
};

export const PushDoor = ({door = 0, glow = 0, rumble = 0, fill = 0, rail = 0, slide = 0, time = 0}: {door?: number; glow?: number; rumble?: number; fill?: number; rail?: number; slide?: number; time?: number}) => {
  const m = useMemo(
    () => ({
      leaf: std('#d9b98c', {roughness: 0.6}),
      panel: std('#cba977', {roughness: 0.6}),
      frame: std('#f2eee6', {roughness: 0.5}),
      steel: std('#c9ced4', {metalness: 0.7, roughness: 0.3}),
      dark: std('#3a3f46', {metalness: 0.4, roughness: 0.4}),
      rail: std('#b9c0c8', {metalness: 0.75, roughness: 0.28}),
      screw: std('#7d848c', {metalness: 0.6, roughness: 0.3}),
    }),
    [],
  );
  const {w, h, leafT} = PDOOR;
  const shake = rumble * Math.sin(time * 53) * 0.0012;
  // Sprengen: fliegt nach hinten, überschlägt sich, landet flach
  const b = clamp(fill);
  const bu = 1 - (1 - b) * (1 - b);
  const hung = clamp((rail - 0.85) / 0.15);
  const swing = door * 1.62 * (1 - hung);
  let leaf: React.ReactNode;
  if (b > 0.001) {
    const y = h / 2 + (0.03 - h / 2) * bu + 1.5 * Math.sin(Math.PI * Math.min(1, b * 1.05));
    leaf = (
      <group position={[0.15 * bu, Math.max(0.03, y), -leafT / 2 - 4.2 * bu]} rotation={[-(Math.PI * 2 + Math.PI / 2) * bu, 0.35 * bu, 0.25 * Math.sin(Math.PI * b)]}>
        <Leaf m={m} glow={0} time={time} rumble={0} rollers={0} />
      </group>
    );
  } else if (hung > 0) {
    leaf = (
      <group position={[PRAIL.slide * easeInOut(slide), h / 2, -leafT / 2 + (leafT + 0.06) * hung]}>
        <Leaf m={m} glow={glow} time={time} rumble={0} rollers={hung} />
      </group>
    );
  } else {
    leaf = (
      <group position={[-w / 2 + 0.01, 0, -leafT / 2 + shake]} rotation={[0, swing, 0]}>
        <group position={[w / 2 - 0.01, h / 2, 0]}>
          <Leaf m={m} glow={glow} time={time} rumble={rumble} rollers={0} />
        </group>
      </group>
    );
  }
  const railLen = PRAIL.x1 - PRAIL.x0;
  const rk = clamp(rail / 0.25);
  return (
    <group>
      {/* Zarge */}
      {[-1, 1].map((k) => (
        <mesh key={k} material={m.frame} position={[k * (w / 2 + 0.035), h / 2, -0.02]} castShadow>
          <boxGeometry args={[0.07, h + 0.07, 0.2]} />
        </mesh>
      ))}
      <mesh material={m.frame} position={[0, h + 0.035, -0.02]}>
        <boxGeometry args={[w + 0.14, 0.07, 0.2]} />
      </mesh>
      {/* Bänder links (bleiben beim Sprengen, ohne Schiene) */}
      {hung < 0.5 &&
        [0.35, h - 0.35].map((y) => (
          <mesh key={y} material={m.dark} position={[-w / 2 + 0.005, y, 0.005]}>
            <boxGeometry args={[0.03, 0.12, 0.03]} />
          </mesh>
        ))}
      {leaf}
      {/* Laufschiene mit Schrauben */}
      {rail > 0.001 && (
        <group position={[(PRAIL.x0 + PRAIL.x1) / 2, PRAIL.y, 0.06]}>
          <group scale={[1, rk, rk]}>
            <mesh material={m.rail} position={[0, 0.045, 0]} castShadow>
              <boxGeometry args={[railLen, 0.09, 0.07]} />
            </mesh>
            <mesh material={m.dark} position={[0, 0.005, 0.0]}>
              <boxGeometry args={[railLen - 0.02, 0.012, 0.03]} />
            </mesh>
          </group>
          {[0, 1, 2, 3, 4].map((i) => {
            const s = easeInOut(clamp((rail - 0.15 - i * 0.14) / 0.1));
            return s > 0.01 ? (
              <mesh key={i} material={m.screw} position={[-railLen / 2 + 0.12 + (i * (railLen - 0.24)) / 4, 0.045, 0.036]} rotation={[Math.PI / 2, 0, 0]} scale={s * (1 + 0.6 * Math.sin(Math.PI * s))}>
                <cylinderGeometry args={[0.018, 0.018, 0.012, 8]} />
              </mesh>
            ) : null;
          })}
        </group>
      )}
    </group>
  );
};

// ---------- Knallfrosch ----------
export const Firecracker = ({fill = 0, time = 0, size = 0}: {fill?: number; time?: number; size?: number}) => {
  const m = useMemo(
    () => ({
      red: std('#e0322a', {roughness: 0.45}),
      cap: std('#f4efe4'),
      band: std('#ffd21a'),
      fuse: std('#5a4632', {roughness: 0.9}),
      spark: new THREE.MeshBasicMaterial({color: '#fff3a0'}),
      spark2: new THREE.MeshBasicMaterial({color: '#ff9a2e'}),
      tape: std('#d9d4c4'),
    }),
    [],
  );
  const burnt = clamp(fill);
  // geringelte Zündschnur von oben aus der mittleren Stange
  const pts = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      out.push(new THREE.Vector3(Math.sin(u * 9) * 0.05 * u, 0.2 + u * 0.22, 0.06 + Math.cos(u * 9) * 0.04 * u));
    }
    return out;
  }, []);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts), [pts]);
  const left = 1 - burnt * 0.92;
  const fuseGeo = useMemo(() => {
    const sub = new THREE.CatmullRomCurve3(pts.slice(0, Math.max(2, Math.round(24 * left) + 1)));
    return new THREE.TubeGeometry(sub, 24, 0.012, 6, false);
  }, [pts, left]);
  const tip = curve.getPoint(Math.max(0.04, left));
  const lit = fill > 0.001 && fill < 0.999;
  const r = rng(Math.floor(time * 24));
  return (
    <group scale={1 + size}>
      {[-0.075, 0, 0.075].map((x, i) => (
        <group key={x} position={[x, i === 1 ? 0.02 : 0, 0.06]}>
          <mesh material={m.red} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.36, 12]} />
          </mesh>
          {[0.18, -0.18].map((y) => (
            <mesh key={y} material={m.cap} position={[0, y, 0]}>
              <cylinderGeometry args={[0.042, 0.042, 0.03, 12]} />
            </mesh>
          ))}
        </group>
      ))}
      {[0.07, -0.07].map((y) => (
        <mesh key={y} material={m.band} position={[0, y, 0.06]} scale={[1, 1, 0.7]}>
          <cylinderGeometry args={[0.13, 0.13, 0.05, 16]} />
        </mesh>
      ))}
      {/* Klebestreifen zur Tür */}
      <mesh material={m.tape} position={[0, 0, 0.004]}>
        <boxGeometry args={[0.34, 0.06, 0.008]} />
      </mesh>
      <mesh geometry={fuseGeo} material={m.fuse} />
      {lit && (
        <group position={tip}>
          <mesh material={m.spark} scale={0.03 + 0.012 * Math.sin(time * 40)}>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
          {Array.from({length: 7}, (_, i) => {
            const a = r() * Math.PI * 2;
            const e = r() * 1.4 - 0.2;
            const d = 0.03 + r() * 0.07;
            return (
              <mesh key={i} material={i % 2 ? m.spark : m.spark2} position={[Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d]} scale={0.008 + r() * 0.008}>
                <icosahedronGeometry args={[1, 0]} />
              </mesh>
            );
          })}
          <pointLight intensity={0.8} color="#ffb347" distance={1.2} decay={1.8} />
        </group>
      )}
    </group>
  );
};

// ---------- Comic-Knall „BUMM!“ ----------
const boomTex = canvasTex(512, 512, (g) => {
  const spikes = 14;
  const star = (ro: number, ri: number, col: string) => {
    g.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? ri : ro * (0.85 + 0.15 * ((i * 7) % 3) / 2);
      g.lineTo(256 + Math.cos(a) * rr, 256 + Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = col;
    g.fill();
  };
  star(250, 160, '#e0322a');
  star(225, 140, '#ff9a2e');
  star(190, 118, '#ffd21a');
  g.save();
  g.translate(256, 262);
  g.rotate(-0.12);
  g.lineJoin = 'round';
  g.font = `800 150px "Barlow Condensed", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 18;
  g.strokeStyle = '#1b1b1b';
  g.strokeText('BUMM!', 0, 0);
  g.fillStyle = '#ffffff';
  g.fillText('BUMM!', 0, 0);
  g.restore();
});

export const BoomCloud = ({fill = 0, size = 0}: {fill?: number; size?: number}) => {
  const puffs = useMemo(() => {
    const r = rng(907);
    return Array.from({length: 16}, () => ({a: r() * Math.PI * 2, d: 0.35 + r() * 0.75, y: (r() - 0.35) * 1.2, s: 0.22 + r() * 0.28, rise: 0.25 + r() * 0.5, delay: r() * 0.12}));
  }, []);
  const smoke = useMemo(() => new THREE.MeshStandardMaterial({color: '#f1efea', roughness: 1, transparent: true, opacity: 0.95, flatShading: true}), []);
  const f = clamp(fill);
  if (f <= 0.001 || f >= 0.999) return null;
  const starK = f < 0.08 ? easeInOut(f / 0.08) * 1.15 : f < 0.14 ? 1.15 - 0.15 * ((f - 0.08) / 0.06) : 1;
  const starFade = 1 - clamp((f - 0.42) / 0.18);
  smoke.opacity = 0.95 * (1 - clamp((f - 0.6) / 0.4));
  return (
    <group scale={1 + size}>
      {starFade > 0.01 && (
        <group position={[0, 0, 0.6]} scale={starK * (0.9 + 0.1 * starFade)}>
          <TextPlane draw={boomTex} k="bumm" w={1.9} h={1.9} glow={0.9} />
        </group>
      )}
      {puffs.map((p, i) => {
        const u = clamp((f - p.delay) / 0.5);
        const g = 1 - Math.exp(-u * 4);
        return u > 0 ? (
          <mesh key={i} material={smoke} position={[Math.cos(p.a) * p.d * (0.4 + 0.8 * g), p.y + p.rise * f, Math.sin(p.a) * p.d * 0.35 * g]} scale={p.s * (0.3 + 0.9 * g) * (1 + 0.3 * f)}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
        ) : null;
      })}
    </group>
  );
};

// ---------- Roter Teppich ----------
export const CARPET = {len: 4.6, w: 1.0};
export const RedCarpet = ({fill = 0}: {fill?: number}) => {
  const m = useMemo(() => ({red: std('#c4162a', {roughness: 0.9}), gold: std('#e5b53a', {metalness: 0.3, roughness: 0.4}), back: std('#8c0f1e', {roughness: 0.9})}), []);
  const f = clamp(fill);
  const L = CARPET.len * f;
  const r = 0.03 + 0.11 * (1 - f);
  return (
    <group>
      {L > 0.01 && (
        <group position={[0, 0.006, L / 2]}>
          <mesh material={m.red} receiveShadow>
            <boxGeometry args={[CARPET.w, 0.012, L]} />
          </mesh>
          {[-1, 1].map((k) => (
            <mesh key={k} material={m.gold} position={[k * (CARPET.w / 2 - 0.04), 0.008, 0]}>
              <boxGeometry args={[0.035, 0.006, L]} />
            </mesh>
          ))}
        </group>
      )}
      {f < 0.995 && (
        <group position={[0, r, L + r * 0.6]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={m.red} rotation={[-L / r, 0, 0]} castShadow>
            <cylinderGeometry args={[r, r, CARPET.w, 14]} />
          </mesh>
          {[-1, 1].map((k) => (
            <mesh key={k} material={m.back} position={[0, k * (CARPET.w / 2 + 0.002), 0]}>
              <cylinderGeometry args={[r * 0.98, r * 0.98, 0.004, 14]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

// ---------- Werkzeugkasten, Tritt, Akkuschrauber ----------
export const Toolbox = () => {
  const m = useMemo(() => ({red: std('#d8392b', {roughness: 0.4, metalness: 0.3}), dark: std('#2c3036'), steel: std('#c9ced4', {metalness: 0.7, roughness: 0.3}), wood: std('#c99a63')}), []);
  return (
    <group>
      <mesh material={m.red} position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.46, 0.22, 0.22]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.235, 0]}>
        <boxGeometry args={[0.47, 0.015, 0.225]} />
      </mesh>
      <mesh material={m.steel} position={[0, 0.3, 0]}>
        <boxGeometry args={[0.24, 0.025, 0.035]} />
      </mesh>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} material={m.steel} position={[x, 0.27, 0]}>
          <boxGeometry args={[0.02, 0.06, 0.03]} />
        </mesh>
      ))}
      {/* Schraubenzieher + Hammerstiel schauen raus */}
      <mesh material={m.wood} position={[0.12, 0.27, 0.05]} rotation={[0.3, 0, 0.5]}>
        <cylinderGeometry args={[0.014, 0.014, 0.16, 6]} />
      </mesh>
      <mesh material={m.dark} position={[-0.13, 0.28, 0.06]} rotation={[-0.25, 0, -0.4]}>
        <cylinderGeometry args={[0.016, 0.016, 0.14, 6]} />
      </mesh>
    </group>
  );
};

export const StepStool = () => {
  const m = useMemo(() => ({top: std('#3f8fd6', {roughness: 0.5}), leg: std('#d9dde2', {metalness: 0.6, roughness: 0.35})}), []);
  return (
    <group>
      <mesh material={m.top} position={[0, 0.41, -0.06]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.025, 0.3]} />
      </mesh>
      <mesh material={m.top} position={[0, 0.2, 0.14]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.025, 0.18]} />
      </mesh>
      {[-0.22, 0.22].map((x) => (
        <group key={x}>
          <mesh material={m.leg} position={[x, 0.2, 0.2]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.03, 0.42, 0.03]} />
          </mesh>
          <mesh material={m.leg} position={[x, 0.2, -0.18]} rotation={[0.12, 0, 0]}>
            <boxGeometry args={[0.03, 0.42, 0.03]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Akkuschrauber: Ursprung = Griff (in der Hand), Bit zeigt entlang −y (Verlängerung des Unterarms) */
export const Drill = ({spin = 0}: {spin?: number}) => {
  const m = useMemo(() => ({body: std('#ffc21a', {roughness: 0.45}), dark: std('#26292e', {roughness: 0.5}), steel: std('#c9ced4', {metalness: 0.8, roughness: 0.25})}), []);
  return (
    <group>
      {/* Griff quer in der Faust, Akku unten (Richtung Ellbogen) */}
      <mesh material={m.dark} position={[0, 0.0, 0.0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.05, 0.12]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.0, -0.09]}>
        <boxGeometry args={[0.08, 0.07, 0.07]} />
      </mesh>
      {/* Motorgehäuse vor der Hand, zeigt nach −y */}
      <mesh material={m.body} position={[0, -0.09, 0.05]} castShadow>
        <boxGeometry args={[0.07, 0.17, 0.08]} />
      </mesh>
      <mesh material={m.dark} position={[0, -0.19, 0.05]}>
        <cylinderGeometry args={[0.025, 0.03, 0.04, 10]} />
      </mesh>
      <group position={[0, -0.25, 0.05]} rotation={[0, spin, 0]}>
        <mesh material={m.steel}>
          <cylinderGeometry args={[0.006, 0.004, 0.08, 6]} />
        </mesh>
      </group>
    </group>
  );
};
