import barba from '@barba/core';
import gsap from 'gsap';
import { resetLenis } from './lenis.js';
import { destroyPage, initPage } from './page.js';
import { prefersReducedMotion } from './utils.js';
import { initHeader } from './header.js';
import { getCarousel } from './carousel/HeroCarousel.js';
import { markSkipHeroIntro } from './heroIntro.js';
import {
  fillNhUntilReady,
  holdOverlay,
  playPendingWipeOut,
  resetOverlay,
  wipeIn,
  wipeOut,
} from './transition.js';

function syncNav(namespace) {
  document.querySelectorAll('.nav-main__link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const isHome = namespace === 'home' && (href === '/' || href === '/index.html');
    const isCv = namespace === 'cv' && href.includes('cv');
    const isContact = namespace === 'contact' && href.includes('contact');
    link.classList.toggle('is-active', Boolean(isHome || isCv || isContact));
  });
  initHeader();
}

function isHomePath(path = window.location.pathname) {
  return path === '/' || path === '/index.html' || path.endsWith('/index.html');
}

function currentNamespace() {
  return (
    document.querySelector('[data-barba="container"]:not([aria-hidden="true"])')?.dataset
      .barbaNamespace ||
    document.querySelector('[data-barba="container"]')?.dataset.barbaNamespace ||
    ''
  );
}

function goHomeSoft() {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  resetLenis();
  document.documentElement.removeAttribute('data-menu-open');
  document.documentElement.classList.remove('is-hero-loading');
  document.querySelector('[data-header]')?.classList.remove('is-open', 'is-hidden');

  const hero = document.querySelector('[data-hero]');
  if (hero?.classList.contains('is-loading')) {
    const loader = hero.querySelector('[data-hero-loader]');
    loader?.classList.add('is-done');
    hero.classList.remove('is-loading');
    hero.classList.add('is-carousel');
    const c = getCarousel();
    if (c?.enabled) c.revealFromIntro();
    else c?.showFallback();
  }
}

/**
 * Home / Work links: skip hero intro, let Barba run the NH wipe (no hard reload).
 */
function bindHomeLinks() {
  document.addEventListener(
    'click',
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const link = e.target.closest('a[href="/"], a[href="/index.html"]');
      if (!link || link.getAttribute('target') === '_blank') return;

      const onHome = currentNamespace() === 'home' && isHomePath();
      if (onHome) {
        e.preventDefault();
        goHomeSoft();
        return;
      }

      // Flag only — do not preventDefault; Barba handles the click and plays NH wipe once
      markSkipHeroIntro();
    },
    true,
  );
}

/**
 * @param {{ pageReady?: Promise<unknown> }} [options]
 */
export function initBarba(options = {}) {
  const overlay = document.querySelector('.transition-overlay');
  bindHomeLinks();

  // Leftover hard-nav wipe (if any)
  playPendingWipeOut(options.pageReady).catch(() => resetOverlay(overlay));

  barba.init({
    preventRunning: true,
    timeout: 8000,
    transitions: [
      {
        name: 'overlay-wipe',
        async leave({ current }) {
          destroyPage();

          if (prefersReducedMotion() || !overlay) {
            if (current?.container) current.container.style.opacity = '0';
            return;
          }

          await wipeIn(overlay);
          holdOverlay(overlay);
          // Hide old page under the cover — keep in DOM for Barba (do not remove)
          parkOutgoingContainer(current?.container);
        },
        async enter({ current, next }) {
          parkOutgoingContainer(current?.container);

          resetLenis();
          window.scrollTo(0, 0);
          syncNav(next.namespace);

          const canvas = document.getElementById('webgl-canvas');
          if (canvas && !document.body.contains(canvas)) {
            document.body.prepend(canvas);
          }

          const ns = next.namespace;
          const nextEl = next.container;

          try {
            if (overlay && !prefersReducedMotion()) {
              holdOverlay(overlay);
            }

            // Start page boot + NH fill in parallel — wipe opens only when NH is full
            const pageReady = initPage(ns, {
              resumeCarousel: ns === 'home',
              container: nextEl,
            });

            if (prefersReducedMotion() || !overlay) {
              await pageReady;
              gsap.fromTo(nextEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 });
            } else {
              await fillNhUntilReady(overlay, pageReady);
              await wipeOut(overlay, nextEl);
            }
          } catch (err) {
            console.error('[barba] enter failed', err);
            try {
              await initPage(ns, {
                resumeCarousel: ns === 'home',
                container: nextEl,
              });
            } catch (err2) {
              console.error('[barba] initPage retry failed', err2);
            }
            if (overlay) {
              try {
                await fillNhUntilReady(overlay, Promise.resolve());
                await wipeOut(overlay, nextEl);
              } catch {
                resetOverlay(overlay);
              }
            }
          }
        },
      },
    ],
  });
}

/** Hide outgoing page while covered — both containers coexist until Barba removes current. */
function parkOutgoingContainer(el) {
  if (!el) return;
  el.setAttribute('aria-hidden', 'true');
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
  el.style.position = 'absolute';
  el.style.inset = '0';
  el.style.width = '100%';
  el.style.overflow = 'hidden';
  el.style.zIndex = '0';
  el.style.opacity = '0';
}
