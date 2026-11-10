import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Motion, Shot} from './data/types';
import {Scene3D} from './Scene3D';
import {STAGES} from './stage';
import {useFonts} from './ui/fonts';
import {T} from './ui/theme';

/**
 * Baukasten-Ansicht: zeigt jede Bewegung von Dummy und Bär einzeln (je 3 s).
 * Nur zum Prüfen – kommt in keinem Quiz-Video vor.
 */
type Demo = {label: string; shot: Shot};

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
];

export const SHOWCASE_SECONDS_EACH = 3;
export const SHOWCASE_FRAMES = DEMOS.length * SHOWCASE_SECONDS_EACH * 30;

export const Showcase = () => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const each = SHOWCASE_SECONDS_EACH * fps;
  const i = Math.min(DEMOS.length - 1, Math.floor(frame / each));
  const local = frame - i * each;
  const demo = DEMOS[i];
  return (
    <AbsoluteFill style={{background: T.anthracite}}>
      <Scene3D stage={STAGES.wald} shot={demo.shot} t={local / each} seconds={SHOWCASE_SECONDS_EACH} />
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
