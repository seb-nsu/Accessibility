import fs from 'node:fs';
import path from 'node:path';
import type { TestInfo } from '@playwright/test';
import { config } from '../../a11y.config';

export type Schweregrad = 'Kritisch' | 'Hoch' | 'Mittel' | 'Gering';

export interface Befund {
  /** WCAG-Kriterium, z. B. "2.4.7"; "best-practice" für Regeln ohne WCAG-Bezug */
  kriterium: string;
  titel: string;
  schweregrad: Schweregrad;
  /**
   * automatisch = sicherer Befund, kann den Build fehlschlagen lassen
   * kandidat    = Verdacht, ein Mensch bewertet ihn (Phase 4)
   */
  art: 'automatisch' | 'kandidat';
  /** Woher der Befund stammt: axe-core, tastatur-skript, layout-skript … */
  quelle: string;
  url: string;
  element?: string;
  problem: string;
  behebung?: string;
  hilfe?: string;
}

export interface Ergebnis {
  seite: string;
  url: string;
  pruefung: string;
  /** WCAG-Kriterien, die diese Prüfung abgedeckt hat */
  geprueft: string[];
  befunde: Befund[];
}

const RAW_DIR = path.join(process.cwd(), 'reports', 'raw');

const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 120);

/** Ergebnis als JSON für den Bericht ablegen und an den Playwright-Report hängen. */
export async function speichern(testInfo: TestInfo, ergebnis: Ergebnis) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const datei = path.join(RAW_DIR, `${slug(`${ergebnis.pruefung}-${ergebnis.seite}`)}.json`);
  fs.writeFileSync(datei, JSON.stringify(ergebnis, null, 2));
  await testInfo.attach('befunde.json', {
    body: JSON.stringify(ergebnis.befunde, null, 2),
    contentType: 'application/json',
  });
  for (const b of ergebnis.befunde) {
    testInfo.annotations.push({
      type: `${b.schweregrad} · ${b.art}`,
      description: `${b.kriterium} ${b.titel}: ${b.problem}${b.element ? ` (${b.element})` : ''}`,
    });
  }
}

/** Befunde, die den Build fehlschlagen lassen sollen. */
export function blockierend(befunde: Befund[]): Befund[] {
  const grenze = config.failOn as readonly string[];
  return befunde.filter((b) => b.art === 'automatisch' && grenze.includes(b.schweregrad));
}

/** Lesbare Fehlermeldung für expect() */
export function zusammenfassung(befunde: Befund[]): string {
  return befunde
    .map((b) => `[${b.schweregrad}] ${b.kriterium} ${b.titel} – ${b.problem}${b.element ? ` → ${b.element}` : ''}`)
    .join('\n');
}
