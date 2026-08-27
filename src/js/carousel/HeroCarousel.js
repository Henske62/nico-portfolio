import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { vertexShader, fragmentShader } from './shaders.js';
import {
  PROJECT_TEXTURES,
  LIFE_TEXTURES,
  PROJECTS,
  getCarouselItems,
  getCategoryJumpIndex,
  getProjectByIndex,
  clamp,
  isMobile,
  padIndex,
  prefersReducedMotion,
} from '../utils.js';
import { getSiteMode } from '../mode.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Weichie-faithful cylindrical carousel.
 * Camera outside the ring, cards face outward, ring tilted so far-side
 * backs read through the opening. Parabolic bend matches Weichie shaders.
 */
export class HeroCarousel {
  constructor(canvas) {
    this.canvas = canvas; // front layer
    this.canvasBack = null;
    this.glowEl = null;
    this.renderer = null; // front
    this.rendererBack = null;
    this.scene = null;
    this.camera = null;
    this.group = null;
    this.planes = [];
    this.textures = [];
    this.texturesPro = [];
    this.texturesLife = [];
    this.mode = 'pro';
    this.running = false;
    this.enabled = false;
    this.scrollTrigger = null;
    this.introDone = false;
    this._ticker = null;

    this.uniqueCount = PROJECTS.length;
    this.itemCount = 18;
    this.radius = 4.3;
    this.baseRadius = 4.3;
    this.rotation = 0;
    this.velocity = 0;
    this.autoSpeed = -0.00032;
    this.damping = 0.94;
    this._dragGain = 0.0002;
    // Playing-card proportion (~2.5 × 3.5)
    this.planeW = 1.2;
    this.planeH = 1.68;
    this.cameraZ = 9.0;
    this.baseCameraZ = 9.0;
    this.tiltDeg = -13;
    this.bendAmount = 0.14;
    this.pointerDown = false;
    this.lastX = 0;
    this._pointerStartX = 0;
    this._pointerStartY = 0;
    this._pointerMoved = false;
    this._tapOnCard = false;
    this._tapProjectIndex = -1;
    this._hoverCard = false;
    this.raycaster = new THREE.Raycaster();
    this._pointerNDC = new THREE.Vector2();
    this.activeIndex = 0;
    this.simplified = false;
    this._listeners = [];
    this._stageW = 0;
    this._stageH = 0;
    this._stageLeft = 0;
    this._stageTop = 0;
    this._needsSync = true;
    this._lastIndex = -1;
    this._tiltRad = 0;
    this._frontFacingMin = 0.18;
    this.fadeColor = null;
    this._paletteObserver = null;
    this._modeBoost = 0;
    this._modeTween = null;
    this._modeSpinning = false;
    this._pendingSwap = false;
    this._pendingBank = null;
    this._modeVeil = 0;
  }

  async init() {
    if (prefersReducedMotion()) {
      this.showFallback();
      return;
    }

    this.simplified = isMobile();
    // Mobile: larger cards, tighter camera — fills the stage
    this.planeW = this.simplified ? 1.32 : 1.2;
    this.planeH = this.simplified ? 1.85 : 1.68;
    this.radius = this.simplified ? 3.85 : 4.3;
    this.baseRadius = this.radius;
    this.cameraZ = this.simplified ? 5.85 : 9.0;
    this.baseCameraZ = this.cameraZ;
    this.tiltDeg = this.simplified ? -11 : -13;
    this._tiltRad = THREE.MathUtils.degToRad(this.tiltDeg);
    this.bendAmount = 0.12;
    this.damping = this.simplified ? 0.86 : 0.94;
    this._dragGain = this.simplified ? 0.0024 : 0.0002;

    this.setupRenderer();
    this.setupScene();
    await this.createPlanes();
    this.applyTilt();
    this.bindEvents();
    this.bindScroll();
    this._needsSync = true;
    this.syncToStage(true);
    this.enabled = true;
    this.canvas.classList.remove('is-active');
    this.canvasBack?.classList.remove('is-active');
    this.start();
  }

  getPixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    return this.simplified ? Math.min(dpr, 2) : Math.min(dpr, 1.5);
  }

  setupRenderer() {
    const pr = this.getPixelRatio();
    const opts = {
      antialias: this.simplified,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    };

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, ...opts });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(pr);
    // Photos are manually encoded in the fragment shader; skip a second encode.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.canvasBack =
      document.getElementById('webgl-back') ||
      (() => {
        const c = document.createElement('canvas');
        c.id = 'webgl-back';
        c.className = 'webgl-canvas webgl-canvas--back';
        c.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(c, this.canvas);
        return c;
      })();

    this.glowEl = document.querySelector('[data-hero-glow]');

    this.rendererBack = new THREE.WebGLRenderer({ canvas: this.canvasBack, ...opts });
    this.rendererBack.setClearColor(0x000000, 0);
    this.rendererBack.setPixelRatio(pr);
    this.rendererBack.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.rendererBack.toneMapping = THREE.NoToneMapping;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    const fov = this.simplified ? 28 : 24;
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    this.camera.position.set(0, 0, this.cameraZ);
    this.camera.lookAt(0, 0, 0);
    this.group = new THREE.Group();
    this.group.rotation.order = 'XYZ';
    this.scene.add(this.group);
  }

  applyTilt() {
    if (!this.group) return;
    this.group.rotation.x = this._tiltRad;
    this.group.position.y = this.radius * Math.sin(this._tiltRad);
  }

  async ensureLabelFont() {
    if (this._fontReady) return;
    try {
      if (document.fonts?.load) {
        await document.fonts.load('600 48px "Barlow Condensed"');
        await document.fonts.ready;
      }
    } catch {
      /* fallback stack in canvas */
    }
    this._fontReady = true;
  }

  /**
   * Cover-crop source into plane aspect, then stamp title at the bottom
   * so the label survives the shader's cover UV.
   */
  bakeCardLabel(sourceTex, title) {
    const img = sourceTex?.image;
    if (!img || !title) return sourceTex;

    const aspect = this.planeW / this.planeH;
    const H = this.simplified
      ? Math.min(1920, Math.max(1280, Math.round((img.height || 1200) * this.getPixelRatio())))
      : Math.min(1400, Math.max(960, img.height || 1200));
    const W = Math.round(H * aspect);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceTex;

    const imgW = img.width || img.videoWidth || W;
    const imgH = img.height || img.videoHeight || H;
    const imgAspect = imgW / imgH;
    let dw;
    let dh;
    let dx;
    let dy;
    if (imgAspect > aspect) {
      dh = H;
      dw = H * imgAspect;
      dx = (W - dw) / 2;
      dy = 0;
    } else {
      dw = W;
      dh = W / imgAspect;
      dx = 0;
      dy = (H - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);

    const band = H * 0.28;
    const grad = ctx.createLinearGradient(0, H - band, 0, H);
    grad.addColorStop(0, 'rgba(8, 12, 10, 0)');
    grad.addColorStop(0.4, 'rgba(8, 12, 10, 0.42)');
    grad.addColorStop(1, 'rgba(8, 12, 10, 0.82)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - band, W, band);

    const label = String(title).toUpperCase();
    const maxW = W * 0.86;
    let size = Math.round(H * 0.032);
    const minSize = Math.round(H * 0.022);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0.06em';

    const setFont = (s) => {
      ctx.font = `600 ${s}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    };
    setFont(size);
    while (size > minSize && ctx.measureText(label).width > maxW) {
      size -= 1;
      setFont(size);
    }

    const x = W / 2;
    const y = H - H * 0.045;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(label, x, y + 1, maxW);
    ctx.fillStyle = '#f5f6f4';
    ctx.fillText(label, x, y, maxW);

    const labeled = new THREE.CanvasTexture(canvas);
    labeled.colorSpace = THREE.SRGBColorSpace;
    labeled.minFilter = THREE.LinearFilter;
    labeled.magFilter = THREE.LinearFilter;
    labeled.generateMipmaps = false;
    labeled.anisotropy = 1;
    labeled.needsUpdate = true;

    sourceTex.dispose?.();
    return labeled;
  }

  loadTextureBank(urls, titles = []) {
    const loader = new THREE.TextureLoader();
    const maxAniso = this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
    const aniso = Math.min(maxAniso, this.simplified ? 4 : 8);
    return Promise.all(
      urls.map(
        (url, i) =>
          new Promise((resolve) => {
            loader.load(
              url,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.minFilter = THREE.LinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.generateMipmaps = false;
                tex.anisotropy = aniso;
                resolve(this.bakeCardLabel(tex, titles[i] || ''));
              },
              undefined,
              () => resolve(null),
            );
          }),
      ),
    ).then((list) => list.filter(Boolean));
  }

  async createPlanes() {
    await this.ensureLabelFont();

    const proTitles = getCarouselItems('pro').map((p) => p.title);
    const lifeTitles = getCarouselItems('private').map((p) => p.title);

    const [pro, life] = await Promise.all([
      this.loadTextureBank(PROJECT_TEXTURES, proTitles),
      this.loadTextureBank(LIFE_TEXTURES, lifeTitles),
    ]);

    this.texturesPro = pro;
    this.texturesLife = life;
    this.mode = getSiteMode();
    this.textures = this.mode === 'private' ? this.texturesLife : this.texturesPro;
    this.uniqueCount = this.textures.length || 1;

    // Repeat around the ring — more slots for narrower card format
    const target = this.simplified ? this.uniqueCount : 18;
    const slotTextures = [];
    while (slotTextures.length < target) {
      for (let i = 0; i < this.textures.length && slotTextures.length < target; i++) {
        slotTextures.push(this.textures[i]);
      }
    }

    this.itemCount = slotTextures.length;
    const step = (Math.PI * 2) / this.itemCount;
    const segments = this.simplified ? 8 : 14;

    slotTextures.forEach((texture, i) => {
      const geo = new THREE.PlaneGeometry(this.planeW, this.planeH, segments, 1);
      const img = texture.image;
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: texture },
          uImageSize: {
            value: new THREE.Vector2(img?.width || 960, img?.height || 1200),
          },
          uPlaneSize: { value: new THREE.Vector2(this.planeW, this.planeH) },
          uBend: { value: this.bendAmount },
          uVelocity: { value: 0 },
          uRadius: { value: 0.1 },
          uOpacity: { value: 1 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: true,
        depthTest: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      });

      const mesh = new THREE.Mesh(geo, material);
      const angle = i * step;
      mesh.position.set(
        Math.sin(angle) * this.radius,
        0,
        Math.cos(angle) * this.radius,
      );
      mesh.rotation.y = angle;
      mesh.frustumCulled = true;
      mesh.userData.index = i % this.uniqueCount;
      mesh.userData.baseAngle = angle;
      this.group.add(mesh);
      this.planes.push(mesh);
    });

    this.syncStageLabel();
  }

  /** Swap Pro ↔ Life card textures without rebuilding the ring. */
  applyModeDeck(mode = getSiteMode()) {
    const next = mode === 'private' ? 'private' : 'pro';
    const bank = next === 'private' ? this.texturesLife : this.texturesPro;
    if (!bank?.length || !this.planes.length) return;

    this._pendingSwap = false;
    this._pendingBank = null;
    this.mode = next;
    this.textures = bank;
    this.uniqueCount = bank.length;

    this.planes.forEach((mesh, i) => {
      this.applyTextureToPlane(mesh, bank, i);
      mesh.userData.needsDeckSwap = false;
    });

    this._lastIndex = -1;
    this.updateIndexUI();
    this.syncStageLabel();
    this.syncCategoryBar();
  }

  applyTextureToPlane(mesh, bank, slotIndex) {
    const tex = bank[slotIndex % bank.length];
    if (!tex) return;
    const img = tex.image;
    mesh.material.uniforms.uMap.value = tex;
    mesh.material.uniforms.uImageSize.value.set(img?.width || 960, img?.height || 1200);
    mesh.userData.index = slotIndex % bank.length;
  }

  /** Swap textures only on cards that are currently dissolved / behind the ring. */
  flushPendingDeckSwaps(force = false) {
    if (!this._pendingSwap || !this._pendingBank?.length) return;

    let remaining = 0;
    for (let i = 0; i < this.planes.length; i++) {
      const mesh = this.planes[i];
      if (!mesh.userData.needsDeckSwap) continue;

      const facing =
        mesh.userData.facing ?? Math.cos(mesh.userData.baseAngle + this.rotation);
      const hidden = facing < -0.15 || (mesh.userData.opacity ?? 1) < 0.4;

      if (force || hidden) {
        this.applyTextureToPlane(mesh, this._pendingBank, i);
        mesh.userData.needsDeckSwap = false;
      } else {
        remaining += 1;
      }
    }

    if (remaining === 0) {
      this._pendingSwap = false;
      this._pendingBank = null;
      this._lastIndex = -1;
      this.updateIndexUI();
      this.syncStageLabel();
    }
  }

  /**
   * Work ↔ Life: spin up, crossfade via back-of-ring swaps + veil, ease out.
   */
  transitionModeDeck(mode = getSiteMode()) {
    const next = mode === 'private' ? 'private' : 'pro';
    if (next === this.mode && !this._modeSpinning && !this._pendingSwap) return;

    const bank = next === 'private' ? this.texturesLife : this.texturesPro;
    const canSpin =
      this.enabled &&
      this.planes.length &&
      bank?.length &&
      this.canvas.classList.contains('is-active') &&
      !prefersReducedMotion();

    if (!canSpin) {
      this._modeTween?.kill();
      this._modeBoost = 0;
      this._modeVeil = 0;
      this._modeSpinning = false;
      this.applyModeDeck(next);
      return;
    }

    this._modeTween?.kill();
    this._modeSpinning = true;

    // Commit mode for UI, but swap textures only when cards are out of sight
    this.mode = next;
    this.textures = bank;
    this.uniqueCount = bank.length;
    this._pendingBank = bank;
    this._pendingSwap = true;
    this.planes.forEach((mesh) => {
      mesh.userData.needsDeckSwap = true;
    });

    const dir = next === 'private' ? 1 : -1;
    const state = { boost: this._modeBoost || 0, veil: this._modeVeil || 0 };

    this._modeTween = gsap.timeline({
      onComplete: () => {
        this.flushPendingDeckSwaps(true);
        this._modeSpinning = false;
        this._modeBoost = 0;
        this._modeVeil = 0;
        this._modeTween = null;
        this.snapOptional?.();
      },
    });

    // 1) Accelerate + soft veil so the front never pops
    this._modeTween.to(
      state,
      {
        boost: 0.072 * dir,
        veil: 0.32,
        duration: 0.55,
        ease: 'power2.in',
        onUpdate: () => {
          this._modeBoost = state.boost;
          this._modeVeil = state.veil;
        },
      },
      0,
    );

    // 2) Peak smear — keep spinning while back faces silently re-skin
    this._modeTween.to(state, {
      boost: 0.088 * dir,
      veil: 0.42,
      duration: 0.7,
      ease: 'none',
      onUpdate: () => {
        this._modeBoost = state.boost;
        this._modeVeil = state.veil;
        this.flushPendingDeckSwaps(false);
      },
    });

    // 3) Coast out — unveil as remaining cards finish swapping behind
    this._modeTween.to(state, {
      boost: 0,
      veil: 0,
      duration: 1.35,
      ease: 'power3.out',
      onUpdate: () => {
        this._modeBoost = state.boost;
        this._modeVeil = state.veil;
        this.flushPendingDeckSwaps(false);
      },
    });
  }

  syncStageLabel() {
    const stage = this.getStage();
    if (!stage) return;
    const project = getProjectByIndex(this.activeIndex, this.mode);
    const name = project?.title ? `„${project.title}“ — ` : '';
    stage.setAttribute(
      'aria-label',
      this.mode === 'private'
        ? `${name}Hobby-Karussell — ziehen zum Drehen`
        : `${name}öffnen — ziehen zum Drehen`,
    );
  }

  /** Keep category bar jump indices aligned with PROJECTS / LIFE_CARDS order. */
  syncCategoryBar() {
    document.querySelectorAll('[data-carousel-jump]').forEach((btn) => {
      const cat = btn.getAttribute('data-carousel-category');
      if (!cat) return;
      const listMode = btn.closest('[data-mode="private"]') ? 'private' : 'pro';
      const idx = getCategoryJumpIndex(cat, listMode);
      if (idx >= 0) btn.setAttribute('data-carousel-jump', String(idx));
    });
  }

  /** Kept for mode/theme hooks — dissolve no longer tints toward bg. */
  syncFadeColor() {}

  getStage() {
    return document.querySelector('[data-hero-stage]');
  }

  /** @param {boolean} force */
  syncToStage(force = false) {
    const stage = this.getStage();
    if (!stage || !this.renderer || !this.camera) return;

    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const left = Math.round(rect.left);
    const top = Math.round(rect.top);

    const moved =
      force ||
      this._needsSync ||
      left !== this._stageLeft ||
      top !== this._stageTop ||
      w !== this._stageW ||
      h !== this._stageH;

    if (!moved) return;

    this._stageLeft = left;
    this._stageTop = top;
    this._stageW = w;
    this._stageH = h;
    this._needsSync = false;

    const active = this.canvas.classList.contains('is-active');
    const onScreen = rect.bottom > 48 && rect.top < window.innerHeight - 24;
    const show = active && onScreen;
    this.applyLayerBox(this.glowEl, left, top, w, h, '1', show);
    this.applyLayerBox(this.canvasBack, left, top, w, h, '2', show);
    this.applyLayerBox(this.canvas, left, top, w, h, '3', show);

    if (active) {
      stage.style.cursor = '';
    }

    const pr = this.getPixelRatio();
    const bw = Math.round(w * pr);
    const bh = Math.round(h * pr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(w, h, false);
      this.rendererBack?.setPixelRatio(pr);
      this.rendererBack?.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  applyLayerBox(el, left, top, w, h, zIndex, active) {
    if (!el) return;
    const s = el.style;
    s.position = 'fixed';
    s.left = `${left}px`;
    s.top = `${top}px`;
    s.width = `${w}px`;
    s.height = `${h}px`;
    s.zIndex = zIndex;
    if (el === this.glowEl) {
      s.pointerEvents = 'none';
      el.classList.toggle('is-active', active);
      return;
    }
    s.pointerEvents = 'none';
    if (active) {
      // Keep visible once revealed; don't clobber CSS fade mid-transition
      if (s.visibility !== 'visible') s.visibility = 'visible';
      if (s.opacity === '0' || s.opacity === '') s.opacity = '1';
    } else {
      s.opacity = '0';
      s.visibility = 'hidden';
    }
  }

  bindEvents() {
    const stage = this.getStage() || this.canvas;
    const onResize = () => {
      this._needsSync = true;
      this.syncToStage(true);
    };
    const onScroll = () => {
      this._needsSync = true;
    };
    const onPointerDown = (e) => this.onPointerDown(e);
    const onPointerMove = (e) => {
      if (this.pointerDown && !this.simplified) this.onPointerMove(e);
      if (!this.pointerDown) this.syncStageCursor(e.clientX, e.clientY);
    };
    const onStagePointerMove = (e) => {
      if (!this.pointerDown || !this.simplified) return;
      this.onPointerMove(e);
      const dx = Math.abs(e.clientX - this._pointerStartX);
      const dy = Math.abs(e.clientY - this._pointerStartY);
      if (dx > dy && dx > 4) e.preventDefault();
    };
    const onPointerUp = () => this.onPointerUp();
    const onPointerLeave = () => {
      if (!this.pointerDown) this.setCardHover(false);
    };
    const onWheel = (e) => this.onWheel(e);
    const onKey = (e) => this.onKey(e);
    const onStageKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openActiveProject();
      }
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onStagePointerMove, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointerleave', onPointerLeave);
    stage.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    stage.addEventListener('keydown', onStageKey);

    this._listeners = [
      () => window.removeEventListener('resize', onResize),
      () => window.removeEventListener('scroll', onScroll),
      () => stage.removeEventListener('pointerdown', onPointerDown),
      () => stage.removeEventListener('pointermove', onStagePointerMove),
      () => window.removeEventListener('pointermove', onPointerMove),
      () => window.removeEventListener('pointerup', onPointerUp),
      () => stage.removeEventListener('pointerleave', onPointerLeave),
      () => stage.removeEventListener('wheel', onWheel),
      () => window.removeEventListener('keydown', onKey),
      () => stage.removeEventListener('keydown', onStageKey),
    ];

    document.querySelectorAll('[data-carousel-prev]').forEach((btn) => {
      const fn = () => this.nudge(1);
      btn.addEventListener('click', fn);
      this._listeners.push(() => btn.removeEventListener('click', fn));
    });
    document.querySelectorAll('[data-carousel-next]').forEach((btn) => {
      const fn = () => this.nudge(-1);
      btn.addEventListener('click', fn);
      this._listeners.push(() => btn.removeEventListener('click', fn));
    });
    document.querySelectorAll('[data-carousel-jump]').forEach((btn) => {
      const fn = () => {
        const cat = btn.getAttribute('data-carousel-category');
        const listMode = btn.closest('[data-mode="private"]') ? 'private' : 'pro';
        const index = cat
          ? getCategoryJumpIndex(cat, listMode)
          : Number(btn.getAttribute('data-carousel-jump')) || 0;
        if (index < 0) return;
        if (listMode !== this.mode) this.applyModeDeck(listMode);
        this.jumpTo(index);
      };
      btn.addEventListener('click', fn);
      this._listeners.push(() => btn.removeEventListener('click', fn));
    });

    this.syncCategoryBar();

    const onMode = () => {
      this.transitionModeDeck(getSiteMode());
    };
    const onTheme = () => {
      this.syncFadeColor();
    };
    window.addEventListener('sitemodechange', onMode);
    this._paletteObserver?.disconnect();
    this._paletteObserver = new MutationObserver(onTheme);
    this._paletteObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    this._listeners.push(() => {
      window.removeEventListener('sitemodechange', onMode);
      this._paletteObserver?.disconnect();
      this._paletteObserver = null;
      this._modeTween?.kill();
      this._modeTween = null;
      this._modeBoost = 0;
      this._modeVeil = 0;
      this._modeSpinning = false;
      this._pendingSwap = false;
      this._pendingBank = null;
    });
    this.syncFadeColor();
  }

  bindScroll() {
    const hero = document.querySelector('[data-hero]');
    if (!hero || this.simplified) return;

    this.scrollTrigger = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
      onUpdate: (self) => {
        const p = self.progress;
        this.radius = this.baseRadius + p * 0.5;
        this.cameraZ = this.baseCameraZ + p * 1.6;
        this.camera.position.z = this.cameraZ;
        this.repositionPlanes();
        this.applyTilt();
      },
    });
  }

  repositionPlanes() {
    const step = (Math.PI * 2) / this.itemCount;
    this.planes.forEach((mesh, i) => {
      const angle = i * step;
      mesh.position.set(
        Math.sin(angle) * this.radius,
        0,
        Math.cos(angle) * this.radius,
      );
      mesh.rotation.y = angle;
      mesh.userData.baseAngle = angle;
    });
  }

  /** Raycast front-facing cards (focus + left/right neighbors). */
  pickCardAt(clientX, clientY) {
    const stage = this.getStage();
    if (!stage || !this.camera || !this.planes.length) return null;
    if (!this.canvas.classList.contains('is-active')) return null;

    const r = stage.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    if (
      clientX < r.left ||
      clientX > r.right ||
      clientY < r.top ||
      clientY > r.bottom
    ) {
      return null;
    }

    this._pointerNDC.x = ((clientX - r.left) / r.width) * 2 - 1;
    this._pointerNDC.y = -((clientY - r.top) / r.height) * 2 + 1;

    this.group?.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this._pointerNDC, this.camera);

    const candidates = [];
    for (let i = 0; i < this.planes.length; i++) {
      const mesh = this.planes[i];
      if ((mesh.userData.facing ?? 0) < this._frontFacingMin) continue;
      if ((mesh.userData.opacity ?? 1) < 0.35) continue;
      candidates.push(mesh);
    }
    if (!candidates.length) return null;

    const hits = this.raycaster.intersectObjects(candidates, false);
    return hits[0]?.object ?? null;
  }

  setCardHover(on) {
    const want = !!on && this.mode !== 'private';
    if (this._hoverCard === want) return;
    this._hoverCard = want;
    this.getStage()?.classList.toggle('is-card-hover', want);
    // Drive disc directly — e.target is always the stage, class alone can race pointermove
    const cursor = document.querySelector('.cursor');
    if (!cursor?.classList.contains('is-ready')) return;
    if (want) cursor.classList.add('is-hover');
    else if (!document.querySelector('.text-cta:hover, .work-float__card:hover, .hero__ctrl:hover, [data-carousel-jump]:hover')) {
      cursor.classList.remove('is-hover');
    }
  }

  syncStageCursor(clientX, clientY) {
    if (!this.canvas.classList.contains('is-active')) {
      this.setCardHover(false);
      return;
    }
    const mesh = this.pickCardAt(clientX, clientY);
    this.setCardHover(!!mesh);
  }

  onPointerDown(e) {
    if (e.target.closest('a, button, input')) return;
    this.pointerDown = true;
    this._pointerMoved = false;
    const mesh = this.pickCardAt(e.clientX, e.clientY);
    this._tapOnCard = !!mesh && this.mode !== 'private';
    this._tapProjectIndex = mesh?.userData?.index ?? -1;
    this._pointerStartX = e.clientX;
    this._pointerStartY = e.clientY;
    this.lastX = e.clientX;
    e.currentTarget?.setPointerCapture?.(e.pointerId);
  }

  onPointerMove(e) {
    if (!this.pointerDown) return;
    const dx = e.clientX - this.lastX;
    const dist = Math.hypot(e.clientX - this._pointerStartX, e.clientY - this._pointerStartY);
    if (dist > 6) this._pointerMoved = true;
    this.lastX = e.clientX;

    if (this.simplified) {
      const dragRot = dx * this._dragGain;
      this.rotation += dragRot;
      this.velocity = dragRot * 0.55;
      return;
    }

    this.velocity += dx * this._dragGain;
  }

  onPointerUp() {
    const wasTap = this.pointerDown && !this._pointerMoved && this._tapOnCard;
    const index = this._tapProjectIndex;
    this.pointerDown = false;
    this._tapOnCard = false;
    this._tapProjectIndex = -1;
    if (wasTap && this.canvas.classList.contains('is-active') && index >= 0) {
      this.openProjectAt(index);
      return;
    }
    this.snapOptional();
  }

  openActiveProject() {
    this.openProjectAt(this.activeIndex);
  }

  openProjectAt(index) {
    if (this.mode === 'private') return;
    const project = getProjectByIndex(index, this.mode);
    if (!project?.href) return;
    const link = document.createElement('a');
    link.href = project.href;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  onWheel(e) {
    if (!this.canvas.classList.contains('is-active')) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      e.preventDefault();
      this.velocity += e.deltaX * 0.00016 + (e.shiftKey ? e.deltaY * 0.00012 : 0);
    } else if (isMobile()) {
      e.preventDefault();
      this.velocity += e.deltaY * 0.0002;
    }
  }

  onKey(e) {
    if (!this.canvas.classList.contains('is-active')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.nudge(1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.nudge(-1);
    }
  }

  nudge(dir) {
    const step = (Math.PI * 2) / this.itemCount;
    this.velocity += dir * step * 0.18;
    this.snapOptional(true);
  }

  jumpTo(index) {
    if (!this.planes.length || !this.itemCount) return;
    const wanted = Number(index);
    if (!Number.isFinite(wanted)) return;

    const step = (Math.PI * 2) / this.itemCount;
    let bestSlot = -1;
    let bestDelta = Infinity;

    for (let i = 0; i < this.planes.length; i++) {
      if (Number(this.planes[i].userData.index) !== wanted) continue;
      const targetRot = -i * step;
      let delta = ((targetRot - this.rotation) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      const abs = Math.abs(delta);
      if (abs < bestDelta) {
        bestDelta = abs;
        bestSlot = i;
      }
    }

    if (bestSlot < 0) return;

    const targetRot = -bestSlot * step;
    this.velocity = 0;
    gsap.killTweensOf(this);
    gsap.to(this, {
      rotation: targetRot,
      duration: 0.85,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }

  snapOptional(force = false) {
    const threshold = this.simplified ? 0.015 : 0.04;
    if (!force && Math.abs(this.velocity) > threshold) return;
    const step = (Math.PI * 2) / this.itemCount;
    const nearest = Math.round(this.rotation / step) * step;
    gsap.to(this, {
      rotation: nearest,
      duration: this.simplified ? 0.45 : 0.65,
      ease: 'power3.out',
      overwrite: 'auto',
      onComplete: () => {
        this.velocity = 0;
      },
    });
  }

  updateIndexUI() {
    let best = -Infinity;
    let index = 0;
    for (let i = 0; i < this.planes.length; i++) {
      const c = Math.cos(this.planes[i].userData.baseAngle + this.rotation);
      if (c > best) {
        best = c;
        index = this.planes[i].userData.index;
      }
    }
    if (index === this._lastIndex) return;
    this._lastIndex = index;
    this.activeIndex = index;

    const el = document.querySelector('[data-carousel-index]');
    if (el) el.textContent = padIndex(index, this.uniqueCount || PROJECTS.length);

    const project = getProjectByIndex(index, this.mode);
    this.syncStageLabel();

    document.querySelectorAll('[data-carousel-jump]').forEach((btn) => {
      const listMode = btn.closest('[data-mode="private"]') ? 'private' : 'pro';
      if (listMode !== this.mode) {
        btn.classList.remove('is-active');
        return;
      }
      const cat = btn.getAttribute('data-carousel-category');
      if (cat) {
        btn.classList.toggle('is-active', project?.category === cat);
      } else {
        const i = Number(btn.getAttribute('data-carousel-jump')) || 0;
        btn.classList.toggle('is-active', i === index);
      }
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._ticker = () => this.tick();
    gsap.ticker.add(this._ticker);
  }

  stop() {
    this.running = false;
    if (this._ticker) {
      gsap.ticker.remove(this._ticker);
      this._ticker = null;
    }
  }

  tick() {
    if (!this.renderer || !this.scene || !this.camera) return;

    const active = this.canvas.classList.contains('is-active');
    if (!active && !this._needsSync) return;
    if (this._needsSync) this.syncToStage();
    if (!active) return;

    this.velocity *= this.damping;
    if (Math.abs(this.velocity) < 0.00004) this.velocity = 0;
    const modeBoost = this._modeBoost || 0;
    const auto = this.pointerDown ? 0 : this.autoSpeed;
    this.rotation += auto + this.velocity + modeBoost;

    this.group.rotation.x = this._tiltRad;
    this.group.rotation.y = this.rotation;

    // Map drag into a tiny vertex skew only — mode spin stays sharp (no smear)
    const drag = Math.abs(this.velocity) * 14;
    const velAbs = this._modeSpinning ? 0 : Math.min(0.65, drag);
    const moving = velAbs > 0.02;
    const frontMin = this._frontFacingMin;

    for (let i = 0; i < this.planes.length; i++) {
      const mesh = this.planes[i];
      const mat = mesh.material;
      const facing = Math.cos(mesh.userData.baseAngle + this.rotation);

      if (moving && !this.simplified) mat.uniforms.uVelocity.value = velAbs;
      else if (mat.uniforms.uVelocity.value !== 0) mat.uniforms.uVelocity.value = 0;

      let opacity = 1;
      // Dissolve only on the far half of the ring
      const fadeStart = -0.05;
      const fadeEnd = -0.95;
      if (facing < fadeStart) {
        const t = clamp((fadeStart - facing) / (fadeStart - fadeEnd), 0, 1);
        const ease = t * t * (3 - 2 * t);
        opacity = 1 - ease;
      }

      // Soft veil during Work↔Life so front cards never hard-cut to the other deck
      if (this._modeVeil > 0) {
        opacity *= 1 - this._modeVeil * 0.85;
      }

      mat.uniforms.uOpacity.value = opacity;

      const depth = clamp(1 - (facing + 1) * 0.5, 0, 1);
      mesh.renderOrder = Math.round((1 - depth) * 100);
      mesh.userData.facing = facing;
      mesh.userData.opacity = opacity;
    }

    // Re-skin cards that rotated to the blind spot this frame
    if (this._pendingSwap) this.flushPendingDeckSwaps(false);

    // Depth split: back-facing cards, then front-facing (skip fully dissolved)
    for (let i = 0; i < this.planes.length; i++) {
      const mesh = this.planes[i];
      mesh.visible = mesh.userData.facing < frontMin && mesh.userData.opacity > 0.02;
    }
    this.rendererBack?.render(this.scene, this.camera);

    for (let i = 0; i < this.planes.length; i++) {
      const mesh = this.planes[i];
      mesh.visible = mesh.userData.facing >= frontMin && mesh.userData.opacity > 0.02;
    }
    this.renderer.render(this.scene, this.camera);

    for (let i = 0; i < this.planes.length; i++) {
      this.planes[i].visible = true;
    }

    this.updateIndexUI();
  }

  show() {
    this.canvas.classList.add('is-active');
    this.canvas.classList.remove('is-reduced');
    this.canvasBack?.classList.add('is-active');
    this.canvasBack?.classList.remove('is-reduced');
    this.glowEl?.classList.add('is-active');
    this._needsSync = true;
    this.syncToStage(true);
  }

  hide() {
    this.setCardHover(false);
    this.glowEl?.classList.remove('is-active');
    [this.canvas, this.canvasBack].forEach((el) => {
      if (!el) return;
      el.classList.remove('is-active');
      const s = el.style;
      s.left = '0';
      s.top = '0';
      s.width = '100%';
      s.height = '100%';
      s.opacity = '0';
      s.visibility = 'hidden';
    });
  }

  showFallback() {
    this.setCardHover(false);
    this.canvas.classList.add('is-reduced');
    this.canvas.classList.remove('is-active');
    this.canvasBack?.classList.add('is-reduced');
    this.canvasBack?.classList.remove('is-active');
    this.glowEl?.classList.remove('is-active');
    document.querySelector('[data-hero-fallback]')?.classList.add('is-visible');
  }

  revealFromIntro({ instant = false } = {}) {
    this.introDone = true;
    this.rotation = 0;
    this.velocity = 0;
    const layers = [this.canvas, this.canvasBack].filter(Boolean);
    gsap.killTweensOf(layers);
    if (this.glowEl) {
      this.glowEl.classList.add('is-active');
      this.glowEl.style.visibility = 'visible';
    }
    layers.forEach((el) => {
      el.classList.add('is-active');
      el.classList.remove('is-reduced');
      el.style.visibility = 'visible';
      el.style.transition = '';
    });
    this._needsSync = true;
    this.syncToStage(true);

    // Under wipe / instant: show fully so cover doesn't lift onto a fading canvas
    if (instant || document.documentElement.classList.contains('is-wipe-pending')) {
      layers.forEach((el) => {
        el.style.opacity = '1';
      });
      return;
    }

    layers.forEach((el) => {
      el.style.opacity = '0';
    });
    gsap.to(layers, {
      opacity: 1,
      duration: 0.9,
      ease: 'power2.out',
      overwrite: true,
      onComplete: () => {
        layers.forEach((el) => {
          el.style.opacity = '1';
          el.style.visibility = 'visible';
        });
      },
    });
  }

  teardownPage() {
    this.stop();
    this.scrollTrigger?.kill();
    this.scrollTrigger = null;
    this._listeners.forEach((off) => off());
    this._listeners = [];
    this.hide();
    this.introDone = false;
    this._lastIndex = -1;
  }

  resumeOnHome() {
    if (prefersReducedMotion()) {
      this.showFallback();
      return;
    }
    if (!this.enabled) return;
    this.applyModeDeck(getSiteMode());
    this.syncFadeColor();
    this.bindEvents();
    this.bindScroll();
    this.start();
  }

  dispose() {
    this.teardownPage();
    this.planes.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.texturesPro.forEach((t) => t.dispose());
    this.texturesLife.forEach((t) => t.dispose());
    this.planes = [];
    this.textures = [];
    this.texturesPro = [];
    this.texturesLife = [];
    this.scene?.clear();
    this.renderer?.dispose();
    this.rendererBack?.dispose();
    this.renderer = null;
    this.rendererBack = null;
    this.scene = null;
    this.camera = null;
    this.group = null;
    this.enabled = false;
  }
}

let instance = null;

export function getCarousel() {
  return instance;
}

export async function ensureCarousel() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return null;

  if (!instance) {
    instance = new HeroCarousel(canvas);
    await instance.init();
  }
  if (import.meta.env.DEV) window.__carousel = instance;
  return instance;
}

export async function resetCarousel() {
  if (instance) {
    instance.dispose();
    instance = null;
  }
  return ensureCarousel();
}
