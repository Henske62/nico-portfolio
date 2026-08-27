import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { prefersReducedMotion } from './utils.js';
import { getSiteMode } from './mode.js';

gsap.registerPlugin(Flip);

/**
 * Weichie-style need form: bar with pills + option grid.
 */
export function initNeedForm(scope = document) {
  const forms = scope.querySelectorAll('[data-need-form]');
  if (!forms.length) return () => {};

  const cleanups = [...forms].map((form) => setupNeedForm(form));
  return () => cleanups.forEach((fn) => fn());
}

function setupNeedForm(form) {

  const pillsEl = form.querySelector('[data-need-pills]');
  const grid = form.querySelector('[data-need-grid]');
  const addBtn = form.querySelector('[data-need-add]');
  const options = [...form.querySelectorAll('[data-need-option]')];

  if (!pillsEl || !options.length) return () => {};

  const selected = new Set(
    options.filter((o) => o.classList.contains('is-selected')).map((o) => labelOf(o)),
  );

  function labelOf(btn) {
    return btn.querySelector('.need-form__option-label')?.textContent?.trim() || btn.textContent.trim();
  }

  function renderPills({ animate = true } = {}) {
    const doFlip = animate && !prefersReducedMotion();
    const state = doFlip ? Flip.getState([pillsEl, ...pillsEl.children]) : null;

    pillsEl.innerHTML = '';
    [...selected].forEach((label) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'need-form__pill';
      pill.dataset.cursor = 'hover';
      pill.setAttribute('aria-label', `${label} entfernen`);
      pill.innerHTML = `<span>${label}</span><span class="need-form__pill-x" aria-hidden="true">×</span>`;
      pill.addEventListener('click', () => toggle(label));
      pillsEl.appendChild(pill);
    });

    options.forEach((opt) => {
      const on = selected.has(labelOf(opt));
      opt.classList.toggle('is-selected', on);
      const action = opt.querySelector('.need-form__option-action');
      if (action) action.textContent = on ? '−' : '+';
    });

    if (state) {
      Flip.from(state, {
        duration: 0.45,
        ease: 'power3.out',
        absolute: false,
        nested: true,
        targets: pillsEl.children,
      });
    }
  }

  function toggle(label) {
    if (selected.has(label)) {
      if (selected.size <= 1) return; // keep at least one
      selected.delete(label);
    } else {
      selected.add(label);
    }
    renderPills();
  }

  const onOption = (e) => {
    toggle(labelOf(e.currentTarget));
  };

  options.forEach((opt) => opt.addEventListener('click', onOption));

  const onAdd = () => {
    grid?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    form.classList.add('is-picking');
    addBtn?.setAttribute('aria-expanded', 'true');
  };
  addBtn?.addEventListener('click', onAdd);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!selected.size) return;

    const params = new URLSearchParams();
    params.set('needs', [...selected].join('|'));
    window.location.href = `/contact.html?${params.toString()}`;
  };

  form.addEventListener('submit', onSubmit);
  renderPills({ animate: false });

  return () => {
    options.forEach((opt) => opt.removeEventListener('click', onOption));
    addBtn?.removeEventListener('click', onAdd);
    form.removeEventListener('submit', onSubmit);
  };
}

/**
 * Full contact form on /contact.html — prefills needs from query string.
 */
export function initContactPageForm(scope = document) {
  const form = scope.querySelector('[data-contact-form]');
  if (!form) return () => {};

  const params = new URLSearchParams(window.location.search);
  const needs =
    params
      .get('needs')
      ?.split('|')
      .map((s) => s.trim())
      .filter(Boolean) || [];

  const summary = form.querySelector('[data-contact-needs]');
  const hiddenNeeds = form.querySelector('[data-contact-needs-input]');

  if (needs.length && summary) {
    summary.innerHTML = needs
      .map((label) => `<span class="contact-summary__pill">${label}</span>`)
      .join('');
  }

  if (hiddenNeeds) {
    hiddenNeeds.value = needs.length ? needs.join(', ') : 'Art Direction';
  }

  const message = form.querySelector('textarea[name="message"]');
  const syncPlaceholder = () => {
    if (!message) return;
    const mode = getSiteMode();
    const key = mode === 'private' ? 'placeholderPrivate' : 'placeholderPro';
    const next = message.dataset[key];
    if (next) message.setAttribute('placeholder', next);
  };
  syncPlaceholder();
  window.addEventListener('sitemodechange', syncPlaceholder);

  const onSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const msg = String(fd.get('message') || '').trim();
    const needLine = hiddenNeeds?.value || 'Art Direction';
    const privateMode = getSiteMode() === 'private';

    const subject = encodeURIComponent(
      privateMode ? 'Hallo — Nico Hennecke' : 'Projektanfrage — Nico Hennecke',
    );
    const body = encodeURIComponent(
      privateMode
        ? `Name: ${name}\nE-Mail: ${email}\n\nBock auf: ${needLine}\n\n${msg}`
        : `Name: ${name}\nE-Mail: ${email}\n\nIch brauche: ${needLine}\n\n${msg}`,
    );

    window.location.href = `mailto:nico@hennecke.email?subject=${subject}&body=${body}`;
  };

  form.addEventListener('submit', onSubmit);

  return () => {
    form.removeEventListener('submit', onSubmit);
    window.removeEventListener('sitemodechange', syncPlaceholder);
  };
}
