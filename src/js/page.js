import { initPageAnimations, killPageAnimations } from './animations.js';
import { initNeedForm, initContactPageForm } from './form.js';
import { initNavHover } from './navHover.js';
import { initLocations } from './locations.js';
import { initHeroIntro, peekSkipHeroIntro } from './heroIntro.js';
import { ensureCarousel, getCarousel } from './carousel/HeroCarousel.js';
import { hasPendingWipeOut } from './transition.js';
import { initLifeComingSoon } from './lifeComingSoon.js';

let cleanups = [];

/**
 * @param {string} namespace
 * @param {{ resumeCarousel?: boolean, container?: Element | null }} [options]
 */
export async function initPage(namespace, { resumeCarousel = false, container = null } = {}) {
  // Prefer the explicit next container — during Barba both old+new exist and querySelector hits the old one
  const scope =
    container ||
    document.querySelector('[data-barba="container"]:not([aria-hidden="true"])') ||
    document.querySelector('[data-barba="container"]') ||
    document;

  const underWipe = hasPendingWipeOut();

  // Under NH wipe: settle above-the-fold content instantly so wipe-out doesn't uncover mid-reveal
  initPageAnimations(scope, { instantAboveFold: underWipe });
  initLifeComingSoon(scope);
  cleanups.push(initNavHover(scope));
  cleanups.push(initNeedForm(scope));
  cleanups.push(initContactPageForm(scope));
  cleanups.push(initLocations(scope));

  if (namespace === 'home') {
    const skipIntro = resumeCarousel || peekSkipHeroIntro();

    const carouselPromise = ensureCarousel().then((carousel) => {
      if (skipIntro || resumeCarousel) {
        carousel?.resumeOnHome();
      } else if (carousel?.enabled && !carousel.running) {
        carousel.resumeOnHome();
      }
      return carousel;
    });

    const introCleanup = initHeroIntro(scope, {
      ready: carouselPromise,
      skipIntro,
    });
    cleanups.push(introCleanup);

    // Hold NH wipe until carousel is up and visible under the cover
    if (skipIntro || underWipe) {
      const carousel = await carouselPromise.catch(() => null);
      if (underWipe && carousel?.enabled) {
        carousel.revealFromIntro({ instant: true });
      }
    }
  } else {
    // Don't block the NH wipe on WebGL texture boot — tear down in the background
    ensureCarousel()
      .then((carousel) => carousel?.teardownPage())
      .catch(() => null);
  }
}

export function destroyPage() {
  killPageAnimations();
  cleanups.splice(0).forEach((fn) => typeof fn === 'function' && fn());

  const carousel = getCarousel();
  carousel?.teardownPage();
}
