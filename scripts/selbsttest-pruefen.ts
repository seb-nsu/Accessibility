// Prüft den Selbsttest: Hat der Supertest auf demo/kaputt.html alle eingebauten
// Barrieren gefunden – und auf der sauberen Seite keine Fehlalarme gemeldet?
// Erwartungen: tests/selbsttest.erwartet.json
// Aufruf (nach dem Testlauf und "node scripts/report.ts"): node scripts/selbsttest-pruefen.ts
import fs from 'node:fs';

interface Erwartung {
  beschreibung: string;
  seite: string;
  kriterium?: string;
  art?: 'automatisch' | 'kandidat';
  quelle?: string;
  titel?: string;
}
interface Eintrag {
  seite: string;
  kriterium: string;
  art: string;
  quelle: string;
  titel: string;
}

const { erwartet, sauber } = JSON.parse(fs.readFileSync('tests/selbsttest.erwartet.json', 'utf8')) as {
  erwartet: Erwartung[];
  sauber: string[];
};
const { befunde } = JSON.parse(fs.readFileSync('reports/ergebnis.json', 'utf8')) as { befunde: Eintrag[] };

let fehler = 0;
console.log('Selbsttest – erwartete Befunde');
for (const e of erwartet) {
  const treffer = befunde.some(
    (b) =>
      b.seite === e.seite &&
      (!e.kriterium || b.kriterium === e.kriterium) &&
      (!e.art || b.art === e.art) &&
      (!e.quelle || b.quelle.includes(e.quelle)) &&
      (!e.titel || b.titel.includes(e.titel)),
  );
  console.log(`${treffer ? '  ✓' : '  ✗'} ${e.beschreibung}`);
  if (!treffer) fehler++;
}

console.log('Selbsttest – keine Fehlalarme auf sauberen Seiten');
for (const s of sauber) {
  const falsch = befunde.filter((b) => b.seite === s && b.art === 'automatisch');
  console.log(`${falsch.length ? '  ✗' : '  ✓'} ${s}: ${falsch.length} sichere Befunde`);
  for (const b of falsch) console.log(`      ${b.kriterium} ${b.titel} (${b.quelle})`);
  fehler += falsch.length;
}

if (fehler) {
  console.error(`\nSelbsttest fehlgeschlagen: ${fehler} Abweichung(en).`);
  process.exit(1);
}
console.log('\nSelbsttest bestanden.');
