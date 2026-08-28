// SST Vision - validação e persistência final da análise

document.addEventListener("DOMContentLoaded", () => {
  const preview = document.getElementById("previewContainer");
  const foto = document.getElementById("fotoPreview");
  const btnUsarFoto = document.getElementById("btnUsarFoto");
  const mensagem = document.getElementById("mensagem");
  if (!preview || !foto || !btnUsarFoto) return;

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
    if (temResultado && !window.sstAnaliseValidada?.salva) btnValidar.hidden = false;
  }

  const observer = new MutationObserver(mostrarBotaoSeHouverAnalise);
  observer.observe(preview, { childList: true, subtree: false });
  if (mensagem) observer.observe(mensagem, { childList: true, characterData: true, subtree: true });

  async function imagemAtualBase64() {
    const resposta = await fetch(foto.src);
    const blob = await resposta.blob();
    return await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result).split(",")[1]);
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  }

  function montarAchados() {
    const manuais = (window.sstManualAchados || []).filter((a) => !a.excluido);
    const manuaisPorNumero = new Map(manuais.map((a) => [String(a.id), a]));
    return [...preview.querySelectorAll(".marcador-risco")].map((m, indice) => {
      const numero = String(m.dataset.numero || m.textContent || indice + 1);
      const manual = manuaisPorNumero.get(numero);
      if (manual) return { ...manual, numero: Number(numero), origem: "manual" };
      return {
        numero: Number(numero),
        titulo: m.title || `Achado ${numero}`,
        x: parseFloat(m.style.left) || 50,
        y: parseFloat(m.style.top) || 50,
        origem: "ia"
      };
    });
  }

  btnValidar.addEventListener("click", async () => {
    if (btnValidar.disabled) return;
    const empresa = document.getElementById("empresa")?.value.trim();
    const setor = document.getElementById("setor")?.value.trim();
    const tipoAnalise = document.querySelector('input[name="tipoInspecao"]:checked')?.value;
    const equipamento = document.getElementById("equipamento")?.value.trim();
    const observacao = document.getElementById("observacao")?.value.trim();
    if (!empresa || !setor || !tipoAnalise || !foto.src) return;

    const marcadoresAtivos = [...preview.querySelectorAll(".marcador-risco")];
    btnValidar.disabled = true;
    btnValidar.textContent = "Salvando análise...";

    try {
      const imagemBase64 = await imagemAtualBase64();
      const achados = montarAchados();
      const textoMensagem = mensagem?.textContent || "";
      const descricao = textoMensagem.match(/Identificado:\s*(.*?)(?:\s*\||$)/)?.[1] || null;

      const resposta = await fetch("https://sst-vision.onrender.com/salvar-analise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa, setor, tipoAnalise, equipamento, observacao,
          identificacao: { descricao }, achados, imagemBase64
        })
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.mensagem || "Falha ao salvar análise.");

      window.sstAnaliseValidada = {
        validada: true, salva: true, analiseId: dados.analiseId,
        validadaEm: new Date().toISOString(), quantidadeAchados: marcadoresAtivos.length
      };

      document.getElementById("painelAchado")?.remove();
      document.getElementById("painelAchadoManual")?.remove();
      btnValidar.textContent = "✓ Análise validada e salva";
      btnValidar.classList.add("validada");
      marcadoresAtivos.forEach((m) => m.classList.add("marcador-validado"));
      if (mensagem) {
        mensagem.hidden = false;
        mensagem.textContent = `Análise validada e salva. ${marcadoresAtivos.length} achado(s) confirmado(s).`;
      }
    } catch (erro) {
      console.error("Erro ao validar/salvar análise:", erro);
      btnValidar.disabled = false;
      btnValidar.textContent = "✓ Validar análise";
      if (mensagem) {
        mensagem.hidden = false;
        mensagem.textContent = "A análise não foi salva. Verifique a conexão e tente novamente.";
      }
    }
  });
});
