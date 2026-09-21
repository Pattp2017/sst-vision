// SST Vision - correção robusta de coordenadas de marcadores
// Aceita coordenadas retornadas em 0-1, 0-100 ou 0-1000.

document.addEventListener("DOMContentLoaded", () => {
  const preview = document.getElementById("previewContainer");
  if (!preview) return;

  let analiseAtual = window.sstAnaliseAtual || null;

  function normalizarCoordenada(valor) {
    let n = Number(valor);
    if (!Number.isFinite(n)) return 50;

    if (n >= 0 && n <= 1) n *= 100;
    else if (n > 100 && n <= 1000) n /= 10;

    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return n;
  }

  function acharAchado(marcador) {
    const achados = analiseAtual?.achados;
    if (!Array.isArray(achados)) return null;

    // O índice do array é a referência estável da interface.
    // Não dependemos do id produzido pela IA, que pode vir repetido.
    const indice = Number(marcador.dataset.indiceAchado);
    if (Number.isInteger(indice) && indice >= 0 && indice < achados.length) {
      return achados[indice];
    }

    // Compatibilidade com marcadores antigos.
    const numero = Number(marcador.dataset.numero || marcador.textContent?.trim());
    return Number.isInteger(numero) && numero > 0
      ? achados[numero - 1] || null
      : null;
  }

  function corrigirMarcador(marcador) {
    const achado = acharAchado(marcador);
    if (!achado) return;

    const xOriginal = achado.x ?? achado.posicao?.x ?? achado.coordenadas?.x;
    const yOriginal = achado.y ?? achado.posicao?.y ?? achado.coordenadas?.y;

    const x = normalizarCoordenada(xOriginal);
    const y = normalizarCoordenada(yOriginal);

    marcador.style.left = `${x}%`;
    marcador.style.top = `${y}%`;

    marcador.dataset.xOriginal = String(xOriginal ?? "");
    marcador.dataset.yOriginal = String(yOriginal ?? "");
    marcador.dataset.xNormalizado = String(x);
    marcador.dataset.yNormalizado = String(y);
  }

  function corrigirTodos() {
    preview.querySelectorAll(".marcador-risco").forEach(corrigirMarcador);
  }

  window.addEventListener("sstvision:analise", (event) => {
    analiseAtual = event.detail || window.sstAnaliseAtual || null;
    setTimeout(corrigirTodos, 0);
  });

  const observer = new MutationObserver(() => {
    analiseAtual = window.sstAnaliseAtual || analiseAtual;
    corrigirTodos();
  });

  observer.observe(preview, { childList: true });

  window.sstVisionCoordenadas = {
    normalizarCoordenada,
    corrigirTodos
  };
});