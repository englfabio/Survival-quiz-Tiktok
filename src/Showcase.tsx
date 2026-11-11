import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {ActorKey, Motion, Shot} from './data/types';
import {Scene3D} from './Scene3D';
import {STAGES} from './stage';
import {useFonts} from './ui/fonts';
import {T} from './ui/theme';

/**
 * Baukasten-Ansicht: zeigt jede Bewegung von Dummy, Bär, Kreuzotter und Auto einzeln (je 3 s, manche länger).
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

// ---------- Seeufer / Auto ----------
/** Auto treibt bei (0, −1) im See, Front zum See (face 0). Fahrerseite (Kamera-Seite) = −x in der Welt. */
const CAR_FLOAT = {t: 0, x: 0, z: -1, y: -0.55, face: 0, motion: 'float' as Motion};
const carSideCam = (dist = 5.6, h = 1.3): Shot['camera'] => [
  {t: 0, pos: [-dist, h, 0.2], look: [-0.5, 0.25, -0.9]},
  {t: 1, pos: [-dist - 0.2, h + 0.05, -0.3], look: [-0.5, 0.25, -0.9]},
];
const seatDemo = (label: string, motion: Motion, seconds = 3, car: Partial<ActorKey>[] = []): Demo => ({
  label: `Dummy: ${label}`,
  stage: 'seeufer',
  seconds,
  shot: {
    camera: carSideCam(),
    actors: {
      car: [{...CAR_FLOAT}, ...car.map((k) => ({...CAR_FLOAT, ...k}) as ActorKey)],
      dummy: [{t: 0, x: 0.3, z: -0.2, face: 0, motion, attach: 'car'}],
    },
  },
});
const carDemo = (label: string, seconds: number, keys: Partial<ActorKey>[], camera: Shot['camera'], extra: Shot['actors'] = {}): Demo => ({
  label: `Auto: ${label}`,
  stage: 'seeufer',
  seconds,
  shot: {camera, actors: {car: keys.map((k) => ({...CAR_FLOAT, ...k}) as ActorKey), ...extra}},
});

const LAKE_DEMOS: Demo[] = [
  {
    label: 'Bühne: Seeufer',
    stage: 'seeufer',
    seconds: 4,
    shot: {
      camera: [
        {t: 0, pos: [-6, 3.0, 10.5], look: [0, 0.3, -1]},
        {t: 1, pos: [-3.5, 2.8, 10.8], look: [0, 0.2, -2]},
      ],
      actors: {car: [{...CAR_FLOAT}]},
    },
  },
  {
    label: 'Bühne: unter Wasser',
    stage: 'seeufer',
    seconds: 4,
    shot: {
      camera: [
        {t: 0, pos: [-7.0, -1.6, 2.4], look: [0, -1.1, -1]},
        {t: 1, pos: [-6.8, -1.8, 1.2], look: [0, -1.2, -1]},
      ],
      actors: {car: [{...CAR_FLOAT, y: -1.5, tilt: 8, motion: 'sink'}]},
    },
  },
  carDemo(
    'fahren',
    3,
    [
      {t: 0, x: 9, z: 8.5, y: 0, face: 270, motion: 'drive'},
      {t: 1, x: -9, z: 8.5, y: 0, face: 270, motion: 'drive'},
    ],
    [
      {t: 0, pos: [3, 2.2, 0.5], look: [2, 1.2, 8.5]},
      {t: 1, pos: [-3, 2.2, 0.5], look: [-4, 1.2, 8.5]},
    ],
  ),
  carDemo(
    'ins Wasser rollen',
    4,
    [
      {t: 0, x: 0, z: 8.6, y: 0, face: 0, tilt: 0, motion: 'roll'},
      {t: 0.3, x: 0, z: 5.2, y: 0, tilt: 16, motion: 'roll'},
      {t: 0.45, x: 0, z: 2.4, y: -0.25, tilt: 8, motion: 'float'},
      {t: 0.7, x: 0, z: 0.4, y: -0.5, tilt: 3, motion: 'float'},
      {t: 1, x: 0, z: -0.2, y: -0.55, tilt: 4, motion: 'float'},
    ],
    [
      {t: 0, pos: [-9.5, 3.0, 7.0], look: [0, 0.2, 4]},
      {t: 1, pos: [-9.5, 2.6, 4.5], look: [0, -0.2, 1]},
    ],
    {splash: [{t: 0, x: 0, z: 2.6, motion: 'park'}, {t: 0.4, x: 0, z: 2.6, motion: 'splash'}]},
  ),
  carDemo('treiben', 3, [{t: 0}], [
    {t: 0, pos: [-9.0, 2.2, 3.5], look: [0, -0.5, -1]},
    {t: 1, pos: [-9.4, 2.3, 2.5], look: [0, -0.5, -1]},
  ]),
  carDemo('Fenster fährt runter', 3, [{t: 0.15, window: 0}, {t: 0.85, window: 1}], carSideCam(6)),
  carDemo('Tür geht auf', 3, [{t: 0.15, door: 0}, {t: 0.85, door: 1}], carSideCam(6.5)),
  carDemo('Wasserdruck-Pfeile', 3, [{t: 0, pressure: 0}, {t: 0.3, pressure: 1}], carSideCam(7, 1.8)),
  carDemo('Wasser im Innenraum steigt', 3, [{t: 0, water: 0}, {t: 1, water: 1.2}], carSideCam(6)),
  carDemo(
    'vorne abkippen + sinken',
    5,
    [
      {t: 0, y: -0.55, tilt: 0, motion: 'float'},
      {t: 0.15, y: -0.55, tilt: 0, motion: 'sink'},
      {t: 1, y: -2.6, tilt: 30, motion: 'sink'},
    ],
    [
      {t: 0, pos: [-9.5, 2.0, 3.0], look: [0, -0.6, -1]},
      {t: 1, pos: [-9.8, 1.4, 2.5], look: [0, -1.4, -1]},
    ],
  ),
  seatDemo('angeschnallt sitzen', 'buckled'),
  seatDemo('Gurt lösen', 'unbuckle', 3),
  seatDemo('Knopf am Fensterheber drücken', 'button', 3.5, [{t: 0.15, window: 0}, {t: 0.9, window: 1}]),
  seatDemo('gegen die Tür drücken', 'pushdoor', 3.5, [{t: 0, pressure: 1}]),
  seatDemo('ruhig sitzen und warten', 'wait', 3, [{t: 0, water: 0.2}, {t: 1, water: 0.5}]),
  {
    label: 'Dummy: durchs Fenster klettern',
    stage: 'seeufer',
    seconds: 4,
    shot: {
      camera: [
        {t: 0, pos: [-6.0, 1.5, 1.4], look: [-0.8, 0.3, -0.9]},
        {t: 1, pos: [-6.3, 1.5, 1.0], look: [-1.1, 0.2, -0.9]},
      ],
      actors: {
        car: [{...CAR_FLOAT, window: 1}],
        dummy: [
          {t: 0, x: 0.3, z: -0.2, face: 0, motion: 'climbout', attach: 'car'},
          {t: 0.25, x: 0.3, z: -0.1, y: 0.05, face: 90, motion: 'climbout', attach: 'car'},
          {t: 0.75, x: 0.75, z: -0.05, y: 0.15, face: 90, motion: 'climbout', attach: 'car'},
          {t: 1, x: 1.35, z: 0.0, y: 0.0, face: 90, motion: 'climbout', attach: 'car'},
        ],
      },
    },
  },
  {
    label: 'Dummy: an der Oberfläche schwimmen',
    stage: 'seeufer',
    seconds: 3.5,
    shot: {
      camera: [
        {t: 0, pos: [-6.5, 1.8, 3.8], look: [-2.4, -0.3, 0.1]},
        {t: 1, pos: [-6.8, 1.8, 4.2], look: [-2.6, -0.3, 0.3]},
      ],
      actors: {
        dummy: [
          {t: 0, x: -1.6, z: -0.6, y: -0.3, face: 235, motion: 'swim'},
          {t: 1, x: -3.4, z: 0.7, y: -0.3, face: 235, motion: 'swim'},
        ],
      },
    },
  },
];

// ---------- Meeresstrand / Petermännchen ----------
/** Dummy sitzt am Strand bei (0, 1.2) mit Blick zur Kamera/zum Meer (face 0 = Richtung −z) */
const SIT = {x: 0, z: 1.2, face: 0};
const sitCam = (dist = 3.6, h = 1.45): Shot['camera'] => [
  {t: 0, pos: [-0.9, h, SIT.z - dist], look: [0, 0.35, SIT.z - 0.15]},
  {t: 1, pos: [-1.3, h + 0.05, SIT.z - dist + 0.15], look: [0, 0.35, SIT.z - 0.15]},
];
const beachSit = (label: string, motion: Motion, seconds = 3, extra: Shot['actors'] = {}, pain = 1): Demo => ({
  label: `Dummy: ${label}`,
  stage: 'meeresstrand',
  seconds,
  shot: {
    camera: sitCam(),
    actors: {dummy: [{t: 0, ...SIT, motion, sting: true, pain}], ...extra},
  },
});
/** Schüssel 0,32 m vor dem sitzenden Dummy (bei face 0 also Richtung −z) */
const BASIN = {x: SIT.x, z: SIT.z - 0.32};
const fishDemo = (label: string, motion: Motion, to: [number, number], seconds = 3): Demo => ({
  label: `Petermännchen: ${label}`,
  stage: 'meeresstrand',
  seconds,
  shot: {
    camera: [
      {t: 0, pos: [-0.55, 0.85, -5.95], look: 'petermaennchen'},
      {t: 1, pos: [-0.35, 0.85, -6.0], look: 'petermaennchen'},
    ],
    actors: {
      petermaennchen: [
        {t: 0, x: 0, z: -5, face: 60, motion},
        {t: 1, x: to[0], z: -5 + to[1], face: 60, motion},
      ],
    },
  },
});

const BEACH_DEMOS: Demo[] = [
  {
    label: 'Bühne: Meeresstrand',
    stage: 'meeresstrand',
    seconds: 4,
    shot: {
      camera: [
        {t: 0, pos: [-2.2, 2.2, -9.5], look: [0, 0.3, 1]},
        {t: 1, pos: [-0.6, 2.1, -9.8], look: [0, 0.3, 1]},
      ],
      actors: {dummy: [{t: 0, x: 0, z: -3, face: 180, motion: 'stand'}]},
    },
  },
  {
    label: 'Bühne: Strand von oben',
    stage: 'meeresstrand',
    seconds: 3,
    shot: {
      camera: [
        {t: 0, pos: [-10, 7, -14], look: [0, 0, 2]},
        {t: 1, pos: [-8, 7, -15], look: [0, 0, 2]},
      ],
      actors: {},
    },
  },
  fishDemo('im Sand eingegraben', 'buried', [0, 0]),
  fishDemo('Rückenflosse aufstellen', 'finup', [0, 0]),
  fishDemo('davonschwimmen', 'swimaway', [1.1, -0.65], 3),
  {
    label: 'Dummy: barfuß waten',
    stage: 'meeresstrand',
    seconds: 3.5,
    shot: {
      camera: [
        {t: 0, pos: [-0.5, 1.2, -9.2], look: [-1.2, 0.5, -5]},
        {t: 1, pos: [0.2, 1.2, -9.2], look: [0.2, 0.5, -5]},
      ],
      actors: {dummy: [{t: 0, x: -2.5, z: -5, face: 90, motion: 'wade'}, {t: 1, x: 0.3, z: -5, face: 90, motion: 'wade'}]},
    },
  },
  {
    label: 'Dummy: drauftreten + zusammenzucken',
    stage: 'meeresstrand',
    seconds: 3,
    shot: {
      camera: [
        {t: 0, pos: [-1.0, 1.8, -8.2], look: [-0.05, 0.12, -4.92]},
        {t: 1, pos: [-0.9, 1.8, -8.1], look: [-0.05, 0.12, -4.92]},
      ],
      actors: {
        dummy: [
          {t: 0, x: -0.3, z: -5, face: 90, motion: 'stepflinch', pain: 0},
          {t: 0.18, x: -0.3, z: -5, face: 90, motion: 'stepflinch', pain: 0, sting: true},
          {t: 0.3, x: -0.3, z: -5, face: 90, motion: 'stepflinch', pain: 1},
        ],
        petermaennchen: [{t: 0, x: 0.0, z: -4.9, face: 60, motion: 'buried'}, {t: 0.14, x: 0.0, z: -4.9, face: 60, motion: 'finup'}],
      },
    },
  },
  {
    label: 'Dummy: auf einem Bein hüpfen',
    stage: 'meeresstrand',
    seconds: 3,
    shot: {
      camera: [
        {t: 0, pos: [-4.2, 1.3, -1.0], look: [0, 0.7, -1.0]},
        {t: 1, pos: [-4.2, 1.3, 0.6], look: [0, 0.7, 0.6]},
      ],
      actors: {dummy: [{t: 0, x: 0, z: -2.2, face: 180, motion: 'hop', sting: true, pain: 1}, {t: 1, x: 0, z: 1.2, face: 180, motion: 'hop'}]},
    },
  },
  beachSit('hinsetzen, Fuß halten', 'holdfoot', 3),
  beachSit('Eis auf den Fuß halten', 'ice', 3),
  beachSit('Stachelreste mit Pinzette entfernen', 'tweeze', 3),
  beachSit('Temperatur mit dem anderen Fuß testen', 'testtemp', 3.5, {
    schuessel: [{t: 0, ...BASIN, face: 0, motion: 'steam'}],
  }),
  beachSit(
    'Fuß ins heiße Wasser, Schmerz lässt nach',
    'footbath',
    4,
    {
      schuessel: [{t: 0, ...BASIN, face: 0, motion: 'steam'}],
      thermometer: [{t: 0, x: BASIN.x - 0.5, z: BASIN.z - 0.1, y: 0.95, motion: 'park'}, {t: 0.15, x: BASIN.x - 0.5, z: BASIN.z - 0.1, y: 0.95, motion: 'show'}],
    },
    1,
  ),
  {
    label: 'Schmerz-Symbol breitet sich aus',
    stage: 'meeresstrand',
    seconds: 3,
    shot: {
      camera: [
        {t: 0, pos: [-2.6, 1.3, -3.6], look: [0, 0.8, -1.0]},
        {t: 1, pos: [-2.8, 1.3, -3.4], look: [0, 0.8, -1.0]},
      ],
      actors: {dummy: [{t: 0, x: 0, z: -1, face: 300, motion: 'stand', sting: true, pain: 0.2}, {t: 1, x: 0, z: -1, face: 300, motion: 'stand', pain: 2}]},
    },
  },
  {
    label: 'Dummy: ins tiefere Wasser schwimmen',
    stage: 'meeresstrand',
    seconds: 3.5,
    shot: {
      camera: [
        {t: 0, pos: [-4.5, 1.6, -11], look: [-0.5, -0.2, -15]},
        {t: 1, pos: [-4.5, 1.5, -13], look: [-0.3, -0.2, -17.5]},
      ],
      actors: {dummy: [{t: 0, x: 0, z: -14, y: -0.3, face: 0, motion: 'swim', pain: 1.4}, {t: 1, x: 0, z: -17.5, y: -0.3, face: 0, motion: 'swim'}]},
    },
  },
  {
    label: 'Dummy: kommt kaum über Wasser',
    stage: 'meeresstrand',
    seconds: 3.5,
    shot: {
      camera: [
        {t: 0, pos: [-3.2, 0.9, -15.5], look: [0, -0.1, -18]},
        {t: 1, pos: [-3.0, 0.8, -15.8], look: [0, -0.15, -18]},
      ],
      actors: {
        dummy: [
          {t: 0, x: 0, z: -18, y: -1.6, face: 240, motion: 'struggle', pain: 2},
          {t: 0.5, x: 0, z: -18, y: -1.72, face: 240, motion: 'struggle'},
          {t: 1, x: 0, z: -18, y: -1.62, face: 240, motion: 'struggle'},
        ],
      },
    },
  },
  {
    label: 'Objekte: Schüssel mit heißem Wasser, Thermometer-Schild',
    stage: 'meeresstrand',
    seconds: 3,
    shot: {
      camera: [
        {t: 0, pos: [0.4, 1.3, -1.6], look: [0.05, 0.3, 0.75]},
        {t: 1, pos: [0.6, 1.35, -1.7], look: [0.05, 0.3, 0.75]},
      ],
      actors: {
        schuessel: [{t: 0, x: 0.1, z: 0.7, face: 0, motion: 'steam'}],
        thermometer: [{t: 0, x: -0.3, z: 0.7, y: 0.62, motion: 'show'}],
      },
    },
  },
];


// ---------- Garten / Fliegerbombe ----------
/** Bombe halb in der Erde an der Grabstelle (0.3, −0.5), Längsachse quer (face 90), Spitze leicht nach unten */
const BOMB = {t: 0, x: 0.3, z: -0.5, y: -0.1, face: 90, tilt: 14, motion: 'buriedbomb' as Motion};
const gCam = (look: [number, number, number], from: [number, number, number], drift: [number, number, number] = [0.4, 0, 0]): Shot['camera'] => [
  {t: 0, pos: from, look},
  {t: 1, pos: [from[0] + drift[0], from[1] + drift[1], from[2] + drift[2]], look},
];
const gDemo = (label: string, seconds: number, camera: Shot['camera'], actors: Shot['actors']): Demo => ({
  label,
  stage: 'garten',
  seconds,
  shot: {camera, actors},
});
/** Warnstab in der rechten Hand (beim Rückwärtsgehen) */
const STAKE_IN_HAND = {x: -0.3, y: 0.08, z: 0.22, face: 0, attach: 'dummy', motion: 'park' as Motion};

const GARDEN_DEMOS: Demo[] = [
  gDemo('Bühne: Garten', 4, gCam([0.3, 0.6, -2.5], [-3.5, 3.0, 9.5], [2.5, 0, -0.5]), {fliegerbombe: [BOMB]}),
  gDemo('Bühne: Garten (Beet von oben)', 3, gCam([0.4, 0, -0.6], [0.4, 7.5, 5.0], [0.5, 0, -0.3]), {fliegerbombe: [BOMB]}),
  gDemo('Objekt: Fliegerbombe halb in der Erde', 3, gCam([0.3, -0.05, -0.45], [1.85, 1.55, -2.6], [0.3, 0, 0.1]), {fliegerbombe: [BOMB]}),
  gDemo('Objekt: Fliegerbombe (ganz)', 3, gCam([0, 0.3, 4], [-1.2, 1.0, 5.8], [1.2, 0, 0]), {
    fliegerbombe: [{t: 0, x: 0, z: 4, y: 0.17, face: 60, motion: 'park'}],
  }),
  gDemo('Objekte: Spaten, Schubkarre, Warnstab, Handy', 4, gCam([0, 0.3, 4.6], [-0.4, 2.7, 10.4], [0.6, 0, 0]), {
    spaten: [{t: 0, x: 0.5, z: 5.6, face: 260, motion: 'park'}],
    schubkarre: [{t: 0, x: 0.3, z: 3.6, face: 120, motion: 'park'}],
    warnstab: [{t: 0, x: -0.7, z: 3.4, motion: 'show'}],
    smartphone: [{t: 0, x: -0.2, z: 6.6, face: 200, motion: 'show'}],
  }),
  gDemo('Dummy: umgraben', 3.6, gCam([0.3, 0.7, -0.1], [3.2, 1.6, 2.8], [0.3, 0, -0.3]), {
    dummy: [{t: 0, x: 0.3, z: 0.45, face: 0, motion: 'dig'}],
    fliegerbombe: [{...BOMB, y: -0.25}],
  }),
  gDemo('Dummy: auf Hartes stoßen + erstarren', 3, gCam([0.3, 0.6, -0.1], [3.2, 1.6, 2.8], [0.2, 0, -0.2]), {
    dummy: [{t: 0, x: 0.3, z: 0.45, face: 0, motion: 'hithard'}],
    fliegerbombe: [BOMB],
  }),
  gDemo('Dummy: hinknien + Erde wegschieben', 4, gCam([0.3, 0.4, -0.2], [3.0, 1.5, 2.4], [0.2, 0, -0.2]), {
    dummy: [{t: 0, x: 0.3, z: 0.35, face: 0, motion: 'uncover'}],
    fliegerbombe: [BOMB, {...BOMB, t: 1, y: 0.03}],
  }),
  gDemo('Dummy: Schweres anheben', 3.5, gCam([0.4, 0.6, -0.2], [3.4, 1.6, 2.4], [0.2, 0, -0.2]), {
    dummy: [{t: 0, x: 0.3, z: 0.0, face: 0, motion: 'lift'}],
    fliegerbombe: [
      BOMB,
      {...BOMB, t: 0.33},
      {t: 0.343, x: 0, y: -0.05, z: 0.5, face: -90, tilt: 12, attach: 'dummy', motion: 'park'},
      {t: 0.63, x: 0, y: 0.95, z: 0.4, face: -90, tilt: 0, attach: 'dummy', motion: 'park'},
    ],
  }),
  gDemo('Dummy: Schweres in die Schubkarre legen', 3, gCam([1.0, 0.6, 0], [0.6, 1.8, 4.6], [0.3, 0, 0]), {
    dummy: [{t: 0, x: 0.3, z: 0.0, face: 90, motion: 'lower'}],
    schubkarre: [{t: 0, x: 1.45, z: 0.0, face: 90, motion: 'park'}],
    fliegerbombe: [
      {t: 0, x: 0, y: 0.95, z: 0.4, face: -90, tilt: 0, attach: 'dummy', motion: 'park'},
      {t: 0.3, x: 0, y: 0.48, z: -0.15, face: 90, tilt: 0, attach: 'schubkarre', motion: 'park'},
    ],
  }),
  gDemo('Dummy: Schubkarre schieben', 3.5, gCam([2.2, 0.6, 0], [1.4, 1.8, 5.6], [2.0, 0, 0]), {
    dummy: [{t: 0, x: 0.0, z: 0.0, face: 90, motion: 'push'}, {t: 1, x: 3.4, z: 0.0, face: 90, motion: 'push'}],
    schubkarre: [{t: 0, x: 1.15, z: 0.0, face: 90, motion: 'push'}, {t: 1, x: 4.55, z: 0.0, face: 90, motion: 'push'}],
    fliegerbombe: [{t: 0, x: 0, y: 0.48, z: -0.15, face: 90, tilt: 0, attach: 'schubkarre', motion: 'park'}],
  }),
  gDemo('Dummy: langsam rückwärts weggehen', 4, gCam([0.3, 0.7, 1.2], [3.8, 1.7, 4.4], [0, 0, 0.4]), {
    dummy: [{t: 0, x: 0.3, z: 0.3, face: 0, motion: 'retreat'}, {t: 1, x: 0.3, z: 2.4, face: 0, motion: 'retreat'}],
    warnstab: [{t: 0, ...STAKE_IN_HAND}],
    fliegerbombe: [BOMB],
  }),
  gDemo('Dummy: Stelle mit dem Warnstab markieren', 3, gCam([0.3, 0.7, 2.5], [3.4, 1.6, 4.8], [0, 0, 0.2]), {
    dummy: [{t: 0, x: 0.3, z: 2.8, face: 0, motion: 'mark'}],
    warnstab: [{t: 0, x: 0.3, z: 2.36, face: 0, motion: 'plant'}],
    fliegerbombe: [BOMB],
  }),
  gDemo('Dummy: Nachbarn über den Zaun warnen', 3.5, gCam([0.7, 1.0, -2.2], [-2.4, 1.9, 4.8], [0.5, 0, 0]), {
    dummy: [{t: 0, x: 0.3, z: -2.0 + 3, face: 10, motion: 'warn'}],
    nachbar: [{t: 0, x: 1.6, z: -7.7, face: 180, motion: 'stand'}, {t: 0.35, x: 1.6, z: -7.7, face: 180, motion: 'wave'}],
  }),
  gDemo('Dummy: telefonieren (stehend)', 3.5, gCam([0.3, 1.0, 3.0], [-1.8, 1.6, 7.0], [0.5, 0, 0]), {
    dummy: [{t: 0, x: 0.3, z: 3.0, face: 160, motion: 'call'}],
  }),
];


// ---------- Burg / Burggraben (Kälteschock) ----------
const BRIDGE_DOWN = {t: 0, x: 0, z: -3, y: 1.0, face: 180, motion: 'park' as Motion, tilt: 0};
const BRIDGE_UP = {...BRIDGE_DOWN, tilt: 84};
const DRESSED = {jacket: 1, pants: 1};
const cDemo = (label: string, seconds: number, camera: Shot['camera'], actors: Shot['actors']): Demo => ({
  label,
  stage: 'burg',
  seconds,
  shot: {camera, actors},
});
const waterCam = (look: [number, number, number], from: [number, number, number]): Shot['camera'] => gCam(look, from, [-0.3, 0, -0.2]);
const W0 = {x: 2.1, z: 0.6, face: 200, ...DRESSED};

const CASTLE_DEMOS: Demo[] = [
  cDemo('Bühne: Burg im Winter', 4, gCam([0.5, 3.2, -3], [7.5, 3.0, 17], [-3, 0, 0]), {zugbruecke: [BRIDGE_DOWN]}),
  cDemo('Bühne: Burggraben + Tor', 3, gCam([0.8, 1.6, -2.4], [5.2, 2.6, 8.5], [-0.8, 0, 0]), {zugbruecke: [BRIDGE_DOWN]}),
  cDemo('Objekt: Zugbrücke hochklappen', 4.5, gCam([0, 2.6, -1], [8.5, 3.4, 9.5], [-0.6, 0, 0]), {
    zugbruecke: [BRIDGE_DOWN, {...BRIDGE_DOWN, t: 0.15}, {...BRIDGE_DOWN, t: 0.95, tilt: 84}],
  }),
  cDemo('Kleidung: Winterjacke + lange Hose an/aus', 4.5, gCam([0.3, 1.9, 6.0], [-1.6, 2.4, 10.4], [0.4, 0, 0]), {
    dummy: [
      {t: 0, x: 0.3, z: 6.0, face: 160, motion: 'stand', jacket: 1, pants: 1},
      {t: 0.2, x: 0.3, z: 6.0, face: 160, motion: 'stand', jacket: 1, pants: 1},
      {t: 0.5, x: 0.3, z: 6.0, face: 160, motion: 'stand', jacket: 0, pants: 1},
      {t: 0.65, x: 0.3, z: 6.0, face: 160, motion: 'stand', jacket: 0, pants: 1},
      {t: 0.9, x: 0.3, z: 6.0, face: 160, motion: 'stand', jacket: 0, pants: 0},
    ],
  }),
  cDemo('Dummy: über die Zugbrücke gehen', 3.5, gCam([0.2, 1.6, 0.6], [5.6, 2.6, 8.6], [-0.4, 0, 0]), {
    zugbruecke: [BRIDGE_DOWN],
    dummy: [
      {t: 0, x: 0.2, z: 6.0, face: 180, motion: 'cross', attach: 'zugbruecke', ...DRESSED},
      {t: 1, x: 0.2, z: 2.0, face: 180, motion: 'cross', attach: 'zugbruecke'},
    ],
  }),
  cDemo('Dummy: abrutschen + ins Wasser fallen', 3.5, gCam([1.4, 1.2, 0.6], [5.8, 2.4, 8.4], [-0.3, 0, 0]), {
    zugbruecke: [BRIDGE_DOWN, {...BRIDGE_DOWN, t: 0.05}, {...BRIDGE_DOWN, t: 0.5, tilt: 22}],
    dummy: [
      {t: 0, x: 0.35, z: 4.3, face: 180, motion: 'slip', attach: 'zugbruecke', ...DRESSED},
      {t: 0.3, x: 1.0, z: 4.1, face: 150, motion: 'slip', attach: 'zugbruecke'},
      {t: 0.38, x: 1.75, y: 1.75, z: 0.75, face: 140, motion: 'slip'},
      {t: 0.48, x: 2.1, y: -1.0, z: 0.6, face: 160, motion: 'slip'},
      {t: 0.5, x: 2.1, y: -1.7, z: 0.6, face: 200, motion: 'gasp', breath: 1.6},
      {t: 0.65, x: 2.1, y: -1.5, z: 0.6, face: 200, motion: 'gasp'},
    ],
    splash: [{t: 0, x: 2.1, z: 0.6, motion: 'park'}, {t: 0.47, x: 2.1, z: 0.6, motion: 'splash'}],
  }),
  cDemo('Dummy: nach Luft schnappen (Atemwolken)', 3.5, waterCam([2.1, 0.2, 0.4], [4.2, 1.9, 4.6]), {
    zugbruecke: [BRIDGE_UP],
    dummy: [{t: 0, ...W0, y: -1.5, motion: 'gasp', breath: 1.6}],
  }),
  cDemo('Dummy: hektisch kraulen (Spritzwasser)', 3.5, waterCam([2.1, -0.1, 1.0], [5.6, 2.2, 4.8]), {
    zugbruecke: [BRIDGE_UP],
    dummy: [
      {t: 0, x: 2.1, z: 0.0, y: -0.3, face: 180, motion: 'crawl', spray: 1, ...DRESSED},
      {t: 0.5, x: 2.1, z: 0.4, y: -0.75, face: 180, motion: 'crawl'},
      {t: 1, x: 2.1, z: 0.8, y: -0.3, face: 180, motion: 'crawl'},
    ],
  }),
  cDemo('Dummy: im Wasser an der Jacke zerren (Kälte-Symbol)', 4, waterCam([2.1, -0.3, 0.3], [4.6, 2.8, 5.6]), {
    zugbruecke: [BRIDGE_UP],
    dummy: [
      {t: 0, ...W0, y: -1.4, motion: 'tug', breath: 1.9, cold: 0.6},
      {t: 1, ...W0, y: -1.7, motion: 'tug', jacket: 0.5, cold: 2},
    ],
  }),
  cDemo('Dummy: auf dem Rücken treiben (Atmung wird ruhiger)', 4.5, gCam([2.4, -1.0, -3.6], [4.4, 5.6, 4.6], [-0.3, 0, 0]), {
    zugbruecke: [BRIDGE_UP],
    dummy: [
      {t: 0, x: 2.3, z: -0.6, face: 200, y: -1.55, motion: 'backfloat', breath: 1.6, ...DRESSED},
      {t: 0.27, x: 2.3, z: -0.6, face: 200, y: -0.15, motion: 'backfloat'},
      {t: 1, x: 2.3, z: -0.6, face: 200, y: -0.15, motion: 'backfloat', breath: 0.35},
    ],
  }),
  cDemo('Dummy: ruhig in Rückenlage zum Rand', 4, waterCam([2.6, -0.2, 0.6], [6.8, 3.4, 3.6]), {
    zugbruecke: [BRIDGE_UP],
    dummy: [
      {t: 0, x: 2.3, z: -0.8, face: 0, y: -0.15, motion: 'backswim', breath: 0.35, ...DRESSED},
      {t: 1, x: 3.0, z: 0.9, face: 0, y: -0.15, motion: 'backswim'},
    ],
  }),
  cDemo('Dummy: am Rand festhalten + um Hilfe winken', 3.5, gCam([3.1, 0.95, 2.5], [7.6, 1.8, 1.0], [0, 0, 0.3]), {
    zugbruecke: [BRIDGE_UP],
    dummy: [{t: 0, x: 3.1, z: 2.62, y: -1.55, face: 180, motion: 'edgewave', ...DRESSED}],
  }),
];


// ---------- Erste Hilfe / Zombie-Biss ----------
const fdDummy = (label: string, motion: Motion, stage: string, seconds = 3.5, extra: Partial<ActorKey> = {}, at: [number, number, number] = [0, 0, -1]): Demo => ({
  label: `Dummy: ${label}`,
  stage,
  seconds,
  shot: {
    camera: [
      {t: 0, pos: [at[0] + 1.6, 1.8, at[1] + 2.4], look: [at[0] + 0.1, 1.0, at[1]]},
      {t: 1, pos: [at[0] + 1.3, 1.75, at[1] + 2.6], look: [at[0] + 0.1, 1.0, at[1]]},
    ],
    actors: {dummy: [{t: 0, x: at[0], z: at[1], face: at[2], motion, armbite: 1, ...extra}]},
  },
});
const zombieDemo = (label: string, motion: Motion, to: [number, number], face: number, seconds = 3.5): Demo => ({
  label: `Zombie: ${label}`,
  stage: 'friedhof',
  seconds,
  shot: {
    camera: [
      {t: 0, pos: [-2.4, 1.7, 4.6], look: [0.5, 1.0, 0]},
      {t: 1, pos: [-2.0, 1.7, 4.8], look: [0.5, 1.0, 0]},
    ],
    actors: {
      zombie: [
        {t: 0, x: 0, z: 0, face, motion},
        {t: 1, x: to[0], z: to[1], face, motion},
      ],
    },
  },
});

const FIRSTAID_DEMOS: Demo[] = [
  {
    label: 'Bühne: Friedhof bei Nacht',
    stage: 'friedhof',
    seconds: 4,
    shot: {camera: [{t: 0, pos: [-1.5, 2.2, 6], look: [0.5, 1.2, -6]}, {t: 1, pos: [-0.8, 2.2, 5.2], look: [0.5, 1.3, -6]}], actors: {}},
  },
  zombieDemo('schlurfen (Arme ausgestreckt)', 'shamble', [0, 2], 180),
  zombieDemo('stehen, Arme ausgestreckt', 'reach', [0, 0], 160),
  zombieDemo('zubeißen', 'chomp', [0, 0], 120, 2.5),
  zombieDemo('verwirrt davonschlurfen (Fragezeichen)', 'confused', [1.5, -1.5], 140),
  zombieDemo('winken', 'wave', [0, 0], 180, 2.5),
  fdDummy('in den Arm gebissen (Zusammenzucken)', 'armflinch', 'friedhof', 3, {}, [0, 0, 150]),
  fdDummy('Unterarm halten', 'armhold', 'friedhof', 3, {}, [0, 0, 150]),
  fdDummy('Bissstelle anschauen (Rötung wächst)', 'armlook', 'friedhof', 3.5, {redness: 1.6}, [0, 0, 150]),
  fdDummy('Pflaster aufkleben', 'applyplaster', 'friedhof', 3, {plaster: 1}, [0, 0, 150]),
  {
    label: 'Bühne: Badezimmer – Arm unter fließendem Wasser',
    stage: 'badezimmer',
    seconds: 4,
    shot: {
      camera: [{t: 0, pos: [-1.95, 1.6, -0.7], look: [0.111, 1.295, -1.649], fov: 52}],
      actors: {waschbecken: [{t: 0, x: 0, z: -1.66, face: 180, motion: 'flow'}], dummy: [{t: 0, x: 0.2, z: -1.46, face: 0, motion: 'rinse', armbite: 1}]},
    },
  },
  {
    label: 'Dummy: Desinfektionsspray',
    stage: 'badezimmer',
    seconds: 3,
    shot: {
      camera: [{t: 0, pos: [-1.95, 1.65, -0.6], look: [0.131, 1.314, -1.517], fov: 52}],
      actors: {waschbecken: [{t: 0, x: 0, z: -1.66, face: 180, motion: 'park'}], dummy: [{t: 0, x: 0.2, z: -1.42, face: 0, motion: 'disinfect', armbite: 1}]},
    },
  },
  {
    label: 'Dummy: Kompresse auflegen + verbinden',
    stage: 'badezimmer',
    seconds: 3.5,
    shot: {
      camera: [{t: 0, pos: [-1.95, 1.65, -0.6], look: [0.131, 1.314, -1.517], fov: 52}],
      actors: {
        waschbecken: [{t: 0, x: 0, z: -1.66, face: 180, motion: 'park'}],
        dummy: [
          {t: 0, x: 0.2, z: -1.42, face: 0, motion: 'compress', armbite: 1, dressing: 0},
          {t: 0.25, x: 0.2, z: -1.42, face: 0, motion: 'compress', dressing: 0.5},
          {t: 0.7, x: 0.2, z: -1.42, face: 0, motion: 'compress', dressing: 1},
        ],
      },
    },
  },
  {
    label: 'Bühne: Wohnzimmer – warten, Kalender fliegt, Uhr rast',
    stage: 'wohnzimmer',
    seconds: 5,
    shot: {
      camera: [{t: 0, pos: [0.62, 1.4, 2.6], look: [0.6, 1.101, -1.995]}],
      actors: {
        dummy: [{t: 0, x: 0.45, z: -1.85, face: 180, motion: 'couchwait', armbite: 1, redness: 0}, {t: 1, x: 0.45, z: -1.85, face: 180, motion: 'couchwait', redness: 2}],
        kalender: [{t: 0, x: 1.15, z: -2.29, y: 1.5, face: 180, motion: 'flip'}],
        wanduhr: [{t: 0, x: 0.05, z: -2.29, y: 1.85, face: 180, motion: 'spin'}],
      },
    },
  },
  {
    label: 'Bühne: Arztpraxis – Impfpass zeigen',
    stage: 'arztpraxis',
    seconds: 4,
    shot: {
      camera: [{t: 0, pos: [0.45, 1.9, 3.9], look: [0.25, 1.45, -1.3]}],
      actors: {
        arzt: [{t: 0, x: -0.45, z: -1.3, face: 90, motion: 'chairnod'}],
        dummy: [{t: 0, x: 0.95, z: -1.3, face: 270, motion: 'showpass', dressing: 1}],
      },
    },
  },
];

// ---------- Feuer / Weihnachtsbaum-Brand ----------
const TREE_AT = {x: 1.5, z: -1.5};
const tree = (fire: number, smoke: number, fire2 = fire, smoke2 = smoke): ActorKey[] => [
  {t: 0, x: TREE_AT.x, z: TREE_AT.z, face: 180, motion: 'park', fire, smoke},
  {t: 1, x: TREE_AT.x, z: TREE_AT.z, face: 180, motion: 'park', fire: fire2, smoke: smoke2},
];
const FIRE_DEMOS: Demo[] = [
  {
    label: 'Bühne: Wohnzimmer an Weihnachten',
    stage: 'weihnachtszimmer',
    seconds: 3,
    shot: {camera: [{t: 0, pos: [0.3, 1.6, 4.6], look: [0, 1.2, -1.5]}], actors: {weihnachtsbaum: tree(0, 0)}},
  },
  {
    label: 'Baum: Feuer läuft hoch bis zur Decke, Rauch sammelt sich',
    stage: 'weihnachtszimmer',
    seconds: 5,
    shot: {camera: [{t: 0, pos: [0.0, 1.5, 3.8], look: [1.2, 1.3, -1.5]}], actors: {weihnachtsbaum: tree(0.1, 0, 1, 1)}},
  },
  {
    label: 'Baum: riesige Flammen + dichter Rauch',
    stage: 'weihnachtszimmer',
    seconds: 3,
    shot: {camera: [{t: 0, pos: [-0.2, 1.4, 3.9], look: [1.2, 1.4, -1.5]}], actors: {weihnachtsbaum: tree(1.6, 1.4)}},
  },
  {
    label: 'Dummy: entsetzt zurückweichen',
    stage: 'weihnachtszimmer',
    seconds: 3,
    shot: {
      camera: [{t: 0, pos: [-0.6, 1.5, 4.2], look: [0.6, 1.1, -0.8]}],
      actors: {
        weihnachtsbaum: tree(1, 0.8),
        dummy: [
          {t: 0, x: 0.2, z: -0.4, face: 135, motion: 'recoil'},
          {t: 0.75, x: -0.5, z: 0.5, face: 135, motion: 'recoil'},
        ],
      },
    },
  },
  {
    label: 'Dummy: mit dem Eimer zum Baum rennen',
    stage: 'weihnachtszimmer',
    seconds: 3,
    shot: {
      camera: [{t: 0, pos: [-1.2, 1.4, 3.6], look: [0.3, 1.0, -0.7]}],
      actors: {
        weihnachtsbaum: tree(1.2, 0.9, 1.6, 1.1),
        dummy: [
          {t: 0, x: -1.8, z: 0.6, face: 120, motion: 'runbucket'},
          {t: 1, x: 0.2, z: -0.6, face: 120, motion: 'runbucket'},
        ],
      },
    },
  },
  {
    label: 'Dummy: Geschenke unter dem brennenden Baum hervorziehen',
    stage: 'weihnachtszimmer',
    seconds: 4,
    shot: {
      camera: [{t: 0, pos: [-0.4, 1.5, 2.2], look: [1.0, 0.7, -1.1]}],
      actors: {
        weihnachtsbaum: tree(1, 0.9, 1, 1.4),
        dummy: [{t: 0, x: 1.1, z: -0.55, face: 165, motion: 'pullgift'}],
        geschenke: [{t: 0, x: 0.35, z: -0.4, face: 180, motion: 'park'}],
      },
    },
  },
  {
    label: 'Flur: Tür zuziehen – Rauch bleibt dahinter',
    stage: 'flur',
    seconds: 3.5,
    shot: {
      camera: [{t: 0, pos: [-0.6, 1.6, 2.6], look: [0.6, 1.1, -0.9]}],
      actors: {
        zimmertuer: [
          {t: 0, x: 1.2, z: -1.25, face: 270, motion: 'park', door: 1, smoke: 1},
          {t: 0.12, x: 1.2, z: -1.25, face: 270, motion: 'park', door: 1},
          {t: 0.38, x: 1.2, z: -1.25, face: 270, motion: 'park', door: 0},
        ],
        wohnungstuer: [{t: 0, x: -0.47, z: -3, face: 180, motion: 'park', door: 0}],
        dummy: [{t: 0, x: 0.35, z: -0.1, face: 140, motion: 'closedoor'}],
      },
    },
  },
  {
    label: 'Draußen: telefonieren + winken, Feuerwehr kommt',
    stage: 'hauseingang',
    seconds: 5,
    shot: {
      camera: [{t: 0, pos: [-2.2, 1.7, 1.6], look: [2.5, 1.0, 8.5]}],
      actors: {
        dummy: [{t: 0, x: 0.6, z: 4.6, face: 170, motion: 'callwave'}],
        feuerwehrauto: [
          {t: 0, x: -22, z: 9.4, face: 90, motion: 'drive'},
          {t: 0.8, x: 2.5, z: 9.4, face: 90, motion: 'drive'},
          {t: 0.85, x: 2.5, z: 9.4, face: 90, motion: 'park'},
        ],
      },
    },
  },
  {
    label: 'Bühne: Hauseingang bei Nacht im Schnee',
    stage: 'hauseingang',
    seconds: 3,
    shot: {
      camera: [{t: 0, pos: [2.0, 1.8, 10.5], look: [0, 1.8, -3]}],
      actors: {haustuer: [{t: 0, x: -0.52, z: -4, face: 180, motion: 'park', door: 0.6}], dummy: [{t: 0, x: 0.5, z: 2.5, face: 180, motion: 'call'}]},
    },
  },
  {
    label: 'Objekte: Eimer mit Wasser, Geschenkpakete',
    stage: 'weihnachtszimmer',
    seconds: 3,
    shot: {
      camera: [{t: 0, pos: [-0.2, 1.0, 1.6], look: [-0.2, 0.25, -0.3]}],
      actors: {eimer: [{t: 0, x: -0.6, z: -0.3, motion: 'park'}], geschenke: [{t: 0, x: 0.15, z: -0.3, face: 180, motion: 'park'}]},
    },
  },
];

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
  // ---------- Neu für "Auto im See" (Bühne Seeufer) ----------
  ...LAKE_DEMOS,
  // ---------- Neu für "Petermännchen" (Bühne Meeresstrand) ----------
  ...BEACH_DEMOS,
  // ---------- Neu für "Fliegerbombe" (Bühne Garten) ----------
  ...GARDEN_DEMOS,
  // ---------- Neu für "Burggraben" (Bühne Burg) ----------
  ...CASTLE_DEMOS,
  ...FIRSTAID_DEMOS,
  // ---------- Neu für "Weihnachtsbaum-Brand" ----------
  ...FIRE_DEMOS,
];

/** Index der ersten Feuer-Demo (für Übersichtsbilder) */
export const FIRE_DEMO_FIRST = DEMOS.length - FIRE_DEMOS.length;

/** Index der ersten Burg-Demo (für Übersichtsbilder) */
export const CASTLE_DEMO_FIRST = DEMOS.length - CASTLE_DEMOS.length;

/** Index der ersten Garten-Demo (für Übersichtsbilder) */
export const GARDEN_DEMO_FIRST = DEMOS.length - GARDEN_DEMOS.length - CASTLE_DEMOS.length;

/** Index der ersten Strand-Demo (für Übersichtsbilder) */
export const BEACH_DEMO_FIRST = DEMOS.length - BEACH_DEMOS.length - GARDEN_DEMOS.length - CASTLE_DEMOS.length;

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
