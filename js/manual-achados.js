// SST Vision - inclusão manual de achados na fotografia

document.addEventListener("DOMContentLoaded", () => {
  const preview = document.getElementById("previewContainer");
  const foto = document.getElementById("fotoPreview");
  if (!preview || !foto) return;

  window.sstManualAchados = window.sstManualAchados || [];
  let ultimoToque = 0;
  let ultimoX = 0;
  let ultimoY = 0;

  function numeroDisponivel() {
    const numeros = [...preview.querySelectorAll(".marcador-risco")]
      .map((el) => Number(el.dataset.numero || el.textContent))
      .filter(Number.isFinite);
    return numeros.length ? Math.max(...numeros) + 1 : 1;
  }

  function coordenadas(clientX, clientY) {
    const r = foto.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100))
    };
  }

  function fecharFormulario() {
    document.getElementById("painelAchadoManual")?.remove();
  }

  function abrirFormulario(x, y) {
    fecharFormulario();
    document.getElementById("painelAchado")?.remove();

    const numero = numeroDisponivel();
    const painel = document.createElement("div");
    painel.id = "painelAchadoManual";
    painel.className = "painel-achado painel-achado-manual";
    painel.innerHTML = `
      <div class="painel-achado-topo">
        <strong>Novo achado ${numero}</strong>
        <button type="button" class="btn-fechar-achado" id="fecharAchadoManual">×</button>
      </div>
      <div class="campo-edicao-achado">
        <label>Título</label>
        <input type="text" id="manualTitulo" placeholder="Ex.: Proteção ausente">
      </div>
      <div class="campo-edicao-achado">
        <label>Observado</label>
        <textarea id="manualObservado" placeholder="Descreva o que foi observado"></textarea>
      </div>
      <div class="campo-edicao-achado">
        <label>Possível risco</label>
        <textarea id="manualRisco" placeholder="Descreva o possível risco"></textarea>
      </div>
      <div class="acoes-achado">
        <button type="button" class="btn-salvar-achado" id="salvarAchadoManual">Salvar</button>
        <button type="button" class="btn-cancelar-achado" id="cancelarAchadoManual">Cancelar</button>
      </div>`;

    preview.insertAdjacentElement("afterend", painel);
    painel.querySelector("#manualTitulo")?.focus();
    painel.querySelector("#fecharAchadoManual").onclick = fecharFormulario;
    painel.querySelector("#cancelarAchadoManual").onclick = fecharFormulario;
    painel.querySelector("#salvarAchadoManual").onclick = () => {
      const titulo = painel.querySelector("#manualTitulo").value.trim();
      const observado = painel.querySelector("#manualObservado").value.trim();
      const risco = painel.querySelector("#manualRisco").value.trim();
      if (!titulo && !observado && !risco) {
        painel.querySelector("#manualTitulo").focus();
        return;
      }

      const achado = { id: numero, x, y, titulo: titulo || `Achado ${numero}`, observado, possivel_risco: risco, manual: true };
      window.sstManualAchados.push(achado);

      const marcador = document.createElement("button");
      marcador.type = "button";
      marcador.className = "marcador-risco marcador-manual";
      marcador.dataset.numero = String(numero);
      marcador.textContent = String(numero);
      marcador.title = achado.titulo;
      marcador.style.left = `${x}%`;
      marcador.style.top = `${y}%`;
      marcador.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        abrirDetalheManual(achado, marcador);
      };
      preview.appendChild(marcador);
      fecharFormulario();
    };
  }

  function abrirDetalheManual(achado, marcador) {
    fecharFormulario();
    document.getElementById("painelAchado")?.remove();
    const painel = document.createElement("div");
    painel.id = "painelAchadoManual";
    painel.className = "painel-achado";
    painel.innerHTML = `
      <div class="painel-achado-topo"><strong>${achado.id} — ${escapeHtml(achado.titulo)}</strong><button type="button" class="btn-fechar-achado">×</button></div>
      <div class="painel-achado-conteudo">
        <div class="campo-achado"><span class="campo-achado-label">Observado</span><p>${escapeHtml(achado.observado || "Não informado")}</p></div>
        <div class="campo-achado"><span class="campo-achado-label">Possível risco</span><p>${escapeHtml(achado.possivel_risco || "Não informado")}</p></div>
      </div>
      <div class="acoes-achado"><button type="button" class="btn-excluir-achado" id="excluirManual">Excluir</button></div>`;
    preview.insertAdjacentElement("afterend", painel);
    painel.querySelector(".btn-fechar-achado").onclick = fecharFormulario;
    painel.querySelector("#excluirManual").onclick = () => {
      if (!confirm("Deseja excluir este achado da análise?")) return;
      achado.excluido = true;
      marcador.remove();
      fecharFormulario();
    };
  }

  function escapeHtml(valor) {
    return String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  foto.addEventListener("dblclick", (e) => {
    if (!foto.src) return;
    const p = coordenadas(e.clientX, e.clientY);
    abrirFormulario(p.x, p.y);
  });

  foto.addEventListener("touchend", (e) => {
    if (!foto.src || e.changedTouches.length !== 1) return;
    const toque = e.changedTouches[0];
    const agora = Date.now();
    const distancia = Math.hypot(toque.clientX - ultimoX, toque.clientY - ultimoY);
    if (agora - ultimoToque < 450 && distancia < 40) {
      e.preventDefault();
      const p = coordenadas(toque.clientX, toque.clientY);
      abrirFormulario(p.x, p.y);
      ultimoToque = 0;
      return;
    }
    ultimoToque = agora;
    ultimoX = toque.clientX;
    ultimoY = toque.clientY;
  }, { passive: false });
});
