# Accessibility – Barrierefreiheits-Supertest

Prüft Websites nach **WCAG 2.2 Stufe AA** und ordnet jeden Befund der **EN 301 549** (BFSG) zu. Automatische Regel-Scans (axe-core) werden mit Skripten kombiniert, die einen Großteil der sonst manuellen Prüfung übernehmen: Tastatur, Fokus, Reflow, Textabstand, Formulare. Ein Snapshot-Vergleich sorgt dafür, dass nur Änderungen erneut von Hand geprüft werden.

| | |
| --- | --- |
| Konzept | [docs/konzept.md](docs/konzept.md) |
| Prüfkatalog | [docs/pruefkatalog.md](docs/pruefkatalog.md) |
| Berichtsvorlage | [docs/bericht-vorlage.md](docs/bericht-vorlage.md) |
| Lint-Vorlagen | [templates/lint/](templates/lint/) |
| Claude-Skill | [.claude/skills/a11y-supertest/SKILL.md](.claude/skills/a11y-supertest/SKILL.md) |

## Schnellstart

```bash
npm install
npx playwright install chromium

# Demo-Seite prüfen (startet automatisch einen lokalen Server)
npm run supertest

# Eigene Website prüfen
BASE_URL=https://staging.example.de npm run supertest
```

Ergebnis: `reports/bericht.md` (Übersicht, Befunde, Kandidaten zur manuellen Prüfung, manuelle Restliste) und `playwright-report/` (Details je Test).

## Was automatisch geprüft wird

| Datei | Kriterien | sicher (blockiert Build) | Kandidat (Mensch bewertet) |
| --- | --- | --- | --- |
| `tests/01-axe.spec.ts` | alle axe-Regeln für WCAG 2.0–2.2 A/AA | Verstöße `critical`/`serious` | `incomplete` |
| `tests/02-tastatur.spec.ts` | 2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7, 2.4.11 | Tastaturfalle, unsichtbarer Fokus (Bildvergleich), komplett verdeckter Fokus | klickbar ohne Tastatur, fehlender Skip-Link, Fokussprünge |
| `tests/03-layout.spec.ts` | 1.4.10, 1.4.12 | Querscrollen bei 320 px | Ausnahmen (Tabellen, Code), abgeschnittener Text bei Textabstand |
| `tests/04-formulare.spec.ts` | 3.3.8, 3.3.1 | Einfügen ins Passwortfeld blockiert | keine Fehlermeldung bei leerem Absenden (opt-in) |
| `tests/05-aria-snapshot.spec.ts` | 1.3.1, 4.1.2 (Regression) | jede Änderung im Accessibility-Tree | – |

Alles andere steht im Bericht unter **„Bleibt manuell“**.

## Konfiguration

Seiten und Zustände in [`a11y.config.ts`](a11y.config.ts):

```ts
const standardSeiten: Seite[] = [
  { name: 'Startseite', path: '/' },
  { name: 'Kontakt', path: '/kontakt' },
  {
    name: 'Startseite – Menü geöffnet',
    path: '/',
    setup: async (page) => page.getByRole('button', { name: 'Menü' }).click(),
  },
];
```

| Umgebungsvariable | Wirkung |
| --- | --- |
| `BASE_URL` | Zu prüfende Website. Leer = Demo-Seite unter `demo/` |
| `A11Y_PAGES` | Kommagetrennte Pfade, überschreibt die Seitenliste (`/,/kontakt`) |
| `A11Y_FORMS_SUBMIT=1` | Formulare leer absenden – **nur auf Staging**, kann Daten erzeugen |

## ARIA-Snapshots

Der erste Lauf legt je Seite einen Snapshot des Accessibility-Trees unter `tests/__snapshots__/<host>/` an und schlägt dabei einmalig fehl. Snapshots einchecken:

```bash
BASE_URL=https://staging.example.de npm run snapshots:update
git add tests/__snapshots__
```

Danach zeigt jede Abweichung im Diff genau, was sich geändert hat. Gewollte Änderungen mit demselben Befehl übernehmen.

## CI (Phase 7)

[`.github/workflows/barrierefreiheit.yml`](.github/workflows/barrierefreiheit.yml) läuft bei jedem Pull Request, bei Pushes auf `main`, nächtlich und manuell. Ziel-URL über die Repository-Variable `A11Y_BASE_URL` setzen (Settings → Secrets and variables → Actions → Variables). Der Bericht erscheint in der Job-Zusammenfassung und als Artefakt.

## Selbsttest

`demo/kaputt.html` enthält absichtlich Barrieren. Damit lässt sich prüfen, ob die Skripte anschlagen:

```bash
npm run selbsttest   # muss fehlschlagen und Befunde melden
```

Erwartet: Tastaturfalle, unsichtbarer Fokus, verdeckter Fokus, Querscrollen, blockiertes Einfügen (sicher) sowie div-Button, fehlender Skip-Link, abgeschnittener Text (Kandidaten). axe meldet zusätzlich Kontrast, fehlenden Alt-Text, fehlendes Label und fehlendes `lang`.

## Mit Claude

Der Skill `a11y-supertest` führt den kompletten Ablauf (Phasen 1–7) inklusive der manuellen Prüfung der Kandidaten und einer KI-Vorprüfung von Alt-Texten, Linktexten und Fehlermeldungen. In Claude Code in diesem Repository einfach fragen: „Führe den Supertest für https://… aus“.

## Grenzen

Ersetzt weder Tests mit Menschen mit Behinderung noch ein zertifiziertes Audit. Echte Screenreader-Ausgabe muss ein Mensch prüfen.
