import {beachStage} from './Beach';
import {castleStage} from './Castle';
import {clearingStage} from './Clearing';
import {forestStage} from './Forest';
import {gardenStage} from './Garden';
import {graveyardStage} from './Graveyard';
import {lakeStage} from './Lake';
import {bathroomStage, livingRoomStage, praxisStage} from './Rooms';
import type {StageDef} from './types';

/** Alle Bühnen. Neue Bühne = neue Datei + hier eintragen. */
export const STAGES: Record<string, StageDef> = {
  wald: forestStage,
  waldlichtung: clearingStage,
  seeufer: lakeStage,
  meeresstrand: beachStage,
  garten: gardenStage,
  burg: castleStage,
  friedhof: graveyardStage,
  badezimmer: bathroomStage,
  wohnzimmer: livingRoomStage,
  arztpraxis: praxisStage,
};
