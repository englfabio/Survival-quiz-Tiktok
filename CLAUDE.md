# survival-quiz – Arbeitsanleitung für Claude

Quiz-Videos „Was würdest du tun?“ für TikTok / Instagram / YouTube Shorts.
Gebaut mit Remotion (React → Video) und @remotion/three (3D).

## Arbeitsregeln (vom Projektinhaber festgelegt – immer einhalten)

1. **Immer auf Deutsch, in einfachen Worten.** Der Inhaber kann nicht programmieren.
   Fachbegriffe vermeiden oder kurz erklären.
2. **Vor JEDER Installation fragen** (npm-Pakete, Programme, Skills, Downloads) und
   kurz sagen, wofür sie gebraucht wird.
3. **Nach jedem abgeschlossenen Schritt: Commit und Push** auf den Arbeits-Branch.
   Die Cloud-Umgebung wird gelöscht – was nicht gepusht ist, ist weg.
4. **`.env` niemals hochladen.** `.gitignore` enthält `.env`, `node_modules` und Render-Ausgaben.
5. **ElevenLabs-Audios zwischenspeichern und im Repository sichern** (Ordner `audio-cache/`).
   Dateiname = Hash aus Text + Stimme + Modell + Einstellungen. Existiert die Datei schon,
   wird NICHT neu bei ElevenLabs angefragt. So wird nie etwas doppelt bezahlt.
6. **Reihenfolge immer:** 1. Standbilder zur Freigabe → 2. Stimme → 3. Video.
   Nach jedem Schritt auf Freigabe warten. Seit dem Kreuzotter-Video (vom Inhaber so entschieden):
   Das Video wird nur EINMAL in voller Qualität gerendert; die Vorschau (halbe Größe) wird daraus
   per ffmpeg verkleinert. Freigabe der Vorschau = Video ist fertig zum Hochladen.
   Gibt es Änderungswünsche, wird nach der Änderung neu gerendert.
7. **Fachliche Texte in `/scenarios` nie ohne Erlaubnis ändern** – auch nicht kürzen,
   umformulieren oder Satzzeichen „verbessern“. Sie sind fachlich geprüft.
8. **Mindestlänge 61 Sekunden prüfen.** Ist ein Video kürzer: NICHT rendern, sondern
   dem Inhaber Bescheid geben.
9. **Sichere Bereiche einhalten** (siehe unten).
10. Arbeiten in **Phasen**; nach jeder Phase anhalten und berichten.

## Das Format (Ablauf eines Videos)

Hochformat **1080 × 1920, 30 fps**. Pro Video EINE gefährliche Situation, drei Optionen,
genau eine richtig.

| # | Abschnitt | Richtwert |
|---|-----------|-----------|
| 1 | Situation (direkter Einstieg) | 5–8 s |
| 2 | Drei Optionen erscheinen nacheinander, werden vorgelesen | ca. 10 s |
| 3 | Countdown 5 s, Text „Schreib 1, 2 oder 3 in die Kommentare“ | 5 s |
| 4 | „Richtig ist Nummer X“ – richtige Karte wird grün | kurz |
| 5 | Erste falsche Option groß: was passiert, warum gefährlich | ca. 11 s |
| 6 | Zweite falsche Option, gleich aufgebaut | ca. 11 s |
| 7 | Richtige Option: warum + konkrete Schritte, Quellenzeile eingeblendet | ca. 12 s |
| 8 | Outro | 3–4 s |

- Gesamtlänge **mindestens 61 s**.
- Abschnittslängen richten sich (sobald es Sprachaufnahmen gibt) automatisch nach der
  Länge der Audios. Bis dahin wird die Sprechdauer aus der Textlänge geschätzt
  (gemessen an der Pilot-Stimme: ca. 0,84 s + 0,059 s pro Zeichen).

## Look

- **UI-Stil „Warnschild“:** dunkles Anthrazit, Signalgelb als Akzent, Grün = richtig,
  Rot = falsch, weiße Schrift.
- **Schrift:** Barlow Condensed, lokal über `@fontsource/barlow-condensed`
  (nie über Google-Server laden).
- Drei große Antwortkarten mit Nummernkreis, Countdown-Ring, Kategorie-Symbol, Untertitel.
- **Hintergrund:** echte 3D-Szenen (@remotion/three), stilisierter hochwertiger Low-Poly-Look,
  schönes Licht, Kamerafahrten. Kein Fotorealismus.
- **Hauptfigur:** stilisierter Crashtest-Dummy aus einfachen Körperformen, ohne Gesicht,
  gelb mit schwarz-gelben Kreismarkierungen. Er spielt jede Option vor.
- Fertige 3D-Modelle von außen nur nach Rückfrage (Quelle + Lizenz nennen, z. B. CC0).

## Sichere Bereiche (1080 × 1920)

Dort darf nichts Wichtiges stehen (wird von App-Bedienelementen verdeckt):
- obere **160 px**
- untere **480 px**
- in der unteren Bildhälfte (ab y = 960) die rechten **140 px**

Es gibt eine Hilfsansicht, die diese Bereiche einblendet (Prop `showSafeZones`).

## Baukasten (wiederverwendbar)

- **Bühnen:** Wald mit Weg (`wald`), sonnige Waldlichtung am Waldrand (`waldlichtung`, Variante des Waldes),
  Seeufer mit Uferweg, Böschung, bewegtem See + automatischer Unterwasser-Ansicht (`seeufer`),
  Meeresstrand an Nord-/Ostsee mit flachem, klarem Wasser, Spülsaum-Schaum, Dünen mit Strandhafer, Dünenzaun,
  Buhnen, Sonnenschirm (`meeresstrand`, Wellen wie beim Seeufer; Dummy dort automatisch barfuß),
  Hausgarten mit Rasen, umgegrabenem Gemüsebeet (dunkle Erde, Grabstelle), Holzzaun, Gartenhaus, Nachbarhaus,
  eigenem Wohnhaus, Apfelbaum (`garten`, freundliches Tageslicht, Atmo = Vogelgezwitscher vom Wald),
  Steinburg im Winter mit Torhaus, Rundtürmen, Burggraben (dunkles, kaltes Wasser, Eisschollen), kahlen Bäumen,
  Raureif, leichtem Schneefall, kaltem bläulichem Licht (`burg`, Atmo = `winter-atmo`)
- **Dummy-Bewegungen:** stehen, gehen, rennen, klettern, langsam rückwärts/seitlich gehen, stolpern,
  beschwichtigen, winken, gebissen zusammenzucken, besorgt zur Wade schauen, zur Wade beugen (Aussaugen),
  Band ums Bein wickeln, hinsetzen, ruhig sitzen, sitzen + telefonieren,
  angeschnallt im Auto sitzen, Gurt lösen, Knopf am Fensterheber drücken, durchs Fenster klettern,
  an der Oberfläche schwimmen, gegen die Tür drücken, ruhig sitzen und warten,
  barfuß waten, auf etwas treten + zusammenzucken, auf einem Bein hüpfen, sitzen + Fuß halten, Eis auf den Fuß halten,
  Stachelreste mit Pinzette entfernen, Temperatur mit dem anderen Fuß testen, Fuß ins heiße Wasser stellen,
  im tiefen Wasser kaum noch über Wasser kommen,
  umgraben, auf etwas Hartes stoßen + erstarren, erstarrt stehen, hinknien + Erde wegschieben, Schweres anheben,
  Schweres tragen, Schweres ablegen, Schubkarre schieben, ganz langsam rückwärts weggehen, Stelle mit Warnstab
  markieren, andere warnen (winken + zeigen), stehend telefonieren,
  über eine Brücke gehen, abrutschen + ins Wasser fallen, nach Luft schnappen, hektisch kraulen, im Wasser an der Jacke
  zerren, auf dem Rücken treiben, ruhig in Rückenlage schwimmen, am Rand festhalten (+ um Hilfe winken)
- **Kleidung (Dummy):** Winterjacke (`jacket` 0 … 1) und lange Hose (`pants` 0 … 1) – an/aus, Ärmel rutschen beim Ausziehen
- **Weitere Figuren:** Braunbär, Kreuzotter, Petermännchen (gleicher Low-Poly-Look wie der Dummy),
  Nachbar (`nachbar`: gleiche Figur wie der Dummy, aber blau – kann alle Dummy-Bewegungen)
- **Objekte:** Auto (Kleinwagen, `car`): fahren, rollen, treiben, sinken + abkippen; Fahrerfenster, Fahrertür,
  Wasser im Innenraum, Wasserdruck-Pfeile. Für weitere Videos nutzbar (Straße, Gewitter …)
- **Objekte (Strand):** Zinkschüssel mit dampfendem Wasser (`schuessel`), Thermometer-Schild „ca. 45 °C“
  (`thermometer`), Pinzette + Eisbeutel (hält der Dummy bei `tweeze` bzw. `ice` automatisch)
- **Objekte (Garten, `src/actors/GardenProps.tsx`):** rostige Fliegerbombe mit Leitwerk (`fliegerbombe`),
  Spaten (`spaten`; hält der Dummy bei dig/hithard/stiff automatisch), Schubkarre (`schubkarre`), rot-weißer
  Warnstab mit Absperrband-Fähnchen (`warnstab`), Smartphone (`smartphone`; hält der Dummy bei `call` automatisch)
- **Objekte (Burg, `src/actors/CastleProps.tsx`):** Zugbrücke (`zugbruecke`) mit Ketten, hochklappbar über `tilt`
- **Einfrieren** (`"freeze": t` in einem Shot): Figuren + Bühne bleiben ab t stehen, Bild wird etwas blasser,
  Kamera fährt langsam weiter. Bei falschen Optionen kommen rotes Aufleuchten + Falsch-Ton genau dann.
- **Effekte:** Schmerz-Symbol am rechten Fuß (Wert `pain`), Stich-Punkt (`sting`), rotes/grünes Aufleuchten, Bewegungslinien, Wasser-Platschen (`splash`), Luftblasen (beim Sinken),
  Abblenden der Szene (`fade`), Atemwolken (`breath`), Kälte-Symbol (`cold`), Spritzwasser (`spray`), Stoppuhr (`timer`)

## Stimme (ElevenLabs)

- Gewählte Stimme: **„M. Danisch – Narrator“**, Voice-ID `1KGG4Q8LqRdNII9xBurw`
  (deutsch, männlich, ruhig, für Erzählung/Doku). Vom Inhaber festgelegt.
- Library-Stimme, funktioniert per API direkt mit der Voice-ID (getestet, muss NICHT unter
  „My Voices“ hinzugefügt werden). Tarif des Inhabers: Starter (bezahlt, kommerziell erlaubt).
- Einstellungen in `voice.config.json` (Modell `eleven_v4`, stability 0.5, similarity 0.75).
  Jede Änderung dort erzeugt neue Hashes → kostet neu. Nur nach Rückfrage ändern.
- `npm run voice -- <id> --dry` zeigt vorher, was neu erzeugt würde (Zeichen = Kosten).
  `npm run voice -- <id>` erzeugt nur Fehlendes; Rest kommt aus `audio-cache/`.
- Ergebnis: `public/voice/<id>/<clip>.mp3`, `durations.json` (Längen), `alignment.json`
  (Wort-Zeitstempel für Untertitel + Schritt-Liste). Clips: situation, option1–3, countdown,
  reveal, explain1–3, outro. Gesprochen wird exakt der Text aus der Szenario-Datei.
- Pilot: 933 Zeichen ≈ 373 Credits. Kontrolle per Spracherkennung (scribe_v2): alles korrekt.
- Kreuzotter: 839 neue Zeichen = 336 Credits (countdown/reveal/outro wortgleich → aus Cache). Kontrolle: korrekt.
- Auto im See: 958 neue Zeichen = 383 Credits (countdown/reveal/outro aus Cache). Kontrolle (scribe_v2): korrekt.
- Fliegerbombe: 943 neue Zeichen (countdown/reveal/outro aus Cache), Sprechzeit 75,1 s, Video 84,0 s. Wort-Zeitstempel = Text
  (geprüft). Standbilder in review/fliegerbombe-garten/phase1/, Tonspur in review/fliegerbombe-garten/stimme/.
  Finales Video: review/final/fliegerbombe-garten.mp4 (84,0 s), Vorschau in review/vorschau/.
- Burggraben-Kälteschock: 1023 neue Zeichen (countdown/reveal/outro aus Cache), Sprechzeit 75,0 s, Video 84,0 s.
  Wort-Zeitstempel = Text (geprüft). Standbilder in review/burggraben-kaelteschock/phase1/. Finales Video: review/final/burggraben-kaelteschock.mp4 (84,0 s), vom Inhaber freigegeben.
- Petermännchen: 953 neue Zeichen = 381 Credits (countdown/reveal/outro aus Cache). Wort-Zeitstempel = Text (geprüft);
  Hörprobe/Vorschau vom Inhaber nicht gewünscht. Finales Video: review/final/petermaennchen-stich.mp4 (83,1 s).
- Cloud-Hinweis: Node braucht `--use-env-proxy` (steht schon in den npm-Befehlen).

## Soundeffekte (ElevenLabs)

- Liste in `sfx.config.json`, erzeugen mit `npm run sfx` (mit Cache, `--dry` möglich),
  Ergebnis in `public/sfx/<id>.mp3`. Für alle Videos gemeinsam.
- Automatisch im Video (src/AudioLayer.tsx, Lautstärken in `VOLUME`): Wald-Atmo (Bühne),
  Whoosh bei jedem Schnitt, Pop pro Karte, Ticks + Spannung im Countdown, Richtig-Ton bei
  Auflösung/richtiger Option, Falsch-Ton bei falschen Optionen.
- Weitere Effekte: `schlange-zischen`, `schlange-biss`, `handy-waehlen` (Kreuzotter-Video);
  `see-atmo` (Bühne Seeufer, Schleife), `auto-platschen`, `blubbern`, `unterwasser-atmo`, `fensterheber`,
  `gurt-klick`, `tuer-druecken`, `schwimmen` (Auto-im-See-Video);
  `meer-atmo` (Bühne Meeresstrand, Schleife), `waten`, `stich`, `dampf` (Petermännchen-Video);
  `graben`, `spaten-klonk`, `erde-schieben`, `schubkarre` (Fliegerbombe-Video; Garten nutzt `wald-atmo`);
  `winter-atmo` (Bühne Burg, Schleife), `zugbruecke`, `sturz-platschen`, `hektisch-planschen` (Burggraben-Video).
  `gainDb` in `sfx.config.json` macht einen Effekt beim Kopieren lauter (kostenlos, braucht ffmpeg).
- Tonspur zum Anhören: `npx remotion render <id> review/<id>/stimme/<id>-tonspur.mp3 --codec=mp3`
- Szenario-spezifisch: `"sfx": [{ "t": 0.6, "id": "baer-brummen", "volume": 0.5 }]` in einem
  Shot bzw. einer Choreografie.

## Datengesteuerte Vorlage

Jedes Video = **eine Datei** in `/scenarios` (JSON). Neue Videos = nur neue Datei, kein neuer Code.
Inhalt: ID, Kategorie, Bühne, Situationstext, drei Optionen (Kartentext + Sprechtext +
Dummy-Aktion), Nummer der richtigen Option, Erklärtexte, Quellen (Name + Link),
Beschreibung und angepinnter Kommentar.

### Aufbau einer Szenario-Datei

| Feld | Bedeutung |
|------|-----------|
| `id` | Name des Videos (nur a–z, 0–9, `-`) |
| `category` | z. B. `wildtiere`, `verkehr` (Symbol + Name in `src/ui/icons.tsx`) |
| `stage` | Bühne, z. B. `wald` (`src/stage/`) |
| `situation.speech` | Sprechtext Einstieg (auch Untertitel) |
| `options[]` | genau 3: `card` (Kartentext), `speech` (Sprechtext), `dummyAction` (Beschreibung), `explanation` (Erklärtext), `choreography` (Bewegungen + Kamera der Erklärszene) |
| `options[].steps` | optional: Kurzschritte zum Einblenden, `{text, cue}` – `cue` ist die Stelle im Erklärtext, bei der der Schritt erscheint (synchron zur Sprache) |
| `correctOption` | 1, 2 oder 3 |
| `countdown` / `reveal` / `outro` | `speech` (gesprochen) + `screen` (eingeblendet) |
| `sourceLine` | Quellenzeile im Video |
| `sources[]` | Name + Link für die Beschreibung |
| `publishing` | `description` (komplette Beschreibung inkl. Quellen + Hashtags), `pinnedComment` – vom Inhaber geliefert, wortgenau |
| `shots` | Kamera + Figuren für situation, options, countdown, reveal, outro |

**Choreografie** („Shot“): `camera` und `actors` sind Listen von Zeitpunkten `t` (0 = Anfang,
1 = Ende des Abschnitts – dehnt sich automatisch mit der Audiolänge).
- Figur: `{ "t", "x", "z", "y"?, "face"?, "motion" }` – Meter; `face` in Grad
  (0 = Richtung −z/zum Bären, 90 = rechts, 180 = zur Kamera). Bewegungen:
  `stand, walk, run, climb, backstep, sidestep, stumble, calm, wave, flinch, hurt, suck, tourniquet,
  sitdown, sit, phone` (Dummy), `stand, alert, sniff, walk, run, climb` (Bär),
  `coil, slither, strike` (Kreuzotter, Figurname `snake`). `climb` klebt automatisch am Kletterbaum.
  Dummy: `"bite": true` zeigt ab diesem Zeitpunkt zwei kleine Bisspunkte an der rechten Wade (kein Blut).
  `suck`, `tourniquet`, `sit`, `phone` sind Sitz-Haltungen; `sitdown` geht von Stehen zu Sitzen (ca. 1,2 s).
  `strike`: Kopf schnellt ca. 0,35–0,55 s nach Beginn vor (Reichweite ca. 0,6 m in Blickrichtung).
- Strand-Bewegungen Dummy: `wade, stepflinch, hop, holdfoot, ice, tweeze, testtemp, footbath, struggle`.
  `stepflinch`: rechter Fuß setzt ca. 0,35 s nach Beginn ca. 0,3 m vor der Hüfte auf, dann Zusammenzucken.
  Sitz-Bewegungen (`holdfoot, ice, tweeze, testtemp, footbath`): Schüssel steht 0,32 m vor der Hüfte
  (bei face 0 also z − 0.32). Wechsel zwischen diesen Bewegungen werden automatisch weich überblendet (0,45 s).
  `"sting": true` = kleiner roter Punkt am rechten Fuß (gilt weiter). `"pain"`: 0 = aus, 1 = Schmerz-Symbol am Fuß,
  bis 2 = breitet sich übers Bein aus (weicher Übergang zwischen Zeitpunkten, gilt weiter).
- Petermännchen (Figurname `petermaennchen`, ca. 0,48 m): `buried` (nur Augen schauen aus dem Sand),
  `finup` (schwarze Rückenflosse mit Stacheln aufstellen), `swimaway` (aus dem Sand, davonschwimmen; Weg über Zeitpunkte).
- Schüssel (`schuessel`): `steam` = dampft. Thermometer-Schild (`thermometer`): `show` = springt auf, sonst unsichtbar;
  schaut immer zur Kamera, Breite 0,5 m, `y` = Höhe über dem Boden.
- Auto (Figurname `car`): `park, drive, roll, float, sink`. Zusatzwerte je Zeitpunkt (gehen weich über und gelten
  weiter, bis sie sich ändern): `tilt` (Grad, + = Nase nach unten), `window` (0 zu … 1 offen), `door` (0 … 1),
  `water` (Wasserstand im Innenraum in m; ca. 1,25 = bis zum Dach), `pressure` (Druckpfeile 0 … 1).
  Linkslenker, Fahrerseite = links in Fahrtrichtung. Auto mit `face 0` (Front zum See): Fahrerseite zeigt nach −x.
- Dummy im Auto: `"attach": "car"` → x/y/z/face gelten im Auto. Fahrersitz: `x 0.3, z −0.2, y 0`
  (face 0 = nach vorne, 90 = zur Fahrertür). Bewegungen dort: `buckled, unbuckle, button, pushdoor, wait`
  (mit Gurt außer button), `climbout` (über mehrere Zeitpunkte zum Fenster hinaus). Wechsel von „im Auto“ zu
  „frei“ (z. B. `swim`) wird automatisch weich überblendet. `swim`: y ≈ −0.3 (Körper flach an der Oberfläche).
- Neue Bewegungen laufen über mehrere Zeitpunkte durch (Zeit startet nicht neu, solange die gleiche Bewegung folgt).
- Effekt `splash`: `[{t:0, motion:"park"}, {t:0.27, motion:"splash"}]` – spritzt ab t = 0.27 (ca. 1,6 s).
- Abblenden: `"fade": [tStart, tEnde, Stärke]` in einem Shot (z. B. `[0.84, 0.97, 0.9]`), Texte bleiben sichtbar.
- Garten-Bewegungen Dummy: `dig, hithard, stiff, uncover, lift, carry, lower, push, retreat, mark, warn, call`.
  `hithard`: Spaten trifft bei ca. 0,4 s, Rückprall, ab ca. 1,6 s erstarrt (= `stiff`). `uncover`: hinknien (1 s),
  dann Erde wegschieben. `lift`: Hocke bis 0,8 s, greift bis 1,2 s, hebt hoch bis 2,2 s (Bombe mit
  `"attach": "dummy"` passend dazu: bei 1,2 s `x 0, y −0.05, z 0.5`, bei 2,2 s `x 0, y 0.95, z 0.4`, face −90).
  `lower`: legt in ca. 0,9 s nach vorn ab (Bombe dann `"attach": "schubkarre"`, `x 0, y 0.48, z −0.15, face 90`).
  `push`: Schubkarre steht 1,15 m vor dem Dummy in Blickrichtung; Karre bekommt ebenfalls `push` (rollt, Rad dreht).
  `mark` + Warnstab `plant` am selben Zeitpunkt starten: Stab 0,44 m vor dem Dummy, wird 0,3–0,9 s in die Erde
  gedrückt. Warnstab in der rechten Hand (z. B. bei `retreat`): `"attach": "dummy", x −0.3, y 0.08, z 0.22`.
  Warnstab `show` = steckt in der Erde. Spaten `park` = liegt, `stand` = steckt in der Erde.
  Fliegerbombe: `buriedbomb` = mit Erdkrümeln, `park` = sauber; `tilt` (Grad, + = Spitze nach unten). Länge 1,15 m.
- Garten-Koordinaten (`src/stage/Garden.tsx`): Beet x −1.8 … 2.6, z −2.6 … 1.4 (links Gemüsereihen), Grabstelle
  (0.3, −0.5); Bombe dort halb in der Erde: `x 0.3, z −0.5, y −0.1, face 90, tilt 14`. Zaun hinten z = −7
  (Nachbar am Zaun: (1.6, −7.7), face 180), Nachbarhaus (3.5, −16), Gartenhaus (−6, −4.4), Apfelbaum (6.2, −3.5),
  eigenes Haus ab z ≈ 16. Kamera für Optionen/Countdown: weit oben hinter dem Zaun, z. B. `[2.6, 7.6, −13]` mit
  Blick `[0.3, −1.15, 0]` (Dummy + Bombe zwischen Überschrift und Karten).
- Burg-Bewegungen Dummy: `cross, slip, gasp, crawl, tug, backfloat, backswim, edgehold, edgewave`.
  Im Wasser gilt y relativ zur Wasseroberfläche: aufrecht (`gasp, tug, edgehold, edgewave`) ca. −1.4 … −1.8,
  Bauchlage `crawl` ca. −0.3 (−0.75 … −0.9 = geht kurz unter), Rückenlage (`backfloat, backswim`) −0.15.
  `backfloat` legt sich in 1,2 s aus dem Aufrecht-Treten zurück (y gleichzeitig von −1.55 auf −0.15 ziehen);
  in Rückenlage zeigt der Kopf ENTGEGEN der Blickrichtung `face` (face 0 → Kopf Richtung +z). `edgehold/edgewave`
  richten sich in 1 s aus der Rückenlage auf; am Ufer: `x 3.1, z 2.62, y −1.55, face 180`.
  `slip`: Fuß rutscht 0–0,35 s weg, danach Fallen mit rudernden Armen (Fallweg über Zeitpunkte, z. B. aus der Brücke heraus).
  Werte (weich, gelten weiter): `jacket`, `pants` (0/1), `breath` (Atemzüge/s, z. B. 1.7 = hektisch, 0.35 = ruhig),
  `cold` (Kälte-Symbol 0 … 2), `spray` (Spritzwasser 0 … 1, bei `crawl` vor dem Körper).
- Zugbrücke (`zugbruecke`): `{x 0, z −3, y 1.0, face 180, motion "park", tilt 0}` = unten, `tilt 84` = oben.
  Dummy darauf mit `"attach": "zugbruecke"` (z = Abstand vom Tor 0 … 6.4, x seitlich ±1.2, face 180 = Richtung Tor).
- Shot-Feld `"timer": [tStart, tEnde, Sekunden]` = Stoppuhr oben rechts (Zeitraffer 0:00 → Sekunden, dann grün, blendet aus).
- Burg-Koordinaten (`src/stage/Castle.tsx`): Graben-Wasser y = 0 zwischen z −3 (Burgmauer/Tor) und z +3 (Ufermauer,
  Oberkante 0.45), Ufer steigt bis y 1.0 (ab z ≈ 5), Brückenkopf |x| < 1.5, z 3.4 … 5. Sturzstelle im Video (2.1, 0.6).
  Kamera für Optionen/Countdown: `[4.4, 3.0, 10]` mit Blick `[1.8, −1.5, −2]` (Dummy im Wasser zwischen Überschrift und Karten).
- Kamera: `{ "t", "pos": [x,y,z], "look": [x,y,z] | "dummy" | "bear" | "car" | "dummy+bear", "fov"? }`
- Wald-Koordinaten: Weg entlang der z-Achse bei x = 0 (−20 … +24 gerade), Kletterbaum bei
  (3.3, −2.0). Bäume stehen ab ca. 2,2 m neben dem Weg → Kamera auf dem Weg halten (|x| < 1,5),
  sonst steht ein Baum im Bild.
- Pilot: Der Bär steht bei z = −14 (Bildwirkung); im Text heißt es 30 Meter. Vom Inhaber so freigegeben.
- Waldlichtung-Koordinaten (`src/stage/Clearing.tsx`): schmaler Pfad bei x = 0, Bäume nur hinten (z < −8)
  und links (x < −7), Heidekraut v. a. rechts. Warmer Stein bei (0.95, −0.3), Oberseite y ≈ 0,26
  → Schlange darauf: `x 0.7, z −0.2, y 0.26`. Kein Kletterbaum.
- Seeufer-Koordinaten (`src/stage/Lake.tsx`): Wasser bei y = 0, See bei −z, Uferlinie z ≈ 3.2, Böschung bis
  z ≈ 6.8 (1,1 m hoch), Uferweg bei z ≈ 8.5 entlang x, Bäume ab z ≈ 11.7 (Kamera davor halten!). Holzsteg bei x ≈ 8.5.
  Schilf nur bei x > 4.2 und x < −18 (Kamera-Bereich links frei). Auf dem See ist „Boden“ = Wasseroberfläche:
  Auto `y −0.6` = 60 cm eingesunken. Kamera unter y = 0 → Unterwasser-Ansicht (Licht, Teilchen, Strahlen).
  Auto im Video treibt bei `x 0, z −1, face 0`; Kamera auf der Fahrerseite (x negativ).
- Meeresstrand-Koordinaten (`src/stage/Beach.tsx`): Wasser bei y = 0, Meer bei −z, Wasserlinie z ≈ 0. Sehr flach:
  z −5 ≈ 25 cm tief, z −11 ≈ 55 cm, ab z ≈ −12 schnell tief (z −16 ≈ 1,5 m, ab −22 ca. 3 m). Figuren stehen auf dem Grund;
  bei `swim`/`struggle` gilt y relativ zur Wasseroberfläche (swim −0.3, struggle ca. −1.6 … −1.75).
  Dünenzaun z ≈ 10, Dünen ab z ≈ 11, Buhnen bei x ≈ −15 / +17, Sonnenschirm bei (4.5, 5).
  Petermännchen-Video: Fisch bei (0, −4.9), Dummy sitzt bei (0, 1.2, face 0), Schüssel bei (0, 0.88).
- Kamera planen: `scripts/kamera_proj.py` rechnet Weltpunkte in Bild-Pixel um (proj(kamera, blickpunkt, punkte)). Faustregel: für den ganzen stehenden Dummy ca. 5–6 m Abstand,
  wenn zusätzlich Karten/Kopfzeilen im Bild sind; sitzender Dummy ca. 5–6 m (zwischen Überschrift und Karten).
- Kamera-Faustregel Auto: Für das ganze Auto ca. 10–11 m Abstand (das Hochformat ist nur ca. 22° breit),
  für Fenster + Tür ca. 6 m.
- Kamera-Faustregel: Das Bild ist schmal (Hochformat, fov 38). Für den ganzen stehenden Dummy ca. 4–5 m
  Abstand, für den sitzenden ca. 4 m. Unten liegen Untertitel (ab ca. y 1250), oben Kopfzeilen.

## Dateien

```
scenarios/            Ein Video = eine JSON-Datei (fachliche Texte – nicht ändern!)
src/Root.tsx          Meldet jedes Szenario automatisch als Video an + Baukasten + Test3D
src/QuizVideo.tsx     Der Ablauf (Abschnitte → Bildschirm-Elemente + 3D-Szene)
src/AudioLayer.tsx    Tonspur (Stimme, Atmo, Effekte, Lautstärken)
scripts/voice.ts      Stimme erzeugen (Cache)   scripts/sfx.ts  Soundeffekte erzeugen (Cache)
audio-cache/          Alle bezahlten ElevenLabs-Dateien (Hash-Namen) – nie löschen
src/Scene3D.tsx       3D-Leinwand: Bühne, Figuren, Kamera
src/data/             Typen, Prüfung, Zeitplan (timeline.ts: Längen, 61-s-Regel)
src/stage/            Bühnen (Forest.tsx = Wald-Baukasten + Wald, Clearing.tsx = Waldlichtung, Lake.tsx = Seeufer,
                      Beach.tsx = Meeresstrand, Garden.tsx = Garten, Castle.tsx = Burg)
src/actors/           Figuren (Dummy.tsx, Bear.tsx, Snake.tsx, Car.tsx, Weever.tsx = Petermännchen) + Objekte
                      (Basin.tsx = Schüssel, Thermometer.tsx = Schild) + Bewegungen; index.tsx = Anhängen ("attach")
src/effects/          Aufleuchten (Flash), Bewegungslinien (SpeedLines), Platschen (Splash), Kälte-Symbol (Cold), Spritzwasser (Spray)
src/ui/               Warnschild-UI, Farben (theme.ts), Schrift, Symbole, Sichere Bereiche
src/Showcase.tsx      "Baukasten": jede Bewegung einzeln zum Anschauen
scripts/check.ts      npm run check → Aufbau + Mindestlänge aller Szenarien prüfen
review/               Gesicherte Standbilder zur Freigabe (Pilot: phase3/; weitere Videos: review/<id>/)
```

## Befehle

- `npm run check` – prüft alle Szenarien (Aufbau, Länge ≥ 61 s, nimmt echte Sprachlängen)
- Video (volle Größe): `npx remotion render <id> out/<id>.mp4` → nach `review/final/<id>.mp4` kopieren
- Vorschau daraus: `ffmpeg -i review/final/<id>.mp4 -vf scale=540:960 -crf 26 -c:a copy review/vorschau/<id>-vorschau.mp4`
- Rendern dauert in der Cloud lange (3D per Software) → im Hintergrund starten.
- **Empfohlen:** `bash scripts/render-chunks.sh <id>` rendert in Stücken (je 240 Bilder) + Tonspur getrennt und
  setzt alles zu `review/final/<id>.mp4` zusammen. Wird die Cloud mittendrin neu gestartet: denselben Befehl
  erneut starten – fertige Stücke (in `out/chunks/<id>/`) werden übersprungen. Fortschritt im Log mitschreiben,
  z. B. `> out/render-<id>.log`.
- `npm run studio` – Vorschau-Oberfläche
- Standbild: `npx remotion still <id> out/bild.png --frame=150`
- Mit sicheren Bereichen: `--props='{"scenarioId":"<id>","showSafeZones":true}'`
- Mehrere Bilder: `npx remotion render <id> out/frames --frames=150,480 --image-format=png`
- Viele Standbilder auf einmal (schneller): `node scripts/stills.mjs auftrag.json`
  (Liste aus `{comp, frame, out, props?, scale?}`); Abschnitts-Startbilder:
  `node --experimental-strip-types --no-warnings scripts/frames.ts <id>`
- Baukasten-Ansicht: Komposition `Baukasten`
- Die 61-s-Prüfung steckt auch in `calculateMetadata` (src/Root.tsx): beim Rendern bricht
  Remotion mit „STOPP …“ ab, wenn das Video zu kurz wäre.

## Technik-Notizen

- Start der Vorschau-Oberfläche: `npm run studio`
- Animationen nur über `useCurrentFrame()` (nie `useFrame()` aus react-three-fiber).
- In `<ThreeCanvas>` müssen `<Sequence>` immer `layout="none"` haben.
- **3D in der Cloud:** OpenGL-Renderer `swangle` (in `remotion.config.ts` gesetzt) – getestet,
  funktioniert. `angle`, `swiftshader`, `egl` funktionieren hier NICHT.
- **Browser in der Cloud:** Remotion kann seinen eigenen Browser nicht herunterladen
  (remotion.media nicht erreichbar). `remotion.config.ts` nimmt automatisch den
  vorinstallierten Chrome Headless Shell unter `/opt/pw-browsers/...`, falls vorhanden.
- Skills liegen in `.claude/skills/` (Remotion Best Practices + ElevenLabs
  text-to-speech, sound-effects, speech-to-text). Vor Remotion-Arbeit dort nachlesen.
- ElevenLabs: in der Claude-Cloud wird der Schlüssel für `api.elevenlabs.io` automatisch
  vom Proxy ergänzt; lokal kommt er aus `.env` (`ELEVENLABS_API_KEY`).

## Lizenz Remotion

Free License: Einzelpersonen dürfen Remotion kostenlos nutzen, **auch kommerziell**
(ebenso Firmen mit bis zu 3 Mitarbeitenden). Eine Company License wird erst nötig, wenn
das Projekt von einer größeren gewinnorientierten Firma betrieben wird.
Quelle: LICENSE.md im Remotion-Repository (Stand Remotion 4.0.542).
