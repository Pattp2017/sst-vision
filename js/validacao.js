// SST Vision - validação final da análise

document.addEventListener("DOMContentLoaded", () => {
  const preview = document.getElementById("previewContainer");
  const btnUsarFoto = document.getElementById("btnUsarFoto");
  const mensagem = document.getElementById("mensagem");
  if (!preview || !btnUsarFoto) return;

  let btnValidar = document.getElementById("btnValidarAnalise");
  if (!btnValidar) {
    btnValidar = document.createElement("button");
    btnValidar.type = "button";
    btnValidar.id = "btnValidarAnalise";
    btnValidar.className = "btn btn-validar-analise";
    btnValidar.textContent = "✓ Validar análise";
    btnValidar.hidden = true;
    btnUsarFoto.closest(".camera-actions")?.insertAdjacentElement("afterend", btnValidar);
  }

  function mostrarBotaoSeHouverAnalise() {
    const marcadores = preview.querySelectorAll(".marcador-risco");
    const temResultado = marcadores.length > 0 || (mensagem && /Identificado:|Nenhum achado marcado/.test(mensagem.textContent || ""));
    if (temResultado) btnValidar.hidden = false;
  }

  const observer = new MutationObserver(mostrarBotaoSeHouverAnalise);
  observer.observe(preview, { childList: true, subtree: false });
  if (mensagem) observer.observe(mensagem, { childList: true, characterData: true, subtree: true });

  btnValidar.addEventListener("click", () => {
    const marcadoresAtivos = [...preview.querySelectorAll(".marcador-risco")];
    const manuais = (window.sstManualAchados || []).filter((a) => !a.excluido);

    window.sstAnaliseValidada = {
      validada: true,
      validadaEm: new Date().toISOString(),
      quantidadeAchados: marcadoresAtivos.length,
      achadosManuais: manuais
    };

    document.getElementById("painelAchado")?.remove();
    document.getElementById("painelAchadoManual")?.remove();

    btnValidar.disabled = true;
    btnValidar.textContent = "✓ Análise validada";
    btnValidar.classList.add("validada");

    marcadoresAtivos.forEach((m) => m.classList.add("marcador-validado"));

    if (mensagem) {
      mensagem.hidden = false;
      mensagem.textContent = `Análise validada. ${marcadoresAtivos.length} achado(s) confirmado(s).`;
    }
  });
});
