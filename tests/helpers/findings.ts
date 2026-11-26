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
  /** Woher der Befund stammt: axe-core (regel), tastatur-skript … */
  quelle: string;
  url: string;
  element?: string;
  problem: string;
  behebung?: string;
  hilfe?: string;
  /** gesetzt, wenn der Befund in der Baseline steht */
  baseline?: { ticket: string; bis: string; abgelaufen: boolean; grund?: string };
}

export interface Ergebnis {
  seite: string;
  /** Playwright-Projekt (desktop, mobil) */
  projekt: string;
  url: string;
  pruefung: string;
  /** WCAG-Kriterien, die diese Prüfung abgedeckt hat */
  geprueft: string[];
  befunde: Befund[];
  /** Zusatzdaten für seitenübergreifende Auswertungen (z. B. 3.2.6) */
  extras?: Record<string, unknown>;
}

export interface BaselineEintrag {
  kriterium: string;
  /** CSS-Selektor wie im Bericht; leer = alle Elemente dieses Kriteriums */
  element?: string;
  /** Seitenname; leer = alle Seiten */
  seite?: string;
  /** axe-Regel o. Ä., Teilstring von `quelle` */
  quelle?: string;
  ticket: string;
  /** ISO-Datum, bis wann der Befund toleriert wird */
  bis: string;
  grund?: string;
}

const RAW_DIR = path.join(process.cwd(), 'reports', 'raw');

export const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 120);

let baselineCache: BaselineEintrag[] | undefined;
export function baselineLaden(): BaselineEintrag[] {
  if (baselineCache) return baselineCache;
  const datei = path.join(process.cwd(), config.baselineDatei);
  baselineCache = fs.existsSync(datei) ? (JSON.parse(fs.readFileSync(datei, 'utf8')) as BaselineEintrag[]) : [];
  return baselineCache;
}

export function baselineTreffer(b: Befund, seite: string, liste = baselineLaden()): BaselineEintrag | undefined {
  return liste.find(
    (e) =>
      e.kriterium === b.kriterium &&
      (!e.element || e.element === b.element) &&
      (!e.seite || e.seite === seite) &&
      (!e.quelle || b.quelle.includes(e.quelle)),
  );
}

/** Befunde mit der Baseline abgleichen (markiert, entfernt nichts). */
export function baselineAnwenden(befunde: Befund[], seite: string): Befund[] {
  const heute = new Date().toISOString().slice(0, 10);
  for (const b of befunde) {
    const e = baselineTreffer(b, seite);
    if (e) b.baseline = { ticket: e.ticket, bis: e.bis, grund: e.grund, abgelaufen: e.bis < heute };
  }
  return befunde;
}

/** Ergebnis als JSON für den Bericht ablegen und an den Playwright-Report hängen. */
export async function speichern(testInfo: TestInfo, ergebnis: Omit<Ergebnis, 'projekt'>) {
  const projekt = testInfo.project.name || 'desktop';
  const voll: Ergebnis = { ...ergebnis, projekt, befunde: baselineAnwenden(ergebnis.befunde, ergebnis.seite) };
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const datei = path.join(RAW_DIR, `${slug(`${projekt}-${ergebnis.pruefung}-${ergebnis.seite}`)}.json`);
  fs.writeFileSync(datei, JSON.stringify(voll, null, 2));
  if (voll.befunde.length) {
    await testInfo.attach(`befunde-${ergebnis.pruefung}.json`, {
      body: JSON.stringify(voll.befunde, null, 2),
      contentType: 'application/json',
    });
  }
  for (const b of voll.befunde) {
    testInfo.annotations.push({
      type: `${b.schweregrad} · ${b.art}${b.baseline ? ` · Baseline ${b.baseline.ticket}` : ''}`,
      description: `${b.kriterium} ${b.titel}: ${b.problem}${b.element ? ` (${b.element})` : ''}`,
    });
  }
  return voll;
}

/** Befunde, die den Build fehlschlagen lassen sollen (Baseline mit gültigem Datum ausgenommen). */
export function blockierend(befunde: Befund[]): Befund[] {
  const grenze = config.failOn as readonly string[];
  return befunde.filter(
    (b) => b.art === 'automatisch' && grenze.includes(b.schweregrad) && !(b.baseline && !b.baseline.abgelaufen),
  );
}

/** Lesbare Fehlermeldung für expect() */
export function zusammenfassung(befunde: Befund[]): string {
  return befunde
    .map(
      (b) =>
        `[${b.schweregrad}] ${b.kriterium} ${b.titel} – ${b.problem}${b.element ? ` → ${b.element}` : ''}${
          b.baseline?.abgelaufen ? ` (Baseline ${b.baseline.ticket} abgelaufen am ${b.baseline.bis})` : ''
        }`,
    )
    .join('\n');
}
