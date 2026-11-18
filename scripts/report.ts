// Erzeugt reports/bericht.md aus den Rohbefunden der Tests (reports/raw/*.json).
// Aufruf: node scripts/report.ts   (Node ≥ 22.18, Typen werden nativ entfernt)
import fs from 'node:fs';
import path from 'node:path';
import { KRITERIEN, enKlausel } from '../tests/helpers/wcag.ts';

type Schweregrad = 'Kritisch' | 'Hoch' | 'Mittel' | 'Gering';
interface Befund {
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
}
interface Ergebnis {
  seite: string;
  url: string;
  pruefung: string;
  geprueft: string[];
  befunde: Befund[];
}

const REIHE: Schweregrad[] = ['Kritisch', 'Hoch', 'Mittel', 'Gering'];
const rawDir = path.join(process.cwd(), 'reports', 'raw');
const ziel = path.join(process.cwd(), 'reports', 'bericht.md');

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

// Nach Seite gruppieren
const seiten = new Map<string, { url: string; geprueft: Set<string>; befunde: Befund[] }>();
for (const e of ergebnisse) {
  const s = seiten.get(e.seite) ?? { url: e.url, geprueft: new Set<string>(), befunde: [] };
  e.geprueft.forEach((k) => s.geprueft.add(k));
  s.befunde.push(...e.befunde);
  seiten.set(e.seite, s);
}

// Doppelte Befunde (gleiches Kriterium, Element, Titel) zusammenführen – Phase 3 "Abgleich"
const schluessel = (b: Befund) => `${b.kriterium}|${b.element ?? ''}|${b.titel}|${b.art}`;
for (const s of seiten.values()) {
  const m = new Map<string, Befund>();
  for (const b of s.befunde) {
    const vorhanden = m.get(schluessel(b));
    if (!vorhanden) m.set(schluessel(b), b);
    else if (!vorhanden.quelle.includes(b.quelle)) vorhanden.quelle += ` + ${b.quelle}`;
  }
  s.befunde = [...m.values()];
}

const zeilen: string[] = [];
const heute = new Date().toISOString().slice(0, 10);
zeilen.push('# Barrierefreiheits-Bericht', '');
zeilen.push(`Stand: ${heute} · Maßstab: WCAG 2.2 Stufe AA / EN 301 549 Kap. 9 · Ziel: ${[...seiten.values()][0]?.url ?? '–'}`, '');
zeilen.push(
  '> Automatischer Teil des Supertests (Phasen 2–3). Ein „Konform“ gilt erst, wenn auch die Kandidaten und die manuelle Prüfliste (unten) abgearbeitet sind.',
  '',
);

// Übersicht
zeilen.push('## Übersicht', '');
zeilen.push('| Seite | Ergebnis | Kritisch | Hoch | Mittel | Gering | Kandidaten | Kriterien bestanden / geprüft |');
zeilen.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
let gesamtBlockierend = 0;
for (const [name, s] of seiten) {
  const sicher = s.befunde.filter((b) => b.art === 'automatisch');
  const zahl = (g: Schweregrad) => sicher.filter((b) => b.schweregrad === g).length;
  const kandidaten = s.befunde.filter((b) => b.art === 'kandidat').length;
  const verletzt = new Set(sicher.map((b) => b.kriterium).filter((k) => KRITERIEN[k]));
  const geprueft = [...s.geprueft].filter((k) => KRITERIEN[k]);
  const bestanden = geprueft.filter((k) => !verletzt.has(k)).length;
  const blockierend = zahl('Kritisch') + zahl('Hoch');
  gesamtBlockierend += blockierend;
  const ergebnis = blockierend
    ? '❌ Nicht konform'
    : sicher.length
      ? '⚠️ Teilweise konform'
      : kandidaten
        ? '🔍 Automatisch ok, Kandidaten offen'
        : '✅ Automatisch ok';
  zeilen.push(
    `| ${esc(name)} | ${ergebnis} | ${zahl('Kritisch')} | ${zahl('Hoch')} | ${zahl('Mittel')} | ${zahl('Gering')} | ${kandidaten} | ${bestanden} / ${geprueft.length} |`,
  );
}
zeilen.push('');

// Sichere Befunde
zeilen.push('## Befunde', '');
let nr = 0;
let irgendeiner = false;
for (const grad of REIHE) {
  const liste = [...seiten].flatMap(([seite, s]) =>
    s.befunde.filter((b) => b.art === 'automatisch' && b.schweregrad === grad).map((b) => ({ seite, b })),
  );
  if (!liste.length) continue;
  irgendeiner = true;
  zeilen.push(`### ${grad} (${liste.length})`, '');
  for (const { seite, b } of liste) {
    nr++;
    const en = enKlausel(b.kriterium);
    zeilen.push(`#### B${String(nr).padStart(3, '0')} ${b.titel}`, '');
    zeilen.push(`- WCAG: ${kName(b.kriterium)}${en ? ` · EN 301 549: ${en}` : ''}`);
    zeilen.push(`- Schweregrad: ${b.schweregrad}`);
    zeilen.push(`- Seite: ${seite} – ${b.url}`);
    if (b.element) zeilen.push(`- Element: \`${b.element}\``);
    zeilen.push(`- Fundort Code: _offen – im Abgleich ergänzen_`);
    zeilen.push(`- Quelle: ${b.quelle}`);
    zeilen.push(`- Problem: ${b.problem}`);
    if (b.behebung) zeilen.push(`- Behebung: ${b.behebung}`);
    if (b.hilfe) zeilen.push(`- Mehr: ${b.hilfe}`);
    zeilen.push('- Re-Test: offen', '');
  }
}
if (!irgendeiner) zeilen.push('Keine sicheren Befunde.', '');

// Kandidaten
const kandidaten = [...seiten].flatMap(([seite, s]) =>
  s.befunde.filter((b) => b.art === 'kandidat').map((b) => ({ seite, b })),
);
zeilen.push('## Zur manuellen Prüfung (Kandidaten)', '');
if (kandidaten.length) {
  zeilen.push('Verdachtsfälle der Skripte. Ein Mensch entscheidet: echter Befund oder kein Problem.', '');
  zeilen.push('| Seite | Kriterium | Hinweis | Element | Quelle |');
  zeilen.push('| --- | --- | --- | --- | --- |');
  for (const { seite, b } of kandidaten) {
    zeilen.push(`| ${esc(seite)} | ${esc(kName(b.kriterium))} | ${esc(b.titel)}: ${esc(b.problem)} | ${b.element ? `\`${esc(b.element)}\`` : '–'} | ${esc(b.quelle)} |`);
  }
} else {
  zeilen.push('Keine Kandidaten.');
}
zeilen.push('');

// Manuelle Restliste
const abgedeckt = new Set([...seiten.values()].flatMap((s) => [...s.geprueft]));
const offen = Object.keys(KRITERIEN).filter((k) => !abgedeckt.has(k));
zeilen.push('## Bleibt manuell', '');
zeilen.push('Diese Kriterien hat kein Skript abgedeckt. Prüfung im Volltest bzw. für neue/geänderte Komponenten:', '');
for (const k of offen) zeilen.push(`- [ ] ${kName(k)}`);
zeilen.push('- [ ] Kritische Abläufe einmal mit Screenreader (NVDA/VoiceOver) durchspielen');
zeilen.push('- [ ] Alt-Texte, Linktexte, Fehlermeldungen inhaltlich bewerten (KI-Vorprüfung + Bestätigung)', '');

fs.mkdirSync(path.dirname(ziel), { recursive: true });
fs.writeFileSync(ziel, zeilen.join('\n'));
console.log(`Bericht geschrieben: ${path.relative(process.cwd(), ziel)} (${gesamtBlockierend} blockierende Befunde)`);
