/* SST Vision - camada de evidências multimodais
 * Primeira fase: fotografia. Estrutura preparada para vídeo, áudio,
 * medição, documento e registro manual sem alterar o fluxo atual.
 */
(function () {
  const TIPOS_EVIDENCIA = Object.freeze([
    'foto',
    'video',
    'audio',
    'medicao',
    'documento',
    'manual'
  ]);

  function gerarId(prefixo) {
    if (window.crypto && crypto.randomUUID) return `${prefixo}-${crypto.randomUUID()}`;
    return `${prefixo}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function criarEvidencia({ tipo = 'foto', origem = 'campo', arquivo = null, metadados = {} } = {}) {
    if (!TIPOS_EVIDENCIA.includes(tipo)) {
      throw new Error(`Tipo de evidência não suportado: ${tipo}`);
    }

    return {
      id: gerarId('evid'),
      tipo,
      origem,
      criadoEm: new Date().toISOString(),
      arquivo,
      metadados: { ...metadados },
      status: 'coletada'
    };
  }

  function criarAchado({ evidenciaId, titulo = '', perigo = '', circunstancia = '', eventoPerigoso = '', consequencia = '', expostos = '', controlesExistentes = '', classificacao = '', recomendacao = '', stop = '', observacao = '', dadosVisuais = {} } = {}) {
    return {
      id: gerarId('achado'),
      evidenciaId: evidenciaId || null,
      titulo,
      perigo,
      circunstancia,
      eventoPerigoso,
      consequencia,
      expostos,
      controlesExistentes,
      classificacao,
      recomendacao,
      stop,
      observacao,
      dadosVisuais: { ...dadosVisuais },
      validacao: {
        status: 'pendente',
        validadoEm: null,
        responsavel: null
      }
    };
  }

  window.SSTVisionEvidencias = Object.freeze({
    TIPOS_EVIDENCIA,
    criarEvidencia,
    criarAchado
  });
})();
