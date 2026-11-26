// Erzeugt aus den Rohbefunden (reports/raw/*.json):
//   reports/bericht.md     lesbarer Bericht
//   reports/ergebnis.json  alle Befunde mit Schlüssel (für den PR-Vergleich, scripts/delta.ts)
//   reports/a11y.sarif     für GitHub Code Scanning
// Aufruf: node scripts/report.ts   (Node ≥ 22.18, Typen werden nativ entfernt)
import fs from 'node:fs';
import path from 'node:path';
import { KRITERIEN, enKlausel } from '../tests/helpers/wcag.ts';

type Schweregrad = 'Kritisch' | 'Hoch' | 'Mittel' | 'Gering';
export interface Befund {
  kriterium: string;
  titel: string;
  schweregrad: Schweregrad;
  art: 'automatisch' | 'kandidat';
  quelle: string;
  url: string;
  element?: string;
  problem: string;
  behebung?: string;
  hilfe?: string;
  baseline?: { ticket: string; bis: string; abgelaufen: boolean; grund?: string };
}
interface Ergebnis {
  seite: string;
  projekt: string;
  url: string;
  pruefung: string;
  geprueft: string[];
  befunde: Befund[];
  extras?: Record<string, unknown>;
}
export interface Eintrag extends Befund {
  seite: string;
  schluessel: string;
  blockierend: boolean;
}

const REIHE: Schweregrad[] = ['Kritisch', 'Hoch', 'Mittel', 'Gering'];
const BLOCKIEREND: Schweregrad[] = ['Kritisch', 'Hoch'];
const reports = path.join(process.cwd(), 'reports');
const rawDir = path.join(reports, 'raw');

if (!fs.existsSync(rawDir)) {
  console.error('Keine Rohbefunde gefunden (reports/raw). Zuerst "npm test" ausführen.');
  process.exit(1);
}

const ergebnisse: Ergebnis[] = fs
  .readdirSync(rawDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8')));

const kName = (k: string) => (KRITERIEN[k] ? `${k} ${KRITERIEN[k].name} (${KRITERIEN[k].stufe})` : k);
const esc = (s = '') => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const seitenName = (e: { seite: string; projekt?: string }) =>
  e.projekt && e.projekt !== 'desktop' ? `${e.seite} (${e.projekt})` : e.seite;
const istBlockierend = (b: Befund) =>
  b.art === 'automatisch' && BLOCKIEREND.includes(b.schweregrad) && !(b.baseline && !b.baseline.abgelaufen);

// ---------- Nach Seite gruppieren ----------
const seiten = new Map<string, { url: string; geprueft: Set<string>; befunde: Befund[] }>();
for (const e of ergebnisse) {
  const name = seitenName(e);
  const s = seiten.get(name) ?? { url: e.url, geprueft: new Set<string>(), befunde: [] };
  e.geprueft.forEach((k) => s.geprueft.add(k));
  s.befunde.push(...e.befunde);
  seiten.set(name, s);
}

// ---------- 3.2.6 Konsistente Hilfe (seitenübergreifend) ----------
type Hilfe = { name: string; href: string; bereich: string; selektor: string };
const strukturen = ergebnisse.filter((e) => e.pruefung === 'struktur');
const proZiel = new Map<string, { seite: string; bereich: string; url: string; selektor: string; name: string }[]>();
for (const e of strukturen) {
  for (const h of (e.extras?.hilfe as Hilfe[] | undefined) ?? []) {
    const ziel = (h.href || h.name).toLowerCase();
    const liste = proZiel.get(ziel) ?? [];
    liste.push({ seite: seitenName(e), bereich: h.bereich, url: e.url, selektor: h.selektor, name: h.name });
    proZiel.set(ziel, liste);
  }
}
const pfade = new Set(strukturen.map((e) => new URL(e.url).pathname));
if (pfade.size >= 2) {
  for (const s of seiten.values()) s.geprueft.add('3.2.6');
  for (const [ziel, liste] of proZiel) {
    const bereiche = new Set(liste.map((l) => l.bereich));
    if (bereiche.size < 2) continue;
    const verteilung = [...bereiche].map((b) => `${b}: ${liste.filter((l) => l.bereich === b).map((l) => l.seite).join(', ')}`).join(' · ');
    for (const l of liste) {
      seiten.get(l.seite)?.befunde.push({
        kriterium: '3.2.6',
        titel: 'Hilfe nicht überall an derselben Stelle',
        schweregrad: 'Mittel',
        art: 'kandidat',
        quelle: 'bericht (seitenübergreifend)',
        url: l.url,
        element: l.selektor,
        problem: `Hilfe „${l.name || ziel}“ steht je nach Seite in unterschiedlichen Bereichen – ${verteilung}.`,
        behebung: 'Hilfe-Link/Kontakt in einer gemeinsamen Layout-Komponente an fester Position ausgeben.',
      });
    }
  }
}

// ---------- Doppelte Befunde zusammenführen (Phase 3 "Abgleich") ----------
const schluessel = (seite: string, b: Befund) => `${seite}|${b.kriterium}|${b.element ?? ''}|${b.titel}|${b.art}`;
for (const [name, s] of seiten) {
  const m = new Map<string, Befund>();
  for (const b of s.befunde) {
    const k = schluessel(name, b);
    const vorhanden = m.get(k);
    if (!vorhanden) m.set(k, b);
    else if (!vorhanden.quelle.includes(b.quelle)) vorhanden.quelle += ` + ${b.quelle}`;
  }
  s.befunde = [...m.values()];
}

const alle: Eintrag[] = [...seiten].flatMap(([seite, s]) =>
  s.befunde.map((b) => ({ ...b, seite, schluessel: schluessel(seite, b), blockierend: istBlockierend(b) })),
);

// ---------- Markdown ----------
const z: string[] = [];
const heute = new Date().toISOString().slice(0, 10);
z.push('# Barrierefreiheits-Bericht', '');
z.push(`Stand: ${heute} · Maßstab: WCAG 2.2 Stufe AA / EN 301 549 Kap. 9 · Ziel: ${[...seiten.values()][0]?.url ?? '–'}`, '');
z.push(
  '> Automatischer Teil des Supertests. Ein „Konform“ gilt erst, wenn auch die Kandidaten und die manuelle Prüfliste (unten) abgearbeitet sind.',
  '',
);

z.push('## Übersicht', '');
z.push('| Seite | Ergebnis | Kritisch | Hoch | Mittel | Gering | Kandidaten | Baseline | Kriterien bestanden / geprüft |');
z.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
let gesamtBlockierend = 0;
for (const [name, s] of seiten) {
  const offen = s.befunde.filter((b) => b.art === 'automatisch' && !(b.baseline && !b.baseline.abgelaufen));
  const zahl = (g: Schweregrad) => offen.filter((b) => b.schweregrad === g).length;
  const kandidaten = s.befunde.filter((b) => b.art === 'kandidat').length;
  const baseline = s.befunde.filter((b) => b.baseline && !b.baseline.abgelaufen).length;
  const verletzt = new Set(offen.map((b) => b.kriterium).filter((k) => KRITERIEN[k]));
  const geprueft = [...s.geprueft].filter((k) => KRITERIEN[k]);
  const bestanden = geprueft.filter((k) => !verletzt.has(k)).length;
  const blockierend = zahl('Kritisch') + zahl('Hoch');
  gesamtBlockierend += blockierend;
  const ergebnis = blockierend
    ? '❌ Nicht konform'
    : offen.length
      ? '⚠️ Teilweise konform'
      : kandidaten
        ? '🔍 Automatisch ok, Kandidaten offen'
        : '✅ Automatisch ok';
  z.push(
    `| ${esc(name)} | ${ergebnis} | ${zahl('Kritisch')} | ${zahl('Hoch')} | ${zahl('Mittel')} | ${zahl('Gering')} | ${kandidaten} | ${baseline} | ${bestanden} / ${geprueft.length} |`,
  );
}
z.push('');

z.push('## Befunde', '');
let nr = 0;
let irgendeiner = false;
for (const grad of REIHE) {
  const liste = alle.filter((b) => b.art === 'automatisch' && b.schweregrad === grad && !(b.baseline && !b.baseline.abgelaufen));
  if (!liste.length) continue;
  irgendeiner = true;
  z.push(`### ${grad} (${liste.length})`, '');
  for (const b of liste) {
    nr++;
    const en = enKlausel(b.kriterium);
    z.push(`#### B${String(nr).padStart(3, '0')} ${b.titel}`, '');
    z.push(`- WCAG: ${kName(b.kriterium)}${en ? ` · EN 301 549: ${en}` : ''}`);
    z.push(`- Schweregrad: ${b.schweregrad}`);
    z.push(`- Seite: ${b.seite} – ${b.url}`);
    if (b.element) z.push(`- Element: \`${b.element}\``);
    z.push('- Fundort Code: _offen – im Abgleich ergänzen_');
    z.push(`- Quelle: ${b.quelle}`);
    z.push(`- Problem: ${b.problem}`);
    if (b.behebung) z.push(`- Behebung: ${b.behebung}`);
    if (b.hilfe) z.push(`- Mehr: ${b.hilfe}`);
    if (b.baseline?.abgelaufen) z.push(`- ⚠️ Baseline ${b.baseline.ticket} ist am ${b.baseline.bis} abgelaufen – blockiert wieder.`);
    z.push('- Re-Test: offen', '');
  }
}
if (!irgendeiner) z.push('Keine offenen sicheren Befunde.', '');

const bekannt = alle.filter((b) => b.baseline && !b.baseline.abgelaufen);
z.push('## Bekannte Befunde (Baseline)', '');
if (bekannt.length) {
  z.push('Toleriert bis zum angegebenen Datum, blockieren den Build nicht. Verwaltung in `a11y-baseline.json`.', '');
  z.push('| Seite | Kriterium | Titel | Element | Ticket | bis |');
  z.push('| --- | --- | --- | --- | --- | --- |');
  for (const b of bekannt) {
    z.push(`| ${esc(b.seite)} | ${esc(kName(b.kriterium))} | ${esc(b.titel)} | ${b.element ? `\`${esc(b.element)}\`` : '–'} | ${esc(b.baseline!.ticket)} | ${b.baseline!.bis} |`);
  }
} else {
  z.push('Keine.');
}
z.push('');

const kandidaten = alle.filter((b) => b.art === 'kandidat');
z.push('## Zur manuellen Prüfung (Kandidaten)', '');
if (kandidaten.length) {
  z.push('Verdachtsfälle der Skripte. Ein Mensch entscheidet: echter Befund oder kein Problem.', '');
  z.push('| Seite | Kriterium | Schweregrad | Hinweis | Element | Quelle |');
  z.push('| --- | --- | --- | --- | --- | --- |');
  for (const b of kandidaten) {
    z.push(
      `| ${esc(b.seite)} | ${esc(kName(b.kriterium))} | ${b.schweregrad} | ${esc(b.titel)}: ${esc(b.problem)} | ${b.element ? `\`${esc(b.element)}\`` : '–'} | ${esc(b.quelle)} |`,
    );
  }
} else {
  z.push('Keine Kandidaten.');
}
z.push('');

const abgedeckt = new Set([...seiten.values()].flatMap((s) => [...s.geprueft]));
z.push('## Bleibt manuell', '');
z.push('Diese Kriterien hat kein Skript abgedeckt. Prüfung im Volltest bzw. für neue/geänderte Komponenten:', '');
for (const k of Object.keys(KRITERIEN).filter((k) => !abgedeckt.has(k))) z.push(`- [ ] ${kName(k)}`);
z.push('- [ ] Kritische Abläufe einmal mit Screenreader (NVDA/VoiceOver) durchspielen');
z.push('- [ ] Alt-Texte, Linktexte, Fehlermeldungen inhaltlich bewerten (KI-Vorprüfung + Bestätigung)', '');

fs.mkdirSync(reports, { recursive: true });
fs.writeFileSync(path.join(reports, 'bericht.md'), z.join('\n'));
fs.writeFileSync(
  path.join(reports, 'ergebnis.json'),
  JSON.stringify({ stand: new Date().toISOString(), blockierend: gesamtBlockierend, befunde: alle }, null, 2),
);

// ---------- SARIF 2.1.0 für GitHub Code Scanning ----------
// Live-Befunde haben keine Quelltextstelle; sie werden der Seitenkonfiguration
// (a11y.config.ts) zugeordnet. URL und Selektor stehen in der Meldung.
const regeln = new Map<string, { id: string; name: string; helpUri?: string }>();
const level = (b: Eintrag) => (b.art === 'kandidat' ? 'note' : BLOCKIEREND.includes(b.schweregrad) ? 'error' : 'warning');
const sarif = {
  $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
  version: '2.1.0',
  runs: [
    {
      tool: { driver: { name: 'a11y-supertest', informationUri: 'https://www.w3.org/TR/WCAG22/', rules: [] as unknown[] } },
      results: alle
        .filter((b) => !(b.baseline && !b.baseline.abgelaufen))
        .map((b) => {
          const id = `WCAG-${b.kriterium}`;
          if (!regeln.has(id)) regeln.set(id, { id, name: KRITERIEN[b.kriterium]?.name ?? b.kriterium, helpUri: b.hilfe });
          return {
            ruleId: id,
            level: level(b),
            message: {
              text: `[${b.schweregrad}${b.art === 'kandidat' ? ', Kandidat' : ''}] ${b.titel} – ${b.seite} (${b.url})${b.element ? ` · ${b.element}` : ''}: ${b.problem}`,
            },
            locations: [{ physicalLocation: { artifactLocation: { uri: 'a11y.config.ts' }, region: { startLine: 1 } } }],
            partialFingerprints: { a11y: b.schluessel },
          };
        }),
    },
  ],
};
sarif.runs[0].tool.driver.rules = [...regeln.values()].map((r) => ({
  id: r.id,
  name: r.name.replace(/[^\w]+/g, ''),
  shortDescription: { text: `WCAG ${r.id.slice(5)} ${r.name}` },
  ...(r.helpUri ? { helpUri: r.helpUri } : {}),
}));
fs.writeFileSync(path.join(reports, 'a11y.sarif'), JSON.stringify(sarif, null, 2));

console.log(`Bericht geschrieben: reports/bericht.md (${gesamtBlockierend} blockierende Befunde, ${kandidaten.length} Kandidaten)`);
