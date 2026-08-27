export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

export const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const lerp = (a, b, t) => a + (b - a) * t;

export const padIndex = (index, total) =>
  `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

/**
 * Pro categories (taglines under carousel) — projects sorted so same
 * category sits adjacent on the wheel.
 * Branding → Art Direction → Marketing → Editorial → Digital
 */
export const PROJECT_CATEGORIES = [
  { id: 'branding', label: 'Branding', jump: 0 },
  { id: 'art-direction', label: 'Art Direction', jump: 5 },
  { id: 'marketing', label: 'Marketing', jump: 7 },
  { id: 'editorial', label: 'Editorial', jump: 13 },
  { id: 'digital', label: 'Digital', jump: 15 },
];

export const LIFE_CATEGORIES = [
  { id: 'sport', label: 'Sport', jump: 0 },
  { id: 'play', label: 'Play', jump: 2 },
  { id: 'kultur', label: 'Kultur', jump: 4 },
  { id: 'sammlung', label: 'Sammlung', jump: 7 },
  { id: 'unterwegs', label: 'Unterwegs', jump: 8 },
];

/** Selected work — carousel + case pages (Pro), grouped by category */
export const PROJECTS = [
  // Branding 0–4
  {
    slug: 'koelner-kulturrat',
    title: 'Kölner Kulturrat',
    category: 'branding',
    tag: 'Branding',
    year: '2024',
    summary:
      'Ein Zeichen für eine Szene, die aus vielen einzelnen Stimmen besteht — Kölns freie Kulturinitiativen und die städtischen Träger unter einem Dach, ohne dass eine davon ihr Gesicht verliert.',
    href: '/projects/koelner-kulturrat.html',
    image: '/images/projects/case-koelner-kulturrat-27.webp',
  },
  {
    slug: 'ewtc',
    title: 'European Wu Tai Chi',
    category: 'branding',
    tag: 'Branding',
    year: '2024',
    summary:
      'Ein Verein mit über einer Generation Geschichte bekommt ein Logo, das seine Ruhe behält — und trotzdem neue Leute anspricht.',
    href: '/projects/ewtc.html',
    image: '/images/projects/case-ewtc-1.webp',
  },
  {
    slug: 'studio-k',
    title: 'Studio K',
    category: 'branding',
    tag: 'Branding',
    year: '2022–2024',
    summary:
      'Drei Jahre, viele Auftraggeber, ein roter Faden: Branding und Print, die auch außerhalb des Pitchraums noch funktionieren.',
    href: '/projects/studio-k.html',
    image: '/images/projects/case-studio-k-1.webp',
  },
  {
    slug: 'markt-oberstdorf',
    title: 'Markt Oberstdorf',
    category: 'branding',
    tag: 'Branding',
    year: 'Studium',
    summary:
      'Die südlichste Stadt Deutschlands, gezeichnet aus vier Strichen: zwei Berge, zwei Schanzen, ein Pfeil nach Süden, eine Sonne.',
    href: '/projects/markt-oberstdorf.html',
    image: '/images/projects/case-markt-oberstdorf-1.webp',
  },
  {
    slug: 'trebbau',
    title: 'Trebbau',
    category: 'branding',
    tag: 'Branding',
    year: '2025',
    summary:
      'Das Logo blieb. Drumherum neu: Branding-Anpassung und Printkampagne für Dialogmarketing aus Köln.',
    href: '/projects/trebbau.html',
    image: '/images/projects/case-trebbau-1.webp',
  },
  // Art Direction 5–6
  {
    slug: 'k1',
    title: 'K1 Kommunikation',
    category: 'art-direction',
    tag: 'Art Direction',
    year: '2024',
    summary:
      'Über 30 Jahre Agenturgeschichte bekommen ein neues Gesicht — Erfahrung in Blau, Frische in Grün, ein Megafon im Logo.',
    href: '/projects/k1.html',
    image: '/images/projects/case-k1-1.webp',
  },
  {
    slug: 'dach-cs',
    title: 'DACH CS Masters',
    category: 'art-direction',
    tag: 'Art Direction',
    year: '2024–2026',
    summary:
      'Die größte deutsche Counter-Strike-Turnierreihe bekommt ein Gesicht, das die Community sofort erkennt — inklusive Hahn.',
    href: '/projects/dach-cs.html',
    image: '/images/projects/case-dach-cs-1.webp',
  },
  // Marketing 7–12
  {
    slug: 'koelner-stadtbibliothek',
    title: 'Stadtbibliothek Köln',
    category: 'marketing',
    tag: 'Marketing',
    year: '2024',
    summary:
      'Während die Zentralbibliothek eingerüstet ist, holt #allyoucanbib elf Stadtteilbibliotheken und den Bus ins Rampenlicht.',
    href: '/projects/koelner-stadtbibliothek.html',
    image: '/images/projects/case-koelner-stadtbibliothek-1.webp',
  },
  {
    slug: 'gruene-lev',
    title: 'Grüne LEV',
    category: 'marketing',
    tag: 'Marketing',
    year: '2024',
    summary:
      'Hitze ist in Leverkusen kein abstraktes Thema — die Kampagne zeigt sowohl das Problem als auch die zehn kühlen Orte, die es schon gibt.',
    href: '/projects/gruene-lev.html',
    image: '/images/projects/case-gruene-lev-1.webp',
  },
  {
    slug: 'olympia-2024',
    title: 'Olympia 2024',
    category: 'marketing',
    tag: 'Marketing',
    year: '2024',
    summary:
      'Kein offizielles Merchandise, sondern meine eigene Plakatserie zu Paris 2024 — Tempo, Typografie, deutsche Athlet:innen.',
    href: '/projects/olympia-2024.html',
    image: '/images/projects/case-olympia-2024-1.webp',
  },
  {
    slug: 'netcologne',
    title: 'NetCologne',
    category: 'marketing',
    tag: 'Marketing',
    year: '2025–2026',
    summary:
      'KI im Klassenzimmer erklären, ohne in Tech-Jargon zu verfallen — Plakat und Feed sprechen dieselbe Sprache.',
    href: '/projects/netcologne.html',
    image: '/images/projects/case-netcologne-1.webp',
  },
  {
    slug: 'foersterstube',
    title: 'Försterstube',
    category: 'marketing',
    tag: 'Marketing',
    year: '2024',
    summary:
      'Ein Traditionsgasthaus in Ehrenfeld bekommt eine Leuchtschrift und ein Eventplakat, die beide sofort nach Försterstube aussehen.',
    href: '/projects/foersterstube.html',
    image: '/images/projects/case-foersterstube-1.webp',
  },
  {
    slug: 'koerners-gasthaus',
    title: 'Körners Gasthaus',
    category: 'marketing',
    tag: 'Marketing',
    year: '2024',
    summary:
      'Ein Script-Logo, ein warmes Rostrot und ein System, das von der Visitenkarte bis zur Website gleich klingt.',
    href: '/projects/koerners-gasthaus.html',
    image: '/images/projects/case-koerners-gasthaus-1.webp',
  },
  // Editorial 13–14
  {
    slug: 'jeunes-restaurateurs',
    title: 'Jeunes Restaurateurs',
    category: 'editorial',
    tag: 'Editorial',
    year: '2024',
    summary:
      'Ein Guide, der wie ein Nachschlagewerk wirkt, und ein Magazin, das Köch:innen als Menschen zeigt — beide in fünfstelliger Auflage.',
    href: '/projects/jeunes-restaurateurs.html',
    image: '/images/projects/case-jeunes-restaurateurs-15.webp',
  },
  {
    slug: 'formula-profifahrer',
    title: 'Formula Profifahrer',
    category: 'editorial',
    tag: 'Editorial',
    year: '2022–2024',
    summary:
      'Für jedes Rennen ein eigener Stil, gebunden an den Austragungsort — von Retro-Körnung bis Neon, als Serie trotzdem aus einem Guss.',
    href: '/projects/formula-profifahrer.html',
    image: '/images/projects/case-formula-profifahrer-1.webp',
  },
  // Digital 15–17
  {
    slug: 'pock-art',
    title: 'pock.art',
    category: 'digital',
    tag: 'Digital',
    year: '2023',
    summary:
      'Mein eigenes Sammelkartenspiel — über 120 Karten, komplette Mechanik, Branding und Verpackung, solo entwickelt.',
    href: '/projects/pock-art.html',
    image: '/images/projects/case-pock-art-1.webp',
  },
  {
    slug: 'padeldesk',
    title: 'PadelDesk',
    category: 'digital',
    tag: 'Digital',
    year: '2025',
    summary:
      'Eine Marke, die auf dem Court genauso funktioniert wie im Interface — ohne drei verschiedene Looks für App, Brand und Packaging.',
    href: '/projects/padeldesk.html',
    image: '/images/projects/case-padeldesk-1.webp',
  },
  {
    slug: 'colletro',
    title: 'Colletro',
    category: 'digital',
    tag: 'Digital',
    year: '2025–2026',
    summary:
      '"Your Collection Trove" — ein digitales Zuhause für Sammlungen, das sich nicht wie eine weitere Tabelle anfühlt.',
    href: '/projects/colletro.html',
    image: '/images/projects/case-colletro-1.webp',
  },
];

/** Life / hobby cards — grouped by category on the wheel */
export const LIFE_CARDS = [
  // Sport 0–1
  {
    slug: 'padel',
    title: 'Padel',
    category: 'sport',
    tag: 'Sport',
    summary: 'Smash, kurze Punkte, Flow — danach gerne ein Kölsch.',
    image: '/images/life/life-01.webp',
  },
  {
    slug: 'beachvolleyball',
    title: 'Beachvolleyball',
    category: 'sport',
    tag: 'Sport',
    summary: 'Sand unter den Füßen, Ball in der Luft.',
    image: '/images/life/life-02.webp',
  },
  // Play 2–3
  {
    slug: 'gaming',
    title: 'Gaming',
    category: 'play',
    tag: 'Play',
    summary: 'Kurze Runden, lange Abende, gerne kompetitiv.',
    image: '/images/life/life-03.webp',
  },
  {
    slug: 'kartenspiele',
    title: 'Kartenspiele',
    category: 'play',
    tag: 'Play',
    summary: 'Manche zum Spielen, manche zum Anschauen.',
    image: '/images/life/life-09.webp',
  },
  // Kultur 4–6
  {
    slug: 'film',
    title: 'Film',
    category: 'kultur',
    tag: 'Kultur',
    summary: 'Leinwand, Serien, Abende ohne Briefing.',
    image: '/images/life/life-05.webp',
  },
  {
    slug: 'kunst',
    title: 'Kunst',
    category: 'kultur',
    tag: 'Kultur',
    summary: 'Schauen, sammeln, reden — ohne Pitch.',
    image: '/images/life/life-07.webp',
  },
  {
    slug: 'gedichte',
    title: 'Gedichte',
    category: 'kultur',
    tag: 'Kultur',
    summary: 'Schreiben, wenn’s passt — ohne Deadline.',
    image: '/images/life/life-06.webp',
  },
  // Sammlung 7
  {
    slug: 'donald-duck',
    title: 'Donald Duck',
    category: 'sammlung',
    tag: 'Sammlung',
    summary: 'Gelb, schnabelig, ernsthafte Sammlung.',
    image: '/images/life/life-08.webp',
  },
  // Unterwegs 8–9
  {
    slug: 'koelsch',
    title: 'Kölsch',
    category: 'unterwegs',
    tag: 'Unterwegs',
    summary: 'Selbstverständlich. Stange für Stange.',
    image: '/images/life/life-04.webp',
  },
  {
    slug: 'europa',
    title: 'Europa bis 30',
    category: 'unterwegs',
    tag: 'Unterwegs',
    summary: 'Jedes Land einmal — Freizeitparks zählen mit.',
    image: '/images/life/life-10.webp',
  },
];

/** Skills from Lebenslauf — used in marquee + CV */
export const SKILLS = [
  'Markenstrategie',
  'Positionierung',
  'Kampagnenentwicklung',
  'Branding',
  'Corporate Design',
  'Art Direction',
  'Storytelling',
  'Crossmediale Kampagnen',
  'Stakeholder-Management',
  'Teamführung',
  'Budgetverantwortung',
  'Brand Consulting',
  'CI-Systeme',
  'Broadcast & Social',
  'Adobe CC',
  'KI-Tools',
];

export const LIFE_SKILLS = [
  'Court Sense',
  'Fair Play',
  'Sammlerblick',
  'Storytelling',
  'Reiseplanung',
  'Deck-Building',
  'Kino-Nächte',
  'Kölsch-Diplomatie',
  'Match-Tempo',
  'Europa-Karte',
];

export const PROJECT_TEXTURES = PROJECTS.map((p) => `${p.image}?v=75`);
export const LIFE_TEXTURES = LIFE_CARDS.map((p) => `${p.image}?v=8`);

export function getCarouselItems(mode = 'pro') {
  return mode === 'private' ? LIFE_CARDS : PROJECTS;
}

export function getCarouselTextures(mode = 'pro') {
  return mode === 'private' ? LIFE_TEXTURES : PROJECT_TEXTURES;
}

/** First carousel index for a category chip (Pro / Life bar under hero). */
export function getCategoryJumpIndex(categoryId, mode = 'pro') {
  const id = String(categoryId || '').trim();
  if (!id) return -1;
  const list = getCarouselItems(mode);
  return list.findIndex((item) => item.category === id);
}

export function getProjectByIndex(index, mode = 'pro') {
  const list = getCarouselItems(mode);
  const i = ((index % list.length) + list.length) % list.length;
  return list[i];
}
