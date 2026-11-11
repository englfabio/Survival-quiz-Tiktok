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
  | 'sniff' // Tier: schnüffeln
  | 'flinch' // Dummy: gebissen zusammenzucken, Blick zur Wade
  | 'hurt' // Dummy: steht und schaut besorgt zur Wade (ohne Zucken)
  | 'suck' // Dummy: sitzt, beugt sich zur Wade (versucht zu saugen)
  | 'tourniquet' // Dummy: sitzt, wickelt ein Band um den Oberschenkel
  | 'sitdown' // Dummy: hinsetzen (danach sitzt er)
  | 'sit' // Dummy: ruhig sitzen, gebissenes Bein gestreckt und still
  | 'phone' // Dummy: ruhig sitzen und telefonieren
  | 'slither' // Schlange: schlängeln (auch wegschlängeln)
  | 'coil' // Schlange: zusammengerollt liegen
  | 'strike' // Schlange: zubeißen (kurz vorschnellen, zurück)
  // ---- Auto ----
  | 'park' // Auto: steht still
  | 'drive' // Auto: fahren (Räder drehen sich)
  | 'roll' // Auto: langsam rollen (z. B. ins Wasser)
  | 'float' // Auto: im Wasser treiben (leichtes Schaukeln)
  | 'sink' // Auto: sinken (Wackeln + Luftblasen); Abkippen über "tilt"
  // ---- Dummy im Auto / im Wasser ----
  | 'buckled' // Dummy: angeschnallt sitzen, Hände am Lenkrad
  | 'unbuckle' // Dummy: Gurt lösen (ca. 1,6 s), danach ohne Gurt
  | 'button' // Dummy: Knopf am Fensterheber drücken (Blick zum Fenster)
  | 'climbout' // Dummy: durchs Fenster klettern
  | 'swim' // Dummy: an der Oberfläche schwimmen
  | 'pushdoor' // Dummy: mit aller Kraft gegen die Tür drücken
  | 'wait' // Dummy: angeschnallt, ruhig sitzen und warten
  // ---- Effekt ----
  | 'splash'; // Effekt "splash": Wasser spritzt auf (Ring + Tropfen)

/** Ein Zeitpunkt einer Figur. t = 0 … 1 (Anteil am Abschnitt, dehnt sich mit der Audiolänge). */
export type ActorKey = {
  t: number;
  x: number;
  z: number;
  y?: number;
  /** Blickrichtung in Grad: 0 = Richtung Bär/Wegende (−z), 90 = rechts, 180 = zur Kamera (+z) */
  face?: number;
  motion: Motion;
  /** Dummy: zwei kleine Bisspunkte an der rechten Wade zeigen (gilt ab diesem Zeitpunkt weiter) */
  bite?: boolean;
  /**
   * An eine andere Figur "anhängen" (z. B. "car"): x/y/z/face gelten dann im Auto
   * (Dummy sitzt im Auto und bewegt sich mit). Wechsel angehängt ↔ frei wird weich überblendet.
   */
  attach?: string;
  // ---- Zahlenwerte, die weich zum nächsten Zeitpunkt übergehen (gelten weiter, bis sie sich ändern) ----
  /** Auto: nach vorne abkippen in Grad (positiv = Nase nach unten) */
  tilt?: number;
  /** Auto: Fahrerfenster 0 = zu … 1 = ganz offen */
  window?: number;
  /** Auto: Fahrertür 0 = zu … 1 = weit offen */
  door?: number;
  /** Auto: Wasserstand im Innenraum in Metern über dem Boden (0 = trocken, ca. 1,25 = Dach) */
  water?: number;
  /** Auto: Wasserdruck-Pfeile auf die Fahrertür, 0 = aus … 1 = voll */
  pressure?: number;
};

/** Zahlenwerte einer Figur, die von Zeitpunkt zu Zeitpunkt weich übergehen */
export const ACTOR_VALUES = ['tilt', 'window', 'door', 'water', 'pressure'] as const;
export type ActorValue = (typeof ACTOR_VALUES)[number];

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
  /** Abblenden der 3D-Szene: [t Beginn, t Ende, Stärke 0…1] – Texte bleiben sichtbar */
  fade?: [number, number, number];
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
