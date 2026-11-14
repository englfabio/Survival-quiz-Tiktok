import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import type {ActorKey} from '../data/types';
import {breathPhaseAt, deg, inheritedKeys, sampleActor, segmentAt, type ActorState} from '../lib/anim';
import type {StageDef} from '../stage/types';
import {SpeedLines} from '../effects/SpeedLines';
import {Splash} from '../effects/Splash';
import {ColdBadge} from '../effects/Cold';
import {Spray} from '../effects/Spray';
import {bridgeLocalMatrix, Drawbridge} from './CastleProps';
import {Bear, bearPose} from './Bear';
import {Car, carLocalMatrix, carPose} from './Car';
import {Basin} from './Basin';
import {Dummy, dummyPoseBlended, rightHandLocal, sitExtras, zapPose} from './Dummy';
import {Grenade, Magnet} from './MagnetProps';
import {Bill, CordonTape, Suitcase, TapeRoll} from './StationProps';
import {FilmPhone, PlasticCup, SoundWaves, SuctionWind, Train} from './TrainProps';
import {Briefcase, Contract, Envelope, GardenGate, GardenGnome, LawnMower, LawnPatch, Mailbox, NailScissors, SoldSign, WateringCan as GardenWateringCan} from './NeighborProps';
import {Branch, HiddenNeedle, LitterPile, NeedleCap, Syringe, SYRINGE_SCALE} from './SyringeProps';
import {Calculator, CalendarSheet, MoneyBundle, MoneyCase, ParagraphBadge, PaperForm} from './MoneyProps';
import {Dog, DOG_COLLAR, dogPose, Leash, MapPhone, Pistol, PoliceCar} from './PistolProps';
import type {DummyPose, Kid, Uniform} from './Dummy';
import {ColdWaterGlass, CoolPack, HeartBadge} from './PanicProps';
import {CarQueue, CoffeeMug, DelayBoard, Excavator, Loco, RailSignal, Speedo} from './BahnProps';
import {CampStove, DayCalendar, Doorbell, FairyLights, FlatDoor, Parcel, ParcelStack, Saw, Tent} from './PaketProps';
import {BigFridge, BigRedButton, Binder, CoinPile, Envelope as WgEnvelope, FatMarker, Laptop, RubberStamp, StickyNote, YogurtBlast, YogurtCup} from './WgProps';
import {Whale, whalePose} from './Whale';
import {Eel, eelAnchors, eelPose} from './Eel';
import {Broom, FuseBox, WetTowel} from './ShockProps';
import {Kangaroo, kangarooPoseBlended} from './Kangaroo';
import {GardenTap, HintSign, MilkCarton, RescueBox, Tissue, Tooth, WaterGlass} from './ToothProps';
import {ZapAura, zapShake} from '../effects/Zap';
import {ChildLockCabinet, DishTab, KitchenRoll, MilkGlass, PaperSheet, TabPack} from './TabProps';
import {T} from '../ui/theme';
import {clamp} from '../lib/anim';
import {Snake, snakePose} from './Snake';
import {Thermometer} from './Thermometer';
import {AerialBomb, Smartphone, SmartphoneProp, SpadeProp, WarnStake, Wheelbarrow} from './GardenProps';
import {Weever, weeverPose} from './Weever';
import {QuestionMark, Zombie, zombiePoseBlended} from './Zombie';
import {Bucket, ChristmasTree, DoorLeaf, FireTruck, GiftPile} from './ChristmasProps';
import {AlarmClock, ConfettiBurst, DigitalClock, GearBurst, MonthCalendar, RingLines, TearCalendar, WateringCan} from './WeckerProps';
import {CompressPad, FirstAidKit, PlasterStrip, Sink, SprayBottle, VaccinationPass, WallCalendar, WallClock} from './FirstAidProps';

/**
 * Figuren-Baukasten. Neue Figur = neue Datei + hier eintragen.
 * height = Augen-/Blickhöhe für die Kamera ("look": "bear").
 * climbOffset = Abstand vom Baumstamm beim Klettern.
 */
export const ACTORS = {
  dummy: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  bear: {height: 0.9, climbOffset: 0.12, speedLineHeight: 0.9},
  snake: {height: 0.1, climbOffset: 0.05, speedLineHeight: 0.1},
  car: {height: 0.9, climbOffset: 0.3, speedLineHeight: 0.7},
  splash: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
  petermaennchen: {height: 0.05, climbOffset: 0, speedLineHeight: 0},
  schuessel: {height: 0.2, climbOffset: 0, speedLineHeight: 0},
  thermometer: {height: 0, climbOffset: 0, speedLineHeight: 0},
  // ---- Garten ----
  nachbar: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  fliegerbombe: {height: 0.1, climbOffset: 0, speedLineHeight: 0},
  spaten: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
  schubkarre: {height: 0.5, climbOffset: 0, speedLineHeight: 0},
  warnstab: {height: 0.8, climbOffset: 0, speedLineHeight: 0},
  smartphone: {height: 0.12, climbOffset: 0, speedLineHeight: 0},
  // ---- Burg ----
  zugbruecke: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
  // ---- Erste Hilfe (Zombie-Biss) ----
  zombie: {height: 1.45, climbOffset: 0.2, speedLineHeight: 1.0},
  arzt: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  waschbecken: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  kalender: {height: 0, climbOffset: 0, speedLineHeight: 0},
  wanduhr: {height: 0, climbOffset: 0, speedLineHeight: 0},
  impfpass: {height: 0, climbOffset: 0, speedLineHeight: 0},
  verbandskasten: {height: 0.1, climbOffset: 0, speedLineHeight: 0},
  pflaster: {height: 0, climbOffset: 0, speedLineHeight: 0},
  sprayflasche: {height: 0, climbOffset: 0, speedLineHeight: 0},
  kompresse: {height: 0, climbOffset: 0, speedLineHeight: 0},
  // ---- Feuer (Weihnachtsbaum-Brand) ----
  weihnachtsbaum: {height: 1.2, climbOffset: 0, speedLineHeight: 0},
  zimmertuer: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  wohnungstuer: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  haustuer: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  eimer: {height: 0.2, climbOffset: 0, speedLineHeight: 0},
  geschenke: {height: 0.2, climbOffset: 0, speedLineHeight: 0},
  feuerwehrauto: {height: 1.5, climbOffset: 0, speedLineHeight: 1.2},
  // ---- Strom (Zitteraal) ----
  kumpel: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  zitteraal: {height: 0.05, climbOffset: 0, speedLineHeight: 0},
  handtuch: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
  sicherungskasten: {height: 1.5, climbOffset: 0, speedLineHeight: 0},
  besen: {height: 0.7, climbOffset: 0, speedLineHeight: 0},
  // ---- Zahnunfall (Känguru) ----
  kaenguru: {height: 1.45, climbOffset: 0.2, speedLineHeight: 0.9},
  zahn: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  taschentuch: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  wasserglas: {height: 0.07, climbOffset: 0, speedLineHeight: 0},
  wasserhahn: {height: 0.9, climbOffset: 0, speedLineHeight: 0},
  zahnrettungsbox: {height: 0.05, climbOffset: 0, speedLineHeight: 0},
  hmilch: {height: 0.12, climbOffset: 0, speedLineHeight: 0},
  hinweis: {height: 0, climbOffset: 0, speedLineHeight: 0},
  // ---- Vergiftung (Spülmaschinentab) ----
  spuelmaschinentab: {height: 0.01, climbOffset: 0, speedLineHeight: 0},
  tabpackung: {height: 0.08, climbOffset: 0, speedLineHeight: 0},
  milchglas: {height: 0.08, climbOffset: 0, speedLineHeight: 0},
  kuechenpapier: {height: 0.15, climbOffset: 0, speedLineHeight: 0},
  papierblatt: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  oberschrank: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
  // ---- Panikattacke (Wal im Zimmer) ----
  wal: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  kaltwasser: {height: 0.07, climbOffset: 0, speedLineHeight: 0},
  coolpack: {height: 0.02, climbOffset: 0, speedLineHeight: 0},
  // ---- Magnetfischen (Granate) ----
  magnet: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  granate: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  // ---- Bahnhof (herrenloser Koffer) ----
  bahnmitarbeiterin: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  bundespolizist: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  koffer: {height: 0.4, climbOffset: 0, speedLineHeight: 0},
  absperrband: {height: 0.9, climbOffset: 0, speedLineHeight: 0},
  rechnung: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  // ---- Fundstück im Wald (Pistole) ----
  pistole: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  kartenhandy: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  polizeiauto: {height: 0.9, climbOffset: 0.3, speedLineHeight: 0.7},
  hund: {height: 0.5, climbOffset: 0, speedLineHeight: 0.4},
  polizist: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  polizistin: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  // ---- Geldkoffer (Fundstücke) ----
  geldkoffer: {height: 0.2, climbOffset: 0, speedLineHeight: 0},
  geldbuendel: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  formular: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  taschenrechner: {height: 0.08, climbOffset: 0, speedLineHeight: 0},
  kalenderblatt: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  paragraf: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  // ---- Bahnsteigkante (Sog) ----
  zug: {height: 2.6, climbOffset: 0, speedLineHeight: 0},
  becher: {height: 0.1, climbOffset: 0, speedLineHeight: 0},
  durchsage: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  filmhandy: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  sog: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  // ---- Spritze auf dem Spielplatz (Fundstücke) ----
  kind1: {height: 0.75, climbOffset: 0.1, speedLineHeight: 0.6},
  kind2: {height: 0.75, climbOffset: 0.1, speedLineHeight: 0.6},
  kind3: {height: 0.75, climbOffset: 0.1, speedLineHeight: 0.6},
  spritze: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  kappe: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  muell: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  nadel: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  ast: {height: 0.5, climbOffset: 0, speedLineHeight: 0},
  // ---- Wecker-Spezial (verschlafen) ----
  chef: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  wecker: {height: 0.1, climbOffset: 0, speedLineHeight: 0},
  digitaluhr: {height: 0.06, climbOffset: 0, speedLineHeight: 0},
  abreisskalender: {height: 0.1, climbOffset: 0, speedLineHeight: 0},
  monatskalender: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  zahnraeder: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  konfetti: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  giesskanne: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  giesskanne2: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  // ---- Spezial: Nachbars Rasen ----
  gartennachbar: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  rasen: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  rasen2: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  gartenzwerg: {height: 0.25, climbOffset: 0, speedLineHeight: 0},
  rasenmaeher: {height: 0.3, climbOffset: 0, speedLineHeight: 0},
  aktenkoffer: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  kaufvertrag: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  kuendigung: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  briefkasten: {height: 1.1, climbOffset: 0, speedLineHeight: 0},
  verkauft: {height: 1.5, climbOffset: 0, speedLineHeight: 0},
  nagelschere: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  gartentor: {height: 0.4, climbOffset: 0, speedLineHeight: 0},
  // ---- WG-Küche (Spezial: Mitbewohner-Joghurt) ----
  kuehlschrank: {height: 1.2, climbOffset: 0, speedLineHeight: 0},
  joghurt: {height: 0.06, climbOffset: 0, speedLineHeight: 0},
  klebezettel: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  knopf: {height: 0.9, climbOffset: 0, speedLineHeight: 0},
  joghurtwelle: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  brief: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  brief2: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  brief3: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  brief4: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  stempel: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  muenzen: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  ordner: {height: 0.16, climbOffset: 0, speedLineHeight: 0},
  laptop: {height: 0.1, climbOffset: 0, speedLineHeight: 0},
  stift: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  // ---- Spezial: Paket beim Nachbarn (Treppenhaus) ----
  paketnachbar: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  paketbote: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  paket: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  paket2: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  pakete: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  zelt: {height: 0.5, climbOffset: 0, speedLineHeight: 0},
  lichterkette: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  kocher: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  saege: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  klingel: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  klingel2: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  tageskalender: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  treppentuer: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  treppentuer2: {height: 1.0, climbOffset: 0, speedLineHeight: 0},
  // ---- Spezial: Bahn-Verspätung ----
  lok: {height: 2.2, climbOffset: 0, speedLineHeight: 0},
  bagger: {height: 3.5, climbOffset: 0, speedLineHeight: 0},
  signal: {height: 4.2, climbOffset: 0, speedLineHeight: 0},
  tacho: {height: 0.0, climbOffset: 0, speedLineHeight: 0},
  kaffeetasse: {height: 0.05, climbOffset: 0, speedLineHeight: 0},
  autoschlange: {height: 0.9, climbOffset: 0, speedLineHeight: 0},
  anzeigetafel: {height: 0.5, climbOffset: 0, speedLineHeight: 0},
  fahrgast1: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  fahrgast2: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
  fahrgast3: {height: 1.25, climbOffset: 0.2, speedLineHeight: 1.0},
} as const;

/** Wartende Fahrgast-Dummys (Bahnsteig): Dummy-Körper in Pastellfarben, Mantel/Jacke + Hose, ohne Mütze – können alle Dummy-Bewegungen */
const PASSENGERS: Record<string, {color: string; uniform: Uniform}> = {
  fahrgast1: {color: '#7fc8b8', uniform: {jacket: '#3d6b8f', dark: '#2a4d6b', collar: '#e9e6e1', pants: '#2f3542', cap: '#3d6b8f', band: '#3d6b8f', trim: '#3d6b8f', nocap: true}},
  fahrgast2: {color: '#c9a3d9', uniform: {jacket: '#b5473a', dark: '#82322a', collar: '#f2e6d6', pants: '#3a3f46', cap: '#b5473a', band: '#b5473a', trim: '#b5473a', nocap: true, scarf: '#ffd21a'}},
  fahrgast3: {color: '#9fd17a', uniform: {jacket: '#6b5a48', dark: '#4a3d30', collar: '#e9e1d2', pants: '#2c3e5a', cap: '#6b5a48', band: '#6b5a48', trim: '#6b5a48', nocap: true}},
};

/** Kinder-Dummys: klein (Maßstab 0,6), bunte Körperfarben, Kappe oder Zöpfe – freundlich, ohne Gesicht wie alle Dummys */
export const KIDS: Record<string, {color: string; kid: Kid}> = {
  kind1: {color: '#ff7eb3', kid: {hair: '#6b3d1f'}},
  kind2: {color: '#4fc3f7', kid: {cap: '#ffb300'}},
  kind3: {color: '#8bd450', kid: {cap: '#e53935'}},
};
export const KID_SCALE = 0.6;

/** Bewegungen im Wasser: y bezieht sich auf die Wasseroberfläche der Bühne */
const WATER_MOTIONS = ['swim', 'struggle', 'gasp', 'crawl', 'tug', 'backfloat', 'backswim', 'edgehold', 'edgewave'];

/** Kälte-Symbol: Höhe über dem Ursprung der Figur (aufrecht im Wasser vs. liegend) */
const coldHeight = (motion: string) => (['backfloat', 'backswim', 'crawl', 'swim'].includes(motion) ? 0.7 : 2.15);

/** Körperfarbe des Nachbarn (gleiche Figur wie der Dummy, aber blau) */
const NEIGHBOR_COLOR = '#3f8fd6';
/** Körperfarbe der Ärztin/des Arztes (gleiche Figur wie der Dummy, türkis, mit weißem Kittel) */
const DOCTOR_COLOR = '#2fae9c';
/** Körperfarbe des Kumpels (zweiter Crashtest-Dummy, orange – für alle Szenen, in denen man jemandem hilft) */
const BUDDY_COLOR = '#f07a1e';
/** Paket-Nachbar: Dummy-Körper blaugrau, weinroter Bademantel mit hellem Gürtel/Schalkragen, flauschige Hausschuhe */
const PARCEL_NB_COLOR = '#7f95a8';
const ROBE: Uniform = {jacket: '#9c4a5a', dark: '#7a3343', collar: '#efe0d2', pants: '#7f95a8', cap: '#9c4a5a', band: '#9c4a5a', trim: '#9c4a5a', nocap: true, robe: true, slippers: '#c9b6cf'};
/** Paketbote: Dummy-Körper hell salbeigrün, neutrale blaugraue Uniform + Mütze – KEIN Logo, keine Paketdienst-Farben */
const COURIER_COLOR = '#c4d0bf';
const COURIER_UNIFORM: Uniform = {jacket: '#5b7389', dark: '#3e5164', collar: '#dfe6ec', pants: '#3a434d', cap: '#5b7389', band: '#3e5164', trim: '#8fa5b8'};
/** Figuren mit Dummy-Körper (können zittern + Blitze bekommen) */
const DUMMY_LIKE = ['dummy', 'nachbar', 'arzt', 'kumpel', 'bahnmitarbeiterin', 'bundespolizist', 'polizist', 'polizistin', 'chef', 'gartennachbar', 'paketnachbar', 'paketbote', 'fahrgast1', 'fahrgast2', 'fahrgast3'];
/** Chef: Dummy-Körper grau, dunkelgrauer Anzug, weißes Hemd, rote Krawatte, ohne Mütze */
const BOSS_COLOR = '#9aa1a8';
const BOSS_SUIT: Uniform = {jacket: '#4a5058', dark: '#30353b', collar: '#f4f6f8', pants: '#3a3f46', cap: '#4a5058', band: '#4a5058', trim: '#4a5058', tie: '#c8102e', nocap: true};
/** Dummy im Anzug: dunkelgrau, weißer Hemdkragen, rote Krawatte, ohne Mütze */
const SUIT_UNIFORM: Uniform = {jacket: '#3a3f47', dark: '#262a30', collar: '#f4f4f2', pants: '#353a42', cap: '#3a3f47', band: '#3a3f47', noCap: true, tie: '#d0261c', trim: '#3a3f47'};
/** Bahnmitarbeiterin: Körper hellgrau-lila, Uniform weinrot/grau mit rotem Halstuch + Zopf (ohne Logo) */
const STAFF_COLOR = '#b9a6d6';
const STAFF_UNIFORM: Uniform = {jacket: '#7b1f35', dark: '#4e1222', collar: '#e9e6e1', pants: '#3c4048', cap: '#7b1f35', band: '#3c4048', scarf: '#d8b23a', hair: '#5a3622'};
/** Bundespolizist: Körper hellgrau, stilisierte dunkelblaue Uniform (ohne echte Abzeichen) */
const POLICE_COLOR = '#aeb8c4';
const POLICE_UNIFORM: Uniform = {jacket: '#1e2b4a', dark: '#121a2e', collar: '#8fb0d6', pants: '#1a2440', cap: '#1e2b4a', band: '#8fb0d6', trim: '#2c3d63'};
/** Polizistin: gleiche Uniform, Zopf */
const POLICE_UNIFORM_W: Uniform = {...POLICE_UNIFORM, hair: '#6b4a2a'};
/** Polizist/Polizistin (Streife): Körperfarben */
const POLICE2_COLOR = '#b9c3cc';
const POLICE3_COLOR = '#c9b8a8';

/** Zahn: Drehung im Flug (rad/s) */
const TOOTH_SPIN = 13;

/** Petermännchen größer als echt (ca. 0,48 m statt 0,3 m), damit es im Hochformat gut zu sehen ist */
const WEEVER_SCALE = 1.6;

/** Kreuzotter etwas größer als echt (ca. 0,85 m statt 0,7 m), damit sie im Hochformat gut zu sehen ist */
const SNAKE_SCALE = 1.2;

export type ActorName = keyof typeof ACTORS;

/** Fertig berechnete Figur: Zustand + Lage in der Welt */
export type ResolvedActor = {name: string; state: ActorState; matrix: THREE.Matrix4; pos: THREE.Vector3; text?: string; hand?: THREE.Vector3; leashTo?: THREE.Vector3};

/** Position einer Figur (inkl. "am Baum kleben" beim Klettern und Bodenhöhe) */
const placeOnStage = (name: string, s: ActorState, stage: StageDef) => {
  if (s.motion === 'climb' && stage.climbTrees.length) {
    const tree = [...stage.climbTrees].sort(
      (a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z),
    )[0];
    const dx = s.x - tree.x;
    const dz = s.z - tree.z;
    const d = Math.hypot(dx, dz) || 1;
    const off = tree.r + (ACTORS[name as ActorName]?.climbOffset ?? 0.3);
    s.x = tree.x + (dx / d) * off;
    s.z = tree.z + (dz / d) * off;
    // Blick zum Stamm: Richtung (sin f, -cos f) = -(dx,dz)/d
    s.face = (Math.atan2(-dx / d, dz / d) * 180) / Math.PI;
  } else if (stage.waterLevel !== undefined && WATER_MOTIONS.includes(s.motion)) {
    // im Wasser: y bezieht sich auf die Wasseroberfläche
    s.y += stage.waterLevel;
  } else {
    s.y += stage.groundHeight(s.x, s.z);
  }
};

/** Welt-Lage einer frei stehenden Figur. Modell blickt nach +z; "face" 0 = −z → Drehung 180° − face */
const worldMatrix = (x: number, y: number, z: number, face: number) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, deg(180 - face), 0)),
    new THREE.Vector3(1, 1, 1),
  );

/** Lage im Koordinatensystem einer anderen Figur (z. B. im Auto): face 0 = nach vorne, 90 = zur Fahrertür */
const attachedMatrix = (parent: THREE.Matrix4, x: number, y: number, z: number, face: number) =>
  parent
    .clone()
    .multiply(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, deg(face), 0)),
        new THREE.Vector3(1, 1, 1),
      ),
    );

/** Zusätzliche Eigenbewegung (Auto schaukelt / kippt) – gilt auch für angehängte Figuren */
const ownMotionMatrix = (name: string, s: ActorState) =>
  name === 'car'
    ? rumbleMatrix(s).multiply(carLocalMatrix(carPose(s.motion, s.motionTime, s.speed), s.values.tilt))
    : name === 'zugbruecke'
      ? bridgeLocalMatrix(s.values.tilt)
      : new THREE.Matrix4();

/** Rumpeln über Kopfsteinpflaster (Wert "rumble"): kleine schnelle Stöße + Wanken */
const rumbleMatrix = (s: ActorState) => {
  const r = s.values.rumble;
  if (!(r > 0.001)) return new THREE.Matrix4();
  const tt = s.sectionTime ?? s.motionTime;
  const dy = (Math.abs(Math.sin(tt * 21)) * 0.025 + Math.abs(Math.sin(tt * 33 + 1)) * 0.012) * r;
  return new THREE.Matrix4().compose(
    new THREE.Vector3(0, dy, 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(tt * 17) * 0.012 * r, 0, Math.sin(tt * 13 + 2) * 0.018 * r)),
    new THREE.Vector3(1, 1, 1),
  );
};

/** Berechnet alle Figuren einer Einstellung. Figuren mit "attach" werden nach ihrer "Trägerfigur" berechnet. */
export const resolveActors = (
  actors: Record<string, ActorKey[]>,
  t: number,
  sectionSeconds: number,
  stage: StageDef,
): ResolvedActor[] => {
  const entries = Object.entries(actors).filter(([, keys]) => keys.length > 0);
  const hasAttach = (keys: ActorKey[]) => keys.some((k) => k.attach);
  // Figuren mit Dummy-Körper zuerst (Gegenstände mit "hand" brauchen ihre Hand-Position)
  const rank = (n: string) => (n === 'dummy' ? 0 : DUMMY_LIKE.includes(n) ? 1 : 2);
  const free = entries.filter(([, k]) => !hasAttach(k)).sort(([a], [b]) => rank(a) - rank(b));
  const ordered = [...free, ...entries.filter(([, k]) => hasAttach(k))];
  const hands = new Map<string, THREE.Vector3>();
  const done = new Map<string, ResolvedActor>();
  // "Innen"-Matrix einer Figur: Welt-Lage inkl. Schaukeln/Abkippen (dort sitzen angehängte Figuren)
  const inner = new Map<string, THREE.Matrix4>();

  for (const [name, keys] of ordered) {
    const s = sampleActor(keys, t, sectionSeconds);
    s.breathPhase = breathPhaseAt(keys, t, sectionSeconds);
    s.heartPhase = breathPhaseAt(keys, t, sectionSeconds, 'heart');
    s.sectionTime = t * sectionSeconds;
    let base: THREE.Matrix4;
    if (!hasAttach(keys)) {
      placeOnStage(name, s, stage);
      base = worldMatrix(s.x, s.y, s.z, s.face);
    } else {
      // Endpunkte des aktuellen Abschnitts jeweils in Weltkoordinaten, dann weich mischen
      const inh = inheritedKeys(keys);
      const seg = segmentAt(keys, t);
      const endpoint = (idx: number) => {
        const k = keys[idx];
        const parent = k.attach ? inner.get(k.attach) : undefined;
        if (parent) return attachedMatrix(parent, k.x, k.y ?? 0, k.z, inh[idx].face);
        return worldMatrix(k.x, (k.y ?? 0) + stage.groundHeight(k.x, k.z), k.z, inh[idx].face);
      };
      const ka = keys[seg.i];
      const kb = keys[seg.i + 1];
      if (seg.last || !kb) {
        base = endpoint(seg.i);
      } else if (ka.attach && ka.attach === kb.attach && inner.get(ka.attach)) {
        // beide im Auto: im Auto mischen (bewegt sich mit dem Auto)
        base = attachedMatrix(inner.get(ka.attach)!, s.x, s.y, s.z, s.face);
      } else {
        const A = endpoint(seg.i);
        const B = endpoint(seg.i + 1);
        const pa = new THREE.Vector3();
        const pb = new THREE.Vector3();
        const qa = new THREE.Quaternion();
        const qb = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        A.decompose(pa, qa, sc);
        B.decompose(pb, qb, sc);
        base = new THREE.Matrix4().compose(pa.lerp(pb, seg.p), qa.slerp(qb, seg.p), new THREE.Vector3(1, 1, 1));
      }
    }
    // Gegenstand in der rechten Hand des Dummys ("hand" 0 … 1, hängt "drop" Meter darunter, pendelt leicht)
    const hk = s.values.hand;
    let holder = 'dummy';
    for (const k of keys) if (k.t <= t + 1e-6 && k.holder !== undefined) holder = k.holder;
    const dummyHand = hands.get(holder);
    if (hk > 0.001 && dummyHand) {
      const st = s.sectionTime ?? 0;
      const drop = s.values.drop;
      const target = dummyHand
        .clone()
        .add(new THREE.Vector3(Math.sin(st * 2.3) * 0.12 * drop, -drop, Math.sin(st * 1.7 + 1) * 0.08 * drop));
      const p0 = new THREE.Vector3();
      const q0 = new THREE.Quaternion();
      const sc0 = new THREE.Vector3();
      base.decompose(p0, q0, sc0);
      base = new THREE.Matrix4().compose(p0.lerp(target, Math.min(1, hk)), q0, sc0);
    }
    const matrix = base.clone().multiply(ownMotionMatrix(name, s));
    inner.set(name, matrix);
    const pos = new THREE.Vector3().setFromMatrixPosition(base);
    let hand: THREE.Vector3 | undefined;
    if (DUMMY_LIKE.includes(name)) {
      hand = rightHandLocal(dummyPoseBlended(s.motion, s.motionTime, s.speed, s.prev)).applyMatrix4(matrix);
      hands.set(name, hand);
    }
    let text: string | undefined;
    for (const k of keys) if (k.t <= t + 1e-6 && k.text !== undefined) text = k.text;
    // Hund an der Leine: Ziel = rechte Hand der Figur in "holder" (Standard "nachbar")
    let leashTo: THREE.Vector3 | undefined;
    if (name === 'hund' && s.values.leash > 0.5) {
      let lh = 'nachbar';
      for (const k of keys) if (k.t <= t + 1e-6 && k.holder !== undefined) lh = k.holder;
      leashTo = hands.get(lh);
    }
    done.set(name, {name, state: s, matrix, pos, text, hand, leashTo});
  }
  return entries.map(([name]) => done.get(name)!);
};

/** Windrichtung (Sog zum Gleis = −z der Welt, drift = seitlich +x) im System einer Figur mit Blickrichtung face → Winkel um y */
const windLocal = (face: number, drift: number) => {
  const th = deg(180 - face);
  const wx = drift * 0.6;
  const wz = -1;
  const lx = wx * Math.cos(th) - wz * Math.sin(th);
  const lz = wx * Math.sin(th) + wz * Math.cos(th);
  return Math.atan2(lx, lz);
};

/** Brief in der Hand: Aufschrift aus dem Feld "text" der Figur (falls gesetzt) */
const withLabel = (p: DummyPose, text?: string): DummyPose => (text && (p.item === 'letterread' || p.item === 'letter') ? {...p, label: text} : p);

/** Drehung, damit ein flaches Symbol an Position p zur Kamera schaut */
const billboard = (p: THREE.Vector3, cam: [number, number, number]) => {
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...cam), p, new THREE.Vector3(0, 1, 0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
};

export const Actor = ({
  actor,
  barefoot = false,
  camPos = [0, 2, 8],
  waterLevel = 0,
}: {
  actor: ResolvedActor;
  barefoot?: boolean;
  camPos?: [number, number, number];
  waterLevel?: number;
}) => {
  const {name, state, matrix, pos} = actor;
  const clock = useCurrentFrame() / 30; // durchlaufende Zeit (Flackern, Blaulicht)
  const lines = state.motion === 'run' && state.speed > 1.5;
  const v = state.values;
  const coldPos = pos.clone().add(new THREE.Vector3(0, coldHeight(state.motion), 0));
  const qPos = pos.clone().add(new THREE.Vector3(0, 2.2, 0));
  // Herz-Symbol: links neben dem Kopf (aus Sicht der Kamera), Höhe passt zu Stehen/Sitzen
  const sitting = ['bedsitdown', 'sitbreathe', 'chairsit', 'couchsit'].includes(state.motion);
  const heartPos = pos.clone().add(new THREE.Vector3(0, sitting ? 1.6 : 2.05, 0)).add(new THREE.Vector3(camPos[0] - pos.x, 0, camPos[2] - pos.z).normalize().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(-0.32));
  // Zeit für Blitze/Zittern = Gesamtzeit im Abschnitt (läuft über Bewegungswechsel weiter, friert beim Einfrieren ein)
  const zt = state.sectionTime ?? state.motionTime;
  const shake = DUMMY_LIKE.includes(name) ? zapShake(zt, v.zap, name.length) : {pos: [0, 0, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number]};
  return (
    <>
    {name === 'zombie' && state.motion === 'confused' && (
      <group position={qPos} quaternion={billboard(qPos, camPos)}>
        <QuestionMark amount={Math.min(1, state.motionTime / 0.5)} />
      </group>
    )}
    {DUMMY_LIKE.includes(name) && v.question > 0.01 && (
      <group position={qPos} quaternion={billboard(qPos, camPos)}>
        <QuestionMark amount={v.question} />
      </group>
    )}
    {name === 'durchsage' && (
      <group position={pos} quaternion={billboard(pos, camPos)}>
        <SoundWaves time={state.motionTime} visible={state.motion === 'show'} left={v.side > 0.5} size={v.size} />
      </group>
    )}
    {name === 'tacho' && (
      <group position={pos} quaternion={billboard(pos, camPos)}>
        <Speedo text={actor.text ?? '25 km/h'} value={v.fill > 0 ? v.fill * 100 : 25} time={state.motionTime} visible={state.motion === 'show'} size={v.size} />
      </group>
    )}
    {name === 'hund' && actor.leashTo && <Leash a={DOG_COLLAR.clone().applyMatrix4(matrix)} b={actor.leashTo} />}
    {name === 'dummy' && v.heart > 0.01 && (
      <group position={heartPos} quaternion={billboard(heartPos, camPos)}>
        <HeartBadge phase={state.heartPhase ?? 0} rate={v.heart} amount={clamp(v.heart / 0.3, 0, 1)} />
      </group>
    )}
    {name === 'dummy' && v.cold > 0.01 && (
      <group position={coldPos} quaternion={billboard(coldPos, camPos)}>
        <ColdBadge amount={v.cold} time={state.motionTime} />
      </group>
    )}
    <group matrix={matrix} matrixAutoUpdate={false}>
    <group position={shake.pos} rotation={shake.rot}>
      {name === 'dummy' && (
        <Dummy
          zap={v.zap}
          zapTime={zt}
          pose={withLabel(sitExtras(zapPose(dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev), v.zap, zt, 3), v.pack, v.sip), actor.text)}
          heave={v.heave}
          bite={state.bite}
          sting={state.sting}
          pain={v.pain}
          barefoot={barefoot}
          jacket={v.jacket}
          pants={v.pants}
          breath={v.breath}
          breathPhase={state.breathPhase}
          armbite={v.armbite}
          redness={v.redness}
          plaster={v.plaster}
          dressing={v.dressing}
          gloves={v.gloves}
          teeth={v.teeth}
          gap={v.gap}
          tooth={{gray: v.gray, mark: v.mark, wrap: v.wrap}}
          foam={v.foam}
          lunge={v.lunge}
          blut={v.blut}
          fxTime={zt}
          stash={v.stash}
          brow={v.brow}
          wind={v.wind}
          windDir={windLocal(state.face, v.drift)}
          partyhat={v.partyhat}
          gardenhat={v.gardenhat}
          paint={v.paint}
          uniform={v.suit > 0.5 ? SUIT_UNIFORM : undefined}
          glasses={v.glasses}
          splat={v.splat}
          lokcap={v.lokcap}
          jogger={v.jogger}
        />
      )}
      {name === 'gartennachbar' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={BUDDY_COLOR} hat brow={v.brow} />
      )}
      {(name === 'rasen' || name === 'rasen2') && <LawnPatch lush={v.lush} paint={v.paint} seed={name === 'rasen' ? 1 : 2} />}
      {name === 'gartenzwerg' && (
        <group scale={1.35 + v.size}>
          <GardenGnome paint={v.paint} />
        </group>
      )}
      {name === 'rasenmaeher' && (
        <LawnMower
          time={clock}
          spin={state.motion === 'push' ? zt * 7 : 0}
          camQ={new THREE.Quaternion().setFromRotationMatrix(matrix).invert().multiply(billboard(pos, camPos))}
        />
      )}
      {name === 'aktenkoffer' && <Briefcase />}
      {name === 'kaufvertrag' && <Contract fill={v.fill} tilt={v.tilt} />}
      {name === 'kuendigung' && <Envelope text={actor.text ?? 'KÜNDIGUNG'} size={v.size} />}
      {name === 'briefkasten' && <Mailbox flap={v.door} />}
      {name === 'verkauft' && <SoldSign time={state.motionTime} visible={state.motion === 'show'} />}
      {name === 'giesskanne2' && <GardenWateringCan tilt={v.tilt} water={v.water} time={clock} />}
      {name === 'nagelschere' && <NailScissors time={clock} size={v.size} />}
      {name === 'gartentor' && <GardenGate door={v.door} />}
      {name === 'paketnachbar' && (
        <Dummy pose={withLabel(dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev), actor.text)} color={PARCEL_NB_COLOR} uniform={ROBE} brow={v.brow} teeth={v.teeth} />
      )}
      {name === 'paketbote' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={COURIER_COLOR} uniform={COURIER_UNIFORM} brow={v.brow} />
      )}
      {(name === 'paket' || name === 'paket2') && <Parcel shade={name === 'paket' ? 1 : 3} w={0.34 * (1 + v.size)} h={0.24 * (1 + v.size)} d={0.28 * (1 + v.size)} />}
      {name === 'pakete' && <ParcelStack fill={v.fill} />}
      {name === 'zelt' && <Tent fill={v.fill} squish={v.squish} time={zt} />}
      {name === 'lichterkette' && <FairyLights glow={v.glow} time={clock} span={0.42 + v.size} />}
      {name === 'kocher' && <CampStove fire={v.fire} smoke={v.smoke} time={clock} />}
      {name === 'saege' && (
        <group rotation={[0, 0, Math.PI / 2]} position={[0, 0.004, 0]}>
          <Saw />
        </group>
      )}
      {(name === 'klingel' || name === 'klingel2') && <Doorbell text={actor.text ?? (name === 'klingel' ? 'NACHBAR' : 'DUMMY')} press={v.press} />}
      {name === 'tageskalender' && <DayCalendar day={Math.max(1, v.fill)} labels={actor.text ? actor.text.split('|') : undefined} />}
      {(name === 'treppentuer' || name === 'treppentuer2') && (
        <FlatDoor open={v.door} cut={v.fill} lid={v.lid} text={actor.text ?? (name === 'treppentuer' ? 'NACHBAR' : 'DUMMY')} wood={name === 'treppentuer2'} time={zt} mirror={v.side > 0.5} />
      )}
      {name === 'kuehlschrank' && <BigFridge door={v.door} night={v.glow} wobble={v.rumble} time={zt} />}
      {name === 'joghurt' && (
        <group scale={1 + v.size}>
          <YogurtCup lid={v.lid} fill={v.fill > 0 ? v.fill : 1} note={v.mark > 0.5 ? actor.text ?? 'Probe fürs Gesundheitsamt' : undefined} />
        </group>
      )}
      {name === 'klebezettel' && (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <StickyNote text={actor.text ?? 'Probe fürs Gesundheitsamt'} size={0.1 * (1 + v.size)} />
        </group>
      )}
      {name === 'stift' && (
        <group rotation={[0, 0, Math.PI / 2]} position={[0, 0.013, 0]}>
          <FatMarker />
        </group>
      )}
      {name === 'knopf' && <BigRedButton press={v.press} glow={v.glow} />}
      {name === 'joghurtwelle' && <YogurtBlast time={state.motionTime} active={state.motion === 'splash'} fill={v.fill} />}
      {(name === 'brief' || name === 'brief2' || name === 'brief3' || name === 'brief4') && (
        <group rotation={v.tilt > 0 ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} position={v.tilt > 0 ? [0, 0.003, 0] : [0, 0, 0]}>
          <WgEnvelope text={actor.text ?? 'Rechnung'} paid={v.mark > 0.5} size={v.size} />
        </group>
      )}
      {name === 'stempel' && <RubberStamp />}
      {name === 'muenzen' && <CoinPile fill={v.fill} />}
      {name === 'ordner' && <Binder text={actor.text ?? 'Joghurt\n2026'} color="#ff7aa8" size={v.size} />}
      {name === 'laptop' && <Laptop fill={v.fill} lid={state.values.lid > 0 || v.mark > 0 ? v.lid : 1} call={v.mark} hi={v.glow} />}
      {name === 'zug' && <Train speed={state.speed} time={zt} display={actor.text} pantograph={v.side < 0.5} />}
      {name === 'lok' && <Loco dist={pos.x + pos.z} ring={v.ring} time={zt} lights={v.blink} />}
      {name === 'bagger' && <Excavator dist={pos.x + pos.z} arm={v.tilt} smoke={v.smoke} time={zt} />}
      {name === 'signal' && <RailSignal green={v.good} time={clock} />}
      {name === 'kaffeetasse' && <CoffeeMug smoke={v.smoke} time={clock} />}
      {name === 'autoschlange' && <CarQueue count={v.fill > 0 ? v.fill * 8 : 6} dist={pos.x + pos.z} time={zt} rumble={v.rumble} />}
      {name === 'anzeigetafel' && <DelayBoard text={actor.text ?? '+90 Min'} blink={v.blink} />}
      {name === 'becher' && (
        <group rotation={state.motion === 'toss' ? [state.motionTime * 7.5, state.motionTime * 3, state.motionTime * 11] : [0, 0, 0]}>
          <PlasticCup size={v.size} />
        </group>
      )}
      {name === 'filmhandy' && (
        <group scale={1.5}>
          <FilmPhone time={zt} />
        </group>
      )}
      {name === 'sog' && <SuctionWind time={zt} wind={v.wind} drift={v.drift} width={1.8 * (1 + v.size)} />}
      {name === 'kaenguru' && <Kangaroo pose={kangarooPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} />}
      {name === 'zahn' && (
        <group scale={1 + v.size} rotation={state.motion === 'fly' ? [state.motionTime * TOOTH_SPIN, 0, state.motionTime * TOOTH_SPIN * 0.6] : state.motion === 'lie' ? [0.25, 0, 1.3] : [0, 0, 0]}>
          <Tooth gray={v.gray} mark={v.mark} time={clock} />
        </group>
      )}
      {name === 'taschentuch' && <Tissue wrap={v.wrap} />}
      {name === 'wasserglas' && <WaterGlass time={clock} ripple={1} />}
      {name === 'wasserhahn' && <GardenTap water={v.water} time={clock} />}
      {name === 'zahnrettungsbox' && (
        <group scale={1 + v.size}>
          <RescueBox lid={v.lid} />
        </group>
      )}
      {name === 'hmilch' && <MilkCarton />}
      {name === 'hinweis' && <HintSign text={actor.text ?? ''} time={state.motionTime} visible={state.motion === 'show'} height={0.07 * (1 + v.size)} below={v.below > 0.5} color={v.good > 0.5 ? T.green : T.red} />}
      {name === 'spuelmaschinentab' && (
        <group scale={1 + v.size}>
          <DishTab bitten={v.mark > 0.5} />
        </group>
      )}
      {name === 'tabpackung' && (
        <group scale={1 + v.size}>
          <TabPack open={v.lid} />
        </group>
      )}
      {name === 'milchglas' && <MilkGlass fill={v.fill} />}
      {name === 'kuechenpapier' && <KitchenRoll />}
      {name === 'papierblatt' && (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <PaperSheet />
        </group>
      )}
      {name === 'oberschrank' && <ChildLockCabinet door={v.door} lock={v.lock} />}
      {name === 'wal' && <Whale pose={whalePose(state.motion, state.motionTime)} size={v.size} squish={v.squish} time={zt} />}
      {name === 'kaltwasser' && <ColdWaterGlass fill={state.values.fill > 0 ? v.fill : 1} />}
      {name === 'coolpack' && <CoolPack />}
      {name === 'arzt' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={DOCTOR_COLOR} coat />
      )}
      {name === 'zombie' && <Zombie pose={zombiePoseBlended(state.motion, state.motionTime, state.speed, state.prev)} />}
      {name === 'waschbecken' && <Sink flow={state.motion === 'flow'} time={state.motionTime} />}
      {name === 'kalender' && <WallCalendar flipTime={state.motion === 'flip' ? state.motionTime : 0} startDay={actor.text ? parseInt(actor.text, 10) : undefined} />}
      {name === 'wanduhr' && <WallClock spinTime={state.motion === 'spin' ? state.motionTime : 0} time={state.motionTime} />}
      {name === 'impfpass' && <VaccinationPass open={state.motion === 'open' ? 1 : 0} />}
      {name === 'verbandskasten' && <FirstAidKit />}
      {name === 'pflaster' && <PlasterStrip />}
      {name === 'sprayflasche' && <SprayBottle />}
      {name === 'kompresse' && <CompressPad />}
      {name === 'weihnachtsbaum' && <ChristmasTree fire={v.fire} smoke={v.smoke} time={clock} />}
      {name === 'zimmertuer' && <DoorLeaf kind="zimmer" open={v.door} smoke={v.smoke} time={clock} />}
      {name === 'wohnungstuer' && <DoorLeaf kind="wohnung" open={v.door} smoke={v.smoke} time={clock} />}
      {name === 'haustuer' && <DoorLeaf kind="haus" open={v.door} smoke={v.smoke} time={clock} />}
      {name === 'eimer' && <Bucket time={clock} />}
      {name === 'geschenke' && <GiftPile />}
      {name === 'feuerwehrauto' && (
        <FireTruck spin={state.motion === 'drive' ? (state.motionTime * state.speed) / 0.5 : 0} time={clock} />
      )}
      {name === 'dummy' && v.spray > 0.01 && (
        <group position={[0, waterLevel - pos.y, state.motion === 'crawl' ? 1.1 : 0]}>
          <Spray time={state.motionTime} amount={v.spray} spread={state.motion === 'crawl' ? [0.55, 1.0] : [0.6, 0.6]} />
        </group>
      )}
      {name === 'zugbruecke' && <Drawbridge tilt={v.tilt} />}
      {name === 'nachbar' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={NEIGHBOR_COLOR} />
      )}
      {name === 'fliegerbombe' && <AerialBomb tilt={v.tilt} dirt={state.motion === 'buriedbomb'} />}
      {name === 'spaten' && <SpadeProp upright={state.motion === 'stand'} />}
      {name === 'schubkarre' && <Wheelbarrow spin={state.motion === 'push' ? (state.motionTime * state.speed) / 0.2 : 0} />}
      {name === 'warnstab' && <WarnStake time={state.motionTime} plant={state.motion === 'plant'} />}
      {name === 'smartphone' &&
        (state.motion === 'lie' ? (
          <group position={[Math.sin(zt * 63) * 0.006 * v.ring, 0.006, Math.cos(zt * 51) * 0.004 * v.ring]} rotation={[-Math.PI / 2, 0, Math.sin(zt * 47) * 0.12 * v.ring]} scale={1.6}>
            <Smartphone />
          </group>
        ) : (
          <SmartphoneProp time={state.motionTime} />
        ))}
      {name === 'petermaennchen' && (
        <group scale={WEEVER_SCALE}>
          <Weever pose={weeverPose(state.motion, state.motionTime)} />
        </group>
      )}
      {name === 'schuessel' && <Basin time={state.motionTime} steaming={state.motion === 'steam'} />}
      {name === 'thermometer' && <Thermometer time={state.motionTime} visible={state.motion === 'show'} />}
      {name === 'snake' && (
        <group scale={SNAKE_SCALE}>
          <Snake pose={snakePose(state.motion, state.motionTime, state.speed / SNAKE_SCALE)} />
        </group>
      )}
      {name === 'bear' && <Bear pose={bearPose(state.motion, state.motionTime, state.speed)} />}
      {name === 'car' && (
        <Car
          pose={carPose(state.motion, state.motionTime, state.speed)}
          windowOpen={v.window}
          door={v.door}
          water={v.water}
          pressure={v.pressure}
          window2={v.window2}
        />
      )}
      {name === 'splash' && state.motion === 'splash' && <Splash time={state.motionTime} size={1 + v.size} />}
      {name === 'magnet' && <Magnet />}
      {name === 'granate' && (
        <group rotation={[0, 0, deg(v.tilt)]}>
          <Grenade time={zt} rumble={v.rumble} />
        </group>
      )}
      {lines && <SpeedLines time={state.motionTime} height={ACTORS[name as ActorName]?.speedLineHeight ?? 1} />}
      {name === 'kumpel' && (
        <Dummy
          color={BUDDY_COLOR}
          brow={v.brow}
          gardenhat={v.gardenhat}
          partyhat={v.partyhat}
          teeth={v.teeth}
          splat={v.splat}
          heave={v.heave}
          breathPhase={state.breathPhase}
          zap={v.zap}
          zapTime={zt}
          pose={zapPose(dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev), v.zap, zt, 9)}
        />
      )}
      {name === 'bahnmitarbeiterin' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={STAFF_COLOR} uniform={STAFF_UNIFORM} />
      )}
      {name === 'bundespolizist' && (
        <>
          <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={POLICE_COLOR} uniform={POLICE_UNIFORM} brow={v.brow} />
          {state.motion === 'tapewalk' && (
            <group position={rightHandLocal(dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev))}>
              <TapeRoll />
            </group>
          )}
        </>
      )}
      {name === 'koffer' && <Suitcase handle={v.handle} tilt={v.tilt} />}
      {name === 'pistole' && <Pistol tilt={v.tilt} side={v.side} leaves={v.leaves} size={v.size} />}
      {name === 'kartenhandy' && (
        <group rotation={[deg(-v.tilt), 0, 0]}>
          <MapPhone pin={v.pin} size={v.size} />
        </group>
      )}
      {name === 'polizeiauto' && <PoliceCar pose={carPose(state.motion, state.motionTime, state.speed)} blue={v.blue} time={clock} />}
      {name === 'hund' && <Dog pose={dogPose(state.motion, state.motionTime, state.speed)} paint={v.paint} />}
      {name === 'polizist' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={POLICE2_COLOR} uniform={POLICE_UNIFORM} brow={v.brow} />
      )}
      {name === 'polizistin' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={POLICE3_COLOR} uniform={POLICE_UNIFORM_W} brow={v.brow} />
      )}
      {KIDS[name] && (
        <group scale={KID_SCALE}>
          <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={KIDS[name].color} kid={KIDS[name].kid} />
        </group>
      )}
      {name === 'spritze' && (
        <group scale={SYRINGE_SCALE * (1 + v.size)} rotation={[deg(v.tilt), 0, 0]}>
          <Syringe capon={v.capon} blink={v.blink * (0.65 + 0.35 * Math.sin(clock * 10))} />
        </group>
      )}
      {name === 'kappe' && (
        <group scale={SYRINGE_SCALE * (1 + v.size)} position={[0, 0.008 * SYRINGE_SCALE, 0]}>
          <NeedleCap />
        </group>
      )}
      {name === 'muell' && (
        <group scale={1 + v.size}>
          <LitterPile seed={3 + Math.round(v.mark * 7)} />
        </group>
      )}
      {name === 'nadel' && (
        <group scale={1 + v.size}>
          <HiddenNeedle blink={v.blink} time={clock} />
        </group>
      )}
      {name === 'ast' && (
        <group rotation={[0, 0, deg(v.tilt)]}>
          <Branch time={state.motionTime} plant={state.motion === 'plant'} />
        </group>
      )}
      {name === 'geldkoffer' && <MoneyCase tilt={v.tilt} lid={v.lid} money={state.values.money > 0 ? v.money : 1} />}
      {name === 'geldbuendel' && (
        <group scale={1 + v.size}>
          <MoneyBundle />
        </group>
      )}
      {name === 'formular' && <PaperForm fill={v.fill} pen={v.pen} size={v.size} />}
      {name === 'taschenrechner' && <Calculator text={actor.text ?? '30.010 €'} fill={v.fill} tilt={v.tilt} size={v.size} />}
      {name === 'kalenderblatt' && <CalendarSheet text={actor.text ?? '6 Monate'} time={state.motionTime} visible={state.motion === 'show'} size={v.size} />}
      {name === 'paragraf' && <ParagraphBadge text={actor.text ?? '§ 246'} time={state.motionTime} visible={state.motion === 'show'} size={v.size} />}
      {name === 'absperrband' && <CordonTape fill={v.fill} size={v.size} />}
      {name === 'rechnung' && <Bill size={v.size} />}
      {name === 'chef' && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={BOSS_COLOR} uniform={BOSS_SUIT} brow={v.brow} />
      )}
      {PASSENGERS[name] && (
        <Dummy pose={dummyPoseBlended(state.motion, state.motionTime, state.speed, state.prev)} color={PASSENGERS[name].color} uniform={PASSENGERS[name].uniform} brow={v.brow} />
      )}
      {name === 'wecker' && (
        <group scale={1 + v.size} rotation={state.motion === 'arc' ? [zt * 5.5, zt * 2.2, zt * 1.3] : [deg(-v.tilt), 0, 0]}>
          <AlarmClock ring={v.ring} broken={v.broken} time={zt} />
        </group>
      )}
      {name === 'digitaluhr' && (
        <group scale={1 + v.size}>
          <DigitalClock text={actor.text ?? '8:47'} blink={v.blink} time={zt} />
        </group>
      )}
      {name === 'abreisskalender' && (
        <group rotation={[deg(-v.tilt), 0, 0]}>
          <TearCalendar circle={v.circle} write={v.write} size={v.size} />
        </group>
      )}
      {name === 'monatskalender' && <MonthCalendar />}
      {name === 'zahnraeder' && state.motion === 'burst' && <GearBurst time={state.motionTime} hit2={v.mark > 0 ? v.mark : -1} floor={-(v.drop || 0.5)} />}
      {name === 'konfetti' && state.motion === 'burst' && <ConfettiBurst time={state.motionTime} count={90} power={1 + v.size} />}
      {name === 'giesskanne' && <WateringCan water={v.water} time={zt} />}
      {name === 'smartphone' && v.ring > 0.01 && (
        <group position={[0, 0.02, 0]}>
          <RingLines amount={v.ring} time={zt} r={0.07} y={0.0} />
        </group>
      )}
      {name === 'zitteraal' && <ZitterAal motion={state.motion} time={state.motionTime} zap={v.zap} zt={zt} />}
      {name === 'handtuch' && <WetTowel time={state.motionTime} bend={0.05} />}
      {name === 'sicherungskasten' && <FuseBox lever={v.lever} />}
      {name === 'besen' && (
        <group rotation={[deg(-v.lean), 0, 0]}>
          <Broom />
        </group>
      )}
    </group>
    </group>
    </>
  );
};

/** Zitteraal mit Blitzen (zap) */
const ZitterAal = ({motion, time, zap, zt}: {motion: string; time: number; zap: number; zt: number}) => {
  const pose = eelPose(motion as never, time);
  return (
    <>
      <Eel pose={pose} glow={0.4 + zap * (0.6 + 0.4 * Math.sin(zt * 31))} />
      <ZapAura anchors={eelAnchors(pose)} amount={zap} time={zt} seed={21} count={5} len={0.14} width={0.009} />
    </>
  );
};
