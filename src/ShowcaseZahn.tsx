import type {ActorKey, Motion, Shot} from './data/types';
import type {Demo} from './Showcase';

// ---------- Baukasten: neu für "Känguru-Zahn" (Zahnunfall) ----------
const OB = 'outback';
const kDemo = (label: string, motion: Motion, to: [number, number] = [0, 0], seconds = 3): Demo => ({
  label: `Känguru: ${label}`,
  stage: OB,
  seconds,
  shot: {
    camera: [
      {t: 0, pos: [1.6, 1.6, 7.4], look: [to[0] / 2, 1.05, 3.6 + to[1] / 2]},
      {t: 1, pos: [2.2, 1.7, 7.0], look: [to[0] / 2, 1.05, 3.6 + to[1] / 2]},
    ],
    actors: {kaenguru: [{t: 0, x: 0, z: 3.6, face: 160, motion}, {t: 1, x: to[0], z: 3.6 + to[1], face: 160, motion}]},
  },
});
const TEETH = {gloves: 0, teeth: 1, gap: 1};
const zDemo = (
  label: string,
  motion: Motion,
  extra: Partial<ActorKey> = {},
  seconds = 3,
  actors: Shot['actors'] = {},
  cam?: Shot['camera'],
  stage = OB,
): Demo => ({
  label: `Dummy: ${label}`,
  stage,
  seconds,
  shot: {
    camera: cam ?? [
      {t: 0, pos: [1.4, 1.5, 6.4], look: [0, 0.9, 3.6]},
      {t: 1, pos: [1.9, 1.55, 6.0], look: [0, 0.9, 3.6]},
    ],
    actors: {dummy: [{t: 0, x: 0, z: 3.6, face: 160, motion, ...TEETH, ...extra}], ...actors},
  },
});
const TAP = {x: 2.0, z: 3.6};
export const ZAHN_DEMOS: Demo[] = [
  {
    label: 'Bühne: Boxring im Outback (Sonnenuntergang)',
    stage: OB,
    seconds: 3,
    shot: {
      camera: [
        {t: 0, pos: [3.2, 2.6, 10.5], look: [0, 1.0, 0]},
        {t: 1, pos: [2.2, 2.4, 9.8], look: [0, 1.0, 0]},
      ],
      actors: {
        kaenguru: [{t: 0, x: 0.75, z: -0.4, face: 240, motion: 'guard'}],
        dummy: [{t: 0, x: -0.7, z: 0.3, face: 60, motion: 'boxguard', gloves: 1, teeth: 1}],
      },
    },
  },
  kDemo('stehen', 'stand'),
  kDemo('Boxhaltung', 'guard'),
  kDemo('hüpfen', 'hop', [1.2, 0.8], 3),
  kDemo('Schlag', 'punch', [0, 0], 2),
  kDemo('Siegerpose', 'victory'),
  zDemo('Boxhaltung mit Boxhandschuhen', 'boxguard', {gloves: 1, gap: 0}),
  zDemo('getroffen + taumeln', 'hitstagger', {gloves: 1, gap: 1}, 3),
  zDemo('benommen (Zahnlücke)', 'dazed', {}, 3, {}, [
    {t: 0, pos: [0.25, 1.75, 5.0], look: [0, 1.62, 3.6]},
    {t: 1, pos: [0.4, 1.75, 4.8], look: [0, 1.62, 3.6]},
  ]),
  zDemo('hinknien + Zahn suchen', 'searchkneel', {}, 3.5, {zahn: [{t: 0, x: 0.1, y: 0.02, z: 4.25, face: 30, motion: 'lie'}]}),
  zDemo(
    'Zahn an der Krone hochheben',
    'pickcrown',
    {mark: 1},
    3,
    {
      zahn: [
        {t: 0, x: 0.08, y: 0.02, z: 4.12, face: 30, motion: 'lie', mark: 1},
        {t: 0.29, x: 0.08, y: 0.02, z: 4.12, motion: 'lie'},
        {t: 0.3, x: 0.08, y: -30, z: 4.12, motion: 'lie'},
      ],
      hinweis: [
        {t: 0, x: 0, y: -30, z: 0, motion: 'stand'},
        {t: 0.62, x: 0.0, y: 0.98, z: 3.9, motion: 'show', text: 'Nicht anfassen', size: 0.3},
      ],
    },
    [
      {t: 0, pos: [0.9, 1.15, 5.2], look: [0, 0.75, 3.75]},
      {t: 1, pos: [0.8, 1.2, 5.0], look: [0, 0.9, 3.75]},
    ],
  ),
  zDemo('Zahn halten', 'holdtooth', {}, 2.5),
  {
    label: 'Dummy: Zahn unter dem Wasserhahn abspülen',
    stage: OB,
    seconds: 3,
    shot: {
      camera: [
        {t: 0, pos: [TAP.x + 0.6, 1.3, TAP.z + 2.6], look: [TAP.x + 0.3, 0.95, TAP.z]},
        {t: 1, pos: [TAP.x + 0.4, 1.3, TAP.z + 2.3], look: [TAP.x + 0.3, 0.95, TAP.z]},
      ],
      actors: {
        wasserhahn: [{t: 0, x: TAP.x, z: TAP.z, face: 90, motion: 'stand', water: 1}],
        dummy: [{t: 0, x: TAP.x + 0.62, z: TAP.z, face: 270, motion: 'rinsetooth', ...TEETH}],
      },
    },
  },
  zDemo('Zahn ins Taschentuch wickeln', 'wraptooth', {wrap: 0}, 3),
  {
    label: 'Dummy: Zahn ins Glas legen (Glas, Box, H-Milch auf dem Tisch)',
    stage: OB,
    seconds: 3,
    shot: {
      camera: [
        {t: 0, pos: [-3.2, 1.4, 4.6], look: [-3.4, 0.85, 2.2]},
        {t: 1, pos: [-3.0, 1.35, 4.3], look: [-3.4, 0.85, 2.2]},
      ],
      actors: {
        dummy: [{t: 0, x: -3.92, z: 2.2, face: 90, motion: 'placetooth', ...TEETH}],
        wasserglas: [{t: 0, x: -3.5, y: 0.6, z: 2.3, motion: 'stand'}],
        zahn: [
          {t: 0, x: -3.5, y: -30, z: 2.3, motion: 'lie'},
          {t: 0.26, x: -3.5, y: -30, z: 2.3, motion: 'lie'},
          {t: 0.27, x: -3.5, y: 0.66, z: 2.3, face: 20, motion: 'lie', gray: 0},
          {t: 1, x: -3.5, y: 0.63, z: 2.3, motion: 'lie', gray: 1},
        ],
        zahnrettungsbox: [{t: 0, x: -3.2, y: 0.6, z: 2.1, face: 160, motion: 'stand', lid: 1}],
        hmilch: [{t: 0, x: -2.98, y: 0.6, z: 2.2, face: 170, motion: 'stand'}],
        taschentuch: [{t: 0, x: -3.3, y: 0.61, z: 2.38, motion: 'stand', wrap: 0.3}],
      },
    },
  },
  {
    label: 'Zahn: fliegt im Bogen',
    stage: OB,
    seconds: 2,
    shot: {
      camera: [
        {t: 0, pos: [3.5, 1.6, 7.5], look: [0.6, 1.0, 2.5]},
        {t: 1, pos: [3.5, 1.6, 7.5], look: [0.6, 0.8, 2.8]},
      ],
      actors: {
        zahn: [
          {t: 0, x: 0, y: 1.1, z: 0.6, motion: 'fly', size: 1.5},
          {t: 0.4, x: 0.6, y: 1.9, z: 2.2, motion: 'fly'},
          {t: 0.8, x: 1.1, y: 0.03, z: 3.7, motion: 'fly'},
          {t: 0.82, x: 1.1, y: 0.03, z: 3.7, motion: 'lie'},
        ],
      },
    },
  },
  zDemo(
    'im Behandlungsstuhl',
    'dentalsit',
    {x: 0, z: -0.5, face: 180, gap: 0},
    3,
    {arzt: [{t: 0, x: 0.75, z: -0.75, face: 250, motion: 'stand'}]},
    [
      {t: 0, pos: [0.3, 1.9, 3.4], look: [0, 0.95, -0.7]},
      {t: 1, pos: [0.5, 1.9, 3.1], look: [0, 0.95, -0.7]},
    ],
    'zahnarztpraxis',
  ),
];
