/**
 * Weichie-inspired pixel/gooey color overlay.
 * Covers the full card (image + meta), not just media.
 */
import { isVisibleForMode } from './mode.js';

export function initGooeyCards(scope = document) {
  const cards = [
    ...scope.querySelectorAll('.work-float__card, [data-gooey]'),
  ].filter(isVisibleForMode);
  if (!cards.length) return;

  const cleanups = [];

  cards.forEach((card) => {
    if (card.querySelector('.gooey-cursor')) return;

    // Ensure positioning context for the full-card overlay
    const style = getComputedStyle(card);
    if (style.position === 'static') {
      card.style.position = 'relative';
    }

    const gooey = document.createElement('div');
    gooey.className = 'gooey-cursor';
    gooey.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('div');
    inner.className = 'gooey-cursor__inner';
    gooey.appendChild(inner);
    card.appendChild(gooey);

    let cols = 0;
    let rows = 0;
    let cells = [];
    let cellW = 0;
    let cellH = 0;
    let active = false;
    let mx = -9999;
    let my = -9999;
    let raf = 0;

    const build = () => {
      const rect = card.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;

      const target = Math.max(14, Math.min(32, Math.round(rect.width / 26)));
      cols = target;
      cellW = rect.width / cols;
      cellH = cellW;
      rows = Math.max(1, Math.ceil(rect.height / cellH));

      gooey.style.setProperty('--gooey-cols', String(cols));
      gooey.style.setProperty('--gooey-size', `${cellW}px`);
      gooey.style.setProperty('--gooey-size-y', `${cellH}px`);

      inner.innerHTML = '';
      cells = [];
      const frag = document.createDocumentFragment();
      const total = cols * rows;
      for (let i = 0; i < total; i++) {
        const cell = document.createElement('span');
        cell.className = 'gooey-cursor__cell';
        frag.appendChild(cell);
        cells.push(cell);
      }
      inner.appendChild(frag);
    };

    const paint = () => {
      raf = 0;
      if (!active) {
        for (let i = 0; i < cells.length; i++) cells[i].style.opacity = '0';
        return;
      }

      const radius = cellW * 3.4;

      for (let i = 0; i < cells.length; i++) {
        const col = i % cols;
        const row = (i / cols) | 0;
        const cx = (col + 0.5) * cellW;
        const cy = (row + 0.5) * cellH;
        const dx = cx - mx;
        const dy = cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let o = 0;
        if (dist < radius) {
          o = 1 - dist / radius;
          o *= o;
        }
        cells[i].style.opacity = o > 0.02 ? String(o) : '0';
      }
    };

    const onEnter = () => {
      active = true;
    };

    const onLeave = () => {
      active = false;
      mx = -9999;
      my = -9999;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    build();
    const ro = new ResizeObserver(() => build());
    ro.observe(card);

    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointerleave', onLeave);
    card.addEventListener('pointermove', onMove);

    cleanups.push(() => {
      ro.disconnect();
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointerleave', onLeave);
      card.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
      gooey.remove();
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
