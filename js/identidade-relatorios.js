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

  const rodapes = new Map();

  function prepararRodape(url) {
    if (!url) return Promise.resolve('');
    if (rodapes.has(url)) return rodapes.get(url);
    const preparo = (async () => {
      try {
        const resposta = await fetch(url, {signal: AbortSignal.timeout(4000)});
        if (!resposta.ok) return '';
        const bitmap = await createImageBitmap(await resposta.blob());
        try {
          // O tamanho intrínseco é usado pelo conteúdo da caixa de margem.
          const fator = Math.min(182 * 96 / 25.4 / bitmap.width, 17 * 96 / 25.4 / bitmap.height);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(bitmap.width * fator));
          canvas.height = Math.max(1, Math.floor(bitmap.height * fator));
          canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/png');
        } finally {
          bitmap.close();
        }
      } catch {
        return '';
      }
    })();
    rodapes.set(url, preparo);
    preparo.then(resultado => { if (!resultado) rodapes.delete(url); });
    return preparo;
  }

  function inserir(doc, identidade, {previa, rodapePadrao} = {}) {
    const m = marcas(identidade);
    doc.querySelectorAll('[data-identidade-relatorio]').forEach(el => el.remove());
    if (!(m.cabecalho || m.rodape || m.marca || rodapePadrao)) return {imagens:[], preparo:Promise.resolve()};
    const estilo = doc.createElement('style');
    estilo.dataset.identidadeRelatorio = '';
    // A caixa de margem pertence à folha, independentemente da altura do conteúdo.
    const cssString = valor => JSON.stringify(String(valor).replace(/[\r\n\f]/g, ' '));
    const rodapePaginado = imagemImpressao => m.rodape || rodapePadrao ? `
      @bottom-center {
        content:${imagemImpressao ? `url(${cssString(imagemImpressao)})` : cssString(m.rodape ? '' : rodapePadrao)};
        width:182mm; height:17mm; vertical-align:middle;
        font:9pt Arial; color:#475569;
        print-color-adjust:exact; -webkit-print-color-adjust:exact;
        ${m.rodape && !imagemImpressao ? `background:url(${cssString(m.rodape)}) center / contain no-repeat;` : ''}
      }` : '';
    const css = imagemImpressao => `
      .sst-timbre-impressao { display:none }
      .sst-timbre-previa { display:block; width:100%; max-height:17mm; object-fit:contain }
      .sst-marca-previa { position:absolute; top:50%; max-width:42%; max-height:110mm;
        transform:translate(-50%, -50%); pointer-events:none; z-index:0 }
      @media print {
        @page { margin:${m.cabecalho ? 24 : 14}mm 14mm ${m.rodape || rodapePadrao ? 23 : 14}mm; ${rodapePaginado(imagemImpressao)} }
        .sst-timbre-previa,.sst-marca-previa { display:none!important }
        .sst-timbre-impressao { display:block; position:fixed; pointer-events:none }
        .sst-timbre-topo { left:0; width:100%; height:17mm;
          object-fit:contain; z-index:101 }
        .sst-timbre-topo { top:-21mm }
        .sst-timbre-marca { top:50%; max-width:42%; max-height:110mm;
          transform:translate(-50%, -50%); z-index:100 }
      }`;
    estilo.textContent = css('');
    doc.head.append(estilo);
    const preparo = prepararRodape(m.rodape).then(async dados => {
      if (!dados || !estilo.isConnected) return;
      const preCarga = new Image();
      preCarga.src = dados;
      await preCarga.decode().catch(() => {});
      estilo.textContent = css(dados);
    });
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
    return {imagens, preparo};
  }

  async function imprimir(janela = window) {
    const identidade = await carregar();
    const {imagens, preparo} = inserir(janela.document, identidade);
    await Promise.race([
      Promise.allSettled([...imagens.map(img => img.decode()), preparo]),
      new Promise(resolve => setTimeout(resolve, 4500))
    ]);
    try { janela.print(); } finally {
      janela.document.querySelectorAll('[data-identidade-relatorio]').forEach(el => el.remove());
    }
  }

  window.IdentidadeRelatorios = {carregar, inserir, imprimir, marcas};
})();
