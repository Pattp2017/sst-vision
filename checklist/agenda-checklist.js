(() => {
  const visitasChave = 'sstVision.visitas.v1';
  const prefixo = 'sstVision.visitaChecklist.v1.';

  function ler(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave) || 'null') ?? padrao; }
    catch { return padrao; }
  }

  function visita(id) {
    const lista = ler(visitasChave, []);
    return id && Array.isArray(lista) ? lista.find(v => v.id === id) || null : null;
  }

  const vinculo = id => id ? ler(prefixo + id, null) : null;
  const visitaDaPagina = () => visita(new URLSearchParams(location.search).get('visita'));
  const destino = (registro, raiz = './') => {
    const id = encodeURIComponent(registro.id);
    return registro.status === 'FINALIZADA'
      ? raiz + 'relatorio-visita.html?vistoria_id=' + id
      : raiz + 'checklist/vistoria.html?vistoria_id=' + id;
  };

  function gravarVinculo(visitaId, vistoria) {
    const visitaAgenda = visita(visitaId);
    if (!visitaAgenda) throw Error('A visita não está disponível neste navegador.');
    if (!vistoria?.id) throw Error('Não foi possível identificar o checklist.');
    const anterior = vinculo(visitaId);
    if (anterior && anterior.id !== vistoria.id) throw Error('Esta visita já tem um checklist vinculado.');
    if (Object.keys(localStorage).some(chave => chave.startsWith(prefixo) &&
        chave !== prefixo + visitaId && ler(chave, null)?.id === vistoria.id)) {
      throw Error('Este checklist já está vinculado a outra visita.');
    }
    localStorage.setItem(prefixo + visitaId, JSON.stringify({
      id: vistoria.id, status: vistoria.status, local: anterior?.local ?? visitaAgenda.local ?? ''
    }));
  }

  async function vincular(visitaId, vistoria) {
    if (navigator.locks?.request) {
      return navigator.locks.request('sstVision.agendaChecklist', () => gravarVinculo(visitaId, vistoria));
    }
    return gravarVinculo(visitaId, vistoria);
  }

  function localDaVistoria(id) {
    for (const chave of Object.keys(localStorage)) {
      if (!chave.startsWith(prefixo)) continue;
      const registro = ler(chave, null);
      if (registro?.id === id) return registro.local || '';
    }
    return '';
  }

  function atualizarLista(vistorias) {
    const estados = new Map(vistorias.map(v => [v.id, v.status]));
    try {
      for (const chave of Object.keys(localStorage)) {
        if (!chave.startsWith(prefixo)) continue;
        const registro = ler(chave, null);
        if (!registro || !estados.has(registro.id)) continue;
        const status = estados.get(registro.id);
        if (!status) localStorage.removeItem(chave);
        else if (status !== registro.status) localStorage.setItem(chave, JSON.stringify({...registro, status}));
      }
    } catch (erro) { console.warn('Não foi possível atualizar o vínculo com a Agenda.', erro); }
  }

  const atualizar = (id, status) => atualizarLista([{id, status}]);

  window.AgendaChecklist = {visitaDaPagina, vinculo, destino, vincular, localDaVistoria, atualizar, atualizarLista};
})();
