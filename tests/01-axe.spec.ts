/**
 * Phase 2b / 7 – Regel-Scan mit axe-core (WCAG 2.2 A/AA).
 * Verstöße = sichere Befunde, "incomplete" = Kandidaten für die manuelle Prüfung.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { config, seiten } from '../a11y.config';
import { vorbereiten } from './helpers/seite';
import { speichern, blockierend, zusammenfassung, type Befund, type Schweregrad } from './helpers/findings';
import { ausAxeTag } from './helpers/wcag';

const SCHWERE: Record<string, Schweregrad> = {
  critical: 'Kritisch',
  serious: 'Hoch',
  moderate: 'Mittel',
  minor: 'Gering',
};

type AxeErgebnis = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number];

const kriteriumAus = (tags: string[]) =>
  tags.map(ausAxeTag).find((k): k is string => !!k) ?? 'best-practice';

for (const seite of seiten) {
  test(`axe: ${seite.name}`, async ({ page }, testInfo) => {
    await vorbereiten(page, seite);
    const ergebnis = await new AxeBuilder({ page }).withTags(config.axeTags).analyze();

    const umwandeln = (regel: AxeErgebnis, art: Befund['art']): Befund[] =>
      regel.nodes.map((node) => ({
        kriterium: kriteriumAus(regel.tags),
        titel: regel.help,
        schweregrad: SCHWERE[regel.impact ?? node.impact ?? 'moderate'] ?? 'Mittel',
        art,
        quelle: `axe-core (${regel.id})`,
        url: page.url(),
        element: node.target.join(' '),
        problem: (node.failureSummary ?? regel.description).replace(/\s+/g, ' ').trim(),
        hilfe: regel.helpUrl,
      }));

    const befunde = [
      ...ergebnis.violations.flatMap((r) => umwandeln(r, 'automatisch')),
      ...ergebnis.incomplete.flatMap((r) => umwandeln(r, 'kandidat')),
    ];

    const geprueft = new Set<string>();
    for (const r of [...ergebnis.passes, ...ergebnis.violations, ...ergebnis.incomplete]) {
      for (const t of r.tags) {
        const k = ausAxeTag(t);
        if (k) geprueft.add(k);
      }
    }

    await speichern(testInfo, {
      seite: seite.name,
      url: page.url(),
      pruefung: 'axe',
      geprueft: [...geprueft],
      befunde,
    });

    const fehler = blockierend(befunde);
    expect(fehler, zusammenfassung(fehler)).toHaveLength(0);
  });
}
