# Berichtsvorlage

`npm run report` erzeugt `reports/bericht.md` automatisch in diesem Format. Für manuelle Befunde (Phase 4) dieselbe Vorlage verwenden.

## Schweregrade

Bewertet wird die Wirkung auf Nutzer:innen, nicht die Anzahl der Fundstellen.

| Schweregrad | Bedeutung | Beispiel | Frist-Empfehlung | axe-impact |
| --- | --- | --- | --- | --- |
| Kritisch | Aufgabe für eine Nutzergruppe unmöglich | Tastaturfalle im Checkout, Button ohne Namen | sofort | critical |
| Hoch | Aufgabe nur mit großem Aufwand möglich | Fokus unsichtbar, Formularfehler nicht angesagt | nächster Release | serious |
| Mittel | Spürbare Hürde, Umweg vorhanden | Kontrast 3,8:1 bei Fließtext | nächstes Quartal | moderate |
| Gering | Stört, behindert kaum | redundanter Alt-Text neben Bildunterschrift | Backlog | minor |

`Kritisch` und `Hoch` lassen den CI-Build fehlschlagen (einstellbar in `a11y.config.ts` → `failOn`). Kandidaten blockieren nie.

## Vorlage pro Befund

```markdown
#### [ID] Kurztitel
- WCAG: 2.4.7 Fokus sichtbar (AA) · EN 301 549: 9.2.4.7
- Schweregrad: Hoch · Betroffen: Tastatur- und sehbehinderte Nutzer:innen
- Seite: Startseite – https://…
- Element: CSS-Selektor / Screenshot
- Fundort Code: Datei:Zeile
- Quelle: axe-core | tastatur-skript | manuell
- Problem: Was passiert, in einem Satz
- Behebung: Konkreter Code-Vorschlag
- Re-Test: offen | bestanden (Datum)
```

## Ergebnis je Seite

- **Konform:** kein Befund auf A- oder AA-Stufe – nach automatischer **und** manueller Prüfung.
- **Teilweise konform:** nur Befunde Mittel/Gering.
- **Nicht konform:** mindestens ein Befund Kritisch oder Hoch.

Dazu die Kennzahl *Kriterien bestanden / geprüft*. Bewusst kein Prozent-Score: ein einziger kritischer Befund zählt mehr als zehn geringe.

Der Bericht ist die Grundlage für die Erklärung zur Barrierefreiheit nach BFSG.
