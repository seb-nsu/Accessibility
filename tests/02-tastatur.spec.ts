/**
 * Tastatur-Skripte – ersetzen einen Großteil der manuellen Tastaturprüfung.
 *
 * 2.1.1  Klickbar wirkende Elemente ohne Tastaturzugang        → Kandidat
 * 2.1.2  Tastaturfalle (Fokus hängt oder kreist in Teilbereich) → sicher, Kritisch
 * 2.4.1  Skip-Link als erster Tab-Stopp                         → Kandidat
 * 2.4.3  Fokus springt gegen die Leserichtung                   → Kandidat
 * 2.4.7  Fokus sichtbar: Bildvergleich mit/ohne Fokus            → sicher, Hoch
 * 2.4.11 Fokussiertes Element komplett verdeckt                 → sicher, Hoch
 */
import { test, expect, type Page } from '@playwright/test';
import { config, seiten } from '../a11y.config';
import { vorbereiten } from './helpers/seite';
import { speichern, blockierend, zusammenfassung, type Befund } from './helpers/findings';
import type { FokusInfo, FokusSchritt } from './helpers/inpage';


async function tabDurchlauf(page: Page) {
  const anzahl: number = await page.evaluate(() => (window as any).__a11y.tabbableAnzahl());
  const max = Math.min(config.maxTabStops, anzahl * 2 + 5);
  // Startpunkt der Tab-Navigation an den Seitenanfang setzen (z. B. nach einem Klick im setup)
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.scrollTo(0, 0);
    document.body.tabIndex = -1;
    document.body.focus({ preventScroll: true });
    document.body.removeAttribute('tabindex');
  });
  const schritte: FokusInfo[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const info: FokusInfo = await page.evaluate(() => (window as any).__a11y.fokusInfo());
    schritte.push(info);
    const erster = schritte.find((s): s is FokusSchritt => !s.body);
    // Einmal ganz herum: wieder beim ersten Element angekommen
    if (!info.body && erster && info.id === erster.id && schritte.filter((s) => !s.body).length > 1) break;
  }
  return { anzahl, schritte };
}

function falleFinden(schritte: FokusInfo[]): FokusSchritt | undefined {
  const fokus = schritte.filter((s): s is FokusSchritt => !s.body);
  if (fokus.length === 0) return undefined;
  const ersterId = fokus[0].id;
  // a) Fokus bleibt mehrfach am selben Element hängen
  for (let i = 2; i < fokus.length; i++) {
    if (fokus[i].id === fokus[i - 1].id && fokus[i].id === fokus[i - 2].id) return fokus[i];
  }
  // b) Fokus kreist in einem Teilbereich, ohne je zum ersten Element zurückzukehren
  const gesehen = new Map<string, number>();
  for (let i = 0; i < fokus.length; i++) {
    const s = fokus[i];
    if (gesehen.has(s.id) && s.id !== ersterId) return s;
    gesehen.set(s.id, i);
  }
  return undefined;
}

/** Element per Tastatur fokussieren: Vorgänger programmatisch fokussieren, dann Tab drücken. */
async function perTastaturFokussieren(page: Page, vorgaengerId: string | null) {
  await page.evaluate((id) => (window as any).__a11y.fokusSetzen(id), vorgaengerId);
  await page.keyboard.press('Tab');
}

async function fokusSichtbarPruefen(page: Page, reihenfolge: FokusSchritt[]): Promise<Befund[]> {
  const befunde: Befund[] = [];
  const geprueft = new Set<string>();
  let vorgaenger: string | null = null;
  for (const schritt of reihenfolge) {
    if (geprueft.size >= config.maxFokusPruefungen) break;
    const v = vorgaenger;
    vorgaenger = schritt.id;
    if (geprueft.has(schritt.id) || schritt.breite === 0) continue;
    geprueft.add(schritt.id);

    await perTastaturFokussieren(page, v);
    const aktiv: FokusInfo = await page.evaluate(() => (window as any).__a11y.fokusInfo());
    if (aktiv.body || aktiv.id !== schritt.id) continue; // Reihenfolge nicht reproduzierbar → überspringen

    const box: { x: number; y: number; breite: number; hoehe: number } | null = await page.evaluate(
      (id) => (window as any).__a11y.scrollZu(id),
      schritt.id,
    );
    if (!box) continue;
    const vp = page.viewportSize()!;
    const rand = 8;
    const x = Math.max(0, box.x - rand);
    const y = Math.max(0, box.y - rand);
    const clip = {
      x,
      y,
      width: Math.max(1, Math.min(vp.width - x, box.breite + 2 * rand)),
      height: Math.max(1, Math.min(vp.height - y, box.hoehe + 2 * rand)),
    };
    const mitFokus = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
    await page.evaluate(() => (window as any).__a11y.blur());
    const ohneFokus = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });

    if (mitFokus.equals(ohneFokus)) {
      befunde.push({
        kriterium: '2.4.7',
        titel: 'Fokus nicht sichtbar',
        schweregrad: 'Hoch',
        art: 'automatisch',
        quelle: 'tastatur-skript (Bildvergleich)',
        url: page.url(),
        element: schritt.selektor,
        problem: `Element „${schritt.name || schritt.tag}“ sieht mit Tastaturfokus exakt gleich aus wie ohne.`,
        behebung: 'Sichtbaren Fokusindikator ergänzen, z. B. :focus-visible { outline: 2px solid currentColor; outline-offset: 2px }',
      });
    }
  }
  return befunde;
}

for (const seite of seiten) {
  test(`Tastatur: ${seite.name}`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await vorbereiten(page, seite);
    const url = page.url();
    const befunde: Befund[] = [];

    const { anzahl, schritte } = await tabDurchlauf(page);
    const fokus = schritte.filter((s): s is FokusSchritt => !s.body);

    // 2.1.2 Tastaturfalle
    const falle = falleFinden(schritte);
    if (falle) {
      befunde.push({
        kriterium: '2.1.2',
        titel: 'Tastaturfalle',
        schweregrad: 'Kritisch',
        art: 'automatisch',
        quelle: 'tastatur-skript',
        url,
        element: falle.selektor,
        problem: `Der Fokus kommt bei „${falle.name || falle.tag}“ mit Tab nicht weiter bzw. kreist in einem Teilbereich.`,
        behebung: 'Tab/Shift+Tab nicht abfangen; Modals mit Esc schließbar machen und Fokus danach zurückgeben.',
      });
    }

    // 2.1.1 Klickbar ohne Tastatur
    const klickbar: { selektor: string; name: string }[] = await page.evaluate(() =>
      (window as any).__a11y.klickbarOhneTastatur(),
    );
    for (const k of klickbar) {
      befunde.push({
        kriterium: '2.1.1',
        titel: 'Klickbar, aber nicht per Tastatur erreichbar',
        schweregrad: 'Hoch',
        art: 'kandidat',
        quelle: 'tastatur-skript',
        url,
        element: k.selektor,
        problem: `„${k.name}“ wirkt klickbar (Zeiger-Cursor/onclick), ist aber kein fokussierbares Element.`,
        behebung: 'Echtes <button> oder <a href> verwenden statt <div>/<span> mit Klick-Handler.',
      });
    }

    // 2.4.1 Skip-Link
    const erster = fokus[0];
    const vorMain = fokus.findIndex((s) => s.inMain);
    if (erster && !erster.skipLink && (vorMain === -1 || vorMain >= 5)) {
      befunde.push({
        kriterium: '2.4.1',
        titel: 'Kein Skip-Link',
        schweregrad: 'Mittel',
        art: 'kandidat',
        quelle: 'tastatur-skript',
        url,
        element: erster.selektor,
        problem: `Erster Tab-Stopp ist kein Sprunglink; bis zum Hauptinhalt sind ${vorMain === -1 ? 'unbekannt viele (kein <main>)' : vorMain} Tab-Stopps nötig.`,
        behebung: 'Als erstes Element <a href="#main">Zum Inhalt springen</a> einfügen, beim Fokus sichtbar.',
      });
    }

    // 2.4.3 Sprünge gegen die Leserichtung
    for (let i = 1; i < fokus.length; i++) {
      const a = fokus[i - 1];
      const b = fokus[i];
      if (b.id === fokus[0].id) break;
      if (a.fixiert || b.fixiert) continue;
      if (b.y < a.y - 40) {
        befunde.push({
          kriterium: '2.4.3',
          titel: 'Fokus springt zurück',
          schweregrad: 'Mittel',
          art: 'kandidat',
          quelle: 'tastatur-skript',
          url,
          element: b.selektor,
          problem: `Nach „${a.name || a.tag}“ springt der Fokus ${Math.round(a.y - b.y)} px nach oben zu „${b.name || b.tag}“.`,
          behebung: 'DOM-Reihenfolge an die visuelle Reihenfolge anpassen; kein positives tabindex.',
        });
      }
    }

    // 2.4.11 Fokus verdeckt
    const verdeckt = new Map<string, FokusSchritt>();
    for (const s of fokus) if (s.verdeckt) verdeckt.set(s.id, s);
    for (const s of verdeckt.values()) {
      befunde.push({
        kriterium: '2.4.11',
        titel: 'Fokus komplett verdeckt',
        schweregrad: 'Hoch',
        art: 'automatisch',
        quelle: 'tastatur-skript',
        url,
        element: s.selektor,
        problem: `„${s.name || s.tag}“ ist beim Fokus vollständig von ${s.verdecktDurch ?? 'einem fixierten Element'} verdeckt.`,
        behebung: 'scroll-padding-top/-bottom in Höhe von Sticky-Header/-Banner setzen oder Banner nicht fixieren.',
      });
    }

    // 2.4.7 Fokus sichtbar (Bildvergleich) – nur bis zur Falle, sonst bleiben wir hängen
    const bisFalle = falle ? fokus.slice(0, fokus.findIndex((s) => s.id === falle.id)) : fokus;
    befunde.push(...(await fokusSichtbarPruefen(page, bisFalle)));

    testInfo.annotations.push({ type: 'Tab-Stopps', description: `${new Set(fokus.map((s) => s.id)).size} erreicht, ${anzahl} erwartet` });

    await speichern(testInfo, {
      seite: seite.name,
      url,
      pruefung: 'tastatur',
      geprueft: ['2.1.1', '2.1.2', '2.4.1', '2.4.3', '2.4.7', '2.4.11'],
      befunde,
    });

    const fehler = blockierend(befunde);
    expect(fehler, zusammenfassung(fehler)).toHaveLength(0);
  });
}
