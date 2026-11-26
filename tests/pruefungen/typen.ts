import type { Page, TestInfo } from '@playwright/test';
import type { Seite } from '../../a11y.config';
import type { Bildvergleich } from '../helpers/bildvergleich';
import type { Ergebnis } from '../helpers/findings';

export interface Kontext {
  page: Page;
  seite: Seite;
  testInfo: TestInfo;
  bild: Bildvergleich;
}

export type PruefErgebnis = Omit<Ergebnis, 'projekt'>;

/** page.evaluate-Zugriff auf die In-Page-Helfer */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type A11y = any;
