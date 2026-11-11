import type {FC} from 'react';
import type {Vec3} from '../data/types';

/** Kamera der aktuellen Einstellung (z. B. für Unterwasser-Ansicht) */
export type StageCam = {pos: Vec3; look: Vec3; fov: number};

export type StageDef = {
  id: string;
  /** Die 3D-Bühne (Licht, Boden, Bäume …) */
  Component: FC<{cam?: StageCam}>;
  /** Bäume, an denen Figuren mit der Bewegung "climb" hochklettern */
  climbTrees: {x: number; z: number; r: number}[];
  groundHeight: (x: number, z: number) => number;
  /** Hintergrundgeräusch (id aus sfx.config.json), läuft das ganze Video in Schleife */
  ambience?: string;
  /** Wasseroberfläche (y). Bewegungen "swim"/"struggle" beziehen ihr y dann auf das Wasser statt auf den Grund */
  waterLevel?: number;
  /** Dummy barfuß zeigen (z. B. am Strand) */
  barefoot?: boolean;
};
