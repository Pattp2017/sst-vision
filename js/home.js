(() => {
  const search = document.getElementById('module-search');
  const cards = [...document.querySelectorAll('[data-module]')];
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  search.addEventListener('input', () => {
    const query = normalize(search.value);
    let total = 0;
    for (const card of cards) {
      card.hidden = !normalize(card.dataset.module).includes(query);
      if (!card.hidden) total++;
    }
    document.getElementById('search-empty').hidden = total > 0;
    document.getElementById('search-status').textContent = `${total} módulo${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}.`;
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
  }
})();
