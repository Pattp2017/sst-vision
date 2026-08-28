// =========================================================
// SST VISION
// Controle da Tela 1 - Nova Inspeção
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

  // -------------------------------------------------------
  // ELEMENTOS
  // -------------------------------------------------------

  const cameraInput = document.getElementById("cameraInput");

  const btnAbrirCamera = document.getElementById("btnAbrirCamera");
  const btnRefazerFoto = document.getElementById("btnRefazerFoto");
  const btnUsarFoto = document.getElementById("btnUsarFoto");
  const btnMicrofone = document.getElementById("btnMicrofone");

  const cameraArea = document.getElementById("cameraArea");
  const previewContainer = document.getElementById("previewContainer");
  const fotoPreview = document.getElementById("fotoPreview");

  const grupoEquipamento = document.getElementById("grupoEquipamento");
  const observacao = document.getElementById("observacao");
  const statusMicrofone = document.getElementById("statusMicrofone");

  const mensagem = document.getElementById("mensagem");

  const tiposInspecao = document.querySelectorAll(
    'input[name="tipoInspecao"]'
  );


  // -------------------------------------------------------
  // ESTADO DA FOTO
  // -------------------------------------------------------

  let fotoSelecionada = null;
  let fotoURL = null;

  let analiseAtual = null;


  // -------------------------------------------------------
  // RECONHECIMENTO DE VOZ
  // -------------------------------------------------------

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  let reconhecimento = null;
  let reconhecendo = false;

  if (SpeechRecognition && btnMicrofone) {

    reconhecimento = new SpeechRecognition();

    reconhecimento.lang = "pt-BR";
    reconhecimento.continuous = false;
    reconhecimento.interimResults = true;

    reconhecimento.addEventListener("start", () => {
      reconhecendo = true;
      btnMicrofone.classList.add("gravando");
      btnMicrofone.setAttribute("aria-pressed", "true");
      atualizarStatusMicrofone("Ouvindo... fale sua observação.");
    });

    reconhecimento.addEventListener("result", (event) => {
      let textoFinal = "";
      let textoParcial = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const trecho = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          textoFinal += trecho;
        } else {
          textoParcial += trecho;
        }
      }

      if (textoFinal) {
        const textoExistente = observacao.value.trim();
        const separador = textoExistente ? " " : "";

        observacao.value =
          `${textoExistente}${separador}${textoFinal.trim()}`;
      }

      if (textoParcial) {
        atualizarStatusMicrofone(`Ouvindo: ${textoParcial.trim()}`);
      }
    });

    reconhecimento.addEventListener("end", () => {
      reconhecendo = false;
      btnMicrofone.classList.remove("gravando");
      btnMicrofone.setAttribute("aria-pressed", "false");
      atualizarStatusMicrofone("Ditado encerrado.");
    });

    reconhecimento.addEventListener("error", (event) => {
      reconhecendo = false;
      btnMicrofone.classList.remove("gravando");
      btnMicrofone.setAttribute("aria-pressed", "false");

      let textoErro = "Não foi possível usar o microfone.";

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        textoErro = "Permissão do microfone negada no navegador.";
      } else if (event.error === "no-speech") {
        textoErro = "Nenhuma fala foi identificada.";
      } else if (event.error === "audio-capture") {
        textoErro = "Nenhum microfone disponível.";
      }

      atualizarStatusMicrofone(textoErro);
    });

    btnMicrofone.addEventListener("click", () => {
      if (reconhecendo) {
        reconhecimento.stop();
        return;
      }

      try {
        reconhecimento.start();
      } catch (erro) {
        console.error("Erro ao iniciar reconhecimento de voz:", erro);
        atualizarStatusMicrofone("Não foi possível iniciar o microfone.");
      }
    });

  } else if (btnMicrofone) {

    btnMicrofone.disabled = true;
    btnMicrofone.title = "Reconhecimento de voz não suportado neste navegador";
    atualizarStatusMicrofone(
      "Seu navegador não oferece ditado por voz nesta tela. Você ainda pode digitar a observação."
    );

  }


  function atualizarStatusMicrofone(texto) {
    if (!statusMicrofone) {
      return;
    }

    statusMicrofone.textContent = texto;
    statusMicrofone.hidden = false;
  }


  // -------------------------------------------------------
  // ABRIR CÂMERA
  // -------------------------------------------------------

  btnAbrirCamera.addEventListener("click", () => {

    cameraInput.click();

  });


  // -------------------------------------------------------
  // FOTO SELECIONADA / CAPTURADA
  // -------------------------------------------------------

  cameraInput.addEventListener("change", (event) => {

    const arquivo = event.target.files[0];

    if (!arquivo) {
      return;
    }


    if (!arquivo.type.startsWith("image/")) {

      exibirMensagem(
        "O arquivo selecionado não é uma imagem."
      );

      cameraInput.value = "";

      return;
    }


    fotoSelecionada = arquivo;


    if (fotoURL) {

      URL.revokeObjectURL(fotoURL);

    }


    fotoURL = URL.createObjectURL(arquivo);

    fotoPreview.src = fotoURL;


    cameraArea.hidden = true;

    previewContainer.hidden = false;


    btnAbrirCamera.hidden = true;

    btnRefazerFoto.hidden = false;

    btnUsarFoto.hidden = false;


    removerMarcadores();

    fecharPainelAchado();

    ocultarMensagem();

  });


  // -------------------------------------------------------
  // TIRAR NOVAMENTE
  // -------------------------------------------------------

  btnRefazerFoto.addEventListener("click", () => {

    limparFoto();

    cameraInput.click();

  });


  // -------------------------------------------------------
  // USAR FOTO
  // -------------------------------------------------------

  btnUsarFoto.addEventListener("click", async () => {

    const empresa = document
      .getElementById("empresa")
      .value
      .trim();


    const setor = document
      .getElementById("setor")
      .value
      .trim();


    if (!empresa) {

      exibirMensagem(
        "Informe a empresa ou fazenda antes de continuar."
      );

      document
        .getElementById("empresa")
        .focus();

      return;

    }


    if (!setor) {

      exibirMensagem(
        "Informe o local ou setor da inspeção."
      );

      document
        .getElementById("setor")
        .focus();

      return;

    }


    if (!fotoSelecionada) {

      exibirMensagem(
        "Registre uma fotografia antes de continuar."
      );

      return;

    }


    ocultarMensagem();


    // -----------------------------------------------------
    // ENVIO DA IMAGEM
    // -----------------------------------------------------

    try {

      exibirMensagem(
        "Enviando imagem para análise..."
      );


      const imagemComprimida =
        await comprimirImagem(
          fotoSelecionada
        );


      const imagemBase64 =
        await arquivoParaBase64(
          imagemComprimida
        );


      const resposta = await fetch(
        "https://sst-vision.onrender.com/analisar-imagem",
        {

          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            imagemBase64
          })

        }
      );


      const dados =
        await resposta.json();


      if (!resposta.ok) {

        throw new Error(
          dados.mensagem ||
          "Falha ao enviar a imagem."
        );

      }


      // ---------------------------------------------------
      // INTERPRETAR RETORNO
      // ---------------------------------------------------

      if (dados.analise) {

        try {

          let analise =
            dados.analise;


          if (typeof analise === "string") {

            analise =
              JSON.parse(analise);

          }


          console.log(
            "Análise SST:",
            analise
          );


          analiseAtual = analise;


          const descricaoIdentificacao =
            analise.identificacao?.descricao ||
            "Cenário não identificado";


          const achados =
            Array.isArray(
              analise.achados
            )
              ? analise.achados
              : [];


          console.log(
            "ACHADOS RECEBIDOS:",
            achados
          );


          removerMarcadores();

          fecharPainelAchado();


          // ------------------------------------------------
          // CRIAR MARCADORES
          // ------------------------------------------------

          achados.forEach(
            (achado, indice) => {

              criarMarcador(
                achado,
                indice
              );

            }
          );


          // ------------------------------------------------
          // MENSAGEM FINAL
          // ------------------------------------------------

          if (achados.length > 0) {

            exibirMensagem(
              `Identificado: ${descricaoIdentificacao} | Achados: ${achados.length}`
            );

          } else {

            exibirMensagem(
              `Identificado: ${descricaoIdentificacao} | Nenhum achado marcado na imagem.`
            );

          }


        } catch (erro) {

          console.error(
            "Erro ao interpretar análise:",
            erro
          );


          exibirMensagem(
            "A análise foi recebida, mas não pôde ser interpretada."
          );

        }


      } else {

        exibirMensagem(
          dados.mensagem ||
          "Imagem enviada com sucesso."
        );

      }


    } catch (erro) {

      console.error(
        "Erro ao enviar imagem:",
        erro
      );


      exibirMensagem(
        "Não foi possível enviar a imagem para o servidor."
      );

    }

  });


  // -------------------------------------------------------
  // CRIAR MARCADOR DE RISCO
  // -------------------------------------------------------

  function criarMarcador(
    achado,
    indice
  ) {

    const marcador =
      document.createElement(
        "button"
      );


    marcador.type = "button";

    marcador.className =
      "marcador-risco";


    // -----------------------------------------------------
    // NUMERAÇÃO
    // -----------------------------------------------------

    const numero =
      achado.id !== undefined &&
      achado.id !== null
        ? achado.id
        : indice + 1;


    marcador.textContent =
      numero;


    marcador.dataset.numero =
      numero;


    // -----------------------------------------------------
    // POSIÇÃO
    // -----------------------------------------------------

    const x =
      converterCoordenada(
        achado.x ??
        achado.posicao?.x ??
        achado.coordenadas?.x ??
        50
      );


    const y =
      converterCoordenada(
        achado.y ??
        achado.posicao?.y ??
        achado.coordenadas?.y ??
        50
      );


    marcador.style.left =
      `${x}%`;


    marcador.style.top =
      `${y}%`;


    // -----------------------------------------------------
    // TÍTULO
    // -----------------------------------------------------

    marcador.title =
      achado.titulo ||
      `Achado ${numero}`;


    // -----------------------------------------------------
    // CLIQUE NO MARCADOR
    // -----------------------------------------------------

    marcador.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        event.stopPropagation();


        abrirDetalhesAchado(
          achado,
          marcador,
          numero
        );

      }
    );


    previewContainer.appendChild(
      marcador
    );

  }


  // -------------------------------------------------------
  // ABRIR DETALHES DO ACHADO
  // -------------------------------------------------------

  function abrirDetalhesAchado(
    achado,
    marcador,
    numero
  ) {

    fecharPainelAchado();


    const painel =
      document.createElement(
        "div"
      );


    painel.id =
      "painelAchado";


    painel.className =
      "painel-achado";


    const titulo =
      achado.titulo ||
      `Achado ${numero}`;


    const observado =
      achado.observado ||
      achado.descricao ||
      "Não informado";


    const risco =
      achado.possivel_risco ||
      achado.risco ||
      "Não informado";


    painel.innerHTML = `

      <div class="painel-achado-topo">

        <strong>
          ${numero} — ${escaparHTML(titulo)}
        </strong>

        <button
          type="button"
          class="btn-fechar-achado"
          id="btnFecharAchado"
        >
          ×
        </button>

      </div>


      <div class="painel-achado-conteudo">

        <div class="campo-achado">

          <span class="campo-achado-label">
            Observado
          </span>

          <p>
            ${escaparHTML(observado)}
          </p>

        </div>


        <div class="campo-achado">

          <span class="campo-achado-label">
            Possível risco
          </span>

          <p>
            ${escaparHTML(risco)}
          </p>

        </div>

      </div>


      <div class="acoes-achado">

        <button
          type="button"
          class="btn-editar-achado"
          id="btnEditarAchado"
        >
          Editar
        </button>


        <button
          type="button"
          class="btn-excluir-achado"
          id="btnExcluirAchado"
        >
          Excluir
        </button>

      </div>

    `;


    previewContainer.insertAdjacentElement(
      "afterend",
      painel
    );


    // -----------------------------------------------------
    // FECHAR
    // -----------------------------------------------------

    document
      .getElementById(
        "btnFecharAchado"
      )
      .addEventListener(
        "click",
        () => {

          fecharPainelAchado();

        }
      );


    // -----------------------------------------------------
    // EDITAR
    // -----------------------------------------------------

    document
      .getElementById(
        "btnEditarAchado"
      )
      .addEventListener(
        "click",
        () => {

          editarAchado(
            achado,
            marcador,
            numero
          );

        }
      );


    // -----------------------------------------------------
    // EXCLUIR
    // -----------------------------------------------------

    document
      .getElementById(
        "btnExcluirAchado"
      )
      .addEventListener(
        "click",
        () => {

          excluirAchado(
            achado,
            marcador
          );

        }
      );

  }


  // -------------------------------------------------------
  // EDITAR ACHADO
  // -------------------------------------------------------

  function editarAchado(
    achado,
    marcador,
    numero
  ) {

    const painel =
      document.getElementById(
        "painelAchado"
      );


    if (!painel) {

      return;

    }


    const titulo =
      achado.titulo ||
      "";


    const observado =
      achado.observado ||
      achado.descricao ||
      "";


    const risco =
      achado.possivel_risco ||
      achado.risco ||
      "";


    painel.innerHTML = `

      <div class="painel-achado-topo">

        <strong>
          Editar achado ${numero}
        </strong>

      </div>


      <div class="campo-edicao-achado">

        <label>
          Título
        </label>

        <input
          type="text"
          id="editarTituloAchado"
          value="${escaparAtributo(titulo)}"
        >

      </div>


      <div class="campo-edicao-achado">

        <label>
          Observado
        </label>

        <textarea
          id="editarObservadoAchado"
        >${escaparHTML(observado)}</textarea>

      </div>


      <div class="campo-edicao-achado">

        <label>
          Possível risco
        </label>

        <textarea
          id="editarRiscoAchado"
        >${escaparHTML(risco)}</textarea>

      </div>


      <div class="acoes-achado">

        <button
          type="button"
          class="btn-salvar-achado"
          id="btnSalvarAchado"
        >
          Salvar
        </button>


        <button
          type="button"
          class="btn-cancelar-achado"
          id="btnCancelarAchado"
        >
          Cancelar
        </button>

      </div>

    `;


    // -----------------------------------------------------
    // SALVAR
    // -----------------------------------------------------

    document
      .getElementById(
        "btnSalvarAchado"
      )
      .addEventListener(
        "click",
        () => {

          const novoTitulo =
            document
              .getElementById(
                "editarTituloAchado"
              )
              .value
              .trim();


          const novoObservado =
            document
              .getElementById(
                "editarObservadoAchado"
              )
              .value
              .trim();


          const novoRisco =
            document
              .getElementById(
                "editarRiscoAchado"
              )
              .value
              .trim();


          achado.titulo =
            novoTitulo ||
            `Achado ${numero}`;


          achado.observado =
            novoObservado;


          achado.possivel_risco =
            novoRisco;


          achado.editado =
            true;


          marcador.title =
            achado.titulo;


          abrirDetalhesAchado(
            achado,
            marcador,
            numero
          );

        }
      );


    // -----------------------------------------------------
    // CANCELAR
    // -----------------------------------------------------

    document
      .getElementById(
        "btnCancelarAchado"
      )
      .addEventListener(
        "click",
        () => {

          abrirDetalhesAchado(
            achado,
            marcador,
            numero
          );

        }
      );

  }


  // -------------------------------------------------------
  // EXCLUIR ACHADO
  // -------------------------------------------------------

  function excluirAchado(
    achado,
    marcador
  ) {

    const confirmar =
      window.confirm(
        "Deseja excluir este achado da análise?"
      );


    if (!confirmar) {

      return;

    }


    marcador.remove();


    achado.excluido =
      true;


    fecharPainelAchado();


    exibirMensagem(
      "Achado excluído da análise."
    );

  }


  // -------------------------------------------------------
  // FECHAR PAINEL DO ACHADO
  // -------------------------------------------------------

  function fecharPainelAchado() {

    const painel =
      document.getElementById(
        "painelAchado"
      );


    if (painel) {

      painel.remove();

    }

  }


  // -------------------------------------------------------
  // CONVERTER COORDENADA
  // -------------------------------------------------------

  function converterCoordenada(
    valor
  ) {

    let numero =
      Number(valor);


    if (!Number.isFinite(numero)) {

      return 50;

    }


    // Backend pode enviar coordenadas entre 0 e 1
    if (
      numero >= 0 &&
      numero <= 1
    ) {

      numero =
        numero * 100;

    }


    if (numero < 0) {

      numero = 0;

    }


    if (numero > 100) {

      numero = 100;

    }


    return numero;

  }


  // -------------------------------------------------------
  // REMOVER MARCADORES
  // -------------------------------------------------------

  function removerMarcadores() {

    previewContainer
      .querySelectorAll(
        ".marcador-risco"
      )
      .forEach(
        (marcador) => {

          marcador.remove();

        }
      );

  }


  // -------------------------------------------------------
  // SEGURANÇA HTML
  // -------------------------------------------------------

  function escaparHTML(
    texto
  ) {

    return String(
      texto ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

  }


  function escaparAtributo(
    texto
  ) {

    return escaparHTML(
      texto
    );

  }


  // -------------------------------------------------------
  // TIPO DE INSPEÇÃO
  // -------------------------------------------------------

  tiposInspecao.forEach(
    (radio) => {

      radio.addEventListener(
        "change",
        () => {

          const tipoSelecionado =
            document.querySelector(
              'input[name="tipoInspecao"]:checked'
            )?.value;


          if (
            tipoSelecionado ===
            "ambiente"
          ) {

            grupoEquipamento.hidden =
              true;


            document
              .getElementById(
                "equipamento"
              )
              .value = "";

          } else {

            grupoEquipamento.hidden =
              false;

          }

        }
      );

    }
  );


  // -------------------------------------------------------
  // LIMPAR FOTO
  // -------------------------------------------------------

  function limparFoto() {

    fotoSelecionada = null;

    analiseAtual = null;

    cameraInput.value = "";


    if (fotoURL) {

      URL.revokeObjectURL(
        fotoURL
      );

      fotoURL = null;

    }


    removerMarcadores();

    fecharPainelAchado();


    fotoPreview.removeAttribute(
      "src"
    );


    cameraArea.hidden =
      false;


    previewContainer.hidden =
      true;


    btnAbrirCamera.hidden =
      false;


    btnRefazerFoto.hidden =
      true;


    btnUsarFoto.hidden =
      true;


    ocultarMensagem();

  }


  // -------------------------------------------------------
  // COMPRIMIR IMAGEM
  // -------------------------------------------------------

  function comprimirImagem(
    arquivo,
    larguraMaxima = 1280,
    qualidade = 0.8
  ) {

    return new Promise(
      (resolve, reject) => {

        const imagem =
          new Image();


        const urlImagem =
          URL.createObjectURL(
            arquivo
          );


        imagem.onload = () => {

          let largura =
            imagem.width;


          let altura =
            imagem.height;


          if (
            largura >
            larguraMaxima
          ) {

            const proporcao =
              larguraMaxima /
              largura;


            largura =
              larguraMaxima;


            altura =
              Math.round(
                altura *
                proporcao
              );

          }


          const canvas =
            document.createElement(
              "canvas"
            );


          const contexto =
            canvas.getContext(
              "2d"
            );


          canvas.width =
            largura;


          canvas.height =
            altura;


          contexto.drawImage(
            imagem,
            0,
            0,
            largura,
            altura
          );


          canvas.toBlob(
            (blob) => {

              URL.revokeObjectURL(
                urlImagem
              );


              if (!blob) {

                reject(
                  new Error(
                    "Não foi possível comprimir a imagem."
                  )
                );

                return;

              }


              resolve(
                blob
              );

            },

            "image/jpeg",

            qualidade

          );

        };


        imagem.onerror = () => {

          URL.revokeObjectURL(
            urlImagem
          );


          reject(
            new Error(
              "Não foi possível carregar a imagem."
            )
          );

        };


        imagem.src =
          urlImagem;

      }
    );

  }


  // -------------------------------------------------------
  // ARQUIVO PARA BASE64
  // -------------------------------------------------------

  function arquivoParaBase64(
    arquivo
  ) {

    return new Promise(
      (resolve, reject) => {

        const leitor =
          new FileReader();


        leitor.onload = () => {

          const resultado =
            leitor.result;


          if (
            typeof resultado !==
            "string"
          ) {

            reject(
              new Error(
                "Falha ao converter a imagem."
              )
            );

            return;

          }


          const base64 =
            resultado
              .split(",")[1];


          resolve(
            base64
          );

        };


        leitor.onerror = () => {

          reject(
            new Error(
              "Erro ao ler a imagem."
            )
          );

        };


        leitor.readAsDataURL(
          arquivo
        );

      }
    );

  }


  // -------------------------------------------------------
  // EXIBIR MENSAGEM
  // -------------------------------------------------------

  function exibirMensagem(
    texto
  ) {

    mensagem.textContent =
      texto;


    mensagem.hidden =
      false;


    mensagem.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });

  }


  // -------------------------------------------------------
  // OCULTAR MENSAGEM
  // -------------------------------------------------------

  function ocultarMensagem() {

    mensagem.textContent =
      "";


    mensagem.hidden =
      true;

  }


  // -------------------------------------------------------
  // SERVICE WORKER
  // -------------------------------------------------------

  if (
    "serviceWorker" in
    navigator
  ) {

    window.addEventListener(
      "load",
      () => {

        navigator
          .serviceWorker
          .register(
            "./service-worker.js"
          )
          .catch(
            (erro) => {

              console.error(
                "Erro ao registrar Service Worker:",
                erro
              );

            }
          );

      }
    );

  }

});