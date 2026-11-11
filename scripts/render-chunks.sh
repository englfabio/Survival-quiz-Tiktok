#!/usr/bin/env bash
# Rendert ein Video in Stücken (je 240 Bilder, ohne Ton) + Tonspur getrennt, setzt am Ende alles zusammen.
# Vorteil: Wird die Cloud-Umgebung mittendrin neu gestartet, bleiben fertige Stücke erhalten –
# einfach denselben Befehl noch einmal starten, er macht dort weiter.
# Aufruf: bash scripts/render-chunks.sh <id>      Ergebnis: review/final/<id>.mp4
set -euo pipefail
ID="$1"
CHUNK=240
DIR="out/chunks/$ID"
mkdir -p "$DIR" review/final

TOTAL=$(node --experimental-strip-types --no-warnings -e "
import {readFileSync, existsSync} from 'node:fs';
import {buildTimeline} from './src/data/timeline.ts';
const s = JSON.parse(readFileSync('scenarios/$ID.json','utf-8'));
const d = 'public/voice/$ID/durations.json';
console.log(buildTimeline(s, existsSync(d) ? JSON.parse(readFileSync(d,'utf-8')) : undefined).totalFrames);
")
echo "Gesamt: $TOTAL Bilder"

i=0
for ((a = 0; a < TOTAL; a += CHUNK)); do
  b=$((a + CHUNK - 1)); ((b >= TOTAL)) && b=$((TOTAL - 1))
  f="$DIR/$(printf '%03d' $i).mp4"
  if [[ -f "$f" ]]; then
    echo "Stück $i (Bild $a–$b) schon fertig"
  else
    echo "Stück $i: Bild $a–$b …"
    npx remotion render "$ID" "$DIR/tmp.mp4" --frames="$a-$b" --muted --log=error
    mv "$DIR/tmp.mp4" "$f"
    echo "Stück $i fertig"
  fi
  i=$((i + 1))
done

if [[ ! -f "$DIR/ton.wav" ]]; then
  echo "Tonspur …"
  npx remotion render "$ID" "$DIR/ton-tmp.wav" --codec=wav --log=error
  mv "$DIR/ton-tmp.wav" "$DIR/ton.wav"
fi

ls "$DIR"/[0-9]*.mp4 | sed "s|^$DIR/|file '|; s|$|'|" > "$DIR/liste.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$DIR/liste.txt" -i "$DIR/ton.wav" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest "review/final/$ID.mp4"
echo "FERTIG: review/final/$ID.mp4"
