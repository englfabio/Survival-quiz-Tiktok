import {Config} from '@remotion/cli/config';
import {existsSync} from 'node:fs';

Config.setVideoImageFormat('jpeg');

// WebGL (3D) ohne Grafikkarte: Software-Renderer "swangle" funktioniert (getestet) in der Cloud.
Config.setChromiumOpenGlRenderer('swangle');

// In der Cloud-Umgebung kann Remotion seinen eigenen Browser nicht herunterladen.
// Dann nehmen wir den dort vorinstallierten. Auf einem normalen Rechner greift das nicht.
const CLOUD_BROWSER =
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
if (existsSync(CLOUD_BROWSER)) {
  Config.setBrowserExecutable(CLOUD_BROWSER);
}
