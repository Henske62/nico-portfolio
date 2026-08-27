import gsap from 'gsap';
import { prefersReducedMotion } from './utils.js';

const WIPE_OUT_KEY = 'nh-wipe-out';

export function markPendingWipeOut() {
  try {
    sessionStorage.setItem(WIPE_OUT_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumePendingWipeOut() {
  try {
    if (sessionStorage.getItem(WIPE_OUT_KEY) === '1') {
      sessionStorage.removeItem(WIPE_OUT_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function hasPendingWipeOut() {
  try {
    return (
      sessionStorage.getItem(WIPE_OUT_KEY) === '1' ||
      document.documentElement.classList.contains('is-wipe-pending')
    );
  } catch {
    return document.documentElement.classList.contains('is-wipe-pending');
  }
}

function markEl(overlay) {
  return overlay?.querySelector('.transition-overlay__mark') || null;
}

function withTimeout(promise, ms) {
  return Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    }),
  ]);
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Ghost + solid layers so NH can fill like a progress bar. */
function ensureMarkStructure(mark) {
  if (!mark) return null;
  if (mark.querySelector('.transition-overlay__fill')) return mark;

  const text = (mark.textContent || 'NH').trim() || 'NH';
  mark.textContent = '';
  mark.insertAdjacentHTML(
    'afterbegin',
    `<span class="transition-overlay__ghost">${text}</span><span class="transition-overlay__fill">${text}</span>`,
  );
  return mark;
}

function setMarkFill(mark, fill) {
  if (!mark) return;
  const solid = mark.querySelector('.transition-overlay__fill');
  const t = Math.max(0, Math.min(1, fill));
  mark.style.setProperty('--nh-fill', String(t));
  if (solid) {
    // Fill from bottom → top
    gsap.set(solid, { clipPath: `inset(${(1 - t) * 100}% 0 0 0)` });
  }
}

export function resetOverlay(overlay) {
  if (!overlay) return;
  const mark = ensureMarkStructure(markEl(overlay));
  const fill = mark?.querySelector('.transition-overlay__fill');
  gsap.killTweensOf([overlay, mark, fill].filter(Boolean));
  gsap.set(overlay, { clipPath: 'inset(0 0 100% 0)' });
  if (mark) {
    setMarkFill(mark, 0);
    gsap.set(mark, { autoAlpha: 0, scale: 0.88 });
  }
  document.documentElement.classList.remove('is-wipe-pending');
}

/** Keep overlay fully covering — NH stays visible at current fill. */
export function holdOverlay(overlay) {
  if (!overlay) return;
  const mark = ensureMarkStructure(markEl(overlay));
  gsap.killTweensOf([overlay, mark].filter(Boolean));
  gsap.set(overlay, { clipPath: 'inset(0 0 0% 0)' });
  if (mark) gsap.set(mark, { autoAlpha: 1, scale: 1 });
  document.documentElement.classList.add('is-wipe-pending');
}

/** Cover the viewport; NH appears empty (0% fill). */
export async function wipeIn(overlay) {
  if (!overlay) return;
  const mark = ensureMarkStructure(markEl(overlay));

  if (prefersReducedMotion()) {
    holdOverlay(overlay);
    setMarkFill(mark, 1);
    return;
  }

  setMarkFill(mark, 0);
  gsap.set(overlay, { clipPath: 'inset(0 0 100% 0)' });
  if (mark) gsap.set(mark, { autoAlpha: 0, scale: 0.88 });

  const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
  tl.to(overlay, { clipPath: 'inset(0 0 0% 0)', duration: 0.55 }, 0);
  if (mark) {
    tl.to(mark, { autoAlpha: 1, scale: 1, duration: 0.42, ease: 'power3.out' }, 0.18);
  }
  await withTimeout(tl, 1200);
}

/**
 * Fill NH like a load bar while `ready` resolves; completes to 100% when ready.
 * Wipe should only open after this resolves.
 */
export async function fillNhUntilReady(overlay, ready) {
  const mark = ensureMarkStructure(markEl(overlay));
  if (!mark) {
    await withTimeout(ready, 2500);
    return;
  }

  if (prefersReducedMotion()) {
    setMarkFill(mark, 1);
    await withTimeout(ready, 2500);
    return;
  }

  holdOverlay(overlay);

  const progress = { v: Number.parseFloat(mark.style.getPropertyValue('--nh-fill')) || 0 };

  // Creep toward ~78% while the next page boots (load-bar feel)
  const creep = gsap.to(progress, {
    v: 0.78,
    duration: 2.6,
    ease: 'power1.out',
    onUpdate: () => setMarkFill(mark, progress.v),
  });

  // Never stall the wipe forever (img.decode / WebGL init can hang until a gesture)
  await withTimeout(ready, 2800);

  creep.kill();

  // Snap the rest to full — wipe ends only after this
  await withTimeout(
    gsap.to(progress, {
      v: 1,
      duration: Math.max(0.28, (1 - progress.v) * 0.55),
      ease: 'power2.out',
      onUpdate: () => setMarkFill(mark, progress.v),
    }),
    900,
  );

  setMarkFill(mark, 1);
  await withTimeout(gsap.to({}, { duration: 0.16 }), 400);
}

/** Wait until fonts / above-fold images are ready — always capped so wipe can't stick. */
async function waitUntilPageSettled(scope = document) {
  const budget = delay(700);

  const fonts = document.fonts?.ready
    ? withTimeout(document.fonts.ready, 400)
    : Promise.resolve();

  const root = scope instanceof Element ? scope : document;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const imgs = [...root.querySelectorAll('img')].filter((img) => {
    if (!img.getClientRects().length) return false;
    const r = img.getBoundingClientRect();
    return r.bottom > 0 && r.top < vh * 1.15;
  });

  const images = Promise.all(
    imgs.slice(0, 8).map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      // Kick lazy images so decode isn't stuck waiting for a gesture
      if (img.loading === 'lazy') img.loading = 'eager';
      const decode =
        typeof img.decode === 'function' ? withTimeout(img.decode().catch(() => null), 500) : null;
      if (decode) return decode;
      return withTimeout(
        new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        }),
        500,
      );
    }),
  );

  await Promise.race([Promise.all([fonts, images]), budget]);

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

/** Kick scroll reveals that may have missed IO while covered by the wipe. */
function flushRevealsAfterWipe() {
  try {
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
  } catch {
    /* ignore */
  }
}

/** Reveal the next page — call after fillNhUntilReady (NH already at 100%). */
export async function wipeOut(overlay, scope) {
  if (!overlay) return;
  if (prefersReducedMotion()) {
    resetOverlay(overlay);
    flushRevealsAfterWipe();
    return;
  }

  const mark = ensureMarkStructure(markEl(overlay));
  holdOverlay(overlay);
  setMarkFill(mark, 1);

  const pageScope =
    scope ||
    document.querySelector('[data-barba="container"]:not([aria-hidden="true"])') ||
    document.querySelector('[data-barba="container"]') ||
    document;
  await waitUntilPageSettled(pageScope);

  const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
  if (mark) {
    tl.to(mark, { autoAlpha: 0, scale: 1.04, duration: 0.32, ease: 'power2.in' }, 0);
  }
  tl.to(overlay, { clipPath: 'inset(0 0 100% 0)', duration: 0.58 }, 0.08);
  await withTimeout(tl, 1400);

  setMarkFill(mark, 0);
  document.documentElement.classList.remove('is-wipe-pending');
  flushRevealsAfterWipe();
}

/**
 * After a hard nav: fill NH until ready, then wipe out.
 * @param {Promise<unknown>} [ready]
 */
export async function playPendingWipeOut(ready) {
  const overlay = document.querySelector('.transition-overlay');
  if (!overlay) {
    document.documentElement.classList.remove('is-wipe-pending');
    return;
  }

  const pending =
    consumePendingWipeOut() || document.documentElement.classList.contains('is-wipe-pending');
  if (!pending) return;

  holdOverlay(overlay);
  await fillNhUntilReady(overlay, ready);
  await wipeOut(overlay);
}
