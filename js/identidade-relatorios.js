(() => {
  const cache = 'sstVision.identidadeRelatorios';
  const config = window.SUPABASE_CONFIG;
  function imagem(valor) {
    const bruto = String(valor || '').trim().replace(
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/,
      'https://raw.githubusercontent.com/$1/$2/$3'
    );
    try {
      const url = new URL(bruto);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  async function carregar() {
    try {
      const resposta = await fetch(config.url.replace(/\/$/, '') +
        '/rest/v1/empresa_configuracao?emissora_ativa=eq.true&select=*&limit=1', {
        headers: {apikey: config.anonKey, Authorization: 'Bearer ' + config.anonKey},
        signal: AbortSignal.timeout(5000)
      });
      if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
      const [identidade = {}] = await resposta.json();
      try { localStorage.setItem(cache, JSON.stringify(identidade)); } catch {}
      return identidade;
    } catch {
      try { return JSON.parse(localStorage.getItem(cache)) || {}; } catch { return {}; }
    }
  }

  function marcas(identidade) {
    const posicao = identidade.marca_dagua_posicao || 'laterais';
    return {
      cabecalho: imagem(identidade.cabecalho_url),
      rodape: imagem(identidade.rodape_url),
      marca: imagem(identidade.marca_dagua_url),
      opacidade: Math.min(.3, Math.max(.05, Number(identidade.marca_dagua_opacidade) || .12)),
      posicoes: ({laterais: [5, 95], esquerda: [5], direita: [95], centro: [50]})[posicao] || [50]
    };
  }

  function inserir(doc, identidade, {previa, rodapePadrao} = {}) {
    const m = marcas(identidade);
    doc.querySelectorAll('[data-identidade-relatorio]').forEach(el => el.remove());
    if (!(m.cabecalho || m.rodape || m.marca || rodapePadrao)) return [];
    const estilo = doc.createElement('style');
    estilo.dataset.identidadeRelatorio = '';
    // A caixa de margem pertence à folha, independentemente da altura do conteúdo.
    const cssString = valor => JSON.stringify(String(valor).replace(/[\r\n\f]/g, ' '));
    const rodapePaginado = m.rodape || rodapePadrao ? `
      @bottom-center {
        content:${cssString(m.rodape ? '' : rodapePadrao)};
        width:182mm; height:17mm; vertical-align:middle;
        font:9pt Arial; color:#475569;
        print-color-adjust:exact; -webkit-print-color-adjust:exact;
        ${m.rodape ? `background:url(${cssString(m.rodape)}) center / contain no-repeat;` : ''}
      }` : '';
    estilo.textContent = `
      .sst-timbre-impressao { display:none }
      .sst-timbre-previa { display:block; width:100%; max-height:17mm; object-fit:contain }
      .sst-marca-previa { position:absolute; top:50%; max-width:42%; max-height:110mm;
        transform:translate(-50%, -50%); pointer-events:none; z-index:0 }
      @media print {
        @page { margin:${m.cabecalho ? 24 : 14}mm 14mm ${m.rodape || rodapePadrao ? 23 : 14}mm; ${rodapePaginado} }
        .sst-timbre-previa,.sst-marca-previa { display:none!important }
        .sst-timbre-impressao { display:block; position:fixed; pointer-events:none }
        .sst-timbre-topo { left:0; width:100%; height:17mm;
          object-fit:contain; z-index:101 }
        .sst-timbre-topo { top:-21mm }
        .sst-timbre-marca { top:50%; max-width:42%; max-height:110mm;
          transform:translate(-50%, -50%); z-index:100 }
      }`;
    doc.head.append(estilo);
    const imagens = [];
    function adicionar(pai, classe, url, texto) {
      const elemento = doc.createElement(url ? 'img' : 'div');
      elemento.className = classe;
      elemento.dataset.identidadeRelatorio = '';
      if (url) {
        elemento.alt = '';
        elemento.src = url;
        imagens.push(elemento);
      } else {
        elemento.textContent = texto;
      }
      pai.prepend(elemento);
      return elemento;
    }
    if (m.cabecalho) adicionar(doc.body, 'sst-timbre-impressao sst-timbre-topo', m.cabecalho);
    if (previa && m.cabecalho) adicionar(previa, 'sst-timbre-previa', m.cabecalho);
    if (previa && m.rodape && !rodapePadrao) {
      const rodape = adicionar(previa, 'sst-timbre-previa', m.rodape);
      previa.append(rodape);
    }
    if (m.marca) {
      for (const posicao of m.posicoes) {
        const esquerda = posicao === 5 ? 21 : posicao === 95 ? 79 : 50;
        for (const [pai, classe] of [[doc.body, 'sst-timbre-impressao sst-timbre-marca'], [previa, 'sst-marca-previa']]) {
          if (!pai) continue;
          const marca = adicionar(pai, classe, m.marca);
          marca.style.left = esquerda + '%';
          marca.style.opacity = m.opacidade;
        }
      }
    }
    return imagens;
  }

  async function imprimir(janela = window) {
    const identidade = await carregar();
    const imagens = inserir(janela.document, identidade);
    await Promise.race([
      Promise.allSettled(imagens.map(img => img.decode())),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
    try { janela.print(); } finally {
      janela.document.querySelectorAll('[data-identidade-relatorio]').forEach(el => el.remove());
    }
  }

  window.IdentidadeRelatorios = {carregar, inserir, imprimir, marcas};
})();
