import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import { prefersReducedMotion } from './utils.js';

gsap.registerPlugin(Observer);

const THEME_KEY = 'nh-theme';

let observer = null;

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* ignore */
  }
}

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function setMenuOpen(header, toggle, open) {
  header.classList.toggle('is-open', open);
  toggle?.setAttribute('aria-expanded', String(open));
  toggle?.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  document.documentElement.toggleAttribute('data-menu-open', open);
  if (open) {
    header.classList.remove('is-hidden');
  }
}

function initBrandingBeta() {
  document.querySelectorAll('.branding').forEach((el) => {
    if (el.querySelector('.branding__beta')) return;

    const badge = document.createElement('span');
    badge.className = 'branding__beta';
    badge.textContent = 'Beta';
    badge.setAttribute('aria-hidden', 'true');
    el.appendChild(badge);

    const label = el.getAttribute('aria-label');
    if (label && !label.toLowerCase().includes('beta')) {
      el.setAttribute('aria-label', `${label} — Beta`);
    }
  });
}

export function initHeader() {
  destroyHeader();

  const header = document.querySelector('[data-header]');
  if (!header) return;

  initBrandingBeta();

  const stored = readStoredTheme();
  if (stored) applyTheme(stored);
  else if (!document.documentElement.getAttribute('data-theme')) {
    applyTheme('light');
  }

  const onScroll = () => {
    const scrolled = window.scrollY > 24;
    header.classList.toggle('is-scrolled', scrolled);
    document.documentElement.toggleAttribute('data-scrolled', scrolled);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = header.querySelector('[data-nav-toggle]');
  const themeBtn = header.querySelector('[data-theme-toggle]');
  const actionLinks = header.querySelectorAll('.site-header__actions a');

  const closeMenu = () => setMenuOpen(header, toggle, false);

  const onToggle = () => {
    if (!toggle) return;
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setMenuOpen(header, toggle, open);
  };

  const onTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  const onKey = (e) => {
    if (e.key === 'Escape') closeMenu();
  };

  const onResize = () => {
    if (window.matchMedia('(min-width: 980px)').matches) closeMenu();
  };

  toggle?.addEventListener('click', onToggle);
  themeBtn?.addEventListener('click', onTheme);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  actionLinks.forEach((link) => link.addEventListener('click', closeMenu));

  header._cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    toggle?.removeEventListener('click', onToggle);
    themeBtn?.removeEventListener('click', onTheme);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    actionLinks.forEach((link) => link.removeEventListener('click', closeMenu));
    closeMenu();
  };

  if (prefersReducedMotion()) return;

  let last = window.scrollY;

  observer = Observer.create({
    type: 'wheel,touch,scroll',
    onChangeY(self) {
      if (document.documentElement.hasAttribute('data-menu-open')) return;

      const y = window.scrollY;
      if (y < 40) {
        header.classList.remove('is-hidden');
        last = y;
        return;
      }

      if (self.deltaY < 0 || y < last) {
        header.classList.remove('is-hidden');
      } else if (self.deltaY > 0 && y > 80) {
        header.classList.add('is-hidden');
      }
      last = y;
    },
  });
}

export function destroyHeader() {
  observer?.kill();
  observer = null;
  const header = document.querySelector('[data-header]');
  header?._cleanup?.();
  header?.classList.remove('is-hidden', 'is-open', 'is-scrolled');
  document.documentElement.removeAttribute('data-menu-open');
}
