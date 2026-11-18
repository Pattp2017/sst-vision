const Extintores = (() => {
  const url = 'https://uofnninqxnsvaemxpwhh.supabase.co';
  const key = 'sb_publishable_kCX0kt1EFYYL0sR3zQHDzg_6rLVRJQ8';
  const tabela = '/rest/v1/checklist_extintores_rondas';
  let db;

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

  function separarRonda(ronda) {
    let nova;
    return operar('readwrite', store => {
      const pedido = store.get(ronda.id);
      pedido.onsuccess = () => {
        const atual = pedido.result;
        if (!atual?.pendente || atual.dados.revisao !== ronda.dados.revisao) return;
        const id = crypto.randomUUID();
        nova = {id, pendente: true, dados: {
          ...atual.dados, ronda_id: id, revisao: crypto.randomUUID()
        }};
        store.put(nova);
        store.delete(ronda.id);
      };
      return pedido;
    }).then(() => nova);
  }

  async function requisitar(path, options = {}) {
    const response = await fetch(url + path, {
      ...options,
      signal: AbortSignal.timeout(25000),
      headers: {apikey: key, 'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key, ...options.headers}
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw Object.assign(Error(result?.message || result?.msg || result?.error_description || 'HTTP ' + response.status), {status: response.status});
    }
    return result;
  }

  function api(path, options) {
    return requisitar(tabela + path, options);
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
    const base = ronda.base;
    if (base) {
      rows = await api(filtro + '&atualizado_em=eq.' + encodeURIComponent(base) + '&select=atualizado_em', {
        method: 'PATCH', headers: {Prefer: 'return=representation'}, body: JSON.stringify(payload)
      });
    } else {
      rows = await api('?on_conflict=id&select=atualizado_em', {
        method: 'POST', headers: {Prefer: 'resolution=ignore-duplicates,return=representation'},
        body: JSON.stringify({...payload, id})
      });
    }
    if (rows.length) return rows[0].atualizado_em;
    const atual = await baixar(id);
    if (atual?.dados.revisao === dados.revisao) return atual.base;
    if (!atual) throw Error('A ronda não foi encontrada no banco. A cópia local continua guardada.');
    throw Object.assign(Error('Há uma versão diferente no banco. Sua edição continua guardada neste aparelho.'), {
      conflito: true, dataRemota: atual.dados.data_inspecao
    });
  }

  return {obter, gravar, locais, migrar, confirmar, separarRonda, dataLocal, possuiDados, listar, baixar, enviar};
})();
