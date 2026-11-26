/**
 * Regel-Scan mit axe-core (WCAG 2.0–2.2 A/AA).
 * Verstöße = sichere Befunde, "incomplete" = Kandidaten für die manuelle Prüfung.
 */
import type { Page } from '@playwright/test';
import type AxeBuilderTyp from '@axe-core/playwright';
import { config } from '../../a11y.config';
import type { Befund, Schweregrad } from '../helpers/findings';
import { ausAxeTag } from '../helpers/wcag';
import type { PruefErgebnis } from './typen';

const SCHWERE: Record<string, Schweregrad> = {
  critical: 'Kritisch',
  serious: 'Hoch',
  moderate: 'Mittel',
  minor: 'Gering',
};

type AxeRegel = Awaited<ReturnType<AxeBuilderTyp['analyze']>>['violations'][number];

const kriteriumAus = (tags: string[]) => tags.map(ausAxeTag).find((k): k is string => !!k) ?? 'best-practice';

export async function axePruefen(
  page: Page,
  opts: { regeln?: string[]; zusatz?: string; pruefung?: string } = {},
): Promise<PruefErgebnis> {
  // dynamisch geladen: übrige Prüfungen laufen auch ohne installiertes axe-Paket
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  let builder = new AxeBuilder({ page });
  builder = opts.regeln ? builder.withRules(opts.regeln) : builder.withTags(config.axeTags);
  const ergebnis = await builder.analyze();
  const zusatz = opts.zusatz ? ` (${opts.zusatz})` : '';

  const umwandeln = (regel: AxeRegel, art: Befund['art']): Befund[] =>
    regel.nodes.map((node) => ({
      kriterium: kriteriumAus(regel.tags),
      titel: regel.help + zusatz,
      schweregrad: SCHWERE[regel.impact ?? node.impact ?? 'moderate'] ?? 'Mittel',
      art,
      quelle: `axe-core (${regel.id})`,
      url: page.url(),
      element: node.target.join(' '),
      problem: (node.failureSummary ?? regel.description).replace(/\s+/g, ' ').trim(),
      hilfe: regel.helpUrl,
    }));

  const geprueft = new Set<string>();
  for (const r of [...ergebnis.passes, ...ergebnis.violations, ...ergebnis.incomplete]) {
    for (const t of r.tags) {
      const k = ausAxeTag(t);
      if (k) geprueft.add(k);
    }
  }

  return {
    seite: '',
    url: page.url(),
    pruefung: opts.pruefung ?? 'axe',
    geprueft: [...geprueft],
    befunde: [
      ...ergebnis.violations.flatMap((r) => umwandeln(r, 'automatisch')),
      ...ergebnis.incomplete.flatMap((r) => umwandeln(r, 'kandidat')),
    ],
  };
}
