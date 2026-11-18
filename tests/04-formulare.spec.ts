/**
 * Formular-Skripte.
 *
 * 3.3.8 Einfügen ins Passwortfeld blockiert                         → sicher, Hoch
 * 3.3.1 Leeres Absenden ohne erkennbare Fehlermeldung (opt-in!)      → Kandidat
 *
 * Das Absenden ist standardmäßig aus, weil es auf Live-Systemen Daten
 * erzeugen kann. Einschalten mit A11Y_FORMS_SUBMIT=1 (nur Staging/Test).
 */
import { test, expect } from '@playwright/test';
import { config, seiten } from '../a11y.config';
import { vorbereiten } from './helpers/seite';
import { speichern, blockierend, zusammenfassung, type Befund } from './helpers/findings';

for (const seite of seiten) {
  test(`Formulare: ${seite.name}`, async ({ page }, testInfo) => {
    await vorbereiten(page, seite);
    const url = page.url();
    const befunde: Befund[] = [];
    const geprueft = ['3.3.8'];

    // 3.3.8 Einfügen erlaubt?
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

    // 3.3.1 / 3.3.3 Fehlermeldungen bei leerem Absenden (opt-in)
    if (config.formulareAbsenden) {
      geprueft.push('3.3.1');
      const anzahl = await page.locator('form').count();
      for (let i = 0; i < anzahl; i++) {
        await vorbereiten(page, seite);
        const form = page.locator('form').nth(i);
        const knopf = form.locator('button:not([type=button]):not([type=reset]), input[type=submit]').first();
        if (!(await knopf.isVisible().catch(() => false))) continue;
        const vorherUrl = page.url();
        const liveVorher = await page.evaluate(() =>
          Array.from(document.querySelectorAll('[aria-live],[role=alert],[role=status]'))
            .map((e) => e.textContent?.trim() ?? '')
            .join('|'),
        );
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
        const liveNachher = await page.evaluate(() =>
          Array.from(document.querySelectorAll('[aria-live],[role=alert],[role=status]'))
            .map((e) => e.textContent?.trim() ?? '')
            .join('|'),
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
            behebung: 'Fehlerhafte Felder mit aria-invalid="true" markieren, Meldung per aria-describedby verknüpfen und in role="alert" ansagen.',
          });
        }
      }
    }

    await speichern(testInfo, { seite: seite.name, url, pruefung: 'formulare', geprueft, befunde });

    const fehler = blockierend(befunde);
    expect(fehler, zusammenfassung(fehler)).toHaveLength(0);
  });
}
