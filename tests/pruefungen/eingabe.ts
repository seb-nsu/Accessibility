/**
 * 3.2.2 Bei Eingabe: Das Ändern einer Auswahl darf keinen unangekündigten Kontextwechsel
 * (Seitenwechsel, neues Fenster) auslösen. Geprüft werden <select>-Felder außerhalb
 * von Absende-Vorgängen; es wird nichts abgeschickt. Abschaltbar mit A11Y_SELECTS=0.
 */
import type { Page } from '@playwright/test';
import { config } from '../../a11y.config';
import type { Befund } from '../helpers/findings';
import { vorbereiten } from '../helpers/seite';
import type { Kontext, PruefErgebnis } from './typen';

export async function eingabe({ page, seite }: Kontext): Promise<PruefErgebnis> {
  const url = page.url();
  const befunde: Befund[] = [];
  if (!config.selectsAendern) return { seite: '', url, pruefung: 'eingabe', geprueft: [], befunde };

  const anzahl = Math.min(await page.locator('select:visible').count(), 10);
  for (let i = 0; i < anzahl; i++) {
    if (page.url() !== url) await vorbereiten(page, seite);
    const feld = page.locator('select:visible').nth(i);
    const info = await feld.evaluate((s: HTMLSelectElement) => ({
      sel: (window as any).__a11y.selektor(s),
      name: s.labels?.[0]?.innerText?.trim() || s.getAttribute('aria-label') || s.name || 'Auswahl',
      wert: Array.from(s.options).find((o, j) => j !== s.selectedIndex && !o.disabled)?.value ?? null,
    }));
    if (info.wert === null) continue;
    const fenster: Page[] = [];
    const neu = (p: Page) => fenster.push(p);
    page.context().on('page', neu);
    await feld.selectOption(info.wert).catch(() => {});
    await page.waitForTimeout(600);
    page.context().off('page', neu);
    if (page.url() !== url || fenster.length) {
      befunde.push({
        kriterium: '3.2.2',
        titel: 'Seitenwechsel beim Ändern einer Auswahl',
        schweregrad: 'Hoch',
        art: 'kandidat',
        quelle: 'eingabe-skript',
        url,
        element: info.sel,
        problem: `Das Ändern von „${info.name}“ öffnet ungefragt ${fenster[0]?.url() ?? page.url()}. Zulässig nur, wenn das vorher angekündigt wird.`,
        behebung: 'Navigation erst über einen eigenen „Anwenden“-Knopf auslösen oder das Verhalten vorher im Text ankündigen.',
      });
      for (const f of fenster) await f.close().catch(() => {});
    }
  }
  return { seite: '', url, pruefung: 'eingabe', geprueft: ['3.2.2'], befunde };
}
