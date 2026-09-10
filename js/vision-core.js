// SST Vision - núcleo técnico de evidências e validação
// Mantém o raciocínio completo da IA disponível para a etapa de validação
// sem acoplar a interface ao modelo específico retornado pelo backend.

(() => {
  const fetchOriginal = window.fetch.bind(window);

  function numeroSeguro(valor, padrao = 50) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : padrao;
  }

  function normalizarAchado(achado = {}, indice = 0) {
    const id = Number(achado.id ?? achado.numero ?? indice + 1);
    const x = numeroSeguro(achado.x ?? achado.posicao?.x ?? achado.coordenadas?.x, 50);
    const y = numeroSeguro(achado.y ?? achado.posicao?.y ?? achado.coordenadas?.y, 50);

    return {
      ...achado,
      id,
      numero: id,
      origem: achado.origem || "ia",
      categoria: achado.categoria || "outra",
      titulo: achado.titulo || `Achado ${id}`,
      observado: achado.observado || achado.descricao || null,
      contexto_visual: achado.contexto_visual || null,
      perigo: achado.perigo || null,
      evento_possivel: achado.evento_possivel || null,
      possivel_consequencia: achado.possivel_consequencia || null,
      possivel_risco: achado.possivel_risco || achado.risco || null,
      estado_evidencia: achado.estado_evidencia || "observado",
      confianca: achado.confianca || "baixa",
      medida_controle: achado.medida_controle || null,
      requer_confirmacao_humana: achado.requer_confirmacao_humana !== false,
      status_validacao: achado.status_validacao || "pendente",
      decisao_profissional: achado.decisao_profissional || null,
      editado: Boolean(achado.editado),
      excluido: Boolean(achado.excluido),
      posicao: { x, y }
    };
  }

  function normalizarAnalise(analise = {}) {
    const achados = Array.isArray(analise.achados)
      ? analise.achados.map(normalizarAchado)
      : [];

    return {
      ...analise,
      identificacao: analise.identificacao || {},
      contexto: analise.contexto || {},
      achados,
      limitacoes: Array.isArray(analise.limitacoes) ? analise.limitacoes : [],
      principios: {
        evidencia_antes_da_conclusao: true,
        validacao_humana_obrigatoria: true,
        nao_detectado_nao_significa_inexistente: true,
        ...(analise.principios || {})
      }
    };
  }

  function interpretarAnalise(valor) {
    if (!valor) return null;
    if (typeof valor === "object") return normalizarAnalise(valor);

    try {
      return normalizarAnalise(JSON.parse(valor));
    } catch (erro) {
      console.warn("SST Vision: não foi possível normalizar o retorno da IA.", erro);
      return null;
    }
  }

  function localizarAchado(numero) {
    const lista = window.sstAnaliseAtual?.achados;
    if (!Array.isArray(lista)) return null;
    return lista.find((a, i) => String(a.numero ?? a.id ?? i + 1) === String(numero)) || null;
  }

  function numeroPainelAchado() {
    const painel = document.getElementById("painelAchado");
    const texto = painel?.querySelector(".painel-achado-topo strong")?.textContent || "";
    return texto.match(/(?:Editar achado\s+)?(\d+)/i)?.[1] || null;
  }

  // O app original mantém o objeto do achado em escopo privado. Estes listeners
  // sincronizam edições e rejeições com o snapshot técnico preservado pelo núcleo.
  document.addEventListener("click", (event) => {
    const alvo = event.target;
    if (!(alvo instanceof Element)) return;

    if (alvo.closest("#btnSalvarAchado")) {
      const numero = numeroPainelAchado();
      const achado = localizarAchado(numero);
      if (!achado) return;

      achado.titulo = document.getElementById("editarTituloAchado")?.value?.trim() || achado.titulo;
      achado.observado = document.getElementById("editarObservadoAchado")?.value?.trim() || null;
      achado.possivel_risco = document.getElementById("editarRiscoAchado")?.value?.trim() || null;
      achado.editado = true;
      achado.status_validacao = "pendente";
      achado.decisao_profissional = null;
    }

    if (alvo.closest("#btnExcluirAchado")) {
      const numero = numeroPainelAchado();
      const achado = localizarAchado(numero);
      if (!achado) return;
      achado.excluido = true;
      achado.status_validacao = "rejeitado";
      achado.decisao_profissional = "rejeitado";
    }
  }, true);

  window.sstVisionCore = {
    normalizarAchado,
    normalizarAnalise,
    interpretarAnalise,
    obterAnaliseAtual: () => window.sstAnaliseAtual || null
  };

  // Captura de forma não invasiva o retorno da análise visual. O app original
  // continua recebendo exatamente a mesma Response.
  window.fetch = async (...args) => {
    const resposta = await fetchOriginal(...args);

    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes("/analisar-imagem") && resposta.ok) {
        const copia = resposta.clone();
        const dados = await copia.json();
        const analise = interpretarAnalise(dados?.analise);

        if (analise) {
          window.sstAnaliseAtual = analise;
          window.dispatchEvent(new CustomEvent("sstvision:analise", { detail: analise }));
        }
      }
    } catch (erro) {
      console.warn("SST Vision: falha ao preservar análise estruturada.", erro);
    }

    return resposta;
  };
})();
