// Vergleicht das aktuelle Ergebnis mit dem letzten Stand von main und schreibt
// reports/delta.md – Text für den PR-Kommentar.
// Aufruf: node scripts/delta.ts reports/ergebnis.json basis/ergebnis.json
import fs from 'node:fs';
import path from 'node:path';

interface Eintrag {
  seite: string;
  kriterium: string;
  titel: string;
  schweregrad: string;
  art: 'automatisch' | 'kandidat';
  element?: string;
  schluessel: string;
  blockierend: boolean;
}
type Datei = { stand: string; blockierend: number; befunde: Eintrag[] };

const [aktuellPfad = 'reports/ergebnis.json', basisPfad = 'basis/ergebnis.json'] = process.argv.slice(2);
const lesen = (p: string): Datei | undefined => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : undefined);
const aktuell = lesen(aktuellPfad);
if (!aktuell) {
  console.error(`${aktuellPfad} fehlt.`);
  process.exit(1);
}
const basis = lesen(basisPfad);

const zeile = (b: Eintrag) =>
  `| ${b.blockierend ? '❌' : b.art === 'kandidat' ? '🔍' : '⚠️'} ${b.schweregrad} | ${b.kriterium} | ${b.titel.replace(/\|/g, '\\|')} | ${b.seite.replace(/\|/g, '\\|')} | ${b.element ? `\`${b.element.replace(/\|/g, '\\|')}\`` : '–'} |`;

const z: string[] = ['<!-- a11y-supertest -->', '## ♿ Barrierefreiheit', ''];
const sicher = (l: Eintrag[]) => l.filter((b) => b.art === 'automatisch');
if (!basis) {
  z.push(`Kein Vergleichsstand von \`main\` vorhanden (erster Lauf). Aktuell: **${aktuell.blockierend} blockierend**, ${sicher(aktuell.befunde).length} sichere Befunde, ${aktuell.befunde.length - sicher(aktuell.befunde).length} Kandidaten.`);
} else {
  const alt = new Set(basis.befunde.map((b) => b.schluessel));
  const jetzt = new Set(aktuell.befunde.map((b) => b.schluessel));
  const neu = aktuell.befunde.filter((b) => !alt.has(b.schluessel));
  const behoben = basis.befunde.filter((b) => !jetzt.has(b.schluessel));
  const neuBlock = neu.filter((b) => b.blockierend).length;
  z.push(
    `Gegenüber \`main\`: **+${neu.length} neu** (davon ${neuBlock} blockierend) · **−${behoben.length} behoben** · ${aktuell.befunde.length - neu.length} unverändert.`,
    '',
  );
  const tabelle = (titel: string, liste: Eintrag[]) => {
    if (!liste.length) return;
    z.push(`### ${titel}`, '', '| | WCAG | Befund | Seite | Element |', '| --- | --- | --- | --- | --- |');
    for (const b of liste.slice(0, 30)) z.push(zeile(b));
    if (liste.length > 30) z.push(`| … | | ${liste.length - 30} weitere im Bericht | | |`);
    z.push('');
  };
  tabelle('Neu', neu.sort((a, b) => Number(b.blockierend) - Number(a.blockierend)));
  tabelle('Behoben', behoben);
}
z.push('', 'Vollständiger Bericht: Job-Zusammenfassung bzw. Artefakt `barrierefreiheit-…`.');
fs.mkdirSync(path.dirname(aktuellPfad), { recursive: true });
fs.writeFileSync(path.join(path.dirname(aktuellPfad), 'delta.md'), z.join('\n'));
console.log(z.slice(0, 5).join('\n'));
