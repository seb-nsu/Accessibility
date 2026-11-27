// Wandelt den Markdown-Bericht in eine eigenständige HTML-Seite um (reports/bericht.html),
// damit auch Fachfremde ihn per Doppelklick im Browser lesen können. Bewusst klein: nur die
// Elemente, die scripts/report.ts erzeugt (Überschriften, Tabellen, Listen mit Kästchen, Absätze,
// `Code`, **fett**). Ohne Abhängigkeiten.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:)]|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function zellen(zeile: string): string[] {
  // „\|“ ist ein Strich im Text, kein Spaltentrenner
  return zeile
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, '|').trim());
}

export function markdownZuHtml(md: string, titel = 'Barrierefreiheits-Bericht'): string {
  const z = md.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < z.length) {
    const l = z[i];
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) {
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      i++;
    } else if (l.trim().startsWith('|') && i + 1 < z.length && /^\s*\|?\s*:?-{2,}/.test(z[i + 1])) {
      const kopf = zellen(l);
      i += 2;
      const rows: string[] = [];
      while (i < z.length && z[i].trim().startsWith('|')) {
        rows.push('<tr>' + zellen(z[i]).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
        i++;
      }
      out.push(`<table><thead><tr>${kopf.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`);
    } else if (/^\s*[-*]\s+/.test(l)) {
      const items: string[] = [];
      while (i < z.length && /^\s*[-*]\s+/.test(z[i])) {
        const t = z[i].replace(/^\s*[-*]\s+/, '');
        const box = /^\[( |x)\]\s+(.*)$/i.exec(t);
        items.push(box ? `<li class="aufgabe"><input type="checkbox" disabled${box[1].toLowerCase() === 'x' ? ' checked' : ''}> ${inline(box[2])}</li>` : `<li>${inline(t)}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
    } else if (/^>\s?/.test(l)) {
      const zitat: string[] = [];
      while (i < z.length && /^>\s?/.test(z[i])) zitat.push(z[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(zitat.join(' '))}</blockquote>`);
    } else if (l.trim() === '') {
      i++;
    } else {
      const absatz: string[] = [];
      while (i < z.length && z[i].trim() !== '' && !/^(#|>|\s*[-*]\s|\s*\|)/.test(z[i])) absatz.push(z[i++]);
      out.push(`<p>${inline(absatz.join(' '))}</p>`);
    }
  }
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titel)}</title><style>
body{font:16px/1.5 system-ui,sans-serif;max-width:1100px;margin:0 auto;padding:24px;color:#1d1d1b;background:#fff}
h1{font-size:26px}h2{font-size:21px;margin-top:32px;border-bottom:1px solid #ddd;padding-bottom:4px}h3{font-size:17px}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:14px}th,td{border:1px solid #d0d0d0;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#f3f3f1}tbody tr:nth-child(even){background:#fafaf8}code{font-size:13px;background:#f3f3f1;padding:1px 4px;border-radius:3px;word-break:break-all}
li.aufgabe{list-style:none;margin-left:-20px}blockquote{margin:12px 0;padding:8px 14px;border-left:4px solid #2f5d8a;background:#f3f6fa}@media (prefers-color-scheme:dark){body{background:#171716;color:#ecebe6}th{background:#26251f}
tbody tr:nth-child(even){background:#1e1d1a}th,td{border-color:#3a3934}code{background:#26251f}a{color:#7fb0de}}
</style></head><body>
${out.join('\n')}
</body></html>
`;
}
