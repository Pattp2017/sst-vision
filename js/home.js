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
  const links = [...document.querySelectorAll('.nav-link')];
  const markSection = () => {
    const current = location.hash || '#inicio';
    for (const link of links) {
      const active = link.getAttribute('href') === current;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  window.addEventListener('hashchange', markSection);
  markSection();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
  }
})();
