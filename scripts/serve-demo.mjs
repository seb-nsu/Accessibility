// Minimaler statischer Server für die Demo-Seiten (ohne Abhängigkeiten).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'demo');
const port = Number(process.env.PORT ?? 4173);
const typen = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

http
  .createServer((req, res) => {
    const pfad = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let datei = path.normalize(path.join(root, pfad));
    if (!datei.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(datei) && fs.statSync(datei).isDirectory()) datei = path.join(datei, 'index.html');
    fs.readFile(datei, (err, inhalt) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Nicht gefunden');
        return;
      }
      res.writeHead(200, { 'content-type': typen[path.extname(datei)] ?? 'application/octet-stream' }).end(inhalt);
    });
  })
  .listen(port, '127.0.0.1', () => console.log(`Demo läuft auf http://127.0.0.1:${port}`));
