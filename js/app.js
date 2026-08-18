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

  const cameraArea = document.getElementById("cameraArea");
  const previewContainer = document.getElementById("previewContainer");
  const fotoPreview = document.getElementById("fotoPreview");

  const grupoEquipamento = document.getElementById("grupoEquipamento");

  const mensagem = document.getElementById("mensagem");

  const tiposInspecao = document.querySelectorAll(
    'input[name="tipoInspecao"]'
  );


  // -------------------------------------------------------
  // ESTADO DA FOTO
  // -------------------------------------------------------

  let fotoSelecionada = null;
  let fotoURL = null;


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


    // Remove URL anterior da memória
    if (fotoURL) {
      URL.revokeObjectURL(fotoURL);
    }


    fotoURL = URL.createObjectURL(arquivo);

    fotoPreview.src = fotoURL;


    // Esconde placeholder
    cameraArea.hidden = true;


    // Mostra fotografia
    previewContainer.hidden = false;


    // Ajusta botões
    btnAbrirCamera.hidden = true;
    btnRefazerFoto.hidden = false;
    btnUsarFoto.hidden = false;


    // Remove marcadores de análise anterior
    removerMarcadores();


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

      document.getElementById("empresa").focus();

      return;
    }


    if (!setor) {

      exibirMensagem(
        "Informe o local ou setor da inspeção."
      );

      document.getElementById("setor").focus();

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
    // ENVIO DA IMAGEM PARA ANÁLISE
    // -----------------------------------------------------

    try {

      exibirMensagem("Enviando imagem para análise...");

      const imagemComprimida = await comprimirImagem(
        fotoSelecionada
      );

      const imagemBase64 = await arquivoParaBase64(
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


      const dados = await resposta.json();


      if (!resposta.ok) {

        throw new Error(
          dados.mensagem || "Falha ao enviar a imagem."
        );

      }


      // ---------------------------------------------------
      // INTERPRETAR RETORNO
      // ---------------------------------------------------

      if (dados.analise) {

        try {

          let analise = dados.analise;


          // Caso o servidor ainda devolva JSON como string
          if (typeof analise === "string") {
            analise = JSON.parse(analise);
          }


          console.log("Análise SST:", analise);


          // ------------------------------------------------
          // IDENTIFICAÇÃO
          // ------------------------------------------------

          const descricaoIdentificacao =
            analise.identificacao?.descricao ||
            "Cenário não identificado";


          // ------------------------------------------------
          // ACHADOS
          // ------------------------------------------------

          const achados = Array.isArray(analise.achados)
            ? analise.achados
            : [];


          console.log(
            "ACHADOS RECEBIDOS:",
            achados
          );


          // Remove marcadores antigos
          removerMarcadores();


          // ------------------------------------------------
          // CRIAR MARCADORES
          // ------------------------------------------------

          achados.forEach((achado, indice) => {

            criarMarcador(
              achado,
              indice
            );

          });


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

  function criarMarcador(achado, indice) {

    const marcador = document.createElement("button");

    marcador.type = "button";

    marcador.className = "marcador-risco";


    // -----------------------------------------------------
    // NUMERAÇÃO
    // -----------------------------------------------------

    const numero =
      achado.id !== undefined &&
      achado.id !== null
        ? achado.id
        : indice + 1;


    marcador.textContent = numero;


    // -----------------------------------------------------
    // POSIÇÃO
    // -----------------------------------------------------

    const x = converterCoordenada(
      achado.x ??
      achado.posicao?.x ??
      achado.coordenadas?.x ??
      50
    );


    const y = converterCoordenada(
      achado.y ??
      achado.posicao?.y ??
      achado.coordenadas?.y ??
      50
    );


    marcador.style.left = `${x}%`;

    marcador.style.top = `${y}%`;


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


        const titulo =
          achado.titulo ||
          `Achado ${numero}`;


        const observado =
          achado.observado ||
          "Não informado";


        const risco =
          achado.possivel_risco ||
          achado.risco ||
          "Não informado";


        const confianca =
          achado.confianca ||
          "Não informada";


        exibirMensagem(
`${numero} — ${titulo}

Observado: ${observado}

Possível risco: ${risco}

Confiança: ${confianca}`
        );

      }
    );


    previewContainer.appendChild(
      marcador
    );

  }


  // -------------------------------------------------------
  // CONVERTER COORDENADA
  // -------------------------------------------------------

  function converterCoordenada(valor) {

    let numero = Number(valor);


    if (!Number.isFinite(numero)) {
      return 50;
    }


    // Se o backend enviar entre 0 e 1
    if (numero >= 0 && numero <= 1) {
      numero = numero * 100;
    }


    // Impede marcador de sair da fotografia
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
      .querySelectorAll(".marcador-risco")
      .forEach((marcador) => {

        marcador.remove();

      });

  }


  // -------------------------------------------------------
  // TIPO DE INSPEÇÃO
  // -------------------------------------------------------

  tiposInspecao.forEach((radio) => {

    radio.addEventListener("change", () => {

      const tipoSelecionado =
        document.querySelector(
          'input[name="tipoInspecao"]:checked'
        )?.value;


      if (tipoSelecionado === "ambiente") {

        grupoEquipamento.hidden = true;

        document.getElementById(
          "equipamento"
        ).value = "";

      } else {

        grupoEquipamento.hidden = false;

      }

    });

  });


  // -------------------------------------------------------
  // LIMPAR FOTO
  // -------------------------------------------------------

  function limparFoto() {

    fotoSelecionada = null;

    cameraInput.value = "";


    if (fotoURL) {

      URL.revokeObjectURL(fotoURL);

      fotoURL = null;

    }


    removerMarcadores();


    fotoPreview.removeAttribute("src");


    cameraArea.hidden = false;

    previewContainer.hidden = true;


    btnAbrirCamera.hidden = false;

    btnRefazerFoto.hidden = true;

    btnUsarFoto.hidden = true;


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

        const imagem = new Image();

        const urlImagem =
          URL.createObjectURL(arquivo);


        imagem.onload = () => {

          let largura = imagem.width;

          let altura = imagem.height;


          if (largura > larguraMaxima) {

            const proporcao =
              larguraMaxima / largura;

            largura = larguraMaxima;

            altura = Math.round(
              altura * proporcao
            );

          }


          const canvas =
            document.createElement(
              "canvas"
            );


          const contexto =
            canvas.getContext("2d");


          canvas.width = largura;

          canvas.height = altura;


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


              resolve(blob);

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


        imagem.src = urlImagem;

      }
    );

  }


  // -------------------------------------------------------
  // ARQUIVO PARA BASE64
  // -------------------------------------------------------

  function arquivoParaBase64(arquivo) {

    return new Promise(
      (resolve, reject) => {

        const leitor =
          new FileReader();


        leitor.onload = () => {

          const resultado =
            leitor.result;


          if (
            typeof resultado !== "string"
          ) {

            reject(
              new Error(
                "Falha ao converter a imagem."
              )
            );

            return;

          }


          const base64 =
            resultado.split(",")[1];


          resolve(base64);

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

  function exibirMensagem(texto) {

    mensagem.textContent = texto;

    mensagem.hidden = false;


    mensagem.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });

  }


  // -------------------------------------------------------
  // OCULTAR MENSAGEM
  // -------------------------------------------------------

  function ocultarMensagem() {

    mensagem.textContent = "";

    mensagem.hidden = true;

  }


  // -------------------------------------------------------
  // SERVICE WORKER
  // -------------------------------------------------------

  if ("serviceWorker" in navigator) {

    window.addEventListener(
      "load",
      () => {

        navigator.serviceWorker
          .register(
            "./service-worker.js"
          )
          .catch((erro) => {

            console.error(
              "Erro ao registrar Service Worker:",
              erro
            );

          });

      }
    );

  }

});
