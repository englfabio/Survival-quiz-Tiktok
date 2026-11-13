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
6. **Reihenfolge immer:** 1. Standbilder → 2. Stimme → 3. Video. **Seit dem Herrenloser-Koffer-Video gilt
   der Durchlauf-Modus als Standard (siehe unten) – keine Zwischenfreigaben mehr.** Seit dem Kreuzotter-Video (vom Inhaber so entschieden):
   Das Video wird nur EINMAL in voller Qualität gerendert; die Vorschau (halbe Größe) wird daraus
   per ffmpeg verkleinert. Freigabe der Vorschau = Video ist fertig zum Hochladen.
   Gibt es Änderungswünsche, wird nach der Änderung neu gerendert.
7. **Fachliche Texte in `/scenarios` nie ohne Erlaubnis ändern** – auch nicht kürzen,
   umformulieren oder Satzzeichen „verbessern“. Sie sind fachlich geprüft.
8. **Mindestlänge 61 Sekunden prüfen.** Ist ein Video kürzer: NICHT rendern, sondern
   dem Inhaber Bescheid geben.
9. **Sichere Bereiche einhalten** (siehe unten).
10. Arbeiten in **Phasen**; nach jeder Phase Commit + Push und kurz berichten (angehalten wird nur bei echten Problemen, siehe Durchlauf-Modus).
11. **Vorhandene Bausteine (Bühnen, Figuren, Objekte, Bewegungen, Kleidung) dürfen und sollen wiederverwendet
    werden, aber nur, wenn sie wirklich zur Szene passen. Wenn etwas Neues besser aussieht oder besser passt,
    wird es neu gebaut – keine Scheu vor Neuerstellung. Neue Bausteine werden immer wiederverwendbar in den
    Baukasten aufgenommen.** Die Liste unter „Vorhandene Bausteine“ wird bei jedem neuen Baustein aktualisiert.
12. **Offene Videos zuerst:** Ist bei Beginn einer Sitzung ein früheres Szenario noch nicht fertig (kein finales Video
    in `review/final/`), wird es zuerst im Durchlauf-Modus fertiggestellt, danach geht es mit dem neuen Video weiter.
    Nicht anhalten, nur kurz Bescheid sagen.
13. **KI-Hinweis:** Jede Videobeschreibung (`publishing.description`) endet nach den Hashtags mit einer Leerzeile und
    genau diesem Satz: `Hinweis: Das gesamte Video ist KI-generiert.` (auch in `review/final/<id>-texte.txt`).
    Steht der Satz nicht in der vom Inhaber gelieferten Beschreibung, wird er ergänzt.

## Durchlauf-Modus (STANDARD für jedes Video – vom Inhaber so festgelegt)

Der Durchlauf-Modus gilt ab jetzt für **jedes** Video, auch wenn er im Prompt nicht erwähnt wird
(„sofort rendern“: Bausteine bauen, Standbilder selbst prüfen, Stimme erzeugen, finales Video rendern, pushen):

- Alle Schritte (Bausteine → Standbilder → Stimme → finales Video) werden **ohne Zwischenfreigabe in einem Rutsch** erledigt.
  Commit + Push nach jedem Schritt (Regel 3) gilt weiterhin.
- Die **Standbilder werden trotzdem gerendert**, aber Claude prüft sie selbst:
  sichere Bereiche eingehalten, alles gut lesbar, alle Texte exakt aus der Szenario-Datei, nichts Verstörendes zu sehen.
- Claude **hält NUR an und fragt**, wenn:
  - bei der Selbstprüfung etwas nicht stimmt,
  - das Video kürzer als 61 Sekunden wäre,
  - bei der Stimme ein Fehler auftritt oder die ElevenLabs-Credits knapp werden,
  - etwas an den fachlichen Texten geändert werden müsste,
  - sonst ein Fehler auftritt, der sich nicht selbst beheben lässt.
- Zwischengespeicherte Audios (`audio-cache/`) werden wie immer wiederverwendet.
- Am Ende: fertiges Video + Standbilder zeigen und zusammenfassen, was wiederverwendet und was neu gebaut wurde.
- Nur wenn der Inhaber im Prompt ausdrücklich Freigaben verlangt, wird nach den einzelnen Schritten angehalten.

## Positionsplan (Reihenfolge der richtigen Antwort)

Die richtige Antwort soll nicht immer an derselben Stelle stehen (vom Inhaber gewünscht).
- magnetfischen-granate → 2. Push
- herrenloser-koffer → 3.
- pistole-wald → 1. Push
- geldkoffer-million → 2. Push

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

## Vorhandene Bausteine (Baukasten, wiederverwendbar)

> Regel (vom Inhaber): Vorhandene Bausteine (Bühnen, Figuren, Objekte, Bewegungen, Kleidung) dürfen und sollen
> wiederverwendet werden, aber nur, wenn sie wirklich zur Szene passen. Wenn etwas Neues besser aussieht oder
> besser passt, wird es neu gebaut – keine Scheu vor Neuerstellung. Neue Bausteine werden immer wiederverwendbar
> in den Baukasten aufgenommen. **Diese Liste immer aktuell halten.**

- **Bühnen:** Wald mit Weg (`wald`), sonnige Waldlichtung am Waldrand (`waldlichtung`, Variante des Waldes),
  Seeufer mit Uferweg, Böschung, bewegtem See + automatischer Unterwasser-Ansicht (`seeufer`),
  Meeresstrand an Nord-/Ostsee mit flachem, klarem Wasser, Spülsaum-Schaum, Dünen mit Strandhafer, Dünenzaun,
  Buhnen, Sonnenschirm (`meeresstrand`, Wellen wie beim Seeufer; Dummy dort automatisch barfuß),
  Hausgarten mit Rasen, umgegrabenem Gemüsebeet (dunkle Erde, Grabstelle), Holzzaun, Gartenhaus, Nachbarhaus,
  eigenem Wohnhaus, Apfelbaum (`garten`, freundliches Tageslicht, Atmo = Vogelgezwitscher vom Wald),
  Steinburg im Winter mit Torhaus, Rundtürmen, Burggraben (dunkles, kaltes Wasser, Eisschollen), kahlen Bäumen,
  Raureif, leichtem Schneefall, kaltem bläulichem Licht (`burg`, Atmo = `winter-atmo`),
  kleiner Friedhof bei Nacht mit Vollmond, Sternen, Bodennebel, Grabsteinen/Kreuzen, Grablichtern, Laternen,
  Eisenzaun, Kapelle, kahlen Bäumen, „Zombie-Grab“ (`friedhof`, leicht gruselig, aber freundlich, Atmo = `nacht-atmo`),
  helles gefliestes Badezimmer mit Spiegel, Badewanne, Erste-Hilfe-Schrank, Verbandskasten (`badezimmer`),
  gemütliches Wohnzimmer mit Sofa, Teppich, Couchtisch, Stehlampe, Regal (`wohnzimmer`, Atmo = `uhr-ticken`),
  helle Arztpraxis mit Schreibtisch, Laptop, zwei Stühlen, Liege, Sehtafel, Fenster (`arztpraxis`),
  gemütliches Wohnzimmer an Weihnachten am Abend mit Sofa, Teppich, Beistelltisch mit Plätzchen, Stehlampe, Regal,
  Fenster mit Schnee/Nachthimmel/Nachbarhäusern draußen, Fensterstern, Girlande, Zimmertür zum Flur (`weihnachtszimmer`,
  Atmo = `feuer-knistern`), Wohnungsflur mit Zimmertür, Wohnungstür, Garderobe, Läufer (`flur`),
  Mehrfamilienhaus von außen bei Nacht im Schnee mit Haustür, Vordach, Weg, Gehweg, Straße, Straßenlaternen,
  verschneiten Tannen, Schneefall (`hauseingang`, Atmo = `winter-atmo`),
  helle Küche mit Küchenzeile (Kühlschrank, Spüle, Kochfeld, Oberschränke, Fliesenspiegel), rotem Toaster, Kabel zur gut
  sichtbaren Doppel-Steckdose, Besen mit Holzstiel in der Ecke, Wanduhr, Fenster (`kueche`, `src/stage/Kitchen.tsx`, Atmo = `uhr-ticken`),
  Hausflur ohne Weihnachtsdeko (`hausflur`, sonst wie `flur`; Platz für den Sicherungskasten rechts neben der Wohnungstür),
  Boxring mitten in der roten australischen Steppe bei Sonnenuntergang (`outback`, `src/stage/Outback.tsx`: Ring mit Seilen + Eckpolstern,
  Ringboden 0,5 m hoch, Hocker in der roten Ecke, Grasbüschel rund um den Ring, Eukalyptusbäume, Tafelberge, tiefstehende Sonne,
  Klapptisch neben dem Ring, freie Zahnstelle im Gras; Atmo = `outback-atmo`),
  kleine Zahnarztpraxis mit Behandlungsstuhl (türkis, Lehne nach hinten), Behandlungslampe am Schwenkarm, Instrumentenablage,
  Schrank mit Waschbecken, Zahn-Poster (`zahnarztpraxis`, `src/stage/Dental.tsx`),
  Wohnküche = Küche + Spülmaschine (Edelstahl, rechts in der Küchenzeile) + Küchentisch (Mitte x −0.2, z 0.55, Platte 0,76 m) + roter
  Stuhl (`wohnkueche`, `src/stage/Kitchen.tsx`, Atmo = `uhr-ticken`),
  kleines gemütliches Schlafzimmer am Abend (`schlafzimmer`, `src/stage/Bedroom.tsx`, Atmo = `uhr-ticken`: Bett an der Rückwand rechts, Nachttisch
  mit Lampe, Schreibtisch unter dem Fenster links (Abendhimmel + Mond), Leseecke vorn links mit Stuhl + rundem Beistelltisch, Tür rechts, Teppich,
  Poster, Pflanze), Aufzugkabine mit Stahlwänden, Spiegel, Handlauf, Tastenfeld, Stockwerk-Anzeige + zwei Mitfahrenden (`aufzug`, Atmo =
  `aufzug-summen`), volle U-/S-Bahn mit Sitzbänken, gelben Stangen, Haltegriffen, Tunnel-Lichtern, vielen Fahrgästen (`bahn`, Atmo = `bahn-atmo`),
  alte Kaimauer an einem Kanal in der Stadt (`kanal`, `src/stage/Canal.tsx`, Atmo = `see-atmo`): Uferweg mit Kopfsteinpflaster, Randsteine, Quader-
  Mauer, bewegtes Wasser 1,3 m unter dem Weg, gegenüber zweite Mauer mit Geländer + Häuserzeile, Steinbogenbrücke links, Bäume, Laternen, Poller.
  Bahnhof (`bahnhof`, `src/stage/Station.tsx`, Atmo = `bahnhof-atmo`): Bahnsteig (Gleis 3) mit Bahnsteigkante, weißer Sicherheitslinie,
  Blindenleitstreifen, Gleisen mit Schotter/Schwellen, gegenüberliegendem Bahnsteig, Bänken, Fahrkartenautomat, hängender Anzeigetafel
  (erfundene Ziele, kein Logo), Stahlstützen, Glas-Hallendach mit Stahlbögen; dahinter Bahnhofshalle mit Fundbüro-Schalter (Schild „FUNDBÜRO“),
  Kiosk, Info, Ausgang, Bahnhofsuhr, Hängelampen. Variante `bahnhof-voll` = volle Halle mit vielen gehenden/wartenden Reisenden (freier Gang
  zum Fundbüro x −1 … 6.5). Wiederverwendbar (z. B. Handy im Gleis: Gleisbett y −0,76, Figuren dort y relativ zum Gleisbett).
  Herbstwald (`waldherbst`, `src/stage/AutumnForest.tsx`, Atmo = `wald-atmo`): Wald mit Weg wie `wald`, Laubbäume orange/rot/gelb, viel Laub
  auf dem Weg (Baustein `LeafLitter`), Laubhaufen an der Fundstelle `PISTOL_SPOT` (0.35, −1.2), kleine baumfreie Lichtung rechts vom Weg
  (x 1.4 … 14, z −7 … 9) für Kameras, Sonne von rechts. Waldrand an einer Straße (`waldstrasse`, gleiche Datei): Waldweg endet bei z 4.6 am
  Gehweg (z 5 … 7), Straße mit Mittellinie (z 7 … 13), gegenüber Gehweg, Hecken, vier Häuser (ab z 18), Straßenlaternen; Boden flach.
  Wald-Baukasten (`makeForestStage`) kann jetzt: eigene Bodenhöhe (`ground`), Weg nur in einem Bereich (`pathRange`), Deko-Sperrzonen (`decoAllowed`).
  Reisende als Bühnen-Bauteil mit Gehbewegung + optionalem Rollkoffer: `Passenger` in `src/stage/Station.tsx`.
  Stadtpark in der Abenddämmerung (`park`, `src/stage/Park.tsx`, Atmo = `outback-atmo` = Grillen + Abendwind): Kiesweg entlang x (z −1 … 1),
  Parkbank (0, −1.65) Blick +z (Bauteil `ParkBench`), Platz „neben der Bank“ `PARK.beside` (1.3, −1.55), Laternen an (Bauteil `ParkLantern`) bei z −1.45
  (x −3.4, 4.2), Mülleimer, Bäume, Büsche, Häuser mit erleuchteten Fenstern, Abendrot; vorn (|x| < 11, z < 24) frei für Kameras.
  Polizeiwache (`polizeiwache`, `src/stage/PoliceStation.tsx`, Atmo = `uhr-ticken`): Wachraum W 6.4 × D 5.4, Tresen (Bauteil `ServiceCounter`) x −2.2 … 2.2,
  Platte 1,05 m, Vorderkante z −0.45; Tafel „POLIZEI“ (ohne Logo), Pinnwand, Uhr, Aktenschrank, Schreibtisch mit Bildschirm, Klingel, Schild „ANMELDUNG“,
  Fenster mit Abendhimmel, Tür rechts (Eingang ca. (2.75, 0.75)), Wartestühle, Pflanze. Besucher vor dem Tresen z ≈ −0.15 (face 0), Beamter dahinter (0.1, −1.68, face 180).
  Stilisierte Mitmenschen ohne Gesicht als Bühnen-Bauteil: `Commuter` (Farben, Arm hoch zum Haltegriff) in `src/stage/Bedroom.tsx`.
  Weihnachts-Bühnen in `src/stage/Christmas.tsx` (Bausteine `HoleWall` = Wand mit Tür-/Fensteröffnungen, `Snowfall`, `SnowyPine`).
  Die drei Innenräume entstehen aus dem Raum-Baukasten in `src/stage/Rooms.tsx` (Möbel `Chair`, `Sofa` wiederverwendbar).
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
  zerren, auf dem Rücken treiben, ruhig in Rückenlage schwimmen, am Rand festhalten (+ um Hilfe winken),
  in den Arm gebissen zusammenzucken + Arm halten, Unterarm halten, Bissstelle anschauen, Pflaster aufkleben,
  auf Sofa/Stuhl sitzen, auf dem Sofa warten (Finger trommeln, Blick Uhr ↔ Arm), Arm unter fließendes Wasser halten,
  Desinfektionsspray sprühen, Kompresse auflegen + verbinden, sitzen + Impfpass zeigen, sitzen + nicken/erklären,
  entsetzt zurückweichen, mit dem Eimer rennen (oder stehen), kniend Geschenke hervorziehen, Tür zuziehen,
  telefonieren + mit links winken,
  zitternd festhängen (`stuck`), von hinten an den Armen packen (`grabarms`), mit nassem Handtuch schlagen (`towelswing`),
  Schalter im Sicherungskasten umlegen (`switchoff`), mit dem trockenen Besenstiel schieben (`broompush`),
  hinknien + telefonieren (`kneelcall`),
  Boxhaltung (`boxguard`), getroffen werden + taumeln (`hitstagger`), benommen mit Hand an der Wange (`dazed`),
  hinknien + Zahn im Gras suchen (`searchkneel`), Zahn vorsichtig an der Krone hochheben (`pickcrown`), Zahn halten (`holdtooth`),
  Zahn unter dem Wasserhahn abspülen (`rinsetooth`), Zahn ins Taschentuch wickeln (`wraptooth`), Zahn ablegen in Glas/Box/Milch
  (`placetooth`), halb liegend im Behandlungsstuhl (`dentalsit`),
  erschrocken auf den angebissenen Tab in der Hand starren (`tabstare`), Finger bis kurz vor den Mund – nur angedeutet (`fingermouth`),
  Glas Milch trinken (`drinkmilk`), ins Küchenpapier ausspucken (`spit`), Tab-Packung in den Oberschrank räumen + Tür zudrücken (`stowtabs`),
  mit dem Rücken an die Wand gedrückt, Hände flach an der Wand (`wallpress`), verkrampfen + Fäuste ballen + zittern (`clench`),
  hinsetzen auf Stuhl/Bett 0,45 m (`bedsitdown`, danach ruhig atmen), aufrecht sitzen + Bauchatmung 2 s ein / 4 s aus, Hände auf dem Bauch (`sitbreathe`),
  Wasser trinken + Coolpack in den Nacken über die Werte `sip` / `pack` (0 … 1, bei `sitbreathe`/`bedsitdown`), angespannt stehen (`uneasy`),
  in der Bahn am Haltegriff festhalten (`holdstrap`),
  Magnet an der Leine werfen (`magthrow`), Seil Hand über Hand hochziehen (`haul`), erschrocken erstarren mit Seil in der Hand (`startle`),
  langsam in die Hocke + Hängendes vorsichtig absetzen (`lowerset`), Granate festhalten + Magnet abziehen + aufstehen (`unhook`),
  Granate vor der Brust halten (`holdgren`), mit der Granate zum Werfen ausholen (`windup`), durchs Beifahrerfenster etwas auf den Sitz legen (`placeseat`),
  sich umschauen + Koffer bemerken (`lookaround`), zum Koffer beugen + an den Schnallen fummeln (`bendopen`), Koffergriff greifen + Teleskopgriff
  ausziehen (`grabcase`), Rollkoffer hinter sich herziehen (`rollcase`), auf etwas zeigen + mit jemandem rechts daneben reden (`pointtalk`),
  verlegen am Hinterkopf kratzen + Hand nach vorn (`sheepish`), etwas überreichen (`handover`), Absperrband abrollen beim Gehen (`tapewalk`),
  zuhören + nicken (`listen`) – alle auch für Kumpel, Bahnmitarbeiterin, Bundespolizist;
  erschrocken stehen bleiben + auf den Boden zeigen (`spotpoint`), hinknien + etwas aufheben + vor sich halten (`pickup`), in die rechte Jackentasche
  stecken (`pocket`), mit beiden Händen an etwas herumfummeln (`fiddle`), einen Schritt zurücktreten (`stepback`), Handy vor der Brust + tippen
  (`markphone`), Stopp-Hand heben (`stophand`) – auch für Polizist/Polizistin/Nachbar;
  vorhanden und wiederverwendet: langsam rückwärts weggehen (`retreat`), andere warnen (`warn`), telefonieren (`call`);
  Geldkoffer: kniend Koffer umkippen + aufklappen + erstarren (`opencase`), kniend umschauen (`kneellook`), Deckel zudrücken (`closecase`),
  Koffer greifen + unter den linken Arm klemmen (`tuckcase`), geduckt schleichen mit Koffer unterm Arm (`sneak`), Bündel aus dem Koffer in die Jacke
  stecken (`grabwads`, alle 1,5 s), mit Koffer in der Hand gehen/stehen (`carrycase`/`holdcase`, Koffer `hand` 1 + `drop` 0.4), Koffer auf den Tresen
  heben (`setcounter`), am Tresen Formular ausfüllen (`fillform`, Kugelschreiber automatisch), jubeln (`cheer`). Achtung: Auf der Wache face 0 (zum Tresen).
- **Panik-Darstellung (Dummy):** Herz-Symbol neben dem Kopf (Wert `heart` = Schläge/s, 0 = aus; schnell = zuckende Striche, Ton `herzschlag`
  pro Schlag im Choreo-Skript), hektisches Atmen = `breath` (Atemwolken) + `heave` (Brustkorb hebt sich 0 … 1), Bauch hebt/senkt sich bei `sitbreathe`
  mit ruhigen Atemwolken beim Ausatmen. Shot-Feld `"tight": [{t, v}]` = Raum wird eng (leichter Zoom + dunkle Vignette, 0 … 1),
  Shot-Feld `"breathGuide": [tStart, tEnde]` = Atem-Anzeige „Ein · kurz / Aus · lang“ (6-s-Takt ab Beginn, passt zu `sitbreathe` ab gleicher Zeit)
- **Wunde am Arm (Dummy, linker Unterarm):** kleiner roter Bisspunkt (`armbite`), roter Schimmer/Rötung, die wächst
  (`redness` 0 … 2), Pflaster (`plaster` 0 … 1, Rötung scheint drunter durch), Kompresse + Mullbinde (`dressing` 0 … 1)
- **Zähne (Dummy):** stilisierte Zahnreihe vorn am Kopf (`teeth` 0/1) mit Zahnlücke (`gap` 0/1, kein Blut);
  rote Boxhandschuhe (`gloves` 0/1); Zahn in der Hand (bei `pickcrown/holdtooth/rinsetooth/placetooth` automatisch, Aussehen über
  die Dummy-Werte `gray`, `mark`), Taschentuch mit Zahn auf der linken Hand (bei `wraptooth`, Wert `wrap` 0 offen … 1 eingewickelt)
- **Schaum + Röntgen-Hinweise (Dummy):** comichafte Schaumblasen am Mund (`foam` 0 … 2, `src/effects/Foam.tsx`), rosa Lunge +
  roter Pfeil vom Mund hinein + Warndreieck (`lunge` 0 … 1), Magen + Pfeil zum Blutstropfen + grüne Giftpunkte + Warndreieck (`blut` 0 … 1,
  beides `src/effects/BodyHint.tsx`, liegt immer sichtbar über dem Körper)
- **Kleidung (Dummy):** Winterjacke (`jacket` 0 … 1) und lange Hose (`pants` 0 … 1) – an/aus, Ärmel rutschen beim Ausziehen
- **Fragezeichen über jeder Figur mit Dummy-Körper:** Wert `question` 0 … 1 (z. B. verwunderte Polizisten).
- **Augenbrauen** (Figuren mit Dummy-Körper): Wert `brow` – ab 0,01 sichtbar, 1 = rechte Braue hochgezogen („Hm?“).
- **Geldbündel in der Jacke** (Dummy mit `jacket` 1): Wert `stash` 0 … 3 = so viele Bündel schauen vorn aus der Jacke.
- **Weitere Figuren:** Braunbär (`bear`: stand, alert, sniff, walk, run, climb), Kreuzotter (`snake`: coil, slither,
  strike), Petermännchen (`petermaennchen`: buried, finup, swimaway) – gleicher Low-Poly-Look wie der Dummy;
  Nachbar (`nachbar`: gleiche Figur wie der Dummy, aber blau – kann alle Dummy-Bewegungen),
  Zombie (`zombie`: gleicher Low-Poly-Look, grünlich-graue Haut, zerrissenes Hemd mit schiefer Krawatte, zerfranste
  Hose, Kulleraugen – witzig, kein Blut; Bewegungen shamble, reach, chomp, confused (mit Fragezeichen), wave, stand),
  Arzt/Ärztin (`arzt`: Dummy-Figur in Türkis mit weißem Kittel + Stethoskop – kann alle Dummy-Bewegungen),
  Kumpel-Dummy (`kumpel`: zweiter Crashtest-Dummy in Orange – kann alle Dummy-Bewegungen, für alle Szenen „jemandem helfen“),
  Zitteraal (`zitteraal`, `src/actors/Eel.tsx`: niedlicher Low-Poly-Aal, blaugrau mit leuchtend gelben Streifen, Kulleraugen;
  schaut aus der Steckdose: `peek` = herausgucken, `wiggle` = zappeln, `withdraw` = beleidigt zurückziehen),
  Känguru (`kaenguru`, `src/actors/Kangaroo.tsx`: rotbraun, heller Bauch, große Ohren, halb geschlossene Lider + hochgezogene Braue
  = frech, rote Boxhandschuhe, ca. 1,75 m; `stand`, `guard` = Boxhaltung, `hop` = hüpfen (Weg über Zeitpunkte), `punch` = Schlag
  mit rechts (Treffer bei 0,4 s, Faust ca. 0,75 m vor ihm), `victory` = Siegerpose mit erhobenen Pfoten),
  Wal (`wal`, `src/actors/Whale.tsx`: großer, freundlicher Low-Poly-Blauwal, ca. 3,9 m lang, große Kulleraugen, rosa Bäckchen, Lächeln;
  `float` = schweben + blinzeln, `spout` = gemütlich schnaufen mit kleiner Wasserfontäne (0,3 s, dann alle 3,2 s), `appear` = erscheint mit „Plopp“,
  `shrink` = schrumpft in 2,2 s und verschwindet mit Glitzern; Werte `size` (größer) und `squish` 0 … 1 = drückt gegen die Wände; y immer mitgeben),
  Bahnmitarbeiterin (`bahnmitarbeiterin`: Dummy-Figur, Körper hell-lila, weinrote Uniform mit grauer Hose, Schirmmütze, gelbem Halstuch, Zopf –
  ohne Logo), Bundespolizist (`bundespolizist`: Dummy-Figur, hellgrau, stilisierte dunkelblaue Uniform + Mütze, ohne echte Abzeichen; hält bei
  `tapewalk` automatisch die Rolle Absperrband) – beide können alle Dummy-Bewegungen (Uniform über Prop `uniform` in Dummy.tsx, wiederverwendbar),
  Streifenpolizist + Streifenpolizistin (`polizist`, `polizistin`: gleiche dunkelblaue Uniform ohne Abzeichen, Polizistin mit Zopf),
  Hund (`hund`, `src/actors/PistolProps.tsx`: freundlicher brauner Low-Poly-Hund, wedelt; `walk`, `stand`, `sit`; Wert `leash` 1 = rote Leine zur
  rechten Hand der Figur in `holder`, Standard `nachbar` = Spaziergänger)
- **Objekte:** Auto (Kleinwagen, `car`): fahren, rollen, treiben, sinken + abkippen; Fahrerfenster, Fahrertür,
  Wasser im Innenraum, Wasserdruck-Pfeile. Für weitere Videos nutzbar (Straße, Gewitter …)
- **Objekte (Strand):** Zinkschüssel mit dampfendem Wasser (`schuessel`), Thermometer-Schild „ca. 45 °C“
  (`thermometer`), Pinzette + Eisbeutel (hält der Dummy bei `tweeze` bzw. `ice` automatisch)
- **Objekte (Garten, `src/actors/GardenProps.tsx`):** rostige Fliegerbombe mit Leitwerk (`fliegerbombe`),
  Spaten (`spaten`; hält der Dummy bei dig/hithard/stiff automatisch), Schubkarre (`schubkarre`), rot-weißer
  Warnstab mit Absperrband-Fähnchen (`warnstab`), Smartphone (`smartphone`; hält der Dummy bei `call` automatisch)
- **Objekte (Burg, `src/actors/CastleProps.tsx`):** Zugbrücke (`zugbruecke`) mit Ketten, hochklappbar über `tilt`
- **Objekte (Erste Hilfe, `src/actors/FirstAidProps.tsx`):** Waschbecken mit Unterschrank + Wasserhahn (`waschbecken`,
  `flow` = Wasser läuft), Abreißkalender (`kalender`, `flip` = Blätter fliegen, immer schneller), Wanduhr (`wanduhr`,
  `spin` = Zeiger rasen), Impfpass (`impfpass`, `open` = aufgeklappt mit Tetanus-Stempel + Haken), Verbandskasten
  (`verbandskasten`), Pflaster (`pflaster`), Desinfektionsspray (`sprayflasche`), sterile Kompresse (`kompresse`).
  Pflaster, Spray (mit Sprühnebel), Kompresse und Impfpass erscheinen bei den passenden Dummy-Bewegungen automatisch in der Hand.
- **Objekte (Feuer, `src/actors/ChristmasProps.tsx`):** Weihnachtsbaum mit Kugeln, Lichterkette, Stern, Geschenken
  (`weihnachtsbaum`, Werte `fire` 0 … 1 = Flammen bis zur Decke … 1.6 = riesig, `smoke` = Rauchschicht unter der Decke 0 … 1.5),
  stilisierte Flammen + Rauch (auch einzeln: `SmokeLayer`), Türen `zimmertuer` / `wohnungstuer` / `haustuer` (Wert `door` 0 zu … 1 offen,
  `smoke` > 0 = Glut + Rauch hinter der offenen Tür), Eimer mit Wasser (`eimer`; hält der Dummy bei `runbucket` automatisch),
  Geschenkpakete (`geschenke`; ein Paket hält der Dummy bei `pullgift` automatisch), Feuerwehrauto ohne Logos mit Blaulicht,
  Leiter, Rollläden (`feuerwehrauto`: `drive`, `park`)
- **Objekte (Strom, `src/actors/ShockProps.tsx`):** nasses, tropfendes Handtuch (`handtuch`; hält der Dummy bei `towelswing`
  automatisch), Sicherungskasten mit großem rotem Hauptschalter (`sicherungskasten`, Wert `lever` 1 = an … 0 = aus),
  Besen mit trockenem Holzstiel (`besen`, Wert `lean` = Neigung; hält der Dummy bei `broompush` automatisch),
  Doppel-Steckdose (`Socket`), Kabel (`Cable`), Toaster (`Toaster`) als Bauteile für Bühnen; Smartphone wie gehabt (bei `call`/`kneelcall`).
- **Objekte (Zahnunfall, `src/actors/ToothProps.tsx`):** einzelner Zahn (`zahn`: Krone weiß, Wurzel gelblich; `gray` 0 … 1 = wird grau,
  `mark` 1 = Krone grün + Wurzel rot, 1 … 2 = Wurzel-Rot blendet aus; `fly` = dreht sich im Flug, Bogen über Zeitpunkte; `lie` = liegt;
  `size` = größer), Papiertaschentuch (`taschentuch`, `wrap`), Glas mit Leitungswasser (`wasserglas`), Wasserhahn am Standrohr
  (`wasserhahn`, `water` 0/1 = Wasser läuft, Auslauf bei (0, 1.0, 0.17) im eigenen System), Zahnrettungsbox ohne Markennamen mit
  Zahn-Symbol (`zahnrettungsbox`, `lid` 0 zu … 1 offen, `size`), H-Milch-Packung mit Aufschrift „H-Milch“ (`hmilch`), Boxhandschuh
  (Bauteil `BoxingGlove`), Hinweisschild mit beliebigem Text (`hinweis`: Feld `"text"`, Bewegung `show`, `below` 1 = Schild unter
  der Stelle mit Zeiger nach oben, `size` = Größe, `good` 1 = grün statt rot; schaut immer zur Kamera)
- **Objekte (Vergiftung, `src/actors/TabProps.tsx`):** bunter Spülmaschinentab ohne Marke (`spuelmaschinentab`, `mark` 1 = mit Bissstelle;
  hält der Dummy bei `tabstare` automatisch angebissen), Packung Tabs mit Aufschrift „TABS“ + Warnraute (`tabpackung`, `lid` 1 = offen, Tabs schauen
  heraus; bei `stowtabs` in der Hand), großes Glas Milch (`milchglas`, `fill` 1 voll … 0 leer; bei `drinkmilk` in der Hand), Küchenpapier-Rolle
  (`kuechenpapier`), einzelnes Blatt (`papierblatt`; bei `spit` in der Hand), Oberschrank mit Kindersicherung (`oberschrank`, Ursprung unten
  hinten an der Wand, `door` 0 zu … 1 offen – Tür rechts angeschlagen, `lock` 1 = Kindersicherung eingerastet mit grünem Punkt),
  Warndreieck (`WarnBadge`), Smartphone flach liegend (`smartphone` mit Bewegung `lie`)
- **Objekte (Panik, `src/actors/PanicProps.tsx`):** Glas mit kaltem Wasser, Eiswürfeln + Kondens-Tropfen (`kaltwasser`, `fill`; beim Dummy-Wert `sip`
  automatisch in der Hand), blaues Coolpack mit Schneeflocke (`coolpack`; bei `pack` automatisch in der Hand), Herz-Symbol (`HeartBadge`)
- **Objekte (Magnetfischen, `src/actors/MagnetProps.tsx`):** runder Topfmagnet mit Öse + rotem Lackring (`magnet`, Ursprung = Öse),
  rostige, verkrustete Weltkriegs-Handgranate mit Riffeln, Sicherungsbügel und Abzugsring (`granate`, Wert `tilt` = auf die Seite legen,
  `rumble` = rüttelt), blaues Seil von der rechten Hand des Dummys zum Magneten (Magnet-Wert `rope` 1). Allgemein für Gegenstände:
  Wert `hand` 0 … 1 = in der rechten Hand des Dummys, `drop` = hängt so viele Meter darunter (pendelt leicht). Granate am Magneten:
  `"attach": "magnet", x 0, y −0.26, z 0, tilt 78`. Auto: Werte `window2` (Beifahrerfenster offen) und `rumble` (Kopfsteinpflaster).
  Bewegung `toss` = Gegenstand fliegt gleichmäßig (Weg über Zeitpunkte); Effekt `splash` mit Wert `size` (−0.55 = klein).
- **Objekte (Bahnhof, `src/actors/StationProps.tsx`):** großer Hartschalenkoffer ohne Namensschild (`koffer`: Ursprung = hintere Rollenachse,
  Front +z; Werte `handle` 0 … 1 = Teleskopgriff, `tilt` = kippen zum Ziehen, ca. 40°; zum Ziehen `"attach": "dummy", x −0.2, y 0, z −1.04, face 0`),
  rot-weißes Absperrband mit vier Pfosten (`absperrband`: Quadrat 2 × (1.4 + `size`), `fill` 0 … 1 = wie weit gespannt; Start-Ecke hinten links
  im eigenen System, mit face 90 = vorn links in der Welt), Zettel „RECHNUNG“ mit großem €-Zeichen (`rechnung`, `size`).
  Gegenstand in der Hand einer anderen Figur: Feld `"holder": "kumpel"` (bzw. `bundespolizist`, `bahnmitarbeiterin` …) + `hand` 1;
  `drop` negativ = Gegenstand über der Hand (z. B. −0.2, damit die Hand den Zettel nicht verdeckt). Smartphone wie gehabt bei `call`.
- **Objekte (Fundwaffe, `src/actors/PistolProps.tsx`):** stilisierte ältere Pistole ohne Marke mit Rost (`pistole`: Ursprung = Griffmitte, `face` =
  Richtung des Laufs wie bei Figuren, `tilt` = Lauf nach unten in Grad, `side` 1 = liegt auf der Seite, `leaves` 1 = Laub darauf, `size`; in der Hand mit
  `hand` 1, in der Jackentasche mit `"attach": "dummy", x −0.24, y 0.86, z 0.06, face 180, tilt 72`). **Regel: Lauf nie auf Personen oder Kamera** –
  `scripts/pistole-wald-choreo.py` prüft das rechnerisch (check_muzzle). Smartphone mit Karte (`kartenhandy`: Wert `pin` 0 … 1 = roter Karten-Pin
  fällt, ab 1 „Fundort gespeichert“; `tilt` = nach hinten kippen; in der Hand mit `hand` 1), Polizeiauto (`polizeiauto`: silber-blau, Aufschrift
  „POLIZEI“, keine Wappen/Logos, Blaulicht mit Wert `blue` 1; Bewegungen wie `car`).
- **Objekte (Geld, `src/actors/MoneyProps.tsx`):** NUR stilisiertes Geld (helle Bündel, graue Banderole mit „€“, keine echten Scheine/Motive/
  Seriennummern – Vorgabe des Inhabers). Silberner Metall-Aktenkoffer (`geldkoffer`: Ursprung = Boden-Mitte stehend, `tilt` 0 = steht, 90 = liegt
  (Griff +z, Scharnier −z), `lid` 0 … 1 = offen, `money` 0 … 1 = wie voll; 24 Bündel in 3 Lagen; unterm Arm `"attach": "dummy", x 0.3, y 0.86, z 0.02,
  face 90, tilt 0`), einzelnes Geldbündel (`geldbuendel`; beim Dummy `grabwads` automatisch in der Hand), Formular „FUNDANZEIGE“ (`formular`, `fill` 0 … 1
  = ausgefüllt, `pen` 1 = Kugelschreiber daneben, `size`), Taschenrechner (`taschenrechner`, Text Standard „30.010 €“, `fill` 0 … 1 zählt hoch, `tilt`),
  Kalenderblatt (`kalenderblatt`, Text Standard „6 Monate“, `show` springt auf), rundes rotes §-Schild (`paragraf`, Text Standard „§ 246“, `show`) –
  beide schauen immer zur Kamera.
- **Einfrieren** (`"freeze": t` in einem Shot): Figuren + Bühne bleiben ab t stehen, Bild wird etwas blasser,
  Kamera fährt langsam weiter. Bei falschen Optionen kommen rotes Aufleuchten + Falsch-Ton genau dann.
- **Hook-Überschrift:** `situation.hook` in der Szenario-Datei = große Überschrift oben während der Situation (nur eingeblendet).
- **Warnhinweis:** `situation.warning` (z. B. „Nicht nachmachen!“) = rotes Schild mit Warndreieck oben rechts neben der Kategorie, nur in den ersten 3 s.
- **Grünes Aufleuchten später:** Shot-Feld `"flash": t` bei der richtigen Option = grünes Aufleuchten + Richtig-Ton erst bei t statt am Anfang.
- **Harte Schnitte:** Shot-Feld `"sharpCuts": true` – die Kamera schwingt bei Schnitten nicht über (für alle neuen Videos setzen).
- **Effekte:** Schmerz-Symbol am rechten Fuß (Wert `pain`), Stich-Punkt (`sting`), rotes/grünes Aufleuchten, Bewegungslinien, Wasser-Platschen (`splash`), Luftblasen (beim Sinken),
  Abblenden der Szene (`fade`), Atemwolken (`breath`), Kälte-Symbol (`cold`), Spritzwasser (`spray`), Stoppuhr (`timer`),
  Sprühnebel (Desinfektionsspray), gelbes Fragezeichen über dem Kopf (Zombie `confused`),
  Strom (`src/effects/Zap.tsx`): Wert `zap` 0 … 1 an `dummy`/`kumpel`/`nachbar`/`arzt`/`zitteraal` = comichafte Zickzack-Blitze +
  Zittern (kein Rauch, keine Verbrennungen); beim nassen Handtuch laufen die Blitze am Handtuch entlang. Friert beim Einfrieren mit ein.
- **Bühnenwechsel:** Shot-Feld `"stage"` – andere Bühne für einen Abschnitt (`"stage": "wohnzimmer"`) oder Schnitt mitten
  im Abschnitt (`"stage": [{"t": 0, "stage": "badezimmer"}, {"t": 0.49, "stage": "arztpraxis"}]`, kurzes Abblenden beim Schnitt).
  Das Hintergrundgeräusch wechselt automatisch mit der Bühne. Figuren, die in einer Bühne nicht zu sehen sein sollen: `y: -30`.
- **Kategorien:** wildtiere, verkehr, alltag, wasser, erste-hilfe (Symbol Verbandskasten), feuer (Symbol Flamme), psyche (Symbol Kopf mit Herz),
  fundstuecke (Symbol Lupe, Videoreihe „Fundstücke“: fliegerbombe-garten, magnetfischen-granate, herrenloser-koffer, pistole-wald, geldkoffer-million)

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
- Zombie-Biss: 918 neue Zeichen (countdown/reveal/outro aus Cache), Sprechzeit 69,1 s, Video 78,0 s.
  Wort-Zeitstempel = Text (geprüft). Inhaber wollte direkt bis zum fertigen Video (ohne Zwischenfreigaben).
  Finales Video: review/final/zombie-biss.mp4 (78,0 s), Vorschau in review/vorschau/, vom Inhaber freigegeben.
- Weihnachtsbaum-Brand: 914 neue Zeichen (countdown/reveal aus Cache), Sprechzeit 65,9 s, Video 74,8 s. Wort-Zeitstempel = Text
  (geprüft), Kontrolle per scribe_v2 (u. a. „112“): korrekt. Erstes Video im Durchlauf-Modus. Choreografie wird mit
  `python3 scripts/weihnachtsbaum-choreo.py` aus den Wort-Zeitstempeln erzeugt. Standbilder in review/weihnachtsbaum-brand/phase1/.
  Finales Video: review/final/weihnachtsbaum-brand.mp4.
- Zitteraal-Steckdose: 931 neue Zeichen (countdown/reveal/outro aus Cache), Sprechzeit 72,3 s, Video 81,2 s. Wort-Zeitstempel = Text
  (geprüft). Zweites Video im Durchlauf-Modus; Inhaber wollte Vorschau + Standbilder überspringen. Choreografie wird mit
  `python3 scripts/zitteraal-choreo.py` aus den Wort-Zeitstempeln erzeugt. Finales Video: review/final/zitteraal-steckdose.mp4.
- Känguru-Zahn: 1056 neue Zeichen (countdown/reveal aus Cache), Sprechzeit 77,1 s, Video 86,1 s. Wort-Zeitstempel = Text (geprüft).
  Drittes Video im Durchlauf-Modus. Choreografie wird mit `python3 scripts/kaenguru-choreo.py` aus den Wort-Zeitstempeln erzeugt.
  Hook-Überschrift „Du hast mal wieder mit einem Känguru gekämpft“ (Sprechtext bleibt wortgenau „gegen ein Känguru“).
  Standbilder in review/kaenguru-zahn/phase1/. Finales Video: review/final/kaenguru-zahn.mp4.
- Spülmaschinentab: 979 neue Zeichen (countdown/reveal aus Cache), Sprechzeit 71,9 s, Video 80,8 s. Wort-Zeitstempel = Text (geprüft),
  Kontrolle scribe_v2 (Situation + Erklärung 3 mit „112“): korrekt. Viertes Video im Durchlauf-Modus. Choreografie:
  `python3 scripts/spuelmaschinentab-choreo.py`. Hook „Du hast mal wieder einen Spülmaschinentab gegessen“, Warnhinweis „Nicht nachmachen!“.
  Darstellung bewusst ohne Reinbeißen (Video beginnt mit dem angebissenen Tab in der Hand). Standbilder in review/spuelmaschinentab/phase1/.
  Finales Video: review/final/spuelmaschinentab.mp4.
- Wal-Panikattacke: 1237 neue Zeichen (countdown/reveal aus Cache, laut ElevenLabs 494 Credits), Sprechzeit 91,1 s, Video 100,1 s. Wort-Zeitstempel = Text
  (geprüft), Kontrolle scribe_v2 (Erklärung 1 + 3): korrekt. Fünftes Video im Durchlauf-Modus. Choreografie: `python3 scripts/wal-panikattacke-choreo.py`.
  Darstellung: Wal witzig/absurd, Panik respektvoll (kein Auslachen). Standbilder in review/wal-panikattacke/phase1/. Finales Video: review/final/wal-panikattacke.mp4.
  Hinweis: Der ElevenLabs-Schlüssel darf den Credit-Stand nicht abfragen (fehlende Berechtigung `user_read`) – Kosten stehen in der Ausgabe von `npm run voice`.
- Magnetfischen-Granate: 1089 neue Zeichen (countdown aus Cache), Sprechzeit 80,2 s, Video 89,1 s. Wort-Zeitstempel = Text (geprüft),
  Kontrolle scribe_v2 (Option 2 + Erklärung 2 mit „110“): korrekt. Sechstes Video im Durchlauf-Modus. Choreografie: `python3 scripts/magnetfischen-choreo.py`.
  Hook „Du hast mal wieder eine Granate geangelt“. Keine Explosion/kein Rauch: falsche Optionen frieren ein. Standbilder in review/magnetfischen-granate/phase1/.
  Finales Video: review/final/magnetfischen-granate.mp4.
- Herrenloser Koffer: 1085 neue Zeichen (countdown/reveal aus Cache, laut ElevenLabs 433 Credits), Sprechzeit 77,1 s, Video 86,0 s. Wort-Zeitstempel = Text
  (geprüft), Kontrolle scribe_v2 (Option 3 + Erklärung 3): korrekt. Erstes Video mit Durchlauf-Modus als Standard. Choreografie:
  `python3 scripts/herrenloser-koffer-choreo.py`. Keine Explosion/Bombe, falsche Optionen frieren nur ein. Standbilder in review/herrenloser-koffer/phase1/.
  Finales Video: review/final/herrenloser-koffer.mp4.
- Pistole im Wald: 1110 neue Zeichen (countdown/outro aus Cache, laut ElevenLabs 444 Credits), Sprechzeit 78,5 s, Video 87,4 s. Wort-Zeitstempel = Text
  (geprüft), Kontrolle scribe_v2 (Option 1 + Erklärung 1 mit „110“): korrekt. Choreografie: `python3 scripts/pistole-wald-choreo.py`. Kein Schuss,
  kein Mündungsfeuer, Lauf nie auf Personen/Kamera; falsche Optionen frieren nur ein. Standbilder in review/pistole-wald/phase1/.
  Finales Video: review/final/pistole-wald.mp4.
- Geldkoffer-Million: 1212 neue Zeichen (countdown/reveal aus Cache, laut ElevenLabs 485 Credits), Sprechzeit 88,2 s, Video 97,1 s. Kontrolle scribe_v2
  (Erklärung 1 + 3 + Outro mit „500“ und „30.000“): korrekt. Choreografie: `python3 scripts/geldkoffer-choreo.py`. Geld nur stilisiert, kein Gefängnis-Drama
  (Option 1: „§ 246“-Schild). Standbilder in review/geldkoffer-million/phase1/. Finales Video: review/final/geldkoffer-million.mp4.
  Kamera-Planung: `scripts/fitcam.py` (`fit(punkte, az, el, fov, bildbereich)` sucht Abstand + Blickpunkt, damit alles in einen Bildbereich passt –
  bei der richtigen Option liegt links oben die Schrittliste, also Geschehen rechts halten).
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
  `winter-atmo` (Bühne Burg, Schleife), `zugbruecke`, `sturz-platschen`, `hektisch-planschen` (Burggraben-Video);
  `nacht-atmo` (Bühne Friedhof, Schleife), `uhr-ticken` (Bühne Wohnzimmer, Schleife), `zombie-stoehnen`, `zombie-biss`,
  `pflaster`, `kalender-blaettern`, `wasserhahn`, `spruehen` (Zombie-Biss-Video);
  `feuer-knistern` (Bühne Weihnachtszimmer, Schleife), `feuer-auflodern`, `tuer-zu`, `sirene`, `geschenk-rascheln`,
  `eimer-schwappen` (Weihnachtsbaum-Brand-Video);
  `strom-knistern`, `sicherung-klick`, `handtuch-klatsch`, `aal-schmollen` (Zitteraal-Video; Küche nutzt `uhr-ticken`);
  `outback-atmo` (Bühne Outback, Schleife), `boxglocke`, `boxschlag`, `zahn-ping` (Känguru-Zahn-Video);
  `herzschlag`, `wal-schnaufen`, `wal-ruf`, `plopp`, `schrumpfen`, `aufzug-summen` (Bühne Aufzug, Schleife), `aufzug-ding`, `bahn-atmo` (Bühne Bahn, Schleife) (Wal-Panikattacke);
  `magnet-platsch`, `seil-ziehen`, `kopfsteinpflaster` (Magnetfischen-Granate; Kanal nutzt `see-atmo`);
  `bahnhof-atmo` (Bühne Bahnhof, Schleife), `koffer-rollen`, `schnallen-klick`, `absperrband` (Herrenloser Koffer);
  `laub-rascheln`, `hund-bellen` (Pistole im Wald); Geldkoffer nutzt nur vorhandene Effekte.
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
  (`fov` z. B. 52 in engen Räumen wie dem Badezimmer). Harter Kameraschnitt = zwei Zeitpunkte direkt hintereinander (t 0.748 / 0.752).
- Erste-Hilfe-Bewegungen Dummy: `armflinch, armhold, armlook, applyplaster, couchsit, chairsit, couchwait, showpass,
  chairnod, rinse, disinfect, compress`. Bissstelle = linker Unterarm, Oberseite. `armflinch`: Arm zurückreißen (0–0,15 s),
  ab ca. 0,85 s Unterarm halten. `applyplaster`: Pflaster bei 0,85 s drauf (Wert `plaster` dort von 0 auf 1), ab 1,5 s Arm sinken.
  `disinfect`: Sprühstöße bei 0,5 / 1,15 / 1,8 s. `compress`: Kompresse liegt bei 0,9 s (`dressing` 0.5), Binde fertig bei 2,4 s (`dressing` 1).
  Sitzen (`couchsit/chairsit/couchwait/showpass/chairnod`): Sitzhöhe 0,45 m, Hüfte über der Sitzmitte.
- Zombie (`zombie`): `chomp` – Mund schnappt bei ca. 0,45 s zu, ca. 0,54 m vor der Figur auf 1,36 m Höhe (passt zum
  Dummy in `calm`, Zombie ca. 1,05 m entfernt, Blick auf den linken Unterarm). `confused`: mit Weg = verwirrt davonschlurfen.
- Friedhof-Koordinaten (`src/stage/Graveyard.tsx`): Kiesweg bei x = 0 entlang z, Gräberreihen ab |x| ≈ 2,4,
  Zombie-Grab (2.7, −1.6) mit aufgewühlter Erde davor, Laternen (−1.5, −6), (−1.6, 7.5), (1.45, 11), Zaun z = −26 / x = ±13,
  Kapelle (−5, −33), Mond hinten links. Im Video: Dummy beim Biss (0, −2.2, face 150), Zombie (1.05, −2.0, face 279).
- Innenräume (`src/stage/Rooms.tsx`): Boden y = 0, Rückwand bei z = −D/2, vorn offen; Kamera bis ca. z = D/2 + 5 möglich.
  Badezimmer (W 4.2, D 4.4): Waschbecken `x 0, z −1.66, face 180`, Dummy zum Spülen `x 0.2, z −1.46, face 0` (Unterarm genau
  unter dem Strahl), Kamera links seitlich `[-1.95, 1.6, -0.7]`, fov 52. Wohnzimmer (W 5, D 4.6): Dummy auf dem Sofa
  `x 0.45, z −1.85, face 180`, Kalender `x 1.15, y 1.5, z −2.29`, Uhr `x 0.05, y 1.85, z −2.29` (face 180).
  Arztpraxis (W 5, D 4.6): Arzt `x −0.45, z −1.3, face 90`, Patient `x 0.95, z −1.3, face 270`, Fenster rechts (x 2.5, z −1.8 … −0.6).
- Feuer-Bewegungen Dummy: `recoil, runbucket, pullgift, closedoor, callwave`. `recoil`: Zusammenzucken (0–0,25 s), dann
  mit abwehrenden Armen rückwärts (Weg über Zeitpunkte; ohne Weg = stehen bleiben). `pullgift`: hinknien (0,7 s), dann alle 1,8 s
  greifen → Geschenk herausziehen → zur Seite legen. `closedoor`: Griff vorn rechts greifen (0–0,4 s), Tür zudrücken bis 1,2 s
  (Tür-Wert `door` passend von 1 auf 0). `callwave`: Handy rechts am Ohr, links winken.
- Strom-Bewegungen Dummy: `stuck` (rechte Hand gestreckt nach vorn, ca. 1,18 m hoch), `grabarms` (greift 0–0,45 s, Hände ca. 0,57 m
  vor ihm auf 1,34 m), `towelswing` (ausholen bis 0,45 s, Treffer 0,7 s, Handtuchspitze ca. 1,3 m vor ihm auf 1,28 m), `switchoff`
  (Hand zum Schalter 0,67 m vor / 0,28 m rechts auf 1,39 m, runter bis 0,7 s), `broompush`, `kneelcall` (kniet in 0,7 s).
  Positionen planen mit `scripts/dummy_kin.py` (Nachbau der Gelenkkette: `hand(x, z, face, pose)` = Welt-Position der Hand).
- Schlafzimmer-Koordinaten (`src/stage/Bedroom.tsx`, `BEDROOM`): W 3.6, D 3.8 (Rückwand z −1.9), H 2.5. Dummy an der Wand (−1.12, −1.66, face 162),
  Wal (1.15, −0.85, face 240, y 0.38) schwebt über dem Bett; Stuhl (−1.25, 0.55, face 145), Glas/Coolpack auf dem Beistelltisch (Lage aus SIT_SPOT_* in Dummy.tsx,
  im Choreo-Skript per `rot()` umgerechnet). Wegen des schmalen Hochformats: Kamera für den ganzen Raum ca. 6–7 m vor der Rückwand (z 5 … 6,6).
  Aufzug: Dummy (0, 0.2, face 180), Kamera [0, 1.75, 4.8]. Bahn: Haltegriffe bei x ±0.45 → Dummy (−0.31, −0.5) mit `holdstrap`, Kamera [0.3, 1.85, 4.2].
- Kanal-Koordinaten (`src/stage/Canal.tsx`, `CANAL`): Uferweg y 0 von der Mauerkante z 0 bis z 6.2, Wasser y −1.3 für z −12 … 0
  (dort ist „Boden“ = Wasser, y relativ dazu), Bäume bei z 5.7 (Lücke x −3.5 … 2.5), Brücke x −15. Im Video: Dummy (0, 0.62, face 0) an der Kante,
  Auto (5.6, 3.0, face 270 → Beifahrerseite zum Wasser), Granate abgelegt bei (0.06, 0.06). Kamera übers Wasser (z negativ) ist frei.
  Für den Blick ins Auto auf den Beifahrersitz: Kamera neben dem Auto schräg von oben (y 2.8, fov 50) durchs offene Fenster.
- Bahnhof-Koordinaten (`src/stage/Station.tsx`, `STATION`): Bahnsteigkante z 0, weiße Linie z 0.8, Bahnsteig bis z 9, Gleis 3 Mitte z −1.75, Halle z 9 … 26
  (x ±16), Fundbüro-Theke (4.5, 25), Platz davor (4.5, 24.2). Kamera am besten von der Hallenseite (z größer als die Figuren) Richtung Gleise schauen lassen –
  dann sind Bahnsteigkante, Linie und Gleise im Hintergrund. Fahrkartenautomat (4.6, 7.9) + Stützen (x ±6.5, z 5) nicht vor die Kamera stellen.
  Im Video: Koffer (0.8, 3.4, face 270), Dummy (−0.45, 3.4, face 90), Bahnmitarbeiterin neben (−3.6, 5.0), Absperrband um (0.63, 3.4) mit size −0.15.
- Wohnküche im Spülmaschinentab-Video: Dummy hinter dem Tisch `x 0.05, z −0.1, face 180`; Oberschrank `x 1.3, y 1.45, z −2.3, face 180`,
  Dummy davor (`stowtabs`) `x 1.06, z −1.6, face 0`; Packung im Schrank auf dem Regal (1.3, 1.677, −2.12). Neue Bewegungen müssen in
  `src/lib/anim.ts` in CONTINUOUS (+ BLEND_MOTIONS) stehen, sonst springt ihre Zeit an jedem Zeitpunkt zurück.
- Küchen-Koordinaten (`src/stage/Kitchen.tsx`): W 5, D 4.6, Rückwand z −2.3; Küchenzeile x −2.5 … 0.55 (Tiefe 0,6, Arbeitsplatte 0,9 m),
  Steckdose x 1.7, y 1.12; Zitteraal `x 1.745, y 1.12, z −2.275, face 180`; Kumpel hängt fest bei `x 1.15, z −1.96, face 35`.
  Sicherungskasten im `hausflur`: `x 0.82, z −3, face 180`, Dummy davor `x 0.54, z −2.13, face 0` (`switchoff`).
- Zahnunfall-Bewegungen Dummy: Hände werden automatisch per Arm-Ausrichtung (`reachR`/`reachL` in Dummy.tsx) an Zielpunkte gesetzt.
  `pickcrown`: Zahn liegt 0,52 m vor ihm (0,08 m rechts) am Boden, Griff bei 0,9 s, vor den Augen bei 1,7 s (0,44 m vor ihm, 1,1 m hoch).
  `rinsetooth`: Hände 0,45 m vor ihm auf 0,86 m – Dummy 0,62 m vor dem Wasserhahn, Blick zum Hahn (Hahn face 90 → Dummy face 270, x + 0.62).
  `placetooth`: Ablagestelle 0,42 m vor ihm, 0,1 m rechts, Hand dort bei 0,7 s, loslassen bei 0,8 s (dann Zahn-Objekt einblenden).
  `dentalsit`: Stuhl in der Zahnarztpraxis bei (0, −0.5), Dummy dort face 180, Kopf bei ca. (0, 1.2, −1.18).
- Outback-Koordinaten (`src/stage/Outback.tsx`): Ring-Mitte (0, 0), Ringboden 0,5 m, Kampffläche ±2.5, Pfosten ±2.6, Schürze ±2.85;
  Zahnstelle im Gras (0.9, 3.55); Klapptisch (−3.3, 2.2), Platte 0,6 m; Sonne hinten links. Im Video: Känguru (0.5, −0.35, face 235),
  Dummy (−0.42, 0.33, face 55), Wasserhahn (3.3, 3.7). Zahnarztpraxis: W 4.6, D 4.4, Arzt neben dem Stuhl (0.8, −0.75, face 250).
- Kamera-Zeitachse: `sampleCamera` glättet die Zeit (te = easeInOut(t)·0,35 + t·0,65). Für harte Schnitte, die genau zu einem
  Bühnenwechsel passen sollen, die Kamera-Zeitpunkte umrechnen (siehe `te()` in `scripts/zitteraal-choreo.py`).
- Weihnachts-Koordinaten (`src/stage/Christmas.tsx`): Weihnachtszimmer W 5.2, D 4.6, Decke 2.6; Baum `x 1.5, z −1.5, face 180`
  (Rauchgrenzen passen nur dort), Zimmertür linke Wand (x −2.6, z 0.3 … 1.2), Fenster Rückwand (x −1.25 … 0.15), Sofa links.
  Kamera unter ca. y 1.6 halten (darüber hängt der Rauch), z. B. `[-2.1, 1.5, 6.6]` Blick `[0.4, 0.55, -0.6]` für Optionen.
  Flur: x −1.2 … 1.2, Rückwand z −3; `zimmertuer` x 1.2, z −1.25, face 270; `wohnungstuer` x −0.47, z −3, face 180;
  Kamera `[-0.5, 1.75, 5.0]` Blick `[0.5, 1.0, -1.2]`. Hauseingang: Hausfront z −4, `haustuer` x −0.52, z −4, face 180;
  Gehweg z 4.5 … 6.2, Straße z 6.4 … 12.5, Feuerwehrauto z 9.4, face 90 (fährt nach +x), Länge 6,8 m.
  Hecken links/rechts vom Weg (|x| 1.2 … 5.8, z ≈ 0.5) – Kamera nicht dahinter stellen.
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
                      Beach.tsx = Meeresstrand, Garden.tsx = Garten, Castle.tsx = Burg, Graveyard.tsx = Friedhof,
                      Rooms.tsx = Innenraum-Baukasten: Badezimmer, Wohnzimmer, Arztpraxis;
                      Christmas.tsx = Weihnachtszimmer, Flur, Hausflur, Hauseingang; Kitchen.tsx = Küche;
                      Outback.tsx = Boxring im Outback; Dental.tsx = Zahnarztpraxis; Kitchen.tsx auch Wohnküche;
                      Bedroom.tsx = Schlafzimmer, Aufzug, volle Bahn + Commuter-Figuren; Canal.tsx = Kanal mit Kaimauer;
                      Station.tsx = Bahnhof (Bahnsteig + Halle + Fundbüro, Variante volle Halle) + Passenger-Figuren;
                      AutumnForest.tsx = Herbstwald + Waldrand-Straße + Laub; Park.tsx = Park am Abend;
                      PoliceStation.tsx = Polizeiwache mit Tresen)
src/actors/           Figuren (Dummy.tsx, Bear.tsx, Snake.tsx, Car.tsx, Weever.tsx = Petermännchen, Zombie.tsx) + Objekte
                      (Basin.tsx = Schüssel, Thermometer.tsx = Schild, GardenProps.tsx, CastleProps.tsx,
                      FirstAidProps.tsx = Erste Hilfe, ChristmasProps.tsx = Baum/Feuer/Rauch/Türen/Eimer/Geschenke/
                      Feuerwehrauto, Eel.tsx = Zitteraal, ShockProps.tsx = Handtuch/Sicherungskasten/Besen/
                      Steckdose/Toaster, Kangaroo.tsx = Känguru, ToothProps.tsx = Zahn/Taschentuch/Glas/Wasserhahn/
                      Zahnrettungsbox/H-Milch/Boxhandschuh/Hinweisschild, TabProps.tsx = Tab/Packung/Milchglas/
                      Küchenpapier/Oberschrank/Warndreieck, Whale.tsx = Wal, PanicProps.tsx = Kaltes Wasser/Coolpack/
                      Herz-Symbol, MagnetProps.tsx = Magnet/Granate/Seil, StationProps.tsx = Koffer/
                      Absperrband/Rechnung/Absperrband-Rolle, PistolProps.tsx = Pistole/Karten-Handy/
                      Polizeiauto/Hund/Leine, MoneyProps.tsx = Geldkoffer/Bündel/Formular/Taschenrechner/
                      Kalenderblatt/§-Schild) + Bewegungen; index.tsx = Anhängen ("attach") + "hand"
src/effects/          Aufleuchten (Flash), Bewegungslinien (SpeedLines), Platschen (Splash), Kälte-Symbol (Cold), Spritzwasser (Spray),
                      Strom-Blitze + Zittern (Zap), Schaum (Foam), Röntgen-Hinweise Lunge/Blut (BodyHint)
src/ui/               Warnschild-UI, Farben (theme.ts), Schrift, Symbole, Sichere Bereiche
src/Showcase.tsx      "Baukasten": jede Bewegung einzeln zum Anschauen (Zahnunfall-Demos in src/ShowcaseZahn.tsx)
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
