import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './styles/main.scss';
import { initLenis } from './js/lenis.js';
import { initCursor } from './js/cursor.js';
import { initHeader } from './js/header.js';
import { initSiteMode } from './js/mode.js';
import { initNavHover } from './js/navHover.js';
import { initPage } from './js/page.js';
import { initBarba } from './js/barba.js';
import { hasPendingWipeOut, holdOverlay } from './js/transition.js';

gsap.registerPlugin(ScrollTrigger);

// CSS module resolved — reveal body (prevents unstyled flash on reload)
document.documentElement.classList.add('is-app-ready');

async function boot() {
  // Keep NH covering immediately if we arrived via wipe transition
  if (hasPendingWipeOut()) {
    holdOverlay(document.querySelector('.transition-overlay'));
  }

  initLenis();
  initSiteMode();
  initCursor();
  initHeader();
  initNavHover();

  window.addEventListener('sitemodechange', () => {
    ScrollTrigger.refresh();
  });

  const container = document.querySelector('[data-barba="container"]');
  const namespace = container?.dataset.barbaNamespace || 'home';

  const pageReady = initPage(namespace);
  initBarba({ pageReady });
  await pageReady;
}

boot();
