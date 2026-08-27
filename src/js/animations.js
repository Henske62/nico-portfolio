import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Observer } from 'gsap/Observer';
import { getSiteMode, isVisibleForMode } from './mode.js';
import { initGooeyCards } from './gooey.js';
import { prefersReducedMotion } from './utils.js';

gsap.registerPlugin(ScrollTrigger, SplitText, Observer);

const pageCleanups = [];

function track(cleanup) {
  pageCleanups.push(cleanup);
}

function isAboveFold(el, margin = 0.95) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.height > 0 && rect.top < vh * margin && rect.bottom > 0;
}

export function killPageAnimations() {
  ScrollTrigger.getAll().forEach((st) => st.kill());
  pageCleanups.splice(0).forEach((fn) => fn());
}

export function initSplitHeadlines(scope = document, { instantAboveFold = false } = {}) {
  const els = [...scope.querySelectorAll('[data-split]')].filter(
    (el) => !el.hasAttribute('data-hero-title') && isVisibleForMode(el),
  );
  if (!els.length) return;

  if (prefersReducedMotion()) {
    gsap.set(els, { autoAlpha: 1 });
    return;
  }

  els.forEach((el) => {
    // No mask:'lines' — GSAP's mask wrappers crop descenders (final „g“ in Herausforderung)
    const split = SplitText.create(el, {
      type: 'lines',
      linesClass: 'split-line',
    });

    // Under NH wipe: settle first viewport instantly
    if (instantAboveFold && isAboveFold(el, 1.25)) {
      gsap.set(split.lines, { yPercent: 0 });
      track(() => split.revert());
      return;
    }

    gsap.set(split.lines, { yPercent: 110 });

    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      gsap.to(split.lines, {
        yPercent: 0,
        duration: 1.05,
        ease: 'power3.out',
        stagger: 0.08,
        overwrite: true,
      });
      io.disconnect();
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) play();
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    io.observe(el);
    if (isAboveFold(el)) {
      play();
    } else {
      window.setTimeout(() => {
        if (played) return;
        const r = el.getBoundingClientRect();
        if (r.top < (window.innerHeight || 0) && r.bottom > 0) play();
      }, 400);
    }

    track(() => {
      io.disconnect();
      split.revert();
    });
  });
}

export function initImageReveals(scope = document, { instantAboveFold = false } = {}) {
  const items = scope.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  items.forEach((item) => {
    const mask = item.querySelector('.media-reveal__mask');
    const img = item.querySelector('.media-reveal__img');
    if (!mask || !img) return;

    if (prefersReducedMotion()) {
      gsap.set(mask, { clipPath: 'inset(0% 0% 0% 0%)' });
      gsap.set(img, { scale: 1, autoAlpha: 1 });
      return;
    }

    let played = false;
    const revealNow = (animate) => {
      if (played) return;
      played = true;
      item.setAttribute('data-reveal-played', '1');
      if (!animate) {
        gsap.set(mask, { clipPath: 'inset(0% 0% 0% 0%)' });
        gsap.set(img, { scale: 1 });
        return;
      }
      gsap.fromTo(
        mask,
        { clipPath: 'inset(100% 0 0 0)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut', overwrite: true },
      );
      gsap.fromTo(
        img,
        { scale: 1.15 },
        { scale: 1, duration: 1.35, ease: 'power2.out', delay: 0.15, overwrite: true },
      );
    };

    // Under wipe: open media immediately so wipe-out doesn't uncover a still-clipped image
    if (instantAboveFold && isAboveFold(item, 1.05)) {
      revealNow(false);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          revealNow(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin: '0px 0px -5% 0px', threshold: 0.05 },
    );
    io.observe(item);

    // Synchronous fallback — rAF/IO can stall in background tabs
    if (isAboveFold(item) && item.getBoundingClientRect().bottom > 40) {
      revealNow(true);
      io.disconnect();
    } else {
      // Below the fold: start clipped, reveal on scroll
      gsap.set(mask, { clipPath: 'inset(100% 0 0 0)' });
      gsap.set(img, { scale: 1.15 });
      window.setTimeout(() => {
        if (played) return;
        const r = item.getBoundingClientRect();
        if (r.top < (window.innerHeight || 0) && r.bottom > 0) {
          revealNow(true);
          io.disconnect();
        }
      }, 400);
    }

    track(() => io.disconnect());
  });
}

export function initFloatingCards(scope = document) {
  const cards = [...scope.querySelectorAll('.work-float__card')].filter(isVisibleForMode);
  if (!cards.length) return;

  if (prefersReducedMotion()) return;

  const floatCard = (card, i) => {
    const yAmp = 6 + (i % 3) * 2;
    const dur = 3.8 + (i % 3) * 0.6;
    const delay = i * 0.35;

    return gsap.to(card, {
      '--float-y': `${-yAmp}px`,
      duration: dur,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay,
    });
  };

  const tweens = [...cards].map(floatCard);
  track(() => tweens.forEach((t) => t.kill()));
}

export function initMarquee(scope = document) {
  const mode = getSiteMode();
  const trackEl =
    scope.querySelector(`[data-marquee-track][data-mode="${mode}"]`) ||
    scope.querySelector('[data-marquee-track]');
  if (!trackEl) return;

  if (prefersReducedMotion()) return;

  let x = 0;
  let speed = 0.55;
  let dir = -1;
  let half = 0;

  const resize = () => {
    half = trackEl.scrollWidth / 2;
  };

  resize();
  window.addEventListener('resize', resize);

  const observer = Observer.create({
    target: trackEl.closest('.marquee') || trackEl,
    type: 'pointer',
    onChangeY: (self) => {
      speed = clampSpeed(Math.abs(self.velocityY) * 0.004 + 0.35);
      dir = self.velocityY < 0 ? -1 : 1;
    },
    onChangeX: (self) => {
      speed = clampSpeed(Math.abs(self.velocityX) * 0.004 + 0.35);
      dir = self.velocityX < 0 ? -1 : 1;
    },
  });

  const ticker = () => {
    x += speed * dir;
    if (x <= -half) x += half;
    if (x >= 0) x -= half;
    trackEl.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  gsap.ticker.add(ticker);

  track(() => {
    gsap.ticker.remove(ticker);
    observer.kill();
    window.removeEventListener('resize', resize);
  });
}

function clampSpeed(v) {
  return Math.min(4.5, Math.max(0.25, v));
}

/**
 * Systems chapters — sequential scroll reveals (no pin / overlap).
 */
export function initSystemsStack(scope = document, { instantAboveFold = false } = {}) {
  const stack = scope.querySelector('[data-systems-stack]');
  if (!stack) return;

  const bands = [...stack.querySelectorAll('[data-systems-band]')];
  if (!bands.length) return;
  if (prefersReducedMotion()) return;

  const tweens = [];

  bands.forEach((band) => {
    const index = band.querySelector('.systems-band__index');
    const tag = [...band.querySelectorAll('.systems-band__tag')].find(isVisibleForMode);
    const title = [...band.querySelectorAll('.systems-band__title')].find(isVisibleForMode);
    const copies = [...band.querySelectorAll('.systems-band__copy')];
    const listItems = [...band.querySelectorAll('.systems-band__list li')];
    const process = band.querySelector('.systems-band__process');
    const watermark = band.querySelector('.systems-band__watermark');

    const pieces = [index, tag, title, ...copies, ...listItems, process].filter(Boolean);

    // First chapter already in view under wipe → show settled, don't fade in after cover lifts
    if (instantAboveFold && isAboveFold(band, 0.85)) {
      gsap.set(pieces, { autoAlpha: 1, y: 0 });
      if (watermark) gsap.set(watermark, { autoAlpha: 0.04, x: 0 });
      return;
    }

    gsap.set(pieces, { autoAlpha: 0, y: 28 });
    if (watermark) gsap.set(watermark, { autoAlpha: 0, x: 24 });

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: {
        trigger: band,
        start: 'top 78%',
        once: true,
      },
    });

    if (watermark) {
      tl.to(watermark, { autoAlpha: 0.04, x: 0, duration: 1.1 }, 0);
    }
    if (index) {
      tl.to(index, { autoAlpha: 1, y: 0, duration: 0.85 }, 0.05);
    }
    if (tag) {
      tl.to(tag, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.12);
    }
    if (title) {
      tl.to(title, { autoAlpha: 1, y: 0, duration: 0.85 }, 0.16);
    }
    if (copies.length) {
      tl.to(copies, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.28);
    }
    if (listItems.length) {
      tl.to(listItems, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.05 }, 0.42);
    }
    if (process) {
      tl.to(process, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.55);
    }

    tweens.push(tl);
  });

  track(() => {
    tweens.forEach((tl) => {
      tl.scrollTrigger?.kill();
      tl.kill();
    });
    bands.forEach((band) => {
      gsap.set(band.querySelectorAll('.systems-band__index, .systems-band__tag, .systems-band__title, .systems-band__copy, .systems-band__list li, .systems-band__process, .systems-band__watermark'), {
        clearProps: 'all',
      });
    });
  });
}

export function initPageAnimations(scope = document, { instantAboveFold = false } = {}) {
  initSplitHeadlines(scope, { instantAboveFold });
  initImageReveals(scope, { instantAboveFold });
  initFloatingCards(scope);
  const gooeyCleanup = initGooeyCards(scope);
  if (gooeyCleanup) track(gooeyCleanup);
  initMarquee(scope);
  initSystemsStack(scope, { instantAboveFold });
  ScrollTrigger.refresh();
}
