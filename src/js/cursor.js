import { lerp, isCoarsePointer, prefersReducedMotion } from './utils.js';

let rafId = 0;
let active = false;

const state = {
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  primed: false,
};

// Disc cursor on editorial links, carousel cards (not empty stage), controls
const HOVER_SEL =
  '.text-cta, .work-float__card, [data-hero-stage].is-card-hover, .hero__ctrl, [data-carousel-jump]';

function isHoverTarget(el) {
  return !!(el && typeof el.closest === 'function' && el.closest(HOVER_SEL));
}

export function initCursor() {
  destroyCursor();

  if (isCoarsePointer() || prefersReducedMotion()) return;

  const root = document.querySelector('.cursor');
  if (!root) return;

  const dot = root.querySelector('.cursor__dot');
  const disc = root.querySelector('.cursor__card');
  if (!dot || !disc) return;

  active = true;
  state.primed = false;
  document.body.classList.add('has-custom-cursor');
  root.classList.add('is-ready');

  const applyPos = () => {
    root.style.setProperty('--cx', `${state.dx}px`);
    root.style.setProperty('--cy', `${state.dy}px`);
  };

  const syncHover = (target) => {
    const hovering = isHoverTarget(target);
    root.classList.toggle('is-hover', hovering && state.primed);
  };

  const onMove = (e) => {
    state.x = e.clientX;
    state.y = e.clientY;

    if (!state.primed) {
      state.dx = state.x;
      state.dy = state.y;
      state.primed = true;
      applyPos();
      root.removeAttribute('style');
      const card = root.querySelector('.cursor__card');
      card?.removeAttribute('style');
      root.classList.add('is-primed');
    }

    syncHover(e.target);
  };

  const onOver = (e) => syncHover(e.target);

  const onOut = (e) => {
    if (!isHoverTarget(e.relatedTarget)) {
      root.classList.remove('is-hover');
    }
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver);
  document.addEventListener('pointerout', onOut);

  const tick = () => {
    if (!active) return;

    state.dx = lerp(state.dx, state.x, 0.22);
    state.dy = lerp(state.dy, state.y, 0.22);
    applyPos();

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  root._cursorCleanup = () => {
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('pointerout', onOut);
  };
}

export function destroyCursor() {
  active = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  const root = document.querySelector('.cursor');
  root?._cursorCleanup?.();
  root?.classList.remove('is-ready', 'is-hover', 'is-card', 'is-primed');
  root?.style.removeProperty('--cx');
  root?.style.removeProperty('--cy');
  document.body.classList.remove('has-custom-cursor');
}
