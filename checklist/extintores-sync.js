const Extintores = (() => {
  const url = 'https://uofnninqxnsvaemxpwhh.supabase.co';
  const key = 'sb_publishable_kCX0kt1EFYYL0sR3zQHDzg_6rLVRJQ8';
  const tabela = '/rest/v1/checklist_extintores_rondas';
  const chaveSessao = 'sst_extintores_sessao_v2';
  let db;
  let sessao;

  function ler(chave) {
    try { return JSON.parse(localStorage.getItem(chave)); } catch { return null; }
  }

  function operar(modo, callback) {
    db ??= new Promise((resolve, reject) => {
      const pedido = indexedDB.open('sst-vision-extintores', 1);
      pedido.onupgradeneeded = () => pedido.result.createObjectStore('rondas', {keyPath: 'id'});
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => reject(pedido.error);
    });
    return db.then(banco => new Promise((resolve, reject) => {
      const tx = banco.transaction('rondas', modo);
      const pedido = callback(tx.objectStore('rondas'));
      tx.oncomplete = () => resolve(pedido.result);
      tx.onabort = () => reject(tx.error || Error('Gravação local interrompida.'));
    }));
  }

  const obter = id => operar('readonly', store => store.get(id));
  const gravar = ronda => operar('readwrite', store => store.put(ronda));
  const locais = async () => (await operar('readonly', store => store.getAll())).filter(r => r.dados && r.id !== 'atual');
  const dataLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const possuiDados = d => Boolean(d?.empresa || d?.extintores?.length || d?.responsavel || d?.mapa_imagem || d?.proxima_visita);

  async function migrar() {
    if (await obter('migrado-v2')) return;
    const backup = (await obter('atual'))?.dados;
    const legado = ler('checklist_extintores_ronda_v1');
    const fontes = [legado, backup].filter(d => Array.isArray(d?.extintores) && possuiDados(d));
    fontes.sort((a, b) => (b.atualizado_em || '').localeCompare(a.atualizado_em || ''));
    const [principal, secundario] = fontes;
    const idExtintores = new Set(principal?.extintores.map(e => e.id).filter(Boolean));
    const mesmaRonda = principal && secundario && (
      (principal.ronda_id && principal.ronda_id === secundario.ronda_id) ||
      secundario.extintores.some(e => e.id && idExtintores.has(e.id)) ||
      ((!principal.extintores.length || !secundario.extintores.length) &&
        principal.empresa === secundario.empresa)
    );
    const importar = mesmaRonda ? [principal] : fontes;
    await operar('readwrite', store => {
      const marcador = store.get('migrado-v2');
      marcador.onsuccess = () => {
        if (marcador.result) return;
        for (const dados of importar) {
          const id = dados.ronda_id || crypto.randomUUID();
          const existente = store.get(id);
          existente.onsuccess = () => {
            if (!existente.result) store.put({id, pendente: true, legado: dados.ronda_id ? (dados.atualizado_em || 'sem-data') : null, dados: {
              ...dados, ronda_id: id, status: dados.status || 'andamento',
              data_inspecao: dados.data_inspecao || dados.atualizado_em?.slice(0, 10) || dataLocal(),
              atualizado_em: dados.atualizado_em || new Date().toISOString(), revisao: crypto.randomUUID()
            }});
          };
        }
        store.put({id: 'migrado-v2'});
      };
      return marcador;
    });
  }

  function confirmar(enviada, base) {
    return operar('readwrite', store => {
      const pedido = store.get(enviada.id);
      pedido.onsuccess = () => {
        const atual = pedido.result;
        if (atual && atual.base === enviada.base) {
          const editada = atual.dados.revisao !== enviada.dados.revisao;
          store.put({...atual, base, pendente: editada, dados: editada ? atual.dados : enviada.dados});
        }
      };
      return pedido;
    });
  }

  async function requisitar(path, options = {}, token) {
    const response = await fetch(url + path, {
      ...options,
      signal: AbortSignal.timeout(25000),
      headers: {apikey: key, 'Content-Type': 'application/json',
        ...(token ? {Authorization: 'Bearer ' + token} : {}), ...options.headers}
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw Object.assign(Error(result?.message || result?.msg || result?.error_description || 'HTTP ' + response.status), {status: response.status});
    }
    return result;
  }

  function guardarSessao(nova) {
    sessao = nova;
    if (nova) localStorage.setItem(chaveSessao, JSON.stringify(nova));
    else localStorage.removeItem(chaveSessao);
    return sessao;
  }

  async function entrar(email, password) {
    const nova = await requisitar('/auth/v1/token?grant_type=password', {method: 'POST', body: JSON.stringify({email, password})});
    return guardarSessao(nova);
  }

  async function autenticar() {
    sessao ??= ler(chaveSessao);
    if (!sessao?.refresh_token) return null;
    if (sessao.expires_at * 1000 > Date.now() + 60000) return sessao;
    try {
      return guardarSessao(await requisitar('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: JSON.stringify({refresh_token: sessao.refresh_token})
      }));
    } catch (erro) {
      if (erro.status === 400 || erro.status === 401) return guardarSessao(null);
      throw erro;
    }
  }

  function api(path, options) {
    return requisitar(tabela + path, options, sessao.access_token);
  }

  async function listar() {
    const resultado = [];
    const tamanho = 100;
    for (let offset = 0; ; offset += tamanho) {
      const pagina = await api('?select=id,empresa_nome,data_inspecao,atualizado_em,status:dados->>status,responsavel:dados->>responsavel&order=atualizado_em.desc,id.asc&limit=' + tamanho + '&offset=' + offset);
      resultado.push(...pagina);
      if (pagina.length < tamanho) return resultado;
    }
  }

  async function baixar(id) {
    const [r] = await api('?id=eq.' + encodeURIComponent(id) + '&select=id,dados,data_inspecao,atualizado_em');
    if (!r) return null;
    return {id, base: r.atualizado_em, pendente: false, dados: {
      ...r.dados, ronda_id: id, status: r.dados.status || 'andamento',
      data_inspecao: r.dados.data_inspecao || r.data_inspecao.slice(0, 10), atualizado_em: r.atualizado_em
    }};
  }

  async function enviar(ronda) {
    const {id, dados} = ronda;
    const payload = {
      empresa_id: dados.empresa_id, empresa_nome: dados.empresa,
      data_inspecao: dados.data_inspecao, dados, atualizado_em: dados.atualizado_em
    };
    const filtro = '?id=eq.' + encodeURIComponent(id);
    let rows;
    let base = ronda.base;
    if (!base && ronda.legado) {
      const anterior = await baixar(id);
      if (anterior && Date.parse(anterior.base) <= Date.parse(ronda.legado)) base = anterior.base;
    }
    if (base) {
      rows = await api(filtro + '&atualizado_em=eq.' + encodeURIComponent(base) + '&select=atualizado_em', {
        method: 'PATCH', headers: {Prefer: 'return=representation'}, body: JSON.stringify(payload)
      });
    } else {
      rows = await api('?on_conflict=id&select=atualizado_em', {
        method: 'POST', headers: {Prefer: 'resolution=ignore-duplicates,return=representation'},
        body: JSON.stringify({...payload, id, usuario_id: sessao.user.id})
      });
    }
    if (rows.length) return rows[0].atualizado_em;
    const atual = await baixar(id);
    if (atual?.dados.revisao === dados.revisao) return atual.base;
    throw Error('A ronda foi alterada em outro aparelho. Sua edição continua guardada neste aparelho.');
  }

  return {obter, gravar, locais, migrar, confirmar, dataLocal, possuiDados, entrar, autenticar, listar, baixar, enviar};
})();
