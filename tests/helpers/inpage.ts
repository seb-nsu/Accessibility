/**
 * Helfer, die im Browser laufen. Wird per page.addInitScript() injiziert
 * und muss deshalb vollständig in sich geschlossen sein (keine Imports).
 */
export function installA11yHelpers() {
  const w = window as unknown as { __a11y: unknown };
  if (w.__a11y) return;

  const TABBABLE =
    'a[href],area[href],button,input,select,textarea,summary,iframe,[tabindex],[contenteditable=""],[contenteditable="true"],audio[controls],video[controls]';

  let zaehler = 0;
  const idVon = (el: Element) => {
    if (!el.hasAttribute('data-a11y-id')) el.setAttribute('data-a11y-id', String(++zaehler));
    return el.getAttribute('data-a11y-id')!;
  };

  const selektor = (el: Element): string => {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const teile: string[] = [];
    let e: Element | null = el;
    while (e && e.nodeType === 1 && teile.length < 5) {
      if (e.id) {
        teile.unshift(`#${CSS.escape(e.id)}`);
        break;
      }
      let t = e.tagName.toLowerCase();
      const klassen = Array.from(e.classList)
        .filter((c) => !c.startsWith('a11y-'))
        .slice(0, 2)
        .map((c) => `.${CSS.escape(c)}`)
        .join('');
      t += klassen;
      const eltern: Element | null = e.parentElement;
      if (eltern) {
        const gleiche = Array.from(eltern.children).filter((c) => c.tagName === e!.tagName);
        if (gleiche.length > 1) t += `:nth-of-type(${gleiche.indexOf(e) + 1})`;
      }
      teile.unshift(t);
      e = eltern;
    }
    return teile.join(' > ');
  };

  const name = (el: Element): string => {
    const h = el as HTMLElement & { alt?: string; placeholder?: string };
    const n =
      el.getAttribute('aria-label') ||
      (el.getAttribute('aria-labelledby') || '')
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent || '')
        .join(' ') ||
      h.innerText ||
      h.alt ||
      el.getAttribute('title') ||
      h.placeholder ||
      '';
    return n.replace(/\s+/g, ' ').trim().slice(0, 80);
  };

  const sichtbar = (el: Element): boolean => {
    const anyEl = el as Element & { checkVisibility?: (o?: object) => boolean };
    if (anyEl.checkVisibility && !anyEl.checkVisibility({ visibilityProperty: true, opacityProperty: false })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const istFixiert = (el: Element | null): boolean => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const p = getComputedStyle(e).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return false;
  };

  const tabbables = (): Element[] => {
    const gesehenRadio = new Set<string>();
    return Array.from(document.querySelectorAll(TABBABLE)).filter((el) => {
      const h = el as HTMLElement & { disabled?: boolean; type?: string; name?: string };
      if (h.tabIndex < 0 || h.disabled) return false;
      if (h.closest('[inert]')) return false;
      if (el.tagName === 'INPUT' && h.type === 'hidden') return false;
      if (!sichtbar(el)) return false;
      if (el.tagName === 'INPUT' && h.type === 'radio' && h.name) {
        if (gesehenRadio.has(h.name)) return false;
        gesehenRadio.add(h.name);
      }
      return true;
    });
  };

  /** Ist das Element vollständig von fixierten/sticky Elementen verdeckt? (2.4.11) */
  const verdeckt = (el: Element): { verdeckt: boolean; durch?: string } => {
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return { verdeckt: false };
    const clamp = (v: number, max: number) => Math.min(Math.max(v, 1), max - 1);
    const punkte = [
      [r.left + 2, r.top + 2],
      [r.right - 2, r.top + 2],
      [r.left + 2, r.bottom - 2],
      [r.right - 2, r.bottom - 2],
      [r.left + r.width / 2, r.top + r.height / 2],
    ].map(([x, y]) => [clamp(x, vw), clamp(y, vh)]);
    let durch: Element | null = null;
    for (const [x, y] of punkte) {
      const oben = document.elementFromPoint(x, y);
      if (!oben || oben === el || el.contains(oben) || oben.contains(el)) return { verdeckt: false };
      if (!istFixiert(oben)) return { verdeckt: false };
      durch = oben;
    }
    return { verdeckt: true, durch: durch ? selektor(durch) : undefined };
  };

  const fokusInfo = () => {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
    if (!el || el === document.body || el === document.documentElement) return { body: true as const };
    const r = el.getBoundingClientRect();
    const v = verdeckt(el);
    return {
      body: false as const,
      id: idVon(el),
      selektor: selektor(el),
      name: name(el),
      tag: el.tagName.toLowerCase(),
      fixiert: istFixiert(el),
      x: r.left + window.scrollX,
      y: r.top + window.scrollY,
      breite: r.width,
      hoehe: r.height,
      verdeckt: v.verdeckt,
      verdecktDurch: v.durch,
      skipLink:
        el.tagName === 'A' &&
        (el.getAttribute('href') || '').startsWith('#') &&
        (el.getAttribute('href') || '').length > 1 &&
        !!document.getElementById(decodeURIComponent((el.getAttribute('href') || '').slice(1))),
      inMain: !!el.closest('main,[role="main"]'),
    };
  };

  /** Element per Tastatur-Fokus-ID wiederfinden */
  const perId = (id: string) => document.querySelector(`[data-a11y-id="${id}"]`);

  /** Klickbar wirkende Elemente, die per Tastatur nicht erreichbar sind (2.1.1) */
  const klickbarOhneTastatur = () => {
    const interaktiv = 'a[href],button,input,select,textarea,summary,label,[tabindex],[contenteditable]';
    const treffer: { selektor: string; name: string }[] = [];
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      if (treffer.length >= 25) break;
      const h = el as HTMLElement;
      const hatOnclick = h.hasAttribute('onclick');
      const zeiger = getComputedStyle(h).cursor === 'pointer';
      if (!hatOnclick && !zeiger) continue;
      if (h.closest(interaktiv) || h.querySelector(interaktiv)) continue;
      // Nur das äußerste Element einer Zeiger-Gruppe melden
      if (zeiger && !hatOnclick && h.parentElement && getComputedStyle(h.parentElement).cursor === 'pointer') continue;
      if (!sichtbar(h) || !h.innerText?.trim()) continue;
      treffer.push({ selektor: selektor(h), name: name(h) });
    }
    return treffer;
  };

  /** Elemente, deren Textinhalt abgeschnitten wird (für 1.4.12) */
  const abgeschnitten = (): string[] => {
    const liste: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const h = el as HTMLElement;
      if (!h.innerText || !h.innerText.trim()) continue;
      const cs = getComputedStyle(h);
      const versteckt = (o: string) => o === 'hidden' || o === 'clip';
      const y = versteckt(cs.overflowY) && h.scrollHeight > h.clientHeight + 2;
      const x = versteckt(cs.overflowX) && h.scrollWidth > h.clientWidth + 2;
      if ((x || y) && sichtbar(h) && h.clientHeight > 0) {
        // visuell versteckte Hilfstexte (sr-only) ignorieren
        if (h.clientWidth <= 1 || h.clientHeight <= 1) continue;
        liste.push(selektor(h));
      }
    }
    return liste;
  };

  /** Elemente, die bei schmalem Viewport über den rechten Rand ragen (1.4.10) */
  const ueberbreite = () => {
    const cw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const scrollt = (e: Element | null) => {
      for (let p = e; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
      }
      return false;
    };
    const ausnahme = 'table,pre,code,svg,canvas,video,iframe,[role="img"],[role="application"]';
    const taeter: { selektor: string; ausnahme: boolean; rechts: number }[] = [];
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const r = el.getBoundingClientRect();
      if (r.right <= cw + 1 || r.width === 0) continue;
      if (scrollt(el.parentElement)) continue;
      // nur das oberste überstehende Element melden
      const eltern = el.parentElement;
      if (eltern && eltern !== document.body && eltern.getBoundingClientRect().right > cw + 1) continue;
      taeter.push({ selektor: selektor(el), ausnahme: !!el.closest(ausnahme), rechts: Math.round(r.right) });
      if (taeter.length >= 15) break;
    }
    return { cw, sw, querscroll: sw > cw + 1, taeter };
  };

  /** Blockiert ein Feld das Einfügen? (3.3.8) */
  const einfuegenBlockiert = () => {
    const felder = Array.from(document.querySelectorAll('input[type="password"], input[autocomplete="one-time-code"]'));
    return felder.map((el) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'test');
      const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      const durchgelassen = el.dispatchEvent(ev);
      return { selektor: selektor(el), blockiert: !durchgelassen };
    });
  };

  w.__a11y = {
    tabbableAnzahl: () => tabbables().length,
    fokusInfo,
    perId,
    selektor,
    klickbarOhneTastatur,
    abgeschnitten,
    ueberbreite,
    einfuegenBlockiert,
    scrollZu: (id: string) => {
      const el = perId(id);
      el?.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el?.getBoundingClientRect();
      return r ? { x: r.left, y: r.top, breite: r.width, hoehe: r.height } : null;
    },
    fokusSetzen: (id: string | null) => {
      if (id === null) {
        // Startpunkt der Tab-Navigation an den Seitenanfang setzen
        (document.activeElement as HTMLElement | null)?.blur?.();
        window.scrollTo(0, 0);
        document.body.tabIndex = -1;
        document.body.focus({ preventScroll: true });
        document.body.removeAttribute('tabindex');
        return;
      }
      (perId(id) as HTMLElement | null)?.focus({ preventScroll: true });
    },
    blur: () => (document.activeElement as HTMLElement | null)?.blur?.(),
  };
}

// Typen für page.evaluate
export interface FokusSchritt {
  body: false;
  id: string;
  selektor: string;
  name: string;
  tag: string;
  fixiert: boolean;
  x: number;
  y: number;
  breite: number;
  hoehe: number;
  verdeckt: boolean;
  verdecktDurch?: string;
  skipLink: boolean;
  inMain: boolean;
}
export type FokusInfo = FokusSchritt | { body: true };
