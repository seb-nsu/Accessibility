/**
 * Tastatur-Skripte – ersetzen einen Großteil der manuellen Tastaturprüfung.
 *
 * 2.1.1  Klickbar wirkende Elemente ohne Tastaturzugang            → Kandidat
 * 2.1.2  Tastaturfalle (Fokus hängt/kreist außerhalb eines Modals)  → sicher, Kritisch
 *        Modal: Fokus bleibt drin (korrekt); Esc schließt? Fokus zurück?  → Kandidat
 * 2.4.1  Skip-Link als erster Tab-Stopp                             → Kandidat
 * 2.4.3  Fokus springt gegen die Leserichtung                       → Kandidat
 * 2.4.7  Fokus sichtbar: Bildvergleich mit Kontrast-Schwelle         → sicher (unsichtbar) / Kandidat (schwach)
 * 2.4.11 Fokussiertes Element komplett verdeckt                     → sicher, Hoch
 * 3.2.1  Fokus löst Seitenwechsel oder neues Fenster aus             → sicher, Hoch
 */
import type { Page } from '@playwright/test';
import { config } from '../../a11y.config';
import type { Befund } from '../helpers/findings';
import type { Bildvergleich } from '../helpers/bildvergleich';
import type { FokusInfo, FokusSchritt } from '../helpers/inpage';
import type { Kontext, PruefErgebnis } from './typen';

async function modalOffen(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-modal="true"],dialog[open]')).some((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }),
  );
}

export async function tabDurchlauf(page: Page) {
  const anzahl: number = await page.evaluate(() => (window as any).__a11y.tabbableAnzahl());
  const max = Math.min(config.maxTabStops, anzahl * 2 + 5);
  const imModal = await modalOffen(page);
  // Startpunkt an den Seitenanfang setzen – außer ein Modal ist offen (Fokus liegt dann schon darin)
  if (!imModal) await page.evaluate(() => (window as any).__a11y.fokusSetzen(null));

  const startUrl = page.url();
  const neueFenster: string[] = [];
  const beiFenster = (p: Page) => neueFenster.push(p.url());
  page.context().on('page', beiFenster);

  const schritte: FokusInfo[] = [];
  let kontextwechsel: { nach: FokusSchritt | undefined; url: string } | undefined;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(20);
    if (page.url() !== startUrl || neueFenster.length) {
      kontextwechsel = { nach: schritte.filter((s): s is FokusSchritt => !s.body).at(-1), url: neueFenster[0] ?? page.url() };
      break;
    }
    const info: FokusInfo = await page.evaluate(() => (window as any).__a11y.fokusInfo());
    schritte.push(info);
    const fokus = schritte.filter((s): s is FokusSchritt => !s.body);
    if (!info.body && fokus.length > 1 && info.id === fokus[0].id) break; // einmal herum
  }
  page.context().off('page', beiFenster);
  return { anzahl, schritte, imModal, kontextwechsel };
}

function falleFinden(schritte: FokusInfo[]): FokusSchritt | undefined {
  const fokus = schritte.filter((s): s is FokusSchritt => !s.body);
  if (fokus.length === 0) return undefined;
  const ersterId = fokus[0].id;
  // a) Fokus bleibt mehrfach am selben Element hängen
  for (let i = 2; i < fokus.length; i++) {
    if (fokus[i].id === fokus[i - 1].id && fokus[i].id === fokus[i - 2].id) return fokus[i];
  }
  // b) Fokus kreist in einem Teilbereich, ohne zum ersten Element zurückzukehren
  const gesehen = new Set<string>();
  for (const s of fokus) {
    if (gesehen.has(s.id) && s.id !== ersterId) {
      // Kreisen innerhalb eines modalen Dialogs ist gewollt (aria-modal / showModal)
      if (s.modal) return undefined;
      return s;
    }
    gesehen.add(s.id);
  }
  return undefined;
}

/** Element per Tastatur fokussieren: Vorgänger fokussieren (oder Seitenanfang), dann Tab. */
async function perTastaturFokussieren(page: Page, vorgaengerId: string | null) {
  await page.evaluate((id) => (window as any).__a11y.fokusSetzen(id), vorgaengerId);
  await page.keyboard.press('Tab');
}

/**
 * 2.4.7 per Bildvergleich. Gemeinsam genutzt von Tastatur- und Darstellungsprüfung.
 * startVorgaenger: Element vor dem ersten Schritt (bei Modals das letzte im Zyklus).
 */
export async function fokusSichtbarkeit(
  page: Page,
  bild: Bildvergleich,
  reihenfolge: FokusSchritt[],
  opts: { max: number; startVorgaenger: string | null; zusatz?: string; quelle?: string; nurKandidaten?: boolean },
): Promise<Befund[]> {
  const befunde: Befund[] = [];
  const geprueft = new Set<string>();
  let vorgaenger: string | null = opts.startVorgaenger;
  const vp = page.viewportSize()!;
  const zusatz = opts.zusatz ? ` (${opts.zusatz})` : '';
  for (const schritt of reihenfolge) {
    if (geprueft.size >= opts.max) break;
    const v = vorgaenger;
    vorgaenger = schritt.id;
    if (geprueft.has(schritt.id) || schritt.breite === 0) continue;
    geprueft.add(schritt.id);

    await perTastaturFokussieren(page, v);
    const aktiv: FokusInfo = await page.evaluate(() => (window as any).__a11y.fokusInfo());
    if (aktiv.body || aktiv.id !== schritt.id) continue; // nicht reproduzierbar → überspringen

    const box: { x: number; y: number; breite: number; hoehe: number } | null = await page.evaluate(
      (id) => (window as any).__a11y.scrollZu(id),
      schritt.id,
    );
    if (!box) continue;
    const rand = 8;
    const x = Math.max(0, Math.floor(box.x - rand));
    const y = Math.max(0, Math.floor(box.y - rand));
    const clip = {
      x,
      y,
      width: Math.max(1, Math.min(vp.width - x, Math.ceil(box.breite + 2 * rand))),
      height: Math.max(1, Math.min(vp.height - y, Math.ceil(box.hoehe + 2 * rand))),
    };
    const mitFokus = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
    await page.evaluate(() => (window as any).__a11y.blur());
    const ohneFokus = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
    const vergleich = await bild.vergleichen(ohneFokus, mitFokus);
    const umfang = 2 * (box.breite + box.hoehe);
    const name = schritt.name || schritt.tag;

    if (vergleich.geaendert === 0) {
      befunde.push({
        kriterium: '2.4.7',
        titel: `Fokus nicht sichtbar${zusatz}`,
        schweregrad: 'Hoch',
        art: opts.nurKandidaten ? 'kandidat' : 'automatisch',
        quelle: opts.quelle ?? 'tastatur-skript (Bildvergleich)',
        url: page.url(),
        element: schritt.selektor,
        problem: `„${name}“ sieht mit Tastaturfokus exakt gleich aus wie ohne${zusatz}.`,
        behebung:
          'Sichtbaren Fokusindikator ergänzen, z. B. :focus-visible { outline: 2px solid currentColor; outline-offset: 2px } – outline bleibt auch im Kontrastmodus sichtbar, box-shadow nicht.',
      });
    } else if (vergleich.kontrastreich < config.fokusMindestanteil * umfang) {
      befunde.push({
        kriterium: '2.4.7',
        titel: `Fokus nur schwach sichtbar${zusatz}`,
        schweregrad: 'Mittel',
        art: 'kandidat',
        quelle: opts.quelle ?? 'tastatur-skript (Bildvergleich)',
        url: page.url(),
        element: schritt.selektor,
        problem: `Beim Fokus von „${name}“ ändern sich ${vergleich.geaendert} Pixel, davon nur ${vergleich.kontrastreich} mit Kontrast ≥ 3:1 (Richtwert ≥ ${Math.round(config.fokusMindestanteil * umfang)}).`,
        behebung: 'Fokusrahmen mit mindestens 2 px Stärke und 3:1 Kontrast zur Umgebung verwenden.',
      });
    }
  }
  return befunde;
}

export async function tastatur({ page, bild }: Kontext): Promise<PruefErgebnis> {
  const url = page.url();
  const befunde: Befund[] = [];
  const { anzahl, schritte, imModal, kontextwechsel } = await tabDurchlauf(page);
  const fokus = schritte.filter((s): s is FokusSchritt => !s.body);

  // 3.2.1 Kontextwechsel bei Fokus
  if (kontextwechsel) {
    befunde.push({
      kriterium: '3.2.1',
      titel: 'Seitenwechsel beim Fokussieren',
      schweregrad: 'Hoch',
      art: 'automatisch',
      quelle: 'tastatur-skript',
      url,
      element: kontextwechsel.nach?.selektor,
      problem: `Beim Tabben${kontextwechsel.nach ? ` nach „${kontextwechsel.nach.name || kontextwechsel.nach.tag}“` : ''} wurde ungefragt ${kontextwechsel.url} geöffnet. Der Tastaturtest wurde dort abgebrochen.`,
      behebung: 'Navigation oder neue Fenster nur auf ausdrückliche Aktion (Enter/Klick) auslösen, nie bei focus.',
    });
    await page.goto(url, { waitUntil: 'load' }).catch(() => {});
  }

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
      problem: `Der Fokus kommt bei „${falle.name || falle.tag}“ mit Tab nicht weiter bzw. kreist in einem Teilbereich, der kein modaler Dialog ist.`,
      behebung:
        'Tab/Shift+Tab nicht abfangen. Fokus nur in echten modalen Dialogen festhalten (aria-modal="true" bzw. <dialog>.showModal()).',
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

  // 2.4.1 Skip-Link (nicht im Modal-Zustand)
  const erster = fokus[0];
  const vorMain = fokus.findIndex((s) => s.inMain);
  if (!imModal && erster && !erster.skipLink && (vorMain === -1 || vorMain >= 5)) {
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

  // 2.4.7 Fokus sichtbar – nur bis zur Falle, sonst bleiben wir hängen
  const bisFalle = falle ? fokus.slice(0, fokus.findIndex((s) => s.id === falle.id)) : fokus;
  const eindeutig = bisFalle.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
  befunde.push(
    ...(await fokusSichtbarkeit(page, bild, eindeutig, {
      max: config.maxFokusPruefungen,
      startVorgaenger: imModal ? (eindeutig.at(-1)?.id ?? null) : null,
    })),
  );

  // Modal: Esc schließt? Fokus kehrt zurück?
  if (imModal) {
    const modalSel = fokus.find((s) => s.modal)?.modal;
    if (modalSel) {
      await page.evaluate((id) => (window as any).__a11y.fokusSetzen(id), fokus[0].id);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const nochOffen = await page.locator(modalSel).first().isVisible().catch(() => false);
      if (nochOffen) {
        befunde.push({
          kriterium: '2.1.2',
          titel: 'Dialog nicht per Esc schließbar',
          schweregrad: 'Gering',
          art: 'kandidat',
          quelle: 'tastatur-skript',
          url,
          element: modalSel,
          problem: 'Der modale Dialog bleibt nach Esc offen. Zulässig, wenn ein Schließen-Knopf per Tastatur erreichbar ist – Esc ist aber die erwartete Standardmethode.',
          behebung: '<dialog>.showModal() verwenden (Esc eingebaut) oder keydown-Escape behandeln.',
        });
      } else {
        const zurueck: FokusInfo = await page.evaluate(() => (window as any).__a11y.fokusInfo());
        if (zurueck.body) {
          befunde.push({
            kriterium: '2.4.3',
            titel: 'Fokus nach Schließen des Dialogs verloren',
            schweregrad: 'Mittel',
            art: 'kandidat',
            quelle: 'tastatur-skript',
            url,
            element: modalSel,
            problem: 'Nach dem Schließen liegt der Fokus auf <body> statt auf dem auslösenden Element.',
            behebung: 'Beim Schließen den Fokus auf den Knopf zurücksetzen, der den Dialog geöffnet hat.',
          });
        }
      }
    }
  }

  return {
    seite: '',
    url,
    pruefung: 'tastatur',
    geprueft: ['2.1.1', '2.1.2', '2.4.1', '2.4.3', '2.4.7', '2.4.11', '3.2.1'],
    befunde,
    extras: { tabStopps: new Set(fokus.map((s) => s.id)).size, erwartet: anzahl, modal: imModal },
  };
}
