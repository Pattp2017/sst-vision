// =========================================================
// SST VISION - OBSERVAÇÃO POR VOZ
// Grava áudio no navegador e envia ao backend para transcrição
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  const btnMicrofone = document.getElementById("btnMicrofone");
  const observacao = document.getElementById("observacao");
  const statusMicrofone = document.getElementById("statusMicrofone");

  if (!btnMicrofone || !observacao || !statusMicrofone) return;

  let mediaRecorder = null;
  let streamAtual = null;
  let partesAudio = [];
  let gravando = false;

  function mostrarStatus(texto) {
    statusMicrofone.textContent = texto;
    statusMicrofone.hidden = false;
  }

  function pararStream() {
    if (streamAtual) {
      streamAtual.getTracks().forEach((track) => track.stop());
      streamAtual = null;
    }
  }

  function restaurarBotao() {
    gravando = false;
    btnMicrofone.classList.remove("gravando");
    btnMicrofone.textContent = "🎤";
    btnMicrofone.setAttribute("aria-label", "Gravar observação por voz");
    btnMicrofone.title = "Gravar observação por voz";
  }

  function blobParaBase64(blob) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => {
        const resultado = String(leitor.result || "");
        resolve(resultado.split(",")[1] || "");
      };
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  }

  async function transcreverAudio(blob) {
    try {
      mostrarStatus("Transcrevendo observação...");
      btnMicrofone.disabled = true;

      const audioBase64 = await blobParaBase64(blob);

      const resposta = await fetch(
        "https://sst-vision.onrender.com/transcrever-audio",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64,
            mimeType: blob.type || "audio/webm"
          })
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.mensagem || "Falha na transcrição.");
      }

      const texto = String(dados.texto || "").trim();

      if (!texto) {
        mostrarStatus("Não foi possível identificar fala no áudio.");
        return;
      }

      const textoAnterior = observacao.value.trim();
      observacao.value = textoAnterior
        ? `${textoAnterior} ${texto}`
        : texto;

      observacao.dispatchEvent(new Event("input", { bubbles: true }));
      mostrarStatus("Observação transcrita. Você pode editar o texto.");
      observacao.focus();
    } catch (erro) {
      console.error("Erro ao transcrever áudio:", erro);
      mostrarStatus("Não foi possível transcrever o áudio. Tente novamente.");
    } finally {
      btnMicrofone.disabled = false;
      restaurarBotao();
    }
  }

  async function iniciarGravacao() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      mostrarStatus("Este dispositivo não oferece gravação de áudio pelo navegador.");
      return;
    }

    try {
      mostrarStatus("Solicitando acesso ao microfone...");

      streamAtual = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      partesAudio = [];

      const tiposPreferidos = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4"
      ];

      const mimeType = tiposPreferidos.find(
        (tipo) => MediaRecorder.isTypeSupported(tipo)
      );

      mediaRecorder = mimeType
        ? new MediaRecorder(streamAtual, { mimeType })
        : new MediaRecorder(streamAtual);

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          partesAudio.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", async () => {
        const tipo = mediaRecorder?.mimeType || mimeType || "audio/webm";
        const blob = new Blob(partesAudio, { type: tipo });
        pararStream();

        if (blob.size === 0) {
          mostrarStatus("Nenhum áudio foi gravado.");
          restaurarBotao();
          return;
        }

        await transcreverAudio(blob);
      });

      mediaRecorder.start();
      gravando = true;
      btnMicrofone.classList.add("gravando");
      btnMicrofone.textContent = "⏹";
      btnMicrofone.setAttribute("aria-label", "Parar gravação");
      btnMicrofone.title = "Parar gravação";
      mostrarStatus("Gravando... toque novamente para parar.");
    } catch (erro) {
      console.error("Erro ao acessar microfone:", erro);
      pararStream();
      restaurarBotao();

      if (erro?.name === "NotAllowedError") {
        mostrarStatus("O acesso ao microfone foi bloqueado pelo dispositivo ou navegador.");
      } else if (erro?.name === "NotFoundError") {
        mostrarStatus("Nenhum microfone foi encontrado neste dispositivo.");
      } else {
        mostrarStatus("Não foi possível abrir o microfone.");
      }
    }
  }

  btnMicrofone.addEventListener("click", async () => {
    if (gravando && mediaRecorder) {
      if (mediaRecorder.state !== "inactive") {
        mostrarStatus("Finalizando gravação...");
        mediaRecorder.stop();
      }
      return;
    }

    await iniciarGravacao();
  });

  window.addEventListener("pagehide", pararStream);
});
