const MODE_KEY = 'nh-site-mode';

export function getSiteMode() {
  const attr = document.documentElement.getAttribute('data-site-mode');
  return attr === 'private' ? 'private' : 'pro';
}

export function isVisibleForMode(el) {
  const modeEl = el?.matches?.('[data-mode]') ? el : el?.closest?.('[data-mode]');
  if (!modeEl?.dataset?.mode) return true;
  return modeEl.dataset.mode === getSiteMode();
}

export function applySiteMode(mode) {
  const next = mode === 'private' ? 'private' : 'pro';
  document.documentElement.setAttribute('data-site-mode', next);
  try {
    localStorage.setItem(MODE_KEY, next);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('sitemodechange', { detail: { mode: next } }));
}

export function readStoredSiteMode() {
  try {
    return localStorage.getItem(MODE_KEY);
  } catch {
    return null;
  }
}

export function initSiteMode() {
  const stored = readStoredSiteMode();
  if (stored === 'private' || stored === 'pro') {
    applySiteMode(stored);
  } else {
    applySiteMode('pro');
  }

  const btn = document.querySelector('[data-mode-toggle]');
  if (!btn) return;

  const onToggle = () => {
    applySiteMode(getSiteMode() === 'private' ? 'pro' : 'private');
  };

  btn.addEventListener('click', onToggle);

  return () => btn.removeEventListener('click', onToggle);
}
