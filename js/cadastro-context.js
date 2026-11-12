(() => {
  const params = new URLSearchParams(location.search);
  const embedded = params.get('central') === '1' && window.parent !== window;
  const area = location.pathname.includes('/treinamento/') ? 'treinamentos' : location.pathname.includes('/epis/') ? 'epis' : 'checklist';
  const central = new URL('../cadastros/index.html', location.href);
  central.searchParams.set('grupo', area);
  const goCentral = cadastro => {
    const url = new URL(central);
    if (cadastro) url.searchParams.set('cadastro', cadastro);
    (embedded ? window.top : window).location.assign(url.href);
  };
  if (embedded) {
    document.querySelectorAll('a[href="../index.html"]').forEach(link => link.target = '_top');
    const style = document.createElement('style');
    style.textContent = area === 'treinamentos'
      ? '.sidebar,.topbar{display:none!important}.main{margin:0!important}.conteudo{padding:16px!important;max-width:none!important}body{background:#fff}'
      : area === 'epis'
        ? '.sidebar{display:none!important}.main{margin:0!important;padding:18px!important;width:100%!important}.app:not(.auth-hidden){display:block!important}body{background:#fff}'
        : '.topo{display:none!important}.container{max-width:none!important;margin:0!important;padding:18px!important}body{background:#fff}';
    document.head.append(style);
    if (area === 'treinamentos') {
      window.renderCadastrosGithub = () => goCentral();
      const routes = {
        empresas: () => window.renderEmpresasGithub(),
        pessoas: () => window.renderPessoasGithub(),
        instrutores: () => window.renderPessoasGithub(),
        cursos: () => window.renderTreinamentosGithub(),
        feriados: async () => {
          document.getElementById('conteudoPrincipal').innerHTML = '<div class="card"><h2>Feriados</h2><p>Cadastre as datas consideradas na agenda de treinamentos.</p></div>';
          await window.FeriadosTreinamento.abrirCadastro();
        },
        configuracoes: () => window.renderConfiguracoesGithub()
      };
      Promise.resolve().then(() => (routes[params.get('cadastro')] || routes.pessoas)()).catch(error => {
        const box = document.getElementById('conteudoPrincipal');
        box.replaceChildren();
        const message = document.createElement('p');
        message.textContent = 'Não foi possível abrir o cadastro: ' + error.message;
        box.append(message);
      });
    }
  }
  // Module entries open the central catalog; existing forms retain their
  // validation, permissions and persistence within the central workspace.
  if (area === 'treinamentos') {
    document.addEventListener('click', event => {
      const item = event.target.closest('[data-modulo="Cadastros"],[data-modulo="Configuracoes"]');
      if (!item) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      goCentral(item.dataset.modulo === 'Configuracoes' ? 'configuracoes' : null);
    }, true);
  }
  if (area === 'checklist') {
    for (const [id, cadastro] of [['btn-cadastro-locais', 'locais'], ['btn-cadastro-itens', 'itens-checklist']]) {
      const button = document.getElementById(id);
      if (button) button.onclick = () => goCentral(cadastro);
    }
    const back = document.getElementById('voltar');
    if (back) back.onclick = () => goCentral();
  }
})();
