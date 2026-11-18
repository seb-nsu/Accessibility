# Recherche: Skills und Plugins für Barrierefreiheitstests mit Claude

Stand: 17.11.2026 · Grundlage für die Werkzeugauswahl im [Konzept](konzept-vollstaendig.md#werkzeuge).

## So läuft eine Prüfung mit Claude

1. **Seite angeben:** URL; bei nicht öffentlichen Seiten HTML-Code oder Export.
2. **Live-Prüfung im Browser** (Claude in Chrome): Accessibility-Tree, Alternativtexte und Formular-Labels, Überschriftenstruktur und ARIA, Farbkontraste, Tastaturbedienung (Tab-Reihenfolge, sichtbarer Fokus, Tastaturfallen).
3. **Bericht:** je Befund das verletzte WCAG-Kriterium, Schweregrad und ein konkreter Behebungsvorschlag.

Automatische Tests finden nur einen Teil der Probleme; eine Skill-Bewertung schätzt 30–50 %. Den Rest prüft ein Mensch (Screenreader, Sinn von Alternativtexten).

## Plugins aus dem Anthropic-Verzeichnis

| Plugin | Herausgeber | Leistung | Eignung |
| --- | --- | --- | --- |
| **Axe Accessibility** | Deque (Partner) | Prüfregeln von axe-core, Ablauf Scannen → Beheben → erneut Prüfen, geführte Tastaturtests | Empfehlung, Live + Code |
| **WebAbility Accessibility** | Community | Scannt Seiten und HTML auf WCAG 2.2 / ADA / Section 508, framework-spezifische Fixes | Zweiter Scanner, Live |
| **eaa-audit** | Community (Plainform) | Codebasis gegen WCAG 2.1 AA und EN 301 549 (European Accessibility Act / BFSG), Befunde mit Datei:Zeile | Nur Quellcode, keine Live-URL |
| **Design** | Anthropic | Allgemeine Barrierefreiheitsprüfung von Designs (accessibility-review) | Vor der Umsetzung |
| A11y Enforcer | Community | WCAG-2.2-Probleme in HTML, React, Vue, Svelte, Astro finden und beheben | Code, Alternative |
| Fairmind Design | Community | WCAG-2.1-AA-Audits mit spezialisierten Subagenten (Kontrast, Tastatur, Screenreader) | Design-Systeme |

## Community-Skills aus der Online-Suche

Nicht von Anthropic geprüft – vor der Installation die SKILL.md lesen.

| Skill | Leistung | Eignung | Quelle |
| --- | --- | --- | --- |
| **wcag22-a11y-audit** (AIPex) | Prüft 8 Kernkriterien (1.1.1, 1.4.3, 1.4.11, 2.1.1, 2.1.2, 2.4.3, 2.4.7, 4.1.2) über Accessibility-Tree und visuelle Analyse | Live-Webseiten | [openskillindex](https://openskillindex.com/skills/aipexstudio-aipex-wcag22-a11y-audit), [mcp.directory](https://mcp.directory/skills/wcag22-a11y-audit) |
| **a11y-audit** (alirezarezvani) | Alle Erfolgskriterien der Stufen A und AA, Scannen/Beheben/Verifizieren für React, Next.js, Vue, Angular, Svelte, HTML; CI/CD | Quellcode, CI | [tessl](https://tessl.io/registry/skills/github/alirezarezvani/claude-skills/a11y-audit) |
| **wcag-audit-patterns** (wshobson) | Checklisten, automatische Scans mit axe, Lighthouse, WAVE, manuelle Prüfung, Behebungsmuster | beide | [tessl Review](https://tessl.io/registry/skills/github/wshobson/agents/wcag-audit-patterns/review), [claudepluginhub](https://claudepluginhub.com/skills/fwartner-accessibility-compliance-plugins-accessibility-compliance/wcag-audit-patterns) |
| web-accessibility-audit (warpdotdev) | WCAG-2.0/2.1/2.2-Audit mit Behebungsschritten | beide | [tessl](https://tessl.io/registry/skills/github/warpdotdev/oz-skills/web-accessibility-audit) |
| wcag-auditor (benry-products) | WCAG 2.2 AA, optional VPAT/ACR mit Crosswalk zu Section 508 und EN 301 549 | Live, Konformitätsbericht | [sharedcontext.ai](https://sharedcontext.ai/skills/external/benry-products/wcag-auditor) |
| accessibility (addyosmani) | WCAG-2.2-Richtlinien und Code-Muster für Reviews | Code-Review | [skillstore](https://skillstore.io/skills/addyosmani-accessibility) |

Skills lassen sich als ZIP unter **Settings → Capabilities → Skills → Upload skill** hochladen.

## Entscheidung für den Supertest

- **Mindestausstattung:** Axe Accessibility + Claude in Chrome.
- **Für Code und EN-301-549-Zuordnung:** eaa-audit.
- **Eigene Ergänzung:** Dieses Repository liefert die Skripte, die bisher manuelle Prüfungen übernehmen (Tastatur, Fokus, Reflow, Textabstand, Formulare, Snapshots), und den Skill [`a11y-supertest`](../.claude/skills/a11y-supertest/SKILL.md), der alle Bausteine zu einem Ablauf verbindet.
