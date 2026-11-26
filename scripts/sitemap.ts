// Liest die Sitemap der Ziel-Website und wählt je Seitenvorlage eine Seite aus.
// Ergebnis: reports/seiten.json → in a11y.config.ts über A11Y_PAGES_FILE eingelesen.
//
// BASE_URL            Website (Pflicht)
// A11Y_SITEMAP_URL    abweichende Sitemap-Adresse (Standard: BASE_URL/sitemap.xml)
// A11Y_MAX_PAGES      Obergrenze Seiten (Standard 50)
// A11Y_PRO_VORLAGE    Seiten je Vorlage (Standard 1)
//
// Vorlage = Pfadmuster: /blog/mein-artikel → /blog/*, /produkte/a/b → /produkte/*/*
// Einzelseiten der ersten Ebene (/impressum, /kontakt) sind jeweils eigene Vorlagen.
import fs from 'node:fs';
import path from 'node:path';

const base = (process.env.BASE_URL ?? '').trim();
if (!base) {
  console.error('BASE_URL fehlt.');
  process.exit(1);
}
const max = Number(process.env.A11Y_MAX_PAGES ?? 50);
const proVorlage = Number(process.env.A11Y_PRO_VORLAGE ?? 1);
const start = process.env.A11Y_SITEMAP_URL || new URL('/sitemap.xml', base).href;
const host = new URL(base).host;

const locs = (xml: string) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

async function laden(url: string, tiefe = 0): Promise<string[]> {
  const res = await fetch(url, { headers: { 'user-agent': 'a11y-supertest' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const xml = await res.text();
  if (/<sitemapindex/i.test(xml) && tiefe < 2) {
    const kinder = locs(xml).slice(0, 20);
    const listen = await Promise.all(kinder.map((k) => laden(k, tiefe + 1).catch(() => [] as string[])));
    return listen.flat();
  }
  return locs(xml);
}

const vorlage = (pfad: string) => {
  const teile = pfad.split('/').filter(Boolean);
  if (teile.length <= 1) return `/${teile.join('/')}`;
  return `/${teile[0]}/${teile.slice(1).map(() => '*').join('/')}`;
};

const urls = (await laden(start)).filter((u) => {
  try {
    return new URL(u).host === host;
  } catch {
    return false;
  }
});

const gruppen = new Map<string, string[]>();
for (const u of urls) {
  const { pathname, search } = new URL(u);
  const v = vorlage(pathname);
  const liste = gruppen.get(v) ?? [];
  if (liste.length < proVorlage) liste.push(pathname + search);
  gruppen.set(v, liste);
}
const auswahl = ['/', ...[...gruppen.values()].flat().filter((p) => p !== '/')].slice(0, max);
const seiten = auswahl.map((p) => ({ name: p, path: p }));

fs.mkdirSync(path.join(process.cwd(), 'reports'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'reports', 'seiten.json'), JSON.stringify(seiten, null, 2));
console.log(`${urls.length} URLs in der Sitemap, ${gruppen.size} Vorlagen → ${seiten.length} Seiten in reports/seiten.json`);
