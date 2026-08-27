import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { getCarousel } from './carousel/HeroCarousel.js';
import { getSiteMode } from './mode.js';
import { prefersReducedMotion } from './utils.js';

/** One-shot: set before an in-site nav to home, consumed on next home boot. */
const SKIP_INTRO_KEY = 'nh-skip-hero-intro';

export function markSkipHeroIntro() {
  try {
    sessionStorage.setItem(SKIP_INTRO_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function peekSkipHeroIntro() {
  try {
    return sessionStorage.getItem(SKIP_INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

function consumeSkipHeroIntro() {
  try {
    if (sessionStorage.getItem(SKIP_INTRO_KEY) === '1') {
      sessionStorage.removeItem(SKIP_INTRO_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function getVisibleHeroLabels(hero) {
  if (!hero) return null;
  const mode = getSiteMode();
  return (
    hero.querySelector(`[data-hero-labels][data-mode="${mode}"]`) ||
    hero.querySelector('[data-hero-labels]')
  );
}

gsap.registerPlugin(SplitText);

/**
 * Hero loading screen → carousel handoff.
 * Full reload: play intro. In-site return to home (flag / Barba): skip to carousel.
 */
export function initHeroIntro(scope = document, { ready, skipIntro = false } = {}) {
  const hero = scope.querySelector('[data-hero]');
  if (!hero) return () => {};

  // Drop legacy persistent flag from earlier approach
  try {
    sessionStorage.removeItem('nh-hero-intro-seen');
  } catch {
    /* ignore */
  }

  const loader = hero.querySelector('[data-hero-loader]');
  const mode = getSiteMode();
  const title =
    hero.querySelector(`[data-hero-title][data-mode="${mode}"]`) ||
    hero.querySelector('[data-hero-title]');
  const eyebrow = hero.querySelector('[data-loader-eyebrow]');
  const fill = hero.querySelector('[data-loader-fill]');
  const status = hero.querySelector('[data-loader-status]');
  const progress = hero.querySelector('[data-loader-progress]');
  const labels = getVisibleHeroLabels(hero);
  const controls = hero.querySelector('[data-hero-controls]');

  let cancelled = false;
  // Always consume so a peeked skip flag doesn't stick across later visits
  const fromStorage = consumeSkipHeroIntro();
  const shouldSkip = skipIntro || fromStorage;

  const finishChrome = () => {
    if (loader) {
      loader.classList.add('is-done');
      gsap.set(loader, { autoAlpha: 0, visibility: 'hidden', pointerEvents: 'none' });
    }
    // Hide every title variant — inactive mode titles can still paint for a frame
    hero.querySelectorAll('[data-hero-title]').forEach((el) => {
      gsap.set(el, { autoAlpha: 0, visibility: 'hidden' });
    });
    if (eyebrow) gsap.set(eyebrow, { autoAlpha: 0, visibility: 'hidden' });
    if (status) gsap.set(status, { autoAlpha: 0, visibility: 'hidden' });
    if (progress) gsap.set(progress, { autoAlpha: 0, visibility: 'hidden' });
    hero.classList.remove('is-loading');
    hero.classList.add('is-carousel');
    document.documentElement.classList.remove('is-hero-loading');
    gsap.set([labels, controls].filter(Boolean), { autoAlpha: 1, y: 0 });
  };

  const revealCarousel = (carousel, { instant = false } = {}) => {
    const c = carousel || getCarousel();
    if (c?.enabled) c.revealFromIntro({ instant });
    else c?.showFallback();
  };

  const skipStraightToCarousel = () => {
    finishChrome();
    const instant = document.documentElement.classList.contains('is-wipe-pending');
    Promise.resolve(ready)
      .then((carousel) => {
        if (cancelled) return;
        revealCarousel(carousel, { instant });
      })
      .catch(() => {
        if (!cancelled) getCarousel()?.showFallback();
      });
    return () => {
      cancelled = true;
      hero.classList.remove('is-loading');
      document.documentElement.classList.remove('is-hero-loading');
    };
  };

  if (prefersReducedMotion() && !shouldSkip) {
    gsap.set([title, labels, controls, eyebrow, status].filter(Boolean), { autoAlpha: 1 });
    if (fill) gsap.set(fill, { scaleX: 1 });
    finishChrome();
    getCarousel()?.showFallback();
    return () => {};
  }

  if (shouldSkip) {
    return skipStraightToCarousel();
  }

  hero.classList.add('is-loading');
  document.documentElement.classList.add('is-hero-loading');

  gsap.set([labels, controls].filter(Boolean), { autoAlpha: 0, y: 16 });
  gsap.set([eyebrow, status].filter(Boolean), { autoAlpha: 0, y: 8 });
  if (fill) gsap.set(fill, { scaleX: 0 });
  if (loader) gsap.set(loader, { autoAlpha: 1 });

  let split = null;
  let exit = null;
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  const progressTween = fill
    ? gsap.to(fill, {
        scaleX: 0.82,
        duration: 2.4,
        ease: 'power1.inOut',
      })
    : null;

  if (eyebrow) {
    tl.to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.55 }, 0);
  }

  try {
    if (title) {
      split = SplitText.create(title, {
        type: 'lines',
        linesClass: 'split-line',
        mask: 'lines',
      });
      gsap.set(split.lines, { yPercent: 110, autoAlpha: 0 });
      tl.to(
        split.lines,
        {
          yPercent: 0,
          autoAlpha: 1,
          duration: 1.05,
          stagger: 0.09,
        },
        0.12,
      );
    }
  } catch {
    if (title) gsap.set(title, { autoAlpha: 1 });
  }

  if (status) {
    tl.to(status, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.35);
  }

  const readyPromise = Promise.resolve(ready).catch(() => null);
  const minHold = new Promise((resolve) => {
    window.setTimeout(resolve, 1600);
  });

  Promise.all([readyPromise, minHold]).then(([carousel]) => {
    if (cancelled) return;

    progressTween?.kill();
    if (fill) {
      gsap.to(fill, { scaleX: 1, duration: 0.4, ease: 'power2.out' });
    }

    exit = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      delay: 0.28,
      onComplete: finishChrome,
    });

    if (status) exit.to(status, { autoAlpha: 0, y: -6, duration: 0.28 }, 0);
    if (eyebrow) exit.to(eyebrow, { autoAlpha: 0, y: -12, duration: 0.35 }, 0.02);
    if (progress) exit.to(progress, { autoAlpha: 0, duration: 0.3 }, 0.05);

    if (split?.lines?.length) {
      exit.to(
        split.lines,
        {
          yPercent: -115,
          autoAlpha: 0,
          duration: 0.65,
          stagger: 0.035,
          ease: 'power3.in',
        },
        0.06,
      );
    } else if (title) {
      exit.to(title, { autoAlpha: 0, y: -28, duration: 0.5 }, 0.06);
    }

    exit.add(() => {
      revealCarousel(carousel);
    }, 0.35);

    if (loader) {
      exit.to(loader, { autoAlpha: 0, duration: 0.55, ease: 'power2.inOut' }, 0.55);
    }

    exit.to(
      [labels, controls].filter(Boolean),
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power2.out',
      },
      0.7,
    );

    window.setTimeout(() => {
      if (cancelled) return;
      if (hero.classList.contains('is-loading') || !hero.classList.contains('is-carousel')) {
        exit?.kill();
        revealCarousel(carousel);
        finishChrome();
      }
    }, 3500);
  });

  return () => {
    cancelled = true;
    tl.kill();
    exit?.kill();
    progressTween?.kill();
    try {
      split?.revert();
    } catch {
      /* ignore */
    }
    hero.classList.remove('is-loading');
    document.documentElement.classList.remove('is-hero-loading');
  };
}
