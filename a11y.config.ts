import type { Page } from '@playwright/test';

/**
 * Konfiguration des Barrierefreiheits-Supertests.
 *
 * BASE_URL      – zu prüfende Website. Leer = mitgelieferte Demo-Seite wird gestartet.
 * A11Y_PAGES    – optional, kommagetrennte Pfade, überschreibt `seiten` (z. B. "/,/kontakt").
 * A11Y_FORMS_SUBMIT=1 – Formulare leer absenden (nur auf Test-/Staging-Systemen!).
 */

export interface Seite {
  /** Anzeigename im Bericht */
  name: string;
  /** Pfad relativ zu BASE_URL */
  path: string;
  /**
   * Optional: Zustand herstellen, bevor geprüft wird
   * (Menü öffnen, Modal öffnen, Cookie-Banner schließen …).
   */
  setup?: (page: Page) => Promise<void>;
}

const envBase = (process.env.BASE_URL ?? '').trim();
const DEMO_URL = 'http://127.0.0.1:4173';

export const config = {
  baseURL: envBase || DEMO_URL,
  /** true, wenn keine BASE_URL gesetzt ist – dann startet Playwright die Demo-Seite */
  demo: envBase === '',
  /** Schweregrade, die einen Build fehlschlagen lassen (nur sichere, automatische Befunde) */
  failOn: ['Kritisch', 'Hoch'] as const,
  /** Obergrenze Tab-Stopps pro Seite für den Tastaturtest */
  maxTabStops: 200,
  /** Obergrenze Elemente, deren Fokus per Bildvergleich geprüft wird */
  maxFokusPruefungen: 80,
  /** Formulare leer absenden, um Fehlermeldungen zu prüfen (verändert ggf. Daten!) */
  formulareAbsenden: process.env.A11Y_FORMS_SUBMIT === '1',
  /** WCAG-Tags für axe-core: WCAG 2.2 AA inkl. 2.0/2.1 */
  axeTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
};

/** Zu prüfende Seiten und Zustände – hier anpassen. */
const standardSeiten: Seite[] = [
  { name: 'Startseite', path: '/' },
  {
    name: 'Startseite – Menü geöffnet',
    path: '/',
    setup: async (page) => {
      const knopf = page.getByRole('button', { name: /menü/i }).first();
      if (await knopf.isVisible().catch(() => false)) await knopf.click();
    },
  },
];

function ausUmgebung(): Seite[] | undefined {
  const raw = (process.env.A11Y_PAGES ?? '').trim();
  if (!raw) return undefined;
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ name: p, path: p }));
}

export const seiten: Seite[] = ausUmgebung() ?? standardSeiten;
