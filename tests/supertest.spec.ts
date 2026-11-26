/**
 * Barrierefreiheits-Supertest – ein Test pro Seite und Zustand.
 *
 * Die Seite wird einmal geladen; Prüfungen, die den Zustand nicht verändern, laufen
 * nacheinander auf derselben Instanz. Nur wo nötig wird neu geladen (Layout, Darstellung,
 * nach Tastatur-/Hover-/Eingabe-Interaktion). Ein Fehler in einer Prüfung bricht die
 * übrigen nicht ab.
 *
 * Projekt "desktop": alle Prüfungen. Projekt "mobil": axe (u. a. Zielgröße 2.5.8, Touch).
 * Auswahl: A11Y_PRUEFUNGEN=axe,tastatur …
 */
import { test, expect } from '@playwright/test';
import { config, seiten, type Pruefung } from '../a11y.config';
import { Bildvergleich } from './helpers/bildvergleich';
import { blockierend, slug, speichern, zusammenfassung, type Befund } from './helpers/findings';
import { vorbereiten } from './helpers/seite';
import { axePruefen } from './pruefungen/axe';
import { dunkelmodus, kontrastmodus } from './pruefungen/darstellung';
import { eingabe } from './pruefungen/eingabe';
import { formulare } from './pruefungen/formulare';
import { hover } from './pruefungen/hover';
import { kontrast } from './pruefungen/kontrast';
import { layout } from './pruefungen/layout';
import { tastatur } from './pruefungen/tastatur';
import type { Kontext, PruefErgebnis } from './pruefungen/typen';

const MOBIL = new Set<Pruefung>(['axe']);

for (const seite of seiten) {
  test(`Supertest: ${seite.name}`, async ({ page, context }, testInfo) => {
    test.setTimeout(300_000);
    const mobil = testInfo.project.name === 'mobil';
    const aktiv = (p: Pruefung) => config.pruefungen.has(p) && (!mobil || MOBIL.has(p));
    const bild = new Bildvergleich(context);
    const ctx: Kontext = { page, seite, testInfo, bild };
    const alle: Befund[] = [];
    let sauber = false;

    const frisch = async () => {
      if (!sauber) await vorbereiten(page, seite);
      sauber = true;
    };
    const sichern = async (erg: PruefErgebnis | undefined) => {
      if (!erg) return;
      const v = await speichern(testInfo, { ...erg, seite: seite.name });
      alle.push(...v.befunde);
    };
    /** Prüfung ausführen; Fehler werden gemeldet, die übrigen Prüfungen laufen weiter. */
    const schritt = async (
      titel: string,
      pruefung: Pruefung,
      opts: { sauber: boolean; verschmutzt: boolean },
      fn: () => Promise<PruefErgebnis | (PruefErgebnis | undefined)[] | undefined | void>,
    ) => {
      if (!aktiv(pruefung)) return;
      await test.step(titel, async () => {
        try {
          if (opts.sauber) await frisch();
          const erg = await fn();
          for (const e of Array.isArray(erg) ? erg : [erg]) await sichern(e ?? undefined);
        } catch (fehler) {
          expect.soft(String(fehler), `Prüfung „${titel}“ ist abgebrochen`).toBe('');
        } finally {
          if (opts.verschmutzt) sauber = false;
        }
      });
    };

    await frisch();

    // Seitenstruktur für seitenübergreifende Auswertungen (3.2.6 Konsistente Hilfe)
    if (!mobil) {
      const hilfe = await page.evaluate(() => (window as any).__a11y.hilfeSignatur());
      await sichern({ seite: seite.name, url: page.url(), pruefung: 'struktur', geprueft: [], befunde: [], extras: { hilfe } });
    }

    await schritt('ARIA-Snapshot', 'snapshot', { sauber: true, verschmutzt: false }, async () => {
      await expect.soft(page.locator('body')).toMatchAriaSnapshot({ name: `${slug(seite.name) || 'start'}.aria.yml` });
    });
    await schritt('axe-core', 'axe', { sauber: true, verschmutzt: false }, () => axePruefen(page));
    await schritt('Nicht-Text-Kontrast', 'kontrast', { sauber: true, verschmutzt: false }, () => kontrast(ctx));
    await schritt('Tastatur', 'tastatur', { sauber: true, verschmutzt: true }, () => tastatur(ctx));
    await schritt('Hover/Fokus-Inhalte', 'hover', { sauber: true, verschmutzt: true }, () => hover(ctx));
    await schritt('Kontextwechsel bei Eingabe', 'eingabe', { sauber: true, verschmutzt: true }, () => eingabe(ctx));
    await schritt('Formulare', 'formulare', { sauber: true, verschmutzt: config.formulareAbsenden }, () => formulare(ctx));
    await schritt('Layout', 'layout', { sauber: false, verschmutzt: true }, () => layout(ctx));
    await schritt('Darstellungsmodi', 'darstellung', { sauber: false, verschmutzt: true }, async () => [
      await kontrastmodus(ctx),
      ...(config.pruefungen.has('axe') ? [await dunkelmodus(ctx)] : []),
    ]);

    await bild.schliessen();

    const fehler = blockierend(alle);
    expect(fehler, zusammenfassung(fehler)).toHaveLength(0);
  });
}
