# Axial Studio

Agency site inspired by [Weichie](https://weichie.com/), built with the exact stack:

- **GSAP** (Core, ScrollTrigger, SplitText, Observer, Flip)
- **Three.js** cylindrical hero carousel with custom shaders
- **Barba.js** clip-path page transitions
- **Lenis** smooth scroll synced to `ScrollTrigger.update()` + `gsap.ticker`
- **Vanilla ES modules** · **Vite** · **SCSS** (mobile-first)

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Architecture notes

- Persistent `#webgl-canvas` outside the Barba container — survives page transitions
- `beforeLeave` / page destroy kills ScrollTriggers + carousel RAF; `afterEnter` re-inits
- `prefers-reduced-motion`: static hero fallback, fades only
- Mobile: fewer planes, simpler shaders, drag-first interaction
