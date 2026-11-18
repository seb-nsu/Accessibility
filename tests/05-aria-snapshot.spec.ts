/**
 * Regression des Accessibility-Trees (Name, Rolle, Zustand) – "nur Änderungen prüfen".
 *
 * Erster Lauf: Snapshots werden unter tests/__snapshots__/ angelegt → einchecken.
 * Danach: jede Abweichung lässt den Test fehlschlagen. Der Diff zeigt genau,
 * was sich geändert hat – nur diese Stelle wird manuell geprüft (Phase 4 im Kleinen).
 * Gewollte Änderung übernehmen: npm run snapshots:update
 */
import { test, expect } from '@playwright/test';
import { seiten } from '../a11y.config';
import { vorbereiten } from './helpers/seite';

const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

for (const seite of seiten) {
  test(`ARIA-Snapshot: ${seite.name}`, async ({ page }) => {
    await vorbereiten(page, seite);
    await expect(page.locator('body')).toMatchAriaSnapshot({ name: `${slug(seite.name)}.aria.yml` });
  });
}
