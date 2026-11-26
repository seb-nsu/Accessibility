// Übernimmt alle aktuell blockierenden Befunde in die Baseline (a11y-baseline.json).
// Gedacht für die Einführung auf einer bestehenden Website: Altfehler werden mit
// Ticket und Ablaufdatum erfasst, danach blockieren nur noch NEUE Fehler den Build.
//
// Aufruf: npm test; node scripts/baseline.ts [--tage 90] [--ticket A11Y-0]
import fs from 'node:fs';
import path from 'node:path';

interface Eintrag {
  seite: string;
  kriterium: string;
  element?: string;
  quelle: string;
  titel: string;
  blockierend: boolean;
}
interface BaselineEintrag {
  kriterium: string;
  element?: string;
  seite?: string;
  quelle?: string;
  ticket: string;
  bis: string;
  grund?: string;
}

const arg = (name: string, standard: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : standard;
};
const tage = Number(arg('tage', '90'));
const ticket = arg('ticket', 'TICKET-ERGAENZEN');

const ergebnisDatei = path.join(process.cwd(), 'reports', 'ergebnis.json');
const baselineDatei = path.join(process.cwd(), 'a11y-baseline.json');
if (!fs.existsSync(ergebnisDatei)) {
  console.error('reports/ergebnis.json fehlt – zuerst "npm test" und "npm run report" ausführen.');
  process.exit(1);
}
const { befunde } = JSON.parse(fs.readFileSync(ergebnisDatei, 'utf8')) as { befunde: Eintrag[] };
const baseline: BaselineEintrag[] = fs.existsSync(baselineDatei) ? JSON.parse(fs.readFileSync(baselineDatei, 'utf8')) : [];

const bis = new Date(Date.now() + tage * 864e5).toISOString().slice(0, 10);
// Projekt-Suffix (z. B. " (mobil)") entfernen: die Baseline gilt pro Seite für alle Projekte
const seiteOhneProjekt = (s: string) => s.replace(/ \((mobil|desktop)\)$/, '');
const regel = (quelle: string) => /\(([\w-]+)\)/.exec(quelle)?.[1] ?? quelle;

let neu = 0;
for (const b of befunde.filter((x) => x.blockierend)) {
  const eintrag: BaselineEintrag = {
    kriterium: b.kriterium,
    element: b.element,
    seite: seiteOhneProjekt(b.seite),
    quelle: regel(b.quelle),
    ticket,
    bis,
    grund: `Altbefund bei Einführung: ${b.titel}`,
  };
  const doppelt = baseline.some(
    (e) => e.kriterium === eintrag.kriterium && e.element === eintrag.element && e.seite === eintrag.seite && e.quelle === eintrag.quelle,
  );
  if (!doppelt) {
    baseline.push(eintrag);
    neu++;
  }
}
fs.writeFileSync(baselineDatei, JSON.stringify(baseline, null, 2) + '\n');
console.log(`${neu} Befund(e) in a11y-baseline.json übernommen (bis ${bis}). Tickets eintragen und einchecken.`);
