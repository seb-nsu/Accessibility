/**
 * 1.4.13 Inhalt bei Hover oder Fokus.
 * Für Elemente, die typischerweise Tooltips/Popover auslösen, wird der Mauszeiger
 * darauf bewegt. Erscheint neuer Inhalt, wird geprüft:
 *  - ausblendbar: verschwindet er mit Esc, ohne die Maus zu bewegen?
 *  - überfahrbar: bleibt er sichtbar, wenn die Maus auf ihn bewegt wird?
 * Browser-eigene title-Tooltips sind ausgenommen (vom Browser gesteuert).
 */
import { config } from '../../a11y.config';
import type { Befund } from '../helpers/findings';
import type { Kontext, PruefErgebnis } from './typen';

type Neu = { id: string; selektor: string; text: string; x: number; y: number };

export async function hover({ page }: Kontext): Promise<PruefErgebnis> {
  const url = page.url();
  const befunde: Befund[] = [];
  const ziele: { id: string; selektor: string; name: string }[] = await page.evaluate(
    (max) => (window as any).__a11y.hoverZiele(max),
    config.maxHover,
  );

  const ausloesen = async (selektor: string) => {
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
    await page.evaluate(() => (window as any).__a11y.sichtbarMerken());
    await page.locator(selektor).first().hover({ timeout: 2_000 }).catch(() => {});
    await page.waitForTimeout(300);
    return (await page.evaluate(() => (window as any).__a11y.neuSichtbar())) as Neu[];
  };
  const sichtbar = (id: string) => page.evaluate((i) => (window as any).__a11y.istSichtbar(i), id) as Promise<boolean>;

  for (const ziel of ziele) {
    if (page.url() !== url) break;
    const neu = await ausloesen(ziel.selektor);
    if (!neu.length) continue;
    const inhalt = neu[0];

    // ausblendbar per Esc
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    if (await sichtbar(inhalt.id)) {
      befunde.push({
        kriterium: '1.4.13',
        titel: 'Hover-Inhalt nicht per Esc ausblendbar',
        schweregrad: 'Mittel',
        art: 'kandidat',
        quelle: 'hover-skript',
        url,
        element: ziel.selektor,
        problem: `Beim Überfahren von „${ziel.name}“ erscheint „${inhalt.text}“; Esc blendet ihn nicht aus.`,
        behebung: 'keydown-Escape behandeln und den Tooltip ausblenden, ohne den Fokus oder die Maus zu bewegen.',
      });
    }

    // überfahrbar
    const erneut = await ausloesen(ziel.selektor);
    const ziel2 = erneut.find((n) => n.selektor === inhalt.selektor) ?? erneut[0];
    if (!ziel2) continue;
    await page.mouse.move(ziel2.x, ziel2.y, { steps: 5 });
    await page.waitForTimeout(300);
    if (!(await sichtbar(ziel2.id))) {
      befunde.push({
        kriterium: '1.4.13',
        titel: 'Hover-Inhalt verschwindet beim Darüberfahren',
        schweregrad: 'Mittel',
        art: 'kandidat',
        quelle: 'hover-skript',
        url,
        element: ziel.selektor,
        problem: `„${ziel2.text}“ verschwindet, sobald die Maus vom Auslöser auf den Inhalt bewegt wird.`,
        behebung: 'Tooltip erst ausblenden, wenn die Maus Auslöser UND Tooltip verlassen hat (z. B. gemeinsamer Wrapper mit :hover).',
      });
    }
  }
  await page.mouse.move(0, 0);
  return { seite: '', url, pruefung: 'hover', geprueft: ['1.4.13'], befunde };
}
