/**
 * Formular-Skripte.
 *
 * 3.3.8 Einfügen ins Passwortfeld blockiert                               → sicher, Hoch
 * 3.3.1 Leeres Absenden ohne erkennbare Fehlermeldung (opt-in)            → Kandidat
 * 4.1.3 Meldung erscheint sichtbar, aber nicht in einer Live-Region (opt-in) → Kandidat
 *
 * Absenden ist standardmäßig aus, weil es auf Live-Systemen Daten erzeugen kann.
 * Einschalten mit A11Y_FORMS_SUBMIT=1 (nur Staging/Test).
 */
import { config } from '../../a11y.config';
import type { Befund } from '../helpers/findings';
import { vorbereiten } from '../helpers/seite';
import type { Kontext, PruefErgebnis } from './typen';

export async function formulare({ page, seite }: Kontext): Promise<PruefErgebnis> {
  const url = page.url();
  const befunde: Befund[] = [];
  const geprueft = ['3.3.8'];

  const felder: { selektor: string; blockiert: boolean }[] = await page.evaluate(() =>
    (window as any).__a11y.einfuegenBlockiert(),
  );
  for (const f of felder.filter((x) => x.blockiert)) {
    befunde.push({
      kriterium: '3.3.8',
      titel: 'Einfügen ins Passwortfeld blockiert',
      schweregrad: 'Hoch',
      art: 'automatisch',
      quelle: 'formular-skript',
      url,
      element: f.selektor,
      problem: 'Das paste-Ereignis wird unterdrückt; Passwortmanager und Copy-and-paste funktionieren nicht.',
      behebung: 'onpaste-Handler bzw. preventDefault() für paste entfernen.',
    });
  }

  if (config.formulareAbsenden) {
    geprueft.push('3.3.1', '4.1.3');
    const anzahl = await page.locator('form').count();
    for (let i = 0; i < anzahl; i++) {
      await vorbereiten(page, seite);
      const form = page.locator('form').nth(i);
      const knopf = form.locator('button:not([type=button]):not([type=reset]), input[type=submit]').first();
      if (!(await knopf.isVisible().catch(() => false))) continue;
      const vorherUrl = page.url();
      const liveVorher: string = await page.evaluate(() => (window as any).__a11y.liveTexte());
      await page.evaluate(() => (window as any).__a11y.sichtbarMerken());
      await knopf.click();
      await page.waitForTimeout(500);
      if (page.url() !== vorherUrl) continue; // Server-seitige Validierung – manuell prüfen
      const status = await form.evaluate((f: HTMLFormElement) => {
        const ungueltig = Array.from(f.elements).filter(
          (e) => (e as HTMLInputElement).willValidate && !(e as HTMLInputElement).validity.valid,
        );
        return {
          nativ: !f.noValidate && ungueltig.length > 0,
          ariaInvalid: !!f.querySelector('[aria-invalid="true"]'),
          sel: (window as any).__a11y.selektor(f),
        };
      });
      const liveNachher: string = await page.evaluate(() => (window as any).__a11y.liveTexte());
      const neu: { selektor: string; text: string; live: boolean }[] = await page.evaluate(() =>
        (window as any).__a11y.neuSichtbar(),
      );
      const angesagt = liveNachher !== liveVorher;
      if (!status.nativ && !status.ariaInvalid && !angesagt) {
        befunde.push({
          kriterium: '3.3.1',
          titel: 'Fehler beim Absenden nicht erkennbar',
          schweregrad: 'Hoch',
          art: 'kandidat',
          quelle: 'formular-skript',
          url,
          element: status.sel,
          problem: 'Nach leerem Absenden: kein aria-invalid, keine native Validierung, keine Live-Region-Meldung.',
          behebung:
            'Fehlerhafte Felder mit aria-invalid="true" markieren, Meldung per aria-describedby verknüpfen und in role="alert" ansagen.',
        });
      }
      for (const m of neu.filter((n) => !n.live && !angesagt)) {
        befunde.push({
          kriterium: '4.1.3',
          titel: 'Statusmeldung wird nicht angesagt',
          schweregrad: 'Mittel',
          art: 'kandidat',
          quelle: 'formular-skript',
          url,
          element: m.selektor,
          problem: `Nach dem Absenden erscheint „${m.text}“, aber außerhalb einer Live-Region (aria-live/role=status/alert).`,
          behebung: 'Meldungen in einen vorab vorhandenen Container mit role="status" bzw. role="alert" schreiben.',
        });
      }
    }
  }

  return { seite: '', url, pruefung: 'formulare', geprueft, befunde };
}
