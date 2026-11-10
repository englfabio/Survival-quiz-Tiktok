import type {Scenario} from './types';

// Alle JSON-Dateien aus /scenarios werden automatisch eingelesen.
// Neues Video = neue Datei dort. Kein Code nötig.
declare const require: {
  context: (dir: string, sub: boolean, re: RegExp) => {
    keys: () => string[];
    (key: string): Scenario;
  };
};

const ctx = require.context('../../scenarios', false, /\.json$/);

export const scenarios: {file: string; scenario: Scenario}[] = ctx
  .keys()
  .filter((k) => k.startsWith('./'))
  .map((k) => ({file: k.replace('./', ''), scenario: ctx(k)}));
