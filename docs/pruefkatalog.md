# Prüfkatalog WCAG 2.2 AA

Der Katalog vereint die 8 Kernkriterien aus wcag22-a11y-audit mit dem vollen A/AA-Umfang aus a11y-audit. Kernkriterien (★) werden immer geprüft, auch im Schnelltest.

**Art:** **A** = automatisch, **M** = manuell, **H** = Automatik findet Kandidaten, Mensch bewertet nur die Auffälligkeiten.

**Automatisierbar über:** **Lint** = Regel im Editor und in der CI ([Vorlagen](../templates/lint/)), **axe** = Regel-Scanner (`tests/pruefungen/axe.ts`), **Skript** = Playwright-Prüfung in `tests/pruefungen/`, **Snapshot** = Vergleich des Accessibility-Trees (Prüfung `snapshot`), **KI** = inhaltliche Vorprüfung durch Claude (Skill `a11y-supertest`).

Die Spalte **Im Repo** zeigt, welche Prüfung (`A11Y_PRUEFUNGEN`) das Kriterium heute automatisch abdeckt.

## Wahrnehmbar

| Kriterium | Stufe | Code-Prüfung | Live-Prüfung | Automatisierbar über | Art | Im Repo |
| --- | --- | --- | --- | --- | --- | --- |
| ★ 1.1.1 Nicht-Text-Inhalt | A | `alt` fehlt, leeres `alt` bei Info-Bildern, Icon-Buttons ohne Namen | Accessibility-Tree: Name jedes Bilds; Alt-Text sinnvoll? | Lint + axe (fehlt); KI (sinnvoll?) | H | axe |
| 1.2.2 / 1.2.4 / 1.2.5 Untertitel, Audiodeskription | A/AA | `<track>` vorhanden? | Medien abspielen, Untertitel prüfen | Lint (`<video>` ohne `<track>`); Qualität manuell | M | – |
| 1.3.1 Info und Beziehungen | A | Semantik: `h1–h6`, Listen, `<th scope>`, `<label for>`, Landmarks | Überschriften-Gliederung, Landmarks im Tree | Lint + axe; Snapshot | H | axe, `snapshot` |
| 1.3.2 Bedeutungstragende Reihenfolge | A | DOM-Reihenfolge vs. CSS-Umordnung | Linearisierte Lesereihenfolge | Skript: DOM- mit Bildschirmreihenfolge vergleichen | H | (über 2.4.3: `tastatur`) |
| 1.3.5 Zweck von Eingabefeldern | AA | `autocomplete` an Personendaten-Feldern | – | axe | A | axe |
| 1.4.1 Benutzung von Farbe | A | Links nur farblich abgesetzt? | Graustufen-Ansicht | axe (Links im Fließtext) | H | axe |
| ★ 1.4.3 Kontrast Text | AA | Farb-Tokens gegen 4,5:1 / 3:1 | Berechnete Farben im gerenderten Zustand | geprüfte Token-Paare + axe | A | axe; Dunkelmodus: `darstellung` |
| 1.4.4 / 1.4.10 Textgröße, Reflow | AA | feste Höhen, `px`-Schriften, `overflow:hidden` | Zoom 200 %, Viewport 320 px | Skript: 320 px, `scrollWidth > clientWidth` | H | `layout` |
| ★ 1.4.11 Kontrast Nicht-Text | AA | Rahmen, Icons, Fokusring gegen 3:1 | Formularrahmen, Bedienelemente | Token-Paare; Skript misst Rahmenfarbe | H | `kontrast`; Fokusring: `tastatur` |
| 1.4.12 Textabstand | AA | – | Textabstände erhöhen: nichts abgeschnitten | Skript: Textabstands-CSS einspielen, Überlauf erkennen | H | `layout` |
| 1.4.13 Inhalt bei Hover/Fokus | AA | Tooltips schließbar mit Esc? | Tooltip per Esc schließen, mit Maus betretbar | Skript: Hover, Esc, Tooltip verschwunden? | H | `hover` |

## Bedienbar

| Kriterium | Stufe | Code-Prüfung | Live-Prüfung | Automatisierbar über | Art | Im Repo |
| --- | --- | --- | --- | --- | --- | --- |
| ★ 2.1.1 Tastatur | A | `onClick` auf `div`/`span` ohne Tastatur | Alles per Tab, Enter, Leertaste, Pfeiltasten bedienbar | Lint; Skript: klickbare Elemente ohne Fokus | H | `tastatur` |
| ★ 2.1.2 Keine Tastaturfalle | A | Modals ohne Esc-Handler | Fokus kommt aus jedem Widget heraus | Skript: Tab-Durchlauf, Fokus hängt/kreist | H | `tastatur` (modale Dialoge erkannt) |
| 2.2.1 / 2.2.2 Zeit, Bewegung | A | Timeouts, Autoplay-Karussells | Pausieren möglich? | Lint (`autoplay`) | M | – |
| 2.3.1 Blitzen | A | – | > 3 Blitze pro Sekunde? | – | M | – |
| 2.4.1 Blöcke umgehen | A | Skip-Link, `<main>` | Skip-Link erster Tab-Stopp | axe; Skript: erster Tab-Stopp | A | axe, `tastatur` |
| 2.4.2 Seitentitel | A | `<title>` eindeutig | – | axe | A | axe |
| ★ 2.4.3 Fokus-Reihenfolge | A | positives `tabindex` | Tab-Reihenfolge folgt der Optik | Lint; Skript: Sprünge gegen die Leserichtung | H | `tastatur` |
| 2.4.4 / 2.4.6 Linkzweck, Überschriften | A/AA | „hier“, „mehr“ als Linktext | Linkliste im Tree verständlich | KI bewertet Link- und Überschriftentexte | H | Skill |
| ★ 2.4.7 Fokus sichtbar | AA | `outline: none` ohne Ersatz | Jeder Tab-Stopp sichtbar markiert | Skript: Bildvergleich mit/ohne Fokus | H | `tastatur` (Kontrast-Schwelle), `darstellung` (Kontrastmodus) |
| 2.4.11 Fokus nicht verdeckt (neu 2.2) | AA | Sticky Header/Cookie-Banner | Fokussiertes Element nicht komplett verdeckt | Skript: Überlappung mit `fixed`/`sticky` | H | `tastatur` |
| 2.5.3 Label im Namen | A | sichtbarer Text ≠ `aria-label` | – | axe | A | axe |
| 2.5.7 Ziehbewegungen (neu 2.2) | AA | Drag-and-drop ohne Alternative | Alternative per Klick vorhanden | – | M | – |
| 2.5.8 Zielgröße (neu 2.2) | AA | Klickflächen < 24 × 24 px | Messung im Browser | axe (`target-size`) | A | axe (desktop + mobil) |

## Verständlich

| Kriterium | Stufe | Code-Prüfung | Live-Prüfung | Automatisierbar über | Art | Im Repo |
| --- | --- | --- | --- | --- | --- | --- |
| 3.1.1 / 3.1.2 Sprache | A/AA | `<html lang="de">`, `lang` an Fremdsprache | – | axe; KI erkennt Fremdsprache ohne `lang` | A | axe |
| 3.2.1 / 3.2.2 Kein Kontextwechsel | A | `onChange` löst Navigation aus | Auswahl ändert Seite ungefragt? | Skript: Fokus/Auswahl ändern, URL-Wechsel erkennen | H | `tastatur` (3.2.1), `eingabe` (3.2.2) |
| 3.2.6 Konsistente Hilfe (neu 2.2) | A | Hilfe-Link in Layout-Komponente | Gleiche Position auf allen Seiten | Skript: Position seitenübergreifend vergleichen | A | Bericht (seitenübergreifend) |
| 3.3.1 / 3.3.3 Fehler erkennen, Vorschläge | A/AA | `aria-invalid`, `aria-describedby` | Formular falsch absenden | Skript: leer absenden, `aria-invalid` + Live-Region; KI bewertet Text | H | `formulare` (opt-in) |
| 3.3.2 Beschriftungen | A | Feld ohne `<label>` | – | Lint + axe | A | axe |
| 3.3.7 Redundante Eingabe (neu 2.2) | A | – | Daten nicht doppelt abgefragt | – | M | – |
| 3.3.8 Barrierearme Anmeldung (neu 2.2) | AA | `paste` blockiert, Captcha ohne Alternative | Login mit Passwortmanager | Skript: Einfügen ins Passwortfeld; Captcha manuell | H | `formulare` |

## Robust

| Kriterium | Stufe | Code-Prüfung | Live-Prüfung | Automatisierbar über | Art | Im Repo |
| --- | --- | --- | --- | --- | --- | --- |
| ★ 4.1.2 Name, Rolle, Wert | A | ARIA-Rollen, Zustände (`aria-expanded`, `aria-checked`) | Tree zeigt Name, Rolle, Zustand | axe; Snapshot je Zustand | H | axe, `snapshot` |
| 4.1.3 Statusmeldungen | AA | `role="status"` / `aria-live` | Meldung wird angesagt | Skript: Aktion auslösen, Live-Region prüfen | H | `formulare` (opt-in) |

4.1.1 Parsing ist in WCAG 2.2 entfallen und wird nicht mehr geprüft.

Weiterhin ohne Automatik (–): Untertitel (1.2.x), Zeit/Bewegung (2.2.x), Blitzen (2.3.1), Ziehbewegungen (2.5.7), redundante Eingabe (3.3.7). Sie stehen im Bericht unter „Bleibt manuell“.
