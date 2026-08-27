function getHourInZone(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
    }).formatToParts(new Date());

    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const isWeekend = weekday === 'Sat' || weekday === 'Sun';
    return { hour: hour === 24 ? 0 : hour, isWeekend };
  } catch {
    return { hour: new Date().getHours(), isWeekend: [0, 6].includes(new Date().getDay()) };
  }
}

export function initLocations(scope = document) {
  const cards = scope.querySelectorAll('[data-location]');
  if (!cards.length) return () => {};

  const update = () => {
    cards.forEach((card) => {
      const tz = card.dataset.timezone || 'UTC';
      const open = Number(card.dataset.open ?? 9);
      const close = Number(card.dataset.close ?? 17);
      const { hour, isWeekend } = getHourInZone(tz);
      const isOpen = !isWeekend && hour >= open && hour < close;

      const dot = card.querySelector('[data-open-dot]');
      const label = card.querySelector('[data-open-label]');
      dot?.classList.toggle('is-open', isOpen);
      dot?.classList.toggle('is-closed', !isOpen);
      if (label) label.textContent = isOpen ? 'Geöffnet' : 'Geschlossen';
    });
  };

  update();
  const id = window.setInterval(update, 60_000);
  return () => window.clearInterval(id);
}
