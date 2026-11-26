/**
 * Darstellungsmodi, die Nutzer:innen selbst einstellen.
 *
 * Kontrastmodus (forced-colors, z. B. Windows „Kontrastdesigns“):
 *   Hintergrundfarben und box-shadow werden entfernt. Fokusindikatoren, die nur darauf
 *   beruhen, verschwinden → 2.4.7 per Bildvergleich, als Kandidat (Hoch).
 * Dunkelmodus (prefers-color-scheme: dark):
 *   Nur wenn die Seite ein dunkles Farbschema anbietet → axe-Regel color-contrast (1.4.3).
 */
import type { FokusSchritt } from '../helpers/inpage';
import { vorbereiten } from '../helpers/seite';
import { axePruefen } from './axe';
import { fokusSichtbarkeit, tabDurchlauf } from './tastatur';
import type { Kontext, PruefErgebnis } from './typen';

export async function kontrastmodus({ page, seite, bild }: Kontext): Promise<PruefErgebnis> {
  await page.emulateMedia({ forcedColors: 'active' });
  await vorbereiten(page, seite);
  const url = page.url();
  const { schritte, imModal } = await tabDurchlauf(page);
  const fokus = schritte
    .filter((s): s is FokusSchritt => !s.body)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
  const befunde = await fokusSichtbarkeit(page, bild, fokus, {
    max: 25,
    startVorgaenger: imModal ? (fokus.at(-1)?.id ?? null) : null,
    zusatz: 'im Kontrastmodus',
    quelle: 'darstellung-skript (forced-colors)',
    nurKandidaten: true,
  });
  await page.emulateMedia({ forcedColors: 'none' });
  return { seite: '', url, pruefung: 'kontrastmodus', geprueft: ['2.4.7'], befunde };
}

export async function dunkelmodus({ page, seite }: Kontext): Promise<PruefErgebnis | undefined> {
  await page.emulateMedia({ colorScheme: 'dark' });
  await vorbereiten(page, seite);
  const dunkel: boolean = await page.evaluate(() => (window as any).__a11y.hintergrundIstDunkel());
  let ergebnis: PruefErgebnis | undefined;
  if (dunkel) {
    ergebnis = await axePruefen(page, { regeln: ['color-contrast'], zusatz: 'Dunkelmodus', pruefung: 'dunkelmodus' });
  }
  await page.emulateMedia({ colorScheme: 'light' });
  return ergebnis;
}
