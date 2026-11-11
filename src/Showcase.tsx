import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {Motion, Shot} from './data/types';
import {Scene3D} from './Scene3D';
import {STAGES} from './stage';
import {useFonts} from './ui/fonts';
import {T} from './ui/theme';

/**
 * Baukasten-Ansicht: zeigt jede Bewegung von Dummy, Bär und Kreuzotter einzeln (je 3 s, manche länger).
 * Nur zum Prüfen – kommt in keinem Quiz-Video vor.
 */
type Demo = {label: string; shot: Shot; stage?: string; seconds?: number};

const cam = (look: [number, number, number], dist = 6, side = 1): Shot['camera'] => [
  {t: 0, pos: [look[0] + side * dist * 0.75, look[1] + 1.2, look[2] + dist * 0.75], look},
  {t: 1, pos: [look[0] + side * dist * 0.95, look[1] + 1.3, look[2] + dist * 0.3], look},
];

const dummyDemo = (label: string, motion: Motion, to: [number, number], face = 0): Demo => ({
  label: `Dummy: ${label}`,
  shot: {
    camera: cam([to[0] / 2, 1, to[1] / 2]),
    actors: {
      dummy: [
        {t: 0, x: 0, z: 0, face, motion},
        {t: 1, x: to[0], z: to[1], face, motion},
      ],
    },
  },
});

const bearDemo = (label: string, motion: Motion, to: [number, number], face = 180): Demo => ({
  label: `Bär: ${label}`,
  shot: {
    // Kamera steht auf dem Weg vor dem Bär (seitlich stehen Bäume im Weg)
    camera: [
      {t: 0, pos: [1.0, 2.0, to[1] - 12 + 6.5], look: [to[0] / 2, 0.8, to[1] / 2 - 12]},
      {t: 1, pos: [-0.8, 2.3, to[1] - 12 + 5.5], look: [to[0] / 2, 0.8, to[1] / 2 - 12]},
    ],
    actors: {
      bear: [
        {t: 0, x: 0, z: -12, face, motion},
        {t: 1, x: to[0], z: to[1] - 12, face, motion},
      ],
    },
  },
});

function lichtungDummy(label: string, motion: Motion, face: number, bite: boolean, seconds = 3): Demo[] {
  // Kamera seitlich-vorne, niedrig – Dummy auf dem Pfad der Lichtung
  return [
    {
      label: `Dummy: ${label}`,
      stage: 'waldlichtung',
      seconds,
      shot: {
        camera: [
          {t: 0, pos: [-1.9, 1.35, 3.4], look: [0, 0.55, 0]},
          {t: 1, pos: [-2.4, 1.45, 2.7], look: [0, 0.55, 0]},
        ],
        actors: {dummy: [{t: 0, x: 0, z: 0, face, motion, bite}]},
      },
    },
  ];
}

function snakeDemo(label: string, motion: Motion, to: [number, number], face: number, seconds = 3): Demo {
  const mid: [number, number, number] = [to[0] / 2, 0.12, to[1] / 2 + 2];
  // Hinweis: Blickrichtung face und Weg "to" müssen zusammenpassen (face 180 = zur Kamera)
  return {
    label: `Kreuzotter: ${label}`,
    stage: 'waldlichtung',
    seconds,
    shot: {
      camera: [
        {t: 0, pos: [mid[0] - 0.9, 0.85, mid[2] + 1.9], look: mid},
        {t: 1, pos: [mid[0] - 0.4, 0.9, mid[2] + 2.0], look: mid},
      ],
      actors: {
        snake: [
          {t: 0, x: 0, z: 2, face, motion},
          {t: 1, x: to[0], z: 2 + to[1], face, motion},
        ],
      },
    },
  };
}

const DEMOS: Demo[] = [
  dummyDemo('stehen', 'stand', [0, 0]),
  dummyDemo('gehen', 'walk', [0, -3.5]),
  dummyDemo('rennen', 'run', [0, -9]),
  {
    label: 'Dummy: klettern',
    shot: {
      camera: [
        {t: 0, pos: [0.5, 2.5, 5], look: [3.3, 2, -2]},
        {t: 1, pos: [1.5, 3, 4.5], look: [3.3, 2.6, -2]},
      ],
      actors: {dummy: [{t: 0, x: 2.85, z: -1.55, motion: 'climb'}, {t: 1, x: 2.85, z: -1.55, y: 2.5, motion: 'climb'}]},
    },
  },
  dummyDemo('langsam rückwärts', 'backstep', [0, 1.5]),
  dummyDemo('langsam seitlich zurück', 'sidestep', [1.5, 1.2]),
  dummyDemo('stolpern', 'stumble', [0, -0.6]),
  dummyDemo('beschwichtigen', 'calm', [0, 0]),
  dummyDemo('winken', 'wave', [0, 0], 140),
  bearDemo('stehen', 'stand', [0, 0]),
  bearDemo('aufmerksam', 'alert', [0, 0]),
  bearDemo('schnüffeln', 'sniff', [0, 0], 220),
  bearDemo('gehen', 'walk', [0, 2.5]),
  bearDemo('rennen', 'run', [0, 6]),
  {
    label: 'Bär: klettern',
    shot: {
      camera: [
        {t: 0, pos: [1.6, 2.4, 6.5], look: [3.3, 1.6, -2]},
        {t: 1, pos: [2.6, 2.8, 5.5], look: [3.3, 2, -2]},
      ],
      actors: {bear: [{t: 0, x: 3.85, z: -1.6, motion: 'climb'}, {t: 1, x: 3.85, z: -1.6, y: 1.5, motion: 'climb'}]},
    },
  },
  // ---------- Neu für "Kreuzotter" (Bühne Waldlichtung) ----------
  {
    label: 'Bühne: Waldlichtung',
    stage: 'waldlichtung',
    seconds: 4,
    shot: {
      camera: [
        {t: 0, pos: [-1.2, 1.9, 6.5], look: [0.8, 0.6, -3]},
        {t: 1, pos: [1.6, 2.1, 6.0], look: [1.0, 0.4, -2]},
      ],
      actors: {snake: [{t: 0, x: 0.85, z: -0.3, y: 0.26, face: -110, motion: 'coil'}]},
    },
  },
  ...lichtungDummy('gebissen zusammenzucken', 'flinch', 200, true),
  ...lichtungDummy('zur Wade beugen (Aussaugen)', 'suck', 235, true, 3.5),
  ...lichtungDummy('Band ums Bein wickeln', 'tourniquet', 235, true, 4.5),
  ...lichtungDummy('besorgt zur Wade schauen', 'hurt', 200, true, 3),
  ...lichtungDummy('hinsetzen', 'sitdown', 225, true, 3),
  ...lichtungDummy('ruhig sitzen + telefonieren', 'phone', 225, true, 3.5),
  snakeDemo('zusammengerollt', 'coil', [0, 0], 160),
  snakeDemo('schlängeln', 'slither', [0.2, 0.9], 170),
  snakeDemo('zubeißen', 'strike', [0, 0], 150),
  snakeDemo('wegschlängeln', 'slither', [0.1, -1.6], 0, 3.5),
];

export const SHOWCASE_SECONDS_EACH = 3;
const secOf = (d: Demo) => d.seconds ?? SHOWCASE_SECONDS_EACH;
/** Startbild jeder Demo (zum gezielten Anschauen/Standbilder) */
export const SHOWCASE_STARTS: number[] = [];
DEMOS.forEach((d, i) => SHOWCASE_STARTS.push(i === 0 ? 0 : SHOWCASE_STARTS[i - 1] + secOf(DEMOS[i - 1]) * 30));
export const SHOWCASE_LIST = DEMOS.map((d, i) => ({label: d.label, from: SHOWCASE_STARTS[i], frames: secOf(d) * 30}));
export const SHOWCASE_FRAMES = DEMOS.reduce((sum, d) => sum + secOf(d) * 30, 0);

export const Showcase = () => {
  useFonts();
  const frame = useCurrentFrame();
  let i = DEMOS.length - 1;
  while (i > 0 && frame < SHOWCASE_STARTS[i]) i--;
  const demo = DEMOS[i];
  const each = secOf(demo) * 30;
  const local = frame - SHOWCASE_STARTS[i];
  return (
    <AbsoluteFill style={{background: T.anthracite}}>
      <Scene3D stage={STAGES[demo.stage ?? 'wald']} shot={demo.shot} t={local / each} seconds={secOf(demo)} />
      <div
        style={{
          position: 'absolute',
          left: T.left,
          top: T.top,
          background: T.yellow,
          color: T.black,
          fontFamily: T.font,
          fontWeight: 800,
          fontSize: 70,
          padding: '8px 24px',
          borderRadius: 12,
        }}
      >
        {demo.label}
      </div>
    </AbsoluteFill>
  );
};
