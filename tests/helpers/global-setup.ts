import fs from 'node:fs';
import path from 'node:path';

/** Rohbefunde des letzten Laufs entfernen, damit der Bericht nur den aktuellen Lauf zeigt. */
export default function globalSetup() {
  fs.rmSync(path.join(process.cwd(), 'reports', 'raw'), { recursive: true, force: true });
}
