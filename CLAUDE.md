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
6. **Reihenfolge immer:** 1. Standbilder zur Freigabe → 2. Stimme → 3. Vorschau → 4. finales Video.
   Nie einen Schritt überspringen, nach jedem Schritt auf Freigabe warten.
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
  Länge der Audios. Bis dahin gelten die Richtwerte als Platzhalter.

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

- **Bühnen:** Wald mit Weg (weitere folgen)
- **Dummy-Bewegungen:** stehen, gehen, rennen, klettern, langsam rückwärts/seitlich gehen, stolpern
- **Weitere Figuren:** Braunbär (gleicher Low-Poly-Look wie der Dummy)
- **Effekte:** rotes/grünes Aufleuchten, Bewegungslinien

## Datengesteuerte Vorlage

Jedes Video = **eine Datei** in `/scenarios` (JSON). Neue Videos = nur neue Datei, kein neuer Code.
Inhalt: ID, Kategorie, Bühne, Situationstext, drei Optionen (Kartentext + Sprechtext +
Dummy-Aktion), Nummer der richtigen Option, Erklärtexte, Quellen (Name + Link),
Beschreibung und angepinnter Kommentar.

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
