import {beachStage} from './Beach';
import {canalStage} from './Canal';
import {stationFullStage, stationStage} from './Station';
import {castleStage} from './Castle';
import {christmasRoomStage, hallStage, outsideStage, plainHallStage} from './Christmas';
import {diningKitchenStage, kitchenStage} from './Kitchen';
import {outbackStage} from './Outback';
import {dentalStage} from './Dental';
import {bedroomStage, elevatorStage, trainStage} from './Bedroom';
import {clearingStage} from './Clearing';
import {forestStage} from './Forest';
import {autumnForestStage, streetStage} from './AutumnForest';
import {gardenStage} from './Garden';
import {parkStage} from './Park';
import {playgroundStage} from './Playground';
import {policeStationStage} from './PoliceStation';
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
  weihnachtszimmer: christmasRoomStage,
  flur: hallStage,
  hauseingang: outsideStage,
  kueche: kitchenStage,
  wohnkueche: diningKitchenStage,
  hausflur: plainHallStage,
  outback: outbackStage,
  zahnarztpraxis: dentalStage,
  schlafzimmer: bedroomStage,
  aufzug: elevatorStage,
  bahn: trainStage,
  kanal: canalStage,
  bahnhof: stationStage,
  'bahnhof-voll': stationFullStage,
  waldherbst: autumnForestStage,
  waldstrasse: streetStage,
  park: parkStage,
  polizeiwache: policeStationStage,
  spielplatz: playgroundStage,
};
