(() => {
  if (window.self !== window.top) return;

  const root = new URL('../', document.currentScript.src);
  const url = path => new URL(path, root).href;
  const current = location.pathname.slice(root.pathname.length);
  const home = current === '' || current === 'index.html';
  const cadastro = current.startsWith('cadastros/');
  const group = new URLSearchParams(location.search).get('grupo') || 'todos';
  const modules = [
    ['Visitas SST', 'visitas.html', /^(visitas|minha-jornada|relatorio-visita)\.html$/],
    ['Análise de risco', 'analises.html', /^anali[sz]/],
    ['Treinamentos', 'treinamento/index.html', /^treinamento\//],
    ['EPIs', 'epis/index.html', /^epis\/(?!mapa-risco)/],
    ['Checklist', 'checklist/index.html', /^checklist\/(?!mapa-risco)/],
    ['Mapa de Risco', 'mapa-risco/index.html', /^(mapa-risco\/|(checklist|epis)\/mapa-risco)/]
  ];
  const groups = [
    ['Todos os cadastros', 'todos'],
    ['Compartilhados', 'compartilhados'],
    ['Treinamentos', 'treinamentos'],
    ['EPIs', 'epis'],
    ['Checklist', 'checklist'],
    ['Configurações gerais', 'configuracoes']
  ];
  const icons = ['<svg class="icon " viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg>', '<svg class="icon " viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>', '<svg class="icon " viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><rect x="8" y="3" width="8" height="4" rx="1"/><path d="m8 12 1 1 2-2m3 1h3m-9 5h2m4 0h3"/></svg>', '<svg class="icon " viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/></svg>', '<svg class="icon " viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M9 21v-4h6v4M8 7h1m6 0h1M8 12h1m6 0h1"/></svg>'];
  const link = (label, path, active, icon = '') =>
    `<a href="${url(path)}"${active ? ' aria-current="page"' : ''}>${icon}${label}</a>`;
  const branch = (id, label, icon, open) =>
    `<button type="button" aria-controls="${id}" aria-expanded="${open}">${icon}${label}<span class="chevron" aria-hidden="true"></span></button>`;
  const panel = document.createElement('sst-navigation');
  const shadow = panel.attachShadow({mode: 'open'});
  shadow.innerHTML = `
    <link rel="stylesheet" href="${url('css/navigation.css')}">
    <div class="heading">
      <a class="brand" href="${url('index.html')}">
        <span class="brand-mark">${icons[0]}</span>
        <span>SST <b>VISION</b><small>Gestão de segurança do trabalho</small></span>
      </a>
      <button type="button" class="mobile" aria-expanded="false" aria-controls="navigation">Menu</button>
    </div>
    <nav id="navigation" aria-label="Navegação principal">
      <div class="label">ESPAÇO DE TRABALHO</div>
      ${link('Visão geral', 'index.html#inicio', home && (!location.hash || location.hash === '#inicio'), icons[1])}
      ${branch('modules', 'Módulos', icons[2], !home && !cadastro)}
      <div class="tree" id="modules" ${home || cadastro ? 'hidden' : ''}>
        ${modules.map(([name, path, matches]) => link(name, path, matches.test(current))).join('')}
      </div>
      ${link('Ações rápidas', 'index.html#acoes', home && location.hash === '#acoes', icons[3])}
      ${branch('registers', 'Cadastros', icons[4], cadastro)}
      <div class="tree" id="registers" ${cadastro ? '' : 'hidden'}>
        ${groups.map(([name, id]) => link(name, 'cadastros/index.html?grupo=' + id, cadastro && group === id)).join('')}
      </div>
    </nav>`;

  const branches = [...shadow.querySelectorAll('nav button')];
  for (const button of branches) {
    button.addEventListener('click', () => {
      const expand = button.getAttribute('aria-expanded') === 'false';
      for (const item of branches) {
        const open = expand && item === button;
        item.setAttribute('aria-expanded', String(open));
        shadow.getElementById(item.getAttribute('aria-controls')).hidden = !open;
      }
    });
  }

  const mobile = shadow.querySelector('.mobile');
  const nav = shadow.getElementById('navigation');
  const showMenu = open => {
    mobile.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('mobile-open', open);
  };
  mobile.addEventListener('click', () => showMenu(mobile.getAttribute('aria-expanded') === 'false'));
  shadow.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile.getAttribute('aria-expanded') === 'true') {
      showMenu(false);
      mobile.focus();
    }
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) showMenu(false);
  });
  if (home) {
    window.addEventListener('hashchange', () => {
      for (const anchor of nav.querySelectorAll('a[href*="index.html#"]')) {
        const active = new URL(anchor.href).hash === (location.hash || '#inicio');
        if (active) anchor.setAttribute('aria-current', 'page');
        else anchor.removeAttribute('aria-current');
      }
    });
  }

  document.body.classList.add('sst-navigation-page');
  document.body.prepend(panel);
})();
