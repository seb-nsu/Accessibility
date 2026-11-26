import type { BrowserContext, Page } from '@playwright/test';

/**
 * Vergleicht zwei Screenshots (PNG) gleicher Größe pixelweise.
 * Läuft in einer leeren Hilfsseite (about:blank), damit weder zusätzliche
 * Bibliotheken noch die Content-Security-Policy der geprüften Seite stören.
 */
export interface Vergleich {
  /** Pixel, die sich überhaupt verändert haben */
  geaendert: number;
  /** Pixel, deren Farbe sich mit Kontrast ≥ 3:1 verändert hat (WCAG 1.4.11 / 2.4.13) */
  kontrastreich: number;
}

export class Bildvergleich {
  private seite?: Page;
  constructor(private context: BrowserContext) {}

  private async hilfsseite() {
    if (!this.seite) {
      this.seite = await this.context.newPage();
      await this.seite.goto('about:blank');
    }
    return this.seite;
  }

  async vergleichen(vorher: Buffer, nachher: Buffer): Promise<Vergleich> {
    if (vorher.equals(nachher)) return { geaendert: 0, kontrastreich: 0 };
    const p = await this.hilfsseite();
    return p.evaluate(
      async ([a, b]) => {
        const laden = (src: string) =>
          new Promise<HTMLImageElement>((ok, fehler) => {
            const img = new Image();
            img.onload = () => ok(img);
            img.onerror = fehler;
            img.src = `data:image/png;base64,${src}`;
          });
        const [ia, ib] = await Promise.all([laden(a), laden(b)]);
        const w = Math.min(ia.width, ib.width);
        const h = Math.min(ia.height, ib.height);
        const pixel = (img: HTMLImageElement) => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, w, h).data;
        };
        const da = pixel(ia);
        const db = pixel(ib);
        const lin = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        const lum = (d: Uint8ClampedArray, i: number) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
        let geaendert = 0;
        let kontrastreich = 0;
        for (let i = 0; i < da.length; i += 4) {
          if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) <= 12) continue;
          geaendert++;
          const [x, y] = [lum(da, i), lum(db, i)].sort((m, n) => n - m);
          if ((x + 0.05) / (y + 0.05) >= 3) kontrastreich++;
        }
        return { geaendert, kontrastreich };
      },
      [vorher.toString('base64'), nachher.toString('base64')] as const,
    );
  }

  async schliessen() {
    await this.seite?.close().catch(() => {});
  }
}
