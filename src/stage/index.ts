import {clearingStage} from './Clearing';
import {forestStage} from './Forest';
import {lakeStage} from './Lake';
import type {StageDef} from './types';

/** Alle Bühnen. Neue Bühne = neue Datei + hier eintragen. */
export const STAGES: Record<string, StageDef> = {
  wald: forestStage,
  waldlichtung: clearingStage,
  seeufer: lakeStage,
};
