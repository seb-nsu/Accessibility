/**
 * Layout-Skripte.
 *
 * 1.4.10 Reflow: bei 320 px Breite kein horizontales Scrollen       → sicher, Hoch
 *        (Tabellen, Code, Grafiken sind Ausnahmen                    → Kandidat)
 * 1.4.12 Textabstand: nach Erhöhung der Abstände wird Text abgeschnitten → Kandidat
 */
import type { Befund } from '../helpers/findings';
import { vorbereiten } from '../helpers/seite';
import type { Kontext, PruefErgebnis } from './typen';

const TEXTABSTAND_CSS = `
*{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important}
p{margin-bottom:2em!important}`;

export async function layout({ page, seite }: Kontext): Promise<PruefErgebnis> {
  const befunde: Befund[] = [];
  const original = page.viewportSize()!;

  // 1.4.10 Reflow bei 320 CSS-Pixeln
  await page.setViewportSize({ width: 320, height: 640 });
  await vorbereiten(page, seite);
  const url = page.url();
  const reflow: {
    cw: number;
    sw: number;
    querscroll: boolean;
    taeter: { selektor: string; ausnahme: boolean; rechts: number }[];
  } = await page.evaluate(() => (window as any).__a11y.ueberbreite());

  if (reflow.querscroll) {
    const echte = reflow.taeter.filter((t) => !t.ausnahme);
    const liste = echte.length ? echte : reflow.taeter;
    befunde.push({
      kriterium: '1.4.10',
      titel: 'Horizontales Scrollen bei 320 px',
      schweregrad: echte.length ? 'Hoch' : 'Mittel',
      art: echte.length ? 'automatisch' : 'kandidat',
      quelle: 'layout-skript',
      url,
      element:
        liste
          .map((t) => t.selektor)
          .slice(0, 5)
          .join(' | ') || undefined,
      problem: `Seite ist ${reflow.sw} px breit bei ${reflow.cw} px Viewport.${echte.length ? '' : ' Nur Ausnahmen (Tabelle, Code, Grafik) ragen heraus – prüfen, ob 2D-Layout nötig ist.'}`,
      behebung: 'Feste Breiten durch max-width/flex-wrap ersetzen; breite Inhalte in Container mit overflow-x:auto legen.',
    });
  }

  // 1.4.12 Textabstand auf normaler Breite
  await page.setViewportSize(original);
  await vorbereiten(page, seite);
  const vorher: string[] = await page.evaluate(() => (window as any).__a11y.abgeschnitten());
  await page.addStyleTag({ content: TEXTABSTAND_CSS });
  const nachher: string[] = await page.evaluate(() => (window as any).__a11y.abgeschnitten());
  for (const sel of nachher.filter((s) => !vorher.includes(s)).slice(0, 15)) {
    befunde.push({
      kriterium: '1.4.12',
      titel: 'Text bei erhöhtem Textabstand abgeschnitten',
      schweregrad: 'Mittel',
      art: 'kandidat',
      quelle: 'layout-skript',
      url,
      element: sel,
      problem:
        'Mit WCAG-Textabständen (Zeilenhöhe 1,5, Buchstaben 0,12em, Wörter 0,16em) läuft Text über einen Container mit overflow:hidden.',
      behebung: 'Feste Höhen entfernen (min-height statt height), overflow:hidden nur wo nötig.',
    });
  }

  return { seite: '', url, pruefung: 'layout', geprueft: ['1.4.10', '1.4.12'], befunde };
}
