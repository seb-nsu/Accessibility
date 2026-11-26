---
name: a11y-supertest
description: Barrierefreiheits-Supertest nach WCAG 2.2 AA / EN 301 549 (BFSG) für eine Live-URL, ein Repository oder beides. Verwenden bei "Barrierefreiheit prüfen", "WCAG-Test", "a11y audit", "BFSG-Check", "Supertest".
---

# Barrierefreiheits-Supertest

Prüft Websites gegen **WCAG 2.2 Stufe AA** und ordnet jeden Befund zusätzlich der **EN 301 549**-Klausel zu (Web = Kapitel 9, gleiche Nummer mit „9.“ davor: 1.4.3 → 9.1.4.3).

Grundlagen in diesem Repository:

- `docs/konzept.md` – Ablauf, Modi, Automatisierung
- `docs/pruefkatalog.md` – alle Kriterien mit Code-, Live- und Automatisierungsweg
- `docs/bericht-vorlage.md` – Schweregrade und Befund-Vorlage
- `tests/supertest.spec.ts` + `tests/pruefungen/` + `npm run supertest` – automatische Prüfungen (axe desktop/mobil, Tastatur, Hover, Eingabe, Formulare, Layout, Kontrast-/Dunkelmodus, Snapshots)
- `a11y-baseline.json` – bekannte Altbefunde mit Ticket und Ablaufdatum

## Phase 1 – Umfang klären

Frage nur, was fehlt:

1. **Modus:** Live (URL), Code (Repository) oder kombiniert (empfohlen).
2. **Seiten:** Startseite, je eine Seite pro Vorlage, kritische Abläufe (Login, Suche, Kontakt, Checkout).
3. **Zustände:** Menü offen, Modal, Fehlermeldung, Cookie-Banner.
4. **Tiefe:** Schnelltest (★-Kriterien) oder Volltest (ganzer Katalog).
5. **Formulare absenden erlaubt?** Nur auf Staging (`A11Y_FORMS_SUBMIT=1`).

Trage Seiten und Zustände in `a11y.config.ts` ein (`setup` für Zustände).

## Phase 2 – Automatisch prüfen

**Live**

- Wenn die Shell Netzwerk hat: `BASE_URL=<url> npm run supertest` → `reports/bericht.md`.
- Viele Seiten: `BASE_URL=<url> npm run sitemap` wählt je Seitenvorlage eine Seite → `A11Y_PAGES_FILE=reports/seiten.json`.
- Bestehende Website mit vielen Altfehlern: nach dem ersten Lauf `npm run baseline -- --ticket <ID>` vorschlagen, damit nur neue Fehler blockieren. Nie ungefragt Befunde in die Baseline schreiben.
- Sonst: Axe-Accessibility-Plugin (falls aktiviert) bzw. Claude in Chrome. Im Browser dieselben Prüfungen wie in `tests/helpers/inpage.ts` per JavaScript ausführen (Tab-Durchlauf, Überbreite bei 320 px, Textabstand, Einfügen ins Passwortfeld).
- Optional WebAbility als zweiten Scanner zum Gegenprüfen.

**Code**

- eaa-audit (falls aktiviert) für WCAG + EN-Klausel mit Datei:Zeile.
- Sonst selbst nach Katalog-Spalte *Code-Prüfung* suchen: fehlende `alt`, `onClick` auf `div`/`span`, `outline: none` ohne Ersatz, positives `tabindex`, Felder ohne `<label>`, fehlendes `lang`, `onpaste`-Blocker, fehlende `autocomplete`.
- Prüfen, ob die Lint-Regeln aus `templates/lint/` aktiv sind; falls nicht, als Maßnahme empfehlen.

## Phase 3 – Abgleich

Doppelte Befunde zusammenführen (gleiches Kriterium + Element). Jeden Live-Befund, wo möglich, mit der Code-Stelle verknüpfen (Feld *Fundort Code*).

## Phase 4 – Manuell (nur Kandidaten + Restliste)

Nicht alles erneut prüfen. Bearbeite:

1. Abschnitt **„Zur manuellen Prüfung (Kandidaten)“** im Bericht: je Kandidat entscheiden – echter Befund (mit Schweregrad) oder kein Problem (kurz begründen).
2. Abschnitt **„Bleibt manuell“**: im Browser prüfen, soweit möglich.
3. **KI-Vorprüfung** von Inhalten: Alt-Texte (beschreibt er den Zweck? Dateiname? leer bei Infobild?), Linktexte („hier“, „mehr“), Überschriften-Gliederung, Fehlermeldungen (sagt sie, was zu tun ist?). Ergebnisse als Kandidaten markieren – ein Mensch bestätigt.

Ehrlich bleiben: Echte Screenreader-Ausgabe (NVDA, JAWS, VoiceOver) kann Claude nicht hören. Der Accessibility-Tree zeigt nur, was angesagt *würde*. Dafür eine Aufgabe an den Menschen in den Bericht schreiben.

## Phase 5 – Bericht

Format aus `docs/bericht-vorlage.md`. Pro Seite: Konform / Teilweise konform / Nicht konform + *Kriterien bestanden / geprüft*. Kein Prozent-Score. Als Claude-Dokument veröffentlichen, wenn der Bericht geteilt werden soll; sonst `reports/bericht.md`.

## Phase 6 – Beheben und Re-Test

Für jeden Befund einen konkreten Code-Vorschlag. Nach dem Fix nur die betroffenen Kriterien erneut prüfen und *Re-Test* auf „bestanden (Datum)“ setzen.

## Phase 7 – CI

Workflow `.github/workflows/barrierefreiheit.yml` aktivieren: Repository-Variable `A11Y_BASE_URL` setzen (optional `A11Y_SITEMAP=true` für den nächtlichen Volltest), ARIA-Snapshots einmal mit `BASE_URL=<url> npm run snapshots:update` erzeugen und einchecken. Der Workflow kommentiert PRs mit dem Vergleich zu `main`, lädt SARIF ins Code Scanning und prüft per Selbsttest, dass der Test selbst noch funktioniert.

## Schweregrade (Kurzform)

| Schweregrad | Bedeutung | axe-impact |
| --- | --- | --- |
| Kritisch | Aufgabe unmöglich | critical |
| Hoch | Aufgabe nur mit großem Aufwand | serious |
| Mittel | Hürde, Umweg vorhanden | moderate |
| Gering | stört kaum | minor |
