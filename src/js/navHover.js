import gsap from 'gsap';
import { getSiteMode } from './mode.js';
import { prefersReducedMotion } from './utils.js';

function splitIntoChars(host, label) {
  const wrap = document.createElement('span');
  wrap.className = 'nav-main__label';
  wrap.setAttribute('aria-hidden', 'true');

  [...label].forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'nav-main__char';
    span.style.setProperty('--char-i', String(i));
    span.textContent = char === ' ' ? '\u00a0' : char;
    wrap.appendChild(span);
  });

  host.appendChild(wrap);
  return [...wrap.querySelectorAll('.nav-main__char')];
}

function visibleNavLabel(link) {
  const mode = getSiteMode();
  const span =
    link.querySelector(`.nav-main__mode[data-mode="${mode}"]`) ||
    link.querySelector('.nav-main__mode[data-mode="pro"]');
  return (span?.dataset.label || span?.textContent || link.textContent || '').trim();
}

function syncAria(link) {
  const label = visibleNavLabel(link);
  if (label) link.setAttribute('aria-label', label);
}

/**
 * Split nav labels into characters — letters jump on hover (desktop).
 * Supports dual pro/private labels via .nav-main__mode[data-mode].
 */
export function initNavHover(scope = document) {
  const links = scope.querySelectorAll('.nav-main__link');
  if (!links.length) return () => {};

  const cleanups = [];
  const reduced = prefersReducedMotion();

  links.forEach((link) => {
    if (link.dataset.navHoverReady === '1') return;

    const modeSpans = [...link.querySelectorAll('.nav-main__mode')];

    if (modeSpans.length) {
      modeSpans.forEach((modeSpan) => {
        if (modeSpan.querySelector('.nav-main__label')) return;
        const label = modeSpan.textContent.trim();
        if (!label) return;
        modeSpan.dataset.label = label;
        modeSpan.textContent = '';
        const chars = splitIntoChars(modeSpan, label);

        if (reduced) return;

        let tween = null;
        const rise = () => {
          if (getComputedStyle(modeSpan).display === 'none') return;
          tween?.kill();
          tween = gsap.to(chars, {
            yPercent: -42,
            duration: 0.42,
            ease: 'power3.out',
            stagger: 0.028,
            overwrite: true,
          });
        };
        const reset = () => {
          tween?.kill();
          tween = gsap.to(chars, {
            yPercent: 0,
            duration: 0.38,
            ease: 'power3.out',
            stagger: { each: 0.02, from: 'end' },
            overwrite: true,
          });
        };

        link.addEventListener('mouseenter', rise);
        link.addEventListener('focus', rise);
        link.addEventListener('mouseleave', reset);
        link.addEventListener('blur', reset);

        cleanups.push(() => {
          tween?.kill();
          link.removeEventListener('mouseenter', rise);
          link.removeEventListener('focus', rise);
          link.removeEventListener('mouseleave', reset);
          link.removeEventListener('blur', reset);
        });
      });
    } else {
      if (link.querySelector('.nav-main__label')) return;
      const label = link.textContent.trim();
      if (!label) return;
      link.textContent = '';
      const chars = splitIntoChars(link, label);

      if (!reduced) {
        let tween = null;
        const rise = () => {
          tween?.kill();
          tween = gsap.to(chars, {
            yPercent: -42,
            duration: 0.42,
            ease: 'power3.out',
            stagger: 0.028,
            overwrite: true,
          });
        };
        const reset = () => {
          tween?.kill();
          tween = gsap.to(chars, {
            yPercent: 0,
            duration: 0.38,
            ease: 'power3.out',
            stagger: { each: 0.02, from: 'end' },
            overwrite: true,
          });
        };
        link.addEventListener('mouseenter', rise);
        link.addEventListener('focus', rise);
        link.addEventListener('mouseleave', reset);
        link.addEventListener('blur', reset);
        cleanups.push(() => {
          tween?.kill();
          link.removeEventListener('mouseenter', rise);
          link.removeEventListener('focus', rise);
          link.removeEventListener('mouseleave', reset);
          link.removeEventListener('blur', reset);
        });
      }
    }

    syncAria(link);
    link.dataset.navHoverReady = '1';
  });

  const onMode = () => links.forEach(syncAria);
  window.addEventListener('sitemodechange', onMode);
  cleanups.push(() => window.removeEventListener('sitemodechange', onMode));

  return () => {
    cleanups.forEach((fn) => fn());
    links.forEach((link) => {
      delete link.dataset.navHoverReady;
    });
  };
}
