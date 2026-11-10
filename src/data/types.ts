// Aufbau einer Szenario-Datei (scenarios/*.json). Siehe docs in CLAUDE.md.

export type Vec3 = [number, number, number];

/** Bewegungen, die eine Figur können muss. Nicht jede Figur kann alles (siehe actors/). */
export type Motion =
  | 'stand' // ruhig stehen
  | 'walk' // gehen
  | 'run' // rennen
  | 'climb' // klettern (am nächsten Kletterbaum der Bühne)
  | 'backstep' // langsam rückwärts gehen
  | 'sidestep' // langsam seitlich zurück gehen
  | 'stumble' // stolpern
  | 'calm' // Dummy: Hände beschwichtigend gehoben
  | 'wave' // Dummy: winken
  | 'alert' // Tier: aufmerksam, Kopf hoch
  | 'sniff'; // Tier: schnüffeln

/** Ein Zeitpunkt einer Figur. t = 0 … 1 (Anteil am Abschnitt, dehnt sich mit der Audiolänge). */
export type ActorKey = {
  t: number;
  x: number;
  z: number;
  y?: number;
  /** Blickrichtung in Grad: 0 = Richtung Bär/Wegende (−z), 90 = rechts, 180 = zur Kamera (+z) */
  face?: number;
  motion: Motion;
};

export type CameraKey = {
  t: number;
  pos: Vec3;
  /** Punkt [x,y,z] oder Name einer Figur ("dummy", "bear"), die verfolgt wird; "dummy+bear" = Mitte */
  look: Vec3 | string;
  fov?: number;
};

/** Soundeffekt zu einem Zeitpunkt t (0…1) des Abschnitts. id = Name aus sfx.config.json */
export type SfxCue = {t: number; id: string; volume?: number};

export type Shot = {
  camera: CameraKey[];
  actors: Record<string, ActorKey[]>;
  sfx?: SfxCue[];
};

/** Wort-Zeitstempel einer Sprachaufnahme (von ElevenLabs) */
export type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type Option = {
  card: string;
  speech: string;
  dummyAction: string;
  explanation: string;
  /** Optionale Kurzschritte zum Einblenden. cue = Stelle im Erklärtext, an der der Schritt erscheint */
  steps?: {text: string; cue: string}[];
  choreography: Shot;
};

export type Scenario = {
  id: string;
  category: string;
  stage: string;
  situation: {speech: string};
  options: [Option, Option, Option];
  correctOption: 1 | 2 | 3;
  countdown: {speech: string; screen: string};
  reveal: {speech: string; screen: string};
  outro: {speech: string; screen: string};
  sourceLine: string;
  sources: {name: string; url: string}[];
  publishing: {description: string; pinnedComment: string};
  shots: {
    situation: Shot;
    options: Shot;
    countdown: Shot;
    reveal: Shot;
    outro: Shot;
  };
};
