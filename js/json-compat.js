// Compatibilidade temporária para respostas estruturadas da IA.
// Remove cercas ```json antes do JSON.parse sem alterar objetos JSON normais.
(() => {
  const parseOriginal = JSON.parse.bind(JSON);

  JSON.parse = function parseVision(texto, reviver) {
    if (typeof texto !== "string") {
      return parseOriginal(texto, reviver);
    }

    let limpo = texto.trim();

    if (limpo.startsWith("```")) {
      limpo = limpo
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    }

    const inicio = limpo.indexOf("{");
    const fim = limpo.lastIndexOf("}");

    if (inicio > 0 && fim > inicio) {
      limpo = limpo.slice(inicio, fim + 1);
    }

    return parseOriginal(limpo, reviver);
  };
})();