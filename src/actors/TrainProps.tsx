import {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, rng} from '../lib/anim';
import {T} from '../ui/theme';
import {canvasTex, fitText, TextPlane} from './WgProps';

/**
 * Objekte für das Bahnsteig-Video "Sog an der Bahnsteigkante" (wiederverwendbar für alle Gleis-Szenen):
 *  - Train ("zug"): schneller, stilisierter Durchgangszug (Triebkopf + 3 Wagen + Steuerwagen, ca. 78 m), dunkelblau mit hellem
 *      Fensterband und orangem Streifen, stumpfe abgerundete Nase – ohne echte Logos, kein ICE-Design. Ursprung = Nasenspitze
 *      unten in Gleismitte auf dem Gleisbett (Figur steht im Gleis → y relativ zum Gleisbett), Zug zeigt nach +z (face wie bei
 *      Figuren, face 90 = fährt nach +x). Stromabnehmer am Triebkopf reicht bis zum Fahrdraht (5,31 m über dem Gleisbett).
 *      Bewegung "pass" mit Weg über Zeitpunkte; ab ca. 8 m/s Bewegungsunschärfe (Geisterbilder) + Windlinien am Zug.
 *  - PlasticCup ("becher"): Kaffeebecher aus Plastik/Pappe mit Deckel + Banderole. Bewegung "toss" = wirbelt durch die Luft
 *      (Weg über Zeitpunkte), sonst steht er. size = größer.
 *  - SoundWaves ("durchsage"): gelbe Schallwellen-Bögen ")))" (schaut immer zur Kamera), Bewegung "show" = pulsieren.
 *      side 1 = Bögen öffnen nach links statt nach rechts. size = größer.
 *  - FilmPhone ("filmhandy"): Handy quer zum Filmen – Display zeigt Gleis + Zug + roten Aufnahme-Punkt. Display zeigt nach +z
 *      (für den Dummy: face des Dummys + 180). In der Hand mit "hand" 1 (Dummy-Bewegung "filmphone").
 *  - SuctionWind ("sog"): Windlinien, die vom Bahnsteig zum Gleis gezogen werden (lokal +z = Richtung Gleis, also face 0 auf dem
 *      Bahnsteig). wind 0 … 1 = Stärke, drift −1 … 1 = seitlich mitgezogen (+ = lokal −x … siehe Zug-Richtung), size = breiter.
 */

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color, roughness: 0.5, flatShading: true, ...extra});

/** Maße (Meter, im Zug-System: y über dem Gleisbett, Zug zeigt nach +z) */
export const TRAIN = {
  floor: 1.0,
  roof: 4.15,
  width: 2.9,
  car: 17.5,
  gap: 0.55,
  cars: 5,
  wireH: 5.31,
};
export const TRAIN_LENGTH = TRAIN.cars * TRAIN.car + (TRAIN.cars - 1) * TRAIN.gap;

const C = {
  body: '#23426b',
  band: '#cfd8e2',
  stripe: '#f39a2b',
  glass: '#101a26',
  under: '#2a2d31',
  roof: '#9aa6b2',
  light: '#fff6d8',
};

/** Seitenprofil eines Wagens (z, y) → ExtrudeGeometry quer (x). nose: 1 = Nase vorn (+z), −1 = Nase hinten, 0 = keine */
const carGeometry = (nose: 1 | -1 | 0) => {
  const L = TRAIN.car;
  const f = TRAIN.floor;
  const r = TRAIN.roof;
  const pts: [number, number][] = [];
  // Nase-Profil (vom vorderen Ende aus): Puffer → Stirn → schräge Scheibe → Dach
  const noseProf = (z0: number, dir: 1 | -1): [number, number][] => [
    [z0, f + 0.25],
    [z0, f + 1.15],
    [z0 - dir * 0.45, f + 1.75],
    [z0 - dir * 2.0, r - 0.15],
    [z0 - dir * 2.6, r],
  ];
  // vorn = z 0, hinten = z −L
  if (nose === 1) {
    pts.push([-L, f], [-0.2, f], ...noseProf(0, 1));
    pts.push([-L, r]);
  } else if (nose === -1) {
    pts.push([-L + 0.2, f], [0, f], [0, r]);
    pts.push(...noseProf(-L, -1).reverse());
  } else {
    pts.push([-L, f], [0, f], [0, r], [-L, r]);
  }
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const depth = TRAIN.width - 0.3;
  const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.14, bevelSegments: 2, curveSegments: 4});
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2);
  // nach rotateY: Form-x → Welt-z? (x,z) → (−z, x): Form-x (z-Profil) liegt jetzt auf z, Extrusion auf x
  g.computeVertexNormals();
  return g;
};

/** Ein Wagen (oder Triebkopf/Steuerwagen) – Ursprung = vorderes Ende unten Mitte (z 0), reicht bis z −car */
const Car = ({nose, m, geo, pantograph, display}: {nose: 1 | -1 | 0; m: ReturnType<typeof useTrainMats>; geo: THREE.BufferGeometry; pantograph?: boolean; display?: string}) => {
  const L = TRAIN.car;
  const hw = TRAIN.width / 2;
  const winFrom = nose === 1 ? -3.0 : -0.9;
  const winTo = nose === -1 ? -L + 3.0 : -L + 0.9;
  return (
    <group>
      <mesh geometry={geo} material={m.body} castShadow receiveShadow />
      {/* helles Fensterband + Fenster + oranger Streifen (beide Seiten) */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * (hw + 0.004), 0, 0]} rotation={[0, (sd * Math.PI) / 2, 0]}>
          <mesh material={m.band} position={[sd * -((winFrom + winTo) / 2), 2.85, 0]}>
            <planeGeometry args={[Math.abs(winTo - winFrom), 0.95]} />
          </mesh>
          {Array.from({length: Math.floor(Math.abs(winTo - winFrom) / 1.9)}, (_, i) => (
            <mesh key={i} material={m.glass} position={[sd * -(winFrom - 0.95 - i * 1.9), 2.88, 0.004]}>
              <planeGeometry args={[1.45, 0.66]} />
            </mesh>
          ))}
          <mesh material={m.stripe} position={[sd * -((winFrom + winTo) / 2), 2.12, 0.002]}>
            <planeGeometry args={[Math.abs(winTo - winFrom) + (nose ? 0.8 : 0), 0.2]} />
          </mesh>
          {/* Türen */}
          {(nose === 0 ? [-2.2, -L + 2.2] : nose === 1 ? [-L + 2.2] : [-2.2]).map((z) => (
            <mesh key={z} material={m.door} position={[sd * -z, 2.15, 0.006]}>
              <planeGeometry args={[1.0, 2.0]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Unterboden-Schürze + Drehgestelle */}
      <mesh material={m.under} position={[0, 0.82, -L / 2]}>
        <boxGeometry args={[TRAIN.width - 0.3, 0.36, L - 0.6]} />
      </mesh>
      {[-2.6, -L + 2.6].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh material={m.bogie} position={[0, 0.55, 0]}>
            <boxGeometry args={[2.2, 0.35, 2.8]} />
          </mesh>
          {[-1, 1].map((wz) =>
            [-1, 1].map((wx) => (
              <mesh key={`${wz}${wx}`} material={m.wheel} position={[wx * 0.78, 0.47, wz * 1.0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.45, 0.45, 0.14, 12]} />
              </mesh>
            )),
          )}
        </group>
      ))}
      {/* Dach-Aufbauten */}
      <mesh material={m.roofBox} position={[0, TRAIN.roof + 0.12, -L / 2]}>
        <boxGeometry args={[1.5, 0.22, nose ? L - 6 : L - 3]} />
      </mesh>
      {nose !== 0 && <NoseDetails m={m} dir={nose} L={L} display={display} />}
      {pantograph && <Pantograph m={m} z={-6.5} />}
    </group>
  );
};

/** Scheibe, Scheinwerfer und Streifen an der Nase */
/** Zugzielanzeige hinter der Frontscheibe (orange LED-Schrift auf Schwarz), z. B. "+90 Min" */
const displayTex = (text: string) =>
  canvasTex(768, 192, (g) => {
    g.fillStyle = '#0b0b0c';
    g.fillRect(0, 0, 768, 192);
    g.fillStyle = '#ffb21a';
    fitText(g, text, 384, 100, 720, 150, 800);
  });
const NoseDetails = ({m, dir, L, display}: {m: ReturnType<typeof useTrainMats>; dir: 1 | -1; L: number; display?: string}) => {
  const z0 = dir === 1 ? 0 : -L;
  const f = TRAIN.floor;
  // schräge Frontscheibe zwischen (z0 − 0.45, f + 1.75) und (z0 − 2.0, roof − 0.15)
  const za = z0 - dir * 0.5;
  const zb = z0 - dir * 1.95;
  const ya = f + 1.8;
  const yb = TRAIN.roof - 0.2;
  const len = Math.hypot(zb - za, yb - ya);
  const ang = Math.atan2(yb - ya, Math.abs(zb - za));
  return (
    <group>
      <mesh material={m.glass} position={[0, (ya + yb) / 2 + 0.03, (za + zb) / 2 + dir * 0.02]} rotation={[dir === 1 ? -(Math.PI / 2 - ang) : -(Math.PI / 2 + ang), 0, 0]}>
        <planeGeometry args={[TRAIN.width - 0.55, len * 0.92]} />
      </mesh>
      {display && (
        <group position={[0, ya + (yb - ya) * 0.72, za + (zb - za) * 0.72 + dir * 0.06]} rotation={[dir === 1 ? -(Math.PI / 2 - ang) : -(Math.PI / 2 + ang), 0, 0]}>
          <group rotation={[0, dir === 1 ? 0 : Math.PI, 0]} scale={[1, dir === 1 ? 1 : -1, 1]}>
            <TextPlane draw={displayTex(display)} k={`Zuganzeige ${display}`} w={2.1} h={0.52} glow={1.2} />
          </group>
        </group>
      )}
      {/* Stirn: oranger Streifen + Scheinwerfer + Rücklicht */}
      <mesh material={m.stripe} position={[0, f + 0.75, z0 + dir * 0.16]} rotation={[0, dir === 1 ? 0 : Math.PI, 0]}>
        <planeGeometry args={[TRAIN.width - 0.3, 0.22]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} material={dir === 1 ? m.head : m.tail} position={[sx * 0.95, f + 0.45, z0 + dir * 0.16]} rotation={[0, dir === 1 ? 0 : Math.PI, 0]}>
          <circleGeometry args={[0.13, 10]} />
        </mesh>
      ))}
      <mesh material={m.head} position={[0, f + 1.42, z0 - dir * 0.2 + dir * 0.17]} rotation={[dir * -0.6, dir === 1 ? 0 : Math.PI, 0]}>
        <planeGeometry args={[0.5, 0.1]} />
      </mesh>
      {/* Puffer-Schürze */}
      <mesh material={m.under} position={[0, f + 0.05, z0 - dir * 0.3]}>
        <boxGeometry args={[TRAIN.width - 0.5, 0.35, 0.5]} />
      </mesh>
    </group>
  );
};

/** Stromabnehmer (Rautenform) vom Dach bis zum Fahrdraht */
const Pantograph = ({m, z}: {m: ReturnType<typeof useTrainMats>; z: number}) => {
  const y0 = TRAIN.roof + 0.25;
  const y1 = TRAIN.wireH - 0.03;
  const h = y1 - y0;
  const arm = Math.hypot(h / 2, 0.9);
  const a = Math.atan2(0.9, h / 2);
  return (
    <group position={[0, 0, z]}>
      <mesh material={m.under} position={[0, y0 - 0.05, 0]}>
        <boxGeometry args={[1.2, 0.12, 1.4]} />
      </mesh>
      {/* unterer + oberer Arm */}
      <mesh material={m.panto} position={[0, y0 + h / 4, -0.45]} rotation={[a, 0, 0]}>
        <boxGeometry args={[0.07, arm, 0.07]} />
      </mesh>
      <mesh material={m.panto} position={[0, y0 + (3 * h) / 4, -0.45]} rotation={[-a, 0, 0]}>
        <boxGeometry args={[0.06, arm, 0.06]} />
      </mesh>
      {/* Schleifleiste */}
      <mesh material={m.panto} position={[0, y1, 0]}>
        <boxGeometry args={[1.8, 0.06, 0.12]} />
      </mesh>
    </group>
  );
};

const useTrainMats = () =>
  useMemo(
    () => ({
      body: std(C.body, {roughness: 0.35, metalness: 0.15, flatShading: false}),
      band: std(C.band, {roughness: 0.4}),
      glass: new THREE.MeshStandardMaterial({color: C.glass, roughness: 0.12, metalness: 0.5}),
      stripe: std(C.stripe, {emissive: C.stripe, emissiveIntensity: 0.12}),
      door: std('#2f5583', {roughness: 0.4}),
      under: std(C.under),
      bogie: std('#1d1f22'),
      wheel: std('#3a3d41', {metalness: 0.5}),
      roofBox: std(C.roof),
      panto: std('#5b6168', {metalness: 0.4}),
      head: new THREE.MeshBasicMaterial({color: C.light}),
      tail: new THREE.MeshBasicMaterial({color: '#ff3a2a'}),
      ghost: new THREE.MeshBasicMaterial({color: '#3c5c86', transparent: true, opacity: 0.2, depthWrite: false}),
      streak: new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false}),
    }),
    [],
  );

/** Windlinien am Zug (im Zug-System, laufen nach hinten): Linien längs des Zuges, seitlich + oben */
const STREAKS = (() => {
  const r = rng(77);
  return Array.from({length: 46}, () => {
    const side = r() < 0.5 ? -1 : 1;
    const top = r() < 0.2;
    return {
      x: top ? (r() - 0.5) * 2.4 : side * (TRAIN.width / 2 + 0.15 + r() * 0.7),
      y: top ? TRAIN.roof + 0.3 + r() * 0.6 : 0.6 + r() * 3.6,
      len: 3 + r() * 6,
      z0: r(),
      speed: 0.35 + r() * 0.5,
    };
  });
})();

export const Train = ({speed = 0, time = 0, display, pantograph = true}: {speed?: number; time?: number; /** Anzeige hinter beiden Frontscheiben, z. B. "+90 Min" */ display?: string; /** Stromabnehmer zeigen (ohne Oberleitung: false) */ pantograph?: boolean}) => {
  const m = useTrainMats();
  const geos = useMemo(() => ({front: carGeometry(1), mid: carGeometry(0), back: carGeometry(-1)}), []);
  const blur = clamp((speed - 8) / 22);
  const span = TRAIN.car + TRAIN.gap;
  return (
    <group>
      {Array.from({length: TRAIN.cars}, (_, i) => {
        const nose = i === 0 ? 1 : i === TRAIN.cars - 1 ? -1 : 0;
        return (
          <group key={i} position={[0, 0, -i * span]}>
            <Car nose={nose} m={m} geo={nose === 1 ? geos.front : nose === -1 ? geos.back : geos.mid} pantograph={pantograph && i === 0} display={display} />
            {/* Übergang zwischen den Wagen */}
            {i < TRAIN.cars - 1 && (
              <mesh material={m.under} position={[0, 2.5, -TRAIN.car - TRAIN.gap / 2]}>
                <boxGeometry args={[2.3, 3.0, TRAIN.gap + 0.2]} />
              </mesh>
            )}
          </group>
        );
      })}
      {/* Bewegungsunschärfe: Geisterbilder hinter jedem Wagen + Windlinien */}
      {blur > 0.01 &&
        [0.9, 1.9, 3.0].map((off, k) =>
          Array.from({length: TRAIN.cars}, (_, i) => (
            <mesh
              key={`g${k}-${i}`}
              position={[0, (TRAIN.floor + TRAIN.roof) / 2 + 0.1, -i * span - TRAIN.car / 2 - off * blur * 1.6]}
              scale={[TRAIN.width + 0.1 + k * 0.08, TRAIN.roof - TRAIN.floor + 0.2, TRAIN.car + 0.4]}
              renderOrder={3}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#3c5c86" transparent opacity={(0.2 - k * 0.05) * blur} depthWrite={false} />
            </mesh>
          )),
        )}
      {blur > 0.01 &&
        STREAKS.map((s, i) => {
          const cyc = (time * s.speed + s.z0) % 1;
          const z = 6 - cyc * (TRAIN_LENGTH + 18);
          const op = Math.sin(cyc * Math.PI) * 0.75 * blur;
          return (
            <mesh key={`s${i}`} position={[s.x, s.y, z]} renderOrder={4}>
              <boxGeometry args={[0.035, 0.035, s.len * (0.5 + blur)]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={op} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
};

/** Kaffeebecher (Ursprung = Boden-Mitte), ca. 9 cm × 12 cm */
export const PlasticCup = ({size = 0}: {size?: number}) => {
  const m = useMemo(
    () => ({
      cup: std('#f4f1ea', {flatShading: false, roughness: 0.6}),
      band: std('#9a6a3d', {flatShading: false}),
      lid: std('#2c2c2e', {flatShading: false}),
    }),
    [],
  );
  return (
    <group scale={2.0 * (1 + size)}>
      <mesh material={m.cup} position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.033, 0.12, 14]} />
      </mesh>
      <mesh material={m.band} position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.0425, 0.037, 0.05, 14]} />
      </mesh>
      <mesh material={m.lid} position={[0, 0.126, 0]}>
        <cylinderGeometry args={[0.044, 0.047, 0.014, 14]} />
      </mesh>
      <mesh material={m.lid} position={[0.018, 0.136, 0]}>
        <boxGeometry args={[0.018, 0.008, 0.012]} />
      </mesh>
    </group>
  );
};

/** Gelbe Schallwellen ")))" – schauen zur Kamera (Billboard im Actor). time = Bewegungszeit, visible = "show" */
export const SoundWaves = ({time, visible, left = false, size = 0}: {time: number; visible: boolean; left?: boolean; size?: number}) => {
  if (!visible) return null;
  const k = clamp(time / 0.3);
  return (
    <group scale={(1 + size) * (0.6 + 0.4 * k)} rotation={[0, 0, left ? Math.PI : 0]}>
      {[0, 1, 2].map((i) => {
        const cyc = (time * 1.6 - i * 0.22 + 1) % 1;
        const r = 0.14 + i * 0.13 + cyc * 0.05;
        const op = k * (0.35 + 0.65 * Math.max(0, Math.sin(Math.PI * cyc)));
        return (
          <mesh key={i} rotation={[0, 0, -Math.PI / 4]} renderOrder={10}>
            <torusGeometry args={[r, 0.026, 6, 20, Math.PI / 2]} />
            <meshBasicMaterial color={T.yellow} transparent opacity={op} depthTest={false} depthWrite={false} />
          </mesh>
        );
      })}
      <mesh renderOrder={10}>
        <circleGeometry args={[0.05, 12]} />
        <meshBasicMaterial color={T.yellow} transparent opacity={k} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
};

/** Handy quer (Display nach +z): Gleis-Bild + Zug + roter Aufnahme-Punkt. Ursprung = rechte Hand (Display-Mitte 7 cm daneben) */
export const FilmPhone = ({time = 0}: {time?: number}) => {
  const m = useMemo(
    () => ({
      body: std('#2f6fd6', {roughness: 0.4, metalness: 0.2}),
      screen: new THREE.MeshBasicMaterial({color: '#7c8f9e'}),
      track: new THREE.MeshBasicMaterial({color: '#4a4f55'}),
      plat: new THREE.MeshBasicMaterial({color: '#b9b7b0'}),
      train: new THREE.MeshBasicMaterial({color: C.body}),
      stripe: new THREE.MeshBasicMaterial({color: C.stripe}),
      rec: new THREE.MeshBasicMaterial({color: '#ff2a2a'}),
      lens: std('#0c0d10', {metalness: 0.6}),
    }),
    [],
  );
  const blink = Math.sin(time * 6) > -0.3;
  return (
    <group position={[-0.07, 0, 0]}>
      <mesh material={m.body} castShadow>
        <boxGeometry args={[0.16, 0.078, 0.01]} />
      </mesh>
      <group position={[0, 0, 0.0056]}>
        <mesh material={m.screen}>
          <planeGeometry args={[0.145, 0.066]} />
        </mesh>
        <mesh material={m.plat} position={[0, -0.022, 0.0003]}>
          <planeGeometry args={[0.145, 0.022]} />
        </mesh>
        <mesh material={m.track} position={[0, -0.006, 0.0003]}>
          <planeGeometry args={[0.145, 0.01]} />
        </mesh>
        <mesh material={m.train} position={[-0.03, 0.006, 0.0006]}>
          <planeGeometry args={[0.05, 0.026]} />
        </mesh>
        <mesh material={m.stripe} position={[-0.03, 0.0, 0.0008]}>
          <planeGeometry args={[0.05, 0.004]} />
        </mesh>
        {blink && (
          <mesh material={m.rec} position={[0.058, 0.024, 0.001]}>
            <circleGeometry args={[0.0055, 10]} />
          </mesh>
        )}
      </group>
      <mesh material={m.lens} position={[0.06, 0.022, -0.0062]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.004, 10]} />
      </mesh>
    </group>
  );
};

/** Windlinien vom Bahnsteig zum Gleis (lokal +z = zum Gleis). wind = Stärke, drift = seitlich (lokal +x), width = Breite (m) */
const WIND = (() => {
  const r = rng(91);
  return Array.from({length: 26}, () => ({
    x: r() - 0.5,
    y: 0.12 + r() * 1.6,
    len: 0.22 + r() * 0.32,
    speed: 0.9 + r() * 0.9,
    off: r(),
    curve: (r() - 0.5) * 0.6,
  }));
})();
export const SuctionWind = ({time, wind, drift = 0, width = 1.8}: {time: number; wind: number; drift?: number; width?: number}) => {
  if (wind < 0.01) return null;
  const n = Math.round(10 + 16 * clamp(wind));
  return (
    <group>
      {WIND.slice(0, n).map((w, i) => {
        const cyc = (time * w.speed + w.off) % 1;
        const z = -0.9 + cyc * 1.7;
        const x = w.x * width + drift * cyc * 0.9 + w.curve * 0.5 * Math.sin(cyc * Math.PI);
        const op = Math.sin(cyc * Math.PI) * 0.7 * clamp(wind * 1.4);
        const ang = Math.atan2(drift * 0.9 + w.curve * 0.5 * Math.PI * Math.cos(cyc * Math.PI), 1.7);
        return (
          <group key={i} position={[x, w.y, z]} rotation={[0, ang, 0]}>
            <mesh renderOrder={6}>
              <boxGeometry args={[0.012, 0.012, w.len]} />
              <meshBasicMaterial color="#f4fbff" transparent opacity={op} depthWrite={false} />
            </mesh>
            {/* Pfeilspitze */}
            <mesh position={[0, 0, w.len / 2]} rotation={[Math.PI / 2, 0, 0]} renderOrder={6}>
              <coneGeometry args={[0.022, 0.055, 4]} />
              <meshBasicMaterial color="#f4fbff" transparent opacity={op} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
