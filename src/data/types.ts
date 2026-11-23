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
  // ---- Dummy: Zahnunfall (Känguru) ----
  | 'boxguard' // Dummy: Boxhaltung (Fäuste vor dem Gesicht, leichtes Wippen)
  | 'hitstagger' // Dummy: getroffen – Kopf fliegt zurück (0–0,25 s), taumelt rückwärts (Weg über Zeitpunkte), ab ca. 1,4 s benommen (= dazed)
  | 'dazed' // Dummy: benommen stehen, schwankt, linke Hand am Mund
  | 'searchkneel' // Dummy: hinknien (0,7 s) und mit den Händen im Gras suchen (Kopf schaut hin und her)
  | 'pickcrown' // Dummy: kniet, greift den Zahn vorsichtig an der Krone (bis 0,9 s), hebt ihn vor die Augen (bis 1,7 s)
  | 'holdtooth' // Dummy: steht, hält den Zahn mit spitzen Fingern vor sich und schaut ihn an
  | 'rinsetooth' // Dummy: steht vorgebeugt, hält den Zahn mit beiden Händen unter den Wasserhahn (reibt)
  | 'wraptooth' // Dummy: legt den Zahn ins Taschentuch (linke Hand) und wickelt ihn ein (bis ca. 1,6 s)
  | 'placetooth' // Dummy: legt den Zahn vorn unten ab (Hand runter bis 0,7 s, loslassen bei 0,8 s, zurück bis 1,3 s)
  | 'dentalsit' // Dummy: halb liegend im Behandlungsstuhl, Hände auf dem Bauch
  // ---- Dummy: Spülmaschinentab (Vergiftung) ----
  | 'tabstare' // Dummy: erschrocken auf den angebissenen Tab in der rechten Hand starren (zuckt 0–0,3 s zurück, zittert leicht)
  | 'fingermouth' // Dummy: Finger bis kurz vor den Mund führen (bis 1,0 s) und zögern – nur angedeutet
  | 'drinkmilk' // Dummy: Glas Milch zum Mund (bis 0,8 s), kippen + trinken (Glas leert sich bis ca. 3,2 s)
  | 'spit' // Dummy: vorbeugen, Küchenpapier vor den Mund (bis 0,6 s), ausspucken bei 0,9 / 1,6 / 2,3 s
  | 'stowtabs' // Dummy: Tab-Packung in den Oberschrank heben (Hand dort 0,9 s, loslassen 1,0 s), Tür zudrücken (1,2–1,7 s)
  // ---- Dummy: Panikattacke (Wal im Zimmer) ----
  | 'wallpress' // Dummy: mit dem Rücken an die Wand gedrückt, Handflächen flach an der Wand, Blick zum Wal (Atmen über "heave"/"breath")
  | 'clench' // Dummy: verkrampft sich – ballt die Fäuste vor der Brust (bis 0,6 s), zittert vor Anspannung, Kopf eingezogen
  | 'bedsitdown' // Dummy: hinsetzen auf Bett/Stuhl (Sitzhöhe 0,45 m, ca. 1,2 s), danach wie sitbreathe
  | 'sitbreathe' // Dummy: sitzt aufrecht, Hände auf dem Bauch, atmet ruhig: 2 s ein (Bauch hebt sich), 4 s aus (Zyklus 6 s ab Bewegungsbeginn). Werte "pack" (Coolpack in den Nacken) und "sip" (Wasser trinken) mischen sich darüber
  | 'uneasy' // Dummy: steht angespannt (Arme eng am Körper, Blick wandert nach oben/zur Seite) – z. B. im Aufzug
  | 'holdstrap' // Dummy: steht und hält sich mit rechts an einem Haltegriff über dem Kopf fest (volle Bahn)
  // ---- Dummy: Magnetfischen (Granate) ----
  | 'magthrow' // Dummy: Magnet an der Leine werfen (ausholen 0–0,55 s, loslassen ca. 0,7 s), danach Seil vorn halten
  | 'haul' // Dummy: Seil Hand über Hand hochziehen (Takt 1 s), Blick ins Wasser
  | 'startle' // Dummy: erschrocken erstarren – zuckt zurück, hält das Seil mit Magnet + Granate weit vor sich, linke Hand abwehrend
  | 'lowerset' // Dummy: ganz langsam in die Hocke, das Hängende vorsichtig auf den Boden setzen (bis 1,8 s)
  | 'unhook' // Dummy: in der Hocke Granate festhalten und Magnet abziehen (0,4–1,2 s), aufstehen bis 2,2 s
  | 'holdgren' // Dummy: hält die Granate mit rechts vor der Brust und starrt darauf
  | 'windup' // Dummy: holt mit der Granate weit aus zum Werfen (0,3–1,3 s)
  | 'placeseat' // Dummy: beugt sich durchs offene Beifahrerfenster, legt etwas auf den Sitz (Hand vorn bei 1,2 s), zurück bis 2,4 s
  // ---- Dummy & Co.: Bahnhof (herrenloser Koffer) ----
  | 'lookaround' // Dummy: schaut sich um (links, rechts), bemerkt bei 2,2 s etwas vor sich am Boden
  | 'bendopen' // Dummy: beugt sich vor und fummelt an den Schnallen eines Koffers 0,55 m vor ihm
  | 'grabcase' // Dummy: greift den Koffergriff (Hand bei 0,5 s), zieht den Teleskopgriff hoch (0,6–1,2 s)
  | 'rollcase' // Dummy: geht und zieht einen Rollkoffer hinter sich her (Koffer attach dummy x −0.2, z −1.04, tilt 40, handle 1)
  | 'pointtalk' // Dummy: zeigt mit rechts nach vorn, dreht den Kopf zwischendurch zur Seite (erklärt jemandem etwas)
  | 'sheepish' // Figur: verlegen am Hinterkopf kratzen, Kopf gesenkt, rechte Hand ab 0,8 s nach vorn (nimmt etwas entgegen)
  | 'handover' // Figur: reicht mit der rechten Hand etwas nach vorn (bis 0,6 s)
  | 'tapewalk' // Figur: geht und rollt mit rechts Absperrband ab (Rolle seitlich vor sich)
  | 'listen' // Figur: steht, hört zu, nickt leicht, Hände vor dem Bauch
  // ---- Fundstück im Wald (Pistole) ----
  | 'spotpoint' // Dummy: erschrocken stehen bleiben, mit rechts auf den Boden ca. 1 m vor sich zeigen
  | 'pickup' // Dummy: hinknien, Gegenstand ca. 0,52 m vor sich aufheben (Griff 0,9 s), aufstehen, vor sich halten (bis 2 s)
  | 'pocket' // Dummy: Gegenstand in die rechte Jackentasche stecken (Hand dort bei 0,7 s)
  | 'fiddle' // Dummy: hält etwas mit beiden Händen vor dem Bauch und fummelt daran herum
  | 'stepback' // Dummy: einen Schritt zurücktreten (Weg über Zeitpunkte), Hände vorsichtig gehoben
  | 'markphone' // Dummy: Handy vor der Brust, tippt mit links (Standort markieren)
  | 'stophand' // Figur: hebt die linke Hand nach vorn – "Stopp!"
  // ---- Geldkoffer (Fundstücke) ----
  | 'opencase' // Dummy: kniet, kippt den Koffer 0,55 m vor sich um (0,6–1,0 s), klappt ihn auf (1,0–1,55 s), erstarrt ab 1,65 s
  | 'kneellook' // Dummy: kniet aufrecht, schaut sich nach links und rechts um
  | 'closecase' // Dummy: kniet, drückt den Deckel zu (0–0,6 s)
  | 'tuckcase' // Dummy: greift den liegenden Koffer, steht auf, klemmt ihn unter den linken Arm (bis 1,3 s)
  | 'sneak' // Dummy: schleicht geduckt auf Zehenspitzen (Weg über Zeitpunkte), Koffer unterm linken Arm, schaut sich um
  | 'grabwads' // Dummy: kniet am offenen Koffer, nimmt alle 1,5 s ein Bündel und steckt es in die Jacke (ab 0,3 s)
  | 'carrycase' // Dummy: geht, Koffer hängt in der rechten Hand (Koffer: hand 1, drop 0.37)
  | 'holdcase' // Dummy: steht, Koffer hängt in der rechten Hand
  | 'setcounter' // Dummy: hebt den Koffer am Griff auf den Tresen (Hand 1,45 m hoch, 0,48 m vor ihm bei 0,7 s, loslassen 0,75 s)
  | 'fillform' // Dummy: steht am Tresen, schreibt mit dem Kugelschreiber auf ein Formular 0,5 m vor ihm (Tresen 1,05 m)
  | 'cheer' // Dummy: jubelt – Fäuste hoch, kleine Hüpfer
  // ---- Bahnsteigkante (Sog) ----
  | 'pant' // Dummy: außer Atem, vorgebeugt, Hände auf den Knien
  | 'perkup' // Dummy: hört die Durchsage – richtet sich auf, Kopf nach links oben, Hand hinters Ohr
  | 'hurryback' // Dummy: zügig rückwärts gehen (Weg über Zeitpunkte), Blick zum Gleis/nach links
  | 'brace' // Dummy: steht ruhig und sicher, Kopf folgt dem vorbeifahrenden Zug (links → rechts)
  | 'edgelean' // Dummy: steht an der Kante, neigt sich leicht nach vorn, Blick nach links das Gleis entlang
  | 'filmphone' // Dummy: hält ein Handy quer mit beiden Händen vors Gesicht und filmt (mit Weg = Schlurf-Schritte)
  | 'pass' // Zug ("zug"): fährt (Weg über Zeitpunkte), Bewegungsunschärfe + Windlinien je nach Tempo
  // ---- Spritze auf dem Spielplatz (Fundstücke) ----
  | 'notice' // Dummy: bleibt stehen, entdeckt etwas im Sand ca. 0,6–1 m vor sich (kurzes Zusammenzucken, Blick nach unten, Hände vorsichtig gehoben)
  | 'pinchpick' // Dummy: geht in die Hocke, greift etwas 0,55 m vor sich mit spitzen Fingern (Griff bei 0,9 s), steht auf, hält es weit vor sich (bis 2 s)
  | 'pinchcarry' // Dummy: geht und hält etwas mit spitzen Fingern weit vor sich (Spritze in der rechten Hand)
  | 'recap' // Dummy: Spritze rechts, Kappe links vor der Brust; schiebt die Nadel Richtung Kappe (bis 1,4 s), ab 1,5 s rutscht sie ab Richtung linke Finger
  | 'shoo' // Dummy: breitet freundlich die Arme aus und schickt Kinder weg (Hände winken sanft)
  | 'photo' // Dummy: hält das Handy mit beiden Händen vor sich und fotografiert (Blitz bei 1,0 s)
  | 'swingsit' // Kind: sitzt auf der Schaukel, hält die Ketten, baumelt fröhlich mit den Beinen
  | 'sandplay' // Kind: kniet im Sand und buddelt fröhlich (Schaufelbewegungen)
  // ---- Spezial "Nachbars Rasen" ----
  | 'envy' // Dummy: am niedrigen Zaun stehen, Hände auf der Latte, neidisch hinüberschauen (Zehenspitzen, Seufzer)
  | 'tiptoe' // Dummy: übertrieben auf Zehenspitzen schleichen (Weg über Zeitpunkte)
  | 'spraylawn' // Dummy: vorgebeugt mit der Sprühdose grüne Farbe auf den Rasen sprühen
  | 'climbover' // Dummy: über einen niedrigen Zaun steigen (2,2 s, Weg über Zeitpunkte)
  | 'mowsneak' // Dummy: geduckt schleichen und einen Rasenmäher schieben (Weg über Zeitpunkte)
  | 'ringbell' // Dummy: Aktenkoffer rechts, mit links klingeln (0,5 s), dann stolz warten
  | 'postletter' // Dummy: Brief in den Briefkasten-Schlitz 0,5 m vor ihm schieben (drin bei 0,75 s)
  | 'armscross' // Dummy: triumphierend Arme verschränken, Brust raus, Kinn hoch
  | 'snip' // Nachbar: kniet und schneidet mit der Nagelschere Halm für Halm
  | 'waterplants' // Nachbar: steht und gießt (Gießkanne rechts vor sich), linke Hand in der Hüfte
  | 'holdboard' // Nachbar: hält ein Klemmbrett mit beiden Händen vor sich
  // ---- WG-Küche (Spezial: Mitbewohner-Joghurt) – Dummy + Kumpel ----
  | 'fridgeopen' // Kühlschrank öffnen (linke Hand, Tür 0,4–1,2 s), hineinbeugen, leeren Becher herausnehmen (2,0 s) und hineinschauen
  | 'aghast' // entsetzt erstarren: zurückzucken, leerer Becher links hoch, rechte Hand an den Kopf, zittern
  | 'pressbutton' // großen roten Knopf 0,5 m vor ihm drücken (Faust hoch bis 0,6 s, Treffer 0,72 s)
  | 'writenote' // am Tisch vorgebeugt mit dickem Stift einen Zettel beschriften
  | 'sticknote' // Zettel auf den Becher 0,4 m vor ihm kleben (0,5 s) und glattstreichen
  | 'typedesk' // sitzend am Laptop tippen
  | 'slideletter' // kniend Briefe über den Boden nach vorn schieben (alle 1,3 s)
  | 'stamp' // Stempel kräftig auf den Tisch 0,42 m vor ihm drücken (Treffer 0,58 s)
  | 'shelve' // Ordner ins Regal stellen (oben 0,8 s, hinein bis 1,3 s), dann Hände in die Hüften
  | 'spoon' // verstohlen Joghurt löffeln (Becher links, Löffel rechts, Blick hin und her)
  | 'readnote' // Becher mit Zettel vor dem Gesicht lesen, bei 1,2 s erschrocken zurückzucken
  | 'putback' // Becher ganz langsam vor sich abstellen (bis 2,2 s)
  | 'openletters' // Briefe öffnen (alle 1,8 s ein neuer), wird immer entsetzter
  | 'countcoins' // sitzend Münzen einzeln vom Häufchen nach rechts legen (alle 0,8 s)
  | 'wipebrow' // Joghurt von der Stirn wischen, vom Finger probieren, Daumen hoch
  // ---- Spezial: Paket beim Nachbarn (Treppenhaus) – Dummy, Paket-Nachbar, Paketbote (Details: paketPose in Dummy.tsx) ----
  | 'ringwait'
  | 'pitchtent'
  | 'tentsit'
  | 'tentcook'
  | 'tentslump'
  | 'sawflap'
  | 'flapgrab'
  | 'letterfreeze'
  | 'showletter'
  | 'doorpeek'
  | 'flappeek'
  | 'parcelletter'
  | 'holdparcel'
  | 'carrystack'
  | 'stairsup'
  | 'stepover'
  | 'botering'
  | 'setparcel'
  // ---- Spezial Bahn-Verspätung (Figuren mit Dummy-Körper) ----
  | 'watchtap' // genervt: Blick zur Anzeigetafel, auf die Armbanduhr tippen
  | 'watchlook' // auf die Armbanduhr schauen + Kopf schütteln (Chef)
  | 'capon' // mit beiden Händen eine Mütze aufsetzen (Wert lokcap)
  | 'seatcapon' // dasselbe sitzend
  | 'lokhorn' // sitzt in der Lok, zieht die Hupen-Schnur
  | 'wheeltap' // sitzt, tippt ungeduldig aufs Lenkrad
  | 'seatwave' // sitzt gemütlich (Bagger) und winkt
  | 'pullpants' // Hose hochziehen (Wert jogger)
  | 'laptopopen' // sitzend den Laptop aufklappen
  | 'drinkcoffee' // sitzend Kaffee trinken
  | 'deskwave' // sitzend in die Videokonferenz winken
  // ---- Spezial Monstertruck (Figuren mit Dummy-Körper, Details: truckPose in Dummy.tsx) ----
  | 'carshock' // fassungslos vor dem platten Auto (Hände auf dem Kopf)
  | 'truckclimb' // an einem riesigen Monstertruck hochklettern (Höhe über y)
  | 'seattriumph' // triumphierend am Steuer, Faust pumpt
  | 'seatdrive' // am Steuer sitzen und lenken
  | 'hangframe' // etwas Großes über dem Kopf an die Wand hängen
  | 'proud' // stolz, Hände in den Hüften
  | 'handshake' // Hände schütteln
  | 'callpoint' // telefonieren + mit links nach vorn zeigen
  | 'wineadmire' // Museumsbesucher: Weinglas, Hand am Kinn
  | 'winegasp' // Museumsbesucher: staunen
  | 'winetoast' // Museumsbesucher: Glas heben + trinken
  | 'carrywalk' // Dummy: Schweres vor dem Bauch tragen und dabei gehen (Weg über Zeitpunkte)
  // ---- Spezial Spüle (Details: spuelePose in Dummy.tsx, Dummy 0,55 m vor der Spülenmitte, Blick zur Spüle) ----
  | 'sinkreach' // in die Spüle greifen (0–0,9 s), bei 1,15 s erstarren + zittern, ab 2,6 s Hand langsam herausheben
  | 'pinchEat' // ein Bissen mit spitzen Fingern: greifen (0,75 s), betrachten (1,35 s), essen (1,8 s); Art = Wert mark 0/1/2
  | 'chew' // ernst kauen, linke Hand in der Hüfte
  | 'roundhouse' // Zeitlupe: Drehung (0,6–2,4 s) + hoher Roundhouse-Kick mit rechts zur rechten Seite (gestreckt ca. 3,1–3,7 s), Deckung ab 5,1 s
  | 'spitarc' // zurücklehnen (0,5 s), in hohem Bogen nach vorn ausspucken (0,5–0,75 s), Mund abwischen (ab 1,2 s)
  | 'hazwash' // im Schutzanzug vorsichtig abspülen: Teller links, Schwamm rechts in langsamen Kreisen
  // ---- Spezial Haus weg (Details: hausPose in Dummy.tsx) ----
  | 'homefreeze' // nach Hause kommen + erstarren: Ruck, Arme halb gespreizt, steif; ab 1,2 s Kopf sucht links/rechts
  | 'liftmat' // Fußmatte 0,45 m vor ihm hochheben: Hocke (0,7 s), greifen, aufrichten + Matte vor die Brust (1,8 s), ratlos schauen
  | 'stacklow' // großen Baustein 0,55 m vor sich auf 0,6 m Höhe aufsetzen (bücken), Zyklus 0,65 s, Aufsetzen bei 62 % des Zyklus
  | 'stackbrick' // wie stacklow, Höhe 1,0 m, Zyklus 0,9 s
  | 'stackhigh' // wie stacklow, Höhe 2,05 m (über Kopf)
  | 'stackfast' // Zeitraffer: Steine im Zyklus 0,42 s aufsetzen, Höhe wechselt
  | 'shedopen' // Gartenhaus-Tür mit links öffnen (Griff 0,45 m vor ihm, 0,27 m links, 0,9 m hoch; 0,5–1,2 s), dann loslassen
  | 'peekin' // durch eine Tür hineinschauen: Hände am Rahmen, vorbeugen
  | 'gape' // staunen mit offenem Mund, Hände an den Wangen (Nachbarn)
  | 'relief' // erleichtert: Hände auf die Brust, tief ausatmen
  // ---- Spezial Waschmaschine (Details: waschPose in Dummy.tsx) ----
  | 'drumpeek' // sitzt in der Trommel, Hände am Bullauge, schaut hin und her
  | 'glassknock' // kniet, klopft mit rechts ans Glas, links Hand am Mund (ruft)
  | 'takehand' // kniet, rechte Hand nach vorn-oben ausgestreckt
  | 'drumexit' // wird herausgezogen: Knien → Hocke → Stehen, rechte Hand vorn (Weg über Zeitpunkte)
  | 'sockstomp' // stapft mit hohen Knien durch Sockenberge (Weg über Zeitpunkte)
  | 'sockraise' // hält mit rechts etwas triumphierend über den Kopf, wippt
  | 'drumlounge' // sitzt, Beine ausgestreckt, lehnt sich zurück, Hände hinter dem Kopf
  | 'wmopen' // Waschmaschinen-Tür mit links aufziehen (Griff 0,5 m vor ihm, 0,27 m links, 1,25 m)
  | 'helphand' // beugt sich in die Öffnung, rechte Hand helfend hineingestreckt
  | 'pullback' // zieht mit der rechten Hand zurück, lehnt sich nach hinten
  // ---- Spezial Pirat-Token (Details: gamePose in Dummy.tsx), alle sitzend auf dem Gaming-Stuhl ----
  | 'keyhammer' // hämmert hektisch mit beiden Händen auf die Tastatur (0,43 m vor ihm)
  | 'screenstare' // vorgebeugt, starrt wie gebannt auf den Bildschirm
  | 'fansteam' // lehnt sich zurück, wedelt mit rechts den Dampf aus dem Gesicht
  | 'pushaside' // schiebt den Laptop mit beiden Händen 0,4 m nach links (0,2–0,9 s)
  | 'grablaptop' // beugt sich nach rechts unten, holt einen Laptop vom Stapel und setzt ihn vor sich (abgesetzt 2,0 s)
  | 'lidopen' // klappt den Deckel mit beiden Händen auf (0,15–0,85 s)
  | 'closelean' // klappt den Deckel langsam zu (0,2–1,5 s), lehnt sich zurück, Hände hinter den Kopf (1,7–2,9 s)
  | 'seatcheer' // reißt sitzend triumphierend beide Arme hoch, wippt
  // ---- Spezial Tauben ----
  | 'callwait' // Dummy: genervt telefonieren in der Warteschleife (Hand in der Hüfte, Fuß tippt)
  | 'callnod' // Dummy: telefonieren + nicken
  | 'seattalk' // Dummy: sitzend am Tisch verhandeln (gestikulieren)
  | 'seatstamp' // Dummy: sitzend stempeln (Treffer 0,58 s)
  | 'seatshake' // Dummy: sitzend Hand über den Tisch reichen + schütteln
  // ---- Spezial Taube angekackt (Details: kleckerPose in Dummy.tsx) ----
  | 'splatshock' // Dummy: zuckt zusammen, schaut auf den Klecks auf der linken Schulter, zeigt mit spitzem Finger darauf
  | 'wingpose' // Dummy: Arme seitlich ausbreiten, stolz (Flügel über Wert wings)
  | 'flyhover' // Dummy: fliegt/schwebt mit Flügeln (Höhe = y), Körper vorgeneigt, Arme ausgebreitet
  | 'padwrite' // Dummy: Schreibblock links, schreibt mit rechts die Reinigungsrechnung (Zeilen 0,3–2,5 s)
  | 'pullplug' // Dummy: packt den Riesen-Stecker 0,52 m vor sich (1,0 m hoch), reißt ihn 0,7–1,05 s 0,4 m heraus, schaut ab 1,3 s nach oben
  | 'fall' // Klecks: fällt (Weg über Zeitpunkte)
  // ---- Spezial Goldfisch (Details: fishPose in Dummy.tsx, goldfishPose in FishProps.tsx) ----
  | 'scatter' // Dummy: geht (Weg über Zeitpunkte) und streut mit rechts Fischfutter aus der Dose in der linken Hand (alle 0,8 s)
  | 'gloveon' // Dummy: zieht sich Boxhandschuhe an (Wert gloves 0 → 1 bei 0,6–1,4 s), klopft sie zusammen (1,7 s)
  | 'boxbounce' // Dummy: Boxhaltung + tänzelt von einem Fuß auf den anderen, kleine Finten
  | 'seatfloor' // Dummy: sitzt (z. B. im Bagger), vorgebeugt, drückt verzweifelt beide Hebel nach vorn + wippt
  | 'fishswim' // Goldfisch: schwimmt ruhig im Glas, Flossen wedeln, blinzelt
  | 'steer' // Goldfisch: lenkt sehr konzentriert mit beiden Brustflossen am Lenkrad (Lenkwinkel = Wert turn, wie beim Auto)
  | 'fishblink' // Goldfisch: lenkt mit rechts, linke Flosse drückt den Blinkerhebel hoch (0,25–0,6 s)
  | 'fisheat' // Goldfisch: schwimmt an die Oberfläche und schnappt Flocken (Wert fill = Flocken im Glas)
  | 'fishguard' // Goldfisch: Boxhaltung mit Mini-Handschuhen (Wert gloves), wippt
  | 'fishpunch' // Goldfisch: boxt mit den Mini-Handschuhen in die Luft (alle 0,5 s abwechselnd)
  | 'fishhappy' // Goldfisch: zufrieden, wackelt, große Augen, kleines Lächeln
  | 'fishback' // Goldfisch: dreht sich im Glas um und schaut nach hinten (Rückwärts-Einparken), eine Flosse am Lenkrad
  // ---- Spezial Schwarzes Loch in der Küche (Details: blackHolePose in Dummy.tsx) ----
  | 'notebreath' // Dummy: hält den Notizblock mit rechts vor der Brust (0,32 m vor ihm, 1,15 m hoch) und atmet tief durch (Brust hebt sich, Zyklus 1,6 s)
  | 'bhleap' // Dummy: Kopfsprung – geht in die Hocke (0–0,35 s), reißt die Arme nach oben, ab 0,5 s gestreckt waagerecht (Weg/Höhe über Zeitpunkte)
  | 'floatrelax' // Dummy: schwebt entspannt auf dem Rücken, Hände hinter dem Kopf, Beine übereinander, wippt (Höhe = y)
  | 'heavelift' // Dummy: greift den Abwasch-Berg 0,45 m vor sich auf 0,95 m (bis 0,5 s), stemmt ihn über den Kopf (0,5–1,2 s), balanciert
  | 'heavethrow' // Dummy: wirft das Gewicht von über dem Kopf nach vorn oben (Ausholen 0–0,3 s, Abwurf 0,45 s), danach Arme vorn
  | 'thumbsup' // Dummy: rechter Daumen hoch vor der Brust, links in der Hüfte, nickt zufrieden
  | 'tapphone' // Dummy (sitzend): tippt gedankenlos mit dem Zeigefinger aufs Handy (Tipp 0,4 s)
  | 'leanback' // Dummy (sitzend): lehnt sich zurück, Hände hinter dem Kopf
  | 'wildtap' // Dummy (sitzend): tippt mit beiden Zeigefingern wild aufs Handy
  | 'reachafter' // Dummy (sitzend): dreht sich nach links vorn und streckt den Arm hinterher
  | 'setbowl' // Dummy (sitzend): stellt die Schüssel mit beiden Händen neben das Handy (0,15–0,95 s)
  | 'waitchin' // Dummy (sitzend): Kinn in den Händen, wartet gelangweilt
  | 'tugpull' // Tauziehen: weit zurücklehnen, Hände vorn am Seil, ruckt
  | 'magnify' // gebeugt mit Lupe vor dem Gesicht, sucht
  | 'snatch' // hüpft und greift mit beiden Armen nach oben
  | 'twistplug' // Dummy (sitzend): Stecker zum Laptop-Anschluss schieben, passt nicht, zurück, umdrehen (Takt 0,95 s); nach 5 Fehlversuchen gleitet er rein
  | 'physikshrug' // Dummy (sitzend): Arme fassungslos hoch, dann Achselzucken
  | 'ragefists' // Dummy (sitzend): Fäuste vor der Brust, zittert vor Wut (immer stärker)
  | 'liftplug' // Dummy (sitzend): Stecker aus dem Anschluss ziehen (0,3–0,55 s) und auf Augenhöhe heben (bis 1,2 s)
  | 'stareplug' // Dummy (sitzend): Stecker auf Augenhöhe, beugt sich streng heran
  | 'tapplug' // Dummy (sitzend): Stecker auf Augenhöhe, linker Zeigefinger tippt darauf (alle 0,9 s zweimal)
  | 'nodplug' // Dummy (sitzend): Stecker auf Augenhöhe, nickt zufrieden
  | 'malletready' // Dummy: Gummihammer rechts, klopft ihn drohend in die linke Hand (Takt 0,8 s)
  | 'nofinger' // Dummy: wedelt mit dem linken Zeigefinger „nein“, schüttelt den Kopf
  | 'croquet' // Dummy: Krocket-Schlag mit dem senkrechten Gummihammer (ausholen 0–0,45 s, Treffer 0,55 s)
  | 'holdlaptop' // Dummy: hält den Laptop waagerecht vor der Brust, zittert
  | 'foldlaptop' // Dummy: hält den Laptop und stemmt sich (Deckel klappt falschrum nach hinten)
  | 'throwlaptop' // Dummy: holt über den Kopf aus und wirft im hohen Bogen (Abwurf 0,62 s)
  | 'pulldoor' // Dummy: zieht verzweifelt mit beiden Händen an der Griffstange 0,45 m vor ihm (1,02 m hoch), lehnt sich zurück, ruckt alle 0,5 s
  | 'plantcracker' // Dummy: klebt mit rechts den Knallfrosch 0,5 m vor sich auf 1,12 m an die Tür (angedrückt 0,55–0,85 s), tritt zurück
  | 'coverears' // Dummy: geht hinter der Säule in die Hocke, hält sich die Ohren zu, lugt hervor; zuckt beim Knall (Wert-Zeit 0 = Hocke ab 0,4 s)
  | 'drillrail' // Dummy: steht (z. B. auf dem Tritt) und schraubt mit dem Akkuschrauber über dem Kopf (Bit ca. 0,25 m vor ihm auf 2,05 m), links hält die Schiene
  | 'slidepush' // Dummy: schiebt mit rechts eine Schiebetür locker zur Seite (Hand 0,4 m vor ihm, 1,0 m hoch, wandert nach links), links in der Hosentasche
  | 'bow' // Butler: vornehme Verbeugung, rechte Hand vor der Brust, linke hinter dem Rücken (runter 0,3–0,9 s, unten bis 1,5 s, wieder hoch bis 2,1 s)
  | 'butlerstand' // Butler: steht kerzengerade, linke Hand hinter dem Rücken, rechter Arm angewinkelt vor dem Bauch
  | 'carpetpush' // Butler: beugt sich tief vor (0–0,5 s) und gibt der Teppichrolle 0,45 m vor ihm einen Schubs (0,55–0,8 s), richtet sich auf + zeigt nach vorn
  | 'sleepwalk' // Dummy (Spezial Drucker): schlaftrunken tapsen – kleine schlurfende Schritte, Kopf hängt + nickt, Arme baumeln leicht vor dem Körper (Weg über Zeitpunkte)
  | 'signsleepy' // Dummy: steht am Schreibtisch (Platte 0,75 m), beugt sich vor (0–0,5 s), linke Hand hält das Blatt 0,42 m vor ihm, rechte Hand kritzelt mit Kuli 0,6–1,8 s eine Unterschrift (links → rechts), ab 2,1 s sackt der Kopf weg (eingenickt)
  | 'sleepstand' // Dummy: steht schlafend, Kopf hängt vornüber, schwankt leicht, Arme hängen
  | 'perch' // Taube: sitzen, Kopf nicken/picken, gurren
  | 'flap' // Taube: auf der Stelle flattern
  | 'talk' // Tauben-Anführer: mit den Flügeln gestikulieren
  | 'nod' // Tauben-Anführer: nicken
  | 'wingshake' // Tauben-Anführer: Flügel nach vorn reichen + schütteln
  | 'wingpush' // Tauben-Anführer: mit dem Flügel Papier über den Tisch schieben (alle 1,6 s)
  // ---- Spezial Chef (Details: chefPose in Dummy.tsx) ----
  | 'seatthrow' // sitzt (z. B. im Bagger), holt mit rechts über dem Kopf aus, wirft nach vorn (Abwurf 0,7 s), zeigt danach zufrieden
  | 'slapcard' // Karte hoch (bis 0,5 s), schwungvoll 0,45 m vor sich auf den Tisch (0,78 m) knallen (0,75 s), danach Arme verschränken
  | 'holdcard' // Karte stolz mit rechts neben dem Kopf hochhalten (0,3 m rechts, 0,26 m vor ihm, 1,62 m hoch), linke Hand in der Hüfte
  | 'spinswap' // wirbelt mit ausgebreiteten Armen um die eigene Achse (Wirbel-Effekt)
  | 'desktap' // sitzt am Tisch, zurückgelehnt, Finger tippen ungeduldig (0,45 m vor ihm), linke Hand zeigt immer wieder nach vorn
  | 'pushstack' // sitzt, schiebt mit beiden Händen einen Stapel über den Tisch nach vorn (Zyklus 1,6 s)
  | 'sweatstand' // steht nervös, Hände knetend vor dem Bauch, wischt alle 2,4 s mit rechts die Stirn
  | 'nagpoint' // Chef: steht, linke Hand in der Hüfte, rechter Zeigefinger tippt/zeigt nach vorn unten, Kopf nickt genervt
  | 'deskslump' // sitzt am Tisch, Ellbogen auf dem Tisch, Kopf in die linke Hand, seufzt
  | 'doorhold' // Tür mit links aufdrücken (Griff 0,5 m vor ihm, 0,35 m links, 1,0 m hoch; 0,3–1,0 s), dann mit rechts einladend winken
  | 'boxpunch' // Boxhaltung + abwechselnd Gerade rechts/links (Zyklus 0,9 s, Faust ca. 0,6 m vor ihm auf 1,5 m), wippt
  | 'pourcoffee' // steht an der Maschine: Tasse rechts unter den Auslauf (0,42 m vor ihm, 1,02 m hoch), links drückt die Taste
  | 'standcoffee' // steht, Tasse rechts zum Mund, trinkt (0,8–1,8 s), zufrieden – wie drinkcoffee, aber stehend
  | 'leaftoss' // Dummy: alle 1,6 s Laub mit beiden Armen schaufeln und über den Kopf nach vorn werfen (Abwurf ca. 1,0 s)
  | 'toss' // Gegenstand fliegt (z. B. geworfener Magnet): Weg über Zeitpunkte, gleichmäßig (ohne Abbremsen)
  // ---- Wal (Figur "wal") ----
  | 'float' // Wal: schwebt gemütlich, blinzelt, Flossen wedeln
  | 'appear' // Wal: erscheint mit "Plopp" (wächst in 0,9 s, federt nach)
  | 'shrink' // Wal: schrumpft langsam (2,2 s) und verschwindet mit Glitzern
  // 'spout' = Wal schnauft: kleine Wasserfontäne (bei 0,3 s, dann alle 3,2 s)
  | 'spout'
  // ---- Känguru (Figur "kaenguru") – hüpfen = "hop" (Weg über Zeitpunkte, ohne Weg = auf der Stelle) ----
  | 'guard' // Känguru: Boxhaltung, wippt auf dem Schwanz
  | 'punch' // Känguru: Schlag mit rechts (ausholen 0–0,25 s, Treffer bei ca. 0,4 s, ca. 0,75 m vor ihm auf 1,55 m), zurück
  | 'victory' // Känguru: Siegerpose – beide Pfoten hoch, hüpft kurz, freches Grinsen
  // ---- Spezial T-Rex-Stau (Details: DinoProps.tsx) ----
  | 'yawn' // T-Rex: gähnt gelangweilt (Kopf hoch, Maul weit auf 0,5–2,0 s, Ärmchen strecken), danach wieder 'bored'
  | 'bored' // T-Rex: steht gelangweilt, Kopf etwas tiefer, blinzelt, Schwanz pendelt träge
  | 'gaze' // T-Rex: schaut mit offenem Maul staunend nach oben (Blickrichtung über Wert turn/pitch)
  | 'chase' // T-Rex: rennt hinterher (Weg über Zeitpunkte), Ärmchen zappeln
  | 'hide' // Raptor: duckt sich (im Gebüsch), nur der Kopf schaut hervor
  | 'leap' // Raptor: springt (Weg über Zeitpunkte, Bogen 1,2 m hoch)
  | 'dance' // Raptor: tänzelt auf der Stelle, hüpft von Fuß zu Fuß, wackelt mit Kopf + Schwanz
  | 'sprint' // Raptor: rennt (Weg über Zeitpunkte)
  // ---- Zahn (Figur "zahn") ----
  | 'fly' // Zahn: dreht sich im Flug (Weg/Bogen über Zeitpunkte)
  | 'lie' // Zahn: liegt still
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
  // ---- Wecker-Spezial ----
  | 'bedsleep' // Dummy: liegt im Bett im Kissen und schläft
  | 'bedwake' // Dummy: schreckt im Bett hoch und starrt nach vorn auf die Uhr (ab 0,9 s Hände an den Wangen)
  | 'bedsit' // Dummy: sitzt aufrecht im Bett
  | 'bedflop' // Dummy: lässt sich zurück ins Kissen fallen
  | 'bedwrite' // Dummy: halb liegend, schreibt auf den Kalender auf dem Schoß (Kringel 0,3–1,4 s, Schrift 1,5–3,3 s)
  | 'bedhat' // Dummy: setzt im Bett ein Partyhütchen auf (Wert partyhat)
  | 'bedconfetti' // Dummy: löst im Bett die Konfetti-Kanone aus (Schuss bei 0,6 s)
  | 'bedcall' // Dummy: telefoniert gemütlich im Bett (Handy links, rechte Hand hinter dem Kopf)
  | 'bedpoint' // Dummy: Handy links am Ohr, zeigt mit rechts auf den Kalender auf dem Schoß
  | 'bedwave' // Dummy: halb liegend im Bett, winkt mit links
  | 'throwclock' // Dummy: holt über dem Kopf aus und wirft (Abwurf bei 0,62 s)
  | 'hammer' // Dummy: schlägt zweimal mit dem Hammer zu (Treffer 0,6 s + 1,6 s), ab 2,1 s aufrichten
  | 'holdhammer' // Dummy: steht ruhig, Hammer locker in der rechten Hand
  | 'watering' // Figur: gießt mit der Gießkanne (rechte Hand)
  | 'lookup' // Figur: richtet sich aus dem Gießen auf und schaut hoch
  | 'calsearch' // Chef: Handy rechts am Ohr, linker Finger sucht Reihe für Reihe auf dem Wandkalender
  | 'chefhm' // Chef: Handy am Ohr, linke Hand in der Hüfte, "Hm?" (mit Wert brow)
  | 'arc' // Gegenstand fliegt im Bogen (Weg über Zeitpunkte, gleichmäßig), dreht sich dabei
  | 'burst' // Effekt: Teile fliegen heraus (Zahnräder/Konfetti)
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
  /** harter Schnitt: die Bewegung ab diesem Zeitpunkt wird nicht von der vorigen weich überblendet */
  cut?: boolean;
  /** Hinweisschild ("hinweis"): Text auf dem Schild (gilt ab diesem Zeitpunkt weiter) */
  text?: string;
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
  /** Dummy: rote Boxhandschuhe 0 = aus, 1 = an */
  gloves?: number;
  /** Dummy: Zahnreihe zeigen 0 = aus, 1 = an */
  teeth?: number;
  /** Dummy: Zahnlücke (ein Zahn fehlt) 0 = nein, 1 = ja */
  gap?: number;
  /** Zahn (auch Zahn in der Hand des Dummys): 0 = gesund weiß … 1 = grau (Zellen abgestorben) */
  gray?: number;
  /** Zahn: Markierung 0 = aus … 1 = Krone grün + Wurzel rot mit Schild "Nicht anfassen" (1 … 2: Schild blendet aus, Krone bleibt grün) */
  mark?: number;
  /** Taschentuch: 0 = offen … 1 = eingewickelt */
  wrap?: number;
  /** Zahnrettungsbox: Deckel 0 = zu … 1 = offen */
  lid?: number;
  /** Zahn, Hinweisschild, Zahnrettungsbox: Größe (0 = normal, 1 = doppelt so groß …) */
  size?: number;
  /** Hinweisschild: 0 = Schild oberhalb (Zeiger nach unten), 1 = Schild unterhalb (Zeiger nach oben) */
  below?: number;
  /** Hinweisschild: 1 = grün statt rot (für "richtig"-Hinweise) */
  good?: number;
  /** Dummy: comichafte Schaumblasen am Mund, 0 = keine … 1 = ein paar … 2 = viele */
  foam?: number;
  /** Dummy: Röntgen-Hinweis Lunge mit Pfeil vom Mund in die Lunge + Warndreieck, 0 … 1 (Pfeil wächst) */
  lunge?: number;
  /** Dummy: Röntgen-Hinweis Magen mit Pfeil zum Blutstropfen + Giftpunkte + Warndreieck, 0 … 1 */
  blut?: number;
  /** Figuren mit Dummy-Körper: Schweißtropfen + Stress-Striche am Kopf, 0 = aus … 1 = viel … 2 = sehr viel */
  sweat?: number;
  /** Glas Milch ("milchglas"): Füllstand 1 = voll … 0 = leer */
  fill?: number;
  /** Oberschrank ("oberschrank"): Kindersicherung 1 = eingerastet … 0 = offen */
  lock?: number;
  /** Dummy: Herz-Symbol neben dem Kopf, Schläge pro Sekunde (0 = aus, 1 = ruhig, 2.5 = rast). Ändert sich weich */
  heart?: number;
  /** Dummy: Brustkorb hebt sich mit jedem Atemzug ("breath"), 0 = normal … 1 = stark (hektisches Atmen) */
  heave?: number;
  /** Wal: drückt gegen die Wände 0 … 1 (gestaucht, gewölbt, drängelt) */
  squish?: number;
  /** Dummy (sitbreathe): Coolpack in den Nacken 0 = Hände am Bauch … 1 = Coolpack im Nacken */
  pack?: number;
  /** Dummy (sitbreathe): Glas kaltes Wasser trinken 0 = aus … 1 = Glas am Mund */
  sip?: number;
  /** Gegenstand (z. B. Magnet, Granate) in der rechten Hand des Dummys: 0 = frei (eigene Position) … 1 = in der Hand */
  hand?: number;
  /** Gegenstand in der Hand: hängt so viele Meter unter der Hand (Magnet am Seil) */
  drop?: number;
  /** Magnet: Seil von der Hand des Dummys zum Magneten zeigen (0/1) */
  rope?: number;
  /** Auto / Granate: rumpeln (Kopfsteinpflaster), 0 … 1 */
  rumble?: number;
  /** Auto: Beifahrerfenster 0 = zu … 1 = offen */
  window2?: number;
  /** Koffer: Teleskopgriff 0 = eingefahren … 1 = ausgezogen */
  handle?: number;
  /** Pistole: liegt auf der Seite 0 = aufrecht … 1 = auf der Seite */
  side?: number;
  /** Pistole: Laubblätter darauf 0 … 1 */
  leaves?: number;
  /** Karten-Handy: roter Pin fällt 0 … 1 (ab 1: "Fundort gespeichert") */
  pin?: number;
  /** Figur mit Dummy-Körper: gelbes Fragezeichen über dem Kopf 0 … 1 */
  question?: number;
  /** Polizeiauto: Blaulicht 1 = an */
  blue?: number;
  /** Hund: Leine zur rechten Hand der Figur in "holder" (Standard "nachbar") 1 = an */
  leash?: number;
  /** Figur mit Dummy-Körper: Augenbrauen ab 0,01 sichtbar, 1 = rechte Braue hochgezogen */
  brow?: number;
  /** Dummy: Geldbündel, die vorn aus der Jacke schauen (0 … 3) */
  stash?: number;
  /** Geldkoffer: wie voll mit Bündeln (0 … 1, Standard 1) */
  money?: number;
  /** Formular: Kugelschreiber daneben 1 = ja */
  pen?: number;
  /** Wind/Sog 0 … 1: Dummy = Jackensaum flattert (Richtung = zum Gleis, −z der Welt), "sog" = Stärke der Windlinien */
  wind?: number;
  /** "sog": seitliches Mitziehen der Windlinien (−1 … 1, + = Richtung +x der Welt, mit dem Zug) */
  drift?: number;
  /** Spritze/Nadel: Aufblinken (Warnung) 0 … 1 */
  blink?: number;
  /** Spritze: Kappe aufgesteckt 1 = ja */
  capon?: number;
  /** Rasen ("rasen", "rasen2"): 0 = braun + fleckig … 1 = leuchtend grün + perfekt */
  lush?: number;
  /** Grüne Sprühfarbe 0 … 1: Rasen, Gartenzwerg, Hund, Schuhe des Dummys */
  paint?: number;
  /** Dummy im Anzug (dunkelgrau, weißes Hemd, rote Krawatte) 0/1 */
  suit?: number;
  /** Gegenstand mit "hand": in wessen rechter Hand (Figur mit Dummy-Körper, z. B. "kumpel", "bundespolizist"). Standard "dummy". Gilt ab diesem Zeitpunkt weiter */
  holder?: string;
  /** Figur mit Dummy-Körper: Partyhütchen 0 … 1 (wird von oben aufgesetzt) */
  partyhat?: number;
  /** Figur mit Dummy-Körper: Gartenhut 0/1 */
  gardenhat?: number;
  /** Wecker/Smartphone: klingelt 0 … 1 */
  ring?: number;
  /** Wecker: kaputt 0 … 1 */
  broken?: number;
  /** Abreißkalender: roter Kringel 0 … 1 */
  circle?: number;
  /** Abreißkalender: "FEIERTAG" geschrieben 0 … 1 */
  write?: number;
  /** Dummy: Lesebrille 0 … 1 */
  glasses?: number;
  /** Figur mit Dummy-Körper: Joghurt-Kleckse am Kopf 0 … 1 */
  splat?: number;
  /** Dummy: weißer Cartoon-Klecks auf der linken Schulter 0 … 1 */
  klecks?: number;
  /** Dummy: Engels-/Taubenflügel 0 … 1 (wachsen/öffnen) … 2 (kräftig schlagen) */
  wings?: number;
  /** Großer roter Knopf: gedrückt 0 … 1 */
  press?: number;
  /** Leuchten (Knopf, Kühlschrank-Innenlicht nachts) 0 … 1 */
  glow?: number;
  /** Figur mit Dummy-Körper: Lokführermütze 0 … 1 (wird von oben aufgesetzt) */
  lokcap?: number;
  /** Dummy: graue Jogginghose 0/1 */
  jogger?: number;
  /** Dummy: weißer Ganzkörper-Schutzanzug mit Maske, Schutzbrille, Gummihandschuhen (0/1) */
  hazmat?: number;
  /** T-Rex/Raptor: Kopf drehen (Grad, + = nach links aus Sicht der Figur) */
  turn?: number;
  /** T-Rex/Raptor: Kopf heben (Grad, + = nach oben) */
  pitch?: number;
  /** T-Rex: Maul zusätzlich öffnen 0 … 1 */
  jaw?: number;
  /** jede Figur: wird ins Schwarze Loch gesaugt – schrumpft 0 … 1 (1 = weg) und dreht sich dabei */
  shrink?: number;
  /** Dummy: Forscher-Schutzbrille 0 … 1 (rutscht von der Stirn auf die Augen) */
  goggles?: number;
  /** USB-Laptop: Deckel falschrum nach hinten klappen 0 … 1 */
  fold?: number;
  /** USB-Stecker: winziger Sicherheitsgurt 0 … 1 */
  belt?: number;
  /** USB-Stecker: winziger Helm 0 … 1 */
  helm?: number;
  /** USB-Stecker: nickt 0 … 1 */
  nod?: number;
  /** Dummy: strenger/wütender Blick (Brauen) 0 … 1 */
  angry?: number;
  /** Cookie-Handy: Low-Poly-Beine wachsen 0 … 1 */
  legs?: number;
  /** Spezial Drucker: Blumenkette am Drucker 0 … 1 */
  lei?: number;
  /** Spezial Drucker: Comic-„Zzz“ über dem Kopf (Figuren mit Dummy-Körper) 0 … 1 */
  zzz?: number;
  /** Tür „druecktuer“: Laufschiene wird angeschraubt 0 … 1 (ab 0,85 hängt das Blatt in der Schiene) */
  rail?: number;
  /** Tür „druecktuer“: Schiebetür rollt zur Seite 0 … 1 */
  slide?: number;
};

/** Zahlenwerte einer Figur, die von Zeitpunkt zu Zeitpunkt weich übergehen */
export const ACTOR_VALUES = ['tilt', 'window', 'door', 'water', 'pressure', 'pain', 'jacket', 'pants', 'breath', 'cold', 'spray', 'armbite', 'redness', 'plaster', 'dressing', 'fire', 'smoke', 'zap', 'lever', 'lean', 'gloves', 'teeth', 'gap', 'gray', 'mark', 'wrap', 'lid', 'size', 'below', 'good', 'foam', 'lunge', 'blut', 'fill', 'lock', 'heart', 'heave', 'squish', 'pack', 'sip', 'hand', 'drop', 'rope', 'rumble', 'window2', 'handle', 'side', 'leaves', 'pin', 'question', 'blue', 'leash', 'brow', 'stash', 'money', 'pen', 'wind', 'drift', 'blink', 'capon', 'partyhat', 'gardenhat', 'ring', 'broken', 'circle', 'write', 'lush', 'paint', 'suit', 'glasses', 'splat', 'press', 'glow', 'lokcap', 'jogger', 'hazmat', 'sweat', 'turn', 'pitch', 'jaw', 'klecks', 'wings', 'shrink', 'goggles', 'rail', 'slide', 'fold', 'belt', 'helm', 'nod', 'angry', 'legs', 'lei', 'zzz'] as const;
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
  /** true = Kamera schwingt bei harten Schnitten nicht über (empfohlen für neue Videos) */
  sharpCuts?: boolean;
  actors: Record<string, ActorKey[]>;
  sfx?: SfxCue[];
  /** Abblenden der 3D-Szene: [t Beginn, t Ende, Stärke 0…1] – Texte bleiben sichtbar */
  fade?: [number, number, number];
  /**
   * Bild einfrieren ab t (0…1): Figuren + Bühne bleiben stehen, nur die Kamera fährt langsam weiter.
   * Bei falschen Optionen kommt das rote Aufleuchten (+ Falsch-Ton) genau in diesem Moment statt am Anfang.
   */
  freeze?: number;
  /** Nur richtige Option: grünes Aufleuchten (+ Richtig-Ton) erst bei t (0…1) statt am Anfang */
  flash?: number;
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
  /**
   * Enge/Panik-Wirkung: Bild zoomt leicht heran + dunkler Rand (Vignette). Liste von {t, v} mit v 0 = normal … 1 = sehr eng.
   * Geht weich zwischen den Zeitpunkten über.
   */
  tight?: {t: number; v: number}[];
  /** Atem-Anzeige einblenden: [t Beginn, t Ende] – zeigt im Takt "Ein" (2 s, kurz) und "Aus" (4 s, lang), Zyklus 6 s ab Beginn */
  breathGuide?: [number, number];
  /**
   * Spiel-Anzeige (selbst gestaltet, kein Original): [t Beginn, t Ende]. Unten Mitte Lebensbalken, unten rechts leeres Inventar,
   * oben rechts Minikarte, darüber rechts die Bau-Auswahl (Wand, Treppe, Boden, Dach).
   */
  hud?: [number, number];
  /** Bau-Auswahl in der Spiel-Anzeige: Liste {t, sel} mit sel = "wall" | "stair" | "floor" | "roof" | "" */
  hudSel?: {t: number; sel: string}[];
  /** Zähler oben (Spezial USB, z. B. „1x“ … „5x“): Liste {t, text}; leerer Text = ausblenden. Neuer Text ploppt auf */
  counter?: {t: number; text: string}[];
  /** Pop-up-Fenster (Spezial Cookies): Liste {t, text, x, y, w?, big?}; leerer Text = alle bisherigen ausblenden */
  popups?: {t: number; text: string; x?: number; y?: number; w?: number; big?: boolean}[];
  /** Alles zieht sich in einen leuchtenden Punkt zusammen: [t Beginn, t Punkt, t schwarz] (Urknall rückwärts) */
  implode?: [number, number, number];
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
  /** Nur Spezial: Szene um so viele Sekunden rein visuell verlängern (ohne zusätzlichen Text) */
  sceneExtra?: number;
  choreography: Shot;
};

export type Scenario = {
  id: string;
  /**
   * "quiz" (Standard) oder "spezial": keine richtige Antwort, keine Auflösung, keine Quellenzeile.
   * Spezial-Ablauf: Situation → je Antwort Karte + kleine Szene → Abstimmung (Countdown, "Stimm ab!") → Outro.
   */
  format?: 'quiz' | 'spezial';
  /** Pause nach jedem Sprach-Clip in Sekunden (Standard 0,5). Kleiner = kürzeres Video (Spezial-Regel: max. 66 s, Texte nie ändern) */
  padAfter?: number;
  /** nur Spezial: Vorlauf (s) vor dem Szenentext explain1–3, Standard 0,6 (Spezial Drucker: kürzer für ≤ 66 s) */
  explainLead?: number;
  /** nur Spezial: Länge der Abstimmung (s), Standard 5,6, mindestens Ansage bzw. 5 s */
  voteLen?: number;
  /** nur Spezial: Abstimmungs-Abschnitt weglassen (Outro fordert selbst zum Kommentieren auf) */
  noVote?: boolean;
  /** nur Spezial: Outro mindestens so viele Sekunden (Bild klingt länger aus, z. B. für die 61-s-Regel) */
  outroMin?: number;
  category: string;
  stage: string;
  /** hook (optional) = große Überschrift oben während der Situation (nur eingeblendet, nicht gesprochen) */
  situation: {speech: string; hook?: string; warning?: string};
  options: [Option, Option, Option];
  /** Quiz: Nummer der richtigen Option (fehlt beim Spezial-Format) */
  correctOption?: 1 | 2 | 3;
  /** Quiz: Countdown; Spezial: Abstimmung (speech = Ansage, screen = Schild, z. B. "Stimm ab!") */
  countdown: {speech: string; screen: string};
  /** Quiz: Auflösung (fehlt beim Spezial-Format) */
  reveal?: {speech: string; screen: string};
  /** extra (nur Spezial, optional): zusätzliche Zeile unter den Antworten, erscheint mit dem Satz, der mit extraCue beginnt */
  outro: {speech: string; screen: string; extra?: string; extraCue?: string};
  /** Quiz: Quellenzeile im Video (fehlt beim Spezial-Format) */
  sourceLine?: string;
  sources?: {name: string; url: string}[];
  publishing: {description: string; pinnedComment: string};
  /** Spezial: "options" und "reveal" werden nicht gebraucht, "countdown" = Abstimmung */
  shots: {
    situation: Shot;
    options?: Shot;
    countdown: Shot;
    reveal?: Shot;
    outro: Shot;
  };
};
