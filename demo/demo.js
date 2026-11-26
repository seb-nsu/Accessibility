// Menü
const knopf = document.getElementById('menueknopf');
const menue = document.getElementById('menue');
knopf?.addEventListener('click', () => {
  const offen = knopf.getAttribute('aria-expanded') === 'true';
  knopf.setAttribute('aria-expanded', String(!offen));
  menue.hidden = offen;
});

// Dialog: showModal() hält den Fokus im Dialog, Esc schließt, Fokus kehrt zum Auslöser zurück
const dialog = document.getElementById('dialog');
const dialogknopf = document.getElementById('dialogknopf');
dialogknopf?.addEventListener('click', () => dialog.showModal());
dialog?.addEventListener('close', () => dialogknopf.focus());

// Tooltips: Esc blendet aus (1.4.13), erneutes Überfahren zeigt wieder an
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.tipp').forEach((t) => t.classList.add('aus'));
});
document.querySelectorAll('.tipp').forEach((t) => {
  t.addEventListener('mouseleave', () => t.classList.remove('aus'));
  t.addEventListener('focusout', () => t.classList.remove('aus'));
});

// Kontaktformular mit zugänglicher Fehlerbehandlung
const form = document.getElementById('kontaktformular');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  let fehler = 0;
  for (const feld of form.querySelectorAll('[required]')) {
    const ok = feld.value.trim() !== '' && feld.checkValidity();
    feld.setAttribute('aria-invalid', String(!ok));
    document.getElementById(feld.id + '-fehler').hidden = ok;
    if (!ok) fehler++;
  }
  document.getElementById('status').textContent = fehler
    ? `${fehler} Feld(er) fehlerhaft. Bitte korrigieren.`
    : 'Danke, Ihre Nachricht wurde gesendet.';
  if (fehler) form.querySelector('[aria-invalid="true"]').focus();
});
