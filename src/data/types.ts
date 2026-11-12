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
  // ---- Dummy am Strand (Petermännchen) ----
  | 'wade' // Dummy: barfuß im flachen Wasser waten
  | 'stepflinch' // Dummy: auf etwas treten und zusammenzucken (Fuß hochreißen)
  | 'hop' // Dummy: auf einem Bein hüpfen (rechter Fuß angezogen)
  | 'holdfoot' // Dummy: sitzt und hält den rechten Fuß
  | 'ice' // Dummy: sitzt und hält Eis auf den Fuß
  | 'tweeze' // Dummy: sitzt und zieht mit der Pinzette Stachelreste aus dem Fuß
  | 'testtemp' // Dummy: sitzt, prüft mit dem linken Fuß die Wassertemperatur in der Schüssel
  | 'footbath' // Dummy: sitzt, rechter Fuß steht im heißen Wasser der Schüssel
  | 'struggle' // Dummy: aufrecht im tiefen Wasser, kommt kaum noch über Wasser
  // ---- Petermännchen (Figur "petermaennchen") ----
  | 'buried' // Fisch: im Sand eingegraben, nur die Augen schauen heraus
  | 'finup' // Fisch: Rückenflosse mit Stacheln aufstellen
  | 'swimaway' // Fisch: aus dem Sand heraus und davonschwimmen
  // ---- Dummy im Garten (Fliegerbombe) ----
  | 'dig' // Dummy: mit dem Spaten umgraben (läuft in Schleife)
  | 'hithard' // Dummy: Spaten stößt auf etwas Hartes (ca. 0,4 s), Rückprall, dann erstarren
  | 'stiff' // Dummy: erstarrt stehen, Spaten in der Hand, Blick nach unten
  | 'uncover' // Dummy: hinknien (ca. 1 s) und mit den Händen Erde wegschieben
  | 'lift' // Dummy: in die Hocke, greifen (0,8–1,2 s), Schweres hochheben (bis 2,2 s)
  | 'carry' // Dummy: hält etwas Schweres vor dem Bauch
  | 'lower' // Dummy: Schweres nach vorn ablegen (ca. 0,9 s), loslassen
  | 'push' // Dummy: Schubkarre schieben (Weg über Zeitpunkte, Karre 1,15 m vor dem Dummy)
  | 'retreat' // Dummy: ganz langsam und vorsichtig rückwärts weggehen (rechte Hand hält z. B. Warnstab)
  | 'mark' // Dummy: Warnstab vor sich in die Erde drücken (0,3–0,9 s), passt zu Warnstab "plant"
  | 'warn' // Dummy: mit rechts groß winken, links zeigt nach vorn (andere warnen)
  | 'call' // Dummy: stehend telefonieren (Smartphone am Ohr)
  // ---- Dummy am Burggraben (Kälteschock) ----
  | 'cross' // Dummy: vorsichtig über eine Brücke gehen (Arme leicht zur Seite)
  | 'slip' // Dummy: abrutschen und fallen (Arme rudern) – Weg/Fallhöhe über Zeitpunkte
  | 'gasp' // Dummy: aufrecht im tiefen Wasser, schnappt nach Luft (Brustkorb hebt sich schnell)
  | 'crawl' // Dummy: hektisch kraulen (Bauchlage, schnelle Armschläge, Kopf wirft hin und her)
  | 'tug' // Dummy: im Wasser an der Jacke zerren (versucht sie auszuziehen)
  | 'backfloat' // Dummy: auf dem Rücken treiben, Arme + Beine ausgestreckt, Kinn hoch (legt sich in ca. 1,2 s zurück)
  | 'backswim' // Dummy: ruhig in Rückenlage schwimmen (langsame Armzüge, Kopf voraus)
  | 'edgehold' // Dummy: aufrecht im Wasser, hält sich mit beiden Händen am Rand fest (stellt sich in ca. 1 s auf)
  | 'edgewave' // Dummy: hält sich links am Rand fest und winkt rechts um Hilfe
  // ---- Dummy: Erste Hilfe (Zombie-Biss) – Bissstelle am linken Unterarm ----
  | 'armflinch' // Dummy: in den Arm gebissen – Arm zurückreißen, dann Unterarm halten und hinschauen
  | 'armhold' // Dummy: steht, hält den linken Unterarm mit der rechten Hand, schaut zur Bissstelle
  | 'armlook' // Dummy: steht, hält den linken Unterarm vor sich und schaut auf die Bissstelle (rechte Hand locker)
  | 'applyplaster' // Dummy: Pflaster aufkleben (bis 0,85 s), glattstreichen, Arm sinken lassen (ab 1,5 s)
  | 'couchsit' // Dummy: auf Sofa/Stuhl sitzen (Sitzhöhe 0,45 m), Hände auf den Oberschenkeln
  | 'chairsit' // wie couchsit (für Stühle)
  | 'couchwait' // Dummy: zurückgelehnt sitzen und warten, Finger trommeln, Blick wechselt zwischen Uhr und Arm
  | 'showpass' // Dummy: sitzt und hält den Impfpass nach vorn
  | 'chairnod' // sitzt, nickt und erklärt mit der rechten Hand (z. B. Arzt)
  | 'rinse' // Dummy: vorgebeugt am Waschbecken, Unterarm unter fließendem Wasser
  | 'disinfect' // Dummy: Desinfektionsspray auf die Bissstelle sprühen (3 Stöße ab 0,5 s)
  | 'compress' // Dummy: Kompresse auflegen (bis 0,9 s) und mit Mullbinde umwickeln (bis 2,4 s)
  // ---- Dummy: Feuer (Weihnachtsbaum-Brand) ----
  | 'recoil' // Dummy: entsetzt zurückweichen (Zusammenzucken, Arme abwehrend vor dem Körper, Schritte rückwärts – Weg über Zeitpunkte)
  | 'runbucket' // Dummy: mit einem Eimer Wasser in beiden Händen rennen (Weg über Zeitpunkte)
  | 'pullgift' // Dummy: kniet und zieht Geschenke hervor (greifen 0–0,6 s, ziehen bis 1,3 s, zur Seite legen bis 1,8 s, wiederholt sich)
  | 'closedoor' // Dummy: Tür zuziehen (Griff greifen 0–0,4 s, ziehen bis 1,2 s, loslassen)
  | 'callwave' // Dummy: stehend telefonieren (Handy rechts am Ohr) und mit links groß winken
  // ---- Dummy: Strom (Zitteraal) ----
  | 'stuck' // Dummy/Kumpel: hängt mit der rechten Hand fest (Arm gestreckt nach vorn, ca. 1,15 m hoch), linker Arm zappelt
  | 'grabarms' // Dummy: greift von hinten nach den Oberarmen der Person vor ihm (0–0,45 s) und zieht
  | 'towelswing' // Dummy: mit nassem Handtuch ausholen (0–0,45 s) und nach vorn schlagen (Treffer bei ca. 0,7 s)
  | 'switchoff' // Dummy: Schalter vorn oben umlegen (greifen 0–0,45 s, runterdrücken bis 0,7 s, loslassen ab 1,0 s)
  | 'broompush' // Dummy: Besen mit trockenem Holzstiel waagrecht halten und nach vorn schieben
  | 'kneelcall' // Dummy: hinknien (0,7 s), telefonieren, linke Hand vorn unten (z. B. auf der Schulter)
  // ---- Zitteraal (Figur "zitteraal") ----
  | 'peek' // Aal: aus der Steckdose herausgucken, sich umschauen, blinzeln
  | 'wiggle' // Aal: zappeln (passt zu "zap")
  | 'withdraw' // Aal: beleidigt zurückziehen (Kopf weg, Augen halb zu, Schmollmund, dann in die Steckdose)
  // ---- Zombie (Figur "zombie") ----
  | 'shamble' // Zombie: schlurfen, Arme ausgestreckt (Weg über Zeitpunkte, ca. 0,4–0,6 m/s)
  | 'reach' // Zombie: stehen, Arme ausgestreckt, schwankt
  | 'chomp' // Zombie: zubeißen – vorbeugen, Kopf schnappt bei ca. 0,45 s zu, zurück
  | 'confused' // Zombie: verwirrt (kratzt sich am Kopf, Fragezeichen) – mit Weg = verwirrt davonschlurfen
  // ---- Objekte ----
  | 'flow' // Waschbecken ("waschbecken"): Wasser läuft
  | 'flip' // Kalender ("kalender"): Blätter reißen ab und fliegen weg (immer schneller)
  | 'spin' // Wanduhr ("wanduhr"): Zeiger rasen (Zeitraffer)
  | 'open' // Impfpass ("impfpass"): aufgeklappt
  | 'plant' // Warnstab ("warnstab"): wird in die Erde gedrückt (gleichzeitig mit Dummy "mark")
  | 'buriedbomb' // Fliegerbombe: Erdkrümel liegen drauf (halb in der Erde)
  | 'steam' // Schüssel ("schuessel"): heißes Wasser dampft
  | 'show' // Thermometer-Schild ("thermometer"): erscheint
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
  /** Dummy: kleiner roter Punkt am rechten Fuß (Stich, kein Blut) – gilt ab diesem Zeitpunkt weiter */
  sting?: boolean;
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
  /** Dummy: Schmerz-Symbol am rechten Fuß. 0 = aus, 1 = normal, bis 2 = breitet sich übers Bein aus */
  pain?: number;
  /** Dummy: Winterjacke 1 = an, 0 = aus (dazwischen: Ärmel rutschen nach und nach herunter) */
  jacket?: number;
  /** Dummy: lange Hose 1 = an, 0 = aus */
  pants?: number;
  /** Dummy: Atemwolken, Atemzüge pro Sekunde (0 = keine). Ändert sich weich (z. B. 1.6 → 0.35 = Atmung beruhigt sich) */
  breath?: number;
  /** Dummy: Kälte-Symbol (Schneeflocke über dem Kopf). 0 = aus, 1 = normal, bis 2 = stark */
  cold?: number;
  /** Dummy: Wasser spritzt um ihn herum (z. B. hektisches Kraulen). 0 = aus … 1 = stark */
  spray?: number;
  /** Dummy: Bissstelle am linken Unterarm (kleiner roter Punkt), 0 = aus, 1 = an */
  armbite?: number;
  /** Dummy: Rötung um die Bissstelle (roter Schimmer), 0 = keine … 1 = rot … 2 = groß, ganzer Unterarm schimmert */
  redness?: number;
  /** Dummy: Pflaster auf der Bissstelle, 0 = keins … 1 = aufgeklebt */
  plaster?: number;
  /** Dummy: sterile Kompresse + Mullbinde, 0 = keine … 1 = fertig verbunden */
  dressing?: number;
  /** Weihnachtsbaum: Feuer 0 = aus … 1 = Flammen bis zur Decke … 1.6 = riesig, breit unter der Decke */
  fire?: number;
  /** Weihnachtsbaum: Rauch unter der Decke 0 = keiner … 1 = dicke Schicht … 1.5 = sehr dicht, tief. Türen: Rauch + Glut dahinter */
  smoke?: number;
  /** Unter Strom: Figur zittert + Blitze (Dummy, Kumpel, Nachbar, Arzt, Zitteraal). 0 = aus … 1 = stark */
  zap?: number;
  /** Sicherungskasten: Hauptschalter 1 = an (oben) … 0 = aus (unten) */
  lever?: number;
  /** Besen: Neigung in Grad (an die Wand gelehnt) */
  lean?: number;
};

/** Zahlenwerte einer Figur, die von Zeitpunkt zu Zeitpunkt weich übergehen */
export const ACTOR_VALUES = ['tilt', 'window', 'door', 'water', 'pressure', 'pain', 'jacket', 'pants', 'breath', 'cold', 'spray', 'armbite', 'redness', 'plaster', 'dressing', 'fire', 'smoke', 'zap', 'lever', 'lean'] as const;
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
  /**
   * Bild einfrieren ab t (0…1): Figuren + Bühne bleiben stehen, nur die Kamera fährt langsam weiter.
   * Bei falschen Optionen kommt das rote Aufleuchten (+ Falsch-Ton) genau in diesem Moment statt am Anfang.
   */
  freeze?: number;
  /**
   * Stoppuhr einblenden: [t Beginn, t Ende, Sekunden]. Läuft zwischen Beginn und Ende von 0:00 bis zur
   * angegebenen Zeit (Zeitraffer), wird dann grün und blendet sich kurz danach aus.
   */
  timer?: [number, number, number];
  /**
   * Andere Bühne für diesen Abschnitt (sonst die Bühne des Szenarios). Entweder ein Name ("badezimmer")
   * oder eine Liste mit Schnitten [{t: 0, stage: "badezimmer"}, {t: 0.62, stage: "arztpraxis"}].
   */
  stage?: string | {t: number; stage: string}[];
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
