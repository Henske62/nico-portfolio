const COMING_SOON_MARKUP = `
<section class="life-coming-soon section" data-life-coming-soon aria-labelledby="life-coming-soon-title">
  <div class="container life-coming-soon__inner">
    <p class="life-coming-soon__eyebrow">Life Mode</p>
    <h1 class="life-coming-soon__title" id="life-coming-soon-title">Coming Soon</h1>
    <p class="life-coming-soon__text">
      Der private Teil ist noch im Warm-up — irgendwo zwischen Padel-Match, Comic-Stapel
      und dem dritten Kölsch. Bis es ready ist: erstmal wieder Work.
    </p>
    <p class="life-coming-soon__hint">Oben rechts umschalten. Easy.</p>
  </div>
</section>
`.trim();

function getMain(scope) {
  if (scope?.matches?.('[data-barba="container"], #main')) return scope;
  return (
    scope?.querySelector?.('[data-barba="container"]') ||
    scope?.querySelector?.('#main') ||
    document.querySelector('[data-barba="container"]') ||
    document.querySelector('#main')
  );
}

export function initLifeComingSoon(scope = document) {
  const main = getMain(scope);
  if (!main || main.querySelector('[data-life-coming-soon]')) return;

  main.insertAdjacentHTML('afterbegin', COMING_SOON_MARKUP);
}
