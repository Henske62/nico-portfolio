import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './utils.js';

gsap.registerPlugin(ScrollTrigger);

let lenis = null;
let tickerFn = null;

export function getLenis() {
  return lenis;
}

export function initLenis() {
  if (lenis || prefersReducedMotion()) return null;

  lenis = new Lenis({
    duration: 1.15,
    smoothWheel: true,
    touchMultiplier: 1.4,
  });

  lenis.on('scroll', ScrollTrigger.update);

  tickerFn = (time) => {
    lenis?.raf(time * 1000);
  };

  gsap.ticker.add(tickerFn);
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

export function resetLenis() {
  if (!lenis) return;
  lenis.scrollTo(0, { immediate: true });
}

export function destroyLenis() {
  if (tickerFn) {
    gsap.ticker.remove(tickerFn);
    tickerFn = null;
  }
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
}
