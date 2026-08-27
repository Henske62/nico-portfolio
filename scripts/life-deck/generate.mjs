/**
 * Life Mode — Custom Deck
 * One system: cream face, ink/coral suits, Caslon ranks,
 * court symmetry (motif + 180° mirror), single strong silhouette.
 *
 * Run: node scripts/life-deck/generate.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const __dir = dirname(fileURLToPath(import.meta.url));
const SVG_DIR = join(__dir, 'svg');
const OUT_PUBLIC = join(__dir, '../../public/images/life');

const T = {
  face: '#F6F1E8',
  ink: '#1A1F2E',
  coral: '#FF6B4A',
  gold: '#C4A04A',
  foam: '#FFFCF7',
};

const FONT =
  '/System/Library/Fonts/Supplemental/BigCaslon.ttf';

mkdirSync(SVG_DIR, { recursive: true });
mkdirSync(OUT_PUBLIC, { recursive: true });

/* ── pips (12×16 box, origin center) ───────────────────────── */

const pips = {
  diamond: `<path d="M0-11 L7 0 L0 11 L-7 0 Z"/>`,
  heart: `<path d="M0 10 C0 10-12 0-12-5 C-12-10-7-12-4-9 C-2-7 0-4 0-4 C0-4 2-7 4-9 C7-12 12-10 12-5 C12 0 0 10 0 10Z"/>`,
  spade: `<path d="M0-12 C8-2 10 4 0 6 C-10 4-8-2 0-12Z"/><path d="M-3 6 L0 2 L3 6 L0 14Z"/>`,
  club: `
    <circle cx="0" cy="-5" r="5.2"/>
    <circle cx="-5.2" cy="2.5" r="5.2"/>
    <circle cx="5.2" cy="2.5" r="5.2"/>
    <path d="M-2.5 6 L0 2 L2.5 6 L0 13Z"/>`,
  racket: `
    <ellipse cx="0" cy="-3" rx="7" ry="9" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <rect x="-1.2" y="5" width="2.4" height="8" rx="1"/>`,
  sun: `
    <circle cx="0" cy="0" r="4.5"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315]
      .map((a) => {
        const r = (a * Math.PI) / 180;
        const x1 = Math.cos(r) * 6.5;
        const y1 = Math.sin(r) * 6.5;
        const x2 = Math.cos(r) * 10;
        const y2 = Math.sin(r) * 10;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      })
      .join('')}`,
  pad: `<rect x="-9" y="-5" width="18" height="10" rx="4"/>`,
  card: `<rect x="-6" y="-9" width="12" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="0" cy="0" r="2"/>`,
  clap: `<path d="M-9 2 H9 V10 H-9Z M-9 2 L-6-6 H8 L9 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`,
  brush: `<path d="M0-10 V4 M-3 4 L0 11 L3 4Z"/>`,
  quill: `<path d="M3 10 L-2-10 L6-4 L3 10Z M-2-10 L-6-2"/>`,
  duck: `<ellipse cx="0" cy="0" rx="7" ry="6"/><ellipse cx="7" cy="1" rx="5" ry="3"/>`,
  glass: `<path d="M-4-10 L-3 10 H3 L4-10Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M-4-10 H4"/>`,
  globe: `<circle cx="0" cy="0" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><ellipse cx="0" cy="0" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="-9" y1="0" x2="9" y2="0" stroke="currentColor" stroke-width="1.4"/>`,
};

/* ── center motifs (designed for ~220×260 court cell) ──────── */

/**
 * Pictogram language: thick strokes, circle heads, no self-intersecting fills.
 * Reads like Olympic/ISOTYPE marks — clear at carousel distance.
 */

/** Padel — side-view swing */
const motifPadel = `
  <g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" fill="currentColor">
    <circle cx="-6" cy="-88" r="20" stroke="none"/>
    <!-- torso -->
    <path d="M-10-64 C8-60 22-40 18-8 C14 22 4 48-8 70" fill="none" stroke-width="28"/>
    <!-- back leg / front leg -->
    <path d="M-8 62 L-48 118" fill="none" stroke-width="18"/>
    <path d="M-4 58 L42 122" fill="none" stroke-width="18"/>
    <!-- trailing arm -->
    <path d="M0-40 L-62 8" fill="none" stroke-width="16"/>
    <!-- hitting arm -->
    <path d="M12-36 L72-78" fill="none" stroke-width="16"/>
    <!-- racket -->
    <ellipse cx="102" cy="-98" rx="34" ry="44" fill="none" stroke-width="10"/>
    <circle cx="102" cy="-98" r="8" stroke="none" opacity="0.35"/>
    <!-- ball -->
    <circle cx="158" cy="-128" r="12" stroke="none"/>
    <!-- swing arcs -->
    <path d="M130-60 Q150-90 138-118" fill="none" stroke-width="3" opacity="0.4"/>
    <path d="M142-48 Q168-82 152-112" fill="none" stroke-width="2.5" opacity="0.28"/>
  </g>`;

/** Beach — set / dig under ball */
const motifBeach = `
  <g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" fill="currentColor">
    <circle cx="0" cy="-118" r="20" fill="none" stroke-width="7"/>
    <path d="M0-136 V-100 M-16-118 H16" fill="none" stroke-width="3.5"/>
    <circle cx="0" cy="-48" r="18" stroke="none"/>
    <!-- arms up -->
    <path d="M-8-36 L-58-96" fill="none" stroke-width="16"/>
    <path d="M8-36 L58-96" fill="none" stroke-width="16"/>
    <!-- torso -->
    <path d="M0-28 V48" fill="none" stroke-width="26"/>
    <!-- legs -->
    <path d="M0 44 L-36 118" fill="none" stroke-width="16"/>
    <path d="M0 44 L38 118" fill="none" stroke-width="16"/>
    <path d="M-100 128 Q0 96 100 128" fill="none" stroke-width="5" opacity="0.35"/>
  </g>`;

/** Gaming — clean controller + crown pip */
const motifGaming = `
  <g fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <!-- crown -->
    <path d="M-36-118 L-22-148 L-8-122 L0-152 L8-122 L22-148 L36-118 Z" fill="none" stroke-width="6"/>
    <line x1="-36" y1="-118" x2="36" y2="-118" stroke-width="6"/>
    <!-- body -->
    <rect x="-108" y="-36" width="216" height="88" rx="36" stroke="none"/>
    <!-- grips -->
    <circle cx="-92" cy="52" r="38" stroke="none"/>
    <circle cx="92" cy="52" r="38" stroke="none"/>
    <!-- d-pad (face cutouts) -->
    <rect x="-62" y="-8" width="12" height="36" rx="2" fill="${T.face}" stroke="none"/>
    <rect x="-74" y="4" width="36" height="12" rx="2" fill="${T.face}" stroke="none"/>
    <!-- buttons -->
    <circle cx="48" cy="-6" r="9" fill="${T.face}" stroke="none"/>
    <circle cx="68" cy="14" r="9" fill="${T.face}" stroke="none"/>
    <circle cx="28" cy="14" r="9" fill="${T.face}" stroke="none"/>
    <circle cx="48" cy="34" r="9" fill="${T.face}" stroke="none"/>
    <!-- sticks -->
    <circle cx="-18" cy="40" r="14" fill="none" stroke="${T.face}" stroke-width="5"/>
    <circle cx="14" cy="40" r="14" fill="none" stroke="${T.face}" stroke-width="5"/>
  </g>`;

/** Ace of hearts — large pip */
const motifAce = `
  <g>
    <path d="
      M0 78
      C0 78-78 18-78-28
      C-78-62-48-78-28-58
      C-14-44 0-22 0-22
      C0-22 14-44 28-58
      C48-78 78-62 78-28
      C78 18 0 78 0 78Z
    "/>
    <text x="0" y="-88" text-anchor="middle" font-family="Big Caslon, Didot, serif" font-size="72" font-weight="700" fill="currentColor">A</text>
  </g>`;

/** Clapperboard */
const motifFilm = `
  <g>
    <path d="M-100-8 H100 V78 H-100Z"/>
    <path d="M-100-8 L-78-72 H78 L100-8Z"/>
    ${[0, 1, 2, 3, 4]
      .map((i) => {
        const x = -100 + i * 40;
        return `<path d="M${x}-8 L${x + 22}-72 L${x + 40}-72 L${x + 18}-8Z" fill="${T.face}" opacity="0.92"/>`;
      })
      .join('')}
    <rect x="-72" y="18" width="110" height="8" rx="2" fill="${T.face}" opacity="0.85"/>
    <rect x="-72" y="40" width="72" height="8" rx="2" fill="${T.face}" opacity="0.85"/>
    <!-- hinge stick -->
    <path d="M-100-8 L-118-78" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
  </g>`;

/** Palette + brush */
const motifKunst = `
  <g>
    <!-- mini canvas -->
    <rect x="-48" y="-128" width="96" height="72" rx="3" fill="none" stroke="currentColor" stroke-width="6"/>
    <path d="M-28-80 L18-118" stroke="${T.coral}" stroke-width="7" stroke-linecap="round"/>
    <path d="M-32-110 L28-84" stroke="${T.ink}" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
    <circle cx="12" cy="-96" r="8" fill="${T.gold}"/>
    <!-- palette -->
    <path d="
      M-20 20
      c-70 0-100 48-100 88
      s40 78 100 78
      c28 0 48-12 62-32
      c8 18 28 28 48 18
      c-6-28-4-52 8-72
      C78 48 40 20-20 20Z
    "/>
    <circle cx="78" cy="78" r="28" fill="${T.face}"/>
    <circle cx="78" cy="78" r="28" fill="none" stroke="currentColor" stroke-width="6"/>
    <circle cx="-58" cy="68" r="14" fill="${T.coral}"/>
    <circle cx="-18" cy="52" r="14" fill="${T.ink}" opacity="0.35"/>
    <circle cx="18" cy="78" r="14" fill="${T.gold}"/>
    <circle cx="-32" cy="108" r="14" fill="#0D8B7A"/>
    <!-- brush -->
    <path d="M98-20 L148 110" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
    <path d="M88-42 L118-8 L98 0Z"/>
  </g>`;

/** Open book + quill */
const motifGedichte = `
  <g>
    <path d="
      M0-28
      L-118-72
      V92
      L0 58
      L118 92
      V-72
      Z
    " fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/>
    <path d="M0-28 V58" stroke="currentColor" stroke-width="5"/>
    ${[-1, 1]
      .map((side) =>
        [0, 1, 2, 3, 4, 5]
          .map((i) => {
            const y = -8 + i * 18;
            const x1 = side * 18;
            const x2 = side * (96 - i * 6);
            return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.55"/>`;
          })
          .join(''),
      )
      .join('')}
    <path d="M72-118 L118 28" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    <path d="M64-132 L108-148 L92-108Z"/>
    <circle cx="118" cy="38" r="7"/>
  </g>`;

/** Stylized duck — original graphic, not a licensed likeness */
const motifDonald = `
  <g>
    <!-- hat -->
    <ellipse cx="0" cy="-88" rx="58" ry="22"/>
    <path d="M-38-92 L-18-138 L8-98Z"/>
    <!-- head -->
    <ellipse cx="0" cy="-18" rx="78" ry="70" fill="none" stroke="currentColor" stroke-width="9"/>
    <ellipse cx="-32" cy="-28" rx="16" ry="22" fill="none" stroke="currentColor" stroke-width="5"/>
    <ellipse cx="32" cy="-28" rx="16" ry="22" fill="none" stroke="currentColor" stroke-width="5"/>
    <circle cx="-28" cy="-24" r="6"/>
    <circle cx="36" cy="-24" r="6"/>
    <!-- bill -->
    <ellipse cx="0" cy="42" rx="68" ry="32" fill="${T.gold}"/>
    <ellipse cx="0" cy="42" rx="68" ry="32" fill="none" stroke="currentColor" stroke-width="6"/>
    <path d="M-58 38 H58" stroke="currentColor" stroke-width="4"/>
    <!-- bow -->
    <path d="M-36 92 L0 108 L-36 124Z" fill="${T.coral}"/>
    <path d="M36 92 L0 108 L36 124Z" fill="${T.coral}"/>
    <circle cx="0" cy="108" r="8" fill="${T.gold}"/>
  </g>`;

/** Kölsch Stange */
const motifKoelsch = `
  <g>
    <path d="
      M-42-118
      H42
      L36 118
      H-36
      Z
    " fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/>
    <path d="M-34-8 H34 L32 110 H-32Z" fill="${T.gold}"/>
    <path d="M-40-118 H40 L36-8 H-36Z" fill="${T.foam}" stroke="currentColor" stroke-width="4"/>
    <circle cx="-14" cy="-78" r="7" fill="none" stroke="currentColor" stroke-width="2.5"/>
    <circle cx="10" cy="-92" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="4" cy="-52" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/>
    <!-- floating hearts -->
    <g transform="translate(-108,-40) scale(0.85)" fill="${T.coral}">${pips.heart}</g>
    <g transform="translate(108,-20) scale(0.85)" fill="${T.coral}">${pips.heart}</g>
    <g transform="translate(-100,70) scale(0.7)" fill="${T.coral}" opacity="0.7">${pips.heart}</g>
    <g transform="translate(104,88) scale(0.7)" fill="${T.coral}" opacity="0.7">${pips.heart}</g>
  </g>`;

/** Globe + star orbit */
const motifEuropa = `
  <g>
    <circle cx="0" cy="0" r="92" fill="none" stroke="currentColor" stroke-width="8"/>
    <ellipse cx="0" cy="0" rx="36" ry="92" fill="none" stroke="currentColor" stroke-width="4"/>
    <ellipse cx="0" cy="0" rx="92" ry="30" fill="none" stroke="currentColor" stroke-width="4"/>
    <line x1="-92" y1="0" x2="92" y2="0" stroke="currentColor" stroke-width="4"/>
    ${Array.from({ length: 12 }, (_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 12;
      const x = Math.cos(a) * 122;
      const y = Math.sin(a) * 122;
      return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(0.9)" fill="${T.gold}">${pips.diamond}</g>`;
    }).join('')}
    <!-- suitcase -->
    <rect x="-40" y="128" width="80" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="5"/>
    <path d="M-16 128 V112 H16 V128" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
  </g>`;

/* ── card shell ────────────────────────────────────────────── */

function corner(letter, pipSvg, color) {
  const size = letter.length > 1 ? 52 : 72;
  return `
    <g fill="${color}" color="${color}">
      <text x="0" y="0" text-anchor="middle"
        font-family="Big Caslon, Didot, Georgia, serif"
        font-size="${size}" font-weight="700">${letter}</text>
      <g transform="translate(0, 42) scale(1.35)">${pipSvg}</g>
    </g>`;
}

function cardSvg({
  letter,
  color,
  pip,
  motif,
  court = true,
  file,
}) {
  const pipSvg = pips[pip];
  const index = corner(letter, pipSvg, color);

  const courtBlock = court
    ? `
      <!-- upper figure -->
      <g transform="translate(480, 305) scale(0.92)" fill="${color}" color="${color}">${motif}</g>
      <!-- lower figure (mirrored like a court card) -->
      <g transform="translate(480, 895) rotate(180) scale(0.92)" fill="${color}" color="${color}">${motif}</g>
      <!-- center ornament -->
      <g transform="translate(480, 600)" fill="${color}">
        <line x1="-120" y1="0" x2="-28" y2="0" stroke="${color}" stroke-width="1.5" opacity="0.45"/>
        <line x1="28" y1="0" x2="120" y2="0" stroke="${color}" stroke-width="1.5" opacity="0.45"/>
        <g transform="scale(1.1)">${pips.diamond}</g>
      </g>`
    : `
      <g transform="translate(480, 560)" fill="${color}" color="${color}">${motif}</g>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200" viewBox="0 0 960 1200">
  <rect width="960" height="1200" fill="${T.face}"/>
  <rect x="34" y="34" width="892" height="1132" rx="32" fill="none" stroke="${color}" stroke-width="5.5"/>
  <rect x="50" y="50" width="860" height="1100" rx="22" fill="none" stroke="${color}" stroke-width="1.6"/>
  <!-- indices -->
  <g transform="translate(88, 118)">${index}</g>
  <g transform="rotate(180 480 600) translate(88, 118)">${index}</g>
  ${courtBlock}
</svg>`;
}

const DECK = [
  {
    file: 'life-01.webp',
    letter: 'P',
    color: T.coral,
    pip: 'racket',
    motif: motifPadel,
    court: true,
  },
  {
    file: 'life-02.webp',
    letter: 'B',
    color: T.ink,
    pip: 'sun',
    motif: motifBeach,
    court: true,
  },
  {
    file: 'life-03.webp',
    letter: 'G',
    color: T.coral,
    pip: 'pad',
    motif: motifGaming,
    court: true,
  },
  {
    file: 'life-09.webp',
    letter: 'A',
    color: T.ink,
    pip: 'heart',
    motif: motifAce,
    court: false,
  },
  {
    file: 'life-05.webp',
    letter: 'F',
    color: T.coral,
    pip: 'clap',
    motif: motifFilm,
    court: true,
  },
  {
    file: 'life-07.webp',
    letter: 'K',
    color: T.ink,
    pip: 'brush',
    motif: motifKunst,
    court: true,
  },
  {
    file: 'life-06.webp',
    letter: 'Po',
    color: T.coral,
    pip: 'quill',
    motif: motifGedichte,
    court: true,
  },
  {
    file: 'life-08.webp',
    letter: 'D',
    color: T.ink,
    pip: 'duck',
    motif: motifDonald,
    court: true,
  },
  {
    file: 'life-04.webp',
    letter: 'S',
    color: T.ink,
    pip: 'glass',
    motif: motifKoelsch,
    court: true,
  },
  {
    file: 'life-10.webp',
    letter: 'E',
    color: T.coral,
    pip: 'globe',
    motif: motifEuropa,
    court: true,
  },
];

async function render(svg, outWebp) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 960 },
    font: {
      fontFiles: [FONT],
      loadSystemFonts: true,
      defaultFontFamily: 'Big Caslon',
    },
    background: T.face,
  });
  const png = resvg.render().asPng();
  await sharp(png).webp({ quality: 92 }).toFile(outWebp);
}

async function main() {
  for (const card of DECK) {
    const svg = cardSvg(card);
    const svgPath = join(SVG_DIR, card.file.replace('.webp', '.svg'));
    writeFileSync(svgPath, svg);
    const out = join(OUT_PUBLIC, card.file);
    await render(svg, out);
    console.log('✓', card.file, card.letter, card.color);
  }
  console.log('Deck rendered → public/images/life');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
