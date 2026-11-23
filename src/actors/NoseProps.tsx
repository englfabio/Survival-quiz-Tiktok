import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, easeInOut} from '../lib/anim';
import {canvasTex, TextPlane} from './WgProps';

/**
 * Spezial „Nase erwischt“ – alles comichaft und harmlos, niemand wird verletzt, ohne Marken/Logos.
 *
 *  - ToyExcavator ("spielbagger"): großer gelber Spielzeug-Bagger im Low-Poly-Look (dicke schwarze Ketten mit großen Radkappen,
 *      gelber Oberwagen, Kabine mit großen hellblauen Fenstern, rotes Dach, orange Rundumleuchte, schwarz-gelbe Warnstreifen,
 *      Ausleger + Stiel + Schaufel mit stumpfen Zähnen). Ursprung = Boden-Mitte unter dem Oberwagen, vorn (Schaufel) = +z.
 *      Ca. 1,75 m hoch (Arm oben), 2,1 m lang mit Arm. Werte: `fill` 0 … 1 = wächst (0 = winzig, 1 = volle Größe, mit Überschwingen –
 *      zum „Aus-der-Nase-Ziehen“ den Weg im Choreo-Skript von der Nase bis auf den Boden legen), `tilt` = Ausleger heben (Grad,
 *      zusätzlich), `squish` 0 … 1 = staucht sich beim Aufsetzen (Comic-Federn), `glow` = Rundumleuchte dreht + leuchtet,
 *      `size` = größer/kleiner. Bewegung `drive` = Ketten laufen.
 *  - ExitSign ("ausgangschild"): kleines grünes Schild „AUSGANG“ mit Tür-Symbol + Pfeil, beidseitig beschriftet.
 *      Ursprung = Mitte des Schilds, Schrift zeigt nach +z (und −z). `mark` 1 = hängt an zwei dünnen Seilen (2,4 m nach oben),
 *      `glow` 0 … 1 = leuchtet + pulsiert, `size`.
 *  - PlopStar ("ploppstern"): Comic-Stern „PLOPP!“ (gelb/weiß, schaut zur Kamera), `fill` 0 → 1 = ploppt auf und verblasst (≈ 1 s).
 *  - Exclaim (Wert `alarm` an jeder Figur mit Dummy-Körper): gelbes Ausrufezeichen über dem Kopf (ertappt!).
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.6, flatShading: true, ...extra});

/** weiches Überschwingen beim Wachsen (0 → 1, kurz über 1 hinaus) */
const backOut = (u: number) => {
  const x = clamp(u);
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
/** Maßstab des Spielzeug-Baggers beim Wachsen (fill 0 … 1) */
export const toyGrowScale = (fill: number) => (fill >= 0.999 ? 1 : 0.035 + 0.965 * backOut(fill));

// ---------- Spielzeug-Bagger ----------
export const TOYEX = {trackX: 0.42, trackW: 0.27, trackL: 1.36, trackH: 0.34, deckY: 0.42, height: 1.75};
export const ToyExcavator = ({
  fill = 1,
  arm = 0,
  squish = 0,
  glow = 0,
  dist = 0,
  time = 0,
  size = 0,
}: {
  fill?: number;
  arm?: number;
  squish?: number;
  glow?: number;
  dist?: number;
  time?: number;
  size?: number;
}) => {
  const m = useMemo(
    () => ({
      yellow: std('#ffc21a', {roughness: 0.45}),
      yellowDark: std('#e0a00c', {roughness: 0.5}),
      black: std('#1f2125', {roughness: 0.75}),
      grey: std('#5b6068', {roughness: 0.5, metalness: 0.2}),
      hub: std('#ff8a1f', {roughness: 0.45}),
      red: std('#e2392b', {roughness: 0.45}),
      white: std('#f5f5f0', {roughness: 0.5}),
      glass: new THREE.MeshStandardMaterial({color: '#9fdcf5', roughness: 0.08, metalness: 0.1, emissive: '#5fb7e0', emissiveIntensity: 0.25, flatShading: true}),
      light: new THREE.MeshStandardMaterial({color: '#fff6c8', emissive: '#ffe58a', emissiveIntensity: 0.9, flatShading: true}),
      beacon: new THREE.MeshStandardMaterial({color: '#ff9a1f', emissive: '#ff7a00', emissiveIntensity: 0.4, transparent: true, opacity: 0.92, flatShading: true}),
    }),
    [],
  );
  const s = toyGrowScale(fill) * (1 + size);
  const sq = clamp(squish);
  const {trackX, trackW, trackL, trackH, deckY} = TOYEX;
  // Ketten: Glieder laufen mit der Fahrt
  const pads = 14;
  const loop = trackL * 2;
  const step = loop / pads;
  const off = ((dist % step) + step) % step;
  m.beacon.emissiveIntensity = 0.4 + 1.6 * clamp(glow) * (0.5 + 0.5 * Math.sin(time * 9));
  const boomA = THREE.MathUtils.degToRad(42 + arm);
  const stickA = THREE.MathUtils.degToRad(112 - arm * 0.4);
  const L1 = 0.86;
  const L2 = 0.62;
  return (
    <group scale={[s * (1 + 0.12 * sq), s * (1 - 0.22 * sq), s * (1 + 0.12 * sq)]}>
      {/* Ketten mit runden Enden + großen Radkappen */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * trackX, 0, 0]}>
          <mesh material={m.black} position={[0, trackH / 2, 0]} castShadow>
            <boxGeometry args={[trackW, trackH, trackL - trackH]} />
          </mesh>
          {[-1, 1].map((e) => (
            <mesh key={e} material={m.black} position={[0, trackH / 2, e * (trackL - trackH) / 2]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[trackH / 2, trackH / 2, trackW, 10]} />
            </mesh>
          ))}
          {/* Glieder oben (laufen) */}
          {Array.from({length: pads}, (_, i) => {
            const u = (i * step + off) % loop;
            if (u > trackL - trackH) return null;
            const z = -(trackL - trackH) / 2 + u;
            return (
              <mesh key={i} material={m.grey} position={[0, trackH + 0.008, z]}>
                <boxGeometry args={[trackW + 0.02, 0.03, 0.06]} />
              </mesh>
            );
          })}
          {[-0.42, 0, 0.42].map((z, i) => (
            <group key={z} position={[sd * (trackW / 2 + 0.006), trackH / 2, z]} rotation={[0, sd * Math.PI / 2, 0]}>
              <mesh material={i === 1 ? m.grey : m.hub}>
                <circleGeometry args={[i === 1 ? 0.1 : 0.13, 10]} />
              </mesh>
              <mesh material={m.black} position={[0, 0, 0.004]}>
                <circleGeometry args={[0.035, 8]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Drehkranz */}
      <mesh material={m.black} position={[0, trackH + 0.04, 0]}>
        <cylinderGeometry args={[0.36, 0.4, 0.08, 12]} />
      </mesh>
      {/* Oberwagen */}
      <group position={[0, deckY, -0.08]}>
        <mesh material={m.yellow} position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.02, 0.4, 1.08]} />
        </mesh>
        {/* Kante oben (Low-Poly-Fase) */}
        <mesh material={m.yellowDark} position={[0, 0.41, 0]}>
          <boxGeometry args={[0.98, 0.03, 1.04]} />
        </mesh>
        {/* Gegengewicht hinten, rund, mit Warnstreifen */}
        <mesh material={m.yellowDark} position={[0, 0.24, -0.6]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.55]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 1.0, 8]} />
        </mesh>
        {[-0.36, -0.12, 0.12, 0.36].map((x) => (
          <mesh key={x} material={m.black} position={[x, 0.24, -0.735]} rotation={[0, Math.PI, 0.55]}>
            <planeGeometry args={[0.09, 0.34]} />
          </mesh>
        ))}
        {/* Auspuff */}
        <mesh material={m.black} position={[-0.32, 0.56, -0.34]}>
          <cylinderGeometry args={[0.035, 0.035, 0.34, 8]} />
        </mesh>
        {/* Kabine links (+x) */}
        <group position={[0.2, 0.42, 0.12]}>
          <mesh material={m.yellow} position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.56, 0.12, 0.62]} />
          </mesh>
          {/* Eck-Pfosten */}
          {[-1, 1].map((sx) =>
            [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} material={m.yellow} position={[sx * 0.25, 0.4, sz * 0.28]} castShadow>
                <boxGeometry args={[0.06, 0.58, 0.06]} />
              </mesh>
            )),
          )}
          {/* Fenster: vorn, beide Seiten, hinten */}
          <mesh material={m.glass} position={[0, 0.41, 0.285]}>
            <boxGeometry args={[0.44, 0.5, 0.02]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} material={m.glass} position={[sx * 0.255, 0.41, 0]}>
              <boxGeometry args={[0.02, 0.5, 0.5]} />
            </mesh>
          ))}
          <mesh material={m.yellow} position={[0, 0.41, -0.285]}>
            <boxGeometry args={[0.44, 0.5, 0.02]} />
          </mesh>
          {/* Sitz + kleines Lenkrad (sichtbar durch die Scheiben) */}
          <mesh material={m.black} position={[0, 0.24, -0.08]}>
            <boxGeometry args={[0.22, 0.2, 0.2]} />
          </mesh>
          {/* rotes Dach + Rundumleuchte */}
          <mesh material={m.red} position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[0.64, 0.08, 0.7]} />
          </mesh>
          <mesh material={m.black} position={[0.12, 0.78, -0.1]}>
            <cylinderGeometry args={[0.05, 0.06, 0.04, 8]} />
          </mesh>
          <mesh material={m.beacon} position={[0.12, 0.84, -0.1]} rotation={[0, time * 6 * clamp(glow), 0]}>
            <cylinderGeometry args={[0.045, 0.05, 0.09, 6]} />
          </mesh>
          {/* Scheinwerfer vorn am Dach */}
          {[-0.18, 0.18].map((x) => (
            <mesh key={x} material={m.light} position={[x, 0.66, 0.33]}>
              <sphereGeometry args={[0.04, 8, 6]} />
            </mesh>
          ))}
        </group>
        {/* Ausleger rechts vorn: Fuß, Ausleger, Stiel, Schaufel */}
        <group position={[-0.24, 0.42, 0.4]}>
          <mesh material={m.yellowDark} position={[0, 0.05, 0]}>
            <boxGeometry args={[0.24, 0.16, 0.2]} />
          </mesh>
          <group rotation={[-boomA, 0, 0]}>
            <mesh material={m.yellow} position={[0, 0, L1 / 2]} castShadow>
              <boxGeometry args={[0.17, 0.17, L1]} />
            </mesh>
            {/* Hydraulik-Zylinder (Stange) */}
            <mesh material={m.grey} position={[0, -0.13, L1 * 0.35]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, L1 * 0.55, 6]} />
            </mesh>
            <mesh material={m.black} position={[0, 0, L1]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.1, 0.1, 0.2, 10]} />
            </mesh>
            <group position={[0, 0, L1]} rotation={[stickA, 0, 0]}>
              <mesh material={m.yellow} position={[0, 0, L2 / 2]} castShadow>
                <boxGeometry args={[0.14, 0.14, L2]} />
              </mesh>
              <mesh material={m.black} position={[0, 0, L2]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.075, 0.075, 0.18, 10]} />
              </mesh>
              {/* Schaufel: schwarz-grau, nach vorn offen, stumpfe Comic-Zähne */}
              <group position={[0, 0, L2]} rotation={[-0.9, 0, 0]}>
                <mesh material={m.grey} position={[0, 0.0, 0.14]} castShadow>
                  <boxGeometry args={[0.36, 0.06, 0.28]} />
                </mesh>
                <mesh material={m.grey} position={[0, -0.12, 0.02]}>
                  <boxGeometry args={[0.36, 0.24, 0.05]} />
                </mesh>
                {[-1, 1].map((sx) => (
                  <mesh key={sx} material={m.grey} position={[sx * 0.18, -0.07, 0.13]}>
                    <boxGeometry args={[0.03, 0.16, 0.26]} />
                  </mesh>
                ))}
                {[-0.12, -0.04, 0.04, 0.12].map((x) => (
                  <mesh key={x} material={m.white} position={[x, 0.0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.03, 0.07, 4]} />
                  </mesh>
                ))}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// ---------- Schild „AUSGANG“ ----------
const exitTex = canvasTex(640, 240, (g) => {
  g.fillStyle = '#0f8f4e';
  g.fillRect(0, 0, 640, 240);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 10;
  g.strokeRect(12, 12, 616, 216);
  // Tür-Symbol (Rahmen) + laufende Figur, einfache Striche
  g.lineWidth = 9;
  g.strokeRect(46, 52, 92, 140);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(112, 78, 13, 0, Math.PI * 2);
  g.fill();
  g.lineCap = 'round';
  g.lineWidth = 11;
  const line = (pts: [number, number][]) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  };
  line([[106, 96], [96, 136]]);
  line([[96, 136], [116, 160], [112, 186]]);
  line([[96, 136], [78, 156], [64, 160]]);
  line([[103, 108], [124, 122]]);
  line([[103, 108], [84, 116]]);
  // Schrift
  g.font = '800 104px "Barlow Condensed", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('AUSGANG', 350, 124);
  // Pfeil
  g.beginPath();
  g.moveTo(540, 104);
  g.lineTo(580, 104);
  g.lineTo(580, 80);
  g.lineTo(616, 120);
  g.lineTo(580, 160);
  g.lineTo(580, 136);
  g.lineTo(540, 136);
  g.closePath();
  g.fill();
});
export const EXIT_SIGN = {w: 0.8, h: 0.3};
export const ExitSign = ({glow = 0, hang = false, time = 0, size = 0}: {glow?: number; hang?: boolean; time?: number; size?: number}) => {
  const m = useMemo(() => ({frame: std('#3b4048', {roughness: 0.4, metalness: 0.3}), wire: std('#6b7078', {metalness: 0.5, roughness: 0.4})}), []);
  const pulse = clamp(glow) * (0.5 + 0.5 * Math.sin(time * 6));
  const {w, h} = EXIT_SIGN;
  return (
    <group scale={1 + size}>
      <mesh material={m.frame}>
        <boxGeometry args={[w + 0.04, h + 0.04, 0.04]} />
      </mesh>
      {[1, -1].map((sd) => (
        <group key={sd} position={[0, 0, sd * 0.022]} rotation={[0, sd > 0 ? 0 : Math.PI, 0]}>
          <TextPlane draw={exitTex} k="ausgang-schild" w={w} h={h} glow={0.45 + 0.6 * pulse} />
        </group>
      ))}
      {hang &&
        [-0.3, 0.3].map((x) => (
          <mesh key={x} material={m.wire} position={[x, h / 2 + 1.2, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 2.4, 4]} />
          </mesh>
        ))}
    </group>
  );
};

// ---------- Comic-Stern „PLOPP!“ ----------
const plopTex = canvasTex(512, 512, (g) => {
  const spikes = 12;
  const star = (ro: number, ri: number, col: string) => {
    g.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? ri : ro * (0.86 + 0.14 * (((i * 5) % 3) / 2));
      g.lineTo(256 + Math.cos(a) * rr, 256 + Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = col;
    g.fill();
  };
  star(248, 168, '#1f8fe0');
  star(222, 148, '#7fd3ff');
  star(188, 124, '#ffffff');
  g.save();
  g.translate(256, 262);
  g.rotate(0.1);
  g.lineJoin = 'round';
  g.font = '800 140px "Barlow Condensed", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 16;
  g.strokeStyle = '#1b1b1b';
  g.strokeText('PLOPP!', 0, 0);
  g.fillStyle = '#ffd21a';
  g.fillText('PLOPP!', 0, 0);
  g.restore();
});
export const PlopStar = ({fill = 0, size = 0}: {fill?: number; size?: number}) => {
  const f = clamp(fill);
  if (f <= 0.001 || f >= 0.999) return null;
  const k = f < 0.15 ? easeInOut(f / 0.15) * 1.15 : f < 0.25 ? 1.15 - 0.15 * ((f - 0.15) / 0.1) : 1;
  const fade = 1 - clamp((f - 0.7) / 0.3);
  return (
    <group scale={(1 + size) * k * (0.85 + 0.15 * fade) * (fade > 0.02 ? 1 : 0.0001)}>
      <TextPlane draw={plopTex} k="plopp-stern" w={0.9} h={0.9} glow={0.9} />
    </group>
  );
};

// ---------- Ausrufezeichen über dem Kopf ----------
export const Exclaim = ({amount, time}: {amount: number; time: number}) => {
  const m = useMemo(
    () => ({
      edge: new THREE.MeshBasicMaterial({color: '#1b1b1b'}),
      fill: new THREE.MeshBasicMaterial({color: '#ffd21a'}),
    }),
    [],
  );
  if (amount < 0.02) return null;
  const pop = amount < 1 ? amount : 1 + 0.05 * Math.sin(time * 7);
  return (
    <group scale={pop} rotation={[0, 0, Math.sin(time * 3.1) * 0.08]}>
      {[
        {mat: m.edge, g: 0.014, z: -0.004},
        {mat: m.fill, g: 0, z: 0},
      ].map(({mat, g, z}, i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh material={mat} position={[0, 0.07, 0]}>
            <planeGeometry args={[0.06 + g * 2, 0.2 + g * 2]} />
          </mesh>
          <mesh material={mat} position={[0, -0.1, 0]}>
            <circleGeometry args={[0.038 + g, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
