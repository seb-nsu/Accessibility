/**
 * 1.4.11 Nicht-Text-Kontrast: Bedienelemente müssen ihre Begrenzung mit ≥ 3:1 zeigen
 * (Rahmen oder eigene Fläche gegen die Umgebung). Der Fokusrahmen wird in der
 * Tastaturprüfung über den Bildvergleich mitbewertet.
 */
import type { Befund } from '../helpers/findings';
import type { Kontext, PruefErgebnis } from './typen';

export async function kontrast({ page }: Kontext): Promise<PruefErgebnis> {
  const url = page.url();
  const treffer: { selektor: string; name: string; rahmen: number; flaeche: number }[] = await page.evaluate(() =>
    (window as any).__a11y.nichtTextKontrast(),
  );
  const befunde: Befund[] = treffer.map((t) => ({
    kriterium: '1.4.11',
    titel: 'Begrenzung des Eingabefelds kaum erkennbar',
    schweregrad: 'Mittel',
    art: 'automatisch',
    quelle: 'kontrast-skript',
    url,
    element: t.selektor,
    problem: `„${t.name || 'Feld'}“: Rahmenkontrast ${t.rahmen}:1, Flächenkontrast ${t.flaeche}:1 – beides unter 3:1.`,
    behebung: 'Rahmenfarbe mit mindestens 3:1 zum Hintergrund wählen, z. B. #767676 auf Weiß.',
  }));
  return { seite: '', url, pruefung: 'kontrast', geprueft: ['1.4.11'], befunde };
}
