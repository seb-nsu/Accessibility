/** WCAG-2.2-Erfolgskriterien (Stufe A/AA) mit deutschem Namen. */
export const KRITERIEN: Record<string, { name: string; stufe: 'A' | 'AA' }> = {
  '1.1.1': { name: 'Nicht-Text-Inhalt', stufe: 'A' },
  '1.2.1': { name: 'Reine Audio- und Videoinhalte', stufe: 'A' },
  '1.2.2': { name: 'Untertitel (aufgezeichnet)', stufe: 'A' },
  '1.2.3': { name: 'Audiodeskription oder Medienalternative', stufe: 'A' },
  '1.2.4': { name: 'Untertitel (live)', stufe: 'AA' },
  '1.2.5': { name: 'Audiodeskription (aufgezeichnet)', stufe: 'AA' },
  '1.3.1': { name: 'Info und Beziehungen', stufe: 'A' },
  '1.3.2': { name: 'Bedeutungstragende Reihenfolge', stufe: 'A' },
  '1.3.3': { name: 'Sensorische Eigenschaften', stufe: 'A' },
  '1.3.4': { name: 'Ausrichtung', stufe: 'AA' },
  '1.3.5': { name: 'Bestimmung des Zwecks einer Eingabe', stufe: 'AA' },
  '1.4.1': { name: 'Benutzung von Farbe', stufe: 'A' },
  '1.4.2': { name: 'Audio-Steuerelement', stufe: 'A' },
  '1.4.3': { name: 'Kontrast (Minimum)', stufe: 'AA' },
  '1.4.4': { name: 'Textgröße ändern', stufe: 'AA' },
  '1.4.5': { name: 'Bilder von Text', stufe: 'AA' },
  '1.4.10': { name: 'Reflow', stufe: 'AA' },
  '1.4.11': { name: 'Nicht-Text-Kontrast', stufe: 'AA' },
  '1.4.12': { name: 'Textabstand', stufe: 'AA' },
  '1.4.13': { name: 'Inhalt bei Hover oder Fokus', stufe: 'AA' },
  '2.1.1': { name: 'Tastatur', stufe: 'A' },
  '2.1.2': { name: 'Keine Tastaturfalle', stufe: 'A' },
  '2.1.4': { name: 'Tastaturkurzbefehle', stufe: 'A' },
  '2.2.1': { name: 'Zeiteinteilung anpassbar', stufe: 'A' },
  '2.2.2': { name: 'Pausieren, beenden, ausblenden', stufe: 'A' },
  '2.3.1': { name: 'Grenzwert von dreimaligem Blitzen', stufe: 'A' },
  '2.4.1': { name: 'Blöcke umgehen', stufe: 'A' },
  '2.4.2': { name: 'Seite mit Titel', stufe: 'A' },
  '2.4.3': { name: 'Fokus-Reihenfolge', stufe: 'A' },
  '2.4.4': { name: 'Linkzweck (im Kontext)', stufe: 'A' },
  '2.4.5': { name: 'Verschiedene Methoden', stufe: 'AA' },
  '2.4.6': { name: 'Überschriften und Beschriftungen', stufe: 'AA' },
  '2.4.7': { name: 'Fokus sichtbar', stufe: 'AA' },
  '2.4.11': { name: 'Fokus nicht verdeckt (Minimum)', stufe: 'AA' },
  '2.5.1': { name: 'Zeigergesten', stufe: 'A' },
  '2.5.2': { name: 'Zeigerabbruch', stufe: 'A' },
  '2.5.3': { name: 'Beschriftung im Namen', stufe: 'A' },
  '2.5.4': { name: 'Bewegungsaktivierung', stufe: 'A' },
  '2.5.7': { name: 'Ziehbewegungen', stufe: 'AA' },
  '2.5.8': { name: 'Zielgröße (Minimum)', stufe: 'AA' },
  '3.1.1': { name: 'Sprache der Seite', stufe: 'A' },
  '3.1.2': { name: 'Sprache von Teilen', stufe: 'AA' },
  '3.2.1': { name: 'Bei Fokus', stufe: 'A' },
  '3.2.2': { name: 'Bei Eingabe', stufe: 'A' },
  '3.2.3': { name: 'Konsistente Navigation', stufe: 'AA' },
  '3.2.4': { name: 'Konsistente Erkennung', stufe: 'AA' },
  '3.2.6': { name: 'Konsistente Hilfe', stufe: 'A' },
  '3.3.1': { name: 'Fehlererkennung', stufe: 'A' },
  '3.3.2': { name: 'Beschriftungen oder Anweisungen', stufe: 'A' },
  '3.3.3': { name: 'Fehlerempfehlung', stufe: 'AA' },
  '3.3.4': { name: 'Fehlervermeidung (rechtlich, finanziell, Daten)', stufe: 'AA' },
  '3.3.7': { name: 'Redundante Eingabe', stufe: 'A' },
  '3.3.8': { name: 'Barrierefreie Authentifizierung (Minimum)', stufe: 'AA' },
  '4.1.2': { name: 'Name, Rolle, Wert', stufe: 'A' },
  '4.1.3': { name: 'Statusmeldungen', stufe: 'AA' },
};

/** EN 301 549, Kapitel 9 (Web) spiegelt WCAG 1:1: 1.4.3 → 9.1.4.3 */
export function enKlausel(kriterium: string): string | undefined {
  return KRITERIEN[kriterium] ? `9.${kriterium}` : undefined;
}

/** axe-Tag "wcag143" → "1.4.3" */
export function ausAxeTag(tag: string): string | undefined {
  const m = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
  if (!m) return undefined;
  const k = `${m[1]}.${m[2]}.${m[3]}`;
  return KRITERIEN[k] ? k : undefined;
}
