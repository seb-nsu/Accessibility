import fs from 'node:fs';
import type { Page } from '@playwright/test';

/**
 * Konfiguration des Barrierefreiheits-Supertests.
 *
 * Umgebungsvariablen
 * BASE_URL            zu prüfende Website. Leer = mitgelieferte Demo-Seiten werden gestartet.
 * A11Y_PAGES          kommagetrennte Pfade, überschreibt `seiten` (z. B. "/,/kontakt").
 * A11Y_PAGES_FILE     JSON-Datei mit Seiten (erzeugt von `npm run sitemap`).
 * A11Y_PRUEFUNGEN     Auswahl der Prüfungen, z. B. "axe,tastatur" (Standard: alle).
 * A11Y_FORMS_SUBMIT=1 Formulare leer absenden (nur Test-/Staging-Systeme!).
 * A11Y_SELECTS=0      <select>-Felder bei der 3.2.2-Prüfung nicht verändern.
 */

export interface Seite {
  /** Anzeigename im Bericht */
  name: string;
  /** Pfad relativ zu BASE_URL */
  path: string;
  /**
   * Optional: Zustand herstellen, bevor geprüft wird
   * (Menü öffnen, Dialog öffnen, Cookie-Banner schließen …).
   */
  setup?: (page: Page) => Promise<void>;
}

export const ALLE_PRUEFUNGEN = [
  'snapshot', //   1.3.1/4.1.2 Regression des Accessibility-Trees
  'axe', //        Regel-Scan WCAG 2.0–2.2 A/AA
  'formulare', //  3.3.8 (+ 3.3.1/4.1.3 opt-in)
  'kontrast', //   1.4.11 Nicht-Text-Kontrast von Bedienelementen
  'tastatur', //   2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7, 2.4.11, 3.2.1
  'hover', //      1.4.13 Inhalte bei Hover/Fokus
  'eingabe', //    3.2.2 Kontextwechsel bei Eingabe
  'layout', //     1.4.10, 1.4.12
  'darstellung', // Kontrastmodus (forced colors) und Dunkelmodus
] as const;
export type Pruefung = (typeof ALLE_PRUEFUNGEN)[number];

const envBase = (process.env.BASE_URL ?? '').trim();
const DEMO_URL = 'http://127.0.0.1:4173';

const auswahl = (process.env.A11Y_PRUEFUNGEN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean) as Pruefung[];

export const config = {
  baseURL: envBase || DEMO_URL,
  /** true, wenn keine BASE_URL gesetzt ist – dann startet Playwright die Demo-Seiten */
  demo: envBase === '',
  /** Schweregrade, die einen Build fehlschlagen lassen (nur sichere, automatische Befunde) */
  failOn: ['Kritisch', 'Hoch'] as const,
  /** aktive Prüfungen */
  pruefungen: new Set<Pruefung>(auswahl.length ? auswahl : ALLE_PRUEFUNGEN),
  /** Obergrenze Tab-Stopps pro Seite für den Tastaturtest */
  maxTabStops: 200,
  /** Obergrenze Elemente, deren Fokus per Bildvergleich geprüft wird */
  maxFokusPruefungen: 60,
  /** Obergrenze Elemente, auf die für 1.4.13 der Mauszeiger bewegt wird */
  maxHover: 30,
  /**
   * Fokusindikator gilt als deutlich, wenn mindestens dieser Anteil des Element-Umfangs
   * (in Pixeln) mit Kontrast ≥ 3:1 die Farbe wechselt. Darunter: Kandidat "schwach sichtbar".
   */
  fokusMindestanteil: 0.25,
  /** Formulare leer absenden, um Fehlermeldungen zu prüfen (verändert ggf. Daten!) */
  formulareAbsenden: process.env.A11Y_FORMS_SUBMIT === '1',
  /** <select>-Felder für 3.2.2 umstellen (nur lokal im Browser, sendet nichts ab) */
  selectsAendern: process.env.A11Y_SELECTS !== '0',
  /** WCAG-Tags für axe-core: WCAG 2.2 AA inkl. 2.0/2.1 */
  axeTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  /** Baseline bekannter Altbefunde */
  baselineDatei: 'a11y-baseline.json',
};

const oeffne = (name: RegExp) => async (page: Page) => {
  const knopf = page.getByRole('button', { name }).first();
  if (await knopf.isVisible().catch(() => false)) await knopf.click();
};

/** Zu prüfende Seiten und Zustände – hier anpassen. */
const standardSeiten: Seite[] = [
  { name: 'Startseite', path: '/' },
  { name: 'Startseite – Menü geöffnet', path: '/', setup: oeffne(/menü/i) },
  { name: 'Startseite – Dialog geöffnet', path: '/', setup: oeffne(/newsletter/i) },
  { name: 'Unterseite', path: '/unterseite.html' },
];

function ausUmgebung(): Seite[] | undefined {
  const datei = (process.env.A11Y_PAGES_FILE ?? '').trim();
  if (datei && fs.existsSync(datei)) {
    const liste = JSON.parse(fs.readFileSync(datei, 'utf8')) as { name: string; path: string }[];
    if (liste.length) return liste;
  }
  const raw = (process.env.A11Y_PAGES ?? '').trim();
  if (!raw) return undefined;
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ name: p, path: p }));
}

export const seiten: Seite[] = ausUmgebung() ?? standardSeiten;
