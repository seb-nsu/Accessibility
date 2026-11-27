# Accessibility – Barrierefreiheits-Supertest

Prüft Websites nach **WCAG 2.2 Stufe AA** und ordnet jeden Befund der **EN 301 549** (BFSG) zu. Ein Regel-Scan (axe-core) wird mit Skripten kombiniert, die einen Großteil der sonst manuellen Prüfung übernehmen: Tastatur, Fokus, Reflow, Textabstand, Tooltips, Formulare, Kontrastmodus und Dunkelmodus. Snapshot-Vergleich und Baseline sorgen dafür, dass nur Neues und Geändertes Aufmerksamkeit braucht.

| | |
| --- | --- |
| Konzept (vollständig) | [docs/konzept-vollstaendig.md](docs/konzept-vollstaendig.md) |
| Konzept (Kurzfassung) | [docs/konzept.md](docs/konzept.md) |
| Recherche Skills & Plugins | [docs/skills-und-plugins.md](docs/skills-und-plugins.md) |
| Prüfkatalog | [docs/pruefkatalog.md](docs/pruefkatalog.md) |
| Berichtsvorlage | [docs/bericht-vorlage.md](docs/bericht-vorlage.md) |
| Lint-Vorlagen | [templates/lint/](templates/lint/) |
| Claude-Skill | [.claude/skills/a11y-supertest/SKILL.md](.claude/skills/a11y-supertest/SKILL.md) |

## Schnellstart

**Mit einem Befehl:** `./supertest.sh https://www.example.de` (Windows: `supertest.bat https://www.example.de`, ohne Adresse
werden die Demo-Seiten geprüft). Beim ersten Mal installiert das Skript Pakete und Chromium; am Ende öffnet sich
`reports/bericht.html`.

Von Hand:

```bash
npm ci
npx playwright install chromium

npm run supertest           # Demo-Seiten prüfen (startet lokalen Server)
BASE_URL=https://staging.example.de npm run supertest   # eigene Website
```

Ergebnis in `reports/`:

| Datei | Inhalt |
| --- | --- |
| `bericht.md` | Übersicht je Seite, Befunde, bekannte Befunde (Baseline), Kandidaten zur manuellen Prüfung, manuelle Restliste |
| `bericht.html` | derselbe Bericht als Webseite – per Doppelklick lesbar, auch für Fachfremde |
| `ergebnis.json` | alle Befunde maschinenlesbar (Grundlage für den PR-Vergleich und die Baseline) |
| `a11y.sarif` | für GitHub Code Scanning |

## Was geprüft wird

Alle Prüfungen laufen in **einem Test pro Seite und Zustand** (`tests/supertest.spec.ts`). Die Seite wird einmal geladen, nur wo nötig neu.

| Prüfung (`A11Y_PRUEFUNGEN`) | Kriterien | sicher (blockiert Build) | Kandidat (Mensch bewertet) |
| --- | --- | --- | --- |
| `snapshot` | 1.3.1, 4.1.2 (Regression) | jede Änderung im Accessibility-Tree | – |
| `axe` | alle axe-Regeln WCAG 2.0–2.2 A/AA, desktop **und mobil** | Verstöße `critical`/`serious` | `incomplete` |
| `kontrast` | 1.4.11 | – (Mittel) | – |
| `tastatur` | 2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7, 2.4.11, 3.2.1 | Tastaturfalle (außerhalb modaler Dialoge), unsichtbarer Fokus, verdeckter Fokus, Seitenwechsel bei Fokus | schwacher Fokus (< 3:1), klickbar ohne Tastatur, Skip-Link, Fokussprünge, Dialog ohne Esc / Fokus nicht zurück |
| `hover` | 1.4.13 | – | Tooltip nicht per Esc ausblendbar, nicht überfahrbar |
| `eingabe` | 3.2.2 | – | Auswahl löst Seitenwechsel aus |
| `formulare` | 3.3.8 (+ 3.3.1, 4.1.3 opt-in) | Einfügen ins Passwortfeld blockiert | fehlende Fehlermeldung, Statusmeldung ohne Live-Region |
| `layout` | 1.4.10, 1.4.12 | Querscrollen bei 320 px | Ausnahmen (Tabellen), abgeschnittener Text |
| `darstellung` | 2.4.7 im **Kontrastmodus**, 1.4.3 im **Dunkelmodus** | Kontrastverstöße im Dunkelmodus | Fokus im Kontrastmodus unsichtbar (z. B. nur `box-shadow`) |
| Bericht | 3.2.6 (seitenübergreifend) | – | Hilfe/Kontakt nicht überall an derselben Stelle |

Projekt `mobil` (Pixel 7, Touch) führt axe aus; dort greifen u. a. Zielgröße (2.5.8) und Reflow anders. Alles andere steht im Bericht unter **„Bleibt manuell“**.

## Konfiguration

Seiten und Zustände in [`a11y.config.ts`](a11y.config.ts):

```ts
const standardSeiten: Seite[] = [
  { name: 'Startseite', path: '/' },
  { name: 'Startseite – Menü geöffnet', path: '/', setup: oeffne(/menü/i) },
  { name: 'Startseite – Dialog geöffnet', path: '/', setup: oeffne(/newsletter/i) },
  { name: 'Kontakt', path: '/kontakt' },
];
```

| Umgebungsvariable | Wirkung |
| --- | --- |
| `BASE_URL` | Zu prüfende Website. Leer = Demo-Seiten unter `demo/` |
| `A11Y_PAGES` | Kommagetrennte Pfade, überschreibt die Seitenliste (`/,/kontakt`) |
| `A11Y_PAGES_FILE` | JSON-Seitenliste, z. B. aus `npm run sitemap` |
| `A11Y_PRUEFUNGEN` | Auswahl, z. B. `axe,tastatur` (Standard: alle) |
| `A11Y_FORMS_SUBMIT=1` | Formulare leer absenden – **nur auf Staging**, kann Daten erzeugen |
| `A11Y_SELECTS=0` | `<select>`-Felder für 3.2.2 nicht umstellen |

## Einführung auf einer bestehenden Website: Baseline

Eine bestehende Website hat fast immer Altfehler. Damit der Test trotzdem sofort nützt, werden sie einmalig erfasst; danach blockieren nur **neue** Fehler den Build.

```bash
BASE_URL=https://staging.example.de npm run supertest
npm run baseline -- --ticket A11Y-100 --tage 90   # schreibt a11y-baseline.json
git add a11y-baseline.json
```

Jeder Eintrag hat Ticket und Ablaufdatum (`bis`). Abgelaufene Einträge blockieren wieder. Bekannte Befunde stehen im Bericht in einem eigenen Abschnitt.

## ARIA-Snapshots

```bash
BASE_URL=https://staging.example.de npm run snapshots:update
git add tests/__snapshots__
```

Danach zeigt jede Abweichung im Diff genau, was sich geändert hat. Gewollte Änderungen mit demselben Befehl übernehmen. Snapshots liegen je Zielsystem getrennt (`tests/__snapshots__/<host>/`).

## Viele Seiten: Sitemap

```bash
BASE_URL=https://www.example.de npm run sitemap      # → reports/seiten.json, je Vorlage eine Seite
A11Y_PAGES_FILE=reports/seiten.json A11Y_PRUEFUNGEN=axe,kontrast,tastatur,hover,eingabe,formulare,layout,darstellung npm run supertest
```

Vorlage = Pfadmuster (`/blog/mein-artikel` → `/blog/*`). Grenzen: `A11Y_MAX_PAGES` (50), `A11Y_PRO_VORLAGE` (1).

## CI (Phase 7)

[`.github/workflows/barrierefreiheit.yml`](.github/workflows/barrierefreiheit.yml) läuft bei jedem Pull Request, auf `main`, nächtlich und manuell:

- **Supertest** gegen `A11Y_BASE_URL` (Repository-Variable) bzw. die Demo. Mit `A11Y_SITEMAP=true` liest der nächtliche Lauf die Seiten aus der Sitemap.
- **PR-Kommentar** mit dem Vergleich zum letzten Stand von `main`: „+2 neu (1 blockierend) · −3 behoben“. Aussagekräftig, wenn `A11Y_BASE_URL` auf eine Vorschau-Umgebung des PRs zeigt.
- **Code Scanning:** Befunde als SARIF (sofern Code Scanning im Repository verfügbar ist).
- **Selbsttest:** prüft, dass der Supertest auf `demo/kaputt.html` alle eingebauten Barrieren findet und auf der sauberen Demo keine Fehlalarme meldet ([Erwartungen](tests/selbsttest.erwartet.json)).
- Browser und npm-Pakete werden zwischengespeichert.

Weitere Workflows: [`lockfile.yml`](.github/workflows/lockfile.yml) hält `package-lock.json` aktuell; [Dependabot](.github/dependabot.yml) schlägt Updates für Playwright, axe und Actions als PR vor – Supertest und Selbsttest laufen dort, bevor etwas in `main` landet.

## Selbsttest lokal

```bash
npm run selbsttest   # muss "Selbsttest bestanden." melden
```

## Mit Claude

Der Skill `a11y-supertest` führt den kompletten Ablauf (Phasen 1–7) inklusive der manuellen Prüfung der Kandidaten und einer KI-Vorprüfung von Alt-Texten, Linktexten und Fehlermeldungen. In Claude Code in diesem Repository fragen: „Führe den Supertest für https://… aus“.

## Grenzen

Ersetzt weder Tests mit Menschen mit Behinderung noch ein zertifiziertes Audit. Echte Screenreader-Ausgabe muss ein Mensch prüfen. Kontrastmodus und Dunkelmodus werden per Browser-Emulation geprüft; das Verhalten echter Betriebssystem-Einstellungen kann im Detail abweichen.
