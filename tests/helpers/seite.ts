import type { Page } from '@playwright/test';
import type { Seite } from '../../a11y.config';
import { installA11yHelpers } from './inpage';

/** Ruhige Darstellung: keine Animationen/Übergänge, kein blinkender Cursor. */
const RUHE_CSS = `*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}`;

/**
 * Seite laden und in den gewünschten Zustand bringen.
 * Helfer stehen danach im Browser als window.__a11y bereit.
 */
export async function vorbereiten(page: Page, seite: Seite) {
  await page.addInitScript(installA11yHelpers);
  await page.goto(seite.path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  await page.addStyleTag({ content: RUHE_CSS });
  if (seite.setup) await seite.setup(page);
  await page.mouse.move(0, 0);
}
